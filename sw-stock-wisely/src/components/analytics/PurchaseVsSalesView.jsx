import React from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Target,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Package
} from 'lucide-react';

function MetricCard({ title, value, subtitle, Icon, color, isDark }) {
  const colorMap = {
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
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

function OverlappingBar({ purchased, sold, isDark }) {
  const max = Math.max(purchased, sold, 1);
  const pWidth = (purchased / max) * 100;
  const sWidth = (sold / max) * 100;

  return (
    <div className="flex flex-col gap-1 w-full min-w-[120px]">
      <div className="flex items-center gap-2">
        <div className="h-2 rounded bg-indigo-200 dark:bg-indigo-900 relative flex-1">
          <div className="h-full rounded bg-indigo-500 absolute left-0 top-0" style={{ width: `${pWidth}%` }} />
        </div>
        <span className={`text-[10px] w-8 text-right ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{purchased}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 rounded bg-sky-200 dark:bg-sky-900 relative flex-1">
          <div className="h-full rounded bg-sky-500 absolute left-0 top-0" style={{ width: `${sWidth}%` }} />
        </div>
        <span className={`text-[10px] w-8 text-right ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{sold}</span>
      </div>
    </div>
  );
}

const PurchaseVsSalesView = ({ data, isDark }) => {
  if (!data || !data.results) return null;

  const { optimal, overstocked, understocked, summary } = data.results;

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          isDark={isDark}
          title="Portfolio Efficiency"
          value={`${summary.portfolio_efficiency}%`}
          subtitle={summary.gap_from_target > 0 ? `${summary.gap_from_target}% below optimal target` : 'Performing optimally'}
          Icon={Target}
          color="blue"
        />
        <MetricCard
          isDark={isDark}
          title="Overstocked Value"
          value={`Rs. ${summary.total_overstocked_capital.toLocaleString()}`}
          subtitle="Capital currently locked in excess inventory"
          Icon={TrendingDown}
          color="red"
        />
        <MetricCard
          isDark={isDark}
          title="Lost Revenue Value"
          value={`Rs. ${summary.total_lost_revenue.toLocaleString()}`}
          subtitle="Estimated revenue lost to stockouts"
          Icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          isDark={isDark}
          title="Total Products Analyzed"
          value={optimal.length + overstocked.length + understocked.length}
          subtitle="Products with activity this period"
          Icon={Package}
          color="purple"
        />
      </div>

      <div className={`text-xs flex gap-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-sm"></div> Purchased Qty</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-sky-500 rounded-sm"></div> Sold Qty</div>
      </div>

      {/* Understocked (Highest Risk) */}
      <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <div>
            <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <TrendingUp className="text-red-500 h-5 w-5" /> Understocked Products (Demand &gt; Supply)
            </h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sell-through &gt; 105%. Increase future orders to capture lost revenue.</p>
          </div>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">{understocked.length} Items</span>
        </div>
        <div className="overflow-x-auto">
          {understocked.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 w-48">Purchased vs Sold</th>
                  <th className="px-5 py-3 text-right">Lost Sales (Est)</th>
                  <th className="px-5 py-3 text-right">Lost Revenue (Est)</th>
                  <th className="px-5 py-3 text-right">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {understocked.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className={`px-5 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{item.product_name}</td>
                    <td className="px-5 py-3">
                      <OverlappingBar purchased={item.purchased_qty} sold={item.sold_qty} isDark={isDark} />
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>{item.lost_sales_count}</td>
                    <td className={`px-5 py-3 text-right font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>Rs. {item.lost_revenue.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded">
                        <ArrowUpCircle className="w-3 h-3" /> Increase order by {item.recommended_increase_percent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No understocked products found for this period. Excellent!</div>
          )}
        </div>
      </div>

      {/* Overstocked (Capital Locked) */}
      <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <div>
            <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <ArrowDownCircle className="text-amber-500 h-5 w-5" /> Overstocked Products (Supply &gt; Demand)
            </h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sell-through &lt; 85%. Reduce future orders to free up capital.</p>
          </div>
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">{overstocked.length} Items</span>
        </div>
        <div className="overflow-x-auto">
          {overstocked.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 w-48">Purchased vs Sold</th>
                  <th className="px-5 py-3 text-right">Sell-Through</th>
                  <th className="px-5 py-3 text-right">Capital Locked</th>
                  <th className="px-5 py-3 text-right">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {overstocked.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className={`px-5 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{item.product_name}</td>
                    <td className="px-5 py-3">
                      <OverlappingBar purchased={item.purchased_qty} sold={item.sold_qty} isDark={isDark} />
                    </td>
                    <td className="px-5 py-3 text-right text-amber-600 dark:text-amber-400 font-medium">{Math.round(item.sell_through)}%</td>
                    <td className={`px-5 py-3 text-right font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Rs. {Math.round(item.capital_locked).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        <ArrowDownCircle className="w-3 h-3" /> Reduce order by {item.recommended_reduction_percent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No overstocked products found for this period. Great job!</div>
          )}
        </div>
      </div>

      {/* Optimal Stock */}
      <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <div>
            <h3 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Target className="text-green-500 h-5 w-5" /> Optimal Stock Products
            </h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sell-through 85% - 105%. Purchasing perfectly matches demand.</p>
          </div>
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">{optimal.length} Items</span>
        </div>
        <div className="overflow-x-auto">
          {optimal.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className={`text-xs uppercase bg-opacity-50 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3 w-48">Purchased vs Sold</th>
                  <th className="px-5 py-3 text-right">Sell-Through</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {optimal.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                    <td className={`px-5 py-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{item.product_name}</td>
                    <td className="px-5 py-3">
                      <OverlappingBar purchased={item.purchased_qty} sold={item.sold_qty} isDark={isDark} />
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">{Math.round(item.sell_through)}%</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center text-xs font-medium text-green-600 dark:text-green-400">
                        Maintain volumes ✔
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">No optimal products found. Operations may need adjustment.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseVsSalesView;
