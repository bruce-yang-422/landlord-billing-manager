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
  ['銀行代號', 'bankCode', 'text'], ['戶名', 'payeeName', 'text'],
  ['帳號', 'accountNumber', 'text'], ['租客備註', 'tenantNote', 'text'],
  ['房東備註', 'landlordNote', 'text'],
  ['起始抄表日期', 'electricity.prevDate', 'text'],
  ['結束抄表日期', 'electricity.currDate', 'text'],
  ['台電用電起日', 'electricity.periodStart', 'text'],
  ['台電用電迄日', 'electricity.periodEnd', 'text'],
  ['當期備註', 'currentNote', 'text'],
  ['銀行名稱', 'bankName', 'text'],
  ['分行名稱', 'branchName', 'text'],
  ['水電儲值抵扣', 'utilityCredit', 'number'],
  ['存檔時水電餘額', 'utilityBalanceAfter', 'number'],
  ['儲值金額', 'amount', 'number'],
  ['儲值備註', 'note', 'text'],
  ['電費抵扣', 'creditItems.electricity', 'number'],
  ['水費抵扣', 'creditItems.water', 'number'],
  ['瓦斯費抵扣', 'creditItems.gas', 'number'],
  ['管理費抵扣', 'creditItems.management', 'number'],
  ['雜費抵扣', 'creditItems.other', 'number'],
  ['其他費用內容', 'otherDescription', 'text']
];

const BACKUP_CHECKSUM_COLUMN = '資料驗證ID';

// 同步 SHA-256，支援離線及直接開啟 HTML；輸入為 UTF-8。
function backupSha256(text) {
  const bytes = Array.from(encodeURIComponent(text).match(/%[0-9A-F]{2}|[^%]/g) || [], ch => ch[0] === '%' ? parseInt(ch.slice(1), 16) : ch.charCodeAt(0));
  const length = bytes.length;
  bytes.push(128);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bits = length * 8;
  for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bits / 2 ** (i * 8)) & 255);
  const k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotate = (v, n) => (v >>> n) | (v << (32 - n));
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      w[i] = (w[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + w[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) | 0;
    }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotate(e,6) ^ rotate(e,11) ^ rotate(e,25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
      const t2 = ((rotate(a,2) ^ rotate(a,13) ^ rotate(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      [a,b,c,d,e,f,g,h] = [(t1 + t2) | 0,a,b,c,(d + t1) | 0,e,f,g];
    }
    [a,b,c,d,e,f,g,h].forEach((value, i) => { hash[i] = (hash[i] + value) | 0; });
  }
  return hash.map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
}

function backupRowVerificationId(headers, row) {
  const cells = headers.map((label, i) => [label, row[i]])
    .filter(([label]) => label !== BACKUP_CHECKSUM_COLUMN)
    .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return backupSha256(JSON.stringify(cells)).slice(0, 20).toUpperCase();
}

function backupValue(object, key) {
  return key.split('.').reduce((value, part) => value?.[part], object);
}

function backupToCsv(data) {
  const rows = [BACKUP_COLUMNS.map(([label]) => label)];
  if (data.meterReadings !== undefined) rows.push(BACKUP_COLUMNS.map(([, key]) => key === 'kind' ? '抄表清單' : ''));
  if (data.utilityDeposits !== undefined) rows.push(BACKUP_COLUMNS.map(([, key]) => key === 'kind' ? '儲值清單' : ''));
  const meters = (data.meterReadings || []).map(row => ({ id: row.id, date: row.date, unitId: '6F', electricity: { currReading: row.reading } }));
  for (const [kind, objects] of [['房客設定', data.units], ['帳單', data.records], ['抄表', meters], ['水電儲值', data.utilityDeposits || []]]) {
    for (const object of objects) {
      rows.push(BACKUP_COLUMNS.map(([, key, type]) => {
        let value = key === 'kind' ? kind : key === 'unitId' && kind === '房客設定' ? object.id
          : key === 'id' && kind === '房客設定' ? undefined : backupValue(object, key);
        if (value === undefined || value === null) return '';
        if (key === 'electricity.season') value = value === 'summer' ? '夏月' : value === 'other' ? '非夏月' : value;
        if (kind === '帳單' && ['tenantNote', 'currentNote', 'otherDescription'].includes(key) && value === '') return "'";
        const text = String(value);
        // 單引號保護 Excel 的前導零、長編號與公式文字；匯入時移除一層。
        return type !== 'number' && (type === 'id' || key === 'bankCode' || key === 'accountNumber' || /^[\s]*[=+\-@\t\r\n']/.test(text))
          ? "'" + text : text;
      }));
    }
  }
  const headers = rows[0];
  for (const row of rows.slice(1)) row.push(backupRowVerificationId(headers, row));
  headers.push(BACKUP_CHECKSUM_COLUMN);
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
  if (headers) {
    const aliases = { '銀行代碼': '銀行代號', '帳戶名稱': '戶名', '銀行帳號': '帳號' };
    headers.forEach((label, i) => { headers[i] = aliases[label] || label; });
  }
  if (!headers || new Set(headers).size !== headers.length || headers.some(label => label !== BACKUP_CHECKSUM_COLUMN && !BACKUP_COLUMNS.some(column => column[0] === label)) ||
      BACKUP_COLUMNS.slice(0, 31).some(([label]) => !headers.includes(label))) throw new Error('請使用本工具匯出的 CSV，並保留完整中文欄名');
  if (rows.length === 0) throw new Error('CSV 沒有備份資料');
  const data = { units: [], records: [] };
  for (const [index, row] of rows.entries()) {
    if (row.length !== headers.length) throw new Error('CSV 欄位數不符');
    if (headers.includes(BACKUP_CHECKSUM_COLUMN)) {
      const value = row[headers.indexOf(BACKUP_CHECKSUM_COLUMN)];
      if (!/^[0-9A-F]{20}$/.test(value) || value !== backupRowVerificationId(headers, row)) {
        throw new Error(`第 ${index + 1} 筆資料驗證ID不符，內容可能已修改，請確認來源並重新匯出備份。`);
      }
    }
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
        if (type === 'text' && !key.includes('.') && !['kind', 'unitId', 'date', 'currentNote', 'bankName', 'branchName', 'note', 'otherDescription'].includes(key)) object[key] ??= '';
      }
      data.units.push(object);
    } else if (kind === '帳單') data.records.push(object);
    else if (kind === '儲值清單') data.utilityDeposits ??= [];
    else if (kind === '水電儲值') (data.utilityDeposits ??= []).push({ id: object.id, unitId: object.unitId, date: object.date, amount: object.amount, note: object.note || '' });
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
  if (data.utilityDeposits !== undefined) {
    if (!Array.isArray(data.utilityDeposits)) throw new Error('儲值備份格式錯誤');
    const ids = new Set();
    for (const row of data.utilityDeposits) {
      if (!row || !validUnit(row.unitId) || !numeric(row.id) || row.id < 0 || ids.has(row.id) ||
          typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date ||
          !Number.isSafeInteger(row.amount) || row.amount <= 0 || (row.note !== undefined && typeof row.note !== 'string')) throw new Error('儲值日期、金額、備註或編號有誤');
      ids.add(row.id);
    }
  }
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
    for (const key of ['label', 'bankName', 'branchName', 'bankCode', 'payeeName', 'accountNumber', 'tenantNote', 'landlordNote']) {
      if (unit[key] !== undefined && typeof unit[key] !== 'string') throw new Error(`${key}必須是文字`);
    }
  }
  for (const record of data.records) {
    if (!record || !validUnit(record.unitId) || !/^\d+(?:\.\d+)?$/.test(String(record.id)) || recordIds.has(String(record.id)) ||
        typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
        !['rent', 'waterFee', 'gasFee', 'managementFee', 'otherFee', 'total', 'electricity.fee', 'electricity.usage'].every(key => numeric(backupValue(record, key)))) throw new Error('帳單格式錯誤、必要欄位缺漏或編號重複');
    if (record.utilityCredit !== undefined || record.utilityBalanceAfter !== undefined || record.creditItems !== undefined) {
      const credit = record.utilityCredit;
      const gross = record.rent + record.electricity.fee + record.waterFee + record.gasFee + record.managementFee + record.otherFee;
      const fees = { electricity: record.electricity.fee, water: record.waterFee, gas: record.gasFee, management: record.managementFee, other: record.otherFee };
      let limit = Math.max(0, fees.electricity) + Math.max(0, fees.water);
      if (record.creditItems !== undefined) {
        const items = record.creditItems;
        if (!items || typeof items !== 'object' || Array.isArray(items) || Object.keys(items).some(key => !(key in fees)) ||
            Object.keys(fees).some(key => !numeric(items[key]) || items[key] < 0 || items[key] > Math.max(0, fees[key])) ||
            Math.abs(Object.values(items).reduce((sum, value) => sum + value, 0) - credit) > 0.000001) throw new Error('逐項抵扣明細有誤');
        limit = Object.values(fees).reduce((sum, fee) => sum + Math.max(0, fee), 0);
      }
      if (!numeric(credit) || credit < 0 || credit > limit ||
          !numeric(record.utilityBalanceAfter) || record.utilityBalanceAfter < 0 || Math.abs(record.total - (gross - credit)) > 0.000001) throw new Error('帳單儲值抵扣或總額有誤');
    }
    recordIds.add(String(record.id));
    for (const key of ['tenantNote', 'currentNote', 'otherDescription']) {
      if (record[key] !== undefined && typeof record[key] !== 'string') throw new Error('帳單備註必須是文字');
    }
    for (const [, key, type] of BACKUP_COLUMNS) {
      const value = backupValue(record, key);
      if (type === 'number' && value !== undefined && !numeric(value)) throw new Error('帳單包含無效數字');
    }
    if (record.electricity.season !== undefined && !['summer', 'other'].includes(record.electricity.season)) throw new Error('季節格式錯誤');
    for (const key of ['prevDate', 'currDate', 'periodStart', 'periodEnd']) {
      const date = record.electricity[key];
      if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('帳單抄表日期格式錯誤');
    }
  }
  return data;
}
