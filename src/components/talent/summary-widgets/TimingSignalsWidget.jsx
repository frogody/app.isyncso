import React from "react";
import { Clock, AlertTriangle, Timer } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * TimingSignalsWidget - Compact display of timing signals
 */
const TimingSignalsWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const signals = candidate?.timing_signals || [];
  const hasData = signals.length > 0;

  const urgencyConfig = {
    high: { text: "text-red-400", dot: "bg-red-400" },
    medium: { text: "text-red-400", dot: "bg-red-400" },
    low: { text: "text-zinc-400", dot: "bg-zinc-400" },
  };

  // Show max 3 signals in compact view
  const displaySignals = signals.slice(0, 3);

  return (
    <WidgetWrapper
      title={`Timing (${signals.length})`}
      icon={Clock}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
      compact
    >
      <div className="space-y-2">
        {displaySignals.map((signal, index) => {
          const urgency = signal.urgency?.toLowerCase() || 'medium';
          const config = urgencyConfig[urgency] || urgencyConfig.medium;

          return (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
              <p className="text-xs text-zinc-300 truncate flex-1">
                {signal.trigger}
              </p>
              <span className={`text-[10px] font-medium ${config.text} flex-shrink-0`}>
                {urgency === 'high' ? 'Now' : urgency === 'medium' ? 'Soon' : 'Later'}
              </span>
            </div>
          );
        })}
        {signals.length > 3 && (
          <p className="text-[10px] text-zinc-500 pl-3.5">
            +{signals.length - 3} more signals
          </p>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default TimingSignalsWidget;
