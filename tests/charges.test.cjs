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
  const generateReport = ctx.generateReport;
  ctx.renderHistory = () => {};
  ctx.generateReport = () => {};
  return { ctx, elements, records, alerts, generateReport };
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

test('bill preview, saved bill and tenant report agree on prepaid utility credit', () => {
  const h = setup(false);
  vm.runInContext("appData.utilityDeposits = [{ id: 1, unitId: '6F', date: '2026-09-09', amount: 3000 }];", h.ctx);
  const draft = h.ctx.currentBillDraft().units.find(unit => unit.id === '6F');
  assert.equal(draft.utilityCredit, 200);
  assert.equal(draft.total, 12480);
  h.ctx.saveBill('6F');
  const record = h.records[0];
  assert.equal(record.total, draft.total);
  assert.equal(record.utilityBalanceAfter, 2800);
  h.elements.reportText = {};
  h.generateReport(record);
  assert.match(h.elements.reportText.textContent, /房租：\$12,000/);
  assert.match(h.elements.reportText.textContent, /水電費儲值抵扣：-\$200/);
  assert.match(h.elements.reportText.textContent, /水電費另需繳付：\$0/);
  assert.match(h.elements.reportText.textContent, /總計：\$12,480/);
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


test('per-bill notes are separate per unit, cleared only after successful save, and preserved in CSV', () => {
  const h = setup(false);
  h.elements['5F_currentNote'] = { value: '本期維修, "門鎖"\n=測試文字' };
  h.elements['6F_currentNote'] = { value: '本期補收瓦斯' };
  h.ctx.testUnits[0].tenantNote = '每月 5 日前繳款';
  h.ctx.testUnits[0].landlordNote = '私人租約備忘';
  h.ctx.saveBill('5F');
  const record = h.records[0];
  assert.equal(record.currentNote, '本期維修, "門鎖"\n=測試文字');
  assert.equal(record.tenantNote, '每月 5 日前繳款');
  assert.equal(h.elements['5F_currentNote'].value, '');
  assert.equal(h.elements['6F_currentNote'].value, '本期補收瓦斯');
  h.ctx.testUnits[0].tenantNote = '已修改固定備註';
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv({ units: [], records: [record] }));
  assert.equal(restored.records[0].tenantNote, '每月 5 日前繳款');
  assert.equal(restored.records[0].currentNote, record.currentNote);
  h.elements.reportText = { textContent: '' };
  h.generateReport(record);
  assert.match(h.elements.reportText.textContent, /每月 5 日前繳款/);
  assert.match(h.elements.reportText.textContent, /本期維修/);
  assert.doesNotMatch(h.elements.reportText.textContent, /私人租約備忘|已修改固定備註/);
  h.ctx.addRecord = () => { throw new Error('storage full'); };
  h.ctx.saveBill('6F');
  assert.equal(h.elements['6F_currentNote'].value, '本期補收瓦斯');
});


test('bank names survive CSV and appear with bank code in tenant reports', () => {
  const h = setup(false);
  Object.assign(h.ctx.testUnits[0], { bankName: '第一銀行', branchName: '台北分行', bankCode: '007', accountNumber: '00123456', payeeName: '測試房東' });
  h.ctx.saveBill('5F');
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv({ units: h.ctx.testUnits, records: h.records }));
  assert.equal(restored.units[0].bankName, '第一銀行');
  assert.equal(restored.units[0].branchName, '台北分行');
  assert.equal(restored.units[0].bankCode, '007');
  h.elements.reportText = { textContent: '' };
  h.generateReport(h.records[0]);
  assert.match(h.elements.reportText.textContent, /銀行名稱：第一銀行\n分行名稱：台北分行\n銀行代號：007\n戶名：測試房東\n帳號：00123456/);
  h.ctx.testUnits[0].bankCode = '';
  h.generateReport(h.records[0]);
  assert.match(h.elements.reportText.textContent, /銀行名稱：第一銀行\n分行名稱：台北分行\n戶名：測試房東\n帳號：00123456/);
});
