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

const ComparisonChart = ({ data, title, isDark }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 h-72 flex items-center justify-center`}>
        <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No comparison data available</p>
      </div>
    );
  }

  const { results } = data; // the array of monthly data
  if (!results || results.length === 0) {
    return (
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 h-72 flex items-center justify-center`}>
        <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Not enough data to compare selected items within this period.</p>
      </div>
    );
  }

  const labels = results.map(r => {
    const d = new Date(r.month);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
  });

  const m1Data = results.map(r => r.metric1 || 0);
  const m2Data = results.map(r => r.metric2 || 0);

  const label1 = results[0]?.label1 || 'Metric 1';
  const label2 = results[0]?.label2 || 'Metric 2';

  const formatCurrency = (value) => 'Rs. ' + value.toLocaleString();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#fff' : '#333',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += 'Rs. ' + context.parsed.y.toLocaleString();
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
          callback: function(value) {
            if (value >= 100000) {
              return 'Rs. ' + (value / 100000).toFixed(1) + 'L';
            }
            return 'Rs. ' + (value / 1000).toFixed(0) + 'K';
          }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      line: {
        tension: 0.4 // Smooth curves
      },
      point: {
        radius: 4,
        hoverRadius: 6
      }
    }
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: label1,
        data: m1Data,
        borderColor: '#4f46e5', // Indigo 600
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 3,
        fill: true,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#fff',
      },
      {
        label: label2,
        data: m2Data,
        borderColor: '#0ea5e9', // Sky 500
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 3,
        fill: true,
        pointBackgroundColor: '#0ea5e9',
        pointBorderColor: '#fff',
      }
    ],
  };

  const stats = [
    {
      label: label1,
      value: formatCurrency(m1Data.reduce((a, b) => a + b, 0)),
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: label2,
      value: formatCurrency(m2Data.reduce((a, b) => a + b, 0)),
      color: 'text-sky-600 dark:text-sky-400',
    }
  ];

  return (
    <ExpandableChart
      title={title || "Comparison"}
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      <div className="h-[300px] w-full">
        <Line options={options} data={chartData} />
      </div>
    </ExpandableChart>
  );
};

export default ComparisonChart;
