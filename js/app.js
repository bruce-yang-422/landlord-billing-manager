// 資料庫結構： { settings: {}, records: [] }
let appData = {
    settings: {
        pricePerUnit: 5.5,
        rent: 7000,
        bankCode: '',
        payeeName: '',
        accountNumber: ''
    },
    records: [] // 存放歷史帳單
};

function calculateAndSave() {
    const billDate = document.getElementById('billDate').value;
    const payeeName = document.getElementById('payeeName').value;
    const bankCode = document.getElementById('bankCode').value;
    const accountNumber = document.getElementById('accountNumber').value;
    
    // 驗證
    if (!billDate) {
        alert('請選擇帳單日期！');
        return;
    }
    
    // 檢查各費用開關狀態
    const enableElectricity = document.getElementById('enableElectricity').checked;
    const enableRent = document.getElementById('enableRent').checked;
    const enableWater = document.getElementById('enableWater').checked;
    const enableGas = document.getElementById('enableGas').checked;
    const enableManagement = document.getElementById('enableManagement').checked;
    const enableOther = document.getElementById('enableOther').checked;
    
    // 計算電費
    let electricityFee = 0;
    let usage = 0;
    let lastReading = 0;
    let currentReading = 0;
    let pricePerUnit = 0;
    
    if (enableElectricity) {
        lastReading = parseFloat(document.getElementById('lastReading').value) || 0;
        currentReading = parseFloat(document.getElementById('currentReading').value) || 0;
        pricePerUnit = parseFloat(document.getElementById('pricePerUnit').value) || 0;
        
        if (currentReading <= lastReading) {
            alert('本期電錶讀數必須大於上期讀數！');
            return;
        }
        
        usage = currentReading - lastReading;
        electricityFee = Math.round(usage * pricePerUnit);
    }
    
    // 計算其他費用
    const rent = enableRent ? (parseFloat(document.getElementById('rent').value) || 0) : 0;
    const waterFee = enableWater ? (parseFloat(document.getElementById('waterFee').value) || 0) : 0;
    const gasFee = enableGas ? (parseFloat(document.getElementById('gasFee').value) || 0) : 0;
    const managementFee = enableManagement ? (parseFloat(document.getElementById('managementFee').value) || 0) : 0;
    const otherFee = enableOther ? (parseFloat(document.getElementById('otherFee').value) || 0) : 0;
    
    const totalAmount = electricityFee + rent + waterFee + gasFee + managementFee + otherFee;
    
    // 更新設定 (記憶使用者的偏好)
    appData.settings = {
        pricePerUnit: pricePerUnit,
        rent: rent,
        bankCode: bankCode,
        payeeName: payeeName,
        accountNumber: accountNumber,
        enableElectricity: enableElectricity,
        enableRent: enableRent,
        enableWater: enableWater,
        enableGas: enableGas,
        enableManagement: enableManagement,
        enableOther: enableOther
    };
    
    // 新增一筆紀錄
    const newRecord = {
        id: Date.now(), // 唯一識別碼
        date: billDate,
        lastReading: lastReading,
        currentReading: currentReading,
        usage: usage,
        electricityFee: electricityFee,
        rent: rent,
        waterFee: waterFee,
        gasFee: gasFee,
        managementFee: managementFee,
        otherFee: otherFee,
        total: totalAmount,
        pricePerUnit: pricePerUnit,
        enableElectricity: enableElectricity,
        enableRent: enableRent,
        enableWater: enableWater,
        enableGas: enableGas,
        enableManagement: enableManagement,
        enableOther: enableOther
    };
    
    // 把新紀錄加到最前面
    appData.records.unshift(newRecord);
    
    // 儲存所有輸入值到 localStorage（即時記憶）
    saveAllInputs();
    
    // 儲存歷史記錄到 localStorage
    saveToLocalStorage();
    
    // 顯示結果
    displayResult(newRecord);
    
    // 更新介面
    renderHistory();
    generateReport(newRecord, appData.settings);
    
    alert('✅ 計算完成並已自動存檔！');
}

// 顯示計算結果
function displayResult(record) {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    
    // 顯示用電量（僅當電費啟用時）
    if (record.enableElectricity && record.usage > 0) {
        document.getElementById('usageDisplay').style.display = 'block';
        document.getElementById('usage').textContent = record.usage;
        document.getElementById('electricityFeeDisplay').style.display = 'block';
        document.getElementById('electricityFee').textContent = record.electricityFee.toLocaleString();
    } else {
        document.getElementById('usageDisplay').style.display = 'none';
        document.getElementById('electricityFeeDisplay').style.display = 'none';
    }
    
    // 顯示租金
    if (record.enableRent && record.rent > 0) {
        document.getElementById('rentDisplayDiv').style.display = 'block';
        document.getElementById('rentDisplay').textContent = record.rent.toLocaleString();
    } else {
        document.getElementById('rentDisplayDiv').style.display = 'none';
    }
    
    // 顯示水費
    if (record.enableWater && record.waterFee > 0) {
        document.getElementById('waterFeeDisplay').style.display = 'block';
        document.getElementById('waterFeeDisplayAmount').textContent = record.waterFee.toLocaleString();
    } else {
        document.getElementById('waterFeeDisplay').style.display = 'none';
    }
    
    // 顯示瓦斯費
    if (record.enableGas && record.gasFee > 0) {
        document.getElementById('gasFeeDisplayDiv').style.display = 'block';
        document.getElementById('gasFeeDisplay').textContent = record.gasFee.toLocaleString();
    } else {
        document.getElementById('gasFeeDisplayDiv').style.display = 'none';
    }
    
    // 顯示管理費
    if (record.enableManagement && record.managementFee > 0) {
        document.getElementById('managementFeeDisplay').style.display = 'block';
        document.getElementById('managementFeeDisplayAmount').textContent = record.managementFee.toLocaleString();
    } else {
        document.getElementById('managementFeeDisplay').style.display = 'none';
    }
    
    // 顯示其他費用
    if (record.enableOther && record.otherFee > 0) {
        document.getElementById('otherFeeDisplay').style.display = 'block';
        document.getElementById('otherFeeDisplayAmount').textContent = record.otherFee.toLocaleString();
    } else {
        document.getElementById('otherFeeDisplay').style.display = 'none';
    }
    
    // 顯示總金額
    document.getElementById('totalAmount').textContent = record.total.toLocaleString();
}

function generateReport(record, settings) {
    let dateStr;
    if (record.date) {
        const date = new Date(record.date);
        dateStr = date.getFullYear() + '/' + 
                 String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                 String(date.getDate()).padStart(2, '0');
    } else {
        const now = new Date();
        dateStr = now.getFullYear() + '/' + 
                 String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                 String(now.getDate()).padStart(2, '0');
    }
    
    let report = `📅 ${dateStr} 房租費用通知\n\n`;
    
    // 電費計算部分
    if (record.enableElectricity && record.usage > 0) {
        report += `⚡ 電費計算\n`;
        report += `${record.currentReading} (本期) - ${record.lastReading} (上期) \n`;
        report += `= ${record.usage} 度\n`;
        report += `${record.usage} 度 × ${record.pricePerUnit} = $${record.electricityFee}\n\n`;
    }
    
    // 應繳金額部分
    report += `💰 應繳金額\n`;
    if (record.enableElectricity && record.electricityFee > 0) {
        report += `電費：$${record.electricityFee.toLocaleString()}\n`;
    }
    if (record.enableRent && record.rent > 0) {
        report += `房租：$${record.rent.toLocaleString()}\n`;
    }
    if (record.enableWater && record.waterFee > 0) {
        report += `水費：$${record.waterFee.toLocaleString()}\n`;
    }
    if (record.enableGas && record.gasFee > 0) {
        report += `瓦斯：$${record.gasFee.toLocaleString()}\n`;
    }
    if (record.enableManagement && record.managementFee > 0) {
        report += `管理費：$${record.managementFee.toLocaleString()}\n`;
    }
    if (record.enableOther && record.otherFee > 0) {
        report += `其他費用：$${record.otherFee.toLocaleString()}\n`;
    }
    report += `──────────────\n`;
    report += `總計：$${record.total.toLocaleString()}\n\n`;
    
    // 匯款資訊
    if (settings.bankCode && settings.accountNumber) {
        report += `🏦 匯款資訊\n`;
        report += `(${settings.bankCode}) ${settings.accountNumber}\n`;
        report += `戶名：${settings.payeeName}\n\n`;
    }
    
    // 計算過程
    report += `計算過程：\n`;
    const feeParts = [];
    if (record.enableElectricity && record.usage > 0) {
        report += `${record.currentReading} - ${record.lastReading} = ${record.usage} 度\n`;
        report += `${record.usage} × ${record.pricePerUnit} = ${record.electricityFee}\n`;
        feeParts.push(record.electricityFee);
    }
    if (record.enableRent && record.rent > 0) {
        feeParts.push(record.rent);
    }
    if (record.enableWater && record.waterFee > 0) {
        feeParts.push(record.waterFee);
    }
    if (record.enableGas && record.gasFee > 0) {
        feeParts.push(record.gasFee);
    }
    if (record.enableManagement && record.managementFee > 0) {
        feeParts.push(record.managementFee);
    }
    if (record.enableOther && record.otherFee > 0) {
        feeParts.push(record.otherFee);
    }
    if (feeParts.length > 0) {
        report += feeParts.join(' + ') + ` = ${record.total}`;
    }
    
    document.getElementById('reportText').textContent = report;
    document.getElementById('reportSection').style.display = 'block';
}

// 自動填入上期讀數 (找最近的一筆紀錄)
function autoFillLastReading() {
    if (appData.records.length > 0) {
        // 取最近一次的「本期」作為這次的「上期」
        document.getElementById('lastReading').value = appData.records[0].currentReading;
    }
}

// 渲染歷史列表
function renderHistory() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    
    if (appData.records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">尚無歷史紀錄</td></tr>';
        return;
    }
    
    appData.records.forEach(record => {
        const tr = document.createElement('tr');
        const date = new Date(record.date);
        const dateStr = date.getFullYear() + '/' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                      String(date.getDate()).padStart(2, '0');
        
        const usageText = (record.enableElectricity && record.usage > 0) ? `${record.usage} 度` : '-';
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${usageText}</td>
            <td style="color:#e74c3c; font-weight:bold;">$${record.total.toLocaleString()}</td>
            <td>
                <button class="delete-record" onclick="deleteRecord(${record.id})">刪除</button>
                <button class="view-record" onclick="loadRecord(${record.id})">查看</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 刪除單筆紀錄
function deleteRecord(id) {
    if(confirm('確定要刪除這筆紀錄嗎？')) {
        appData.records = appData.records.filter(r => r.id !== id);
        saveToLocalStorage();
        renderHistory();
    }
}

// 查看/載入舊紀錄到報表區
function loadRecord(id) {
    const record = appData.records.find(r => r.id === id);
    if(record) {
        generateReport(record, appData.settings);
        document.getElementById('reportSection').scrollIntoView({behavior: 'smooth'});
    }
}

// 清空歷史記錄
function clearHistory() {
    if(confirm('警告：這將清空所有歷史帳單紀錄！建議先備份 JSON。確定要繼續嗎？')) {
        appData.records = [];
        saveToLocalStorage();
        renderHistory();
    }
}

// --- 資料存取核心 ---
function saveToLocalStorage() {
    try {
        localStorage.setItem('electricityCalculator_db', JSON.stringify(appData));
    } catch (e) {
        console.error('儲存失敗:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const json = localStorage.getItem('electricityCalculator_db');
        if (json) {
            appData = JSON.parse(json);
            
            // 還原設定值到 UI
            if (appData.settings.pricePerUnit) {
                document.getElementById('pricePerUnit').value = appData.settings.pricePerUnit;
            }
            if (appData.settings.rent) {
                document.getElementById('rent').value = appData.settings.rent;
            }
            if (appData.settings.bankCode) {
                document.getElementById('bankCode').value = appData.settings.bankCode;
            }
            if (appData.settings.payeeName) {
                document.getElementById('payeeName').value = appData.settings.payeeName;
            }
            if (appData.settings.accountNumber) {
                document.getElementById('accountNumber').value = appData.settings.accountNumber;
            }
            
            // 載入開關狀態
            if (appData.settings.enableElectricity !== undefined) {
                document.getElementById('enableElectricity').checked = appData.settings.enableElectricity;
            }
            if (appData.settings.enableRent !== undefined) {
                document.getElementById('enableRent').checked = appData.settings.enableRent;
            }
            if (appData.settings.enableWater !== undefined) {
                document.getElementById('enableWater').checked = appData.settings.enableWater;
            }
            if (appData.settings.enableGas !== undefined) {
                document.getElementById('enableGas').checked = appData.settings.enableGas;
            }
            if (appData.settings.enableManagement !== undefined) {
                document.getElementById('enableManagement').checked = appData.settings.enableManagement;
            }
            if (appData.settings.enableOther !== undefined) {
                document.getElementById('enableOther').checked = appData.settings.enableOther;
            }
            
            renderHistory();
        }
    } catch (e) {
        console.error('載入失敗:', e);
    }
}

// 匯出 JSON (備份)
function exportData() {
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        // 使用固定檔名，每次匯出都會覆蓋同一個檔案，避免累積
        downloadAnchorNode.setAttribute("download", "billing-records-backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        alert('✅ 資料已匯出！(檔名：billing-records-backup.json，已覆蓋舊檔案)');
    } catch (e) {
        alert('❌ 匯出失敗：' + e.message);
    }
}

// 匯入 JSON (還原)
function importData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            // 簡單格式檢查
            if (importedData.records && Array.isArray(importedData.records)) {
                appData = importedData;
                saveToLocalStorage();
                loadFromLocalStorage(); // 刷新介面
                autoFillLastReading();
                alert('✅ 資料匯入成功！歷史紀錄已還原。');
            } else {
                alert('❌ 檔案格式錯誤，請確認這是本工具匯出的 JSON 檔');
            }
        } catch (error) {
            alert('❌ 讀取失敗：' + error);
        }
    };
    reader.readAsText(file);
    // 清空 input 讓同個檔案可以再次觸發 change
    input.value = '';
}

function copyReport() {
    const reportText = document.getElementById('reportText').textContent;
    
    // 使用現代的 Clipboard API
    if (navigator.clipboard) {
        navigator.clipboard.writeText(reportText).then(() => {
            alert('✅ 報表已複製到剪貼簿！可以貼到LINE囉！');
        }).catch(err => {
            console.error('複製失敗: ', err);
            fallbackCopyTextToClipboard(reportText);
        });
    } else {
        fallbackCopyTextToClipboard(reportText);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-999px";
    textArea.style.left = "-999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        alert('✅ 報表已複製到剪貼簿！可以貼到LINE囉！');
    } catch (err) {
        alert('❌ 複製失敗，請手動選取文字複製');
    }
    
    document.body.removeChild(textArea);
}

// 儲存所有輸入值到 localStorage
function saveAllInputs() {
    try {
        const inputs = {
            lastReading: document.getElementById('lastReading').value,
            currentReading: document.getElementById('currentReading').value,
            pricePerUnit: document.getElementById('pricePerUnit').value,
            rent: document.getElementById('rent').value,
            waterFee: document.getElementById('waterFee').value,
            gasFee: document.getElementById('gasFee').value,
            managementFee: document.getElementById('managementFee').value,
            otherFee: document.getElementById('otherFee').value,
            billDate: document.getElementById('billDate').value,
            payeeName: document.getElementById('payeeName').value,
            bankCode: document.getElementById('bankCode').value,
            accountNumber: document.getElementById('accountNumber').value,
            enableElectricity: document.getElementById('enableElectricity').checked,
            enableRent: document.getElementById('enableRent').checked,
            enableWater: document.getElementById('enableWater').checked,
            enableGas: document.getElementById('enableGas').checked,
            enableManagement: document.getElementById('enableManagement').checked,
            enableOther: document.getElementById('enableOther').checked
        };
        localStorage.setItem('electricityCalculator_inputs', JSON.stringify(inputs));
    } catch (e) {
        console.error('儲存失敗:', e);
    }
}

// 載入所有輸入值
function loadAllInputs() {
    try {
        const saved = localStorage.getItem('electricityCalculator_inputs');
        if (saved) {
            const inputs = JSON.parse(saved);
            
            if (inputs.lastReading) document.getElementById('lastReading').value = inputs.lastReading;
            if (inputs.currentReading) document.getElementById('currentReading').value = inputs.currentReading;
            if (inputs.pricePerUnit) document.getElementById('pricePerUnit').value = inputs.pricePerUnit;
            if (inputs.rent) document.getElementById('rent').value = inputs.rent;
            if (inputs.waterFee !== undefined) document.getElementById('waterFee').value = inputs.waterFee;
            if (inputs.gasFee !== undefined) document.getElementById('gasFee').value = inputs.gasFee;
            if (inputs.managementFee !== undefined) document.getElementById('managementFee').value = inputs.managementFee;
            if (inputs.otherFee !== undefined) document.getElementById('otherFee').value = inputs.otherFee;
            if (inputs.billDate) document.getElementById('billDate').value = inputs.billDate;
            if (inputs.payeeName) document.getElementById('payeeName').value = inputs.payeeName;
            if (inputs.bankCode) document.getElementById('bankCode').value = inputs.bankCode;
            if (inputs.accountNumber) document.getElementById('accountNumber').value = inputs.accountNumber;
            
            // 載入開關狀態
            if (inputs.enableElectricity !== undefined) document.getElementById('enableElectricity').checked = inputs.enableElectricity;
            if (inputs.enableRent !== undefined) document.getElementById('enableRent').checked = inputs.enableRent;
            if (inputs.enableWater !== undefined) document.getElementById('enableWater').checked = inputs.enableWater;
            if (inputs.enableGas !== undefined) document.getElementById('enableGas').checked = inputs.enableGas;
            if (inputs.enableManagement !== undefined) document.getElementById('enableManagement').checked = inputs.enableManagement;
            if (inputs.enableOther !== undefined) document.getElementById('enableOther').checked = inputs.enableOther;
        }
    } catch (e) {
        console.error('載入失敗:', e);
    }
}

// 為所有輸入欄位添加自動儲存功能
function setupAutoSave() {
    const inputIds = ['lastReading', 'currentReading', 'pricePerUnit', 'rent', 'gasFee', 'waterFee', 'managementFee', 'otherFee', 'billDate', 'payeeName', 'bankCode', 'accountNumber'];
    
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                saveAllInputs();
            });
            input.addEventListener('change', function() {
                saveAllInputs();
            });
        }
    });
}

// 費用開關切換功能
function setupFeeToggles() {
    const toggles = [
        { checkbox: 'enableElectricity', fields: 'electricityFields' },
        { checkbox: 'enableRent', fields: 'rentFields' },
        { checkbox: 'enableWater', fields: 'waterFields' },
        { checkbox: 'enableGas', fields: 'gasFields' },
        { checkbox: 'enableManagement', fields: 'managementFields' },
        { checkbox: 'enableOther', fields: 'otherFields' }
    ];
    
    toggles.forEach(toggle => {
        const checkbox = document.getElementById(toggle.checkbox);
        const fields = document.getElementById(toggle.fields);
        if (checkbox && fields) {
            checkbox.addEventListener('change', function() {
                fields.style.display = this.checked ? 'block' : 'none';
                saveAllInputs();
            });
            // 初始化顯示狀態
            fields.style.display = checkbox.checked ? 'block' : 'none';
        }
    });
}

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
    
    // 設定自動儲存功能
    setupAutoSave();
};

// 按Enter鍵時計算
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        calculateAndSave();
    }
});
