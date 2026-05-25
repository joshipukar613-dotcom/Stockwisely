import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import ReportsChart from '../components/charts/ReportsChart';
import TrendChart from '../components/charts/TrendChart';
import ComparisonChart from '../components/charts/ComparisonChart';
import KPIDashboard from '../components/charts/KPIDashboard';
import InventoryReports from '../components/inventory/InventoryReports';
import InventoryAnalytics from '../components/inventory/InventoryAnalytics';
import { initialProducts } from '../data/inventoryData';
import { reportsAPI, dashboardAPI, salesAPI, purchasesAPI, vendorsAPI } from '../api';
import VendorAutocomplete from '../components/vendors/VendorAutocomplete';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  BarChart3,
  PieChart,
  TrendingUp,
  Search,
  Settings,
  Mail,
  Clock,
  Eye,
  Share2,
  MoreVertical,
  RefreshCw,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Star,
  Zap,
  Target,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  TrendingDown,
  RotateCcw,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

function Reports() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const { reportType } = useParams();
  const navigate = useNavigate();
  const reportContentRef = React.useRef(null);
  const [activeTab, setActiveTab] = useState(reportType || 'inventory');
  const [timePeriod, setTimePeriod] = useState('This Month');
  const [showFilters, setShowFilters] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReports, setSelectedReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Report data state
  const [salesSummary, setSalesSummary] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [slowMovers, setSlowMovers] = useState([]);
  const [inventoryReport, setInventoryReport] = useState([]);
  const [batchProfits, setBatchProfits] = useState([]);
  const [vendorComparisons, setVendorComparisons] = useState([]);
  const [loading, setLoading] = useState({ sales: false, top: false, slow: false, inventory: false, fifo: false });

  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);

  // Returns data state
  const [returnsList, setReturnsList] = useState([]);
  const [returnsSummary, setReturnsSummary] = useState({
    total_returns: 0,
    total_amount: 0,
    top_reasons: [],
    returned_products: []
  });
  const [purchaseReturnsList, setPurchaseReturnsList] = useState([]);
  const [purchaseReturnsSummary, setPurchaseReturnsSummary] = useState({
    total_returns: 0,
    total_amount: 0,
    top_reasons: [],
    returned_products: []
  });
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendors, setVendors] = useState([]);

  // Fetch sales summary
  const fetchSalesSummary = async () => {
    try {
      setLoading(prev => ({ ...prev, sales: true }));
      const response = await reportsAPI.getSalesSummary({ startDate, endDate });
      setSalesSummary(response.data.data);
    } catch (err) {
      console.error('Failed to fetch sales summary:', err);
      setError(err.response?.data?.message || 'Failed to load sales summary');
    } finally {
      setLoading(prev => ({ ...prev, sales: false }));
    }
  };

  // Fetch top performers
  const fetchTopPerformers = async () => {
    try {
      setLoading(prev => ({ ...prev, top: true }));
      const response = await reportsAPI.getTopPerformers({ limit: 20, startDate, endDate });
      setTopPerformers(response.data.data);
    } catch (err) {
      console.error('Failed to fetch top performers:', err);
    } finally {
      setLoading(prev => ({ ...prev, top: false }));
    }
  };

  // Fetch slow movers
  const fetchSlowMovers = async () => {
    try {
      setLoading(prev => ({ ...prev, slow: true }));
      const response = await reportsAPI.getSlowMovers({ limit: 20, startDate, endDate });
      setSlowMovers(response.data.data);
    } catch (err) {
      console.error('Failed to fetch slow movers:', err);
    } finally {
      setLoading(prev => ({ ...prev, slow: false }));
    }
  };

  // Fetch inventory report
  const fetchInventoryReport = async () => {
    try {
      setLoading(prev => ({ ...prev, inventory: true }));
      const response = await reportsAPI.getInventoryReport();
      setInventoryReport(response.data.data);
    } catch (err) {
      console.error('Failed to fetch inventory report:', err);
    } finally {
      setLoading(prev => ({ ...prev, inventory: false }));
    }
  };

  // Fetch purchase returns report
  const fetchPurchaseReturnsReport = async () => {
    try {
      const params = { startDate, endDate };
      if (selectedVendorId) params.vendorId = selectedVendorId;

      const [listRes, summaryRes] = await Promise.all([
        purchasesAPI.getReturns(params),
        purchasesAPI.getReturnsSummary(params)
      ]);
      setPurchaseReturnsList(listRes.data.data || []);
      setPurchaseReturnsSummary(summaryRes.data.data || {
        total_returns: 0,
        total_amount: 0,
        top_reasons: [],
        returned_products: []
      });
    } catch (err) {
      console.error('Failed to fetch purchase returns report:', err);
    }
  };

  // Fetch vendors for filter
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await vendorsAPI.list();
        setVendors(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      }
    };
    fetchVendors();
  }, []);

  // Fetch returns report
  const fetchReturnsReport = async () => {
    try {
      const params = { startDate, endDate };
      const [listRes, summaryRes] = await Promise.all([
        salesAPI.getReturns(params),
        salesAPI.getReturnsSummary(params)
      ]);
      setReturnsList(listRes.data.data || []);
      setReturnsSummary(summaryRes.data.data || {
        total_returns: 0,
        total_amount: 0,
        top_reasons: [],
        returned_products: []
      });
    } catch (err) {
      console.error('Failed to fetch returns report:', err);
    }
  };

  const fetchFIFOReports = async () => {
    try {
      setLoading(prev => ({ ...prev, fifo: true }));
      const [profitsRes, comparisonsRes] = await Promise.all([
        reportsAPI.getBatchProfits({ startDate, endDate }),
        reportsAPI.getVendorPriceComparison()
      ]);
      setBatchProfits(profitsRes.data.data || []);
      setVendorComparisons(comparisonsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch FIFO reports:', err);
    } finally {
      setLoading(prev => ({ ...prev, fifo: false }));
    }
  };


  // Sync activeTab with reportType from URL and Scroll to content
  useEffect(() => {
    if (reportType && reportType !== activeTab) {
      setActiveTab(reportType);
      
      // Delay scroll slightly to allow the tab content to render
      setTimeout(() => {
        if (reportContentRef.current) {
          reportContentRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
  }, [reportType]);

  // Fetch all reports on mount and when date range changes
  useEffect(() => {
    fetchSalesSummary();
    fetchTopPerformers();
    fetchSlowMovers();
    fetchInventoryReport();
    fetchReturnsReport();
    fetchPurchaseReturnsReport();
  }, [startDate, endDate, selectedVendorId]);

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesSummary();
      fetchTopPerformers();
      fetchSlowMovers();
    }
    if (activeTab === 'inventory') fetchInventoryReport();
    if (activeTab === 'returns') {
      fetchReturnsReport();
      fetchPurchaseReturnsReport();
    }
    if (activeTab === 'fifo') fetchFIFOReports();
  }, [activeTab, startDate, endDate]);

  // Fetch dashboard monthly trend for accurate time-series charts

  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        const res = await dashboardAPI.getSummary();
        setMonthlyTrend(res.data?.data?.monthlyTrend || []);
      } catch (err) {
        console.error('Failed to fetch monthly trend:', err);
      }
    };
    fetchMonthly();
  }, []);

  // Build chart data from fetched reports for accuracy
  const monthlyLabels = Array.isArray(monthlyTrend)
    ? monthlyTrend.map(m => {
      const d = new Date(m.month);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    })
    : [];
  const monthlyRevenueSeries = Array.isArray(monthlyTrend)
    ? monthlyTrend.map(m => Number(m.revenue || 0))
    : [];

  const revenueTrendChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Revenue',
        data: monthlyRevenueSeries,
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Quarterly comparison (current vs previous year) from monthly trend
  const groupByQuarter = (rows) => {
    const byYearQuarter = {};
    rows.forEach(r => {
      const d = new Date(r.month);
      const year = d.getFullYear();
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      const key = `${year}-Q${quarter}`;
      byYearQuarter[key] = (byYearQuarter[key] || 0) + Number(r.revenue || 0);
    });
    return byYearQuarter;
  };
  const quarterly = groupByQuarter(monthlyTrend);
  const years = Array.from(new Set(monthlyTrend.map(r => new Date(r.month).getFullYear()))).sort((a, b) => a - b);
  const currentYear = years[years.length - 1];
  const previousYear = years.length > 1 ? years[years.length - 2] : currentYear;
  const comparisonLabels = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => `${q}`);
  const buildQuarterSeries = (year) => ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => quarterly[`${year}-Q${i + 1}`] || 0);
  const currentYearSeries = buildQuarterSeries(currentYear);
  const previousYearSeries = buildQuarterSeries(previousYear);

  const quarterlyComparisonData = {
    labels: comparisonLabels,
    datasets: [
      {
        label: `${currentYear}`,
        data: currentYearSeries,
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1
      },
      ...(previousYear !== currentYear ? [{
        label: `${previousYear}`,
        data: previousYearSeries,
        backgroundColor: 'rgba(14, 165, 233, 0.7)',
        borderColor: 'rgb(14, 165, 233)',
        borderWidth: 1
      }] : [])
    ]
  };

  // Category distribution from inventory report (by total_value)
  const categoryLabels = inventoryReport.map(r => r.category);
  const categoryValues = inventoryReport.map(r => Number(r.total_value || 0));
  const categoryChartData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryValues,
        backgroundColor: [
          'rgba(79, 70, 229, 0.85)',
          'rgba(14, 165, 233, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(244, 63, 94, 0.85)',
          'rgba(139, 92, 246, 0.85)',
        ],
        borderColor: [
          'rgb(79, 70, 229)',
          'rgb(14, 165, 233)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(244, 63, 94)',
          'rgb(139, 92, 246)',
        ],
        borderWidth: 1
      }
    ]
  };

  // Report types with enhanced data
  const reportTypes = [
    { id: 'sales', name: 'Sales Reports', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'returns', name: 'Sales Returns', icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-100' },
    { id: 'purchase-returns', name: 'Purchase Returns', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'inventory', name: 'Inventory Reports', icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
    { id: 'financial', name: 'Financial Reports', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: 'customer', name: 'Customer Reports', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'performance', name: 'Performance Reports', icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'analytics', name: 'Analytics Reports', icon: BarChart3, color: 'text-pink-600', bg: 'bg-pink-100' },
    { id: 'fifo', name: 'FIFO Batch Reports', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100' }
  ];


  // Time period options
  const timePeriods = [
    'Today', 'This Week', 'This Month', 'Last Month', 'This Quarter', 'Last Quarter', 'This Year', 'Last Year', 'Custom Range'
  ];

  // Export formats
  const exportFormats = ['PDF', 'Excel', 'CSV', 'JSON'];

  // Scheduled reports data
  const scheduledReports = [
    {
      id: 1,
      name: 'Weekly Sales Summary',
      frequency: 'Weekly',
      nextRun: '2024-01-15',
      recipients: ['admin@company.com', 'manager@company.com'],
      status: 'active',
      lastRun: '2024-01-08'
    },
    {
      id: 2,
      name: 'Monthly Inventory Report',
      frequency: 'Monthly',
      nextRun: '2024-02-01',
      recipients: ['inventory@company.com'],
      status: 'active',
      lastRun: '2024-01-01'
    },
    {
      id: 3,
      name: 'Quarterly Financial Review',
      frequency: 'Quarterly',
      nextRun: '2024-04-01',
      recipients: ['finance@company.com', 'ceo@company.com'],
      status: 'paused',
      lastRun: '2023-10-01'
    }
  ];

  // Enhanced report data with more fields
  const reportsData = [
    {
      id: 1,
      name: 'Monthly Sales Summary',
      type: 'sales',
      date: '2024-01-15',
      format: 'PDF',
      size: '1.2 MB',
      status: 'completed',
      priority: 'high',
      description: 'Comprehensive sales analysis for the current month',
      tags: ['sales', 'monthly', 'summary'],
      views: 45,
      downloads: 12,
      author: 'John Doe',
      lastModified: '2024-01-15T10:30:00Z'
    },
    {
      id: 8,
      name: 'Sales Returns Analytics',
      type: 'returns',
      date: new Date().toISOString().split('T')[0],
      format: 'Dashboard',
      size: 'Live',
      status: 'active',
      priority: 'medium',
      description: 'Real-time analysis of returned goods and reasons',
      tags: ['returns', 'analytics', 'refunds'],
      views: 12,
      downloads: 4,
      author: 'System',
      lastModified: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Inventory Stock Levels',
      type: 'inventory',
      date: '2024-01-14',
      format: 'XLSX',
      size: '3.5 MB',
      status: 'completed',
      priority: 'medium',
      description: 'Current inventory levels across all categories',
      tags: ['inventory', 'stock', 'levels'],
      views: 32,
      downloads: 8,
      author: 'Jane Smith',
      lastModified: '2024-01-14T14:20:00Z'
    },
    {
      id: 3,
      name: 'Quarterly Financial Statement',
      type: 'financial',
      date: '2024-01-13',
      format: 'PDF',
      size: '2.8 MB',
      status: 'completed',
      priority: 'high',
      description: 'Q4 financial performance and analysis',
      tags: ['financial', 'quarterly', 'finance'],
      views: 67,
      downloads: 23,
      author: 'Mike Johnson',
      lastModified: '2024-01-13T09:15:00Z'
    },
    {
      id: 4,
      name: 'Customer Acquisition Report',
      type: 'customer',
      date: '2024-01-12',
      format: 'PDF',
      size: '1.5 MB',
      status: 'completed',
      priority: 'medium',
      description: 'New customer acquisition trends and analysis',
      tags: ['customer', 'acquisition', 'trends'],
      views: 28,
      downloads: 5,
      author: 'Sarah Wilson',
      lastModified: '2024-01-12T16:45:00Z'
    },
    {
      id: 5,
      name: 'Product Performance Analysis',
      type: 'sales',
      date: '2024-01-11',
      format: 'XLSX',
      size: '4.2 MB',
      status: 'completed',
      priority: 'high',
      description: 'Detailed analysis of product sales performance',
      tags: ['product', 'performance', 'analysis'],
      views: 89,
      downloads: 34,
      author: 'David Brown',
      lastModified: '2024-01-11T11:30:00Z'
    },
    {
      id: 6,
      name: 'Inventory Turnover Report',
      type: 'inventory',
      date: '2024-01-10',
      format: 'PDF',
      size: '1.8 MB',
      status: 'completed',
      priority: 'medium',
      description: 'Inventory turnover rates and optimization recommendations',
      tags: ['inventory', 'turnover', 'optimization'],
      views: 41,
      downloads: 15,
      author: 'Lisa Davis',
      lastModified: '2024-01-10T13:20:00Z'
    },
    {
      id: 7,
      name: 'Cash Flow Statement',
      type: 'financial',
      date: '2024-01-09',
      format: 'PDF',
      size: '2.1 MB',
      status: 'completed',
      priority: 'high',
      description: 'Monthly cash flow analysis and projections',
      tags: ['cashflow', 'financial', 'projections'],
      views: 56,
      downloads: 19,
      author: 'Robert Taylor',
      lastModified: '2024-01-09T08:45:00Z'
    },
    {
      id: 8,
      name: 'Customer Retention Analysis',
      type: 'customer',
      date: '2024-01-08',
      format: 'XLSX',
      size: '3.0 MB',
      status: 'completed',
      priority: 'medium',
      description: 'Customer retention rates and churn analysis',
      tags: ['customer', 'retention', 'churn'],
      views: 73,
      downloads: 27,
      author: 'Emily Anderson',
      lastModified: '2024-01-08T15:10:00Z'
    },
    {
      id: 9,
      name: 'Performance Dashboard',
      type: 'performance',
      date: '2024-01-07',
      format: 'PDF',
      size: '2.5 MB',
      status: 'completed',
      priority: 'high',
      description: 'Executive performance dashboard with KPIs',
      tags: ['performance', 'dashboard', 'kpi'],
      views: 124,
      downloads: 41,
      author: 'Mark Thompson',
      lastModified: '2024-01-07T12:00:00Z'
    },
    {
      id: 10,
      name: 'Analytics Deep Dive',
      type: 'analytics',
      date: '2024-01-06',
      format: 'XLSX',
      size: '5.1 MB',
      status: 'completed',
      priority: 'medium',
      description: 'Comprehensive analytics and insights report',
      tags: ['analytics', 'insights', 'deep-dive'],
      views: 38,
      downloads: 12,
      author: 'Jennifer Lee',
      lastModified: '2024-01-06T17:30:00Z'
    }
  ];

  // Enhanced filtering and sorting logic
  const filteredReports = reportsData
    .filter(report => {
      const matchesTab = activeTab === 'all' || report.type === activeTab;
      const matchesSearch = searchTerm === '' ||
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'size':
          aValue = parseFloat(a.size);
          bValue = parseFloat(b.size);
          break;
        case 'views':
          aValue = a.views;
          bValue = b.views;
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Helper functions
  const handleSelectReport = (reportId) => {
    setSelectedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    setSelectedReports(
      selectedReports.length === filteredReports.length
        ? []
        : filteredReports.map(report => report.id)
    );
  };

  const handleExport = (format) => {
    // Simulate export functionality
    console.log(`Exporting ${selectedReports.length} reports in ${format} format`);
    // In a real app, this would trigger the actual export process
  };

  const handleScheduleReport = (reportData) => {
    console.log('Scheduling report:', reportData);
    setShowScheduleModal(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Enhanced report metrics
  const reportMetrics = [
    {
      title: 'Total Reports',
      value: reportsData.length.toString(),
      change: '+3 this week',
      trend: 'up',
      icon: FileText,
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      title: 'Active Reports',
      value: reportsData.filter(r => r.status === 'completed').length.toString(),
      change: '98.5% success rate',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-50'
    },
    {
      title: 'Total Views',
      value: reportsData.reduce((sum, r) => sum + r.views, 0).toString(),
      change: '+15.2%',
      trend: 'up',
      icon: Eye,
      color: 'text-purple-500',
      bg: 'bg-purple-50'
    },
    {
      title: 'Downloads',
      value: reportsData.reduce((sum, r) => sum + r.downloads, 0).toString(),
      change: '+22.1%',
      trend: 'up',
      icon: Download,
      color: 'text-orange-500',
      bg: 'bg-orange-50'
    },
  ];

  // Quick stats for dashboard
  const quickStats = [
    {
      title: 'Most Viewed Report',
      value: 'Performance Dashboard',
      subtitle: '124 views',
      icon: Star,
      color: 'text-yellow-600'
    },
    {
      title: 'Recent Activity',
      value: '3 new reports today',
      subtitle: 'Last updated 2 hours ago',
      icon: Activity,
      color: 'text-green-600'
    },
    {
      title: 'Scheduled Reports',
      value: scheduledReports.filter(r => r.status === 'active').length.toString(),
      subtitle: 'Active schedules',
      icon: Clock,
      color: 'text-blue-600'
    }
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Navbar />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''} pt-20 overflow-x-hidden`}>
          <div className="w-full max-w-7xl mx-auto px-4 py-6">
            {/* Enhanced Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 mt-4">
              <div className="mb-4 lg:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    Reports & Analytics
                  </h1>
                  <div className="flex items-center space-x-2">
                    <button className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                      }`}>
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                      }`}>
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Generate, schedule, and analyze comprehensive business reports with advanced insights.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <select
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value)}
                      className={`appearance-none flex items-center px-4 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 bg-gray-800' : 'border-gray-300 text-gray-700 bg-white'
                        }`}
                    >
                      {timePeriods.map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none" />
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center px-4 py-2 border rounded-lg ${showFilters
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : isDark
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </button>
                </div>

                {activeTab === 'purchase-returns' && (
                  <div className="flex items-center space-x-2">
                    <div className={`relative`}>
                      <select
                        value={selectedVendorId}
                        onChange={(e) => setSelectedVendorId(e.target.value)}
                        className={`appearance-none flex items-center px-4 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300 bg-gray-800' : 'border-gray-300 text-gray-700 bg-white'
                          }`}
                      >
                        <option value="">All Vendors</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule
                  </button>
                  <button
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Report
                  </button>
                </div>
              </div>
            </div>

            {/* Available Reports - choose report type, then scroll down to see report content */}
            <div ref={reportContentRef} className={`scroll-mt-24 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg overflow-hidden mb-8`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                    <div>
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                        Available Reports
                      </h3>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Select a report type below, then scroll down to view the report content.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {filteredReports.length} reports
                      </span>
                      {selectedReports.length > 0 && (
                        <span className={`text-sm px-2 py-1 rounded-full ${isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                          {selectedReports.length} selected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className={`relative`}>
                        <input
                          type="text"
                          placeholder="Search reports..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 ${isDark
                            ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                        />
                        <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                      </div>

                      {selectedReports.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleExport('PDF')}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </button>
                          <button
                            onClick={() => setSelectedReports([])}
                            className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedReports.length > 0 && (
                  <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                          {selectedReports.length} reports selected
                        </span>
                        <div className="flex items-center space-x-2">
                          {exportFormats.map(format => (
                            <button
                              key={format}
                              onClick={() => handleExport(format)}
                              className="flex items-center px-3 py-1 text-sm border rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              {format}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        {selectedReports.length === filteredReports.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className={`flex border-b overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-200'
                }`}>
                <button
                  onClick={() => { setActiveTab('all'); reportContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className={`flex items-center px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'all'
                    ? isDark
                      ? 'border-b-2 border-indigo-500 text-indigo-400'
                      : 'border-b-2 border-indigo-600 text-indigo-600'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  All Reports
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {reportsData.length}
                  </span>
                </button>
                {reportTypes.map(type => {
                  const count = reportsData.filter(r => r.type === type.id).length;
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => { setActiveTab(type.id); reportContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      className={`flex items-center px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === type.id
                        ? isDark
                          ? 'border-b-2 border-indigo-500 text-indigo-400'
                          : 'border-b-2 border-indigo-600 text-indigo-600'
                        : isDark
                          ? 'text-gray-400 hover:text-gray-300'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {type.name}
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'
                    }`}>
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left">Report Name</th>
                      <th className="px-6 py-3 text-left">Type</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Priority</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Format</th>
                      <th className="px-6 py-3 text-left">Size</th>
                      <th className="px-6 py-3 text-left">Views</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        } ${selectedReports.includes(report.id) ? (isDark ? 'bg-indigo-900/20' : 'bg-indigo-50') : ''}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedReports.includes(report.id)}
                            onChange={() => handleSelectReport(report.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'
                              }`}>
                              {report.name}
                            </div>
                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                              by {report.author}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {report.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className={`px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  {tag}
                                </span>
                              ))}
                              {report.tags.length > 2 && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  +{report.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="capitalize text-sm">{report.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(report.priority)}`}>
                            {report.priority}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {new Date(report.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${report.format === 'PDF'
                            ? isDark ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'
                            : isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                            }`}>
                            {report.format}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {report.size}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          <div className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {report.views}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => { setActiveTab(report.type); reportContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`} title="View">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                handleExport(report.format);
                                alert(`Downloading ${report.name} in ${report.format} format...`);
                              }}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`} title="Download">
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => alert(`Share link for ${report.name} copied to clipboard!`)}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`} title="Share">
                              <Share2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleSelectReport(report.id)}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`} title="Select">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`px-6 py-4 ${isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Showing {filteredReports.length} of {reportsData.length} reports
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className={`px-3 py-1 text-sm border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
                      }`}>
                      Previous
                    </button>
                    <button className={`px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg`}>
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Report content - scroll down to view */}
            <div className="scroll-mt-4">

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {quickStats.map((stat, index) => (
                  <div
                    key={index}
                    className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      } border rounded-lg p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          {stat.title}
                        </p>
                        <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                          {stat.value}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                          {stat.subtitle}
                        </p>
                      </div>
                      <div className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FIFO Batch Reports Section */}
              {(activeTab === 'all' || activeTab === 'fifo') && (
                <div className="space-y-8 mb-8">
                  {/* Batch Profits Table */}
                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Batch-wise Profit Summary
                      </h3>
                      <button 
                        onClick={fetchFIFOReports}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <RefreshCw className={`h-5 w-5 ${loading.fifo ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                          <tr>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th className="px-4 py-3 text-right">Qty Sold</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                            <th className="px-4 py-3 text-right">Cost</th>
                            <th className="px-4 py-3 text-right text-green-600">Profit</th>
                            <th className="px-4 py-3 text-right">Margin %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {loading.fifo ? (
                            <tr><td colSpan="6" className="px-4 py-10 text-center">Loading FIFO data...</td></tr>
                          ) : batchProfits.length === 0 ? (
                            <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">No batch profit data for this period.</td></tr>
                          ) : (
                            batchProfits.map((item, idx) => (
                              <tr key={idx} className={isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                                <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.product_name}</td>
                                <td className="px-4 py-3 text-right">{Number(item.total_qty_sold).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">Rs. {Number(item.total_revenue).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">Rs. {Number(item.total_cost).toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-bold">Rs. {Number(item.total_profit).toLocaleString()}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${Number(item.profit_margin_pct) > 15 ? 'text-green-500' : 'text-orange-500'}`}>
                                  {Number(item.profit_margin_pct).toFixed(1)}%
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Vendor Price Comparison */}
                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                    <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Vendor Cost Price Comparison
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                          <tr>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th className="px-4 py-3 text-left">Vendor</th>
                            <th className="px-4 py-3 text-right">Avg Cost</th>
                            <th className="px-4 py-3 text-right">Min Cost</th>
                            <th className="px-4 py-3 text-right">Max Cost</th>
                            <th className="px-4 py-3 text-right">Batches</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {vendorComparisons.map((item, idx) => (
                            <tr key={idx} className={isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                              <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{item.product_name}</td>
                              <td className="px-4 py-3">{item.vendor_name}</td>
                              <td className="px-4 py-3 text-right font-bold">Rs. {Number(item.avg_cost_price).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-green-600">Rs. {Number(item.min_cost_price).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-red-600">Rs. {Number(item.max_cost_price).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">{item.batch_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Summary Section */}

              {(activeTab === 'all' || activeTab === 'sales' || activeTab === 'financial') && salesSummary && (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 mb-8`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    Sales Summary ({new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Sales</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {salesSummary.total_sales?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Rs. {salesSummary.total_revenue?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg Order Value</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Rs. {Math.round(salesSummary.avg_order_value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Items Sold</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {salesSummary.total_items_sold?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Performers Section */}
              {(activeTab === 'all' || activeTab === 'sales' || activeTab === 'performance') && topPerformers.length > 0 && (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 mb-8`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    Top Performing Products
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'
                        }`}>
                        <tr>
                          <th className="px-4 py-2 text-left">Product</th>
                          <th className="px-4 py-2 text-left">Code</th>
                          <th className="px-4 py-2 text-right">Revenue</th>
                          <th className="px-4 py-2 text-right">Quantity</th>
                          <th className="px-4 py-2 text-right">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {topPerformers.map((product, index) => (
                          <tr key={index}>
                            <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {product.product_name || 'N/A'}
                            </td>
                            <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {product.product_code || 'N/A'}
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              Rs. {(product.total_revenue || 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {(product.total_quantity || 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {(product.order_count || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Slow Movers Section */}
              {(activeTab === 'all' || activeTab === 'inventory' || activeTab === 'sales' || activeTab === 'performance') && slowMovers.length > 0 && (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 mb-8`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    Slow Moving Products
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'
                        }`}>
                        <tr>
                          <th className="px-4 py-2 text-left">Product</th>
                          <th className="px-4 py-2 text-left">Code</th>
                          <th className="px-4 py-2 text-right">Revenue</th>
                          <th className="px-4 py-2 text-right">Quantity</th>
                          <th className="px-4 py-2 text-right">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {slowMovers.map((product, index) => (
                          <tr key={index}>
                            <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {product.product_name || 'N/A'}
                            </td>
                            <td className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {product.product_code || 'N/A'}
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              Rs. {(product.total_revenue || 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {(product.total_quantity || 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {(product.order_count || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Inventory Report by Category */}
              {(activeTab === 'all' || activeTab === 'inventory' || activeTab === 'financial') && inventoryReport.length > 0 && (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 mb-8`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    Inventory Value by Category
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'
                        }`}>
                        <tr>
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-right">Products</th>
                          <th className="px-4 py-2 text-right">Total Quantity</th>
                          <th className="px-4 py-2 text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {inventoryReport.map((item, index) => (
                          <tr key={index}>
                            <td className={`px-4 py-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {item.category || 'Uncategorized'}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {(item.product_count || 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {(item.total_quantity || 0).toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              Rs. {(item.total_value || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Enhanced Metrics Cards */}
              {(activeTab === 'all' || activeTab === 'performance' || activeTab === 'analytics') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {reportMetrics.map((metric, index) => (
                  <div
                    key={index}
                    className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      } border rounded-lg p-6 hover:shadow-lg transition-shadow`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {metric.title}
                      </h3>
                      <div className={`p-2 rounded-full ${metric.bg}`}>
                        <metric.icon className={`h-5 w-5 ${metric.color}`} />
                      </div>
                    </div>
                    <p className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                      {metric.value}
                    </p>
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${metric.color}`}>
                        {metric.trend === 'up' ? <ArrowUpRight className="h-4 w-4 inline" /> : <ArrowDownRight className="h-4 w-4 inline" />} {metric.change}
                      </span>
                      <span className={`text-sm ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        vs last period
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {/* Advanced Filters Panel */}
              {showFilters && (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 mb-8`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                      Advanced Filters
                    </h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg ${isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                      >
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                        <option value="views">Views</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Order
                      </label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg ${isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        View Mode
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'grid'
                            ? 'bg-indigo-600 text-white'
                            : isDark
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          Grid
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'list'
                            ? 'bg-indigo-600 text-white'
                            : isDark
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          List
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg ${isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg ${isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Report Visualizations */}
              {(activeTab === 'all' || activeTab === 'sales' || activeTab === 'financial' || activeTab === 'analytics') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Trend Analysis */}
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                      Revenue Trends
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button className={`px-3 py-1.5 text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                        }`}>
                        Weekly
                      </button>
                      <button className={`px-3 py-1.5 text-sm font-medium ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        } rounded-lg`}>
                        Monthly
                      </button>
                      <button className={`px-3 py-1.5 text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                        }`}>
                        Yearly
                      </button>
                    </div>
                  </div>
                  <TrendChart title="Monthly Revenue Trend" height={300} data={revenueTrendChartData} />
                </div>

                {/* Comparison Analysis */}
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                      Performance Comparison
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button className={`px-3 py-1.5 text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                        }`}>
                        Q1
                      </button>
                      <button className={`px-3 py-1.5 text-sm font-medium ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        } rounded-lg`}>
                        Q2
                      </button>
                      <button className={`px-3 py-1.5 text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                        }`}>
                        Q3
                      </button>
                    </div>
                  </div>
                  <ComparisonChart title="Quarterly Revenue Comparison" height={300} data={quarterlyComparisonData} />
                </div>
              </div>
              )}

              {/* KPI Dashboard removed to ensure only accurate charts are displayed */}

              {/* Inventory Reports Section */}
              {(activeTab === 'all' || activeTab === 'inventory') && (
                <div className="mb-8">
                  <InventoryReports
                    products={[]}
                    onTabChange={setActiveTab}
                  />
                </div>
              )}

              {/* Category Distribution */}
              {/* Category Distribution - Hide if showing Returns */}
              {(activeTab === 'all' || activeTab === 'inventory' || activeTab === 'analytics') && (
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } border rounded-lg p-6 mb-8`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                      Sales Distribution by Category
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          handleExport('PDF');
                          alert('Exporting Sales Distribution report as PDF...');
                        }}
                        className={`px-3 py-1.5 text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                        }`}>
                        Export
                      </button>
                      <button 
                        onClick={() => alert('Share link generated for Sales Distribution chart!')}
                        className={`px-3 py-1.5 text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                        }`}>
                        Share
                      </button>
                    </div>
                  </div>
                  <div className="h-80">
                    <ReportsChart data={categoryChartData} title="Inventory Value by Category" />
                  </div>
                </div>
              )}

              {/* Sales Returns Section */}
              {(activeTab === 'all' || activeTab === 'returns') && (
                <div className="space-y-8 mb-8">
                  {/* Returns Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Total Returns</span>
                        <RotateCcw size={18} className="text-red-500" />
                      </div>
                      <div className="text-2xl font-bold">{returnsSummary.total_returns}</div>
                    </div>

                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Refund Amount</span>
                        <TrendingDown size={18} className="text-red-500" />
                      </div>
                      <div className="text-2xl font-bold text-red-500">Rs. {Math.abs(returnsSummary.total_amount || 0).toLocaleString()}</div>
                    </div>

                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Primary Reason</span>
                        <AlertCircle size={18} className="text-orange-500" />
                      </div>
                      <div className="text-lg font-bold truncate">
                        {returnsSummary.top_reasons[0]?.reason || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm lg:col-span-2`}>
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-indigo-500" />
                        Returns by Reason
                      </h3>
                      <div className="h-80 w-full relative">
                        <ComparisonChart
                          title="Returns by Reason"
                          valuePrefix=""
                          customStats={[
                            {
                              label: 'Total Returns',
                              value: returnsSummary.total_returns,
                              color: 'text-red-500',
                              description: 'Total return transactions'
                            },
                            {
                              label: 'Total Refund',
                              value: `Rs. ${Math.abs(returnsSummary.total_amount || 0).toLocaleString()}`,
                              color: 'text-orange-500',
                              description: 'Amount refunded'
                            }
                          ]}
                          data={{
                            labels: returnsSummary.top_reasons.map(r => r.reason),
                            datasets: [{
                              label: 'Return Count',
                              data: returnsSummary.top_reasons.map(r => r.count),
                              backgroundColor: 'rgba(239, 68, 68, 0.7)',
                              borderColor: 'rgb(239, 68, 68)',
                              borderWidth: 1
                            }]
                          }}
                        />
                      </div>
                    </div>

                    {/* Top Returned Products */}
                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <RotateCcw size={20} className="text-orange-500" />
                        Top Returned Products
                      </h3>
                      <div className="space-y-4">
                        {returnsSummary.returned_products.length > 0 ? (
                          returnsSummary.returned_products.slice(0, 5).map((prod, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{prod.product_name || prod.product_code}</p>
                                  <p className="text-xs text-gray-500">{prod.product_code}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{prod.return_count} returns</p>
                                <p className="text-xs text-gray-500">Qty: {prod.total_qty}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-gray-500 italic">No data available</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Returns History Table */}
                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm overflow-hidden`}>
                    <div className="p-6 border-b dark:border-gray-700">
                      <h3 className="font-semibold text-lg">Sales Returns Detail</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                          <tr>
                            <th className="px-6 py-3">Return ID</th>
                            <th className="px-6 py-3">Original Sale</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3 text-right">Refund</th>
                            <th className="px-6 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {returnsList.length > 0 ? returnsList.map((ret, idx) => (
                            <tr key={idx} className={isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                              <td className="px-6 py-4 font-medium text-red-500">{ret.invoice_number}</td>
                              <td className="px-6 py-4">{ret.original_sale_invoice || 'N/A'}</td>
                              <td className="px-6 py-4">{ret.customer_name}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs">
                                  {ret.return_reason || 'Other'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-bold">Rs. {Math.abs(ret.total_amount).toLocaleString()}</td>
                              <td className="px-6 py-4 text-gray-500">{new Date(ret.sale_date).toLocaleDateString()}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No returns found in this period.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Returns Section */}
              {(activeTab === 'all' || activeTab === 'purchase-returns') && (
                <div className="space-y-8 mb-8">
                  {/* Returns Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Total Purchase Returns</span>
                        <RotateCcw size={18} className="text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold">{purchaseReturnsSummary.total_returns}</div>
                    </div>

                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Total Refunded/Credited</span>
                        <TrendingDown size={18} className="text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold text-orange-600">Rs. {Math.abs(purchaseReturnsSummary.total_amount || 0).toLocaleString()}</div>
                    </div>

                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Primary Return Reason</span>
                        <AlertCircle size={18} className="text-red-500" />
                      </div>
                      <div className="text-lg font-bold truncate">
                        {purchaseReturnsSummary.top_reasons[0]?.reason || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm lg:col-span-2`}>
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-orange-500" />
                        Returns by Reason
                      </h3>
                      <div className="h-80 w-full relative">
                        <ComparisonChart
                          title="Purchase Returns by Reason"
                          valuePrefix=""
                          customStats={[
                            {
                              label: 'Total Returns',
                              value: purchaseReturnsSummary.total_returns,
                              color: 'text-orange-500',
                              description: 'Total return transactions'
                            },
                            {
                              label: 'Total Refund',
                              value: `Rs. ${Math.abs(purchaseReturnsSummary.total_amount || 0).toLocaleString()}`,
                              color: 'text-red-500',
                              description: 'Amount refunded'
                            }
                          ]}
                          data={{
                            labels: purchaseReturnsSummary.top_reasons.map(r => r.reason),
                            datasets: [{
                              label: 'Return Count',
                              data: purchaseReturnsSummary.top_reasons.map(r => r.count),
                              backgroundColor: 'rgba(249, 115, 22, 0.7)',
                              borderColor: 'rgb(249, 115, 22)',
                              borderWidth: 1
                            }]
                          }}
                        />
                      </div>
                    </div>

                    {/* Top Returned Products */}
                    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 shadow-sm`}>
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <RotateCcw size={20} className="text-red-500" />
                        Frequently Returned Products
                      </h3>
                      <div className="space-y-4">
                        {purchaseReturnsSummary.returned_products.length > 0 ? (
                          purchaseReturnsSummary.returned_products.slice(0, 5).map((prod, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{prod.product_name || prod.product_code}</p>
                                  <p className="text-xs text-gray-500">{prod.product_code}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{prod.return_count} returns</p>
                                <p className="text-xs text-gray-500">Qty: {prod.total_qty}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-gray-500 italic">No data available</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Purchase Returns History Table */}
                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm overflow-hidden`}>
                    <div className="p-6 border-b dark:border-gray-700">
                      <h3 className="font-semibold text-lg">Purchase Returns Detail</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                          <tr>
                            <th className="px-6 py-3">Return ID</th>
                            <th className="px-6 py-3">Original Purchase</th>
                            <th className="px-6 py-3">Vendor</th>
                            <th className="px-6 py-3">Return Type</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {purchaseReturnsList.length > 0 ? purchaseReturnsList.map((ret, idx) => (
                            <tr key={idx} className={isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                              <td className="px-6 py-4 font-medium text-orange-600">{ret.invoice_number}</td>
                              <td className="px-6 py-4">{ret.original_purchase_invoice || 'N/A'}</td>
                              <td className="px-6 py-4">{ret.vendor_name}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs ${ret.return_type === 'refund' ? 'bg-blue-100 text-blue-700' :
                                  ret.return_type === 'credit_note' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                  {ret.return_type || 'Refund'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-bold">Rs. {Math.abs(ret.total_amount).toLocaleString()}</td>
                              <td className="px-6 py-4 text-gray-500">{new Date(ret.purchase_date).toLocaleDateString()}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No purchase returns found in this period.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Scheduled Reports Section */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg mt-8`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    Scheduled Reports
                  </h3>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule New Report
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`text-xs uppercase ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'
                    }`}>
                    <tr>
                      <th className="px-6 py-3 text-left">Report Name</th>
                      <th className="px-6 py-3 text-left">Frequency</th>
                      <th className="px-6 py-3 text-left">Next Run</th>
                      <th className="px-6 py-3 text-left">Recipients</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {scheduledReports.map((schedule) => (
                      <tr key={schedule.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`}>
                        <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {schedule.name}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {schedule.frequency}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          {new Date(schedule.nextRun).toLocaleDateString()}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'
                          }`}>
                          <div className="flex flex-wrap gap-1">
                            {schedule.recipients.slice(0, 2).map((email, index) => (
                              <span key={index} className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {email}
                              </span>
                            ))}
                            {schedule.recipients.length > 2 && (
                              <span className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                }`}>
                                +{schedule.recipients.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${schedule.status === 'active'
                            ? 'text-green-600 bg-green-100'
                            : 'text-yellow-600 bg-yellow-100'
                            }`}>
                            {schedule.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => alert(`Opening preview of scheduled report: ${schedule.name}`)}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`} title="View">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => alert(`Downloading latest compiled version of: ${schedule.name}`)}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`} title="Download">
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => alert(`Opening settings for scheduled report: ${schedule.name}`)}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`} title="Settings">
                              <Settings className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => alert(`Paused scheduled report: ${schedule.name}`)}
                              className={`p-1 rounded ${isDark ? 'hover:bg-gray-600 border border-red-200' : 'hover:bg-red-100 text-red-500'
                              }`} title="Remove/Pause">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Schedule Report Modal */}
            {showScheduleModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className={`${isDark ? 'bg-gray-800' : 'bg-white'
                  } rounded-lg p-6 w-full max-w-md mx-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                      Schedule Report
                    </h3>
                    <button
                      onClick={() => setShowScheduleModal(false)}
                      className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Report Name
                      </label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg ${isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        placeholder="Enter report name"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Frequency
                      </label>
                      <select className={`w-full px-3 py-2 border rounded-lg ${isDark
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Recipients
                      </label>
                      <input
                        type="email"
                        className={`w-full px-3 py-2 border rounded-lg ${isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        placeholder="Enter email addresses (comma separated)"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setShowScheduleModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleScheduleReport({})}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Schedule Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Reports;
