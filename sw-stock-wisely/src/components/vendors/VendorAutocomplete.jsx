import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { vendorsAPI } from '../../api';
import { Search, Loader, Plus } from 'lucide-react';
import AddVendorModal from './AddVendorModal';

function highlightMatch(text, query, isDark) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <span>
      {before}
      <span className={isDark ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800'}>{match}</span>
      {after}
    </span>
  );
}

const VendorAutocomplete = ({ value, onSelectVendor, className = '' }) => {
  const { isDark } = useTheme();
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showAddModal, setShowAddModal] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      try {
        setLoading(true);
        const res = await vendorsAPI.search(q);
        const data = res.data?.data || [];
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        setResults([]);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex === results.length) {
        setShowAddModal(true);
      } else if (focusedIndex >= 0 && results[focusedIndex]) {
        selectVendor(results[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  const selectVendor = (vendor) => {
    onSelectVendor?.(vendor);
    setQuery(vendor.name || '');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter vendor name"
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

      {isOpen && (results.length > 0 || query.length >= 2) && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-72 overflow-y-auto ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {results.map((v, idx) => (
            <div
              key={v.id}
              onClick={() => selectVendor(v)}
              onMouseEnter={() => setFocusedIndex(idx)}
              className={`p-3 cursor-pointer transition-colors border-b last:border-0 ${
                focusedIndex === idx 
                  ? (isDark ? 'bg-gray-700' : 'bg-gray-100')
                  : ''
              } ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {highlightMatch(v.name || '', query, isDark)}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {v.contact_person || '—'}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{v.email || ''}</div>
                  <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{v.phone || ''}</div>
                </div>
              </div>
            </div>
          ))}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className={`p-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No vendors found
            </div>
          )}

          <div
            onClick={() => setShowAddModal(true)}
            onMouseEnter={() => setFocusedIndex(results.length)}
            className={`flex items-center justify-between p-3 cursor-pointer ${
              focusedIndex === results.length 
                ? (isDark ? 'bg-gray-700' : 'bg-gray-100')
                : ''
            } ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center space-x-2">
              <Plus className={`h-4 w-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={isDark ? 'text-indigo-300' : 'text-indigo-700'}>Add New Vendor</span>
            </div>
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Enter</span>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddVendorModal
          isOpen={showAddModal}
          presetName={query.trim()}
          onClose={() => setShowAddModal(false)}
          onCreated={(vendor) => {
            setShowAddModal(false);
            selectVendor(vendor);
          }}
        />
      )}
    </div>
  );
};

export default VendorAutocomplete;
