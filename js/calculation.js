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
function buildRecord(unitId, billDate, electricityFee, electricityUsage, waterFee, extraFees) {
  const unit = getUnit(unitId);
  const total = (unit.rent || 0) + electricityFee + waterFee +
    (extraFees.gas || 0) + (extraFees.management || 0) + (extraFees.other || 0);
  return {
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
    total,
  };
}
