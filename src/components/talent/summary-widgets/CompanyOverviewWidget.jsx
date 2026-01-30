import React from "react";
import { Building2, Users, MapPin, Globe, TrendingUp, Briefcase } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

const StatItem = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-zinc-700/50 rounded">
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-sm text-white font-medium">{value}</p>
      </div>
    </div>
  );
};

const CompanyOverviewWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const companyIntel = candidate?.company_intelligence || {};
  const companyName = candidate?.current_company || candidate?.company_name;
  
  const employeeCount = companyIntel.employee_count || companyIntel.linkedin_employee_count;
  const industry = companyIntel.industry || candidate?.industry;
  const location = companyIntel.headquarters || companyIntel.hq_location || candidate?.company_location;
  const website = companyIntel.website || companyIntel.domain;
  const revenue = companyIntel.revenue || companyIntel.estimated_revenue;
  const founded = companyIntel.founded_year || companyIntel.founded;
  
  const hasData = companyName || employeeCount || industry || location;
  
  // Format employee count
  const formatEmployees = (count) => {
    if (!count) return null;
    if (typeof count === 'string') return count;
    if (count >= 10000) return Math.round(count / 1000) + "K+";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toString();
  };
  
  return (
    <WidgetWrapper
      title="Company Overview"
      icon={Building2}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-4">
        {/* Company Name Header */}
        {companyName && (
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <p className="text-base font-semibold text-white">{companyName}</p>
            {industry && (
              <p className="text-sm text-red-400/70 mt-0.5">{industry}</p>
            )}
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatItem icon={Users} label="Employees" value={formatEmployees(employeeCount)} />
          <StatItem icon={MapPin} label="Location" value={location} />
          <StatItem icon={Briefcase} label="Industry" value={!companyName && industry ? industry : null} />
          <StatItem icon={Globe} label="Website" value={website} />
          <StatItem icon={TrendingUp} label="Revenue" value={revenue} />
        </div>
      </div>
    </WidgetWrapper>
  );
};

export default CompanyOverviewWidget;
