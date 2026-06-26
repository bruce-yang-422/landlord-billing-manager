const DB_KEY    = 'landlord_billing_db';
const INPUT_KEY = 'landlord_billing_inputs';

// ── 帳單記錄 CRUD ──────────────────────────────────────────

function saveRecords() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(appData.records));
  } catch (e) {
    console.error('儲存記錄失敗:', e);
  }
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
  appData.records.unshift(record);
  saveRecords();
}

function deleteRecord(id) {
  if (!confirm('確定要刪除這筆紀錄嗎？')) return;
  appData.records = appData.records.filter(r => r.id !== id);
  saveRecords();
  renderHistory();
}

function clearHistory() {
  if (!confirm('警告：這將清空所有歷史帳單紀錄！建議先備份 JSON。確定要繼續嗎？')) return;
  appData.records = [];
  saveRecords();
  renderHistory();
}

// ── 即時輸入記憶 ───────────────────────────────────────────

function saveInputs() {
  try {
    const get = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const inputs = {
      billDate:        get('billDate'),
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
    const payload = { units: appData.units, records: appData.records };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'landlord-billing-backup.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
    alert('✅ 資料已匯出！(landlord-billing-backup.json)');
  } catch (e) {
    alert('❌ 匯出失敗：' + e.message);
  }
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data.records)) { alert('❌ 格式錯誤，請確認是本工具匯出的 JSON'); return; }
      if (Array.isArray(data.units)) {
        appData.units = appData.units.map(def => {
          const saved = data.units.find(u => u.id === def.id);
          return saved ? { ...def, ...saved } : def;
        });
        saveUnits();
        fillUnitSettingsForm();
      }
      appData.records = data.records;
      saveRecords();
      renderHistory();
      alert('✅ 資料匯入成功！');
    } catch (err) {
      alert('❌ 讀取失敗：' + err);
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// 自動填入 6F 上期讀數（從最近一筆 6F 記錄的本期讀數）
function autoFillLastReading() {
  const last6F = appData.records.find(r => r.unitId === '6F');
  const el = document.getElementById('reading6Prev');
  if (last6F && el && !el.value) {
    el.value = last6F.electricity?.prevReading ?? '';
  }
}
