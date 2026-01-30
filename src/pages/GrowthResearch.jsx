import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, Users, Building2, ArrowRight, ArrowLeft, Check,
  Filter, Download, Save, Sparkles, Globe, MapPin, Briefcase,
  Euro, Loader2, ChevronDown
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { useUser } from "@/components/context/UserContext";
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

export default function GrowthResearch() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [searchType, setSearchType] = useState('companies');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    query: searchParams.get('query') || '',
    industry: '',
    companySize: '',
    location: '',
    jobTitle: '',
    keywords: '',
    revenue: '',
    techStack: '',
  });

  useEffect(() => {
    const query = searchParams.get('query');
    if (query) {
      setFilters(prev => ({ ...prev, query }));
    }
  }, [searchParams]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    setLoading(true);
    setCurrentStep(1); // Show loading state
    
    try {
      // Call Explorium-powered backend function
      const response = await db.functions.invoke('searchProspects', {
        searchType,
        filters: {
          query: filters.query,
          industry: filters.industry,
          companySize: filters.companySize,
          location: filters.location,
          jobTitle: filters.jobTitle,
          techStack: filters.techStack,
          revenue: filters.revenue
        }
      });
      
      const data = response.data;
      
      if (data.error) {
        console.error("Search error:", data.error);
        toast.error(data.error);
        setCurrentStep(0);
        return;
      }
      
      if (!data.data || data.data.length === 0) {
        toast.info("No prospects found. Try adjusting your search criteria.");
        setCurrentStep(0);
        return;
      }
      
      setResults(data.data);
      setCurrentStep(2);
      toast.success(`Found ${data.data.length} ${searchType === 'people' ? 'prospects' : 'companies'}`);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed. Please try again.");
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results.map(r => r.id)));
    }
  };

  const handleSaveList = async () => {
    if (selectedResults.size === 0) return;
    setLoading(true);
    
    try {
      const selectedProspects = results.filter(r => selectedResults.has(r.id));
      
      await db.entities.ProspectList.create({
        name: `${filters.query || 'Research'} - ${new Date().toLocaleDateString()}`,
        description: `${searchType} research results`,
        prospect_count: selectedProspects.length,
        status: 'active',
        filters: filters,
        prospects: selectedProspects
      });
      
      setCurrentStep(3);
      toast.success('List saved successfully!');
    } catch (error) {
      console.error("Failed to save list:", error);
      toast.error("Failed to save list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          icon={Search}
          title="Prospect Research"
          subtitle="Find and qualify your ideal prospects"
          color="indigo"
        />

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === currentStep;
            const isComplete = i < currentStep;
            
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
                  <div className={`w-8 h-0.5 ${i < currentStep ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Define ICP */}
          {currentStep === 0 && (
            <motion.div
              key="define"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Search Type Toggle */}
              <GlassCard glow="indigo" className="p-4">
                <h3 className="text-base font-semibold text-white mb-3">What are you looking for?</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSearchType('companies')}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      searchType === 'companies'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <Building2 className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium text-sm">Companies</div>
                    <div className="text-[10px] opacity-70">Find target accounts</div>
                  </button>
                  <button
                    onClick={() => setSearchType('people')}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      searchType === 'people'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <Users className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium text-sm">People</div>
                    <div className="text-[10px] opacity-70">Find decision makers</div>
                  </button>
                </div>
              </GlassCard>

              {/* Main Search */}
              <GlassCard glow="indigo" className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Describe your ideal {searchType === 'companies' ? 'company' : 'prospect'}</label>
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
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden"
                      >
                        <div>
                          <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
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
                          <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
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
                          <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
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
                            <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
                              <Briefcase className="w-4 h-4" /> Job Title
                            </label>
                            <Input
                              value={filters.jobTitle}
                              onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                              placeholder="e.g., VP Sales, CTO, Head of Marketing"
                              className="bg-zinc-800 border-zinc-700 text-white"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Tech Stack
                          </label>
                          <Input
                            value={filters.techStack}
                            onChange={(e) => handleFilterChange('techStack', e.target.value)}
                            placeholder="e.g., Salesforce, HubSpot, AWS"
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
                            <Euro className="w-4 h-4" /> Revenue
                          </label>
                          <Input
                            value={filters.revenue}
                            onChange={(e) => handleFilterChange('revenue', e.target.value)}
                            placeholder="e.g., €1M-€10M"
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>

              <div className="flex justify-end">
                <Button
                  onClick={handleSearch}
                  disabled={!filters.query.trim()}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-8"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find Prospects
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Searching (loading state) */}
          {currentStep === 1 && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-4" />
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Searching Explorium Database...</h3>
              <p className="text-zinc-400 text-center max-w-md">
                Querying real business and contact data. This may take a few seconds.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Connected to Explorium API
              </div>
            </motion.div>
          )}

          {/* Step 2: Review Results */}
          {currentStep === 2 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <GlassCard glow="indigo" className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Found {results.length} {searchType === 'people' ? 'prospects' : 'companies'}
                    </h3>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Live data from Explorium
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedResults.size === results.length && results.length > 0}
                      onCheckedChange={selectAll}
                    />
                    <span className="text-xs text-zinc-400">Select All ({selectedResults.size})</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {results.map((result, i) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedResults.has(result.id)
                          ? 'bg-indigo-500/10 border-indigo-500/30'
                          : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                      }`}
                      onClick={() => toggleSelect(result.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedResults.has(result.id)} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white text-sm">{result.name}</h4>
                            {result.score && (
                              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                                {result.score}% match
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-zinc-400">
                            {result.company && result.company !== 'N/A' && <span>{result.company}</span>}
                            {result.title && result.title !== 'N/A' && <span>• {result.title}</span>}
                            {result.industry && result.industry !== 'N/A' && <span>• {result.industry}</span>}
                            {result.location && result.location !== 'N/A' && <span>• {result.location}</span>}
                            {result.employees && result.employees !== 'N/A' && <span>• {result.employees} employees</span>}
                          </div>
                          {(result.linkedin_url || result.website || result.email) && (
                            <div className="flex items-center gap-3 mt-2">
                              {result.linkedin_url && (
                                <a
                                  href={result.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-blue-400 hover:text-blue-300"
                                >
                                  LinkedIn →
                                </a>
                              )}
                              {result.website && (
                                <a
                                  href={result.website.startsWith('http') ? result.website : `https://${result.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                                >
                                  Website →
                                </a>
                              )}
                              {result.email && (
                                <span className="text-[10px] text-zinc-500">{result.email}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(0)}
                  className="border-zinc-700 text-zinc-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSaveList}
                  disabled={selectedResults.size === 0 || loading}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-8"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save {selectedResults.size} to List
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Export Complete */}
          {currentStep === 3 && (
            <motion.div
              key="export"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <GlassCard glow="indigo" className="p-8 max-w-md mx-auto">
                <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                  <Check className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">List Saved!</h3>
                <p className="text-zinc-400 mb-6">
                  {selectedResults.size} prospects have been added to your list.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => window.location.href = createPageUrl('GrowthProspects')}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white"
                  >
                    View My Prospects
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentStep(0);
                      setResults([]);
                      setSelectedResults(new Set());
                      setFilters({ query: '', industry: '', companySize: '', location: '', jobTitle: '', keywords: '', revenue: '', techStack: '' });
                    }}
                    className="border-zinc-700 text-zinc-300"
                  >
                    Start New Research
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}