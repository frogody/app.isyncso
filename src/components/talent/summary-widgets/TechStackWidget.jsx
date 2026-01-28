import React, { useState } from "react";
import { Cpu, ChevronDown, ChevronUp } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

// Extract tech name from various data formats
const getTechName = (tech) => {
  if (!tech) return null;
  if (typeof tech === 'string') return tech;
  if (typeof tech === 'object') {
    return tech.name || tech.title || tech.technology || tech.label || null;
  }
  return String(tech);
};

// Flatten and extract tech items from nested structures
const flattenTechStack = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.flatMap(item => flattenTechStack(item));
  }
  if (typeof data === 'object') {
    // If it has a name/title property, treat it as a single tech item
    if (data.name || data.title || data.technology || data.label) {
      return [data];
    }
    // Otherwise flatten all values (handles {frontend: [...], backend: [...]})
    return Object.values(data).flatMap(v => flattenTechStack(v));
  }
  // Primitive value (string, number)
  return [data];
};

const TechStackWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const [expanded, setExpanded] = useState(false);

  const companyIntel = candidate?.company_intelligence || {};

  // Get tech stack from various possible sources
  const rawTechStack = companyIntel.tech_stack ||
                       companyIntel.technologies ||
                       companyIntel.technology_stack;

  // Flatten and filter out null/undefined values
  const techArray = flattenTechStack(rawTechStack).filter(Boolean);
  
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
            const techName = getTechName(tech);
            if (!techName) return null;
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
