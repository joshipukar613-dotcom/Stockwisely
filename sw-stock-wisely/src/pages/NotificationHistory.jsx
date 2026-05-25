import React, { useEffect, useState } from 'react';
import { notificationsAPI } from '../api';

function NotificationHistory() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getHistory({ page: p, limit: 20 });
      setItems(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="p-6 pt-16">
      <h1 className="text-2xl font-semibold mb-4">Notification History</h1>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Subject</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-b">
                  <td className="p-2">{new Date(i.sent_at).toLocaleString()}</td>
                  <td className="p-2">{i.alert_type}</td>
                  <td className="p-2">{i.subject}</td>
                  <td className="p-2">
                    <span className="mr-2">{i.status}</span>
                    <button className="px-2 py-1 border rounded" onClick={() => setPreview(i)}>Preview</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td className="p-4 text-gray-500" colSpan={4}>No notifications yet</td></tr>
              )}
            </tbody>
          </table>
          <div className="p-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">Total: {total}</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={() => load(page-1)}>Prev</button>
              <button className="px-3 py-1 border rounded" disabled={(page*20)>=total} onClick={() => load(page+1)}>Next</button>
            </div>
          </div>
          {preview && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
              <div className="bg-white rounded shadow-lg w-[600px] max-w-[90vw]">
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="font-medium">Preview: {preview.subject}</div>
                  <button className="px-2 py-1 border rounded" onClick={() => setPreview(null)}>Close</button>
                </div>
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-2">Payload</div>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-[300px]">{JSON.stringify(preview.payload || {}, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationHistory;
