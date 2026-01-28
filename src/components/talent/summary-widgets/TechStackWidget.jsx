import React, { useState } from "react";
import { Cpu, ChevronDown, ChevronUp } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

const TechStackWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const [expanded, setExpanded] = useState(false);
  
  const companyIntel = candidate?.company_intelligence || {};
  
  // Get tech stack from various possible sources
  const rawTechStack = companyIntel.tech_stack ||
                       companyIntel.technologies ||
                       companyIntel.technology_stack;

  // Safely convert to array regardless of input type
  const techArray = Array.isArray(rawTechStack) ? rawTechStack :
                    (rawTechStack && typeof rawTechStack === 'object') ?
                      Object.values(rawTechStack).flat().filter(Boolean) : [];
  
  // Take relevant subset for the role (first 12, or all if expanded)
  const displayTech = expanded ? techArray : techArray.slice(0, 12);
  const hasMore = techArray.length > 12;
  
  const hasData = techArray.length > 0;
  
  const titleText = "Tech Stack" + (techArray.length > 0 ? " (" + techArray.length + ")" : "");
  const moreText = "Show " + (techArray.length - 12) + " More";
  
  return (
    <WidgetWrapper
      title={titleText}
      icon={Cpu}
      iconColor="text-cyan-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {displayTech.map((tech, i) => {
            const techName = typeof tech === 'string' ? tech : tech.name || tech.technology;
            return (
              <span
                key={i}
                className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 rounded-lg text-xs border border-cyan-500/20"
              >
                {techName}
              </span>
            );
          })}
        </div>
        
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Show Less' : moreText}
          </button>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default TechStackWidget;
