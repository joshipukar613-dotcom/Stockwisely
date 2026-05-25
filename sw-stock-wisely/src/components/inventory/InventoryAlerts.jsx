import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  AlertTriangle, 
  Clock, 
  XCircle, 
  CheckCircle,
  Bell,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Package,
  TrendingDown,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Archive,
  Star,
  Flag
} from 'lucide-react';

function InventoryAlerts({ products, alerts: providedAlerts, onDismissAlert, onMarkAsRead }) {
  const { isDark } = useTheme();
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Generate comprehensive alerts
  const alerts = useMemo(() => {
    if (providedAlerts) return providedAlerts;
    if (!products) return [];

    const alertList = [];

    // Low stock alerts
    products.forEach(product => {
      if (product.stock > 0 && product.stock <= product.minStock) {
        alertList.push({
          id: `low-stock-${product.id}`,
          type: 'low_stock',
          priority: 'high',
          title: 'Low Stock Alert',
          message: `${product.name} is running low on stock`,
          details: `Current stock: ${product.stock} units, Minimum required: ${product.minStock} units`,
          product: product,
          timestamp: new Date(),
          status: 'active',
          category: 'stock'
        });
      }
    });

    // Out of stock alerts
    products.forEach(product => {
      if (product.stock === 0) {
        alertList.push({
          id: `out-of-stock-${product.id}`,
          type: 'out_of_stock',
          priority: 'critical',
          title: 'Out of Stock',
          message: `${product.name} is completely out of stock`,
          details: `SKU: ${product.sku} | Category: ${product.category}`,
          product: product,
          timestamp: new Date(),
          status: 'active',
          category: 'stock'
        });
      }
    });

    // Expiry alerts
    products.forEach(product => {
      if (product.nearestExpiryDate) {
        const expiryDate = new Date(product.nearestExpiryDate);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          alertList.push({
            id: `expired-${product.id}`,
            type: 'expired',
            priority: 'critical',
            title: 'Product Expired',
            message: `${product.name} has expired`,
            details: `Expired on: ${product.nearestExpiryDate}`,
            product: product,
            timestamp: new Date(),
            status: 'active',
            category: 'expiry'
          });
        } else if (diffDays <= 7) {
          alertList.push({
            id: `expiring-soon-${product.id}`,
            type: 'expiring_soon',
            priority: 'high',
            title: 'Expiring Soon',
            message: `${product.name} expires in ${diffDays} days`,
            details: `Expiry date: ${product.nearestExpiryDate}`,
            product: product,
            timestamp: new Date(),
            status: 'active',
            category: 'expiry'
          });
        } else if (diffDays <= 30) {
          alertList.push({
            id: `expiring-month-${product.id}`,
            type: 'expiring_month',
            priority: 'medium',
            title: 'Expiring This Month',
            message: `${product.name} expires in ${diffDays} days`,
            details: `Expiry date: ${product.nearestExpiryDate}`,
            product: product,
            timestamp: new Date(),
            status: 'active',
            category: 'expiry'
          });
        }
      }
    });

    // High value inventory alerts
    const highValueProducts = products.filter(p => (p.price * p.stock) > 100000);
    if (highValueProducts.length > 0) {
      alertList.push({
        id: 'high-value-inventory',
        type: 'high_value',
        priority: 'medium',
        title: 'High Value Inventory',
        message: `${highValueProducts.length} products with high inventory value`,
        details: `Total value: Rs. ${highValueProducts.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()}`,
        product: null,
        timestamp: new Date(),
        status: 'active',
        category: 'value'
      });
    }

    // Slow moving inventory alerts
    const slowMovingProducts = products.filter(p => p.stock > p.minStock * 3);
    if (slowMovingProducts.length > 0) {
      alertList.push({
        id: 'slow-moving-inventory',
        type: 'slow_moving',
        priority: 'low',
        title: 'Slow Moving Inventory',
        message: `${slowMovingProducts.length} products with excess stock`,
        details: 'Consider promotional pricing or supplier returns',
        product: null,
        timestamp: new Date(),
        status: 'active',
        category: 'movement'
      });
    }

    return alertList.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [products]);

  const filteredAlerts = alerts.filter(alert => {
    const matchesType = filterType === 'all' || alert.category === filterType;
    const matchesPriority = filterPriority === 'all' || alert.priority === filterPriority;
    const matchesSearch = searchTerm === '' || 
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesPriority && matchesSearch;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <Package className="h-5 w-5" />;
      case 'expired':
      case 'expiring_soon':
      case 'expiring_month':
        return <Clock className="h-5 w-5" />;
      case 'high_value':
        return <TrendingUp className="h-5 w-5" />;
      case 'slow_moving':
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleDismiss = (alertId) => {
    if (onDismissAlert) {
      onDismissAlert(alertId);
    }
  };

  const handleMarkAsRead = (alertId) => {
    if (onMarkAsRead) {
      onMarkAsRead(alertId);
    }
  };

  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.priority === 'critical').length,
    high: alerts.filter(a => a.priority === 'high').length,
    medium: alerts.filter(a => a.priority === 'medium').length,
    low: alerts.filter(a => a.priority === 'low').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Inventory Alerts
          </h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Monitor critical inventory issues and take action
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
            }`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          <button className="flex items-center px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Alerts
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {alertStats.total}
              </p>
            </div>
            <Bell className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                Critical
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-red-200' : 'text-red-800'} mt-1`}>
                {alertStats.critical}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                High Priority
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-orange-200' : 'text-orange-800'} mt-1`}>
                {alertStats.high}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                Medium
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-yellow-200' : 'text-yellow-800'} mt-1`}>
                {alertStats.medium}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Low Priority
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-blue-200' : 'text-blue-800'} mt-1`}>
                {alertStats.low}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search alerts..."
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Types</option>
              <option value="stock">Stock Issues</option>
              <option value="expiry">Expiry Alerts</option>
              <option value="value">Value Alerts</option>
              <option value="movement">Movement Alerts</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${getPriorityColor(alert.priority).split(' ')[1]}`}>
                  {getTypeIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {alert.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(alert.priority)}`}>
                      {alert.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    {alert.message}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {alert.details}
                  </p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                    {alert.product && (
                      <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {alert.product.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {alert.product && (
                  <button
                    className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    title="View Product"
                  >
                    <Eye className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </button>
                )}
                <button
                  onClick={() => handleMarkAsRead(alert.id)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  title="Mark as Read"
                >
                  <CheckCircle className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  title="Dismiss Alert"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className={`text-center py-12 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No alerts found</p>
          <p>Try adjusting your filter criteria or check back later</p>
        </div>
      )}
    </div>
  );
}

export default InventoryAlerts;
