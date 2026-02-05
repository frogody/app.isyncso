import React from "react";
import { BarChart3, Euro, Calendar, Award, TrendingUp, MapPin, Building2, GraduationCap } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * QuickStatsWidget - Compact stats row with key metrics
 */
const StatItem = ({ icon: Icon, label, value, color = "zinc" }) => {
  if (value == null && value !== 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-700/30 rounded-lg">
      <Icon className={`w-4 h-4 text-${color}-400`} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{value}</p>
        <p className="text-[9px] text-zinc-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
};

const QuickStatsWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const salary = candidate?.salary_range;
  const yearsExp = candidate?.years_of_experience;
  const tenure = candidate?.years_at_company;
  const promotions = candidate?.times_promoted;
  const skills = candidate?.skills?.length || 0;
  const location = candidate?.location || candidate?.location_city;
  const education = candidate?.education?.length || 0;
  const company = candidate?.current_company || candidate?.company_name;

  const hasData = salary || yearsExp || tenure || promotions != null || skills > 0 || location || education > 0 || company;

  const formatSalary = (value) => {
    if (!value) return null;
    if (typeof value === 'number') {
      return `\u20AC${(value / 1000).toFixed(0)}k`;
    }
    return value;
  };

  return (
    <WidgetWrapper
      title="Quick Stats"
      icon={BarChart3}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <StatItem
          icon={Euro}
          label="Salary"
          value={formatSalary(salary)}
          color="red"
        />
        <StatItem
          icon={Calendar}
          label="Experience"
          value={yearsExp ? `${yearsExp}y` : null}
          color="red"
        />
        <StatItem
          icon={Building2}
          label="Tenure"
          value={tenure ? `${tenure}y` : null}
          color="red"
        />
        <StatItem
          icon={TrendingUp}
          label="Promotions"
          value={promotions}
          color="red"
        />
        <StatItem
          icon={Award}
          label="Skills"
          value={skills > 0 ? skills : null}
          color="red"
        />
        <StatItem
          icon={MapPin}
          label="Location"
          value={location}
          color="red"
        />
        <StatItem
          icon={GraduationCap}
          label="Degrees"
          value={education > 0 ? education : null}
          color="red"
        />
        <StatItem
          icon={Building2}
          label="Company"
          value={company}
          color="red"
        />
      </div>
    </WidgetWrapper>
  );
};

export default QuickStatsWidget;
