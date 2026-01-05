import React from "react";
import { AlertTriangle, XCircle, Info } from "lucide-react";

export function ErrorMessage({ 
  message, 
  type = "error",
  className = "" 
}) {
  const styles = {
    error: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-300",
      icon: XCircle,
      iconColor: "text-red-400"
    },
    warning: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      text: "text-yellow-300",
      icon: AlertTriangle,
      iconColor: "text-yellow-400"
    },
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      text: "text-blue-300",
      icon: Info,
      iconColor: "text-blue-400"
    }
  };

  const config = styles[type] || styles.error;
  const Icon = config.icon;

  if (!message) return null;

  return (
    <div className={`p-4 rounded-lg ${config.bg} border ${config.border} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <p className={`text-sm ${config.text}`}>{message}</p>
      </div>
    </div>
  );
}

export default ErrorMessage;