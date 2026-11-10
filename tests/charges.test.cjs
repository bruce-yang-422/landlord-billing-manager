const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup(includeElectricity) {
  const values = { waterStartDate: '2026-07-01', waterEndDate: '2026-09-01', taipowerStartDate: '2026-07-06', taipowerEndDate: '2026-09-06', billDate: '2026-09-08', totalWater: '600', '5F_gas': '250', '6F_gas': '400',
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
  assert.match(h.elements.reportText.textContent, /儲值抵扣：-\$200/);
  assert.match(h.elements.reportText.textContent, /水電費另需繳付：\$0/);
  assert.match(h.elements.reportText.textContent, /總計：\$12,480/);
});

test('bill checkboxes control preview, saved offsets and report itemization', () => {
  const h = setup(false);
  vm.runInContext("appData.utilityDeposits = [{ id: 1, unitId: '6F', date: '2026-09-09', amount: 3000 }];", h.ctx);
  for (const key of ['electricity', 'water', 'gas', 'management', 'other']) h.elements[`6F_credit_${key}`] = { checked: key === 'gas' || key === 'other' };
  const draft = h.ctx.currentBillDraft().units.find(unit => unit.id === '6F');
  assert.equal(draft.utilityCredit, 430);
  h.ctx.saveBill('6F');
  const record = h.records[0];
  assert.equal(record.total, draft.total);
  assert.equal(record.creditItems.water, 0);
  assert.equal(record.creditItems.gas, 400);
  assert.equal(record.creditItems.other, 30);
  h.elements.reportText = {};
  h.generateReport(record);
  assert.match(h.elements.reportText.textContent, /瓦斯費 \$400 · 雜費／其他 \$30/);
  assert.match(h.elements.reportText.textContent, /水電費另需繳付：\$200/);
});

test('optional other-fee content is saved per bill and preserved in CSV, reports and credit details', () => {
  const h = setup(false);
  h.elements['6F_otherDescription'] = { value: '  更換門鎖，含安裝 "完成"  ' };
  h.elements['5F_otherDescription'] = { value: '' };
  vm.runInContext("appData.utilityDeposits = [{ id: 1, unitId: '6F', date: '2026-09-09', amount: 3000 }];", h.ctx);
  h.elements['6F_credit_other'] = { checked: true };
  h.ctx.saveBill('6F'); h.ctx.saveBill('5F');
  const record = h.records[0];
  assert.equal(record.otherDescription, '更換門鎖，含安裝 "完成"');
  assert.equal(h.records[1].otherDescription, undefined);
  h.elements['6F_otherDescription'].value = '清潔費';
  assert.equal(record.otherDescription, '更換門鎖，含安裝 "完成"');
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv({ units: [], records: h.records }));
  assert.equal(restored.records[0].otherDescription, record.otherDescription);
  h.elements.reportText = {}; h.generateReport(record);
  assert.match(h.elements.reportText.textContent, /其他費用內容：更換門鎖/);
  assert.match(h.ctx.creditItemSummary(record), /雜費／其他（更換門鎖/);
  record.otherDescription = 123;
  assert.throws(() => h.ctx.validateBackup({ records: [record] }), /文字/);
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

test('late photos align preview, saved usage, credits and CSV to the inclusive bill period', () => {
  const h = setup(true);
  Object.assign(h.elements, {
    taipowerStartDate: { value: '2026-09-03' }, taipowerEndDate: { value: '2026-11-03' },
    billingStartReading: { value: '2026-09-04' }, billingEndReading: { value: '2026-11-10' },
    reading6Prev: { value: '11378.4' }, reading6Curr: { value: '11763.2' },
    taipowerBill: { value: '3064' }, taipowerUnits: { value: '1097' }, totalWater: { value: '210' },
    usage5F: {}, usage6F: {}, elecFee5F: {}, elecFee6F: {},
    seasonPeriodHint: {},
    '6F_currentNote': { value: '租客延後拍照' }
  });
  vm.runInContext('appData.utilityDeposits = [{id: 1, unitId: "6F", date: "2026-08-27", amount: 2602}]', h.ctx);
  h.ctx.updateElectricityPreview();
  assert.match(h.elements.usage6F.textContent, /356.08.*估算/);
  assert.equal(h.elements.elecFee6F.textContent, '$916');
  assert.equal(h.elements.elecFee5F.textContent, '$2,148');
  assert.equal(h.elements.season.value, 'mixed');
  assert.match(h.elements.seasonPeriodHint.textContent, /夏月 28\/62、非夏月 34\/62/);
  const draft = h.ctx.currentBillDraft();
  assert.ok(Math.abs(draft.split.e6 - 384.8 / 67 * 62) < 1e-9);
  h.ctx.saveBill('6F');
  const record = h.records[0];
  assert.equal(record.electricity.fee, draft.split.fee6);
  assert.equal(record.electricity.usage, draft.split.e6);
  assert.equal(record.electricity.prevReading, 11378.4);
  assert.equal(record.electricity.currReading, 11763.2);
  assert.match(record.currentNote, /租客延後拍照\n/);
  assert.match(record.currentNote, /含迄日共 62 天/);
  assert.match(record.currentNote, /夏月 28\/62、非夏月 34\/62/);
  assert.equal(record.electricity.season, 'mixed');
  assert.equal(record.utilityCredit, record.electricity.fee + record.waterFee);
  assert.equal(record.waterFee, 70);
  assert.equal(record.utilityBalanceAfter, 1616);
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
  assert.ok(record.currentNote.startsWith('本期維修, "門鎖"\n=測試文字\n'));
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

test('water move-in proration agrees across preview, bill, credits and backup', () => {
  const h = setup(false);
  Object.assign(h.ctx.testUnits[0], { persons: 5, moveInDate: '2026-08-26' });
  Object.assign(h.ctx.testUnits[1], { persons: 1, moveInDate: '2026-08-02' });
  Object.assign(h.elements, { totalWater: { value: '424' }, waterStartDate: { value: '2026-08-01' }, waterEndDate: { value: '2026-10-01' }, waterOwnerFee: {}, waterPeriodHint: {}, waterFee5F: {}, waterFee6F: {} });
  vm.runInContext('appData.utilityDeposits = [{id: 1, unitId: "6F", date: "2026-08-27", amount: 2602}]', h.ctx);
  h.ctx.updateWaterPreview();
  assert.equal(h.elements.waterFee5F.textContent, '$209');
  assert.equal(h.elements.waterFee6F.textContent, '$70');
  assert.equal(h.elements.waterOwnerFee.textContent, '$145');
  h.ctx.saveBill('6F');
  const r = h.records[0];
  assert.equal(r.waterFee, 70);
  assert.equal(r.utilityCredit, 70);
  assert.equal(r.utilityBalanceAfter, 2532);
  assert.equal(r.waterPeriodStart, '2026-08-01');
  assert.match(r.currentNote, /房東負擔：145/);
  const data = { units: h.ctx.testUnits, records: [r] };
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv(data));
  assert.equal(restored.units[0].moveInDate, '2026-08-26');
  assert.equal(restored.records[0].waterPeriodEnd, '2026-10-01');
});

test('waived water remains visible but is excluded from totals and all prepaid offsets', () => {
  const h = setup(true);
  h.elements.includeWater = { checked: false };
  h.elements.waterFee6F = {};
  h.elements.waterOwnerFee = {};
  vm.runInContext('appData.utilityDeposits = [{id: 1, unitId: "6F", date: "2026-08-27", amount: 3000}]', h.ctx);
  h.ctx.updateWaterPreview();
  assert.equal(h.elements.waterFee6F.textContent, '$200（本期不收）');
  assert.equal(h.elements.waterOwnerFee.textContent, '$600');
  const d = h.ctx.currentBillDraft();
  const u = d.units.find(u => u.id === '6F');
  assert.equal(u.utilityCredit, u.fee);
  assert.equal(u.total, 12000 + 400 + 50 + 30);
  h.ctx.saveBill('6F');
  const r = h.records[0];
  assert.equal(r.waterFee,200);
  assert.equal(r.waterChargeEnabled,false);
  assert.equal(r.creditItems.water,0);
  assert.equal(h.ctx.planRecordCredit(r,['water']).credit,0);
  assert.match(r.currentNote,/全數由房東吸收/);
  h.elements.reportText = {};
  h.generateReport(r);
  assert.match(h.elements.reportText.textContent,/水費：\$200（本期不收/);
  const csv = h.ctx.backupToCsv({units:[],records:[r]});
  assert.equal(h.ctx.backupFromCsv(csv).records[0].waterChargeEnabled,false);
  assert.throws(() => h.ctx.validateBackup({records:[{...r,creditItems:{...r.creditItems,water:1},utilityCredit:r.utilityCredit+1,total:r.total-1}]}),/抵扣/);
  h.elements.includeWater.checked = true;
  const next = h.ctx.currentBillDraft().units.find(u => u.id === '6F');
  assert.equal(next.utilityCredit,next.fee+next.water);
  assert.equal(r.waterChargeEnabled,false); // Previously saved bills keep their own collection choice.
});
