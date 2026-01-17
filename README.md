# 🏠 房東帳務管理助手 (113年電費新制合法合規版)

![法規符合](https://img.shields.io/badge/法規-113年7月新制合規-brightgreen)
![純前端](https://img.shields.io/badge/技術-純前端應用-blue)
![MIT License](https://img.shields.io/badge/授權-MIT-green)

專為台灣房東打造的輕量化帳務管理工具，內建 **113 年 7 月租屋電費新制** 計算邏輯。協助房東遵循「實報實銷」原則，自動核算台電平均電價上限，產出透明化 LINE 報表，有效降低因超收電費而面臨的高額罰鍰風險。

## 🌟 為什麼選擇本工具？

* **⚖️ 法律風險防護**：自動鎖定「當期每度平均電價」上限，避免違反新制導致 3 萬至 50 萬元之罰鍰。
* **⚡ 實報實銷計費**：支援輸入台電帳單總額與度數，自動換算合法單價。
* **📋 資訊高度透明**：一鍵產出包含計算細節的 LINE 報表，符合新制「應提供電費資訊」之義務。
* **🔄 新舊制雙模切換**：靈活適配 113/07/15 前簽訂之舊約與之後的新約。
* **💾 隱私與備份**：純前端應用，資料僅存在您的瀏覽器中，並支援 JSON 匯出備份。

## 🌐 線上使用

**立即使用：** [https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html](https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html)

## 📊 新舊制切換功能對照

| 功能項目 | 舊制模式 | 新制模式（113年7月15日後） |
|---------|---------|------------------------|
| **電費計算方式** | 手動輸入單價（元/度） | 自動從台電帳單計算平均單價 |
| **單價上限限制** | 無限制 | 自動鎖定不超過台電平均電價 |
| **獨立電表** | 不適用 | 自動計算：台電帳單總額 ÷ 總度數 |
| **非獨立電表** | 手動輸入單價 | 手動輸入，但會警告超過台電帳單總額 |
| **法規提醒** | 無 | 顯示法規警語與罰則提醒 |
| **適用租約** | 113/07/15 前簽訂 | 113/07/15 後簽訂 |
| **報表透明度** | 基本資訊 | 包含台電帳單資訊與計算細節 |

> 💡 **提示**：工具內建「電費新制開關」，可隨時切換新舊制模式，靈活適配不同租約。

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

## ⚖️ 113年7月新制法規說明

根據內政部最新公告，租屋電費計收必須遵循「實報實銷」原則：

### 📅 生效日期
**113年7月15日起簽署的新租約全面適用**

### 💰 收費上限規定

#### 按度計費（有獨立電表）
- 不得超過台電帳單的「**當期每度平均電價**」
- 計算公式：台電帳單總額 ÷ 台電帳單總度數 = 平均電價上限

#### 非按度計費（無獨立電表）
- 收取總額不得超過台電帳單「**每期電費總額**」
- 需手動輸入單價，系統會警告超過上限

### ⚠️ 其他重要規定
- **公共電費**：若未併入台電帳單分攤，房東不得額外收取
- **資訊透明**：房東應提供電費相關資訊給房客
- **罰則**：違規超收最高可處 **3 萬至 50 萬元**罰鍰

### 🛡️ 本工具如何協助合規
- ✅ 自動計算台電平均電價上限
- ✅ 自動限制單價不超過上限
- ✅ 產出包含計算細節的透明化報表
- ✅ 顯示法規警語與罰則提醒

## 授權

MIT License
