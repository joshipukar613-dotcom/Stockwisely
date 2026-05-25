import React from 'react';

const ProductBreakdownTable = ({ rows = [], isDark }) => {
  return (
    <div className={`rounded-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <table className="min-w-full">
        <thead className={`${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
          <tr>
            <th className="px-4 py-2 text-left">Product Name</th>
            <th className="px-4 py-2 text-left">Total Quantity</th>
            <th className="px-4 py-2 text-left">Total Value</th>
            <th className="px-4 py-2 text-left text-green-600">Realized Profit</th>
            <th className="px-4 py-2 text-left">Stock Remaining</th>
          </tr>
        </thead>
        <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
          {rows.length === 0 && (
            <tr>
              <td colSpan="5" className={`px-4 py-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No products purchased yet</td>
            </tr>
          )}
          {rows.map((r, idx) => (
            <tr key={`${r.product_name}-${idx}`}>
              <td className="px-4 py-2 font-medium">{r.product_name}</td>
              <td className="px-4 py-2">{Number(r.total_quantity || 0).toLocaleString()}</td>
              <td className="px-4 py-2">Rs. {Number(r.total_value || 0).toLocaleString()}</td>
              <td className="px-4 py-2 text-green-600 font-semibold">Rs. {Number(r.realized_profit || 0).toLocaleString()}</td>
              <td className="px-4 py-2">{Number(r.remaining_qty || 0).toLocaleString()} units</td>
            </tr>
          ))}

        </tbody>
      </table>
    </div>
  );
};

export default ProductBreakdownTable;
