import React, { useState, useMemo } from "react";
import { Cpu, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

// Role-to-category mapping for smart filtering
const ROLE_CATEGORY_MAP = {
  // Finance/Accounting roles
  'auditor|accountant|finance|cfo|controller|bookkeeper|tax|treasury|financial': [
    'FINANCE AND ACCOUNTING', 'ACCOUNTING', 'FINANCIAL', 'ERP', 'BILLING'
  ],
  // Engineering/Tech roles
  'engineer|developer|programmer|software|devops|sre|architect|tech lead|frontend|backend|fullstack': [
    'TESTING AND QA', 'DEVELOPMENT', 'DEVOPS', 'CLOUD', 'INFRASTRUCTURE', 'ENGINEERING', 'PROGRAMMING'
  ],
  // Sales roles
  'sales|account executive|bdm|business development|revenue|ae |sdr': [
    'SALES', 'CRM', 'SALES ENABLEMENT', 'CUSTOMER RELATIONSHIP'
  ],
  // Marketing roles
  'marketing|growth|seo|content|brand|demand gen|digital marketing|social media': [
    'MARKETING', 'ANALYTICS', 'ADVERTISING', 'MARKETING AUTOMATION', 'SOCIAL'
  ],
  // HR/People roles
  'hr|recruiter|people|talent|human resources|hris|recruiting': [
    'HR', 'HUMAN RESOURCES', 'HRIS', 'RECRUITING', 'TALENT'
  ],
  // Product/Design roles
  'product|designer|ux|ui|creative|design': [
    'PRODUCT AND DESIGN', 'DESIGN', 'UX', 'PROTOTYPING', 'CREATIVE'
  ],
  // Operations roles
  'operations|ops|supply chain|logistics|procurement|warehouse': [
    'OPERATIONS', 'SUPPLY CHAIN', 'LOGISTICS', 'ERP', 'INVENTORY'
  ],
  // Data roles
  'data|analyst|analytics|bi|scientist|machine learning|ml|ai': [
    'ANALYTICS', 'BUSINESS INTELLIGENCE', 'DATA', 'REPORTING', 'MACHINE LEARNING'
  ],
  // IT/Support roles
  'it |support|helpdesk|system admin|infrastructure|network': [
    'IT', 'INFRASTRUCTURE', 'SUPPORT', 'SECURITY', 'NETWORK'
  ],
  // Legal roles
  'legal|lawyer|counsel|compliance|paralegal|contract': [
    'LEGAL', 'COMPLIANCE', 'CONTRACT MANAGEMENT'
  ],
  // Communications
  'communications|comms|pr |public relations': [
    'COMMUNICATIONS', 'EMAIL', 'COLLABORATION'
  ]
};

// Get candidate's role text for matching
const getCandidateRole = (candidate) => {
  return (
    candidate?.job_title ||
    candidate?.current_title ||
    candidate?.current_position ||
    candidate?.title ||
    ''
  ).toLowerCase();
};

// Find relevant categories based on role
const getRelevantCategories = (roleText) => {
  const matchedCategories = [];

  for (const [pattern, categories] of Object.entries(ROLE_CATEGORY_MAP)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(roleText)) {
      matchedCategories.push(...categories);
    }
  }

  return [...new Set(matchedCategories)];
};

// Extract tech name from various formats
const getTechName = (tech) => {
  if (!tech) return null;
  if (typeof tech === 'string') return tech;
  if (typeof tech === 'object') {
    return tech.name || tech.title || tech.technology || tech.label || null;
  }
  return String(tech);
};

const TechStackWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const [expanded, setExpanded] = useState(false);

  const companyIntel = candidate?.company_intelligence || {};
  const companyName = candidate?.current_company || candidate?.company_name || 'this company';

  // Get tech stack from the correct path (technographics.tech_stack)
  // Also check legacy paths for backward compatibility
  const techStackData = useMemo(() => {
    return companyIntel?.technographics?.tech_stack ||
           companyIntel?.tech_stack ||
           companyIntel?.technologies ||
           [];
  }, [companyIntel]);

  // Get candidate role and relevant categories
  const roleText = getCandidateRole(candidate);
  const relevantCategories = useMemo(() => getRelevantCategories(roleText), [roleText]);

  // Process and filter tech by relevance
  const { relevantTech, otherTech, totalCount } = useMemo(() => {
    const relevant = [];
    const other = [];
    let total = 0;

    // Handle array of category objects: [{category: "X", technologies: [...]}]
    if (Array.isArray(techStackData)) {
      techStackData.forEach(categoryObj => {
        const categoryName = (categoryObj?.category || '').toUpperCase();
        const techs = categoryObj?.technologies || categoryObj?.techs || [];

        if (!Array.isArray(techs) || techs.length === 0) return;

        total += techs.length;

        const isRelevant = relevantCategories.some(rc =>
          categoryName.includes(rc.toUpperCase())
        );

        const techItems = techs.map(t => getTechName(t)).filter(Boolean);

        if (isRelevant && techItems.length > 0) {
          relevant.push({
            category: categoryObj.category,
            technologies: techItems
          });
        } else if (techItems.length > 0) {
          other.push({
            category: categoryObj.category,
            technologies: techItems
          });
        }
      });
    }

    return { relevantTech: relevant, otherTech: other, totalCount: total };
  }, [techStackData, relevantCategories]);

  // Count relevant tech items
  const relevantCount = relevantTech.reduce((sum, cat) => sum + cat.technologies.length, 0);
  const hasRelevantTech = relevantCount > 0;
  const hasOtherTech = otherTech.length > 0;
  const hasData = totalCount > 0;

  // Build title
  const titleText = hasRelevantTech
    ? `Relevant Tech (${relevantCount})`
    : `Tech Stack${totalCount > 0 ? ` (${totalCount})` : ''}`;

  return (
    <WidgetWrapper
      title={titleText}
      icon={Cpu}
      iconColor="text-cyan-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
      emptyMessage={`No tech data available for ${companyName}`}
    >
      <div className="space-y-4">
        {/* Relevant Tech Section */}
        {hasRelevantTech && (
          <div className="space-y-3">
            {/* Role context badge */}
            {roleText && (
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/70">
                <Sparkles className="w-3 h-3" />
                <span>Filtered for: {candidate?.job_title || candidate?.current_title || 'Role'}</span>
              </div>
            )}

            {relevantTech.map((cat, catIndex) => (
              <div key={catIndex} className="space-y-2">
                <p className="text-[10px] text-cyan-400/60 uppercase tracking-wider font-medium">
                  {cat.category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.technologies.slice(0, expanded ? undefined : 8).map((tech, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded text-xs border border-cyan-500/25"
                    >
                      {tech}
                    </span>
                  ))}
                  {!expanded && cat.technologies.length > 8 && (
                    <span className="px-2 py-0.5 text-cyan-400/60 text-xs">
                      +{cat.technologies.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other Tech Section (collapsed by default) */}
        {hasOtherTech && (
          <div className="pt-2 border-t border-zinc-700/30">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors w-full"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Hide other technologies' : `Show ${totalCount - relevantCount} more technologies`}
            </button>

            {expanded && (
              <div className="mt-3 space-y-3">
                {otherTech.map((cat, catIndex) => (
                  <div key={catIndex} className="space-y-1.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {cat.category}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-zinc-800/50 text-zinc-400 rounded text-xs border border-zinc-700/50"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback: No role match, show all tech */}
        {!hasRelevantTech && hasData && (
          <div className="space-y-3">
            {techStackData.slice(0, expanded ? undefined : 3).map((cat, catIndex) => {
              const techs = (cat?.technologies || cat?.techs || []).map(t => getTechName(t)).filter(Boolean);
              if (techs.length === 0) return null;
              return (
                <div key={catIndex} className="space-y-1.5">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {techs.slice(0, 8).map((tech, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded text-xs border border-cyan-500/20"
                      >
                        {tech}
                      </span>
                    ))}
                    {techs.length > 8 && (
                      <span className="px-2 py-0.5 text-zinc-500 text-xs">
                        +{techs.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {techStackData.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded ? 'Show Less' : `Show ${techStackData.length - 3} more categories`}
              </button>
            )}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default TechStackWidget;
