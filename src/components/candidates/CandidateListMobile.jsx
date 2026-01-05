
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronDown, CheckCircle2, Circle, Briefcase, Building2 } from "lucide-react";
import CandidateDetails from "./CandidateDetails";
import { useTranslation } from "@/components/utils/translations";
import LinkedInIcon from "../ui/LinkedInIcon";
import IconWrapper from "../ui/IconWrapper";

export default React.memo(function CandidateListMobile({ candidates }) {
  const [expandedCard, setExpandedCard] = useState(null);
  const [user] = useState(null);

  const { t } = useTranslation(user?.language || 'en'); // Added useTranslation hook

  const toggle = (id) => setExpandedCard(expandedCard === id ? null : id); // Updated to use expandedCard

  return (
    <div className="space-y-3">
      <style>{`
        .mobile-card {
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)), rgba(26,32,38,.5);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 4px 12px rgba(0,0,0,.2);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        .mobile-card:active {
          transform: scale(0.98);
        }
      `}</style>

      {candidates.map((candidate) => (
        <Card key={candidate.id} className="mobile-card overflow-hidden">
          {/* Status Bar */}
          <div 
            className="h-1.5 w-full"
            style={{
              background: candidate.contacted 
                ? 'linear-gradient(90deg, rgba(34,197,94,.4), rgba(34,197,94,.2))' 
                : 'linear-gradient(90deg, rgba(239,68,68,.4), rgba(239,68,68,.2))'
            }}
          />
          
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                {/* Name */}
                <div className="flex items-center gap-2 mb-2">
                  {candidate.contacted ? (
                    <IconWrapper icon={CheckCircle2} size={16} variant="accent" />
                  ) : (
                    <Circle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <h3 className="font-bold text-base truncate" style={{color: 'var(--txt)'}}>
                    {candidate.first_name} {candidate.last_name}
                  </h3>
                </div>

                {/* Job Title */}
                {candidate.job_title && (
                  <div className="flex items-center gap-1.5 text-sm mb-1.5" style={{color: 'var(--muted)'}}>
                    <IconWrapper icon={Briefcase} size={13} variant="muted" />
                    <span className="truncate">{candidate.job_title}</span>
                  </div>
                )}

                {/* Company */}
                {candidate.company_name && (
                  <div className="flex items-center gap-1.5 text-sm mb-1.5" style={{color: 'var(--muted)'}}>
                    <IconWrapper icon={Building2} size={13} variant="muted" />
                    <span className="truncate">{candidate.company_name}</span>
                  </div>
                )}

                {/* Location */}
                {candidate.person_home_location && (
                  <div className="flex items-center gap-1.5 text-sm" style={{color: 'var(--muted)'}}>
                    <IconWrapper icon={MapPin} size={13} variant="muted" />
                    <span className="truncate">{candidate.person_home_location}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {candidate.linkedin_profile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(candidate.linkedin_profile, '_blank');
                    }}
                    className="h-9 w-9 p-0 rounded-lg"
                    style={{
                      background: 'rgba(10,102,194,.12)',
                      border: '1px solid rgba(10,102,194,.3)'
                    }}
                  >
                    <LinkedInIcon size={14} />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggle(candidate.id)}
                  className="h-9 w-9 p-0 rounded-lg hover:bg-white/5"
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.08)'
                  }}
                >
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${expandedCard === candidate.id ? 'rotate-180' : ''}`} // Updated to expandedCard
                    style={{color: 'var(--muted)'}}
                  />
                </Button>
              </div>
            </div>

            {/* Status Badge */}
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{
                background: candidate.contacted ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                borderColor: candidate.contacted ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)',
                color: candidate.contacted ? '#86EFAC' : '#FCA5A5'
              }}
            >
              {candidate.contacted ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t('contacted')} {/* Using t for translation */}
                </>
              ) : (
                <>
                  <Circle className="w-3 h-3 mr-1" />
                  {t('notContacted')} {/* Using t for translation */}
                </>
              )}
            </Badge>

            {/* Expanded Details */}
            {expandedCard === candidate.id && ( // Updated to expandedCard
              <div className="mt-4 pt-4 border-t" style={{borderColor: 'rgba(255,255,255,.06)'}}>
                <CandidateDetails candidate={candidate} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
