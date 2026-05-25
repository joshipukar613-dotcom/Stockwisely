import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Minus, Percent, DollarSign, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const VATCalculator = ({ onClose }) => {
  const { isDark } = useTheme();
  const [calculationType, setCalculationType] = useState('add'); // 'add' or 'remove'
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('13'); // Default Nepal VAT rate
  const [result, setResult] = useState(null);

  // Common VAT rates for different countries
  const vatRates = [
    { value: '0', label: '0% (Zero-rated)' },
    { value: '5', label: '5% (Reduced rate)' },
    { value: '10', label: '10%' },
    { value: '13', label: '13% (Nepal Standard)' },
    { value: '15', label: '15%' },
    { value: '20', label: '20% (UK Standard)' },
    { value: '21', label: '21% (EU Standard)' },
    { value: '25', label: '25% (Nordic)' },
  ];

  useEffect(() => {
    if (amount && vatRate) {
      calculateVAT();
    }
  }, [amount, vatRate, calculationType]);

  const calculateVAT = () => {
    const numAmount = parseFloat(amount);
    const numVatRate = parseFloat(vatRate);

    if (isNaN(numAmount) || isNaN(numVatRate)) {
      setResult(null);
      return;
    }

    let vatAmount, totalAmount, netAmount;

    if (calculationType === 'add') {
      // Adding VAT to net amount
      netAmount = numAmount;
      vatAmount = (numAmount * numVatRate) / 100;
      totalAmount = numAmount + vatAmount;
    } else {
      // Removing VAT from gross amount
      totalAmount = numAmount;
      netAmount = numAmount / (1 + numVatRate / 100);
      vatAmount = totalAmount - netAmount;
    }

    setResult({
      netAmount: netAmount.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      vatRate: numVatRate
    });
  };

  const clearCalculation = () => {
    setAmount('');
    setResult(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-xl shadow-2xl ${
        isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } transition-colors duration-300`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        } flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">VAT Calculator</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Calculation Type */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Calculation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCalculationType('add')}
                className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center space-x-2 ${
                  calculationType === 'add'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : isDark
                      ? 'border-gray-600 hover:border-gray-500 text-gray-300'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add VAT</span>
              </button>
              <button
                onClick={() => setCalculationType('remove')}
                className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center space-x-2 ${
                  calculationType === 'remove'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : isDark
                      ? 'border-gray-600 hover:border-gray-500 text-gray-300'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                }`}
              >
                <Minus className="h-4 w-4" />
                <span className="text-sm font-medium">Remove VAT</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {calculationType === 'add' ? 'Net Amount (excluding VAT)' : 'Gross Amount (including VAT)'}
            </label>
            <div className="relative">
              <DollarSign className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* VAT Rate */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              VAT Rate
            </label>
            <div className="relative">
              <Percent className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <select
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors appearance-none ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
              >
                {vatRates.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className={`p-4 rounded-lg ${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            } space-y-3`}>
              <div className="flex items-center space-x-2 mb-3">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-500">Calculation Results</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Net Amount:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(result.netAmount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    VAT ({result.vatRate}%):
                  </span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(result.vatAmount)}
                  </span>
                </div>
                
                <div className={`flex justify-between items-center pt-2 border-t ${
                  isDark ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <span className="font-medium">
                    Total Amount:
                  </span>
                  <span className="font-bold text-lg">
                    {formatCurrency(result.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={clearCalculation}
              className={`flex-1 py-3 px-4 rounded-lg border transition-colors ${
                isDark
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VATCalculator;