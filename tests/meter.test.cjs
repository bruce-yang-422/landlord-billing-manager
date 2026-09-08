const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const load = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function harness() {
  const elements = new Map();
  for (const id of ['taipowerStartDate','taipowerEndDate','meterMatchDays','billDate','meterDate','meterCurrent','meterSaveStatus','meterPreviousValue','meterPreviousDate','meterUsageHint','billingStartReading','billingEndReading','reading6Prev','reading6Curr','billingPeriodHint']) {
    elements.set(id, { value: '', textContent: '', options: [], replaceChildren(...options) { this.options = options; }, add(option) { this.options.push(option); } });
  }
  elements.get('billDate').value = '2026-09-08';
  elements.get('taipowerStartDate').value = '2026-07-08';
  elements.get('taipowerEndDate').value = '2026-09-08';
  elements.get('meterMatchDays').value = '3';
  const stored = new Map();
  const ctx = vm.createContext({
    console, Date, appData: { units: [], records: [], meterReadings: [] },
    document: { getElementById: id => elements.get(id) || null },
    Option: class { constructor(text, value) { this.text = text; this.value = value; } },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    updateElectricityPreview() {}, saveInputs() {}, confirm: () => true
  });
  for (const file of ['csv.js', 'meter.js']) vm.runInContext(load(file), ctx);
  return { ctx, elements, stored };
}
const rows = [
  { id: 1, date: '2026-06-08', reading: 900 },
  { id: 2, date: '2026-07-08', reading: 1000 },
  { id: 3, date: '2026-08-08', reading: 1120 },
  { id: 4, date: '2026-09-08', reading: 1300 }
];

test('monthly baseline uses latest earlier date, independent of insertion order', () => {
  const { ctx } = harness();
  const timeline = ctx.meterTimeline([...rows].reverse(), []);
  assert.equal(ctx.previousMeterReading(timeline, '2026-09-08').reading, 1120);
  assert.equal(ctx.previousMeterReading(timeline, '2026-07-08').reading, 900);
  assert.equal(ctx.previousMeterReading(timeline, '2026-06-01'), undefined);
});

test('legacy bills use current reading, explicit reading date, and manual reading overrides same date', () => {
  const { ctx } = harness();
  const bills = [
    { id: 11, unitId: '6F', date: '2026-07-10', electricity: { prevReading: 800, currReading: 1000, currDate: '2026-07-08' } },
    { id: 10, unitId: '6F', date: '2026-06-08', electricity: { prevReading: 700, currReading: 900 } },
    { id: 12, unitId: '5F', date: '2026-08-08', electricity: { currReading: 9999 } }
  ];
  assert.deepEqual(plain(ctx.meterTimeline([], bills)).map(row => [row.date, row.reading]), [['2026-06-08',900],['2026-07-08',1000]]);
  assert.equal(ctx.meterTimeline([{ id: 15, date: '2026-07-08', reading: 1010 }], bills).at(-1).reading, 1010);
});

test('settlement uses explicit period and keeps manual selections within search range', () => {
  const { ctx, elements } = harness();
  ctx.appData.meterReadings = [...rows, { id: 5, date: '2026-10-08', reading: 1500 }];
  ctx.refreshBillingReadings();
  assert.equal(elements.get('billingStartReading').value, '2026-07-08');
  assert.equal(elements.get('billingEndReading').value, '2026-09-08');
  assert.equal(elements.get('reading6Curr').value - elements.get('reading6Prev').value, 300);
  assert.ok(!elements.get('billingEndReading').options.some(option => option.value === '2026-10-08'));
  elements.get('meterMatchDays').value = '31';
  elements.get('billingStartReading').value = '2026-06-08';
  ctx.refreshBillingReadings();
  assert.equal(elements.get('reading6Prev').value, 900);
});

test('a single monthly interval is not silently treated as two months', () => {
  const { ctx, elements } = harness(); ctx.appData.meterReadings = rows.slice(2);
  ctx.refreshBillingReadings();
  assert.equal(elements.get('reading6Prev').value, '');
  assert.match(elements.get('billingPeriodHint').textContent, /補齊/);
});

test('calendar subtraction clamps month ends and handles year boundaries', () => {
  const { ctx } = harness();
  assert.equal(ctx.twoMonthsBefore('2026-04-30'), '2026-02-28');
  assert.equal(ctx.twoMonthsBefore('2024-04-30'), '2024-02-29');
  assert.equal(ctx.twoMonthsBefore('2026-01-31'), '2025-11-30');
});

test('historical edits must fit adjacent readings; zero usage is allowed', () => {
  const { ctx } = harness();
  assert.doesNotThrow(() => ctx.validateMeterEntry(rows, '2026-08-08', 1000));
  assert.throws(() => ctx.validateMeterEntry(rows, '2026-08-08', 999));
  assert.throws(() => ctx.validateMeterEntry(rows, '2026-08-08', 1301));
  for (const [date, reading] of [['2026-02-30', 1000], ['', 1], ['2026-08-08', NaN], ['2026-08-08', -1]]) {
    assert.throws(() => ctx.validateMeterEntry(rows, date, reading));
  }
});

test('meter save is independent of Taipower bills and failed persistence preserves memory', () => {
  const { ctx, elements, stored } = harness();
  elements.get('meterDate').value = '2026-07-08'; elements.get('meterCurrent').value = '0';
  ctx.saveMeterReading();
  assert.equal(ctx.appData.meterReadings[0].reading, 0);
  assert.equal(ctx.appData.records.length, 0);
  assert.ok(stored.has('landlord_meter_readings'));
  const previous = JSON.stringify(ctx.appData.meterReadings);
  elements.get('meterDate').value = '2026-08-08'; elements.get('meterCurrent').value = '10';
  ctx.localStorage.setItem = () => { throw new Error('quota'); };
  ctx.saveMeterReading();
  assert.equal(JSON.stringify(ctx.appData.meterReadings), previous);
  assert.match(elements.get('meterSaveStatus').textContent, /未儲存/);
});

test('CSV round trip includes readings, zero values and explicit empty meter list', () => {
  const { ctx } = harness();
  for (const meterReadings of [rows, [], [{ id: 1, date: '2026-07-08', reading: 0 }]]) {
    const data = { units: [], records: [], meterReadings };
    assert.deepEqual(plain(ctx.backupFromCsv(ctx.backupToCsv(data))), data);
  }
  assert.throws(() => ctx.validateBackup({ records: [], meterReadings: [rows[0], rows[0]] }));
});

test('old 31-column CSV imports without requiring new reading dates', () => {
  const { ctx } = harness();
  const data = { units: [{ id: '5F', label: '5樓', rent: 0, persons: 1, bankCode: '', payeeName: '', accountNumber: '', tenantNote: '', landlordNote: '' }], records: [] };
  const table = ctx.parseCsv(ctx.backupToCsv(data));
  const legacy = table.map(row => row.slice(0, 31).map(value => '"' + value.replace(/"/g, '""') + '"').join(',')).join('\r\n');
  assert.deepEqual(plain(ctx.backupFromCsv(legacy)), data);
});

test('saved bill includes actual period dates through CSV and uses readings for both months', () => {
  const { ctx } = harness();
  const record = { id: 123, date: '2026-09-10', unitId: '6F', rent: 100,
    electricity: { fee: 50, usage: 300, prevReading: 1000, currReading: 1300, prevDate: '2026-07-08', currDate: '2026-09-08' },
    waterFee: 0, gasFee: 0, managementFee: 0, otherFee: 0, total: 150 };
  const data = { units: [], records: [record], meterReadings: rows };
  assert.deepEqual(plain(ctx.backupFromCsv(ctx.backupToCsv(data))), data);
});

test('zero usage for either household still allocates the full Taipower bill', () => {
  const ctx = vm.createContext({});
  vm.runInContext(load('data.js') + '\n' + load('calculation.js'), ctx);
  for (const usage6 of [0, 300, 600]) {
    const result = ctx.calcProgressiveSplit(1500, 600, usage6, 'summer');
    assert.equal(result.fee5 + result.fee6, 1500);
    assert.equal(result.e5 + result.e6, 600);
  }
});


test('irregular readings use closest dates on either side, with earlier ties', () => {
  const {ctx, elements} = harness();
  ctx.appData.meterReadings = [
    {id: 1, date: '2026-07-06', reading: 1000},
    {id: 2, date: '2026-07-10', reading: 1020},
    {id: 3, date: '2026-08-05', reading: 1150},
    {id: 4, date: '2026-09-03', reading: 1300}
  ];
  elements.get('billDate').value = '2026-08-31';
  elements.get('taipowerEndDate').value = '2026-09-01';
  ctx.refreshBillingReadings(true);
  assert.equal(elements.get('billingStartReading').value, '2026-07-06');
  assert.equal(elements.get('billingEndReading').value, '2026-09-03');
  assert.equal(elements.get('reading6Curr').value - elements.get('reading6Prev').value, 300);
  assert.match(elements.get('billingPeriodHint').textContent, /日期與台電區間不同/);
  elements.get('billingStartReading').value = '2026-07-10';
  ctx.refreshBillingReadings();
  assert.equal(elements.get('reading6Prev').value, 1020);
  ctx.refreshBillingReadings(true);
  assert.equal(elements.get('reading6Prev').value, 1000);
});

test('invalid periods, out-of-range readings and same reading pair cannot settle', () => {
  const {ctx, elements} = harness(); ctx.appData.meterReadings = rows;
  for (const [from, to, days] of [
    ['2026-09-08','2026-07-08','7'], ['', '2026-09-08','7'],
    ['2026-07-08','2026-09-08','-1'], ['2026-07-08','2026-09-08','1.5'],
    ['2026-07-08','2026-09-08','32'], ['2026-07-09','2026-09-08','0'],
    ['2026-07-07','2026-07-09','7']
  ]) {
    elements.get('taipowerStartDate').value = from;
    elements.get('taipowerEndDate').value = to;
    elements.get('meterMatchDays').value = days;
    ctx.refreshBillingReadings(true);
    assert.equal(elements.get('reading6Prev').value, '');
    assert.equal(elements.get('reading6Curr').value, '');
  }
});
