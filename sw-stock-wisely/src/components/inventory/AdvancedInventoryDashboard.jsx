import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import InventoryAnalytics from './InventoryAnalytics';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Target,
  Users,
  ShoppingCart,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Download,
  Upload,
  Settings,
  Bell,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';

function AdvancedInventoryDashboard({ products, onRefresh, onAddProduct, onEditProduct, onDeleteProduct }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('value');

  // Calculate real-time metrics
  const metrics = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const expiringSoon = products.filter(p => {
      if (!p.nearestExpiryDate) return false;
      const expiryDate = new Date(p.nearestExpiryDate);
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays > 0;
    }).length;

    return { totalValue, lowStock, outOfStock, expiringSoon };
  }, [products]);

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: Activity }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterStatus === 'low') {
      matchesFilter = product.stock > 0 && product.stock <= product.minStock;
    } else if (filterStatus === 'out') {
      matchesFilter = product.stock === 0;
    } else if (filterStatus === 'expiring') {
      if (!product.nearestExpiryDate) return false;
      const expiryDate = new Date(product.nearestExpiryDate);
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchesFilter = diffDays <= 30 && diffDays > 0;
    }

    return matchesSearch && matchesFilter;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return (b.price * b.stock) - (a.price * a.stock);
      case 'stock':
        return b.stock - a.stock;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Inventory Value
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {formatCurrency(metrics.totalValue)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Low Stock Items
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {metrics.lowStock}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Out of Stock
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {metrics.outOfStock}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Expiring Soon
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {metrics.expiringSoon}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>


    </div>
  );

  const renderProducts = () => (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Products</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="expiring">Expiring Soon</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="value">Sort by Value</option>
              <option value="stock">Sort by Stock</option>
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
            </select>
          </div>
          
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {sortedProducts.length} of {products.length} products
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProducts.map((product) => {
          const stockStatus = product.stock === 0 ? 'out' : 
                            product.stock <= product.minStock ? 'low' : 'good';
          const statusColors = {
            out: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
            low: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
            good: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
          };

          return (
            <div
              key={product.id}
              className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Package className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.name}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.sku}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[stockStatus].bg} ${statusColors[stockStatus].text}`}>
                  {stockStatus === 'out' ? 'Out of Stock' : 
                   stockStatus === 'low' ? 'Low Stock' : 'In Stock'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Category:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {product.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stock:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {product.stock} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Value:</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(product.price * product.stock)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEditProduct(product)}
                    className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    title="Edit Product"
                  >
                    <Edit className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product)}
                    className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    title="Delete Product"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
                <button
                  className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-4">
      {/* Critical Alerts */}
      <div className={`${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-6`}>
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-red-300' : 'text-red-900'}`}>
            Critical Alerts
          </h3>
        </div>
        <div className="space-y-2">
          {products.filter(p => p.stock === 0).map(product => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-500">Out of Stock</p>
              </div>
              <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                Reorder
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Alerts */}
      <div className={`${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-6`}>
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="h-6 w-6 text-yellow-600" />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-900'}`}>
            Warning Alerts
          </h3>
        </div>
        <div className="space-y-2">
          {products.filter(p => p.stock > 0 && p.stock <= p.minStock).map(product => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-500">Low Stock: {product.stock} units</p>
              </div>
              <button className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700">
                Restock
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Advanced Inventory Dashboard
          </h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Comprehensive inventory management and analytics
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={onRefresh}
            className={`flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
            }`}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'alerts' && renderAlerts()}
        {activeTab === 'analytics' && <InventoryAnalytics products={products} />}
      </div>
    </div>
  );
}

export default AdvancedInventoryDashboard;
