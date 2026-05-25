import React from 'react';

const StatCard = ({ label, value, accent }) => (
  <div className={`flex-1 min-w-[160px] p-4 rounded-lg border ${accent} bg-white dark:bg-gray-800 dark:border-gray-700`}>
    <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
  </div>
);

const VendorStatistics = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Total Vendors" value={stats?.total_vendors ?? 0} accent="border-gray-200" />
      <StatCard label="Active Vendors" value={stats?.active_vendors ?? 0} accent="border-gray-200" />
      <StatCard label="Total Payables" value={`Rs. ${Number(stats?.total_payables || 0).toLocaleString()}`} accent="border-gray-200" />
      <StatCard label="Overdue" value={`Rs. ${Number(stats?.overdue || 0).toLocaleString()}`} accent="border-gray-200" />
    </div>
  );
};

export default VendorStatistics;
