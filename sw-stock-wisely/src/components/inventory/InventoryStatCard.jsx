import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

function InventoryStatCard({ title, value, icon: Icon, iconBg, iconColor, subtitle }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`group rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start">
          <div
            className={`relative flex-shrink-0 rounded-lg p-3 ${iconBg} ring-1 ring-inset/0 after:absolute after:inset-0 after:rounded-lg after:bg-white/0 group-hover:after:bg-white/5 transition-colors`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="ml-4 flex-1">
            <p
              className={`text-xs uppercase tracking-wide font-medium ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {title}
            </p>
            <p className={`mt-1 text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryStatCard;