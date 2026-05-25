import React, { useState } from 'react';
import { Bell, Search, Settings, User, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    // Close the profile dropdown
    setShowProfile(false);
    // Sign out user
    await signOut();
    // Navigate to sign-in page
    navigate('/signin');
  };

  return (
    <>
      <nav className={`${isDark ? 'bg-white text-gray-900 border-gray-200' : 'bg-gray-900 text-white border-gray-800'} shadow-sm border-b transition-colors duration-300 fixed top-0 left-0 right-0 z-50`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
                className={`p-2 -ml-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-sm font-bold text-white">SW</span>
                </div>
                <span className="text-xl font-semibold tracking-tight hidden sm:block">SW Stock Wisely</span>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-1 sm:space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-lg relative transition-colors ${
                    isDark ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 ${
                    isDark ? 'bg-white' : 'bg-gray-900'
                  } rounded-lg shadow-lg border ${
                    isDark ? 'border-gray-200' : 'border-gray-800'
                  } z-50`}>
                    <div className="p-4">
                      <h3 className={`text-lg font-semibold ${
                        isDark ? 'text-gray-900' : 'text-white'
                      } mb-3`}>
                        Notifications
                      </h3>
                      <div className="space-y-3">
                        <div className={`p-3 border rounded-lg ${
                          isDark ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            isDark ? 'text-red-800' : 'text-red-300'
                          }`}>
                            Low Stock Alert
                          </p>
                          <p className={`text-xs mt-1 ${
                            isDark ? 'text-red-600' : 'text-red-400'
                          }`}>
                            Samsung Galaxy A54 has only 8 units left
                          </p>
                        </div>
                        <div className={`p-3 border rounded-lg ${
                          isDark ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-900/20 border-yellow-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            isDark ? 'text-yellow-800' : 'text-yellow-300'
                          }`}>
                            New Order
                          </p>
                          <p className={`text-xs mt-1 ${
                            isDark ? 'text-yellow-600' : 'text-yellow-400'
                          }`}>
                            Order #12345 received from John Doe
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <button
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <Settings className="h-5 w-5" />
              </button>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    {user?.name ? (
                      <span className="text-white font-semibold text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden md:block">{user?.name || 'User'}</span>
                </button>

                {/* Profile Dropdown */}
                {showProfile && (
                  <div className={`absolute right-0 mt-2 w-64 ${
                    isDark ? 'bg-white' : 'bg-gray-900'
                  } rounded-lg shadow-lg border ${
                    isDark ? 'border-gray-200' : 'border-gray-800'
                  } z-50`}>
                    {/* User Info Header */}
                    {user && (
                      <div className={`px-4 py-3 border-b ${
                        isDark ? 'border-gray-200' : 'border-gray-700'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className={`font-medium ${
                              isDark ? 'text-gray-900' : 'text-white'
                            }`}>
                              {user.name}
                            </p>
                            <p className={`text-xs ${
                              isDark ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="py-2">
                      <a href="#" className={`block px-4 py-2 text-sm transition-colors ${
                        isDark ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-800'
                      }`}>
                        Profile Settings
                      </a>
                      <a href="#" className={`block px-4 py-2 text-sm transition-colors ${
                        isDark ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-800'
                      }`}>
                        Account Settings
                      </a>
                      <hr className={`my-2 ${isDark ? 'border-gray-200' : 'border-gray-800'}`} />
                      <button 
                        onClick={handleSignOut}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                          isDark ? 'text-red-700 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/20'
                        }`}>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

    </>
  );
}

export default Navbar;