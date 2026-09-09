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
