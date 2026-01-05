import React, { useState, useEffect } from "react";
import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/utils/translations";
import { Search, Users, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CandidateDetails from "../components/candidates/CandidateDetails";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";
import { haptics } from "@/components/utils/haptics";
import LinkedInIcon from "../components/ui/LinkedInIcon";

export default function CandidatesMobile() {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);
  const [user, setUser] = useState(null);

  const { t } = useTranslation(user?.language || 'en');

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      let userData;
      try {
        userData = await User.me();
        setUser(userData);
      } catch (userError) {
        console.error('Error loading user:', userError);
        userData = null;
        setUser(null);
      }

      let candidateData;
      if (userData?.organization_id) {
        const [orgCandidates, unassignedCandidates] = await Promise.all([
          Candidate.filter({ organization_id: userData.organization_id }, "-created_date", 10000),
          Candidate.list("-created_date", 10000)
        ]);

        const unassignedOnly = unassignedCandidates.filter(c =>
          !c.organization_id && !orgCandidates.some(oc => oc.id === c.id)
        );

        candidateData = [...orgCandidates, ...unassignedOnly];
      } else {
        candidateData = await Candidate.list("-created_date", 10000);
      }

      setCandidates(candidateData);
      setFilteredCandidates(candidateData);
    } catch (error) {
      console.error("Error loading data:", error);
      setCandidates([]);
      setFilteredCandidates([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = candidates.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.company_name?.toLowerCase().includes(query) ||
        c.job_title?.toLowerCase().includes(query)
      );
      setFilteredCandidates(filtered);
    } else {
      setFilteredCandidates(candidates);
    }
  }, [searchQuery, candidates]);

  const toggleCard = (id) => {
    haptics.light();
    setExpandedCard(expandedCard === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
          }
          body { background: var(--bg) !important; color: var(--txt) !important; }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>{t('loading_candidates')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body { background: var(--bg) !important; color: var(--txt) !important; }
        .mobile-card {
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)), rgba(26,32,38,.5);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 4px 12px rgba(0,0,0,.2);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
      `}</style>

      {/* Page Header with Search - no longer includes top bar */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconWrapper icon={Users} size={24} variant="accent" glow={true} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--txt)' }}>{t('candidates_title')}</h2>
          </div>
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            {filteredCandidates.length}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <IconWrapper
            icon={Search}
            size={18}
            variant="muted"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <Input
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-transparent border h-12 text-base"
            style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
          />
        </div>
      </div>

      {/* Candidates List */}
      <div className="p-4 space-y-3">
        <AnimatePresence>
          {filteredCandidates.map((candidate) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="mobile-card overflow-hidden">
                {/* Status Bar */}
                <div 
                  className="h-1.5 w-full"
                  style={{
                    background: candidate.contacted 
                      ? 'linear-gradient(90deg, rgba(34,197,94,.4), rgba(34,197,94,.2))' 
                      : 'linear-gradient(90deg, rgba(239,68,68,.4), rgba(239,68,68,.2))'
                  }}
                />
                
                <CardContent className="p-4" onClick={() => toggleCard(candidate.id)}>
                  <div className="flex items-start gap-3">
                    {/* Profile Picture */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                      {candidate.profile_picture ? (
                        <img src={candidate.profile_picture} alt={candidate.first_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconWrapper icon={Users} size={20} variant="muted" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <div className="flex items-center gap-2 mb-1">
                        {candidate.contacted ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22C55E' }} />
                        ) : (
                          <Circle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                        )}
                        <h3 className="font-bold text-base truncate" style={{ color: 'var(--txt)' }}>
                          {candidate.first_name} {candidate.last_name}
                        </h3>
                      </div>

                      {/* Job Title */}
                      {candidate.job_title && (
                        <p className="text-sm truncate mb-0.5" style={{ color: 'var(--txt)' }}>
                          {candidate.job_title}
                        </p>
                      )}

                      {/* Company */}
                      {candidate.company_name && (
                        <p className="text-sm truncate mb-1" style={{ color: 'var(--muted)' }}>
                          {candidate.company_name}
                        </p>
                      )}

                      {/* Intelligence Score */}
                      {candidate.intelligence_score != null && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{
                            background: 'rgba(239,68,68,.12)',
                            borderColor: 'rgba(239,68,68,.3)',
                            color: '#FCA5A5'
                          }}
                        >
                          Score: {candidate.intelligence_score}
                        </Badge>
                      )}
                    </div>

                    {/* LinkedIn Link */}
                    {candidate.linkedin_profile && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          haptics.light();
                          window.open(candidate.linkedin_profile, '_blank');
                        }}
                        className="h-10 w-10 p-0 rounded-lg flex-shrink-0"
                        style={{
                          background: 'rgba(10,102,194,.12)',
                          border: '1px solid rgba(10,102,194,.3)'
                        }}
                      >
                        <LinkedInIcon size={16} />
                      </Button>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedCard === candidate.id && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                      <CandidateDetails candidate={candidate} onUpdate={(updated) => {
                        setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
                      }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredCandidates.length === 0 && (
          <div className="text-center py-12">
            <IconWrapper icon={Users} size={48} variant="muted" className="mx-auto mb-4" />
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--txt)' }}>{t('no_candidates')}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('no_candidates_desc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}