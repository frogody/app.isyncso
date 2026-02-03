import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  X,
  User,
  Building2,
  DollarSign,
  Calendar,
  Clock,
  ChevronRight,
  MoreVertical,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowRightLeft,
  Expand,
  GripVertical,
  Edit3,
  Trash2,
  CalendarClock,
  Activity,
  History,
  Zap,
  Award,
  XCircle,
  Check,
  ChevronDown,
  Users,
  BarChart3,
  Timer,
} from "lucide-react";
import confetti from "canvas-confetti";

// Mock data for opportunities
const MOCK_OPPORTUNITIES = [
  {
    id: "opp-1",
    customer: { id: "cust-1", name: "Acme Corp", avatar: null, industry: "Technology", currentPlan: "Professional", arr: 48000 },
    type: "upsell",
    value: 50000,
    signal: "Hiring surge detected - 15 new engineering roles",
    signalId: "sig-1",
    owner: { id: "user-1", name: "John Smith", avatar: null },
    stage: "qualified",
    priority: "high",
    nextAction: "Schedule demo call",
    nextActionDate: "2026-02-05",
    createdAt: "2026-01-28",
    daysInStage: 3,
    activities: [
      { id: "act-1", type: "note", description: "Initial outreach sent", user: "John Smith", timestamp: "2026-01-28T10:00:00Z" },
      { id: "act-2", type: "stage_change", description: "Moved from New to Qualified", user: "John Smith", timestamp: "2026-01-30T14:00:00Z" },
    ],
    stageHistory: [
      { stage: "new", enteredAt: "2026-01-28T08:00:00Z", exitedAt: "2026-01-30T14:00:00Z" },
      { stage: "qualified", enteredAt: "2026-01-30T14:00:00Z", exitedAt: null },
    ],
  },
  {
    id: "opp-2",
    customer: { id: "cust-2", name: "TechFlow Inc", avatar: null, industry: "SaaS", currentPlan: "Starter", arr: 12000 },
    type: "cross-sell",
    value: 15000,
    signal: "High feature usage - Analytics module interest",
    signalId: "sig-2",
    owner: { id: "user-2", name: "Sarah Chen", avatar: null },
    stage: "engaged",
    priority: "medium",
    nextAction: "Send proposal",
    nextActionDate: "2026-02-06",
    createdAt: "2026-01-20",
    daysInStage: 5,
    activities: [
      { id: "act-3", type: "call", description: "Discovery call - interested in analytics", user: "Sarah Chen", timestamp: "2026-01-25T15:00:00Z" },
      { id: "act-4", type: "email", description: "Sent feature comparison doc", user: "Sarah Chen", timestamp: "2026-01-27T09:00:00Z" },
    ],
    stageHistory: [
      { stage: "new", enteredAt: "2026-01-20T10:00:00Z", exitedAt: "2026-01-22T11:00:00Z" },
      { stage: "qualified", enteredAt: "2026-01-22T11:00:00Z", exitedAt: "2026-01-25T15:30:00Z" },
      { stage: "engaged", enteredAt: "2026-01-25T15:30:00Z", exitedAt: null },
    ],
  },
  {
    id: "opp-3",
    customer: { id: "cust-3", name: "DataPro", avatar: null, industry: "Data Analytics", currentPlan: "Enterprise", arr: 120000 },
    type: "expansion",
    value: 75000,
    signal: "Multi-region expansion announced",
    signalId: "sig-3",
    owner: { id: "user-1", name: "John Smith", avatar: null },
    stage: "proposal",
    priority: "high",
    nextAction: "Follow up on proposal",
    nextActionDate: "2026-02-04",
    createdAt: "2026-01-15",
    daysInStage: 7,
    activities: [
      { id: "act-5", type: "call", description: "Expansion requirements gathering", user: "John Smith", timestamp: "2026-01-18T14:00:00Z" },
      { id: "act-6", type: "email", description: "Sent multi-region proposal", user: "John Smith", timestamp: "2026-01-25T10:00:00Z" },
    ],
    stageHistory: [
      { stage: "new", enteredAt: "2026-01-15T09:00:00Z", exitedAt: "2026-01-16T10:00:00Z" },
      { stage: "qualified", enteredAt: "2026-01-16T10:00:00Z", exitedAt: "2026-01-18T14:30:00Z" },
      { stage: "engaged", enteredAt: "2026-01-18T14:30:00Z", exitedAt: "2026-01-25T10:00:00Z" },
      { stage: "proposal", enteredAt: "2026-01-25T10:00:00Z", exitedAt: null },
    ],
  },
  {
    id: "opp-4",
    customer: { id: "cust-4", name: "CloudFirst", avatar: null, industry: "Cloud Infrastructure", currentPlan: "Team", arr: 24000 },
    type: "upsell",
    value: 8000,
    signal: "Team size doubled in 30 days",
    signalId: "sig-4",
    owner: { id: "user-2", name: "Sarah Chen", avatar: null },
    stage: "new",
    priority: "medium",
    nextAction: "Initial outreach",
    nextActionDate: "2026-02-03",
    createdAt: "2026-02-01",
    daysInStage: 2,
    activities: [],
    stageHistory: [
      { stage: "new", enteredAt: "2026-02-01T08:00:00Z", exitedAt: null },
    ],
  },
  {
    id: "opp-5",
    customer: { id: "cust-5", name: "GlobalTech", avatar: null, industry: "Enterprise Software", currentPlan: "Enterprise", arr: 96000 },
    type: "expansion",
    value: 120000,
    signal: "New subsidiary acquired",
    signalId: "sig-5",
    owner: { id: "user-1", name: "John Smith", avatar: null },
    stage: "won",
    priority: "high",
    nextAction: null,
    nextActionDate: null,
    createdAt: "2026-01-05",
    daysInStage: 0,
    closedAt: "2026-01-30",
    closedValue: 115000,
    activities: [
      { id: "act-7", type: "stage_change", description: "Deal closed - Won!", user: "John Smith", timestamp: "2026-01-30T16:00:00Z" },
    ],
    stageHistory: [
      { stage: "new", enteredAt: "2026-01-05T09:00:00Z", exitedAt: "2026-01-06T10:00:00Z" },
      { stage: "qualified", enteredAt: "2026-01-06T10:00:00Z", exitedAt: "2026-01-10T11:00:00Z" },
      { stage: "engaged", enteredAt: "2026-01-10T11:00:00Z", exitedAt: "2026-01-20T14:00:00Z" },
      { stage: "proposal", enteredAt: "2026-01-20T14:00:00Z", exitedAt: "2026-01-30T16:00:00Z" },
      { stage: "won", enteredAt: "2026-01-30T16:00:00Z", exitedAt: null },
    ],
  },
  {
    id: "opp-6",
    customer: { id: "cust-6", name: "StartupX", avatar: null, industry: "Fintech", currentPlan: "Starter", arr: 6000 },
    type: "upsell",
    value: 12000,
    signal: "Funding round completed",
    signalId: "sig-6",
    owner: { id: "user-2", name: "Sarah Chen", avatar: null },
    stage: "lost",
    priority: "low",
    nextAction: null,
    nextActionDate: null,
    createdAt: "2026-01-10",
    daysInStage: 0,
    lostReason: "Budget constraints - revisit in Q3",
    activities: [
      { id: "act-8", type: "stage_change", description: "Moved to Lost - Budget constraints", user: "Sarah Chen", timestamp: "2026-01-28T11:00:00Z" },
    ],
    stageHistory: [
      { stage: "new", enteredAt: "2026-01-10T10:00:00Z", exitedAt: "2026-01-12T09:00:00Z" },
      { stage: "qualified", enteredAt: "2026-01-12T09:00:00Z", exitedAt: "2026-01-20T14:00:00Z" },
      { stage: "engaged", enteredAt: "2026-01-20T14:00:00Z", exitedAt: "2026-01-28T11:00:00Z" },
      { stage: "lost", enteredAt: "2026-01-28T11:00:00Z", exitedAt: null },
    ],
  },
];

const DEFAULT_STAGES = [
  { id: "new", name: "New", color: "zinc", icon: Sparkles },
  { id: "qualified", name: "Qualified", color: "blue", icon: CheckCircle2 },
  { id: "engaged", name: "Engaged", color: "purple", icon: MessageSquare },
  { id: "proposal", name: "Proposal", color: "amber", icon: FileText },
  { id: "won", name: "Won", color: "green", icon: Award },
  { id: "lost", name: "Lost", color: "red", icon: XCircle },
];

const STAGE_COLORS = {
  new: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30", dot: "bg-zinc-400" },
  qualified: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  engaged: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
  proposal: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  won: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
  lost: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
};

const TYPE_STYLES = {
  upsell: { bg: "bg-green-500/20", text: "text-green-400", icon: ArrowUpRight },
  "cross-sell": { bg: "bg-blue-500/20", text: "text-blue-400", icon: ArrowRightLeft },
  expansion: { bg: "bg-purple-500/20", text: "text-purple-400", icon: Expand },
};

const PRIORITY_COLORS = {
  high: "bg-red-400",
  medium: "bg-yellow-400",
  low: "bg-zinc-400",
};

const ACTIVITY_ICONS = {
  call: Phone,
  email: Mail,
  note: MessageSquare,
  stage_change: History,
  task: CheckCircle2,
};

// Mock customers for the create modal
const MOCK_CUSTOMERS = [
  { id: "cust-1", name: "Acme Corp", industry: "Technology" },
  { id: "cust-2", name: "TechFlow Inc", industry: "SaaS" },
  { id: "cust-3", name: "DataPro", industry: "Data Analytics" },
  { id: "cust-4", name: "CloudFirst", industry: "Cloud Infrastructure" },
  { id: "cust-7", name: "InnovateCo", industry: "AI/ML" },
  { id: "cust-8", name: "ScaleUp Ltd", industry: "E-commerce" },
];

const MOCK_TEAM = [
  { id: "user-1", name: "John Smith" },
  { id: "user-2", name: "Sarah Chen" },
  { id: "user-3", name: "Mike Johnson" },
];

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Stats Bar Component
const StatsBar = ({ opportunities }) => {
  const stats = useMemo(() => {
    const activeOpps = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
    const wonOpps = opportunities.filter((o) => o.stage === "won");
    const lostOpps = opportunities.filter((o) => o.stage === "lost");

    const totalPipelineValue = activeOpps.reduce((sum, o) => sum + o.value, 0);
    const wonValue = wonOpps.reduce((sum, o) => sum + (o.closedValue || o.value), 0);
    const winRate = wonOpps.length + lostOpps.length > 0
      ? Math.round((wonOpps.length / (wonOpps.length + lostOpps.length)) * 100)
      : 0;

    // Calculate average days to close for won deals
    const avgDaysToClose = wonOpps.length > 0
      ? Math.round(
          wonOpps.reduce((sum, o) => {
            const created = new Date(o.createdAt);
            const closed = new Date(o.closedAt || o.createdAt);
            return sum + Math.ceil((closed - created) / (1000 * 60 * 60 * 24));
          }, 0) / wonOpps.length
        )
      : 0;

    const byStage = DEFAULT_STAGES.map((stage) => ({
      ...stage,
      count: opportunities.filter((o) => o.stage === stage.id).length,
    }));

    return { totalPipelineValue, wonValue, winRate, avgDaysToClose, byStage };
  }, [opportunities]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total Pipeline */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Pipeline Value</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalPipelineValue)}</div>
        </div>

        {/* Won Revenue */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Won Revenue</div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(stats.wonValue)}</div>
        </div>

        {/* Win Rate */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Win Rate</div>
          <div className="text-2xl font-bold text-white">{stats.winRate}%</div>
        </div>

        {/* Avg Days to Close */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Avg Days to Close</div>
          <div className="text-2xl font-bold text-white">{stats.avgDaysToClose}</div>
        </div>

        {/* Stage Breakdown */}
        <div className="col-span-2 space-y-1">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">By Stage</div>
          <div className="flex flex-wrap gap-2">
            {stats.byStage.filter((s) => s.count > 0).map((stage) => (
              <div
                key={stage.id}
                className={`px-2 py-1 rounded-md text-xs font-medium ${STAGE_COLORS[stage.id].bg} ${STAGE_COLORS[stage.id].text}`}
              >
                {stage.name}: {stage.count}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Opportunity Card Component
const OpportunityCard = ({ opportunity, onDragStart, onDragEnd, isDragging, onClick }) => {
  const TypeIcon = TYPE_STYLES[opportunity.type]?.icon || Target;

  return (
    <motion.div
      layout
      layoutId={opportunity.id}
      draggable
      onDragStart={(e) => onDragStart(e, opportunity)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(opportunity)}
      className={`
        bg-zinc-800 border border-zinc-700 rounded-lg p-4 cursor-grab active:cursor-grabbing
        hover:border-zinc-600 transition-colors group
        ${isDragging ? "opacity-50 ring-2 ring-cyan-500 shadow-xl scale-[1.02]" : ""}
      `}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-white">
            {opportunity.customer.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-white text-sm">{opportunity.customer.name}</div>
            <div className="text-xs text-zinc-500">{opportunity.customer.industry}</div>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[opportunity.priority]}`} title={`${opportunity.priority} priority`} />
      </div>

      {/* Type Badge & Value */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${TYPE_STYLES[opportunity.type].bg} ${TYPE_STYLES[opportunity.type].text}`}>
          <TypeIcon className="w-3 h-3" />
          {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1).replace("-", " ")}
        </span>
        <span className="text-lg font-bold text-white">{formatCurrency(opportunity.value)}</span>
      </div>

      {/* Signal */}
      <div className="flex items-start gap-2 mb-3 p-2 bg-zinc-900/50 rounded-lg">
        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <span className="text-xs text-zinc-400 line-clamp-2">{opportunity.signal}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{opportunity.owner.name.split(" ")[0]}</span>
          </div>
          <span className="text-zinc-600">•</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{opportunity.daysInStage}d</span>
          </div>
        </div>
        {opportunity.nextAction && (
          <div className="flex items-center gap-1 text-cyan-400">
            <CalendarClock className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{formatDate(opportunity.nextActionDate)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Kanban Column Component
const KanbanColumn = ({ stage, opportunities, onDrop, draggedOpp, onCardClick, onDragStart, onDragEnd }) => {
  const [isOver, setIsOver] = useState(false);
  const StageIcon = stage.icon;

  const handleDragOver = (e) => {
    e.preventDefault();
    if (draggedOpp && draggedOpp.stage !== stage.id) {
      setIsOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    if (draggedOpp && draggedOpp.stage !== stage.id) {
      onDrop(draggedOpp, stage.id);
    }
  };

  const totalValue = opportunities.reduce((sum, o) => sum + o.value, 0);

  return (
    <div
      className={`
        flex-shrink-0 w-[300px] bg-zinc-900/30 rounded-xl p-4 flex flex-col
        transition-all duration-200
        ${isOver ? "bg-cyan-500/10 border-2 border-dashed border-cyan-500" : "border border-zinc-800"}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${STAGE_COLORS[stage.id].bg}`}>
            <StageIcon className={`w-4 h-4 ${STAGE_COLORS[stage.id].text}`} />
          </div>
          <span className="font-medium text-white">{stage.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage.id].bg} ${STAGE_COLORS[stage.id].text}`}>
            {opportunities.length}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{formatCurrency(totalValue)}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-350px)] pr-1">
        <AnimatePresence mode="popLayout">
          {opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggedOpp?.id === opp.id}
              onClick={onCardClick}
            />
          ))}
        </AnimatePresence>
        {opportunities.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm">
            No opportunities
          </div>
        )}
      </div>
    </div>
  );
};

// Lost Reason Modal
const LostReasonModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    onConfirm(reason);
    setReason("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full"
      >
        <h3 className="text-lg font-semibold text-white mb-2">Mark as Lost</h3>
        <p className="text-sm text-zinc-400 mb-4">Please provide a reason for losing this opportunity.</p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Budget constraints, Chose competitor, Not a priority..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          rows={3}
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Mark as Lost
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Opportunity Detail Modal
const OpportunityModal = ({ opportunity, isOpen, onClose, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [newActivity, setNewActivity] = useState({ type: "note", description: "" });
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [newAction, setNewAction] = useState({ type: "task", description: "", dueDate: "", assignee: "" });
  const [showActionForm, setShowActionForm] = useState(false);

  if (!isOpen || !opportunity) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "actions", label: "Actions", icon: CheckCircle2 },
    { id: "signals", label: "Signals", icon: Zap },
  ];

  const TypeIcon = TYPE_STYLES[opportunity.type]?.icon || Target;

  const handleAddActivity = () => {
    if (!newActivity.description.trim()) return;
    const activity = {
      id: `act-${Date.now()}`,
      type: newActivity.type,
      description: newActivity.description,
      user: "Current User",
      timestamp: new Date().toISOString(),
    };
    onUpdate({
      ...opportunity,
      activities: [...opportunity.activities, activity],
    });
    setNewActivity({ type: "note", description: "" });
    setShowActivityForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-semibold text-white">
                {opportunity.customer.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{opportunity.customer.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${TYPE_STYLES[opportunity.type].bg} ${TYPE_STYLES[opportunity.type].text}`}>
                    <TypeIcon className="w-3 h-3" />
                    {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1).replace("-", " ")}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[opportunity.stage].bg} ${STAGE_COLORS[opportunity.stage].text}`}>
                    {opportunity.stage.charAt(0).toUpperCase() + opportunity.stage.slice(1)}
                  </span>
                  <span className="text-2xl font-bold text-white">{formatCurrency(opportunity.value)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === tab.id
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }
                  `}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 gap-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Customer Info</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Industry</span>
                    <span className="text-white">{opportunity.customer.industry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Current Plan</span>
                    <span className="text-white">{opportunity.customer.currentPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Current ARR</span>
                    <span className="text-white">{formatCurrency(opportunity.customer.arr)}</span>
                  </div>
                </div>
              </div>

              {/* Opportunity Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Opportunity Details</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Created</span>
                    <span className="text-white">{formatDate(opportunity.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Priority</span>
                    <span className={`capitalize ${opportunity.priority === "high" ? "text-red-400" : opportunity.priority === "medium" ? "text-yellow-400" : "text-zinc-400"}`}>
                      {opportunity.priority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Owner</span>
                    <span className="text-white">{opportunity.owner.name}</span>
                  </div>
                </div>
              </div>

              {/* Source Signal */}
              <div className="col-span-2 space-y-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Source Signal</h3>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-white">{opportunity.signal}</p>
                    <button className="text-sm text-cyan-400 hover:text-cyan-300 mt-2 flex items-center gap-1">
                      View in Customer Signals <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stage History */}
              <div className="col-span-2 space-y-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Stage History</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-700" />
                  <div className="space-y-4">
                    {opportunity.stageHistory.map((entry, index) => {
                      const stageConfig = DEFAULT_STAGES.find((s) => s.id === entry.stage);
                      const StageIcon = stageConfig?.icon || CheckCircle2;
                      return (
                        <div key={index} className="flex items-start gap-4 relative">
                          <div className={`w-8 h-8 rounded-full ${STAGE_COLORS[entry.stage].bg} flex items-center justify-center z-10`}>
                            <StageIcon className={`w-4 h-4 ${STAGE_COLORS[entry.stage].text}`} />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{stageConfig?.name || entry.stage}</span>
                              {!entry.exitedAt && (
                                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Current</span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              Entered: {new Date(entry.enteredAt).toLocaleString()}
                              {entry.exitedAt && ` • Exited: ${new Date(entry.exitedAt).toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Activity Feed</h3>
                <button
                  onClick={() => setShowActivityForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Activity
                </button>
              </div>

              {showActivityForm && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                >
                  <div className="flex gap-3 mb-3">
                    {["note", "call", "email"].map((type) => {
                      const Icon = ACTIVITY_ICONS[type];
                      return (
                        <button
                          key={type}
                          onClick={() => setNewActivity({ ...newActivity, type })}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                            ${newActivity.type === type
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700"
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="Add a note, log a call, or record an email..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setShowActivityForm(false)}
                      className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddActivity}
                      disabled={!newActivity.description.trim()}
                      className="px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                {[...opportunity.activities].reverse().map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.type] || MessageSquare;
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                      <div className="p-2 bg-zinc-700 rounded-lg">
                        <Icon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                          <span>{activity.user}</span>
                          <span>•</span>
                          <span>{new Date(activity.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {opportunity.activities.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    No activities yet. Add one above!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Scheduled Actions</h3>
                <button
                  onClick={() => setShowActionForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Action
                </button>
              </div>

              {opportunity.nextAction && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <CalendarClock className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{opportunity.nextAction}</p>
                        <p className="text-sm text-zinc-400">Due: {formatDate(opportunity.nextActionDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-zinc-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!opportunity.nextAction && (
                <div className="text-center py-8 text-zinc-500">
                  No scheduled actions. Add one to stay on track!
                </div>
              )}
            </div>
          )}

          {activeTab === "signals" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Customer Signals</h3>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{opportunity.signal}</p>
                    <p className="text-sm text-zinc-400 mt-1">Detected on {formatDate(opportunity.createdAt)}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Growth Signal</span>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors flex items-center justify-center gap-2">
                <ChevronRight className="w-4 h-4" />
                View all signals for {opportunity.customer.name}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 flex justify-between">
          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this opportunity?")) {
                onDelete(opportunity.id);
                onClose();
              }
            }}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Create Opportunity Modal
const CreateOpportunityModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    customerId: "",
    type: "upsell",
    value: "",
    source: "manual",
    signal: "",
    notes: "",
    ownerId: "",
  });
  const [customerSearch, setCustomerSearch] = useState("");

  const filteredCustomers = MOCK_CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const customer = MOCK_CUSTOMERS.find((c) => c.id === formData.customerId);
    const owner = MOCK_TEAM.find((u) => u.id === formData.ownerId) || MOCK_TEAM[0];

    const newOpp = {
      id: `opp-${Date.now()}`,
      customer: {
        id: customer.id,
        name: customer.name,
        avatar: null,
        industry: customer.industry,
        currentPlan: "Unknown",
        arr: 0,
      },
      type: formData.type,
      value: parseInt(formData.value) || 0,
      signal: formData.source === "manual" ? formData.notes : formData.signal,
      signalId: null,
      owner: { id: owner.id, name: owner.name, avatar: null },
      stage: "new",
      priority: "medium",
      nextAction: "Initial qualification",
      nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString().split("T")[0],
      daysInStage: 0,
      activities: [],
      stageHistory: [
        { stage: "new", enteredAt: new Date().toISOString(), exitedAt: null },
      ],
    };

    onCreate(newOpp);
    setFormData({
      customerId: "",
      type: "upsell",
      value: "",
      source: "manual",
      signal: "",
      notes: "",
      ownerId: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Create Opportunity</h3>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Customer *</label>
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg max-h-40 overflow-y-auto z-10">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, customerId: customer.id });
                        setCustomerSearch(customer.name);
                      }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-zinc-700 flex items-center justify-between"
                    >
                      <span>{customer.name}</span>
                      <span className="text-xs text-zinc-500">{customer.industry}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Opportunity Type *</label>
            <div className="flex gap-2">
              {["upsell", "cross-sell", "expansion"].map((type) => {
                const TypeIcon = TYPE_STYLES[type].icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${formData.type === type
                        ? `${TYPE_STYLES[type].bg} ${TYPE_STYLES[type].text} border border-current`
                        : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                      }
                    `}
                  >
                    <TypeIcon className="w-4 h-4" />
                    {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Estimated Value *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="25000"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Source</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, source: "manual" })}
                className={`
                  flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${formData.source === "manual"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                  }
                `}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, source: "signal" })}
                className={`
                  flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${formData.source === "signal"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                  }
                `}
              >
                From Signal
              </button>
            </div>
          </div>

          {/* Notes / Signal */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              {formData.source === "manual" ? "Notes" : "Select Signal"}
            </label>
            <textarea
              value={formData.source === "manual" ? formData.notes : formData.signal}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [formData.source === "manual" ? "notes" : "signal"]: e.target.value,
                })
              }
              placeholder={formData.source === "manual" ? "Add any relevant notes..." : "Describe the triggering signal..."}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={3}
            />
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Assign To</label>
            <select
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select owner...</option>
              {MOCK_TEAM.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.customerId || !formData.value}
              className="px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Opportunity
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Filters Panel
const FiltersPanel = ({ filters, setFilters, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl z-20"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-white">Filters</h4>
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Type Filter */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Type</label>
          <div className="flex flex-wrap gap-2">
            {["upsell", "cross-sell", "expansion"].map((type) => (
              <button
                key={type}
                onClick={() => setFilters({ ...filters, type: filters.type === type ? null : type })}
                className={`
                  px-2.5 py-1 rounded text-xs font-medium transition-colors
                  ${filters.type === type
                    ? `${TYPE_STYLES[type].bg} ${TYPE_STYLES[type].text}`
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }
                `}
              >
                {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Priority</label>
          <div className="flex gap-2">
            {["high", "medium", "low"].map((priority) => (
              <button
                key={priority}
                onClick={() => setFilters({ ...filters, priority: filters.priority === priority ? null : priority })}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors
                  ${filters.priority === priority
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }
                `}
              >
                <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[priority]}`} />
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Owner Filter */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Owner</label>
          <select
            value={filters.owner || ""}
            onChange={(e) => setFilters({ ...filters, owner: e.target.value || null })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Owners</option>
            {MOCK_TEAM.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        {/* Quick Filters */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Quick Filters</label>
          <div className="space-y-2">
            <button
              onClick={() => setFilters({ ...filters, myOpportunities: !filters.myOpportunities })}
              className={`
                w-full px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center gap-2
                ${filters.myOpportunities ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-800 text-zinc-400 hover:text-white"}
              `}
            >
              <User className="w-4 h-4" />
              My Opportunities
            </button>
            <button
              onClick={() => setFilters({ ...filters, highPriority: !filters.highPriority })}
              className={`
                w-full px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center gap-2
                ${filters.highPriority ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400 hover:text-white"}
              `}
            >
              <AlertCircle className="w-4 h-4" />
              High Priority
            </button>
            <button
              onClick={() => setFilters({ ...filters, stale: !filters.stale })}
              className={`
                w-full px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center gap-2
                ${filters.stale ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400 hover:text-white"}
              `}
            >
              <Clock className="w-4 h-4" />
              Stale (&gt;14 days)
            </button>
          </div>
        </div>

        {/* Clear Filters */}
        <button
          onClick={() => setFilters({})}
          className="w-full py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </motion.div>
  );
};

// Main Component
export default function GrowthOpportunities() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState(MOCK_OPPORTUNITIES);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [pendingLostOpp, setPendingLostOpp] = useState(null);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedOpp, setDraggedOpp] = useState(null);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search
      if (searchQuery && !opp.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Type
      if (filters.type && opp.type !== filters.type) return false;
      // Priority
      if (filters.priority && opp.priority !== filters.priority) return false;
      // Owner
      if (filters.owner && opp.owner.id !== filters.owner) return false;
      // High Priority quick filter
      if (filters.highPriority && opp.priority !== "high") return false;
      // Stale quick filter
      if (filters.stale && opp.daysInStage <= 14) return false;
      // My opportunities (mock - would use current user)
      if (filters.myOpportunities && opp.owner.id !== "user-1") return false;

      return true;
    });
  }, [opportunities, filters, searchQuery]);

  // Group by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped = {};
    DEFAULT_STAGES.forEach((stage) => {
      grouped[stage.id] = filteredOpportunities.filter((o) => o.stage === stage.id);
    });
    return grouped;
  }, [filteredOpportunities]);

  // Drag handlers
  const handleDragStart = (e, opp) => {
    setDraggedOpp(opp);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedOpp(null);
  };

  const handleDrop = (opp, newStage) => {
    if (newStage === "lost") {
      setPendingLostOpp(opp);
      setShowLostModal(true);
      return;
    }

    moveToStage(opp, newStage);
  };

  const moveToStage = (opp, newStage, lostReason = null) => {
    setOpportunities((prev) =>
      prev.map((o) => {
        if (o.id !== opp.id) return o;

        const now = new Date().toISOString();
        const updatedHistory = o.stageHistory.map((h) =>
          h.exitedAt === null ? { ...h, exitedAt: now } : h
        );
        updatedHistory.push({ stage: newStage, enteredAt: now, exitedAt: null });

        const newActivity = {
          id: `act-${Date.now()}`,
          type: "stage_change",
          description: `Moved from ${o.stage.charAt(0).toUpperCase() + o.stage.slice(1)} to ${newStage.charAt(0).toUpperCase() + newStage.slice(1)}${lostReason ? ` - ${lostReason}` : ""}`,
          user: "Current User",
          timestamp: now,
        };

        return {
          ...o,
          stage: newStage,
          daysInStage: 0,
          stageHistory: updatedHistory,
          activities: [...o.activities, newActivity],
          ...(newStage === "won" && { closedAt: now.split("T")[0], closedValue: o.value }),
          ...(newStage === "lost" && { lostReason }),
        };
      })
    );

    // Confetti for Won
    if (newStage === "won") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#10b981", "#059669"],
      });
    }

    setDraggedOpp(null);
  };

  const handleLostConfirm = (reason) => {
    if (pendingLostOpp) {
      moveToStage(pendingLostOpp, "lost", reason);
    }
    setShowLostModal(false);
    setPendingLostOpp(null);
  };

  const handleCreate = (newOpp) => {
    setOpportunities((prev) => [...prev, newOpp]);
  };

  const handleUpdate = (updatedOpp) => {
    setOpportunities((prev) => prev.map((o) => (o.id === updatedOpp.id ? updatedOpp : o)));
    setSelectedOpp(updatedOpp);
  };

  const handleDelete = (oppId) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== oppId));
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Expansion Opportunities</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Manage and track opportunities from customer signals
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-64"
                />
              </div>

              {/* Filters */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${showFilters || activeFiltersCount > 0
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                    }
                  `}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showFilters && (
                    <FiltersPanel
                      filters={filters}
                      setFilters={setFilters}
                      isOpen={showFilters}
                      onClose={() => setShowFilters(false)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Create Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Opportunity
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <StatsBar opportunities={opportunities} />
      </div>

      {/* Kanban Board */}
      <div className="px-6 pb-6">
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {DEFAULT_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opportunities={opportunitiesByStage[stage.id] || []}
                onDrop={handleDrop}
                draggedOpp={draggedOpp}
                onCardClick={setSelectedOpp}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedOpp && (
          <OpportunityModal
            opportunity={selectedOpp}
            isOpen={!!selectedOpp}
            onClose={() => setSelectedOpp(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <CreateOpportunityModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLostModal && (
          <LostReasonModal
            isOpen={showLostModal}
            onClose={() => {
              setShowLostModal(false);
              setPendingLostOpp(null);
            }}
            onConfirm={handleLostConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
