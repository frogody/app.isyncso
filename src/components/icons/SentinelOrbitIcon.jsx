import React from "react";

export default function SentinelOrbitIcon({ className = "w-6 h-6", isActive = false }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Orbit Rings */}
      <div className={`absolute w-full h-full rounded-full border-t-[2px] border-l-[1px] ${isActive ? 'border-[#86EFAC] blur-[2px]' : 'border-[#86EFAC]/50 blur-[1px]'} animate-spin`} style={{ animationDuration: '4s' }} />
      <div className={`absolute w-[75%] h-[75%] rounded-full border-b-[2px] border-r-[1px] ${isActive ? 'border-[#86EFAC] blur-[2px]' : 'border-[#6EE7B7]/50 blur-[1px]'} animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
      
      {/* Core - brighter when active */}
      {isActive && (
        <>
          <div className="absolute w-[25%] h-[25%] bg-[#86EFAC]/40 blur-sm rounded-full" />
          <div className="absolute w-[15%] h-[15%] bg-[#A7F3D0]/80 blur-[2px] rounded-full" />
        </>
      )}
    </div>
  );
}