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

// 資料標準化函數：將舊版本資料轉換為新版本格式
// 支援向後兼容，匯入時適應舊版格式
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
            data.settings.enableElectricity = (data.settings.pricePerUnit !== undefined && data.settings.pricePerUnit > 0);
        }
        if (data.settings.enableRent === undefined) {
            data.settings.enableRent = (data.settings.rent !== undefined && data.settings.rent > 0);
        }
        if (data.settings.enableWater === undefined) {
            data.settings.enableWater = false;
        }
        if (data.settings.enableGas === undefined) {
            data.settings.enableGas = false;
        }
        if (data.settings.enableManagement === undefined) {
            data.settings.enableManagement = false;
        }
        if (data.settings.enableOther === undefined) {
            data.settings.enableOther = false;
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
        
        // 備註欄位（新版功能，舊版沒有）
        // 確保即使為空也初始化為空字串，以對齊未來匯入使用
        if (data.settings.tenantNote === undefined || data.settings.tenantNote === null) {
            data.settings.tenantNote = '';
        }
        if (data.settings.landlordNote === undefined || data.settings.landlordNote === null) {
            data.settings.landlordNote = '';
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
            
            // 備註欄位（新版功能，舊版沒有）
            // 確保即使為空也初始化為空字串，以對齊未來匯入使用
            if (record.tenantNote === undefined || record.tenantNote === null) {
                record.tenantNote = '';
            }
            if (record.landlordNote === undefined || record.landlordNote === null) {
                record.landlordNote = '';
            }
            
            return record;
        });
    }
    
    return data;
}
