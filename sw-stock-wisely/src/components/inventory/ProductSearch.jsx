import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, X } from 'lucide-react';
import { inventoryAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';

const ProductSearch = ({ onSelect, className = '', onQueryChange, onResultsChange }) => {
  const { isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const response = await inventoryAPI.getProducts({ search: query, limit: 10 });
          setResults(response.data.data || []);
          setIsOpen(true);
          if (onResultsChange) onResultsChange(response.data.data || []);
        } catch (error) {
          console.error('Product search error:', error);
          setResults([]);
          if (onResultsChange) onResultsChange([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
        if (onResultsChange) onResultsChange([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (product) => {
    onSelect(product);
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onQueryChange) onQueryChange(e.target.value);
          }}
          placeholder="Search product..."
          className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
        <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`} />
        {loading && (
          <Loader className={`absolute right-3 top-2.5 h-4 w-4 animate-spin ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`} />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {results.map((product) => (
            <div
              key={product.product_code}
              onClick={() => handleSelect(product)}
              className={`p-3 cursor-pointer transition-colors border-b last:border-0 ${
                isDark 
                  ? 'border-gray-700 hover:bg-gray-700 text-gray-200' 
                  : 'border-gray-100 hover:bg-gray-50 text-gray-900'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{product.description}</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Code: {product.product_code}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-indigo-500">
                    Rs. {Number(product.price).toLocaleString()}
                  </div>
                  <div className={`text-xs ${
                    product.stock_quantity > 0 
                      ? (isDark ? 'text-green-400' : 'text-green-600') 
                      : 'text-red-500'
                  }`}>
                    Stock: {product.stock_quantity}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div className={`absolute z-50 w-full mt-1 p-4 rounded-lg shadow-lg border text-center ${
          isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
        }`}>
          No products found
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
