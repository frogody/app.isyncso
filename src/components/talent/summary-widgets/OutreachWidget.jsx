import React from "react";
import { Target, Lightbulb, MessageSquare } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * OutreachWidget - Displays best outreach angle and hooks
 */
const OutreachWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const hasAngle = candidate?.best_outreach_angle;
  const hooks = candidate?.outreach_hooks || [];
  const hasData = hasAngle || hooks.length > 0;

  return (
    <WidgetWrapper
      title="Outreach Strategy"
      icon={Target}
      iconColor="text-cyan-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-4">
        {/* Best Outreach Angle */}
        {hasAngle && (
          <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Best Approach
              </span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {candidate.best_outreach_angle}
            </p>
          </div>
        )}

        {/* Outreach Hooks */}
        {hooks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Conversation Starters
              </span>
            </div>
            <div className="space-y-2">
              {hooks.map((hook, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-zinc-700/30 rounded-lg border border-zinc-700/50 hover:border-purple-500/30 transition-colors"
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-medium text-purple-400">
                    {index + 1}
                  </span>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {typeof hook === 'string' ? hook : hook.message || hook.text || JSON.stringify(hook)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default OutreachWidget;
