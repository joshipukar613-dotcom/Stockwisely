import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useTheme } from '../../contexts/ThemeContext';
import ExpandableChart from './ExpandableChart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TrendChart = ({ data, title = "Trend Analysis", height = 300 }) => {
  const { isDark } = useTheme();
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#fff' : '#333',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20
        }
      },
      title: {
        display: true,
        text: title,
        color: isDark ? '#fff' : '#333',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#fff' : '#333',
        bodyColor: isDark ? '#fff' : '#333',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      y: {
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDark ? '#fff' : '#333',
        }
      },
      x: {
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: isDark ? '#fff' : '#333',
        }
      }
    },
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 4,
        hoverRadius: 6
      }
    }
  };

  const defaultData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Revenue',
        data: [65000, 72000, 68000, 75000, 82000, 78000, 85000, 90000, 87000, 92000, 88000, 95000],
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Expenses',
        data: [45000, 48000, 46000, 50000, 52000, 51000, 55000, 58000, 56000, 60000, 58000, 62000],
        borderColor: 'rgb(244, 63, 94)',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Profit',
        data: [20000, 24000, 22000, 25000, 30000, 27000, 30000, 32000, 31000, 32000, 30000, 33000],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartData = data || defaultData;
  
  // Calculate statistics for the chart (robust to variable dataset counts)
  const datasets = Array.isArray(chartData?.datasets) ? chartData.datasets : [];
  const series0 = datasets[0]?.data || [];
  const series1 = datasets[1]?.data || [];
  const series2 = datasets[2]?.data || [];

  const sum = (arr) => arr.reduce((s, v) => s + v, 0);
  const avg = (arr) => arr.length ? (sum(arr) / arr.length) : 0;
  const growthPct = (arr) => (arr.length > 1 && arr[0] !== 0) ? (((arr[arr.length - 1] - arr[0]) / arr[0]) * 100) : 0;

  const stats = datasets.length >= 3
    ? [
        {
          label: 'Total Revenue',
          value: `Rs. ${(sum(series0) / 1000).toFixed(0)}K`,
          color: 'text-indigo-600 dark:text-indigo-400',
          description: '12 months total'
        },
        {
          label: 'Total Profit',
          value: `Rs. ${(sum(series2) / 1000).toFixed(0)}K`,
          color: 'text-emerald-600 dark:text-emerald-400',
          description: '12 months total'
        },
        {
          label: 'Avg Monthly',
          value: `Rs. ${(avg(series2) / 1000).toFixed(0)}K`,
          color: 'text-violet-600 dark:text-violet-400',
          description: 'Monthly profit'
        },
        {
          label: 'Growth',
          value: `${growthPct(series2) > 0 ? '+' : ''}${growthPct(series2).toFixed(1)}%`,
          color: growthPct(series2) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          description: 'Profit growth'
        }
      ]
    : [
        {
          label: datasets[0]?.label || 'Series 1 Total',
          value: `${sum(series0).toLocaleString()}`,
          color: 'text-indigo-600 dark:text-indigo-400',
          description: 'Total over period'
        },
        ...(datasets[1]
          ? [{
              label: datasets[1].label || 'Series 2 Total',
              value: `${sum(series1).toLocaleString()}`,
              color: 'text-emerald-600 dark:text-emerald-400',
              description: 'Total over period'
            }]
          : []),
        {
          label: 'Avg Value',
          value: `${avg(series0).toFixed(0)}`,
          color: 'text-violet-600 dark:text-violet-400',
          description: datasets[0]?.label || 'Series 1'
        },
        {
          label: 'Growth',
          value: `${growthPct(series0) > 0 ? '+' : ''}${growthPct(series0).toFixed(1)}%`,
          color: growthPct(series0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          description: datasets[0]?.label || 'Series 1'
        }
      ];

  return (
    <ExpandableChart
      title={title}
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      <div style={{ height: height }}>
        <Line options={options} data={chartData} />
      </div>
    </ExpandableChart>
  );
};

export default TrendChart;
