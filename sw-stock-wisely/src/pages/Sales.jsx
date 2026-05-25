import React, { useState, useEffect } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import SalesChart from '../components/charts/SalesChart';
import ProductSearch from '../components/inventory/ProductSearch';
import LineItemEditor from '../components/common/LineItemEditor';
import { salesAPI, inventoryAPI, customersAPI } from '../api';
import {
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Download,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Upload,
  X,
  Printer,
  Edit2,
  RotateCcw
} from 'lucide-react';

function Sales() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false); // New Sale Modal
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingNewSaleItemIndex, setEditingNewSaleItemIndex] = useState(null); // For new sale modal

  // Sales Return States
  const [transactionType, setTransactionType] = useState('sale'); // 'sale' or 'return'
  const [originalSaleInvoice, setOriginalSaleInvoice] = useState('');
  const [originalSaleId, setOriginalSaleId] = useState(null);
  const [originalSaleData, setOriginalSaleData] = useState(null);

  // Handle inline edit save
  const handleUpdateItem = async (updatedItem) => {
    try {
      const res = await salesAPI.updateSaleItem(updatedItem.id, {
        quantity: Number(updatedItem.quantity),
        price: Number(updatedItem.price)
      });

      const { item, sale } = res.data.data;

      // Update details view
      if (saleDetails && saleDetails.id === sale.id) {
        setSaleDetails(prev => ({
          ...prev,
          total_amount: sale.total_amount,
          items: prev.items.map(it => it.id === item.id ? { ...it, ...item } : it)
        }));
      }

      // Update sales list
      setSales(prev => prev.map(s => s.id === sale.id ? { ...s, total_amount: sale.total_amount } : s));

      setEditingItemId(null);
    } catch (err) {
      console.error('Update item failed:', err);
      alert('Failed to update item: ' + (err.response?.data?.error || err.message));
    }
  };

  // New Sale Modal State
  const [newSaleCustomerPhone, setNewSaleCustomerPhone] = useState('');
  const [newSaleCustomer, setNewSaleCustomer] = useState('');
  const [newSaleCustomerAgeRange, setNewSaleCustomerAgeRange] = useState('');
  const [newSaleCustomerGender, setNewSaleCustomerGender] = useState('');
  const [isCustomerAutoFilled, setIsCustomerAutoFilled] = useState(false);
  const [newSaleItems, setNewSaleItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ product_code: '', quantity: '', price: '', product_name: '' });
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  // Derived calculations
  const subtotal = newSaleItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxAmount = (subtotal - discountAmount) * 0.13; // 13% VAT as requested
  const totalAmount = subtotal - discountAmount + taxAmount;
  const changeAmount = amountPaid - totalAmount;

  // Auto-set amount paid for non-cash payments
  useEffect(() => {
    if (paymentMethod !== 'Cash' && paymentMethod !== 'Credit') {
      setAmountPaid(totalAmount);
    }
  }, [paymentMethod, totalAmount]);

  // Invoice Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // Auto-fill customer name based on phone number
  useEffect(() => {
    // Only search if we have a reasonable length for a phone number
    if (!newSaleCustomerPhone || newSaleCustomerPhone.replace(/\D/g, '').length < 7) {
      setIsCustomerAutoFilled(false);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        const res = await customersAPI.getByPhone(newSaleCustomerPhone);
        if (res.data.success && res.data.data) {
          setNewSaleCustomer(res.data.data.name);
          setIsCustomerAutoFilled(true);
        }
      } catch (err) {
        setIsCustomerAutoFilled(false);
      }
    }, 600); // Debounce by 600ms

    return () => clearTimeout(timeoutId);
  }, [newSaleCustomerPhone]);

  // Fetch FIFO Weighted Average Price when product or quantity changes
  useEffect(() => {
    if (!currentItem.product_code || Number(currentItem.quantity) <= 0) return;

    const fetchFIFOPrice = async () => {
      setIsFetchingPrice(true);
      try {
        console.log(`[FIFO Debug] Requesting price for: ${currentItem.product_code}, Qty: ${currentItem.quantity}`);
        const res = await inventoryAPI.getFIFOPrice(currentItem.product_code, currentItem.quantity);
        console.log(`[FIFO Debug] Received price:`, res.data);
        if (res.data.success) {
          setCurrentItem(prev => ({
            ...prev,
            price: String(res.data.price)
          }));
        }
      } catch (err) {
        console.error('Failed to fetch FIFO price:', err);
      } finally {
        setIsFetchingPrice(false);
      }
    };

    fetchFIFOPrice();
  }, [currentItem.product_code, currentItem.quantity]);

  // Handler for updating items in New Sale modal
  const handleUpdateNewSaleItem = (index, updatedItem) => {
    const updatedItems = [...newSaleItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: Number(updatedItem.quantity),
      price: Number(updatedItem.price),
      amount: Number(updatedItem.quantity) * Number(updatedItem.price)
    };
    setNewSaleItems(updatedItems);
    setEditingNewSaleItemIndex(null);
  };

  const handleAddItem = () => {
    const qty = Number(currentItem.quantity) || 0;
    const price = Number(currentItem.price) || 0;
    if (!currentItem.product_code || qty <= 0) return;
    setNewSaleItems([...newSaleItems, { ...currentItem, quantity: qty, price: price, amount: qty * price }]);
    setCurrentItem({ product_code: '', quantity: '', price: '', product_name: '' });
  };

  const loadOriginalSale = async (invoiceNumber) => {
    if (!invoiceNumber || invoiceNumber.length < 5) return;
    try {
      const response = await salesAPI.getSaleDetails(invoiceNumber);
      if (response.data.success) {
        const sale = response.data.data;
        setOriginalSaleId(sale.id);
        setOriginalSaleData(sale);
        setNewSaleCustomer(sale.customer_name);
        setNewSaleItems(sale.items.map(item => ({
          ...item,
          available_to_return: (item.quantity || 0) - (item.quantity_returned || 0),
          quantity: 0, // Default to 0 selected for return
          original_price: item.price
        })));
        setError(null);
      }
    } catch (err) {
      console.error('Error loading original sale:', err);
      // Don't alert here to avoid spamming as user types
    }
  };

  const handleCreateSale = async () => {
    try {
      if (newSaleItems.length === 0) return;
      if (!newSaleCustomer.trim()) {
        alert('Please enter customer name');
        return;
      }

      const payload = {
        transaction_type: transactionType,
        original_sale_id: transactionType === 'return' ? originalSaleId : null,
        customer_name: newSaleCustomer,
        customer_phone: newSaleCustomerPhone,
        age_range: !isCustomerAutoFilled ? newSaleCustomerAgeRange : null,
        gender: !isCustomerAutoFilled ? newSaleCustomerGender : null,
        items: transactionType === 'return'
          ? newSaleItems.filter(it => it.quantity > 0)
          : newSaleItems,
        discount: parseFloat(discountAmount),
        tax: parseFloat(taxAmount),
        payment_method: paymentMethod,
        amount_paid: parseFloat(amountPaid),
        change_amount: parseFloat(changeAmount),
        notes: transactionType === 'return' ? `Return for invoice ${originalSaleInvoice}` : ''
      };

      if (transactionType === 'return' && payload.items.length === 0) {
        alert('Please select at least one item to return');
        return;
      }

      const res = await salesAPI.createSale(payload);

      // Prepare invoice data
      setInvoiceData({
        invoice_number: res.data.data.invoice_number,
        sale_date: res.data.data.sale_date,
        customer_name: newSaleCustomer,
        customer_phone: newSaleCustomerPhone,
        items: newSaleItems.map(item => ({
          product_code: item.product_code,
          quantity: item.quantity,
          price: item.price,
          product_name: item.product_name
        })),
        subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tax: taxAmount,
        total_amount: res.data.data.total_amount,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        change_amount: changeAmount,
        is_return: transactionType === 'return'
      });

      // Reset state based on type
      if (transactionType === 'return') {
        setShowInvoiceModal(false);
        setOriginalSaleData(null);
      } else {
        setShowAddModal(false);
        setShowInvoiceModal(true);
      }
      
      setNewSaleCustomer('');
      setNewSaleCustomerPhone('');
      setNewSaleCustomerAgeRange('');
      setNewSaleCustomerGender('');
      setIsCustomerAutoFilled(false);
      setNewSaleItems([]);
      setDiscountPercent(0);
      setPaymentMethod('Cash');
      setTransactionType('sale');
      setOriginalSaleInvoice('');
      setOriginalSaleId(null);
      // Refresh sales
      fetchSales(pagination.page);
    } catch (err) {
      console.error('Failed to create sale/return', err);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Failed: ${errorMessage}`);
    }
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/inventory/categories', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        console.log('📦 Categories fetched:', data.data); // DEBUG
        setCategories(data.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch sales data
  const fetchSales = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (customerFilter) params.customer = customerFilter;
      if (selectedCategory) params.category = selectedCategory;

      console.log('🔍 Fetching sales with params:', params); // DEBUG
      const response = await salesAPI.getSales(params);
      setSales(response.data.data);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch sales:', err);
      setError(err.response?.data?.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sale details
  const fetchSaleDetails = async (invoiceNumber) => {
    try {
      const response = await salesAPI.getSaleDetails(invoiceNumber);
      setSaleDetails(response.data.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch sale details:', err);
      alert('Failed to load sale details');
    }
  };

  useEffect(() => {
    fetchSales(pagination.page);
  }, [pagination.page, startDate, endDate, customerFilter, selectedCategory]);

  // Filter sales data based on search term (client-side filtering for instant feedback)
  const filteredSales = sales.filter(sale =>
    (sale.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics from current page data
  const salesStats = [
    {
      title: 'Total Sales',
      value: `Rs. ${sales.reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString()}`,
      trend: 'up',
      percentage: '',
      color: 'text-green-500'
    },
    {
      title: 'Average Order Value',
      value: `Rs. ${sales.length > 0 ? Math.round(sales.reduce((sum, s) => sum + (s.total_amount || 0), 0) / sales.length).toLocaleString() : '0'}`,
      trend: 'up',
      percentage: '',
      color: 'text-green-500'
    },
    {
      title: 'Total Orders',
      value: pagination.total.toLocaleString(),
      trend: 'up',
      percentage: '',
      color: 'text-green-500'
    },
  ];

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
    fetchSaleDetails(sale.invoice_number);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
      fetchSales(newPage);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="container mx-auto px-4 py-8 pt-24">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                  Sales Management
                </h1>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Track sales, manage orders, and analyze performance.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 p-1">
                <button className={`flex items-center px-5 py-2.5 text-sm font-medium border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                  }`}>
                  <Upload className="h-5 w-5 mr-2" />
                  Import
                </button>
                <button className={`flex items-center px-5 py-2.5 text-sm font-medium border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                  }`}>
                  <Download className="h-5 w-5 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Sale
                </button>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg p-4 mb-6`}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Search Invoice
                  </label>
                  <input
                    type="text"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    placeholder="Search invoice..."
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      console.log('Category selected:', e.target.value); // DEBUG
                      setSelectedCategory(e.target.value);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setCustomerFilter('');
                      setSelectedCategory('');
                    }}
                    className={`w-full px-4 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {salesStats.map((stat, index) => (
              <div
                key={index}
                className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {stat.title}
                  </h3>
                  <span className={`text-xs font-medium ${stat.color}`}>
                    {stat.trend === 'up' ? '↑' : '↓'} {stat.percentage}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>



          {/* Sales Table */}
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } border rounded-lg overflow-hidden`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h3 className={`text-lg font-semibold mb-4 sm:mb-0 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                  Recent Sales
                </h3>
                <div className="flex items-center">
                  <div className={`relative mr-3`}>
                    <input
                      type="text"
                      placeholder="Search sales..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 ${isDark
                        ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                    />
                    <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                  </div>
                  <button className={`flex items-center px-3 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                    }`}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'
                  }`}>
                  <tr>
                    <th className="px-6 py-3 text-left">Invoice #</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Customer</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {!loading && filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="6" className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        No sales found
                      </td>
                    </tr>
                  )}
                  {!loading && filteredSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className={`cursor-pointer ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`}
                      onClick={() => handleViewDetails(sale)}
                    >
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="flex items-center">
                          {sale.is_return && <span className="w-2 h-2 rounded-full bg-red-500 mr-2" title="Return"></span>}
                          {sale.invoice_number}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${sale.transaction_type === 'return'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                          {sale.transaction_type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {sale.customer_name || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {sale.transaction_type === 'sale' && sale.return_status && sale.return_status !== 'none' ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${sale.return_status === 'full'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                            }`}>
                            {sale.return_status === 'full' ? 'Full Return' : 'Partial Return'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${sale.transaction_type === 'return' ? 'text-red-500' : (isDark ? 'text-gray-300' : 'text-gray-900')
                        }`}>
                        {sale.transaction_type === 'return' ? '-' : ''}Rs. {Math.abs(sale.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(sale);
                            }}
                            className={`text-sm font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-900'
                              }`}
                          >
                            <Eye className="h-4 w-4 inline mr-1" />
                            View
                          </button>
                          {sale.transaction_type === 'sale' && sale.return_status !== 'full' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransactionType('return');
                                setOriginalSaleInvoice(sale.invoice_number);
                                setShowAddModal(true);
                                loadOriginalSale(sale.invoice_number);
                              }}
                              className={`text-sm font-medium ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'
                                }`}
                              title="Process Return for this Invoice"
                            >
                              <RotateCcw className="h-4 w-4 inline mr-1" />
                              Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`px-6 py-4 ${isDark ? 'bg-gray-800' : 'bg-white'
              }`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  Showing {sales.length} of {pagination.total} sales (Page {pagination.page} of {pagination.totalPages})
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className={`px-3 py-1 text-sm border rounded-lg ${pagination.page <= 1
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className={`px-3 py-1 text-sm ${pagination.page >= pagination.totalPages
                      ? 'opacity-50 cursor-not-allowed bg-gray-400'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      } rounded-lg`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>

        </main>
      </div>

      {/* Sale Details Modal */}
      {showDetailsModal && saleDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'
            } rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                Invoice Details: {saleDetails.invoice_number}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSaleDetails(null);
                }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Customer</p>
                  <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {saleDetails.customer_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Date</p>
                  <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(saleDetails.sale_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                Items ({saleDetails.items?.length || 0})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'
                    }`}>
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">Code</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {saleDetails.items?.map((item) => (
                      <tr key={item.id}>
                        {editingItemId === item.id ? (
                          <td colSpan="5" className="p-2">
                            <LineItemEditor
                              item={item}
                              type="sale"
                              onSave={handleUpdateItem}
                              onCancel={() => setEditingItemId(null)}
                            />
                          </td>
                        ) : (
                          <>
                            <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {item.product_name || 'N/A'}
                            </td>
                            <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {item.product_code || 'N/A'}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {item.quantity || 0}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              Rs. {(item.price || 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold flex items-center justify-end gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              <span>Rs. {(item.amount || 0).toLocaleString()}</span>
                              <button
                                onClick={() => setEditingItemId(item.id)}
                                className="text-gray-400 hover:text-indigo-500 transition-colors"
                                title="Edit Item"
                              >
                                <Edit2 size={14} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <td colSpan="4" className={`px-4 py-3 text-right font-bold ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                        Total:
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                        Rs. {(saleDetails.total_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* New Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className={`w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>New Sale</h3>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Transaction Type Selector */}
              <div className="flex gap-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
                <button
                  onClick={() => setTransactionType('sale')}
                  className={`px-4 py-2 rounded-md transition-all ${transactionType === 'sale' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 font-bold' : 'text-gray-500'}`}
                >
                  Sale
                </button>
                <button
                  onClick={() => setTransactionType('return')}
                  className={`px-4 py-2 rounded-md transition-all ${transactionType === 'return' ? 'bg-white dark:bg-gray-600 shadow-sm text-red-600 font-bold' : 'text-gray-500'}`}
                >
                  Return
                </button>
              </div>

              {/* Conditional UI: Return Search or Customer Name */}
              {transactionType === 'return' ? (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Original Invoice Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={originalSaleInvoice}
                        onChange={(e) => setOriginalSaleInvoice(e.target.value)}
                        className={`flex-1 p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="SR-YYYY-NNNN or T-SALE-..."
                      />
                      <button
                        onClick={() => loadOriginalSale(originalSaleInvoice)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                  {originalSaleData && (
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-sm font-bold">Original Sale Found:</p>
                      <p className="text-xs">Customer: {originalSaleData.customer_name} | Date: {new Date(originalSaleData.sale_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Customer Phone</label>
                      <input
                        type="tel"
                        value={newSaleCustomerPhone}
                        onChange={(e) => {
                          setNewSaleCustomerPhone(e.target.value);
                          setIsCustomerAutoFilled(false);
                        }}
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Customer Name
                        {isCustomerAutoFilled && <span className="ml-2 text-xs text-green-500 font-normal">(Found — edit if needed)</span>}
                      </label>
                      <input
                        type="text"
                        value={newSaleCustomer}
                        onChange={(e) => setNewSaleCustomer(e.target.value)}
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-indigo-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-indigo-500'} ${isCustomerAutoFilled ? (isDark ? 'bg-green-900/20 border-green-500/50' : 'bg-green-50 border-green-200') : ''}`}
                        placeholder="Enter customer name"
                      />
                    </div>
                  </div>

                  {!isCustomerAutoFilled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Age Range (Optional)</label>
                        <select
                          value={newSaleCustomerAgeRange}
                          onChange={(e) => setNewSaleCustomerAgeRange(e.target.value)}
                          className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          <option value="">Select Age Range</option>
                          <option value="Under 18">Under 18</option>
                          <option value="18-34">18-34</option>
                          <option value="35-54">35-54</option>
                          <option value="55+">55+</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Gender (Optional)</label>
                        <select
                          value={newSaleCustomerGender}
                          onChange={(e) => setNewSaleCustomerGender(e.target.value)}
                          className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Add Item Section - Only for normal sales */}
              {transactionType === 'sale' && (
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Add Item</h4>
                  {/* ... existing ProductSearch ... */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Product</label>
                      <ProductSearch
                        onSelect={(prod) => {
                          setIsFetchingPrice(true);
                          setCurrentItem({
                            ...currentItem,
                            product_code: prod.product_code,
                            product_name: prod.description,
                            price: String(parseFloat(prod.price) || 0)
                          });
                        }}
                      />
                      {currentItem.product_name && (
                        <div className={`mt-2 text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          Selected Product: <span className="font-semibold">{currentItem.product_name}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Price (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={isFetchingPrice ? '' : currentItem.price}
                        placeholder={isFetchingPrice ? "Calc..." : "0.00"}
                        onChange={(e) => setCurrentItem({ ...currentItem, price: e.target.value.replace(/^0+(?=\d)/, '') })}
                        onBlur={(e) => setCurrentItem({ ...currentItem, price: e.target.value === '' ? '' : String(parseFloat(e.target.value) || 0) })}
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} ${isFetchingPrice ? 'animate-pulse border-indigo-500' : ''}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) => {
                          setIsFetchingPrice(true);
                          setCurrentItem({ ...currentItem, quantity: e.target.value.replace(/^0+(?=\d)/, '') });
                        }}
                        onBlur={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value === '' ? '' : String(parseInt(e.target.value) || 0) })}
                        placeholder="Enter qty"
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddItem}
                        disabled={!currentItem.product_code || isFetchingPrice}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFetchingPrice ? 'Updating...' : 'Add Item'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              {newSaleItems.length > 0 && (
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>
                      <tr>
                        <th className="px-4 py-2 text-left">{transactionType === 'sale' ? 'Product' : 'Item to Return'}</th>
                        <th className="px-4 py-2 text-right">{transactionType === 'sale' ? 'Qty' : 'Qty to Return'}</th>
                        {transactionType === 'return' && <th className="px-4 py-2 text-right">Available</th>}
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {newSaleItems.map((item, idx) => (
                        <tr key={idx}>
                          {editingNewSaleItemIndex === idx ? (
                            <td colSpan="5" className="p-2">
                              <LineItemEditor
                                item={item}
                                type="sale"
                                onSave={(updated) => handleUpdateNewSaleItem(idx, updated)}
                                onCancel={() => setEditingNewSaleItemIndex(null)}
                              />
                            </td>
                          ) : (
                            <>
                              <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.product_name}</td>
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                {transactionType === 'return' ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.available_to_return}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      const updatedItems = [...newSaleItems];
                                      updatedItems[idx].quantity = Math.min(val, item.available_to_return);
                                      setNewSaleItems(updatedItems);
                                    }}
                                    className={`w-16 px-1 py-0.5 text-right border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                  />
                                ) : item.quantity}
                              </td>
                              {transactionType === 'return' && (
                                <td className={`px-4 py-2 text-right text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  / {item.available_to_return}
                                </td>
                              )}
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.price}</td>
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{(item.quantity * item.price).toFixed(2)}</td>
                              <td className="px-4 py-2 text-center flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => setEditingNewSaleItemIndex(idx)}
                                  className="text-indigo-500 hover:text-indigo-700"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setNewSaleItems(newSaleItems.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700"
                                  title="Remove"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary & Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 dark:border-gray-700">
                {/* Summary */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Subtotal</span>
                      <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>Rs. {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Discount (%)</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Rs. {discountAmount.toFixed(2)}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                          className={`w-16 px-2 py-1 text-right text-sm border rounded ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Tax (13%)</span>
                      <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>Rs. {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>TOTAL AMOUNT</span>
                      <span className="text-indigo-600 text-xl">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment</h4>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Credit">Credit (Pay Later)</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        {transactionType === 'return' && <option value="Store Credit">Store Credit (Refund)</option>}
                      </select>
                    </div>

                    {(paymentMethod === 'Cash' || paymentMethod === 'Credit') && (
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {paymentMethod === 'Cash' ? 'Cash Received from Customer' : 'Initial Payment (Optional)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                          placeholder={paymentMethod === 'Cash' ? "Enter amount customer gave" : "Enter partial payment if any"}
                          className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          autoFocus={paymentMethod === 'Cash'}
                        />
                      </div>
                    )}

                    {paymentMethod === 'Cash' && amountPaid > 0 && (
                      <div className={`p-3 rounded-lg border text-center transition-all ${changeAmount >= 0 ? (isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200') : (isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')}`}>
                        <span className={`text-xs block mb-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {changeAmount >= 0 ? 'Change to Return' : 'Remaining Balance'}
                        </span>
                        <span className={`text-xl font-bold ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Rs. {Math.abs(changeAmount).toLocaleString()}
                        </span>
                        {changeAmount < 0 && (
                          <p className="text-[10px] mt-1 text-red-400 flex items-center justify-center">
                            <span className="mr-1">⚠️</span> Insufficient Payment
                          </p>
                        )}
                      </div>
                    )}

                    {paymentMethod !== 'Cash' && paymentMethod !== 'Credit' && (
                      <div className={`p-3 rounded-lg border text-center ${isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}`}>
                        <span className={`text-xs block mb-1 font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                          Full Payment via {paymentMethod}
                        </span>
                        <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-indigo-700'}`}>
                          Rs. {totalAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end space-x-3`}>
              <button
                onClick={() => setShowAddModal(false)}
                className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSale}
                disabled={newSaleItems.length === 0 || (paymentMethod === 'Cash' && changeAmount < 0)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {paymentMethod === 'Cash' && changeAmount < 0 ? 'Insufficient Payment' : 'Create Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Printable Content */}
            <div className="printable-invoice p-8 bg-white text-black">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">STOCK WISELY</h1>
                <p className="text-sm text-gray-600">123 Business Street, City, Country</p>
                <p className="text-sm text-gray-600">Phone: +1 234 567 890</p>
              </div>

              {/* Invoice Info */}
              <div className="flex justify-between mb-8 border-b pb-4">
                <div>
                  <p className="text-sm font-bold text-gray-600">Bill To:</p>
                  <p className="font-semibold">{invoiceData.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-600">Invoice Details:</p>
                  <p className="text-sm">Invoice #: {invoiceData.invoice_number}</p>
                  <p className="text-sm">Date: {new Date(invoiceData.sale_date).toLocaleDateString()}</p>
                  <p className="text-sm">Time: {new Date(invoiceData.sale_date).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-8 text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-800">
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2">{item.product_name}</td>
                      <td className="text-right py-2">{item.quantity}</td>
                      <td className="text-right py-2">{item.price}</td>
                      <td className="text-right py-2">{(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount ({invoiceData.discount_percent}%):</span>
                    <span>- Rs. {invoiceData.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (13%):</span>
                    <span>+ Rs. {invoiceData.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-gray-800 pt-2 mt-2">
                    <span>Total:</span>
                    <span>Rs. {invoiceData.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pt-2">
                    <span>Paid ({invoiceData.payment_method}):</span>
                    <span>Rs. {invoiceData.amount_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Change:</span>
                    <span>Rs. {invoiceData.change_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-gray-600 border-t pt-4">
                <p>Thank you for your business!</p>
                <p>Please come again.</p>
              </div>
            </div>

            {/* Actions (Hidden in Print) */}
            <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
