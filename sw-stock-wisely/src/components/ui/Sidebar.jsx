import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  Settings,
  Bot,
  TrendingUp,
  FileText,
  AlertTriangle,
  RotateCcw,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

function Sidebar() {
  const { isDark } = useTheme();
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [openMenus, setOpenMenus] = useState({ reports: location.pathname.startsWith('/reports') });

  // Update openMenus when location changes to ensure the current section is expanded
  useEffect(() => {
    if (location.pathname.startsWith('/reports')) {
      setOpenMenus(prev => ({ ...prev, reports: true }));
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
    { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
    { id: 'sales', label: 'Sales', icon: ShoppingCart, path: '/sales', roles: ['SALES_CLERK'] },
    { id: 'purchases', label: 'Purchases', icon: FileText, path: '/purchases', roles: ['ADMIN', 'MANAGER'] },
    { id: 'adjustments', label: 'Stock Adjustments', icon: Package, path: '/adjustments', roles: ['ADMIN', 'MANAGER'] },
    { id: 'vendors', label: 'Vendors', icon: Users, path: '/vendors', roles: ['ADMIN', 'MANAGER'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['ADMIN', 'MANAGER'] },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, path: '/ai-assistant', roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
    { id: 'ai-forecasting', label: 'AI Forecasting', icon: TrendingUp, path: '/ai-forecasting', roles: ['ADMIN', 'MANAGER'] },
    { id: 'customers', label: 'Customers', icon: Users, path: '/customers', roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      path: '/reports',
      roles: ['ADMIN', 'MANAGER'],
      subItems: [
        { id: 'reports-vat', label: 'VAT Report', path: '/reports/vat', roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports-inventory', label: 'Inventory Report', path: '/reports/inventory', roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports-sales', label: 'Sales Report', path: '/reports/sales', roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports-returns', label: 'Sales Returns', path: '/reports/returns', roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports-purchase-returns', label: 'Purchase Returns', path: '/reports/purchase-returns', roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports-financial', label: 'Financial Report', path: '/reports/financial', roles: ['ADMIN'] },
        { id: 'reports-customer', label: 'Customer Report', path: '/reports/customer', roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports-performance', label: 'Performance Report', path: '/reports/performance', roles: ['ADMIN', 'MANAGER'] },
        { id: 'reports-analytics', label: 'Analytics Report', path: '/reports/analytics', roles: ['ADMIN', 'MANAGER'] },
      ]
    },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, path: '/alerts', roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', roles: ['ADMIN', 'MANAGER', 'SALES_CLERK'] },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    // Check if the item itself is allowed for the role
    if (!item.roles.includes(user?.role)) return false;
    
    // If it has subItems, at least one subItem must be allowed
    if (item.subItems) {
      return item.subItems.some(sub => sub.roles.includes(user?.role));
    }
    
    return true;
  });

  const handleNavigation = (item) => {
    if (item.subItems) {
      setOpenMenus(prev => ({
        ...prev,
        [item.id]: !prev[item.id]
      }));
      // If it's not already on a reports page, navigate to default
      if (!location.pathname.startsWith(item.path)) {
        navigate(item.path);
      }
    } else {
      navigate(item.path);
      if (isMobile) {
        setSidebarOpen(false);
      }
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 
          ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} 
          border-r transition-transform duration-300 ease-in-out z-40 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          overflow-y-auto
        `}
      >
        {/* Close button for mobile */}
        <div className="flex items-center justify-between p-4 lg:hidden">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Menu
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Desktop heading */}
          <h2 className={`hidden lg:block text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-white' : 'text-gray-900'
            } mb-6`}>
            Navigation
          </h2>

          {/* Navigation menu */}
          <nav className="space-y-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isParentActive = location.pathname.startsWith(item.path);
              const isExactActive = location.pathname === item.path;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isOpen = openMenus[item.id];

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => handleNavigation(item)}
                    className={`
                      w-full flex items-center px-4 py-3 text-left rounded-lg 
                      transition-all duration-200 group
                      ${isExactActive || (hasSubItems && isParentActive && !isOpen)
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : isDark
                          ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${isExactActive || (hasSubItems && isParentActive && !isOpen) ? 'text-white' : 'group-hover:scale-110 transition-transform'
                      }`} />
                    <span className="font-bold flex-1">{item.label}</span>

                    {/* Dropdown Arrow */}
                    {hasSubItems && (
                      <div className="ml-2">
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 opacity-50" />
                        ) : (
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    )}

                    {/* Alerts badge */}
                    {item.id === 'alerts' && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        3
                      </span>
                    )}

                    {/* AI badge */}
                    {(item.id === 'ai-assistant' || item.id === 'ai-forecasting') && (
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        AI
                      </span>
                    )}
                  </button>

                  {/* Sub items */}
                  {hasSubItems && isOpen && (
                    <div className="ml-9 space-y-1 border-l-2 border-indigo-100 dark:border-gray-800 pl-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                      {item.subItems.filter(sub => sub.roles.includes(user?.role)).map((subItem) => {
                        const isSubActive = location.pathname === subItem.path;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              navigate(subItem.path);
                              if (isMobile) setSidebarOpen(false);
                            }}
                            className={`
                              w-full flex items-center px-3 py-2 text-sm text-left rounded-md
                              transition-colors duration-150 font-bold
                              ${isSubActive
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : isDark
                                  ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                          >
                            {subItem.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Quick Stats */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'
              } mb-3`}>
              Quick Stats
            </h3>

            <div className="space-y-3">
              <div className={`p-3 rounded-lg transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    Total Products
                  </span>
                  <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    1,247
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-lg transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    Low Stock
                  </span>
                  <span className="text-sm font-semibold text-red-500">
                    23
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-lg transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    Today's Sales
                  </span>
                  <span className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-600'
                    }`}>
                    Rs. 18,450
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="mt-6 mb-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
              <div className="flex items-center mb-2">
                <Bot className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">AI Insight</span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                Your electronics category is trending up 15% this week. Consider restocking popular items.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
