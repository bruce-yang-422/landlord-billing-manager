// 渲染歷史列表（包含房東備註）
function renderHistory() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    
    if (appData.records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">尚無歷史紀錄</td></tr>';
        return;
    }
    
    appData.records.forEach(record => {
        const tr = document.createElement('tr');
        // 安全處理日期，避免無效日期格式
        let dateStr = '無日期';
        if (record.date) {
            try {
                const date = new Date(record.date);
                if (!isNaN(date.getTime())) {
                    dateStr = date.getFullYear() + '/' + 
                             String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                             String(date.getDate()).padStart(2, '0');
                }
            } catch (e) {
                console.error('日期格式錯誤:', record.date, e);
            }
        }
        
        const usageText = (record.enableElectricity && record.usage > 0) ? `${record.usage} 度` : '-';
        
        // 如果有房東備註，在總金額下方顯示
        let landlordNoteHtml = '';
        if (record.landlordNote && record.landlordNote.trim()) {
            landlordNoteHtml = `<br><small style="color:#666; font-size:12px;">🔒 ${record.landlordNote}</small>`;
        }
        
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${usageText}</td>
            <td style="color:#e74c3c; font-weight:bold;">
                $${record.total.toLocaleString()}${landlordNoteHtml}
            </td>
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
        const reportSection = document.getElementById('reportSection');
        if (reportSection) {
            reportSection.scrollIntoView({behavior: 'smooth'});
        }
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

// 為所有輸入欄位添加自動儲存功能
function setupAutoSave() {
    const inputIds = ['lastReading', 'currentReading', 'pricePerUnit', 'rent', 'gasFee', 'waterFee', 'managementFee', 'otherFee', 'billDate', 'payeeName', 'bankCode', 'accountNumber', 'taipowerBillAmount', 'taipowerBillUsage', 'tenantNote', 'landlordNote'];
    
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
