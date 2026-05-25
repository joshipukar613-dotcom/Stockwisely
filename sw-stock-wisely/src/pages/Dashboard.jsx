import React from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import KPICard from '../components/dashboard/KPICard';
import InventoryAnalytics from '../components/inventory/InventoryAnalytics';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import QuickActionButton from '../components/dashboard/QuickActionButton';
import DashboardChart from '../components/charts/DashboardChart';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';
import DoughnutChart from '../components/charts/DoughnutChart';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  BarChart3,
  Calendar,
  PieChart as PieChartIcon,
  Activity,
  Target,
} from 'lucide-react';
import { recentActivity as dashboardRecentActivity } from '../data/dashboardData';
import { getDashboardMetrics } from '../services/inventoryService';
import { useEffect, useState } from 'react';
import { initialProducts } from '../data/inventoryData';
import { dashboardAPI } from '../api';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await dashboardAPI.getSummary();
        setDashboardData(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        // Don't set error on polling failure if we already have data
        if (!dashboardData) {
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Implement 30-second polling for real-time updates
    const intervalId = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(intervalId);
  }, [dashboardData]);

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      <Navbar />
      
      <div className="flex">
        <Sidebar />
        
        <main className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        } pt-20 sm:pt-28`}>
          <div className="p-3 sm:p-6">
            {/* Premium Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                    Welcome back, {user?.firstName || 'User'}! Here's what's happening with your inventory today.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <>
                      <button className={`px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} transition-colors flex items-center`}> 
                        <Calendar className="h-4 w-4 mr-2" /> Last 30 days
                      </button>
                      <button className="px-3 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" /> Export Report
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && !dashboardData && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && !dashboardData && (
              <div className={`p-4 rounded-lg mb-6 ${
                isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
              } border`}>
                <p className={`${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  Error: {error}
                </p>
              </div>
            )}

            {/* Dashboard Content */}
            {(dashboardData) && (
              <>
                {/* KPI Cards Grid - Role-based filtering handled inside component */}
                <DashboardKPIs isDark={isDark} dashboardData={dashboardData} role={user?.role} />

                {/* Charts and Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Sales Chart with Monthly Trend - ADMIN/MANAGER ONLY */}
                  {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <div className={`${
                      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    } border rounded-lg p-6`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          Monthly Sales Trend
                        </h3>
                        <BarChart3 className={`h-5 w-5 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                      </div>
                      <DashboardChart isDark={isDark} data={dashboardData.monthlyTrend} />
                    </div>
                  )}

                  {/* Recent Sales/Transactions - Filtered based on role */}
                  <div className={`${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 ${user?.role === 'SALES_CLERK' ? 'lg:col-span-2' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {user?.role === 'SALES_CLERK' ? 'My Recent Transactions' : 'Recent Sales'}
                      </h3>
                      <Calendar className={`h-5 w-5 ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {dashboardData.recentSales && dashboardData.recentSales.length > 0 ? (
                        dashboardData.recentSales.map((sale, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                <span className="font-medium">{sale.customer_name || 'N/A'}:</span> {sale.invoice_number}
                              </p>
                              <p className={`text-xs ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {new Date(sale.sale_date).toLocaleDateString()} - Rs. {sale.total_amount.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          No recent sales
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Products Chart - ADMIN/MANAGER ONLY */}
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && dashboardData.topProducts && dashboardData.topProducts.length > 0 && (
                  <div className={`${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 mb-8`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        Top Products (Last 30 Days)
                      </h3>
                      <PieChartIcon className={`h-5 w-5 ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                    <PieChart isDark={isDark} data={dashboardData.topProducts} />
                  </div>
                )}
              </>
            )}

            {/* Quick Actions - Filtered by role */}
            <div className={`mt-6 ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } border rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                  <>
                    <QuickActionButton icon={Package} label="Add Product" color="indigo" onClick={() => navigate('/inventory')} />
                    <QuickActionButton icon={AlertTriangle} label="Check Alerts" color="yellow" onClick={() => navigate('/alerts')} />
                  </>
                )}
                <QuickActionButton icon={TrendingUp} label="Record Sale" color="green" onClick={() => navigate('/sales')} />
                <QuickActionButton icon={Users} label="AI Assistant" color="purple" onClick={() => navigate('/ai-assistant')} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Local KPI component wired to API metrics with role-based filtering
function DashboardKPIs({ isDark, dashboardData, role }) {
  if (!dashboardData) return null;

  const kpis = [];

  // Metrics for ADMIN and MANAGER
  if (role === 'ADMIN' || role === 'MANAGER') {
    kpis.push(
      {
        title: 'Today\'s Sales',
        value: `Rs. ${dashboardData.salesStats?.todayRevenue?.toLocaleString() || '0'}`,
        subtitle: `${dashboardData.salesStats?.todayCount || 0} orders`,
        trend: 'up',
        status: 'Live',
        icon: TrendingUp,
      },
      {
        title: 'This Month',
        value: `Rs. ${dashboardData.salesStats?.monthRevenue?.toLocaleString() || '0'}`,
        subtitle: `${dashboardData.salesStats?.monthCount || 0} orders`,
        trend: 'up',
        status: 'Live',
        icon: BarChart3,
      },
      {
        title: 'Total Products',
        value: dashboardData.stockAlerts?.totalProducts?.toLocaleString() || '0',
        subtitle: `${dashboardData.stockAlerts?.lowStock || 0} low stock`,
        trend: 'up',
        status: 'Live',
        icon: Package,
      },
      {
        title: 'Stock Alerts',
        value: `${dashboardData.stockAlerts?.outOfStock || 0} out of stock`,
        subtitle: `${dashboardData.stockAlerts?.lowStock || 0} low stock`,
        trend: dashboardData.stockAlerts?.outOfStock > 0 ? 'down' : 'up',
        status: 'Live',
        icon: AlertTriangle,
      }
    );
  } else if (role === 'SALES_CLERK') {
    // Limited metrics for Sales Clerk
    kpis.push(
      {
        title: 'Today\'s My Sales',
        value: `Rs. ${dashboardData.salesStats?.todayRevenue?.toLocaleString() || '0'}`,
        subtitle: `${dashboardData.salesStats?.todayCount || 0} transactions`,
        trend: 'up',
        status: 'Live',
        icon: TrendingUp,
      },
      {
        title: 'Monthly Personal Total',
        value: `Rs. ${dashboardData.salesStats?.monthRevenue?.toLocaleString() || '0'}`,
        subtitle: 'Monthly target: Rs. 50,000',
        trend: 'up',
        status: 'Live',
        icon: Target,
      },
      {
        title: 'Low Stock Items',
        value: `${dashboardData.stockAlerts?.lowStock || 0} items`,
        subtitle: 'Needs attention',
        trend: 'down',
        status: 'Live',
        icon: AlertTriangle,
      },
      {
        title: 'Total Customers',
        value: '124', // Mocked as it's common for clerk
        subtitle: 'Active customers',
        trend: 'up',
        status: 'Live',
        icon: Users,
      }
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <KPICard
          key={index}
          title={kpi.title}
          value={kpi.value}
          subtitle={kpi.subtitle}
          trend={kpi.trend}
          status={kpi.status}
          icon={kpi.icon}
          isDark={isDark}
        />
      ))}
    </div>
  );
}

export default Dashboard;
