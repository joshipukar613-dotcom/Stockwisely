import React from 'react';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';
import AIChat from '../components/ai/AIChat';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';

function AIAssistant() {
  const { isDark } = useTheme();
  const { sidebarOpen } = useSidebar();

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      <Navbar />
      
      <div className="flex">
        <Sidebar />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        } pt-20`}>
          {/* Full-height chat — no unnecessary panels */}
          <div className="h-[calc(100vh-5rem)]">
            <AIChat isDark={isDark} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AIAssistant;