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
  Filler,
} from 'chart.js';
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

const LineChart = ({ isDark = false }) => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Stock Performance',
        data: [65, 59, 80, 81, 56, 95, 88, 76, 92, 85, 78, 90],
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(79, 70, 229)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Market Average',
        data: [45, 55, 70, 65, 60, 75, 72, 68, 78, 73, 70, 76],
        borderColor: 'rgb(100, 116, 139)',
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        borderWidth: 3,
        borderDash: [6, 4],
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(100, 116, 139)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

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
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: 'Stock Performance Trend',
        color: isDark ? '#fff' : '#333',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
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
            return context.dataset.label + ': ' + context.parsed.y + '%';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#fff' : '#333',
          font: {
            size: 11,
            weight: '500'
          },
          callback: function(value) {
            return value + '%';
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
            size: 11,
            weight: '500'
          }
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

  // Calculate statistics for the chart
  const stockPerformance = data.datasets[0].data;
  const marketAverage = data.datasets[1].data;
  
  const stockAvg = (stockPerformance.reduce((sum, value) => sum + value, 0) / stockPerformance.length).toFixed(1);
  const marketAvg = (marketAverage.reduce((sum, value) => sum + value, 0) / marketAverage.length).toFixed(1);
  const stockMax = Math.max(...stockPerformance);
  const stockMin = Math.min(...stockPerformance);
  const stockVolatility = ((stockMax - stockMin) / stockAvg * 100).toFixed(1);
  const outperformance = (stockAvg - marketAvg).toFixed(1);

  const stats = [
    {
      label: 'Stock Avg',
      value: `${stockAvg}%`,
      color: 'text-indigo-600 dark:text-indigo-400',
      description: '12-month average'
    },
    {
      label: 'Market Avg',
      value: `${marketAvg}%`,
      color: 'text-slate-600 dark:text-slate-400',
      description: '12-month average'
    },
    {
      label: 'Outperformance',
      value: `${outperformance > 0 ? '+' : ''}${outperformance}%`,
      color: outperformance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      description: 'vs market'
    },
    {
      label: 'Volatility',
      value: `${stockVolatility}%`,
      color: 'text-amber-600 dark:text-amber-400',
      description: 'Price range'
    }
  ];

  return (
    <ExpandableChart
      title="Stock Performance Trend"
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      <Line data={data} options={options} />
    </ExpandableChart>
  );
};

export default LineChart;