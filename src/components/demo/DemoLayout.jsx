import React from 'react';
import DemoSidebar from './DemoSidebar';

export default function DemoLayout({ currentPage, children, voicePanel }) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <DemoSidebar currentPage={currentPage} />
      <div className="flex-1 flex">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
        {voicePanel && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-950 shrink-0">
            {voicePanel}
          </div>
        )}
      </div>
    </div>
  );
}
