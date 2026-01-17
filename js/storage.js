// 儲存資料到 localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('electricityCalculator_db', JSON.stringify(appData));
    } catch (e) {
        console.error('儲存失敗:', e);
    }
}

// 從 localStorage 載入資料
function loadFromLocalStorage() {
    try {
        const json = localStorage.getItem('electricityCalculator_db');
        if (json) {
            let parsedData = JSON.parse(json);
            // 標準化資料（處理舊版本格式，向後兼容）
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
            
            // 載入備註欄位（新版功能）
            if (appData.settings.tenantNote && document.getElementById('tenantNote')) {
                document.getElementById('tenantNote').value = appData.settings.tenantNote;
            }
            if (appData.settings.landlordNote && document.getElementById('landlordNote')) {
                document.getElementById('landlordNote').value = appData.settings.landlordNote;
            }
            
            // 載入開關狀態
            if (appData.settings.enableElectricity !== undefined) {
                document.getElementById('enableElectricity').checked = appData.settings.enableElectricity;
            } else {
                document.getElementById('enableElectricity').checked = true;
            }
            if (appData.settings.enableRent !== undefined) {
                document.getElementById('enableRent').checked = appData.settings.enableRent;
            } else {
                document.getElementById('enableRent').checked = true;
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

// 匯出 JSON (備份) - 使用新版格式
function exportData() {
    try {
        // 確保資料已標準化為新版格式
        const exportData = normalizeData(JSON.parse(JSON.stringify(appData)));
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "billing-records-backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        alert('✅ 資料已匯出！(檔名：billing-records-backup.json)');
    } catch (e) {
        alert('❌ 匯出失敗：' + e.message);
    }
}

// 匯入 JSON (還原) - 適應舊版格式
function importData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            // 簡單格式檢查
            if (importedData.records && Array.isArray(importedData.records)) {
                // 標準化資料（處理舊版本格式，向後兼容）
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

// 儲存所有輸入值到 localStorage（即時記憶）
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
            taipowerBillUsage: document.getElementById('taipowerBillUsage') ? document.getElementById('taipowerBillUsage').value : '',
            tenantNote: document.getElementById('tenantNote') ? document.getElementById('tenantNote').value : '',
            landlordNote: document.getElementById('landlordNote') ? document.getElementById('landlordNote').value : ''
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
            
            // 載入備註欄位
            if (inputs.tenantNote && document.getElementById('tenantNote')) {
                document.getElementById('tenantNote').value = inputs.tenantNote;
            }
            if (inputs.landlordNote && document.getElementById('landlordNote')) {
                document.getElementById('landlordNote').value = inputs.landlordNote;
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
