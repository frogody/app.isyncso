import React from "react";
import { Lightbulb, AlertCircle, TrendingUp } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * KeyInsightsWidget - Displays AI-generated insights about the candidate
 */
const KeyInsightsWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const insights = candidate?.key_insights || [];
  const painPoints = candidate?.company_pain_points || [];
  const lateralOpps = candidate?.lateral_opportunities || [];

  const hasData = insights.length > 0 || painPoints.length > 0 || lateralOpps.length > 0;

  const getInsightText = (insight) => {
    if (typeof insight === 'string') return insight;
    return insight?.text || insight?.insight || insight?.description || JSON.stringify(insight);
  };

  return (
    <WidgetWrapper
      title="AI Insights"
      icon={Lightbulb}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-4">
        {/* Key Insights */}
        {insights.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Key Insights</p>
            </div>
            <div className="space-y-2">
              {insights.slice(0, 5).map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10"
                >
                  <span className="flex-shrink-0 w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center text-[10px] font-medium text-red-400">
                    {index + 1}
                  </span>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {getInsightText(insight)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company Pain Points */}
        {painPoints.length > 0 && (
          <div className="pt-3 border-t border-zinc-700/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Employer Pain Points</p>
            </div>
            <div className="space-y-2">
              {painPoints.slice(0, 3).map((point, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-red-500/5 rounded-lg"
                >
                  <span className="text-red-400 text-sm">•</span>
                  <p className="text-sm text-zinc-400">
                    {typeof point === 'string' ? point : point?.point || point?.description || JSON.stringify(point)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lateral Opportunities */}
        {lateralOpps.length > 0 && (
          <div className="pt-3 border-t border-zinc-700/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Lateral Opportunities</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lateralOpps.slice(0, 5).map((opp, index) => {
                const oppText = typeof opp === 'string' ? opp : opp?.role || opp?.title || opp?.name || JSON.stringify(opp);
                return (
                  <span
                    key={index}
                    className="px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400 rounded-lg border border-red-500/20"
                  >
                    {oppText}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default KeyInsightsWidget;
