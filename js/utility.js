const UTILITY_KEY = 'landlord_utility_deposits';

function loadUtilityDeposits() {
  appData.utilityDeposits = JSON.parse(localStorage.getItem(UTILITY_KEY) || '[]');
}

function setUtilityEnabled(unitId, enabled) {
  if (!getUnit(unitId) || typeof enabled !== 'boolean') return;
  const units = appData.units.map(unit => unit.id === unitId ? { ...unit, utilityEnabled: enabled } : unit);
  try { localStorage.setItem('landlord_units', JSON.stringify(units)); }
  catch (error) { alert('開關未儲存：' + error.message); renderUtilityDeposits(); return; }
  appData.units = units;
  renderUtilityDeposits(); updateBillTotals(); renderHistory();
}

function availableRecordCredit(record, selected = DEFAULT_CREDIT_ITEMS) {
  return planRecordCredit(record, selected).credit;
}

function applyUtilityCreditToRecord(id, selected = DEFAULT_CREDIT_ITEMS) {
  const record = appData.records.find(row => String(row.id) === String(id));
  if (!record) return;
  if (!utilityEnabled(record.unitId)) { alert('此樓層已停用儲值，請先開啟儲值功能。'); return; }
  const plan = planRecordCredit(record, selected);
  const credit = plan.credit;
  if (credit <= 0) { alert('請勾選尚未抵扣的費用，並確認有儲值餘額。'); return; }
  if (!confirm(`${getUnit(record.unitId).label} ${record.date} 帳單將抵扣儲值 $${credit.toLocaleString()}，應收改為 $${(record.total - credit).toLocaleString()}。請確認勾選費用尚未另行收款，確定抵扣？`)) return;
  const updated = { ...record, utilityCredit: (record.utilityCredit || 0) + credit,
    creditItems: plan.items, utilityBalanceAfter: utilityBalance(record.unitId) - credit, total: record.total - credit };
  const records = appData.records.map(row => row === record ? updated : row);
  try { saveRecords(records); }
  catch (error) { alert('未抵扣：' + error.message); return; }
  appData.records = records;
  renderHistory(); renderUtilityDeposits(); updateBillTotals();
  const report = document.getElementById('reportSection');
  if (report) report.style.display = 'none';
  alert('已抵扣儲值，請重新查看／複製更新後的帳單報表。');
}

function saveUtilityDeposit() {
  const unitId = document.getElementById('utilityUnit').value;
  if (!utilityEnabled(unitId)) { alert('此樓層已停用儲值，請先開啟儲值功能。'); return; }
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
  alert('水電費儲值已登記。可在本頁「待抵扣費用」選擇既有帳單抵扣。');
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

// 抵扣來自帳單累計值，避免額外建立扣款而重複計帳。
function utilityLedgerRows(floor = 'all', type = 'all') {
  const deposits = (appData.utilityDeposits || []).map(row => ({ ...row, type: 'deposit' }));
  const deductions = appData.records.filter(row => (row.utilityCredit || 0) > 0).map(row => ({
    id: row.id, unitId: row.unitId, date: row.date, type: 'deduction', amount: row.utilityCredit,
    note: creditItemSummary(row),
    currentNote: row.currentNote || ''
  }));
  return [...deposits, ...deductions].filter(row => (floor === 'all' || row.unitId === floor) && (type === 'all' || row.type === type))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function renderUtilityDeposits() {
  const balances = document.getElementById('utilityBalances');
  if (!balances) return;
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const money = value => '$' + value.toLocaleString('zh-TW');
  balances.replaceChildren();
  const enabledUnits = appData.units.filter(unit => utilityEnabled(unit.id));
  const empty = document.getElementById('utilityEmpty');
  if (empty) empty.hidden = enabledUnits.length > 0;
  for (const id of ['utilityWorkspace', 'utilityLedgerSection']) {
    const section = document.getElementById(id);
    if (section) section.hidden = enabledUnits.length === 0;
  }
  enabledUnits.forEach(unit => {
    const deposited = (appData.utilityDeposits || []).filter(row => row.unitId === unit.id).reduce((sum, row) => sum + row.amount, 0);
    const used = appData.records.filter(row => row.unitId === unit.id).reduce((sum, row) => sum + (row.utilityCredit || 0), 0);
    const card = node('article', 'utility-balance-card');
    card.append(node('h3', '', unit.label), node('p', 'screen-hint', '可用儲值餘額'), node('strong', 'utility-balance-value', money(deposited - used)));
    card.append(node('p', 'screen-hint', utilityEnabled(unit.id) ? '儲值功能已開啟' : '儲值功能已關閉；餘額與紀錄保留，可至設定重新開啟。'));
    const totals = node('div', 'utility-balance-totals');
    totals.append(node('span', '', '累計儲值 ' + money(deposited)), node('span', '', '已抵扣 ' + money(used)));
    card.append(totals); balances.append(card);
  });
  for (const [id, includeAll] of [['utilityUnit', false], ['utilityFloorFilter', true]]) {
    const select = document.getElementById(id);
    if (!select?.options) continue;
    const previous = select.value;
    select.replaceChildren();
    if (includeAll) {
      const option = node('option', '', '全部樓層'); option.value = 'all'; select.append(option);
    }
    for (const unit of enabledUnits) {
      const option = node('option', '', unit.label); option.value = unit.id; select.append(option);
    }
    select.value = enabledUnits.some(unit => unit.id === previous) ? previous : includeAll ? 'all' : enabledUnits[0]?.id || '';
    select.disabled = enabledUnits.length === 0;
  }
  const saveButton = document.getElementById('saveUtilityDepositBtn');
  if (saveButton) saveButton.disabled = enabledUnits.length === 0;
  const filter = document.getElementById('utilityFloorFilter');
  if (filter && filter.value !== 'all' && !enabledUnits.some(unit => unit.id === filter.value)) filter.value = 'all';
  const floor = filter?.value || 'all';
  const type = document.getElementById('utilityTypeFilter')?.value || 'all';
  const rows = utilityLedgerRows(floor, type).filter(row => utilityEnabled(row.unitId));
  const summary = document.getElementById('utilityLedgerSummary');
  if (summary) {
    const sum = type => rows.filter(row => row.type === type).reduce((total, row) => total + row.amount, 0);
    summary.textContent = `目前篩選：${rows.length} 筆 · 儲值 ${money(sum('deposit'))} · 抵扣 ${money(sum('deduction'))}`;
  }
  const list = document.getElementById('utilityHistory');
  list.replaceChildren();
  if (!rows.length) list.append(node('p', 'screen-hint', '目前沒有符合條件的儲值或抵扣紀錄。'));
  rows.forEach(row => {
    const item = node('article', 'utility-ledger-row');
    const content = node('div', 'utility-ledger-content');
    const deposit = row.type === 'deposit';
    content.append(node('p', 'utility-ledger-meta', `${row.date} · ${getUnit(row.unitId).label} · ${deposit ? '儲值日期' : '帳單日期'}`));
    content.append(node('h4', '', deposit ? '水電費儲值' : '帳單費用抵扣'));
    if (row.note) content.append(node('p', 'utility-ledger-note', row.note));
    if (row.currentNote) content.append(node('p', 'utility-ledger-note', row.currentNote));
    const action = node('div', 'utility-ledger-action');
    action.append(node('strong', deposit ? 'utility-credit' : 'utility-debit', `${deposit ? '+' : '−'}${money(row.amount)}`));
    const button = node('button', 'inline-action', deposit ? '刪除儲值' : '查看帳單');
    button.type = 'button';
    button.addEventListener('click', () => deposit ? deleteUtilityDeposit(row.id) : viewRecord(row.id));
    action.append(button); item.append(content, action); list.append(item);
  });
  const pending = document.getElementById('utilityPending');
  if (!pending) return;
  pending.replaceChildren();
  const unpaid = appData.records.filter(row => utilityEnabled(row.unitId) && (floor === 'all' || row.unitId === floor) &&
    Object.values(creditFees(row)).reduce((sum, fee) => sum + fee, 0) - (row.utilityCredit || 0) > 0)
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  if (!unpaid.length) pending.append(node('p', 'screen-hint', '目前沒有尚未抵扣的帳單費用。'));
  unpaid.forEach(row => {
    const item = node('div', 'utility-pending-row');
    const fees = creditFees(row), used = recordCreditItems(row);
    item.append(node('p', '', `${row.date} · ${getUnit(row.unitId).label}`));
    const choices = node('fieldset', 'credit-choices');
    choices.append(node('legend', '', '勾選本次抵扣項目'));
    let selected = [...DEFAULT_CREDIT_ITEMS];
    const button = node('button', 'inline-action');
    const refresh = () => {
      const credit = availableRecordCredit(row, selected);
      button.textContent = credit > 0 ? `抵扣 ${money(credit)}` : utilityBalance(row.unitId) <= 0 ? '餘額不足，請先儲值' : '請勾選可抵扣項目';
      button.disabled = credit <= 0;
    };
    for (const [key, label] of CREDIT_ITEMS) {
      const remaining = Math.max(0, fees[key] - (used[key] || 0));
      const field = node('label');
      const checkbox = node('input'); checkbox.type = 'checkbox';
      checkbox.checked = selected.includes(key) && remaining > 0;
      checkbox.disabled = remaining <= 0;
      checkbox.addEventListener('change', () => {
        selected = selected.filter(value => value !== key);
        if (checkbox.checked) selected.push(key);
        refresh();
      });
      field.append(checkbox, node('span', '', `${label}${key === 'other' && row.otherDescription ? '（' + row.otherDescription + '）' : ''}`)); choices.append(field);
    }
    button.type = 'button'; refresh();
    button.addEventListener('click', () => applyUtilityCreditToRecord(row.id, selected));
    item.append(choices);
    item.append(button); pending.append(item);
  });
}
