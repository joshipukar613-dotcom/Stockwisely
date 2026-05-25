import React, { useMemo } from 'react';
import { TrendingUp, Award, Tag, CalendarDays } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
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

const SalesDemandView = ({ data, isDark }) => {
  const { bestSellers = [], currentPeriodTrend = [], previousPeriodTrend = [], categoryPerformance = [], groupBy = '' } = data || {};

  // 1. Sales Trend Chart Data
  const trendData = useMemo(() => {
    // We map the previous period trend array index-to-index with current if lengths align (or by date approximation)
    // For simplicity, we just use the current period labels and overlay the previous data sequentially
    const labels = currentPeriodTrend.map(t => {
      const d = new Date(t.date_group);
      if (groupBy === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (groupBy === 'week') return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const currentRevenue = currentPeriodTrend.map(t => t.revenue);
    const previousRevenue = currentPeriodTrend.map((_, i) => previousPeriodTrend[i]?.revenue || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Current Period Revenue',
          data: currentRevenue,
          borderColor: isDark ? '#818cf8' : '#6366f1', // Indigo
          backgroundColor: isDark ? 'rgba(129, 140, 248, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: isDark ? '#818cf8' : '#6366f1'
        },
        {
          label: 'Previous Period Revenue',
          data: previousRevenue,
          borderColor: isDark ? '#475569' : '#94a3b8', // Slate/Gray
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0, // hide points for previous period to keep it clean
        }
      ]
    };
  }, [currentPeriodTrend, previousPeriodTrend, groupBy, isDark]);

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: isDark ? '#cbd5e1' : '#475569', usePointStyle: true, boxWidth: 6 }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
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
        grid: { color: isDark ? '#334155' : '#f1f5f9', drawBorder: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b', callback: (value) => `Rs. ${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}` }
      }
    }
  };

  // 2. Category Performance Bar Chart
  const categoryData = useMemo(() => {
    return {
      labels: categoryPerformance.map(c => c.category),
      datasets: [
        {
          label: 'Revenue',
          data: categoryPerformance.map(c => c.total_revenue),
          backgroundColor: isDark ? '#38bdf8' : '#0ea5e9', // Sky
          borderRadius: 4
        }
      ]
    };
  }, [categoryPerformance, isDark]);

  const categoryOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        callbacks: {
          label: (ctx) => {
            const index = ctx.dataIndex;
            const percent = (categoryPerformance[index].percentage_contribution || 0).toFixed(1);
            return `Rs. ${ctx.raw.toLocaleString()} (${percent}%)`;
          }
        }
      }
    },
    scales: {
      x: { 
        grid: { color: isDark ? '#334155' : '#f1f5f9', drawBorder: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b', callback: (value) => `Rs. ${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}` }
      },
      y: { 
        grid: { display: false, drawBorder: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
      }
    }
  };

  if (!data || !data.bestSellers) return null;

  return (
    <div className="space-y-6">
      {/* Sales Trend Chart */}
      <SectionCard
        isDark={isDark}
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <span>Sales Revenue Trend ({groupBy === 'day' ? 'Daily' : groupBy === 'week' ? 'Weekly' : 'Monthly'})</span>
          </div>
        }
      >
        <div className="h-80 w-full">
          {currentPeriodTrend.length > 0 ? (
            <Line data={trendData} options={trendOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">No data for selected period</div>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers Table */}
        <SectionCard
          isDark={isDark}
          title={
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Top 10 Best-Selling Products</span>
            </div>
          }
        >
          {bestSellers.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Revenue Share</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 w-full">
                {bestSellers.map((item, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3 w-48">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-[10px] w-8 text-right font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {(item.percentage_contribution || 0).toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex justify-end">
                           <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.relative_to_top_seller}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      Rs. {Number(item.total_revenue).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.total_quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No sales data for this period.</div>
          )}
        </SectionCard>

        {/* Category Performance */}
        <SectionCard
          isDark={isDark}
          title={
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-sky-500" />
              <span>Revenue by Category</span>
            </div>
          }
        >
          <div className="h-80 w-full">
            {categoryPerformance.length > 0 ? (
              <Bar data={categoryData} options={categoryOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No category data</div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default SalesDemandView;
