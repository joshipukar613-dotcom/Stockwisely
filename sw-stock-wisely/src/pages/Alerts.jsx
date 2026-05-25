import React, { useState, useEffect } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import InventoryAlerts from '../components/inventory/InventoryAlerts';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { notificationsAPI } from '../api';

function Alerts() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await notificationsAPI.getAlerts();
        if (response.data && response.data.success) {
          setAlerts(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
        setError('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const handleDismissAlert = (id) => {
    // Optimistic update
    setAlerts(prev => prev.filter(a => a.id !== id));
    // In a real app, you would call an API here
  };

  const handleMarkAsRead = (id) => {
    // Optimistic update
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, read: true } : a
    ));
    // In a real app, you would call an API here
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="container mx-auto px-4 py-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-8">
                {error}
              </div>
            ) : (
              <InventoryAlerts 
                alerts={alerts} 
                onDismissAlert={handleDismissAlert} 
                onMarkAsRead={handleMarkAsRead} 
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Alerts;
