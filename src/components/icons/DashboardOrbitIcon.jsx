import React from "react";

export default function DashboardOrbitIcon({ className = "w-6 h-6" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Orbit Rings */}
      <div className="absolute w-full h-full rounded-full border-t-[2px] border-l-[1px] border-yellow-400/40 blur-[1px] animate-spin" style={{ animationDuration: '3s' }} />
      <div className="absolute w-[75%] h-[75%] rounded-full border-b-[2px] border-r-[1px] border-yellow-600/40 blur-[1px] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2.5s' }} />
      
      {/* Core */}
      <div className="absolute w-[25%] h-[25%] bg-yellow-500/20 blur-sm rounded-full" />
      <div className="absolute w-[15%] h-[15%] bg-white/50 blur-[2px] rounded-full" />
    </div>
  );
}