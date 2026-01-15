import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus,
  Edit,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AddCandidateModal, EditCandidateModal } from "@/components/talent";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "@/components/talent/IntelligenceGauge";

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
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center font-medium text-white ring-2 ring-white/10`}
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
                    value === option.value ? "bg-red-500/20 text-red-400" : "text-white/70"
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
const CandidateCard = ({ candidate, isSelected, onToggle, onClick, onEdit }) => {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      className="cursor-pointer relative"
    >
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(candidate.id)}
          onClick={(e) => e.stopPropagation()}
          className="border-zinc-600 bg-zinc-800/80"
        />
      </div>
      <GlassCard className="p-4 hover:border-red-500/30 transition-all duration-300" onClick={onClick}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 ml-6">
            <CandidateAvatar name={`${candidate.first_name} ${candidate.last_name}`} image={candidate.profile_image_url} size="lg" />
            <div>
              <h3 className="font-semibold text-white">{`${candidate.first_name} ${candidate.last_name}`}</h3>
              <p className="text-sm text-white/60">{candidate.job_title}</p>
            </div>
          </div>
          <IntelligenceGauge score={candidate.intelligence_score || 0} size="sm" />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{candidate.company_name || "Not specified"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{candidate.person_home_location || "Not specified"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <IntelligenceLevelBadge level={candidate.intelligence_level || "Low"} />
            <ApproachBadge approach={candidate.recommended_approach || "nurture"} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(candidate);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Candidate Row (Table View)
const CandidateRow = ({ candidate, isSelected, onToggle, onClick, onEdit }) => {
  return (
    <motion.tr
      variants={itemVariants}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      className="cursor-pointer border-b border-white/5 last:border-0"
    >
      <td className="py-4 px-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(candidate.id)}
          className="border-zinc-600"
        />
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <div className="flex items-center gap-3">
          <CandidateAvatar name={`${candidate.first_name} ${candidate.last_name}`} image={candidate.profile_image_url} />
          <div>
            <p className="font-medium text-white">{`${candidate.first_name} ${candidate.last_name}`}</p>
            <p className="text-sm text-white/60">{candidate.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <p className="text-white/80">{candidate.job_title || "—"}</p>
        <p className="text-sm text-white/60">{candidate.company_name || "—"}</p>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <div className="flex items-center gap-3">
          <IntelligenceGauge score={candidate.intelligence_score || 0} size="sm" />
          <IntelligenceLevelBadge level={candidate.intelligence_level || "Low"} />
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <ApproachBadge approach={candidate.recommended_approach || "nurture"} />
      </td>
      <td className="py-4 px-4 text-white/60" onClick={onClick}>
        {candidate.location || "—"}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(candidate);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <Edit className="w-4 h-4" />
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

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, [user]);

  const fetchCandidates = async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("organization_id", user.organization_id)
        .order("created_date", { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      toast.error("Failed to load candidates");
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
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.company_name?.toLowerCase().includes(query) ||
          c.job_title?.toLowerCase().includes(query)
      );
    }

    // Intelligence level filter
    if (filters.intelligenceLevel) {
      result = result.filter((c) => 
        c.intelligence_level?.toLowerCase() === filters.intelligenceLevel.toLowerCase()
      );
    }

    // Approach filter
    if (filters.approach) {
      result = result.filter((c) => c.recommended_approach === filters.approach);
    }

    // Urgency filter
    if (filters.urgency) {
      result = result.filter((c) => 
        c.urgency?.toLowerCase() === filters.urgency.toLowerCase()
      );
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

  const toggleCandidate = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(paginatedCandidates.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      // Delete related outreach tasks first
      const { error: tasksError } = await supabase
        .from("outreach_tasks")
        .delete()
        .in("candidate_id", Array.from(selectedIds));

      if (tasksError) console.warn("Error deleting tasks:", tasksError);

      // Delete candidates
      const { error } = await supabase
        .from("candidates")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setCandidates((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      toast.success(`${selectedIds.size} candidate(s) deleted`);
    } catch (error) {
      console.error("Error deleting candidates:", error);
      toast.error("Failed to delete candidates");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Name", "Email", "Phone", "LinkedIn", "Location",
      "Company", "Title", "Stage", "Status",
      "Intelligence Score", "Intelligence Level", "Urgency", "Approach"
    ];

    const dataToExport = selectedIds.size > 0
      ? candidates.filter((c) => selectedIds.has(c.id))
      : filteredCandidates;

    const rows = dataToExport.map((c) => [
      `${c.first_name || ""} ${c.last_name || ""}`.trim(),
      c.email || "",
      c.phone || "",
      c.linkedin_profile || "",
      c.person_home_location || "",
      c.company_name || "",
      c.job_title || "",
      c.outreach_stage || "",
      c.contact_status || "",
      c.intelligence_score || "",
      c.intelligence_level || "",
      c.intelligence_urgency || "",
      c.recommended_approach || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} candidate(s)`);
  };

  const handleAddSuccess = (newCandidate) => {
    setCandidates((prev) => [newCandidate, ...prev]);
  };

  const handleEditSuccess = (updatedCandidate) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === updatedCandidate.id ? updatedCandidate : c))
    );
  };

  const handleDeleteSuccess = (deletedId) => {
    setCandidates((prev) => prev.filter((c) => c.id !== deletedId));
  };

  const intelligenceLevelOptions = [
    { value: "", label: "All Levels" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  const approachOptions = [
    { value: "", label: "All Approaches" },
    { value: "direct", label: "Direct" },
    { value: "warm_intro", label: "Warm Intro" },
    { value: "referral", label: "Referral" },
    { value: "inbound", label: "Inbound" },
    { value: "event", label: "Event" },
  ];

  const urgencyOptions = [
    { value: "", label: "All Urgency" },
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Candidates"
          subtitle={`${filteredCandidates.length} candidates in your talent pool`}
          icon={Users}
          color="red"
        />
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Candidate
        </Button>
      </div>

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
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-red-500/50"
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
                viewMode === "grid" ? "bg-red-500/20 text-red-400" : "text-white/60 hover:text-white"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-red-500/20 text-red-400" : "text-white/60 hover:text-white"
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

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
            <span className="text-sm text-white/60">
              {selectedIds.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              className="border-zinc-700"
            >
              Deselect
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border-zinc-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </GlassCard>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={selectAllVisible}
          className="text-zinc-400 hover:text-white"
        >
          Select Page
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportCSV}
          className="text-zinc-400 hover:text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </div>

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
              isSelected={selectedIds.has(candidate.id)}
              onToggle={toggleCandidate}
              onClick={() => handleCandidateClick(candidate)}
              onEdit={setEditingCandidate}
            />
          ))}
        </motion.div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-white/60 w-10">
                    <Checkbox
                      checked={selectedIds.size === paginatedCandidates.length && paginatedCandidates.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) selectAllVisible();
                        else deselectAll();
                      }}
                      className="border-zinc-600"
                    />
                  </th>
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
                    isSelected={selectedIds.has(candidate.id)}
                    onToggle={toggleCandidate}
                    onClick={() => handleCandidateClick(candidate)}
                    onEdit={setEditingCandidate}
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
          <Button onClick={() => setShowAddModal(true)} className="bg-red-500 hover:bg-red-600">
            <Plus className="w-4 h-4 mr-2" />
            Add First Candidate
          </Button>
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
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg transition-colors ${
                    currentPage === page
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}
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

      {/* Add Candidate Modal */}
      <AddCandidateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Candidate Modal */}
      <EditCandidateModal
        isOpen={!!editingCandidate}
        onClose={() => setEditingCandidate(null)}
        candidate={editingCandidate}
        onSuccess={handleEditSuccess}
        onDelete={handleDeleteSuccess}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete Candidates
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete {selectedIds.size} selected candidate(s)?
              This will also delete all related outreach tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
