// 單一表格包含「房客設定」與「帳單」，保持可閱讀且可還原。
const BACKUP_COLUMNS = [
  ['資料類型', 'kind', 'text'], ['樓層', 'unitId', 'text'],
  ['帳單日期', 'date', 'text'], ['租金', 'rent', 'number'],
  ['電費', 'electricity.fee', 'number'], ['用電度數', 'electricity.usage', 'number'],
  ['水費', 'waterFee', 'number'], ['瓦斯費', 'gasFee', 'number'],
  ['管理費', 'managementFee', 'number'], ['其他費用', 'otherFee', 'number'],
  ['總金額', 'total', 'number'], ['帳單編號', 'id', 'id'],
  ['上期電表讀數', 'electricity.prevReading', 'number'],
  ['本期電表讀數', 'electricity.currReading', 'number'],
  ['季節', 'electricity.season', 'text'],
  ['台電帳單金額', 'splitInfo.totalBill', 'number'],
  ['台電總度數', 'splitInfo.totalUnits', 'number'],
  ['5F用電度數', 'splitInfo.e5', 'number'], ['6F用電度數', 'splitInfo.e6', 'number'],
  ['5F理論電費', 'splitInfo.c5Theory', 'number'], ['6F理論電費', 'splitInfo.c6Theory', 'number'],
  ['電費差額', 'splitInfo.deltaC', 'number'],
  ['5F分攤比例', 'splitInfo.ratio5', 'number'], ['6F分攤比例', 'splitInfo.ratio6', 'number'],
  ['樓層名稱', 'label', 'text'], ['居住人數', 'persons', 'number'],
  ['銀行代碼', 'bankCode', 'text'], ['戶名', 'payeeName', 'text'],
  ['銀行帳號', 'accountNumber', 'text'], ['租客備註', 'tenantNote', 'text'],
  ['房東備註', 'landlordNote', 'text'],
  ['起始抄表日期', 'electricity.prevDate', 'text'],
  ['結束抄表日期', 'electricity.currDate', 'text']
];

function backupValue(object, key) {
  return key.split('.').reduce((value, part) => value?.[part], object);
}

function backupToCsv(data) {
  const rows = [BACKUP_COLUMNS.map(([label]) => label)];
  if (data.meterReadings !== undefined) rows.push(BACKUP_COLUMNS.map(([, key]) => key === 'kind' ? '抄表清單' : ''));
  const meters = (data.meterReadings || []).map(row => ({ id: row.id, date: row.date, unitId: '6F', electricity: { currReading: row.reading } }));
  for (const [kind, objects] of [['房客設定', data.units], ['帳單', data.records], ['抄表', meters]]) {
    for (const object of objects) {
      rows.push(BACKUP_COLUMNS.map(([, key, type]) => {
        let value = key === 'kind' ? kind : key === 'unitId' && kind === '房客設定' ? object.id
          : key === 'id' && kind === '房客設定' ? undefined : backupValue(object, key);
        if (value === undefined || value === null) return '';
        if (key === 'electricity.season') value = value === 'summer' ? '夏月' : value === 'other' ? '非夏月' : value;
        const text = String(value);
        // 單引號保護 Excel 的前導零、長編號與公式文字；匯入時移除一層。
        return type !== 'number' && (type === 'id' || key === 'bankCode' || key === 'accountNumber' || /^[\s]*[=+\-@\t\r\n']/.test(text))
          ? "'" + text : text;
      }));
    }
  }
  return '\uFEFF' + rows.map(row => row.map(value => '"' + value.replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n';
}

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], value = '', quoted = false, closed = false;
  function endCell() { row.push(value); value = ''; closed = false; }
  function endRow() { endCell(); if (row.some(cell => cell !== '')) rows.push(row); row = []; }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else value += ch;
    } else if (ch === ',') endCell();
    else if (ch === '\r' || ch === '\n') {
      endRow();
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else if (ch === '"' && value === '' && !closed) quoted = true;
    else {
      if (closed || ch === '"') throw new Error('CSV 引號格式錯誤');
      value += ch;
    }
  }
  if (quoted) throw new Error('CSV 引號未關閉');
  if (value !== '' || row.length || closed) endRow();
  return rows;
}

function backupFromCsv(text) {
  const [headers, ...rows] = parseCsv(text);
  if (!headers || new Set(headers).size !== headers.length || headers.some(label => !BACKUP_COLUMNS.some(column => column[0] === label)) ||
      BACKUP_COLUMNS.slice(0, 31).some(([label]) => !headers.includes(label))) throw new Error('請使用本工具匯出的 CSV，並保留完整中文欄名');
  if (rows.length === 0) throw new Error('CSV 沒有備份資料');
  const data = { units: [], records: [] };
  for (const row of rows) {
    if (row.length !== headers.length) throw new Error('CSV 欄位數不符');
    const object = {};
    for (const [label, key, type] of BACKUP_COLUMNS) {
      if (!headers.includes(label)) continue;
      let value = row[headers.indexOf(label)];
      if (value === '') continue;
      if (type !== 'number' && value.startsWith("'")) value = value.slice(1);
      if (type === 'number' || type === 'id') {
        if (!/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value))) throw new Error(`${label}必須是有效數字`);
        value = Number(value);
      }
      if (key === 'electricity.season') value = value === '夏月' ? 'summer' : value === '非夏月' ? 'other' : value;
      const parts = key.split('.');
      if (parts.length === 2) (object[parts[0]] ??= {})[parts[1]] = value;
      else object[key] = value;
    }
    const kind = object.kind;
    delete object.kind;
    if (kind === '房客設定') {
      object.id = object.unitId;
      delete object.unitId;
      for (const [, key, type] of BACKUP_COLUMNS) {
        if (type === 'text' && !key.includes('.') && !['kind', 'unitId', 'date'].includes(key)) object[key] ??= '';
      }
      data.units.push(object);
    } else if (kind === '帳單') data.records.push(object);
    else if (kind === '抄表清單') data.meterReadings ??= [];
    else if (kind === '抄表') {
      if (object.unitId !== '6F') throw new Error('抄表紀錄必須為 6F');
      (data.meterReadings ??= []).push({ id: object.id, date: object.date, reading: object.electricity?.currReading });
    } else throw new Error('資料類型必須為房客設定、帳單或抄表');
  }
  return validateBackup(data);
}

function validateBackup(data) {
  if (!data || !Array.isArray(data.records) || (data.units !== undefined && !Array.isArray(data.units))) throw new Error('備份格式錯誤');
  const validUnit = id => ['5F', '6F'].includes(id);
  const numeric = value => typeof value === 'number' && Number.isFinite(value);
  const unitIds = new Set(), recordIds = new Set();
  if (data.meterReadings !== undefined) {
    if (!Array.isArray(data.meterReadings)) throw new Error('抄表備份格式錯誤');
    const dates = new Set(), ids = new Set();
    for (const row of data.meterReadings) {
      if (!row || !numeric(row.id) || row.id < 0 || ids.has(row.id) || typeof row.date !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) ||
          new Date(row.date).toISOString().slice(0, 10) !== row.date || dates.has(row.date) || !numeric(row.reading) || row.reading < 0) throw new Error('抄表日期、編號或讀數有誤，或紀錄重複');
      dates.add(row.date); ids.add(row.id);
    }
    const sorted = [...data.meterReadings].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.some((row, i) => i > 0 && row.reading < sorted[i - 1].reading)) throw new Error('抄表讀數必須依日期遞增或相同');
  }
  for (const unit of data.units || []) {
    if (!unit || !validUnit(unit.id) || unitIds.has(unit.id) || !numeric(unit.rent) || !numeric(unit.persons)) throw new Error('房客設定格式錯誤或樓層重複');
    unitIds.add(unit.id);
    for (const key of ['label', 'bankCode', 'payeeName', 'accountNumber', 'tenantNote', 'landlordNote']) {
      if (unit[key] !== undefined && typeof unit[key] !== 'string') throw new Error(`${key}必須是文字`);
    }
  }
  for (const record of data.records) {
    if (!record || !validUnit(record.unitId) || !/^\d+(?:\.\d+)?$/.test(String(record.id)) || recordIds.has(String(record.id)) ||
        typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
        !['rent', 'waterFee', 'gasFee', 'managementFee', 'otherFee', 'total', 'electricity.fee', 'electricity.usage'].every(key => numeric(backupValue(record, key)))) throw new Error('帳單格式錯誤、必要欄位缺漏或編號重複');
    recordIds.add(String(record.id));
    for (const [, key, type] of BACKUP_COLUMNS) {
      const value = backupValue(record, key);
      if (type === 'number' && value !== undefined && !numeric(value)) throw new Error('帳單包含無效數字');
    }
    if (record.electricity.season !== undefined && !['summer', 'other'].includes(record.electricity.season)) throw new Error('季節格式錯誤');
    for (const key of ['prevDate', 'currDate']) {
      const date = record.electricity[key];
      if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('帳單抄表日期格式錯誤');
    }
  }
  return data;
}
