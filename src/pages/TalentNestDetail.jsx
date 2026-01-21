import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  MapPin,
  Clock,
  Building2,
  Briefcase,
  Star,
  Sparkles,
  ShoppingCart,
  Eye,
  Check,
  X,
  Linkedin,
  DollarSign,
  TrendingUp,
  Award,
  RefreshCw,
  BarChart3,
  Zap,
  Heart,
  Loader2,
  CreditCard,
  Download,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// ============================================================================
// MOCK DATA - Nest details and sample profiles
// ============================================================================
const MOCK_NESTS = {
  "nest-1": {
    id: "nest-1",
    name: "Software Development",
    description: "Developers and engineers across all stacks and seniority levels. Frontend, backend, fullstack, DevOps, and specialized roles from startups to enterprises.",
    category: "industry",
    industries: ["Technology", "Software", "IT Services"],
    job_titles: ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Site Reliability Engineer"],
    regions: ["Netherlands"],
    avg_experience: 6,
    candidate_count: 37641,
    price: 599,
    price_per_profile: 0.02,
    featured: true,
    seniority_distribution: { junior: 20, mid: 45, senior: 30, lead: 5 },
    data_points: ["LinkedIn", "Salary", "Tenure", "Promotions", "Job changes", "M&A", "Growth", "Satisfaction"],
    sample_profiles: [
      { id: 1, initials: "JV", name: "Jan V.", job_title: "Senior Accountant", company: "Deloitte", priority: "High", score: 78 },
      { id: 2, initials: "LM", name: "Lisa M.", job_title: "Financial Controller", company: "KPMG", priority: "Critical", score: 85 },
      { id: 3, initials: "TB", name: "Tom B.", job_title: "Tax Advisor", company: "EY", priority: "Medium", score: 62 },
      { id: 4, initials: "EK", name: "Eva K.", job_title: "Audit Manager", company: "PwC", priority: "High", score: 71 },
      { id: 5, initials: "MD", name: "Mark D.", job_title: "CFO", company: "Rabobank", priority: "Critical", score: 89 },
      { id: 6, initials: "SR", name: "Sophie R.", job_title: "Tax Manager", company: "BDO", priority: "Medium", score: 54 },
      { id: 7, initials: "PH", name: "Peter H.", job_title: "Controller", company: "ABN AMRO", priority: "High", score: 76 },
      { id: 8, initials: "AW", name: "Anne W.", job_title: "Finance Director", company: "ING", priority: "Critical", score: 82 },
    ],
  },
  "nest-2": {
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
    sample_profiles: [
      { id: 1, initials: "KV", name: "Karin V.", job_title: "Senior Accountant", company: "Deloitte", priority: "High", score: 81 },
      { id: 2, initials: "RB", name: "Robert B.", job_title: "Tax Advisor", company: "EY", priority: "Medium", score: 67 },
      { id: 3, initials: "MJ", name: "Marieke J.", job_title: "Financial Controller", company: "Philips", priority: "Critical", score: 92 },
      { id: 4, initials: "DP", name: "Dennis P.", job_title: "Bookkeeper", company: "Local Firm", priority: "Low", score: 45 },
    ],
  },
};

// Generate default nest for any ID
const getDefaultNest = (id) => ({
  id,
  name: "Talent Nest",
  description: "A curated collection of qualified professionals.",
  category: "industry",
  industries: ["Various"],
  job_titles: ["Professional"],
  regions: ["Netherlands"],
  avg_experience: 5,
  candidate_count: 10000,
  price: 499,
  price_per_profile: 0.05,
  featured: false,
  seniority_distribution: { junior: 25, mid: 40, senior: 25, lead: 10 },
  data_points: ["LinkedIn", "Salary", "Tenure"],
  sample_profiles: [
    { id: 1, initials: "JD", name: "John D.", job_title: "Professional", company: "Company A", priority: "Medium", score: 65 },
  ],
});

// ============================================================================
// PRIORITY BADGE COMPONENT
// ============================================================================
const PriorityBadge = ({ priority }) => {
  const styles = {
    Critical: "bg-red-500/20 text-red-400 border-red-500/30",
    High: "bg-red-500/20 text-red-400 border-red-500/30",
    Medium: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    Low: "bg-zinc-600/20 text-zinc-500 border-zinc-600/30",
  };

  return (
    <Badge className={`${styles[priority] || styles.Medium} text-xs`}>
      {priority}
    </Badge>
  );
};

// ============================================================================
// DATA POINT ICON COMPONENT
// ============================================================================
const DataPointIcon = ({ label }) => {
  const icons = {
    LinkedIn: Linkedin,
    Salary: DollarSign,
    Tenure: Clock,
    Promotions: TrendingUp,
    "Job changes": RefreshCw,
    "M&A": Building2,
    Growth: BarChart3,
    Satisfaction: Heart,
  };

  const Icon = icons[label] || Zap;

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
};

// ============================================================================
// SENIORITY BAR COMPONENT
// ============================================================================
const SeniorityBar = ({ label, percentage }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-sm text-white font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-red-500 to-red-400"
        />
      </div>
    </div>
  );
};

// ============================================================================
// PURCHASE DIALOG COMPONENT
// ============================================================================
const PurchaseDialog = ({ isOpen, onClose, nest, onPurchase }) => {
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    // Simulate purchase
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPurchasing(false);
    onPurchase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-red-400" />
            Purchase Nest
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            You're about to purchase access to the "{nest?.name}" talent nest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400">Nest</span>
              <span className="text-white font-medium">{nest?.name}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400">Candidates</span>
              <span className="text-white font-medium">{nest?.candidate_count?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400">Per Profile</span>
              <span className="text-zinc-400">€{nest?.price_per_profile?.toFixed(2)}</span>
            </div>
            <div className="border-t border-zinc-800 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-2xl font-bold text-red-400">€{nest?.price}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">One-time payment • Lifetime access</p>
            </div>
          </GlassCard>

          <div className="space-y-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400" />
              <span>Full access to all {nest?.candidate_count?.toLocaleString()} profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400" />
              <span>Export to CSV, Excel, or API</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400" />
              <span>Updated data every 30 days</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400" />
              <span>Integration with campaigns</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={purchasing}
            className="bg-red-500 hover:bg-red-600"
          >
            {purchasing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Purchase for €{nest?.price}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function TalentNestDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [nest, setNest] = useState(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const nestId = searchParams.get("id") || "nest-1";

  useEffect(() => {
    // Simulate loading nest data
    const timer = setTimeout(() => {
      const nestData = MOCK_NESTS[nestId] || getDefaultNest(nestId);
      setNest(nestData);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [nestId]);

  const handlePurchase = () => {
    setShowPurchaseDialog(false);
    toast.success(`Successfully purchased "${nest.name}" nest!`, {
      description: `${nest.candidate_count.toLocaleString()} candidates are now available in your library.`,
    });
    // In real app, redirect to purchased nests or download
  };

  if (loading || !nest) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("TalentNests"))}
        className="text-zinc-400 hover:text-white -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Nests
      </Button>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Nest Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <GlassCard className="p-6 relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" />

            <div className="relative">
              {/* Title Row */}
              <div className="flex items-start gap-3 mb-4">
                <h1 className="text-3xl font-bold text-white">{nest.name}</h1>
                {nest.featured && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-zinc-400 mb-6 max-w-2xl">
                {nest.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <MapPin className="w-3 h-3 mr-1" />
                  {nest.regions.join(", ")}
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <Clock className="w-3 h-3 mr-1" />
                  ~{nest.avg_experience}y exp
                </Badge>
              </div>
            </div>
          </GlassCard>

          {/* Search Criteria */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-400" />
                Search Criteria
              </h2>
              <Badge className="bg-zinc-800 text-zinc-300">
                {nest.industries.length + nest.job_titles.length + 1} filters
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Industries */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-400">Industries</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nest.industries.map((industry, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 bg-zinc-800/50"
                    >
                      <X className="w-3 h-3 mr-1 text-zinc-500" />
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Job Titles */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-400">Job Titles</span>
                  <Badge className="bg-zinc-800 text-zinc-400 text-xs ml-auto">
                    {nest.job_titles.length} titles
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nest.job_titles.map((title, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 bg-zinc-800/50"
                    >
                      <X className="w-3 h-3 mr-1 text-zinc-500" />
                      {title}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-400">Location</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nest.regions.map((region, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 bg-zinc-800/50"
                    >
                      <span className="mr-1">🇳🇱</span>
                      {region} (Nationwide)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Sample Profiles */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-red-400" />
                Sample Profiles
              </h2>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                Preview Only
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-500">NAME</TableHead>
                    <TableHead className="text-zinc-500">JOB TITLE</TableHead>
                    <TableHead className="text-zinc-500">COMPANY</TableHead>
                    <TableHead className="text-zinc-500">PRIORITY</TableHead>
                    <TableHead className="text-zinc-500 text-right">SCORE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nest.sample_profiles.map((profile) => (
                    <TableRow
                      key={profile.id}
                      className="border-zinc-800 hover:bg-zinc-800/30 cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                            {profile.initials}
                          </div>
                          <span className="text-white font-medium">{profile.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400">{profile.job_title}</TableCell>
                      <TableCell className="text-zinc-400">{profile.company}</TableCell>
                      <TableCell>
                        <PriorityBadge priority={profile.priority} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-400 font-semibold">{profile.score}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-zinc-500 text-center mt-4">
              Click to preview • Full data after purchase
            </p>
          </GlassCard>
        </div>

        {/* Right Column - Stats & Purchase */}
        <div className="space-y-4">
          {/* Candidate Count Card */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Users className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {nest.candidate_count.toLocaleString()}
                </p>
                <Badge className="bg-zinc-800 text-zinc-400 mt-1">CANDIDATES</Badge>
              </div>
            </div>

            {/* Seniority Distribution */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Seniority Distribution
              </h3>
              <SeniorityBar label="Junior" percentage={nest.seniority_distribution.junior} />
              <SeniorityBar label="Mid" percentage={nest.seniority_distribution.mid} />
              <SeniorityBar label="Senior" percentage={nest.seniority_distribution.senior} />
              <SeniorityBar label="Lead" percentage={nest.seniority_distribution.lead} />
            </div>

            {/* Data Points */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="grid grid-cols-2 gap-3">
                {nest.data_points.map((point, i) => (
                  <DataPointIcon key={i} label={point} />
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Purchase Card */}
          <GlassCard className="p-6 border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">€{nest.price}</span>
                <span className="text-sm text-zinc-500">one-time</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">per profile</p>
                <p className="text-sm text-zinc-400">€{nest.price_per_profile.toFixed(2)}</p>
              </div>
            </div>

            <Button
              onClick={() => setShowPurchaseDialog(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white mt-4 h-12 text-base"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Purchase Nest
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>

            <div className="mt-4 space-y-2 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-red-400" />
                <span>Instant access after purchase</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-red-400" />
                <span>Export to CSV or integrate via API</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-red-400" />
                <span>30-day data freshness guarantee</span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-400"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Data
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Sample CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Purchase Dialog */}
      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        nest={nest}
        onPurchase={handlePurchase}
      />
    </div>
  );
}
