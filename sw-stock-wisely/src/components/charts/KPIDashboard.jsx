import React from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const KPIDashboard = ({ isDark = false }) => {
  const { isDark: themeIsDark } = useTheme();
  const darkMode = isDark || themeIsDark;

  // KPI Data
  const kpiData = [
    {
      title: 'Total Revenue',
      value: 'Rs. 2,450,000',
      change: '+12.5%',
      trend: 'up',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Active Customers',
      value: '1,234',
      change: '+8.3%',
      trend: 'up',
      icon: <Users className="h-6 w-6" />,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Inventory Value',
      value: 'Rs. 850,000',
      change: '-2.1%',
      trend: 'down',
      icon: <Package className="h-6 w-6" />,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    },
    {
      title: 'Conversion Rate',
      value: '24.8%',
      change: '+5.2%',
      trend: 'up',
      icon: <Target className="h-6 w-6" />,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ];

  // Revenue Distribution Data
  const revenueData = {
    labels: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'],
    datasets: [
      {
        data: [45, 25, 15, 10, 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Performance Metrics Data
  const performanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Sales Target',
        data: [100, 105, 110, 115, 120, 125],
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        fill: true
      },
      {
        label: 'Actual Sales',
        data: [95, 108, 112, 118, 125, 130],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        fill: true
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: darkMode ? '#fff' : '#333',
          padding: 20,
          usePointStyle: true
        }
      },
      title: {
        display: true,
        text: 'Revenue by Category',
        color: darkMode ? '#fff' : '#333',
        font: {
          size: 14,
          weight: 'bold'
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: darkMode ? '#fff' : '#333',
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'Performance vs Target',
        color: darkMode ? '#fff' : '#333',
        font: {
          size: 14,
          weight: 'bold'
        }
      }
    },
    scales: {
      y: {
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: darkMode ? '#fff' : '#333',
        }
      },
      x: {
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: darkMode ? '#fff' : '#333',
        }
      }
    }
  };

  return (
    <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="mb-6">
        <h3 className={`text-xl font-bold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          KPI Dashboard
        </h3>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiData.map((kpi, index) => (
            <div 
              key={index} 
              className={`${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              } rounded-lg p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-full ${kpi.bg}`}>
                  {React.cloneElement(kpi.icon, {
                    className: `h-5 w-5 ${kpi.color}`
                  })}
                </div>
                <div className="flex items-center">
                  {kpi.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ml-1 ${
                    kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
              <h4 className={`text-sm font-medium ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {kpi.title}
              </h4>
              <p className={`text-2xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Distribution */}
          <div className={`${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          } rounded-lg p-4`}>
            <div className="h-64">
              <Doughnut options={doughnutOptions} data={revenueData} />
            </div>
          </div>

          {/* Performance Chart */}
          <div className={`${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          } rounded-lg p-4`}>
            <div className="h-64">
              <Bar options={barOptions} data={performanceData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIDashboard;
