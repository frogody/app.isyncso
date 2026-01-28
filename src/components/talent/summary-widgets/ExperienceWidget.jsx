import React from "react";
import { Briefcase, TrendingUp, Building2, Calendar, ArrowUpRight } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * ExperienceWidget - Displays career trajectory metrics
 */
const StatCard = ({ icon: Icon, label, value, color = "zinc" }) => {
  if (value == null) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-700/30 rounded-lg">
      <div className={`p-2 rounded-lg bg-${color}-500/10`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
};

const ExperienceWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const yearsExp = candidate?.years_of_experience;
  const yearsAtCompany = candidate?.years_at_company;
  const promotions = candidate?.times_promoted;
  const jobChanges = candidate?.times_company_hopped;
  const currentTitle = candidate?.current_title || candidate?.job_title;
  const currentCompany = candidate?.current_company || candidate?.company_name;

  const hasData = yearsExp || yearsAtCompany || promotions != null || jobChanges != null || currentTitle || currentCompany;

  return (
    <WidgetWrapper
      title="Experience"
      icon={Briefcase}
      iconColor="text-blue-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-4">
        {/* Current Role */}
        {(currentTitle || currentCompany) && (
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-blue-400/70 uppercase tracking-wider mb-1">Current Position</p>
            {currentTitle && (
              <p className="text-base font-semibold text-white">{currentTitle}</p>
            )}
            {currentCompany && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-400">
                <Building2 className="w-3.5 h-3.5" />
                {currentCompany}
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Calendar}
            label="Years Experience"
            value={yearsExp ? `${yearsExp}y` : null}
            color="purple"
          />
          <StatCard
            icon={Building2}
            label="Tenure"
            value={yearsAtCompany ? `${yearsAtCompany}y` : null}
            color="blue"
          />
          <StatCard
            icon={ArrowUpRight}
            label="Promotions"
            value={promotions}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Job Changes"
            value={jobChanges}
            color="amber"
          />
        </div>

        {/* Career Trajectory Note */}
        {candidate?.career_trajectory && (
          <div className="pt-3 border-t border-zinc-700/30">
            <p className="text-xs text-zinc-500 mb-1">Career Path</p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {candidate.career_trajectory}
            </p>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default ExperienceWidget;
