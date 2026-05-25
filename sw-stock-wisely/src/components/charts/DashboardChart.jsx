import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTheme } from '../../contexts/ThemeContext';
import ExpandableChart from './ExpandableChart';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DashboardChart = ({ data: monthlyTrend }) => {
  const { isDark } = useTheme();

  // Extract unique years from the data
  const availableYears = useMemo(() => {
    if (!Array.isArray(monthlyTrend) || monthlyTrend.length === 0) return [];
    const years = [...new Set(monthlyTrend.map(m => new Date(m.month).getFullYear()))];
    return years.sort((a, b) => b - a); // Newest first
  }, [monthlyTrend]);

  // Default to the most recent year
  const [selectedYear, setSelectedYear] = useState(() => {
    if (availableYears.length > 0) return availableYears[0];
    return new Date().getFullYear();
  });

  // Filter data for selected year
  const filteredTrend = useMemo(() => {
    if (!Array.isArray(monthlyTrend)) return [];
    return monthlyTrend.filter(m => new Date(m.month).getFullYear() === selectedYear);
  }, [monthlyTrend, selectedYear]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#fff' : '#333',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: `Monthly Revenue — ${selectedYear}`,
        color: isDark ? '#fff' : '#333',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 0,
          bottom: 12
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#fff' : '#333',
        bodyColor: isDark ? '#fff' : '#333',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': Rs. ' + context.parsed.y.toLocaleString();
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#fff' : '#333',
          font: {
            size: 12,
            weight: '600'
          },
          callback: function(value) {
            return 'Rs. ' + (value / 1000) + 'K';
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDark ? '#fff' : '#333',
          font: {
            size: 12,
            weight: '600'
          },
          maxRotation: 0,
          minRotation: 0,
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
    }
  };
  
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const labels = filteredTrend.map(m => {
    const d = new Date(m.month);
    return monthNames[d.getMonth()];
  });

  const revenueSeries = filteredTrend.map(m => Number(m.revenue || 0));

  const data = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueSeries,
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ],
  };

  // Calculate statistics for the filtered chart
  const totalRevenue = revenueSeries.reduce((sum, value) => sum + value, 0);
  const avgRevenue = revenueSeries.length ? (totalRevenue / revenueSeries.length).toFixed(0) : 0;

  const stats = [
    {
      label: 'Total Revenue',
      value: `Rs. ${(totalRevenue / 1000).toFixed(0)}K`,
      color: 'text-indigo-600 dark:text-indigo-400',
      description: `${labels.length} months in ${selectedYear}`
    },
    {
      label: 'Avg Monthly',
      value: `Rs. ${(avgRevenue / 1000).toFixed(0)}K`,
      color: 'text-slate-700 dark:text-slate-200',
      description: 'Revenue average'
    }
  ];

  // Year selector UI
  const yearSelector = (
    <div className="flex items-center gap-2 mb-3">
      <label className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Year:
      </label>
      <div className="flex flex-wrap gap-1.5">
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${
              selectedYear === year
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ExpandableChart
      title="Monthly Revenue"
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      {yearSelector}
      <Bar options={options} data={data} />
    </ExpandableChart>
  );
};

export default DashboardChart;
