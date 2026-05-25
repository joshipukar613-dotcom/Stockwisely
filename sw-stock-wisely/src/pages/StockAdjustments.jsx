import React, { useState, useEffect } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { inventoryAPI } from '../api';
import AddAdjustmentModal from '../components/inventory/AddAdjustmentModal';
import {
    Plus,
    Filter,
    Search,
    Download,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Calendar,
    Package
} from 'lucide-react';

function StockAdjustments() {
    const { isDark } = useTheme();
    const { sidebarOpen } = useSidebar();
    const [adjustments, setAdjustments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        productId: '',
        reason: '',
        type: '',
        page: 1,
        limit: 20
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [listRes, summaryRes] = await Promise.all([
                inventoryAPI.listAdjustments(filters),
                inventoryAPI.getAdjustmentSummary()
            ]);
            setAdjustments(listRes.data?.data || []);
            setSummary(summaryRes.data?.data?.summary || null);
        } catch (err) {
            console.error('Fetch adjustments error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const handleExportCSV = () => {
        const headers = ['Date', 'Product', 'Code', 'Before', 'After', 'Change', 'Reason', 'Adjusted By'];
        const rows = adjustments.map(a => [
            new Date(a.adjustment_date).toLocaleDateString(),
            a.product_name,
            a.product_code,
            a.quantity_before,
            a.quantity_after,
            a.quantity_change > 0 ? `+${a.quantity_change}` : a.quantity_change,
            a.reason,
            a.adjusted_by_name || 'System'
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `stock_adjustments_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className={`flex-1 p-4 md:p-6 transition-all ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Stock Adjustments</h1>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manually track and manage inventory changes</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handleExportCSV}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Export</span>
                                </button>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all font-medium"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>New Adjustment</span>
                                </button>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 rounded-lg bg-green-100 text-green-600"><TrendingUp className="h-5 w-5" /></div>
                                    <span className="text-xs text-green-500 font-medium">Increases</span>
                                </div>
                                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{summary?.total_increases || 0}</div>
                                <div className="text-xs text-gray-500">Record(s)</div>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 rounded-lg bg-red-100 text-red-600"><TrendingDown className="h-5 w-5" /></div>
                                    <span className="text-xs text-red-500 font-medium">Decreases</span>
                                </div>
                                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{summary?.total_decreases || 0}</div>
                                <div className="text-xs text-gray-500">Record(s)</div>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><Package className="h-5 w-5" /></div>
                                    <span className="text-xs text-blue-500 font-medium">Total Qty Change</span>
                                </div>
                                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{summary?.total_quantity_adjusted || 0}</div>
                                <div className="text-xs text-gray-500">Units</div>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600"><RefreshCw className="h-5 w-5" /></div>
                                    <span className="text-xs text-indigo-500 font-medium">Last 30 Days</span>
                                </div>
                                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{adjustments.length}</div>
                                <div className="text-xs text-gray-500">Entries</div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className={`p-4 rounded-xl border mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Filter className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Filters:</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <input
                                        type="date"
                                        className={`text-sm rounded border px-2 py-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                        value={filters.startDate}
                                        onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
                                    />
                                    <span className="text-gray-400">to</span>
                                    <input
                                        type="date"
                                        className={`text-sm rounded border px-2 py-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                        value={filters.endDate}
                                        onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
                                    />
                                </div>
                                <select
                                    className={`text-sm rounded border px-2 py-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                    value={filters.type}
                                    onChange={(e) => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))}
                                >
                                    <option value="">All Types</option>
                                    <option value="increase">Increase</option>
                                    <option value="decrease">Decrease</option>
                                </select>
                            </div>
                        </div>

                        {/* List Table */}
                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className={isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-700'}>
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Before</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">After</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Change</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Reason</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Adjusted By</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        {loading ? (
                                            <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500">Loading adjustments...</td></tr>
                                        ) : adjustments.length === 0 ? (
                                            <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500">No adjustments recorded yet.</td></tr>
                                        ) : (
                                            adjustments.map((a) => (
                                                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(a.adjustment_date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{a.product_name}</div>
                                                        <div className="text-xs text-gray-500 font-mono">{a.product_code}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{a.quantity_before}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{a.quantity_after}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                                        <span className={a.quantity_change > 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {a.quantity_change > 0 ? '+' : ''}{a.quantity_change}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{a.reason}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.adjusted_by_name || 'System'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {showModal && (
                <AddAdjustmentModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onAdjusted={() => fetchData()}
                    isDark={isDark}
                />
            )}
        </div>
    );
}

export default StockAdjustments;
