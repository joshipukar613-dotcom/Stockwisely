import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ExpandableChart from './ExpandableChart';

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChart = ({ isDark = false }) => {
  const data = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [
      {
        label: 'Risk Distribution',
        data: [45, 35, 20],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(244, 63, 94, 0.85)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(244, 63, 94)',
        ],
        borderWidth: 3,
        hoverOffset: 15,
        hoverBorderWidth: 4,
        cutout: '60%',
      },
    ],
  };

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
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: 'Portfolio Risk Analysis',
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
  const lowRisk = data.datasets[0].data[0];
  const mediumRisk = data.datasets[0].data[1];
  const highRisk = data.datasets[0].data[2];
  
  const lowRiskPercentage = ((lowRisk / totalValue) * 100).toFixed(1);
  const mediumRiskPercentage = ((mediumRisk / totalValue) * 100).toFixed(1);
  const highRiskPercentage = ((highRisk / totalValue) * 100).toFixed(1);
  
  const riskScore = ((lowRisk * 1 + mediumRisk * 2 + highRisk * 3) / totalValue).toFixed(1);

  const stats = [
    {
      label: 'Low Risk',
      value: `${lowRiskPercentage}%`,
      color: 'text-emerald-600 dark:text-emerald-400',
      description: 'Conservative allocation'
    },
    {
      label: 'Medium Risk',
      value: `${mediumRiskPercentage}%`,
      color: 'text-amber-600 dark:text-amber-400',
      description: 'Balanced allocation'
    },
    {
      label: 'High Risk',
      value: `${highRiskPercentage}%`,
      color: 'text-rose-600 dark:text-rose-400',
      description: 'Aggressive allocation'
    },
    {
      label: 'Risk Score',
      value: riskScore,
      color: 'text-slate-700 dark:text-slate-200',
      description: 'Overall risk level'
    }
  ];

  return (
    <ExpandableChart
      title="Portfolio Risk Analysis"
      isDark={isDark}
      showStats={true}
      stats={stats}
    >
      <div className="w-full h-full relative">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              100%
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Portfolio
            </div>
          </div>
        </div>
      </div>
    </ExpandableChart>
  );
};

export default DoughnutChart;