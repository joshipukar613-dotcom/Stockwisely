import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { vendorsAPI } from '../../api';
import { X } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, vendorId, purchases = [], initialPurchaseId, onRecorded }) => {
  const { isDark } = useTheme();
  const [form, setForm] = useState({
    purchase_id: initialPurchaseId || '',
    amount: '',
    method: 'Cash',
    payment_date: new Date().toISOString().slice(0, 10),
    reference: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && purchases.length > 0) {
      if (initialPurchaseId) {
        setForm(prev => ({ ...prev, purchase_id: initialPurchaseId }));
      } else {
        // Default to first pending purchase
        const pending = purchases.find(p => (p.payment_status !== 'Paid') && (Number(p.due_amount || 0) > 0));
        setForm(prev => ({ ...prev, purchase_id: pending?.id || purchases[0]?.id || '' }));
      }
      setError('');
    }
  }, [isOpen, purchases, initialPurchaseId]);

  const selected = purchases.find(p => p.id === Number(form.purchase_id));
  const remainingDue = selected ? Math.max(0, Number(selected.due_amount || 0) - Number(form.amount || 0)) : 0;

  const handleSave = async () => {
    setError('');
    if (!form.purchase_id || !Number(form.amount)) {
      setError('Select a purchase and enter a valid amount');
      return;
    }
    try {
      setSaving(true);
      const res = await vendorsAPI.recordPayment(vendorId, {
        purchase_id: form.purchase_id,
        amount: Number(form.amount),
        method: form.method,
        payment_date: form.payment_date,
        reference: form.reference
      });
      onRecorded?.(res.data?.data || {});
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Record Payment</h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-700'}`}>{error}</div>}
          <div>
            <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Purchase Order</label>
            <select
              className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              value={form.purchase_id}
              onChange={(e) => setForm((prev) => ({ ...prev, purchase_id: Number(e.target.value) }))}
            >
              {purchases.map(p => (
                <option key={p.id} value={p.id}>
                  {p.invoice_number} — Due Rs. {Number(p.due_amount || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount to Pay</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Remaining due after payment: Rs. {Number(remainingDue).toLocaleString()}
              </div>
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Method</label>
              <select
                value={form.method}
                onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Date</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reference/Notes</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Reference or notes"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end space-x-3">
          <button onClick={onClose} className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg ${isDark ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
