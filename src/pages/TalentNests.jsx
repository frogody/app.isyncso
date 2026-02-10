import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  Megaphone,
  ShoppingBag,
  Factory,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { supabase } from "@/api/supabaseClient";

// ============================================================================
// TALENT NESTS - Fetched from database
// ============================================================================

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "candidates", label: "Candidates" },
  { id: "prospects", label: "Prospects" },
  { id: "investors", label: "Investors" },
  { id: "companies", label: "Companies" },
];

// ============================================================================
// SIMPLE NEST CARD - Clean, minimal design
// ============================================================================
const NestCard = ({ nest, onClick }) => {
  const itemCount = nest.item_count || 0;
  const price = parseFloat(nest.price) || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        onClick={onClick}
        className="group p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
      >
        {/* Title */}
        <h3 className="text-base font-medium text-white mb-2">
          {nest.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-zinc-500 mb-4 line-clamp-2">
          {nest.description || `${nest.nest_type} dataset`}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">€{price.toFixed(0)}</span>
            <span className="text-xs text-zinc-500">
              {itemCount.toLocaleString()} {nest.nest_type === 'companies' ? 'companies' : 'profiles'}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors" />
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
  const [loading, setLoading] = useState(true);
  const [nests, setNests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  // Fetch nests from database
  useEffect(() => {
    async function fetchNests() {
      try {
        const { data, error } = await supabase
          .from('nests')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching nests:', error);
        } else {
          setNests(data || []);
        }
      } catch (err) {
        console.error('Error fetching nests:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNests();
  }, []);

  // Filter nests
  const filteredNests = useMemo(() => {
    let result = [...nests];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(nest =>
        nest.name?.toLowerCase().includes(query) ||
        nest.description?.toLowerCase().includes(query)
      );
    }

    // Category (nest_type)
    if (selectedCategory !== "all") {
      result = result.filter(nest => nest.nest_type === selectedCategory);
    }

    // Price range
    if (priceRange !== "all") {
      result = result.filter(nest => {
        const price = parseFloat(nest.price) || 0;
        switch (priceRange) {
          case "under500": return price < 500;
          case "500to700": return price >= 500 && price <= 700;
          case "over700": return price > 700;
          default: return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case "featured":
        result.sort((a, b) => (b.item_count || 0) - (a.item_count || 0));
        break;
      case "price_low":
        result.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        break;
      case "price_high":
        result.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        break;
      case "candidates":
        result.sort((a, b) => (b.item_count || 0) - (a.item_count || 0));
        break;
    }

    return result;
  }, [nests, searchQuery, selectedCategory, priceRange, sortBy]);

  const totalCandidates = nests.reduce((sum, nest) => sum + (nest.item_count || 0), 0);

  const handleViewNest = (nest) => {
    navigate(createPageUrl("TalentNestDetail") + `?id=${nest.id}`);
  };

  if (loading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 lg:px-6 py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white mb-1">Talent Nests</h1>
        <p className="text-zinc-500 text-xs">
          Pre-built candidate datasets for your recruitment needs
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search nests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-9 bg-zinc-900/50 border-zinc-800 focus:border-zinc-700 text-white placeholder:text-zinc-600"
          />
        </div>

        <FilterSheet
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
        />

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 h-9 bg-zinc-900/50 border-zinc-800">
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
      <p className="text-xs text-zinc-500">
        {filteredNests.length} nests available
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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

      {/* Flow Continuity CTA - Shown when nests exist */}
      {filteredNests.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Megaphone className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium">Ready to start recruiting?</p>
                <p className="text-zinc-400 text-sm">Purchase a nest to unlock data, then launch a targeted campaign or enrich</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(createPageUrl("TalentCampaigns"))}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                My Campaigns
              </Button>
              <Button
                onClick={() => navigate("/marketplace/nests")}
                className="bg-red-500 hover:bg-red-600"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Visit Marketplace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
