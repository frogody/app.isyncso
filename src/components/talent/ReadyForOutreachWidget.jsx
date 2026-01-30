/**
 * Ready for Outreach Widget
 * Shows candidates who are ready to contact - intel complete + matched + not yet contacted
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Users,
  Target,
  ChevronRight,
  Loader2,
  Sparkles,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/api/supabaseClient';

const ReadyForOutreachWidget = ({ organizationId, onRefresh }) => {
  const navigate = useNavigate();
  const [readyCandidates, setReadyCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (organizationId) {
      fetchReadyCandidates();
    }
  }, [organizationId]);

  const fetchReadyCandidates = async () => {
    setLoading(true);
    try {
      // Fetch all campaigns with matched candidates for this org
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          matched_candidates,
          role_id,
          roles:role_id(id, title)
        `)
        .eq('organization_id', organizationId)
        .not('matched_candidates', 'is', null);

      if (error) throw error;

      // Process matched candidates to find those ready for outreach
      const readyList = [];

      for (const campaign of campaigns || []) {
        const matches = campaign.matched_candidates || [];
        const roleTitle = campaign.roles?.title || 'Unknown Role';

        for (const match of matches) {
          // Check if candidate has intelligence ready
          const hasIntelligence =
            match.intelligence_score > 0 ||
            match.intelligence_generated ||
            match.best_outreach_angle ||
            match.timing_signals?.length > 0;

          // Check if NOT yet contacted (no outreach sent)
          const notContacted =
            match.status !== 'sent' &&
            match.status !== 'contacted' &&
            match.status !== 'replied' &&
            !match.outreach_sent_at;

          // Must be selected for outreach or have a good match score
          const isReady = hasIntelligence && notContacted && (match.selected || match.match_score >= 60);

          if (isReady) {
            readyList.push({
              candidate_id: match.candidate_id,
              candidate_name: match.candidate_name || 'Unknown',
              match_score: match.match_score || 0,
              best_outreach_angle: match.best_outreach_angle,
              timing_signals: match.timing_signals,
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              role_title: roleTitle,
              current_title: match.current_title,
              current_company: match.current_company,
            });
          }
        }
      }

      // Sort by match score DESC and take top 5
      readyList.sort((a, b) => b.match_score - a.match_score);
      setTotalCount(readyList.length);
      setReadyCandidates(readyList.slice(0, 5));
    } catch (error) {
      console.error('Error fetching ready candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = (candidate) => {
    // Navigate to campaign detail with outreach tab and candidate info
    navigate(`/TalentCampaignDetail?id=${candidate.campaign_id}&tab=outreach&candidateId=${candidate.candidate_id}`);
  };

  const handleViewAll = () => {
    navigate('/TalentCampaigns?filter=ready');
  };

  // Score color helper
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-red-400 bg-red-500/20';
    if (score >= 60) return 'text-red-400 bg-red-500/20';
    if (score >= 40) return 'text-red-300 bg-red-500/15';
    return 'text-zinc-400 bg-zinc-500/20';
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                Ready for Outreach
                {totalCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                    {totalCount}
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-zinc-500">Intel complete, ready to contact</p>
            </div>
          </div>

          {totalCount > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
            >
              View All
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        {readyCandidates.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 font-medium">No candidates ready yet</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-[200px] mx-auto">
              Run AI matching on your campaigns to find candidates
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/TalentCampaigns')}
              className="mt-3 border-zinc-700 text-zinc-400 hover:text-white text-xs"
            >
              <Target className="w-3 h-3 mr-1" />
              Go to Campaigns
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {readyCandidates.map((candidate, index) => (
              <motion.div
                key={`${candidate.campaign_id}-${candidate.candidate_id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group p-2.5 rounded-lg hover:bg-zinc-800/50 transition-all cursor-pointer"
                onClick={() => handleContact(candidate)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with score */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getScoreColor(candidate.match_score)}`}>
                      {candidate.candidate_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{candidate.match_score}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                      {candidate.candidate_name}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {candidate.current_title && candidate.current_company
                        ? `${candidate.current_title} at ${candidate.current_company}`
                        : candidate.role_title
                      }
                    </p>
                    {candidate.best_outreach_angle && (
                      <p className="text-xs text-red-400/80 truncate mt-0.5 flex items-center gap-1">
                        <Zap className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{candidate.best_outreach_angle}</span>
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContact(candidate);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Quick stats */}
      {totalCount > 0 && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              {totalCount} candidate{totalCount !== 1 ? 's' : ''} ready across all campaigns
            </span>
            <button
              onClick={fetchReadyCandidates}
              className="text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReadyForOutreachWidget;
