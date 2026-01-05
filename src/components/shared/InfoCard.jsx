import React from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InfoCard({ title, children, learnMoreUrl, onDismiss, className = "" }) {
  return (
    <div className={`bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {title && <h4 className="font-semibold text-white mb-1">{title}</h4>}
          <p className="text-sm text-gray-300 leading-relaxed">{children}</p>
          {learnMoreUrl && (
            <a 
              href={learnMoreUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-400 hover:underline mt-2 inline-block"
            >
              Learn more →
            </a>
          )}
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-6 w-6 text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}