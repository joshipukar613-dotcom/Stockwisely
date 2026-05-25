import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Download,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Eye,
  Printer,
  Mail,
  Share2,
  RefreshCw,
  AlertTriangle,
  Package,
  DollarSign,
  Activity,
  Target,
  Users,
  ShoppingCart,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  BarChart
} from 'lucide-react';

function InventoryReports({ products, salesData = [], purchaseData = [], onTabChange }) {
  const { isDark } = useTheme();
  const [selectedReport, setSelectedReport] = useState('inventory_summary');
  const [dateRange, setDateRange] = useState('30d');
  const [exportFormat, setExportFormat] = useState('pdf');

  // Calculate comprehensive report data
  const reportData = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

    // Category analysis
    const categoryAnalysis = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          count: 0,
          value: 0,
          stock: 0,
          avgPrice: 0,
          products: []
        };
      }
      acc[product.category].count++;
      acc[product.category].value += product.price * product.stock;
      acc[product.category].stock += product.stock;
      acc[product.category].products.push(product);
      return acc;
    }, {});

    // Calculate average prices
    Object.keys(categoryAnalysis).forEach(category => {
      const cat = categoryAnalysis[category];
      cat.avgPrice = cat.value / cat.stock || 0;
    });

    // Stock status analysis
    const stockStatus = {
      inStock: products.filter(p => p.stock > p.minStock).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
      outOfStock: products.filter(p => p.stock === 0).length
    };

    // Top products by value
    const topProductsByValue = [...products]
      .sort((a, b) => (b.price * b.stock) - (a.price * a.stock))
      .slice(0, 10);

    // Top products by stock
    const topProductsByStock = [...products]
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 10);

    // Expiry analysis
    const expiryAnalysis = {
      expiringSoon: products.filter(p => {
        if (!p.nearestExpiryDate) return false;
        const expiryDate = new Date(p.nearestExpiryDate);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
      }).length,
      expired: products.filter(p => {
        if (!p.nearestExpiryDate) return false;
        const expiryDate = new Date(p.nearestExpiryDate);
        const today = new Date();
        return expiryDate < today;
      }).length,
      noExpiry: products.filter(p => !p.nearestExpiryDate).length
    };

    // Supplier analysis
    const supplierAnalysis = products.reduce((acc, product) => {
      if (!acc[product.supplier]) {
        acc[product.supplier] = {
          count: 0,
          value: 0,
          stock: 0
        };
      }
      acc[product.supplier].count++;
      acc[product.supplier].value += product.price * product.stock;
      acc[product.supplier].stock += product.stock;
      return acc;
    }, {});

    return {
      totalProducts,
      totalValue,
      totalStock,
      categoryAnalysis,
      stockStatus,
      topProductsByValue,
      topProductsByStock,
      expiryAnalysis,
      supplierAnalysis
    };
  }, [products]);

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const reports = [
    {
      id: 'inventory_summary',
      title: 'Inventory Summary',
      description: 'Overview of total inventory value, stock levels, and key metrics',
      icon: BarChart3,
      color: 'blue'
    },
    {
      id: 'category_analysis',
      title: 'Category Analysis',
      description: 'Detailed breakdown of inventory by product categories',
      icon: PieChart,
      color: 'green'
    },
    {
      id: 'stock_status',
      title: 'Stock Status Report',
      description: 'Analysis of stock levels and reorder recommendations',
      icon: Package,
      color: 'yellow'
    },
    {
      id: 'top_products',
      title: 'Top Products',
      description: 'Best performing products by value and stock levels',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      id: 'expiry_analysis',
      title: 'Expiry Analysis',
      description: 'Products expiring soon and expired items tracking',
      icon: Clock,
      color: 'red'
    },
    {
      id: 'supplier_analysis',
      title: 'Supplier Analysis',
      description: 'Inventory distribution across different suppliers',
      icon: Users,
      color: 'indigo'
    },
    {
      id: 'sales_returns',
      title: 'Sales Returns Analysis',
      description: 'Analysis of returned products, reasons, and refund trends',
      icon: RotateCcw,
      color: 'red'
    },
    {
      id: 'purchase_returns',
      title: 'Purchase Returns Analysis',
      description: 'Analysis of returned purchases to vendors',
      icon: RotateCcw,
      color: 'orange'
    }
  ];

  const renderInventorySummary = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Products
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {formatNumber(reportData.totalProducts)}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Value
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {formatCurrency(reportData.totalValue)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Stock Units
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                {formatNumber(reportData.totalStock)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Stock Status Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-900 dark:text-green-100">
                In Stock
              </div>
              <div className="text-2xl font-bold text-green-600">
                {reportData.stockStatus.inStock}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Low Stock
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {reportData.stockStatus.lowStock}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <XCircle className="h-6 w-6 text-red-600" />
            <div>
              <div className="text-sm font-medium text-red-900 dark:text-red-100">
                Out of Stock
              </div>
              <div className="text-2xl font-bold text-red-600">
                {reportData.stockStatus.outOfStock}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategoryAnalysis = () => (
    <div className="space-y-6">
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Category Breakdown
        </h3>
        <div className="space-y-4">
          {Object.entries(reportData.categoryAnalysis).map(([category, data]) => (
            <div key={category} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                <div>
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {category}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {data.count} products
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(data.value)}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatNumber(data.stock)} units
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStockStatus = () => (
    <div className="space-y-6">
      {/* Low Stock Items */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Low Stock Items
        </h3>
        <div className="space-y-3">
          {products.filter(p => p.stock > 0 && p.stock <= p.minStock).map(product => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div>
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-500">
                  Current: {product.stock} | Min: {product.minStock}
                </div>
              </div>
              <button className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700">
                Reorder
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Out of Stock Items */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Out of Stock Items
        </h3>
        <div className="space-y-3">
          {products.filter(p => p.stock === 0).map(product => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div>
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-500">
                  SKU: {product.sku} | Category: {product.category}
                </div>
              </div>
              <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                Urgent Reorder
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTopProducts = () => (
    <div className="space-y-6">
      {/* Top Products by Value */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Top Products by Value
        </h3>
        <div className="space-y-3">
          {reportData.topProductsByValue.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.category}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(product.price * product.stock)}</div>
                <div className="text-sm text-gray-500">{product.stock} units</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products by Stock */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Top Products by Stock Quantity
        </h3>
        <div className="space-y-3">
          {reportData.topProductsByStock.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.category}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatNumber(product.stock)} units</div>
                <div className="text-sm text-gray-500">{formatCurrency(product.price)} each</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderExpiryAnalysis = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                Expiring Soon
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-orange-200' : 'text-orange-800'} mt-1`}>
                {reportData.expiryAnalysis.expiringSoon}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                Expired
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-red-200' : 'text-red-800'} mt-1`}>
                {reportData.expiryAnalysis.expired}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className={`${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                No Expiry
              </p>
              <p className={`text-2xl font-bold ${isDark ? 'text-green-200' : 'text-green-800'} mt-1`}>
                {reportData.expiryAnalysis.noExpiry}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSupplierAnalysis = () => (
    <div className="space-y-6">
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Supplier Distribution
        </h3>
        <div className="space-y-4">
          {Object.entries(reportData.supplierAnalysis).map(([supplier, data]) => (
            <div key={supplier} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-4">
                <Users className="h-5 w-5 text-indigo-600" />
                <div>
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {supplier}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {data.count} products
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(data.value)}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatNumber(data.stock)} units
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'inventory_summary':
        return renderInventorySummary();
      case 'category_analysis':
        return renderCategoryAnalysis();
      case 'stock_status':
        return renderStockStatus();
      case 'top_products':
        return renderTopProducts();
      case 'expiry_analysis':
        return renderExpiryAnalysis();
      case 'supplier_analysis':
        return renderSupplierAnalysis();
      case 'sales_returns':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RotateCcw className="h-16 w-16 text-red-500 mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">Detailed Returns Analytics</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Comprehensive returns tracking including reasons, top returned items, and refund history is available in the dedicated Returns tab.
            </p>
            <button
              onClick={() => {
                if (onTabChange) {
                  onTabChange('returns');
                  // Scroll to top to ensure the user sees the new content
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  console.warn("onTabChange prop is missing in InventoryReports");
                  alert("Please select the 'Sales Returns' tab at the top of the Reports page for full details.");
                }
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all hover:shadow-md active:scale-95"
            >
              Go to Sales Returns
            </button>
          </div>
        );
      case 'purchase_returns':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RotateCcw className="h-16 w-16 text-orange-500 mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">Detailed Purchase Returns Analytics</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              Comprehensive purchase returns tracking including reasons, top returned items, and refund history is available in the dedicated Purchase Returns tab.
            </p>
            <button
              onClick={() => {
                if (onTabChange) {
                  onTabChange('purchase-returns');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  console.warn("onTabChange prop is missing in InventoryReports");
                  alert("Please select the 'Purchase Returns' tab at the top of the Reports page for full details.");
                }
              }}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all hover:shadow-md active:scale-95"
            >
              Go to Purchase Returns
            </button>
          </div>
        );
      default:
        return renderInventorySummary();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Inventory Reports
          </h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Comprehensive inventory analysis and reporting
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className={`px-3 py-2 border rounded-lg ${isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
              }`}
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>
          <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`p-4 border rounded-lg text-left transition-colors ${selectedReport === report.id
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : `${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`
              }`}
          >
            <div className="flex items-center space-x-3 mb-2">
              <report.icon className={`h-5 w-5 ${selectedReport === report.id ? 'text-indigo-600' : 'text-gray-500'
                }`} />
              <h3 className={`font-semibold ${selectedReport === report.id
                ? 'text-indigo-900 dark:text-indigo-100'
                : isDark ? 'text-white' : 'text-gray-900'
                }`}>
                {report.title}
              </h3>
            </div>
            <p className={`text-sm ${selectedReport === report.id
              ? 'text-indigo-700 dark:text-indigo-300'
              : isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
              {report.description}
            </p>
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
        {renderReportContent()}
      </div>
    </div>
  );
}

InventoryReports.propTypes = {
  products: PropTypes.array,
  salesData: PropTypes.array,
  purchaseData: PropTypes.array,
  onTabChange: PropTypes.func
};

export default InventoryReports;
