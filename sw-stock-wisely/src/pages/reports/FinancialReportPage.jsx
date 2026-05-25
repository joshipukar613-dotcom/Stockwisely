import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { reportsAPI } from '../../api';
import { LineChart, Download, RefreshCw, Calendar, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

export default function FinancialReportPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  const d = new Date(); d.setDate(1);
  const [startDate, setStartDate] = useState(d.toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);
  const [profits, setProfits]     = useState([]);
  const [summary, setSummary]     = useState({ revenue: 0, cost: 0, profit: 0, margin: 0 });
  const [loading, setLoading]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.getBatchProfits({ startDate, endDate });
      const data = res.data.data || [];
      setProfits(data);
      
      const rev = data.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
      const cst = data.reduce((s, r) => s + Number(r.total_cost || 0), 0);
      const prf = data.reduce((s, r) => s + Number(r.total_profit || 0), 0);
      const mrgn = cst > 0 ? ((prf / cst) * 100) : 0;
      setSummary({ revenue: rev, cost: cst, profit: prf, margin: mrgn });
    } catch (e) { console.error('Failed to fetch financial data', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const exportCSV = () => {
    const rows = [['Product','Code','Revenue','Cost','Gross Profit','Margin %'], ...profits.map(p => [p.product_name, p.product_code, p.total_revenue, p.total_cost, p.total_profit, Number(p.profit_margin_pct).toFixed(1)])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Financial_Report_${startDate}.csv`; a.click();
  };

  const bg    = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const sub   = isDark ? 'text-gray-400' : 'text-gray-500';
  const thead = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const divider  = isDark ? 'divide-gray-700' : 'divide-gray-100';
  const rowHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50';
  const barBg    = isDark ? 'bg-gray-700' : 'bg-blue-100';

  const kpis = [
    { label: 'Total Revenue', val: `Rs. ${summary.revenue.toLocaleString()}`, sub: 'gross income', icon: DollarSign, color: 'text-blue-600' },
    { label: 'COGS', val: `Rs. ${summary.cost.toLocaleString()}`, sub: 'cost of goods sold', icon: Wallet, color: 'text-red-500' },
    { label: 'Gross Profit', val: `Rs. ${summary.profit.toLocaleString()}`, sub: 'revenue - cogs', icon: TrendingUp, color: 'text-green-500' },
    { label: 'Avg Margin', val: `${summary.margin.toFixed(1)}%`, sub: 'profitability ratio', icon: LineChart, color: 'text-blue-600' },
  ];

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
                  <LineChart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>Financial & Profitability Report</h1>
                  <p className={`text-sm ${sub}`}>Gross profit, COGS, and margin tracking via FIFO</p>
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
                <button onClick={fetchData} className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all">Apply Filter</button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map((c, i) => (
                <div key={i} className={`rounded-xl border p-5 shadow-sm ${card}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>{c.label}</p>
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <c.icon className={`h-4 w-4 ${c.color.replace('text-', 'text-').replace('-500', '-600')}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
                  <p className={`text-xs mt-1 ${sub}`}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Profit Margin Chart Approximation */}
            <div className={`rounded-xl border p-6 shadow-sm mb-8 ${card}`}>
              <h2 className={`text-sm font-semibold mb-6 flex items-center gap-2 ${text}`}>
                <TrendingUp className="h-4 w-4 text-blue-600" /> Revenue vs Cost Breakdown (Top 10 Products)
              </h2>
              <div className="space-y-4">
                {profits.slice(0, 10).map((p, i) => {
                  const rev = Number(p.total_revenue || 0);
                  const cst = Number(p.total_cost || 0);
                  const max = Math.max(...profits.slice(0, 10).map(x => Number(x.total_revenue || 0)), 1);
                  const revPct = (rev / max) * 100;
                  const cstPct = (cst / max) * 100;
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="sm:w-1/4">
                        <p className={`text-sm font-medium truncate ${text}`}>{p.product_name}</p>
                        <p className={`text-xs ${sub}`}>Margin: {Number(p.profit_margin_pct).toFixed(1)}%</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {/* Revenue Bar */}
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 rounded-r-full bg-blue-500`} style={{ width: `${revPct}%` }} />
                          <span className={`text-xs font-semibold text-blue-600`}>Rs. {rev.toLocaleString()}</span>
                        </div>
                        {/* Cost Bar */}
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 rounded-r-full bg-red-400`} style={{ width: `${cstPct}%` }} />
                          <span className={`text-xs font-medium text-red-500`}>Rs. {cst.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {profits.length === 0 && <p className={`text-sm text-center py-8 ${sub}`}>No profitability data to display.</p>}
              </div>
            </div>

            {/* Profit Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-blue-100 bg-blue-50/50'}`}>
                <h2 className={`font-bold flex items-center gap-2 text-blue-600`}>Profitability by Product</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase font-semibold ${thead}`}>
                    <tr>
                      <th className="px-5 py-3 text-left">Product</th>
                      <th className="px-5 py-3 text-right">Qty Sold</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                      <th className="px-5 py-3 text-right">COGS</th>
                      <th className="px-5 py-3 text-right">Gross Profit</th>
                      <th className="px-5 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {loading ? (
                      <tr><td colSpan={6} className="py-16 text-center text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Loading...</td></tr>
                    ) : profits.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-gray-400">No financial data found.</td></tr>
                    ) : profits.map((p, i) => (
                      <tr key={i} className={`transition-colors ${rowHover}`}>
                        <td className="px-5 py-4">
                          <div className={`font-medium ${text}`}>{p.product_name}</div>
                          <div className={`text-xs ${sub}`}>{p.product_code}</div>
                        </td>
                        <td className={`px-5 py-4 text-right ${sub}`}>{Number(p.total_qty_sold).toLocaleString()}</td>
                        <td className={`px-5 py-4 text-right font-medium ${text}`}>Rs. {Number(p.total_revenue).toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-red-500">Rs. {Number(p.total_cost).toLocaleString()}</td>
                        <td className="px-5 py-4 text-right font-bold text-green-500">Rs. {Number(p.total_profit).toLocaleString()}</td>
                        <td className="px-5 py-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${Number(p.profit_margin_pct) >= 20 ? 'bg-green-100 text-green-700' : Number(p.profit_margin_pct) >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(p.profit_margin_pct).toFixed(1)}%
                          </span>
                        </td>
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
