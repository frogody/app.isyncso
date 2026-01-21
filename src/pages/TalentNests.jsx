import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Filter,
  Users,
  MapPin,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  Globe,
  Building2,
  Briefcase,
  GraduationCap,
  Target,
  Layers,
  Check,
  X,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// ============================================================================
// MOCK DATA - Pre-built talent nests for the marketplace
// ============================================================================
const MOCK_NESTS = [
  {
    id: "nest-1",
    name: "Software Development",
    description: "Developers and engineers across all stacks and seniority levels. Frontend, backend, fullstack, DevOps, and specialized roles from startups to enterprises.",
    category: "industry",
    industries: ["Technology", "Software", "IT Services"],
    job_titles: ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Site Reliability Engineer"],
    regions: ["Netherlands"],
    avg_experience: 6,
    candidate_count: 37639,
    price: 599,
    price_per_profile: 0.02,
    featured: true,
    seniority_distribution: { junior: 20, mid: 45, senior: 30, lead: 5 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "M&A", "Growth", "Satisfaction"],
  },
  {
    id: "nest-2",
    name: "Accountancy",
    description: "Accounting & finance professionals in NL. From bookkeepers to senior accountants and financial controllers.",
    category: "industry",
    industries: ["Accounting", "Finance", "Professional Services"],
    job_titles: ["Accountant", "Senior Accountant", "Financial Controller", "Bookkeeper", "Tax Advisor"],
    regions: ["Netherlands"],
    avg_experience: 5,
    candidate_count: 36418,
    price: 499,
    price_per_profile: 0.01,
    featured: true,
    seniority_distribution: { junior: 25, mid: 40, senior: 25, lead: 10 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "Satisfaction"],
  },
  {
    id: "nest-3",
    name: "Startup Founders & Executives",
    description: "Startup leadership talent. CEOs, CTOs, COOs, and founding team members with startup experience.",
    category: "job_function",
    industries: ["Technology", "Startups", "Venture Capital"],
    job_titles: ["CEO", "CTO", "COO", "Founder", "Co-Founder", "VP Engineering"],
    regions: ["Netherlands"],
    avg_experience: 10,
    candidate_count: 19856,
    price: 749,
    price_per_profile: 0.04,
    featured: true,
    seniority_distribution: { junior: 0, mid: 10, senior: 40, lead: 50 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "M&A", "Growth", "Funding rounds"],
  },
  {
    id: "nest-4",
    name: "Consultants (Strategy & Management)",
    description: "Strategy & management consulting professionals from top firms and boutiques.",
    category: "job_function",
    industries: ["Consulting", "Management Consulting", "Strategy"],
    job_titles: ["Consultant", "Senior Consultant", "Manager", "Principal", "Partner"],
    regions: ["Netherlands"],
    avg_experience: 7,
    candidate_count: 12694,
    price: 649,
    price_per_profile: 0.05,
    featured: true,
    seniority_distribution: { junior: 15, mid: 35, senior: 35, lead: 15 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "Growth"],
  },
  {
    id: "nest-5",
    name: "Finance Directors & CFOs",
    description: "Senior finance leadership. CFOs, Finance Directors, and VP Finance professionals.",
    category: "job_function",
    industries: ["Finance", "All Industries"],
    job_titles: ["CFO", "Finance Director", "VP Finance", "Head of Finance", "Financial Controller"],
    regions: ["Netherlands"],
    avg_experience: 15,
    candidate_count: 7185,
    price: 899,
    price_per_profile: 0.12,
    featured: false,
    seniority_distribution: { junior: 0, mid: 5, senior: 45, lead: 50 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "M&A", "Growth"],
  },
  {
    id: "nest-6",
    name: "AI & Machine Learning Engineers",
    description: "AI/ML engineering talent. Data scientists, ML engineers, and AI researchers.",
    category: "skill_based",
    industries: ["Technology", "AI/ML", "Research"],
    job_titles: ["ML Engineer", "Data Scientist", "AI Engineer", "Research Scientist", "Deep Learning Engineer"],
    regions: ["Netherlands"],
    avg_experience: 5,
    candidate_count: 3267,
    price: 799,
    price_per_profile: 0.24,
    featured: false,
    seniority_distribution: { junior: 30, mid: 40, senior: 25, lead: 5 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "Publications", "GitHub"],
  },
  {
    id: "nest-7",
    name: "Tech Engineering NL",
    description: "Software engineers & developers across the Netherlands tech ecosystem.",
    category: "hybrid",
    industries: ["Technology", "Software", "Fintech", "E-commerce"],
    job_titles: ["Software Engineer", "Developer", "Tech Lead", "Engineering Manager"],
    regions: ["Netherlands"],
    avg_experience: 6,
    candidate_count: 1238,
    price: 699,
    price_per_profile: 0.56,
    featured: false,
    seniority_distribution: { junior: 20, mid: 45, senior: 25, lead: 10 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "GitHub"],
  },
  {
    id: "nest-8",
    name: "Accountancy NL",
    description: "Finance professionals met audit & corporate accounting ervaring.",
    category: "industry",
    industries: ["Accounting", "Audit", "Finance"],
    job_titles: ["Accountant", "Auditor", "Controller", "Finance Manager"],
    regions: ["Netherlands"],
    avg_experience: 6,
    candidate_count: 844,
    price: 499,
    price_per_profile: 0.59,
    featured: false,
    seniority_distribution: { junior: 20, mid: 45, senior: 30, lead: 5 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Certifications"],
  },
  {
    id: "nest-9",
    name: "SaaS Sales NL",
    description: "Enterprise & mid-market SaaS verkopers. BDRs, AEs, and Sales Leaders.",
    category: "job_function",
    industries: ["SaaS", "Technology", "Software"],
    job_titles: ["BDR", "SDR", "Account Executive", "Sales Manager", "VP Sales"],
    regions: ["Netherlands"],
    avg_experience: 4,
    candidate_count: 629,
    price: 599,
    price_per_profile: 0.95,
    featured: false,
    seniority_distribution: { junior: 35, mid: 40, senior: 20, lead: 5 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Quota attainment", "Deal size"],
  },
  {
    id: "nest-10",
    name: "Healthcare Professionals",
    description: "Medical & healthcare talent. Doctors, nurses, healthcare managers, and specialists.",
    category: "industry",
    industries: ["Healthcare", "Medical", "Pharmaceuticals"],
    job_titles: ["Doctor", "Nurse", "Healthcare Manager", "Medical Director", "Clinical Specialist"],
    regions: ["Netherlands"],
    avg_experience: 8,
    candidate_count: 41873,
    price: 549,
    price_per_profile: 0.01,
    featured: false,
    seniority_distribution: { junior: 15, mid: 40, senior: 35, lead: 10 },
    data_points: ["LinkedIn", "Specializations", "Certifications", "Hospital affiliations"],
  },
  {
    id: "nest-11",
    name: "Transport & Distribution",
    description: "Supply chain & logistics experts. Transport managers, logistics coordinators, and warehouse specialists.",
    category: "industry",
    industries: ["Logistics", "Transport", "Supply Chain"],
    job_titles: ["Logistics Manager", "Transport Coordinator", "Warehouse Manager", "Supply Chain Director"],
    regions: ["Netherlands"],
    avg_experience: 7,
    candidate_count: 37572,
    price: 449,
    price_per_profile: 0.01,
    featured: false,
    seniority_distribution: { junior: 20, mid: 45, senior: 25, lead: 10 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Certifications"],
  },
  {
    id: "nest-12",
    name: "Commercial Banking & Insurance",
    description: "Banking & finance professionals. Relationship managers, underwriters, and risk analysts.",
    category: "industry",
    industries: ["Banking", "Insurance", "Financial Services"],
    job_titles: ["Relationship Manager", "Underwriter", "Risk Analyst", "Branch Manager", "Claims Manager"],
    regions: ["Netherlands"],
    avg_experience: 8,
    candidate_count: 34657,
    price: 549,
    price_per_profile: 0.02,
    featured: false,
    seniority_distribution: { junior: 15, mid: 40, senior: 35, lead: 10 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Certifications"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: Layers },
  { id: "industry", label: "Industry", icon: Building2 },
  { id: "job_function", label: "Job Function", icon: Briefcase },
  { id: "skill_based", label: "Skill Based", icon: GraduationCap },
  { id: "hybrid", label: "Hybrid", icon: Target },
];

const REGIONS = [
  "Global",
  "Netherlands",
  "Germany",
  "Belgium",
  "United Kingdom",
  "France",
  "United States",
  "Spain",
  "Italy",
  "Poland",
];

const INDUSTRIES = [
  "All Industries",
  "Technology",
  "Software",
  "Finance",
  "Accounting",
  "Healthcare",
  "Consulting",
  "Banking",
  "Insurance",
  "Logistics",
  "Manufacturing",
  "Retail",
  "E-commerce",
];

const SIZE_RANGES = [
  { id: "any", label: "Any Size" },
  { id: "small", label: "< 1,000 Candidates" },
  { id: "medium", label: "1,000 - 5,000 Candidates" },
  { id: "large", label: "5,000 - 10,000 Candidates" },
  { id: "xlarge", label: "10,000+ Candidates" },
];

// ============================================================================
// NEST CARD COMPONENT
// ============================================================================
const NestCard = ({ nest, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <GlassCard
        className="p-5 cursor-pointer hover:border-red-500/30 transition-all duration-300 h-full flex flex-col"
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1 pr-2">
            {nest.name}
          </h3>
          {nest.featured && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs shrink-0">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">
          {nest.description}
        </p>

        {/* Location */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <MapPin className="w-3 h-3" />
          <span>{nest.regions.join(", ")}</span>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">€{nest.price}</span>
            <span className="text-xs text-zinc-500">one-time</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{nest.candidate_count.toLocaleString()}</span>
          </div>
        </div>

        {/* View Button */}
        <Button
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
          variant="outline"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Nest
        </Button>
      </GlassCard>
    </motion.div>
  );
};

// ============================================================================
// FILTER SIDEBAR COMPONENT
// ============================================================================
const FilterSidebar = ({
  selectedCategory,
  setSelectedCategory,
  selectedRegions,
  setSelectedRegions,
  selectedIndustries,
  setSelectedIndustries,
  selectedSize,
  setSelectedSize,
}) => {
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [regionsOpen, setRegionsOpen] = useState(true);
  const [industriesOpen, setIndustriesOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);

  const toggleRegion = (region) => {
    if (region === "Global") {
      setSelectedRegions(selectedRegions.includes("Global") ? [] : ["Global"]);
    } else {
      const newRegions = selectedRegions.includes(region)
        ? selectedRegions.filter(r => r !== region)
        : [...selectedRegions.filter(r => r !== "Global"), region];
      setSelectedRegions(newRegions);
    }
  };

  const toggleIndustry = (industry) => {
    if (industry === "All Industries") {
      setSelectedIndustries(selectedIndustries.includes("All Industries") ? [] : ["All Industries"]);
    } else {
      const newIndustries = selectedIndustries.includes(industry)
        ? selectedIndustries.filter(i => i !== industry)
        : [...selectedIndustries.filter(i => i !== "All Industries"), industry];
      setSelectedIndustries(newIndustries);
    }
  };

  return (
    <div className="w-64 shrink-0 space-y-4">
      {/* Categories */}
      <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Filter className="w-4 h-4 text-red-400" />
            Categories
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
              }`}
            >
              {selectedCategory === cat.id && (
                <Check className="w-4 h-4 text-red-400" />
              )}
              {selectedCategory !== cat.id && (
                <div className="w-4 h-4" />
              )}
              {cat.label}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Regions */}
      <Collapsible open={regionsOpen} onOpenChange={setRegionsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Globe className="w-4 h-4 text-red-400" />
            Regions
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${regionsOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Input
            placeholder="Filter regions..."
            className="mb-2 bg-zinc-800/50 border-zinc-700 text-sm"
          />
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {REGIONS.map(region => (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedRegions.includes(region)
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                  }`}
                >
                  <Checkbox
                    checked={selectedRegions.includes(region)}
                    className="border-zinc-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                  />
                  {region}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Industries */}
      <Collapsible open={industriesOpen} onOpenChange={setIndustriesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Building2 className="w-4 h-4 text-red-400" />
            Industries
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${industriesOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedIndustries.includes(industry)
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                  }`}
                >
                  <Checkbox
                    checked={selectedIndustries.includes(industry)}
                    className="border-zinc-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                  />
                  {industry}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Size */}
      <Collapsible open={sizeOpen} onOpenChange={setSizeOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Users className="w-4 h-4 text-red-400" />
            Size
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${sizeOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1">
          {SIZE_RANGES.map(size => (
            <button
              key={size.id}
              onClick={() => setSelectedSize(size.id)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedSize === size.id
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
              }`}
            >
              {selectedSize === size.id && (
                <Check className="w-4 h-4 text-red-400" />
              )}
              {selectedSize !== size.id && (
                <div className="w-4 h-4" />
              )}
              {size.label}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Filter */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <ShoppingCart className="w-4 h-4 text-red-400" />
            Price
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function TalentNests() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRegions, setSelectedRegions] = useState(["Global"]);
  const [selectedIndustries, setSelectedIndustries] = useState(["All Industries"]);
  const [selectedSize, setSelectedSize] = useState("any");
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState("nests"); // nests or plans
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter and sort nests
  const filteredNests = useMemo(() => {
    let result = [...MOCK_NESTS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(nest =>
        nest.name.toLowerCase().includes(query) ||
        nest.description.toLowerCase().includes(query) ||
        nest.industries.some(i => i.toLowerCase().includes(query)) ||
        nest.job_titles.some(j => j.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(nest => nest.category === selectedCategory);
    }

    // Region filter
    if (!selectedRegions.includes("Global") && selectedRegions.length > 0) {
      result = result.filter(nest =>
        nest.regions.some(r => selectedRegions.includes(r))
      );
    }

    // Industry filter
    if (!selectedIndustries.includes("All Industries") && selectedIndustries.length > 0) {
      result = result.filter(nest =>
        nest.industries.some(i => selectedIndustries.includes(i))
      );
    }

    // Size filter
    if (selectedSize !== "any") {
      result = result.filter(nest => {
        const count = nest.candidate_count;
        switch (selectedSize) {
          case "small": return count < 1000;
          case "medium": return count >= 1000 && count < 5000;
          case "large": return count >= 5000 && count < 10000;
          case "xlarge": return count >= 10000;
          default: return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case "featured":
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      case "price_low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "candidates":
        result.sort((a, b) => b.candidate_count - a.candidate_count);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, selectedRegions, selectedIndustries, selectedSize, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredNests.length / itemsPerPage);
  const paginatedNests = filteredNests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate total candidates
  const totalCandidates = MOCK_NESTS.reduce((sum, nest) => sum + nest.candidate_count, 0);

  const handleViewNest = (nest) => {
    navigate(createPageUrl("TalentNestDetail") + `?id=${nest.id}`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="flex gap-6">
          <Skeleton className="h-[600px] w-64" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Package className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Available Nests</h1>
              <p className="text-sm text-zinc-500">
                {filteredNests.length} results • {totalCandidates.toLocaleString()} candidates
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "nests" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("nests")}
            className={viewMode === "nests" ? "bg-zinc-700" : "border-zinc-700"}
          >
            Plans
          </Button>
          <Button
            variant={viewMode === "nests" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("nests")}
            className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
          >
            <Package className="w-4 h-4 mr-1" />
            Nests
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <FilterSidebar
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedRegions={selectedRegions}
          setSelectedRegions={setSelectedRegions}
          selectedIndustries={selectedIndustries}
          setSelectedIndustries={setSelectedIndustries}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
        />

        {/* Content Area */}
        <div className="flex-1 space-y-4">
          {/* Search and Sort Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search nests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-700"
              />
            </div>
            <div className="text-sm text-zinc-500">
              Showing <span className="text-white font-medium">{filteredNests.length}</span> nests
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="candidates">Most Candidates</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nest Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedNests.map((nest) => (
                <NestCard
                  key={nest.id}
                  nest={nest}
                  onClick={() => handleViewNest(nest)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredNests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-16 h-16 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No nests found</h3>
              <p className="text-zinc-500 max-w-md">
                Try adjusting your filters or search query to find talent nests.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-zinc-700"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                  className={currentPage === i + 1 ? "bg-red-500" : "border-zinc-700"}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-zinc-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
