import React, { useEffect, useState } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import CustomerCard from '../components/customers/CustomerCard';
import { customersAPI } from '../api';
import { Search, Users, TrendingUp } from 'lucide-react';

function Customers() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, totalSales: 0 });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customersAPI.list({ search: query });
      const data = res.data?.data || [];
      setCustomers(data);
      
      // Calculate basic stats
      const totalSales = data.reduce((sum, c) => sum + parseFloat(c.total_purchase_amount || 0), 0);
      setStats({ total: data.length, totalSales });
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer? This action cannot be undone.')) return;
    try {
      await customersAPI.delete(id);
      fetchCustomers();
    } catch (e) {
      console.error(e);
      alert('Failed to delete customer');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="container mx-auto px-4 py-8 pt-24">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Customer Management
                </h1>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Track customer details, contact history, and lifetime sales value.
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`p-6 rounded-2xl shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Customers</p>
                    <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className={`p-6 rounded-2xl shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Customer Sales</p>
                    <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rs. {stats.totalSales.toLocaleString()}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'}`}>
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className={`mb-6 p-4 rounded-xl shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className={`absolute left-3 top-3 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search by customer name, phone, or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Customer List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-100 text-red-700 rounded-xl text-center border border-red-200">
                {error}
              </div>
            ) : customers.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border border-dashed ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                <Users className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>No customers found</h3>
                <p className={`mb-6 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {query ? 'Try adjusting your search query.' : 'Customers are automatically added when you create a new Sale with a phone number.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {customers.map(c => (
                  <CustomerCard
                    key={c.id}
                    customer={c}
                    isDark={isDark}
                    onEdit={() => false} // Feature removed: customers created via sales
                    onDelete={() => handleDelete(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Customers;
