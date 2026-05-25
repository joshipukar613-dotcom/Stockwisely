import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  X, 
  Package, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getExpiryStatus, calculateWeightedAveragePrice } from '../../utils/batchUtils';

function BatchDetailsModal({ isOpen, onClose, product }) {
  const { isDark } = useTheme();

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

  const getBatchStatus = (batch) => {
    if (batch.isExpired) {
      return {
        status: 'expired',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: <AlertTriangle className="h-4 w-4" />,
        text: 'Expired'
      };
    }
    
    if (batch.quantityRemaining === 0) {
      return {
        status: 'empty',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: <Package className="h-4 w-4" />,
        text: 'Empty'
      };
    }
    
    const expiryStatus = getExpiryStatus(batch.expiryDate);
    return {
      status: expiryStatus.type,
      color: expiryStatus.color,
      bgColor: expiryStatus.bgColor,
      icon: <CheckCircle className="h-4 w-4" />,
      text: expiryStatus.message
    };
  };

  const averagePrice = calculateWeightedAveragePrice(product.batches || []);
  const totalQuantity = product.batches?.reduce((sum, batch) => sum + batch.quantityRemaining, 0) || 0;
  const totalValue = product.batches?.reduce((sum, batch) => sum + (batch.purchasePrice * batch.quantityRemaining), 0) || 0;

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
                Batch Details
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {product.name} ({product.sku})
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Package className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Total Batches
                </span>
              </div>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {product.batches?.length || 0}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Package className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Total Quantity
                </span>
              </div>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {totalQuantity}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Average Price
                </span>
              </div>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {formatCurrency(averagePrice)}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Total Value
                </span>
              </div>
              <p className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {formatCurrency(totalValue)}
              </p>
            </div>
          </div>

          {/* Batches Table */}
          <div className={`border rounded-lg overflow-hidden ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className={`${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            } px-6 py-3 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Batch Information
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Batch Number
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Purchase Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Expiry Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Original Qty
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Remaining Qty
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Purchase Price
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y ${
                  isDark ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  {product.batches?.map((batch, index) => {
                    const batchStatus = getBatchStatus(batch);
                    return (
                      <tr key={batch.id || index} className={`hover:${
                        isDark ? 'bg-gray-700' : 'bg-gray-50'
                      } transition-colors`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {batch.batchNumber}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                          {formatDate(batch.purchaseDate)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                          {formatDate(batch.expiryDate)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                          {batch.quantity}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isDark ? 'text-gray-300' : 'text-gray-900'
                        }`}>
                          {batch.quantityRemaining}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {formatCurrency(batch.purchasePrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${batchStatus.bgColor} ${batchStatus.color}`}>
                            {batchStatus.icon}
                            <span className="ml-1">{batchStatus.text}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Average Price Calculation */}
          {product.batches && product.batches.length > 1 && (
            <div className={`mt-6 p-4 rounded-lg border ${
              isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'
            }`}>
              <h4 className={`text-sm font-semibold mb-2 ${
                isDark ? 'text-indigo-200' : 'text-indigo-800'
              }`}>
                Average Price Calculation
              </h4>
              <p className={`text-sm ${
                isDark ? 'text-indigo-300' : 'text-indigo-700'
              }`}>
                Weighted average based on remaining quantities: {formatCurrency(averagePrice)}
              </p>
              <div className={`text-xs mt-1 ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                Formula: (Sum of Price × Remaining Quantity) ÷ Total Remaining Quantity
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BatchDetailsModal;
