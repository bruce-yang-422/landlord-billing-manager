const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const c=vm.createContext({});
for(const file of ['data.js','calculation.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),c);
const plain=x=>JSON.parse(JSON.stringify(x));

test('November 2026 PDF: 28 summer days and 34 non-summer days reproduce its weighted formula',()=>{
 const p=c.billingSeasonDays('2026-09-03','2026-11-03');
 assert.deepEqual(plain(p),{summerDays:28,otherDays:34,totalDays:62,season:'mixed'});
 const expected=(1.78*240+2.55*420+3.80*340+5.14*97)*28/62+(1.78*240+2.26*420+3.13*340+4.24*97)*34/62;
 assert.ok(Math.abs(c.calcProgressiveFee(1097,p).total-expected)<1e-9);
 // PDF 列印金額僅一位小數；公式以完整精度重算與列示值差小於 0.1 元。
 assert.ok(Math.abs(expected-3049.1)<0.1);
 assert.equal(Math.round(3049.1+24.4-10),3064);
 const r=c.calcProgressiveSplit(3064,1097,384.8/67*62,p);
 assert.equal(r.fee5,2148);assert.equal(r.fee6,916);
 assert.equal(r.fee5+r.fee6,3064);
 // Applying tiers to separately apportioned usage would incorrectly reset the lower tiers.
 const wrong=c.calcProgressiveFee(r.e6*28/62,'summer').total+c.calcProgressiveFee(r.e6*34/62,'other').total;
 assert.notEqual(r.c6Theory,wrong);
});

test('season boundaries count inclusive endpoints and support single days and leap years',()=>{
 for(const [from,to,summer,other] of [
 ['2026-05-31','2026-06-01',1,1],['2026-09-30','2026-10-01',1,1],
 ['2026-06-01','2026-09-30',122,0],['2026-10-01','2026-10-01',0,1],
 ['2024-01-01','2024-12-31',122,244],['2026-12-31','2027-06-01',1,152],
 ['2026-09-30','2027-06-01',2,243]
 ]) {
  const p=c.billingSeasonDays(from,to);
  assert.equal(p.summerDays,summer,from);assert.equal(p.otherDays,other,from);
  assert.equal(p.totalDays,summer+other);
 }
});

test('single-season periods preserve old fees and every split conserves the full bill',()=>{
 for(const [from,to,key] of [['2026-07-01','2026-08-31','summer'],['2026-01-01','2026-02-28','other']]) {
  const p=c.billingSeasonDays(from,to);
  for(const usage of [0,240,384.8,1097]) {
   const a=c.calcProgressiveSplit(3064,1097,usage,p),b=c.calcProgressiveSplit(3064,1097,usage,key);
   assert.equal(a.fee5,b.fee5);assert.equal(a.fee6,b.fee6);
  }
 }
 const p=c.billingSeasonDays('2026-09-03','2026-11-03');
 for(const usage of [0,240,356.08,1097]) {
  const r=c.calcProgressiveSplit(3064,1097,usage,p);
  assert.equal(r.fee5+r.fee6,3064);assert.equal(r.e5+r.e6,1097);
 }
});

test('invalid dates and malformed day weights are rejected',()=>{
 for(const [from,to] of [['','2026-11-03'],['2026-02-30','2026-11-03'],['2026-11-03','2026-09-03']]) assert.throws(()=>c.billingSeasonDays(from,to));
 for(const p of [{summerDays:1,otherDays:1,totalDays:1},{summerDays:0,otherDays:0,totalDays:0},{summerDays:-1,otherDays:2,totalDays:1}]) assert.throws(()=>c.calcProgressiveFee(300,p));
});
