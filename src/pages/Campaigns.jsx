
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Campaign } from "@/api/entities";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { useTranslation } from "@/components/utils/translations";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Plus,
  Filter,
  TrendingUp,
  Users,
  MessageSquare,
  Target,
  RefreshCw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import IconWrapper from "../components/ui/IconWrapper";
import SyncAvatar from "../components/ui/SyncAvatar";
import CampaignCreateModal from "../components/campaigns/CampaignCreateModal";
import CampaignDetailModal from "../components/campaigns/CampaignDetailModal";
import CampaignSidebar from "../components/campaigns/CampaignSidebar";
import CampaignDetailPanel from "../components/campaigns/CampaignDetailPanel";
import { motion } from "framer-motion";
import { subscribeCampaignUpdated } from "@/components/utils/events";
import logger from "@/components/utils/logger";

const STORAGE_KEY = 'talentflow_last_campaign';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, _setStatusFilter] = useState("all");
  const [selectedStatsFilter, setSelectedStatsFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null); // This is for the CampaignDetailModal
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null); // This is for the sidebar and detail panel
  const [_showAddToCampaignModal, _setShowAddToCampaignModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const { t: _t } = useTranslation(user?.language || 'nl');

  // New useRef to prevent multiple simultaneous fetches
  const loadingRef = useRef(false);
  // New useRef to track if a campaign is currently being created, preventing re-fetches
  const creatingRef = useRef(false);
  // New useRef to keep track of selectedCampaignId's latest value
  const selectedCampaignIdRef = useRef(selectedCampaignId);

  // Update the ref whenever selectedCampaignId changes
  useEffect(() => {
    selectedCampaignIdRef.current = selectedCampaignId;
  }, [selectedCampaignId]);

  // Helper to get stored campaign ID
  const getStoredCampaignId = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      logger.error("Failed to read from localStorage", e);
      return null;
    }
  }, []);

  // Helper to store campaign ID
  const storeCampaignId = useCallback((id) => {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      logger.error("Failed to write to localStorage", e);
    }
  }, []);

  // helper: unique by id
  const uniqueById = (arr = []) => {
    const seen = new Set();
    return arr.filter((c) => {
      if (!c || !c.id) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  };

  // Open a specific campaign by id and hydrate from server to avoid stale selection
  const openCampaign = useCallback(async (id) => {
    if (!id) {
      setSelectedCampaignId(null);
      setSelectedCampaign(null);
      return;
    }
    try {
      const freshArr = await Campaign.filter({ id });
      const fresh = freshArr?.[0];
      if (fresh) {
        setSelectedCampaignId(id);
        setSelectedCampaign({
          ...fresh,
          matched_candidates: Array.isArray(fresh.matched_candidates) ? fresh.matched_candidates : []
        });
        logger.info(`Campaign opened: ${id}`, { campaignName: fresh.name });
      } else {
        // If the campaign is not found, clear selection
        setSelectedCampaignId(null);
        setSelectedCampaign(null);
        logger.warn(`Attempted to open non-existent campaign: ${id}`);
      }
    } catch (e) {
      logger.error("Error opening campaign:", e);
      setSelectedCampaignId(null);
      setSelectedCampaign(null);
    }
  }, []);

  // Fetch campaigns: normalize and DO NOT auto select first
  const fetchCampaignsAndRelatedData = useCallback(async () => {
    if (loadingRef.current || creatingRef.current) {
      return; // Already loading or creating, skipping fetch
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const userData = await User.me();
      setUser(userData);

      // Removed organizationFilter variable, using directly in filter calls
      const [allCampaignsRaw, allProjects] = await Promise.all([
        Campaign.filter({ organization_id: userData.organization_id }, "-created_date", 100),
        Project.filter({ organization_id: userData.organization_id }, "-created_date", 100)
      ]);

      // Normalize matched_candidates to always be an array and remove duplicates
      const allCampaigns = uniqueById(allCampaignsRaw).map(c => ({
        ...c,
        matched_candidates: Array.isArray(c.matched_candidates) ? c.matched_candidates : []
      }));

      setCampaigns(allCampaigns);
      setProjects(allProjects);
      logger.info('Campaigns loaded', { count: allCampaigns.length });

      // Auto-select campaign if none selected
      if (!selectedCampaignIdRef.current && allCampaigns.length > 0) {
        const storedId = getStoredCampaignId();
        let campaignToSelect = null;

        // Try to select stored campaign
        if (storedId) {
          campaignToSelect = allCampaigns.find(c => c.id === storedId);
        }

        // If stored campaign not found or invalid, select the first campaign
        if (!campaignToSelect) {
          campaignToSelect = allCampaigns[0];
        }

        if (campaignToSelect) {
          logger.info('Auto-selecting campaign:', campaignToSelect.id);
          setSelectedCampaignId(campaignToSelect.id);
          storeCampaignId(campaignToSelect.id);
        }
      }

    } catch (error) {
      logger.error('Error loading campaigns', error); // Simplified log message
      setError(error.message || (user?.language === 'nl' ? 'Fout bij het laden' : 'Failed to load'));
      setCampaigns([]);
      setProjects([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.language, getStoredCampaignId, storeCampaignId]);

  // Initial data load when component mounts - only call on mount
  useEffect(() => {
    fetchCampaignsAndRelatedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selectedCampaign in sync ONLY by id (no fallback to first campaign)
  // This useEffect ensures the CampaignDetailModal and Panel always show the correct campaign
  useEffect(() => {
    if (!selectedCampaignId) {
      setSelectedCampaign(null); // Clear selected campaign if ID is null
      return;
    }
    const match = campaigns.find(c => c.id === selectedCampaignId);
    if (match) {
      setSelectedCampaign(match);
    } else {
      // If the currently selected ID doesn't exist in the fetched campaigns, clear selection.
      // This can happen if the selected campaign was deleted by another user/process.
      setSelectedCampaign(null);
      setSelectedCampaignId(null); // Also clear the ID
      storeCampaignId(null); // Clear stored ID as well
      logger.warn(`Selected campaign ID ${selectedCampaignId} not found in current campaign list. Clearing selection.`);
    }
  }, [campaigns, selectedCampaignId, storeCampaignId]);


  // Helper to refresh a single campaign by id and update local state only
  const refreshSelectedCampaignById = useCallback(async (id) => {
    try {
      const freshArr = await Campaign.filter({ id });
      const fresh = freshArr?.[0];
      if (!fresh) {
        logger.warn(`Campaign ${id} not found during refresh`); // Simplified log message
        return;
      }
      const normalized = {
        ...fresh,
        matched_candidates: Array.isArray(fresh.matched_candidates) ? fresh.matched_candidates : []
      };
      setCampaigns(prev => uniqueById(prev.map(c => c.id === id ? normalized : c))); // Simplified setCampaigns logic as per outline
      logger.info(`Campaign ${id} refreshed`); // Simplified log message
    } catch (e) {
      logger.error(`Failed refreshing campaign ${id}`, e); // Simplified log message
    }
    // Dependency array updated as per outline, removing setters as they are stable
  }, []);

  // Subscribe to updates coming from AgentBacklog (and other tabs)
  useEffect(() => {
    const unsubscribe = subscribeCampaignUpdated((id) => {
      if (!id) return;
      // Only refresh if it's the currently selected campaign or exists in list
      const shouldRefresh = selectedCampaignId === id || campaigns.some(c => c.id === id);
      if (shouldRefresh) {
        logger.info(`Received campaign update event for ID: ${id}. Refreshing...`);
        refreshSelectedCampaignById(id);
      } else {
        logger.debug(`Received campaign update event for ID: ${id}, but not relevant for current view.`);
      }
    });
    return unsubscribe;
  }, [selectedCampaignId, campaigns, refreshSelectedCampaignById]);

  // Filtering campaigns based on status filter
  useEffect(() => {
    let filtered = [...campaigns];

    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, statusFilter]);

  // Callback when a campaign is created (from CampaignCreateModal)
  const handleCampaignCreated = useCallback(async (created) => {
    if (!created?.id) {
      logger.warn('handleCampaignCreated called without a valid created campaign ID.');
      return;
    }
    creatingRef.current = true;
    setShowCreateModal(false); // Close modal

    // Put it in the list without duplicates
    setCampaigns(prev => uniqueById([created, ...prev]).map(c => ({
      ...c,
      matched_candidates: Array.isArray(c.matched_candidates) ? c.matched_candidates : []
    })));
    // Open exactly the one just created
    await openCampaign(created.id);
    storeCampaignId(created.id); // Persist newly created campaign
    creatingRef.current = false;
    logger.info(`New campaign created and opened: ${created.id}`);
  }, [openCampaign, storeCampaignId]);

  const _handleViewCampaign = (campaign) => {
    setSelectedCampaignId(campaign.id); // Set the ID, the useEffect will handle `setSelectedCampaign`
    storeCampaignId(campaign.id); // Persist viewed campaign
    logger.info(`Viewing campaign: ${campaign.id}`);
  };

  const handleCampaignUpdate = async (campaignId, updates) => { // Renamed from handleUpdateCampaign
    try {
      await Campaign.update(campaignId, updates);

      // Optimistically update local state with normalization
      setCampaigns(prev => prev.map(c => {
        if (c.id === campaignId) {
          const updatedC = { ...c, ...updates };
          return {
            ...updatedC,
            matched_candidates: Array.isArray(updatedC.matched_candidates) ? updatedC.matched_candidates : []
          };
        }
        // Ensure other campaigns in 'prev' are also normalized
        return {
          ...c,
          matched_candidates: Array.isArray(c.matched_candidates) ? c.matched_candidates : []
        };
      }));
      logger.info(`Campaign ${campaignId} updated successfully with:`, updates);

      // No need to explicitly update selectedCampaign here, the useEffect will handle it
      // based on selectedCampaignId and the updated campaigns list.

      // Do NOT call fetchCampaignsAndRelatedData() here — prevents unexpected re-renders/popups
    } catch (error) {
      logger.error(`Error updating campaign ${campaignId}:`, error);
      throw error; // Propagate error for calling component to handle
    }
  };

  const handleRenameCampaign = async (campaignId, newName) => {
    try {
      await Campaign.update(campaignId, { name: newName });
      logger.info(`Campaign ${campaignId} renamed to: ${newName}`);
      fetchCampaignsAndRelatedData(); // Re-fetch to ensure the name update is reflected and consistent
    } catch (error) {
      logger.error(`Error renaming campaign ${campaignId}:`, error);
      alert(user?.language === 'nl' ? 'Fout bij hernoemen campaign' : 'Error renaming campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm(user?.language === 'nl'
      ? 'Weet je zeker dat je deze campaign wilt verwijderen?'
      : 'Are you sure you want to delete this campaign?')) {
      try {
        await Campaign.delete(campaignId);
        setCampaigns(prev => prev.filter(c => c.id !== campaignId));
        if (selectedCampaignId === campaignId) {
          const remaining = campaigns.filter(c => c.id !== campaignId); // Following outline, using 'campaigns' state directly here.
          const newSelectedId = remaining.length > 0 ? remaining[0].id : null;
          setSelectedCampaignId(newSelectedId);
          storeCampaignId(newSelectedId); // Clear or update stored ID
        }
        logger.info(`Campaign ${campaignId} deleted`); // Simplified log message
      } catch (error) {
        logger.error(`Error deleting campaign ${campaignId}`, error); // Simplified log message
        alert(user?.language === 'nl' ? 'Fout bij verwijderen' : 'Error deleting'); // Simplified alert message
      }
    }
  };

  const _handleAddCandidateToCampaign = async (campaignId, _outreachMessage) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        logger.warn(`Attempted to add candidate to non-existent campaign: ${campaignId}`);
        return;
      }
      if (!selectedCandidate) {
        logger.warn('handleAddCandidateToCampaign called without a selected candidate.');
        return;
      }

      // This should already be normalized to an array due to the changes above, but a safety check
      const existingMatches = Array.isArray(campaign.matched_candidates) ? campaign.matched_candidates : [];

      // Check if candidate already exists
      const exists = existingMatches.some(m => m.candidate_id === selectedCandidate.id);
      if (exists) {
        alert(user?.language === 'nl'
          ? 'Deze kandidaat zit al in deze campaign'
          : 'This candidate is already in this campaign');
        logger.warn(`Candidate ${selectedCandidate.id} already exists in campaign ${campaignId}.`);
        return;
      }

      // Add new match with generated outreach message
      const newMatch = {
        candidate_id: selectedCandidate.id,
        match_score: selectedCandidate.intelligence_score || 50,
        match_reasons: [
          user?.language === 'nl' ? 'Handmatig toegevoegd' : 'Manually added'
        ],
        candidate_name: `${selectedCandidate.first_name} ${selectedCandidate.last_name}`,
        candidate_job_title: selectedCandidate.job_title,
        candidate_company: selectedCandidate.company_name,
        matched_at: new Date().toISOString(),
        outreach_message: _outreachMessage,
        stage: 'queue'
      };

      const updatedMatches = [...existingMatches, newMatch];

      await Campaign.update(campaignId, {
        matched_candidates: updatedMatches
      });

      // Reload data
      await fetchCampaignsAndRelatedData();
      _setShowAddToCampaignModal(false);
      setSelectedCandidate(null);
      logger.info(`Candidate ${selectedCandidate.id} added to campaign ${campaignId}.`);
    } catch (error) {
      logger.error(`Error adding candidate ${selectedCandidate?.id} to campaign ${campaignId}:`, error);
      alert(user?.language === 'nl'
        ? 'Fout bij toevoegen aan campaign'
        : 'Error adding to campaign');
    }
  };


  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-500/10 border-gray-500/30 text-gray-400",
      active: "bg-green-500/10 border-green-500/30 text-green-400",
      paused: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
      completed: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      archived: "bg-gray-500/10 border-gray-500/30 text-gray-500"
    };
    return colors[status] || colors.draft;
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: user?.language === 'nl' ? 'Concept' : 'Draft',
      active: user?.language === 'nl' ? 'Actief' : 'Active',
      paused: user?.language === 'nl' ? 'Gepauzeerd' : 'Paused',
      completed: user?.language === 'nl' ? 'Voltooid' : 'Completed',
      archived: user?.language === 'nl' ? 'Gearchiveerd' : 'Archived'
    };
    return labels[status] || status;
  };

  const handleSelectCampaign = (c) => {
    setSelectedCampaignId(c.id);
    storeCampaignId(c.id);
  };

  const handleOpenCreate = () => {
    setShowCreateModal(true);
  };

  const getAggregatedStats = () => {
    const campaignsToAggregate = selectedStatsFilter === "all"
      ? filteredCampaigns // Aggregate all campaigns currently filtered by status (if any)
      : filteredCampaigns.filter(c => c.id === selectedStatsFilter); // Aggregate only the selected campaign for stats

    const stats = campaignsToAggregate.reduce((acc, campaign) => {
      const campStats = campaign.stats || {}; // Ensure stats object exists
      return {
        total_sent: (acc.total_sent || 0) + (campStats.total_sent || 0),
        total_responses: (acc.total_responses || 0) + (campStats.total_responses || 0),
        total_interested: (acc.total_interested || 0) + (campStats.total_interested || 0),
      };
    }, {});

    // Calculate average response rate, only considering campaigns that actually sent messages
    const campaignsWithSent = campaignsToAggregate.filter(c => (c.stats?.total_sent || 0) > 0);
    const avgResponseRate = campaignsWithSent.length > 0
      ? campaignsWithSent.reduce((sum, c) => sum + (c.stats?.response_rate || 0), 0) / campaignsWithSent.length
      : 0;

    return { ...stats, response_rate: Math.round(avgResponseRate) };
  };


  const currentSelectedCampaignForPanel = campaigns.find(c => c.id === selectedCampaignId) || null;
  const aggregatedStats = getAggregatedStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>
            {user?.language === 'nl' ? 'Campaigns laden...' : 'Loading campaigns...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
          }
        `}</style>
        <Card className="glass-card max-w-md">
          <CardContent className="p-8 text-center">
            <IconWrapper icon={Megaphone} size={48} variant="muted" glow={false} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
              {user?.language === 'nl' ? 'Fout bij laden' : 'Error loading'}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              {error}
            </p>
            <Button onClick={fetchCampaignsAndRelatedData} className="btn-primary">
              <IconWrapper icon={RefreshCw} size={18} variant="accent" className="mr-2" />
              {user?.language === 'nl' ? 'Opnieuw proberen' : 'Try again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
          border-color: rgba(239,68,68,.4) !important;
        }
      `}</style>

      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <IconWrapper icon={Megaphone} size={32} variant="accent" glow={true} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
                {user?.language === 'nl' ? 'Outreach Campaigns' : 'Outreach Campaigns'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl'
                  ? 'Beheer je outreach campaigns en bereik kandidaten effectief'
                  : 'Manage your outreach campaigns and reach candidates effectively'}
              </p>
            </div>
          </div>

          <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
            {user?.language === 'nl' ? 'Nieuwe Campaign' : 'New Campaign'}
          </Button>
        </motion.div>

        {/* Statistics Bar and Campaign Selector */}
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Statistics Display */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IconWrapper icon={MessageSquare} size={12} variant="muted" />
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {user?.language === 'nl' ? 'Verzonden' : 'Sent'}
                    </span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--txt)' }}>
                    {aggregatedStats.total_sent || 0}
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IconWrapper icon={TrendingUp} size={12} variant="muted" />
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {user?.language === 'nl' ? 'Response Rate' : 'Response Rate'}
                    </span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--txt)' }}>
                    {aggregatedStats.response_rate || 0}%
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IconWrapper icon={Users} size={12} variant="muted" />
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {user?.language === 'nl' ? 'Reacties' : 'Responses'}
                    </span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--txt)' }}>
                    {aggregatedStats.total_responses || 0}
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IconWrapper icon={Target} size={12} variant="muted" />
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {user?.language === 'nl' ? 'Geïnteresseerd' : 'Interested'}
                    </span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--txt)' }}>
                    {aggregatedStats.total_interested || 0}
                  </p>
                </div>
              </div>

              {/* Campaign Selector */}
              <div className="w-full md:w-[240px]">
                <Select value={selectedStatsFilter} onValueChange={setSelectedStatsFilter}>
                  <SelectTrigger className="bg-transparent border text-base h-10" style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}>
                    <div className="flex items-center gap-2">
                      <IconWrapper icon={Filter} size={16} variant="muted" />
                      <SelectValue placeholder={user?.language === 'nl' ? 'Alle Campagnes' : 'All Campaigns'} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)' }}>
                    <SelectItem value="all" style={{ color: 'var(--txt)' }}>
                      {user?.language === 'nl' ? 'Alle Campagnes' : 'All Campaigns'}
                    </SelectItem>
                    {filteredCampaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id} style={{ color: 'var(--txt)' }}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List or Two-Column Layout */}
        {filteredCampaigns.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <IconWrapper icon={Megaphone} size={48} variant="muted" glow={false} />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  {user?.language === 'nl' ? 'Geen campaigns gevonden' : 'No campaigns found'}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {user?.language === 'nl'
                    ? 'Start je eerste outreach campaign om kandidaten te bereiken'
                    : 'Start your first outreach campaign to reach candidates'}
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
                  {user?.language === 'nl' ? 'Maak Campaign' : 'Create Campaign'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-6">
            <CampaignSidebar
              campaigns={filteredCampaigns}
              selectedCampaignId={selectedCampaignId}
              onSelect={handleSelectCampaign}
              onDelete={handleDeleteCampaign}
              onRename={handleRenameCampaign}
              onCreate={handleOpenCreate}
              user={user}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
            />
            <CampaignDetailPanel
              campaign={currentSelectedCampaignForPanel}
              projects={projects}
              user={user}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              onCampaignUpdate={handleCampaignUpdate} // Updated function name
              onCampaignDelete={handleDeleteCampaign}
              // Potential prop to pass handleAddCandidateToCampaign if this panel needs to trigger it
              // onAddCandidate={handleAddCandidateToCampaign}
              // For demonstration purposes, if candidate selection happens outside, then selectedCandidate will be available via state.
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <CampaignCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCampaignCreated}
          projects={projects}
          user={user}
        />
      )}

      {/* Detail Modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          open={!!selectedCampaign}
          onClose={() => {
            setSelectedCampaignId(null);
            storeCampaignId(null); // Clear stored ID when modal is closed
          }} // Close by setting ID to null
          campaign={selectedCampaign}
          onUpdate={handleCampaignUpdate} // Updated function name
          projects={projects}
          user={user}
        />
      )}

      {/*
        NOTE: The outline implies there would be a modal for adding candidates to a campaign.
        This modal (`setShowAddToCampaignModal`) and the logic to select a candidate
        (`setSelectedCandidate`) are not fully provided in the outline but are essential
        for `handleAddCandidateToCampaign` to be invoked.
        A placeholder for such a modal might look like this:
      */}
      {/* {showAddToCampaignModal && selectedCandidate && (
        <AddToCampaignModal
          open={showAddToCampaignModal}
          onClose={() => setShowAddToCampaignModal(false)}
          candidate={selectedCandidate}
          campaigns={filteredCampaigns}
          onAdd={handleAddCandidateToCampaign}
          user={user}
        />
      )} */}
    </div>
  );
}
