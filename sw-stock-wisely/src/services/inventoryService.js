import { apiGet, apiPost } from './apiClient';

export const getRowCounts = () => apiGet('/inventory/row-counts');
export const getDashboardMetrics = () => apiGet('/inventory/metrics/dashboard');

export const getSalesPaged = (page = 1, size = 1000) => apiGet(`/inventory/sales?page=${page}&size=${size}`);
export const getPurchasesPaged = (page = 1, size = 1000) => apiGet(`/inventory/purchases?page=${page}&size=${size}`);
export const getReturnsPaged = (page = 1, size = 1000) => apiGet(`/inventory/returns?page=${page}&size=${size}`);
export const getStockPaged = (page = 1, size = 1000) => apiGet(`/inventory/stock?page=${page}&size=${size}`);

export const adjustInventory = ({ product_code, description = '', qty_delta, cost = null }) =>
  apiPost('/inventory/adjust', { product_code, description, qty_delta, cost });

