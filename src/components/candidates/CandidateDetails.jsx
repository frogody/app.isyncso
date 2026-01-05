import React, { useState, useEffect } from "react";
import { Candidate, Campaign, User } from "@/api/entities";
import { functions } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  Trash2,
  UserCheck,
  Target,
  Zap,
  AlertTriangle,
  Lightbulb,
  Building2,
  UserPlus,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useTranslation } from "@/components/utils/translations";
import LinkedInIcon from "../ui/LinkedInIcon";
import SyncAvatar from "../ui/SyncAvatar";
import { generateCandidateIntelligence } from "@/api/functions";

export default function CandidateDetails({ candidate, withCardWrapper = false, onUpdate }) {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [addingToCampaign, setAddingToCampaign] = useState(false);

  const { t } = useTranslation(user?.language || 'nl');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        if (userData?.organization_id) {
          const orgCampaigns = await Campaign.filter(
            { 
              organization_id: userData.organization_id,
              status: 'active'
            },
            "-created_date",
            100
          );
          setCampaigns(orgCampaigns);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const handleGenerateIntelligence = async () => {
    setGenerating(true);
    try {
      const response = await generateCandidateIntelligence({
        candidate_id: candidate.id
      });

      if (response.data?.intelligence) {
        const updatedCandidate = {
          ...candidate,
          ...response.data.intelligence,
          last_intelligence_update: new Date().toISOString()
        };
        
        await Candidate.update(candidate.id, updatedCandidate);
        
        if (onUpdate) {
          onUpdate(updatedCandidate);
        }
      }
    } catch (error) {
      console.error("Error generating intelligence:", error);
      alert(t('failed_to_generate_intelligence'));
    } finally {
      setGenerating(false);
    }
  };

  const getIntelligenceColor = (level) => {
    const colors = {
      'Low': '#86EFAC',
      'Medium': '#FCD34D',
      'High': '#FB923C',
      'Critical': '#EF4444'
    };
    return colors[level] || '#B5C0C4';
  };

  const getIntelligenceIcon = (level) => {
    if (level === 'Critical' || level === 'High') return AlertTriangle;
    if (level === 'Medium') return Zap;
    return Target;
  };

  const handleDeleteCandidate = async () => {
    if (confirm(t('confirm_delete_candidates', { count: 1 }))) {
      try {
        await Candidate.delete(candidate.id);
        window.location.href = '/Candidates';
      } catch (error) {
        console.error("Error deleting candidate:", error);
      }
    }
  };

  const handleToggleContacted = async () => {
    try {
      const updated = await Candidate.update(candidate.id, {
        ...candidate,
        contacted: !candidate.contacted
      });
      if (onUpdate) onUpdate(updated);
    } catch (error) {
      console.error("Error updating contacted status:", error);
    }
  };

  const handleAssignToMe = async () => {
    if (!user) return;
    try {
      const userId = user.user_id || user.id;
      const updated = await Candidate.update(candidate.id, {
        ...candidate,
        assigned_to: userId,
        assignment_date: new Date().toISOString()
      });
      if (onUpdate) onUpdate(updated);
    } catch (error) {
      console.error("Error assigning candidate:", error);
    }
  };

  const handleAddToCampaign = async (campaignId) => {
    if (campaignId === 'none') return;
    
    setAddingToCampaign(true);
    
    try {
      // Step 1: Get fresh campaign data
      console.log('🔍 STEP 1: Fetching campaign...');
      const campaignList = await Campaign.filter({ id: campaignId });
      const campaign = campaignList[0];
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      console.log('✅ Campaign found:', campaign.name);

      // Step 2: Check if already added
      const isAlreadyAdded = campaign.matched_candidates?.some(
        m => m.candidate_id === candidate.id
      );

      if (isAlreadyAdded) {
        alert(user?.language === 'nl' 
          ? 'Kandidaat zit al in deze campagne'
          : 'Candidate already in this campaign');
        setAddingToCampaign(false);
        return;
      }

      // Step 3: Generate ALL outreach messages (initial, follow-up 1, follow-up 2)
      console.log('🤖 STEP 2: Generating all outreach messages...');
      console.log('   - Candidate ID:', candidate.id);
      console.log('   - Campaign ID:', campaignId);
      
      // First add candidate to campaign matched_candidates - START AT 'first_message' STAGE
      const newMatch = {
        candidate_id: candidate.id,
        candidate_name: `${candidate.first_name} ${candidate.last_name}`,
        candidate_job_title: candidate.job_title || '',
        candidate_company: candidate.company_name || '',
        candidate_linkedin: candidate.linkedin_profile || '',
        matched_at: new Date().toISOString(),
        stage: 'first_message',  // ✅ START DIRECTLY AT first_message, NOT queue
        match_score: candidate.intelligence_score || 0,
        match_reasons: [user?.language === 'nl' ? 'Handmatig toegevoegd' : 'Manually added'],
        response_received: false,
        interested: false,
        outreach_message: '', // Will be filled by generation
        follow_up_message: '', // Will be filled by generation
        follow_up_message_2: '' // Will be filled by generation
      };

      const updatedMatches = [
        ...(campaign.matched_candidates || []),
        newMatch
      ];

      // Save campaign with new candidate
      await Campaign.update(campaignId, {
        matched_candidates: updatedMatches
      });

      console.log('✅ Candidate added to campaign at first_message stage, now generating messages...');

      console.log('🤖 STEP 3: Invoking outreach generation...');
      
      const outreachResponse = await functions.invoke('generateCampaignOutreach', {
        campaign_id: campaignId,
        candidate_ids: [candidate.id]
      });

      console.log('📨 STEP 4: Generation response:', outreachResponse);

      const responseData = outreachResponse?.data || outreachResponse;
      console.log('📦 STEP 5: Response data:', responseData);
      
      if (responseData?.success === false) {
        throw new Error(responseData.error || 'Outreach generation failed');
      }

      console.log('🔄 STEP 6: Reloading campaign to get generated messages...');
      const reloadedCampaignList = await Campaign.filter({ id: campaignId });
      const reloadedCampaign = reloadedCampaignList[0];

      if (!reloadedCampaign) {
        throw new Error('Failed to reload campaign');
      }

      const updatedMatch = reloadedCampaign.matched_candidates?.find(
        m => m.candidate_id === candidate.id
      );

      if (!updatedMatch) {
        throw new Error('Candidate not found in campaign after generation');
      }

      console.log('✅ STEP 7: Messages generated successfully!');
      console.log('   - Initial message:', updatedMatch.outreach_message?.length || 0, 'chars');
      console.log('   - Follow-up 1:', updatedMatch.follow_up_message?.length || 0, 'chars');
      console.log('   - Follow-up 2:', updatedMatch.follow_up_message_2?.length || 0, 'chars');

      if (!updatedMatch.outreach_message || updatedMatch.outreach_message.length < 10) {
        throw new Error('Initial outreach message was not generated properly');
      }

      if (!updatedMatch.follow_up_message || updatedMatch.follow_up_message.length < 10) {
        throw new Error('Follow-up 1 message was not generated properly');
      }

      if (!updatedMatch.follow_up_message_2 || updatedMatch.follow_up_message_2.length < 10) {
        throw new Error('Follow-up 2 message was not generated properly');
      }

      alert(user?.language === 'nl'
        ? '✓ Kandidaat succesvol toegevoegd met alle outreach berichten!'
        : '✓ Candidate successfully added with all outreach messages!');

      const orgCampaigns = await Campaign.filter(
        { 
          organization_id: user.organization_id,
          status: 'active'
        },
        "-created_date",
        100
      );
      setCampaigns(orgCampaigns);

      console.log('🎉 COMPLETE: Candidate added successfully with all messages!');

    } catch (error) {
      console.error('❌ FATAL ERROR in handleAddToCampaign:');
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      
      alert(user?.language === 'nl'
        ? `❌ Fout: ${error.message}`
        : `❌ Error: ${error.message}`);
    } finally {
      setAddingToCampaign(false);
    }
  };

  const candidateCampaigns = campaigns.filter(c => 
    c.matched_candidates?.some(m => m.candidate_id === candidate.id)
  );

  const safeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    if (typeof value === 'object') return [];
    return [];
  };

  const intelligenceFactors = safeArray(candidate.intelligence_factors);
  const keyInsights = safeArray(candidate.key_insights);
  const motivationTriggers = safeArray(candidate.motivation_triggers);
  const riskFactors = safeArray(candidate.risk_factors);

  const content = (
    <>
      <style jsx>{`
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
              {candidate.profile_picture ? (
                <img src={candidate.profile_picture} alt={`${candidate.first_name} ${candidate.last_name}`} className="w-full h-full object-cover" />
              ) : (
                <UserCheck className="w-8 h-8" style={{color: 'var(--muted)'}} />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{color: 'var(--txt)'}}>
                {candidate.first_name} {candidate.last_name}
              </h2>
              <p className="text-sm" style={{color: 'var(--muted)'}}>
                {candidate.job_title} @ {candidate.company_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {candidate.linkedin_profile && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(candidate.linkedin_profile, '_blank')}
                className="flex items-center gap-2"
                style={{
                  background: 'rgba(10,102,194,.08)',
                  border: '1px solid rgba(10,102,194,.2)',
                  color: '#60A5FA'
                }}
              >
                <LinkedInIcon size={14} />
                <span className="hidden sm:inline">LinkedIn</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleContacted}
              className="flex items-center gap-2"
              style={{
                background: candidate.contacted ? 'rgba(34,197,94,.08)' : 'rgba(255,255,255,.04)',
                border: candidate.contacted ? '1px solid rgba(34,197,94,.2)' : '1px solid rgba(255,255,255,.08)',
                color: candidate.contacted ? '#86EFAC' : 'var(--txt)'
              }}
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">
                {candidate.contacted ? t('contacted') : t('mark_contacted')}
              </span>
            </Button>

            {user && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAssignToMe}
                className="flex items-center gap-2"
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.08)',
                  color: 'var(--txt)'
                }}
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('filter_me')}</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteCandidate}
              className="flex items-center gap-2"
              style={{
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.2)',
                color: '#FCA5A5'
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('delete')}</span>
            </Button>
          </div>
        </div>

        {/* Campaign Assignment (replaces Project Assignment) */}
        {campaigns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {addingToCampaign ? (
                <Loader2 className="w-5 h-5 animate-spin" style={{color: 'var(--accent)'}} />
              ) : (
                <Building2 className="w-5 h-5" style={{color: 'var(--muted)'}} />
              )}
              <Select
                value="none"
                onValueChange={handleAddToCampaign}
                disabled={addingToCampaign}
              >
                <SelectTrigger 
                  className="w-full sm:w-64" 
                  style={{
                    background: 'rgba(255,255,255,.04)', 
                    borderColor: 'rgba(255,255,255,.08)', 
                    color: 'var(--txt)',
                    opacity: addingToCampaign ? 0.5 : 1
                  }}
                >
                  <SelectValue placeholder={
                    addingToCampaign 
                      ? (user?.language === 'nl' ? 'Outreach genereren...' : 'Generating outreach...')
                      : (user?.language === 'nl' ? 'Voeg toe aan campagne...' : 'Add to campaign...')
                  } />
                </SelectTrigger>
                <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id} style={{color: 'var(--txt)'}}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show campaigns candidate is in */}
            {candidateCampaigns.length > 0 && (
              <div className="flex flex-wrap gap-2 ml-8">
                <span className="text-xs" style={{color: 'var(--muted)'}}>
                  {user?.language === 'nl' ? 'Actief in:' : 'Active in:'}
                </span>
                {candidateCampaigns.map(c => (
                  <Badge 
                    key={c.id}
                    variant="outline"
                    className="text-xs"
                    style={{
                      background: 'rgba(239,68,68,.08)',
                      borderColor: 'rgba(239,68,68,.2)',
                      color: '#FFCCCB'
                    }}
                  >
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" style={{color: 'var(--muted)'}} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--muted)'}}>
                {t('location')}
              </span>
            </div>
            <p className="text-sm font-medium" style={{color: 'var(--txt)'}}>
              {candidate.person_home_location || '-'}
            </p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4" style={{color: 'var(--muted)'}} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--muted)'}}>
                {t('current_role')}
              </span>
            </div>
            <p className="text-sm font-medium" style={{color: 'var(--txt)'}}>
              {candidate.job_title || '-'}
            </p>
            <p className="text-xs" style={{color: 'var(--muted)'}}>
              {candidate.company_name || '-'}
            </p>
          </div>

          {candidate.years_with_current_company !== undefined && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" style={{color: 'var(--muted)'}} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--muted)'}}>
                  {t('years_at_company')}
                </span>
              </div>
              <p className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                {candidate.years_with_current_company} {t('years')}
              </p>
            </div>
          )}

          {candidate.times_promoted_current_company !== undefined && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{color: 'var(--muted)'}} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--muted)'}}>
                  {t('promotions')}
                </span>
              </div>
              <p className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                {candidate.times_promoted_current_company}
              </p>
            </div>
          )}

          {candidate.estimated_current_salary_range && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4" style={{color: 'var(--muted)'}} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--muted)'}}>
                  {t('salary_range')}
                </span>
              </div>
              <p className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                {candidate.estimated_current_salary_range}
              </p>
            </div>
          )}

          {candidate.readiness_score !== undefined && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{color: 'var(--muted)'}} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--muted)'}}>
                  {t('readiness_score')}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{color: 'var(--accent)'}}>
                {candidate.readiness_score}/100
              </p>
            </div>
          )}
        </div>

        {/* Intelligence Report Section */}
        {candidate.intelligence_score ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{color: 'var(--txt)'}}>
                {t('intelligence_report')}
              </h3>
              <Button
                onClick={handleGenerateIntelligence}
                disabled={generating}
                size="sm"
                className="flex items-center gap-2"
                style={{
                  background: 'rgba(239,68,68,.08)',
                  border: '1px solid rgba(239,68,68,.2)',
                  color: '#FFCCCB'
                }}
              >
                {generating ? (
                  <>
                    <SyncAvatar size={16} />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {t('refresh')}
                  </>
                )}
              </Button>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${getIntelligenceColor(candidate.intelligence_level)}15`,
                    border: `1px solid ${getIntelligenceColor(candidate.intelligence_level)}40`
                  }}
                >
                  {React.createElement(getIntelligenceIcon(candidate.intelligence_level), {
                    className: "w-6 h-6",
                    style: { color: getIntelligenceColor(candidate.intelligence_level) }
                  })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{color: 'var(--txt)'}}>
                      {candidate.intelligence_score}
                    </span>
                    <Badge 
                      style={{
                        background: `${getIntelligenceColor(candidate.intelligence_level)}15`,
                        color: getIntelligenceColor(candidate.intelligence_level),
                        border: `1px solid ${getIntelligenceColor(candidate.intelligence_level)}40`
                      }}
                    >
                      {candidate.intelligence_level}
                    </Badge>
                  </div>
                  {candidate.last_intelligence_update && (
                    <p className="text-xs" style={{color: 'var(--muted)'}}>
                      {t('last_updated')}: {new Date(candidate.last_intelligence_update).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Key Factors */}
            {intelligenceFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{color: 'var(--txt)'}}>
                  <Zap className="w-4 h-4" style={{color: 'var(--accent)'}} />
                  {t('key_factors')}
                </h4>
                <div className="space-y-2">
                  {intelligenceFactors.map((factor, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{
                        background: 'rgba(255,255,255,.02)',
                        border: '1px solid rgba(255,255,255,.06)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm" style={{color: 'var(--txt)'}}>
                          {factor.factor || ''}
                        </span>
                        {factor.weight && (
                          <Badge 
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: 'rgba(255,255,255,.1)',
                              color: 'var(--muted)'
                            }}
                          >
                            {factor.weight}
                          </Badge>
                        )}
                      </div>
                      {factor.detail && (
                        <p className="text-xs mt-1" style={{color: 'var(--muted)'}}>
                          {factor.detail}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Insights */}
            {keyInsights.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{color: 'var(--txt)'}}>
                  <Lightbulb className="w-4 h-4" style={{color: 'var(--accent)'}} />
                  Key Insights
                </h4>
                <div className="space-y-2">
                  {keyInsights.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{
                        background: 'rgba(255,255,255,.02)',
                        border: '1px solid rgba(255,255,255,.06)'
                      }}
                    >
                      <p className="text-sm" style={{color: 'var(--txt)'}}>
                        {typeof item === 'string' ? item : (item.insight || '')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Motivation Triggers */}
            {motivationTriggers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{color: 'var(--txt)'}}>
                  <TrendingUp className="w-4 h-4" style={{color: '#34D399'}} />
                  Motivation Triggers
                </h4>
                <div className="space-y-2">
                  {motivationTriggers.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{
                        background: 'rgba(52,211,153,.05)',
                        border: '1px solid rgba(52,211,153,.2)'
                      }}
                    >
                      <p className="text-sm" style={{color: 'var(--txt)'}}>
                        {typeof item === 'string' ? item : (item.trigger || '')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {riskFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{color: 'var(--txt)'}}>
                  <AlertTriangle className="w-4 h-4" style={{color: '#FCA5A5'}} />
                  Risk Factors
                </h4>
                <div className="space-y-2">
                  {riskFactors.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{
                        background: 'rgba(252,165,165,.05)',
                        border: '1px solid rgba(252,165,165,.2)'
                      }}
                    >
                      <p className="text-sm" style={{color: 'var(--txt)'}}>
                        {typeof item === 'string' ? item : (item.risk || '')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Approach */}
            {candidate.recommended_approach && (
              <div className="p-4 rounded-lg"
                   style={{
                     background: 'rgba(239,68,68,.05)',
                     border: '1px solid rgba(239,68,68,.2)'
                   }}>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{color: 'var(--txt)'}}>
                  <Target className="w-4 h-4" style={{color: 'var(--accent)'}} />
                  {t('recommended_approach')}
                </h4>
                <p className="text-sm capitalize" style={{color: 'var(--txt)'}}>
                  {candidate.recommended_approach}
                </p>
                {candidate.recommended_timeline && (
                  <p className="text-xs mt-2" style={{color: 'var(--muted)'}}>
                    {t('recommended_timeline')}: {candidate.recommended_timeline}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                   style={{background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)'}}>
                <Zap className="w-8 h-8" style={{color: 'var(--accent)'}} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--txt)'}}>
                  {t('intelligence_report')}
                </h3>
                <p className="text-sm mb-4" style={{color: 'var(--muted)'}}>
                  {t('last_updated')}: {t('never')}
                </p>
                <Button
                  onClick={handleGenerateIntelligence}
                  disabled={generating}
                  className="flex items-center gap-2"
                  style={{
                    background: 'rgba(239,68,68,.12)',
                    color: '#FFCCCB',
                    border: '1px solid rgba(239,68,68,.3)'
                  }}
                >
                  {generating ? (
                    <>
                      <SyncAvatar size={20} />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      {t('generate_intelligence')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (withCardWrapper) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}
