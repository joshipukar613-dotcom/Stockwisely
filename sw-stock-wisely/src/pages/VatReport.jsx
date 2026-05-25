import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { reportsAPI } from '../api';
import NepaliDate from 'nepali-date-converter';
import ExcelJS from 'exceljs';
import BSDatePicker from '../components/common/BSDatePicker';
import { 
  FileText, 
  Download, 
  Calendar, 
  ChevronDown, 
  Search, 
  RefreshCw,
  Loader2,
  Table as TableIcon,
  ArrowRight
} from 'lucide-react';

const COMPANY_INFO = {
  name: 'ALFAZ MART PVT.LTD.',
  pan: '606798307',
  address: 'MAKALBAARI, SANO POOL',
  phone: '15134340'
};

const VatReport = () => {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();
  
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'purchase'
  const [period, setPeriod] = useState('Monthly');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState(null);

  // Helper for safe number formatting
  const formatNumber = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Initialize dates based on period
  useEffect(() => {
    setHasGenerated(false);
    setReportData([]);
    const now = new NepaliDate();
    let from, to;

    switch (period) {
      case 'Daily':
        from = now.format('YYYY/MM/DD');
        to = now.format('YYYY/MM/DD');
        break;
      case 'Weekly':
        // Sun to Sat
        const dayOfWeek = now.getDay(); // 0 is Sunday
        const sun = new NepaliDate(now.valueOf() - dayOfWeek * 24 * 60 * 60 * 1000);
        const sat = new NepaliDate(now.valueOf() + (6 - dayOfWeek) * 24 * 60 * 60 * 1000);
        from = sun.format('YYYY/MM/DD');
        to = sat.format('YYYY/MM/DD');
        break;
      case 'Monthly':
        // 1st to end of month
        const firstDay = new NepaliDate(now.getYear(), now.getMonth(), 1);
        // Using day 0 of next month to get last day of current month
        const lastDay = new NepaliDate(now.getYear(), now.getMonth() + 1, 0);
        from = firstDay.format('YYYY/MM/DD');
        to = lastDay.format('YYYY/MM/DD');
        break;
      case 'Yearly':
        // Baishakh 1 to Chaitra end
        // nepali-date-converter uses 0-indexed months (0 = Baisakh, 11 = Chaitra)
        from = new NepaliDate(now.getYear(), 0, 1).format('YYYY/MM/DD');
        // Day 0 of month 12 is the last day of month 11 (Chaitra)
        to = new NepaliDate(now.getYear(), 12, 0).format('YYYY/MM/DD');
        break;
      default:
        return;
    }

    // Apply dot separator for purchase if needed
    if (activeTab === 'purchase') {
      setFromDate(from.replace(/\//g, '.'));
      setToDate(to.replace(/\//g, '.'));
    } else {
      setFromDate(from);
      setToDate(to);
    }
  }, [period, activeTab]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setHasGenerated(true);
      setError(null);
      let res;
      if (activeTab === 'sales') {
        res = await reportsAPI.getSalesVatReport({ from: fromDate, to: toDate, period: period.toLowerCase() });
      } else {
        res = await reportsAPI.getPurchaseVatReport({ from: fromDate, to: toDate, period: period.toLowerCase() });
      }
      setReportData(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (activeTab === 'sales') {
      return {
        total: reportData.reduce((sum, r) => sum + (r.total_sales || 0), 0),
        nonTaxable: reportData.reduce((sum, r) => sum + (r.non_taxable || 0), 0),
        taxable: reportData.reduce((sum, r) => sum + (r.taxable_amt || 0), 0),
        vat: reportData.reduce((sum, r) => sum + (r.vat_amt || 0), 0),
        count: new Set(reportData.map(r => r.bill_no)).size
      };
    } else {
      return {
        total: reportData.reduce((sum, r) => sum + (r.total_purchase_amount || 0), 0),
        nonTaxable: reportData.reduce((sum, r) => sum + (r.exempted_purchase_amount || 0), 0),
        taxable: reportData.reduce((sum, r) => sum + (r.taxable_purchase || 0), 0),
        vat: reportData.reduce((sum, r) => sum + (r.vat || 0), 0),
        count: reportData.length
      };
    }
  }, [reportData, activeTab]);

  const handleExport = async () => {
    if (!reportData.length) return;
    try {
      setExporting(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(activeTab === 'sales' ? 'Sales VAT Register' : 'Purchase VAT Register');

      // Company Header (Rows 1-6)
      worksheet.mergeCells('A1:Q1');
      const companyNameCell = worksheet.getCell('A1');
      companyNameCell.value = COMPANY_INFO.name;
      companyNameCell.font = { bold: true, size: 14 };
      companyNameCell.alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:Q2');
      const panCell = worksheet.getCell('A2');
      panCell.value = `PAN: ${COMPANY_INFO.pan}`;
      panCell.alignment = { horizontal: 'center' };

      worksheet.mergeCells('A3:Q3');
      const addrCell = worksheet.getCell('A3');
      addrCell.value = COMPANY_INFO.address;
      addrCell.alignment = { horizontal: 'center' };

      worksheet.mergeCells('A4:Q4');
      const phoneCell = worksheet.getCell('A4');
      phoneCell.value = `Phone: ${COMPANY_INFO.phone}`;
      phoneCell.alignment = { horizontal: 'center' };

      worksheet.mergeCells('A5:Q5');
      const titleCell = worksheet.getCell('A5');
      titleCell.value = activeTab === 'sales' ? 'SALES VAT REGISTER' : 'PURCHASE VAT REGISTER';
      titleCell.font = { bold: true };
      titleCell.alignment = { horizontal: 'center' };

      worksheet.mergeCells('A6:Q6');
      const rangeCell = worksheet.getCell('A6');
      rangeCell.value = `${fromDate} TO ${toDate}`;
      rangeCell.alignment = { horizontal: 'center' };

      // Column Headers (Row 7)
      const headers = activeTab === 'sales' 
        ? ['Miti', 'BillNo', 'Buyers Name', 'Buyers PAN Number', 'Item Description', 'Quantity', 'UOM', 'Total Sales', 'Non Taxable Sales', 'Taxable Sales Amount', 'VAT Amount', 'Export Sales Amount', 'Export Country', 'Export#', 'Date', 'Store', 'Sequence']
        : ['Miti', 'Party Bill No.', 'Received No', 'Supplier', 'PAN', 'Item Description', 'Qty', 'UOM', 'Total Purchase Amount', 'Exempted Purchase Amount', 'Taxable Purchase', 'VAT', 'Purchase Import Value', 'Purchase Import TAX', 'Capital Goods Value', 'Capital Goods TAX'];

      const headerRow = worksheet.getRow(7);
      headerRow.values = headers;
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF00' } // Bright yellow as in user screenshot
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });

      // Data Rows
      reportData.forEach((item, idx) => {
        const rowData = activeTab === 'sales' 
          ? [
              item.miti, item.bill_no, item.buyer_name, item.buyer_pan, item.item_description, 
              item.qty, item.uom, item.total_sales, item.non_taxable, item.taxable_amt, 
              item.vat_amt, item.export, item.export_country, item.export_number, 
              item.date, item.store, item.seq
            ]
          : [
              item.miti, item.party_bill_no, item.received_no, item.supplier, item.pan, 
              item.item_description, item.qty, item.uom, item.total_purchase_amount, 
              item.exempted_purchase_amount, item.taxable_purchase, item.vat, 
              item.purchase_import_value, item.purchase_import_tax, 
              item.capital_goods_value, item.capital_goods_tax
            ];
        
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Alternating background
          if (idx % 2 !== 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F9F9F9' }
            };
          }

          // Number formatting
          const header = headers[colNumber - 1];
          if (['Qty', 'Total Sales', 'Non-Taxable', 'Taxable Amt', 'VAT Amt', 'Total Purchase Amount', 'Exempted Purchase Amount', 'Taxable Purchase', 'VAT'].includes(header)) {
            cell.numFmt = header === 'Qty' ? '#,##0.##' : '#,##0.00';
            cell.alignment = { horizontal: 'right' };
          } else {
            cell.alignment = { horizontal: 'left' };
          }
        });
      });

      // Grand Total Row
      const totalRowData = activeTab === 'sales'
        ? ['', '', `No of Bills: ${summary.count}`, '', 'GRAND TOTAL >>', '', '', summary.total, summary.nonTaxable, summary.taxable, summary.vat, 0, '', '', '', '', '']
        : ['', '', '', `No of Entries: ${summary.count}`, 'GRAND TOTAL >>', '', '', '', summary.total, summary.nonTaxable, summary.taxable, summary.vat, 0, 0, 0, 0];
      
      const totalRow = worksheet.addRow(totalRowData);
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E2EFDA' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        const header = headers[colNumber - 1];
        if (['Total Sales', 'Non-Taxable', 'Taxable Amt', 'VAT Amt', 'Total Purchase Amount', 'Exempted Purchase Amount', 'Taxable Purchase', 'VAT'].includes(header)) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });

      // Column Widths
      const colWidths = activeTab === 'sales'
        ? [14, 20, 22, 18, 40, 10, 8, 16, 18, 20, 16, 20, 15, 15, 14, 10, 10]
        : [14, 18, 18, 22, 14, 40, 8, 8, 22, 24, 18, 16, 22, 20, 20, 20];
      
      colWidths.forEach((w, i) => {
        worksheet.getColumn(i + 1).width = w;
      });

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const fileName = activeTab === 'sales' 
        ? `Sales_VAT_Register_${fromDate.replace(/\//g, '-')}_TO_${toDate.replace(/\//g, '-')}.xlsx`
        : `Purchase_VAT_Register_${fromDate.replace(/\./g, '-')}_TO_${toDate.replace(/\./g, '-')}.xlsx`;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export to Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''} pt-20 px-4 pb-8`}>
          <div className="max-w-7xl mx-auto mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="text-indigo-600" />
                  VAT Report
                </h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Generate IRD-compliant VAT registers for sales and purchases.
                </p>
              </div>
            </div>

            {/* Tabs & Controls */}
            <div className={`rounded-xl border p-4 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setActiveTab('sales')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      activeTab === 'sales' 
                        ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Sales VAT Register
                  </button>
                  <button
                    onClick={() => setActiveTab('purchase')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      activeTab === 'purchase' 
                        ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Purchase VAT Register
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className={`pl-10 pr-4 py-2 border rounded-lg appearance-none text-sm ${
                        isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Yearly</option>
                    </select>
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="flex items-center gap-2">
                    <BSDatePicker
                      value={fromDate}
                      onChange={setFromDate}
                      placeholder="From (BS)"
                      isDark={isDark}
                      separator={activeTab === 'purchase' ? '.' : '/'}
                    />
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <BSDatePicker
                      value={toDate}
                      onChange={setToDate}
                      placeholder="To (BS)"
                      isDark={isDark}
                      separator={activeTab === 'purchase' ? '.' : '/'}
                    />
                  </div>

                  <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Generate Report
                  </button>

                  <button
                    onClick={handleExport}
                    disabled={exporting || !reportData.length}
                    className="flex items-center px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-300"
                  >
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Export to Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Report Content */}
            {error && (
              <div className={`p-4 rounded-xl border mb-6 ${isDark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                {error}
              </div>
            )}

            {reportData.length > 0 ? (
              <>
                {/* Header */}
                <div className={`p-6 rounded-xl border mb-6 text-center relative ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h2 className="text-xl font-bold">{COMPANY_INFO.name}</h2>
                  <p className="text-sm">PAN: {COMPANY_INFO.pan}</p>
                  <p className="text-sm">{COMPANY_INFO.address} | Phone: {COMPANY_INFO.phone}</p>
                  <h3 className="text-lg font-bold mt-2 uppercase">
                    {activeTab === 'sales' ? 'SALES VAT REGISTER' : 'PURCHASE VAT REGISTER'}
                  </h3>
                  <p className="text-sm font-medium">{fromDate} TO {toDate}</p>
                  
                  <div className="absolute top-6 right-6 text-sm font-semibold">
                    {activeTab === 'sales' ? `No. of Bills: ${summary.count}` : `No. of Entries: ${summary.count}`}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: activeTab === 'sales' ? 'Total Sales' : 'Total Purchase', value: summary.total, color: 'text-blue-600' },
                    { label: activeTab === 'sales' ? 'Non-Taxable Amount' : 'Exempt Amount', value: summary.nonTaxable, color: 'text-orange-600' },
                    { label: activeTab === 'sales' ? 'Taxable Amount' : 'Taxable Purchase', value: summary.taxable, color: 'text-green-600' },
                    { label: activeTab === 'sales' ? 'VAT Collected' : 'VAT Paid', value: summary.vat, color: 'text-indigo-600' }
                  ].map((card, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <p className={`text-xs font-medium uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                      <p className={`text-xl font-bold ${card.color}`}>Rs. {card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className={`${isDark ? 'bg-gray-700' : 'bg-yellow-400'} text-black`}>
                          {(activeTab === 'sales' 
                            ? ['Miti', 'BillNo', 'Buyers Name', 'Buyers PAN Number', 'Item Description', 'Quantity', 'UOM', 'Total Sales', 'Non Taxable Sales', 'Taxable Sales Amount', 'VAT Amount', 'Export Sales Amount', 'Export Country', 'Export#', 'Date', 'Store', 'Sequence']
                            : ['Miti', 'Party Bill No.', 'Received No', 'Supplier', 'PAN', 'Item Description', 'Qty', 'UOM', 'Total Purchase Amount', 'Exempted Purchase Amount', 'Taxable Purchase', 'VAT', 'Imp Value', 'Imp TAX', 'Cap Goods', 'Cap TAX']
                          ).map(h => (
                            <th key={h} className="px-3 py-3 text-left border border-gray-200 dark:border-gray-600 font-bold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {reportData.map((item, idx) => (
                          <tr key={idx} className={isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                            {activeTab === 'sales' ? (
                              <>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.miti}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.bill_no}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.buyer_name}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.buyer_pan}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 min-w-[200px]">{item.item_description}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{item.qty}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{item.uom}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right font-medium">{formatNumber(item.total_sales)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{formatNumber(item.non_taxable)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{formatNumber(item.taxable_amt)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{formatNumber(item.vat_amt)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">0.00</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700"></td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700"></td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.date}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{item.store}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center">{item.seq}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.miti}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.party_bill_no}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.received_no}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.supplier}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{item.pan}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 min-w-[200px]">{item.item_description}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{item.qty}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{item.uom}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right font-medium">{formatNumber(item.total_purchase_amount)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{formatNumber(item.exempted_purchase_amount)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{formatNumber(item.taxable_purchase)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">{formatNumber(item.vat)}</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">0.00</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">0.00</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">0.00</td>
                                <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right">0</td>
                              </>
                            )}
                          </tr>
                        ))}
                        {/* Grand Total Row */}
                        <tr className={`font-bold ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          {activeTab === 'sales' ? (
                            <>
                              <td colSpan={2} className="px-3 py-3 border border-gray-200 dark:border-gray-600"></td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600">No of Bills: {summary.count}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600"></td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600">GRAND TOTAL {`>>`}</td>
                              <td colSpan={2} className="px-3 py-3 border border-gray-200 dark:border-gray-600"></td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.total)}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.nonTaxable)}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.taxable)}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.vat)}</td>
                              <td colSpan={6} className="px-3 py-3 border border-gray-200 dark:border-gray-600"></td>
                            </>
                          ) : (
                            <>
                              <td colSpan={3} className="px-3 py-3 border border-gray-200 dark:border-gray-600"></td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600">No of Entries: {summary.count}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600">GRAND TOTAL {`>>`}</td>
                              <td colSpan={3} className="px-3 py-3 border border-gray-200 dark:border-gray-600"></td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.total)}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.nonTaxable)}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.taxable)}</td>
                              <td className="px-3 py-3 border border-gray-200 dark:border-gray-600 text-right">{formatNumber(summary.vat)}</td>
                              <td colSpan={4} className="px-3 py-3 border border-gray-200 dark:border-gray-600"></td>
                            </>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className={`flex flex-col items-center justify-center py-20 rounded-xl border ${
                isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
              }`}>
                <TableIcon className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">
                  {!hasGenerated ? 'No report generated yet' : 'No records found'}
                </p>
                <p className="text-sm">
                  {!hasGenerated 
                    ? 'Select a period and click "Generate Report" to view data.' 
                    : 'Try selecting a different date range.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VatReport;
