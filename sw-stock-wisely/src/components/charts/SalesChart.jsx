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
} from 'chart.js';
import { useTheme } from '../../contexts/ThemeContext';
import ExpandableChart from './ExpandableChart';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SalesChart = () => {
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
        text: 'Sales Trends',
        color: isDark ? '#fff' : '#333',
      },
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
    }
  };
  
  const data = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Electronics',
        data: [45000, 59000, 68000, 81000],
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.15)',
        tension: 0.4,
        pointBackgroundColor: 'rgb(79, 70, 229)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Clothing',
        data: [30000, 42000, 35000, 47000],
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.15)',
        tension: 0.4,
        borderDash: [6, 4],
        pointBackgroundColor: 'rgb(14, 165, 233)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Home & Garden',
        data: [18000, 25000, 22000, 30000],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        tension: 0.4,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Health & Beauty',
        data: [15000, 18000, 20000, 24000],
        borderColor: 'rgb(244, 63, 94)',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        tension: 0.4,
        pointBackgroundColor: 'rgb(244, 63, 94)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Sports & Outdoors',
        data: [12000, 15000, 18000, 21000],
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        tension: 0.4,
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  // Calculate statistics for the chart
  const electronicsData = data.datasets[0].data;
  const clothingData = data.datasets[1].data;
  const homeGardenData = data.datasets[2].data;
  const healthBeautyData = data.datasets[3].data;
  const sportsData = data.datasets[4].data;
  
  const electronicsTotal = electronicsData.reduce((sum, value) => sum + value, 0);
  const clothingTotal = clothingData.reduce((sum, value) => sum + value, 0);
  const homeGardenTotal = homeGardenData.reduce((sum, value) => sum + value, 0);
  const healthBeautyTotal = healthBeautyData.reduce((sum, value) => sum + value, 0);
  const sportsTotal = sportsData.reduce((sum, value) => sum + value, 0);
  const totalSales = electronicsTotal + clothingTotal + homeGardenTotal + healthBeautyTotal + sportsTotal;
  
  const electronicsGrowth = ((electronicsData[electronicsData.length - 1] - electronicsData[0]) / electronicsData[0] * 100).toFixed(1);
  const clothingGrowth = ((clothingData[clothingData.length - 1] - clothingData[0]) / clothingData[0] * 100).toFixed(1);
  const homeGardenGrowth = ((homeGardenData[homeGardenData.length - 1] - homeGardenData[0]) / homeGardenData[0] * 100).toFixed(1);
  const healthBeautyGrowth = ((healthBeautyData[healthBeautyData.length - 1] - healthBeautyData[0]) / healthBeautyData[0] * 100).toFixed(1);
  const sportsGrowth = ((sportsData[sportsData.length - 1] - sportsData[0]) / sportsData[0] * 100).toFixed(1);

  const stats = [
    {
      label: 'Total Sales',
      value: `Rs. ${(totalSales / 1000).toFixed(0)}K`,
      color: 'text-slate-700 dark:text-slate-200',
      description: '5 categories, 4 weeks'
    },
    {
      label: 'Electronics',
      value: `${electronicsGrowth > 0 ? '+' : ''}${electronicsGrowth}%`,
      color: 'text-indigo-600 dark:text-indigo-400',
      description: 'Growth rate'
    },
    {
      label: 'Clothing',
      value: `${clothingGrowth > 0 ? '+' : ''}${clothingGrowth}%`,
      color: 'text-sky-600 dark:text-sky-400',
      description: 'Growth rate'
    },
    {
      label: 'Health & Beauty',
      value: `${healthBeautyGrowth > 0 ? '+' : ''}${healthBeautyGrowth}%`,
      color: 'text-rose-600 dark:text-rose-400',
      description: 'Growth rate'
    }
  ];

  return (
    <ExpandableChart
      title="Sales Trends"
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      <Line options={options} data={data} />
    </ExpandableChart>
  );
};

export default SalesChart;