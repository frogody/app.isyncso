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

const WorkHistoryWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const workHistory = candidate?.work_history || [];
  
  // Get the 3 most recent jobs (assuming they're sorted by date)
  const recentJobs = workHistory.slice(0, 3);
  
  const hasData = recentJobs.length > 0;
  
  return (
    <WidgetWrapper
      title={`Recent Roles${workHistory.length > 3 ? ` (${workHistory.length} total)` : ''}`}
      icon={Briefcase}
      iconColor="text-indigo-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-3">
        {recentJobs.map((job, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-lg ${i === 0 ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-zinc-800/30'}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${i === 0 ? 'bg-indigo-500/20' : 'bg-zinc-700/50'}`}>
                <Building2 className={`w-4 h-4 ${i === 0 ? 'text-indigo-400' : 'text-zinc-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${i === 0 ? 'text-white' : 'text-zinc-300'}`}>
                  {job.title || job.job_title || 'Unknown Role'}
                </p>
                <p className="text-sm text-zinc-400 truncate">
                  {job.company || job.company_name || 'Unknown Company'}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(job.start_date)} - {formatDate(job.end_date) || 'Present'}
                </div>
              </div>
            </div>
            {job.description && (
              <p className="mt-2 text-xs text-zinc-500 line-clamp-2 pl-11">
                {job.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
};

export default WorkHistoryWidget;
