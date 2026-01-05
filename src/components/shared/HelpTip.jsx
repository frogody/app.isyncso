import React from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function HelpTip({ term, explanation, glossaryLink, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {term}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-4 h-4 text-gray-500 hover:text-cyan-400 cursor-help transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-gray-900 border-gray-700 text-white">
            <p className="text-sm">{explanation}</p>
            {glossaryLink && (
              <a 
                href={glossaryLink} 
                className="text-xs text-cyan-400 hover:underline mt-1 inline-block"
                onClick={(e) => e.stopPropagation()}
              >
                Learn more →
              </a>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}