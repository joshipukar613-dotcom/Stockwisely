import React from 'react';
import { User, Phone, Calendar, Users, Edit, Trash2 } from 'lucide-react';

const CustomerCard = ({ customer, isDark, onEdit, onDelete }) => {
  return (
    <div className={`p-5 rounded-lg border flex flex-col justify-between hover:shadow-md transition-shadow ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {customer.name}
              </h3>
              {customer.contact_person && (
                <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Contact: {customer.contact_person}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'
              }`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center text-sm">
            <Phone className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{customer.phone || 'No phone'}</span>
          </div>
          <div className="flex items-center text-sm">
            <Calendar className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{customer.age_range || 'Age: Not specified'}</span>
          </div>
          <div className="flex items-start text-sm">
            <Users className={`h-4 w-4 mr-2 mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{customer.gender || 'Gender: Not specified'}</span>
          </div>
        </div>
      </div>

      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Frequency</p>
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{customer.purchase_count || 0} Orders</p>
          </div>
          <div className="text-right">
            <p className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recency</p>
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {customer.last_purchase_date ? new Date(customer.last_purchase_date).toLocaleDateString() : 'Never'}
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monetary (Total)</span>
          <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
            Rs. {parseFloat(customer.total_purchase_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;
