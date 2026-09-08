const METER_KEY = 'landlord_meter_readings';

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 舊帳單的「本期讀數」也是可用歷史；同一天以獨立抄表紀錄為準。
function meterTimeline(readings, records) {
  const byDate = new Map();
  const valid = row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && typeof row.reading === 'number' && Number.isFinite(row.reading) && row.reading >= 0;
  [...records].sort((a, b) => Number(a.id) - Number(b.id)).forEach(record => {
    const row = { date: record.electricity?.currDate || record.date, reading: record.electricity?.currReading, source: 'bill', id: record.id };
    if (record.unitId === '6F' && valid(row)) byDate.set(row.date, row);
  });
  readings.forEach(record => { if (valid(record)) byDate.set(record.date, { ...record, source: 'meter' }); });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function previousMeterReading(timeline, date) {
  return timeline.filter(row => row.date < date).at(-1);
}

function twoMonthsBefore(date) {
  const [year, month, day] = date.split('-').map(Number);
  const first = new Date(year, month - 3, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(day, lastDay));
  return localDateString(first);
}

function getMeterTimeline() { return meterTimeline(appData.meterReadings || [], appData.records); }

function loadMeterReadings() {
  try {
    const rows = JSON.parse(localStorage.getItem(METER_KEY) || '[]');
    validateBackup({ records: [], meterReadings: rows });
    appData.meterReadings = rows;
  } catch (error) {
    document.getElementById('meterSaveStatus').textContent = '抄表資料讀取失敗，請先匯出現有備份並檢查資料。';
    console.error('抄表資料讀取失敗:', error);
  }
}

function updateMeterPreview() {
  const date = document.getElementById('meterDate').value;
  const value = document.getElementById('meterCurrent').value;
  const previous = previousMeterReading(getMeterTimeline(), date);
  document.getElementById('meterPreviousValue').textContent = previous ? `${previous.reading.toLocaleString()} 度` : '尚無紀錄';
  document.getElementById('meterPreviousDate').textContent = previous ? previous.date : '首次儲存將作為起始讀數';
  let hint = '輸入本期累計讀數，自動計算本次用電量。';
  if (!previous) hint = '首次使用：先補登上次抄表日期與讀數，再輸入這次讀數。';
  else if (value !== '') {
    const usage = Number(value) - previous.reading;
    hint = Number.isFinite(usage) && usage >= 0 ? `自 ${previous.date} 起用電 ${Number(usage.toFixed(6)).toLocaleString()} 度` : '本期讀數不可低於上期，請確認抄表日期與讀數。';
  }
  document.getElementById('meterUsageHint').textContent = hint;
}

function validateMeterEntry(timeline, date, reading) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('請選擇有效的抄表日期');
  if (!Number.isFinite(reading) || reading < 0) throw new Error('請輸入有效的電表讀數');
  const previous = previousMeterReading(timeline, date);
  const next = timeline.find(row => row.date > date);
  if (previous && reading < previous.reading) throw new Error('本期讀數不可低於上期讀數');
  if (next && reading > next.reading) throw new Error('補登讀數不可高於下一筆歷史讀數');
}

function saveMeterReading() {
  const status = document.getElementById('meterSaveStatus');
  try {
    const date = document.getElementById('meterDate').value;
    const input = document.getElementById('meterCurrent');
    if (input.value === '') throw new Error('請輸入本期電表讀數');
    const reading = Number(input.value);
    const timeline = getMeterTimeline();
    validateMeterEntry(timeline, date, reading);
    if (date > localDateString()) throw new Error('抄表日期不可晚於今天');
    if (timeline.some(row => row.date === date) && !confirm(`${date} 已有讀數，確定更新為 ${reading} 度？已存檔帳單不會自動修改。`)) return;
    const rows = (appData.meterReadings || []).filter(row => row.date !== date);
    rows.push({ id: Date.now(), date, reading });
    validateBackup({ records: [], meterReadings: rows });
    localStorage.setItem(METER_KEY, JSON.stringify(rows));
    appData.meterReadings = rows;
    input.value = '';
    refreshMeterUi();
    saveInputs();
    status.textContent = `已儲存 ${date}：${reading.toLocaleString()} 度。`;
  } catch (error) { status.textContent = `未儲存：${error.message}`; }
}

function refreshBillingReadings(reset = false) {
  const start = document.getElementById('billingStartReading');
  const end = document.getElementById('billingEndReading');
  if (!start || !end) return;
  const date = document.getElementById('billDate').value;
  const rows = getMeterTimeline().filter(row => row.date <= date);
  const endDate = !reset && rows.some(row => row.date === end.value) ? end.value : rows.at(-1)?.date || '';
  const before = rows.filter(row => row.date < endDate);
  const target = endDate ? twoMonthsBefore(endDate) : '';
  const startDate = !reset && before.some(row => row.date === start.value) ? start.value : before.filter(row => row.date <= target).at(-1)?.date || '';
  function fill(select, choices, selected) {
    select.replaceChildren(new Option('請選擇抄表紀錄', ''));
    [...choices].reverse().forEach(row => select.add(new Option(`${row.date} · ${row.reading.toLocaleString()} 度`, row.date)));
    select.value = selected;
  }
  fill(end, rows, endDate);
  fill(start, before, startDate);
  const first = before.find(row => row.date === start.value);
  const last = rows.find(row => row.date === end.value);
  document.getElementById('reading6Prev').value = first?.reading ?? '';
  document.getElementById('reading6Curr').value = last?.reading ?? '';
  document.getElementById('billingPeriodHint').textContent = first && last
    ? `${first.date} → ${last.date} · 6F 用電 ${Number((last.reading - first.reading).toFixed(6))} 度。請核對是否與台電帳單計費期間一致。`
    : '請先補齊台電計費期間的起始與結束抄表紀錄，再進行結算。';
  updateElectricityPreview();
}

function renderMeterHistory() {
  const list = document.getElementById('meterHistoryList');
  if (!list) return;
  list.replaceChildren();
  const rows = getMeterTimeline();
  if (!rows.length) { list.textContent = '還沒有抄表紀錄，先到記帳頁存一筆讀數。'; return; }
  [...rows].reverse().forEach(row => {
    const item = document.createElement('div'); item.className = 'meter-history-row';
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = row.date;
    const previous = previousMeterReading(rows, row.date);
    const detail = document.createElement('small');
    detail.textContent = `${row.reading.toLocaleString()} 度${previous ? ` · 用電 ${Number((row.reading - previous.reading).toFixed(6))} 度` : ' · 起始讀數'}${row.source === 'bill' ? ' · 來自舊帳單' : ''}`;
    copy.append(title, detail); item.append(copy);
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '編輯'; edit.className = 'inline-action';
    edit.addEventListener('click', () => {
      document.getElementById('meterDate').value = row.date;
      document.getElementById('meterCurrent').value = row.reading;
      updateMeterPreview(); navigateTo('input');
    });
    const actions = document.createElement('div'); actions.className = 'meter-row-actions'; actions.append(edit);
    if (row.source === 'meter') {
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'inline-action'; remove.textContent = '刪除';
      remove.addEventListener('click', () => {
        if (!confirm(`刪除 ${row.date} 的抄表紀錄？已存檔帳單不會修改；若同日有舊帳單讀數，仍會顯示該筆歷史。`)) return;
        try {
          const remaining = appData.meterReadings.filter(saved => saved.date !== row.date);
          localStorage.setItem(METER_KEY, JSON.stringify(remaining));
          appData.meterReadings = remaining;
          refreshMeterUi(); saveInputs();
        } catch (error) { alert('未刪除：' + error.message); }
      });
      actions.append(remove);
    }
    item.append(actions); list.append(item);
  });
}

function refreshMeterUi() { updateMeterPreview(); refreshBillingReadings(); renderMeterHistory(); }

function initMeter() {
  loadMeterReadings();
  const date = document.getElementById('meterDate');
  if (!date.value) date.value = localDateString();
  ['meterDate', 'meterCurrent'].forEach(id => document.getElementById(id).addEventListener('input', () => { updateMeterPreview(); saveInputs(); }));
  document.getElementById('billingStartReading').addEventListener('change', () => { refreshBillingReadings(); saveInputs(); });
  document.getElementById('billingEndReading').addEventListener('change', () => {
    document.getElementById('billingStartReading').value = '';
    refreshBillingReadings(); saveInputs();
  });
  refreshMeterUi();
  try {
    const saved = JSON.parse(localStorage.getItem(INPUT_KEY) || '{}');
    const end = document.getElementById('billingEndReading');
    const start = document.getElementById('billingStartReading');
    if ([...end.options].some(option => option.value === saved.billingEndDate)) {
      end.value = saved.billingEndDate; start.value = ''; refreshBillingReadings();
    }
    if ([...start.options].some(option => option.value === saved.billingStartDate)) {
      start.value = saved.billingStartDate; refreshBillingReadings();
    }
  } catch { /* 舊輸入記憶不影響從歷史計算 */ }
}
