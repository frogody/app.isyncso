import React, { useState } from "react";
import { Award, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * SkillsWidget - Displays candidate skills and inferred skills
 */
const SkillsWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const [showAll, setShowAll] = useState(false);

  const skills = candidate?.skills || [];
  const inferredSkills = candidate?.inferred_skills || [];
  const hasData = skills.length > 0 || inferredSkills.length > 0;

  const getSkillName = (skill) => {
    if (typeof skill === 'object') {
      return skill?.name || skill?.skill || JSON.stringify(skill);
    }
    return String(skill);
  };

  const displayLimit = 12;
  const visibleSkills = showAll ? skills : skills.slice(0, displayLimit);
  const hasMore = skills.length > displayLimit;

  return (
    <WidgetWrapper
      title={`Skills ${skills.length > 0 ? `(${skills.length})` : ''}`}
      icon={Award}
      iconColor="text-purple-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
      compact
    >
      <div className="space-y-4">
        {/* Primary Skills */}
        {skills.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Listed Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleSkills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400 rounded-lg border border-red-500/20"
                >
                  {getSkillName(skill)}
                </span>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="mt-3 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                {showAll ? (
                  <>Show Less <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Show {skills.length - displayLimit} More <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Inferred Skills */}
        {inferredSkills.length > 0 && (
          <div className="pt-3 border-t border-zinc-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                AI-Inferred Skills
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {inferredSkills.slice(0, 8).map((skill, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20"
                >
                  {getSkillName(skill)}
                </span>
              ))}
              {inferredSkills.length > 8 && (
                <span className="px-2.5 py-1 text-xs text-zinc-500">
                  +{inferredSkills.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default SkillsWidget;
