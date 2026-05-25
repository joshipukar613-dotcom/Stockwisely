import React, { useEffect, useState } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useParams, useNavigate } from 'react-router-dom';
import { vendorsAPI } from '../api';
import PurchaseHistoryTable from '../components/vendors/PurchaseHistoryTable';
import ProductBreakdownTable from '../components/vendors/ProductBreakdownTable';
import VendorLedger from '../components/vendors/VendorLedger';
import PaymentModal from '../components/vendors/PaymentModal';
import { Mail, Phone, MapPin, Pencil, Download, CreditCard } from 'lucide-react';

function VendorDetail() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [summary, setSummary] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInitialPurchaseId, setPaymentInitialPurchaseId] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [v, ph, pr, pay] = await Promise.all([
        vendorsAPI.get(id),
        vendorsAPI.purchases(id),
        vendorsAPI.products(id),
        vendorsAPI.payments(id),
      ]);
      setVendor(v.data?.data?.vendor || null);
      setSummary(v.data?.data?.summary || null);
      setPurchases(ph.data?.data || []);
      setProducts(pr.data?.data || []);
      setPayments(pay.data?.data || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 transition-all ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className={`p-6 rounded-lg border text-center ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                Loading vendor...
              </div>
            ) : error ? (
              <div className={`p-6 rounded-lg border text-center ${isDark ? 'bg-red-900/40 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {error}
              </div>
            ) : (
              <>
                {/* Vendor Info */}
                <div className={`rounded-lg border p-4 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{vendor?.name}</h1>
                      <div className={`mt-2 space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="flex items-center space-x-2"><Mail className="h-4 w-4" /> <span>{vendor?.email || '—'}</span></div>
                        <div className="flex items-center space-x-2"><Phone className="h-4 w-4" /> <span>{vendor?.phone || '—'}</span></div>
                        <div className="flex items-center space-x-2"><MapPin className="h-4 w-4" /> <span>{vendor?.address || '—'}</span></div>
                      </div>
                      <div className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Created on {vendor?.created_at ? new Date(vendor.created_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-2 rounded bg-gray-100 text-gray-900 hover:bg-gray-200 flex items-center space-x-1">
                        <Pencil className="h-4 w-4" /><span>Edit</span>
                      </button>
                      {/* Redundant - removing as per user recommendation to use row-level Pay buttons */}
                      {/* 
                      <button className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center space-x-1" onClick={() => setShowPaymentModal(true)}>
                        <CreditCard className="h-4 w-4" /><span>Record Payment</span>
                      </button> 
                      */}
                      <button className="px-3 py-2 rounded bg-gray-100 text-gray-900 hover:bg-gray-200 flex items-center space-x-1">
                        <Download className="h-4 w-4" /><span>Export Statement</span>
                      </button>
                    </div>
                  </div>
                  {/* Financial summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total Purchases</div>
                      <div className="text-xl font-bold">Rs. {Number(summary?.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{Number(summary?.purchases_count || 0)} orders</div>
                    </div>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total Paid</div>
                      <div className="text-xl font-bold">Rs. {Number(summary?.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Outstanding</div>
                      <div className="text-xl font-bold">Rs. {Number(summary?.outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>Overdue: Rs. {Number(summary?.overdue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Realized Profit (FIFO)</div>
                      <div className="text-xl font-bold text-green-500">Rs. {Number(summary?.realized_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Remaining Stock Value</div>
                      <div className="text-xl font-bold">Rs. {Number(summary?.remaining_batch_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{Number(summary?.remaining_batch_qty || 0)} units remaining</div>
                    </div>

                  </div>
                </div>

                {/* Purchase History */}
                <div className="mb-6">
                  <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Purchase History</h2>
                  <PurchaseHistoryTable
                    rows={purchases.filter(p => !p.is_return)}
                    isDark={isDark}
                    onViewItems={(r, action) => {
                      if (action === 'pay') {
                        setPaymentInitialPurchaseId(r.id);
                        setShowPaymentModal(true);
                      } else {
                        console.log('View items', r);
                      }
                    }}
                  />
                </div>

                {/* Purchase Returns */}
                <div className="mb-6">
                  <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Purchase Returns</h2>
                  <PurchaseHistoryTable
                    rows={purchases.filter(p => p.is_return)}
                    isDark={isDark}
                    onViewItems={(r) => {
                      console.log('View return items', r);
                    }}
                  />
                </div>

                {/* Vendor Ledger (Transaction History) */}
                <div className="mb-6">
                  <VendorLedger vendorId={id} isDark={isDark} />
                </div>

                {/* Products Purchased */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Products Purchased</h2>
                  </div>
                  <ProductBreakdownTable rows={products} isDark={isDark} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          vendorId={id}
          purchases={purchases}
          initialPurchaseId={paymentInitialPurchaseId}
          onRecorded={() => {
            setShowPaymentModal(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

export default VendorDetail;
