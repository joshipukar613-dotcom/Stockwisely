import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, UserX, UserCheck, 
  RotateCcw, Search, Plus, Loader2, Mail, Briefcase, Key, CheckCircle2, XCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const UserManagementTab = ({ isDark }) => {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'SALES_CLERK'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.post('/users', formData);
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ firstName: '', lastName: '', email: '', role: 'SALES_CLERK' });
        fetchUsers();
        // Custom event for toast
        window.dispatchEvent(new CustomEvent('toast', { 
          detail: { 
            type: 'success', 
            message: `User created! Temp Password: ${response.data.data.tempPassword}` 
          } 
        }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'error', message: err.response?.data?.message || 'Error creating user' } 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;
    try {
      await api.patch(`/users/${userId}/status`, { isActive: !currentStatus });
      fetchUsers();
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'success', message: 'User status updated' } 
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'success', message: 'User role updated' } 
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Reset this user\'s password? They will be forced to change it on next login.')) return;
    try {
      const response = await api.post(`/users/${userId}/reset-password`);
      if (response.data.success) {
        alert(`Password Reset! New Temporary Password: ${response.data.data.tempPassword}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return <Shield className="w-3.5 h-3.5 mr-1.5" />;
      case 'MANAGER': return <Briefcase className="w-3.5 h-3.5 mr-1.5" />;
      default: return <Users className="w-3.5 h-3.5 mr-1.5" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return isDark ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MANAGER': return isDark ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200';
      default: return isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Modern input styles for the modal
  const inputBaseStyle = `w-full px-4 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
    isDark 
      ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:bg-gray-800' 
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white'
  }`;

  const labelStyle = `block text-xs font-medium tracking-wide mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800/40 border-gray-700/50' : 'bg-white border-gray-200'} shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all`}>
        <div>
          <h3 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            User Management
          </h3>
          <p className={`text-sm mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage your team members, their access roles, and account security.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input 
              type="text" 
              placeholder="Search users..." 
              className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                isDark 
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm shadow-indigo-600/20 hover:shadow-md hover:shadow-indigo-600/30"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Main Table Section */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-gray-800/40 border-gray-700/50' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-gray-700/50 bg-gray-800/50' : 'border-gray-100 bg-gray-50/80'}`}>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Member</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Role</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700/50' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading team members...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <Search className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No members found</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Try adjusting your search term.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className={`group transition-colors duration-150 ${isDark ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {(u.firstName?.[0] || '')}{(u.lastName?.[0] || '')}
                        </div>
                        <div>
                          <p className={`text-sm font-medium tracking-tight ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                            {u.firstName} {u.lastName}
                          </p>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative inline-block">
                        <select 
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${getRoleColor(u.role)}`}
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="SALES_CLERK">SALES CLERK</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                          {getRoleIcon(u.role)}
                        </div>
                        {/* Custom dropdown arrow for seamless look */}
                        <div className={`pointer-events-none absolute inset-y-0 right-3 flex items-center ${isDark ? 'text-current opacity-70' : 'text-current opacity-60'}`}>
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                          </svg>
                        </div>
                        <style jsx>{`
                          select { padding-left: 28px; } /* Override pl-3 to make room for absolute icon */
                        `}</style>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.isActive !== false ? (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isDark ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
                          Active
                        </div>
                      ) : (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                          Inactive
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleResetPassword(u.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(u.id, u.isActive !== false)}
                          className={`p-2 rounded-lg transition-colors ${
                            u.isActive !== false 
                              ? (isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50')
                              : (isDark ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-emerald-600 hover:bg-emerald-50')
                          }`}
                          title={u.isActive !== false ? 'Deactivate User' : 'Activate User'}
                        >
                          {u.isActive !== false ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Add User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div 
            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all border ${
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'
            }`}
          >
            {/* Modal Header */}
            <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                  <UserPlus className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Team Member</h2>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Invite a new user to your organization</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleCreateUser} className="p-6">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>First Name</label>
                    <input 
                      required 
                      autoFocus
                      className={inputBaseStyle}
                      placeholder="Jane"
                      value={formData.firstName} 
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Last Name</label>
                    <input 
                      required 
                      className={inputBaseStyle}
                      placeholder="Doe"
                      value={formData.lastName} 
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className={labelStyle}>Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input 
                      required 
                      type="email" 
                      className={`${inputBaseStyle} pl-10`}
                      placeholder="jane@company.com"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className={labelStyle}>Assigned Role</label>
                  <div className="relative">
                    <select 
                      className={`${inputBaseStyle} appearance-none cursor-pointer`}
                      value={formData.role} 
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="SALES_CLERK">Sales Clerk</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                    <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting} 
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  ) : (
                    'Create Member'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;
