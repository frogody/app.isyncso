import React from 'react';
import DemoSidebar from './DemoSidebar';

export default function DemoLayout({ currentPage, children, voicePanel }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar — matches real app: 72px/80px icon-only */}
      <DemoSidebar currentPage={currentPage} />

      {/* Main content — matches real app structure */}
      <main className="relative flex-1 overflow-auto">
        <div className="min-h-full">
          {children}
        </div>

        {/* Voice panel — floating overlay in bottom-right corner */}
        {voicePanel && (
          <div className="fixed bottom-6 right-6 w-80 z-50">
            {voicePanel}
          </div>
        )}
      </main>
    </div>
  );
}
