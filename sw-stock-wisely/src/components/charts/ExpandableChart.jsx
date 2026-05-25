import React, { useState } from 'react';
import { Maximize2, Minimize2, BarChart3, TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ExpandableChart = ({ 
  children, 
  title, 
  icon: Icon = BarChart3, 
  isDark = false,
  className = "",
  expandedClassName = "",
  showStats = true,
  stats = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getIconForChart = (chartTitle) => {
    const title = chartTitle.toLowerCase();
    if (title.includes('line') || title.includes('trend') || title.includes('performance')) {
      return TrendingUp;
    } else if (title.includes('pie') || title.includes('distribution') || title.includes('portfolio')) {
      return PieChartIcon;
    } else if (title.includes('doughnut') || title.includes('risk')) {
      return Activity;
    }
    return BarChart3;
  };

  const ChartIcon = Icon || getIconForChart(title);

  const containerClasses = isExpanded 
    ? `fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 ${expandedClassName}`
    : `border rounded-lg p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${className}`;

  const chartContainerClasses = isExpanded 
    ? 'w-full h-full max-w-7xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6'
    : 'w-full';

  const chartHeight = isExpanded ? 'h-[70vh]' : 'h-80';

  return (
    <div className={containerClasses}>
      <div className={chartContainerClasses}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isDark ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <ChartIcon className={`h-5 w-5 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`} />
            </div>
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {showStats && stats.length > 0 && !isExpanded && (
              <div className="flex items-center space-x-4 text-sm">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stat.value}
                    </div>
                    <div className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={toggleExpanded}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Chart Content */}
        <div className={chartHeight}>
          {children}
        </div>

        {/* Expanded View Stats */}
        {isExpanded && showStats && stats.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className={`text-md font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Detailed Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className={`text-2xl font-bold ${
                    stat.color || (isDark ? 'text-white' : 'text-gray-900')
                  }`}>
                    {stat.value}
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stat.label}
                  </div>
                  {stat.description && (
                    <div className={`text-xs mt-1 ${
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {stat.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button for expanded view */}
        {isExpanded && (
          <div className="absolute top-4 right-4">
            <button
              onClick={toggleExpanded}
              className={`p-2 rounded-full transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              title="Close"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableChart;

