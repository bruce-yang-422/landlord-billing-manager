// 帳單迄日含當日；以翌日為結束邊界，讓相鄰帳期不重複計費。
function alignMeterPeriod(first, last, from, to) {
  const dateMs = value => {
    const ms = Date.parse(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) throw new Error('請填寫有效的台電與抄表日期。');
    return ms;
  };
  const start = dateMs(from), end = dateMs(to) + 86400000;
  const actualStart = dateMs(first.date), actualEnd = dateMs(last.date);
  if (start >= end || actualStart >= actualEnd || !Number.isFinite(first.reading) || !Number.isFinite(last.reading) || first.reading < 0 || last.reading < first.reading) throw new Error('抄表日期或讀數順序不正確。');
  if (actualEnd <= start || actualStart >= end) throw new Error('抄表區間與台電計費區間沒有重疊，請補登抄表。');
  const actualDays = (actualEnd - actualStart) / 86400000;
  const billingDays = (end - start) / 86400000;
  const actualUsage = last.reading - first.reading;
  const dailyUsage = actualUsage / actualDays;
  const alignedStart = first.reading + dailyUsage * ((start - actualStart) / 86400000);
  const alignedEnd = first.reading + dailyUsage * ((end - actualStart) / 86400000);
  if (alignedStart < 0) throw new Error('回推讀數小於零，請補登更接近帳期的抄表紀錄。');
  return { actualDays, billingDays, actualUsage, dailyUsage, alignedStart, alignedEnd,
    usage: dailyUsage * billingDays, endBoundary: new Date(end).toISOString().slice(0, 10),
    estimated: start !== actualStart || end !== actualEnd };
}

function meterAlignmentNote(first, last, from, to, result) {
  const n = value => Number(value.toFixed(6));
  return `台電計費 ${from}～${to}（含迄日，共 ${result.billingDays} 天；結束邊界 ${result.endBoundary}）。實際抄表 ${first.date}：${first.reading} 度 → ${last.date}：${last.reading} 度，${result.actualDays} 天用電 ${n(result.actualUsage)} 度。日均 ${n(result.dailyUsage)} 度；${result.estimated ? '按日均估算對齊' : '實際讀數對齊'}：${from} 約 ${n(result.alignedStart)} 度、${result.endBoundary} 約 ${n(result.alignedEnd)} 度，6F 本期${result.estimated ? '估計' : ''}用電 ${n(result.usage)} 度。${result.estimated ? '估算假設每日平均用電相同，實際用電可能不同。' : ''}`;
}

// 住宅夏月為 6/1～9/30，起訖日皆計入；跨年也逐年取交集。
function billingSeasonDays(from, to) {
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to) || from > to) throw new Error('請填寫有效的台電帳單區間。');
  const start = Date.parse(from), end = Date.parse(to) + 86400000;
  let summerDays = 0;
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    const summerStart = Date.parse(`${String(year).padStart(4, '0')}-06-01`);
    const summerEnd = Date.parse(`${String(year).padStart(4, '0')}-10-01`);
    summerDays += Math.max(0, Math.min(end, summerEnd) - Math.max(start, summerStart)) / 86400000;
  }
  const totalDays = (end - start) / 86400000;
  const otherDays = totalDays - summerDays;
  return { summerDays, otherDays, totalDays, season: summerDays && otherDays ? 'mixed' : summerDays ? 'summer' : 'other' };
}

function billingSeasonNote(period) {
  return `費率按帳期天數加權：夏月 ${period.summerDays}/${period.totalDays}、非夏月 ${period.otherDays}/${period.totalDays}。各戶先計算兩個月累進理論電費並依天數加權，再按用電比例分攤與台電帳單的差額。`;
}

// 計算單戶理論電費；跨季依帳單公式，對同一度數的兩季費用加權。
function calcProgressiveFee(units, season) {
  if (typeof season === 'object' && season !== null) {
    const { summerDays, otherDays, totalDays } = season;
    if (![summerDays, otherDays, totalDays].every(Number.isFinite) || summerDays < 0 || otherDays < 0 || totalDays <= 0 || summerDays + otherDays !== totalDays) throw new Error('跨季計費天數不正確。');
    const parts = [['summer', summerDays], ['other', otherDays]].filter(([, days]) => days > 0)
      .map(([key, days]) => {
        const fee = calcProgressiveFee(units, key), weight = days / totalDays;
        return { total: fee.total * weight, rows: fee.rows.map(row => ({ ...row, season: key, weight, amount: row.amount * weight })) };
      });
    return { total: parts.reduce((sum, part) => sum + part.total, 0), rows: parts.flatMap(part => part.rows) };
  }
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

function utilityEnabled(unitId) {
  return appData.units.find(unit => unit.id === unitId)?.utilityEnabled !== false;
}

function planRecordCredit(record, selected = DEFAULT_CREDIT_ITEMS) {
  const fees = creditFees(record), items = recordCreditItems(record);
  if (!utilityEnabled(record.unitId)) return { credit: 0, items };
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
  if (!utilityEnabled(unitId)) return 0;
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
