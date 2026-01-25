import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
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
  Sparkles,
  Target,
  MessageSquare,
  Brain,
  Zap,
  TrendingUp,
  Clock,
  Shield,
  BarChart3,
  Mail,
  Linkedin,
  Award,
  Eye,
  Lock,
  ArrowRight,
  ChevronRight,
  Smile,
  AlertTriangle,
  Calendar,
  FileText,
  Rocket,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// ============================================================================
// ANONYMIZED PREVIEW CARD - Shows data structure without real info
// ============================================================================
const AnonymizedProfileCard = ({ index }) => {
  const blurredNames = ["████████ ██████", "███████ ████████", "██████ █████████", "████████████ ███", "███████ ██████████"];
  const roles = ["Senior Professional", "Lead Specialist", "Manager", "Director", "Consultant"];
  const companies = ["Tech Company", "Enterprise Corp", "Growth Startup", "Global Firm", "Scale-up"];
  const satisfactions = ["High", "Medium", "Low"];
  const urgencies = ["High Priority", "Medium Priority", "Response Priority"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative p-5 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-white/[0.08] overflow-hidden group"
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-zinc-900/90 to-transparent z-10 flex items-end justify-center pb-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
          <Lock className="w-4 h-4 text-red-400" />
          <span className="text-sm text-white/80">Purchase to unlock</span>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20">
          <Users className="w-7 h-7 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium blur-[3px]">{blurredNames[index % 5]}</p>
          <p className="text-sm text-zinc-400 mt-0.5">{roles[index % 5]} at {companies[index % 5]}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className={`text-xs px-2 py-1 rounded-full ${
              satisfactions[index % 3] === "High" ? "bg-amber-500/20 text-amber-400" :
              satisfactions[index % 3] === "Medium" ? "bg-blue-500/20 text-blue-400" :
              "bg-green-500/20 text-green-400"
            }`}>
              {satisfactions[index % 3]} Satisfaction
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              urgencies[index % 3] === "High Priority" ? "bg-red-500/20 text-red-400" :
              "bg-zinc-500/20 text-zinc-400"
            }`}>
              {urgencies[index % 3]}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// FEATURE CARD - Explains what buyers get
// ============================================================================
const FeatureCard = ({ icon: Icon, title, description, highlight }) => (
  <motion.div
    variants={fadeIn}
    className={`p-6 rounded-2xl border transition-all ${
      highlight
        ? "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20"
        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
    }`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
      highlight ? "bg-red-500/20" : "bg-white/[0.05]"
    }`}>
      <Icon className={`w-6 h-6 ${highlight ? "text-red-400" : "text-zinc-400"}`} />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
  </motion.div>
);

// ============================================================================
// STAT PILL - Quick stat display
// ============================================================================
const StatPill = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
    <Icon className="w-5 h-5 text-red-400" />
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  </div>
);

// ============================================================================
// PURCHASE DIALOG
// ============================================================================
const PurchaseDialog = ({ isOpen, onClose, nest, onPurchase }) => {
  const [purchasing, setPurchasing] = useState(false);
  const itemCount = nest?.item_count || 0;
  const price = parseFloat(nest?.price) || 0;

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
            Unlock full access to {itemCount.toLocaleString()} candidate profiles
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">Nest</span>
            <span className="text-white">{nest?.name}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <span className="text-zinc-400">Candidates</span>
            <span className="text-white">{itemCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-white font-medium">Total</span>
            <span className="text-2xl font-semibold text-white">€{price.toFixed(0)}</span>
          </div>

          <div className="space-y-3 pt-4">
            <p className="text-sm text-zinc-400 font-medium">What's included:</p>
            {[
              "Full profile access with contact details",
              "SYNC Intel auto-matching to your roles",
              "AI-generated personalized outreach",
              "Job satisfaction & urgency insights",
              "Export to CSV anytime",
              "30-day data freshness guarantee",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                {item}
              </div>
            ))}
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
              <><CreditCard className="w-4 h-4 mr-2" />Purchase for €{price.toFixed(0)}</>
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

  const nestId = searchParams.get("id");

  // Fetch nest from database
  useEffect(() => {
    async function fetchNest() {
      if (!nestId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('nests')
          .select('*')
          .eq('id', nestId)
          .single();

        if (error) {
          console.error('Error fetching nest:', error);
          toast.error('Failed to load nest');
        } else {
          setNest(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNest();
  }, [nestId]);

  const handlePurchase = () => {
    setShowPurchaseDialog(false);
    toast.success(`Purchased "${nest.name}"`, {
      description: `${(nest.item_count || 0).toLocaleString()} candidates now available`,
    });
  };

  if (loading) {
    return (
      <div className="w-full px-6 lg:px-8 py-6">
        <Skeleton className="h-6 w-32 mb-8" />
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!nest) {
    return (
      <div className="w-full px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate(createPageUrl("TalentNests"))}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Nests
        </button>
        <div className="text-center py-20">
          <p className="text-zinc-400">Nest not found</p>
        </div>
      </div>
    );
  }

  const itemCount = nest.item_count || 0;
  const price = parseFloat(nest.price) || 0;
  const nestType = nest.nest_type || 'candidates';

  return (
    <div className="w-full px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(createPageUrl("TalentNests"))}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Nests
      </button>

      {/* Hero Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mb-12"
      >
        <motion.div variants={fadeIn} className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                {nestType === 'candidates' ? 'Talent Dataset' : nestType === 'prospects' ? 'Sales Dataset' : 'Investor Dataset'}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                <MapPin className="w-3 h-3 mr-1" />
                Netherlands
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">{nest.name}</h1>
            <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
              {nest.description || `Pre-researched ${nestType} dataset with rich insights, ready for SYNC Intel auto-matching and personalized outreach.`}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mt-6">
              <StatPill icon={Users} label="Profiles" value={itemCount.toLocaleString()} />
              <StatPill icon={Brain} label="SYNC Intel" value="Enabled" />
              <StatPill icon={Target} label="Auto-Match" value="Ready" />
            </div>
          </div>

          {/* Purchase Card - Desktop */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-6 p-6 rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 border border-white/[0.08]">
              <div className="text-center mb-6">
                <p className="text-5xl font-bold text-white">€{price.toFixed(0)}</p>
                <p className="text-zinc-500 text-sm mt-1">one-time payment</p>
              </div>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Check className="w-4 h-4 text-red-400" />
                  {itemCount.toLocaleString()} candidate profiles
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Check className="w-4 h-4 text-red-400" />
                  SYNC Intel auto-matching
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Check className="w-4 h-4 text-red-400" />
                  AI personalized outreach
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Check className="w-4 h-4 text-red-400" />
                  Export to CSV
                </div>
              </div>

              <Button
                onClick={() => setShowPurchaseDialog(true)}
                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-medium"
              >
                Purchase Nest
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-zinc-600 text-center mt-4">
                Instant access after purchase
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* What You Get Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mb-12"
      >
        <motion.h2 variants={fadeIn} className="text-2xl font-semibold text-white mb-6">
          What's Included
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={Brain}
            title="SYNC Intel Research"
            description="Every candidate is automatically analyzed by SYNC Intel to surface job satisfaction, recruitment urgency, career trajectory, and more."
            highlight
          />
          <FeatureCard
            icon={Target}
            title="Auto-Match to Your Roles"
            description="Add your open positions and SYNC automatically matches the most relevant candidates, scoring them by fit and likelihood to respond."
          />
          <FeatureCard
            icon={MessageSquare}
            title="Personalized Outreach"
            description="Generate highly personalized outreach messages for each candidate based on their background, motivations, and your role requirements."
          />
          <FeatureCard
            icon={BarChart3}
            title="Deep Profile Insights"
            description="View detailed analytics including job satisfaction scores, promotion history, company tenure, and recruitment urgency indicators."
          />
          <FeatureCard
            icon={Mail}
            title="Contact Information"
            description="Full contact details including email, phone, and LinkedIn profiles to reach candidates directly through your preferred channel."
          />
          <FeatureCard
            icon={FileText}
            title="Export & Integrate"
            description="Export your candidate data to CSV or integrate directly with your ATS. All data is yours to use as you need."
          />
        </div>
      </motion.div>

      {/* Preview Profiles Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mb-12"
      >
        <motion.div variants={fadeIn} className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Profile Preview</h2>
            <p className="text-zinc-500 mt-1">Sample of what each profile contains (data anonymized)</p>
          </div>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
            <Eye className="w-3 h-3 mr-1" />
            Preview Only
          </Badge>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <AnonymizedProfileCard key={i} index={i} />
          ))}
        </div>
      </motion.div>

      {/* How It Works Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mb-12"
      >
        <motion.h2 variants={fadeIn} className="text-2xl font-semibold text-white mb-6">
          How It Works
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: 1, title: "Purchase Nest", description: "Get instant access to all candidate profiles in this dataset", icon: CreditCard },
            { step: 2, title: "Add Your Roles", description: "Create your open positions with requirements and preferences", icon: Briefcase },
            { step: 3, title: "SYNC Matches", description: "SYNC Intel automatically matches and scores candidates for each role", icon: Sparkles },
            { step: 4, title: "Reach Out", description: "Send AI-generated personalized messages to top matches", icon: Rocket },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={fadeIn}
              className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                {item.step}
              </div>
              <item.icon className="w-8 h-8 text-zinc-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400">{item.description}</p>
              {i < 3 && (
                <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-700" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Sample Profile Deep Dive */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mb-12"
      >
        <motion.h2 variants={fadeIn} className="text-2xl font-semibold text-white mb-6">
          What a Full Profile Looks Like
        </motion.h2>

        <motion.div
          variants={fadeIn}
          className="p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Profile Overview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20">
                  <Users className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">████████ ██████</p>
                  <p className="text-zinc-400">Senior Software Engineer at Tech Company</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/20">Medium Satisfaction</Badge>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/20">High Priority</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 mb-1">Years at Company</p>
                  <p className="text-lg font-semibold text-white">2.5</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 mb-1">Promotions</p>
                  <p className="text-lg font-semibold text-white">1</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 mb-1">Company Changes</p>
                  <p className="text-lg font-semibold text-white">3</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-xs text-zinc-500 mb-1">Salary Range</p>
                  <p className="text-lg font-semibold text-red-400">€75-90k</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-400" />
                  Recruitment Assessment
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  This candidate shows signs of being open to new opportunities. They've been in their current role for 2.5 years without significant growth, and their LinkedIn activity suggests they're exploring the market. High priority for outreach.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-400" />
                  Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {["Python", "React", "AWS", "PostgreSQL", "Docker", "Kubernetes"].map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Contact & Actions */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h4 className="text-sm font-medium text-white mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400 blur-[4px]">████@████.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-red-400">linkedin.com/in/████</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Amsterdam, NL</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-400" />
                  AI-Generated Outreach
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  "Hi ████, I noticed you've been building impressive data pipelines at Tech Company. We're scaling our engineering team and I think your experience with AWS and Python would be a great fit for our Senior Engineer role..."
                </p>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
                  <Lock className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-white/80">Purchase to unlock all data</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Mobile Purchase CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-lg border-t border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-white">€{price.toFixed(0)}</p>
            <p className="text-xs text-zinc-500">{itemCount.toLocaleString()} profiles</p>
          </div>
          <Button
            onClick={() => setShowPurchaseDialog(true)}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Purchase Nest
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Spacer for mobile fixed CTA */}
      <div className="lg:hidden h-24" />

      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        nest={nest}
        onPurchase={handlePurchase}
      />
    </div>
  );
}
