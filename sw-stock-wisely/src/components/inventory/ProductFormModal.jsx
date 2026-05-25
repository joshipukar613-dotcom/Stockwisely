import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { detectCategory, getAvailableCategories } from '../../utils/categoryDetection';
import { findExistingProduct, generateBatchNumber } from '../../utils/batchUtils';
import { X, Lightbulb, Package, Calendar, DollarSign } from 'lucide-react';

function ProductFormModal({ isOpen, onClose, onSave, editingProduct, allProducts = [], prefilledName }) {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    minStock: '',
    supplier: '',
    // Batch information
    batchNumber: '',
    purchaseDate: '',
    expiryDate: '',
    purchasePrice: '',
    daysBeforeAlert: 30
  });
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [existingProduct, setExistingProduct] = useState(null);
  const [showExistingWarning, setShowExistingWarning] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        sku: editingProduct.sku || '',
        description: editingProduct.description || '',
        category: editingProduct.category || '',
        price: editingProduct.price || '',
        stock: editingProduct.stock || '',
        minStock: editingProduct.minStock || '',
        supplier: editingProduct.supplier || '',
        batchNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        purchasePrice: editingProduct.price || '',
        daysBeforeAlert: 30
      });
    } else {
      setFormData({
        name: prefilledName || '',
        sku: '',
        description: '',
        category: '',
        price: '',
        stock: '',
        minStock: '',
        supplier: '',
        batchNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        purchasePrice: '',
        daysBeforeAlert: 30
      });
    }
    setSuggestedCategory('');
    setShowSuggestion(false);
    setExistingProduct(null);
    setShowExistingWarning(false);
  }, [editingProduct, isOpen, prefilledName]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-detect category when name or description changes
    if (name === 'name' || name === 'description') {
      const nextName = name === 'name' ? value : formData.name;
      const nextDesc = name === 'description' ? value : formData.description;
      const detected = detectCategory(nextName, nextDesc);
      if (detected && detected.category && detected.category !== formData.category) {
        setSuggestedCategory(detected.category);
        setShowSuggestion(true);
      } else {
        setShowSuggestion(false);
      }

      // Check for existing product when name changes (only for new products)
      if (name === 'name' && !editingProduct && value.trim()) {
        const existing = findExistingProduct(allProducts, value.trim());
        if (existing) {
          setExistingProduct(existing);
          setShowExistingWarning(true);
          // Auto-fill some fields from existing product
          setFormData(prev => ({
            ...prev,
            category: existing.category,
            supplier: existing.supplier,
            minStock: existing.minStock,
            purchasePrice: existing.averagePrice || existing.price
          }));
        } else {
          setExistingProduct(null);
          setShowExistingWarning(false);
        }
      }
    }

    // Auto-generate batch number when SKU changes
    if (name === 'sku' && value.trim() && !editingProduct) {
      const batchCount = existingProduct ? existingProduct.totalBatches || 0 : 0;
      const batchNumber = generateBatchNumber(value.trim(), batchCount);
      setFormData(prev => ({
        ...prev,
        batchNumber
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.sku || !formData.price || !formData.stock) {
      alert('Please fill in all required fields: Name, SKU, Price, and Stock');
      return;
    }

    // Validate batch fields for new products
    if (!editingProduct && (!formData.purchaseDate || !formData.purchasePrice)) {
      alert('Please fill in Purchase Date and Purchase Price for the batch');
      return;
    }
    
    // Convert numeric fields
    const processedData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      minStock: parseInt(formData.minStock) || 0,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      daysBeforeAlert: parseInt(formData.daysBeforeAlert) || 30,
      // Add batch information
      batchInfo: {
        batchNumber: formData.batchNumber,
        purchaseDate: formData.purchaseDate,
        expiryDate: formData.expiryDate || null,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        quantity: parseInt(formData.stock) || 0,
        daysBeforeAlert: parseInt(formData.daysBeforeAlert) || 30
      },
      // Add existing product info if applicable
      existingProduct: existingProduct
    };

    onSave(processedData);
  };

  const applySuggestedCategory = () => {
    setFormData(prev => ({
      ...prev,
      category: suggestedCategory
    }));
    setShowSuggestion(false);
  };

  const dismissSuggestion = () => {
    setShowSuggestion(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Basic Product Information */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Basic Product Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter product name"
                  />
                </div>

                {/* Existing Product Warning */}
                {showExistingWarning && existingProduct && (
                  <div className="md:col-span-2">
                    <div className={`p-4 rounded-lg border ${
                      isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-start">
                        <Package className={`h-5 w-5 mt-0.5 mr-3 ${
                          isDark ? 'text-orange-400' : 'text-orange-600'
                        }`} />
                        <div className="flex-1">
                          <h4 className={`text-sm font-semibold ${
                            isDark ? 'text-orange-200' : 'text-orange-800'
                          }`}>
                            Product Already Exists
                          </h4>
                          <p className={`text-sm mt-1 ${
                            isDark ? 'text-orange-300' : 'text-orange-700'
                          }`}>
                            This product already exists with {existingProduct.totalBatches} batch(es) and an average price of Rs. {existingProduct.averagePrice || existingProduct.price}. 
                            Adding this will create a new batch and recalculate the average price.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SKU */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    SKU *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter SKU"
                  />
                </div>

                {/* Category with Auto-Detection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Category *
                  </label>
                  <div className="relative">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select category</option>
                      {getAvailableCategories().map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    
                    {/* Category Suggestion */}
                    {showSuggestion && (
                      <div className={`absolute top-full left-0 right-0 mt-1 p-3 rounded-lg border shadow-lg z-10 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                            <span className="text-sm">
                              Suggested: <strong>{suggestedCategory}</strong>
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={applySuggestedCategory}
                              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={dismissSuggestion}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                isDark 
                                  ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter product description"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="0.00"
                  />
                </div>

                {/* Stock */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Minimum Stock */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Minimum Stock Level *
                  </label>
                  <input
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Supplier
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter supplier name"
                  />
                </div>
              </div>
            </div>

          {/* Batch Information Section */}
          {!editingProduct && (
            <div className="mt-8">
              <div className="flex items-center space-x-2 mb-4">
                <Package className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h3 className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Batch Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Batch Number */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Batch Number
                  </label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Auto-generated"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Leave empty for non-perishable items
                  </p>
                </div>

                {/* Purchase Price */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Purchase Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="0.00"
                  />
                </div>

                {/* Days Before Alert */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Days Before Expiry Alert
                  </label>
                  <input
                    type="number"
                    name="daysBeforeAlert"
                    value={formData.daysBeforeAlert}
                    onChange={handleInputChange}
                    min="1"
                    max="365"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="30"
                  />
                  <p className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Number of days before expiry to show alerts (default: 30)
                  </p>
                </div>
              </div>
            </div>
          )}

          </div>

            {/* Form Actions */}
            <div className={`flex justify-end space-x-3 mt-8 pt-6 border-t ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  isDark 
                    ? 'border-gray-600 text-gray-300' 
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProductFormModal;
