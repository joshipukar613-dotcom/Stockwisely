import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Layers } from 'lucide-react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

function SectionCard({ title, children, isDark }) {
  return (
    <div className={`border rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {title && <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{title}</h3>
      </div>}
      <div className="p-5 overflow-x-auto">{children}</div>
    </div>
  );
}

const StockMovementView = ({ data, isDark }) => {
  const { velocityMetrics } = data || {};
  const { fastMovers = [], slowMovers = [], distribution = [], velocityTrend = [] } = velocityMetrics || {};

  // 1. Movement Distribution Donut Chart
  const donutData = useMemo(() => {
    return {
      labels: distribution.map(d => d.label),
      datasets: [
        {
          data: distribution.map(d => d.value),
          backgroundColor: [
            isDark ? '#22c55e' : '#10b981', // green
            isDark ? '#6366f1' : '#4f46e5', // indigo
            isDark ? '#ef4444' : '#ef4444', // red
          ],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1f2937' : '#ffffff',
          hoverOffset: 4
        }
      ]
    };
  }, [distribution, isDark]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: isDark ? '#cbd5e1' : '#475569', usePointStyle: true } },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        callbacks: {
          label: (ctx) => `Rs. ${ctx.raw.toLocaleString()}`
        }
      }
    }
  };

  // 2. Velocity Trend Stacked Area Chart (Last 6 Months)
  const areaData = useMemo(() => {
    if (!velocityTrend || velocityTrend.length === 0) return { labels: [], datasets: [] };
    
    const labels = velocityTrend.map(t => new Date(t.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    
    return {
      labels,
      datasets: [
        {
          label: 'Fast Movers',
          data: velocityTrend.map(t => t.Fast || 0),
          borderColor: isDark ? '#22c55e' : '#10b981',
          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(16, 185, 129, 0.7)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Medium Movers',
          data: velocityTrend.map(t => t.Medium || 0),
          borderColor: isDark ? '#6366f1' : '#4f46e5',
          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.7)' : 'rgba(79, 70, 229, 0.7)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Slow Movers',
          data: velocityTrend.map(t => t.Slow || 0),
          borderColor: isDark ? '#ef4444' : '#ef4444',
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.7)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [velocityTrend, isDark]);

  const areaOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: isDark ? '#cbd5e1' : '#475569', usePointStyle: true, boxWidth: 6 } },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: Rs. ${ctx.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      x: { 
        grid: { display: false, drawBorder: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
      },
      y: { 
        stacked: true,
        grid: { color: isDark ? '#334155' : '#f1f5f9', drawBorder: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b', callback: (value) => `Rs. ${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}` }
      }
    }
  };

  if (!data || !data.velocityMetrics) return null;

  return (
    <div className="space-y-6">
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SectionCard
            isDark={isDark}
            title={
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>Value Distribution</span>
              </div>
            }
          >
            <div className="h-64 relative">
              <Doughnut data={donutData} options={donutOptions} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-20px]">
                <div className="text-center">
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Locked</div>
                  <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                     Rs. {distribution.reduce((acc, d) => acc + d.value, 0 >= 1000 ? (distribution.reduce((acc, d) => acc + d.value, 0)/1000).toFixed(1)+'k' : distribution.reduce((acc, d) => acc + d.value, 0))}
                  </div>
                </div>
              </div>
            </div>
            <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Capital locked by stock velocity.
            </p>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard
            isDark={isDark}
            title={
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-500" />
                <span>6-Month Velocity Trend</span>
              </div>
            }
          >
            <div className="h-64 w-full">
              {velocityTrend && velocityTrend.length > 0 ? (
                <Line data={areaData} options={areaOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No trend data</div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Action Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Movers */}
        <SectionCard
          isDark={isDark}
          title={
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-green-500" />
              <span>Top 10 Fast Movers (Scale Up)</span>
            </div>
          }
        >
          {fastMovers.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-700'}`}>
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Sold (90d)</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 w-full">
                {fastMovers.map((item, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {item.product_name}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-green-400' : 'text-green-600'} font-medium`}>
                      {item.qty_sold_90d}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.balance_qty}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-green-900/60 text-green-300' : 'bg-green-100 text-green-800'}`}>
                        Order +{item.recommended_scale_up}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No fast-moving products detected.</div>
          )}
        </SectionCard>

        {/* Slow Movers */}
        <SectionCard
          isDark={isDark}
          title={
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-red-500" />
              <span>Top 10 Slow Movers (Liquidate)</span>
            </div>
          }
        >
          {slowMovers.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-700'}`}>
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Capital Locked</th>
                  <th className="px-4 py-3 text-right">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 w-full">
                {slowMovers.map((item, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {item.product_name}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.balance_qty}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-red-400' : 'text-red-600'} font-medium`}>
                      Rs. {item.total_value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-red-900/60 text-red-300' : 'bg-red-100 text-red-800'}`}>
                        {item.recommended_discount}% Discount
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No slow-moving products detected.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default StockMovementView;
