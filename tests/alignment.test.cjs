const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/calculation.js'), 'utf8'), ctx);
const first = { date: '2026-09-04', reading: 11378.4 };
const last = { date: '2026-11-10', reading: 11763.2 };

test('late photos estimate exactly the 62 billed days, excluding excess days', () => {
  const r = ctx.alignMeterPeriod(first, last, '2026-09-03', '2026-11-03');
  assert.equal(r.actualDays, 67);
  assert.equal(r.billingDays, 62);
  assert.equal(r.endBoundary, '2026-11-04');
  assert.ok(Math.abs(r.usage - 384.8 / 67 * 62) < 1e-9);
  assert.ok(Math.abs(r.alignedEnd - r.alignedStart - r.usage) < 1e-9);
  assert.equal(r.estimated, true);
});

test('adjacent periods share the same estimated boundary with no duplicate day', () => {
  const a = ctx.alignMeterPeriod(first, last, '2026-09-03', '2026-10-02');
  const b = ctx.alignMeterPeriod(first, last, '2026-10-03', '2026-11-03');
  const full = ctx.alignMeterPeriod(first, last, '2026-09-03', '2026-11-03');
  assert.equal(a.endBoundary, '2026-10-03');
  assert.equal(a.alignedEnd, b.alignedStart);
  assert.ok(Math.abs(a.usage + b.usage - full.usage) < 1e-9);
});

test('exact boundaries, early photos, leap days and zero usage are supported', () => {
  const a = { date: '2024-02-28', reading: 0 };
  const b = { date: '2024-03-01', reading: 20 };
  const exact = ctx.alignMeterPeriod(a, b, '2024-02-28', '2024-02-29');
  assert.equal(exact.billingDays, 2);
  assert.equal(exact.usage, 20);
  assert.equal(exact.estimated, false);
  assert.equal(ctx.alignMeterPeriod(a, b, '2024-02-29', '2024-03-01').usage, 20);
  assert.equal(ctx.alignMeterPeriod(a, {...b, reading: 0}, '2024-02-28', '2024-02-29').usage, 0);
});

test('bad dates, reversed or disjoint readings and negative extrapolation fail', () => {
  for (const [a,b,from,to] of [
    [first,last,'2026-02-30','2026-11-03'],
    [first,last,'2026-11-04','2026-09-03'],
    [last,first,'2026-09-03','2026-11-03'],
    [first,{...last,reading: 1},'2026-09-03','2026-11-03'],
    [first,last,'2027-01-01','2027-02-01'],
    [{...first,reading: 0},last,'2026-09-03','2026-11-03']
  ]) assert.throws(() => ctx.alignMeterPeriod(a,b,from,to));
});
