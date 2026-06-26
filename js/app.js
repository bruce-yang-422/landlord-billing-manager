window.onload = function () {
  initTheme();
  setupThemeSelector();

  // 載入資料
  loadUnits();
  loadRecords();

  // 設定今天日期
  const today = new Date();
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  const billDateEl = document.getElementById('billDate');
  if (billDateEl) billDateEl.value = todayStr;

  // 載入即時輸入記憶
  loadInputs();

  // 填入設定面板
  fillUnitSettingsForm();

  // 自動填入 6F 上期讀數
  autoFillLastReading();

  // 渲染歷史記錄
  renderHistory();

  // 監聽所有影響電費/水費預覽的輸入
  const elecInputIds = ['taipowerBill', 'taipowerUnits', 'reading6Prev', 'reading6Curr', 'season'];
  elecInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { updateElectricityPreview(); saveInputs(); });
    if (el) el.addEventListener('change', () => { updateElectricityPreview(); saveInputs(); });
  });

  const waterInputEl = document.getElementById('totalWater');
  if (waterInputEl) {
    waterInputEl.addEventListener('input', () => { updateWaterPreview(); saveInputs(); });
  }

  // 各戶額外費用自動儲存
  const extraIds = ['5F_gas', '5F_management', '5F_other', '6F_gas', '6F_management', '6F_other'];
  extraIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveInputs);
  });

  // 帳單日期自動儲存
  if (billDateEl) billDateEl.addEventListener('change', saveInputs);

  // 初始預覽
  updateElectricityPreview();
  updateWaterPreview();
};
