import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { reportsAPI } from '../../api';
import { Activity, Download, RefreshCw, Calendar, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';

export default function PerformanceReportPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  const d = new Date(); d.setDate(1);
  const [startDate, setStartDate] = useState(d.toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary]     = useState(null);
  const [topList, setTopList]     = useState([]);
  const [slowList, setSlowList]   = useState([]);
  const [loading, setLoading]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, topRes, slowRes] = await Promise.all([
        reportsAPI.getSalesSummary({ startDate, endDate }),
        reportsAPI.getTopPerformers({ limit: 10, startDate, endDate }),
        reportsAPI.getSlowMovers({ limit: 10, startDate, endDate })
      ]);
      setSummary(sumRes.data.data);
      setTopList(topRes.data.data || []);
      setSlowList(slowRes.data.data || []);
    } catch (e) { console.error('Failed to fetch performance data', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const exportCSV = () => {
    const r1 = [['TOP PERFORMERS']], r2 = [['SLOW MOVERS']];
    const head = ['Product','Code','Revenue','Qty','Orders'];
    const tRows = topList.map(p => [p.product_name, p.product_code, p.total_revenue, p.total_quantity, p.order_count]);
    const sRows = slowList.map(p => [p.product_name, p.product_code, p.total_revenue, p.total_quantity, p.order_count]);
    const blob = new Blob([...r1, head, ...tRows, [], ...r2, head, ...sRows].map(r => r.join(',')).join('\n'), { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Performance_${startDate}.csv`; a.click();
  };

  const bg    = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const sub   = isDark ? 'text-gray-400' : 'text-gray-500';
  const thead = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const divider  = isDark ? 'divide-gray-700' : 'divide-gray-100';
  const rowHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50';

  // Simple Target calculation (mock target of 500k monthly for visualization)
  const target = 500000;
  const rev = Number(summary?.total_revenue || 0);
  const targetPct = Math.min((rev / target) * 100, 100).toFixed(1);

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
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>Product Performance Matrix</h1>
                  <p className={`text-sm ${sub}`}>Compare fast-moving vs slow-moving inventory items</p>
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

            {/* Filter & Target Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className={`lg:col-span-2 rounded-xl border p-5 ${card}`}>
                <h2 className={`text-sm font-semibold mb-4 ${text}`}>Select Period</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div className="flex items-center gap-2">
                    <label className={`text-sm font-medium ${sub}`}>From:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className={`text-sm font-medium ${sub}`}>To:</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`} />
                  </div>
                  <button onClick={fetchData} className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Apply Filter</button>
                </div>
              </div>

              <div className={`rounded-xl border p-5 ${card}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-sm font-semibold flex items-center gap-2 ${text}`}>
                    <Target className="h-4 w-4 text-blue-600" /> Revenue Target
                  </h2>
                  <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">{targetPct}%</span>
                </div>
                <div className="mb-2 flex justify-between items-end">
                  <span className="text-2xl font-bold text-blue-600">Rs. {rev.toLocaleString()}</span>
                  <span className={`text-xs ${sub}`}>of Rs. {target.toLocaleString()}</span>
                </div>
                <div className={`w-full h-2.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`}>
                  <div className="h-2.5 rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${targetPct}%` }} />
                </div>
              </div>
            </div>

            {/* Side by Side Matrices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Performers */}
              <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-blue-100 bg-blue-50/50'}`}>
                  <h2 className={`font-bold flex items-center gap-2 text-blue-600`}><TrendingUp className="h-5 w-5" /> Top 10 High Performers</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`text-xs uppercase font-semibold ${thead}`}>
                      <tr>
                        <th className="px-5 py-3 text-left">Product</th>
                        <th className="px-5 py-3 text-right">Revenue</th>
                        <th className="px-5 py-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${divider}`}>
                      {loading ? (
                        <tr><td colSpan={3} className="py-12 text-center text-gray-400"><RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                      ) : topList.length === 0 ? (
                        <tr><td colSpan={3} className="py-12 text-center text-gray-400">No high performing products found.</td></tr>
                      ) : topList.map((p, i) => (
                        <tr key={i} className={`transition-colors ${rowHover}`}>
                          <td className="px-5 py-3">
                            <div className={`font-medium ${text}`}>{p.product_name}</div>
                            <div className={`text-xs ${sub}`}>{p.product_code}</div>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-blue-600">Rs. {Number(p.total_revenue).toLocaleString()}</td>
                          <td className={`px-5 py-3 text-right ${sub}`}>{Number(p.total_quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slow Movers */}
              <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-blue-100 bg-blue-50/50'}`}>
                  <h2 className={`font-bold flex items-center gap-2 text-red-500`}><TrendingDown className="h-5 w-5" /> Bottom 10 Slow Movers</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`text-xs uppercase font-semibold ${thead}`}>
                      <tr>
                        <th className="px-5 py-3 text-left">Product</th>
                        <th className="px-5 py-3 text-right">Revenue</th>
                        <th className="px-5 py-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${divider}`}>
                      {loading ? (
                        <tr><td colSpan={3} className="py-12 text-center text-gray-400"><RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                      ) : slowList.length === 0 ? (
                        <tr><td colSpan={3} className="py-12 text-center text-gray-400">No slow moving products found.</td></tr>
                      ) : slowList.map((p, i) => (
                        <tr key={i} className={`transition-colors ${rowHover}`}>
                          <td className="px-5 py-3">
                            <div className={`font-medium ${text}`}>{p.product_name}</div>
                            <div className={`text-xs ${sub}`}>{p.product_code}</div>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-red-500">Rs. {Number(p.total_revenue).toLocaleString()}</td>
                          <td className={`px-5 py-3 text-right ${sub}`}>{Number(p.total_quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recommendation Box */}
            <div className={`rounded-xl border p-5 bg-gradient-to-r ${isDark ? 'from-blue-900/40 to-indigo-900/40 border-blue-800' : 'from-blue-50 to-indigo-50 border-blue-200'}`}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600 rounded-full text-white shadow-lg"><Zap className="h-6 w-6" /></div>
                <div>
                  <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>AI Strategy Recommendation</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Consider running a discount bundle combining your <strong>Top Performers</strong> with your <strong>Slow Movers</strong> to clear up warehouse space while maintaining average order value. Specifically, pairing <em>{topList[0]?.product_name || 'your top item'}</em> with <em>{slowList[0]?.product_name || 'underperforming stock'}</em> at a 10% combined discount could increase turnover.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
