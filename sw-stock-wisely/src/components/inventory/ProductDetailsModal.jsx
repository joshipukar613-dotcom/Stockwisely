import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { inventoryAPI } from '../../api';
import { 
  X, 
  Package, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Hash,
  Tag,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { getExpiryStatus, calculateWeightedAveragePrice } from '../../utils/batchUtils';

function ProductDetailsModal({ isOpen, onClose, product }) {
  const { isDark } = useTheme();
  const [batchData, setBatchData] = useState({ batches: [], weighted_avg: 0, total_remaining: 0 });
  const [loadingBatches, setLoadingBatches] = useState(false);

  useEffect(() => {
    if (isOpen && product?.sku) {
      const fetchBatches = async () => {
        try {
          setLoadingBatches(true);
          const res = await inventoryAPI.getProductBatches(product.sku);
          if (res.data.success) {
            setBatchData(res.data.data);
          }
        } catch (err) {
          console.error('Failed to fetch batches:', err);
        } finally {
          setLoadingBatches(false);
        }
      };
      fetchBatches();
    }
  }, [isOpen, product?.sku]);

  if (!isOpen || !product) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No expiry';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const getStockStatus = (stock, minStock) => {
    if (stock === 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertTriangle className="h-4 w-4" /> };
    if (stock <= minStock) return { status: 'low', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: <Clock className="h-4 w-4" /> };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle className="h-4 w-4" /> };
  };

  const getExpiryStatusInfo = (expiryDate) => {
    if (!expiryDate) return { status: 'no_expiry', color: 'text-gray-500', bg: 'bg-gray-100', message: 'No expiry' };
    return getExpiryStatus(expiryDate);
  };

  const stockStatus = getStockStatus(product.stock, product.minStock);
  const expiryStatus = getExpiryStatusInfo(product.nearestExpiryDate);
  const averagePrice = batchData.weighted_avg || product.averagePrice || product.price;
  const totalValue = averagePrice * product.stock;
  const vatAmount = totalValue * 0.13; // 13% VAT for Nepal

  const totalWithVAT = totalValue + vatAmount;

  const priceVariance = product.averagePrice && product.price ? 
    ((product.price - product.averagePrice) / product.averagePrice) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Product Details
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Complete information and analytics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Product Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Package className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Current Stock
                </span>
              </div>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {product.stock}
              </p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                  {stockStatus.icon}
                  <span className="ml-1">
                    {stockStatus.status === 'out' ? 'Out of Stock' : 
                     stockStatus.status === 'low' ? 'Low Stock' : 'In Stock'}
                  </span>
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Unit Price
                </span>
              </div>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {formatCurrency(product.price)}
              </p>
              {product.averagePrice && product.averagePrice !== product.price && (
                <div className={`text-xs mt-1 flex items-center ${
                  priceVariance > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {priceVariance > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(priceVariance).toFixed(1)}% vs avg
                </div>
              )}
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Total Value
                </span>
              </div>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {formatCurrency(totalWithVAT)}
              </p>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                incl. 13% VAT
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Expiry Status
                </span>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${expiryStatus.bgColor} ${expiryStatus.color}`}>
                  {expiryStatus.message}
                </span>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <div className={`border rounded-lg overflow-hidden ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`${
                isDark ? 'bg-gray-700' : 'bg-gray-50'
              } px-6 py-3 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Basic Information
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Package className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Product Name
                    </span>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Hash className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SKU
                    </span>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.sku}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Tag className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Category
                    </span>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Registration Date
                    </span>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.registrationDate ? formatDate(product.registrationDate) : 'Not available'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Supplier
                    </span>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.supplier}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Location
                    </span>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock & Pricing Information */}
            <div className={`border rounded-lg overflow-hidden ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`${
                isDark ? 'bg-gray-700' : 'bg-gray-50'
              } px-6 py-3 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Stock & Pricing
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Current Stock
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {product.stock} units
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Minimum Stock Level
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {product.minStock} units
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Unit Price
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(product.price)}
                  </span>
                </div>

                {product.averagePrice && (
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Average Price
                    </span>
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(product.averagePrice)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Total Value (excl. VAT)
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(totalValue)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    VAT (13%)
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(vatAmount)}
                  </span>
                </div>

                <div className={`flex justify-between items-center pt-2 border-t ${
                  isDark ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <span className={`text-sm font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Total Value (incl. VAT)
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(totalWithVAT)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className={`border rounded-lg overflow-hidden mb-6 ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`${
                isDark ? 'bg-gray-700' : 'bg-gray-50'
              } px-6 py-3 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Description
                </h3>
              </div>
              <div className="p-6">
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {product.description}
                </p>
              </div>
            </div>
          )}

          {/* Batch Information */}
          <div className={`border rounded-lg overflow-hidden ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className={`${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            } px-6 py-3 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Active FIFO Stock Batches ({batchData.batches.length})
              </h3>
              <div className={`text-sm font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Weighted Avg Cost: {formatCurrency(batchData.weighted_avg)}
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className={`text-xs uppercase ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>
                  <tr>
                    <th className="px-6 py-3">Batch Date</th>
                    <th className="px-6 py-3">Vendor</th>
                    <th className="px-6 py-3 text-right">Added</th>
                    <th className="px-6 py-3 text-right">Remaining</th>
                    <th className="px-6 py-3 text-right">Cost</th>
                    <th className="px-6 py-3 text-right">MRP</th>
                    <th className="px-6 py-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loadingBatches ? (
                    <tr><td colSpan="7" className="px-6 py-4 text-center">Loading batches...</td></tr>
                  ) : batchData.batches.length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-4 text-center">No active batches found for this product.</td></tr>
                  ) : (
                    batchData.batches.map((batch) => (
                      <tr key={batch.id}>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          {new Date(batch.batch_date).toLocaleDateString()}
                        </td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          {batch.vendor_name || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          {batch.quantity_added}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${
                          Number(batch.quantity_remaining) < (Number(batch.quantity_added) * 0.1) 
                          ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')
                        }`}>
                          {batch.quantity_remaining}
                        </td>
                        <td className={`px-6 py-4 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          {formatCurrency(batch.cost_price)}
                        </td>
                        <td className={`px-6 py-4 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          {formatCurrency(batch.mrp)}
                        </td>
                        <td className={`px-6 py-4 text-right font-semibold ${
                          Number(batch.profit_margin) > 20 ? 'text-green-500' : 'text-orange-500'
                        }`}>
                          {Number(batch.profit_margin || 0).toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsModal;
