import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

function QuickActionButton({ icon: Icon, label, color, onClick }) {
  const { isDark } = useTheme();

  // Strict black/white palette
  const baseButtonClasses = isDark
    ? 'bg-[#101010] text-[#fefefe] border-[#fefefe] hover:opacity-90'
    : 'bg-[#fefefe] text-[#101010] border-[#101010] hover:opacity-90';

  const iconContainerClasses = isDark ? 'bg-[#101010]' : 'bg-[#fefefe]';
  const iconColorClasses = isDark ? 'text-[#fefefe]' : 'text-[#101010]';

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg transition-all duration-200 shadow-sm border ${baseButtonClasses} group`}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className={`p-3 rounded-lg ${iconContainerClasses} transition-colors`}>
          <Icon className={`h-6 w-6 ${iconColorClasses}`} />
        </div>
        <span className={`text-sm font-medium ${iconColorClasses}`}>
          {label}
        </span>
      </div>
    </button>
  );
}

export default QuickActionButton;