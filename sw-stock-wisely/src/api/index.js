import axios from 'axios';

function resolveApiBase() {
  const overridden = process.env.REACT_APP_API_URL;
  if (overridden && overridden.trim()) return overridden.endsWith('/api') ? overridden : `${overridden.replace(/\/+$/, '')}/api`;
  const isLocal = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname);
  if (isLocal) {
    const devPortMap = { '3000': '5001', '3001': '5001', '3002': '5001' };
    const port = window.location.port || '3000';
    const backendPort = devPortMap[port] || '5001';
    return `http://${window.location.hostname}:${backendPort}/api`;
  }
  return 'http://localhost:5001/api';
}

const normalizedBase = resolveApiBase();

const apiClient = axios.create({
  baseURL: normalizedBase,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors and redirect to login
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Remove token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardAPI = {
  getSummary: () => apiClient.get('/dashboard/summary'),
};

// Sales API
export const salesAPI = {
  getSales: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.customer) queryParams.append('customer', params.customer);
    if (params.category) queryParams.append('category', params.category);
    return apiClient.get(`/sales?${queryParams.toString()}`);
  },
  getSaleDetails: (invoiceNumber) => apiClient.get(`/sales/details/${invoiceNumber}`),
  createSale: (saleData) => apiClient.post('/sales', saleData),
  getSaleById: (id) => apiClient.get(`/sales/${id}`),
  updateSaleItem: (id, data) => apiClient.put(`/sales/items/${id}`, data),
  // NEW: Return-specific routes
  getReturns: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    if (params.customer) qp.append('customer', params.customer);
    return apiClient.get(`/sales/returns/list?${qp.toString()}`);
  },
  getReturnsSummary: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    return apiClient.get(`/sales/returns/summary?${qp.toString()}`);
  },
  getCustomerCredits: (customerName) => apiClient.get(`/sales/customers/${customerName}/credits`),
};

// Inventory API
export const inventoryAPI = {
  getCurrent: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.category) queryParams.append('category', params.category);
    const qs = queryParams.toString();
    return apiClient.get(`/inventory/current${qs ? `?${qs}` : ''}`);
  },
  getProducts: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    return apiClient.get(`/inventory/products?${queryParams.toString()}`);
  },
  getCategories: () => apiClient.get('/inventory/categories'),
  getLowStock: () => apiClient.get('/inventory/low-stock'),
  adjustInventory: (data) => apiClient.post('/inventory/adjust', data),
  getDashboardMetrics: () => apiClient.get('/inventory/metrics/dashboard'),
  createProduct: (data) => apiClient.post('/inventory/products', data),
  getExpiringAlerts: () => apiClient.get('/products/expiring'),
  acknowledgeExpiry: (id) => apiClient.post('/products/expiry/acknowledge', { id }),
  getExpiredAlerts: () => apiClient.get('/products/expired'),

  // FIFO Batches
  getProductBatches: (productCode) => apiClient.get(`/inventory/products/${productCode}/batches`),
  getFIFOPrice: (productCode, qty) => apiClient.get(`/inventory/products/${productCode}/fifo-price?qty=${qty}`),



  // Stock Adjustments
  listAdjustments: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page);
    if (params.limit) qp.append('limit', params.limit);
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    if (params.productId) qp.append('productId', params.productId);
    if (params.reason) qp.append('reason', params.reason);
    if (params.type) qp.append('type', params.type);
    return apiClient.get(`/inventory/adjustments?${qp.toString()}`);
  },
  getAdjustmentSummary: () => apiClient.get('/inventory/adjustments/summary'),
  createAdjustment: (data) => apiClient.post('/inventory/adjustments', data),
  getProductAdjustments: (productId) => apiClient.get(`/inventory/products/${productId}/adjustments`),
};

// Stock History API
export const stockHistoryAPI = {
  getDailySummary: (date) => {
    const params = date ? `?date=${date}` : '';
    return apiClient.get(`/stock-history/daily-summary${params}`);
  },
  getHistory: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.productId) queryParams.append('productId', params.productId);
    return apiClient.get(`/stock-history/history?${queryParams.toString()}`);
  },
  getProductChanges: (productId, date) => {
    const queryParams = new URLSearchParams();
    queryParams.append('productId', productId);
    if (date) queryParams.append('date', date);
    return apiClient.get(`/stock-history/product-changes?${queryParams.toString()}`);
  },
};

// Purchases API
export const purchasesAPI = {
  getPurchases: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.vendor) queryParams.append('vendor', params.vendor);
    if (params.category) queryParams.append('category', params.category);
    return apiClient.get(`/purchases?${queryParams.toString()}`);
  },
  getPurchaseDetails: (invoiceNumber) => apiClient.get(`/purchases/details/${invoiceNumber}`),
  createPurchase: (purchaseData) => apiClient.post('/purchases', purchaseData),
  updatePurchaseItem: (id, data) => apiClient.put(`/purchases/items/${id}`, data),
  getReturns: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    if (params.vendor) qp.append('vendor', params.vendor);
    return apiClient.get(`/purchases/returns/list?${qp.toString()}`);
  },
  getReturnsSummary: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    return apiClient.get(`/purchases/returns/summary?${qp.toString()}`);
  },
};

// Vendors API
export const vendorsAPI = {
  search: (query) => apiClient.get(`/vendors/search?query=${encodeURIComponent(query || '')}`),
  create: (data) => apiClient.post('/vendors', data),
  list: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.q) qp.append('q', params.q);
    if (params.status) qp.append('status', params.status);
    if (params.page) qp.append('page', params.page);
    if (params.limit) qp.append('limit', params.limit);
    if (params.sort) qp.append('sort', params.sort);
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    return apiClient.get(`/vendors?${qp.toString()}`);
  },
  get: (id) => apiClient.get(`/vendors/${id}`),
  update: (id, data) => apiClient.put(`/vendors/${id}`, data),
  delete: (id) => apiClient.delete(`/vendors/${id}`),
  purchases: (id) => apiClient.get(`/vendors/${id}/purchases`),
  products: (id) => apiClient.get(`/vendors/${id}/products`),
  payments: (id) => apiClient.get(`/vendors/${id}/payments`),
  recordPayment: (id, payload) => apiClient.post(`/vendors/${id}/payments`, payload),
  getLedger: (id, params = {}) => {
    const qp = new URLSearchParams();
    if (params.start) qp.append('startDate', params.start);
    if (params.end) qp.append('endDate', params.end);
    return apiClient.get(`/vendors/${id}/ledger?${qp.toString()}`);
  },
  stats: () => apiClient.get('/vendors/statistics'),
};

// Customers API
export const customersAPI = {
  list: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.search) qp.append('search', params.search);
    return apiClient.get(`/customers?${qp.toString()}`);
  },
  get: (id) => apiClient.get(`/customers/${id}`),
  getByPhone: (phone) => apiClient.get(`/customers/phone/${encodeURIComponent(phone)}`),
  getStats: () => apiClient.get('/customers/report/stats'),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.put(`/customers/${id}`, data),
  delete: (id) => apiClient.delete(`/customers/${id}`),
};


// Reports API
export const reportsAPI = {
  getSalesSummary: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    return apiClient.get(`/reports/sales-summary?${queryParams.toString()}`);
  },
  getTopPerformers: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    return apiClient.get(`/reports/top-performers?${queryParams.toString()}`);
  },
  getSlowMovers: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    return apiClient.get(`/reports/slow-movers?${queryParams.toString()}`);
  },
  getInventoryReport: () => apiClient.get('/reports/inventory'),
  getSalesVatReport: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.from) qp.append('from', params.from);
    if (params.to) qp.append('to', params.to);
    if (params.period) qp.append('period', params.period);
    return apiClient.get(`/reports/sales-vat?${qp.toString()}`);
  },
  getPurchaseVatReport: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.from) qp.append('from', params.from);
    if (params.to) qp.append('to', params.to);
    if (params.period) qp.append('period', params.period);
    return apiClient.get(`/reports/purchase-vat?${qp.toString()}`);
  },

  // FIFO Reports
  getBatchProfits: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    return apiClient.get(`/reports/fifo/profits?${qp.toString()}`);
  },
  getVendorPriceComparison: () => apiClient.get('/reports/fifo/vendor-comparison'),
  getWeightedAvgCostTrends: (productCode) => apiClient.get(`/reports/fifo/cost-trends?product_code=${productCode}`),
};

// Notifications API
export const notificationsAPI = {
  getSettings: () => apiClient.get('/notifications/settings'),
  updateSettings: (settings) => apiClient.put('/notifications/settings', { settings }),
  getHistory: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page);
    if (params.limit) qp.append('limit', params.limit);
    return apiClient.get(`/notifications/history?${qp.toString()}`);
  },
  getAlerts: () => apiClient.get('/notifications/alerts'),
  sendTest: (payload = {}) => apiClient.post('/notifications/test', payload),
};

// Analytics API
export const analyticsAPI = {
  getSalesDemand: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    return apiClient.get(`/analytics/sales-demand?${qp.toString()}`);
  },
  getInventoryHealth: () => apiClient.get('/analytics/inventory-health'),
  getStockMovement: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    return apiClient.get(`/analytics/stock-movement?${qp.toString()}`);
  },
  getComparison: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.type) qp.append('type', params.type);
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);
    if (params.product1) qp.append('product1', params.product1);
    if (params.product2) qp.append('product2', params.product2);
    if (params.metric) qp.append('metric', params.metric);
    return apiClient.get(`/analytics/compare?${qp.toString()}`);
  },
};

// AI Assistant API
export const aiAssistantAPI = {
  ask: (payload = {}) => apiClient.post('/ai-assistant/ask', payload),
  askAdvice: (payload = {}) => apiClient.post('/ai-assistant/advice', payload),
};

// AI Forecasting API
export const forecastingAPI = {
  getSummary: () => apiClient.get('/forecasting/summary'),
  getCategories: () => apiClient.get('/forecasting/categories'),
  getProducts: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.category) qp.append('category', params.category);
    if (params.limit) qp.append('limit', params.limit);
    return apiClient.get(`/forecasting/products?${qp.toString()}`);
  },
  getTrends: (params = {}) => {
    const qp = new URLSearchParams();
    if (params.category) qp.append('category', params.category);
    return apiClient.get(`/forecasting/trends?${qp.toString()}`);
  },
  getHealth: () => apiClient.get('/forecasting/health'),
};

export default apiClient;

