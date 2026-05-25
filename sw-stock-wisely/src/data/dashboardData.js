// Dashboard data for KPI cards and statistics
export const kpiData = [
  {
    title: 'Total Revenue',
    value: 'Rs. 2,45,000',
    change: '+12.5%',
    trend: 'up',
    icon: 'TrendingUp',
    color: 'green'
  },
  {
    title: 'Total Products',
    value: '1,234',
    change: '+5.2%',
    trend: 'up',
    icon: 'Package',
    color: 'blue'
  },
  {
    title: 'Low Stock Items',
    value: '23',
    change: '-8.1%',
    trend: 'down',
    icon: 'AlertTriangle',
    color: 'yellow'
  },
  {
    title: 'Orders Today',
    value: '156',
    change: '+18.3%',
    trend: 'up',
    icon: 'ShoppingCart',
    color: 'purple'
  }
];

// Recent activity data
export const recentActivity = [
  {
    id: 1,
    type: 'sale',
    description: 'New order #1234 received',
    amount: 'Rs. 2,500',
    time: '2 minutes ago',
    status: 'completed'
  },
  {
    id: 2,
    type: 'inventory',
    description: 'Stock updated for iPhone 14',
    amount: '+50 units',
    time: '15 minutes ago',
    status: 'completed'
  },
  {
    id: 3,
    type: 'alert',
    description: 'Low stock alert for Samsung Galaxy',
    amount: '5 units left',
    time: '1 hour ago',
    status: 'warning'
  },
  {
    id: 4,
    type: 'sale',
    description: 'Order #1233 shipped',
    amount: 'Rs. 1,800',
    time: '2 hours ago',
    status: 'completed'
  }
];

// Sales chart data
export const salesChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Sales',
      data: [65000, 59000, 80000, 81000, 56000, 85000],
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4
    }
  ]
};

// Top selling products
export const topProducts = [
  {
    id: 1,
    name: 'iPhone 14 Pro',
    sales: 145,
    revenue: 'Rs. 2,18,000',
    image: '/api/placeholder/40/40'
  },
  {
    id: 2,
    name: 'Samsung Galaxy S23',
    sales: 98,
    revenue: 'Rs. 1,47,000',
    image: '/api/placeholder/40/40'
  },
  {
    id: 3,
    name: 'MacBook Air M2',
    sales: 67,
    revenue: 'Rs. 8,04,000',
    image: '/api/placeholder/40/40'
  },
  {
    id: 4,
    name: 'iPad Pro',
    sales: 54,
    revenue: 'Rs. 4,32,000',
    image: '/api/placeholder/40/40'
  }
];

const dashboardData = {
  kpiData,
  recentActivity,
  salesChartData,
  topProducts
};

export default dashboardData;