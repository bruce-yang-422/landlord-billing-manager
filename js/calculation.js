// 計算單戶理論電費（累進費率），回傳 { total, rows }
function calcProgressiveFee(units, season) {
  const tiers = ELECTRICITY_RATES[season];
  let remaining = units, total = 0, prev = 0;
  const rows = [];
  for (const tier of tiers) {
    if (remaining <= 0) break;
    const tierLimit = tier.limit === Infinity ? Infinity : tier.limit * BILLING_MONTHS;
    const cap = tierLimit === Infinity ? remaining : tierLimit - prev;
    const used = Math.min(cap, remaining);
    const amount = used * tier.price;
    total += amount;
    rows.push({
      label: prev === 0
        ? `${120 * BILLING_MONTHS} 度以下`
        : tierLimit === Infinity
          ? `${prev + 1} 度以上`
          : `${prev + 1}～${tierLimit} 度`,
      used, price: tier.price, amount,
    });
    remaining -= used;
    prev = tierLimit === Infinity ? prev : tierLimit;
  }
  return { total, rows };
}

// 計算兩戶累進分攤
// 回傳 { fee5F, fee6F, e5, e6, c5Theory, c6Theory, deltaC, ratio5, ratio6 }
function calcProgressiveSplit(totalBill, totalUnits, unit6Reading, season) {
  const e6 = unit6Reading;
  const e5 = totalUnits - e6;
  const { total: c5Theory, rows: rows5 } = calcProgressiveFee(e5, season);
  const { total: c6Theory, rows: rows6 } = calcProgressiveFee(e6, season);
  const deltaC = totalBill - (c5Theory + c6Theory);
  const ratio5 = e5 / totalUnits;
  const ratio6 = e6 / totalUnits;
  const share5 = deltaC * ratio5;
  const share6 = deltaC * ratio6;

  const billInt = Math.round(totalBill);
  const fee5 = Math.round(c5Theory + share5);
  const fee6 = billInt - fee5;

  return { fee5, fee6, e5, e6, c5Theory, c6Theory, deltaC, ratio5, ratio6, rows5, rows6 };
}

// 水費按人數分攤
// 回傳 { [unitId]: amount }
function calcWaterSplit(totalWater, units) {
  const totalPersons = units.reduce((sum, u) => sum + (u.persons || 1), 0);
  const result = {};
  units.forEach(unit => {
    result[unit.id] = totalPersons > 0
      ? Math.round(totalWater * (unit.persons || 1) / totalPersons)
      : 0;
  });
  // 確保加總等於總水費（最後一戶吸收四捨五入誤差）
  const calcSum = Object.values(result).reduce((a, b) => a + b, 0);
  const diff = Math.round(totalWater) - calcSum;
  if (diff !== 0 && units.length > 0) {
    result[units[units.length - 1].id] += diff;
  }
  return result;
}

// 產出單戶帳單紀錄
function utilityBalance(unitId, deposits = appData.utilityDeposits || [], records = appData.records) {
  return deposits.filter(row => row.unitId === unitId).reduce((sum, row) => sum + row.amount, 0)
    - records.filter(row => row.unitId === unitId).reduce((sum, row) => sum + (row.utilityCredit || 0), 0);
}

const CREDIT_ITEMS = [
  ['electricity', '電費'], ['water', '水費'], ['gas', '瓦斯費'], ['management', '管理費'], ['other', '雜費／其他']
];
const DEFAULT_CREDIT_ITEMS = ['electricity', 'water'];

function creditFees(record) {
  return { electricity: Math.max(0, record.electricity?.fee || 0), water: Math.max(0, record.waterFee || 0),
    gas: Math.max(0, record.gasFee || 0), management: Math.max(0, record.managementFee || 0), other: Math.max(0, record.otherFee || 0) };
}

function recordCreditItems(record) {
  if (record.creditItems) return { ...record.creditItems };
  // 舊帳單僅保存水電合計，依電費優先分配，確保不重複抵扣。
  const electricity = Math.min(record.utilityCredit || 0, Math.max(0, record.electricity?.fee || 0));
  return { electricity, water: (record.utilityCredit || 0) - electricity, gas: 0, management: 0, other: 0 };
}

function planRecordCredit(record, selected = DEFAULT_CREDIT_ITEMS) {
  const fees = creditFees(record), items = recordCreditItems(record);
  let remaining = Math.min(Math.max(0, utilityBalance(record.unitId)), Math.max(0, record.total));
  let credit = 0;
  for (const [key] of CREDIT_ITEMS) {
    const used = selected.includes(key) ? Math.min(remaining, Math.max(0, fees[key] - (items[key] || 0))) : 0;
    items[key] = (items[key] || 0) + used;
    remaining -= used; credit += used;
  }
  return { credit, items };
}

function creditItemSummary(record) {
  const items = recordCreditItems(record);
  return CREDIT_ITEMS.filter(([key]) => items[key] > 0).map(([key, label]) => `${label}${key === 'other' && record.otherDescription ? '（' + record.otherDescription + '）' : ''} $${items[key].toLocaleString()}`).join(' · ');
}

function utilityOffset(unitId, electricity, water) {
  return Math.min(Math.max(0, utilityBalance(unitId)), Math.max(0, electricity) + Math.max(0, water));
}

function buildRecord(unitId, billDate, electricityFee, electricityUsage, waterFee, extraFees, selected = DEFAULT_CREDIT_ITEMS) {
  const unit = getUnit(unitId);
  const total = (unit.rent || 0) + electricityFee + waterFee +
    (extraFees.gas || 0) + (extraFees.management || 0) + (extraFees.other || 0);
  const record = {
    id: Date.now() + Math.random(),
    unitId,
    date: billDate,
    rent: unit.rent || 0,
    electricity: {
      fee: electricityFee,
      usage: electricityUsage,
    },
    waterFee,
    gasFee: extraFees.gas || 0,
    managementFee: extraFees.management || 0,
    otherFee: extraFees.other || 0,
    ...(extraFees.otherDescription ? { otherDescription: extraFees.otherDescription } : {}),
    total,
  };
  const plan = planRecordCredit(record, selected);
  return { ...record, utilityCredit: plan.credit, creditItems: plan.items,
    utilityBalanceAfter: utilityBalance(unitId) - plan.credit, total: total - plan.credit };
}
