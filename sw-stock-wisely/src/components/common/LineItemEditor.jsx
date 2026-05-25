import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

const LineItemEditor = ({ item, type = 'sale', onSave, onCancel }) => {
    const [quantity, setQuantity] = useState(item.quantity);
    const [price, setPrice] = useState(type === 'sale' ? item.price : (item.cost || item.price || item.cost_price));
    const [mrp, setMrp] = useState(item.mrp || price);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setError('');

        const qtyNum = Number(quantity);
        const priceNum = Number(price);
        const mrpNum = Number(mrp);

        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
            setError('Qty > 0');
            return;
        }
        if (!Number.isFinite(priceNum) || priceNum < 0) {
            setError('Price >= 0');
            return;
        }
        if (type === 'purchase' && (!Number.isFinite(mrpNum) || mrpNum < 0)) {
            setError('MRP >= 0');
            return;
        }

        setSaving(true);
        try {
            const updatePayload = {
                ...item,
                quantity: qtyNum,
                [type === 'sale' ? 'price' : 'cost_price']: priceNum
            };
            if (type === 'purchase') {
                updatePayload.mrp = mrpNum;
            }
            await onSave(updatePayload);
        } catch (err) {
            setError('Failed');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center space-x-2 bg-white p-1 rounded shadow-sm border border-blue-200">
            <div className="flex flex-col">
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-16 px-1 py-0.5 text-sm border rounded"
                    placeholder="Qty"
                    min="1"
                />
            </div>
            <div className="flex flex-col">
                <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-20 px-1 py-0.5 text-sm border rounded"
                    placeholder={type === 'sale' ? 'Price' : 'Cost'}
                    min="0"
                    step="0.01"
                />
            </div>
            {type === 'purchase' && (
                <div className="flex flex-col">
                    <input
                        type="number"
                        value={mrp}
                        onChange={(e) => setMrp(e.target.value)}
                        className="w-20 px-1 py-0.5 text-sm border rounded"
                        placeholder="MRP"
                        min="0"
                        step="0.01"
                    />
                </div>
            )}

            <div className="flex items-center space-x-1">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Save"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button
                    onClick={onCancel}
                    disabled={saving}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Cancel"
                >
                    <X size={16} />
                </button>
            </div>
            {error && <span className="text-xs text-red-500 font-medium absolute -bottom-5 left-0 whitespace-nowrap bg-white px-1 shadow-sm border border-red-100 rounded z-10">{error}</span>}
        </div>
    );
};

export default LineItemEditor;
