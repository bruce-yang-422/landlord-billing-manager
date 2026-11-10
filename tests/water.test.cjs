const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/calculation.js'), 'utf8'), ctx);
const units = [{id: '5F', persons: 5, moveInDate: '2026-08-26'}, {id: '6F', persons: 1, moveInDate: '2026-08-02'}];

test('water bill allocates 209/70/145 by 61 days and occupied person-days', () => {
  const r = ctx.calcWaterSettlement(424, units, '2026-08-01', '2026-10-01');
  assert.equal(r.days, 61);
  assert.equal(r.parts[0].occupiedDays, 36);
  assert.equal(r.parts[1].occupiedDays, 60);
  assert.equal(r.fees['5F'], 209);
  assert.equal(r.fees['6F'], 70);
  assert.equal(r.owner, 145);
});

test('full occupancy, future move-ins and rounding preserve total and nonnegative shares', () => {
  for (const dates of [['2026-07-01','2026-07-01'], ['2026-11-01','2026-11-01'], ['2026-07-01','2026-09-30'], ['', '']]) {
    const occupants = units.map((u,i) => ({...u, moveInDate: dates[i]}));
    for (const amount of [1,2,424]) {
      const r = ctx.calcWaterSettlement(amount, occupants, '2026-08-01', '2026-10-01');
      assert.equal(r.fees['5F'] + r.fees['6F'] + r.owner, amount);
      assert.ok(r.owner >= 0);
    }
  }
  const vacant = ctx.calcWaterSettlement(424, units.map(u => ({...u, moveInDate: '2026-10-01'})), '2026-08-01', '2026-10-01');
  assert.equal(vacant.owner,424);
});

test('water dates and occupants are required for positive bills, zero bill needs no dates', () => {
  assert.equal(ctx.calcWaterSettlement(0, units, '', '').owner,0);
  for (const [from,to] of [['',''],['2026-02-30','2026-10-01'],['2026-10-01','2026-08-01']]) assert.throws(() => ctx.calcWaterSettlement(424,units,from,to));
  assert.throws(() => ctx.calcWaterSettlement(424,[{id:'5F',persons:0}],'2026-08-01','2026-10-01'));
});
