// 主入口文件 - 初始化應用程式

// 頁面載入時初始化
window.onload = function() {
    // 設定今天的日期為預設值
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0');
    
    // 先載入歷史記錄資料庫
    loadFromLocalStorage();
    
    // 載入儲存的輸入值（即時記憶）
    loadAllInputs();
    
    // 如果沒有儲存的日期，設定今天的日期為預設值
    if (!document.getElementById('billDate').value) {
        document.getElementById('billDate').value = todayStr;
    }
    
    // 根據歷史紀錄自動填入「上期讀數」
    autoFillLastReading();
    
    // 設定費用開關功能
    setupFeeToggles();
    
    // 設定新制法規功能
    setupNewRegulationToggles();
    
    // 設定自動儲存功能
    setupAutoSave();
};

// 按Enter鍵時計算
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        calculateAndSave();
    }
});
