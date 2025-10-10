
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Target,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Edit,
  MessageSquare,
  Megaphone
} from "lucide-react";
import { generateCandidateIntelligence } from "@/api/functions";
import { User } from "@/api/entities";
import { Campaign } from "@/api/entities";
import { useTranslation } from "@/components/utils/translations";
import { motion } from "framer-motion";
import IconWrapper from "../ui/IconWrapper";
import AddToCampaignModal from "../campaigns/AddToCampaignModal";

export default function IntelligenceReport({ candidate, onUpdate }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const [showAddToCampaign, setShowAddToCampaign] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        if (userData?.organization_id) {
          const orgCampaigns = await Campaign.filter({ 
            organization_id: userData.organization_id, 
            status: ['active', 'draft', 'paused'] 
          }).catch(() => []);
          setCampaigns(Array.isArray(orgCampaigns) ? orgCampaigns : []);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { t } = useTranslation(user?.language || 'nl');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateCandidateIntelligence({ candidate_id: candidate.id });
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error generating intelligence:", error);
      alert(t('failed_to_generate_intelligence'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToCampaign = async (campaignId, outreachMessage) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      const existingMatches = campaign.matched_candidates || [];
      const exists = existingMatches.some(m => m.candidate_id === candidate.id);
      
      if (exists) {
        alert(user?.language === 'nl' ? 'Kandidaat zit al in deze campaign' : 'Candidate already in campaign');
        return;
      }

      const newMatch = {
        candidate_id: candidate.id,
        match_score: candidate.intelligence_score || 50,
        match_reasons: [user?.language === 'nl' ? 'Handmatig toegevoegd' : 'Manually added'],
        candidate_name: `${candidate.first_name} ${candidate.last_name}`,
        candidate_job_title: candidate.job_title,
        candidate_company: candidate.company_name,
        matched_at: new Date().toISOString(),
        outreach_message: outreachMessage,
        stage: 'queue'
      };

      const updatedMatches = [...existingMatches, newMatch];
      await Campaign.update(campaignId, { matched_candidates: updatedMatches });
      
      setShowAddToCampaign(false);
      alert(user?.language === 'nl' ? 'Kandidaat toegevoegd aan campaign' : 'Candidate added to campaign');
    } catch (error) {
      console.error('Error adding to campaign:', error);
      alert(user?.language === 'nl' ? 'Fout bij toevoegen' : 'Error adding candidate');
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      Low: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      Medium: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
      High: "bg-orange-500/10 border-orange-500/30 text-orange-400",
      Critical: "bg-red-500/10 border-red-500/30 text-red-400"
    };
    return colors[level] || colors.Low;
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      Low: "text-blue-400",
      Medium: "text-yellow-400",
      High: "text-red-400"
    };
    return colors[urgency] || colors.Low;
  };

  const hasIntelligence = candidate.intelligence_score && candidate.intelligence_level;
  const lastUpdate = candidate.last_intelligence_update;
  const isRecent = lastUpdate && (new Date() - new Date(lastUpdate)) < 7 * 24 * 60 * 60 * 1000;

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconWrapper icon={Brain} size={24} variant="accent" glow={true} />
              <div>
                <CardTitle style={{ color: 'var(--txt)' }}>
                  {t('intelligence_report')}
                </CardTitle>
                {lastUpdate && (
                  <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                    {t('last_updated')}: {new Date(lastUpdate).toLocaleDateString(user?.language === 'nl' ? 'nl-NL' : 'en-US')}
                    {isRecent && (
                      <Badge className="ml-2 bg-green-500/10 border-green-500/30 text-green-400 text-xs">
                        {t('recently_enriched')}
                      </Badge>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons in header */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/candidate-profile?id=${candidate.id}`, '_blank')}
                className="btn-outline"
              >
                <Edit className="w-4 h-4 mr-2" />
                {user?.language === 'nl' ? 'Bewerken' : 'Edit'}
              </Button>

              {candidate.linkedin_profile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(candidate.linkedin_profile, '_blank')}
                  className="btn-outline"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {user?.language === 'nl' ? 'Profiel' : 'Profile'}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: open outreach prep */}}
                className="btn-outline"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {user?.language === 'nl' ? 'Outreach' : 'Outreach'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddToCampaign(true)}
                className="btn-outline"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                {user?.language === 'nl' ? 'Campaign' : 'Campaign'}
              </Button>

              {hasIntelligence && (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  size="sm"
                  className="btn-primary"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('generate_intelligence')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!hasIntelligence ? (
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <IconWrapper icon={Brain} size={48} variant="muted" glow={false} className="mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  {t('no_intelligence')}
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                  {user?.language === 'nl'
                    ? 'Genereer market intelligence om de kans op succes te maximaliseren'
                    : 'Generate market intelligence to maximize your chances of success'}
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-primary"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('generate_intelligence')}
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Intelligence Score and Level */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <IconWrapper icon={TrendingUp} size={16} variant="accent" />
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      {t('readiness_score')}
                    </span>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: 'var(--txt)' }}>
                    {candidate.intelligence_score}
                  </p>
                </div>

                <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <IconWrapper icon={AlertCircle} size={16} variant="muted" />
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      {t('intelligence_level')}
                    </span>
                  </div>
                  <Badge className={`${getLevelColor(candidate.intelligence_level)} text-sm px-3 py-1`}>
                    {t(`level_${candidate.intelligence_level?.toLowerCase()}`)}
                  </Badge>
                </div>

                {candidate.intelligence_urgency && (
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <IconWrapper icon={Clock} size={16} variant="muted" />
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Urgentie' : 'Urgency'}
                      </span>
                    </div>
                    <p className={`text-lg font-semibold ${getUrgencyColor(candidate.intelligence_urgency)}`}>
                      {candidate.intelligence_urgency}
                    </p>
                  </div>
                )}
              </div>

              {/* Key Factors */}
              {candidate.intelligence_factors && candidate.intelligence_factors.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <Target className="w-4 h-4" />
                    {t('key_factors')}
                  </h4>
                  <div className="space-y-3">
                    {candidate.intelligence_factors.map((factor, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-lg" 
                        style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium" style={{ color: 'var(--txt)' }}>
                            {factor.factor}
                          </h5>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{
                              background: 'rgba(239,68,68,.12)',
                              borderColor: 'rgba(239,68,68,.3)',
                              color: '#FFCCCB'
                            }}
                          >
                            {factor.weight}
                          </Badge>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                          {factor.detail}
                        </p>
                        {factor.insight && (
                          <p className="text-sm mt-2 italic" style={{ color: 'var(--muted)', opacity: 0.8 }}>
                            💡 {factor.insight}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timing Insights */}
              {candidate.intelligence_timing && candidate.intelligence_timing.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <Clock className="w-4 h-4" />
                    {t('timing_insights')}
                  </h4>
                  <div className="space-y-2">
                    {candidate.intelligence_timing.map((insight, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-2 p-3 rounded-lg"
                        style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}
                      >
                        <span className="text-accent">→</span>
                        <p className="text-sm" style={{ color: 'var(--txt)' }}>
                          {insight}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Approach and Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.recommended_approach && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.15)' }}
                  >
                    <h4 className="font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                      {t('recommended_approach')}
                    </h4>
                    <p className="text-sm capitalize" style={{ color: 'var(--txt)' }}>
                      {candidate.recommended_approach}
                    </p>
                  </div>
                )}

                {candidate.recommended_timeline && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.15)' }}
                  >
                    <h4 className="font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                      {t('recommended_timeline')}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--txt)' }}>
                      {candidate.recommended_timeline}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddToCampaignModal
        open={showAddToCampaign}
        onClose={() => setShowAddToCampaign(false)}
        candidate={candidate}
        campaigns={campaigns}
        onAdd={handleAddToCampaign}
        user={user}
      />
    </>
  );
}
