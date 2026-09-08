const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup(includeElectricity) {
  const values = { taipowerStartDate: '2026-07-06', taipowerEndDate: '2026-09-06', billDate: '2026-09-08', totalWater: '600', '5F_gas': '250', '6F_gas': '400',
    '5F_management': '100', '6F_management': '50', '5F_other': '20', '6F_other': '30',
    taipowerBill: '1500', taipowerUnits: '600', reading6Prev: '1000', reading6Curr: '1300',
    season: 'summer', billingStartReading: '2026-07-08', billingEndReading: '2026-09-08' };
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { value }]));
  elements.includeElectricity = { checked: includeElectricity };
  const units = [{ id: '5F', label: '5樓', rent: 15000, persons: 2 }, { id: '6F', label: '6樓', rent: 12000, persons: 1 }];
  const records = [], alerts = [];
  const ctx = vm.createContext({
    document: { getElementById: id => elements[id] || null, querySelectorAll: () => [] },
    window: {}, alert: message => alerts.push(message), console,
    getUnit: id => units.find(unit => unit.id === id),
    addRecord: record => records.push(record), renderMeterHistory() {}
  });
  for (const file of ['data.js', 'calculation.js', 'csv.js', 'ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), ctx);
  ctx.testUnits = units;
  vm.runInContext('appData.units = testUnits', ctx);
  ctx.renderHistory = () => {};
  ctx.generateReport = () => {};
  return { ctx, elements, records, alerts };
}

test('monthly bills include water, individual gas and other fees without a Taipower bill', () => {
  const h = setup(false);
  h.elements.taipowerBill.value = '';
  h.elements.reading6Prev.value = '';
  h.elements.reading6Curr.value = '';
  h.ctx.saveBill('5F'); h.ctx.saveBill('6F');
  assert.equal(h.records.length, 2);
  assert.equal(h.records[0].total, 15000 + 400 + 250 + 100 + 20);
  assert.equal(h.records[1].total, 12000 + 200 + 400 + 50 + 30);
  assert.equal(h.records[0].electricity.fee, 0);
  assert.equal(h.records[1].electricity.currReading, undefined);
  assert.equal(h.records[1].splitInfo, undefined);
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv({ units: [], records: h.records }));
  assert.equal(restored.records[0].waterFee, 400);
  assert.equal(restored.records[1].gasFee, 400);
});

test('settlement month includes every fee and matches total electricity and water bills', () => {
  const h = setup(true);
  h.ctx.saveBill('5F'); h.ctx.saveBill('6F');
  assert.equal(h.records.length, 2);
  assert.equal(h.records[0].electricity.fee + h.records[1].electricity.fee, 1500);
  assert.equal(h.records[0].waterFee + h.records[1].waterFee, 600);
  for (const record of h.records) {
    assert.equal(record.total, record.rent + record.electricity.fee + record.waterFee + record.gasFee + record.managementFee + record.otherFee);
  }
});

test('invalid utility amounts and missing required electricity prevent saving', () => {
  const h = setup(false);
  h.elements['5F_gas'].value = '-1'; h.ctx.saveBill('5F');
  assert.equal(h.records.length, 0);
  h.elements['5F_gas'].value = '250';
  h.elements.totalWater.value = 'Infinity'; h.ctx.saveBill('5F');
  assert.equal(h.records.length, 0);
  h.elements.totalWater.value = '600';
  h.elements.includeElectricity.checked = true;
  h.elements.reading6Prev.value = ''; h.ctx.saveBill('5F');
  assert.equal(h.records.length, 0);
  assert.match(h.alerts.at(-1), /起始與結束/);
});


test('CSV preserves requested Taipower period separately from matched meter dates', () => {
  const h = setup(true);
  h.ctx.saveBill('6F');
  const record = h.records[0];
  assert.equal(record.electricity.periodStart, '2026-07-06');
  assert.equal(record.electricity.periodEnd, '2026-09-06');
  assert.equal(record.electricity.prevDate, '2026-07-08');
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv({ units: [], records: [record] }));
  assert.deepEqual(JSON.parse(JSON.stringify(restored.records[0])), JSON.parse(JSON.stringify(record)));
});
