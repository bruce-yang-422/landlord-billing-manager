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
            if (appData.settings.pricePerUnit !== undefined && appData.settings.pricePerUnit !== null) {
                const priceInput = document.getElementById('pricePerUnit');
                if (priceInput) priceInput.value = appData.settings.pricePerUnit;
            }
            if (appData.settings.rent !== undefined && appData.settings.rent !== null) {
                const rentInput = document.getElementById('rent');
                if (rentInput) rentInput.value = appData.settings.rent;
            }
            if (appData.settings.bankCode !== undefined && appData.settings.bankCode !== null) {
                const bankCodeInput = document.getElementById('bankCode');
                if (bankCodeInput) bankCodeInput.value = appData.settings.bankCode;
            }
            if (appData.settings.payeeName !== undefined && appData.settings.payeeName !== null) {
                const payeeNameInput = document.getElementById('payeeName');
                if (payeeNameInput) payeeNameInput.value = appData.settings.payeeName;
            }
            if (appData.settings.accountNumber !== undefined && appData.settings.accountNumber !== null) {
                const accountInput = document.getElementById('accountNumber');
                if (accountInput) accountInput.value = appData.settings.accountNumber;
            }
            
            // 載入備註欄位（新版功能，即使為空也載入以確保一致性）
            const tenantNoteInput = document.getElementById('tenantNote');
            if (tenantNoteInput && appData.settings.tenantNote !== undefined) {
                tenantNoteInput.value = appData.settings.tenantNote || '';
            }
            const landlordNoteInput = document.getElementById('landlordNote');
            if (landlordNoteInput && appData.settings.landlordNote !== undefined) {
                landlordNoteInput.value = appData.settings.landlordNote || '';
            }
            
            // 載入開關狀態（安全檢查元素是否存在）
            const enableElectricityInput = document.getElementById('enableElectricity');
            if (enableElectricityInput) {
                enableElectricityInput.checked = appData.settings.enableElectricity !== undefined ? appData.settings.enableElectricity : true;
            }
            const enableRentInput = document.getElementById('enableRent');
            if (enableRentInput) {
                enableRentInput.checked = appData.settings.enableRent !== undefined ? appData.settings.enableRent : true;
            }
            const enableWaterInput = document.getElementById('enableWater');
            if (enableWaterInput && appData.settings.enableWater !== undefined) {
                enableWaterInput.checked = appData.settings.enableWater;
            }
            const enableGasInput = document.getElementById('enableGas');
            if (enableGasInput && appData.settings.enableGas !== undefined) {
                enableGasInput.checked = appData.settings.enableGas;
            }
            const enableManagementInput = document.getElementById('enableManagement');
            if (enableManagementInput && appData.settings.enableManagement !== undefined) {
                enableManagementInput.checked = appData.settings.enableManagement;
            }
            const enableOtherInput = document.getElementById('enableOther');
            if (enableOtherInput && appData.settings.enableOther !== undefined) {
                enableOtherInput.checked = appData.settings.enableOther;
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
        // 安全取得元素值，避免元素不存在時出錯
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        const getChecked = (id) => {
            const el = document.getElementById(id);
            return el ? el.checked : false;
        };
        
        const inputs = {
            lastReading: getValue('lastReading'),
            currentReading: getValue('currentReading'),
            pricePerUnit: getValue('pricePerUnit'),
            rent: getValue('rent'),
            waterFee: getValue('waterFee'),
            gasFee: getValue('gasFee'),
            managementFee: getValue('managementFee'),
            otherFee: getValue('otherFee'),
            billDate: getValue('billDate'),
            payeeName: getValue('payeeName'),
            bankCode: getValue('bankCode'),
            accountNumber: getValue('accountNumber'),
            enableElectricity: getChecked('enableElectricity'),
            enableRent: getChecked('enableRent'),
            enableWater: getChecked('enableWater'),
            enableGas: getChecked('enableGas'),
            enableManagement: getChecked('enableManagement'),
            enableOther: getChecked('enableOther'),
            enableNewRegulation: getChecked('enableNewRegulation'),
            hasIndependentMeter: getChecked('hasIndependentMeter'),
            taipowerBillAmount: getValue('taipowerBillAmount'),
            taipowerBillUsage: getValue('taipowerBillUsage'),
            // 備註欄位：確保即使為空也儲存為空字串，以對齊未來匯入使用
            tenantNote: getValue('tenantNote') || '',
            landlordNote: getValue('landlordNote') || ''
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
            
            // 使用 !== undefined 檢查，避免值為0或空字串時無法載入
            if (inputs.lastReading !== undefined && inputs.lastReading !== null) {
                const lastReadingInput = document.getElementById('lastReading');
                if (lastReadingInput) lastReadingInput.value = inputs.lastReading;
            }
            if (inputs.currentReading !== undefined && inputs.currentReading !== null) {
                const currentReadingInput = document.getElementById('currentReading');
                if (currentReadingInput) currentReadingInput.value = inputs.currentReading;
            }
            if (inputs.pricePerUnit !== undefined && inputs.pricePerUnit !== null) {
                const priceInput = document.getElementById('pricePerUnit');
                if (priceInput) priceInput.value = inputs.pricePerUnit;
            }
            if (inputs.rent !== undefined && inputs.rent !== null) {
                const rentInput = document.getElementById('rent');
                if (rentInput) rentInput.value = inputs.rent;
            }
            if (inputs.waterFee !== undefined) document.getElementById('waterFee').value = inputs.waterFee;
            if (inputs.gasFee !== undefined) document.getElementById('gasFee').value = inputs.gasFee;
            if (inputs.managementFee !== undefined) document.getElementById('managementFee').value = inputs.managementFee;
            if (inputs.otherFee !== undefined) document.getElementById('otherFee').value = inputs.otherFee;
            if (inputs.billDate !== undefined && inputs.billDate !== null) {
                const billDateInput = document.getElementById('billDate');
                if (billDateInput) billDateInput.value = inputs.billDate;
            }
            if (inputs.payeeName !== undefined && inputs.payeeName !== null) {
                const payeeNameInput = document.getElementById('payeeName');
                if (payeeNameInput) payeeNameInput.value = inputs.payeeName;
            }
            if (inputs.bankCode !== undefined && inputs.bankCode !== null) {
                const bankCodeInput = document.getElementById('bankCode');
                if (bankCodeInput) bankCodeInput.value = inputs.bankCode;
            }
            if (inputs.accountNumber !== undefined && inputs.accountNumber !== null) {
                const accountInput = document.getElementById('accountNumber');
                if (accountInput) accountInput.value = inputs.accountNumber;
            }
            
            // 載入開關狀態
            if (inputs.enableElectricity !== undefined) document.getElementById('enableElectricity').checked = inputs.enableElectricity;
            if (inputs.enableRent !== undefined) document.getElementById('enableRent').checked = inputs.enableRent;
            if (inputs.enableWater !== undefined) document.getElementById('enableWater').checked = inputs.enableWater;
            if (inputs.enableGas !== undefined) document.getElementById('enableGas').checked = inputs.enableGas;
            if (inputs.enableManagement !== undefined) document.getElementById('enableManagement').checked = inputs.enableManagement;
            if (inputs.enableOther !== undefined) document.getElementById('enableOther').checked = inputs.enableOther;
            
            // 載入新制法規相關欄位
            const newRegInput = document.getElementById('enableNewRegulation');
            if (newRegInput && inputs.enableNewRegulation !== undefined) {
                newRegInput.checked = inputs.enableNewRegulation;
            }
            const hasMeterInput = document.getElementById('hasIndependentMeter');
            if (hasMeterInput && inputs.hasIndependentMeter !== undefined) {
                hasMeterInput.checked = inputs.hasIndependentMeter;
            }
            const taipowerAmountInput = document.getElementById('taipowerBillAmount');
            if (taipowerAmountInput && inputs.taipowerBillAmount !== undefined && inputs.taipowerBillAmount !== null) {
                taipowerAmountInput.value = inputs.taipowerBillAmount;
            }
            const taipowerUsageInput = document.getElementById('taipowerBillUsage');
            if (taipowerUsageInput && inputs.taipowerBillUsage !== undefined && inputs.taipowerBillUsage !== null) {
                taipowerUsageInput.value = inputs.taipowerBillUsage;
            }
            
            // 載入備註欄位（即使為空也載入以確保一致性）
            const tenantNoteInput = document.getElementById('tenantNote');
            if (tenantNoteInput && inputs.tenantNote !== undefined) {
                tenantNoteInput.value = inputs.tenantNote || '';
            }
            const landlordNoteInput = document.getElementById('landlordNote');
            if (landlordNoteInput && inputs.landlordNote !== undefined) {
                landlordNoteInput.value = inputs.landlordNote || '';
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
