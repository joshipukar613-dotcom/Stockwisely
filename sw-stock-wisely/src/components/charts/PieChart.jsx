import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ExpandableChart from './ExpandableChart';

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = ({ isDark = false, data: items, title = 'Top Products by Revenue' }) => {
  const labels = Array.isArray(items) ? items.map(i => i.product_name) : ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer Goods', 'Real Estate'];
  const values = Array.isArray(items) ? items.map(i => Number(i.total_revenue || 0)) : [35, 20, 15, 12, 10, 8];

  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        backgroundColor: [
          'rgba(79, 70, 229, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(244, 63, 94, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(14, 165, 233, 0.85)',
        ],
        borderColor: [
          'rgb(79, 70, 229)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(244, 63, 94)',
          'rgb(139, 92, 246)',
          'rgb(14, 165, 233)',
        ],
        borderWidth: 2,
        hoverOffset: 10,
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: isDark ? '#fff' : '#333',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: title,
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
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return label + ': ' + percentage + '%';
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: 'easeInOutQuart',
    }
  };

  // Calculate statistics for the chart
  const totalValue = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
  const largestSector = Math.max(...data.datasets[0].data);
  const largestSectorIndex = data.datasets[0].data.indexOf(largestSector);
  const largestSectorName = data.labels[largestSectorIndex];
  const largestSectorPercentage = ((largestSector / totalValue) * 100).toFixed(1);
  const smallestSector = Math.min(...data.datasets[0].data);
  const smallestSectorIndex = data.datasets[0].data.indexOf(smallestSector);
  const smallestSectorName = data.labels[smallestSectorIndex];
  const smallestSectorPercentage = ((smallestSector / totalValue) * 100).toFixed(1);

  const stats = [
    {
      label: 'Total Sectors',
      value: data.labels.length,
      color: 'text-slate-700 dark:text-slate-200',
      description: 'Portfolio diversity'
    },
    {
      label: 'Largest Sector',
      value: `${largestSectorPercentage}%`,
      color: 'text-emerald-600 dark:text-emerald-400',
      description: largestSectorName
    },
    {
      label: 'Smallest Sector',
      value: `${smallestSectorPercentage}%`,
      color: 'text-amber-600 dark:text-amber-400',
      description: smallestSectorName
    },
    {
      label: 'Diversification',
      value: `${(100 - largestSectorPercentage).toFixed(1)}%`,
      color: 'text-violet-600 dark:text-violet-400',
      description: 'Other sectors'
    }
  ];

  return (
    <ExpandableChart
      title="Portfolio Distribution by Sector"
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      <Pie data={data} options={options} />
    </ExpandableChart>
  );
};

export default PieChart;
