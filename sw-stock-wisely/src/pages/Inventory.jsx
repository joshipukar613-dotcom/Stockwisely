import React, { useState, useEffect } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import ProductTable from '../components/inventory/ProductTable';
import AddProductModal from '../components/AddProductModal';
import InventoryStatCard from '../components/inventory/InventoryStatCard';
import BatchDetailsModal from '../components/inventory/BatchDetailsModal';
import ProductDetailsModal from '../components/inventory/ProductDetailsModal';
import VATCalculator from '../components/calculator/VATCalculator';
import StockHistory from '../components/inventory/StockHistory';
import { useTheme } from '../contexts/ThemeContext';
import { detectCategory } from '../utils/categoryDetection';
import { getExpiryAlerts, addBatchToProduct, generateBatchNumber, getNearestExpiryDate } from '../utils/batchUtils';
import { useSidebar } from '../contexts/SidebarContext';
import ExpiryAlertsPanel from '../components/inventory/ExpiryAlertsPanel';
import {
  Plus,
  Upload,
  Download,
  Package,
  Calculator,
  AlertTriangle,
  Clock,
  BarChart3,
  FileText,
  Settings,
  RefreshCw,
  Bell
} from 'lucide-react';
import { initialProducts } from '../data/inventoryData';
import { adjustInventory } from '../services/inventoryService';
import { inventoryAPI } from '../api';

import { useAuth } from '../contexts/AuthContext';

function Inventory() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showVATCalculator, setShowVATCalculator] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [activeView, setActiveView] = useState('table'); // Always show table view
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'history', 'alerts'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState('value');
  // Live inventory adjustment form state
  const [adjustForm, setAdjustForm] = useState({ product_code: '', qty_delta: '', cost: '' });
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustMessage, setAdjustMessage] = useState('');
  const [expiryAlerts, setExpiryAlerts] = useState({
    expired: [],
    expiring_week: [],
    expiring_soon: []
  });
  const [expiryLoading, setExpiryLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await inventoryAPI.getCategories();
        setCategories(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products
  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: pagination.limit };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;

      console.log('🔍 Fetching products with params:', params); // DEBUG

      const response = await inventoryAPI.getProducts(params);
      console.log('✅ Products response:', response.data); // DEBUG

      // Ensure data is an array
      const productsData = Array.isArray(response.data.data) ? response.data.data : [];

      // Map data if needed, or use as is if backend already formats it
      // Based on controller, it returns id, product_code, description, category, price, stock_quantity, reorder_level
      // The old frontend used different field names (name, sku, stock, etc.)
      // We should map them to match the component's expected structure
      const transformedProducts = productsData.map((item, index) => ({
        id: item.id || index + 1,
        name: item.description || item.product_code,
        sku: item.product_code,
        description: item.description || '',
        category: item.category || 'Uncategorized',
        price: Number(item.price || item.last_cost || 0),
        stock: Number(item.stock_quantity || item.balance_qty || 0),
        minStock: Number(item.reorder_level || 10),
        supplier: '', // Not in getProducts response
        location: '', // Not in getProducts response
        registrationDate: item.created_at || null,
        averagePrice: Number(item.price || 0), // Fallback
        totalBatches: 1,
        batches: [],
      }));

      setProducts(transformedProducts);
      setPagination(response.data.pagination || pagination);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiryAlerts = async () => {
    try {
      setExpiryLoading(true);
      const [expiringRes, expiredRes] = await Promise.all([
        inventoryAPI.getExpiringAlerts(),
        inventoryAPI.getExpiredAlerts()
      ]);
      const mapExpiring = (rows = []) => rows.map(r => ({
        productId: r.product_id,
        batchId: r.id,
        productName: r.product_code,
        sku: r.product_code,
        batchNumber: r.batch_number,
        quantity: r.quantity,
        expiryDate: r.expiry_date,
        daysUntil: typeof r.days_until_expiry === 'number' ? r.days_until_expiry : null
      }));
      const expiring = mapExpiring(expiringRes.data?.data || []);
      const expired = (expiredRes.data?.data || []).map(r => ({
        productId: r.product_id,
        batchId: r.id,
        productName: r.product_code,
        sku: r.product_code,
        batchNumber: r.batch_number,
        quantity: r.quantity,
        expiryDate: r.expiry_date,
        daysUntil: -1
      }));
      const expiringWeek = expiring.filter(e => e.daysUntil !== null && e.daysUntil > 0 && e.daysUntil <= 7);
      const expiringSoon = expiring.filter(e => e.daysUntil !== null && e.daysUntil > 7);
      setExpiryAlerts({
        expired,
        expiring_week: expiringWeek,
        expiring_soon: expiringSoon
      });
    } catch (err) {
      console.error('Failed to fetch expiry alerts:', err);
    }
    finally {
      setExpiryLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(pagination.page);
    fetchExpiryAlerts();
  }, [selectedCategory, searchTerm, pagination.page]);

  const autoDetectCategory = (productName) => {
    const keywords = {
      'Electronics': ['phone', 'laptop', 'computer', 'tablet', 'tv', 'camera', 'headphone', 'speaker', 'samsung', 'apple', 'iphone', 'macbook', 'dell', 'hp'],
      'Clothing': ['shirt', 'pant', 'dress', 'shoe', 'jacket', 'jeans', 'tshirt', 'nike', 'adidas'],
      'Sports & Outdoors': ['ball', 'bat', 'racket', 'gym', 'fitness', 'sport', 'nike', 'adidas', 'running', 'camping', 'hiking'],
      'Jewelry & Accessories': ['jewelry', 'necklace', 'ring', 'watch', 'bag', 'wallet', 'sunglasses'],
      'Baby & Kids': ['baby', 'diaper', 'stroller', 'toy', 'child', 'infant'],
      'Pet Supplies': ['pet', 'dog', 'cat', 'food', 'toy', 'grooming'],
      'Construction & Hardware': ['tool', 'hammer', 'drill', 'screw', 'nail', 'paint'],
      'Industrial & Scientific': ['industrial', 'laboratory', 'equipment', 'chemical', 'safety'],
      'Arts & Crafts': ['art', 'paint', 'brush', 'craft', 'drawing', 'sewing'],
      'Musical Instruments': ['music', 'guitar', 'piano', 'drum', 'instrument', 'sound'],
      'Travel & Luggage': ['travel', 'luggage', 'suitcase', 'bag', 'trip', 'vacation'],
      'Party & Event Supplies': ['party', 'decoration', 'balloon', 'cake', 'celebration', 'event']
    };

    const name = productName.toLowerCase();
    for (const [category, keywordList] of Object.entries(keywords)) {
      if (keywordList.some(keyword => name.includes(keyword))) {
        return category;
      }
    }
    return 'Electronics'; // Default category
  };

  const handleSaveProduct = (data) => {
    // Normalize and auto-detect category if not provided
    const detected = detectCategory(data.name, data.description || '');
    const normalizedCategory = data.category || detected.category;

    // When editing an existing product, update basic fields only (batch edits happen elsewhere)
    if (editingProduct) {
      const updated = {
        ...editingProduct,
        name: data.name,
        sku: data.sku,
        description: data.description,
        category: normalizedCategory,
        price: data.price,
        stock: data.stock,
        minStock: data.minStock,
        supplier: data.supplier
      };
      setProducts(products.map(p => (p.id === editingProduct.id ? updated : p)));
      setShowAddModal(false);
      setEditingProduct(null);
      if (window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Product updated' } }));
      }
      return;
    }

    // Adding a product: if product exists (by name), create a new batch; else create product with first batch
    const existing = products.find(p => p.name.toLowerCase() === data.name.trim().toLowerCase());

    if (existing) {
      const batchInfo = data.batchInfo || {};
      const newBatchNumber = batchInfo.batchNumber && batchInfo.batchNumber.trim().length > 0
        ? batchInfo.batchNumber
        : generateBatchNumber(data.sku || existing.sku, existing.totalBatches || 0);

      const updatedProduct = addBatchToProduct(existing, {
        quantity: (batchInfo.quantity ?? data.stock ?? 0) || 0,
        purchasePrice: (batchInfo.purchasePrice ?? data.purchasePrice ?? 0) || 0,
        purchaseDate: batchInfo.purchaseDate ?? new Date().toISOString().split('T')[0],
        expiryDate: batchInfo.expiryDate ?? null,
        batchNumber: newBatchNumber
      });

      // Preserve selling price and category; ensure category set
      updatedProduct.price = data.price;
      updatedProduct.category = normalizedCategory;
      updatedProduct.sku = data.sku || existing.sku;

      setProducts(products.map(p => (p.id === existing.id ? updatedProduct : p)));
      setShowAddModal(false);
      if (window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Batch added and averages updated' } }));
      }
      return;
    }

    // Create new product with first batch
    const firstBatch = {
      id: `batch-new-${Date.now()}`,
      batchNumber: (data.batchInfo?.batchNumber && data.batchInfo.batchNumber.trim().length > 0)
        ? data.batchInfo.batchNumber
        : generateBatchNumber(data.sku, 0),
      quantity: (data.batchInfo?.quantity ?? parseInt(data.stock, 10)) || 0,
      quantityRemaining: (data.batchInfo?.quantity ?? parseInt(data.stock, 10)) || 0,
      purchasePrice: (data.batchInfo?.purchasePrice ?? parseFloat(data.purchasePrice || data.price)) || 0,
      purchaseDate: data.batchInfo?.purchaseDate ?? new Date().toISOString().split('T')[0],
      expiryDate: data.batchInfo?.expiryDate || null,
      isExpired: false
    };

    const newProductId = Date.now();
    const newProduct = {
      id: newProductId,
      name: data.name,
      sku: data.sku,
      description: data.description,
      category: normalizedCategory,
      price: parseFloat(data.price) || 0, // selling price
      stock: firstBatch.quantity,
      minStock: parseInt(data.minStock, 10) || 0,
      supplier: data.supplier,
      location: data.location,
      averagePrice: firstBatch.purchasePrice,
      totalBatches: 1,
      nearestExpiryDate: getNearestExpiryDate([firstBatch]),
      batches: [firstBatch]
    };

    setProducts([...products, newProduct]);
    setShowAddModal(false);
    if (window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Product added' } }));
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleDelete = (product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      setProducts(products.filter(p => p.id !== product.id));
    }
  };

  const handleView = (product) => {
    alert(`Viewing details for: ${product.name}\nSKU: ${product.sku}\nStock: ${product.stock}\nPrice: Rs. ${product.price}`);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
  };

  const handleViewBatches = (product) => {
    setSelectedProduct(product);
    setShowBatchModal(true);
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setSelectedProduct(null);
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowProductDetailsModal(true);
  };

  const closeProductDetailsModal = () => {
    setShowProductDetailsModal(false);
    setSelectedProduct(null);
  };

  const handleRefresh = () => {
    // Simulate data refresh
    setProducts([...products]);
    if (window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Data refreshed successfully' } }));
    }
  };

  const submitAdjustment = async () => {
    try {
      setAdjustLoading(true);
      setAdjustMessage('');
      const payload = {
        product_code: adjustForm.product_code.trim(),
        qty_delta: Number(adjustForm.qty_delta),
        cost: adjustForm.cost ? Number(adjustForm.cost) : null,
      };
      if (!payload.product_code || !Number.isFinite(payload.qty_delta)) {
        setAdjustMessage('Error: provide product code and numeric qty');
        setAdjustLoading(false);
        return;
      }
      const res = await adjustInventory(payload);
      setAdjustMessage(`Updated ${payload.product_code}: new balance ${res.movement.balance_qty}`);
    } catch (e) {
      setAdjustMessage(`Error: ${e.message}`);
    } finally {
      setAdjustLoading(false);
    }
  };


  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await inventoryAPI.acknowledgeExpiry(alertId);
      setExpiryAlerts(prev => ({
        ...prev,
        expired: prev.expired.filter(a => a.batchId !== alertId),
        expiring_week: prev.expiring_week.filter(a => a.batchId !== alertId),
        expiring_soon: prev.expiring_soon.filter(a => a.batchId !== alertId),
      }));
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  const handleViewAlertProduct = (productIdOrSku) => {
    const p = products.find(x => x.sku === productIdOrSku || x.id === productIdOrSku);
    if (p) {
      setSelectedProduct(p);
      setShowProductDetailsModal(true);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSelectedCategory('');
  };

  // Filter products based on status and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm ||
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'low' && product.stock > 0 && product.stock < 10) ||
      (filterStatus === 'out' && product.stock === 0) ||
      (filterStatus === 'good' && product.stock >= 50);

    // Category is now filtered on the server via fetchInventory(selectedCategory)
    // so we don't need to filter again on the client unless we want to support multi-filtering on the current page
    // but the design is server-side filtering.

    return matchesSearch && matchesStatus;
  });



  // Calculate statistics
  const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock < 10).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const statCards = [
    {
      title: 'Total Products',
      value: products.length,
      icon: Package,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Low Stock',
      value: lowStockCount,
      icon: Package,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      title: 'Out of Stock',
      value: outOfStockCount,
      icon: Package,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      title: 'Total Value',
      value: `Rs. ${totalValue.toLocaleString()}`,
      icon: Package,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      <Navbar />

      <div className="flex">
        <Sidebar />

        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
          } pt-28`}>
          <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                  Professional Inventory Management
                </h1>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Advanced inventory tracking, analytics, and reporting system.
                </p>
              </div>

              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                <button
                  onClick={() => setShowVATCalculator(true)}
                  className={`flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                    }`}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  VAT Calculator
                </button>
                {user?.role !== 'SALES_CLERK' && (
                  <>
                    <button className={`flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                      }`}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </button>
                    <button className={`flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                      }`}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Live Inventory Adjustment (writes to PostgreSQL) - ADMIN/MANAGER ONLY */}
            {user?.role !== 'SALES_CLERK' && (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4 mb-6`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Adjust Inventory (DB Write)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Product Code"
                    value={adjustForm.product_code}
                    onChange={(e) => setAdjustForm({ ...adjustForm, product_code: e.target.value })}
                    className={`border rounded-lg px-3 py-2 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="number"
                    placeholder="Qty +/-"
                    value={adjustForm.qty_delta}
                    onChange={(e) => setAdjustForm({ ...adjustForm, qty_delta: e.target.value })}
                    className={`border rounded-lg px-3 py-2 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="number"
                    placeholder="Cost per unit (optional)"
                    value={adjustForm.cost}
                    onChange={(e) => setAdjustForm({ ...adjustForm, cost: e.target.value })}
                    className={`border rounded-lg px-3 py-2 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <button
                    onClick={submitAdjustment}
                    disabled={adjustLoading || !adjustForm.product_code || adjustForm.qty_delta === ''}
                    className={`px-3 py-2 rounded-lg ${isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'} disabled:opacity-60`}
                  >
                    {adjustLoading ? 'Updating…' : 'Apply Change'}
                  </button>
                </div>
                {adjustMessage && (
                  <div className={`mt-2 text-sm ${adjustMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{adjustMessage}</div>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                } border`}>
                <p className={`${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  Error: {error}
                </p>
              </div>
            )}

            {/* Tabs */}
            {!loading && !error && (
              <div className="mb-6">
                <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('current')}
                      className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'current'
                          ? isDark
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-indigo-600 text-indigo-600'
                          : isDark
                            ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Current Stock
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'history'
                          ? isDark
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-indigo-600 text-indigo-600'
                          : isDark
                            ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Stock History
                    </button>
                    <button
                      onClick={() => setActiveTab('alerts')}
                      className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'alerts'
                          ? isDark
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-indigo-600 text-indigo-600'
                          : isDark
                            ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Low Stock Alerts
                    </button>
                  </nav>
                </div>
              </div>
            )}

            {/* Tab Content */}
            {!loading && !error && activeTab === 'current' && activeView === 'table' && (
              <>
                {/* Expiry Alerts Panel */}
                <div className="mb-6">
                  <ExpiryAlertsPanel
                    alerts={expiryAlerts}
                    loading={expiryLoading}
                    onViewProduct={(id) => handleViewAlertProduct(id)}
                    onAcknowledgeAlert={handleAcknowledgeAlert}
                    onRefreshAlerts={fetchExpiryAlerts}
                  />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {statCards.map((card, index) => (
                    <InventoryStatCard
                      key={index}
                      title={card.title}
                      value={card.value}
                      icon={card.icon}
                      iconBg={card.iconBg}
                      iconColor={card.iconColor}
                    />
                  ))}
                </div>

                {/* Category Filter */}
                <div className={`mb-4 flex flex-wrap gap-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-4 items-center`}>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Category:
                  </span>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleClearFilters}
                    className={`ml-auto px-4 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Clear Filters
                  </button>
                </div>

                {/* Enhanced Product Table with integrated search and filters */}
                <ProductTable
                  products={filteredProducts}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                  onViewBatches={handleViewBatches}
                  onViewDetails={handleViewDetails}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  canEdit={user?.role !== 'SALES_CLERK'}
                />
              </>
            )}

            {/* Stock History Tab */}
            {!loading && !error && activeTab === 'history' && (
              <StockHistory />
            )}

            {/* Low Stock Alerts Tab */}
            {!loading && !error && activeTab === 'alerts' && (
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Low Stock Alerts
                </h3>
                <ExpiryAlertsPanel
                  alerts={expiryAlerts}
                  loading={expiryLoading}
                  onViewProduct={(id) => handleViewAlertProduct(id)}
                  onAcknowledgeAlert={handleAcknowledgeAlert}
                  onRefreshAlerts={fetchExpiryAlerts}
                />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Add/Edit Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={closeModal}
        onProductAdded={async () => {
          try {
            await fetchProducts(pagination.page);
            if (window?.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: 'Product added' } }));
            }
          } catch {}
        }}
      />

      {showVATCalculator && <VATCalculator onClose={() => setShowVATCalculator(false)} />}

      {/* Batch Details Modal */}
      <BatchDetailsModal
        isOpen={showBatchModal}
        onClose={closeBatchModal}
        product={selectedProduct}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={showProductDetailsModal}
        onClose={closeProductDetailsModal}
        product={selectedProduct}
      />

    </div>
  );
}

export default Inventory;
