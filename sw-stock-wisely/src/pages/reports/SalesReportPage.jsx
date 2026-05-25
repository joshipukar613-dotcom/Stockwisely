import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { reportsAPI } from '../../api';
import { ShoppingCart, Download, RefreshCw, Calendar, TrendingUp, TrendingDown, DollarSign, Package, Search } from 'lucide-react';

export default function SalesReportPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  const d = new Date(); d.setDate(1);
  const [startDate, setStartDate] = useState(d.toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary]     = useState(null);
  const [topList, setTopList]     = useState([]);
  const [slowList, setSlowList]   = useState([]);
  const [tab, setTab]             = useState('top');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, tRes, slRes] = await Promise.all([
        reportsAPI.getSalesSummary({ startDate, endDate }),
        reportsAPI.getTopPerformers({ limit: 20, startDate, endDate }),
        reportsAPI.getSlowMovers({ limit: 20, startDate, endDate }),
      ]);
      setSummary(sRes.data.data);
      setTopList(tRes.data.data || []);
      setSlowList(slRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  const list = (tab === 'top' ? topList : slowList).filter(p =>
    !search || (p.product_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [['Product','Code','Revenue','Qty','Orders'], ...list.map(p => [p.product_name, p.product_code, p.total_revenue, p.total_quantity, p.order_count])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Sales_${startDate}.csv`; a.click();
  };

  const bg    = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const sub   = isDark ? 'text-gray-400' : 'text-gray-500';
  const thead = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const divider = isDark ? 'divide-gray-700' : 'divide-gray-100';
  const rowHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50';

  const kpis = summary ? [
    { label: 'Total Sales', value: Number(summary.total_sales).toLocaleString(), sub: 'transactions', icon: ShoppingCart },
    { label: 'Total Revenue', value: `Rs. ${Number(summary.total_revenue).toLocaleString()}`, sub: `${startDate} → ${endDate}`, icon: DollarSign },
    { label: 'Avg Order Value', value: `Rs. ${Math.round(summary.avg_order_value).toLocaleString()}`, sub: 'per transaction', icon: TrendingUp },
    { label: 'Items Sold', value: Number(summary.total_items_sold).toLocaleString(), sub: 'units dispatched', icon: Package },
  ] : [];

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
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>Sales Report</h1>
                  <p className={`text-sm ${sub}`}>Revenue, orders and product performance analysis</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchAll} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}>
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
                <button onClick={fetchAll} className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all">Apply</button>
              </div>
            </div>

            {/* KPI Cards */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((c, i) => (
                  <div key={i} className={`rounded-xl border p-5 shadow-sm ${card}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>{c.label}</p>
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <c.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{c.value}</p>
                    <p className={`text-xs mt-1 ${sub}`}>{c.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Product Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
                <div className="flex gap-2">
                  <button onClick={() => setTab('top')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'top' ? 'bg-blue-600 text-white shadow-sm' : isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-blue-50'}`}>
                    <TrendingUp className="h-4 w-4" /> Top Performers
                  </button>
                  <button onClick={() => setTab('slow')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'slow' ? 'bg-blue-600 text-white shadow-sm' : isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-blue-50'}`}>
                    <TrendingDown className="h-4 w-4" /> Slow Movers
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product..."
                    className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200'}`} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase font-semibold ${thead}`}>
                    <tr>
                      <th className="px-5 py-3 text-left w-10">#</th>
                      <th className="px-5 py-3 text-left">Product</th>
                      <th className="px-5 py-3 text-left">Code</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                      <th className="px-5 py-3 text-right">Qty Sold</th>
                      <th className="px-5 py-3 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {loading ? (
                      <tr><td colSpan={6} className="py-16 text-center text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" /><p>Loading sales data...</p></td></tr>
                    ) : list.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-gray-400">No data found for this period.</td></tr>
                    ) : list.map((p, i) => (
                      <tr key={i} className={`transition-colors ${rowHover}`}>
                        <td className="px-5 py-4">
                          <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>{i + 1}</span>
                        </td>
                        <td className={`px-5 py-4 font-medium ${text}`}>{p.product_name}</td>
                        <td className={`px-5 py-4 ${sub}`}>{p.product_code}</td>
                        <td className={`px-5 py-4 text-right font-semibold text-blue-600`}>Rs. {Number(p.total_revenue).toLocaleString()}</td>
                        <td className={`px-5 py-4 text-right ${sub}`}>{Number(p.total_quantity).toLocaleString()}</td>
                        <td className={`px-5 py-4 text-right ${sub}`}>{Number(p.order_count).toLocaleString()}</td>
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
