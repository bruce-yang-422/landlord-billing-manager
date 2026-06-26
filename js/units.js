// 從 localStorage 讀取 units 設定，合併進 appData.units
function loadUnits() {
  try {
    const saved = localStorage.getItem('landlord_units');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // 對每個預設 unit 套用儲存的值
        appData.units = appData.units.map(defaultUnit => {
          const saved = parsed.find(u => u.id === defaultUnit.id);
          return saved ? { ...defaultUnit, ...saved } : defaultUnit;
        });
      }
    }
  } catch (e) {
    console.error('載入 units 設定失敗:', e);
  }
}

// 儲存 units 設定到 localStorage
function saveUnits() {
  try {
    localStorage.setItem('landlord_units', JSON.stringify(appData.units));
  } catch (e) {
    console.error('儲存 units 設定失敗:', e);
  }
}

// 取得單一 unit
function getUnit(id) {
  return appData.units.find(u => u.id === id);
}

// 更新單一 unit 的設定並儲存
function updateUnit(id, fields) {
  const unit = getUnit(id);
  if (unit) {
    Object.assign(unit, fields);
    saveUnits();
  }
}

// 從設定面板讀取兩戶的值並儲存
function saveUnitSettings() {
  appData.units.forEach(unit => {
    const get = (field) => {
      const el = document.getElementById(`${unit.id}_${field}`);
      return el ? el.value : '';
    };
    const getNum = (field) => {
      const el = document.getElementById(`${unit.id}_${field}`);
      return el ? (parseFloat(el.value) || 0) : 0;
    };

    updateUnit(unit.id, {
      rent:          getNum('rent'),
      persons:       getNum('persons'),
      bankCode:      get('bankCode'),
      payeeName:     get('payeeName'),
      accountNumber: get('accountNumber'),
      tenantNote:    get('tenantNote'),
      landlordNote:  get('landlordNote'),
    });
  });
  alert('✅ 房客設定已儲存！');
  const panel = document.getElementById('settingsPanel');
  if (panel) panel.style.display = 'none';
}

// 將 units 設定填入設定面板
function fillUnitSettingsForm() {
  appData.units.forEach(unit => {
    const set = (field, value) => {
      const el = document.getElementById(`${unit.id}_${field}`);
      if (el) el.value = value ?? '';
    };
    set('rent',          unit.rent);
    set('persons',       unit.persons);
    set('bankCode',      unit.bankCode);
    set('payeeName',     unit.payeeName);
    set('accountNumber', unit.accountNumber);
    set('tenantNote',    unit.tenantNote);
    set('landlordNote',  unit.landlordNote);
  });
}
