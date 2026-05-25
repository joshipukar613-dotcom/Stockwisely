import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { purchasesAPI, vendorsAPI } from '../../api';
import { RotateCcw, Download, RefreshCw, Calendar, Search, AlertTriangle, TrendingDown, Package, BarChart3, ChevronDown } from 'lucide-react';

export default function PurchaseReturnsPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  const d = new Date(); d.setDate(1);
  const [startDate, setStartDate]   = useState(d.toISOString().split('T')[0]);
  const [endDate, setEndDate]       = useState(new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId]     = useState('');
  const [vendors, setVendors]       = useState([]);
  const [returns, setReturns]       = useState([]);
  const [summary, setSummary]       = useState({ total_returns: 0, total_value: 0, by_method: {} });
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);

  const fetchVendors = async () => {
    try { const r = await vendorsAPI.list(); setVendors(r.data.data || []); }
    catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate };
      if (vendorId) params.vendor_id = vendorId;
      const res = await purchasesAPI.getPurchases({ ...params, limit: 500 });
      // Filter returns from purchase list since dedicated returns route may not exist
      const allPurchases = res.data.data || [];
      const returnRows = allPurchases.filter(p => p.is_return === true || p.is_return === 'true');
      setReturns(returnRows);
      const totalValue = returnRows.reduce((s, r) => s + Math.abs(Number(r.total_amount || 0)), 0);
      const byMethod = returnRows.reduce((acc, r) => { const m = r.return_type || 'Refund'; acc[m] = (acc[m] || 0) + 1; return acc; }, {});
      setSummary({ total_returns: returnRows.length, total_value: totalValue, by_method: byMethod });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); fetchData(); }, []);

  const filtered = returns.filter(r =>
    !search ||
    (r.vendor_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.invoice_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const rows = [['Invoice','Vendor','Return Type','Amount','Date'], ...filtered.map(r => [r.invoice_number, r.vendor_name, r.return_type || 'Refund', Math.abs(r.total_amount), new Date(r.purchase_date).toLocaleDateString()])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Purchase_Returns_${startDate}.csv`; a.click();
  };

  const bg    = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const sub   = isDark ? 'text-gray-400' : 'text-gray-500';
  const thead = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const divider  = isDark ? 'divide-gray-700' : 'divide-gray-100';
  const rowHover = isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50';
  const barBg    = isDark ? 'bg-gray-700' : 'bg-blue-100';

  const methods = Object.entries(summary.by_method);
  const maxMethod = Math.max(...methods.map(([, v]) => v), 1);

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
                  <h1 className={`text-2xl font-bold ${text}`}>Purchase Returns Report</h1>
                  <p className={`text-sm ${sub}`}>Returned purchases, credit notes and vendor return analysis</p>
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

            {/* Filters */}
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
                <div className="relative">
                  <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                    className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`}>
                    <option value="">All Vendors</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <button onClick={fetchData} className="px-5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Apply</button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total Returns', val: summary.total_returns, sub: 'purchase return transactions', icon: RotateCcw },
                { label: 'Total Amount', val: `Rs. ${Number(summary.total_value).toLocaleString()}`, sub: 'returned to vendors', icon: TrendingDown },
                { label: 'Return Methods', val: methods.length, sub: methods.map(([k]) => k).join(', ') || 'N/A', icon: AlertTriangle },
              ].map((c, i) => (
                <div key={i} className={`rounded-xl border p-5 shadow-sm ${card}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>{c.label}</p>
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <c.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{c.val}</p>
                  <p className={`text-xs mt-1 truncate ${sub}`}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* By Method Breakdown */}
            {methods.length > 0 && (
              <div className={`rounded-xl border p-6 shadow-sm mb-8 ${card}`}>
                <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${text}`}>
                  <BarChart3 className="h-4 w-4 text-blue-600" /> Returns by Method
                </h2>
                <div className="space-y-3">
                  {methods.map(([method, count], i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{method}</span>
                        <span className="font-semibold text-blue-600">{count}</span>
                      </div>
                      <div className={`w-full h-2.5 rounded-full ${barBg}`}>
                        <div className="h-2.5 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${(count / maxMethod * 100).toFixed(0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
                <h2 className={`font-semibold ${text}`}>Purchase Returns Detail</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendor / invoice..."
                    className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200'}`} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase font-semibold ${thead}`}>
                    <tr>
                      <th className="px-5 py-3 text-left">Invoice</th>
                      <th className="px-5 py-3 text-left">Vendor</th>
                      <th className="px-5 py-3 text-left">Return Type</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {loading ? (
                      <tr><td colSpan={5} className="py-16 text-center text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={5} className="py-16 text-center text-gray-400">No purchase returns found for this period.</td></tr>
                    ) : filtered.map((r, i) => (
                      <tr key={i} className={`transition-colors ${rowHover}`}>
                        <td className="px-5 py-4 font-medium text-blue-600">{r.invoice_number}</td>
                        <td className={`px-5 py-4 ${text}`}>{r.vendor_name || '—'}</td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{r.return_type || 'Refund'}</span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-blue-600">Rs. {Math.abs(Number(r.total_amount)).toLocaleString()}</td>
                        <td className={`px-5 py-4 ${sub}`}>{new Date(r.purchase_date).toLocaleDateString()}</td>
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
