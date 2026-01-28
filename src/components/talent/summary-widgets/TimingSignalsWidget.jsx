import React from "react";
import { Clock, AlertTriangle } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * TimingSignalsWidget - Displays candidate timing signals with urgency indicators
 */
const TimingSignalsWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const signals = candidate?.timing_signals || [];
  const hasData = signals.length > 0;

  const urgencyConfig = {
    high: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", label: "HIGH" },
    medium: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", label: "MED" },
    low: { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30", label: "LOW" },
  };

  return (
    <WidgetWrapper
      title="Timing Signals"
      icon={Clock}
      iconColor="text-amber-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-3">
        {signals.map((signal, index) => {
          const urgency = signal.urgency?.toLowerCase() || 'medium';
          const config = urgencyConfig[urgency] || urgencyConfig.medium;

          return (
            <div
              key={index}
              className={`p-3 rounded-lg ${config.bg} border ${config.border}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  {urgency === 'high' && (
                    <AlertTriangle className={`w-4 h-4 ${config.text}`} />
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${config.bg} ${config.text} border ${config.border}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${config.text}`}>
                    {signal.trigger}
                  </p>
                  {signal.explanation && (
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {signal.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
};

export default TimingSignalsWidget;
