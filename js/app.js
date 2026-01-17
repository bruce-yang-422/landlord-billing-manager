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
    
    // 新制法規相關變數
    const enableNewRegulation = document.getElementById('enableNewRegulation').checked;
    const hasIndependentMeter = document.getElementById('hasIndependentMeter').checked;
    const taipowerBillAmount = parseFloat(document.getElementById('taipowerBillAmount').value) || 0;
    const taipowerBillUsage = parseFloat(document.getElementById('taipowerBillUsage').value) || 0;
    
    if (enableElectricity) {
        lastReading = parseFloat(document.getElementById('lastReading').value) || 0;
        currentReading = parseFloat(document.getElementById('currentReading').value) || 0;
        
        // 新制模式：有獨立電表時，從台電帳單計算單價
        if (enableNewRegulation && hasIndependentMeter) {
            if (taipowerBillAmount <= 0 || taipowerBillUsage <= 0) {
                alert('請輸入台電帳單總金額和總度數！');
                return;
            }
            // 計算平均單價（四捨五入至小數點後第一位）
            pricePerUnit = Math.round((taipowerBillAmount / taipowerBillUsage) * 10) / 10;
            // 更新單價欄位（唯讀）
            document.getElementById('pricePerUnit').value = pricePerUnit;
        } else {
            // 舊制模式或新制無電表：手動輸入單價
            pricePerUnit = parseFloat(document.getElementById('pricePerUnit').value) || 0;
            
            // 新制模式但無電表：驗證總額不超過台電帳單
            if (enableNewRegulation && !hasIndependentMeter) {
                if (pricePerUnit <= 0) {
                    alert('請輸入電費單價！');
                    return;
                }
                // 這裡可以添加總額驗證邏輯（如果需要的話）
            } else if (!enableNewRegulation && pricePerUnit <= 0) {
                alert('請輸入電費單價！');
                return;
            }
        }
        
        if (currentReading <= lastReading) {
            alert('本期電錶讀數必須大於上期讀數！');
            return;
        }
        
        usage = currentReading - lastReading;
        electricityFee = Math.round(usage * pricePerUnit);
        
        // 新制模式：驗證電費總額不超過台電帳單（無電表情況）
        if (enableNewRegulation && !hasIndependentMeter && taipowerBillAmount > 0) {
            if (electricityFee > taipowerBillAmount) {
                alert(`⚠️ 警告：計算出的電費總額（${electricityFee}元）超過台電帳單總額（${taipowerBillAmount}元）。\n\n請確認單價是否正確，違規超收最高可處 50 萬元罰鍰。`);
                // 不阻止計算，但提醒用戶
            }
        }
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
        enableOther: enableOther,
        enableNewRegulation: enableNewRegulation,
        hasIndependentMeter: hasIndependentMeter,
        taipowerBillAmount: taipowerBillAmount,
        taipowerBillUsage: taipowerBillUsage
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
        enableOther: enableOther,
        enableNewRegulation: enableNewRegulation,
        hasIndependentMeter: hasIndependentMeter,
        taipowerBillAmount: taipowerBillAmount,
        taipowerBillUsage: taipowerBillUsage
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
        const latestRecord = appData.records[0];
        // 取最近一次的「本期」作為這次的「上期」
        if (latestRecord.currentReading !== undefined && latestRecord.currentReading !== null) {
            const lastReadingInput = document.getElementById('lastReading');
            // 如果上期讀數欄位為空，才自動填入
            if (!lastReadingInput.value) {
                lastReadingInput.value = latestRecord.currentReading;
            }
        }
        // 如果本期讀數欄位為空，也填入最新記錄的本期讀數作為參考
        const currentReadingInput = document.getElementById('currentReading');
        if (!currentReadingInput.value && latestRecord.currentReading !== undefined && latestRecord.currentReading !== null) {
            currentReadingInput.value = latestRecord.currentReading;
        }
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

// 資料標準化函數：將舊版本資料轉換為新版本格式
function normalizeData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    // 確保有 settings 物件
    if (!data.settings) {
        data.settings = {};
    }
    
    // 標準化 settings
    if (data.settings) {
        // 補齊缺失的開關狀態（根據現有資料推斷）
        if (data.settings.enableElectricity === undefined) {
            // 如果有電費相關資料，預設開啟
            data.settings.enableElectricity = (data.settings.pricePerUnit !== undefined && data.settings.pricePerUnit > 0);
        }
        if (data.settings.enableRent === undefined) {
            data.settings.enableRent = (data.settings.rent !== undefined && data.settings.rent > 0);
        }
        if (data.settings.enableWater === undefined) {
            data.settings.enableWater = false; // 預設關閉
        }
        if (data.settings.enableGas === undefined) {
            data.settings.enableGas = false; // 預設關閉
        }
        if (data.settings.enableManagement === undefined) {
            data.settings.enableManagement = false; // 預設關閉
        }
        if (data.settings.enableOther === undefined) {
            data.settings.enableOther = false; // 預設關閉
        }
        
        // 新制法規相關欄位（預設為舊制）
        if (data.settings.enableNewRegulation === undefined) {
            data.settings.enableNewRegulation = false;
        }
        if (data.settings.hasIndependentMeter === undefined) {
            data.settings.hasIndependentMeter = false;
        }
        if (data.settings.taipowerBillAmount === undefined) {
            data.settings.taipowerBillAmount = 0;
        }
        if (data.settings.taipowerBillUsage === undefined) {
            data.settings.taipowerBillUsage = 0;
        }
    }
    
    // 確保有 records 陣列
    if (!data.records) {
        data.records = [];
    }
    
    // 標準化 records
    if (data.records && Array.isArray(data.records)) {
        data.records = data.records.map(record => {
            // 補齊缺失的費用欄位
            if (record.waterFee === undefined) {
                record.waterFee = 0;
            }
            if (record.managementFee === undefined) {
                record.managementFee = 0;
            }
            if (record.otherFee === undefined) {
                record.otherFee = 0;
            }
            
            // 補齊缺失的開關狀態（根據現有資料推斷）
            if (record.enableElectricity === undefined) {
                // 如果有電費相關資料，預設開啟
                record.enableElectricity = (record.usage !== undefined && record.usage > 0) || 
                                          (record.electricityFee !== undefined && record.electricityFee > 0);
            }
            if (record.enableRent === undefined) {
                record.enableRent = (record.rent !== undefined && record.rent > 0);
            }
            if (record.enableWater === undefined) {
                record.enableWater = (record.waterFee !== undefined && record.waterFee > 0);
            }
            if (record.enableGas === undefined) {
                record.enableGas = (record.gasFee !== undefined && record.gasFee > 0);
            }
            if (record.enableManagement === undefined) {
                record.enableManagement = (record.managementFee !== undefined && record.managementFee > 0);
            }
            if (record.enableOther === undefined) {
                record.enableOther = (record.otherFee !== undefined && record.otherFee > 0);
            }
            
            // 確保有必要的欄位
            if (record.lastReading === undefined) record.lastReading = 0;
            if (record.currentReading === undefined) record.currentReading = 0;
            if (record.usage === undefined) record.usage = 0;
            if (record.electricityFee === undefined) record.electricityFee = 0;
            if (record.rent === undefined) record.rent = 0;
            if (record.gasFee === undefined) record.gasFee = 0;
            if (record.total === undefined) {
                // 重新計算總金額
                record.total = (record.electricityFee || 0) + 
                              (record.rent || 0) + 
                              (record.waterFee || 0) + 
                              (record.gasFee || 0) + 
                              (record.managementFee || 0) + 
                              (record.otherFee || 0);
            }
            if (record.pricePerUnit === undefined) {
                record.pricePerUnit = data.settings?.pricePerUnit || 0;
            }
            
            // 新制法規相關欄位（預設為舊制）
            if (record.enableNewRegulation === undefined) {
                record.enableNewRegulation = false;
            }
            if (record.hasIndependentMeter === undefined) {
                record.hasIndependentMeter = false;
            }
            if (record.taipowerBillAmount === undefined) {
                record.taipowerBillAmount = 0;
            }
            if (record.taipowerBillUsage === undefined) {
                record.taipowerBillUsage = 0;
            }
            
            return record;
        });
    }
    
    return data;
}

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
            let parsedData = JSON.parse(json);
            // 標準化資料（處理舊版本格式）
            appData = normalizeData(parsedData);
            
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
            
            // 載入開關狀態（使用標準化後的資料）
            if (appData.settings.enableElectricity !== undefined) {
                document.getElementById('enableElectricity').checked = appData.settings.enableElectricity;
            } else {
                document.getElementById('enableElectricity').checked = true; // 預設開啟
            }
            if (appData.settings.enableRent !== undefined) {
                document.getElementById('enableRent').checked = appData.settings.enableRent;
            } else {
                document.getElementById('enableRent').checked = true; // 預設開啟
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
            
            // 儲存標準化後的資料
            saveToLocalStorage();
            
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
                // 標準化資料（處理舊版本格式）
                appData = normalizeData(importedData);
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
            enableOther: document.getElementById('enableOther').checked,
            enableNewRegulation: document.getElementById('enableNewRegulation') ? document.getElementById('enableNewRegulation').checked : false,
            hasIndependentMeter: document.getElementById('hasIndependentMeter') ? document.getElementById('hasIndependentMeter').checked : false,
            taipowerBillAmount: document.getElementById('taipowerBillAmount') ? document.getElementById('taipowerBillAmount').value : '',
            taipowerBillUsage: document.getElementById('taipowerBillUsage') ? document.getElementById('taipowerBillUsage').value : ''
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
            
            // 載入新制法規相關欄位
            if (inputs.enableNewRegulation !== undefined && document.getElementById('enableNewRegulation')) {
                document.getElementById('enableNewRegulation').checked = inputs.enableNewRegulation;
            }
            if (inputs.hasIndependentMeter !== undefined && document.getElementById('hasIndependentMeter')) {
                document.getElementById('hasIndependentMeter').checked = inputs.hasIndependentMeter;
            }
            if (inputs.taipowerBillAmount && document.getElementById('taipowerBillAmount')) {
                document.getElementById('taipowerBillAmount').value = inputs.taipowerBillAmount;
            }
            if (inputs.taipowerBillUsage && document.getElementById('taipowerBillUsage')) {
                document.getElementById('taipowerBillUsage').value = inputs.taipowerBillUsage;
            }
            
            // 觸發新制 UI 更新
            if (document.getElementById('enableNewRegulation')) {
                setTimeout(() => {
                    const event = new Event('change');
                    document.getElementById('enableNewRegulation').dispatchEvent(event);
                    if (document.getElementById('hasIndependentMeter')) {
                        document.getElementById('hasIndependentMeter').dispatchEvent(event);
                    }
                }, 100);
            }
        }
    } catch (e) {
        console.error('載入失敗:', e);
    }
}

// 為所有輸入欄位添加自動儲存功能
function setupAutoSave() {
    const inputIds = ['lastReading', 'currentReading', 'pricePerUnit', 'rent', 'gasFee', 'waterFee', 'managementFee', 'otherFee', 'billDate', 'payeeName', 'bankCode', 'accountNumber', 'taipowerBillAmount', 'taipowerBillUsage'];
    
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
    
    // 新制相關 checkbox
    const checkboxIds = ['enableNewRegulation', 'hasIndependentMeter'];
    checkboxIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
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

// 新制法規 UI 控制
function setupNewRegulationToggles() {
    const newRegCheckbox = document.getElementById('enableNewRegulation');
    const newRegFields = document.getElementById('newRegulationFields');
    const hasMeterCheckbox = document.getElementById('hasIndependentMeter');
    const taipowerFields = document.getElementById('taipowerBillFields');
    const noMeterNotice = document.getElementById('noMeterNotice');
    const pricePerUnitInput = document.getElementById('pricePerUnit');
    const pricePerUnitNotice = document.getElementById('pricePerUnitNotice');
    
    // 新制開關切換
    if (newRegCheckbox && newRegFields) {
        newRegCheckbox.addEventListener('change', function() {
            newRegFields.style.display = this.checked ? 'block' : 'none';
            updatePricePerUnitReadOnly();
            saveAllInputs();
        });
        // 初始化顯示狀態
        newRegFields.style.display = newRegCheckbox.checked ? 'block' : 'none';
    }
    
    // 是否有獨立電表切換
    if (hasMeterCheckbox) {
        hasMeterCheckbox.addEventListener('change', function() {
            updateNewRegulationFields();
            calculateTaipowerPrice();
            saveAllInputs();
        });
    }
    
    // 台電帳單金額和度數變更時，自動計算單價
    const taipowerAmountInput = document.getElementById('taipowerBillAmount');
    const taipowerUsageInput = document.getElementById('taipowerBillUsage');
    
    if (taipowerAmountInput) {
        taipowerAmountInput.addEventListener('input', function() {
            calculateTaipowerPrice();
            saveAllInputs();
        });
    }
    
    if (taipowerUsageInput) {
        taipowerUsageInput.addEventListener('input', function() {
            calculateTaipowerPrice();
            saveAllInputs();
        });
    }
    
    // 更新新制相關欄位顯示
    function updateNewRegulationFields() {
        if (newRegCheckbox && newRegCheckbox.checked) {
            if (hasMeterCheckbox && hasMeterCheckbox.checked) {
                // 有獨立電表：顯示台電帳單欄位
                if (taipowerFields) taipowerFields.style.display = 'block';
                if (noMeterNotice) noMeterNotice.style.display = 'none';
            } else {
                // 無獨立電表：顯示提醒
                if (taipowerFields) taipowerFields.style.display = 'none';
                if (noMeterNotice) noMeterNotice.style.display = 'block';
            }
        }
        updatePricePerUnitReadOnly();
    }
    
    // 計算台電平均單價
    function calculateTaipowerPrice() {
        if (newRegCheckbox && newRegCheckbox.checked && 
            hasMeterCheckbox && hasMeterCheckbox.checked) {
            const amount = parseFloat(taipowerAmountInput.value) || 0;
            const usage = parseFloat(taipowerUsageInput.value) || 0;
            
            if (amount > 0 && usage > 0) {
                // 計算平均單價（四捨五入至小數點後第一位）
                const avgPrice = Math.round((amount / usage) * 10) / 10;
                pricePerUnitInput.value = avgPrice;
                updatePricePerUnitReadOnly();
            }
        }
    }
    
    // 更新單價欄位唯讀狀態
    function updatePricePerUnitReadOnly() {
        if (newRegCheckbox && newRegCheckbox.checked && 
            hasMeterCheckbox && hasMeterCheckbox.checked) {
            // 新制 + 有電表：唯讀
            pricePerUnitInput.readOnly = true;
            pricePerUnitInput.style.backgroundColor = '#f5f5f5';
            pricePerUnitInput.style.cursor = 'not-allowed';
            if (pricePerUnitNotice) pricePerUnitNotice.style.display = 'block';
        } else {
            // 舊制或新制無電表：可編輯
            pricePerUnitInput.readOnly = false;
            pricePerUnitInput.style.backgroundColor = '';
            pricePerUnitInput.style.cursor = '';
            if (pricePerUnitNotice) pricePerUnitNotice.style.display = 'none';
        }
    }
    
    // 初始化
    updateNewRegulationFields();
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
