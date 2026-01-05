import React from 'react';
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from 'lucide-react';

export function VisionStatusIndicator({ isActive, onToggle }) {
  return (
    <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${
      isActive 
        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
        : 'bg-gray-900/50 border-gray-700 text-gray-400'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
      <span className="text-sm font-medium">
        {isActive ? 'Tutor can see your screen' : 'Screen sharing off'}
      </span>
      <Button 
        onClick={onToggle} 
        variant="ghost" 
        size="sm"
        className="h-7 px-3 text-xs hover:bg-white/5"
      >
        {isActive ? (
          <>
            <EyeOff className="w-3 h-3 mr-1" />
            Stop
          </>
        ) : (
          <>
            <Eye className="w-3 h-3 mr-1" />
            Share
          </>
        )}
      </Button>
    </div>
  );
}