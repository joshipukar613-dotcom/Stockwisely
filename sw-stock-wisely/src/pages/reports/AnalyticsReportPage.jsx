import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { analyticsAPI } from '../../api';
import { BarChart2, Download, RefreshCw, Calendar, TrendingUp, TrendingDown, Layers, Search, Briefcase } from 'lucide-react';

export default function AnalyticsReportPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  const d = new Date(); d.setDate(1);
  const [startDate, setStartDate] = useState(d.toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [demandRes, healthRes] = await Promise.all([
        analyticsAPI.getSalesDemand({ startDate, endDate }),
        analyticsAPI.getInventoryHealth()
      ]);
      setData({ demand: demandRes.data.data, health: healthRes.data.data });
    } catch (e) { console.error('Failed to fetch analytics', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const periodDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
  const demandList = data?.demand?.bestSellers || [];
  const healthOverview = data?.health?.overview || {};

  const filtered = demandList.filter(d =>
    !search || (d.product_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [['Product','Code','Revenue','Quantity Sold','Avg Daily Sales'], ...filtered.map(d => [d.product_name, d.product_code, d.total_revenue, d.total_quantity, (d.total_quantity / periodDays).toFixed(2)])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Analytics_${startDate}.csv`; a.click();
  };

  const bg    = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const sub   = isDark ? 'text-gray-400' : 'text-gray-500';
  const thead = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const divider  = isDark ? 'divide-gray-700' : 'divide-gray-100';
  const rowHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50';
  const barBg    = isDark ? 'bg-gray-700' : 'bg-blue-100';

  const lowStockCount = (healthOverview.low_stock_count || 0) + (healthOverview.out_of_stock_count || 0);
  const overstockCount = healthOverview.overstock_count || 0;
  // Estimate total items from the API's sum of these + optimal (assuming roughly 200 items if unknown, but let's just show raw numbers instead of percentages if total is unknown)
  const maxBar = Math.max(lowStockCount, overstockCount, 10); 

  return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''} pt-20 px-4 pb-10`}>
          <div className="max-w-7xl mx-auto mt-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                  <BarChart2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>Advanced Analytics</h1>
                  <p className={`text-sm ${sub}`}>Deep dive into sales demand and inventory health metrics</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchData} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </div>

            {/* Date Filter */}
            <div className={`rounded-xl border p-4 mb-6 ${card}`}>
              <div className="flex flex-wrap items-center gap-4">
                <Calendar className="h-4 w-4 text-blue-500" />
                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium ${sub}`}>Demand From:</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium ${sub}`}>To:</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`} />
                </div>
                <button onClick={fetchData} className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all">Analyze</button>
              </div>
            </div>

            {/* Overview / Health Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Inventory Health Pie/Bar Approx */}
              <div className={`rounded-xl border p-6 shadow-sm ${card}`}>
                <h2 className={`text-sm font-semibold mb-6 flex items-center gap-2 ${text}`}>
                  <Briefcase className="h-4 w-4 text-blue-600" /> Inventory Health Overview
                </h2>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Low / Critical Stock</span>
                      <span className="font-bold text-red-500">{lowStockCount} items</span>
                    </div>
                    <div className={`w-full h-2.5 rounded-full ${barBg}`}>
                      <div className="h-2.5 rounded-full bg-red-500" style={{ width: `${Math.min((lowStockCount / maxBar) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Overstocked</span>
                      <span className="font-bold text-yellow-500">{overstockCount} items</span>
                    </div>
                    <div className={`w-full h-2.5 rounded-full ${barBg}`}>
                      <div className="h-2.5 rounded-full bg-yellow-500" style={{ width: `${Math.min((overstockCount / maxBar) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className={`text-xs ${sub} mb-1`}>Total Inventory Value</p>
                    <p className={`text-2xl font-bold ${text}`}>Rs. {Number(healthOverview.total_inventory_value || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Demand Velocity (Top 4) */}
              <div className={`lg:col-span-2 rounded-xl border p-6 shadow-sm ${card}`}>
                <h2 className={`text-sm font-semibold mb-6 flex items-center gap-2 ${text}`}>
                  <TrendingUp className="h-4 w-4 text-blue-600" /> Highest Demand Velocity (Sales/Day)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {demandList.slice(0, 4).map((d, i) => {
                    const avgDaily = d.total_quantity / periodDays;
                    return (
                      <div key={i} className={`p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-blue-100 bg-blue-50/50'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className={`text-sm font-bold truncate ${text}`} title={d.product_name}>{d.product_name}</p>
                            <p className={`text-xs ${sub}`}>{d.product_code}</p>
                          </div>
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded text-blue-700 dark:text-blue-400 text-xs font-bold">
                            #{i+1}
                          </div>
                        </div>
                        <div className="flex items-end justify-between mt-4">
                          <div>
                            <p className={`text-xs uppercase font-medium ${sub} mb-0.5`}>Avg. Daily</p>
                            <p className="text-xl font-bold text-blue-600">{avgDaily.toFixed(1)} <span className="text-sm font-medium">units</span></p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs uppercase font-medium ${sub} mb-0.5`}>Total Qty</p>
                            <p className={`text-lg font-bold ${text}`}>{Number(d.total_quantity).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {demandList.length === 0 && <p className={`text-sm col-span-2 text-center py-8 ${sub}`}>No demand data available.</p>}
                </div>
              </div>
            </div>

            {/* Demand Data Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-blue-100 bg-blue-50/50'}`}>
                <h2 className={`font-bold flex items-center gap-2 text-blue-600`}><Layers className="h-5 w-5" /> Full Demand Analysis</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product..."
                    className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-blue-200'}`} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase font-semibold ${thead}`}>
                    <tr>
                      <th className="px-5 py-3 text-left">Product Details</th>
                      <th className="px-5 py-3 text-right">Qty Sold</th>
                      <th className="px-5 py-3 text-right">Revenue Generated</th>
                      <th className="px-5 py-3 text-right">Daily Velocity</th>
                      <th className="px-5 py-3 text-left w-32">Status Trend</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {loading ? (
                      <tr><td colSpan={5} className="py-16 text-center text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Loading analytics...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={5} className="py-16 text-center text-gray-400">No demand data found.</td></tr>
                    ) : filtered.map((d, i) => {
                      const velocity = d.total_quantity / periodDays;
                      return (
                        <tr key={i} className={`transition-colors ${rowHover}`}>
                          <td className="px-5 py-4">
                            <div className={`font-medium ${text}`}>{d.product_name}</div>
                            <div className={`text-xs ${sub}`}>{d.product_code}</div>
                          </td>
                          <td className={`px-5 py-4 text-right ${sub}`}>{Number(d.total_quantity).toLocaleString()}</td>
                          <td className={`px-5 py-4 text-right font-medium ${text}`}>Rs. {Number(d.total_revenue).toLocaleString()}</td>
                          <td className="px-5 py-4 text-right font-bold text-blue-600">{velocity.toFixed(2)} / day</td>
                          <td className="px-5 py-4">
                            {velocity > 5 ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full"><TrendingUp className="h-3 w-3"/> High</span>
                            ) : velocity < 1 ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full"><TrendingDown className="h-3 w-3"/> Low</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full"><TrendingUp className="h-3 w-3 opacity-50"/> Steady</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
