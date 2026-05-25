import React, { useEffect, useState } from 'react';
import { notificationsAPI } from '../api';

function NotificationSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState([]);
  const [message, setMessage] = useState('');

  const get = (type) => settings.find(s => s.alert_type === type) || {};
  const set = (type, patch) => {
    const next = settings.slice();
    const idx = next.findIndex(s => s.alert_type === type);
    if (idx >= 0) next[idx] = { ...next[idx], ...patch };
    else next.push({ alert_type: type, enabled: true, frequency: 'Immediate', severity: 'High', ...patch });
    setSettings(next);
  };

  useEffect(() => {
    setLoading(true);
    notificationsAPI.getSettings()
      .then(res => setSettings(res.data.data || []))
      .catch(() => setSettings([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await notificationsAPI.updateSettings(settings);
      setMessage('Settings saved');
    } catch (e) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 pt-16">
      <h1 className="text-2xl font-semibold mb-4">Notification Settings</h1>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Low Stock</div>
                <div className="text-sm text-gray-500">Threshold in units</div>
              </div>
              <input type="checkbox" checked={!!get('low_stock').enabled} onChange={(e) => set('low_stock', { enabled: e.target.checked })} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" className="border rounded px-2 py-1 w-32" placeholder="Threshold" value={get('low_stock').threshold || ''} onChange={(e) => set('low_stock', { threshold: parseInt(e.target.value || '0', 10) })} />
              <select className="border rounded px-2 py-1" value={get('low_stock').frequency || 'Immediate'} onChange={(e) => set('low_stock', { frequency: e.target.value })}>
                <option>Immediate</option>
                <option>Daily</option>
                <option>Weekly</option>
              </select>
              <select className="border rounded px-2 py-1" value={get('low_stock').severity || 'High'} onChange={(e) => set('low_stock', { severity: e.target.value })}>
                <option>Low</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Out of Stock</div>
              <input type="checkbox" checked={!!get('out_of_stock').enabled} onChange={(e) => set('out_of_stock', { enabled: e.target.checked })} />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Expiry Alerts</div>
              <input type="checkbox" checked={!!get('expiry_alert').enabled} onChange={(e) => set('expiry_alert', { enabled: e.target.checked })} />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500 mb-2">Notify days before</div>
              <div className="flex gap-3">
                {[30,7,3,1].map(d => (
                  <label key={d} className="flex items-center gap-1">
                    <input type="checkbox" checked={(get('expiry_alert').expiry_days || []).includes(d)} onChange={(e) => {
                      const days = new Set(get('expiry_alert').expiry_days || []);
                      if (e.target.checked) days.add(d); else days.delete(d);
                      set('expiry_alert', { expiry_days: Array.from(days).sort((a,b)=>a-b) });
                    }} />
                    <span>{d}d</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Expired Products Daily Check</div>
              <input type="checkbox" checked={!!get('expired_products').enabled} onChange={(e) => set('expired_products', { enabled: e.target.checked })} />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Payment Due</div>
              <input type="checkbox" checked={!!get('payment_due').enabled} onChange={(e) => set('payment_due', { enabled: e.target.checked })} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" className="border rounded px-2 py-1 w-32" placeholder="Days before" value={get('payment_due').threshold || ''} onChange={(e) => set('payment_due', { threshold: parseInt(e.target.value || '0', 10) })} />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Payment Overdue</div>
              <input type="checkbox" checked={!!get('payment_overdue').enabled} onChange={(e) => set('payment_overdue', { enabled: e.target.checked })} />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Daily Digest</div>
              <input type="checkbox" checked={!!get('daily_digest').enabled} onChange={(e) => set('daily_digest', { enabled: e.target.checked })} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="time" className="border rounded px-2 py-1" value={get('daily_digest').quiet_hours_from || ''} onChange={(e) => set('daily_digest', { quiet_hours_from: e.target.value })} />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Weekly Summary</div>
              <input type="checkbox" checked={!!get('weekly_summary').enabled} onChange={(e) => set('weekly_summary', { enabled: e.target.checked })} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="time" className="border rounded px-2 py-1" value={get('weekly_summary').quiet_hours_to || ''} onChange={(e) => set('weekly_summary', { quiet_hours_to: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
            {message && <span className="text-sm text-gray-600">{message}</span>}
            <button className="px-4 py-2 rounded bg-gray-200" onClick={() => notificationsAPI.sendTest({ product: 'Milk 1L' })}>Send Test</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
