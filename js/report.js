// 租客圖文帳單：兩種輸出共用已存檔帳單，不重新試算費用。
function buildShortReport(record, unit) {
  const money = value => '$' + Number(value || 0).toLocaleString('zh-TW');
  const fees = [['房租', record.rent], ['電費', record.electricity?.fee], [record.waterChargeEnabled === false ? '水費（本期不收）' : '水費', record.waterFee],
    ['瓦斯', record.gasFee], ['管理費', record.managementFee], ['其他', record.otherFee]]
    .filter(([, value]) => value > 0).map(([label, value]) => label + money(value));
  const lines = [`${fmtDate(record.date)} ${unit.label} 帳單`, `本期應繳：${money(record.total)}`];
  if (fees.length) lines.push(fees.join('／'));
  if (record.utilityCredit > 0) lines.push(`已抵扣儲值 ${money(record.utilityCredit)}`);
  if (unit.accountNumber) {
    lines.push(`匯款：${[unit.bankName, unit.branchName, unit.bankCode ? '(' + unit.bankCode + ')' : '', unit.accountNumber, unit.payeeName].filter(Boolean).join(' ')}`);
  }
  lines.push('費用明細與備註請見帳單圖片，謝謝。');
  return lines.join('\n');
}

let billImageDownload = null;

function renderBillImage(record, unit, fullText) {
  const preview = document.getElementById('reportImage');
  const status = document.getElementById('reportImageStatus');
  const button = document.getElementById('downloadBillImageBtn');
  if (!preview || !status || !button) return;
  billImageDownload = null;
  button.disabled = true;
  preview.hidden = true;
  preview.removeAttribute('src');
  status.textContent = '';
  try {
    const width = 1000, height = 3508 / 2.48, padding = 64, contentWidth = width - padding * 2;
    const canvas = document.createElement('canvas');
    canvas.width = 2480;
    canvas.height = 3508;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('無法建立圖片');
    const font = '"Microsoft JhengHei", "PingFang TC", sans-serif';
    let commands = [];
    let y = 290;
    const addText = (text, size = 26, color = '#33465f', bold = false) => {
      ctx.font = `${bold ? '600 ' : ''}${size}px ${font}`;
      let line = '';
      const emit = () => { commands.push({ text: line, y, size, color, bold }); y += size * 1.3; };
      for (const character of Array.from(text)) {
        if (ctx.measureText(line + character).width > contentWidth && line) { emit(); line = ''; }
        line += character;
      }
      if (line) emit();
    };
    // 固定 A4 版面，先重新換行再縮小字級，不裁切、不拉長圖片。
    const lines = fullText.split('\n').slice(1);
    for (const scale of [1, 0.92, 0.84, 0.76, 0.68, 0.62, 0.58]) {
      commands = [];
      y = 290;
      for (const raw of lines) {
        const line = raw.replace(/^(?:⚡|💰|🏦|📝) /u, '').trim();
        if (!line) { y += 10 * scale; continue; }
        if (/^─+$/.test(line)) {
          commands.push({ rule: true, y });
          y += 8 * scale;
          continue;
        }
        const heading = ['電費計算（累進分攤）', '應繳金額', '匯款資訊', '固定備註', '當期備註'].includes(line) || /^【.+】$/.test(line);
        if (heading) {
          y += 12 * scale;
          commands.push({ rule: true, y });
          y += 12 * scale;
        }
        addText(line, (heading ? 28 : 26) * scale, heading ? '#0735ad' : '#33465f', heading);
      }
      if (y <= height - 90) break;
    }
    if (y > height - 90) throw new Error('內容超過一頁 A4，請縮短備註後重試');
    ctx.scale(2.48, 2.48);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#0735ad'; ctx.fillRect(0, 0, width, 12);
    ctx.textBaseline = 'top';
    const draw = (text, x, top, size, color, bold = false) => {
      ctx.font = `${bold ? '600 ' : ''}${size}px ${font}`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, top);
    };
    draw('房租費用通知', padding, 48, 24, '#677487');
    // 依樓層名稱長度縮放標題，避免超出圖面。
    ctx.font = `600 36px ${font}`;
    const title = `${unit.label} · ${fmtDate(record.date)}`;
    const titleSize = Math.min(36, 36 * contentWidth / Math.max(contentWidth, ctx.measureText(title).width));
    draw(title, padding, 94, titleSize, '#172d4b', true);
    ctx.fillStyle = '#edf2fc'; ctx.fillRect(padding, 158, contentWidth, 116);
    draw('本期應繳總額', padding + 24, 176, 23, '#677487');
    draw('$' + Number(record.total).toLocaleString('zh-TW'), padding + 24, 210, 42, '#0735ad', true);
    for (const command of commands) {
      if (command.rule) {
        ctx.fillStyle = '#e5e8ee'; ctx.fillRect(padding, command.y, contentWidth, 1);
      } else draw(command.text, padding, command.y, command.size, command.color, command.bold);
    }
    draw('房東帳務管理工具 · 金額單位：新臺幣', padding, height - 48, 18, '#677487');
    const url = canvas.toDataURL('image/png');
    if (!url.startsWith('data:image/png')) throw new Error('圖片產生失敗');
    preview.src = url;
    preview.alt = `${fmtDate(record.date)} ${unit.label} 完整帳單，應繳 $${Number(record.total).toLocaleString('zh-TW')}`;
    preview.hidden = false;
    billImageDownload = { canvas, filename: `帳單_${record.unitId}_${record.date}.png` };
    button.disabled = false;
    status.textContent = 'A4 直式圖片已備妥（2480 × 3508 像素），可下載後與精簡文字一起傳送。';
  } catch (error) {
    status.textContent = `圖片未產生：${error.message}。仍可複製精簡文字。`;
  }
}

function downloadBillImage() {
  const current = billImageDownload;
  if (!current) return;
  const status = document.getElementById('reportImageStatus');
  current.canvas.toBlob(blob => {
    if (!blob) { status.textContent = '圖片下載失敗，請重新開啟帳單後重試。'; return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = current.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (billImageDownload === current) status.textContent = '已開始下載 PNG，請與精簡文字一起傳給租客。';
  }, 'image/png');
}
