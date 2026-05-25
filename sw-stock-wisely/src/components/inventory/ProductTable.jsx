import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Edit, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  Package,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { 
  getExpiryStatus
} from '../../utils/batchUtils';

function ProductTable({ products, onEdit, onDelete, onView, onViewDetails, canEdit = true }) {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showLowOnly, setShowLowOnly] = useState(false);

  // Use shared categories from data, but prefix with 'all' for the filter
  const categories = useMemo(() => {
    try {
      const { categories: baseCategories } = require('../../data/inventoryData');
      return ['all', ...baseCategories];
    } catch (e) {
      // Fallback in unlikely case dynamic import fails
      return ['all'];
    }
  }, []);

  // Calculate VAT amount (13% for Nepal)
  const calculateVAT = (amount) => {
    return amount * 0.13;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      const isLowOrOut = product.stock === 0 || product.stock <= product.minStock;
      const matchesLowToggle = showLowOnly ? isLowOrOut : true;
      return matchesSearch && matchesCategory && matchesLowToggle;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStockStatus = (stock, minStock) => {
    if (stock === 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-100' };
    if (stock <= minStock) return { status: 'low', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className={`${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border rounded-lg overflow-hidden`}>
      {/* Header with Search and Filter */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
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
            
            <div className="relative">
              <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowLowOnly(prev => !prev)}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                isDark
                  ? showLowOnly
                    ? 'bg-red-900/30 border-red-800 text-red-300'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  : showLowOnly
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Toggle to show only low or out-of-stock items"
            >
              {showLowOnly ? 'Showing Low/Out' : 'Low/Out Only'}
            </button>
          </div>
          
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {filteredAndSortedProducts.length} of {products.length} products
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <tr>
              <th 
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Product</span>
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}
                onClick={() => handleSort('sku')}
              >
                <div className="flex items-center space-x-1">
                  <span>SKU</span>
                  <SortIcon field="sku" />
                </div>
              </th>
              <th 
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Category</span>
                  <SortIcon field="category" />
                </div>
              </th>
              
              <th 
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}
                onClick={() => handleSort('nearestExpiryDate')}
              >
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Expiry Date</span>
                  <SortIcon field="nearestExpiryDate" />
                </div>
              </th>
              <th 
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}
                onClick={() => handleSort('stock')}
              >
                <div className="flex items-center space-x-1">
                  <span>Stock</span>
                  <SortIcon field="stock" />
                </div>
              </th>
              <th 
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  isDark ? 'text-gray-300' : 'text-gray-500'
                }`}
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center space-x-1">
                  <span>Unit Price</span>
                  <SortIcon field="price" />
                </div>
              </th>
              
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                isDark ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Status
              </th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                isDark ? 'text-gray-300' : 'text-gray-500'
              }`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y ${
            isDark ? 'divide-gray-700' : 'divide-gray-200'
          }`}>
            {filteredAndSortedProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.minStock);
              return (
                <tr key={product.id} className={`hover:${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                } transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 ${
                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                      } rounded-lg flex items-center justify-center`}>
                        <Package className={`h-5 w-5 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {product.name}
                        </div>
                        {/* Keep table concise: no description here */}
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {product.sku}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {product.category}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const expiryStatus = getExpiryStatus(product.nearestExpiryDate);
                      return (
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${expiryStatus.bgColor} ${expiryStatus.color}`}>
                            {expiryStatus.message}
                          </span>
                          {expiryStatus.type !== 'no_expiry' && (
                            <span className="text-lg">{expiryStatus.icon}</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {product.stock}
                      </span>
                      {stockStatus.status !== 'good' && (
                        <AlertTriangle className={`ml-2 h-4 w-4 ${stockStatus.color}`} />
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formatCurrency(product.price)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      stockStatus.bg
                    } ${stockStatus.color}`}>
                      {stockStatus.status === 'out' ? 'Out of Stock' : 
                       stockStatus.status === 'low' ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onViewDetails && onViewDetails(product)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          isDark 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                        title="View Complete Details"
                      >
                        View Details
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => onEdit(product)}
                            className={`p-1.5 rounded-md hover:${
                              isDark ? 'bg-gray-700' : 'bg-gray-100'
                            } transition-colors`}
                            title="Edit Product"
                          >
                            <Edit className={`h-4 w-4 ${
                              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                            }`} />
                          </button>
                          <button
                            onClick={() => onDelete(product)}
                            className={`p-1.5 rounded-md hover:${
                              isDark ? 'bg-gray-700' : 'bg-gray-100'
                            } transition-colors`}
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSortedProducts.length === 0 && (
        <div className={`text-center py-12 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No products found</p>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}

export default ProductTable;