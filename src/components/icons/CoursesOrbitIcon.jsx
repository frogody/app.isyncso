import React from "react";

export default function CoursesOrbitIcon({ className = "w-6 h-6", isActive = false }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Orbit Rings */}
      <div className={`absolute w-full h-full rounded-full border-t-[2px] border-l-[1px] ${isActive ? 'border-cyan-400 blur-[2px]' : 'border-cyan-400/40 blur-[1px]'} animate-spin`} style={{ animationDuration: '3.5s' }} />
      <div className={`absolute w-[75%] h-[75%] rounded-full border-b-[2px] border-r-[1px] ${isActive ? 'border-cyan-500 blur-[2px]' : 'border-cyan-600/40 blur-[1px]'} animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '2.8s' }} />
      
      {/* Core */}
      <div className={`absolute w-[25%] h-[25%] ${isActive ? 'bg-cyan-500/40' : 'bg-cyan-500/20'} blur-sm rounded-full`} />
      <div className={`absolute w-[15%] h-[15%] ${isActive ? 'bg-cyan-200/80' : 'bg-cyan-200/50'} blur-[2px] rounded-full`} />
    </div>
  );
}