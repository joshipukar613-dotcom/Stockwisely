import React from 'react';
import { Bot, User } from 'lucide-react';

/**
 * Simple inline markdown renderer.
 * Supports: **bold**, \n (line breaks), • (bullet points).
 */
function renderSimpleMarkdown(text) {
  if (!text) return '';
  
  const lines = text.split('\n');
  
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    
    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {rendered}
      </React.Fragment>
    );
  });
}

function MessageBubble({ role, content, timestamp, isDark = false }) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex items-start space-x-4 mb-6 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 shadow-sm ${
        isUser
          ? 'bg-blue-600'
          : isDark ? 'bg-gray-700' : 'bg-indigo-600'
      }`}>
        {isUser 
          ? <User className="h-4 w-4 text-white" />
          : <Bot className="h-4 w-4 text-white" />
        }
      </div>
      
      {/* Message */}
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block text-left text-[15px] leading-relaxed max-w-[85%] ${
          isUser
            ? isDark ? 'text-gray-100' : 'text-gray-900'
            : isDark ? 'text-gray-200' : 'text-gray-800'
        }`}>
          {isUser ? content : renderSimpleMarkdown(content)}
        </div>
        <div className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
