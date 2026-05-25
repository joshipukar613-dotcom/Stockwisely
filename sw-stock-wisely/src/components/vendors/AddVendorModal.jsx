import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { vendorsAPI } from '../../api';
import { X } from 'lucide-react';

const AddVendorModal = ({ isOpen, onClose, onCreated, presetName = '', presetVendor = null }) => {
  const { isDark } = useTheme();
  
  const initialPhoneStr = presetVendor?.phone || '';
  const initialCountryCode = initialPhoneStr.includes('+91') ? '+91' : '+977';
  const initialPhoneDigits = initialPhoneStr.replace(/\D/g, '').replace(/^(977|91)/, '');

  const [form, setForm] = useState({
    name: presetVendor?.name || presetName || '',
    contact_person: presetVendor?.contact_person || '',
    email: presetVendor?.email || '',
    country_code: initialCountryCode,
    phone: initialPhoneDigits,
    address: presetVendor?.address || '',
    vendor_type: presetVendor?.vendor_type || 'Local Supplier',
    payment_terms: presetVendor?.payment_terms || '15 Days',
    credit_limit: presetVendor?.credit_limit || 0,
    preferred_payment_method: presetVendor?.preferred_payment_method || 'Cash',
    tax_number: presetVendor?.tax_number || '',
    opening_balance: presetVendor?.opening_balance || 0,
    notes: presetVendor?.notes || '',
    is_active: presetVendor?.is_active ?? true,
    bank_name: presetVendor?.bank_name || '',
    account_name: presetVendor?.account_name || '',
    account_number: presetVendor?.account_number || '',
    bank_branch: presetVendor?.bank_branch || '',
    swift_code: presetVendor?.swift_code || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [showBank, setShowBank] = useState(true);

  const emailValid = useMemo(() => {
    if (!form.email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  }, [form.email]);

  const formattedPhone = useMemo(() => {
    const digits = String(form.phone || '').replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }, [form.phone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    const v = value.replace(/[^0-9.]/g, '');
    setForm((prev) => ({ ...prev, [name]: v }));
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, phone: digits }));
  };

  const validate = () => {
    if (!form.name.trim()) {
      setError('Vendor name is required');
      return false;
    }
    if (!form.phone || String(form.phone).replace(/\D/g, '').length < 9) {
      setError('Phone number is required');
      return false;
    }
    if (!emailValid) {
      setError('Enter a valid email');
      return false;
    }
    if (Number(form.credit_limit) < 0) {
      setError('Credit limit cannot be negative');
      return false;
    }
    if (Number(form.opening_balance) < 0) {
      setError('Opening balance cannot be negative');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = async () => {
    setError('');
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person || null,
        email: form.email || null,
        phone: `${form.country_code || ''} ${formattedPhone}`.trim(),
        address: form.address || null,
        vendor_type: form.vendor_type || null,
        payment_terms: form.payment_terms || null,
        credit_limit: Number(form.credit_limit || 0),
        preferred_payment_method: form.preferred_payment_method || null,
        tax_number: form.tax_number || null,
        opening_balance: Number(form.opening_balance || 0),
        notes: form.notes || null,
        is_active: !!form.is_active,
        bank_name: form.bank_name || null,
        account_name: form.account_name || null,
        account_number: form.account_number || null,
        bank_branch: form.bank_branch || null,
        swift_code: form.swift_code || null
      };
      let res;
      if (presetVendor) {
        res = await vendorsAPI.update(presetVendor.id, payload);
      } else {
        res = await vendorsAPI.create(payload);
      }
      const vendor = res.data?.data || null;
      if (vendor) {
        onCreated?.(vendor);
      } else {
        setError(presetVendor ? 'Failed to update vendor' : 'Failed to create vendor');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || (presetVendor ? 'Failed to update vendor' : 'Failed to create vendor'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full max-w-2xl rounded-xl border ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {presetVendor ? 'Edit Vendor' : 'Add Vendor'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {error && (
            <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'basic' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700')}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic Info
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'finance' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700')}`}
              onClick={() => setActiveTab('finance')}
            >
              Financial
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'bank' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700')}`}
              onClick={() => setActiveTab('bank')}
            >
              Bank
            </button>
            <button
              className={`px-3 py-2 rounded-lg text-sm ${activeTab === 'other' ? 'bg-indigo-600 text-white' : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700')}`}
              onClick={() => setActiveTab('other')}
            >
              Other
            </button>
          </div>

          {activeTab === 'basic' && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Vendor Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter vendor name"
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>PAN Number</label>
              <input
                type="text"
                name="tax_number"
                value={form.tax_number}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={form.contact_person}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter contact person"
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter email"
              />
              {!emailValid && <p className={`mt-1 text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}>Invalid email format</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
              <div className="flex gap-2">
                <select
                  name="country_code"
                  value={form.country_code}
                  onChange={handleChange}
                  className={`px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="+977">+977 NP</option>
                  <option value="+91">+91 IN</option>
                </select>
                <input
                  type="text"
                  name="phone"
                  value={formattedPhone}
                  onChange={handlePhoneChange}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="98X-XXX-XXXX"
                />
              </div>
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nepal mobile typically 10 digits starting 97/98</p>
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                maxLength={200}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Street, city, province"
              />
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{form.address.length}/200</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Vendor Type</label>
              <select
                name="vendor_type"
                value={form.vendor_type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option>Manufacturer</option>
                <option>Distributor</option>
                <option>Wholesaler</option>
                <option>Local Supplier</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Payment Terms</label>
              <select
                name="payment_terms"
                value={form.payment_terms}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option>Cash on Delivery</option>
                <option>7 Days</option>
                <option>15 Days</option>
                <option>30 Days</option>
                <option>60 Days</option>
              </select>
            </div>
          </div>
          </>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Credit Limit</label>
                  <input
                    type="text"
                    name="credit_limit"
                    value={form.credit_limit}
                    onChange={handleNumericChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="0"
                  />
                  <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Maximum allowed outstanding</p>
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Opening Balance</label>
                  <input
                    type="text"
                    name="opening_balance"
                    value={form.opening_balance}
                    onChange={handleNumericChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="0"
                  />
                  <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Initial amount owed</p>
                </div>
              </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Preferred Payment Method</label>
                  <select
                    name="preferred_payment_method"
                    value={form.preferred_payment_method}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                    <option>eSewa</option>
                    <option>Khalti</option>
                  </select>
                </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Bank Details</span>
                <button
                  onClick={() => setShowBank((v) => !v)}
                  className={`text-sm px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
                >
                  {showBank ? 'Hide' : 'Show'}
                </button>
              </div>
              {showBank && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={form.bank_name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Account Name</label>
                  <input
                    type="text"
                    name="account_name"
                    value={form.account_name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Account Number</label>
                  <input
                    type="text"
                    name="account_number"
                    value={form.account_number}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Branch</label>
                  <input
                    type="text"
                    name="bank_branch"
                    value={form.bank_branch}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>SWIFT Code</label>
                  <input
                    type="text"
                    name="swift_code"
                    value={form.swift_code}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
              </div>
              )}
            </div>
          )}

          {activeTab === 'other' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Important terms, delivery notes"
                />
                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{form.notes.length}/500</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                <label htmlFor="is_active" className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Active</label>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg ${
              isDark ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Saving...' : (presetVendor ? 'Update Vendor' : 'Save Vendor')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddVendorModal;
