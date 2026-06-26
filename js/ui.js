// ── 即時電費預覽 ───────────────────────────────────────────

function updateElectricityPreview() {
  const totalBill  = parseFloat(document.getElementById('taipowerBill')?.value) || 0;
  const totalUnits = parseFloat(document.getElementById('taipowerUnits')?.value) || 0;
  const prev6      = parseFloat(document.getElementById('reading6Prev')?.value) || 0;
  const curr6      = parseFloat(document.getElementById('reading6Curr')?.value) || 0;
  const season     = document.getElementById('season')?.value || 'summer';

  const e6 = curr6 - prev6;
  const e5 = totalUnits - e6;

  // 更新度數顯示
  const usage5El = document.getElementById('usage5F');
  const usage6El = document.getElementById('usage6F');
  if (usage5El) usage5El.textContent = (totalUnits > 0 && e5 >= 0) ? `${e5} 度` : '—';
  if (usage6El) usage6El.textContent = (e6 > 0) ? `${e6} 度` : '—';

  if (totalBill > 0 && totalUnits > 0 && e6 > 0 && e5 > 0) {
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
    return;
  }
  const split = calcWaterSplit(totalWater, appData.units);
  appData.units.forEach(u => {
    [`waterFee${u.id}`, `waterFee${u.id}_card`].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = `$${split[u.id].toLocaleString()}`;
    });
  });
}

// ── 存檔單戶帳單 ───────────────────────────────────────────

function saveBill(unitId) {
  const billDate   = document.getElementById('billDate')?.value;
  if (!billDate) { alert('請選擇帳單日期！'); return; }

  const totalBill  = parseFloat(document.getElementById('taipowerBill')?.value) || 0;
  const totalUnits = parseFloat(document.getElementById('taipowerUnits')?.value) || 0;
  const prev6      = parseFloat(document.getElementById('reading6Prev')?.value) || 0;
  const curr6      = parseFloat(document.getElementById('reading6Curr')?.value) || 0;
  const season     = document.getElementById('season')?.value || 'summer';
  const totalWater = parseFloat(document.getElementById('totalWater')?.value) || 0;

  if (totalBill <= 0 || totalUnits <= 0) { alert('請輸入台電帳單金額與總度數！'); return; }
  const e6 = curr6 - prev6;
  if (e6 <= 0) { alert('6F 本期讀數必須大於上期讀數！'); return; }
  const e5 = totalUnits - e6;
  if (e5 <= 0) { alert('6F 用電量不得超過台電總度數！'); return; }

  const splitResult = calcProgressiveSplit(totalBill, totalUnits, e6, season);
  const waterSplit  = calcWaterSplit(totalWater, appData.units);

  const electricityFee  = unitId === '5F' ? splitResult.fee5 : splitResult.fee6;
  const electricityUsage = unitId === '5F' ? splitResult.e5 : splitResult.e6;

  const get = (id) => parseFloat(document.getElementById(id)?.value) || 0;
  const extraFees = {
    gas:        get(`${unitId}_gas`),
    management: get(`${unitId}_management`),
    other:      get(`${unitId}_other`),
  };

  const record = buildRecord(unitId, billDate, electricityFee, electricityUsage, waterSplit[unitId], extraFees);

  // 補充電表讀數資訊供歷史記錄顯示
  if (unitId === '6F') {
    record.electricity.prevReading = prev6;
    record.electricity.currReading = curr6;
  }
  record.electricity.season = season;
  record.splitInfo = {
    totalBill, totalUnits, e5: splitResult.e5, e6: splitResult.e6,
    c5Theory: splitResult.c5Theory, c6Theory: splitResult.c6Theory,
    deltaC: splitResult.deltaC, ratio5: splitResult.ratio5, ratio6: splitResult.ratio6,
  };

  addRecord(record);
  renderHistory();
  generateReport(record);
  alert(`✅ ${getUnit(unitId).label} 帳單已存檔！`);
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
    reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const records = historyFilter === 'all'
    ? appData.records
    : appData.records.filter(r => r.unitId === historyFilter);

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">尚無歷史紀錄</td></tr>';
    return;
  }

  records.forEach(record => {
    const unit = getUnit(record.unitId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(record.date)}</td>
      <td><span class="unit-badge unit-badge-${record.unitId}">${unit?.label ?? record.unitId}</span></td>
      <td>${record.electricity?.usage ?? '—'} 度</td>
      <td style="color:#e74c3c;font-weight:bold;">$${record.total.toLocaleString()}</td>
      <td>
        <button class="view-record" onclick="viewRecord('${record.id}')">查看</button>
        <button class="delete-record" onclick="deleteRecord('${record.id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
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
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) fillUnitSettingsForm();
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
