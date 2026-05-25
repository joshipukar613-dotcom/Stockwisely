import React, { useMemo } from 'react';
import {
  DollarSign, Package, AlertOctagon, TrendingDown,
  ArrowRight, PieChart, BarChart3, ListOrdered
} from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function MetricCard({ title, value, subtitle, Icon, color, isDark }) {
  const colorMap = {
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  };
  return (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</span>
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>{Icon && <Icon className="h-5 w-5" />}</div>
      </div>
      <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      {subtitle && <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>}
    </div>
  );
}

const InventoryHealthView = ({ data, isDark }) => {
  const { overview = {}, businessMetrics = {}, ageDistribution = [], efficiencySummary = {} } = data || {};
  const { topValueItems = [], categoryValueDistribution = [], categoryTurnover = [] } = businessMetrics || {};

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
      }
    },
    scales: {
      x: { 
        stacked: true, 
        grid: { display: false, drawBorder: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
      },
      y: { 
        stacked: true, 
        grid: { display: false, drawBorder: false },
        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
      }
    }
  };

  const ageData = {
    labels: ['Inventory Age'],
    datasets: [
      {
        label: 'Fresh (0-7 days)',
        data: [ageDistribution.find(a => a.id === 'fresh')?.value || 0],
        backgroundColor: '#22c55e', // Green 500
        borderRadius: { topLeft: 4, bottomLeft: 4 }
      },
      {
        label: 'Aging (8-30 days)',
        data: [ageDistribution.find(a => a.id === 'aging')?.value || 0],
        backgroundColor: '#f59e0b', // Amber 500
      },
      {
        label: 'Stale (31+ days)',
        data: [ageDistribution.find(a => a.id === 'stale')?.value || 0],
        backgroundColor: '#ef4444', // Red 500
        borderRadius: { topRight: 4, bottomRight: 4 }
      }
    ]
  };

  // Phase 5: New Business Metrics Charts
  const categoryDonutData = useMemo(() => {
    return {
      labels: categoryValueDistribution.map(c => c.category),
      datasets: [
        {
          data: categoryValueDistribution.map(c => c.value),
          backgroundColor: [
            isDark ? '#6366f1' : '#4f46e5', // indigo
            isDark ? '#38bdf8' : '#0ea5e9', // sky
            isDark ? '#a855f7' : '#9333ea', // purple
            isDark ? '#22c55e' : '#10b981', // green
            isDark ? '#f59e0b' : '#f59e0b', // amber
            isDark ? '#ef4444' : '#ef4444', // red
            isDark ? '#94a3b8' : '#64748b', // slate
          ],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1f2937' : '#ffffff',
          hoverOffset: 4
        }
      ]
    };
  }, [categoryValueDistribution, isDark]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: isDark ? '#cbd5e1' : '#475569', usePointStyle: true, boxWidth: 8 } },
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

  const turnoverBarData = useMemo(() => {
    return {
      labels: categoryTurnover.map(c => c.category),
      datasets: [
        {
          label: 'Annualized Turnover Ratio',
          data: categoryTurnover.map(c => c.turnoverRatio),
          backgroundColor: isDark ? '#22c55e' : '#10b981',
          borderRadius: 4
        }
      ]
    };
  }, [categoryTurnover, isDark]);

  const turnoverBarOptions = {
    indexAxis: 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        callbacks: {
          label: (ctx) => `${ctx.raw}x per year`
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
        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
      }
    }
  };

  if (!data || !data.overview) return null;

  return (
    <div className="space-y-6">
      {/* Capital Efficiency Banner */}
      <div className={`rounded-xl p-4 flex flex-col md:flex-row items-center justify-between border ${isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-100'}`}>
        <div>
          <h2 className={`font-semibold ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Capital Efficiency Summary</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
            You have Rs. {overview.total_overstock_capital.toLocaleString()} locked in slow-moving inventory.
            At 10% standard interest, this incurs an opportunity cost of <strong>Rs. {efficiencySummary.opportunity_cost_annual.toLocaleString()}/year</strong>.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          isDark={isDark}
          title="Total Inventory Value"
          value={`Rs. ${overview.total_inventory_value.toLocaleString()}`}
          Icon={DollarSign}
          color="blue"
        />
        <MetricCard
          isDark={isDark}
          title="Low Stock Items"
          value={overview.low_stock_count}
          subtitle="Below minimum safety levels"
          Icon={Package}
          color="amber"
        />
        <MetricCard
          isDark={isDark}
          title="Out of Stock Items"
          value={overview.out_of_stock_count}
          subtitle="Currently unavailable"
          Icon={AlertOctagon}
          color="red"
        />
        <MetricCard
          isDark={isDark}
          title="Overstocked Items"
          value={overview.overstock_count}
          subtitle={`Rs. ${overview.total_overstock_capital.toLocaleString()} locked`}
          Icon={TrendingDown}
          color="purple"
        />
      </div>

      {/* Age Distribution Chart */}
      <div className={`border rounded-xl p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Stock Age Distribution</h3>
        <div className="h-24 w-full">
          <Bar options={barOptions} data={ageData} />
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          {ageDistribution.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${a.color}`}></span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{a.label}: {a.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Business Intelligence Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Value Distribution */}
        <div className={`border rounded-xl p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
             <PieChart className="w-5 h-5 text-indigo-500" /> Capital Distribution by Category
          </h3>
          <div className="h-64 w-full">
             {categoryValueDistribution.length > 0 ? (
               <Doughnut data={categoryDonutData} options={donutOptions} />
             ) : (
               <div className="h-full flex items-center justify-center text-gray-400">No category data</div>
             )}
          </div>
        </div>

        {/* Category Turnover Ratio */}
        <div className={`border rounded-xl p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
             <BarChart3 className="w-5 h-5 text-green-500" /> Estimated Turnover by Category (Annualized x)
          </h3>
          <div className="h-64 w-full">
             {categoryTurnover.length > 0 ? (
               <Bar data={turnoverBarData} options={turnoverBarOptions} />
             ) : (
               <div className="h-full flex items-center justify-center text-gray-400">No turnover data</div>
             )}
          </div>
        </div>
      </div>

      {/* Top Value Items Table */}
      <div className={`border rounded-xl overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            <ListOrdered className="w-5 h-5 text-amber-500" /> Top 10 Most Capital-Intensive Products
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Products tying up the most cash across all categories.</p>
        </div>
        <div className="overflow-x-auto">
          {topValueItems.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Current Stock</th>
                  <th className="px-6 py-3 text-right">Unit Cost</th>
                  <th className="px-6 py-3 text-right">Total Capital Locked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 w-full">
                {topValueItems.map((item, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{item.product_name}</td>
                    <td className={`px-6 py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.category}</td>
                    <td className={`px-6 py-4 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.current_stock?.toLocaleString()}</td>
                    <td className={`px-6 py-4 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rs. {item.unit_cost?.toLocaleString()}</td>
                    <td className={`px-6 py-4 text-right font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Rs. {item.total_value?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No inventory data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryHealthView;
