import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { forecastingAPI } from '../api';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  Target,
  RefreshCw,
  AlertCircle,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

/* ─── tiny sparkline (pure-CSS bar chart) ─── */
const MiniBar = ({ value, max, color }) => (
  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
    <div
      className={`h-2 rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%` }}
    />
  </div>
);

function AIForecasting() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  /* ─── state ─── */
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [trends, setTrends] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [forecastMonth, setForecastMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceOnline, setServiceOnline] = useState(true);

  /* ─── fetch helpers ─── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, catRes, prodRes, trendRes] = await Promise.all([
        forecastingAPI.getSummary(),
        forecastingAPI.getCategories(),
        forecastingAPI.getProducts({ category: selectedCategory, limit: 15 }),
        forecastingAPI.getTrends({ category: selectedCategory }),
      ]);
      setSummary(sumRes.data.data);
      setCategories(catRes.data.data);
      setForecastMonth(catRes.data.forecastMonth || '');
      setProducts(prodRes.data.data);
      setTrends(trendRes.data.data);
      setServiceOnline(true);
    } catch (err) {
      console.error('Forecast fetch error:', err);
      setError('Could not load forecasts. Make sure the LSTM forecast service is running.');
      setServiceOnline(false);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── category change handler ─── */
  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
  };

  /* ─── derive chart data ─── */
  const chartMax = trends
    ? Math.max(
        ...trends.historical.map((h) => h.actual),
        trends.forecast.predicted || 0
      )
    : 1;

  /* ─── card style helper ─── */
  const card = `rounded-2xl border transition-all duration-200 ${
    isDark ? 'bg-gray-800/60 border-gray-700/50 backdrop-blur-sm' : 'bg-white border-gray-200 shadow-sm'
  }`;

  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const heading = isDark ? 'text-white' : 'text-gray-900';

  /* ─── RENDER ─── */
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''} pt-20 overflow-x-hidden`}>
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">

            {/* ══════ HEADER ══════ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                  <Brain className="h-8 w-8 text-indigo-500" />
                </div>
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold ${heading}`}>
                    AI Demand Forecasting
                  </h1>
                  <p className={`text-sm mt-1 ${subtext}`}>
                    LSTM neural network predictions based on real sales data
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Service status badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  serviceOnline
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${serviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {serviceOnline ? 'LSTM Model Active' : 'Service Offline'}
                </div>

                <button
                  onClick={fetchAll}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isDark
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* ══════ ERROR STATE ══════ */}
            {error && (
              <div className={`mb-8 p-4 rounded-xl flex items-start gap-3 ${
                isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'
              }`}>
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                  <p className={`text-xs mt-1 ${subtext}`}>
                    Run: <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs">python forecast_server.py</code> in the ml-training folder
                  </p>
                </div>
              </div>
            )}

            {/* ══════ LOADING SKELETON ══════ */}
            {loading && !summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className={`${card} p-6 animate-pulse`}>
                      <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-3" />
                      <div className="h-8 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
                    </div>
                  ))}
                </div>
                <div className={`${card} p-6 animate-pulse h-64`}>
                  <div className="h-4 w-40 bg-gray-300 dark:bg-gray-600 rounded" />
                </div>
              </div>
            )}

            {/* ══════ CONTENT ══════ */}
            {summary && (
              <>
                {/* ── SUMMARY CARDS ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {/* Model Info */}
                  <div className={`${card} p-6`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium ${subtext}`}>Forecasting Model</span>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                        <Target className="h-4 w-4 text-emerald-500" />
                      </div>
                    </div>
                    <p className={`text-3xl font-bold ${heading}`}>LSTM</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs ${subtext}`}>R² Score: {summary.modelR2}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400`}>
                        Neural Network
                      </span>
                    </div>
                  </div>

                  {/* Products Tracked */}
                  <div className={`${card} p-6`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium ${subtext}`}>Products Tracked</span>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                        <Package className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                    <p className={`text-3xl font-bold ${heading}`}>{summary.totalProducts.toLocaleString()}</p>
                    <span className={`text-xs ${subtext}`}>
                      Across {summary.totalCategories} categories
                    </span>
                  </div>

                  {/* Demand Change */}
                  <div className={`${card} p-6`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium ${subtext}`}>Predicted Demand</span>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                        <Activity className="h-4 w-4 text-amber-500" />
                      </div>
                    </div>
                    <p className={`text-3xl font-bold ${heading}`}>
                      {summary.totalPredictedDemand.toLocaleString()}
                      <span className="text-lg font-normal ml-1">units</span>
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {summary.demandChange >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${summary.demandChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {summary.demandChange > 0 ? '+' : ''}{summary.demandChange}%
                      </span>
                      <span className={`text-xs ${subtext}`}>vs last month</span>
                    </div>
                  </div>
                </div>

                {/* ── TREND CHART ── */}
                {trends && (
                  <div className={`${card} p-6 mb-8`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-indigo-500" />
                        <div>
                          <h2 className={`text-lg font-semibold ${heading}`}>Demand Trend</h2>
                          <p className={`text-xs ${subtext}`}>Monthly sales with LSTM prediction for {forecastMonth}</p>
                        </div>
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className={`text-sm px-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.category} value={c.category}>{c.category}</option>
                        ))}
                      </select>
                    </div>

                    {/* Simple bar chart */}
                    <div className="flex items-end gap-1 sm:gap-2 h-48">
                      {trends.historical.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                          <div className="relative w-full h-full flex items-end justify-center">
                            {/* Tooltip */}
                            <div className="absolute -top-8 hidden group-hover:block z-10">
                              <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                isDark ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'
                              }`}>
                                {item.actual.toLocaleString()} units
                              </div>
                            </div>
                            <div
                              className="w-full max-w-[40px] bg-indigo-500 rounded-t-md transition-all duration-500 hover:bg-indigo-400"
                              style={{ height: `${Math.max((item.actual / chartMax) * 100, 4)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] mt-2 ${subtext} truncate w-full text-center`}>
                            {item.label.split(' ')[0]}
                          </span>
                        </div>
                      ))}
                      {/* Forecast bar */}
                      <div className="flex-1 flex flex-col items-center justify-end h-full group">
                        <div className="relative w-full h-full flex items-end justify-center">
                          <div className="absolute -top-8 hidden group-hover:block z-10">
                            <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                              isDark ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'
                            }`}>
                              {trends.forecast.predicted.toLocaleString()} predicted
                            </div>
                          </div>
                          <div
                            className="w-full max-w-[40px] rounded-t-md transition-all duration-500 hover:opacity-80"
                            style={{
                              height: `${Math.max((trends.forecast.predicted / chartMax) * 100, 4)}%`,
                              background: 'repeating-linear-gradient(45deg, #34d399, #34d399 4px, #10b981 4px, #10b981 8px)',
                            }}
                          />
                        </div>
                        <span className="text-[10px] mt-2 text-emerald-500 font-semibold truncate w-full text-center">
                          {trends.forecast.label.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                        <span className={`text-xs ${subtext}`}>Actual Sales</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, #34d399, #34d399 2px, #10b981 2px, #10b981 4px)' }} />
                        <span className={`text-xs ${subtext}`}>LSTM Prediction</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CATEGORY FORECASTS ── */}
                <div className={`${card} overflow-hidden mb-8`}>
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-3">
                      <Layers className="h-5 w-5 text-indigo-500" />
                      <div>
                        <h2 className={`text-lg font-semibold ${heading}`}>Category Forecast</h2>
                        <p className={`text-xs ${subtext}`}>Predicted demand by product category for {forecastMonth}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                          {['Category', 'Last Month', 'Predicted', 'Change', 'Demand'].map((h) => (
                            <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${subtext}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-100'}`}>
                        {categories.map((cat, idx) => {
                          const maxPred = Math.max(...categories.map(c => c.predictedDemand), 1);
                          return (
                            <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                              <td className="px-6 py-4">
                                <span className={`text-sm font-medium ${heading}`}>{cat.category}</span>
                                <span className={`text-xs block ${subtext}`}>{cat.productCount} products</span>
                              </td>
                              <td className={`px-6 py-4 text-sm ${subtext}`}>
                                {cat.lastMonthActual.toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-sm font-semibold ${heading}`}>
                                  {cat.predictedDemand.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  cat.changePct >= 0
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {cat.changePct >= 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {cat.changePct > 0 ? '+' : ''}{cat.changePct}%
                                </div>
                              </td>
                              <td className="px-6 py-4 w-32">
                                <MiniBar
                                  value={cat.predictedDemand}
                                  max={maxPred}
                                  color={cat.changePct >= 0 ? 'bg-indigo-500' : 'bg-amber-500'}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── TOP PRODUCTS ── */}
                <div className={`${card} overflow-hidden`}>
                  <div className="p-6 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-indigo-500" />
                      <div>
                        <h2 className={`text-lg font-semibold ${heading}`}>Top Product Predictions</h2>
                        <p className={`text-xs ${subtext}`}>
                          Highest-demand products forecast for {forecastMonth}
                          {selectedCategory !== 'all' && ` (${selectedCategory})`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                          {['Product', 'Category', 'Avg/Month', 'Last Month', 'Predicted', 'Change'].map((h) => (
                            <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${subtext}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-100'}`}>
                        {products.map((prod, idx) => (
                          <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-medium ${heading} line-clamp-1`} title={prod.productName}>
                                {prod.productName.length > 35 ? prod.productName.slice(0, 35) + '…' : prod.productName}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {prod.category}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-sm ${subtext}`}>
                              {prod.avgMonthly}
                            </td>
                            <td className={`px-6 py-4 text-sm ${subtext}`}>
                              {prod.lastMonthActual}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-semibold ${heading}`}>
                                {prod.predictedDemand}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`inline-flex items-center gap-1 text-xs font-medium ${
                                prod.changePct >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {prod.changePct >= 0 ? (
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDownRight className="h-3.5 w-3.5" />
                                )}
                                {prod.changePct > 0 ? '+' : ''}{prod.changePct}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {products.length === 0 && !loading && (
                    <div className="p-12 text-center">
                      <Package className={`h-8 w-8 mx-auto mb-3 ${subtext}`} />
                      <p className={`text-sm ${subtext}`}>No products found for this category</p>
                    </div>
                  )}
                </div>

                {/* ── MODEL INFO FOOTER ── */}
                <div className={`mt-8 p-4 rounded-xl ${isDark ? 'bg-gray-800/40 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-indigo-500" />
                      <span className={`font-medium ${heading}`}>LSTM Neural Network</span>
                    </div>
                    <span className={subtext}>R²: {summary.modelR2}</span>
                    <span className={subtext}>RMSE: {summary.modelRMSE}</span>
                    <span className={subtext}>Products: {summary.totalProducts.toLocaleString()}</span>
                    <span className={subtext}>Forecast: {forecastMonth}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AIForecasting;