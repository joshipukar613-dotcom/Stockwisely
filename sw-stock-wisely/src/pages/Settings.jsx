import React, { useState, useEffect } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import InventorySettings from '../components/inventory/InventorySettings';
import UserManagementTab from '../components/settings/UserManagementTab';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Palette,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

function Settings() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const { user, api, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for profile and general settings
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    businessName: user?.businessName || '',
    preferences: user?.preferences || {}
  });

  // Load user data into form on mount or user change
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        businessName: user.businessName || '',
        preferences: user.preferences || {}
      });
    }
  }, [user]);

  const settingsTabs = [
    { id: 'account', name: 'Account', icon: User, roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
    { id: 'general', name: 'General', icon: SettingsIcon, roles: ['ADMIN'] },
    { id: 'users', name: 'User Management', icon: Users, roles: ['ADMIN'] },
    { id: 'inventory', name: 'Inventory', icon: Database, roles: ['ADMIN'] },
    { id: 'notifications', name: 'Notifications', icon: Bell, roles: ['ADMIN'] },
    { id: 'security', name: 'Security', icon: Shield, roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
    { id: 'appearance', name: 'Appearance', icon: Palette, roles: ['ADMIN'] }
  ];

  const visibleTabs = settingsTabs.filter(tab => tab.roles.includes(user?.role));

  const handleChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put('/auth/profile', profileData);
      if (response.data.success) {
        setHasUnsavedChanges(false);
        await refreshUser(); // Update global auth state
        window.dispatchEvent(new CustomEvent('toast', { 
          detail: { type: 'success', message: 'Settings saved successfully' } 
        }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { type: 'error', message: err.response?.data?.message || 'Failed to save settings' } 
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        businessName: user.businessName || '',
        preferences: user.preferences || {}
      });
      setHasUnsavedChanges(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''} pt-20 overflow-x-hidden pb-12`}>
          <div className="w-full max-w-7xl mx-auto px-4 py-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div className="mb-4 lg:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <SettingsIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Manage your application preferences and configurations</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {hasUnsavedChanges && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Unsaved changes</span>
                  </div>
                )}
                <button 
                  onClick={handleReset}
                  className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
                    isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50`}
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Settings Navigation */}
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4 h-fit`}>
                <h3 className={`text-sm font-bold mb-4 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Categories</h3>
                <nav className="space-y-1">
                  {visibleTabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-600 text-white'
                            : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <IconComponent className="h-4 w-4 mr-3" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Settings Content */}
              <div className="lg:col-span-3">
                {activeTab === 'users' && <UserManagementTab isDark={isDark} />}

                {activeTab === 'account' && (
                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                    <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>First Name</label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => handleChange('firstName', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last Name</label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => handleChange('lastName', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email Address</label>
                        <input
                          type="email"
                          value={profileData.email}
                          disabled
                          className={`w-full px-3 py-2 border rounded-lg opacity-60 cursor-not-allowed ${
                            isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <p className="text-[10px] text-gray-500 italic mt-1">Email cannot be changed after registration.</p>
                      </div>
                      <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Phone Number</label>
                        <input
                          type="text"
                          value={profileData.phoneNumber}
                          onChange={(e) => handleChange('phoneNumber', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'general' && (
                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                    <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>General Settings</h3>
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Company / Business Name</label>
                        <input
                          type="text"
                          value={profileData.businessName}
                          onChange={(e) => handleChange('businessName', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className={`text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Currency</label>
                          <select 
                            value={profileData.preferences?.currency || 'NPR'}
                            onChange={(e) => handleChange('preferences', { ...profileData.preferences, currency: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="NPR">Nepalese Rupee (रू)</option>
                            <option value="INR">Indian Rupee (₹)</option>
                            <option value="USD">US Dollar ($)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className={`text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Time Zone</label>
                          <select 
                            value={profileData.preferences?.timezone || 'Asia/Kathmandu'}
                            onChange={(e) => handleChange('preferences', { ...profileData.preferences, timezone: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="Asia/Kathmandu">Asia/Kathmandu (NPT)</option>
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="UTC">UTC</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                    <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Inventory Logic</h3>
                    <InventorySettings
                      onSave={(settings) => {
                        handleChange('preferences', { ...profileData.preferences, inventory: settings });
                      }}
                      onCancel={() => handleReset()}
                    />
                  </div>
                )}

                {activeTab === 'notifications' && (
                   <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                    <h3 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                    <div className="space-y-4">
                      {['Low Stock Alerts', 'Expiry Alerts', 'Daily Sales Summary'].map((item) => (
                        <div key={item} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/10">
                          <span className="font-medium">{item}</span>
                          <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Settings;
