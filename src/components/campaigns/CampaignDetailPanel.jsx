
import React, { useState, useEffect } from "react";
import { Campaign } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Play,
  Pause,
  Archive,
  Trash2,
  Edit,
  Users,
  MessageSquare,
  TrendingUp, // This icon is replaced for follow_up stages in this update
  Target, // This icon is replaced for follow_up stages in this update
  Sparkles,
  Clock, // Added as new icon for follow-up stages
  CheckCircle2,
  Zap, // Added as new icon for no_reply stage
  ExternalLink,
  Send,
  X // Added X icon to imports (though not used in final implementation of this file as it's not a modal)
} from "lucide-react";
import IconWrapper from "../ui/IconWrapper";
import CandidateCard from "../candidates/CandidateCard"; // This component will be replaced for active stage rendering
import CampaignOutreachStyleModal from "./CampaignOutreachStyleModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";

// Define LinkedInIcon component
const LinkedInIcon = ({ size = 24, className = '', ...props }) =>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="currentColor"
  width={size}
  height={size}
  className={className}
  {...props}>

    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.277V9.76h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.248a2.636 2.636 0 01-2.635-2.636c0-1.378 1.25-2.486 2.635-2.486s2.635 1.108 2.635 2.486c0 1.379-1.25 2.636-2.635 2.636zM5.337 20.452H1.781V9.76h3.556v10.692z" />
  </svg>;



export default function CampaignDetailPanel({
  campaign,
  projects,
  user,
  getStatusColor,
  getStatusLabel,
  onCampaignUpdate,
  onCampaignDelete
}) {
  const [selectedStage, setSelectedStage] = useState('first_message');
  const [expandedCandidates, setExpandedCandidates] = useState({});
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // New state variables for tracking sending status and already sent tasks
  const [sendingToAgent, setSendingToAgent] = useState({}); // { candidate_id: boolean }
  const [sentToAgent, setSentToAgent] = new useState(new Set()); // Set of candidate_ids

  useEffect(() => {
    setSelectedStage('first_message');
    setExpandedCandidates({});
    // Reset sentToAgent state when campaign changes
    setSentToAgent(new Set());

    const loadSentTasks = async () => {
      if (!campaign?.id) return;
      try {
        // Fetch existing outreach tasks that are 'approved_ready' (or similar status indicating sent/ready)
        const response = await base44.functions.invoke('getOutreachTasks', {
          campaign_id: campaign.id,
          status: 'approved_ready' // This status might need adjustment based on backend
        });
        const tasks = response?.data || [];
        const candidatesWithTasks = new Set(tasks.map((t) => t.candidate_id));
        setSentToAgent(candidatesWithTasks);
      } catch (error) {
        console.error("Error loading sent tasks:", error);
      }
    };
    loadSentTasks();
  }, [campaign?.id]); // Re-run when campaign ID changes

  if (!campaign) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <IconWrapper icon={Users} size={48} variant="muted" glow={false} />
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
              {user?.language === 'nl' ? 'Selecteer een campaign' : 'Select a campaign'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {user?.language === 'nl' ?
              'Kies een campaign uit de lijst om details te bekijken' :
              'Choose a campaign from the list to view details'}
            </p>
          </div>
        </CardContent>
      </Card>);

  }

  const getPipelineCounts = () => {
    const matches = Array.isArray(campaign?.matched_candidates) ? campaign.matched_candidates : [];
    return matches.reduce((acc, m) => {
      const stage = m?.stage || 'first_message';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, { first_message: 0, follow_up_1: 0, follow_up_2: 0, no_reply: 0, connected: 0 });
  };

  const pipelineCounts = getPipelineCounts();

  const getStageLabel = (stage) => {
    const labels = {
      first_message: user?.language === 'nl' ? 'Eerste Bericht' : 'First Message',
      follow_up_1: user?.language === 'nl' ? 'Follow-up 1' : 'Follow-up 1',
      follow_up_2: user?.language === 'nl' ? 'Follow-up 2' : 'Follow-up 2',
      no_reply: user?.language === 'nl' ? 'Geen Reactie' : 'No Reply',
      connected: user?.language === 'nl' ? 'Verbonden' : 'Connected'
    };
    return labels[stage] || stage;
  };

  const handleToggleExpand = (candidateId) => {
    setExpandedCandidates((prev) => ({
      ...prev,
      [candidateId]: !prev[candidateId]
    }));
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await onCampaignUpdate(campaign.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      alert(user?.language === 'nl' ? 'Fout bij status update' : 'Error updating status');
    }
  };

  const handleStyleSave = async (styleConfig) => {
    try {
      await onCampaignUpdate(campaign.id, { message_style: styleConfig });
      setShowStyleModal(false);
    } catch (error) {
      console.error('Error saving style:', error);
      alert(user?.language === 'nl' ? 'Fout bij opslaan stijl' : 'Error saving style');
    }
  };

  const handleAnalyze = async () => {
    if (!campaign.project_id) {
      alert(user?.language === 'nl' ?
      'Geen project gekoppeld aan deze campaign' :
      'No project linked to this campaign');
      return;
    }

    setIsAnalyzing(true);
    try {
      await onCampaignUpdate(campaign.id, { status: 'analyzing' });

      const response = await base44.functions.invoke('analyzeCampaignProject', {
        project_id: campaign.project_id,
        campaign_id: campaign.id
      });

      const responseData = response?.data || response;

      if (responseData?.success) {
        alert(user?.language === 'nl' ?
        `Analyse voltooid! ${responseData.matched_count} kandidaten gematched.` :
        `Analysis complete! ${responseData.matched_count} candidates matched.`);

        await onCampaignUpdate(campaign.id, { status: 'active' });
      } else {
        throw new Error(responseData?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing:', error);
      alert(user?.language === 'nl' ? 'Fout bij analyseren' : 'Error analyzing');
      await onCampaignUpdate(campaign.id, { status: 'draft' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleActivate = async () => {
    if (window.confirm(user?.language === 'nl' ?
    'Weet je zeker dat je deze campaign wilt activeren? Kandidaten in de eerste bericht fase krijgen automatisch outreach taken.' :
    'Are you sure you want to activate this campaign? Candidates in the first message stage will automatically get outreach tasks.')) {
      try {
        await onCampaignUpdate(campaign.id, { status: 'active' });
        alert(user?.language === 'nl' ?
        'Campaign geactiveerd! Outreach taken worden nu gegenereerd.' :
        'Campaign activated! Outreach tasks are now being generated.');
      } catch (error) {
        console.error('Error activating campaign:', error);
        alert(user?.language === 'nl' ? 'Fout bij activeren' : 'Error activating');
      }
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm(user?.language === 'nl' ?
    'Weet je zeker dat je deze kandidaat uit de campaign wilt verwijderen?' :
    'Are you sure you want to remove this candidate from the campaign?')) {
      return;
    }

    try {
      const updatedMatches = campaign.matched_candidates.filter((m) => m.candidate_id !== candidateId);
      await onCampaignUpdate(campaign.id, { matched_candidates: updatedMatches });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert(user?.language === 'nl' ? 'Fout bij verwijderen' : 'Error deleting');
    }
  };

  // New handler for sending tasks to agent
  const handleSendToAgent = async (candidate) => {
    setSendingToAgent((prev) => ({ ...prev, [candidate.candidate_id]: true })); // Set sending state for this candidate

    try {
      let taskType = '';
      let messageContent = '';

      if (candidate.stage === 'first_message') {
        taskType = 'initial_outreach';
        messageContent = candidate.outreach_message || '';
      } else if (candidate.stage === 'follow_up_1') {
        taskType = 'follow_up_1';
        messageContent = candidate.follow_up_message || '';
      } else if (candidate.stage === 'follow_up_2') {
        taskType = 'follow_up_2';
        messageContent = candidate.follow_up_message_2 || '';
      } else if (candidate.stage === 'no_reply') {
        // Special case: create check_reply task
        taskType = 'check_reply';
        messageContent = user?.language === 'nl' ?
        'Controleer of deze kandidaat heeft gereageerd op LinkedIn. Type YES als er een reactie is, of NO als er geen reactie is.' :
        'Check if this candidate has replied on LinkedIn. Type YES if there is a reply, or NO if there is no reply.';
      } else {
        alert(user?.language === 'nl' ?
        'Onbekende fase voor het versturen naar agent.' :
        'Unknown stage for sending to agent.');
        return;
      }

      if (!messageContent && taskType !== 'check_reply') {
        alert(user?.language === 'nl' ?
        'Geen bericht beschikbaar voor deze fase' :
        'No message available for this stage');
        return;
      }

      const response = await base44.functions.invoke('createOutreachTask', {
        candidate_id: candidate.candidate_id,
        campaign_id: campaign.id,
        task_type: taskType,
        message_content: messageContent,
        metadata: {
          candidate_name: candidate.candidate_name,
          candidate_linkedin: candidate.candidate_linkedin,
          campaign_name: campaign.name,
          stage: candidate.stage
        }
      });

      if (response?.data?.success) {
        // Mark as sent to agent by adding to the set
        setSentToAgent((prev) => new Set(prev).add(candidate.candidate_id));
        // Removed the alert popup for silent success
      } else {
        throw new Error(response?.data?.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('[CampaignDetailPanel] Error sending to agent:', error);
      alert(user?.language === 'nl' ?
      '❌ Fout bij versturen naar agent' :
      '❌ Error sending to agent');
    } finally {
      setSendingToAgent((prev) => ({ ...prev, [candidate.candidate_id]: false })); // Reset sending state
    }
  };


  const project = projects?.find((p) => p.id === campaign.project_id);
  const candidatesInStage = (campaign.matched_candidates || []).filter((m) => (m.stage || 'first_message') === selectedStage);

  // Helper to get stage configuration for rendering
  const getStageConfig = (stageKey) => {
    const configs = {
      first_message: { icon: MessageSquare, label: getStageLabel('first_message') },
      follow_up_1: { icon: Clock, label: getStageLabel('follow_up_1') }, // Changed icon from TrendingUp to Clock
      follow_up_2: { icon: Clock, label: getStageLabel('follow_up_2') }, // Changed icon from Target to Clock
      no_reply: { icon: Zap, label: getStageLabel('no_reply') }, // Changed icon from Users to Zap
      connected: { icon: CheckCircle2, label: getStageLabel('connected') }
    };
    return configs[stageKey];
  };

  // This function replaces the CandidateCard mapping for the selected stage
  const renderPipelineStageContent = (stage, candidates) => {
    const stageConfig = getStageConfig(stage);
    if (!stageConfig) return null;

    const StageIcon = stageConfig.icon;

    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconWrapper icon={StageIcon} size={16} variant="default" />
              <CardTitle className="text-slate-50 text-base font-semibold tracking-tight">{stageConfig.label}</CardTitle>
              <Badge variant="outline" style={{ background: 'rgba(255,255,255,.05)' }} className="text-slate-50 px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                {candidates.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {candidates.map((candidate) => {
            const isSent = sentToAgent.has(candidate.candidate_id); // Check if task has been sent
            const isSending = sendingToAgent[candidate.candidate_id]; // Check if task is currently sending

            return (
              <div
                key={candidate.candidate_id}
                className="p-3 rounded-lg border transition-all hover:border-white/20"
                style={{ background: 'rgba(255,255,255,.03)', borderColor: 'rgba(255,255,255,.08)' }}>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1 truncate" style={{ color: 'var(--txt)' }}>
                      {candidate.candidate_name}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                      {candidate.candidate_job_title} @ {candidate.candidate_company}
                    </div>
                    {candidate.last_contact_at &&
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Laatst contact:' : 'Last contact:'} {new Date(candidate.last_contact_at).toLocaleDateString()}
                      </div>
                    }
                  </div>

                  <div className="flex flex-row gap-1 flex-shrink-0 items-center">
                    {/* LinkedIn button - Blue with white logo - LEFT SIDE */}
                    {candidate.candidate_linkedin &&
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(candidate.candidate_linkedin, '_blank')}
                      className="h-7 w-7 p-0"
                      style={{
                        background: '#0077B5',
                        border: '1px solid #0077B5',
                        color: '#FFFFFF'
                      }}>
                        <LinkedInIcon size={12} />
                      </Button>
                    }

                    {/* Agent button or checkmark - RIGHT SIDE */}
                    {(stage === 'first_message' || stage === 'follow_up_1' || stage === 'follow_up_2' || stage === 'no_reply') &&
                    <>
                        {isSent ?
                      <div
                        className="h-7 px-2 rounded flex items-center justify-center"
                        style={{
                          background: 'rgba(34,197,94,.12)',
                          border: '1px solid rgba(34,197,94,.3)'
                        }}>
                            <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
                          </div> :

                      <Button
                        size="sm"
                        onClick={() => handleSendToAgent(candidate)}
                        disabled={isSending}
                        className="h-7 px-2 text-xs"
                        style={{
                          background: 'rgba(239,68,68,.12)',
                          color: '#FFCCCB',
                          border: '1px solid rgba(239,68,68,.3)'
                        }}>
                            {isSending ?
                        <span className="text-xs">{user?.language === 'nl' ? 'Bezig...' : 'Sending...'}</span> :
                        <>
                                <IconWrapper icon={Send} size={12} variant="default" glow={false} className="mr-1" />
                                {stage === 'no_reply' ?
                          user?.language === 'nl' ? 'Check' : 'Check' :
                          user?.language === 'nl' ? 'Naar Agent' : 'To Agent'
                          }
                              </>
                        }
                          </Button>
                      }
                      </>
                    }
                  </div>
                </div>
              </div>);

          })}

          {candidates.length === 0 &&
          <div className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>
              {user?.language === 'nl' ? 'Geen kandidaten in deze fase' : 'No candidates in this stage'}
            </div>
          }
        </CardContent>
      </Card>);

  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle style={{ color: 'var(--txt)' }}>{campaign.name}</CardTitle>
                <Badge className={getStatusColor(campaign.status)}>
                  {getStatusLabel(campaign.status)}
                </Badge>
              </div>
              {campaign.description &&
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                  {campaign.description}
                </p>
              }
              {project &&
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                  <span className="font-medium">{user?.language === 'nl' ? 'Project:' : 'Project:'}</span> {project.title}
                </p>
              }
            </div>

            <div className="flex items-center gap-2">
              {/* Show activate button for draft campaigns with candidates */}
              {campaign.status === 'draft' && (campaign.matched_candidates || []).length > 0 &&
              <Button
                onClick={handleActivate}
                size="lg"
                className="gap-2"
                style={{
                  background: 'rgba(239,68,68,.12)',
                  color: '#FFCCCB',
                  border: '1px solid rgba(239,68,68,.3)',
                  padding: '8px 16px'
                }}>

                  <Zap className="w-4 h-4" />
                  {user?.language === 'nl' ? 'Activeer' : 'Activate'}
                </Button>
              }

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-50 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-10 w-10">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card">
                  {campaign.status === 'draft' &&
                  <>
                      <DropdownMenuItem onClick={handleAnalyze} disabled={isAnalyzing}>
                        <IconWrapper icon={Sparkles} size={16} variant="default" className="mr-2" />
                        {isAnalyzing ?
                      user?.language === 'nl' ? 'Analyseren...' : 'Analyzing...' :
                      user?.language === 'nl' ? 'Analyseer Kandidaten' : 'Analyze Candidates'}
                      </DropdownMenuItem>
                      {(campaign.matched_candidates || []).length > 0 &&
                    <DropdownMenuItem onClick={handleActivate}>
                          <IconWrapper icon={Zap} size={16} variant="default" className="mr-2" />
                          {user?.language === 'nl' ? 'Activeer Campaign' : 'Activate Campaign'}
                        </DropdownMenuItem>
                    }
                    </>
                  }
                  {campaign.status === 'active' &&
                  <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                      <IconWrapper icon={Pause} size={16} variant="default" className="mr-2" />
                      {user?.language === 'nl' ? 'Pauzeer Campaign' : 'Pause Campaign'}
                    </DropdownMenuItem>
                  }
                  {campaign.status === 'paused' &&
                  <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                      <IconWrapper icon={Play} size={16} variant="default" className="mr-2" />
                      {user?.language === 'nl' ? 'Hervat Campaign' : 'Resume Campaign'}
                    </DropdownMenuItem>
                  }
                  <DropdownMenuItem onClick={() => setShowStyleModal(true)}>
                    <IconWrapper icon={Edit} size={16} variant="default" className="mr-2" />
                    {user?.language === 'nl' ? 'Bewerk Schrijfstijl' : 'Edit Writing Style'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleStatusChange('archived')} className="text-yellow-400">
                    <IconWrapper icon={Archive} size={16} variant="default" className="mr-2" />
                    {user?.language === 'nl' ? 'Archiveer' : 'Archive'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCampaignDelete(campaign.id)} className="text-red-400">
                    <IconWrapper icon={Trash2} size={16} variant="accent" className="mr-2" />
                    {user?.language === 'nl' ? 'Verwijder' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Pipeline stages */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
            { key: 'first_message', icon: MessageSquare, label: getStageLabel('first_message') },
            { key: 'follow_up_1', icon: Clock, label: getStageLabel('follow_up_1') },
            { key: 'follow_up_2', icon: Clock, label: getStageLabel('follow_up_2') },
            { key: 'no_reply', icon: Zap, label: getStageLabel('no_reply') },
            { key: 'connected', icon: CheckCircle2, label: getStageLabel('connected') }].
            map((stage) => {
              const Icon = stage.icon;
              const count = pipelineCounts[stage.key] || 0;
              const isActive = selectedStage === stage.key;

              return (
                <Button
                  key={stage.key}
                  onClick={() => setSelectedStage(stage.key)}
                  variant={isActive ? "default" : "outline"}
                  className={`flex items-center gap-2 whitespace-nowrap ${isActive ? 'btn-primary' : 'btn-outline'}`}>

                    <IconWrapper icon={Icon} size={16} variant={isActive ? "accent" : "default"} />
                    <span>{stage.label}</span>
                    <Badge
                    variant="secondary"
                    style={{
                      background: isActive ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.05)',
                      color: isActive ? 'var(--txt)' : 'var(--muted)'
                    }}>

                      {count}
                    </Badge>
                  </Button>);

            })}
          </div>
        </CardContent>
      </Card>

      {/* Candidates in selected stage - now rendered by renderPipelineStageContent */}
      <div className="space-y-4">
        {renderPipelineStageContent(selectedStage, candidatesInStage)}
      </div>

      {/* Style modal */}
      {showStyleModal && (
        <CampaignOutreachStyleModal
          open={showStyleModal}
          onClose={() => setShowStyleModal(false)}
          onSave={handleStyleSave}
          campaign={campaign}
          user={user}
        />
      )}
    </div>
  );
}
