// 台電累進費率
const ELECTRICITY_RATES = {
  summer: [
    { limit: 120,      price: 1.78 },
    { limit: 330,      price: 2.55 },
    { limit: 500,      price: 3.80 },
    { limit: 700,      price: 5.14 },
    { limit: 1000,     price: 6.44 },
    { limit: Infinity, price: 8.86 },
  ],
  other: [
    { limit: 120,      price: 1.78 },
    { limit: 330,      price: 2.26 },
    { limit: 500,      price: 3.13 },
    { limit: 700,      price: 4.24 },
    { limit: 1000,     price: 5.27 },
    { limit: Infinity, price: 7.03 },
  ],
};

const BILLING_MONTHS = 2; // 台電兩個月一期

// 應用程式全域狀態
let appData = {
  units: [
    {
      id: '5F',
      label: '5 樓',
      rent: 0,
      persons: 1,
      bankCode: '',
      payeeName: '',
      accountNumber: '',
      tenantNote: '',
      landlordNote: '',
    },
    {
      id: '6F',
      label: '6 樓',
      rent: 0,
      persons: 1,
      bankCode: '',
      payeeName: '',
      accountNumber: '',
      tenantNote: '',
      landlordNote: '',
    },
  ],
  records: [],
};
