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
// NEST DATA
// ============================================================================
const NEST_DATA = {
  "nest-1": {
    id: "nest-1",
    name: "Software Development",
    description: "Developers and engineers across all stacks and seniority levels. Frontend, backend, fullstack, DevOps, and specialized roles from startups to enterprises.",
    industries: ["Technology", "Software", "IT Services"],
    job_titles: ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "DevOps Engineer"],
    regions: ["Netherlands"],
    candidate_count: 37639,
    price: 599,
    seniority: { Junior: 20, Mid: 45, Senior: 30, Lead: 5 },
    sample_profiles: [
      { initials: "JV", name: "Jan V.", title: "Senior Engineer", company: "Booking.com", score: 78 },
      { initials: "LM", name: "Lisa M.", title: "Tech Lead", company: "Adyen", score: 85 },
      { initials: "TB", name: "Tom B.", title: "DevOps Engineer", company: "ING", score: 62 },
      { initials: "EK", name: "Eva K.", title: "Frontend Dev", company: "Coolblue", score: 71 },
    ],
  },
  "nest-2": {
    id: "nest-2",
    name: "Accountancy",
    description: "Accounting & finance professionals in NL. From bookkeepers to senior accountants and financial controllers.",
    industries: ["Accounting", "Finance", "Professional Services"],
    job_titles: ["Accountant", "Senior Accountant", "Financial Controller", "Tax Advisor"],
    regions: ["Netherlands"],
    candidate_count: 36418,
    price: 499,
    seniority: { Junior: 25, Mid: 40, Senior: 25, Lead: 10 },
    sample_profiles: [
      { initials: "KV", name: "Karin V.", title: "Senior Accountant", company: "Deloitte", score: 81 },
      { initials: "RB", name: "Robert B.", title: "Tax Advisor", company: "EY", score: 67 },
      { initials: "MJ", name: "Marieke J.", title: "Controller", company: "Philips", score: 92 },
    ],
  },
};

// Default nest template
const getDefaultNest = (id) => ({
  id,
  name: "Talent Nest",
  description: "A curated collection of qualified professionals ready for your recruitment needs.",
  industries: ["Various"],
  job_titles: ["Professional"],
  regions: ["Netherlands"],
  candidate_count: 10000,
  price: 499,
  seniority: { Junior: 25, Mid: 40, Senior: 25, Lead: 10 },
  sample_profiles: [
    { initials: "JD", name: "John D.", title: "Professional", company: "Company", score: 65 },
  ],
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
