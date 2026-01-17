// 計算並儲存
function calculateAndSave() {
    const billDate = document.getElementById('billDate').value;
    const payeeName = document.getElementById('payeeName').value;
    const bankCode = document.getElementById('bankCode').value;
    const accountNumber = document.getElementById('accountNumber').value;
    // 備註欄位：確保即使為空也儲存為空字串，以對齊未來匯入使用
    const tenantNote = document.getElementById('tenantNote') ? (document.getElementById('tenantNote').value || '') : '';
    const landlordNote = document.getElementById('landlordNote') ? (document.getElementById('landlordNote').value || '') : '';
    
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
            pricePerUnit = Math.round((taipowerBillAmount / taipowerBillUsage) * 10) / 10;
            document.getElementById('pricePerUnit').value = pricePerUnit;
        } else {
            pricePerUnit = parseFloat(document.getElementById('pricePerUnit').value) || 0;
            
            if (enableNewRegulation && !hasIndependentMeter) {
                if (pricePerUnit <= 0) {
                    alert('請輸入電費單價！');
                    return;
                }
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
        
        if (enableNewRegulation && !hasIndependentMeter && taipowerBillAmount > 0) {
            if (electricityFee > taipowerBillAmount) {
                alert(`⚠️ 警告：計算出的電費總額（${electricityFee}元）超過台電帳單總額（${taipowerBillAmount}元）。\n\n請確認單價是否正確，違規超收最高可處 50 萬元罰鍰。`);
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
    
    // 更新設定
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
        taipowerBillUsage: taipowerBillUsage,
        tenantNote: tenantNote,
        landlordNote: landlordNote
    };
    
    // 新增一筆紀錄（包含備註）
    const newRecord = {
        id: Date.now(),
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
        taipowerBillUsage: taipowerBillUsage,
        tenantNote: tenantNote,
        landlordNote: landlordNote
    };
    
    appData.records.unshift(newRecord);
    saveAllInputs();
    saveToLocalStorage();
    displayResult(newRecord);
    renderHistory();
    generateReport(newRecord, appData.settings);
    alert('✅ 計算完成並已自動存檔！');
}

// 顯示計算結果
function displayResult(record) {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    
    // 用電量顯示
    const usageDisplay = document.getElementById('usageDisplay');
    if (record.enableElectricity && record.usage > 0) {
        usageDisplay.style.display = 'block';
        document.getElementById('usage').textContent = record.usage;
    } else {
        usageDisplay.style.display = 'none';
    }
    
    // 各項費用顯示
    document.getElementById('electricityFeeDisplay').style.display = record.enableElectricity && record.electricityFee > 0 ? 'block' : 'none';
    document.getElementById('electricityFee').textContent = record.electricityFee.toLocaleString();
    
    document.getElementById('rentDisplayDiv').style.display = record.enableRent && record.rent > 0 ? 'block' : 'none';
    document.getElementById('rentDisplay').textContent = record.rent.toLocaleString();
    
    document.getElementById('waterFeeDisplay').style.display = record.enableWater && record.waterFee > 0 ? 'block' : 'none';
    document.getElementById('waterFeeDisplayAmount').textContent = record.waterFee.toLocaleString();
    
    document.getElementById('gasFeeDisplayDiv').style.display = record.enableGas && record.gasFee > 0 ? 'block' : 'none';
    document.getElementById('gasFeeDisplay').textContent = record.gasFee.toLocaleString();
    
    document.getElementById('managementFeeDisplay').style.display = record.enableManagement && record.managementFee > 0 ? 'block' : 'none';
    document.getElementById('managementFeeDisplayAmount').textContent = record.managementFee.toLocaleString();
    
    document.getElementById('otherFeeDisplay').style.display = record.enableOther && record.otherFee > 0 ? 'block' : 'none';
    document.getElementById('otherFeeDisplayAmount').textContent = record.otherFee.toLocaleString();
    
    document.getElementById('totalAmount').textContent = record.total.toLocaleString();
}

// 生成LINE報表（包含租客備註）
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
    
    // 租客備註（會顯示在LINE報表中）
    if (record.tenantNote && record.tenantNote.trim()) {
        report += `📝 備註\n`;
        report += `${record.tenantNote}\n\n`;
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

// 自動填入上期讀數
function autoFillLastReading() {
    if (appData.records && appData.records.length > 0) {
        const latestRecord = appData.records[0];
        const lastReadingInput = document.getElementById('lastReading');
        const currentReadingInput = document.getElementById('currentReading');
        
        if (latestRecord.currentReading && !lastReadingInput.value) {
            lastReadingInput.value = latestRecord.currentReading;
        }
        
        // 如果本期讀數為空，也填入最新記錄的讀數作為參考
        if (latestRecord.currentReading && !currentReadingInput.value) {
            currentReadingInput.value = latestRecord.currentReading;
        }
    }
}

// 複製報表
function copyReport() {
    const reportText = document.getElementById('reportText').textContent;
    
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
