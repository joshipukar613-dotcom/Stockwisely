import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const GlobalToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { type, message } = e.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, message }]);

      // Auto remove after 5s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    window.addEventListener('toast', handleToast);
    return () => window.removeEventListener('toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto min-w-[300px] border ${
            toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
            toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' :
            toast.type === 'warning' ? 'bg-amber-500 border-amber-400 text-white' :
            'bg-indigo-600 border-indigo-500 text-white'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {toast.type === 'info' && <Info className="w-5 h-5" />}
          
          <p className="font-medium text-sm flex-1">{toast.message}</p>
          
          <button 
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default GlobalToast;
