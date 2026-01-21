import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Building2,
  Briefcase,
  Check,
  Loader2,
  CreditCard,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// ============================================================================
// NEST DATA - Ready to be filled with real data
// ============================================================================
const NEST_DATA = {
  "nest-accountants": {
    id: "nest-accountants",
    name: "Accountants bij Accountantskantoren",
    description: "Accountants werkzaam bij accountantskantoren in Nederland.",
    industries: ["Accountancy", "Professional Services"],
    job_titles: ["Accountant", "Senior Accountant", "Audit Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 499,
    seniority: { Junior: 30, Mid: 40, Senior: 25, Lead: 5 },
    sample_profiles: [],
  },
  "nest-software-devs": {
    id: "nest-software-devs",
    name: "Software Developers bij SaaS Bedrijven",
    description: "Software developers en engineers bij SaaS bedrijven.",
    industries: ["SaaS", "Technology"],
    job_titles: ["Software Developer", "Full Stack Developer", "Backend Developer"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 599,
    seniority: { Junior: 25, Mid: 45, Senior: 25, Lead: 5 },
    sample_profiles: [],
  },
  "nest-data-engineers": {
    id: "nest-data-engineers",
    name: "Data Engineers bij Tech Bedrijven",
    description: "Data engineers werkzaam bij tech bedrijven.",
    industries: ["Technology", "Data & Analytics"],
    job_titles: ["Data Engineer", "Senior Data Engineer", "Data Architect"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 649,
    seniority: { Junior: 20, Mid: 45, Senior: 30, Lead: 5 },
    sample_profiles: [],
  },
  "nest-financial-controllers": {
    id: "nest-financial-controllers",
    name: "Financial Controllers bij Corporates",
    description: "Financial controllers bij grote corporates en multinationals.",
    industries: ["Corporate", "Finance"],
    job_titles: ["Financial Controller", "Business Controller", "Finance Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 599,
    seniority: { Junior: 15, Mid: 40, Senior: 35, Lead: 10 },
    sample_profiles: [],
  },
  "nest-account-managers": {
    id: "nest-account-managers",
    name: "Account Managers bij B2B SaaS",
    description: "Account managers en sales professionals bij B2B SaaS bedrijven.",
    industries: ["SaaS", "B2B Sales"],
    job_titles: ["Account Manager", "Account Executive", "Sales Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 549,
    seniority: { Junior: 25, Mid: 45, Senior: 25, Lead: 5 },
    sample_profiles: [],
  },
  "nest-cybersecurity": {
    id: "nest-cybersecurity",
    name: "Cybersecurity Specialists bij Security Firms",
    description: "Cybersecurity specialisten bij security bedrijven.",
    industries: ["Cybersecurity", "IT Security"],
    job_titles: ["Security Engineer", "Security Analyst", "Pentester"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 699,
    seniority: { Junior: 20, Mid: 40, Senior: 30, Lead: 10 },
    sample_profiles: [],
  },
  "nest-hr-managers": {
    id: "nest-hr-managers",
    name: "HR Managers bij MKB",
    description: "HR managers werkzaam bij MKB bedrijven.",
    industries: ["SME", "Various"],
    job_titles: ["HR Manager", "HR Business Partner", "People Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 449,
    seniority: { Junior: 20, Mid: 45, Senior: 30, Lead: 5 },
    sample_profiles: [],
  },
  "nest-marketing-managers": {
    id: "nest-marketing-managers",
    name: "Marketing Managers bij Scale-ups",
    description: "Marketing managers bij snelgroeiende scale-ups.",
    industries: ["Scale-ups", "Technology"],
    job_titles: ["Marketing Manager", "Head of Marketing", "Growth Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 549,
    seniority: { Junior: 15, Mid: 45, Senior: 30, Lead: 10 },
    sample_profiles: [],
  },
  "nest-project-managers": {
    id: "nest-project-managers",
    name: "Projectmanagers bij IT Consultancies",
    description: "Projectmanagers werkzaam bij IT consultancy bureaus.",
    industries: ["IT Consultancy", "Professional Services"],
    job_titles: ["Project Manager", "IT Project Manager", "Program Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 549,
    seniority: { Junior: 15, Mid: 45, Senior: 30, Lead: 10 },
    sample_profiles: [],
  },
  "nest-recruiters": {
    id: "nest-recruiters",
    name: "Recruiters bij Werving & Selectiebureaus",
    description: "Recruiters werkzaam bij werving en selectie bureaus.",
    industries: ["Recruitment", "Staffing"],
    job_titles: ["Recruiter", "Senior Recruiter", "Recruitment Consultant"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 399,
    seniority: { Junior: 35, Mid: 40, Senior: 20, Lead: 5 },
    sample_profiles: [],
  },
  "nest-operations-managers": {
    id: "nest-operations-managers",
    name: "Operations Managers bij Logistiek/E-commerce",
    description: "Operations managers bij logistiek en e-commerce bedrijven.",
    industries: ["Logistics", "E-commerce"],
    job_titles: ["Operations Manager", "Supply Chain Manager", "Warehouse Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 549,
    seniority: { Junior: 15, Mid: 45, Senior: 30, Lead: 10 },
    sample_profiles: [],
  },
  "nest-csm": {
    id: "nest-csm",
    name: "Customer Success Managers bij SaaS Bedrijven",
    description: "Customer success managers bij SaaS bedrijven.",
    industries: ["SaaS", "Technology"],
    job_titles: ["Customer Success Manager", "CSM", "Account Manager"],
    regions: ["Netherlands"],
    candidate_count: 0,
    price: 499,
    seniority: { Junior: 25, Mid: 45, Senior: 25, Lead: 5 },
    sample_profiles: [],
  },
};

// Default nest template for unknown IDs
const getDefaultNest = (id) => ({
  id,
  name: "Talent Nest",
  description: "Coming soon - this nest is being prepared with real candidate data.",
  industries: ["Various"],
  job_titles: ["Professional"],
  regions: ["Netherlands"],
  candidate_count: 0,
  price: 499,
  seniority: { Junior: 25, Mid: 40, Senior: 25, Lead: 10 },
  sample_profiles: [],
});

// ============================================================================
// PURCHASE DIALOG
// ============================================================================
const PurchaseDialog = ({ isOpen, onClose, nest, onPurchase }) => {
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPurchasing(false);
    onPurchase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Purchase Nest</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Get full access to {nest?.candidate_count?.toLocaleString()} candidates
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">Nest</span>
            <span className="text-white">{nest?.name}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">Candidates</span>
            <span className="text-white">{nest?.candidate_count?.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-white font-medium">Total</span>
            <span className="text-2xl font-semibold text-white">€{nest?.price}</span>
          </div>

          <div className="space-y-2 pt-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400" />
              Full access to all profiles
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400" />
              Export to CSV
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400" />
              30-day data freshness
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={purchasing} className="bg-red-500 hover:bg-red-600">
            {purchasing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" />Purchase</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// MAIN PAGE
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
    const timer = setTimeout(() => {
      setNest(NEST_DATA[nestId] || getDefaultNest(nestId));
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [nestId]);

  const handlePurchase = () => {
    setShowPurchaseDialog(false);
    toast.success(`Purchased "${nest.name}"`, {
      description: `${nest.candidate_count.toLocaleString()} candidates now available`,
    });
  };

  if (loading || !nest) {
    return (
      <div className="w-full px-6 lg:px-8 py-6">
        <Skeleton className="h-6 w-32 mb-8" />
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 lg:px-8 py-6">
      {/* Back */}
      <button
        onClick={() => navigate(createPageUrl("TalentNests"))}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Nests
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-semibold text-white mb-3">{nest.name}</h1>
            <p className="text-zinc-400 text-lg leading-relaxed">{nest.description}</p>

            <div className="flex items-center gap-3 mt-4">
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                <MapPin className="w-3 h-3 mr-1" />
                {nest.regions.join(", ")}
              </Badge>
            </div>
          </div>

          {/* Criteria */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Search Criteria</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-500 mb-2">Industries</p>
                <div className="flex flex-wrap gap-2">
                  {nest.industries.map((ind, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-300 text-sm">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-500 mb-2">Job Titles</p>
                <div className="flex flex-wrap gap-2">
                  {nest.job_titles.map((title, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-300 text-sm">
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sample Profiles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Sample Profiles</h2>
              <span className="text-sm text-zinc-500">Preview only</span>
            </div>

            <div className="space-y-3">
              {nest.sample_profiles.map((profile, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm text-zinc-400">
                      {profile.initials}
                    </div>
                    <div>
                      <p className="text-white font-medium">{profile.name}</p>
                      <p className="text-sm text-zinc-500">{profile.title} at {profile.company}</p>
                    </div>
                  </div>
                  <span className="text-red-400 font-medium">{profile.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Purchase Card */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
            <div className="text-center mb-6">
              <p className="text-4xl font-semibold text-white mb-1">
                {nest.candidate_count.toLocaleString()}
              </p>
              <p className="text-zinc-500">candidates</p>
            </div>

            {/* Seniority */}
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">Seniority Distribution</p>
              {Object.entries(nest.seniority).map(([level, pct]) => (
                <div key={level} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">{level}</span>
                    <span className="text-zinc-400">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-red-500/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price & CTA */}
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-red-500/10">
            <div className="text-center mb-6">
              <p className="text-4xl font-semibold text-white">€{nest.price}</p>
              <p className="text-zinc-500 text-sm">one-time payment</p>
            </div>

            <Button
              onClick={() => setShowPurchaseDialog(true)}
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white"
            >
              Purchase Nest
            </Button>

            <p className="text-xs text-zinc-600 text-center mt-4">
              Instant access after purchase
            </p>
          </div>
        </div>
      </div>

      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        nest={nest}
        onPurchase={handlePurchase}
      />
    </div>
  );
}
