import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { salesAPI } from '../../api';
import { RotateCcw, Download, RefreshCw, Calendar, Search, AlertTriangle, TrendingDown, Package, BarChart3 } from 'lucide-react';

export default function SalesReturnsPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  const d = new Date(); d.setDate(1);
  const [startDate, setStartDate] = useState(d.toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);
  const [returns, setReturns]     = useState([]);
  const [summary, setSummary]     = useState({ total_returns: 0, total_amount: 0, top_reasons: [], returned_products: [] });
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate };
      const [listRes, sumRes] = await Promise.all([
        salesAPI.getReturns(params),
        salesAPI.getReturnsSummary(params),
      ]);
      setReturns(listRes.data.data || []);
      setSummary(sumRes.data.data || { total_returns: 0, total_amount: 0, top_reasons: [], returned_products: [] });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = returns.filter(r =>
    !search || (r.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.invoice_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [['Return ID','Customer','Reason','Refund','Date'], ...filtered.map(r => [r.invoice_number, r.customer_name, r.return_reason || 'N/A', Math.abs(r.total_amount), new Date(r.sale_date).toLocaleDateString()])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Sales_Returns_${startDate}.csv`; a.click();
  };

  const bg    = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const sub   = isDark ? 'text-gray-400' : 'text-gray-500';
  const thead = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const divider  = isDark ? 'divide-gray-700' : 'divide-gray-100';
  const rowHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50';
  const barBg    = isDark ? 'bg-gray-700' : 'bg-blue-100';
  const COLORS   = ['bg-blue-500','bg-blue-400','bg-blue-300','bg-indigo-400','bg-blue-600'];

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
                  <RotateCcw className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>Sales Returns Report</h1>
                  <p className={`text-sm ${sub}`}>Returned goods, refund amounts and return reasons</p>
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
                  <label className={`text-sm font-medium ${sub}`}>From:</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium ${sub}`}>To:</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`} />
                </div>
                <button onClick={fetchData} className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Apply</button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total Returns', val: summary.total_returns, valClass: 'text-blue-600', sub: 'transactions returned', icon: RotateCcw },
                { label: 'Total Refunded', val: `Rs. ${Math.abs(summary.total_amount || 0).toLocaleString()}`, valClass: 'text-blue-600', sub: 'refunded to customers', icon: TrendingDown },
                { label: 'Top Return Reason', val: summary.top_reasons?.[0]?.reason || '—', valClass: text, sub: summary.top_reasons?.[0] ? `${summary.top_reasons[0].count} occurrences` : 'No data', icon: AlertTriangle },
              ].map((c, i) => (
                <div key={i} className={`rounded-xl border p-5 shadow-sm ${card}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>{c.label}</p>
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <c.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold truncate ${c.valClass}`}>{c.val}</p>
                  <p className={`text-xs mt-1 ${sub}`}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Reasons + Frequently Returned */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className={`rounded-xl border p-6 shadow-sm ${card}`}>
                <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
                  <BarChart3 className="h-4 w-4 text-blue-600" /> Returns by Reason
                </h2>
                {(summary.top_reasons || []).length === 0 ? (
                  <p className={`text-sm text-center py-8 ${sub}`}>No return reason data for this period.</p>
                ) : (summary.top_reasons || []).map((r, i) => {
                  const pct = ((r.count / summary.top_reasons[0].count) * 100).toFixed(0);
                  return (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.reason}</span>
                        <span className="font-semibold text-blue-600">{r.count}</span>
                      </div>
                      <div className={`w-full h-2.5 rounded-full ${barBg}`}>
                        <div className={`h-2.5 rounded-full ${COLORS[i % COLORS.length]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`rounded-xl border p-6 shadow-sm ${card}`}>
                <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
                  <Package className="h-4 w-4 text-blue-600" /> Most Returned Products
                </h2>
                {(summary.returned_products || []).length === 0 ? (
                  <p className={`text-sm text-center py-8 ${sub}`}>No product return data for this period.</p>
                ) : (summary.returned_products || []).slice(0, 6).map((p, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg mb-2 ${isDark ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>{i + 1}</span>
                      <div>
                        <p className={`text-sm font-medium ${text}`}>{p.product_name || p.product_code}</p>
                        <p className={`text-xs ${sub}`}>{p.product_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{p.return_count} returns</p>
                      <p className={`text-xs ${sub}`}>Qty: {p.total_qty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
                <h2 className={`font-semibold ${text}`}>Returns Detail</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer / invoice..."
                    className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200'}`} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase font-semibold ${thead}`}>
                    <tr>
                      <th className="px-5 py-3 text-left">Return ID</th>
                      <th className="px-5 py-3 text-left">Customer</th>
                      <th className="px-5 py-3 text-left">Reason</th>
                      <th className="px-5 py-3 text-right">Refund</th>
                      <th className="px-5 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {loading ? (
                      <tr><td colSpan={5} className="py-16 text-center text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={5} className="py-16 text-center text-gray-400">No returns found for this period.</td></tr>
                    ) : filtered.map((r, i) => (
                      <tr key={i} className={`transition-colors ${rowHover}`}>
                        <td className="px-5 py-4 font-medium text-blue-600">{r.invoice_number}</td>
                        <td className={`px-5 py-4 ${text}`}>{r.customer_name || '—'}</td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{r.return_reason || 'Other'}</span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-blue-600">Rs. {Math.abs(r.total_amount).toLocaleString()}</td>
                        <td className={`px-5 py-4 ${sub}`}>{new Date(r.sale_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
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
