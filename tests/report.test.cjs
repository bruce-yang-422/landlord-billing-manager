const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const elements = { reportText: {}, reportSummary: {} };
  const unit = { id: '6F', label: '6 樓', bankName: '第一銀行', bankCode: '007',
    accountNumber: '00123456', payeeName: '測試戶名', tenantNote: '新版固定備註', landlordNote: '私人備忘' };
  const ctx = vm.createContext({ document: { getElementById: id => elements[id] }, getUnit: () => unit });
  for (const file of ['data.js', 'calculation.js', 'ui.js', 'report.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), ctx);
  }
  const record = { unitId: '6F', date: '2026-11-05', rent: 12000, electricity: { fee: 200 },
    waterFee: 100, gasFee: 300, managementFee: 0, otherFee: 0, utilityCredit: 300,
    utilityBalanceAfter: 700, total: 12300, tenantNote: '存檔固定備註', currentNote: '當期維修說明' };
  return { ctx, elements, unit, record };
}

test('short text and full image source use the same saved total and preserve account leading zeros', () => {
  const { ctx, elements, record } = setup();
  ctx.generateReport(record);
  assert.match(elements.reportSummary.textContent, /本期應繳：\$12,300/);
  assert.match(elements.reportSummary.textContent, /已抵扣儲值 \$300/);
  assert.match(elements.reportSummary.textContent, /第一銀行 \(007\) 00123456 測試戶名/);
  assert.match(elements.reportText.textContent, /總計：\$12,300/);
  assert.match(elements.reportText.textContent, /存檔固定備註/);
  assert.match(elements.reportText.textContent, /當期維修說明/);
  assert.doesNotMatch(elements.reportText.textContent, /私人備忘|新版固定備註/);
  assert.doesNotMatch(elements.reportSummary.textContent, /私人備忘|存檔時儲值餘額/);
});

test('zero total and older bills without credit or bank information still produce tenant text', () => {
  const { ctx, unit, record } = setup();
  unit.accountNumber = '';
  const summary = ctx.buildShortReport({ ...record, total: 0, utilityCredit: undefined }, unit);
  assert.match(summary, /本期應繳：\$0/);
  assert.doesNotMatch(summary, /匯款：|已抵扣儲值|undefined|NaN/);
});

test('5F receives only 6F usage, while 6F retains its meter estimation details', () => {
  const {ctx, elements, record} = setup();
  Object.assign(record, {unitId: '5F', splitInfo: {totalBill:3064,totalUnits:1097,e5:740.92,e6:356.08},
    currentNote: '請按時繳款\n【電費估算】\n實際抄表：2026-09-04／11378.4 度\n實際抄表：2026-11-10／11763.2 度\n日均用電：384.8 ÷ 67\n【跨季費率】\n夏月 28/62、非夏月 34/62'});
  Object.assign(record.electricity, {periodStart:'2026-09-03',periodEnd:'2026-11-03',prevDate:'2026-09-04',currDate:'2026-11-10'});
  ctx.generateReport(record);
  assert.match(elements.reportText.textContent,/6F 用電：356.08 度/);
  assert.match(elements.reportText.textContent,/請按時繳款/);
  assert.match(elements.reportText.textContent,/跨季費率/);
  assert.doesNotMatch(elements.reportText.textContent,/電費估算|實際抄表|日均用電|11378.4|11763.2|2026-09-04|採用抄表區間/);
  record.unitId='6F';
  ctx.generateReport(record);
  assert.match(elements.reportText.textContent,/電費估算/);
  assert.match(elements.reportText.textContent,/11378.4/);
  assert.match(elements.reportText.textContent,/日均用電/);
});
