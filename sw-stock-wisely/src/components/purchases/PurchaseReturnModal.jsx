import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { purchasesAPI } from '../../api';
import { X, AlertCircle, RotateCcw, Save, Trash2 } from 'lucide-react';

const PurchaseReturnModal = ({ isOpen, onClose, purchase: initialPurchase }) => {
    const { isDark } = useTheme();
    const [purchase, setPurchase] = useState(initialPurchase);
    const [originalInvoice, setOriginalInvoice] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    const [items, setItems] = useState([]);
    const [returnType, setReturnType] = useState('refund');
    const [creditNoteNumber, setCreditNoteNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (purchase && purchase.items) {
            setItems(purchase.items.map(item => ({
                ...item,
                quantity_to_return: 0,
                return_reason: '',
                selected: false
            })));
        }
    }, [purchase, isOpen]);

    const handleItemSelect = (index, checked) => {
        const newItems = [...items];
        newItems[index].selected = checked;
        if (checked) {
            // Default to returning all available if selected
            const available = Number(newItems[index].quantity) - Number(newItems[index].quantity_returned || 0);
            newItems[index].quantity_to_return = available;
        } else {
            newItems[index].quantity_to_return = 0;
        }
        setItems(newItems);
    };

    const searchOriginalPurchase = async (invoiceNumber) => {
        if (!invoiceNumber || invoiceNumber.length < 3) return;

        setSearchLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:5000/api/purchases/search?invoice=${invoiceNumber}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            const data = await response.json();

            if (data.success && data.purchase) {
                setPurchase(data.purchase);
                alert(`✓ Purchase loaded successfully!\n\nInvoice: ${data.purchase.invoice_number}\nVendor: ${data.purchase.vendor_name}\nItems: ${data.purchase.items?.length || 0}\nTotal: Rs. ${Math.abs(data.purchase.total_amount)}`);
            } else {
                alert('Purchase not found. Please check the invoice number.');
                setPurchase(null);
            }
        } catch (error) {
            console.error('Error searching purchase:', error);
            alert('Error searching for purchase. Please try again.');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleQuantityChange = (index, val) => {
        const newItems = [...items];
        const available = Number(newItems[index].quantity) - Number(newItems[index].quantity_returned || 0);
        const quantity = Math.min(Math.max(0, parseInt(val) || 0), available);
        newItems[index].quantity_to_return = quantity;
        setItems(newItems);
    };

    const handleReasonChange = (index, reason) => {
        const newItems = [...items];
        newItems[index].return_reason = reason;
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedItems = items.filter(item => item.selected && item.quantity_to_return > 0);

        if (selectedItems.length === 0) {
            alert('Please select at least one item with a valid return quantity.');
            return;
        }

        if (selectedItems.some(item => !item.return_reason)) {
            alert('Please specify a return reason for all selected items.');
            return;
        }

        if (returnType === 'credit_note' && !creditNoteNumber.trim()) {
            alert('Credit note number is required for credit note returns.');
            return;
        }

        const confirmed = window.confirm(
            `Process Purchase Return?\n\n` +
            `Original Invoice: ${purchase.invoice_number}\n` +
            `Vendor: ${purchase.vendor_name}\n` +
            `Return Method: ${returnType}\n\n` +
            `This will decrease stock and update vendor ledger. Continue?`
        );

        if (!confirmed) return;

        setLoading(true);

        try {
            const payload = {
                transaction_type: 'return',
                original_purchase_id: purchase.id,
                vendor_id: purchase.vendor_id,
                vendor_name: purchase.vendor_name,
                contact_person: purchase.contact_person,
                email: purchase.email,
                phone: purchase.phone,
                address: purchase.address,
                items: selectedItems.map(item => ({
                    product_code: item.product_code,
                    product_name: item.product_name,
                    quantity: item.quantity_to_return,
                    price: item.price,
                    return_reason: item.return_reason
                })),
                return_method: returnType,
                credit_note_number: creditNoteNumber,
                notes,
                payment_status: 'Pending',
                payment_method: 'Cash',
                subtotal: Math.abs(purchase.total_amount),
                total_amount: Math.abs(purchase.total_amount),
                due_amount: Math.abs(purchase.total_amount)
            };

            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/purchases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                alert(
                    `✓ Purchase Return Successful!\n\n` +
                    `Return Invoice: ${data.data?.invoice_number || data.return_invoice}\n` +
                    `Status: ${data.new_return_status || 'Processed'}\n\n` +
                    `Stock has been adjusted.\n` +
                    `Vendor ledger has been updated.`
                );
                if (onClose) onClose(true);
                window.location.reload();
            } else {
                alert(`❌ Error: ${data.message || data.error || 'Unknown error occurred'}`);
            }
        } catch (error) {
            console.error('Purchase Return Error:', error);
            alert('Error processing purchase return. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                    <div className="flex items-center space-x-2">
                        <RotateCcw className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                        <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Purchase Return: {purchase.invoice_number}
                        </h2>
                    </div>
                    <button
                        onClick={() => onClose()}
                        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {!initialPurchase && (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded mb-4">
                            <label className="block text-sm font-semibold text-orange-800 mb-2">
                                Original Purchase Invoice Number *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={originalInvoice}
                                    onChange={(e) => setOriginalInvoice(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            searchOriginalPurchase(originalInvoice);
                                        }
                                    }}
                                    placeholder="Type invoice number (e.g., PUR-1001) and press Enter..."
                                    className="flex-1 p-2 border rounded"
                                />
                                <button
                                    onClick={() => searchOriginalPurchase(originalInvoice)}
                                    disabled={searchLoading || !originalInvoice}
                                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
                                >
                                    {searchLoading ? 'Searching...' : 'Search'}
                                </button>
                            </div>

                            {purchase && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                    <p className="text-sm font-semibold text-green-800">✓ Original Purchase Loaded</p>
                                    <p className="text-xs text-green-700 mt-1">
                                        Invoice: {purchase.invoice_number} |
                                        Date: {new Date(purchase.purchase_date).toLocaleDateString()} |
                                        Items: {purchase.items?.length || 0} |
                                        Total: Rs. {Math.abs(purchase.total_amount)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {purchase && (
                        <form id="purchase-return-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Return Settings */}
                                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Return Type & Info</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Return Method *
                                            </label>
                                            <select
                                                value={returnType}
                                                onChange={(e) => setReturnType(e.target.value)}
                                                className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                                    }`}
                                            >
                                                <option value="refund">Refund (Reduce Balance/Ledger)</option>
                                                <option value="credit_note">Credit Note (For future purchases)</option>
                                                <option value="replacement">Replacement (No financial impact)</option>
                                            </select>
                                        </div>

                                        {returnType === 'credit_note' && (
                                            <div>
                                                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Credit Note Number *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={creditNoteNumber}
                                                    onChange={(e) => setCreditNoteNumber(e.target.value)}
                                                    placeholder="e.g. CN-12345"
                                                    className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                                        }`}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Vendor & Original Info */}
                                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reference Details</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Vendor:</span>
                                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{purchase.vendor_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Original Date:</span>
                                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {new Date(purchase.purchase_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Total Amount:</span>
                                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Rs. {purchase.total_amount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="space-y-3">
                                <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Select Items to Return</h3>
                                <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                                    <table className="w-full text-sm text-left">
                                        <thead className={isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}>
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <Trash2 className="h-4 w-4" />
                                                </th>
                                                <th className="p-3">Product</th>
                                                <th className="p-3 text-center">Purchased</th>
                                                <th className="p-3 text-center">Returned</th>
                                                <th className="p-3 text-center">Available</th>
                                                <th className="p-3 w-28 text-center">Return Qty</th>
                                                <th className="p-3">Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                            {items.map((item, idx) => {
                                                const available = Number(item.quantity) - Number(item.quantity_returned || 0);
                                                return (
                                                    <tr key={idx} className={item.selected ? (isDark ? 'bg-orange-500/10' : 'bg-orange-50') : ''}>
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.selected}
                                                                disabled={available <= 0}
                                                                onChange={(e) => handleItemSelect(idx, e.target.checked)}
                                                                className="rounded text-orange-600 focus:ring-orange-500"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.product_name}</div>
                                                            <div className="text-xs text-gray-500">{item.product_code}</div>
                                                        </td>
                                                        <td className="p-3 text-center">{item.quantity}</td>
                                                        <td className="p-3 text-center text-orange-600 font-medium">{item.quantity_returned || 0}</td>
                                                        <td className="p-3 text-center font-bold">{available}</td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={available}
                                                                disabled={!item.selected}
                                                                value={item.quantity_to_return}
                                                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                                                className={`w-full p-2 text-center rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                                                                    } ${!item.selected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <select
                                                                disabled={!item.selected}
                                                                value={item.return_reason}
                                                                onChange={(e) => handleReasonChange(idx, e.target.value)}
                                                                className={`w-full p-2 text-sm rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                                                                    } ${!item.selected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <option value="">Select Reason</option>
                                                                <option value="Defective">Defective</option>
                                                                <option value="Wrong Item">Wrong Item</option>
                                                                <option value="Damaged in Transit">Damaged in Transit</option>
                                                                <option value="Expired">Expired</option>
                                                                <option value="Quality Issue">Quality Issue</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Return Notes (Internal)
                                </label>
                                <textarea
                                    rows="3"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Provide more context for the return..."
                                    className={`w-full p-3 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                        }`}
                                />
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-6 border-t flex justify-end space-x-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button
                        onClick={() => onClose()}
                        className={`px-6 py-2 rounded-lg border font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Cancel
                    </button>
                    {purchase && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`px-6 py-2 rounded-lg text-white font-medium flex items-center space-x-2 transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>Confirm Return</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseReturnModal;
