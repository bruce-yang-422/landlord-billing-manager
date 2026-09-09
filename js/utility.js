const UTILITY_KEY = 'landlord_utility_deposits';

function loadUtilityDeposits() {
  appData.utilityDeposits = JSON.parse(localStorage.getItem(UTILITY_KEY) || '[]');
}

function availableRecordCredit(record) {
  const unpaid = Math.max(0, (record.electricity?.fee || 0) + (record.waterFee || 0) - (record.utilityCredit || 0));
  return Math.min(unpaid, Math.max(0, utilityBalance(record.unitId)), Math.max(0, record.total));
}

function applyUtilityCreditToRecord(id) {
  const record = appData.records.find(row => String(row.id) === String(id));
  if (!record) return;
  const credit = availableRecordCredit(record);
  if (credit <= 0) { alert('目前沒有可抵扣的水電費或儲值餘額。'); return; }
  if (!confirm(`${getUnit(record.unitId).label} ${record.date} 帳單將抵扣水電儲值 $${credit.toLocaleString()}，應收改為 $${(record.total - credit).toLocaleString()}。請確認這筆水電費尚未另行收款，確定抵扣？`)) return;
  const updated = { ...record, utilityCredit: (record.utilityCredit || 0) + credit,
    utilityBalanceAfter: utilityBalance(record.unitId) - credit, total: record.total - credit };
  const records = appData.records.map(row => row === record ? updated : row);
  try { saveRecords(records); }
  catch (error) { alert('未抵扣：' + error.message); return; }
  appData.records = records;
  renderHistory(); renderUtilityDeposits(); updateBillTotals();
  const report = document.getElementById('reportSection');
  if (report) report.style.display = 'none';
  alert('已抵扣水電儲值，請重新查看／複製更新後的帳單報表。');
}

function saveUtilityDeposit() {
  const unitId = document.getElementById('utilityUnit').value;
  const date = document.getElementById('utilityDate').value;
  const amount = Number(document.getElementById('utilityAmount').value);
  const note = document.getElementById('utilityNote').value.trim();
  if (!getUnit(unitId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || !Number.isSafeInteger(amount) || amount <= 0) {
    alert('請選擇有效日期，儲值金額須為正整數。'); return;
  }
  const rows = [...(appData.utilityDeposits || []), { id: Date.now() + Math.random(), unitId, date, amount, note }];
  try { localStorage.setItem(UTILITY_KEY, JSON.stringify(rows)); }
  catch (error) { alert('儲值未儲存：' + error.message); return; }
  appData.utilityDeposits = rows;
  document.getElementById('utilityAmount').value = '';
  document.getElementById('utilityNote').value = '';
  renderUtilityDeposits(); updateBillTotals(); renderHistory();
  alert('水電費儲值已登記。既有帳單可到歷史資料按「抵扣水電儲值」。');
}

function deleteUtilityDeposit(id) {
  const rows = appData.utilityDeposits.filter(row => row.id !== id);
  if (appData.units.some(unit => utilityBalance(unit.id, rows) < 0)) {
    alert('這筆儲值已用於抵扣帳單，請先刪除相關帳單再更正儲值。'); return;
  }
  if (!confirm('確定刪除這筆水電費儲值？')) return;
  try { localStorage.setItem(UTILITY_KEY, JSON.stringify(rows)); }
  catch (error) { alert('未刪除：' + error.message); return; }
  appData.utilityDeposits = rows;
  renderUtilityDeposits(); updateBillTotals(); renderHistory();
}

function renderUtilityDeposits() {
  const balances = document.getElementById('utilityBalances');
  if (!balances) return;
  balances.textContent = appData.units.map(unit => `${unit.label} 水電費餘額：$${utilityBalance(unit.id).toLocaleString()}`).join('　｜　');
  const list = document.getElementById('utilityHistory');
  list.replaceChildren();
  const rows = [...(appData.utilityDeposits || [])].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (!rows.length) list.textContent = '尚無儲值紀錄。';
  rows.forEach(row => {
    const item = document.createElement('p');
    const text = document.createElement('span');
    text.textContent = `${row.date} · ${getUnit(row.unitId).label} · 儲值 $${row.amount.toLocaleString()}${row.note ? ' · ' + row.note : ''} `;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'inline-action'; button.textContent = '刪除儲值';
    button.addEventListener('click', () => deleteUtilityDeposit(row.id));
    item.append(text, button); list.append(item);
  });
}
