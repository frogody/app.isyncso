import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className = "", size = "default" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  return (
    <Loader2 className={`animate-spin text-cyan-400 ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingPage({ message = "Loading..." }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />
  );
}