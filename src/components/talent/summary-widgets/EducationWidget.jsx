import React from "react";
import { GraduationCap, Calendar, Award } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

// Extract string value from field that might be object or string
const getStringValue = (value, fallback = '') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.name || value.title || value.text || value.value || fallback;
  }
  return String(value);
};

// Extract school name from various formats
const getSchoolName = (edu) => {
  if (!edu) return 'Unknown Institution';
  if (typeof edu.school === 'object') return edu.school?.name || 'Unknown Institution';
  return edu.school || edu.institution || edu.university || 'Unknown Institution';
};

// Extract degree info from various formats
const getDegreeName = (edu) => {
  if (!edu) return 'Degree';
  if (Array.isArray(edu.degrees) && edu.degrees.length > 0) {
    return edu.degrees.map(d => getStringValue(d)).join(', ');
  }
  return getStringValue(edu.degree) ||
         getStringValue(edu.field_of_study) ||
         getStringValue(edu.field) ||
         (Array.isArray(edu.majors) ? edu.majors.join(', ') : getStringValue(edu.major)) ||
         'Degree';
};

// Get graduation year from various fields
const getYear = (edu) => {
  if (!edu) return null;
  return edu.year || edu.end_date || edu.graduation_year || edu.end_year || null;
};

const EducationWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  // Check multiple possible data sources
  const education = Array.isArray(candidate?.education) && candidate.education.length > 0
    ? candidate.education
    : Array.isArray(candidate?.educations)
      ? candidate.educations
      : [];

  // Show up to 3 education entries
  const displayEducation = education.slice(0, 3);
  const hasData = displayEducation.length > 0;

  return (
    <WidgetWrapper
      title={`Education${education.length > 0 ? ` (${education.length})` : ''}`}
      icon={GraduationCap}
      iconColor="text-purple-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-3">
        {displayEducation.map((edu, i) => {
          const schoolName = getSchoolName(edu);
          const degreeName = getDegreeName(edu);
          const year = getYear(edu);

          return (
            <div
              key={i}
              className={`p-3 rounded-lg ${i === 0 ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-zinc-800/30'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${i === 0 ? 'bg-purple-500/20' : 'bg-zinc-700/50'}`}>
                  <GraduationCap className={`w-4 h-4 ${i === 0 ? 'text-purple-400' : 'text-zinc-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${i === 0 ? 'text-white' : 'text-zinc-300'}`}>
                    {degreeName}
                  </p>
                  <p className="text-sm text-zinc-400 truncate">
                    {schoolName}
                  </p>
                  {year && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {year}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {education.length > 3 && (
          <p className="text-xs text-zinc-500 text-center">
            +{education.length - 3} more
          </p>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default EducationWidget;
