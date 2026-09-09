const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const stored = new Map(), alerts = [];
  const elements = Object.fromEntries(Object.entries({ utilityUnit: '6F', utilityDate: '2026-09-09', utilityAmount: '3000', utilityNote: '預付' }).map(([key, value]) => [key, { value }]));
  const ctx = vm.createContext({ console, alert: message => alerts.push(message), confirm: () => true,
    document: { getElementById: id => elements[id] || null },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
    updateBillTotals() {}, renderHistory() {}, fillUnitSettingsForm() {}, updateElectricityPreview() {}, updateWaterPreview() {}
  });
  for (const file of ['data', 'units', 'calculation', 'csv', 'storage', 'utility']) vm.runInContext(fs.readFileSync(path.join(__dirname, `../js/${file}.js`), 'utf8'), ctx);
  vm.runInContext('appData.units.forEach(unit => unit.rent = 12000);', ctx);
  ctx.loadUtilityDeposits();
  return { ctx, stored, elements, alerts, data: () => vm.runInContext('appData', ctx) };
}
const bill = ctx => ctx.buildRecord('6F', '2026-09-09', 500, 100, 300, { gas: 100, management: 50, other: 20 });

test('settings checkbox takes effect only after saving and reloads persisted state', () => {
  const h = setup(); h.ctx.navigateTo = () => {};
  h.elements['5F_utilityEnabled'] = { checked: true };
  h.elements['6F_utilityEnabled'] = { checked: true };
  h.ctx.fillUnitSettingsForm();
  h.elements['5F_utilityEnabled'].checked = false;
  assert.equal(h.ctx.utilityEnabled('5F'), true);
  h.ctx.saveUnitSettings();
  assert.equal(h.ctx.utilityEnabled('5F'), false);
  assert.equal(h.ctx.utilityEnabled('6F'), true);
  h.elements['5F_utilityEnabled'].checked = true;
  h.ctx.loadUnits(); h.ctx.fillUnitSettingsForm();
  assert.equal(h.elements['5F_utilityEnabled'].checked, false);
});

test('settings write failure keeps existing switch values and pending form edits', () => {
  const h = setup();
  h.elements['5F_utilityEnabled'] = { checked: false };
  h.ctx.localStorage.setItem = () => { throw new Error('quota'); };
  h.ctx.saveUnitSettings();
  assert.equal(h.ctx.utilityEnabled('5F'), true);
  assert.equal(h.elements['5F_utilityEnabled'].checked, false);
  assert.match(h.alerts.at(-1), /設定未儲存/);
});

test('per-unit switch blocks deposits and offsets, keeps history and resumes with the same balance', () => {
  const h = setup(); h.ctx.saveUtilityDeposit(); h.ctx.addRecord(bill(h.ctx));
  const beforeRecords = JSON.stringify(h.data().records);
  h.ctx.setUtilityEnabled('6F', false);
  assert.equal(h.ctx.utilityEnabled('6F'), false);
  assert.equal(h.ctx.utilityEnabled('5F'), true);
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
  h.elements.utilityAmount.value = '1000'; h.ctx.saveUtilityDeposit();
  assert.equal(h.data().utilityDeposits.length, 1);
  assert.equal(bill(h.ctx).utilityCredit, 0);
  h.ctx.applyUtilityCreditToRecord(h.data().records[0].id, ['gas']);
  assert.equal(JSON.stringify(h.data().records), beforeRecords);
  const backup = h.ctx.backupFromCsv(h.ctx.backupToCsv(h.data()));
  assert.equal(backup.units.find(unit => unit.id === '6F').utilityEnabled, false);
  h.ctx.restoreBackup(backup);
  assert.equal(h.ctx.utilityEnabled('6F'), false);
  h.ctx.setUtilityEnabled('6F', true);
  assert.equal(bill(h.ctx).utilityCredit, 800);
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
});

test('failed switch persistence leaves enabled state unchanged', () => {
  const h = setup();
  h.ctx.localStorage.setItem = () => { throw new Error('quota'); };
  h.ctx.setUtilityEnabled('5F', false);
  assert.equal(h.ctx.utilityEnabled('5F'), true);
  assert.match(h.alerts.at(-1), /開關未儲存/);
});

test('selected gas and miscellaneous credit excludes water, electricity and rent', () => {
  const h = setup(); h.ctx.saveUtilityDeposit();
  const record = h.ctx.buildRecord('6F', '2026-09-09', 500, 100, 300, { gas: 100, management: 50, other: 20 }, ['gas', 'other']);
  assert.equal(record.utilityCredit, 120);
  assert.equal(record.total, 12850);
  assert.equal(record.creditItems.electricity, 0);
  assert.equal(record.creditItems.gas, 100);
  assert.equal(record.creditItems.other, 20);
  h.ctx.addRecord(record);
  h.ctx.applyUtilityCreditToRecord(record.id, ['gas', 'other']);
  assert.equal(h.ctx.utilityBalance('6F'), 2880);
  h.ctx.applyUtilityCreditToRecord(record.id, ['water']);
  assert.equal(h.data().records[0].utilityCredit, 420);
  assert.equal(h.data().records[0].creditItems.water, 300);
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv(h.data()));
  assert.deepEqual(JSON.parse(JSON.stringify(restored.records[0])), JSON.parse(JSON.stringify(h.data().records[0])));
  restored.records[0].creditItems.gas = 101;
  assert.throws(() => h.ctx.validateBackup(restored), /抵扣/);
});

test('empty selections do not deduct and limited balance follows stable item order', () => {
  const h = setup(); h.elements.utilityAmount.value = '550'; h.ctx.saveUtilityDeposit();
  const empty = h.ctx.buildRecord('6F', '2026-09-09', 500, 100, 300, { gas: 100 }, []);
  assert.equal(empty.utilityCredit, 0);
  const partial = h.ctx.buildRecord('6F', '2026-09-09', 500, 100, 300, { gas: 100 }, ['gas', 'water', 'electricity', 'rent']);
  assert.equal(partial.creditItems.electricity, 500);
  assert.equal(partial.creditItems.water, 50);
  assert.equal(partial.creditItems.gas, 0);
  assert.equal(partial.utilityBalanceAfter, 0);
  assert.equal(partial.rent, 12000);
});

test('legacy combined water and electricity credit is not deducted twice when adding gas', () => {
  const h = setup(); h.ctx.saveUtilityDeposit();
  const record = bill(h.ctx); delete record.creditItems;
  h.ctx.addRecord(record);
  h.ctx.applyUtilityCreditToRecord(record.id, ['electricity', 'water', 'gas']);
  assert.equal(h.data().records[0].utilityCredit, 900);
  assert.equal(h.data().records[0].creditItems.gas, 100);
  assert.equal(h.ctx.utilityBalance('6F'), 2100);
});

test('ledger combines deposits and actual bill credits with independent floor and type filters', () => {
  const h = setup(); h.ctx.saveUtilityDeposit();
  const record = bill(h.ctx); h.ctx.addRecord(record);
  h.elements.utilityUnit.value = '5F'; h.elements.utilityAmount.value = '500'; h.ctx.saveUtilityDeposit();
  const rows = h.ctx.utilityLedgerRows();
  assert.equal(rows.length, 3);
  assert.equal(h.ctx.utilityLedgerRows('6F').length, 2);
  assert.equal(h.ctx.utilityLedgerRows('all', 'deposit').length, 2);
  assert.equal(h.ctx.utilityLedgerRows('5F', 'deduction').length, 0);
  assert.equal(h.ctx.utilityLedgerRows('6F', 'deduction')[0].amount, 800);
  h.ctx.deleteRecord(record.id);
  assert.equal(h.ctx.utilityLedgerRows('all', 'deduction').length, 0);
});

test('utility page renders balances, filtered ledger and pending bill actions from existing data', () => {
  const h = setup(); h.ctx.saveUtilityDeposit(); h.ctx.addRecord(bill(h.ctx));
  h.ctx.addRecord(h.ctx.buildRecord('5F', '2026-09-09', 100, 20, 0, {}));
  const node = () => ({ children: [], textContent: '', append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; }, addEventListener() {} });
  h.ctx.document.createElement = node;
  for (const id of ['utilityBalances', 'utilityHistory', 'utilityPending', 'utilityLedgerSummary']) h.elements[id] = node();
  h.elements.utilityFloorFilter = { value: 'all' }; h.elements.utilityTypeFilter = { value: 'all' };
  h.ctx.renderUtilityDeposits();
  assert.equal(h.elements.utilityBalances.children.length, 2);
  const flatten = el => el.textContent + (el.children || []).map(flatten).join(' ');
  assert.match(flatten(h.elements.utilityBalances), /2,200/);
  assert.match(flatten(h.elements.utilityHistory), /−\$800/);
  assert.match(flatten(h.elements.utilityPending), /餘額不足/);
  h.elements.utilityFloorFilter.value = '6F'; h.elements.utilityTypeFilter.value = 'deduction';
  h.ctx.renderUtilityDeposits();
  assert.equal(h.elements.utilityHistory.children.length, 1);
  assert.match(flatten(h.elements.utilityPending), /瓦斯費/);
  assert.match(flatten(h.elements.utilityPending), /請勾選可抵扣項目/);
});

test('late deposit offsets existing bill once, preserves charges, and deletion refunds it', () => {
  const h = setup();
  const record = bill(h.ctx); h.ctx.addRecord(record); h.ctx.saveUtilityDeposit();
  h.ctx.applyUtilityCreditToRecord(record.id);
  const updated = h.data().records[0];
  assert.equal(updated.total, 12170);
  assert.equal(updated.utilityCredit, 800);
  assert.equal(updated.electricity.fee, 500);
  assert.equal(updated.rent, 12000);
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
  h.ctx.applyUtilityCreditToRecord(record.id);
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
  assert.equal(h.data().records.length, 1);
  h.ctx.deleteRecord(record.id);
  assert.equal(h.ctx.utilityBalance('6F'), 3000);
});

test('partial existing-bill offsets accumulate after another deposit and survive CSV', () => {
  const h = setup(); const record = bill(h.ctx); h.ctx.addRecord(record);
  h.elements.utilityAmount.value = '200'; h.ctx.saveUtilityDeposit();
  h.ctx.applyUtilityCreditToRecord(record.id);
  assert.equal(h.data().records[0].total, 12770);
  h.elements.utilityAmount.value = '1000'; h.ctx.saveUtilityDeposit();
  h.ctx.applyUtilityCreditToRecord(record.id);
  const restored = h.ctx.backupFromCsv(h.ctx.backupToCsv(h.data()));
  assert.equal(restored.records[0].utilityCredit, 800);
  assert.equal(restored.records[0].utilityBalanceAfter, 400);
  assert.equal(restored.records[0].total, 12170);
});

test('cancelled or failed existing-bill offset leaves bill and balance unchanged', () => {
  const h = setup(); const record = bill(h.ctx); h.ctx.addRecord(record); h.ctx.saveUtilityDeposit();
  const before = JSON.stringify(h.data());
  h.ctx.confirm = () => false; h.ctx.applyUtilityCreditToRecord(record.id);
  assert.equal(JSON.stringify(h.data()), before);
  h.ctx.confirm = () => true;
  h.ctx.localStorage.setItem = () => { throw new Error('quota'); };
  h.ctx.applyUtilityCreditToRecord(record.id);
  assert.equal(JSON.stringify(h.data()), before);
  assert.match(h.alerts.at(-1), /未抵扣/);
});

test('3000 deposit offsets only water and electricity, persists, and leaves previews read-only', () => {
  const h = setup(); h.ctx.saveUtilityDeposit();
  assert.equal(h.ctx.utilityBalance('6F'), 3000);
  assert.equal(h.ctx.utilityBalance('5F'), 0);
  const record = bill(h.ctx);
  assert.equal(record.utilityCredit, 800);
  assert.equal(record.utilityBalanceAfter, 2200);
  assert.equal(record.total, 12170);
  assert.equal(h.ctx.utilityBalance('6F'), 3000);
  h.ctx.addRecord(record);
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
  h.ctx.loadRecords(); h.ctx.loadUtilityDeposits();
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
});

test('insufficient credit charges only shortfall; no utility charges leave rent untouched', () => {
  const h = setup(); h.elements.utilityAmount.value = '200'; h.ctx.saveUtilityDeposit();
  const record = bill(h.ctx);
  assert.equal(record.utilityCredit, 200);
  assert.equal(record.utilityBalanceAfter, 0);
  assert.equal(record.total, 12770);
  const rent = h.ctx.buildRecord('6F', '2026-09-09', 0, 0, 0, { gas: 100 });
  assert.equal(rent.utilityCredit, 0); assert.equal(rent.total, 12100);
  h.ctx.addRecord(record);
  assert.equal(bill(h.ctx).utilityCredit, 0);
});

test('deleting bills refunds credit, clearing keeps deposits, and spent deposits cannot be removed', () => {
  const h = setup(); h.ctx.saveUtilityDeposit();
  const record = bill(h.ctx); h.ctx.addRecord(record);
  const id = h.data().utilityDeposits[0].id;
  h.ctx.deleteUtilityDeposit(id);
  assert.equal(h.data().utilityDeposits.length, 1);
  h.ctx.deleteRecord(record.id);
  assert.equal(h.ctx.utilityBalance('6F'), 3000);
  h.ctx.addRecord(bill(h.ctx)); h.ctx.clearHistory();
  assert.equal(h.ctx.utilityBalance('6F'), 3000);
  h.ctx.deleteUtilityDeposit(id);
  assert.equal(h.ctx.utilityBalance('6F'), 0);
});

test('failed deposit and bill writes preserve balances and input', () => {
  const h = setup(); h.ctx.saveUtilityDeposit();
  h.ctx.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => h.ctx.addRecord(bill(h.ctx)), /quota/);
  assert.equal(h.ctx.utilityBalance('6F'), 3000);
  h.elements.utilityAmount.value = '500'; h.ctx.saveUtilityDeposit();
  assert.equal(h.ctx.utilityBalance('6F'), 3000);
  assert.equal(h.elements.utilityAmount.value, '500');
});

test('CSV and restore preserve deposits and credit; malformed credit and insufficient backup fail', () => {
  const h = setup(); h.ctx.saveUtilityDeposit(); h.ctx.addRecord(bill(h.ctx));
  const backup = h.ctx.backupFromCsv(h.ctx.backupToCsv(h.data()));
  assert.equal(backup.utilityDeposits[0].amount, 3000);
  assert.equal(backup.records[0].utilityCredit, 800);
  h.ctx.restoreBackup(backup);
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
  backup.records[0].utilityCredit = 900;
  assert.throws(() => h.ctx.validateBackup(backup), /抵扣/);
  backup.records[0].utilityCredit = 800;
  backup.utilityDeposits = [];
  assert.throws(() => h.ctx.restoreBackup(backup), /不足/);
  assert.equal(h.ctx.utilityBalance('6F'), 2200);
});

test('old backups reset deposits and invalid deposits are rejected', () => {
  const h = setup();
  for (const value of ['0', '-1', '1.5', 'Infinity', '']) {
    h.elements.utilityAmount.value = value; h.ctx.saveUtilityDeposit();
    assert.equal(h.ctx.utilityBalance('6F'), 0);
  }
  h.elements.utilityAmount.value = '3000'; h.ctx.saveUtilityDeposit();
  h.ctx.restoreBackup({ records: [] });
  assert.equal(h.ctx.utilityBalance('6F'), 0);
  assert.deepEqual(JSON.parse(h.stored.get('landlord_utility_deposits')), []);
});
