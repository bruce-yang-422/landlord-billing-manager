// ── 即時電費預覽 ───────────────────────────────────────────

function updateElectricityPreview() {
  const totalBill  = parseFloat(document.getElementById('taipowerBill')?.value) || 0;
  const totalUnits = parseFloat(document.getElementById('taipowerUnits')?.value) || 0;
  const prev6      = parseFloat(document.getElementById('reading6Prev')?.value) || 0;
  const curr6      = parseFloat(document.getElementById('reading6Curr')?.value) || 0;
  const season     = document.getElementById('season')?.value || 'summer';

  const hasReadings = document.getElementById('reading6Prev')?.value !== '' && document.getElementById('reading6Curr')?.value !== '';
  const e6 = curr6 - prev6;
  const e5 = totalUnits - e6;

  // 更新度數顯示
  const usage5El = document.getElementById('usage5F');
  const usage6El = document.getElementById('usage6F');
  if (usage5El) usage5El.textContent = (hasReadings && totalUnits > 0 && e5 >= 0) ? `${e5} 度` : '—';
  if (usage6El) usage6El.textContent = (hasReadings && e6 >= 0) ? `${e6} 度` : '—';

  if (hasReadings && totalBill > 0 && totalUnits > 0 && e6 >= 0 && e5 >= 0) {
    const result = calcProgressiveSplit(totalBill, totalUnits, e6, season);
    const f5 = `$${result.fee5.toLocaleString()}`;
    const f6 = `$${result.fee6.toLocaleString()}`;

    const ids5 = ['elecFee5F', 'elecFee5F_card'];
    const ids6 = ['elecFee6F', 'elecFee6F_card'];
    ids5.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = f5; });
    ids6.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = f6; });
  } else {
    ['elecFee5F', 'elecFee5F_card', 'elecFee6F', 'elecFee6F_card'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '—';
    });
  }
  updateBillTotals();
}

// ── 即時水費預覽 ───────────────────────────────────────────

function updateWaterPreview() {
  const totalWater = parseFloat(document.getElementById('totalWater')?.value) || 0;
  if (totalWater <= 0) {
    appData.units.forEach(u => {
      [`waterFee${u.id}`, `waterFee${u.id}_card`].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = '—';
      });
    });
    updateBillTotals();
    return;
  }
  const split = calcWaterSplit(totalWater, appData.units);
  appData.units.forEach(u => {
    [`waterFee${u.id}`, `waterFee${u.id}_card`].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = `$${split[u.id].toLocaleString()}`;
    });
  });
  updateBillTotals();
}

// ── 存檔單戶帳單 ───────────────────────────────────────────

function currentBillDraft() {
  const number = id => {
    const value = document.getElementById(id)?.value ?? '';
    const result = value === '' ? 0 : Number(value);
    if (!Number.isFinite(result) || result < 0) throw new Error('費用與讀數請填入有效的非負數字。');
    return result;
  };
  const includeElectricity = document.getElementById('includeElectricity')?.checked !== false;
  const totalWater = number('totalWater');
  const water = calcWaterSplit(totalWater, appData.units);
  let split = null;
  const season = document.getElementById('season')?.value || 'summer';
  const totalBill = includeElectricity ? number('taipowerBill') : 0;
  const totalUnits = includeElectricity ? number('taipowerUnits') : 0;
  const previous = includeElectricity ? number('reading6Prev') : 0;
  const current = includeElectricity ? number('reading6Curr') : 0;
  if (includeElectricity) {
    if (typeof refreshBillingReadings === 'function') {
      const from = document.getElementById('taipowerStartDate').value;
      const to = document.getElementById('taipowerEndDate').value;
      if (!validBillingDate(from) || !validBillingDate(to) || from >= to) throw new Error('請填寫有效的台電帳單區間。');
    }
    if (totalBill <= 0 || totalUnits <= 0) throw new Error('請填入台電帳單金額與總度數；本次不收電費可取消勾選。');
    if (!document.getElementById('reading6Prev')?.value || !document.getElementById('reading6Curr')?.value) throw new Error('請選擇台電計費期間的起始與結束抄表紀錄。');
    const usage = current - previous;
    if (usage < 0 || usage > totalUnits) throw new Error('6F 用電量須介於 0 與台電總度數之間。');
    split = calcProgressiveSplit(totalBill, totalUnits, usage, season);
  }
  const units = appData.units.map(unit => {
    const extras = { gas: number(`${unit.id}_gas`), management: number(`${unit.id}_management`), other: number(`${unit.id}_other`) };
    const fee = split ? (unit.id === '5F' ? split.fee5 : split.fee6) : 0;
    const usage = split ? (unit.id === '5F' ? split.e5 : split.e6) : 0;
    return { id: unit.id, rent: unit.rent || 0, fee, usage, water: water[unit.id], extras,
      total: (unit.rent || 0) + fee + water[unit.id] + extras.gas + extras.management + extras.other };
  });
  return { includeElectricity, split, season, totalBill, totalUnits, previous, current, units };
}

function updateBillTotals() {
  const status = document.getElementById('billDraftStatus');
  const section = document.getElementById('electricityBillingSection');
  const included = document.getElementById('includeElectricity')?.checked !== false;
  if (section) section.hidden = !included;
  const money = value => '$' + value.toLocaleString();
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  appData.units.forEach(unit => {
    document.querySelectorAll(`.preview-rent-${unit.id}`).forEach(el => { el.textContent = money(unit.rent || 0); });
    for (const [field, label] of [['gas','gasFee'],['management','managementFee'],['other','otherFee']]) {
      const value = Number(document.getElementById(`${unit.id}_${field}`)?.value || 0);
      set(`${label}${unit.id}_card`, Number.isFinite(value) && value >= 0 ? money(value) : '請確認金額');
    }
    if (!included) set(`elecFee${unit.id}_card`, '本次不收取');
  });
  try {
    const draft = currentBillDraft();
    draft.units.forEach(unit => {
      set(`total${unit.id}_card`, money(unit.total));
      set(`waterFee${unit.id}_card`, money(unit.water));
      set(`elecFee${unit.id}_card`, included ? money(unit.fee) : '本次不收取');
    });
    if (status) status.textContent = '應收總額包含租金、電費、水費、瓦斯、管理費與其他費用。';
  } catch (error) {
    appData.units.forEach(unit => set(`total${unit.id}_card`, '待完成資料'));
    if (status) status.textContent = error.message;
  }
}

function saveBill(unitId) {
  if (typeof refreshBillingReadings === 'function') refreshBillingReadings();
  const billDate = document.getElementById('billDate')?.value;
  if (!billDate) { alert('請選擇帳單日期！'); return; }
  let draft;
  try { draft = currentBillDraft(); } catch (error) { alert(error.message); return; }
  const unit = draft.units.find(row => row.id === unitId);
  if (!unit) return;
  const record = buildRecord(unitId, billDate, unit.fee, unit.usage, unit.water, unit.extras);
  if (draft.includeElectricity) {
    if (unitId === '6F') {
      record.electricity.prevReading = draft.previous;
      record.electricity.currReading = draft.current;
    }
    record.electricity.season = draft.season;
    const periodStart = document.getElementById('taipowerStartDate')?.value;
    const periodEnd = document.getElementById('taipowerEndDate')?.value;
    if (periodStart && periodEnd) Object.assign(record.electricity, { periodStart, periodEnd });
    record.electricity.prevDate = document.getElementById('billingStartReading').value;
    record.electricity.currDate = document.getElementById('billingEndReading').value;
    const s = draft.split;
    record.splitInfo = { totalBill: draft.totalBill, totalUnits: draft.totalUnits, e5: s.e5, e6: s.e6,
      c5Theory: s.c5Theory, c6Theory: s.c6Theory, deltaC: s.deltaC, ratio5: s.ratio5, ratio6: s.ratio6 };
  }
  try { addRecord(record); } catch (error) { alert('帳單未儲存：' + error.message); return; }
  renderHistory();
  renderMeterHistory();
  generateReport(record);
  alert(`✅ ${getUnit(unitId).label} 帳單已存檔！`);
  window.PWAInstall?.showAfterEngagement();
}

// ── LINE 報表 ──────────────────────────────────────────────

function fmtDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) throw new Error();
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  } catch {
    return dateStr || '—';
  }
}

function generateReport(record) {
  const unit = getUnit(record.unitId);
  let r = `📅 ${fmtDate(record.date)} 房租費用通知（${unit.label}）\n\n`;

  if (record.electricity?.periodStart && record.electricity?.periodEnd) {
    r += `台電用電區間：${record.electricity.periodStart}～${record.electricity.periodEnd}\n`;
    if (record.electricity.prevDate && record.electricity.currDate) r += `採用抄表區間：${record.electricity.prevDate}～${record.electricity.currDate}\n\n`;
  }

  // 電費計算說明
  if (record.electricity?.fee > 0 && record.splitInfo) {
    const s = record.splitInfo;
    const isThis6F = record.unitId === '6F';
    const myUsage  = isThis6F ? s.e6 : s.e5;
    r += `⚡ 電費計算（累進分攤）\n`;
    r += `台電帳單：$${s.totalBill.toLocaleString()}｜總用電：${s.totalUnits} 度\n`;
    r += `本戶用電：${myUsage} 度（佔 ${((myUsage/s.totalUnits)*100).toFixed(1)}%）\n`;
    r += `本戶電費：$${record.electricity.fee.toLocaleString()}\n\n`;
  }

  r += `💰 應繳金額\n`;
  if (record.rent > 0)           r += `房租：$${record.rent.toLocaleString()}\n`;
  if (record.electricity?.fee > 0) r += `電費：$${record.electricity.fee.toLocaleString()}\n`;
  if (record.waterFee > 0)       r += `水費：$${record.waterFee.toLocaleString()}\n`;
  if (record.gasFee > 0)         r += `瓦斯：$${record.gasFee.toLocaleString()}\n`;
  if (record.managementFee > 0)  r += `管理費：$${record.managementFee.toLocaleString()}\n`;
  if (record.otherFee > 0)       r += `其他：$${record.otherFee.toLocaleString()}\n`;
  r += `──────────────\n`;
  r += `總計：$${record.total.toLocaleString()}\n\n`;

  if (unit.bankCode && unit.accountNumber) {
    r += `🏦 匯款資訊\n`;
    r += `(${unit.bankCode}) ${unit.accountNumber}\n`;
    r += `戶名：${unit.payeeName}\n\n`;
  }

  if (unit.tenantNote?.trim()) {
    r += `📝 備註\n${unit.tenantNote}\n\n`;
  }

  const reportText = document.getElementById('reportText');
  const reportSection = document.getElementById('reportSection');
  if (reportText) reportText.textContent = r;
  if (reportSection) {
    reportSection.style.display = 'block';
    navigateTo('backup');
    setTimeout(() => reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
}

function copyReport() {
  const text = document.getElementById('reportText')?.textContent;
  if (!text) { alert('❌ 找不到報表內容'); return; }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => alert('✅ 報表已複製到剪貼簿！'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-999px;left:-999px';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); alert('✅ 報表已複製到剪貼簿！'); }
  catch { alert('❌ 複製失敗，請手動選取文字複製'); }
  document.body.removeChild(ta);
}

// ── 歷史記錄 ───────────────────────────────────────────────

let historyFilter = 'all'; // 'all' | '5F' | '6F'

function setHistoryFilter(filter) {
  historyFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderHistory();
}

let historyView = 'cards';
try { if (localStorage.getItem('landlord_history_view') === 'table') historyView = 'table'; } catch (_) {}

function setHistoryView(view) {
  historyView = view === 'table' ? 'table' : 'cards';
  try { localStorage.setItem('landlord_history_view', historyView); } catch (_) {}
  renderHistory();
}

function renderHistory() {
  const wall = document.getElementById('historyBody');
  if (!wall) return;
  wall.replaceChildren();
  wall.className = historyView === 'table' ? 'history-table-scroll' : 'history-wall';
  document.querySelectorAll('[data-history-view]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.historyView === historyView));
  });
  const records = appData.records.filter(r => historyFilter === 'all' || r.unitId === historyFilter)
    .slice().sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  const amount = value => value == null ? '未記錄' : '$' + Number(value).toLocaleString('zh-TW');
  const number = value => value == null ? '未記錄' : Number(value).toLocaleString('zh-TW');
  const summary = document.getElementById('historySummary');
  if (summary) summary.textContent = `${records.length} 筆帳單 · 依日期由新到舊 · 應收合計 ${amount(records.reduce((sum, r) => sum + r.total, 0))}`;
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  if (!records.length) {
    wall.append(node('p', 'history-empty', historyFilter === 'all' ? '尚無歷史帳單，儲存帳單後會顯示在這裡。' : '此樓層尚無歷史帳單。'));
    return;
  }
  let tableBody;
  if (historyView === 'table') {
    const table = node('table', 'history-data-table');
    const caption = node('caption', 'screen-hint', '歷史帳單費用比較（元）；窄螢幕可左右滑動。');
    const head = node('thead');
    const headings = node('tr');
    ['日期', '樓層', '租金', '電費', '水費', '瓦斯', '管理費', '其他', '應收總額', '明細與操作'].forEach(label => {
      const th = node('th', '', label); th.scope = 'col'; headings.append(th);
    });
    head.append(headings);
    tableBody = node('tbody');
    table.append(caption, head, tableBody);
    wall.tabIndex = 0;
    wall.setAttribute('role', 'region');
    wall.setAttribute('aria-label', '歷史帳單表格，可左右捲動');
    wall.append(table);
  } else {
    wall.removeAttribute('tabindex');
    wall.removeAttribute('role');
    wall.removeAttribute('aria-label');
  }
  records.forEach(record => {
    const card = node('article', 'bill-note');
    const header = node('div', 'bill-note-header');
    header.append(node('span', 'bill-note-unit', getUnit(record.unitId)?.label ?? record.unitId));
    const date = node('time', '', fmtDate(record.date));
    date.dateTime = record.date;
    header.append(date);
    card.append(header, node('h4', 'bill-note-total', amount(record.total)), node('p', 'bill-note-caption', '本期應收金額'));
    const fees = node('dl', 'bill-note-fees');
    const row = (list, label, value) => {
      const item = node('div');
      item.append(node('dt', '', label), node('dd', '', value));
      list.append(item);
    };
    for (const [label, value] of [['租金', record.rent], ['電費', record.electricity?.fee], ['水費', record.waterFee], ['瓦斯費', record.gasFee], ['管理費', record.managementFee], ['其他費用', record.otherFee]]) row(fees, label, amount(value));
    card.append(fees);
    const details = node('details', 'bill-note-details');
    details.append(node('summary', '', '用電與計算明細'));
    const list = node('dl');
    const e = record.electricity || {};
    row(list, '本戶用電', e.usage == null ? '未記錄' : number(e.usage) + ' 度');
    row(list, '計費季節', ({ summer: '夏月', other: '非夏月' })[e.season] || '未記錄');
    row(list, '台電用電起日', e.periodStart ? fmtDate(e.periodStart) : '未記錄');
    row(list, '台電用電迄日', e.periodEnd ? fmtDate(e.periodEnd) : '未記錄');
    row(list, '起始抄表日期', e.prevDate ? fmtDate(e.prevDate) : '未記錄');
    row(list, '結束抄表日期', e.currDate ? fmtDate(e.currDate) : '未記錄');
    if (record.unitId === '6F') {
      row(list, '上期電表讀數', number(e.prevReading));
      row(list, '本期電表讀數', number(e.currReading));
    }
    const split = record.splitInfo;
    if (split) {
      for (const [label, key, format] of [
        ['台電帳單金額', 'totalBill', amount], ['台電總度數', 'totalUnits', number],
        ['5F 用電度數', 'e5', number], ['6F 用電度數', 'e6', number],
        ['5F 理論電費', 'c5Theory', amount], ['6F 理論電費', 'c6Theory', amount],
        ['電費差額', 'deltaC', amount],
        ['5F 分攤比例', 'ratio5', v => v == null ? '未記錄' : (v * 100).toFixed(2) + '%'],
        ['6F 分攤比例', 'ratio6', v => v == null ? '未記錄' : (v * 100).toFixed(2) + '%']
      ]) row(list, label, format(split[key]));
    }
    row(list, '帳單編號', String(record.id));
    details.append(list);
    card.append(details);
    const actions = node('div', 'bill-note-actions');
    const view = node('button', 'view-record', '查看／複製報表');
    view.type = 'button';
    view.addEventListener('click', () => viewRecord(record.id));
    const remove = node('button', 'delete-record', '刪除');
    remove.type = 'button';
    remove.setAttribute('aria-label', `刪除 ${record.date} ${record.unitId} 帳單`);
    remove.addEventListener('click', () => deleteRecord(record.id));
    actions.append(view, remove);
    card.append(actions);
    if (tableBody) {
      const tr = node('tr');
      for (const value of [fmtDate(record.date), getUnit(record.unitId)?.label ?? record.unitId,
        ...[record.rent, record.electricity?.fee, record.waterFee, record.gasFee, record.managementFee, record.otherFee, record.total].map(amount)]) {
        tr.append(node('td', '', value));
      }
      const cell = node('td');
      cell.append(details, actions);
      tr.append(cell);
      tableBody.append(tr);
    } else wall.append(card);
  });
}

function viewRecord(id) {
  const record = appData.records.find(r => String(r.id) === String(id));
  if (record) {
    generateReport(record);
  }
}

// ── 設定面板開關 ───────────────────────────────────────────

function toggleSettings() {
  navigateTo('settings');
}

function switchSettingsTab(btn, unitId, tab) {
  // 更新 tab 按鈕狀態
  btn.closest('.unit-settings-card').querySelectorAll('.settings-tab').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');

  // 切換面板
  ['basic', 'notes'].forEach(t => {
    const panel = document.getElementById(`${unitId}_tab_${t}`);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
  });
}
