import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useTheme } from '../../contexts/ThemeContext';
import ExpandableChart from './ExpandableChart';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const ReportsChart = ({ data: chartData, title = 'Sales by Category' }) => {
  const { isDark } = useTheme();
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDark ? '#fff' : '#333',
        }
      },
      title: {
        display: true,
        text: title,
        color: isDark ? '#fff' : '#333',
      },
    }
  };
  
  const fallbackData = {
    labels: ['Electronics', 'Clothing', 'Food & Beverages', 'Home & Garden', 'Health & Beauty', 'Sports & Outdoors', 'Books & Media', 'Toys & Games', 'Automotive', 'Office Supplies', 'Jewelry & Accessories', 'Baby & Kids', 'Pet Supplies', 'Construction & Hardware', 'Industrial & Scientific', 'Arts & Crafts', 'Musical Instruments', 'Travel & Luggage', 'Party & Event Supplies'],
    datasets: [
      {
        data: [15, 12, 10, 8, 7, 6, 5, 5, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1],
        backgroundColor: [
          'rgba(79, 70, 229, 0.85)',      // Electronics
          'rgba(14, 165, 233, 0.85)',      // Clothing
          'rgba(16, 185, 129, 0.85)',      // Food & Beverages
          'rgba(245, 158, 11, 0.85)',      // Home & Garden
          'rgba(244, 63, 94, 0.85)',        // Health & Beauty
          'rgba(139, 92, 246, 0.85)',       // Sports & Outdoors
          'rgba(236, 72, 153, 0.85)',       // Books & Media
          'rgba(8, 145, 178, 0.85)',        // Toys & Games
          'rgba(20, 184, 166, 0.85)',       // Automotive
          'rgba(251, 146, 60, 0.85)',       // Office Supplies
          'rgba(225, 29, 72, 0.85)',        // Jewelry & Accessories
          'rgba(192, 132, 252, 0.85)',      // Baby & Kids
          'rgba(124, 58, 237, 0.85)',       // Pet Supplies
          'rgba(34, 197, 94, 0.85)',        // Construction & Hardware
          'rgba(251, 113, 133, 0.85)',      // Industrial & Scientific
          'rgba(99, 102, 241, 0.85)',       // Arts & Crafts
          'rgba(168, 85, 247, 0.85)',       // Musical Instruments
          'rgba(59, 130, 246, 0.85)',       // Travel & Luggage
          'rgba(107, 114, 128, 0.85)',      // Party & Event Supplies
        ],
        borderColor: [
          'rgb(79, 70, 229)',
          'rgb(14, 165, 233)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(244, 63, 94)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(8, 145, 178)',
          'rgb(20, 184, 166)',
          'rgb(251, 146, 60)',
          'rgb(225, 29, 72)',
          'rgb(192, 132, 252)',
          'rgb(124, 58, 237)',
          'rgb(34, 197, 94)',
          'rgb(251, 113, 133)',
          'rgb(99, 102, 241)',
          'rgb(168, 85, 247)',
          'rgb(59, 130, 246)',
          'rgb(107, 114, 128)',
        ],
        borderWidth: 1,
      },
    ],
  };
  const data = chartData && Array.isArray(chartData.labels) && chartData.labels.length > 0
    ? chartData
    : fallbackData;

  // Calculate statistics for the chart
  const totalSales = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
  const topCategory = Math.max(...data.datasets[0].data);
  const topCategoryIndex = data.datasets[0].data.indexOf(topCategory);
  const topCategoryName = data.labels[topCategoryIndex];
  
  // Get top 3 categories for display
  const categoryData = data.labels.map((label, index) => ({
    name: label,
    value: data.datasets[0].data[index],
    percentage: ((data.datasets[0].data[index] / totalSales) * 100).toFixed(1)
  })).sort((a, b) => b.value - a.value).slice(0, 3);

  const stats = [
    {
      label: 'Total Categories',
      value: data.labels.length,
      color: 'text-slate-700 dark:text-slate-200',
      description: 'Product categories'
    },
    {
      label: 'Top Category',
      value: `${((topCategory / totalSales) * 100).toFixed(1)}%`,
      color: 'text-indigo-600 dark:text-indigo-400',
      description: topCategoryName
    },
    {
      label: categoryData[0]?.name || 'Leading Category',
      value: `${categoryData[0]?.percentage || 0}%`,
      color: 'text-indigo-600 dark:text-indigo-400',
      description: 'Top performing'
    },
    {
      label: 'Total Sales',
      value: totalSales,
      color: 'text-slate-700 dark:text-slate-200',
      description: 'All categories'
    }
  ];

  return (
    <ExpandableChart
      title={title}
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      <Doughnut options={options} data={data} />
    </ExpandableChart>
  );
};

export default ReportsChart;
