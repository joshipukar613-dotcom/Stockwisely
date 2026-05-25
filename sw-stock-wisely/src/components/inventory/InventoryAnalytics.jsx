import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
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
  XCircle
} from 'lucide-react';

function InventoryAnalytics({ products, salesData = [], purchaseData = [] }) {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState('30d');

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockItems = products.filter(p => p.stock === 0).length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    
    // Category distribution
    const categoryStats = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = { count: 0, value: 0, stock: 0 };
      }
      acc[product.category].count++;
      acc[product.category].value += product.price * product.stock;
      acc[product.category].stock += product.stock;
      return acc;
    }, {});

    // Top performing products (by value)
    const topProducts = [...products]
      .sort((a, b) => (b.price * b.stock) - (a.price * a.stock))
      .slice(0, 5);

    // Stock turnover analysis (simplified)
    const avgStockValue = totalValue / totalProducts || 0;
    const stockTurnoverRate = totalStock > 0 ? (totalValue / totalStock) : 0;

    // Expiry analysis
    const expiringSoon = products.filter(p => {
      if (!p.nearestExpiryDate) return false;
      const expiryDate = new Date(p.nearestExpiryDate);
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays > 0;
    }).length;

    const expiredItems = products.filter(p => {
      if (!p.nearestExpiryDate) return false;
      const expiryDate = new Date(p.nearestExpiryDate);
      const today = new Date();
      return expiryDate < today;
    }).length;

    return {
      totalProducts,
      totalValue,
      lowStockItems,
      outOfStockItems,
      totalStock,
      categoryStats,
      topProducts,
      avgStockValue,
      stockTurnoverRate,
      expiringSoon,
      expiredItems
    };
  }, [products]);

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const getCategoryColor = (index) => {
    const colors = [
      'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
      'bg-violet-500', 'bg-sky-500', 'bg-slate-500', 'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  const analyticsCards = [
    {
      title: 'Total Inventory Value',
      value: formatCurrency(analytics.totalValue),
      icon: DollarSign,
      trend: '+12.5%',
      trendUp: true,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      title: 'Total Products',
      value: formatNumber(analytics.totalProducts),
      icon: Package,
      trend: '+8.2%',
      trendUp: true,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    {
      title: 'Low Stock Alert',
      value: analytics.lowStockItems,
      icon: AlertTriangle,
      trend: analytics.lowStockItems > 0 ? 'Needs Attention' : 'All Good',
      trendUp: analytics.lowStockItems === 0,
      color: analytics.lowStockItems > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      bgColor: analytics.lowStockItems > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: analytics.lowStockItems > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      title: 'Out of Stock',
      value: analytics.outOfStockItems,
      icon: XCircle,
      trend: analytics.outOfStockItems > 0 ? 'Critical' : 'In Stock',
      trendUp: analytics.outOfStockItems === 0,
      color: analytics.outOfStockItems > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
      bgColor: analytics.outOfStockItems > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: analytics.outOfStockItems > 0 ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      title: 'Expiring Soon',
      value: analytics.expiringSoon,
      icon: Clock,
      trend: analytics.expiringSoon > 0 ? 'Check Items' : 'No Issues',
      trendUp: analytics.expiringSoon === 0,
      color: analytics.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      bgColor: analytics.expiringSoon > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: analytics.expiringSoon > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      title: 'Stock Turnover',
      value: analytics.stockTurnoverRate.toFixed(1),
      icon: Activity,
      trend: 'Good',
      trendUp: true,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Inventory Analytics
        </h2>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyticsCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} ${isDark ? 'dark:bg-gray-800' : ''} border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                  {card.value}
                </p>
                <div className="flex items-center mt-2">
                  {card.trendUp ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400 mr-1" />
                  )}
                  <span className={`text-sm ${card.color}`}>
                    {card.trend}
                  </span>
                </div>
              </div>
              <div className={`${card.iconBg} p-3 rounded-lg`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Distribution and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Category Distribution
            </h3>
            <PieChart className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <div className="space-y-3">
            {Object.entries(analytics.categoryStats).map(([category, stats], index) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`}></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {category}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.count} items
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatCurrency(stats.value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products by Value */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Top Products by Value
            </h3>
            <Target className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <div className="space-y-3">
            {analytics.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getCategoryColor(index)}`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.name}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(product.price * product.stock)}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {product.stock} units
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Quick Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Average Stock Value
              </div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(analytics.avgStockValue)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-900 dark:text-green-100">
                Stock Health
              </div>
              <div className="text-lg font-bold text-green-600">
                {((analytics.totalProducts - analytics.lowStockItems - analytics.outOfStockItems) / analytics.totalProducts * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Activity className="h-5 w-5 text-purple-600" />
            <div>
              <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Total Stock Units
              </div>
              <div className="text-lg font-bold text-purple-600">
                {formatNumber(analytics.totalStock)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryAnalytics;
