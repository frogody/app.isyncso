/**
 * Growth Workspace Setup Page
 * Step 4 of 5 - Purchase selected nests and create research workspace
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  Coins,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Users,
  Building2,
  MapPin,
  Briefcase,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Package,
  Rocket,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/hooks/use-toast';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.5, repeat: Infinity },
  },
};

// Glass card component
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Step indicator component
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i + 1 <= currentStep
                ? 'bg-cyan-600 text-white'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {i + 1 < currentStep ? (
              <Check className="w-4 h-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < totalSteps - 1 && (
            <div
              className={`w-8 h-0.5 ${
                i + 1 < currentStep ? 'bg-cyan-600' : 'bg-zinc-800'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Nest card for purchase summary
function NestCard({ nest, onRemove, isRemoving }) {
  return (
    <motion.div
      layout
      variants={itemVariants}
      exit="exit"
      className={`p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 ${
        isRemoving ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white truncate">{nest.name}</h4>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
              {nest.industry}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {nest.lead_count?.toLocaleString() || nest.size?.toLocaleString() || '0'} leads
            </span>
            {nest.region && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {nest.region}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <Coins className="w-4 h-4" />
              {nest.price?.toLocaleString() || '0'}
            </div>
            <span className="text-xs text-zinc-500">credits</span>
          </div>
          <button
            onClick={() => onRemove(nest.id)}
            disabled={isRemoving}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Purchase progress modal
function PurchaseProgressModal({
  isOpen,
  progress,
  results,
  onClose,
  onRetry,
  onContinue,
}) {
  const totalNests = progress.total;
  const completedNests = results.length;
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const isComplete = completedNests === totalNests;
  const hasFailures = failCount > 0;
  const allFailed = failCount === totalNests;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {!isComplete ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                Purchasing Nests...
              </>
            ) : hasFailures ? (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Purchase Partially Complete
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Purchase Complete!
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {!isComplete
              ? `Processing ${completedNests + 1} of ${totalNests} nests...`
              : hasFailures
              ? `${successCount} succeeded, ${failCount} failed`
              : `All ${totalNests} nests purchased successfully`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress
              value={(completedNests / totalNests) * 100}
              className="h-2"
            />
            <p className="text-xs text-zinc-500 text-center">
              {completedNests} / {totalNests} complete
            </p>
          </div>

          {/* Results list */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            <AnimatePresence mode="popLayout">
              {results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    result.success
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-white truncate flex-1">
                    {result.nestName}
                  </span>
                  {result.success && result.rowsImported && (
                    <span className="text-xs text-green-400">
                      {result.rowsImported} leads
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {isComplete && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {allFailed ? (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onRetry}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry All
                </Button>
              </>
            ) : hasFailures ? (
              <>
                <Button
                  variant="outline"
                  onClick={onRetry}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Failed
                </Button>
                <Button
                  onClick={onContinue}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                >
                  Continue with {successCount}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            ) : null}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Success celebration modal
function SuccessModal({ isOpen, workspaceId, leadsCount, onNavigate }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onNavigate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onNavigate]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md text-center">
        <div className="py-6">
          {/* Success animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-cyan-500/20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Rocket className="w-10 h-10 text-cyan-400" />
            </motion.div>
          </motion.div>

          {/* Sparkles animation */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  opacity: 0,
                  scale: 0,
                  x: '50%',
                  y: '30%',
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: `${30 + Math.random() * 40}%`,
                  y: `${10 + Math.random() * 40}%`,
                }}
                transition={{
                  delay: 0.3 + i * 0.1,
                  duration: 1,
                }}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
              </motion.div>
            ))}
          </motion.div>

          <DialogTitle className="text-2xl text-white mb-2">
            Workspace Created!
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-base">
            Your research workspace is ready with{' '}
            <span className="text-cyan-400 font-semibold">
              {leadsCount.toLocaleString()} leads
            </span>{' '}
            to explore.
          </DialogDescription>

          <div className="mt-6 space-y-3">
            <Button
              onClick={onNavigate}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
            >
              Open Workspace
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-zinc-500">
              Redirecting in {countdown} seconds...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Empty state component
function EmptyState({ onGoBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
        <Package className="w-12 h-12 text-zinc-600" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">No Nests Selected</h2>
      <p className="text-zinc-400 mb-6 max-w-md">
        You haven't selected any nests for your campaign yet.
        Go back to browse and select data nests that match your target audience.
      </p>
      <Button onClick={onGoBack} className="bg-cyan-600 hover:bg-cyan-500">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Browse Nests
      </Button>
    </motion.div>
  );
}

export default function GrowthWorkspaceSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();

  // State
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [selectedNests, setSelectedNests] = useState([]);
  const [userCredits, setUserCredits] = useState(0);
  const [removingNestId, setRemovingNestId] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseProgress, setPurchaseProgress] = useState({ current: 0, total: 0 });
  const [purchaseResults, setPurchaseResults] = useState([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState(null);
  const [totalLeadsImported, setTotalLeadsImported] = useState(0);

  // Calculate totals
  const totals = useMemo(() => {
    const totalLeads = selectedNests.reduce(
      (sum, nest) => sum + (nest.lead_count || nest.size || 0),
      0
    );
    const totalCost = selectedNests.reduce(
      (sum, nest) => sum + (nest.price || 0),
      0
    );
    return { totalLeads, totalCost };
  }, [selectedNests]);

  const hasInsufficientCredits = userCredits < totals.totalCost;

  // Load draft and user credits
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load draft from localStorage
        const savedDraft = localStorage.getItem('growth_campaign_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          setDraft(parsed);
          setSelectedNests(parsed.selectedNests || []);
        }

        // Fetch user credits
        if (user?.id) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();

          if (userData && !error) {
            setUserCredits(userData.credits || 0);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load workspace setup data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id, toast]);

  // Remove nest from selection
  const handleRemoveNest = (nestId) => {
    setRemovingNestId(nestId);

    setTimeout(() => {
      const updatedNests = selectedNests.filter((n) => n.id !== nestId);
      setSelectedNests(updatedNests);

      // Update localStorage
      if (draft) {
        const updatedDraft = { ...draft, selectedNests: updatedNests };
        localStorage.setItem('growth_campaign_draft', JSON.stringify(updatedDraft));
        setDraft(updatedDraft);
      }

      setRemovingNestId(null);
      toast({
        title: 'Nest Removed',
        description: 'The nest has been removed from your selection.',
      });
    }, 200);
  };

  // Handle purchase flow
  const handlePurchase = async () => {
    if (hasInsufficientCredits || selectedNests.length === 0) return;

    setPurchasing(true);
    setShowProgressModal(true);
    setPurchaseProgress({ current: 0, total: selectedNests.length });
    setPurchaseResults([]);

    let workspaceId = null;
    let totalRows = 0;
    const results = [];

    // Process each nest sequentially
    for (let i = 0; i < selectedNests.length; i++) {
      const nest = selectedNests[i];
      setPurchaseProgress((prev) => ({ ...prev, current: i + 1 }));

      try {
        const { data, error } = await supabase.functions.invoke('purchase-growth-nest', {
          body: {
            nest_id: nest.id,
            payment_method: 'credits',
            campaign_id: draft?.campaignId,
            workspace_id: workspaceId, // Use existing workspace if we have one
          },
        });

        if (error) throw error;

        if (data?.success) {
          workspaceId = data.workspace_id || workspaceId;
          totalRows += data.rows_imported || 0;
          results.push({
            nestId: nest.id,
            nestName: nest.name,
            success: true,
            workspaceId: data.workspace_id,
            rowsImported: data.rows_imported,
          });
        } else {
          results.push({
            nestId: nest.id,
            nestName: nest.name,
            success: false,
            error: data?.message || 'Purchase failed',
          });
        }
      } catch (error) {
        console.error(`Error purchasing nest ${nest.id}:`, error);
        results.push({
          nestId: nest.id,
          nestName: nest.name,
          success: false,
          error: error.message || 'Network error',
        });
      }

      setPurchaseResults([...results]);

      // Small delay between purchases
      if (i < selectedNests.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setPurchasing(false);

    // Check results
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0 && workspaceId) {
      // All succeeded
      setCreatedWorkspaceId(workspaceId);
      setTotalLeadsImported(totalRows);

      // Clear draft from localStorage
      localStorage.removeItem('growth_campaign_draft');

      // Close progress modal, show success
      setTimeout(() => {
        setShowProgressModal(false);
        setShowSuccessModal(true);
      }, 1000);

      // Update user credits display
      setUserCredits((prev) => prev - totals.totalCost);
    }
    // If there are failures, the modal will show retry/continue options
  };

  // Retry failed purchases
  const handleRetryFailed = async () => {
    const failedNests = selectedNests.filter((nest) =>
      purchaseResults.find((r) => r.nestId === nest.id && !r.success)
    );

    if (failedNests.length === 0) return;

    // Reset and re-run only failed ones
    const successfulResults = purchaseResults.filter((r) => r.success);
    setPurchaseResults(successfulResults);
    setPurchaseProgress({ current: 0, total: failedNests.length });
    setPurchasing(true);

    // Similar logic to handlePurchase but only for failed nests
    let workspaceId = successfulResults.find((r) => r.workspaceId)?.workspaceId || null;
    let totalRows = successfulResults.reduce((sum, r) => sum + (r.rowsImported || 0), 0);
    const results = [...successfulResults];

    for (let i = 0; i < failedNests.length; i++) {
      const nest = failedNests[i];
      setPurchaseProgress((prev) => ({ ...prev, current: i + 1 }));

      try {
        const { data, error } = await supabase.functions.invoke('purchase-growth-nest', {
          body: {
            nest_id: nest.id,
            payment_method: 'credits',
            campaign_id: draft?.campaignId,
            workspace_id: workspaceId,
          },
        });

        if (error) throw error;

        if (data?.success) {
          workspaceId = data.workspace_id || workspaceId;
          totalRows += data.rows_imported || 0;
          results.push({
            nestId: nest.id,
            nestName: nest.name,
            success: true,
            workspaceId: data.workspace_id,
            rowsImported: data.rows_imported,
          });
        } else {
          results.push({
            nestId: nest.id,
            nestName: nest.name,
            success: false,
            error: data?.message || 'Purchase failed',
          });
        }
      } catch (error) {
        results.push({
          nestId: nest.id,
          nestName: nest.name,
          success: false,
          error: error.message || 'Network error',
        });
      }

      setPurchaseResults([...results]);

      if (i < failedNests.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setPurchasing(false);

    const newSuccessCount = results.filter((r) => r.success).length;
    if (newSuccessCount === selectedNests.length && workspaceId) {
      setCreatedWorkspaceId(workspaceId);
      setTotalLeadsImported(totalRows);
      localStorage.removeItem('growth_campaign_draft');
      setTimeout(() => {
        setShowProgressModal(false);
        setShowSuccessModal(true);
      }, 1000);
      setUserCredits((prev) => prev - totals.totalCost);
    }
  };

  // Continue with successful purchases
  const handleContinueWithSuccessful = () => {
    const successfulResults = purchaseResults.filter((r) => r.success);
    const workspaceId = successfulResults.find((r) => r.workspaceId)?.workspaceId;
    const totalRows = successfulResults.reduce((sum, r) => sum + (r.rowsImported || 0), 0);

    if (workspaceId) {
      setCreatedWorkspaceId(workspaceId);
      setTotalLeadsImported(totalRows);
      localStorage.removeItem('growth_campaign_draft');
      setShowProgressModal(false);
      setShowSuccessModal(true);
    }
  };

  // Navigate to workspace
  const handleNavigateToWorkspace = () => {
    if (createdWorkspaceId) {
      navigate(`/growth/research/${createdWorkspaceId}`);
    } else {
      navigate('/growth/research');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Empty state
  if (!selectedNests || selectedNests.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/growth/nests')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Nests
            </button>
            <StepIndicator currentStep={4} totalSteps={5} />
          </div>

          <EmptyState onGoBack={() => navigate('/growth/nests')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/growth/nests')}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Setup Workspace</h1>
              <p className="text-zinc-400 text-sm">
                Review your selection and create your research workspace
              </p>
            </div>
          </div>
          <StepIndicator currentStep={4} totalSteps={5} />
        </motion.div>

        {/* Main content - Two columns */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Purchase Summary */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Selected Nests */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Selected Nests ({selectedNests.length})
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {selectedNests.map((nest) => (
                    <NestCard
                      key={nest.id}
                      nest={nest}
                      onRemove={handleRemoveNest}
                      isRemoving={removingNestId === nest.id}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Subtotal */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-zinc-400">Subtotal</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-white">
                      {totals.totalCost.toLocaleString()} credits
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Credit Balance Warning */}
            {hasInsufficientCredits && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-400">Insufficient Credits</h3>
                    <p className="text-sm text-yellow-400/80 mt-1">
                      You need {(totals.totalCost - userCredits).toLocaleString()} more credits
                      to complete this purchase.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                      onClick={() => navigate('/settings?tab=billing')}
                    >
                      Buy More Credits
                      <ExternalLink className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right column - Order Details (Sticky) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-8 space-y-4">
              <GlassCard className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>

                {/* Campaign Info */}
                {draft?.name && (
                  <div className="pb-4 mb-4 border-b border-zinc-800">
                    <p className="text-sm text-zinc-500">Campaign</p>
                    <p className="text-white font-medium">{draft.name}</p>
                  </div>
                )}

                {/* Target Audience */}
                {draft?.icp && (
                  <div className="pb-4 mb-4 border-b border-zinc-800 space-y-2">
                    <p className="text-sm text-zinc-500">Target Audience</p>
                    {draft.icp.industries?.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-300">
                          {draft.icp.industries.slice(0, 2).join(', ')}
                          {draft.icp.industries.length > 2 && ` +${draft.icp.industries.length - 2}`}
                        </span>
                      </div>
                    )}
                    {draft.icp.regions?.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-300">
                          {draft.icp.regions.slice(0, 2).join(', ')}
                          {draft.icp.regions.length > 2 && ` +${draft.icp.regions.length - 2}`}
                        </span>
                      </div>
                    )}
                    {draft.icp.jobTitles?.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-300">
                          {draft.icp.jobTitles.slice(0, 2).join(', ')}
                          {draft.icp.jobTitles.length > 2 && ` +${draft.icp.jobTitles.length - 2}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-3 pb-4 mb-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Nests Selected</span>
                    <span className="text-white font-medium">{selectedNests.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Total Leads</span>
                    <span className="text-white font-medium">
                      {totals.totalLeads.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Your Balance</span>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className={`font-medium ${
                        hasInsufficientCredits ? 'text-red-400' : 'text-white'
                      }`}>
                        {userCredits.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between text-lg mb-6">
                  <span className="text-white font-semibold">Total Cost</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-white">
                      {totals.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Purchase Button */}
                <Button
                  onClick={handlePurchase}
                  disabled={hasInsufficientCredits || purchasing || selectedNests.length === 0}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Purchase & Create Workspace
                    </>
                  )}
                </Button>

                {/* Balance after purchase */}
                {!hasInsufficientCredits && (
                  <p className="text-xs text-zinc-500 text-center mt-3">
                    Balance after purchase:{' '}
                    <span className="text-zinc-400">
                      {(userCredits - totals.totalCost).toLocaleString()} credits
                    </span>
                  </p>
                )}
              </GlassCard>

              {/* Help text */}
              <p className="text-xs text-zinc-600 text-center">
                Your workspace will be created instantly after purchase.
                All leads will be ready for enrichment and outreach.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Purchase Progress Modal */}
      <PurchaseProgressModal
        isOpen={showProgressModal}
        progress={purchaseProgress}
        results={purchaseResults}
        onClose={() => setShowProgressModal(false)}
        onRetry={handleRetryFailed}
        onContinue={handleContinueWithSuccessful}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        workspaceId={createdWorkspaceId}
        leadsCount={totalLeadsImported}
        onNavigate={handleNavigateToWorkspace}
      />
    </div>
  );
}
