import React, { useEffect, useState } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import VendorStatistics from '../components/vendors/VendorStatistics';
import VendorCard from '../components/vendors/VendorCard';
import AddVendorModal from '../components/vendors/AddVendorModal';
import { vendorsAPI } from '../api';
import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Vendors() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editVendor, setEditVendor] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await vendorsAPI.stats();
      setStats(res.data?.data || {});
    } catch (e) {
      setStats({ total_vendors: 0, active_vendors: 0, total_payables: 0, overdue: 0 });
    }
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await vendorsAPI.list({ q: query, status: filterStatus, limit: 20 });
      setVendors(res.data?.data || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load vendors');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchVendors, 300);
    return () => clearTimeout(timer);
  }, [query, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 transition-all ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Vendors</h1>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" /><span>Add Vendor</span>
              </button>
            </div>

            {/* Stats */}
            <VendorStatistics stats={stats} />

            {/* Filters */}
            <div className={`mb-4 p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search vendors by name, contact, phone"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" /><span>Add Vendor</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className={`p-6 rounded-lg border text-center ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                Loading vendors...
              </div>
            ) : vendors.length === 0 ? (
              <div className={`p-6 rounded-lg border text-center ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                <p className="mb-3">No vendors yet — Add your first!</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Vendor
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendors.map(v => (
                  <VendorCard
                    key={v.id}
                    vendor={v}
                    isDark={isDark}
                    onView={() => navigate(`/vendors/${v.id}`)}
                    onEdit={() => {
                      setEditVendor(v);
                      setShowAddModal(true);
                    }}
                    onDelete={async () => {
                      if (!window.confirm('Delete this vendor? If it has purchases, it will be set inactive.')) return;
                      try {
                        await vendorsAPI.delete(v.id);
                        fetchVendors();
                        fetchStats();
                      } catch (e) {}
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showAddModal && (
        <AddVendorModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditVendor(null);
          }}
          presetVendor={editVendor}
          onCreated={() => {
            setShowAddModal(false);
            setEditVendor(null);
            fetchVendors();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

export default Vendors;
