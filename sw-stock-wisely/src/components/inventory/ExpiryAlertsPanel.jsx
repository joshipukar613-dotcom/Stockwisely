import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  AlertTriangle, 
  Clock, 
  Calendar,
  Package,
  Eye,
  CheckCircle,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  SortAsc,
  SortDesc
} from 'lucide-react';

function ExpiryAlertsPanel({ alerts, loading = false, onViewProduct, onAcknowledgeAlert, onRefreshAlerts }) {
  const { isDark } = useTheme();
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('expiry');
  const [sortDir, setSortDir] = useState('asc');
  const [collapsed, setCollapsed] = useState({
    expired: false,
    expiring_week: false,
    expiring_soon: false
  });

  const handleAcknowledge = (alertId) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]));
    if (onAcknowledgeAlert) {
      onAcknowledgeAlert(alertId);
    }
  };

  const acknowledgeAll = (list = []) => {
    list.forEach(a => {
      if (!acknowledgedAlerts.has(a.batchId)) {
        handleAcknowledge(a.batchId);
      }
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const sortAlerts = (list = []) => {
    const arr = [...list];
    if (sortBy === 'expiry') {
      arr.sort((a, b) => {
        const da = new Date(a.expiryDate).getTime();
        const db = new Date(b.expiryDate).getTime();
        return sortDir === 'asc' ? da - db : db - da;
      });
    } else if (sortBy === 'quantity') {
      arr.sort((a, b) => {
        return sortDir === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
      });
    } else if (sortBy === 'urgency') {
      arr.sort((a, b) => {
        const ua = a.daysUntil ?? 9999;
        const ub = b.daysUntil ?? 9999;
        return sortDir === 'asc' ? ua - ub : ub - ua;
      });
    }
    return arr;
  };

  const filterAlerts = (list = []) => {
    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(a =>
      (a.productName || '').toLowerCase().includes(q) ||
      (a.sku || '').toLowerCase().includes(q) ||
      (a.batchNumber || '').toLowerCase().includes(q)
    );
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'expiring_week':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'expiring_soon':
        return <Calendar className="h-5 w-5 text-yellow-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAlertTheme = (type) => {
    switch (type) {
      case 'expired':
        return {
          bg: 'bg-red-50 border-red-200',
          darkBg: 'bg-red-900/20 border-red-800',
          headerBg: 'bg-red-100',
          darkHeaderBg: 'bg-red-900/30',
          text: 'text-red-800',
          darkText: 'text-red-200'
        };
      case 'expiring_week':
        return {
          bg: 'bg-orange-50 border-orange-200',
          darkBg: 'bg-orange-900/20 border-orange-800',
          headerBg: 'bg-orange-100',
          darkHeaderBg: 'bg-orange-900/30',
          text: 'text-orange-800',
          darkText: 'text-orange-200'
        };
      case 'expiring_soon':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          darkBg: 'bg-yellow-900/20 border-yellow-800',
          headerBg: 'bg-yellow-100',
          darkHeaderBg: 'bg-yellow-900/30',
          text: 'text-yellow-800',
          darkText: 'text-yellow-200'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          darkBg: 'bg-gray-800 border-gray-700',
          headerBg: 'bg-gray-100',
          darkHeaderBg: 'bg-gray-700',
          text: 'text-gray-800',
          darkText: 'text-gray-200'
        };
    }
  };

  const getAlertTitle = (type) => {
    switch (type) {
      case 'expired':
        return 'Expired Products';
      case 'expiring_week':
        return 'Expiring This Week';
      case 'expiring_soon':
        return 'Expiring Within 30 Days';
      default:
        return 'Alerts';
    }
  };

  const renderAlertCard = (alert, type) => {
    const theme = getAlertTheme(type);
    const isAcknowledged = acknowledgedAlerts.has(alert.batchId);
    
    return (
      <div
        key={`${alert.productId}-${alert.batchId}`}
        className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
          isDark ? theme.darkBg : theme.bg
        } ${isAcknowledged ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap space-x-2 mb-2">
              {getAlertIcon(type)}
              <h4 className={`font-medium ${isDark ? theme.darkText : theme.text}`}>
                {alert.productName}
              </h4>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                <span className="font-medium">SKU:</span> {alert.sku}
              </p>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                <span className="font-medium">Batch:</span> {alert.batchNumber}
              </p>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                <span className="font-medium">Quantity:</span> {alert.quantity}
              </p>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} truncate col-span-2 sm:col-span-1`}>
                <span className="font-medium">Expiry:</span> {formatDate(alert.expiryDate)}
                {alert.daysUntil !== null && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    type === 'expired' ? 'bg-red-200 text-red-800' :
                    type === 'expiring_week' ? 'bg-orange-200 text-orange-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>
                    {alert.daysUntil < 0 ? `${Math.abs(alert.daysUntil)} days ago` : 
                     alert.daysUntil === 0 ? 'Today' : 
                     `${alert.daysUntil} days left`}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2 ml-0 sm:ml-4 shrink-0">
            <button
              onClick={() => onViewProduct && onViewProduct(alert.productId)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="View Product"
            >
              <Eye className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
            
            {!isAcknowledged && (
              <button
                onClick={() => handleAcknowledge(alert.batchId)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title="Acknowledge Alert"
              >
                <CheckCircle className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalAlerts = (alerts?.expired?.length || 0) + (alerts?.expiring_week?.length || 0) + (alerts?.expiring_soon?.length || 0);

  if (loading) {
    return (
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-gray-300/40 dark:bg-gray-700/50" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`${isDark ? 'bg-gray-700/40' : 'bg-gray-100'} rounded-lg p-4`}>
                <div className="h-4 w-24 mb-3 rounded bg-gray-300/40 dark:bg-gray-600/50" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-gray-300/40 dark:bg-gray-600/50" />
                  <div className="h-3 w-3/4 rounded bg-gray-300/40 dark:bg-gray-600/50" />
                  <div className="h-3 w-1/2 rounded bg-gray-300/40 dark:bg-gray-600/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (totalAlerts === 0) {
    return (
      <div className={`${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-xl p-6 shadow-sm`}>
        <div className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className={`text-lg font-semibold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            No Expiry Alerts
          </h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            All products are within their expiry dates. Great job!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border rounded-xl p-6 shadow-sm`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Expiry Alerts
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, batch, product"
              className={`pl-9 pr-3 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
            title="Sort By"
          >
            <option value="expiry">Expiry Date</option>
            <option value="quantity">Quantity</option>
            <option value="urgency">Urgency</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className={`p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'}`}
            title={`Sort ${sortDir === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {sortDir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onRefreshAlerts && onRefreshAlerts()}
            className={`p-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'}`}
            title="Refresh Alerts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{totalAlerts} total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Expired Products */}
        <div>
          <div className={`flex items-center space-x-2 mb-3 p-3 rounded-lg ${
            isDark ? 'bg-red-900/30' : 'bg-red-100'
          }`}>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h4 className={`font-semibold ${isDark ? 'text-red-200' : 'text-red-800'}`}>
              {getAlertTitle('expired')}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-red-800 text-red-200' : 'bg-red-200 text-red-800'
            }`}>
              {alerts.expired.length}
            </span>
            <button
              onClick={() => setCollapsed(c => ({ ...c, expired: !c.expired }))}
              className={`ml-auto p-2 rounded-lg ${isDark ? 'hover:bg-red-900/40' : 'hover:bg-red-200'}`}
              title={collapsed.expired ? 'Expand' : 'Collapse'}
            >
              {collapsed.expired ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            {alerts.expired.length > 0 && (
              <button
                onClick={() => acknowledgeAll(filterAlerts(sortAlerts(alerts.expired)))}
                className={`ml-2 px-2 py-1 text-xs rounded-lg ${isDark ? 'bg-red-800 text-red-100 hover:bg-red-700' : 'bg-red-200 text-red-800 hover:bg-red-300'}`}
                title="Acknowledge All"
              >
                Ack All
              </button>
            )}
          </div>
          {!collapsed.expired && (
            <div className="space-y-3">
            {alerts.expired.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>
                No expired products
              </p>
            ) : (
              filterAlerts(sortAlerts(alerts.expired)).map(alert => renderAlertCard(alert, 'expired'))
            )}
            </div>
          )}
        </div>

        {/* Expiring This Week */}
        <div>
          <div className={`flex items-center space-x-2 mb-3 p-3 rounded-lg ${
            isDark ? 'bg-orange-900/30' : 'bg-orange-100'
          }`}>
            <Clock className="h-5 w-5 text-orange-600" />
            <h4 className={`font-semibold ${isDark ? 'text-orange-200' : 'text-orange-800'}`}>
              {getAlertTitle('expiring_week')}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-orange-800 text-orange-200' : 'bg-orange-200 text-orange-800'
            }`}>
              {alerts.expiring_week.length}
            </span>
            <button
              onClick={() => setCollapsed(c => ({ ...c, expiring_week: !c.expiring_week }))}
              className={`ml-auto p-2 rounded-lg ${isDark ? 'hover:bg-orange-900/40' : 'hover:bg-orange-200'}`}
              title={collapsed.expiring_week ? 'Expand' : 'Collapse'}
            >
              {collapsed.expiring_week ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            {alerts.expiring_week.length > 0 && (
              <button
                onClick={() => acknowledgeAll(filterAlerts(sortAlerts(alerts.expiring_week)))}
                className={`ml-2 px-2 py-1 text-xs rounded-lg ${isDark ? 'bg-orange-800 text-orange-100 hover:bg-orange-700' : 'bg-orange-200 text-orange-800 hover:bg-orange-300'}`}
                title="Acknowledge All"
              >
                Ack All
              </button>
            )}
          </div>
          {!collapsed.expiring_week && (
            <div className="space-y-3">
            {alerts.expiring_week.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>
                No products expiring this week
              </p>
            ) : (
              filterAlerts(sortAlerts(alerts.expiring_week)).map(alert => renderAlertCard(alert, 'expiring_week'))
            )}
            </div>
          )}
        </div>

        {/* Expiring Within 30 Days */}
        <div>
          <div className={`flex items-center space-x-2 mb-3 p-3 rounded-lg ${
            isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'
          }`}>
            <Calendar className="h-5 w-5 text-yellow-600" />
            <h4 className={`font-semibold ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
              {getAlertTitle('expiring_soon')}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-200 text-yellow-800'
            }`}>
              {alerts.expiring_soon.length}
            </span>
            <button
              onClick={() => setCollapsed(c => ({ ...c, expiring_soon: !c.expiring_soon }))}
              className={`ml-auto p-2 rounded-lg ${isDark ? 'hover:bg-yellow-900/40' : 'hover:bg-yellow-200'}`}
              title={collapsed.expiring_soon ? 'Expand' : 'Collapse'}
            >
              {collapsed.expiring_soon ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            {alerts.expiring_soon.length > 0 && (
              <button
                onClick={() => acknowledgeAll(filterAlerts(sortAlerts(alerts.expiring_soon)))}
                className={`ml-2 px-2 py-1 text-xs rounded-lg ${isDark ? 'bg-yellow-800 text-yellow-100 hover:bg-yellow-700' : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'}`}
                title="Acknowledge All"
              >
                Ack All
              </button>
            )}
          </div>
          {!collapsed.expiring_soon && (
            <div className="space-y-3">
            {alerts.expiring_soon.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>
                No products expiring soon
              </p>
            ) : (
              filterAlerts(sortAlerts(alerts.expiring_soon)).map(alert => renderAlertCard(alert, 'expiring_soon'))
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpiryAlertsPanel;
