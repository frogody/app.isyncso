import React, { useState } from "react";
import { AlertTriangle, Target, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

const PainPointsWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const [showAllPainPoints, setShowAllPainPoints] = useState(false);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  
  const painPoints = candidate?.company_pain_points || [];
  const lateralOpps = candidate?.lateral_opportunities || [];
  
  const displayPainPoints = showAllPainPoints ? painPoints : painPoints.slice(0, 2);
  const displayOpps = showAllOpportunities ? lateralOpps : lateralOpps.slice(0, 3);
  
  const hasData = painPoints.length > 0 || lateralOpps.length > 0;
  
  const formatOpp = (opp) => {
    if (typeof opp === 'string') return opp;
    return opp.company || opp.role || opp.name || JSON.stringify(opp);
  };
  
  return (
    <WidgetWrapper
      title="Pain Points & Opportunities"
      icon={Target}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-4">
        {/* Pain Points */}
        {painPoints.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              Company Pain Points
            </p>
            <ul className="space-y-2">
              {displayPainPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <span className="text-zinc-300">{point}</span>
                </li>
              ))}
            </ul>
            {painPoints.length > 2 && (
              <button
                onClick={() => setShowAllPainPoints(!showAllPainPoints)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-2 transition-colors"
              >
                {showAllPainPoints ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showAllPainPoints ? 'Show Less' : "Show " + (painPoints.length - 2) + " More"}
              </button>
            )}
          </div>
        )}
        
        {/* Lateral Opportunities */}
        {lateralOpps.length > 0 && (
          <div className={painPoints.length > 0 ? "pt-3 border-t border-zinc-700/30" : ""}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-red-400" />
              Competitor Companies
            </p>
            <div className="flex flex-wrap gap-2">
              {displayOpps.map((opp, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-red-500/10 text-red-300 rounded-lg text-xs border border-red-500/20"
                >
                  {formatOpp(opp)}
                </span>
              ))}
            </div>
            {lateralOpps.length > 3 && (
              <button
                onClick={() => setShowAllOpportunities(!showAllOpportunities)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-2 transition-colors"
              >
                {showAllOpportunities ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showAllOpportunities ? 'Show Less' : "Show " + (lateralOpps.length - 3) + " More"}
              </button>
            )}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default PainPointsWidget;
