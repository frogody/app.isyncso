import React from "react";

export default function YellowOrbitIcon({ className = "w-6 h-6", color = "yellow" }) {
  const isBlack = color === "black";
  
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Ring */}
      <div className={`absolute w-full h-full rounded-full border-t-[2px] border-l-[1px] ${isBlack ? 'border-black/80' : 'border-yellow-300/80'} blur-[0.5px] animate-spin`} style={{ animationDuration: '3s' }} />
      
      {/* Middle Ring */}
      <div className={`absolute w-[70%] h-[70%] rounded-full border-b-[2px] border-r-[1px] ${isBlack ? 'border-gray-900/80' : 'border-amber-400/80'} blur-[0.5px] animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
      
      {/* Inner Glow */}
      <div className={`absolute w-[40%] h-[40%] ${isBlack ? 'bg-black/10' : 'bg-yellow-400/30'} blur-sm rounded-full animate-pulse`} />
      
      {/* Core */}
      <div className={`absolute w-[15%] h-[15%] ${isBlack ? 'bg-black/60' : 'bg-white/80'} blur-[1px] rounded-full`} />
    </div>
  );
}