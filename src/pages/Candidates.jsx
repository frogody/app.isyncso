
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "@/components/utils/useIsMobile";
import CandidatesMobile from "./CandidatesMobile"; // Path changed as per outline

import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";
import { Project } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/utils/translations";
import {
  Search,
  List,
  RefreshCw,
  Users,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CandidateGrid from "../components/candidates/CandidateGrid";
import CandidateTable from "../components/candidates/CandidateTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import OwnerFilterChips from "../components/candidates/OwnerFilterChips";
import { getUsersByIds } from "@/api/functions";
import { Badge } from "@/components/ui/badge";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";
import { haptics } from "@/components/utils/haptics";

export default function CandidatesPage() {
  const isMobile = useIsMobile();

  // Initialize all hooks before any conditional returns as per React Hooks rules
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ contacted: "all", location: "all", assigned_to: "all", project_id: "all" });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [orgUsers, setOrgUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [isFiltering, setIsFiltering] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Track if there are candidates without intelligence
  const candidatesNeedingIntelligence = useMemo(() => {
    return candidates.filter(c => !c.intelligence_score || !c.last_intelligence_update).length;
  }, [candidates]);

  const pageSize = 20;
  const { t } = useTranslation(user?.language || 'en');

  const translateContactedFilter = (filter) => {
    const map = {
      'all': t('filter_all'),
      'true': t('filter_yes'),
      'false': t('filter_no')
    };
    return map[filter] || filter;
  };

  const translateLocationFilter = (filter) => {
    return filter === 'all' ? t('filter_all_locations') : filter;
  };

  const getUserKey = (u) => u.user_id || u.id;

  const translateAssignedFilter = (filter) => {
    if (filter === 'all') return t('filter_all_recruiters');
    if (filter === 'null') return t('filter_unassigned');
    if (filter === 'me') return t('filter_me');
    const assignedUser = orgUsers.find(u => getUserKey(u) === filter);
    return assignedUser ? assignedUser.full_name : filter;
  };

  const translateProjectFilter = (filter) => {
    if (filter === 'all') return t('filter_all_projects');
    if (filter === 'null') return t('filter_no_project');
    const project = projects.find(p => p.id === filter);
    return project ? project.title : filter;
  };

  const _autoGenerateIntelligence = useCallback(async (_candidateList) => {
    // DISABLED: Auto-generation hits rate limits too quickly
    // Users should use the "Generate All" button which has proper rate limiting
    console.log('Auto-generation disabled to prevent rate limits');
    return;
  }, []);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      let userData;
      try {
        userData = await User.me();
        setUser(userData);
      } catch (userError) {
        console.error('Error loading user:', userError);
        userData = null;
        setUser(null);
      }

      if (userData?.organization_id) {
        const orgProjects = await Project.filter({ organization_id: userData.organization_id }, "-updated_date", 10000);
        setProjects(orgProjects);
      } else {
        setProjects([]);
      }

      let candidateData;
      if (userData?.organization_id) {
        const [orgCandidates, unassignedCandidates] = await Promise.all([
          Candidate.filter({ organization_id: userData.organization_id }, "-created_date", 10000),
          Candidate.list("-created_date", 10000)
        ]);

        const unassignedOnly = unassignedCandidates.filter(c =>
          !c.organization_id && !orgCandidates.some(oc => oc.id === c.id)
        );

        candidateData = [...orgCandidates, ...unassignedOnly];

        const ownerIds = [...new Set(candidateData.map(c => c.assigned_to).filter(Boolean))];
        if (ownerIds.length) {
          try {
            const response = await getUsersByIds({ userIds: ownerIds });
            const ownersObj = response.data?.users || {};
            const ownersArr = Object.values(ownersObj);
            setOrgUsers(ownersArr);
          } catch (ownerError) {
            console.error('Error loading owners:', ownerError);
            setOrgUsers([]);
          }
        } else {
          setOrgUsers([]);
        }
      } else {
        candidateData = await Candidate.list("-created_date", 10000);

        const ownerIds = [...new Set(candidateData.map(c => c.assigned_to).filter(Boolean))];
        if (ownerIds.length) {
          try {
            const response = await getUsersByIds({ userIds: ownerIds });
            const ownersObj = response.data?.users || {};
            const ownersArr = Object.values(ownersObj);
            setOrgUsers(ownersArr);
          } catch (ownerError) {
            console.error('Error loading owners:', ownerError);
            setOrgUsers([]);
          }
        } else {
          setOrgUsers([]);
        }
      }

      setCandidates(candidateData);

    } catch (error) {
      console.error("Error loading data:", error);
      setCandidates([]);
      setOrgUsers([]);
      setProjects([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    setIsFiltering(true);
    const timeoutId = setTimeout(() => {
      let filtered = [...candidates];

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
          c.company_name?.toLowerCase().includes(query) ||
          c.job_title?.toLowerCase().includes(query)
        );
      }

      if (filters.contacted !== "all") {
        filtered = filtered.filter(c => c.contacted === (filters.contacted === 'true'));
      }

      if (filters.location !== "all") {
        filtered = filtered.filter(c => c.person_home_location?.includes(filters.location));
      }

      if (filters.assigned_to !== "all") {
        if (filters.assigned_to === "null") {
          filtered = filtered.filter(c => c.assigned_to === null || c.assigned_to === undefined);
        } else if (filters.assigned_to === "me" && user) {
          const currentUserId = user.user_id || user.id;
          filtered = filtered.filter(c => c.assigned_to === currentUserId);
        } else {
          filtered = filtered.filter(c => c.assigned_to === filters.assigned_to);
        }
      }

      if (filters.project_id !== "all") {
        if (filters.project_id === "null") {
          filtered = filtered.filter(c => !c.project_id);
        } else {
          filtered = filtered.filter(c => c.project_id === filters.project_id);
        }
      }

      setFilteredCandidates(filtered);
      setCurrentPage(1);
      setIsFiltering(false);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      setIsFiltering(false);
    };
  }, [candidates, searchQuery, filters, user]);

  const uniqueLocations = useMemo(() => {
    return [...new Set(candidates.map(c => c.person_home_location).filter(Boolean))];
  }, [candidates]);

  const filteredAndSortedCandidates = useMemo(() => {
    let sorted = [...filteredCandidates];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
        break;
      case "date":
        sorted.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        break;
      case "company":
        sorted.sort((a, b) => (a.company_name || "").localeCompare(b.company_name || ""));
        break;
      case "location":
        sorted.sort((a, b) => (a.person_home_location || "").localeCompare(b.person_home_location || ""));
        break;
      case "score":
        sorted.sort((a, b) => (b.readiness_score || 0) - (a.readiness_score || 0));
        break;
      default:
        sorted.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
        break;
    }
    return sorted;
  }, [filteredCandidates, sortBy]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAndSortedCandidates.length / pageSize));
  }, [filteredAndSortedCandidates.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(filteredAndSortedCandidates.length, currentPage * pageSize);

  const paginatedCandidates = useMemo(() => {
    return filteredAndSortedCandidates.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedCandidates, startIndex]);

  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  const handleBulkGenerateIntelligence = async () => {
    if (!confirm(t('generate_all_confirm'))) return;
    
    haptics.heavy();
    setBulkGenerating(true);
    try {
      const { bulkGenerateIntelligence } = await import("@/api/functions");
      const response = await bulkGenerateIntelligence({
        forceRegenerate: false
      });

      if (response.data?.success) {
        alert(`${t('intelligence_generation_complete')}\n\n${t('total_candidates')}: ${response.data.total_candidates}\n${t('processed')}: ${response.data.processed || 0}\n${t('skipped_recent')}: ${response.data.skipped || 0}\n${t('errors')}: ${response.data.errors || 0}`);
        await loadCandidates();
        haptics.success();
      } else {
        alert(`${t('error_msg')}: ${response.data?.error || t('unknown_error')}`);
        haptics.error();
      }
    } catch (error) {
      console.error('Error starting bulk generation:', error);
      alert(`${t('error_msg')}: ${error.message}`);
      haptics.error();
    } finally {
      setBulkGenerating(false);
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filters.contacted !== 'all') count++;
    const currentUserId = user ? (user.user_id || user.id) : "me";
    if (filters.assigned_to !== 'all' && filters.assigned_to !== currentUserId) {
      count++;
    }
    if (filters.project_id !== 'all') count++;
    return count;
  }, [searchQuery, filters, user]);

  // NOW check if mobile and return mobile component (after all hooks are called)
  if (isMobile) {
    return <CandidatesMobile />;
  }

  // Desktop/tablet version below
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --surface: #1A2026;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
            --accent2: #DC2626;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>
            {t('loading_candidates')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', height: '100vh', overflow: 'hidden' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
          --accent2: #DC2626;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
          transition: all .2s ease !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          transform: translateY(-0.5px) !important;
          border-color: rgba(239,68,68,.4) !important;
          color: #FFE5E5 !important;
          box-shadow: 0 2px 8px rgba(239,68,68,.2) !important;
        }
        .btn-outline {
          background: rgba(255,255,255,.04) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.08) !important;
          color: #FFFFFF !important;
          border-color: rgba(255,255,255,.2) !important;
        }
        .text-muted {
          color: #B5C0C4 !important;
        }
        .badge-default {
          background: rgba(255,255,255,.08) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255,255,255,.12) !important;
        }
      `}</style>

      <div className="flex flex-col flex-1 p-4 md:p-6" style={{ minHeight: 0, overflow: 'hidden' }}>
        {/* Header - fixed height */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 flex-shrink-0 relative">
          <div className="flex items-center gap-3">
            <IconWrapper icon={Users} size={36} variant="muted" glow={true} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
                {t('candidates_title')}
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {filteredCandidates.length} {t('candidates_found')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Show Generate All button only if there are candidates without intelligence */}
            {candidatesNeedingIntelligence > 0 && (
              <Button onClick={handleBulkGenerateIntelligence} disabled={bulkGenerating} className="btn-primary">
                {bulkGenerating ? (
                  <>
                    <SyncAvatar size={18} className="mr-2" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <IconWrapper icon={RefreshCw} size={18} variant="default" glow={false} className="mr-2" />
                    {t('generate_all')} ({candidatesNeedingIntelligence})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        {/* Search and filters - fixed height */}
        <div className="glass-card p-4 mb-4 flex-shrink-0">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <IconWrapper
                icon={Search}
                size={20}
                variant="muted"
                glow={false}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <Input
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border text-base h-11"
                style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-outline ${showFilters ? 'bg-white/5' : ''}`}
            >
              <IconWrapper icon={SlidersHorizontal} size={18} variant="default" glow={false} className="mr-2" />
              {t('filters')}
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(239,68,68,.12)', color: 'var(--accent)' }}>
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="btn-outline w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                <SelectItem value="grid" style={{ color: 'var(--txt)' }}>
                  <div className="flex items-center gap-2">
                    <IconWrapper icon={Grid3x3} size={16} variant="default" glow={false} />
                    <span>{t('view_grid')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="table" style={{ color: 'var(--txt)' }}>
                  <div className="flex items-center gap-2">
                    <IconWrapper icon={List} size={16} variant="default" glow={false} />
                    <span>{t('view_table')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="btn-outline w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                <SelectItem value="name" style={{color: 'var(--txt)'}}>{t('sort_name')}</SelectItem>
                <SelectItem value="date" style={{color: 'var(--txt)'}}>{t('sort_date')}</SelectItem>
                <SelectItem value="company" style={{color: 'var(--txt)'}}>{t('sort_company')}</SelectItem>
                <SelectItem value="location" style={{color: 'var(--txt)'}}>{t('sort_location')}</SelectItem>
                <SelectItem value="score" style={{color: 'var(--txt)'}}>{t('sort_score')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filters - only show when user has made changes from default */}
        {(filters.contacted !== 'all' ||
          filters.location !== 'all' ||
          (filters.assigned_to !== 'all' && user && filters.assigned_to !== (user.user_id || user.id)) ||
          filters.project_id !== 'all' ||
          searchQuery) && (
          <div className="glass-card p-3 mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="outline" className="badge-default">
                    {t('search_placeholder')}: "{searchQuery}"
                  </Badge>
                )}
                {filters.contacted !== 'all' && (
                  <Badge variant="outline" className="badge-default">
                    {t('filter_contacted')}: {translateContactedFilter(filters.contacted)}
                  </Badge>
                )}
                {filters.location !== 'all' && (
                  <Badge variant="outline" className="badge-default">
                    {t('filter_location')}: {translateLocationFilter(filters.location)}
                  </Badge>
                )}
                {filters.assigned_to !== 'all' && user && filters.assigned_to !== (user.user_id || user.id) && (
                  <Badge variant="outline" className="badge-default">
                    {t('filter_assigned_to')}: {translateAssignedFilter(filters.assigned_to)}
                  </Badge>
                )}
                {filters.project_id !== 'all' && (
                  <Badge variant="outline" className="badge-default">
                    {t('filter_project')}: {translateProjectFilter(filters.project_id)}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilters({ contacted: "all", location: "all", assigned_to: "all", project_id: "all" });
                }}
                className="text-xs text-red-400 hover:bg-red-900/20"
                style={{color: 'var(--accent)'}}
              >
                {t('clear_filters')}
              </Button>
            </div>
          </div>
        )}

        {showFilters && (
          <Card className="glass-card mb-4 flex-shrink-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{color: 'var(--muted)'}}>{t('filter_contacted')}</label>
                  <Select value={filters.contacted} onValueChange={(value) => setFilters(prev => ({...prev, contacted: value}))}>
                    <SelectTrigger className="bg-transparent hover:bg-gray-800/50" style={{background: 'transparent', borderColor: 'rgba(255,255,255,.12)', color: 'var(--txt)'}}><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                      <SelectItem value="all" style={{color: 'var(--txt)'}}>{t('filter_all')}</SelectItem>
                      <SelectItem value="true" style={{color: 'var(--txt)'}}>{t('filter_yes')}</SelectItem>
                      <SelectItem value="false" style={{color: 'var(--txt)'}}>{t('filter_no')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{color: 'var(--muted)'}}>{t('filter_location')}</label>
                  <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({...prev, location: value}))}>
                    <SelectTrigger className="bg-transparent hover:bg-gray-800/50" style={{background: 'transparent', borderColor: 'rgba(255,255,255,.12)', color: 'var(--txt)'}}><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                      <SelectItem value="all" style={{color: 'var(--txt)'}}>{t('filter_all_locations')}</SelectItem>
                       {uniqueLocations.map(loc => <SelectItem key={loc} value={loc} style={{color: 'var(--txt)'}}>{loc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{color: 'var(--muted)'}}>{t('filter_assigned_to')}</label>
                  <Select value={filters.assigned_to} onValueChange={(value) => setFilters(prev => ({...prev, assigned_to: value}))}>
                    <SelectTrigger className="bg-transparent hover:bg-gray-800/50" style={{background: 'transparent', borderColor: 'rgba(255,255,255,.12)', color: 'var(--txt)'}}><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                      <SelectItem value="all" style={{color: 'var(--txt)'}}>{t('filter_all_recruiters')}</SelectItem>
                      <SelectItem value="null" style={{color: 'var(--txt)'}}>{t('filter_unassigned')}</SelectItem>
                      {user && (
                        <SelectItem value="me" style={{color: 'var(--txt)'}}>{t('filter_me')}</SelectItem>
                      )}
                      {orgUsers.map(u => {
                        const key = getUserKey(u);
                        if (user && (user.user_id || user.id) === key) return null;
                        return (
                          <SelectItem key={key} value={key} style={{color: 'var(--txt)'}}>
                            {u.full_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{color: 'var(--muted)'}}>{t('filter_project')}</label>
                  <Select value={filters.project_id} onValueChange={(value) => setFilters(prev => ({...prev, project_id: value}))}>
                    <SelectTrigger className="bg-transparent hover:bg-gray-800/50" style={{background: 'transparent', borderColor: 'rgba(255,255,255,.12)', color: 'var(--txt)'}}><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                      <SelectItem value="all" style={{color: 'var(--txt)'}}>{t('filter_all_projects')}</SelectItem>
                      <SelectItem value="null" style={{color: 'var(--txt)'}}>{t('filter_no_project')}</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} style={{color: 'var(--txt)'}}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Owner chips */}
        <div className="flex-shrink-0 mb-4">
          <OwnerFilterChips
            users={orgUsers}
            selected={filters.assigned_to}
            onChange={(val) => setFilters((prev) => ({ ...prev, assigned_to: val }))}
          />
        </div>

        {/* Candidates section - fills remaining space */}
        <div
          className="glass-card p-4 md:p-6 flex flex-col flex-1"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.04)',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <AnimatePresence mode="wait">
            {isFiltering ? (
              <motion.div
                key="filtering"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center flex-1 gap-4"
              >
                <SyncAvatar size={48} />
                <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>
                  {t('filtering_candidates')}
                </p>
              </motion.div>
            ) : filteredCandidates.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1"
              >
                <Card className="glass-card h-full flex items-center justify-center">
                  <CardContent className="flex flex-col items-center gap-4 py-16">
                    <IconWrapper icon={Users} size={48} variant="muted" glow={false} />
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                        {t('no_candidates')}
                      </h3>
                      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                        {t('no_candidates_desc')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="candidates-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col flex-1"
                style={{ minHeight: 0, overflow: 'hidden' }}
              >
                {/* Scrollable candidates list */}
                <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                  {viewMode === "grid" ?
                    <CandidateGrid candidates={paginatedCandidates} /> :
                    <CandidateTable candidates={paginatedCandidates} />
                  }
                </div>

                {/* Fixed pagination at bottom */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t flex-shrink-0"
                       style={{borderColor: 'rgba(255,255,255,.06)'}}>
                    <div className="text-sm" style={{color: 'var(--muted)'}}>
                      {t('showing')} <span style={{color: 'var(--txt)'}}>{startIndex + 1}</span> - <span style={{color: 'var(--txt)'}}>{endIndex}</span> {t('of')} <span style={{color: 'var(--txt)'}}>{filteredAndSortedCandidates.length}</span> {t('candidates_count_plural')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={goPrev}
                        disabled={currentPage === 1}
                        className="bg-transparent border-gray-600 hover:bg-gray-800/50"
                        style={{color: 'var(--muted)', borderColor: 'rgba(255,255,255,.12)'}}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {t('prev')}
                      </Button>
                      <div className="text-sm px-2" style={{color: 'var(--txt)'}}>
                        {t('page')} {currentPage} {t('of')} {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        onClick={goNext}
                        disabled={currentPage === totalPages}
                        className="bg-transparent border-gray-600 hover:bg-gray-800/50"
                        style={{color: 'var(--muted)', borderColor: 'rgba(255,255,255,.12)'}}
                      >
                        {t('next')}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
