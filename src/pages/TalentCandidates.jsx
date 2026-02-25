import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { useTheme } from "@/contexts/GlobalThemeContext";
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
  Grid3X3,
  List,
  Building2,
  MapPin,
  Eye,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Download,
  Loader2,
  Upload,
  Megaphone,
  Package,
  Zap,
  AlertTriangle,
  Ban,
  ShieldAlert,
  Linkedin,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AddCandidateModal, EditCandidateModal, CandidateImportModal, CandidateDetailDrawer, BulkActionBar, AddToCampaignModal, SearchFilterBar } from "@/components/talent";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge, IntelStatusBadge } from "@/components/talent/IntelligenceGauge";
import EnrichmentProgress from "@/components/talent/EnrichmentProgress";
import { useCandidateFilters, extractFilterOptions, countActiveFilters, getDefaultFilters } from "@/hooks/useCandidateFilters";
import { useShortcut } from "@/contexts/KeyboardShortcutsContext";

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

// Smart pagination helper - shows pages around current page
const getVisiblePages = (current, total, maxVisible = 5) => {
  const pages = [];
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = Math.min(total, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
};

// Candidate Avatar
const CandidateAvatar = ({ name, image, size = "md" }) => {
  const sizes = {
    xs: "w-6 h-6 text-[9px]",
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

// Candidate Card (Grid View)
const CandidateCard = ({ candidate, isSelected, isFocused, onToggle, onClick, onEdit, t }) => {
  return (
    <motion.div
      variants={itemVariants}

      className="cursor-pointer relative"
      data-candidate-card
    >
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(candidate.id)}
          onClick={(e) => e.stopPropagation()}
          className={t("border-gray-300 bg-white", "border-zinc-600 bg-zinc-800/80")}
        />
      </div>
      <GlassCard className={`p-4 hover:border-red-500/30 transition-all duration-300 ${isFocused ? "ring-1 ring-red-500/50 border-red-500/30" : ""}`} onClick={onClick}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 ml-6">
            <CandidateAvatar name={`${candidate.first_name} ${candidate.last_name}`} image={candidate.profile_image_url} size="lg" />
            <div>
              <h3 className={`font-semibold ${t("text-gray-900", "text-white")}`}>{`${candidate.first_name} ${candidate.last_name}`}</h3>
              <p className={`text-sm ${t("text-gray-500", "text-white/60")}`}>{candidate.job_title}</p>
            </div>
          </div>
          <IntelligenceGauge score={candidate.intelligence_score || 0} size="sm" />
        </div>

        <div className="space-y-2 mb-4">
          <div className={`flex items-center gap-2 text-sm ${t("text-gray-500", "text-white/60")}`}>
            <Building2 className="w-4 h-4" />
            <span className="truncate">{candidate.company_name || "Not specified"}</span>
          </div>
          <div className={`flex items-center gap-2 text-sm ${t("text-gray-500", "text-white/60")}`}>
            <MapPin className="w-4 h-4" />
            <span className="truncate">{candidate.person_home_location || "Not specified"}</span>
          </div>
        </div>

        <div className={`flex items-center justify-between pt-3 border-t ${t("border-gray-200", "border-white/10")}`}>
          <div className="flex items-center gap-2">
            <IntelligenceLevelBadge level={candidate.intelligence_level || "Low"} />
            <ApproachBadge approach={candidate.recommended_approach || "nurture"} />
            <IntelStatusBadge
              lastIntelUpdate={candidate.last_intelligence_update}
              intelligenceScore={candidate.intelligence_score}
              size="sm"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(candidate);
            }}
            className={`p-1.5 rounded-lg ${t("hover:bg-gray-100 text-gray-400 hover:text-gray-900", "hover:bg-white/10 text-white/40 hover:text-white")} transition-colors`}
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Candidate Row (Table View)
const CandidateRow = ({ candidate, isSelected, isFocused, onToggle, onClick, onEdit, t }) => {
  return (
    <motion.tr
      variants={itemVariants}
      className={`cursor-pointer border-b ${t("border-gray-100", "border-white/5")} last:border-0 h-9 ${
        isFocused ? "ring-1 ring-red-500/50 bg-red-500/5" : ""
      }`}
      data-candidate-row
    >
      <td className="py-1 px-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(candidate.id)}
          className={`${t("border-gray-300", "border-zinc-600")} w-3.5 h-3.5`}
        />
      </td>
      <td className="py-1 px-2" onClick={onClick}>
        <div className="flex items-center gap-1.5">
          <CandidateAvatar name={`${candidate.first_name} ${candidate.last_name}`} image={candidate.profile_image_url} size="xs" />
          <span className={`font-medium ${t("text-gray-900", "text-white")} text-xs truncate max-w-[140px]`}>{`${candidate.first_name} ${candidate.last_name}`}</span>
        </div>
      </td>
      <td className="py-1 px-2" onClick={onClick}>
        <p className={`${t("text-gray-600", "text-white/70")} text-xs truncate max-w-[200px]`}>{candidate.job_title || "\u2014"}</p>
        <p className={`text-[10px] ${t("text-gray-400", "text-white/40")} truncate max-w-[200px]`}>{candidate.company_name || ""}</p>
      </td>
      <td className="py-1 px-2" onClick={onClick}>
        <div className="flex items-center gap-1.5">
          <IntelligenceGauge score={candidate.intelligence_score || 0} size="xs" animated={false} />
          <IntelligenceLevelBadge level={candidate.intelligence_level || "Low"} size="xs" />
        </div>
      </td>
      <td className="py-1 px-2" onClick={onClick}>
        <ApproachBadge approach={candidate.recommended_approach || "nurture"} size="xs" />
      </td>
      <td className="py-1 px-2" onClick={onClick}>
        <IntelStatusBadge
          lastIntelUpdate={candidate.last_intelligence_update}
          intelligenceScore={candidate.intelligence_score}
          size="xs"
        />
      </td>
      <td className={`py-1 px-2 ${t("text-gray-500", "text-white/50")} text-[11px] truncate max-w-[150px]`} onClick={onClick}>
        {candidate.person_home_location || "\u2014"}
      </td>
      <td className="py-1 px-2">
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={`p-0.5 rounded ${t("hover:bg-gray-100 text-gray-400 hover:text-gray-900", "hover:bg-white/10 text-white/40 hover:text-white")} transition-colors`}
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(candidate);
            }}
            className={`p-0.5 rounded ${t("hover:bg-gray-100 text-gray-400 hover:text-gray-900", "hover:bg-white/10 text-white/40 hover:text-white")} transition-colors`}
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

export default function TalentCandidates() {
  const { user } = useUser();
  const { t } = useTheme();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [filters, setFilters] = useState(getDefaultFilters());
  const [sortBy, setSortBy] = useState("intelligence_score");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const [excludedCount, setExcludedCount] = useState(0);
  const [excludedCandidates, setExcludedCandidates] = useState([]);
  const [showExcludedModal, setShowExcludedModal] = useState(false);
  const [loadingExcluded, setLoadingExcluded] = useState(false);

  // Extract filter options from candidates
  const filterOptions = useMemo(() => extractFilterOptions(candidates), [candidates]);
  const activeFilterCount = countActiveFilters(filters);

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [showAddToCampaignModal, setShowAddToCampaignModal] = useState(false);

  // Drawer state
  const [drawerCandidateId, setDrawerCandidateId] = useState(null);

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const tableRef = useRef(null);

  // Bulk operations loading state
  const [bulkLoading, setBulkLoading] = useState({
    addToCampaign: false,
    runIntel: false,
    export: false,
    remove: false,
  });

  // Use the smart filtering hook - MUST be defined before useShortcut hooks that depend on paginatedCandidates
  const baseFilteredCandidates = useCandidateFilters(candidates, searchQuery, filters);

  // Apply sorting to filtered results
  const filteredCandidates = useMemo(() => {
    const result = [...baseFilteredCandidates];

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
  }, [baseFilteredCandidates, sortBy, sortOrder]);

  // Paginated candidates - MUST be defined before useShortcut hooks
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCandidates.slice(start, start + itemsPerPage);
  }, [filteredCandidates, currentPage]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

  // Scroll focused item into view
  const scrollFocusedIntoView = useCallback((index) => {
    if (index < 0) return;

    if (viewMode === "table" && tableRef.current) {
      const rows = tableRef.current.querySelectorAll("[data-candidate-row]");
      if (rows[index]) {
        rows[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    } else {
      const cards = document.querySelectorAll("[data-candidate-card]");
      if (cards[index]) {
        cards[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [viewMode]);

  // Keyboard shortcuts for list navigation
  // j = Move down
  useShortcut(
    "j",
    () => {
      setFocusedIndex((prev) => {
        const next = Math.min(prev + 1, paginatedCandidates.length - 1);
        scrollFocusedIntoView(next);
        return next;
      });
    },
    "Focus next candidate",
    "Candidates",
    [paginatedCandidates.length, scrollFocusedIntoView]
  );

  // k = Move up
  useShortcut(
    "k",
    () => {
      setFocusedIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        scrollFocusedIntoView(next);
        return next;
      });
    },
    "Focus previous candidate",
    "Candidates",
    [scrollFocusedIntoView]
  );

  // Enter = Open focused candidate
  useShortcut(
    "enter",
    () => {
      if (focusedIndex >= 0 && paginatedCandidates[focusedIndex]) {
        setDrawerCandidateId(paginatedCandidates[focusedIndex].id);
      }
    },
    "Open candidate details",
    "Candidates",
    [focusedIndex, paginatedCandidates]
  );

  // x = Toggle selection on focused candidate
  useShortcut(
    "x",
    () => {
      if (focusedIndex >= 0 && paginatedCandidates[focusedIndex]) {
        toggleCandidate(paginatedCandidates[focusedIndex].id);
      }
    },
    "Toggle selection",
    "Candidates",
    [focusedIndex, paginatedCandidates]
  );

  // / = Focus search
  useShortcut(
    "/",
    () => {
      searchInputRef.current?.focus();
    },
    "Focus search",
    "Candidates"
  );

  // Escape = Clear focus and selection
  useShortcut(
    "escape",
    () => {
      if (drawerCandidateId) {
        setDrawerCandidateId(null);
      } else if (selectedIds.size > 0) {
        setSelectedIds(new Set());
      } else if (focusedIndex >= 0) {
        setFocusedIndex(-1);
      }
    },
    "Clear focus/selection",
    "Candidates",
    [drawerCandidateId, selectedIds.size, focusedIndex]
  );

  // Reset focused index when page or filters change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [currentPage, searchQuery, filters]);

  useEffect(() => {
    if (user?.organization_id) {
      fetchCandidates();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const fetchCandidates = async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      // Select only columns needed for list view — skip large JSONB blobs
      // (work_history, education, intelligence_factors, company_intelligence, etc.)
      const { data, error } = await supabase
        .from("candidates")
        .select("id, first_name, last_name, full_name, job_title, current_title, company_name, current_company, person_home_location, location, profile_image_url, intelligence_score, intelligence_level, recommended_approach, last_intelligence_update, email, phone, skills, linkedin_profile, outreach_stage, contact_status, intelligence_urgency, years_experience, created_date, updated_at, excluded_reason")
        .eq("organization_id", user.organization_id)
        .is("excluded_reason", null)
        .order("created_date", { ascending: false });

      if (error) throw error;
      setCandidates(data || []);

      // Fetch excluded candidates count
      const { count, error: countErr } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", user.organization_id)
        .not("excluded_reason", "is", null);

      if (!countErr) setExcludedCount(count || 0);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const loadExcludedCandidates = async () => {
    setLoadingExcluded(true);
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, first_name, last_name, job_title, company_name, linkedin_profile, excluded_reason, excluded_at, excluded_client_id")
        .eq("organization_id", user.organization_id)
        .not("excluded_reason", "is", null)
        .order("excluded_at", { ascending: false });

      if (error) throw error;

      const clientIds = [...new Set((data || []).map(c => c.excluded_client_id).filter(Boolean))];
      let clientMap = {};
      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from("prospects")
          .select("id, company")
          .in("id", clientIds);
        if (clientData) {
          clientMap = clientData.reduce((acc, c) => { acc[c.id] = c.company; return acc; }, {});
        }
      }

      setExcludedCandidates((data || []).map(c => ({
        ...c,
        excluded_client_name: clientMap[c.excluded_client_id] || "Unknown Client"
      })));
      setShowExcludedModal(true);
    } catch (err) {
      console.error("Failed to load excluded candidates:", err);
      toast.error("Failed to load excluded candidates");
    } finally {
      setLoadingExcluded(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  const handleCandidateClick = (candidate) => {
    setDrawerCandidateId(candidate.id);
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

  const handleBulkRunIntel = async () => {
    if (selectedIds.size === 0) return;

    setBulkLoading((prev) => ({ ...prev, runIntel: true }));
    try {
      const candidateIds = Array.from(selectedIds);

      // Queue all selected candidates for intel processing
      const { error } = await supabase
        .from("sync_intel_queue")
        .upsert(
          candidateIds.map((id) => ({
            candidate_id: id,
            organization_id: user.organization_id,
            source: "bulk_action",
            priority: 2,
            status: "pending",
          })),
          { onConflict: "candidate_id" }
        );

      if (error) throw error;

      toast.success(`Queued ${candidateIds.length} candidates for Intel processing`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error queuing intel:", error);
      toast.error("Failed to queue candidates for Intel");
    } finally {
      setBulkLoading((prev) => ({ ...prev, runIntel: false }));
    }
  };

  const handleBulkAddToCampaignSuccess = (campaignId, count) => {
    toast.success(`Added ${count} candidates to campaign`);
    setSelectedIds(new Set());
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

  if (loading) {
    return (
      <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} relative`}>
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
    <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} relative`}>
      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          title="Candidates"
          subtitle={`${filteredCandidates.length} candidates in your talent pool`}
          icon={Users}
          color="red"
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button
                onClick={() => setShowAddModal(true)}
                size="sm"
                className="bg-red-500 hover:bg-red-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </div>
          }
        />

        {/* Excluded Candidates Notice */}
        {excludedCount > 0 && (
          <button
            onClick={loadExcludedCandidates}
            disabled={loadingExcluded}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-red-500/20 flex items-center justify-center">
                <Ban className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-sm text-red-400 font-medium">
                {loadingExcluded ? "Loading..." : `${excludedCount} candidate${excludedCount !== 1 ? "s" : ""} ruled out`}
              </span>
              <span className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>based on your existing clients</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400/40 group-hover:text-red-400 transition-colors" />
          </button>
        )}

      {/* Smart Search & Filters */}
      <SearchFilterBar
        onSearch={setSearchQuery}
        onFiltersChange={setFilters}
        availableFilters={filterOptions}
        activeFilterCount={activeFilterCount}
        placeholder="Search by name, title, company, skills..."
        showIntelFilters={true}
        searchInputRef={searchInputRef}
      />

      {/* Results summary and view controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className={`text-sm ${t("text-gray-500", "text-zinc-400")}`}>
            Showing {filteredCandidates.length} of {candidates.length} candidates
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters(getDefaultFilters())}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                Clear filters
              </button>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllVisible}
              className={t("text-gray-500 hover:text-gray-900", "text-zinc-400 hover:text-white")}
            >
              Select Page
            </Button>
            {selectedIds.size > 0 && (
              <span className="text-sm text-red-400">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className={`flex items-center gap-1 ${t("bg-gray-100", "bg-zinc-800")} rounded-lg p-1`}>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-red-500/20 text-red-400" : t("text-gray-500 hover:text-gray-900", "text-zinc-400 hover:text-white")
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-red-500/20 text-red-400" : t("text-gray-500 hover:text-gray-900", "text-zinc-400 hover:text-white")
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Enrichment Progress */}
          <EnrichmentProgress organizationId={user?.organization_id} onComplete={fetchCandidates} />

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchCandidates}
            className={`h-9 w-9 ${t("text-gray-400 hover:text-gray-900 hover:bg-gray-100", "text-zinc-400 hover:text-white hover:bg-zinc-800")}`}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Candidates Display */}
      {viewMode === "grid" ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {paginatedCandidates.map((candidate, index) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={selectedIds.has(candidate.id)}
              isFocused={focusedIndex === index}
              onToggle={toggleCandidate}
              onClick={() => handleCandidateClick(candidate)}
              onEdit={setEditingCandidate}
              t={t}
            />
          ))}
        </motion.div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${t("border-gray-200", "border-white/10")}`}>
                  <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider w-8">
                    <Checkbox
                      checked={selectedIds.size === paginatedCandidates.length && paginatedCandidates.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) selectAllVisible();
                        else deselectAll();
                      }}
                      className={`${t("border-gray-300", "border-zinc-600")} w-3.5 h-3.5`}
                    />
                  </th>
                  <th className={`text-left py-1.5 px-2 text-[10px] font-medium ${t("text-gray-400", "text-white/40")} uppercase tracking-wider`}>Candidate</th>
                  <th className={`text-left py-1.5 px-2 text-[10px] font-medium ${t("text-gray-400", "text-white/40")} uppercase tracking-wider`}>Position</th>
                  <th className={`text-left py-1.5 px-2 text-[10px] font-medium ${t("text-gray-400", "text-white/40")} uppercase tracking-wider`}>Score</th>
                  <th className={`text-left py-1.5 px-2 text-[10px] font-medium ${t("text-gray-400", "text-white/40")} uppercase tracking-wider`}>Approach</th>
                  <th className={`text-left py-1.5 px-2 text-[10px] font-medium ${t("text-gray-400", "text-white/40")} uppercase tracking-wider`}>Intel</th>
                  <th className={`text-left py-1.5 px-2 text-[10px] font-medium ${t("text-gray-400", "text-white/40")} uppercase tracking-wider`}>Location</th>
                  <th className={`text-left py-1.5 px-2 text-[10px] font-medium ${t("text-gray-400", "text-white/40")} uppercase tracking-wider w-12`}></th>
                </tr>
              </thead>
              <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                {paginatedCandidates.map((candidate, index) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={selectedIds.has(candidate.id)}
                    isFocused={focusedIndex === index}
                    onToggle={toggleCandidate}
                    onClick={() => handleCandidateClick(candidate)}
                    onEdit={setEditingCandidate}
                    t={t}
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
          <Users className={`w-12 h-12 ${t("text-gray-300", "text-white/20")} mx-auto mb-4`} />
          <h3 className={`text-lg font-medium ${t("text-gray-900", "text-white")} mb-2`}>No candidates found</h3>
          <p className={`${t("text-gray-500", "text-white/60")} mb-6`}>
            {searchQuery || Object.values(filters).some(Boolean)
              ? "Try adjusting your filters or search query"
              : "Start building your talent pool by purchasing a talent nest"}
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setShowAddModal(true)} variant="outline" className={t("border-gray-200", "border-zinc-700")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Manually
            </Button>
            <Button onClick={() => navigate("/marketplace/nests")} className="bg-red-500 hover:bg-red-600">
              <Package className="w-4 h-4 mr-2" />
              Browse Talent Nests
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Flow Continuity CTA - Show campaign suggestion when candidates with intel exist */}
      {filteredCandidates.length > 0 && (
        (() => {
          const readyCandidates = candidates.filter(c => c.last_intelligence_update && c.intelligence_score != null);
          if (readyCandidates.length >= 3) {
            return (
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <Zap className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className={`${t("text-gray-900", "text-white")} font-medium`}>
                        {readyCandidates.length} candidates with Intel Ready
                      </p>
                      <p className={`${t("text-gray-500", "text-zinc-400")} text-sm`}>
                        Launch a campaign to match these candidates to your open roles
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(createPageUrl("TalentCampaigns") + "?action=new")}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Megaphone className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${t("text-gray-500", "text-white/60")}`}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredCandidates.length)} of{" "}
            {filteredCandidates.length} candidates
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg ${t("bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900", "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              Previous
            </button>
            {getVisiblePages(currentPage, totalPages).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg transition-colors ${
                  currentPage === page
                    ? "bg-red-500/20 text-red-400"
                    : t("bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900", "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg ${t("bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900", "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white")} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
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

      {/* Import Candidates Modal */}
      <CandidateImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={fetchCandidates}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className={t("bg-white border-gray-200", "bg-zinc-900 border-zinc-800")}>
          <AlertDialogHeader>
            <AlertDialogTitle className={`${t("text-gray-900", "text-white")} flex items-center gap-2`}>
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete Candidates
            </AlertDialogTitle>
            <AlertDialogDescription className={t("text-gray-500", "text-zinc-400")}>
              Are you sure you want to delete {selectedIds.size} selected candidate(s)?
              This will also delete all related outreach tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={t("bg-gray-100 border-gray-200 text-gray-900 hover:bg-gray-200", "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700")}>
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

      {/* Candidate Detail Drawer */}
      <CandidateDetailDrawer
        open={!!drawerCandidateId}
        onClose={() => setDrawerCandidateId(null)}
        candidateId={drawerCandidateId}
      />

      {/* Add to Campaign Modal */}
      <AddToCampaignModal
        open={showAddToCampaignModal}
        onClose={() => setShowAddToCampaignModal(false)}
        selectedCandidateIds={Array.from(selectedIds)}
        onSuccess={handleBulkAddToCampaignSuccess}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => {
          setSelectedIds(new Set());
        }}
        onAddToCampaign={() => setShowAddToCampaignModal(true)}
        onRunIntel={handleBulkRunIntel}
        onExport={handleExportCSV}
        onRemove={() => setShowDeleteDialog(true)}
        context="candidates"
        loading={bulkLoading}
      />

      {/* Excluded Candidates Modal */}
      <Dialog open={showExcludedModal} onOpenChange={setShowExcludedModal}>
        <DialogContent className={`${t("bg-white border-gray-200", "bg-zinc-900 border-zinc-800")} max-w-2xl p-0 overflow-hidden max-h-[80vh]`}>
          <div className={`px-6 py-4 border-b ${t("border-gray-200", "border-zinc-800")} bg-gradient-to-r from-red-500/10 to-red-600/10`}>
            <DialogTitle className={`text-base font-semibold ${t("text-gray-900", "text-white")} flex items-center gap-2`}>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Ban className="w-4 h-4 text-red-400" />
              </div>
              Ruled Out Candidates
              <Badge className="ml-2 bg-red-500/20 text-red-400 border-0 text-xs">
                {excludedCandidates.length}
              </Badge>
            </DialogTitle>
            <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} mt-1 ml-10`}>
              These candidates are blocked because they work for one of your clients
            </p>
          </div>

          <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
            {excludedCandidates.length === 0 ? (
              <div className="p-8 text-center">
                <p className={t("text-gray-400", "text-zinc-500")}>No excluded candidates found</p>
              </div>
            ) : (
              <div className={`divide-y ${t("divide-gray-200", "divide-zinc-800/50")}`}>
                {excludedCandidates.map((candidate) => (
                  <div key={candidate.id} className={`px-6 py-3 ${t("hover:bg-gray-50", "hover:bg-zinc-800/30")} transition-colors`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${t("text-gray-900", "text-white")} truncate`}>
                            {[candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || "Unknown"}
                          </p>
                          {candidate.linkedin_profile && (
                            <a
                              href={candidate.linkedin_profile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {candidate.job_title && (
                            <span className={`text-xs ${t("text-gray-500", "text-zinc-400")} truncate`}>{candidate.job_title}</span>
                          )}
                          {candidate.job_title && candidate.company_name && (
                            <span className={t("text-gray-300", "text-zinc-600")}>&middot;</span>
                          )}
                          {candidate.company_name && (
                            <span className={`text-xs ${t("text-gray-400", "text-zinc-500")} truncate`}>{candidate.company_name}</span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2 py-0.5 flex-shrink-0">
                        <ShieldAlert className="w-3 h-3 mr-1" />
                        {candidate.excluded_client_name}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
