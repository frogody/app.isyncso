import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  MapPin,
  Briefcase,
  Check,
  Loader2,
  CreditCard,
  Sparkles,
  Target,
  MessageSquare,
  Brain,
  BarChart3,
  Mail,
  Linkedin,
  Award,
  Lock,
  ArrowRight,
  FileText,
  Rocket,
  Zap,
  TrendingUp,
  Clock,
  Building2,
  Phone,
  ExternalLink,
  RefreshCw,
  Bell,
  Megaphone,
  PartyPopper,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  ChevronDown,
  Factory,
  Globe,
  Hash,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// ============================================================================
// PURCHASE DIALOG
// ============================================================================
const PurchaseDialog = ({ isOpen, onClose, nest, onPurchase, user }) => {
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [exclusionPreview, setExclusionPreview] = useState(null);
  const [checkingExclusions, setCheckingExclusions] = useState(false);
  const itemCount = nest?.item_count || 0;
  const price = parseFloat(nest?.price) || 0;

  // Check for exclusions when dialog opens
  useEffect(() => {
    if (!isOpen || !user?.organization_id || !nest?.id) {
      setExclusionPreview(null);
      return;
    }
    (async () => {
      setCheckingExclusions(true);
      try {
        // Get nest items with company names
        const { data: nestItems } = await supabase
          .from('nest_items')
          .select('candidate_id, candidates(company_name)')
          .eq('nest_id', nest.id);

        if (!nestItems?.length) { setCheckingExclusions(false); return; }

        // Get excluded clients for this org
        const { data: excludedClients } = await supabase
          .from('prospects')
          .select('id, company, company_aliases')
          .eq('organization_id', user.organization_id)
          .eq('exclude_candidates', true)
          .eq('is_recruitment_client', true);

        if (!excludedClients?.length) { setCheckingExclusions(false); return; }

        // Check each candidate's company against excluded clients using the DB function
        const companyNames = [...new Set(
          nestItems.map(i => i.candidates?.company_name).filter(Boolean)
        )];

        const exclusionMap = {}; // client_company -> count
        for (const companyName of companyNames) {
          const { data: match } = await supabase.rpc('match_excluded_client', {
            p_company_name: companyName,
            p_organization_id: user.organization_id,
          });
          if (match?.length > 0) {
            const clientCompany = match[0].client_company;
            const count = nestItems.filter(i => i.candidates?.company_name === companyName).length;
            exclusionMap[clientCompany] = (exclusionMap[clientCompany] || 0) + count;
          }
        }

        const totalExcluded = Object.values(exclusionMap).reduce((s, c) => s + c, 0);
        if (totalExcluded > 0) {
          setExclusionPreview({
            total: totalExcluded,
            byClient: exclusionMap,
            activeCount: itemCount - totalExcluded,
          });
        }
      } catch (err) {
        console.error('Exclusion preview error:', err);
      } finally {
        setCheckingExclusions(false);
      }
    })();
  }, [isOpen, user?.organization_id, nest?.id]);

  const handlePurchase = async () => {
    if (!user?.id || !user?.company_id) {
      setError('Please sign in to purchase');
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      // 1. Check if already purchased
      const { data: existingPurchase } = await supabase
        .from('nest_purchases')
        .select('id')
        .eq('nest_id', nest.id)
        .eq('organization_id', user.organization_id)
        .eq('status', 'completed')
        .single();

      if (existingPurchase) {
        setError('You have already purchased this nest');
        setPurchasing(false);
        return;
      }

      // 2. Create purchase record
      const completedAt = new Date().toISOString();
      const { data: purchase, error: purchaseError } = await supabase
        .from('nest_purchases')
        .insert({
          nest_id: nest.id,
          organization_id: user.organization_id,
          purchased_by: user.id,
          price_paid: price,
          currency: 'EUR',
          status: 'completed', // For now, instant completion (add Stripe later)
          items_copied: false,
          completed_at: completedAt,
          last_synced_at: completedAt, // Track initial sync timestamp
        })
        .select()
        .single();

      if (purchaseError) {
        console.error('Purchase error:', purchaseError);
        setError('Failed to complete purchase. Please try again.');
        setPurchasing(false);
        return;
      }

      // 3. Copy nest items (candidates) to buyer's organization
      // Get all nest items with their candidate data
      const { data: nestItems, error: itemsError } = await supabase
        .from('nest_items')
        .select(`
          candidate_id,
          candidates (*)
        `)
        .eq('nest_id', nest.id);

      if (itemsError) {
        console.error('Error fetching nest items:', itemsError);
      } else if (nestItems && nestItems.length > 0) {
        // Get existing candidates in the organization to avoid duplicates
        const { data: existingCandidates } = await supabase
          .from('candidates')
          .select('email, linkedin_profile')
          .eq('organization_id', user.organization_id);

        const existingEmails = new Set(
          existingCandidates?.map(c => c.email?.toLowerCase()).filter(Boolean) || []
        );
        const existingLinkedins = new Set(
          existingCandidates?.map(c => c.linkedin_profile?.toLowerCase()).filter(Boolean) || []
        );

        // Check each candidate for exclusion before copying
        const deduped = nestItems
          .filter(item => item.candidate_id && item.candidates)
          .filter(item => {
            const email = item.candidates.email?.toLowerCase();
            const linkedin = item.candidates.linkedin_profile?.toLowerCase();
            if (email && existingEmails.has(email)) return false;
            if (linkedin && existingLinkedins.has(linkedin)) return false;
            return true;
          });

        // Build exclusion map for each candidate's company
        const exclusionResults = {};
        const uniqueCompanies = [...new Set(deduped.map(i => i.candidates.company_name).filter(Boolean))];
        for (const companyName of uniqueCompanies) {
          const { data: match } = await supabase.rpc('match_excluded_client', {
            p_company_name: companyName,
            p_organization_id: user.organization_id,
          });
          if (match?.length > 0) {
            exclusionResults[companyName] = match[0];
          }
        }

        const activeCandidates = [];
        const excludedCandidates = [];

        for (const item of deduped) {
          const { id, created_date, updated_date, organization_id, ...candidateData } = item.candidates;
          const base = {
            ...candidateData,
            organization_id: user.organization_id,
            source: 'nest_purchase',
            import_source: `nest:${nest.id}`,
          };
          const match = exclusionResults[candidateData.company_name];
          if (match) {
            excludedCandidates.push({
              ...base,
              excluded_reason: 'client_company_match',
              excluded_client_id: match.client_id,
              excluded_at: new Date().toISOString(),
            });
          } else {
            activeCandidates.push(base);
          }
        }

        // Insert all candidates (active + excluded)
        const allToInsert = [...activeCandidates, ...excludedCandidates];
        if (allToInsert.length > 0) {
          const { data: insertedCandidates, error: copyError } = await supabase
            .from('candidates')
            .insert(allToInsert)
            .select('id, excluded_reason');

          if (copyError) {
            console.error('Error copying candidates:', copyError);
          } else if (insertedCandidates && insertedCandidates.length > 0) {
            // Only queue NON-excluded candidates for intel
            const activeInserted = insertedCandidates.filter(c => !c.excluded_reason);
            if (activeInserted.length > 0) {
              const queueItems = activeInserted.map(candidate => ({
                candidate_id: candidate.id,
                organization_id: user.organization_id,
                source: 'nest_purchase',
                priority: 2,
                status: 'pending',
              }));

              const { error: queueError } = await supabase
                .from('sync_intel_queue')
                .insert(queueItems);

              if (queueError) {
                console.error('Error queueing SYNC Intel:', queueError);
              } else {
                console.log(`Queued ${activeInserted.length} candidates for SYNC Intel (${insertedCandidates.length - activeInserted.length} excluded)`);
                fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-sync-intel-queue`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({ triggered_by: 'nest_purchase' }),
                }).catch(() => {});
              }
            }
          }
        }

        // Mark items as copied
        await supabase
          .from('nest_purchases')
          .update({ items_copied: true })
          .eq('id', purchase.id);
      }

      // 4. Success!
      setPurchasing(false);
      onPurchase(purchase);
    } catch (err) {
      console.error('Purchase error:', err);
      setError('An unexpected error occurred');
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Purchase Nest</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Unlock full access to {itemCount.toLocaleString()} {nest?.nest_type === 'companies' ? 'companies' : 'candidate profiles'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">Nest</span>
            <span className="text-white">{nest?.name}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">{nest?.nest_type === 'companies' ? 'Companies' : 'Candidates'}</span>
            <span className="text-white">{itemCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-white font-medium">Total</span>
            <span className="text-2xl font-semibold text-white">€{price.toFixed(0)}</span>
          </div>

          <div className="space-y-3 pt-4">
            <p className="text-sm text-zinc-400 font-medium">What's included:</p>
            {[
              "Full profile access with contact details",
              "SYNC Intel auto-matching to your roles",
              "AI-generated personalized outreach",
              "Job satisfaction & urgency insights",
              "Export to CSV anytime",
              "30-day data freshness guarantee",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {/* Exclusion Preview */}
          {checkingExclusions && (
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking for client exclusions...
            </div>
          )}
          {exclusionPreview && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Client Exclusions</span>
              </div>
              <p className="text-sm text-zinc-300 mb-2">
                {exclusionPreview.total} candidate{exclusionPreview.total !== 1 ? 's' : ''} work for your excluded clients and will be ruled out:
              </p>
              <div className="space-y-1 mb-2">
                {Object.entries(exclusionPreview.byClient).map(([client, count]) => (
                  <div key={client} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">• {client}</span>
                    <span className="text-amber-400 font-medium">{count}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-zinc-400">
                You will receive <span className="text-white font-medium">{exclusionPreview.activeCount}</span> active candidates.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={purchasing} className="bg-red-500 hover:bg-red-600">
            {purchasing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" />Purchase for €{price.toFixed(0)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function TalentNestDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [nest, setNest] = useState(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const nestId = searchParams.get("id");

  // Fetch nest from database
  useEffect(() => {
    async function fetchNest() {
      if (!nestId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('nests')
          .select('*')
          .eq('id', nestId)
          .single();

        if (error) {
          console.error('Error fetching nest:', error);
          toast.error('Failed to load nest');
        } else {
          setNest(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNest();
  }, [nestId]);

  // Track if user has purchased this nest
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [purchase, setPurchase] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check if user already purchased this nest
  useEffect(() => {
    async function checkPurchase() {
      if (!user?.company_id || !nestId) {
        setCheckingPurchase(false);
        return;
      }

      const { data } = await supabase
        .from('nest_purchases')
        .select('id, last_synced_at, completed_at')
        .eq('nest_id', nestId)
        .eq('organization_id', user.organization_id)
        .eq('status', 'completed')
        .maybeSingle();

      setHasPurchased(!!data);
      setPurchase(data);
      setCheckingPurchase(false);
    }
    checkPurchase();
  }, [user?.company_id, nestId]);

  // Check if nest has updates available
  useEffect(() => {
    if (hasPurchased && purchase && nest) {
      const lastSynced = new Date(purchase.last_synced_at || purchase.completed_at);
      const nestUpdated = new Date(nest.updated_at);
      // If nest was updated after last sync, there's an update available
      setHasUpdate(nestUpdated > lastSynced);
    }
  }, [hasPurchased, purchase, nest]);

  // Function to refresh/sync nest data
  const handleRefreshNest = async () => {
    if (!purchase || !user?.organization_id || isSyncing) return;

    setIsSyncing(true);
    try {
      // Get all nest items with their candidate data
      const { data: nestItems, error: itemsError } = await supabase
        .from('nest_items')
        .select(`
          candidate_id,
          candidates (*)
        `)
        .eq('nest_id', nestId);

      if (itemsError) {
        console.error('Error fetching nest items:', itemsError);
        toast.error('Failed to fetch updated candidates');
        return;
      }

      if (!nestItems || nestItems.length === 0) {
        toast.info('No candidates to sync');
        return;
      }

      // Get existing candidates in the organization to avoid duplicates
      const { data: existingCandidates } = await supabase
        .from('candidates')
        .select('email, linkedin_profile')
        .eq('organization_id', user.organization_id)
        .eq('source', 'nest_purchase');

      const existingEmails = new Set(
        existingCandidates?.map(c => c.email?.toLowerCase()).filter(Boolean) || []
      );
      const existingLinkedins = new Set(
        existingCandidates?.map(c => c.linkedin_profile?.toLowerCase()).filter(Boolean) || []
      );

      // Filter to only new candidates
      const candidatesToCopy = nestItems
        .filter(item => item.candidate_id && item.candidates)
        .filter(item => {
          const email = item.candidates.email?.toLowerCase();
          const linkedin = item.candidates.linkedin_profile?.toLowerCase();
          // Skip if already exists by email or linkedin
          if (email && existingEmails.has(email)) return false;
          if (linkedin && existingLinkedins.has(linkedin)) return false;
          return true;
        })
        .map(item => {
          const { id, created_date, updated_date, organization_id, ...candidateData } = item.candidates;
          return {
            ...candidateData,
            organization_id: user.organization_id,
            source: 'nest_purchase',
            import_source: `nest:${nest.id}`,
          };
        });

      let addedCount = 0;
      if (candidatesToCopy.length > 0) {
        const { error: copyError, data: inserted } = await supabase
          .from('candidates')
          .insert(candidatesToCopy)
          .select('id');

        if (copyError) {
          console.error('Error copying candidates:', copyError);
          toast.error('Failed to sync some candidates');
        } else {
          addedCount = inserted?.length || candidatesToCopy.length;

          // Queue newly synced candidates for SYNC Intel (FREE for nest purchases)
          if (inserted && inserted.length > 0) {
            const queueItems = inserted.map(candidate => ({
              candidate_id: candidate.id,
              organization_id: user.organization_id,
              source: 'nest_purchase',
              priority: 2,
              status: 'pending',
            }));

            const { error: queueError } = await supabase
              .from('sync_intel_queue')
              .insert(queueItems);

            if (queueError) {
              console.error('Error queueing SYNC Intel:', queueError);
            } else {
              console.log(`Queued ${inserted.length} new candidates for SYNC Intel`);
            }
          }
        }
      }

      // Update the purchase record's last_synced_at
      await supabase
        .from('nest_purchases')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', purchase.id);

      // Update local state
      setPurchase({ ...purchase, last_synced_at: new Date().toISOString() });
      setHasUpdate(false);

      if (addedCount > 0) {
        toast.success(`Synced ${addedCount} new candidates`, {
          description: 'New candidates have been added to your talent pool',
        });
      } else {
        toast.info('Already up to date', {
          description: 'No new candidates to sync',
        });
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Failed to sync nest data');
    } finally {
      setIsSyncing(false);
    }
  };

  // Ruled out candidates
  const [ruledOut, setRuledOut] = useState([]);
  const [ruledOutExpanded, setRuledOutExpanded] = useState(false);
  const [loadingRuledOut, setLoadingRuledOut] = useState(false);

  // Fetch ruled out candidates after purchase
  useEffect(() => {
    if (!hasPurchased || !user?.organization_id || !nestId) return;
    (async () => {
      setLoadingRuledOut(true);
      const { data } = await supabase
        .from('candidates')
        .select('id, full_name, company_name, job_title, excluded_reason, excluded_client_id, excluded_at, prospects:excluded_client_id(company)')
        .eq('organization_id', user.organization_id)
        .eq('import_source', `nest:${nestId}`)
        .not('excluded_reason', 'is', null)
        .order('excluded_at', { ascending: false });
      setRuledOut(data || []);
      setLoadingRuledOut(false);
    })();
  }, [hasPurchased, user?.organization_id, nestId]);

  const handleRecoverCandidate = async (candidateId) => {
    const { error } = await supabase
      .from('candidates')
      .update({ excluded_reason: null, excluded_client_id: null, excluded_at: null })
      .eq('id', candidateId);
    if (error) { toast.error('Failed to recover candidate'); return; }
    setRuledOut(prev => prev.filter(c => c.id !== candidateId));
    toast.success('Candidate recovered');
  };

  const handleRecoverAll = async () => {
    const ids = ruledOut.map(c => c.id);
    const { error } = await supabase
      .from('candidates')
      .update({ excluded_reason: null, excluded_client_id: null, excluded_at: null })
      .in('id', ids);
    if (error) { toast.error('Failed to recover candidates'); return; }
    setRuledOut([]);
    toast.success(`${ids.length} candidates recovered`);
  };

  // State for post-purchase success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [purchasedNestInfo, setPurchasedNestInfo] = useState(null);

  const handlePurchase = (purchaseRecord) => {
    setShowPurchaseDialog(false);
    setHasPurchased(true);
    setPurchase({
      ...purchaseRecord,
      last_synced_at: purchaseRecord.completed_at || new Date().toISOString()
    });
    // Store nest info for success dialog
    setPurchasedNestInfo({
      name: nest.name,
      itemCount: nest.item_count || 0,
      nestId: nest.id,
    });
    // Show success dialog instead of toast + auto-navigate
    setShowSuccessDialog(true);
  };

  // Navigate to create campaign with nest pre-selected
  const handleCreateCampaign = () => {
    setShowSuccessDialog(false);
    navigate(createPageUrl("TalentCampaigns") + `?action=new&nestId=${nest.id}&nestName=${encodeURIComponent(nest.name)}`);
  };

  // Navigate to view candidates
  const handleViewCandidatesFromSuccess = () => {
    setShowSuccessDialog(false);
    navigate(createPageUrl("TalentCandidates") + `?source=nest&nestId=${nest.id}`);
  };

  const goToCandidates = () => {
    navigate(createPageUrl("TalentCandidates"));
  };

  if (loading) {
    return (
      <div className="w-full px-6 lg:px-8 py-6">
        <Skeleton className="h-6 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Skeleton className="h-48 mb-6" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!nest) {
    return (
      <div className="w-full px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate('/marketplace/nests')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Nests
        </button>
        <div className="text-center py-20">
          <p className="text-zinc-400">Nest not found</p>
        </div>
      </div>
    );
  }

  const itemCount = nest.item_count || 0;
  const price = parseFloat(nest.price) || 0;
  const nestType = nest.nest_type || 'candidates';

  return (
    <div className="w-full px-6 lg:px-8 py-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/marketplace/nests')}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Nests
      </button>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Content - 3 columns */}
        <div className="lg:col-span-3 space-y-8">
          {/* Hero Section */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 px-3 py-1">
                {nestType === 'candidates' ? 'Talent Dataset' : nestType === 'prospects' ? 'Sales Dataset' : nestType === 'companies' ? 'Company Dataset' : 'Investor Dataset'}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 px-3 py-1">
                <MapPin className="w-3 h-3 mr-1" />
                Netherlands
              </Badge>
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">{nest.name}</h1>
            <p className="text-zinc-400 leading-relaxed mb-6">
              {nest.description || `Pre-researched ${nestType} dataset with rich insights, ready for SYNC Intel auto-matching and personalized outreach.`}
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Users className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">{itemCount.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">{nestType === 'companies' ? 'Total Companies' : 'Total Profiles'}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Brain className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">100%</p>
                <p className="text-xs text-zinc-500">SYNC Analyzed</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Target className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">Ready</p>
                <p className="text-xs text-zinc-500">Auto-Match</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <MessageSquare className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">AI</p>
                <p className="text-xs text-zinc-500">Outreach Ready</p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">What's Included</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(nestType === 'companies' ? [
                { icon: Factory, title: "Company Intelligence", desc: "Detailed company profiles with industry classification, employee count, revenue data, and growth indicators." },
                { icon: BarChart3, title: "Industry Analysis", desc: "Deep industry breakdowns, competitive landscape positioning, and market segment insights." },
                { icon: Zap, title: "Tech Stack Data", desc: "Technology stack intelligence including tools, frameworks, and infrastructure used by each company." },
                { icon: TrendingUp, title: "Enrichment Ready", desc: "All companies are pre-validated and ready for enrichment with additional data points and contact discovery." },
                { icon: Globe, title: "Domain & Web Data", desc: "Verified company domains, website data, and online presence information." },
                { icon: FileText, title: "Export Anytime", desc: "Export company data to CSV or integrate directly with your CRM system." },
              ] : nestType === 'prospects' ? [
                { icon: Brain, title: "SYNC Intel Analysis", desc: "Every prospect is analyzed for buying intent, budget signals, decision-making authority, and engagement readiness." },
                { icon: Target, title: "Auto-Match to ICPs", desc: "Define your ideal customer profile and SYNC automatically scores and ranks the most relevant prospects." },
                { icon: MessageSquare, title: "Personalized Outreach", desc: "Generate highly personalized sales messages based on each prospect's company context and pain points." },
                { icon: BarChart3, title: "Deep Insights", desc: "View company growth signals, technology stack, hiring trends, and buying readiness indicators." },
                { icon: Mail, title: "Contact Details", desc: "Full contact information including email, phone, and LinkedIn profiles for direct sales outreach." },
                { icon: FileText, title: "Export Anytime", desc: "Export prospect data to CSV or integrate directly with your CRM system." },
              ] : nestType === 'investors' ? [
                { icon: Brain, title: "Investor Intelligence", desc: "Every investor is analyzed for investment thesis alignment, portfolio fit, check size, and activity level." },
                { icon: Target, title: "Auto-Match to Round", desc: "Define your fundraising parameters and SYNC matches the most relevant investors for your stage and sector." },
                { icon: MessageSquare, title: "Personalized Outreach", desc: "Generate tailored pitch messages based on each investor's portfolio, thesis, and recent investments." },
                { icon: BarChart3, title: "Deep Insights", desc: "View investment history, portfolio companies, fund size, preferred stages, and sector focus." },
                { icon: Mail, title: "Contact Details", desc: "Full contact information including email, phone, and LinkedIn profiles for direct fundraising outreach." },
                { icon: FileText, title: "Export Anytime", desc: "Export investor data to CSV or integrate directly with your fundraising tools." },
              ] : [
                { icon: Brain, title: "SYNC Intel Analysis", desc: "Every profile is analyzed for job satisfaction, recruitment urgency, career trajectory, and openness to opportunities." },
                { icon: Target, title: "Auto-Match to Roles", desc: "Add your open positions and SYNC automatically matches and scores the most relevant candidates." },
                { icon: MessageSquare, title: "Personalized Outreach", desc: "Generate highly personalized messages for each candidate based on their background and motivations." },
                { icon: BarChart3, title: "Deep Insights", desc: "View job satisfaction scores, promotion history, company tenure, and recruitment urgency indicators." },
                { icon: Mail, title: "Contact Details", desc: "Full contact information including email, phone, and LinkedIn profiles for direct outreach." },
                { icon: FileText, title: "Export Anytime", desc: "Export candidate data to CSV or integrate directly with your ATS system." },
              ]).map((feature, i) => (
                <div key={i} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                  <feature.icon className="w-6 h-6 text-red-400 mb-3" />
                  <h3 className="font-medium text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">{nestType === 'companies' ? 'Sample Company Preview' : 'Sample Profile Preview'}</h2>
              <Badge variant="outline" className="border-zinc-700 text-zinc-500">
                <Lock className="w-3 h-3 mr-1" />
                Data anonymized
              </Badge>
            </div>

            {nestType === 'prospects' ? (
              /* Prospect Card Preview */
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                        <Briefcase className="w-7 h-7 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-32 bg-zinc-700 rounded blur-[2px]" />
                          <div className="h-5 w-24 bg-zinc-700 rounded blur-[2px]" />
                        </div>
                        <p className="text-zinc-400 mt-1">VP of Sales at SaaS Company</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            Decision Maker
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            High Intent
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Company Size", value: "201-500" },
                        { label: "Industry", value: "SaaS" },
                        { label: "Budget", value: "€50-100k", highlight: true },
                        { label: "Decision Level", value: "C-Suite" },
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                          <p className={`text-lg font-semibold ${stat.highlight ? 'text-red-400' : 'text-white'}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-white">Sales Assessment</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        This prospect shows strong buying signals. Their company recently expanded and is actively evaluating solutions in your space. Decision-maker with budget authority and a history of fast procurement cycles.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["CRM", "Marketing Automation", "Sales Enablement", "Data Analytics", "Cloud Infrastructure"].map((interest, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 text-sm border border-white/[0.05]">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-sm font-medium text-white mb-3">Contact Information</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-zinc-500" />
                          <div className="h-4 w-full bg-zinc-700 rounded blur-[3px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-zinc-500" />
                          <div className="h-4 w-24 bg-zinc-700 rounded blur-[3px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Linkedin className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-red-400 blur-[2px]">linkedin.com/in/████████</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400">Amsterdam, NL</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-3">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-zinc-500">Purchase to unlock full data</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : nestType === 'investors' ? (
              /* Investor Card Preview */
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                        <Building2 className="w-7 h-7 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-32 bg-zinc-700 rounded blur-[2px]" />
                          <div className="h-5 w-24 bg-zinc-700 rounded blur-[2px]" />
                        </div>
                        <p className="text-zinc-400 mt-1">Partner at Venture Capital Firm</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            Series A-B
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            Active Investor
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Fund Size", value: "€200M" },
                        { label: "Check Size", value: "€2-10M", highlight: true },
                        { label: "Investments", value: "45+" },
                        { label: "Focus", value: "B2B SaaS" },
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                          <p className={`text-lg font-semibold ${stat.highlight ? 'text-red-400' : 'text-white'}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-white">Investor Assessment</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Highly active investor focused on B2B SaaS in Europe. Recently led 3 rounds in the past quarter. Known for hands-on support and strong network in the enterprise space. Thesis aligns with growth-stage companies.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["B2B SaaS", "Enterprise", "AI/ML", "Fintech", "Climate Tech", "Marketplace"].map((focus, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 text-sm border border-white/[0.05]">
                          {focus}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-sm font-medium text-white mb-3">Contact Information</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-zinc-500" />
                          <div className="h-4 w-full bg-zinc-700 rounded blur-[3px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-zinc-500" />
                          <div className="h-4 w-24 bg-zinc-700 rounded blur-[3px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Linkedin className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-red-400 blur-[2px]">linkedin.com/in/████████</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400">Amsterdam, NL</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-3">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-zinc-500">Purchase to unlock full data</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : nestType === 'companies' ? (
              /* Company Card Preview */
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                        <Factory className="w-7 h-7 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-40 bg-zinc-700 rounded blur-[2px]" />
                        </div>
                        <p className="text-zinc-400 mt-1">Technology / SaaS</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            Series B
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            201-500 employees
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Industry", value: "SaaS" },
                        { label: "Size", value: "201-500" },
                        { label: "Location", value: "Amsterdam" },
                        { label: "Revenue", value: "€10-50M", highlight: true },
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                          <p className={`text-lg font-semibold ${stat.highlight ? 'text-red-400' : 'text-white'}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-white">Company Description</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        A fast-growing B2B SaaS company specializing in workflow automation for enterprise clients. Recently expanded into the DACH market with a new office in Berlin.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["React", "Node.js", "AWS", "Kubernetes", "PostgreSQL", "Terraform"].map((tech, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 text-sm border border-white/[0.05]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-sm font-medium text-white mb-3">Company Details</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-zinc-500" />
                          <div className="h-4 w-full bg-zinc-700 rounded blur-[3px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400">Amsterdam, NL</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400">201-500 employees</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Hash className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400 blur-[2px]">KVK ████████</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-3">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-zinc-500">Purchase to unlock full data</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Profile Card Preview (original) */
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                        <Users className="w-7 h-7 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-32 bg-zinc-700 rounded blur-[2px]" />
                          <div className="h-5 w-24 bg-zinc-700 rounded blur-[2px]" />
                        </div>
                        <p className="text-zinc-400 mt-1">Senior Software Engineer at Tech Company</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            Medium Satisfaction
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                            High Priority
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Years at Company", value: "2.5" },
                        { label: "Promotions", value: "1" },
                        { label: "Company Changes", value: "3" },
                        { label: "Salary Range", value: "€75-90k", highlight: true },
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                          <p className={`text-lg font-semibold ${stat.highlight ? 'text-red-400' : 'text-white'}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-white">Recruitment Assessment</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        This candidate shows signs of being open to new opportunities. They've been in their current role for 2.5 years without significant growth, and their LinkedIn activity suggests active market exploration. High priority for outreach.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {["Python", "React", "AWS", "PostgreSQL", "Docker", "Kubernetes", "TypeScript", "GraphQL"].map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 text-sm border border-white/[0.05]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-sm font-medium text-white mb-3">Contact Information</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-zinc-500" />
                          <div className="h-4 w-full bg-zinc-700 rounded blur-[3px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-zinc-500" />
                          <div className="h-4 w-24 bg-zinc-700 rounded blur-[3px]" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Linkedin className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-red-400 blur-[2px]">linkedin.com/in/████████</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400">Amsterdam, NL</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-white">AI-Generated Outreach</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed italic">
                        "Hi [Name], I noticed you've been building impressive data pipelines at Tech Company. We're scaling our engineering team and your experience with AWS and Python would be perfect for our Senior Engineer role..."
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-3">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-zinc-500">Purchase to unlock full data</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ruled Out Candidates (post-purchase) */}
          {hasPurchased && ruledOut.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <button
                onClick={() => setRuledOutExpanded(!ruledOutExpanded)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Ruled Out Candidates</h2>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {ruledOut.length}
                  </Badge>
                </div>
                <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${ruledOutExpanded ? 'rotate-180' : ''}`} />
              </button>

              {ruledOutExpanded && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">
                      These candidates work for your excluded clients and were automatically ruled out.
                    </p>
                    <Button
                      onClick={handleRecoverAll}
                      variant="outline"
                      size="sm"
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Recover All
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {ruledOut.map(candidate => (
                      <div key={candidate.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {candidate.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {candidate.job_title} at {candidate.company_name}
                            {candidate.prospects?.company && (
                              <span className="text-amber-400"> — matched to {candidate.prospects.company}</span>
                            )}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRecoverCandidate(candidate.id)}
                          variant="ghost"
                          size="sm"
                          className="text-zinc-400 hover:text-white ml-2"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Recover
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* How It Works */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(nestType === 'companies' ? [
                { step: 1, icon: CreditCard, title: "Purchase Nest", desc: "Get instant access to all companies" },
                { step: 2, icon: Factory, title: "Browse Companies", desc: "Explore company profiles and data" },
                { step: 3, icon: Sparkles, title: "Enrich Data", desc: "Add contacts, tech stack & more" },
                { step: 4, icon: ExternalLink, title: "Export / Integrate", desc: "Export to CSV or push to CRM" },
              ] : nestType === 'prospects' ? [
                { step: 1, icon: CreditCard, title: "Purchase Nest", desc: "Get instant access to all prospects" },
                { step: 2, icon: Briefcase, title: "Define Your ICP", desc: "Set ideal customer criteria" },
                { step: 3, icon: Sparkles, title: "SYNC Matches", desc: "AI scores & ranks prospects" },
                { step: 4, icon: Rocket, title: "Reach Out", desc: "Send personalized sales outreach" },
              ] : nestType === 'investors' ? [
                { step: 1, icon: CreditCard, title: "Purchase Nest", desc: "Get instant access to all investors" },
                { step: 2, icon: Briefcase, title: "Set Your Round", desc: "Define fundraising parameters" },
                { step: 3, icon: Sparkles, title: "SYNC Matches", desc: "AI matches relevant investors" },
                { step: 4, icon: Rocket, title: "Reach Out", desc: "Send tailored pitch messages" },
              ] : [
                { step: 1, icon: CreditCard, title: "Purchase Nest", desc: "Get instant access to all profiles" },
                { step: 2, icon: Briefcase, title: "Add Your Roles", desc: "Define your open positions" },
                { step: 3, icon: Sparkles, title: "SYNC Matches", desc: "AI matches & scores candidates" },
                { step: 4, icon: Rocket, title: "Reach Out", desc: "Send personalized messages" },
              ]).map((item, i) => (
                <div key={i} className="relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                    {item.step}
                  </div>
                  <item.icon className="w-6 h-6 text-zinc-500 mb-3" />
                  <h3 className="font-medium text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-zinc-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Purchase Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Price Card */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-center mb-5">
                <p className="text-4xl font-bold text-white">€{price.toFixed(0)}</p>
                <p className="text-sm text-zinc-500 mt-1">one-time payment</p>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  `${itemCount.toLocaleString()} ${nestType === 'companies' ? 'company profiles' : 'candidate profiles'}`,
                  "SYNC Intel auto-matching",
                  "AI personalized outreach",
                  "Full contact details",
                  "Export to CSV",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              {hasPurchased ? (
                <>
                  {hasUpdate && (
                    <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Bell className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-red-400">Update Available</span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-3">
                        New candidates have been added to this nest since your last sync.
                      </p>
                      <Button
                        onClick={handleRefreshNest}
                        disabled={isSyncing}
                        className="w-full h-9 bg-red-500 hover:bg-red-600 text-white font-medium"
                      >
                        {isSyncing ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                        ) : (
                          <><RefreshCw className="w-4 h-4 mr-2" />Refresh Nest</>
                        )}
                      </Button>
                    </div>
                  )}

                  {nestType === 'companies' ? (
                    <>
                      <Button
                        onClick={goToCandidates}
                        className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium mb-2"
                      >
                        <Factory className="w-4 h-4 mr-2" />
                        View Companies
                      </Button>
                      <Button
                        onClick={() => navigate(createPageUrl("TalentEnrich"))}
                        variant="outline"
                        className="w-full h-10 border-red-600/50 text-red-400 hover:bg-red-600/10"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Open in Enrich
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCreateCampaign}
                        className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium mb-2"
                      >
                        <Megaphone className="w-4 h-4 mr-2" />
                        Create Campaign
                      </Button>
                      <Button
                        onClick={goToCandidates}
                        variant="outline"
                        className="w-full h-10 border-red-600/50 text-red-400 hover:bg-red-600/10"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        View Candidates
                      </Button>
                    </>
                  )}

                  <p className="text-xs text-red-500 text-center mt-3">
                    ✓ You own this nest
                  </p>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setShowPurchaseDialog(true)}
                    className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium"
                  >
                    Purchase Nest
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-xs text-zinc-600 text-center mt-3">
                    Instant access after purchase
                  </p>
                </>
              )}
            </div>

            {/* Trust Badges */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Verified Data</p>
                    <p className="text-xs text-zinc-500">Updated within 30 days</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Instant Access</p>
                    <p className="text-xs text-zinc-500">Available immediately</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">SYNC Intel</p>
                    <p className="text-xs text-zinc-500">AI-powered insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Purchase CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-lg border-t border-white/[0.08] z-50">
        <div className="flex items-center justify-between">
          <div>
            {hasPurchased ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-red-400">Purchased</p>
                  {hasUpdate && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                      Update
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500">{itemCount.toLocaleString()} {nestType === 'companies' ? 'companies' : 'profiles'} owned</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-white">€{price.toFixed(0)}</p>
                <p className="text-xs text-zinc-500">{itemCount.toLocaleString()} profiles</p>
              </>
            )}
          </div>
          {hasPurchased ? (
            hasUpdate ? (
              <Button
                onClick={handleRefreshNest}
                disabled={isSyncing}
                className="bg-red-500 hover:bg-red-600 text-white px-6"
              >
                {isSyncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" />Refresh</>
                )}
              </Button>
            ) : (
              <Button
                onClick={goToCandidates}
                className="bg-red-600 hover:bg-red-700 text-white px-6"
              >
                <Check className="w-4 h-4 mr-2" />
                View Candidates
              </Button>
            )
          ) : (
            <Button
              onClick={() => setShowPurchaseDialog(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-6"
            >
              Purchase Nest
            </Button>
          )}
        </div>
      </div>

      {/* Spacer for mobile fixed CTA */}
      <div className="lg:hidden h-20" />

      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        nest={nest}
        onPurchase={handlePurchase}
        user={user}
      />

      {/* Post-Purchase Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <div className="text-center py-4">
            {/* Success Animation */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center">
              <PartyPopper className="w-10 h-10 text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Nest Purchased! 🎉
            </h2>
            <p className="text-zinc-400 mb-6">
              <span className="text-white font-medium">{purchasedNestInfo?.itemCount?.toLocaleString()}</span> candidates
              from <span className="text-white font-medium">{purchasedNestInfo?.name}</span> have been added to your talent pool.
            </p>

            {/* Intel Processing Notice */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6 text-left">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 flex-shrink-0">
                  <Brain className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">SYNC Intel Processing</p>
                  <p className="text-xs text-zinc-400">
                    We're analyzing each candidate's profile to generate intelligence insights,
                    match scores, and personalized outreach angles. This runs in the background.
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 font-medium mb-3">What would you like to do next?</p>

              {/* Primary CTA - Create Campaign */}
              <Button
                onClick={handleCreateCampaign}
                className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium"
              >
                <Megaphone className="w-5 h-5 mr-2" />
                Create Matching Campaign
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-zinc-500">
                Match these candidates to your open roles and generate personalized outreach
              </p>

              {/* Secondary CTA - View Candidates */}
              <Button
                onClick={handleViewCandidatesFromSuccess}
                variant="outline"
                className="w-full h-11 border-zinc-700 text-white hover:bg-zinc-800"
              >
                <Users className="w-4 h-4 mr-2" />
                View Candidates First
              </Button>

              {/* Skip for now */}
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="text-sm text-zinc-500 hover:text-zinc-400 mt-2"
              >
                I'll do this later
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
