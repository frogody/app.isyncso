import React from "react";

export default function LoadingSpinner({ size = "lg", message = null }) {
  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-12 w-12 border-2",
    lg: "h-16 w-16 border-b-2"
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-yellow-500`}></div>
      {message && <p className="mt-4 text-gray-400 text-sm">{message}</p>}
    </div>
  );
}