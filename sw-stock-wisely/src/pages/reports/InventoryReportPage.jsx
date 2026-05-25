import React, { useState, useEffect } from 'react';
import Navbar from '../../components/ui/Navbar';
import Sidebar from '../../components/ui/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { reportsAPI } from '../../api';
import { Package, Download, RefreshCw, Search, ChevronUp, ChevronDown, BarChart3, Layers, Hash } from 'lucide-react';

export default function InventoryReportPage() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('total_value');
  const [sortDir, setSortDir] = useState('desc');

  const fetch = async () => {
    setLoading(true);
    try { const r = await reportsAPI.getInventoryReport(); setData(r.data.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const totalValue = data.reduce((s, r) => s + Number(r.total_value || 0), 0);
  const totalQty   = data.reduce((s, r) => s + Number(r.total_quantity || 0), 0);
  const totalSKUs  = data.reduce((s, r) => s + Number(r.product_count || 0), 0);

  const sorted = [...data]
    .filter(r => !search || (r.category || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = sortField === 'category' ? (a.category || '') : Number(a[sortField] || 0);
      const bv = sortField === 'category' ? (b.category || '') : Number(b[sortField] || 0);
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const toggleSort = f => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc'); } };
  const SortIcon = ({ f }) => sortField !== f ? null : sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;

  const exportCSV = () => {
    const rows = [['Category','Products','Quantity','Value (Rs.)'], ...sorted.map(r => [r.category || 'Uncategorized', r.product_count, r.total_quantity, r.total_value])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Inventory_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const bg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const card = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const sub  = isDark ? 'text-gray-400' : 'text-gray-500';
  const theadBg = isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white';
  const rowHover = isDark ? 'hover:bg-gray-700/60' : 'hover:bg-blue-50';
  const divider  = isDark ? 'divide-gray-700' : 'divide-gray-100';

  return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''} pt-20 px-4 pb-10`}>
          <div className="max-w-7xl mx-auto mt-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>Inventory Report</h1>
                  <p className={`text-sm ${sub}`}>Real-time stock valuation and category breakdown</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={fetch} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              {[
                { label: 'Total Inventory Value', value: `Rs. ${totalValue.toLocaleString()}`, icon: BarChart3, sub: 'current stock valuation' },
                { label: 'Total Stock Units', value: totalQty.toLocaleString(), icon: Package, sub: 'items in stock' },
                { label: 'Total SKUs', value: totalSKUs.toLocaleString(), icon: Hash, sub: `across ${data.length} categories` },
              ].map((c, i) => (
                <div key={i} className={`rounded-xl border p-5 shadow-sm ${card}`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>{c.label}</p>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <c.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{c.value}</p>
                  <p className={`text-xs mt-1 ${sub}`}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${card}`}>
              <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <h2 className={`font-semibold ${text}`}>Category Breakdown</h2>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search category..."
                    className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-blue-50 border-blue-200 text-gray-800'}`} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`text-xs uppercase font-semibold ${theadBg}`}>
                    <tr>
                      <th className="px-6 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort('category')}>Category <SortIcon f="category" /></th>
                      <th className="px-6 py-3 text-right cursor-pointer select-none" onClick={() => toggleSort('product_count')}>Products <SortIcon f="product_count" /></th>
                      <th className="px-6 py-3 text-right cursor-pointer select-none" onClick={() => toggleSort('total_quantity')}>Total Qty <SortIcon f="total_quantity" /></th>
                      <th className="px-6 py-3 text-right cursor-pointer select-none" onClick={() => toggleSort('total_value')}>Stock Value <SortIcon f="total_value" /></th>
                      <th className="px-6 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" /><p>Loading inventory data...</p></td></tr>
                    ) : sorted.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400">No inventory data found.</td></tr>
                    ) : sorted.map((r, i) => {
                      const share = totalValue > 0 ? (Number(r.total_value) / totalValue * 100) : 0;
                      return (
                        <tr key={i} className={`transition-colors ${rowHover}`}>
                          <td className={`px-6 py-4 font-semibold ${text}`}>{r.category || 'Uncategorized'}</td>
                          <td className={`px-6 py-4 text-right ${sub}`}>{Number(r.product_count).toLocaleString()}</td>
                          <td className={`px-6 py-4 text-right ${sub}`}>{Number(r.total_quantity).toLocaleString()}</td>
                          <td className={`px-6 py-4 text-right font-semibold ${text}`}>Rs. {Number(r.total_value).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className={`w-20 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`}>
                                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(share, 100)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-blue-600 w-10 text-right">{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!loading && sorted.length > 0 && (
                      <tr className={`font-bold border-t-2 ${isDark ? 'bg-gray-700/80 border-gray-600 text-white' : 'bg-blue-600 text-white border-blue-600'}`}>
                        <td className="px-6 py-3">TOTAL</td>
                        <td className="px-6 py-3 text-right">{totalSKUs.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right">{totalQty.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right">Rs. {totalValue.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right">100%</td>
                      </tr>
                    )}
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
