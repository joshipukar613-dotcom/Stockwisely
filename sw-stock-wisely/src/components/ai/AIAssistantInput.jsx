import React from 'react';
import { Send } from 'lucide-react';

function AIAssistantInput({
  inputValue,
  setInputValue,
  onSend,
  isLoading,
  mode = 'data',
  isDark = false,
}) {
  const placeholder = mode === 'advice'
    ? 'Ask for business advice...'
    : 'Ask about sales, inventory, returns...';

  return (
    <div className={`flex items-center space-x-3 rounded-xl border px-4 py-3 ${
      isDark
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-300'
    } ${
      mode === 'advice'
        ? isDark ? 'focus-within:border-amber-500' : 'focus-within:border-amber-400'
        : isDark ? 'focus-within:border-blue-500' : 'focus-within:border-blue-400'
    } focus-within:ring-2 ${
      mode === 'advice' 
        ? 'focus-within:ring-amber-500/20' 
        : 'focus-within:ring-blue-500/20'
    } transition-all shadow-sm`}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        disabled={isLoading}
        className={`flex-1 py-1 bg-transparent outline-none text-base disabled:opacity-50 ${
          isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
        }`}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!inputValue.trim() || isLoading}
        className={`p-2.5 rounded-lg disabled:opacity-30 transition-all ${
          mode === 'advice'
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
        }`}
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}

export default AIAssistantInput;
