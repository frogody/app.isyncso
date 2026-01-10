import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import anime from '@/lib/anime-wrapper';
const animate = anime;
const stagger = anime.stagger;
import { prefersReducedMotion } from '@/lib/animations';
import { base44 } from "@/api/base44Client";
import { useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users, Plus, Search, Download, Trash2, ArrowRight, ArrowLeft, Filter,
  Building2, Mail, MoreVertical, Send, FileText, Edit, X, Save,
  MapPin, Briefcase, Globe, DollarSign, Loader2, ChevronDown, Sparkles, Check
} from "lucide-react";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STEPS = [
  { id: 'define', label: 'Define ICP', icon: Filter },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'review', label: 'Review', icon: Users },
  { id: 'export', label: 'Save', icon: Save },
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Real Estate', 'Marketing', 'Consulting', 'Legal'
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
];

export default function GrowthProspects() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("lists");

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const contentRef = useRef(null);

  // Lists state
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [selectedProspects, setSelectedProspects] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '', description: '', industry: '', company_size: '',
    location: '', job_titles: '', tech_stack: '', keywords: ''
  });

  // Research state
  const [researchStep, setResearchStep] = useState(0);
  const [searchType, setSearchType] = useState('companies');
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResults, setResearchResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    query: '', industry: '', companySize: '', location: '',
    jobTitle: '', keywords: '', revenue: '', techStack: ''
  });

  useEffect(() => {
    let isMounted = true;

    const loadLists = async () => {
      try {
        const data = await base44.entities.ProspectList.list({ limit: 100 }).catch(() => []);
        if (isMounted) setLists(data || []);
      } catch (error) {
        console.error("Failed to load lists:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLists();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTemplates = async () => {
      if (activeTab !== 'templates' || templates.length > 0) return;
      setTemplatesLoading(true);
      try {
        const response = await base44.functions.invoke('getICPTemplates').catch(() => ({ data: null }));
        if (isMounted) setTemplates(response?.data?.templates || []);
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        if (isMounted) setTemplatesLoading(false);
      }
    };

    loadTemplates();
    return () => { isMounted = false; };
  }, [activeTab, templates.length]);

  useEffect(() => {
    const listId = searchParams.get('list');
    if (listId && lists.length > 0) {
      const list = lists.find(l => l.id === listId);
      if (list) {
        setSelectedList(list);
        setProspects(list.prospects || []);
      }
    }
  }, [searchParams, lists]);

  const loadTemplatesManual = async () => {
    setTemplatesLoading(true);
    try {
      const response = await base44.functions.invoke('getICPTemplates').catch(() => ({ data: null }));
      setTemplates(response?.data?.templates || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Lists functions
  const handleListSelect = (list) => {
    setSelectedList(list);
    setProspects(list.prospects || []);
    setSelectedProspects(new Set());
  };

  const handleDeleteList = async (listId) => {
    if (!confirm('Delete this list?')) return;
    try {
      await base44.entities.ProspectList.delete(listId);
      setLists(prev => prev.filter(l => l.id !== listId));
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setProspects([]);
      }
      toast.success('List deleted');
    } catch (error) {
      toast.error('Failed to delete list');
    }
  };

  const toggleProspect = (id) => {
    setSelectedProspects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllProspects = () => {
    if (selectedProspects.size === prospects.length) {
      setSelectedProspects(new Set());
    } else {
      setSelectedProspects(new Set(prospects.map(p => p.id)));
    }
  };

  const handleExport = () => {
    const selected = prospects.filter(p => selectedProspects.has(p.id));
    const csv = [
      ['Name', 'Company', 'Title', 'Industry', 'Location', 'Score'].join(','),
      ...selected.map(p => [p.name, p.company, p.title, p.industry, p.location, p.score].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(`Exported ${selected.length} prospects`);
  };

  // Template functions
  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name || '',
      description: template.description || '',
      industry: template.industry || '',
      company_size: template.company_size || '',
      location: template.location || '',
      job_titles: template.job_titles?.join(', ') || '',
      tech_stack: template.tech_stack?.join(', ') || '',
      keywords: template.keywords?.join(', ') || ''
    });
    setShowTemplateEditor(true);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '', description: '', industry: '', company_size: '',
      location: '', job_titles: '', tech_stack: '', keywords: ''
    });
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const templateData = {
        ...templateForm,
        job_titles: templateForm.job_titles.split(',').map(s => s.trim()).filter(Boolean),
        tech_stack: templateForm.tech_stack.split(',').map(s => s.trim()).filter(Boolean),
        keywords: templateForm.keywords.split(',').map(s => s.trim()).filter(Boolean),
      };
      
      await base44.functions.invoke('saveICPTemplate', {
        template: editingTemplate ? { ...templateData, id: editingTemplate.id } : templateData
      });
      
      await loadTemplates();
      setShowTemplateEditor(false);
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) return;
    try {
      await base44.entities.ICPTemplate.delete(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleUseTemplate = (template) => {
    setFilters({
      query: template.description || '',
      industry: template.industry || '',
      companySize: template.company_size || '',
      location: template.location || '',
      jobTitle: template.job_titles?.join(', ') || '',
      keywords: template.keywords?.join(', ') || '',
      revenue: '',
      techStack: template.tech_stack?.join(', ') || ''
    });
    setActiveTab('research');
    setResearchStep(0);
  };

  // Research functions
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    setResearchLoading(true);
    setResearchStep(1);
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 10 realistic ${searchType} prospects based on these criteria:
          ${filters.query ? `Query: ${filters.query}` : ''}
          ${filters.industry ? `Industry: ${filters.industry}` : ''}
          ${filters.companySize ? `Company Size: ${filters.companySize}` : ''}
          ${filters.location ? `Location: ${filters.location}` : ''}
          ${filters.jobTitle ? `Job Title: ${filters.jobTitle}` : ''}
          
          Return realistic company/person data.`,
        response_json_schema: {
          type: "object",
          properties: {
            prospects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  company: { type: "string" },
                  title: { type: "string" },
                  industry: { type: "string" },
                  location: { type: "string" },
                  employees: { type: "string" },
                  website: { type: "string" },
                  score: { type: "number" }
                }
              }
            }
          }
        }
      });
      
      setResearchResults(response.prospects || []);
      setResearchStep(2);
    } catch (error) {
      toast.error("Search failed. Please try again.");
      setResearchStep(0);
    } finally {
      setResearchLoading(false);
    }
  };

  const toggleResultSelect = (id) => {
    setSelectedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllResults = () => {
    if (selectedResults.size === researchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(researchResults.map(r => r.id)));
    }
  };

  const handleSaveResearchList = async () => {
    if (selectedResults.size === 0) return;
    setResearchLoading(true);
    
    try {
      const selectedProspects = researchResults.filter(r => selectedResults.has(r.id));
      
      await base44.entities.ProspectList.create({
        name: `${filters.query || 'Research'} - ${new Date().toLocaleDateString()}`,
        description: `${searchType} research results`,
        prospect_count: selectedProspects.length,
        status: 'active',
        filters: filters,
        prospects: selectedProspects
      });
      
      setResearchStep(3);
      await loadLists();
      toast.success('List saved successfully!');
    } catch (error) {
      toast.error("Failed to save list");
    } finally {
      setResearchLoading(false);
    }
  };

  const resetResearch = () => {
    setResearchStep(0);
    setResearchResults([]);
    setSelectedResults(new Set());
    setFilters({ query: '', industry: '', companySize: '', location: '', jobTitle: '', keywords: '', revenue: '', techStack: '' });
  };

  // Stats calculations
  const totalProspects = lists.reduce((sum, l) => sum + (l.prospect_count || 0), 0);
  const activeListsCount = lists.filter(l => l.status === 'active').length;
  const enrichedCount = lists.reduce((sum, l) => {
    const listProspects = l.prospects || [];
    return sum + listProspects.filter(p => p.firmographics || p.technographics || p.last_enriched_at).length;
  }, 0);
  const inCampaignsCount = lists.reduce((sum, l) => {
    const listProspects = l.prospects || [];
    return sum + listProspects.filter(p => ['contacted', 'qualified', 'converted'].includes(p.status)).length;
  }, 0);

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
    t.industry?.toLowerCase().includes(templateSearchTerm.toLowerCase())
  );

  // Animate header on mount
  useEffect(() => {
    if (loading || !headerRef.current || prefersReducedMotion()) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, [loading]);

  // Animate content area
  useEffect(() => {
    if (loading || !contentRef.current || prefersReducedMotion()) return;

    const cards = contentRef.current.querySelectorAll('.animate-card');
    if (cards.length === 0) return;

    // Set initial state
    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
    });

    // Staggered entrance animation
    animate({
      targets: cards,
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(50, { start: 150 }),
      duration: 450,
      easing: 'easeOutQuart',
    });
  }, [loading, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        <div ref={headerRef} style={{ opacity: 0 }}>
          <PageHeader
            icon={Users}
            title="Prospects"
            subtitle="Manage your prospect lists, templates, and research"
            color="indigo"
            badge={`${totalProspects} total`}
          />
        </div>

        {/* Stats */}
        <div ref={contentRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="animate-card"><StatCard icon={Users} label="Total Prospects" value={totalProspects} color="indigo" delay={0} /></div>
          <div className="animate-card"><StatCard icon={Building2} label="Active Lists" value={activeListsCount} color="indigo" delay={0.1} /></div>
          <div className="animate-card"><StatCard icon={Mail} label="Enriched" value={enrichedCount} color="indigo" delay={0.2} /></div>
          <div className="animate-card"><StatCard icon={Send} label="In Campaigns" value={inCampaignsCount} color="indigo" delay={0.3} /></div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <TabsTrigger 
              value="lists" 
              className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 rounded-lg px-6"
            >
              <Users className="w-4 h-4 mr-2" />
              My Lists
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 rounded-lg px-6"
            >
              <FileText className="w-4 h-4 mr-2" />
              ICP Templates
            </TabsTrigger>
            <TabsTrigger 
              value="research" 
              className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 rounded-lg px-6"
            >
              <Search className="w-4 h-4 mr-2" />
              New Research
            </TabsTrigger>
          </TabsList>

          {/* Lists Tab */}
          <TabsContent value="lists" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lists Panel */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">My Lists</h3>
                  <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                    {lists.length}
                  </Badge>
                </div>

                {lists.length > 0 ? (
                  <div className="space-y-2">
                    {lists.map((list, i) => (
                      <motion.div
                        key={list.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleListSelect(list)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${
                          selectedList?.id === list.id
                            ? 'bg-indigo-500/20 border border-indigo-500/30'
                            : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{list.name}</p>
                            <p className="text-xs text-zinc-400">{list.prospect_count || 0} prospects</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                              <DropdownMenuItem onClick={() => handleDeleteList(list.id)} className="text-red-400">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500 mb-4">No lists yet</p>
                    <Button onClick={() => setActiveTab('research')} className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium">
                      Start Research
                    </Button>
                  </div>
                )}
              </div>

              {/* Prospects Table */}
              <div className="lg:col-span-2">
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                  {selectedList ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{selectedList.name}</h3>
                          <p className="text-sm text-zinc-400">{prospects.length} prospects</p>
                        </div>
                        <div className="flex gap-2">
                          {selectedProspects.size > 0 && (
                            <>
                              <Button variant="outline" onClick={handleExport} className="border-indigo-500/30 text-indigo-400/80 hover:text-indigo-300">
                                <Download className="w-4 h-4 mr-2" />
                                Export ({selectedProspects.size})
                              </Button>
                              <Button className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium">
                                <Send className="w-4 h-4 mr-2" />
                                Add to Campaign
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search prospects..."
                            className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
                        <Checkbox checked={selectedProspects.size === prospects.length && prospects.length > 0} onCheckedChange={selectAllProspects} />
                        <span>Select All ({selectedProspects.size} selected)</span>
                      </div>

                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {filteredProspects.map((prospect, i) => (
                          <motion.div
                            key={prospect.id || i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => toggleProspect(prospect.id)}
                            className={`p-3 rounded-xl cursor-pointer transition-all ${
                              selectedProspects.has(prospect.id)
                                ? 'bg-indigo-500/10 border border-indigo-500/30'
                                : 'bg-zinc-800/50 border border-transparent hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox checked={selectedProspects.has(prospect.id)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-white">{prospect.name}</p>
                                  {prospect.score && (
                                    <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
                                      {prospect.score}%
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1 text-xs text-zinc-400">
                                  {prospect.company && <span>{prospect.company}</span>}
                                  {prospect.title && <span>• {prospect.title}</span>}
                                  {prospect.location && <span>• {prospect.location}</span>}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Select a List</h3>
                      <p className="text-zinc-500">Choose a list from the sidebar to view prospects</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  type="search"
                  placeholder="Search templates..."
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
              <Button onClick={handleCreateTemplate} className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>

            {templatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 bg-zinc-800 rounded-2xl" />)}
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredTemplates.map((template, i) => (
                    <motion.div
                      key={template.id || i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)} className="text-zinc-400 hover:text-white h-8 w-8">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)} className="text-zinc-400 hover:text-red-400 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                        <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{template.description}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {template.industry && (
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                              <Briefcase className="w-3 h-3 mr-1" />{template.industry}
                            </Badge>
                          )}
                          {template.company_size && (
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                              <Users className="w-3 h-3 mr-1" />{template.company_size}
                            </Badge>
                          )}
                          {template.location && (
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                              <MapPin className="w-3 h-3 mr-1" />{template.location}
                            </Badge>
                          )}
                        </div>

                        <Button
                          onClick={() => handleUseTemplate(template)}
                          className="w-full bg-indigo-500/10 text-indigo-400/80 border border-indigo-500/30 hover:bg-indigo-500/20 hover:text-indigo-300"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Use Template
                        </Button>
                        </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">
                  {templateSearchTerm ? "No Templates Found" : "No Templates Yet"}
                </h3>
                <p className="text-zinc-400 mb-6">
                  {templateSearchTerm ? "Try a different search" : "Create reusable ICP templates for faster research"}
                </p>
                {!templateSearchTerm && (
                  <Button onClick={handleCreateTemplate} className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="mt-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = i === researchStep;
                const isComplete = i < researchStep;
                
                return (
                  <React.Fragment key={step.id}>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        isActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                        isComplete ? 'bg-indigo-500/10 text-indigo-300' :
                        'bg-zinc-800/50 text-zinc-500'
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                    </motion.div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-8 h-0.5 ${i < researchStep ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Define ICP */}
              {researchStep === 0 && (
                <motion.div
                  key="define"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                    <h3 className="text-lg font-semibold text-white mb-4">What are you looking for?</h3>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setSearchType('companies')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          searchType === 'companies'
                            ? 'bg-indigo-500/20 border-indigo-500 text-white'
                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <Building2 className="w-8 h-8 mx-auto mb-2" />
                        <div className="font-medium">Companies</div>
                        <div className="text-xs opacity-70">Find target accounts</div>
                      </button>
                      <button
                        onClick={() => setSearchType('people')}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          searchType === 'people'
                            ? 'bg-indigo-500/20 border-indigo-500 text-white'
                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <Users className="w-8 h-8 mx-auto mb-2" />
                        <div className="font-medium">People</div>
                        <div className="text-xs opacity-70">Find decision makers</div>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-zinc-400 mb-2 block">Describe your ideal {searchType === 'companies' ? 'company' : 'prospect'}</label>
                        <Textarea
                          value={filters.query}
                          onChange={(e) => handleFilterChange('query', e.target.value)}
                          placeholder={searchType === 'companies' 
                            ? "e.g., B2B SaaS companies in fintech with 50-200 employees..."
                            : "e.g., VP of Sales at enterprise software companies..."}
                          className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Advanced Filters
                        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                      </Button>

                      <AnimatePresence>
                        {showFilters && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
                          >
                            <div>
                              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                                <Briefcase className="w-4 h-4" /> Industry
                              </label>
                              <Select value={filters.industry} onValueChange={(v) => handleFilterChange('industry', v)}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                  {INDUSTRIES.map(ind => (
                                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                                <Users className="w-4 h-4" /> Company Size
                              </label>
                              <Select value={filters.companySize} onValueChange={(v) => handleFilterChange('companySize', v)}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                  {COMPANY_SIZES.map(size => (
                                    <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Location
                              </label>
                              <Input
                                value={filters.location}
                                onChange={(e) => handleFilterChange('location', e.target.value)}
                                placeholder="e.g., United States, Europe"
                                className="bg-zinc-800 border-zinc-700 text-white"
                              />
                            </div>

                            {searchType === 'people' && (
                              <div>
                                <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" /> Job Title
                                </label>
                                <Input
                                  value={filters.jobTitle}
                                  onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                                  placeholder="e.g., VP Sales, CTO"
                                  className="bg-zinc-800 border-zinc-700 text-white"
                                />
                              </div>
                            )}

                            <div>
                              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                                <Globe className="w-4 h-4" /> Tech Stack
                              </label>
                              <Input
                                value={filters.techStack}
                                onChange={(e) => handleFilterChange('techStack', e.target.value)}
                                placeholder="e.g., Salesforce, AWS"
                                className="bg-zinc-800 border-zinc-700 text-white"
                              />
                            </div>

                            <div>
                              <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Revenue
                              </label>
                              <Input
                                value={filters.revenue}
                                onChange={(e) => handleFilterChange('revenue', e.target.value)}
                                placeholder="e.g., $1M-$10M"
                                className="bg-zinc-800 border-zinc-700 text-white"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSearch}
                      disabled={!filters.query.trim()}
                      className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium px-8"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Find Prospects
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Searching */}
              {researchStep === 1 && researchLoading && (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <Loader2 className="w-12 h-12 text-indigo-400/70 animate-spin mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Searching for prospects...</h3>
                  <p className="text-zinc-500">Analyzing your criteria and finding matches</p>
                </motion.div>
              )}

              {/* Step 3: Review Results */}
              {researchStep === 2 && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Found {researchResults.length} {searchType === 'people' ? 'prospects' : 'companies'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedResults.size === researchResults.length && researchResults.length > 0}
                          onCheckedChange={selectAllResults}
                        />
                        <span className="text-sm text-zinc-400">Select All ({selectedResults.size})</span>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {researchResults.map((result, i) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            selectedResults.has(result.id)
                              ? 'bg-indigo-500/10 border-indigo-500/30'
                              : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                          }`}
                          onClick={() => toggleResultSelect(result.id)}
                        >
                          <div className="flex items-center gap-4">
                            <Checkbox checked={selectedResults.has(result.id)} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white">{result.name}</h4>
                                {result.score && (
                                  <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                                    {result.score}% match
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-zinc-400">
                                {result.company && <span>{result.company}</span>}
                                {result.title && <span>• {result.title}</span>}
                                {result.industry && <span>• {result.industry}</span>}
                                {result.location && <span>• {result.location}</span>}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      </div>
                      </div>

                      <div className="flex justify-between">
                      <Button
                      variant="outline"
                      onClick={() => setResearchStep(0)}
                      className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                      >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSaveResearchList}
                      disabled={selectedResults.size === 0 || researchLoading}
                      className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium px-8"
                    >
                      {researchLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save {selectedResults.size} to List
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Export Complete */}
              {researchStep === 3 && (
                <motion.div
                  key="export"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="p-12 max-w-md mx-auto rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                    <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">List Saved!</h3>
                    <p className="text-zinc-400 mb-6">
                      {selectedResults.size} prospects have been added to your list.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => setActiveTab('lists')}
                        className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium"
                      >
                        View My Lists
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetResearch}
                        className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                      >
                        Start New Research
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Editor Modal */}
      <AnimatePresence>
        {showTemplateEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTemplateEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowTemplateEditor(false)} className="text-zinc-400">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Template Name</label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Enterprise SaaS Buyers"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Description</label>
                  <Textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Describe this ICP..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Industry</label>
                    <Input
                      value={templateForm.industry}
                      onChange={(e) => setTemplateForm({ ...templateForm, industry: e.target.value })}
                      placeholder="e.g., Technology"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Company Size</label>
                    <Input
                      value={templateForm.company_size}
                      onChange={(e) => setTemplateForm({ ...templateForm, company_size: e.target.value })}
                      placeholder="e.g., 50-200"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Location</label>
                  <Input
                    value={templateForm.location}
                    onChange={(e) => setTemplateForm({ ...templateForm, location: e.target.value })}
                    placeholder="e.g., United States, Europe"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Job Titles (comma-separated)</label>
                  <Input
                    value={templateForm.job_titles}
                    onChange={(e) => setTemplateForm({ ...templateForm, job_titles: e.target.value })}
                    placeholder="e.g., VP Sales, CTO, Head of Marketing"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Tech Stack (comma-separated)</label>
                  <Input
                    value={templateForm.tech_stack}
                    onChange={(e) => setTemplateForm({ ...templateForm, tech_stack: e.target.value })}
                    placeholder="e.g., Salesforce, HubSpot, AWS"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Keywords (comma-separated)</label>
                  <Input
                    value={templateForm.keywords}
                    onChange={(e) => setTemplateForm({ ...templateForm, keywords: e.target.value })}
                    placeholder="e.g., B2B, SaaS, Enterprise"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowTemplateEditor(false)} className="border-zinc-700 text-zinc-300">
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate} disabled={!templateForm.name || savingTemplate} className="bg-indigo-500 hover:bg-indigo-400 text-white">
                  {savingTemplate ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save Template</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}