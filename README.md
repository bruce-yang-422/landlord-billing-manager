# 房東帳務管理工具

房東用的租金與電費計算管理工具，支援帳務歷史紀錄、113年7月新制法規合規計算。  
A web tool for managing rent, electricity bills, and billing history for landlords, with compliance to Taiwan's 2024 electricity billing regulations.

## 🌐 線上使用

**立即使用：** [https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html](https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html)

## 功能特色

### 💰 費用管理
- ⚡ **電費計算**：自動計算用電度數與電費金額
- 🏠 **租金管理**：支援租金計算
- 💧 **水費、瓦斯費、管理費、其他費用**：可選擇開啟/關閉各費用項目，靈活計算
- 🎛️ **費用開關**：每個費用項目都有獨立的開關，可隨時啟用或停用

### 📋 113年7月新制法規支援
- 📋 **電費新制開關**：可切換新制/舊制模式
- ⚡ **台電帳單計算**：有獨立電表時，自動從台電帳單計算平均單價
- 🔒 **法規合規**：自動限制電費單價不超過台電帳單平均單價
- ⚠️ **法規提醒**：顯示法規警語，保護房東免於受罰

### 📝 備註功能
- 📝 **租客備註**：會顯示在 LINE 報表中給租客看到（選填）
- 🔒 **房東備註**：僅供房東記錄，不會顯示給租客（選填）

### 📜 資料管理
- 📜 **歷史紀錄**：完整保存所有帳單歷史記錄，包含房東備註
- 📋 **LINE 報表**：一鍵生成並複製報表，方便傳送給房客（包含租客備註）
- 💾 **資料備份**：支援匯出/匯入 JSON 格式備份檔
- 🔄 **向後兼容**：匯入時自動適應舊版本資料格式
- 🏦 **收款資訊**：自動記憶銀行帳號與收款資訊
- 🔄 **自動記憶**：自動保存輸入值，下次使用更方便

### 🎨 使用者體驗
- 🎨 **Apple 風格設計**：現代化、簡潔的介面設計
- 📱 **響應式設計**：完美支援手機、平板、電腦
- 🎯 **卡片式布局**：PC 端採用兩欄布局，手機端自動調整
- 🔘 **滑動開關**：直觀的開關設計，取代傳統 checkbox

## 使用方式

### 線上使用（推薦）

直接透過 GitHub Pages 使用，無需下載：  
👉 [https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html](https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html)

### 本地使用

1. 下載專案後，直接在瀏覽器中開啟 `electricity-calculator.html`
2. 填入帳單日期、電錶讀數、租金等資訊
3. （選填）開啟電費新制，填入台電帳單資訊
4. （選填）填入租客備註和房東備註
5. 點擊「計算並存檔」即可完成計算並保存記錄
6. 使用「備份資料」功能匯出 JSON 備份檔
7. 使用「匯入資料」功能還原之前的備份

## 檔案說明

### 主要檔案
- `electricity-calculator.html` - 主要的帳務管理工具網頁應用

### 樣式檔案
- `css/style.css` - 統一樣式表（Apple 風格設計）

### JavaScript 模組
- `js/data.js` - 資料結構與標準化函數（向後兼容處理）
- `js/storage.js` - 資料儲存與匯入/匯出功能
- `js/calculation.js` - 計算邏輯與報表生成
- `js/ui.js` - UI 控制與歷史記錄顯示
- `js/app.js` - 主入口文件（初始化邏輯）

### 其他檔案
- `billing-records-backup.json` - 資料備份檔案範例（已加入 .gitignore，不會上傳到 Git）

## 技術說明

- **純前端應用**：無需伺服器，可直接在瀏覽器中使用
- **資料儲存**：使用 LocalStorage 儲存資料
- **響應式設計**：完美支援手機、平板、電腦
- **模組化架構**：CSS 和 JavaScript 分離為多個模組，便於維護與擴展
- **資料格式**：JSON（包含 settings 與 records）
- **向後兼容**：自動處理舊版本資料格式，確保資料不遺失

## 資料結構說明

所有資料皆儲存在瀏覽器 `localStorage` 中，主要結構如下：

```json
{
  "settings": {
    "pricePerUnit": 5.5,
    "rent": 7000,
    "bankCode": "011",
    "payeeName": "Example Name",
    "accountNumber": "123456789",
    "enableElectricity": true,
    "enableRent": true,
    "enableWater": false,
    "enableGas": false,
    "enableManagement": false,
    "enableOther": false,
    "enableNewRegulation": false,
    "hasIndependentMeter": false,
    "taipowerBillAmount": 0,
    "taipowerBillUsage": 0,
    "tenantNote": "",
    "landlordNote": ""
  },
  "records": [
    {
      "id": 1768040357422,
      "date": "2026-01-10",
      "lastReading": 10715,
      "currentReading": 10935,
      "usage": 220,
      "electricityFee": 1210,
      "rent": 7000,
      "waterFee": 0,
      "gasFee": 580,
      "managementFee": 0,
      "otherFee": 0,
      "total": 8790,
      "pricePerUnit": 5.5,
      "enableElectricity": true,
      "enableRent": true,
      "enableWater": false,
      "enableGas": true,
      "enableManagement": false,
      "enableOther": false,
      "enableNewRegulation": false,
      "hasIndependentMeter": false,
      "taipowerBillAmount": 0,
      "taipowerBillUsage": 0,
      "tenantNote": "",
      "landlordNote": ""
    }
  ]
}
```

### 欄位說明

**settings（設定）：**
- `pricePerUnit` - 電費單價（元/度）
- `rent` - 租金（元）
- `bankCode` - 銀行代碼
- `payeeName` - 收款人姓名
- `accountNumber` - 銀行帳號
- `enableElectricity` - 電費開關（預設開啟）
- `enableRent` - 租金開關（預設開啟）
- `enableWater` - 水費開關（預設關閉）
- `enableGas` - 瓦斯費開關（預設關閉）
- `enableManagement` - 管理費開關（預設關閉）
- `enableOther` - 其他費用開關（預設關閉）
- `enableNewRegulation` - 電費新制開關（預設關閉）
- `hasIndependentMeter` - 是否有房客獨立電表（預設 false）
- `taipowerBillAmount` - 台電帳單總金額（元）
- `taipowerBillUsage` - 台電帳單總度數（度）
- `tenantNote` - 租客備註（選填，會顯示在 LINE 報表中）
- `landlordNote` - 房東備註（選填，僅供記錄，不顯示給租客）

**records（歷史記錄）：**
- `id` - 唯一識別碼（使用 `Date.now()` 生成的時間戳記）
- `date` - 帳單日期
- `lastReading` - 上期電錶讀數
- `currentReading` - 本期電錶讀數
- `usage` - 用電度數
- `electricityFee` - 電費金額
- `rent` - 租金
- `waterFee` - 水費
- `gasFee` - 瓦斯費
- `managementFee` - 管理費
- `otherFee` - 其他費用
- `total` - 總金額
- `pricePerUnit` - 當時的電費單價
- 各費用項目的開關狀態
- 新制法規相關欄位（`enableNewRegulation`, `hasIndependentMeter`, `taipowerBillAmount`, `taipowerBillUsage`）
- 備註欄位（`tenantNote`, `landlordNote`）

### 資料相容性

- **向後兼容**：支援匯入舊版本備份檔案，自動補齊缺失欄位
- **自動推斷**：自動推斷費用開關狀態（根據現有資料）
- **自動計算**：自動重新計算總金額（如果缺失）
- **空值處理**：備註欄位即使為空也會匯出，確保資料結構一致性

## 113年7月新制法規說明

根據內政部最新公告，租屋電費計收必須遵循「實報實銷」原則：

- **生效日期**：113年7月15日起簽署的新租約全面適用
- **收費上限**：
  - **按度計費**：不得超過台電帳單的「當期每度平均電價」
  - **非按度計費**：收取總額不得超過台電帳單「每期電費總額」
- **公共電費**：若未併入台電帳單分攤，房東不得額外收取
- **罰則**：違規超收最高可處 50 萬元罰鍰

本工具提供新制模式，協助房東合法合規計算電費。

## 授權

MIT License
