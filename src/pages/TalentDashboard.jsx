import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Megaphone,
  AlertTriangle,
  Clock,
  FileText,
  Plus,
  Upload,
  TrendingUp,
  Building2,
  ArrowRight,
  Activity,
  Target,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { OutreachQueue, AddCandidateModal } from "@/components/talent";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

// Flight Risk Gauge Component
const FlightRiskGauge = ({ score, maxScore = 100 }) => {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const getColor = () => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 60) return "bg-red-400";
    if (percentage >= 40) return "bg-red-300";
    return "bg-zinc-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${getColor()} rounded-full`}
        />
      </div>
      <span className="text-sm text-zinc-400 font-medium">{score}</span>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    completed: "bg-red-500/10 text-red-400 border-red-500/20",
    failed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    scheduled: "bg-red-500/10 text-red-400 border-red-500/20",
    in_progress: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const statusIcons = {
    pending: <Clock className="w-3 h-3" />,
    completed: <CheckCircle2 className="w-3 h-3" />,
    failed: <XCircle className="w-3 h-3" />,
    scheduled: <Calendar className="w-3 h-3" />,
    in_progress: <Activity className="w-3 h-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
        statusStyles[status] || statusStyles.pending
      }`}
    >
      {statusIcons[status] || statusIcons.pending}
      {status?.replace("_", " ")}
    </span>
  );
};

// Task Type Icon Component
const TaskTypeIcon = ({ type }) => {
  const icons = {
    email: <Mail className="w-4 h-4 text-red-400" />,
    call: <Phone className="w-4 h-4 text-red-400" />,
    meeting: <Calendar className="w-4 h-4 text-red-400" />,
    linkedin: <Target className="w-4 h-4 text-red-400" />,
  };

  return icons[type] || <Activity className="w-4 h-4 text-zinc-400" />;
};

// Candidate Row Component
const CandidateRow = ({ candidate, index }) => {
  return (
    <Link to={createPageUrl("TalentCandidateProfile") + `?id=${candidate.id}`}>
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-red-500/30 transition-all duration-200 group cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold text-sm">
            {index + 1}
          </div>
          <div>
            <h4 className="text-sm font-medium text-zinc-200 group-hover:text-red-300 transition-colors">
              {candidate.first_name && candidate.last_name ? `${candidate.first_name} ${candidate.last_name}` : "Unknown Candidate"}
            </h4>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Building2 className="w-3 h-3" />
              <span>{candidate.company_name || "No company"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <FlightRiskGauge score={candidate.intelligence_score || 0} />
          <div className="max-w-[200px]">
            <p className="text-xs text-zinc-400 truncate capitalize" title={candidate.recommended_approach}>
              {candidate.recommended_approach || "No recommendation"}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors" />
        </div>
      </motion.div>
    </Link>
  );
};

// Outreach Activity Item Component
const OutreachItem = ({ task }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      variants={itemVariants}
      className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30 hover:border-red-500/20 transition-all duration-200"
    >
      <div className="p-2 rounded-lg bg-zinc-700/50">
        <TaskTypeIcon type={task.task_type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-zinc-300 truncate">
            {task.candidate_name || "Unknown"}
          </h4>
          <StatusBadge status={task.status} />
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {task.task_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} outreach
        </p>
        <p className="text-xs text-zinc-600 mt-1">{formatDate(task.created_date)}</p>
      </div>
    </motion.div>
  );
};

// Loading Skeleton Components
const StatCardSkeleton = () => (
  <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 bg-zinc-700" />
        <Skeleton className="h-8 w-16 bg-zinc-700" />
      </div>
      <Skeleton className="h-12 w-12 rounded-lg bg-zinc-700" />
    </div>
  </div>
);

const CandidateRowSkeleton = () => (
  <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
    <div className="flex items-center gap-4">
      <Skeleton className="w-8 h-8 rounded-full bg-zinc-700" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 bg-zinc-700" />
        <Skeleton className="h-3 w-24 bg-zinc-700" />
      </div>
    </div>
    <div className="flex items-center gap-6">
      <Skeleton className="h-2 w-24 bg-zinc-700 rounded-full" />
      <Skeleton className="h-3 w-40 bg-zinc-700" />
    </div>
  </div>
);

const OutreachItemSkeleton = () => (
  <div className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
    <Skeleton className="w-10 h-10 rounded-lg bg-zinc-700" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 bg-zinc-700" />
        <Skeleton className="h-5 w-16 rounded-full bg-zinc-700" />
      </div>
      <Skeleton className="h-3 w-20 bg-zinc-700" />
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="p-4 rounded-full bg-red-500/10 mb-4">
      <Icon className="w-8 h-8 text-red-400" />
    </div>
    <h3 className="text-lg font-medium text-zinc-300 mb-2">{title}</h3>
    <p className="text-sm text-zinc-500 max-w-sm">{description}</p>
  </div>
);

// Main TalentDashboard Component
const TalentDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [outreachTasks, setOutreachTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.organization_id) return;
      
      setLoading(true);
      setError(null);

      try {
        // Fetch candidates from candidates table
        const { data: candidatesData, error: candidatesError } = await supabase
          .from("candidates")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("intelligence_score", { ascending: false, nullsFirst: false })
          .limit(50);

        if (candidatesError) {
          console.warn("Failed to fetch candidates:", candidatesError);
        }

        // Fetch outreach tasks with candidate names
        const { data: tasksData, error: tasksError } = await supabase
          .from("outreach_tasks")
          .select("*, candidates(first_name, last_name)")
          .eq("organization_id", user.organization_id)
          .order("created_date", { ascending: false })
          .limit(20);

        if (tasksError) {
          console.warn("Failed to fetch outreach tasks:", tasksError);
        }

        // Map task data to include candidate_name
        const tasksWithNames = (tasksData || []).map(task => ({
          ...task,
          candidate_name: task.candidate_name || (task.candidates?.first_name && task.candidates?.last_name
            ? `${task.candidates.first_name} ${task.candidates.last_name}`
            : "Unknown")
        }));

        setCandidates(candidatesData || []);
        setOutreachTasks(tasksWithNames);
      } catch (err) {
        console.error("Error fetching talent data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Computed stats
  const stats = useMemo(() => {
    const totalCandidates = candidates.length;

    const highFlightRisk = candidates.filter(
      (c) => c.intelligence_level === "High" || c.intelligence_level === "Critical"
    ).length;

    const pendingOutreach = outreachTasks.filter(
      (t) => t.status === "pending"
    ).length;

    // Count unique campaign_ids for active campaigns
    const activeCampaigns = new Set(
      outreachTasks
        .filter((t) => t.campaign_id && t.status !== "completed")
        .map((t) => t.campaign_id)
    ).size;

    return {
      totalCandidates,
      activeCampaigns,
      highFlightRisk,
      pendingOutreach,
    };
  }, [candidates, outreachTasks]);

  // Top 10 candidates by intelligence score
  const topCandidates = useMemo(() => {
    return candidates.slice(0, 10);
  }, [candidates]);

  // Recent outreach activity
  const recentOutreach = useMemo(() => {
    return outreachTasks.slice(0, 8);
  }, [outreachTasks]);

  return (
    <div className="min-h-screen bg-black relative">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6"
      >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Talent"
          subtitle="Monitor candidate intelligence, track outreach campaigns, and identify high-potential recruits"
          color="red"
        />
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Candidates"
              value={stats.totalCandidates}
              icon={Users}
              color="red"
            />
            <StatCard
              label="Active Campaigns"
              value={stats.activeCampaigns}
              icon={Megaphone}
              color="red"
            />
            <StatCard
              label="High Flight Risk"
              value={stats.highFlightRisk}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              label="Pending Outreach"
              value={stats.pendingOutreach}
              icon={Clock}
              color="yellow"
            />
          </>
        )}
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div variants={itemVariants}>
          <GlassCard className="p-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm">
                Error loading data: {error}. Please try refreshing the page.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Candidates Section - 2/3 width */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingUp className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-200">
                    Top Candidates by Flight Risk
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Highest intelligence scores indicating readiness to move
                  </p>
                </div>
              </div>
              <Link
                to={createPageUrl("TalentCandidates")}
                className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                <>
                  <CandidateRowSkeleton />
                  <CandidateRowSkeleton />
                  <CandidateRowSkeleton />
                  <CandidateRowSkeleton />
                  <CandidateRowSkeleton />
                </>
              ) : topCandidates.length > 0 ? (
                <motion.div variants={containerVariants} className="space-y-3">
                  {topCandidates.map((candidate, index) => (
                    <CandidateRow
                      key={candidate.id || index}
                      candidate={candidate}
                      index={index}
                    />
                  ))}
                </motion.div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No candidates yet"
                  description="Import your first candidates to start tracking flight risk and intelligence scores."
                />
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Outreach Section - 1/3 width */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Activity className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-200">
                    Recent Outreach
                  </h2>
                  <p className="text-sm text-zinc-500">Latest activity</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <>
                  <OutreachItemSkeleton />
                  <OutreachItemSkeleton />
                  <OutreachItemSkeleton />
                  <OutreachItemSkeleton />
                </>
              ) : recentOutreach.length > 0 ? (
                <motion.div variants={containerVariants} className="space-y-3">
                  {recentOutreach.map((task, index) => (
                    <OutreachItem key={task.id || index} task={task} />
                  ))}
                </motion.div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No outreach activity"
                  description="Start a campaign to begin reaching out to candidates."
                />
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick Actions Section */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Target className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-200">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Add Candidate */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddCandidate(true)}
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all duration-200 group"
            >
              <div className="p-3 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                <Plus className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-zinc-200 group-hover:text-red-300 transition-colors">
                  Add Candidate
                </h3>
                <p className="text-xs text-zinc-500">
                  Add a new candidate manually
                </p>
              </div>
            </motion.button>

            {/* Create Campaign */}
            <Link to={`${createPageUrl("TalentCampaignDetail")}?new=true`}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800/70 rounded-xl border border-zinc-700/50 hover:border-red-500/30 transition-all duration-200 group h-full"
              >
                <div className="p-3 rounded-lg bg-zinc-700/50 group-hover:bg-red-500/20 transition-colors">
                  <Megaphone className="w-6 h-6 text-zinc-400 group-hover:text-red-400 transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-zinc-200 group-hover:text-red-300 transition-colors">
                    Create Campaign
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Launch a new outreach campaign
                  </p>
                </div>
              </motion.div>
            </Link>

            {/* Generate Report */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800/70 rounded-xl border border-zinc-700/50 hover:border-red-500/30 transition-all duration-200 group"
            >
              <div className="p-3 rounded-lg bg-zinc-700/50 group-hover:bg-red-500/20 transition-colors">
                <FileText className="w-6 h-6 text-zinc-400 group-hover:text-red-400 transition-colors" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-zinc-200 group-hover:text-red-300 transition-colors">
                  Intelligence Report
                </h3>
                <p className="text-xs text-zinc-500">
                  Generate candidate analysis
                </p>
              </div>
            </motion.button>

            {/* Import Candidates */}
            <Link to={createPageUrl("ContactsImport")}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800/70 rounded-xl border border-zinc-700/50 hover:border-red-500/30 transition-all duration-200 group h-full"
              >
                <div className="p-3 rounded-lg bg-zinc-700/50 group-hover:bg-red-500/20 transition-colors">
                  <Upload className="w-6 h-6 text-zinc-400 group-hover:text-red-400 transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-zinc-200 group-hover:text-red-300 transition-colors">
                    Import Candidates
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Upload from CSV file
                  </p>
                </div>
              </motion.div>
            </Link>
          </div>
        </GlassCard>
      </motion.div>

      {/* Outreach Queue Section */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <OutreachQueue compact={true} />
        </GlassCard>
      </motion.div>

      {/* Add Candidate Modal */}
      <AddCandidateModal
        isOpen={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
        onSuccess={(newCandidate) => {
          setCandidates((prev) => [newCandidate, ...prev]);
          setShowAddCandidate(false);
        }}
      />
      </motion.div>
    </div>
  );
};

export default TalentDashboard;
