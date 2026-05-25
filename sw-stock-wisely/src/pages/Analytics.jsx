import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import DashboardChart from '../components/charts/DashboardChart';
import PieChart from '../components/charts/PieChart';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { analyticsAPI } from '../api';
import {
    TrendingUp,
    Package,
    AlertTriangle,
    DollarSign,
    ShoppingCart,
    BarChart3,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    ArrowRightLeft,
    Archive,
    XCircle,
} from 'lucide-react';

import ComparisonChart from '../components/charts/ComparisonChart';
import PurchaseVsSalesView from '../components/analytics/PurchaseVsSalesView';
import InventoryHealthView from '../components/analytics/InventoryHealthView';
import SalesDemandView from '../components/analytics/SalesDemandView';
import StockMovementView from '../components/analytics/StockMovementView';
import { inventoryAPI } from '../api';

// ───────────────────────────────────────
// Shared sub-components
// ───────────────────────────────────────

function StatCard({ title, value, subtitle, Icon, color, isDark, trend }) {
// ... (Keeping rest intact, adding ComparisonsTab down below)

    const colorMap = {
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-600',
        blue: 'bg-blue-100 text-blue-600',
        indigo: 'bg-indigo-100 text-indigo-600',
    };
    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 hover:shadow-lg transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</span>
                <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.indigo}`}>{Icon && <Icon className="h-5 w-5" />}</div>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
            {subtitle && (
                <p className={`text-sm mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {trend === 'up' && <ArrowUpRight className="h-4 w-4" />}
                    {trend === 'down' && <ArrowDownRight className="h-4 w-4" />}
                    {subtitle}
                </p>
            )}
        </div>
    );
}

function DataTable({ columns, rows, isDark, emptyMsg }) {
    if (!rows || rows.length === 0) {
        return <p className={`text-center py-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{emptyMsg || 'No data'}</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        {columns.map((c, i) => (
                            <th key={i} className={`py-3 px-4 text-sm font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'} ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{c.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                            {columns.map((c, ci) => (
                                <td key={ci} className={`py-3 px-4 text-sm ${c.align === 'right' ? 'text-right' : ''} ${ci === 0 ? (isDark ? 'text-white font-medium' : 'text-gray-900 font-medium') : isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {c.render ? c.render(row) : row[c.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SectionCard({ title, children, isDark }) {
    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            {children}
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        out_of_stock: { bg: 'bg-red-100 text-red-700', label: 'Out of Stock' },
        understock: { bg: 'bg-orange-100 text-orange-700', label: 'Low Stock' },
        healthy: { bg: 'bg-green-100 text-green-700', label: 'Healthy' },
        overstock: { bg: 'bg-blue-100 text-blue-700', label: 'Overstock' },
    };
    const s = map[status] || map.healthy;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg}`}>{s.label}</span>;
}

// ───────────────────────────────────────
// Tab content components
// ───────────────────────────────────────

function SalesDemandTab({ data, isDark }) {
    if (!data) return null;
    const { bestSellers, currentPeriodTrend, categoryPerformance, overallTotalRevenue } = data;

    return (
        <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard isDark={isDark} title="Total Revenue" value={`Rs. ${Number(overallTotalRevenue || 0).toLocaleString()}`} Icon={DollarSign} color="green" subtitle={`${currentPeriodTrend?.reduce((s, t) => s + Number(t.orders || 0), 0) || 0} orders`} />
                <StatCard isDark={isDark} title="Top Seller" value={bestSellers[0]?.product_name?.substring(0, 25) || '—'} Icon={TrendingUp} color="indigo" subtitle={bestSellers[0] ? `Rs. ${Number(bestSellers[0].total_revenue).toLocaleString()}` : ''} />
                <StatCard isDark={isDark} title="Categories Sold" value={categoryPerformance?.length || 0} Icon={Package} color="purple" />
                <StatCard isDark={isDark} title="Items Sold" value={currentPeriodTrend?.reduce((s, t) => s + Number(t.items_sold || 0), 0).toLocaleString() || '0'} Icon={ShoppingCart} color="blue" />
            </div>

            {/* Comprehensive Sales View */}
            <SalesDemandView data={data} isDark={isDark} />
        </div>
    );
}

function InventoryHealthTab({ data, isDark }) {
    if (!data) return null;
    return <InventoryHealthView data={data} isDark={isDark} />;
}

function StockMovementTab({ data, isDark }) {
    if (!data) return null;
    const { movementSummary } = data;

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard isDark={isDark} title="Inflow (Qty)" value={movementSummary.total_inflow.toLocaleString()} Icon={ArrowUpRight} color="green" subtitle="Purchases & Adjustments" trend="up" />
                <StatCard isDark={isDark} title="Outflow (Qty)" value={movementSummary.total_outflow.toLocaleString()} Icon={ArrowDownRight} color="blue" subtitle="Sales & Adjustments" trend="down" />
                <StatCard isDark={isDark} title="Restock Freq" value={`${movementSummary.avg_restocks_per_month} /mo`} Icon={RefreshCw} color="indigo" subtitle="Average per product" />
                <StatCard isDark={isDark} title="Net Movement" value={(movementSummary.total_inflow - movementSummary.total_outflow).toLocaleString()} Icon={ArrowRightLeft} color="purple" subtitle="Period balance" />
            </div>

            <StockMovementView data={data} isDark={isDark} />
        </div>
    );
}

function ComparisonsTab({ isDark, dateRange }) {
    const [compareType, setCompareType] = useState('purchase_vs_sales');
    const [products, setProducts] = useState([]);
    const [product1, setProduct1] = useState('');
    const [product2, setProduct2] = useState('');
    const [metric, setMetric] = useState('revenue');
    const [compareData, setCompareData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch product list for dropdowns (only needed for product comparison)
    useEffect(() => {
        if (compareType === 'product' && products.length === 0) {
            inventoryAPI.getProducts({ limit: 1000 })
                .then(res => setProducts(res.data.data.products || []))
                .catch(err => console.error('Failed to fetch products', err));
        }
    }, [compareType, products.length]);

    const fetchComparison = async () => {
        if (compareType === 'product' && (!product1 || !product2)) {
            setError('Please select two products to compare.');
            return;
        }
        if (compareType === 'product' && product1 === product2) {
            setError('Please select two different products.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const params = {
                type: compareType,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            };
            if (compareType === 'product') {
                params.product1 = product1;
                params.product2 = product2;
                params.metric = metric;
            }
            const res = await analyticsAPI.getComparison(params);
            setCompareData(res.data.data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch comparison data. Please ensure the date range is valid.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch automatically if not product type or when dependencies change
    useEffect(() => {
        if (compareType !== 'product' && !compareType.includes('_vs_')) {
             // Basic fetch for business
             fetchComparison();
        } else if (compareType === 'purchase_vs_sales') {
             fetchComparison();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compareType, dateRange]);

    return (
        <div className="space-y-6">
            <SectionCard title="Comparison Configuration" isDark={isDark}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Comparisons</label>
                        <select 
                            value={compareType} 
                            onChange={(e) => { setCompareType(e.target.value); setCompareData(null); }}
                            className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        >
                            <option value="purchase_vs_sales">Purchase vs Sales Analysis</option>
                            <option value="month_vs_month" disabled>This Month vs Last Month (Coming Soon)</option>
                            <option value="year_vs_year" disabled>This Year vs Last Year (Coming Soon)</option>
                            <option value="product">Compare Two Products</option>
                            <option value="category" disabled>Compare Two Categories (Coming Soon)</option>
                            <option value="business">Business Health (Revenue vs Costs)</option>
                        </select>
                    </div>

                    {compareType === 'product' && (
                        <>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Product A</label>
                                <select 
                                    value={product1} 
                                    onChange={(e) => setProduct1(e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => <option key={p.product_code} value={p.product_code}>{p.product_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Product B</label>
                                <select 
                                    value={product2} 
                                    onChange={(e) => setProduct2(e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => <option key={p.product_code} value={p.product_code}>{p.product_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Metric</label>
                                <div className="flex gap-2 h-[42px]">
                                    <select 
                                        value={metric} 
                                        onChange={(e) => setMetric(e.target.value)}
                                        className={`flex-1 px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                    >
                                        <option value="revenue">Revenue</option>
                                        <option value="quantity">Units Sold</option>
                                    </select>
                                    <button 
                                        onClick={fetchComparison}
                                        disabled={loading}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {loading ? '...' : 'Compare'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
            </SectionCard>

            {loading ? (
                <div className="h-72 flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Analyzing comparison data...</p>
                </div>
            ) : compareData ? (
                <>
                    {compareType === 'purchase_vs_sales' && (
                        <PurchaseVsSalesView data={compareData} isDark={isDark} />
                    )}
                    {(compareType === 'business' || compareType === 'product') && (
                        <SectionCard title={compareType === 'business' ? "Sales vs Purchase Costs Trend" : "Product Performance Correlation"} isDark={isDark}>
                            <ComparisonChart data={compareData} isDark={isDark} title={compareType === 'business' ? 'Business Overview' : 'Product Match-up'} />
                        </SectionCard>
                    )}
                </>
            ) : null}
        </div>
    );
}

// ───────────────────────────────────────
// Main Analytics Component
// ───────────────────────────────────────

const TABS = [
    { id: 'sales', label: 'Sales & Demand', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory Health', icon: Package },
    { id: 'movement', label: 'Stock Movement', icon: ArrowRightLeft },
    { id: 'compare', label: 'Comparisons', icon: BarChart3 },
];

function Analytics() {
    const { isDark } = useTheme();
    const { sidebarOpen } = useSidebar();
    const [activeTab, setActiveTab] = useState('sales');
    const [timeRange, setTimeRange] = useState('6months');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [salesData, setSalesData] = useState(null);
    const [inventoryData, setInventoryData] = useState(null);
    const [movementData, setMovementData] = useState(null);

    const getDateRange = useCallback((range) => {
        const end = new Date();
        const start = new Date();
        switch (range) {
            case '7days': start.setDate(start.getDate() - 7); break;
            case '30days': start.setDate(start.getDate() - 30); break;
            case '90days': start.setDate(start.getDate() - 90); break;
            case '1year': start.setFullYear(start.getFullYear() - 1); break;
            default: start.setMonth(start.getMonth() - 6); // 6months
        }
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { startDate, endDate } = getDateRange(timeRange);
            const [salesRes, invRes, movRes] = await Promise.all([
                analyticsAPI.getSalesDemand({ startDate, endDate }),
                analyticsAPI.getInventoryHealth(),
                analyticsAPI.getStockMovement({ startDate, endDate }),
            ]);
            setSalesData(salesRes.data.data);
            setInventoryData(invRes.data.data);
            setMovementData(movRes.data.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
            setError('Failed to load analytics. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [timeRange, getDateRange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Calculate current date range for the ComparisonsTab independent fetching
    const currentDateRange = getDateRange(timeRange);

    return (
        <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} pt-28`}>
                    <div className="p-6">

                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Analytics</h1>
                                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>Deep-dive into sales, inventory health, and stock movements.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
                                        className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700'}`}>
                                        <option value="7days">Last 7 Days</option>
                                        <option value="30days">Last 30 Days</option>
                                        <option value="90days">Last 90 Days</option>
                                        <option value="6months">Last 6 Months</option>
                                        <option value="1year">Last Year</option>
                                    </select>
                                    <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors" title="Refresh">
                                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tab navigation */}
                        <div className={`flex gap-1 p-1 rounded-xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} overflow-x-auto`}>
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;
                                return (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${active
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : isDark
                                                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}>
                                        <Icon className="h-4 w-4" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} border flex items-center justify-between`}>
                                <p className={isDark ? 'text-red-300' : 'text-red-800'}>{error}</p>
                                <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Retry</button>
                            </div>
                        )}

                        {/* Loading skeleton */}
                        {loading && activeTab !== 'compare' && (
                            <div className="space-y-6 animate-pulse">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5`}>
                                            <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-24 mb-4`} />
                                            <div className={`h-8 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded w-32 mb-2`} />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {[1, 2].map(i => <div key={i} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 h-72`} />)}
                                </div>
                            </div>
                        )}

                        {/* Tab content */}
                        {!loading && !error && activeTab !== 'compare' && (
                            <>
                                {activeTab === 'sales' && <SalesDemandTab data={salesData} isDark={isDark} />}
                                {activeTab === 'inventory' && <InventoryHealthTab data={inventoryData} isDark={isDark} />}
                                {activeTab === 'movement' && <StockMovementTab data={movementData} isDark={isDark} />}
                            </>
                        )}
                        
                        {/* Comparison Tab renders independently of main loading state */}
                        {activeTab === 'compare' && <ComparisonsTab dateRange={currentDateRange} isDark={isDark} />}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Analytics;
