import React, { useState, useEffect } from 'react';
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { vendorsAPI } from '../../api';

const VendorLedger = ({ vendorId, isDark }) => {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const fetchLedger = async () => {
        try {
            setLoading(true);
            const res = await vendorsAPI.getLedger(vendorId, dateRange);
            setLedger(res.data?.data || []);
            setError(null);
        } catch (err) {
            console.error('Fetch ledger error:', err);
            setError('Failed to load ledger history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (vendorId) fetchLedger();
    }, [vendorId, dateRange]);

    const getBalanceColor = (balance) => {
        if (balance > 0.01) return 'bg-[#EF4444] text-white'; // We owe (Red)
        if (balance < -0.01) return 'bg-[#F59E0B] text-white'; // Vendor owes us (Orange)
        return 'bg-[#10B981] text-white'; // Settled (Green)
    };

    const exportCSV = () => {
        const headers = ['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance', 'Description'];
        const rows = ledger.map(item => [
            new Date(item.transaction_date).toLocaleDateString(),
            item.transaction_type,
            item.reference_number || '',
            item.debit,
            item.credit,
            item.balance,
            item.description || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `vendor_ledger_${vendorId}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && ledger.length === 0) {
        return <div className="p-10 text-center text-gray-500">Loading ledger...</div>;
    }

    return (
        <div className={`rounded-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Header & Filters */}
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Vendor Ledger</h2>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                        <input
                            type="date"
                            className={`text-sm rounded border p-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>to</span>
                        <input
                            type="date"
                            className={`text-sm rounded border p-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    <button
                        onClick={exportCSV}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                    >
                        <Download className="h-4 w-4" />
                        <span>CSV</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className={isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}>
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Reference</th>
                            <th className="px-4 py-3 text-right font-medium">Debit (+)</th>
                            <th className="px-4 py-3 text-right font-medium">Credit (-)</th>
                            <th className="px-4 py-3 text-right font-medium">Balance</th>
                            <th className="px-4 py-3 text-left font-medium">Description</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {ledger.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-10 text-center text-gray-500">No ledger entries found for this period.</td>
                            </tr>
                        ) : (
                            ledger.map((item) => (
                                <tr key={item.id} className={item.transaction_type === 'Void' ? 'opacity-50 line-through' : ''}>
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(item.transaction_date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.transaction_type === 'Purchase' ? 'bg-blue-100 text-blue-800' :
                                            item.transaction_type === 'Payment' ? 'bg-green-100 text-green-800' :
                                                item.transaction_type === 'Return' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {item.transaction_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{item.reference_number || '—'}</td>
                                    <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                                        {item.debit > 0 ? `Rs. ${Number(item.debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                                        {item.credit > 0 ? `Rs. ${Number(item.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`px-3 py-1 rounded-full font-bold text-xs inline-block min-w-[100px] text-center ${getBalanceColor(Number(item.balance))}`}>
                                            Rs. {Number(item.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{item.description}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VendorLedger;
