# landlord-billing-manager

房東用的租金與電費計算管理工具，支援帳務歷史紀錄。  
A web tool for managing rent, electricity bills, and billing history for landlords.

## 🌐 線上使用

**立即使用：** [https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html](https://bruce-yang-422.github.io/landlord-billing-manager/electricity-calculator.html)

## 功能特色

- ⚡ **電費計算**：自動計算用電度數與電費金額
- 💰 **費用管理**：支援租金、電費、瓦斯費的計算
- 📜 **歷史紀錄**：完整保存所有帳單歷史記錄
- 📋 **LINE 報表**：一鍵生成並複製報表，方便傳送給房客
- 💾 **資料備份**：支援匯出/匯入 JSON 格式備份檔
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
- `billing-records-backup.json` - 資料備份檔案（包含設定與歷史記錄）

## 技術說明

- 純前端應用，無需伺服器
- 使用 LocalStorage 儲存資料
- 支援響應式設計，可在手機上使用
- 資料格式：JSON（包含 settings 與 records）

## 資料結構說明（多房源 / 多租客設計）

本專案目前版本以「單一房源、單一租客」為主，  
資料結構已預先規劃可擴充為「多房源、多租客」架構，以利後續功能演進。

---

### 目前版本（v1）資料結構

目前所有資料皆儲存在瀏覽器 `localStorage` 中，主要結構如下：

```json
{
  "settings": {
    "pricePerUnit": 5.5,
    "rent": 7000,
    "bankCode": "011",
    "payeeName": "Example Name",
    "accountNumber": "123456789"
  },
  "records": [
    {
      "id": 1768040357422,
      "date": "2026-01-10",
      "lastReading": 10715,
      "currentReading": 10935,
      "usage": 220,
      "electricityFee": 1210,
      "gasFee": 580,
      "total": 8790
    }
  ]
}
````

說明：

* `settings`
  儲存電費單價、租金與收款資訊，會被自動記憶並套用到新帳單

* `records`
  帳單歷史紀錄清單，每一筆代表一期帳單資料

---

### 規劃中版本（v2+）資料結構

為支援多房源與多租客管理，預計將資料結構調整為階層式設計：

```json
{
  "houses": [
    {
      "id": "house_001",
      "name": "中山路一號",
      "address": "台北市中山區...",
      "tenants": [
        {
          "id": "tenant_001",
          "name": "王小明",
          "settings": {
            "pricePerUnit": 5.5,
            "rent": 7000,
            "bankCode": "011",
            "payeeName": "Example Name",
            "accountNumber": "123456789"
          },
          "records": [
            {
              "id": 1768040357422,
              "date": "2026-01-10",
              "lastReading": 10715,
              "currentReading": 10935,
              "usage": 220,
              "electricityFee": 1210,
              "gasFee": 580,
              "total": 8790
            }
          ]
        }
      ]
    }
  ],
  "uiState": {
    "currentHouseId": "house_001",
    "currentTenantId": "tenant_001"
  }
}
```

---

### 設計理念說明

* 每一個「房源（house）」可包含多位租客
* 每一位「租客（tenant）」擁有獨立的：

  * 費用設定（settings）
  * 帳單歷史紀錄（records）
* `uiState` 用於記憶目前使用者操作中的房源與租客狀態
* 所有資料仍維持在前端儲存，確保工具輕量且可離線使用

---

### 相容性與遷移說明（規劃）

未來升級至多房源版本時，將提供資料轉換機制：

* 單一 `settings` 與 `records` 會自動轉換為預設房源與租客
* 舊版 JSON 備份仍可正常匯入並轉換

```

## 授權

MIT License
