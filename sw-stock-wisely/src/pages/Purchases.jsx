import React, { useState, useEffect } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import ProductSearch from '../components/inventory/ProductSearch';
import AddProductModal from '../components/AddProductModal';
import PurchaseReturnModal from '../components/purchases/PurchaseReturnModal';
import { purchasesAPI, inventoryAPI } from '../api';
import VendorAutocomplete from '../components/vendors/VendorAutocomplete';
import LineItemEditor from '../components/common/LineItemEditor';
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
  X,
  FileText,
  Upload,
  Edit2,
  RotateCcw
} from 'lucide-react';

function Purchases() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [saleDetails, setSaleDetails] = useState(null); // Unused
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false); // New Purchase Modal
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingNewPurchaseItemIndex, setEditingNewPurchaseItemIndex] = useState(null); // For new purchase modal

  // Purchase Return States
  const [transactionType, setTransactionType] = useState('purchase'); // 'purchase' or 'return'
  const [originalPurchaseInvoice, setOriginalPurchaseInvoice] = useState('');
  const [originalPurchaseId, setOriginalPurchaseId] = useState(null);
  const [originalPurchaseData, setOriginalPurchaseData] = useState(null);

  const handleUpdateItem = async (updatedItem) => {
    try {
      // Logic for purchase item update
      // Cost price and quantity are editable
      const res = await purchasesAPI.updatePurchaseItem(updatedItem.id, {
        quantity: Number(updatedItem.quantity),
        cost_price: Number(updatedItem.cost_price || updatedItem.price) // component returns price/cost logic
      });

      const { item, purchase } = res.data.data;

      // Update details local state
      if (purchaseDetails && purchaseDetails.id === purchase.id) {
        setPurchaseDetails(prev => ({
          ...prev,
          total_amount: purchase.total_amount,
          amount_paid: purchase.amount_paid,
          current_due_amount: purchase.current_due_amount,
          payment_status: purchase.payment_status,
          items: prev.items.map(it => it.id === item.id ? { ...it, ...item, price: item.price } : it) // ensure price matches
        }));
      }

      // Update main list
      setPurchases(prev => prev.map(p => p.id === purchase.id ? {
        ...p,
        total_amount: purchase.total_amount,
        current_due_amount: purchase.current_due_amount,
        payment_status: purchase.payment_status
      } : p));

      setEditingItemId(null);
    } catch (err) {
      console.error('Update purchase item failed:', err);
      // Backend returns 400 for validation errors (e.g., total < paid)
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    }
  };

  // New Purchase Modal State
  const [newPurchaseVendor, setNewPurchaseVendor] = useState('');
  const [newPurchaseItems, setNewPurchaseItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({ 
    product_code: '', 
    quantity: '', 
    cost: '', 
    mrp: '',
    product_name: '', 
    min_stock: '', 
    expiry_date: '' 
  });

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const quantityInputRef = React.useRef(null);
  const [vendorContact, setVendorContact] = useState('');
  const [vendorContactPerson, setVendorContactPerson] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [shippingCost, setShippingCost] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');

  // Return specific states within New Purchase Modal
  const [modalReturnType, setModalReturnType] = useState('refund');
  const [modalCreditNoteNumber, setModalCreditNoteNumber] = useState('');
  const vendorNames = Array.from(new Set(purchases.map(p => p.vendor_name).filter(Boolean)));

  const subtotal = newPurchaseItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  const totalAmount = subtotal + Number(shippingCost || 0) + Number(tax || 0);
  const dueAmount = Math.max(0, totalAmount - Number(amountPaid || 0));

  // Handler for updating items in New Purchase modal
  const handleUpdateNewPurchaseItem = (index, updatedItem) => {
    const updatedItems = [...newPurchaseItems];
    const cost = Number(updatedItem.cost_price || updatedItem.cost || updatedItem.price);
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: Number(updatedItem.quantity),
      cost: cost,
      mrp: Number(updatedItem.mrp || cost),
      amount: Number(updatedItem.quantity) * cost
    };
    setNewPurchaseItems(updatedItems);
    setEditingNewPurchaseItemIndex(null);
  };

  const handleAddItem = () => {
    const qty = Number(currentItem.quantity) || 0;
    const cost = Number(currentItem.cost) || 0;
    const mrp = Number(currentItem.mrp) || 0;
    if (!currentItem.product_code || qty <= 0) return;
    setNewPurchaseItems([...newPurchaseItems, { 
      ...currentItem, 
      quantity: qty,
      cost: cost,
      mrp: mrp || cost, // fallback
      amount: qty * cost 
    }]);
    setCurrentItem({ product_code: '', quantity: '', cost: '', mrp: '', product_name: '', min_stock: '', expiry_date: '' });
  };


  const loadOriginalPurchase = async (invoiceNumber) => {
    if (!invoiceNumber || invoiceNumber.length < 5) return;
    try {
      const response = await purchasesAPI.getPurchaseDetails(invoiceNumber);
      if (response.data.success) {
        const purchase = response.data.data;
        setOriginalPurchaseId(purchase.id);
        setOriginalPurchaseData(purchase);
        setNewPurchaseVendor(purchase.vendor_name);
        setNewPurchaseItems(purchase.items.map(item => ({
          ...item,
          available_to_return: (item.quantity || 0) - (item.quantity_returned || 0),
          quantity: 0, // Default to 0 selected for return
          cost: item.price,
          original_price: item.price
        })));
        setError(null);
      }
    } catch (err) {
      console.error('Error loading original purchase:', err);
    }
  };

  const handleCreatePurchase = async () => {
    try {
      if (!newPurchaseVendor.trim()) {
        alert('Vendor name is required');
        return;
      }
      if (newPurchaseItems.length === 0) {
        alert('Add at least one item');
        return;
      }
      // Payment validation
      const totalFixed = totalAmount.toFixed(2);
      const paidFixed = Number(amountPaid || 0).toFixed(2);

      if (paymentStatus === 'Paid') {
        if (paidFixed !== totalFixed) {
          alert(`For Paid status, Amount Paid (Rs. ${paidFixed}) must equal Total (Rs. ${totalFixed})`);
          return;
        }
      } else if (paymentStatus === 'Pending') {
        if (Number(paidFixed) !== 0) {
          alert('For Pending status, Amount Paid must be 0');
          return;
        }
        if (!dueDate) {
          alert('Due Date is required for Pending status');
          return;
        }
      } else if (paymentStatus === 'Partial Payment') {
        const paidNum = Number(paidFixed);
        const totalNum = Number(totalFixed);
        if (!(paidNum > 0 && paidNum < totalNum)) {
          alert('For Partial Payment, Amount Paid must be greater than 0 and less than Total');
          return;
        }
        if (!dueDate) {
          alert('Due Date is required for Partial Payment');
          return;
        }
      }

      const itemsPayload = newPurchaseItems
        .filter(it => transactionType === 'return' ? it.quantity > 0 : true)
        .map(it => ({
          product_code: it.product_code,
          product_name: it.product_name,
          quantity: it.quantity,
          cost: it.cost,
          cost_price: it.cost,
          mrp: it.mrp || it.cost,
          min_stock: it.min_stock,
          expiry_date: it.expiry_date,
          return_reason: transactionType === 'return' ? (it.return_reason || 'Return') : undefined
        }));


      if (transactionType === 'return' && itemsPayload.length === 0) {
        alert('Please select at least one item to return');
        return;
      }

      await purchasesAPI.createPurchase({
        transaction_type: transactionType,
        original_purchase_id: transactionType === 'return' ? originalPurchaseId : undefined,
        return_type: transactionType === 'return' ? modalReturnType : undefined,
        credit_note_number: transactionType === 'return' ? modalCreditNoteNumber : undefined,
        vendor_name: newPurchaseVendor,
        vendor_contact: vendorContact || undefined,
        vendor_invoice_number: vendorInvoiceNumber || undefined,
        purchase_date: purchaseDate || undefined,
        items: itemsPayload,
        subtotal,
        shipping_cost: Number(shippingCost || 0),
        tax: Number(tax || 0),
        total_amount: totalAmount,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount_paid: Number(amountPaid || 0),
        due_amount: dueAmount,
        due_date: (paymentStatus === 'Pending' || paymentStatus === 'Partial Payment') ? dueDate : undefined,
        notes: notes || (transactionType === 'return' ? `Return for invoice ${originalPurchaseInvoice}` : undefined),
        reference: reference || undefined
      });
      setShowAddModal(false);
      setNewPurchaseVendor('');
      setNewPurchaseItems([]);
      setVendorContact('');
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setShippingCost(0);
      setTax(0);
      setPaymentStatus('Pending');
      setPaymentMethod('Cash');
      setAmountPaid(0);
      setDueDate('');
      setVendorInvoiceNumber('');
      setNotes('');
      setReference('');
      // Refresh purchases
      const res = await purchasesAPI.getPurchases({ page: pagination.page, limit: pagination.limit });
      setPurchases(res.data.data || []);
    } catch (err) {
      console.error('Failed to create purchase', err);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Failed to create purchase: ${errorMessage}`);
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

  // Fetch purchases data
  const fetchPurchases = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (vendorFilter) params.vendor = vendorFilter;
      if (selectedCategory) params.category = selectedCategory;

      console.log('🔍 Fetching purchases with params:', params); // DEBUG
      const response = await purchasesAPI.getPurchases(params);
      setPurchases(response.data.data);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
      setError(err.response?.data?.message || 'Failed to load purchases data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases(pagination.page);
  }, [pagination.page, startDate, endDate, vendorFilter, selectedCategory]);

  // Sync amountPaid based on status and total
  useEffect(() => {
    if (paymentStatus === 'Paid') {
      setAmountPaid(totalAmount);
    } else if (paymentStatus === 'Pending') {
      setAmountPaid(0);
    }
  }, [paymentStatus, totalAmount]);

  useEffect(() => {
    fetchPurchases();
  }, []);

  // Filter purchases based on search term (client-side for now as API search is limited)
  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch =
      purchase.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleApplyFilters = () => {
    fetchPurchases(1);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setVendorFilter('');
    setSearchTerm('');
    setSelectedCategory('');
    fetchPurchases(1);
  };

  const fetchPurchaseDetails = async (invoiceNumber) => {
    try {
      const response = await purchasesAPI.getPurchaseDetails(invoiceNumber);
      setPurchaseDetails(response.data.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch purchase details:', err);
      // Could add a toast notification here
    }
  };

  const handleViewDetails = (purchase) => {
    setSelectedPurchase(purchase);
    fetchPurchaseDetails(purchase.invoice_number);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
      fetchPurchases(newPage);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                  Purchase Management
                </h1>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Track purchases, manage orders, and analyze expenses.
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
                  onClick={() => {
                    setTransactionType('return');
                    setShowAddModal(true);
                  }}
                  className="flex items-center px-5 py-2.5 text-sm font-medium border border-orange-300 text-orange-600 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors shadow-sm"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Purchase Return
                </button>
                <button
                  onClick={() => {
                    setTransactionType('purchase');
                    setShowAddModal(true);
                  }}
                  className="flex items-center px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">
                  <Plus className="h-5 w-5 mr-2" />
                  New Purchase
                </button>
              </div>
            </div>

            {/* Stats Cards - Placeholder for now */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'
                    } flex items-center`}>
                    +12.5% <TrendingUp className="h-3 w-3 ml-1" />
                  </span>
                </div>
                <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>Total Purchases</h3>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>Rs. {purchases.reduce((acc, p) => acc + (p.total_amount || 0), 0).toLocaleString()}</p>
              </div>

              <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-50 text-purple-600'
                    }`}>
                    <FileText className="h-6 w-6" />
                  </div>
                  <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'
                    } flex items-center`}>
                    +5.2% <TrendingUp className="h-3 w-3 ml-1" />
                  </span>
                </div>
                <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>Total Invoices</h3>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>{pagination.total}</p>
              </div>

              <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-50 text-orange-600'
                    }`}>
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'
                    } flex items-center`}>
                    +8.1% <TrendingUp className="h-3 w-3 ml-1" />
                  </span>
                </div>
                <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>Average Value</h3>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                  Rs. {pagination.total > 0
                    ? Math.round(purchases.reduce((acc, p) => acc + (p.total_amount || 0), 0) / purchases.length).toLocaleString()
                    : 0}
                </p>
              </div>
            </div>

            {/* Filters Section */}
            <div className={`p-4 rounded-xl border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Search Vendor or Invoice
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                    />
                    <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                  </div>
                </div>

                <div className="w-full md:w-48">
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  />
                </div>

                <div className="w-full md:w-48">
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  />
                </div>

                <div className="w-full md:w-48">
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by Vendor"
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>

                <div className="w-full md:w-48">
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      console.log('Category selected:', e.target.value); // DEBUG
                      setSelectedCategory(e.target.value);
                    }}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
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

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className={`px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                      }`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Purchases Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    Recent Purchases
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search purchases..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-10 pr-4 py-2 rounded-lg border text-sm ${isDark
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
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Vendor</th>
                      <th className="px-6 py-3 text-left">Items</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {!loading && filteredPurchases.length === 0 && (
                      <tr>
                        <td colSpan="6" className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          No purchases found
                        </td>
                      </tr>
                    )}
                    {!loading && filteredPurchases.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className={`cursor-pointer ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                          }`}
                        onClick={() => handleViewDetails(purchase)}
                      >
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {purchase.invoice_number}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {new Date(purchase.purchase_date).toLocaleDateString()}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {purchase.vendor_name || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {purchase.total_items || 0}
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          Rs. {(purchase.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(purchase);
                            }}
                            className={`text-sm font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-900'
                              }`}
                          >
                            <Eye className="h-4 w-4 inline mr-1" />
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPurchase(purchase);
                              fetchPurchaseDetails(purchase.invoice_number);
                              setShowReturnModal(true);
                            }}
                            className={`text-sm font-medium ${isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-900'
                              }`}
                          >
                            <RotateCcw className="h-4 w-4 inline mr-1" />
                            Return
                          </button>
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
                    Showing {purchases.length} of {pagination.total} purchases (Page {pagination.page} of {pagination.totalPages})
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

      {/* Purchase Details Modal */}
      {showDetailsModal && purchaseDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'
            } rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                  Purchase Details
                </h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  Invoice #{purchaseDetails.invoice_number}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Vendor Information
                  </h4>
                  <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {purchaseDetails.vendor_name || 'N/A'}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Date & Time
                  </h4>
                  <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {new Date(purchaseDetails.purchase_date).toLocaleDateString()}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {new Date(purchaseDetails.purchase_date).toLocaleTimeString()}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Total Amount
                  </h4>
                  <p className={`text-2xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'
                    }`}>
                    Rs. {(purchaseDetails.total_amount || 0).toLocaleString()}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {purchaseDetails.total_items} items
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                Items ({purchaseDetails.items?.length || 0})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                    }`}>
                    <tr>
                      <th className="px-4 py-3 text-left">Item Code</th>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Expiry</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {purchaseDetails.items?.map((item) => (
                      <tr key={item.id}>
                        {editingItemId === item.id ? (
                          <td colSpan="6" className="p-2">
                            <LineItemEditor
                              item={{ ...item, price: item.price }} // Map price/cost
                              type="purchase" // Use purchase type for cost label
                              onSave={handleUpdateItem}
                              onCancel={() => setEditingItemId(null)}
                            />
                          </td>
                        ) : (
                          <>
                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {item.product_code}
                            </td>
                            <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {item.product_name}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {item.quantity}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              Rs. {item.price.toLocaleString()}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium flex items-center justify-end gap-3 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              <span>Rs. {item.amount.toLocaleString()}</span>
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
                  <tfoot className={`border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <tr>
                      <td colSpan="4" className={`px-4 py-3 text-right font-bold ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                        Total
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'
                        }`}>
                        Rs. {(purchaseDetails.total_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t flex justify-end space-x-3 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                  }`}
              >
                Close
              </button>
              {purchaseDetails && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Return Items
                </button>
              )}
              <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
      {/* New Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className={`w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {transactionType === 'return' ? 'Purchase Return' : 'New Purchase'}
                </h3>
                <div className={`flex p-1 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <button
                    onClick={() => setTransactionType('purchase')}
                    className={`px-3 py-1 text-sm rounded-md transition-all ${transactionType === 'purchase'
                      ? (isDark ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Purchase
                  </button>
                  <button
                    onClick={() => {
                      setTransactionType('return');
                      setNewPurchaseItems([]); // Clear items when switching
                    }}
                    className={`px-3 py-1 text-sm rounded-md transition-all ${transactionType === 'return'
                      ? (isDark ? 'bg-orange-600 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm')
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    Return
                  </button>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Transaction Context (Conditional for Return) */}
              {transactionType === 'return' && (
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-orange-900/10 border-orange-800' : 'bg-orange-50 border-orange-200'} mb-4`}>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                    Original Purchase Invoice Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={originalPurchaseInvoice}
                        onChange={(e) => {
                          setOriginalPurchaseInvoice(e.target.value);
                          if (e.target.value.length >= 5) loadOriginalPurchase(e.target.value);
                        }}
                        placeholder="Type invoice number (e.g. PUR-1001)..."
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-orange-500 transition-all ${isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                      />
                      <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                    {originalPurchaseId && (
                      <div className="flex items-center px-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium">
                        Found: {originalPurchaseData?.vendor_name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Vendor Name</label>
                  <VendorAutocomplete
                    value={newPurchaseVendor}
                    onSelectVendor={(v) => {
                      setNewPurchaseVendor(v.name || '');
                      setVendorContact(v.email || v.phone || '');
                      setVendorContactPerson(v.contact_person || '');
                      setVendorEmail(v.email || '');
                      setVendorPhone(v.phone || '');
                      setVendorAddress(v.address || '');
                    }}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Vendor Contact</label>
                  <input
                    type="text"
                    value={vendorContact}
                    readOnly
                    className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                    placeholder="Email or Phone"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {transactionType === 'return' ? 'Return Date' : 'Purchase Date'}
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
              </div>

              {/* Vendor Details (read-only) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Person</label>
                  <input
                    type="text"
                    value={vendorContactPerson}
                    readOnly
                    className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email</label>
                  <input
                    type="text"
                    value={vendorEmail}
                    readOnly
                    className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Phone</label>
                  <input
                    type="text"
                    value={vendorPhone}
                    readOnly
                    className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Address</label>
                  <input
                    type="text"
                    value={vendorAddress}
                    readOnly
                    className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                    placeholder="—"
                  />
                </div>
              </div>

              {/* Return Settings (Conditional) */}
              {transactionType === 'return' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Return Method *</label>
                    <select
                      value={modalReturnType}
                      onChange={(e) => setModalReturnType(e.target.value)}
                      className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="refund">Refund (Reduce Balance/Ledger)</option>
                      <option value="credit_note">Credit Note (For future purchases)</option>
                      <option value="replacement">Replacement (No financial impact)</option>
                    </select>
                  </div>
                  {modalReturnType === 'credit_note' && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Credit Note Number *</label>
                      <input
                        type="text"
                        value={modalCreditNoteNumber}
                        onChange={(e) => setModalCreditNoteNumber(e.target.value)}
                        placeholder="e.g. CN-12345"
                        className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Add Item Section - Only for normal purchases */}
              {transactionType === 'purchase' && (
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Add Item</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Product</label>
                      <ProductSearch
                        onQueryChange={setSearchQuery}
                        onResultsChange={setSearchResults}
                        onSelect={(prod) => {
                          setCurrentItem({
                            ...currentItem,
                            product_code: prod.product_code,
                            product_name: prod.description,
                            cost: String(parseFloat(prod.price) || 0)
                          });
                        }}
                      />
                      {searchResults.length === 0 && (searchQuery || '').trim().length >= 3 && !currentItem.product_code && (
                        <div className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <p>No products found matching "{searchQuery}"</p>
                          <button
                            onClick={() => setShowAddProduct(true)}
                            className={`mt-1 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                          >
                            + Add "{searchQuery}" as new product
                          </button>
                        </div>
                      )}
                      {currentItem.product_name && (
                        <div className={`mt-2 text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          Selected: {currentItem.product_name}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value.replace(/^0+(?=\d)/, '') })}
                        onBlur={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value === '' ? '' : String(parseInt(e.target.value) || 0) })}
                        ref={quantityInputRef}
                        placeholder="Enter qty"
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Cost Per Unit</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentItem.cost}
                        onChange={(e) => setCurrentItem({ ...currentItem, cost: e.target.value.replace(/^0+(?=\d)/, '') })}
                        onBlur={(e) => setCurrentItem({ ...currentItem, cost: e.target.value === '' ? '' : String(parseFloat(e.target.value) || 0) })}
                        placeholder="0.00"
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>MRP (Selling Price)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentItem.mrp}
                        onChange={(e) => setCurrentItem({ ...currentItem, mrp: e.target.value.replace(/^0+(?=\d)/, '') })}
                        onBlur={(e) => setCurrentItem({ ...currentItem, mrp: e.target.value === '' ? '' : String(parseFloat(e.target.value) || 0) })}
                        placeholder="Selling Price"
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Min Stock</label>
                      <input
                        type="number"
                        min="0"
                        value={currentItem.min_stock}
                        onChange={(e) => setCurrentItem({ ...currentItem, min_stock: e.target.value })}
                        placeholder="Optional"
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Expiry Date</label>
                      <input
                        type="date"
                        value={currentItem.expiry_date}
                        onChange={(e) => setCurrentItem({ ...currentItem, expiry_date: e.target.value })}
                        className={`w-full p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>
                  </div>
                  <div className="mt-3 text-right text-sm">
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Amount: Rs. {((Number(currentItem.quantity) || 0) * (Number(currentItem.cost) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleAddItem}
                      disabled={!currentItem.product_code}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Line Item
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              {newPurchaseItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>
                      <tr>
                        <th className="px-4 py-2 text-left">{transactionType === 'purchase' ? 'Product' : 'Item to Return'}</th>
                        <th className="px-4 py-2 text-right">{transactionType === 'purchase' ? 'Qty' : 'Qty to Return'}</th>
                        <th className="px-4 py-2 text-right">Cost/Unit</th>
                        <th className="px-4 py-2 text-right">MRP</th>
                        {transactionType === 'return' && <th className="px-4 py-2 text-left">Reason</th>}

                        <th className="px-4 py-2 text-right">Min Stock</th>
                        <th className="px-4 py-2 text-right">Expiry</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {newPurchaseItems.map((item, idx) => (
                        <tr key={idx}>
                          {editingNewPurchaseItemIndex === idx ? (
                            <td colSpan="7" className="p-2">
                              <LineItemEditor
                                item={{ ...item, price: item.cost }} // Map cost to price for editor
                                type="purchase"
                                onSave={(updated) => handleUpdateNewPurchaseItem(idx, updated)}
                                onCancel={() => setEditingNewPurchaseItemIndex(null)}
                              />
                            </td>
                          ) : (
                            <>
                              <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.product_name}</td>
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.quantity}</td>
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.cost}</td>
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.mrp || item.cost}</td>
                              {transactionType === 'return' && (

                                <td className="px-4 py-2 text-left">
                                  <select
                                    value={item.return_reason || ''}
                                    onChange={(e) => {
                                      const updatedItems = [...newPurchaseItems];
                                      updatedItems[idx].return_reason = e.target.value;
                                      setNewPurchaseItems(updatedItems);
                                    }}
                                    className={`p-1 text-xs rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                  >
                                    <option value="">Select Reason</option>
                                    <option value="Defective">Defective</option>
                                    <option value="Wrong Item">Wrong Item</option>
                                    <option value="Damaged">Damaged</option>
                                    <option value="Expired">Expired</option>
                                    <option value="Quality Issue">Quality Issue</option>
                                  </select>
                                </td>
                              )}
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.min_stock || '-'}</td>
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.expiry_date || '-'}</td>
                              <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{(item.quantity * item.cost).toFixed(2)}</td>
                              <td className="px-4 py-2 text-center flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => setEditingNewPurchaseItemIndex(idx)}
                                  className="text-indigo-500 hover:text-indigo-700"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setNewPurchaseItems(newPurchaseItems.filter((_, i) => i !== idx))}
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
                  <div className="mt-3 text-right text-sm font-semibold">
                    Subtotal: Rs. {subtotal.toFixed(2)}
                  </div>
                </div>
              )}
              <AddProductModal
                isOpen={showAddProduct}
                onClose={() => setShowAddProduct(false)}
                prefilledName={searchQuery}
                onProductAdded={(newProduct) => {
                  setShowAddProduct(false);
                  setCurrentItem({
                    product_code: newProduct.product_code,
                    product_name: newProduct.description,
                    quantity: 1,
                    cost: 0
                  });
                  try {
                    alert(`Product "${newProduct.description}" added successfully!`);
                  } catch { }
                  quantityInputRef.current?.focus();
                }}
              />

              {/* Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 dark:border-gray-700">
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Subtotal</span>
                      <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>Rs. {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Shipping/Freight</span>
                      <input
                        type="number"
                        min="0"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                        className={`w-24 px-2 py-1 text-right text-sm border rounded ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Tax/VAT</span>
                      <input
                        type="number"
                        min="0"
                        value={tax}
                        onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                        className={`w-24 px-2 py-1 text-right text-sm border rounded ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>Total</span>
                      <span className="text-indigo-600">Rs. {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Payment Status</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option>Paid</option>
                        <option>Pending</option>
                        <option>Partial Payment</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option>Cash</option>
                        <option>Bank Transfer</option>
                        <option>Cheque</option>
                        <option>Credit</option>
                      </select>
                    </div>
                    {paymentStatus !== 'Pending' && (
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Amount Paid</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountPaid}
                          readOnly={paymentStatus === 'Paid'}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                          className={`w-full p-2 text-sm rounded-lg border ${
                            paymentStatus === 'Paid' 
                              ? (isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500')
                              : (isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900')
                          }`}
                        />
                      </div>
                    )}
                    <div className={`p-2 rounded border text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <span className={`text-xs block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Due Amount</span>
                      <span className={`text-lg font-bold ${dueAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        Rs. {dueAmount.toFixed(2)}
                      </span>
                    </div>
                    {(paymentStatus === 'Pending' || paymentStatus === 'Partial Payment') && (
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Due Date</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Additional Info</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Vendor Invoice Number</label>
                    <input
                      type="text"
                      value={vendorInvoiceNumber}
                      onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                      className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Reference</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="PO number, etc."
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Notes/Remarks</label>
                    <textarea
                      rows="3"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="Optional notes"
                    />
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
                onClick={handleCreatePurchase}
                disabled={newPurchaseItems.length === 0}
                className={`px-4 py-2 text-white rounded-lg transition-all disabled:opacity-50 ${transactionType === 'return'
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                  }`}
              >
                {transactionType === 'return' ? (
                  <div className="flex items-center">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Confirm Return
                  </div>
                ) : (
                  'Create Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReturnModal && purchaseDetails && (
        <PurchaseReturnModal
          isOpen={showReturnModal}
          onClose={(success) => {
            setShowReturnModal(false);
            if (success) {
              setShowDetailsModal(false);
              if (typeof fetchPurchases === 'function') {
                fetchPurchases();
              }
            }
          }}
          purchase={purchaseDetails}
        />
      )}
    </div>
  );
}

export default Purchases;
