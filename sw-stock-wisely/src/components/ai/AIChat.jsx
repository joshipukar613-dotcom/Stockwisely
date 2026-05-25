import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Database, Lightbulb } from 'lucide-react';

import { aiAssistantAPI } from '../../api';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import AIAssistantInput from './AIAssistantInput';

const DATA_QUICK_ACTIONS = [
  { actionType: 'SALES_TODAY',          label: "Today's sales",    question: "Show today's sales" },
  { actionType: 'SALES_WEEK',           label: 'Weekly sales',     question: 'Weekly sales report' },
  { actionType: 'SALES_RETURN_TODAY',   label: "Today's returns",  question: "Show today's returns" },
  { actionType: 'TOP_PRODUCTS',         label: 'Best sellers',     question: 'Top selling products' },
  { actionType: 'LOW_STOCK',            label: 'Low stock',        question: 'What items are low on stock?' },
  { actionType: 'SALES_MONTH_COMPARISON', label: 'Month comparison', question: 'Compare this month vs last month' },
];

const ADVICE_QUICK_ACTIONS = [
  { actionType: 'ADVICE', label: 'Increase sales',    question: 'How can I increase my sales this month?' },
  { actionType: 'ADVICE', label: 'Reduce returns',    question: 'How can I reduce sales returns?' },
  { actionType: 'ADVICE', label: 'Product focus',     question: 'What products should I focus on selling more?' },
  { actionType: 'ADVICE', label: 'Stock optimization',question: 'How can I optimize my inventory to reduce costs?' },
  { actionType: 'ADVICE', label: 'Business health',   question: 'How is my business doing overall? Any concerns?' },
  { actionType: 'ADVICE', label: 'Growth strategy',   question: 'What strategies can help grow my business?' },
];

// Minimum ms between two sends — prevents accidental double-clicks
const SEND_DEBOUNCE_MS = 800;

// Retry config for 429 responses
const MAX_CLIENT_RETRIES = 2;
const RETRY_DELAY_MS = 3000; // 3 s between retries on 429

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function AIChat({ isDark }) {
  const [messages, setMessages]     = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [mode, setMode]             = useState('data'); // 'data' | 'advice'
  const messagesEndRef              = useRef(null);

  // Tracks the exact text of the in-flight request so we can deduplicate
  const inFlightQuestionRef = useRef(null);
  // Timestamp of last successful send
  const lastSendAtRef       = useRef(0);

  const quickActions = mode === 'data' ? DATA_QUICK_ACTIONS : ADVICE_QUICK_ACTIONS;
  const hasMessages  = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
  };

  /**
   * sendMessage
   *  - Debounces rapid double-clicks (< SEND_DEBOUNCE_MS apart)
   *  - Prevents sending the exact same question while it's still in flight
   *  - Retries automatically on 429 (up to MAX_CLIENT_RETRIES times)
   */
  const sendMessage = useCallback(async (messageText) => {
    const q = (messageText ?? inputValue).trim();
    if (!q) return;

    // ── Debounce ────────────────────────────────────────────────────────────
    const now = Date.now();
    if (now - lastSendAtRef.current < SEND_DEBOUNCE_MS) return;

    // ── Prevent duplicate in-flight ─────────────────────────────────────────
    if (isLoading || inFlightQuestionRef.current === q) return;

    lastSendAtRef.current     = now;
    inFlightQuestionRef.current = q;

    const userMsg = {
      id:        Date.now(),
      role:      'user',
      content:   q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg].slice(-50));
    setInputValue('');
    setIsLoading(true);

    const apiCall = mode === 'advice'
      ? () => aiAssistantAPI.askAdvice({ question: q })
      : () => aiAssistantAPI.ask({ question: q });

    let attempt  = 0;
    let answered = false;

    while (attempt <= MAX_CLIENT_RETRIES && !answered) {
      try {
        const res    = await apiCall();
        const answer = res?.data?.answer || "That information isn't available.";

        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', content: answer, timestamp: new Date() },
        ].slice(-50));

        answered = true;
      } catch (err) {
        const status       = err?.response?.status;
        const serverAnswer = err?.response?.data?.answer;

        if (status === 429 && attempt < MAX_CLIENT_RETRIES) {
          // Rate-limited — wait and retry
          attempt++;
          const waitMs = RETRY_DELAY_MS * attempt; // 3 s, 6 s
          console.warn(`[AIChat] 429 received, retrying in ${waitMs} ms (attempt ${attempt}/${MAX_CLIENT_RETRIES})`);

          // Show a temporary "please wait" message that gets replaced on success
          setMessages((prev) => [
            ...prev,
            {
              id:        Date.now() + 2,
              role:      'assistant',
              content:   `⏳ The AI is busy. Retrying automatically in ${waitMs / 1000} second(s)…`,
              temporary: true,
              timestamp: new Date(),
            },
          ].slice(-50));

          await sleep(waitMs);

          // Remove the temporary "retrying" message before the next attempt
          setMessages((prev) => prev.filter((m) => !m.temporary));
          continue;
        }

        // Non-retriable or out of retries
        let answer = serverAnswer || "I'm having trouble connecting. Please try again.";

        if (status === 429) {
          answer = mode === 'advice'
            ? "⚠️ You've reached the advice request limit. Please wait a minute before asking again."
            : "⚠️ Too many requests. Please wait a moment before sending another question.";
        }

        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', content: answer, timestamp: new Date() },
        ].slice(-50));

        answered = true; // stop loop
      }
    }

    setIsLoading(false);
    inFlightQuestionRef.current = null;
  }, [inputValue, isLoading, mode]);

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-gray-900' : 'bg-white'}`}>

      {/* ── Empty state: centered welcome ── */}
      {!hasMessages && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-start pt-12 px-6">
          {/* StockWisely Logo */}
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
            <span className="text-2xl font-bold text-white tracking-tight">SW</span>
          </div>

          <h1 className={`text-5xl font-semibold mb-4 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Stock Wisely AI
          </h1>

          <p className={`text-lg mb-10 max-w-md text-center leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Ask about your sales, inventory, and returns — or switch to advice mode for business suggestions.
          </p>

          {/* Quick action chips */}
          <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(action.question)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 hover:text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                timestamp={m.timestamp}
                isDark={isDark}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className={`py-3 px-4 rounded-2xl ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                  <LoadingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ── Bottom Input Area ── */}
      <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4">

          {/* Mode toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className={`flex rounded-lg p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button
                type="button"
                onClick={() => handleModeChange('data')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'data'
                    ? isDark ? 'bg-gray-700 text-blue-400 shadow-sm' : 'bg-white text-blue-700 shadow-sm'
                    : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Database className="h-4 w-4" />
                <span>Ask Data</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('advice')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'advice'
                    ? isDark ? 'bg-gray-700 text-amber-400 shadow-sm' : 'bg-white text-amber-700 shadow-sm'
                    : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Lightbulb className="h-4 w-4" />
                <span>Get Advice</span>
              </button>
            </div>

            {hasMessages && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className={`text-sm px-3 py-1.5 rounded ${
                  isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Clear chat
              </button>
            )}
          </div>

          {/* Input */}
          <AIAssistantInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            isLoading={isLoading}
            onSend={() => sendMessage()}
            onQuickAction={(action) => sendMessage(action.question)}
            quickActions={[]}
            mode={mode}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
}

export default AIChat;