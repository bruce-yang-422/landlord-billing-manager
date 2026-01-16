# landlord-billing-manager

房東用的租金與電費計算管理工具，支援帳務歷史紀錄。  
A web tool for managing rent, electricity bills, and billing history for landlords.

## 🌐 線上使用

**立即使用：** [https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html](https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html)

## 功能特色

- ⚡ **電費計算**：自動計算用電度數與電費金額
- 💰 **費用管理**：支援電費、租金、水費、瓦斯費、管理費、其他費用的計算
- 🎛️ **費用開關**：可選擇開啟/關閉各費用項目，靈活計算
- 📜 **歷史紀錄**：完整保存所有帳單歷史記錄
- 📋 **LINE 報表**：一鍵生成並複製報表，方便傳送給房客
- 💾 **資料備份**：支援匯出/匯入 JSON 格式備份檔，相容舊版本資料
- 🏦 **收款資訊**：自動記憶銀行帳號與收款資訊
- 🔄 **自動記憶**：自動保存輸入值，下次使用更方便

## 使用方式

### 線上使用（推薦）

直接透過 GitHub Pages 使用，無需下載：  
👉 [https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html](https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html)

### 本地使用

1. 下載專案後，直接在瀏覽器中開啟 `electricity-calculator.html`
2. 填入帳單日期、電錶讀數、租金等資訊
3. 點擊「計算並存檔」即可完成計算並保存記錄
4. 使用「備份資料」功能匯出 JSON 備份檔
5. 使用「匯入資料」功能還原之前的備份

## 檔案說明

- `electricity-calculator.html` - 主要的電費計算器網頁應用
- `css/style.css` - 樣式表
- `js/app.js` - JavaScript 應用邏輯
- `billing-records-backup.json` - 資料備份檔案（包含設定與歷史記錄，已加入 .gitignore）

## 技術說明

- 純前端應用，無需伺服器
- 使用 LocalStorage 儲存資料
- 支援響應式設計，可在手機上使用
- 資料格式：JSON（包含 settings 與 records）
- 模組化設計：CSS 和 JavaScript 分離，便於維護

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
    "enableOther": false
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
      "enableOther": false
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

**records（歷史記錄）：**
- `id` - 唯一識別碼（時間戳記）
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

### 資料相容性

- 支援匯入舊版本備份檔案（自動補齊缺失欄位）
- 自動推斷費用開關狀態（根據現有資料）
- 自動重新計算總金額（如果缺失）

## 授權

MIT License
