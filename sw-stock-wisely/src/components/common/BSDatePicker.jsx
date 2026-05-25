import React, { useState, useEffect, useRef } from 'react';
import NepaliDate from 'nepali-date-converter';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const BSDatePicker = ({ value, onChange, placeholder, isDark, separator = '/' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new NepaliDate());
  const containerRef = useRef(null);

  // Initialize viewDate based on value
  useEffect(() => {
    if (value) {
      try {
        const cleanValue = value.replace(/\./g, '-').replace(/\//g, '-');
        const parsed = new NepaliDate(cleanValue);
        setViewDate(parsed);
      } catch (e) {
        // Fallback to today
      }
    }
  }, [value, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const years = [];
  const currentYear = new NepaliDate().getYear();
  for (let y = currentYear - 10; y <= currentYear + 5; y++) {
    years.push(y);
  }

  const months = [
    'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ];

  const getMonthDays = (year, month) => {
    // nepali-date-converter handles 0 as the last day of the previous month
    // so month + 1 and day 0 gives the last day of 'month'
    try {
      const lastDay = new NepaliDate(year, month + 1, 0);
      return lastDay.getDate();
    } catch (e) {
      return 30; // Fallback
    }
  };

  const firstDayOfMonth = new NepaliDate(viewDate.getYear(), viewDate.getMonth(), 1).getDay();
  const monthDays = getMonthDays(viewDate.getYear(), viewDate.getMonth());

  const handleDateSelect = (day) => {
    const selected = new NepaliDate(viewDate.getYear(), viewDate.getMonth(), day);
    onChange(selected.format('YYYY' + separator + 'MM' + separator + 'DD'));
    setIsOpen(false);
  };

  const changeMonth = (delta) => {
    let newMonth = viewDate.getMonth() + delta;
    let newYear = viewDate.getYear();
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setViewDate(new NepaliDate(newYear, newMonth, 1));
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          className={`w-36 pl-10 pr-3 py-2 border rounded-lg text-sm transition-all ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-indigo-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-600'
          }`}
        />
        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 p-4 rounded-xl shadow-2xl border w-72 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              <select 
                value={viewDate.getMonth()} 
                onChange={(e) => setViewDate(new NepaliDate(viewDate.getYear(), parseInt(e.target.value), 1))}
                className="bg-transparent font-bold text-sm outline-none cursor-pointer"
              >
                {months.map((m, i) => <option key={m} value={i} className="text-black">{m}</option>)}
              </select>
              <select 
                value={viewDate.getYear()} 
                onChange={(e) => setViewDate(new NepaliDate(parseInt(e.target.value), viewDate.getMonth(), 1))}
                className="bg-transparent font-bold text-sm outline-none cursor-pointer"
              >
                {Array.from({length: 100}, (_, i) => 2070 + i).map(y => (
                  <option key={y} value={y} className="text-black">{y}</option>
                ))}
              </select>
            </div>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: monthDays }).map((_, i) => {
              const day = i + 1;
              const isSelected = value && value.endsWith(day.toString().padStart(2, '0')) && 
                               value.includes(viewDate.getYear().toString()) && 
                               value.includes((viewDate.getMonth() + 1).toString().padStart(2, '0'));
              
              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className={`text-center py-2 text-sm rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold'
                      : isDark
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <button 
              onClick={() => {
                const today = new NepaliDate();
                onChange(today.format('YYYY' + separator + 'MM' + separator + 'DD'));
                setIsOpen(false);
              }}
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              Today
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-500 font-medium hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BSDatePicker;
