import React from "react";
import { Briefcase, Building2, Calendar } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.toLowerCase() === 'present') return 'Present';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

// Extract string value from field that might be object or string
const getStringValue = (value, fallback = '') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.name || value.title || value.text || value.value || fallback;
  }
  return String(value);
};

const WorkHistoryWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  // Check multiple possible data sources for work history
  const workHistory = Array.isArray(candidate?.work_history) && candidate.work_history.length > 0
    ? candidate.work_history
    : Array.isArray(candidate?.experience) && candidate.experience.length > 0
      ? candidate.experience
      : Array.isArray(candidate?.positions)
        ? candidate.positions
        : [];

  // Get the 3 most recent jobs (assuming they're sorted by date)
  const recentJobs = workHistory.slice(0, 3);
  
  const hasData = recentJobs.length > 0;
  
  return (
    <WidgetWrapper
      title={`Recent Roles${workHistory.length > 3 ? ` (${workHistory.length} total)` : ''}`}
      icon={Briefcase}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-3">
        {recentJobs.map((job, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-lg ${i === 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-zinc-800/30'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${i === 0 ? 'bg-red-500/20' : 'bg-zinc-700/50'}`}>
                <Building2 className={`w-4 h-4 ${i === 0 ? 'text-red-400' : 'text-zinc-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${i === 0 ? 'text-white' : 'text-zinc-300'}`}>
                  {getStringValue(job.title) || getStringValue(job.job_title) || 'Unknown Role'}
                </p>
                <p className="text-sm text-zinc-400 truncate">
                  {getStringValue(job.company) || getStringValue(job.company_name) || 'Unknown Company'}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(job.start_date)} - {formatDate(job.end_date) || 'Present'}
                </div>
              </div>
            </div>
            {job.description && (
              <p className="mt-2 text-xs text-zinc-500 line-clamp-2 pl-11">
                {getStringValue(job.description)}
              </p>
            )}
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
};

export default WorkHistoryWidget;
