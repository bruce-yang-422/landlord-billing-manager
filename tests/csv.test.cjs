const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/csv.js'), 'utf8'), context);
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  return {
    units: [{ id: '5F', label: '5 樓', rent: 15000, persons: 2,
      bankCode: '007', payeeName: '王小明', accountNumber: '00123456789012345678',
      tenantNote: '請於5日匯款,謝謝\r\n備註："已收"', landlordNote: '=SUM(A1:A2)' }],
    records: [{ id: 1788834567890.125, unitId: '5F', date: '2026-09-08', rent: 15000,
      electricity: { fee: 500, usage: 100, season: 'summer', prevReading: 0, currReading: 100 },
      waterFee: 0, gasFee: 10, managementFee: 50, otherFee: 0, total: 15560,
      splitInfo: { totalBill: 1000, totalUnits: 200, e5: 100, e6: 100, c5Theory: 600,
        c6Theory: 600, deltaC: -200, ratio5: 0.5, ratio6: 0.5 } }]
  };
}

test('CSV round trip preserves settings, decimal IDs, zeroes, notes and all split fields', () => {
  const data = fixture();
  const csv = context.backupToCsv(data);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('帳單日期'));
  assert.ok(csv.includes("'007"));
  assert.ok(csv.includes("'00123456789012345678"));
  assert.ok(csv.includes("'=SUM(A1:A2)"));
  assert.deepEqual(plain(context.backupFromCsv(csv)), data);
});

test('formula prefixes and original apostrophes survive safe text export', () => {
  for (const note of ['+cmd', '-cmd', '@cmd', '\t=1+1', '  =1+1', "'原文", '正常文字']) {
    const data = fixture();
    data.units[0].tenantNote = note;
    assert.equal(context.backupFromCsv(context.backupToCsv(data)).units[0].tenantNote, note);
  }
});

test('settings can be restored when there are no bills', () => {
  const data = fixture();
  data.records = [];
  data.units[0].tenantNote = '';
  assert.deepEqual(plain(context.backupFromCsv(context.backupToCsv(data))), data);
});

test('malformed CSV, invalid numbers, unknown units and duplicate records are rejected', () => {
  assert.throws(() => context.parseCsv('"unfinished'));
  assert.throws(() => context.parseCsv('"value"extra,cell'));
  assert.throws(() => context.backupFromCsv('日期,金額\n2026-01-01,50'));
  const csv = context.backupToCsv(fixture());
  assert.throws(() => context.backupFromCsv(csv.replace('"15000"', '"NaN"')));
  assert.throws(() => context.backupFromCsv(csv.replace('"5F"', '"9F"')));
  const data = fixture(); data.records.push({ ...data.records[0] });
  assert.throws(() => context.backupFromCsv(context.backupToCsv(data)));
});

test('legacy JSON records and omitted optional fields remain supported', () => {
  const data = fixture();
  delete data.records[0].splitInfo;
  delete data.records[0].electricity.season;
  assert.deepEqual(plain(context.validateBackup(JSON.parse(JSON.stringify(data)))), data);
  assert.deepEqual(plain(context.backupFromCsv(context.backupToCsv(data))), data);
  assert.ok(context.validateBackup({ records: data.records }));
});

test('CSV reader handles reordered headers, CRLF, LF, quoted commas and trailing newline', () => {
  assert.deepEqual(plain(context.parseCsv('a,b\r\n"one,two","say ""hi"""\r\n')), [['a', 'b'], ['one,two', 'say "hi"']]);
  const rows = context.parseCsv(context.backupToCsv(fixture()));
  const reordered = rows.map(row => [...row].reverse().map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
  assert.deepEqual(plain(context.backupFromCsv(reordered)), fixture());
});

function importHarness(confirmResult = true, failWrite = false) {
  const data = fixture();
  const existing = { units: data.units, records: [] };
  const stored = new Map([['landlord_units', JSON.stringify(existing.units)], ['landlord_billing_db', '[]']]);
  const alerts = [];
  let writes = 0;
  const sandbox = vm.createContext({
    appData: existing, alert: message => alerts.push(message), confirm: () => confirmResult,
    console, document: { getElementById: () => null },
    fillUnitSettingsForm() {}, updateElectricityPreview() {}, updateWaterPreview() {}, renderHistory() {},
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem(key, value) { writes++; if (failWrite && writes === 2) throw new Error('quota'); stored.set(key, value); },
      removeItem: key => stored.delete(key)
    },
    FileReader: class { readAsText(file) { this.onload({ target: { result: file.text } }); } }
  });
  for (const file of ['csv.js', 'storage.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), sandbox);
  const original = JSON.stringify(existing);
  sandbox.importData({ files: [{ name: 'backup.csv', text: context.backupToCsv(data) }], value: 'backup.csv' });
  return { data, existing, original, stored, alerts, writes };
}

test('import updates records and persistence only after confirmation', () => {
  const success = importHarness();
  assert.deepEqual(plain(success.existing), success.data);
  assert.deepEqual(JSON.parse(success.stored.get('landlord_billing_db')), success.data.records);
  const cancelled = importHarness(false);
  assert.equal(JSON.stringify(cancelled.existing), cancelled.original);
  assert.equal(cancelled.writes, 0);
});

test('storage failure rolls back persistence and leaves in-memory data unchanged', () => {
  const result = importHarness(true, true);
  assert.equal(JSON.stringify(result.existing), result.original);
  assert.equal(result.stored.get('landlord_billing_db'), '[]');
  assert.deepEqual(JSON.parse(result.stored.get('landlord_units')), result.existing.units);
  assert.match(result.alerts[0], /讀取失敗/);
});
