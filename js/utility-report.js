// 僅讀取已存檔的實際儲值及抵扣，不把待抵扣費用當成扣款。
function buildUtilityStatement(unitId) {
  const unit = getUnit(unitId);
  if (!unit) throw new Error('請選擇有效樓層。');
  const entries = utilityLedgerRows(unitId).sort((a, b) => a.date.localeCompare(b.date) ||
    (a.type === b.type ? Number(a.id) - Number(b.id) : a.type === 'deposit' ? -1 : 1));
  const rows = [];
  let balance = 0, deposited = 0, deducted = 0;
  for (const entry of entries) {
    if (entry.type === 'deposit') {
      balance += entry.amount; deposited += entry.amount;
      rows.push({ date: entry.date, item: '存入儲值', note: entry.note || '', deposit: entry.amount, deduction: 0, balance });
    } else {
      const record = appData.records.find(row => row.unitId === unitId && String(row.id) === String(entry.id));
      const items = recordCreditItems(record);
      for (const [key, label] of CREDIT_ITEMS) {
        const amount = items[key] || 0;
        if (amount <= 0) continue;
        balance -= amount; deducted += amount;
        rows.push({ date: entry.date, item: label + '扣款', note: key === 'other' ? record.otherDescription || '' : '', deposit: 0, deduction: amount, balance });
      }
    }
  }
  if (Math.abs(balance - utilityBalance(unitId)) > 0.000001) throw new Error('扣款明細與儲值餘額不一致，請先檢查帳單資料。');
  return { unitId, label: unit.label, rows, deposited, deducted, balance };
}

// 長備註換行並分頁；續列不重複顯示存入或扣款金額。
function utilityStatementPages(statement, measureText) {
  const pages = [{ rows: [], opening: 0, closing: 0 }];
  let used = 0;
  for (const row of statement.rows) {
    const lines = [];
    let line = '';
    for (const character of Array.from(row.item + (row.note ? '｜' + row.note : ''))) {
      if (character === '\n' || (line && measureText(line + character) > 278)) {
        lines.push(line); line = '';
        if (character === '\n') continue;
      }
      line += character;
    }
    if (line || !lines.length) lines.push(line);
    for (let offset = 0; offset < lines.length; offset += 8) {
      const chunk = lines.slice(offset, offset + 8);
      const height = Math.max(58, 24 + chunk.length * 29);
      if (used + height > 860) {
        const previous = pages.at(-1);
        pages.push({ rows: [], opening: previous.closing, closing: previous.closing });
        used = 0;
      }
      const page = pages.at(-1);
      page.rows.push({ ...row, lines: chunk, height, continuation: offset > 0 });
      page.closing = row.balance;
      used += height;
    }
  }
  return pages;
}

function renderUtilityStatementImages(statement) {
  const sizing = document.createElement('canvas').getContext('2d');
  if (!sizing) throw new Error('無法建立帳本圖片。');
  const font = '"Microsoft JhengHei", "PingFang TC", sans-serif';
  sizing.font = `22px ${font}`;
  const pages = utilityStatementPages(statement, text => sizing.measureText(text).width);
  return pages.map((page, pageIndex) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2480; canvas.height = 3508;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('無法建立帳本圖片。');
    ctx.scale(2.48, 2.48);
    const text = (value, x, y, size = 22, color = '#33465f', align = 'left', bold = false) => {
      ctx.font = `${bold ? '600 ' : ''}${size}px ${font}`;
      ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top';
      ctx.fillText(String(value), x, y);
    };
    const money = value => '$' + value.toLocaleString('zh-TW');
    const numeric = (value, x, y, color) => {
      let size = 22;
      while (size > 14) {
        ctx.font = `${size}px ${font}`;
        if (ctx.measureText(value).width <= 132) break;
        size--;
      }
      text(value, x, y, size, color, 'right');
    };
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 3508 / 2.48);
    ctx.fillStyle = '#0735ad'; ctx.fillRect(0, 0, 1000, 12);
    text('房客儲值帳本', 64, 54, 25, '#677487');
    text(statement.label + ' · 儲值與扣款明細', 64, 100, 36, '#152d50', 'left', true);
    text(`第 ${pageIndex + 1}／${pages.length} 頁 · 全部歷史紀錄`, 936, 60, 19, '#677487', 'right');
    ctx.fillStyle = '#edf2fc'; ctx.fillRect(64, 164, 872, 104);
    for (const [i, label, value] of [[0, '累計儲值', statement.deposited], [1, '累計扣款', statement.deducted], [2, '目前餘額', statement.balance]]) {
      const x = 86 + i * 285;
      text(label, x, 182, 20, '#677487');
      text(money(value), x, 216, 30, '#0735ad', 'left', true);
    }
    text('本頁期初餘額：' + money(page.opening), 64, 292, 21);
    ctx.fillStyle = '#f1f4f8'; ctx.fillRect(64, 330, 872, 44);
    for (const [label, x, align] of [['日期', 76, 'left'], ['項目／備註', 208, 'left'], ['儲值存入', 632, 'right'], ['費用扣款', 778, 'right'], ['餘額', 924, 'right']]) text(label, x, 342, 21, '#0735ad', align, true);
    let y = 374;
    if (!page.rows.length) text('尚無儲值或扣款紀錄。', 76, y + 24);
    page.rows.forEach((row, i) => {
      if (i % 2 === 1) { ctx.fillStyle = '#f8faff'; ctx.fillRect(64, y, 872, row.height); }
      text(row.continuation ? '（續）' : row.date, 76, y + 14, 20);
      row.lines.forEach((line, index) => text(line, 208, y + 14 + index * 29));
      if (!row.continuation) {
        numeric(row.deposit ? '+' + money(row.deposit) : '—', 632, y + 14, row.deposit ? '#127352' : '#677487');
        numeric(row.deduction ? '−' + money(row.deduction) : '—', 778, y + 14, row.deduction ? '#ab3e39' : '#677487');
        numeric(money(row.balance), 924, y + 14, '#152d50');
      }
      ctx.fillStyle = '#e5e8ee'; ctx.fillRect(64, y + row.height - 1, 872, 1);
      y += row.height;
    });
    text('本頁期末餘額：' + money(page.closing), 936, 1260, 24, '#0735ad', 'right', true);
    text('扣款按帳單日期列示，為已存檔抵扣明細，並非實際扣款時間。', 64, 1320, 18, '#677487');
    text('本帳本僅供儲值核對，不另收費；金額單位：新臺幣。', 64, 1352, 18, '#677487');
    return { canvas, filename: `儲值帳本_${statement.unitId}_${pageIndex + 1}.png` };
  });
}

let utilityStatementDownloads = [];

function clearUtilityStatementPreview() {
  utilityStatementDownloads = [];
  const panel = document.getElementById('utilityStatementPreview');
  if (panel) panel.hidden = true;
  document.getElementById('utilityStatementImages')?.replaceChildren();
}

function generateUtilityStatement(unitId) {
  const panel = document.getElementById('utilityStatementPreview');
  const status = document.getElementById('utilityStatementStatus');
  const images = document.getElementById('utilityStatementImages');
  if (!panel || !status || !images) return;
  panel.hidden = false; images.replaceChildren(); utilityStatementDownloads = [];
  try {
    const statement = buildUtilityStatement(unitId);
    utilityStatementDownloads = renderUtilityStatementImages(statement);
    for (const [index, item] of utilityStatementDownloads.entries()) {
      const card = document.createElement('section');
      const preview = document.createElement('img');
      preview.className = 'bill-image-preview'; preview.src = item.canvas.toDataURL('image/png');
      preview.alt = `${statement.label} 儲值帳本第 ${index + 1} 頁，目前餘額 $${statement.balance.toLocaleString('zh-TW')}`;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'inline-action'; button.textContent = `下載第 ${index + 1} 頁 PNG`;
      button.addEventListener('click', () => downloadUtilityStatement(index));
      card.append(preview, button); images.append(card);
    }
    status.textContent = `${statement.label}：${statement.rows.length} 筆明細，共 ${utilityStatementDownloads.length} 頁 A4（2480 × 3508 像素）。目前餘額 $${statement.balance.toLocaleString('zh-TW')}。`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { images.replaceChildren(); utilityStatementDownloads = []; status.textContent = '帳本未產生：' + error.message; }
}

function downloadUtilityStatement(index) {
  const item = utilityStatementDownloads[index];
  if (!item) return;
  item.canvas.toBlob(blob => {
    if (!blob) { document.getElementById('utilityStatementStatus').textContent = 'PNG 下載失敗，請重新產生帳本。'; return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = item.filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
