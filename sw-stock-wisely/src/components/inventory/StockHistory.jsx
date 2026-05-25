import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Calendar, Download, RefreshCw } from 'lucide-react';
import { stockHistoryAPI } from '../../api';

const StockHistory = () => {
  const { isDark } = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });
  const [stockSummary, setStockSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchDailyStockSummary();
  }, [selectedDate]);
  
  const fetchDailyStockSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = formatDate(selectedDate);
      const response = await stockHistoryAPI.getDailySummary(dateStr);
      
      if (response.data.success) {
        setStockSummary(response.data.summary || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch stock history');
      }
    } catch (err) {
      console.error('Error fetching stock history:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch stock history');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const handleQuickDate = (daysAgo) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() - daysAgo);
    setSelectedDate(newDate);
  };
  
  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };
  
  const isSelectedDate = (daysAgo) => {
    const compareDate = new Date();
    compareDate.setDate(compareDate.getDate() - daysAgo);
    return formatDate(compareDate) === formatDate(selectedDate);
  };
  
  const handleExport = () => {
    // Simple CSV export
    const headers = ['Product', 'Category', 'Opening', 'Sales', 'Purchases', 'Returns In', 'Returns Out', 'Adjustments', 'Losses', 'Closing', 'Net Change'];
    const rows = stockSummary.map(item => [
      item.product_name,
      item.category,
      item.opening_stock,
      item.sales,
      item.purchases,
      item.returns_in,
      item.returns_out,
      item.adjustments,
      item.losses,
      item.closing_stock,
      item.net_change
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-history-${formatDate(selectedDate)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const totals = stockSummary.reduce((acc, item) => ({
    opening: acc.opening + (item.opening_stock || 0),
    sales: acc.sales + (item.sales || 0),
    purchases: acc.purchases + (item.purchases || 0),
    returnsIn: acc.returnsIn + (item.returns_in || 0),
    returnsOut: acc.returnsOut + (item.returns_out || 0),
    adjustments: acc.adjustments + (item.adjustments || 0),
    losses: acc.losses + (item.losses || 0),
    closing: acc.closing + (item.closing_stock || 0),
    netChange: acc.netChange + (item.net_change || 0)
  }), {
    opening: 0,
    sales: 0,
    purchases: 0,
    returnsIn: 0,
    returnsOut: 0,
    adjustments: 0,
    losses: 0,
    closing: 0,
    netChange: 0
  });
  
  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Select Date
          </h3>
          <button
            onClick={fetchDailyStockSummary}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={() => handleQuickDate(1)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSelectedDate(1)
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Yesterday
          </button>
          <button 
            onClick={() => handleQuickDate(2)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSelectedDate(2)
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            2 Days Ago
          </button>
          <button 
            onClick={() => handleQuickDate(7)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSelectedDate(7)
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last Week
          </button>
          <button 
            onClick={() => handleQuickDate(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSelectedDate(30)
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last Month
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Date
            </label>
            <input
              type="date"
              value={formatDate(selectedDate)}
              onChange={handleDateChange}
              max={formatDate(new Date())}
              className={`w-full px-3 py-2 border rounded-lg ${
                isDark 
                  ? 'bg-gray-900 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div className="text-sm">
            <p className={`font-semibold text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              📅 Showing stock for:
            </p>
            <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {formatDisplayDate(selectedDate)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Stock Summary Table */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Stock Summary - {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <button
            onClick={handleExport}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
              isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
            </div>
          ) : error ? (
            <div className={`p-4 m-4 rounded-lg ${isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
              Error: {error}
            </div>
          ) : stockSummary.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No stock data available for this date
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <th className={`p-3 text-left border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>Product</th>
                  <th className={`p-3 text-right border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>Opening</th>
                  <th className={`p-3 text-right border ${isDark ? 'bg-green-900/30 border-gray-600' : 'bg-green-50 border-gray-300'}`}>Sales</th>
                  <th className={`p-3 text-right border ${isDark ? 'bg-blue-900/30 border-gray-600' : 'bg-blue-50 border-gray-300'}`}>Purchases</th>
                  <th className={`p-3 text-right border ${isDark ? 'bg-yellow-900/30 border-gray-600' : 'bg-yellow-50 border-gray-300'}`}>Returns In</th>
                  <th className={`p-3 text-right border ${isDark ? 'bg-orange-900/30 border-gray-600' : 'bg-orange-50 border-gray-300'}`}>Returns Out</th>
                  <th className={`p-3 text-right border ${isDark ? 'bg-purple-900/30 border-gray-600' : 'bg-purple-50 border-gray-300'}`}>Adjustments</th>
                  <th className={`p-3 text-right border ${isDark ? 'bg-red-900/30 border-gray-600' : 'bg-red-50 border-gray-300'}`}>Losses</th>
                  <th className={`p-3 text-right border font-bold ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>Closing</th>
                  <th className={`p-3 text-right border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>Net Change</th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.map((item) => (
                  <tr key={item.product_id} className={`hover:${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <td className={`p-3 border font-medium ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>
                      {item.product_name}
                      <span className={`text-xs ml-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        ({item.category})
                      </span>
                    </td>
                    <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>
                      {item.opening_stock}
                    </td>
                    <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-red-400' : 'border-gray-300 text-red-600'}`}>
                      {item.sales > 0 && '-'}{item.sales}
                    </td>
                    <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-green-400' : 'border-gray-300 text-green-600'}`}>
                      {item.purchases > 0 && '+'}{item.purchases}
                    </td>
                    <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-green-400' : 'border-gray-300 text-green-600'}`}>
                      {item.returns_in > 0 && '+'}{item.returns_in}
                    </td>
                    <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-red-400' : 'border-gray-300 text-red-600'}`}>
                      {item.returns_out > 0 && '-'}{item.returns_out}
                    </td>
                    <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>
                      {item.adjustments > 0 && '+'}
                      {item.adjustments < 0 && ''}
                      {item.adjustments}
                    </td>
                    <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-red-400' : 'border-gray-300 text-red-600'}`}>
                      {item.losses > 0 && '-'}{item.losses}
                    </td>
                    <td className={`p-3 text-right border font-bold ${isDark ? 'bg-gray-700/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300'}`}>
                      {item.closing_stock}
                    </td>
                    <td className={`p-3 text-right border font-semibold ${
                      item.net_change > 0 
                        ? (isDark ? 'text-green-400' : 'text-green-600')
                        : item.net_change < 0 
                          ? (isDark ? 'text-red-400' : 'text-red-600')
                          : (isDark ? 'text-gray-400' : 'text-gray-600')
                    } ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                      {item.net_change > 0 && '+'}
                      {item.net_change}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`${isDark ? 'bg-gray-700 font-bold' : 'bg-gray-100 font-bold'}`}>
                  <td className={`p-3 border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>TOTAL</td>
                  <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>
                    {totals.opening}
                  </td>
                  <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-red-400' : 'border-gray-300 text-red-600'}`}>
                    -{totals.sales}
                  </td>
                  <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-green-400' : 'border-gray-300 text-green-600'}`}>
                    +{totals.purchases}
                  </td>
                  <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-green-400' : 'border-gray-300 text-green-600'}`}>
                    +{totals.returnsIn}
                  </td>
                  <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-red-400' : 'border-gray-300 text-red-600'}`}>
                    -{totals.returnsOut}
                  </td>
                  <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>
                    {totals.adjustments}
                  </td>
                  <td className={`p-3 text-right border ${isDark ? 'border-gray-600 text-red-400' : 'border-gray-300 text-red-600'}`}>
                    -{totals.losses}
                  </td>
                  <td className={`p-3 text-right border font-bold ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>
                    {totals.closing}
                  </td>
                  <td className={`p-3 text-right border ${
                    totals.netChange >= 0
                      ? (isDark ? 'text-green-400' : 'text-green-600')
                      : (isDark ? 'text-red-400' : 'text-red-600')
                  } ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                    {totals.netChange >= 0 && '+'}
                    {totals.netChange}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Stock In
          </h4>
          <p className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
            +{totals.purchases + totals.returnsIn}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Purchases + Returns In
          </p>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Stock Out
          </h4>
          <p className={`text-3xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            -{totals.sales + totals.returnsOut + totals.losses}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Sales + Returns Out + Losses
          </p>
        </div>
        
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Net Change
          </h4>
          <p className={`text-3xl font-bold ${
            totals.netChange >= 0
              ? (isDark ? 'text-green-400' : 'text-green-600')
              : (isDark ? 'text-red-400' : 'text-red-600')
          }`}>
            {totals.netChange >= 0 && '+'}
            {totals.netChange}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Overall stock change
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockHistory;
