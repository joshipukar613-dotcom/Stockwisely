import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

function KPICard({ title, value, trend, status, icon: Icon, isDark }) {
  const getTrendColor = () => {
    if (status === 'warning') return 'text-yellow-500';
    if (status === 'error') return 'text-red-500';
    if (trend && trend.startsWith('+')) return 'text-green-500';
    if (trend && trend.startsWith('-')) return 'text-red-500';
    return isDark ? 'text-gray-400' : 'text-gray-500';
  };

  const getTrendIcon = () => {
    if (status === 'warning') return AlertTriangle;
    if (trend && trend.startsWith('+')) return TrendingUp;
    if (trend && trend.startsWith('-')) return TrendingDown;
    return null;
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className={`${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border rounded-lg p-6 transition-colors duration-300 hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {title}
            </h3>
            {Icon && (
              <div className={`p-2 rounded-lg ${
                status === 'warning' 
                  ? 'bg-yellow-100 text-yellow-600' 
                  : status === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-indigo-100 text-indigo-600'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {value}
            </p>
            
            {trend && (
              <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
                {TrendIcon && <TrendIcon className="h-4 w-4" />}
                <span className="text-sm font-medium">{trend}</span>
              </div>
            )}
          </div>
          
          {status === 'warning' && (
            <p className="text-xs text-yellow-600 mt-2">
              Requires attention
            </p>
          )}
          
          {status === 'error' && (
            <p className="text-xs text-red-600 mt-2">
              Critical level
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default KPICard;