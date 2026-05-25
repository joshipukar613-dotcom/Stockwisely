import React, { useState, useEffect } from 'react';
import { X, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { inventoryAPI } from '../../api';

const AddAdjustmentModal = ({ isOpen, onClose, onAdjusted, isDark }) => {
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [actualStock, setActualStock] = useState('');
    const [reason, setReason] = useState('Physical Count');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    const reasons = [
        'Physical Count',
        'Damage',
        'Theft',
        'Found Stock',
        'Spoilage',
        'Data Entry Error',
        'Expired',
        'Other'
    ];

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search.length >= 2) {
                searchProducts();
            } else {
                setProducts([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const searchProducts = async () => {
        try {
            setSearching(true);
            const res = await inventoryAPI.getProducts({ search, limit: 10 });
            setProducts(res.data?.data || []);
        } catch (err) {
            console.error('Search products error:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectProduct = (p) => {
        setSelectedProduct(p);
        setSearch('');
        setProducts([]);
        setActualStock(p.stock_quantity || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;

        const qtyBefore = Number(selectedProduct.stock_quantity || 0);
        const qtyAfter = Number(actualStock);
        const diff = qtyAfter - qtyBefore;

        if (diff === 0) {
            alert('No change in stock level.');
            return;
        }

        // Large change warning logic (Phase 2 requirement)
        if (!showWarning && (Math.abs(diff) > qtyBefore * 0.5 || Math.abs(diff) > 100)) {
            setShowWarning(true);
            return;
        }

        try {
            setLoading(true);
            await inventoryAPI.createAdjustment({
                product_id: selectedProduct.id,
                quantity_after: qtyAfter,
                reason,
                notes,
                adjustment_date: date
            });
            onAdjusted();
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to adjust stock');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const qtyBefore = selectedProduct ? Number(selectedProduct.stock_quantity || 0) : 0;
    const qtyAfter = Number(actualStock);
    const difference = qtyAfter - qtyBefore;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold">Adjust Stock</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"><X /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Product Search */}
                    {!selectedProduct ? (
                        <div className="relative">
                            <label className="block text-sm font-medium mb-1 opacity-70">Search Product</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Type product name or code..."
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            {searching && <div className="absolute right-3 top-9 text-xs text-gray-400">Searching...</div>}
                            {products.length > 0 && (
                                <div className={`absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                    {products.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className={`w-full text-left px-4 py-2 hover:bg-indigo-500 hover:text-white transition-colors border-b last:border-0 ${isDark ? 'border-gray-600' : 'border-gray-100'}`}
                                            onClick={() => handleSelectProduct(p)}
                                        >
                                            <div className="font-semibold">{p.description}</div>
                                            <div className="text-xs opacity-70">{p.product_code} | Stock: {p.stock_quantity}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`p-3 rounded-lg flex items-center justify-between ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div>
                                <div className="font-bold">{selectedProduct.description}</div>
                                <div className="text-xs opacity-60">Initial: {selectedProduct.stock_quantity}</div>
                            </div>
                            <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs text-indigo-500 hover:underline">Change</button>
                        </div>
                    )}

                    {/* Adjustment Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 opacity-70">Current Stock</label>
                            <input readOnly type="text" value={qtyBefore} className={`w-full px-4 py-2 rounded-lg border opacity-50 cursor-not-allowed ${isDark ? 'bg-gray-600 border-gray-500' : 'bg-gray-100 border-gray-200'}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 opacity-70">New Actual Stock</label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="any"
                                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                                value={actualStock}
                                onChange={(e) => setActualStock(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Difference Display */}
                    {selectedProduct && (
                        <div className={`px-4 py-2 rounded-lg text-center font-bold ${difference > 0 ? 'bg-green-100 text-green-700' : difference < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            Difference: {difference > 0 ? '+' : ''}{Number(difference.toFixed(2))} units
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 opacity-70">Reason</label>
                        <select
                            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        >
                            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 opacity-70">Notes</label>
                        <textarea
                            rows="2"
                            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                            placeholder="Detailed notes (optional)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                    </div>

                    {showWarning && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-amber-800">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <strong>Significant Change!</strong> This adjustment changes stock by {Math.abs(difference)} units ({Math.round(Math.abs(difference) / qtyBefore * 100)}%). Are you sure?
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={loading || !selectedProduct || difference === 0}
                            type="submit"
                            className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${loading || !selectedProduct || difference === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {loading ? 'Processing...' : showWarning ? 'Confirm & Save' : 'Save Adjustment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAdjustmentModal;
