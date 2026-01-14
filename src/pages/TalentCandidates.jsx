import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Star,
  StarOff,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Intelligence Gauge Component
const IntelligenceGauge = ({ score, size = "md" }) => {
  const sizes = {
    sm: { width: 48, height: 48, strokeWidth: 4, fontSize: "text-xs" },
    md: { width: 64, height: 64, strokeWidth: 5, fontSize: "text-sm" },
    lg: { width: 80, height: 80, strokeWidth: 6, fontSize: "text-base" },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score) => {
    if (score >= 80) return { stroke: "#ef4444", text: "text-red-400", bg: "bg-red-500/20" };
    if (score >= 60) return { stroke: "#f97316", text: "text-orange-400", bg: "bg-orange-500/20" };
    if (score >= 40) return { stroke: "#eab308", text: "text-yellow-400", bg: "bg-yellow-500/20" };
    return { stroke: "#22c55e", text: "text-green-400", bg: "bg-green-500/20" };
  };

  const colors = getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={width} height={height} className="-rotate-90">
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className={`absolute ${fontSize} font-bold ${colors.text}`}>
        {score}
      </span>
    </div>
  );
};

// Intelligence Level Badge
const IntelligenceLevelBadge = ({ level }) => {
  const styles = {
    Critical: "bg-red-500/20 text-red-400 border-red-500/30",
    High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[level] || styles.Low}`}>
      {level}
    </span>
  );
};

// Approach Badge
const ApproachBadge = ({ approach }) => {
  const styles = {
    immediate: { bg: "bg-red-500/20", text: "text-red-400", label: "Immediate" },
    targeted: { bg: "bg-violet-500/20", text: "text-violet-400", label: "Targeted" },
    nurture: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Nurture" },
  };

  const style = styles[approach] || styles.nurture;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// Candidate Avatar
const CandidateAvatar = ({ name, image, size = "md" }) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white/10`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-medium text-white ring-2 ring-white/10`}
    >
      {initials}
    </div>
  );
};

// Filter Dropdown
const FilterDropdown = ({ label, value, options, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-colors"
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{value || label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors ${
                    value === option.value ? "bg-violet-500/20 text-violet-400" : "text-white/70"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Candidate Card (Grid View)
const CandidateCard = ({ candidate, onClick }) => {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <GlassCard className="p-4 hover:border-violet-500/30 transition-all duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <CandidateAvatar name={candidate.name} image={candidate.avatar_url} size="lg" />
            <div>
              <h3 className="font-semibold text-white">{candidate.name}</h3>
              <p className="text-sm text-white/60">{candidate.current_title}</p>
            </div>
          </div>
          <IntelligenceGauge score={candidate.intelligence_score || 0} size="sm" />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{candidate.current_company || "Not specified"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{candidate.location || "Not specified"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <IntelligenceLevelBadge level={candidate.intelligence_level || "Low"} />
            <ApproachBadge approach={candidate.recommended_approach || "nurture"} />
          </div>
          <ArrowRight className="w-4 h-4 text-white/40" />
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Candidate Row (Table View)
const CandidateRow = ({ candidate, onClick }) => {
  return (
    <motion.tr
      variants={itemVariants}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      onClick={onClick}
      className="cursor-pointer border-b border-white/5 last:border-0"
    >
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <CandidateAvatar name={candidate.name} image={candidate.avatar_url} />
          <div>
            <p className="font-medium text-white">{candidate.name}</p>
            <p className="text-sm text-white/60">{candidate.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <p className="text-white/80">{candidate.current_title || "—"}</p>
        <p className="text-sm text-white/60">{candidate.current_company || "—"}</p>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <IntelligenceGauge score={candidate.intelligence_score || 0} size="sm" />
          <IntelligenceLevelBadge level={candidate.intelligence_level || "Low"} />
        </div>
      </td>
      <td className="py-4 px-4">
        <ApproachBadge approach={candidate.recommended_approach || "nurture"} />
      </td>
      <td className="py-4 px-4 text-white/60">
        {candidate.location || "—"}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

export default function TalentCandidates() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [filters, setFilters] = useState({
    intelligenceLevel: "",
    approach: "",
    urgency: "",
  });
  const [sortBy, setSortBy] = useState("intelligence_score");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchCandidates();
  }, [user]);

  const fetchCandidates = async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      const { data, error } = await db
        .from("candidates")
        .select("*")
        .eq("organization_id", user.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.current_company?.toLowerCase().includes(query) ||
          c.current_title?.toLowerCase().includes(query)
      );
    }

    // Intelligence level filter
    if (filters.intelligenceLevel) {
      result = result.filter((c) => c.intelligence_level === filters.intelligenceLevel);
    }

    // Approach filter
    if (filters.approach) {
      result = result.filter((c) => c.recommended_approach === filters.approach);
    }

    // Urgency filter
    if (filters.urgency) {
      result = result.filter((c) => c.intelligence_urgency === filters.urgency);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
      if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [candidates, searchQuery, filters, sortBy, sortOrder]);

  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCandidates.slice(start, start + itemsPerPage);
  }, [filteredCandidates, currentPage]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  const handleCandidateClick = (candidate) => {
    navigate(createPageUrl("TalentCandidateProfile") + `?id=${candidate.id}`);
  };

  const intelligenceLevelOptions = [
    { value: "", label: "All Levels" },
    { value: "Critical", label: "Critical" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ];

  const approachOptions = [
    { value: "", label: "All Approaches" },
    { value: "immediate", label: "Immediate" },
    { value: "targeted", label: "Targeted" },
    { value: "nurture", label: "Nurture" },
  ];

  const urgencyOptions = [
    { value: "", label: "All Urgency" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Candidates"
        description={`${filteredCandidates.length} candidates in your talent pool`}
        icon={Users}
        iconColor="violet"
      />

      {/* Filters Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Filters */}
          <FilterDropdown
            label="Intelligence Level"
            value={filters.intelligenceLevel || "All Levels"}
            options={intelligenceLevelOptions}
            onChange={(val) => setFilters((f) => ({ ...f, intelligenceLevel: val }))}
            icon={AlertTriangle}
          />

          <FilterDropdown
            label="Approach"
            value={filters.approach || "All Approaches"}
            options={approachOptions}
            onChange={(val) => setFilters((f) => ({ ...f, approach: val }))}
            icon={TrendingUp}
          />

          <FilterDropdown
            label="Urgency"
            value={filters.urgency || "All Urgency"}
            options={urgencyOptions}
            onChange={(val) => setFilters((f) => ({ ...f, urgency: val }))}
            icon={Clock}
          />

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-violet-500/20 text-violet-400" : "text-white/60 hover:text-white"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-violet-500/20 text-violet-400" : "text-white/60 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchCandidates}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>

      {/* Candidates Display */}
      {viewMode === "grid" ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {paginatedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onClick={() => handleCandidateClick(candidate)}
            />
          ))}
        </motion.div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Candidate</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Position</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Intelligence</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Approach</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Location</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                {paginatedCandidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    onClick={() => handleCandidateClick(candidate)}
                  />
                ))}
              </motion.tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {filteredCandidates.length === 0 && !loading && (
        <GlassCard className="p-12 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No candidates found</h3>
          <p className="text-white/60 mb-6">
            {searchQuery || Object.values(filters).some(Boolean)
              ? "Try adjusting your filters or search query"
              : "Start building your talent pool by adding candidates"}
          </p>
        </GlassCard>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredCandidates.length)} of{" "}
            {filteredCandidates.length} candidates
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg transition-colors ${
                  currentPage === i + 1
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
