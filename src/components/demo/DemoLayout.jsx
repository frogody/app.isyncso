import React from 'react';
import DemoSidebar from './DemoSidebar';

export default function DemoLayout({ currentPage, children, voicePanel, onNavigate }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <DemoSidebar currentPage={currentPage} onNavigate={onNavigate} />
      </div>

      {/* Main content */}
      <main className="relative flex-1 overflow-auto">
        <div className="min-h-full pb-20 md:pb-0">
          {children}
        </div>

        {/* Voice panel — bottom sheet on mobile, floating sidebar on desktop */}
        {voicePanel && (
          <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 w-full md:w-80 z-50">
            {voicePanel}
          </div>
        )}
      </main>
    </div>
  );
}
