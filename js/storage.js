const DB_KEY    = 'landlord_billing_db';
const INPUT_KEY = 'landlord_billing_inputs';

// ── 帳單記錄 CRUD ──────────────────────────────────────────

function saveRecords(records = appData.records) {
  localStorage.setItem(DB_KEY, JSON.stringify(records));
}

function loadRecords() {
  try {
    const json = localStorage.getItem(DB_KEY);
    if (json) {
      appData.records = JSON.parse(json);
    }
  } catch (e) {
    console.error('載入記錄失敗:', e);
  }
}

function addRecord(record) {
  const records = [record, ...appData.records];
  saveRecords(records);
  appData.records = records;
}

function deleteRecord(id) {
  if (!confirm('確定要刪除這筆紀錄嗎？')) return;
  const records = appData.records.filter(r => String(r.id) !== String(id));
  try { saveRecords(records); } catch (error) { alert('未刪除：' + error.message); return; }
  appData.records = records;
  renderHistory();
  if (typeof refreshMeterUi === 'function') refreshMeterUi();
}

function clearHistory() {
  if (!confirm('這將清空所有歷史帳單，獨立抄表紀錄會保留。建議先備份 CSV。確定要繼續嗎？')) return;
  try { saveRecords([]); } catch (error) { alert('未清空：' + error.message); return; }
  appData.records = [];
  renderHistory();
  if (typeof refreshMeterUi === 'function') refreshMeterUi();
}

// ── 即時輸入記憶 ───────────────────────────────────────────

function saveInputs() {
  try {
    const get = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const inputs = {
      billDate:        get('billDate'),
      includeElectricity: document.getElementById('includeElectricity')?.checked !== false,
      meterDate:       get('meterDate'),
      meterCurrent:    get('meterCurrent'),
      billingStartDate: get('billingStartReading'),
      billingEndDate:   get('billingEndReading'),
      season:          get('season'),
      taipowerBill:    get('taipowerBill'),
      taipowerUnits:   get('taipowerUnits'),
      reading6Prev:    get('reading6Prev'),
      reading6Curr:    get('reading6Curr'),
      totalWater:      get('totalWater'),
      gas5F:           get('5F_gas'),
      management5F:    get('5F_management'),
      other5F:         get('5F_other'),
      gas6F:           get('6F_gas'),
      management6F:    get('6F_management'),
      other6F:         get('6F_other'),
    };
    localStorage.setItem(INPUT_KEY, JSON.stringify(inputs));
  } catch (e) {
    console.error('儲存輸入值失敗:', e);
  }
}

function loadInputs() {
  try {
    const json = localStorage.getItem(INPUT_KEY);
    if (!json) return;
    const inputs = JSON.parse(json);
    const set = (id, val) => {
      if (val === undefined || val === null) return;
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    set('billDate',      inputs.billDate);
    const electricityToggle = document.getElementById('includeElectricity');
    if (electricityToggle && typeof inputs.includeElectricity === 'boolean') electricityToggle.checked = inputs.includeElectricity;
    set('meterDate',     inputs.meterDate);
    set('meterCurrent',  inputs.meterCurrent);
    set('season',        inputs.season);
    set('taipowerBill',  inputs.taipowerBill);
    set('taipowerUnits', inputs.taipowerUnits);
    set('reading6Prev',  inputs.reading6Prev);
    set('reading6Curr',  inputs.reading6Curr);
    set('totalWater',    inputs.totalWater);
    set('5F_gas',        inputs.gas5F);
    set('5F_management', inputs.management5F);
    set('5F_other',      inputs.other5F);
    set('6F_gas',        inputs.gas6F);
    set('6F_management', inputs.management6F);
    set('6F_other',      inputs.other6F);
  } catch (e) {
    console.error('載入輸入值失敗:', e);
  }
}

// ── 匯出 / 匯入 ────────────────────────────────────────────

function exportData() {
  try {
    const payload = { units: appData.units, records: appData.records, meterReadings: appData.meterReadings || [] };
    const dataStr = URL.createObjectURL(new Blob([backupToCsv(payload)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'landlord-billing-backup.csv');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(dataStr), 1000);
  } catch (e) {
    alert('❌ 匯出失敗：' + e.message);
  }
}

function restoreBackup(data) {
  validateBackup(data);
  const units = Array.isArray(data.units)
    ? appData.units.map(def => {
      const saved = data.units.find(u => u.id === def.id);
      return saved ? { ...def, ...saved } : def;
    }) : appData.units;
  // 儲存失敗時保留原資料，不讓畫面誤報成功。
  const oldUnits = localStorage.getItem('landlord_units');
  const oldRecords = localStorage.getItem(DB_KEY);
  const oldMeters = localStorage.getItem('landlord_meter_readings');
  try {
    localStorage.setItem('landlord_units', JSON.stringify(units));
    localStorage.setItem(DB_KEY, JSON.stringify(data.records));
    if (data.meterReadings !== undefined) localStorage.setItem('landlord_meter_readings', JSON.stringify(data.meterReadings));
  } catch (error) {
    for (const [key, value] of [['landlord_units', oldUnits], [DB_KEY, oldRecords], ['landlord_meter_readings', oldMeters]]) {
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
      catch (rollbackError) { console.error('還原儲存資料失敗:', rollbackError); }
    }
    throw error;
  }
  appData.units = units;
  appData.records = data.records;
  if (data.meterReadings !== undefined) appData.meterReadings = data.meterReadings;
  fillUnitSettingsForm();
  updateElectricityPreview();
  updateWaterPreview();
  renderHistory();
  if (typeof refreshMeterUi === 'function') refreshMeterUi();
  const report = document.getElementById('reportSection');
  if (report) report.style.display = 'none';
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result.replace(/^\uFEFF/, '');
      const data = file.name.toLowerCase().endsWith('.json')
        ? validateBackup(JSON.parse(text)) : backupFromCsv(text);
      if (!confirm(`即將匯入 ${data.records.length} 筆帳單${data.meterReadings ? `、${data.meterReadings.length} 筆抄表` : ''}，覆蓋對應資料${data.units ? '與房客設定' : ''}。未含抄表的舊備份會保留本機抄表紀錄。建議先備份目前資料。確定匯入？`)) return;
      restoreBackup(data);
      alert('✅ 資料匯入成功！');
    } catch (err) {
      alert('❌ 讀取失敗：' + err);
    }
  };
  reader.onerror = () => alert('❌ 無法讀取備份檔，請重新選擇檔案。');
  reader.readAsText(file);
  input.value = '';
}
