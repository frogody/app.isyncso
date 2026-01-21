import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/components/context/UserContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  Filter,
  Users,
  MapPin,
  ArrowRight,
  Package,
  ChevronRight,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// ============================================================================
// MOCK DATA - Pre-built talent nests
// ============================================================================
const MOCK_NESTS = [
  {
    id: "nest-1",
    name: "Software Development",
    description: "Developers and engineers across all stacks and seniority levels.",
    category: "industry",
    regions: ["Netherlands"],
    candidate_count: 37639,
    price: 599,
    featured: true,
  },
  {
    id: "nest-2",
    name: "Accountancy",
    description: "Accounting & finance professionals from bookkeepers to controllers.",
    category: "industry",
    regions: ["Netherlands"],
    candidate_count: 36418,
    price: 499,
    featured: true,
  },
  {
    id: "nest-3",
    name: "Startup Founders & Executives",
    description: "CEOs, CTOs, COOs, and founding team members with startup experience.",
    category: "job_function",
    regions: ["Netherlands"],
    candidate_count: 19856,
    price: 749,
    featured: true,
  },
  {
    id: "nest-4",
    name: "Consultants",
    description: "Strategy & management consulting professionals.",
    category: "job_function",
    regions: ["Netherlands"],
    candidate_count: 12694,
    price: 649,
    featured: true,
  },
  {
    id: "nest-5",
    name: "Finance Directors & CFOs",
    description: "Senior finance leadership roles.",
    category: "job_function",
    regions: ["Netherlands"],
    candidate_count: 7185,
    price: 899,
    featured: false,
  },
  {
    id: "nest-6",
    name: "AI & Machine Learning",
    description: "Data scientists, ML engineers, and AI researchers.",
    category: "skill_based",
    regions: ["Netherlands"],
    candidate_count: 3267,
    price: 799,
    featured: false,
  },
  {
    id: "nest-7",
    name: "Tech Engineering NL",
    description: "Software engineers across the Netherlands tech ecosystem.",
    category: "hybrid",
    regions: ["Netherlands"],
    candidate_count: 1238,
    price: 699,
    featured: false,
  },
  {
    id: "nest-8",
    name: "SaaS Sales",
    description: "BDRs, Account Executives, and Sales Leaders.",
    category: "job_function",
    regions: ["Netherlands"],
    candidate_count: 629,
    price: 599,
    featured: false,
  },
  {
    id: "nest-9",
    name: "Healthcare Professionals",
    description: "Medical & healthcare talent including doctors and nurses.",
    category: "industry",
    regions: ["Netherlands"],
    candidate_count: 41873,
    price: 549,
    featured: false,
  },
  {
    id: "nest-10",
    name: "Transport & Logistics",
    description: "Supply chain and logistics experts.",
    category: "industry",
    regions: ["Netherlands"],
    candidate_count: 37572,
    price: 449,
    featured: false,
  },
  {
    id: "nest-11",
    name: "Banking & Insurance",
    description: "Financial services professionals.",
    category: "industry",
    regions: ["Netherlands"],
    candidate_count: 34657,
    price: 549,
    featured: false,
  },
  {
    id: "nest-12",
    name: "Accountancy NL",
    description: "Finance professionals with audit experience.",
    category: "industry",
    regions: ["Netherlands"],
    candidate_count: 844,
    price: 499,
    featured: false,
  },
];

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "industry", label: "Industry" },
  { id: "job_function", label: "Job Function" },
  { id: "skill_based", label: "Skill Based" },
];

// ============================================================================
// SIMPLE NEST CARD - Clean, minimal design
// ============================================================================
const NestCard = ({ nest, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        onClick={onClick}
        className="group p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
      >
        {/* Title */}
        <h3 className="text-lg font-medium text-white mb-2">
          {nest.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-zinc-500 mb-6 line-clamp-2">
          {nest.description}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-semibold text-white">€{nest.price}</span>
            <span className="text-sm text-zinc-500">
              {nest.candidate_count.toLocaleString()} profiles
            </span>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// FILTER SHEET - Hidden by default, accessible via button
// ============================================================================
const FilterSheet = ({
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-zinc-900 border-zinc-800">
        <SheetHeader>
          <SheetTitle className="text-white">Filter Nests</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Category */}
          <div>
            <label className="text-sm text-zinc-400 mb-3 block">Category</label>
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-sm text-zinc-400 mb-3 block">Price Range</label>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Any price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any price</SelectItem>
                <SelectItem value="under500">Under €500</SelectItem>
                <SelectItem value="500to700">€500 - €700</SelectItem>
                <SelectItem value="over700">Over €700</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ============================================================================
// MAIN PAGE - Clean, spacious layout
// ============================================================================
export default function TalentNests() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Filter nests
  const filteredNests = useMemo(() => {
    let result = [...MOCK_NESTS];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(nest =>
        nest.name.toLowerCase().includes(query) ||
        nest.description.toLowerCase().includes(query)
      );
    }

    // Category
    if (selectedCategory !== "all") {
      result = result.filter(nest => nest.category === selectedCategory);
    }

    // Price range
    if (priceRange !== "all") {
      result = result.filter(nest => {
        switch (priceRange) {
          case "under500": return nest.price < 500;
          case "500to700": return nest.price >= 500 && nest.price <= 700;
          case "over700": return nest.price > 700;
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
    }

    return result;
  }, [searchQuery, selectedCategory, priceRange, sortBy]);

  const totalCandidates = MOCK_NESTS.reduce((sum, nest) => sum + nest.candidate_count, 0);

  const handleViewNest = (nest) => {
    navigate(createPageUrl("TalentNestDetail") + `?id=${nest.id}`);
  };

  if (loading) {
    return (
      <div className="w-full px-6 lg:px-8 py-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Talent Nests</h1>
        <p className="text-zinc-500 text-sm">
          Pre-built candidate datasets for your recruitment needs
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search nests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-zinc-900/50 border-zinc-800 focus:border-zinc-700 text-white placeholder:text-zinc-600"
          />
        </div>

        <FilterSheet
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
        />

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44 h-11 bg-zinc-900/50 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
            <SelectItem value="candidates">Most Candidates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-zinc-500 mb-5">
        {filteredNests.length} nests available
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <AnimatePresence>
          {filteredNests.map((nest) => (
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
        <div className="text-center py-20">
          <p className="text-zinc-500 mb-2">No nests match your criteria</p>
          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setPriceRange("all");
            }}
            className="text-red-400 hover:text-red-300"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
