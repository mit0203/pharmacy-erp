import api from './axios';

// =======================
// Auth
// =======================
export const loginApi = (data) => api.post('/api/auth/login', data);
export const registerApi = (data) => api.post('/api/auth/register', data);

export const changeMyPassword = (data) => api.post('/api/auth/change-password', data);

export const sendForgotPasswordOtp = (data) =>
  api.post('/api/auth/forgot-password/send-otp', data);

export const verifyForgotPasswordOtp = (data) =>
  api.post('/api/auth/forgot-password/verify-otp', data);

export const resetPasswordWithOtp = (data) =>
  api.post('/api/auth/forgot-password/reset', data);

export const getMyProfile = () => api.get('/api/auth/me');
export const updateMyProfile = (data) => api.put('/api/auth/me', data);

// =======================
// Dashboard
// =======================
export const getDashboard = (params) => api.get('/api/dashboard', { params });

// =======================
// Inventory / Medicines
// =======================
export const getMedicines = (params) =>
  api.get('/api/inventory/medicines', { params });

export const getMedicineById = (id) =>
  api.get(`/api/inventory/medicines/${id}`);

export const createMedicine = (data) =>
  api.post('/api/inventory/medicines', data);

export const updateMedicine = (id, data) =>
  api.put(`/api/inventory/medicines/${id}`, data);

export const deleteMedicine = (id) =>
  api.delete(`/api/inventory/medicines/${id}`);

export const getLowStock = (params) =>
  api.get('/api/inventory/medicines/low-stock', { params });

export const getOutOfStock = (params) =>
  api.get('/api/inventory/medicines/out-of-stock', { params });

// =======================
// Batches
// =======================
export const getBatches = (params) =>
  api.get('/api/inventory/batches', { params });

export const getBatchById = (id) =>
  api.get(`/api/inventory/batches/${id}`);

export const createBatch = (data) =>
  api.post('/api/inventory/batches', data);

export const getNearExpiry = (params) =>
  api.get('/api/inventory/batches/near-expiry', { params });

export const getExpiredBatches = (params) =>
  api.get('/api/inventory/batches/expired', { params });

export const updateBatch = (id, data) =>
  api.put(`/api/inventory/batches/${id}`, data);

export const deleteBatch = (id) =>
  api.delete(`/api/inventory/batches/${id}`);

// =======================
// Purchases
// =======================
export const getPurchaseOrders = (params) =>
  api.get('/api/purchases', { params });

export const getPurchaseById = (id) =>
  api.get(`/api/purchases/${id}`);

export const createPurchase = (data) =>
  api.post('/api/purchases', data);

export const updatePurchase = (id, data) =>
  api.put(`/api/purchases/${id}`, data);

export const returnPurchase = (id, data) =>
  api.post(`/api/purchases/${id}/return`, data);

export const deletePurchase = (id) =>
  api.delete(`/api/purchases/${id}`);

export const approvePurchase = (id) =>
  api.post(`/api/purchases/${id}/approve`);

export const receivePurchase = (id) =>
  api.post(`/api/purchases/${id}/receive`);

export const generatePurchaseInvoice = (id) =>
  api.post(`/api/purchases/${id}/generate-invoice`);

export const downloadPurchaseInvoicePdf = (id) =>
  api.get(`/api/purchases/${id}/invoice-pdf`, {
    responseType: 'blob',
  });

export const updatePurchasePayment = (id, data) =>
  api.post(`/api/purchases/${id}/update-payment`, data);

// =======================
// Suppliers
// =======================
export const getSuppliers = (params) =>
  api.get('/api/suppliers', { params });

export const getSupplierById = (id) =>
  api.get(`/api/suppliers/${id}`);

export const createSupplier = (data) =>
  api.post('/api/suppliers', data);

export const updateSupplier = (id, data) =>
  api.put(`/api/suppliers/${id}`, data);

export const deleteSupplier = (id) =>
  api.delete(`/api/suppliers/${id}`);

// =======================
// Customers
// =======================
export const getCustomers = (params) =>
  api.get('/api/customers', { params });

export const getCustomerById = (id) =>
  api.get(`/api/customers/${id}`);

export const createCustomer = (data) =>
  api.post('/api/customers', data);

export const updateCustomer = (id, data) =>
  api.put(`/api/customers/${id}`, data);

export const deleteCustomer = (id) =>
  api.delete(`/api/customers/${id}`);

// =======================
// Sales
// =======================
export const getSalesOrders = (params) =>
  api.get('/api/sales', { params });

export const getSaleById = (id) =>
  api.get(`/api/sales/${id}`);

export const createSale = (data) =>
  api.post('/api/sales', data);

export const updateSale = (id, data) =>
  api.put(`/api/sales/${id}`, data);

export const returnSale = (id, data) =>
  api.post(`/api/sales/${id}/return`, data);

export const deleteSale = (id) =>
  api.delete(`/api/sales/${id}`);

export const confirmSale = (id) =>
  api.post(`/api/sales/${id}/confirm`);

export const dispatchSale = (id) =>
  api.post(`/api/sales/${id}/dispatch`);

export const completeSale = (id) =>
  api.post(`/api/sales/${id}/complete`);

export const generateSaleInvoice = (id) =>
  api.post(`/api/sales/${id}/generate-invoice`);

export const downloadSaleInvoicePdf = (id) =>
  api.get(`/api/sales/${id}/invoice-pdf`, {
    responseType: 'blob',
  });

export const updateSalePayment = (id, data) =>
  api.post(`/api/sales/${id}/update-payment`, data);

// =======================
// Reports
// =======================
export const getGstReport = (params) =>
  api.get('/api/reports/gst', { params });

export const getProfitLoss = (params) =>
  api.get('/api/reports/profit-loss', { params });

export const getSalesReport = (params) =>
  api.get('/api/reports/sales', { params });

export const getPurchaseReport = (params) =>
  api.get('/api/reports/purchases', { params });

export const getStockReport = (params) =>
  api.get('/api/reports/stock', { params });

export const getExpiryReport = (params) =>
  api.get('/api/reports/expiry', { params });

// =======================
// Accounting
// =======================
export const getLedgerEntries = (params) =>
  api.get('/api/ledger-entries', { params });

export const createLedgerEntry = (data) =>
  api.post('/api/ledger-entries', data);

export const getLedgerEntryById = (id) =>
  api.get(`/api/ledger-entries/${id}`);

export const getAccounts = (params) =>
  api.get('/api/accounts', { params });

export const getAccountById = (id) =>
  api.get(`/api/accounts/${id}`);

export const createAccount = (data) =>
  api.post('/api/accounts', data);

export const updateAccount = (id, data) =>
  api.put(`/api/accounts/${id}`, data);

export const deleteAccount = (id) =>
  api.delete(`/api/accounts/${id}`);

export const getAccountBalance = (id) =>
  api.get(`/api/accounts/${id}/balance`);

export const getLedgerEntriesByAccount = (accountId, params) =>
  api.get(`/api/ledger-entries/account/${accountId}`, { params });

// =======================
// Settings
// =======================
export const getSettings = () => api.get('/api/settings');

export const saveSettings = (data) =>
  api.put('/api/settings', data);

export const resetSettings = () =>
  api.post('/api/settings/reset');