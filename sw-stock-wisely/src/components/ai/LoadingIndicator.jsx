import React from 'react';

function LoadingIndicator() {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-[14px] text-[#1F2937]">
        <span className="inline-flex items-center space-x-1">
          <span className="inline-block animate-bounce" style={{ animationDelay: '0ms' }}>
            .
          </span>
          <span className="inline-block animate-bounce" style={{ animationDelay: '120ms' }}>
            .
          </span>
          <span className="inline-block animate-bounce" style={{ animationDelay: '240ms' }}>
            .
          </span>
        </span>
      </span>
    </div>
  );
}

export default LoadingIndicator;

