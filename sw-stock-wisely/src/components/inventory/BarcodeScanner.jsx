import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Camera, 
  QrCode, 
  Package, 
  Search, 
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Download,
  Upload,
  Settings
} from 'lucide-react';

function BarcodeScanner({ onProductFound, onClose }) {
  const { isDark } = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Mock product database for demonstration
  const mockProducts = {
    '1234567890123': { name: 'Samsung Galaxy S24', sku: 'SGS24-001', price: 125000, category: 'Electronics' },
    '2345678901234': { name: 'iPhone 15 Pro', sku: 'IP15P-001', price: 185000, category: 'Electronics' },
    '3456789012345': { name: 'MacBook Air M2', sku: 'MBA-M2-001', price: 165000, category: 'Electronics' },
    '4567890123456': { name: 'Nike Air Max', sku: 'NAM-001', price: 15000, category: 'Sports' },
    '5678901234567': { name: 'Organic Milk 1L', sku: 'MILK-ORG-001', price: 120, category: 'Food & Beverages' },
    '6789012345678': { name: 'Vitamin C Tablets', sku: 'VIT-C-001', price: 800, category: 'Health & Beauty' }
  };

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Simulate barcode detection (in real implementation, you'd use a barcode scanning library)
      setTimeout(() => {
        simulateBarcodeDetection();
      }, 2000);
      
    } catch (err) {
      setError('Camera access denied or not available. Please check your camera permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScannedCode('');
    setScanResult(null);
  };

  const simulateBarcodeDetection = () => {
    // Simulate scanning a random barcode from our mock database
    const barcodes = Object.keys(mockProducts);
    const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)];
    
    setScannedCode(randomBarcode);
    const product = mockProducts[randomBarcode];
    setScanResult(product);
    
    if (onProductFound) {
      onProductFound(product, randomBarcode);
    }
    
    stopScanning();
  };

  const handleManualSearch = () => {
    if (manualInput.trim()) {
      const product = mockProducts[manualInput.trim()];
      if (product) {
        setScanResult(product);
        setScannedCode(manualInput.trim());
        if (onProductFound) {
          onProductFound(product, manualInput.trim());
        }
      } else {
        setError('Product not found. Please check the barcode or try scanning again.');
      }
    }
  };

  const handleRetry = () => {
    setError('');
    setScanResult(null);
    setScannedCode('');
    setManualInput('');
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 ${isDark ? 'bg-gray-900' : 'bg-white'} flex flex-col`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <QrCode className="h-6 w-6 text-indigo-600" />
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Barcode Scanner
          </h2>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Camera View */}
        <div className="flex-1 relative bg-black">
          {isScanning ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-64 h-32 border-2 border-indigo-500 rounded-lg">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                  </div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium">
                    Position barcode within the frame
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Ready to Scan
                </p>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Click "Start Scanning" to begin
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          {!isScanning && !scanResult && (
            <div className="space-y-4">
              <button
                onClick={startScanning}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Camera className="h-5 w-5 mr-2" />
                Start Scanning
              </button>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Or enter barcode manually..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <button
                  onClick={handleManualSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                  Search
                </button>
              </div>
            </div>
          )}

          {isScanning && (
            <button
              onClick={stopScanning}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <X className="h-5 w-5 mr-2" />
              Stop Scanning
            </button>
          )}

          {scanResult && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center space-x-3 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className={`font-semibold ${isDark ? 'text-green-300' : 'text-green-900'}`}>
                    Product Found!
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Name:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {scanResult.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SKU:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {scanResult.sku}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {scanResult.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Price:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rs. {scanResult.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Barcode:</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {scannedCode}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Scan Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BarcodeScanner;
