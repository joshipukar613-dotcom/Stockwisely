import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { customersAPI } from '../../api';
import { Users, Download, RefreshCw, Calendar, TrendingUp, Search, UserPlus, Star, Clock } from 'lucide-react';

export default function CustomerReportPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, custRes] = await Promise.all([
        customersAPI.getStats(),
        customersAPI.list()
      ]);
      setStats(statsRes.data.data);
      setCustomers(custRes.data?.data || []);
    } catch (e) { console.error('Failed to fetch data', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const allCustomers = customers || [];
  const filtered = allCustomers.filter(c =>
    !search ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [['Customer Name','Phone','Email','Total Spent (Rs.)','Orders','Last Purchase'], ...filtered.map(c => [c.name, c.phone, c.email || 'N/A', c.total_purchase_amount || 0, c.purchase_count || 0, c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString() : 'N/A'])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Comprehensive_Customer_Report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const bg    = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const sub   = isDark ? 'text-gray-400' : 'text-gray-500';
  const thead = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const divider  = isDark ? 'divide-gray-700' : 'divide-gray-100';
  const rowHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50';
  const barBg    = isDark ? 'bg-gray-700' : 'bg-blue-100';

  const kpis = stats ? [
    { label: 'Total Customers', val: Number(stats.total_customers).toLocaleString(), sub: 'registered in system', icon: Users },
    { label: 'New This Month', val: `+${Number(stats.new_this_month).toLocaleString()}`, valClass: 'text-green-500', sub: `vs ${stats.new_last_month} last month`, icon: UserPlus },
    { label: 'Monthly Growth', val: `${stats.growth_rate > 0 ? '+' : ''}${stats.growth_rate}%`, valClass: stats.growth_rate >= 0 ? 'text-green-500' : 'text-red-500', sub: 'month-over-month rate', icon: TrendingUp },
    { label: 'Active Customers', val: Number(stats.active_customers).toLocaleString(), sub: 'purchased in last 90 days', icon: Clock },
  ] : [];

  const maxGrowth = stats?.monthly_growth?.length ? Math.max(...stats.monthly_growth.map(m => m.new_customers), 1) : 1;

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
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>Customer Growth & Analytics</h1>
                  <p className={`text-sm ${sub}`}>Track customer acquisition, demographics, and top buyers</p>
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

            {/* KPI Cards */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((c, i) => (
                  <div key={i} className={`rounded-xl border p-5 shadow-sm ${card}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>{c.label}</p>
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <c.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <p className={`text-2xl font-bold ${c.valClass || 'text-blue-600'}`}>{c.val}</p>
                    <p className={`text-xs mt-1 ${sub}`}>{c.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Charts Section */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Monthly Growth Trend */}
                <div className={`lg:col-span-2 rounded-xl border p-6 shadow-sm ${card}`}>
                  <h2 className={`text-sm font-semibold mb-6 flex items-center gap-2 ${text}`}>
                    <TrendingUp className="h-4 w-4 text-blue-600" /> Customer Acquisition Trend (Last 12 Months)
                  </h2>
                  <div className="flex items-end gap-2 h-48">
                    {(stats.monthly_growth || []).map((m, i) => {
                      const h = Math.max((m.new_customers / maxGrowth) * 100, 2);
                      const isLast = i === stats.monthly_growth.length - 1;
                      const date = new Date(m.month + '-01');
                      const lbl = date.toLocaleString('default', { month: 'short' });
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{m.new_customers}</span>
                          <div className="w-full flex items-end justify-center h-32">
                            <div className={`w-full max-w-[40px] rounded-t-lg transition-all duration-700 ${isLast ? 'bg-gradient-to-t from-blue-600 to-blue-400' : isDark ? 'bg-gray-600' : 'bg-blue-200'}`} style={{ height: `${h}%` }} />
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lbl}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gender Breakdown */}
                <div className={`rounded-xl border p-6 shadow-sm ${card}`}>
                  <h2 className={`text-sm font-semibold mb-6 flex items-center gap-2 ${text}`}>
                    <Users className="h-4 w-4 text-blue-600" /> Demographics (Gender)
                  </h2>
                  <div className="space-y-4 mt-8">
                    {(stats.gender_breakdown || []).map((g, i) => {
                      const pct = ((g.count / stats.total_customers) * 100).toFixed(1);
                      const colors = ['bg-blue-600', 'bg-pink-500', 'bg-gray-400'];
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{g.gender}</span>
                            <span className="font-semibold text-blue-600">{g.count} ({pct}%)</span>
                          </div>
                          <div className={`w-full h-2.5 rounded-full ${barBg}`}>
                            <div className={`h-2.5 rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Customers Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <h2 className={`font-semibold ${text}`}>Comprehensive Customer List</h2>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..."
                    className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200'}`} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase font-semibold ${thead}`}>
                    <tr>
                      <th className="px-5 py-3 text-left w-10">#</th>
                      <th className="px-5 py-3 text-left">Customer Name</th>
                      <th className="px-5 py-3 text-left">Contact Info</th>
                      <th className="px-5 py-3 text-right">Total Spent</th>
                      <th className="px-5 py-3 text-right">Orders</th>
                      <th className="px-5 py-3 text-right">Last Purchase</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {loading ? (
                      <tr><td colSpan={6} className="py-16 text-center text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-gray-400">No customers found.</td></tr>
                    ) : filtered.map((c, i) => (
                      <tr key={i} className={`transition-colors ${rowHover}`}>
                        <td className="px-5 py-4">
                          <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold bg-blue-50 text-blue-500`}>{i + 1}</span>
                        </td>
                        <td className={`px-5 py-4 font-medium ${text}`}>{c.name}</td>
                        <td className={`px-5 py-4 ${sub}`}>
                          <div>{c.phone}</div>
                          <div className="text-xs opacity-75">{c.email || ''}</div>
                        </td>
                        <td className={`px-5 py-4 text-right font-bold text-blue-600`}>Rs. {Number(c.total_purchase_amount || 0).toLocaleString()}</td>
                        <td className={`px-5 py-4 text-right ${text}`}>{c.purchase_count || 0}</td>
                        <td className={`px-5 py-4 text-right ${sub}`}>{c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString() : '—'}</td>
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
