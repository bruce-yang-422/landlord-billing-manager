const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const ctx = vm.createContext({});
  for (const name of ['data', 'calculation', 'utility', 'utility-report']) vm.runInContext(fs.readFileSync(path.join(__dirname, `../js/${name}.js`), 'utf8'), ctx);
  ctx.getUnit = id => vm.runInContext('appData.units', ctx).find(u => u.id === id);
  ctx.seed = data => { ctx.fixture = data; vm.runInContext('Object.assign(appData, fixture)', ctx); };
  return ctx;
}

test('6F statement exports actual itemized deductions and running balances without other floors or waived fees', () => {
  const c = setup();
  c.seed({utilityDeposits:[{id:1,unitId:'6F',date:'2026-08-27',amount:3000,note:'水電費預付'},{id:2,unitId:'5F',date:'2026-08-27',amount:500}],
    records:[{id:3,unitId:'6F',date:'2026-09-08',electricity:{fee:398},utilityCredit:398},
      {id:4,unitId:'6F',date:'2026-11-10',electricity:{fee:916},waterFee:70,waterChargeEnabled:false,utilityCredit:916,creditItems:{electricity:916,water:0,gas:0,management:0,other:0}},
      {id:5,unitId:'6F',date:'2026-11-11',electricity:{fee:100},utilityCredit:0}]});
  const before = JSON.stringify(vm.runInContext('appData',c));
  const s=c.buildUtilityStatement('6F');
  assert.equal(s.rows.length,3);
  assert.deepEqual(Array.from(s.rows,r=>r.balance),[3000,2602,1686]);
  assert.equal(s.deposited,3000);assert.equal(s.deducted,1314);assert.equal(s.balance,1686);
  assert.deepEqual(Array.from(s.rows,r=>r.item),['存入儲值','電費扣款','電費扣款']);
  assert.equal(JSON.stringify(vm.runInContext('appData',c)),before);
});

test('same-day deposit precedes each itemized gas, water and miscellaneous deduction', () => {
  const c=setup();
  c.seed({utilityDeposits:[{id:20,unitId:'6F',date:'2026-09-08',amount:500}],records:[{id:10,unitId:'6F',date:'2026-09-08',utilityCredit:350,otherDescription:'換鎖',creditItems:{electricity:0,water:100,gas:200,management:0,other:50}}]});
  const s=c.buildUtilityStatement('6F');
  assert.deepEqual(Array.from(s.rows,r=>r.balance),[500,400,200,150]);
  assert.equal(s.rows.at(-1).note,'換鎖');
});

test('paginated ledger carries balances and retains all text and amounts exactly once', () => {
  const c=setup();
  const note='備註'.repeat(1000);
  const statement={rows:[{date:'2026-01-01',item:'存入儲值',note,deposit:3000,deduction:0,balance:3000},
    ...Array.from({length:30},(_,i)=>({date:'2026-02-01',item:'電費扣款',note:'',deposit:0,deduction:10,balance:2990-i*10}))]};
  const pages=c.utilityStatementPages(statement,text=>text.length*22);
  assert.ok(pages.length>1);
  const segments=Array.from(pages).flatMap(p=>Array.from(p.rows));
  assert.equal(segments.filter(r=>!r.continuation).reduce((sum,r)=>sum+r.deposit,0),3000);
  assert.equal(segments.filter(r=>!r.continuation).reduce((sum,r)=>sum+r.deduction,0),300);
  assert.equal(segments.filter(r=>r.deposit===3000).flatMap(r=>Array.from(r.lines)).join(''),'存入儲值｜'+note);
  for(let i=1;i<pages.length;i++)assert.equal(pages[i].opening,pages[i-1].closing);
  assert.equal(pages.at(-1).closing,2700);
  assert.ok(pages.every(p=>p.rows.reduce((sum,r)=>sum+r.height,0)<=860));
});

test('empty ledger is printable and mismatched deduction details are rejected', () => {
  const c=setup();c.seed({utilityDeposits:[],records:[]});
  assert.equal(c.buildUtilityStatement('6F').balance,0);
  assert.equal(c.utilityStatementPages({rows:[]},()=>0).length,1);
  c.seed({utilityDeposits:[],records:[{id:1,unitId:'6F',date:'2026-01-01',utilityCredit:100,creditItems:{water:90}}]});
  assert.throws(()=>c.buildUtilityStatement('6F'),/不一致/);
});
