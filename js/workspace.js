// 狀態欄共用主欄試算結果，避免產生兩套金額計算。
function refreshWorkspaceStatus() {
  const el = id => document.getElementById(id);
  const write = (id, value) => {
    const target = el(id);
    if (target && target.textContent !== value) target.textContent = value;
  };
  const totals = ['5F', '6F'].map(unit => el(`total${unit}_card`)?.textContent.trim() || '—');
  totals.forEach((value, i) => write(`workspaceTotal${['5F', '6F'][i]}`, value));
  const numbers = totals.map(value => /^\$[\d,]+(?:\.\d+)?$/.test(value) ? Number(value.replace(/[$,]/g, '')) : NaN);
  write('workspaceTotal', numbers.every(Number.isFinite) ? '$' + numbers.reduce((a, b) => a + b, 0).toLocaleString('zh-TW') : '—');
  write('workspaceBillDate', el('billDate')?.value || '尚未選擇日期');
  write('workspaceDraftHint', el('billDraftStatus')?.textContent || '請確認費用明細後，分別存檔兩戶帳單。');
  write('workspaceRecordCount', `${appData.records.length} 筆`);
  const latest = getMeterTimeline().at(-1);
  write('workspaceLatestMeter', latest ? latest.date : '尚無紀錄');
  write('workspaceElectricity', el('includeElectricity')?.checked ? '收取' : '本次不收取');
}

window.addEventListener('load', () => {
  const main = document.getElementById('workspaceMain');
  if (!main) return;
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; refreshWorkspaceStatus(); });
  };
  new MutationObserver(schedule).observe(main, { childList: true, subtree: true, characterData: true });
  main.addEventListener('input', schedule);
  main.addEventListener('change', schedule);
  window.addEventListener('hashchange', schedule);
  schedule();
});
