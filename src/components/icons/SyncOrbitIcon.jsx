import React from "react";

export default function SyncOrbitIcon({ className = "w-6 h-6", isActive = false }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Orbit Rings */}
      <div className={`absolute w-full h-full rounded-full border-t-[2px] border-l-[1px] ${isActive ? 'border-red-400 blur-[2px]' : 'border-red-400/40 blur-[1px]'} animate-spin`} style={{ animationDuration: '4s' }} />
      <div className={`absolute w-[75%] h-[75%] rounded-full border-b-[2px] border-r-[1px] ${isActive ? 'border-red-500 blur-[2px]' : 'border-red-600/40 blur-[1px]'} animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
      
      {/* Core */}
      <div className={`absolute w-[25%] h-[25%] ${isActive ? 'bg-red-500/40' : 'bg-red-500/20'} blur-sm rounded-full`} />
      <div className={`absolute w-[15%] h-[15%] ${isActive ? 'bg-red-200/80' : 'bg-red-200/50'} blur-[2px] rounded-full`} />
    </div>
  );
}