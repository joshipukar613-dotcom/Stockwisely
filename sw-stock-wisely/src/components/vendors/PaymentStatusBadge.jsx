import React from 'react';

const COLORS = {
  Paid: 'bg-emerald-500 text-white',      // Green #10B981
  'Partial Payment': 'bg-orange-500 text-white', // Orange #F59E0B
  Pending: 'bg-blue-900 text-white',      // Dark Blue #1E40AF
  Overdue: 'bg-red-500 text-white',
  Return: 'bg-orange-100 text-orange-800 font-bold',
};

const PaymentStatusBadge = ({ status }) => {
  const normalizedStatus = status === 'Partial' ? 'Partial Payment' : status;
  const colorClass = COLORS[normalizedStatus] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${colorClass}`}>
      {status}
    </span>
  );
};

export default PaymentStatusBadge;
