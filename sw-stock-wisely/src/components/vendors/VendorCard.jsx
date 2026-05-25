import React from 'react';
import PaymentStatusBadge from './PaymentStatusBadge';
import { Eye, Pencil, Trash2 } from 'lucide-react';

const VendorCard = ({ vendor, onView, onEdit, onDelete, isDark }) => {
  return (
    <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{vendor.name}</div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{vendor.contact_person || '—'}</div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{vendor.phone || '—'}</div>
        </div>
        <div>
          <span className={`px-2 py-1 text-xs rounded ${vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'} mr-2`}>
            {vendor.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Purchases</div>
          <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{vendor.purchases_count || 0}</div>
        </div>
        <div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Spent</div>
          <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Rs. {Number(vendor.total_spent || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Outstanding</div>
          <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Rs. {Number(vendor.outstanding || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Last Purchase</div>
          <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{vendor.last_purchase ? new Date(vendor.last_purchase).toLocaleDateString() : '—'}</div>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 mt-4">
        <button onClick={() => onView(vendor)} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center space-x-1">
          <Eye className="h-4 w-4" /><span>View Details</span>
        </button>
        <button onClick={() => onEdit(vendor)} className="px-3 py-2 rounded bg-gray-100 text-gray-900 hover:bg-gray-200 flex items-center space-x-1">
          <Pencil className="h-4 w-4" /><span>Edit</span>
        </button>
        <button onClick={() => onDelete(vendor)} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 flex items-center space-x-1">
          <Trash2 className="h-4 w-4" /><span>Delete</span>
        </button>
      </div>
    </div>
  );
};

export default VendorCard;
