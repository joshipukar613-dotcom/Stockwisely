import React from 'react';
import PaymentStatusBadge from './PaymentStatusBadge';

const PurchaseHistoryTable = ({ rows = [], isDark, onViewItems }) => {
  return (
    <div className={`rounded-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <table className="min-w-full">
        <thead className={`${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
          <tr>
            <th className="px-4 py-2 text-left">Purchase Date</th>
            <th className="px-4 py-2 text-left">Invoice</th>
            <th className="px-4 py-2 text-left">Total</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Paid</th>
            <th className="px-4 py-2 text-left">Due</th>
            <th className="px-4 py-2 text-left">Due Date</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className={`${isDark ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
          {rows.length === 0 && (
            <tr>
              <td colSpan="8" className={`px-4 py-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No purchases yet</td>
            </tr>
          )}
          {rows.map((r) => {
            const isPending = Number(r.amount_paid || 0) === 0;
            const overdue = r.due_amount > 0 && r.due_date && new Date(r.due_date) < new Date();
            const status = r.is_return ? 'Return' : (overdue ? 'Overdue' : (isPending ? 'Pending' : (r.payment_status || 'Pending')));
            return (
              <tr key={r.id}>
                <td className="px-4 py-2">{r.purchase_date ? new Date(r.purchase_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">{r.invoice_number}</td>
                <td className={`px-4 py-2 ${r.is_return ? 'text-orange-600 font-medium' : ''}`}>
                  {r.is_return ? '-' : ''}Rs. {Number(Math.abs(r.total_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2"><PaymentStatusBadge status={status} /></td>
                <td className="px-4 py-2">Rs. {Math.min(Number(r.amount_paid || 0), Number(r.total_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`px-4 py-2 ${overdue ? 'text-red-600 font-semibold' : ''}`}>Rs. {Number(r.due_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`px-4 py-2 ${overdue ? 'text-red-600 font-semibold' : ''}`}>{r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  {Number(r.due_amount || 0) > 0 && (
                    <button
                      onClick={() => onViewItems?.(r, 'pay')}
                      className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-medium"
                    >
                      Pay
                    </button>
                  )}
                  <button
                    onClick={() => onViewItems?.(r, 'view')}
                    className="px-3 py-1 rounded bg-gray-100 text-gray-900 hover:bg-gray-200 text-xs"
                  >
                    View Items
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseHistoryTable;
