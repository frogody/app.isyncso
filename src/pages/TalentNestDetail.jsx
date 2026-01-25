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
  Briefcase,
  Check,
  Loader2,
  CreditCard,
  Sparkles,
  Target,
  MessageSquare,
  Brain,
  BarChart3,
  Mail,
  Linkedin,
  Award,
  Lock,
  ArrowRight,
  FileText,
  Rocket,
  Zap,
  TrendingUp,
  Clock,
  Building2,
  Phone,
  ExternalLink,
} from "lucide-react";
import { createPageUrl } from "@/utils";

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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Skeleton className="h-48 mb-6" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-80" />
        </div>
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
    <div className="w-full px-6 lg:px-8 py-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(createPageUrl("TalentNests"))}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Nests
      </button>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Content - 3 columns */}
        <div className="lg:col-span-3 space-y-8">
          {/* Hero Section */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 px-3 py-1">
                {nestType === 'candidates' ? 'Talent Dataset' : nestType === 'prospects' ? 'Sales Dataset' : 'Investor Dataset'}
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 px-3 py-1">
                <MapPin className="w-3 h-3 mr-1" />
                Netherlands
              </Badge>
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">{nest.name}</h1>
            <p className="text-zinc-400 leading-relaxed mb-6">
              {nest.description || `Pre-researched ${nestType} dataset with rich insights, ready for SYNC Intel auto-matching and personalized outreach.`}
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Users className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">{itemCount.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">Total Profiles</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Brain className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">100%</p>
                <p className="text-xs text-zinc-500">SYNC Analyzed</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Target className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">Ready</p>
                <p className="text-xs text-zinc-500">Auto-Match</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <MessageSquare className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">AI</p>
                <p className="text-xs text-zinc-500">Outreach Ready</p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">What's Included</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Brain, title: "SYNC Intel Analysis", desc: "Every profile is analyzed for job satisfaction, recruitment urgency, career trajectory, and openness to opportunities." },
                { icon: Target, title: "Auto-Match to Roles", desc: "Add your open positions and SYNC automatically matches and scores the most relevant candidates." },
                { icon: MessageSquare, title: "Personalized Outreach", desc: "Generate highly personalized messages for each candidate based on their background and motivations." },
                { icon: BarChart3, title: "Deep Insights", desc: "View job satisfaction scores, promotion history, company tenure, and recruitment urgency indicators." },
                { icon: Mail, title: "Contact Details", desc: "Full contact information including email, phone, and LinkedIn profiles for direct outreach." },
                { icon: FileText, title: "Export Anytime", desc: "Export candidate data to CSV or integrate directly with your ATS system." },
              ].map((feature, i) => (
                <div key={i} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                  <feature.icon className="w-6 h-6 text-red-400 mb-3" />
                  <h3 className="font-medium text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Profile Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Sample Profile Preview</h2>
              <Badge variant="outline" className="border-zinc-700 text-zinc-500">
                <Lock className="w-3 h-3 mr-1" />
                Data anonymized
              </Badge>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Header & Stats */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                      <Users className="w-7 h-7 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-32 bg-zinc-700 rounded blur-[2px]" />
                        <div className="h-5 w-24 bg-zinc-700 rounded blur-[2px]" />
                      </div>
                      <p className="text-zinc-400 mt-1">Senior Software Engineer at Tech Company</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          Medium Satisfaction
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                          High Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Years at Company", value: "2.5" },
                      { label: "Promotions", value: "1" },
                      { label: "Company Changes", value: "3" },
                      { label: "Salary Range", value: "€75-90k", highlight: true },
                    ].map((stat, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                        <p className={`text-lg font-semibold ${stat.highlight ? 'text-red-400' : 'text-white'}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Assessment */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-white">Recruitment Assessment</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      This candidate shows signs of being open to new opportunities. They've been in their current role for 2.5 years without significant growth, and their LinkedIn activity suggests active market exploration. High priority for outreach.
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2">
                    {["Python", "React", "AWS", "PostgreSQL", "Docker", "Kubernetes", "TypeScript", "GraphQL"].map((skill, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-400 text-sm border border-white/[0.05]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right Column - Contact & Outreach */}
                <div className="space-y-4">
                  {/* Contact Info */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-sm font-medium text-white mb-3">Contact Information</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-zinc-500" />
                        <div className="h-4 w-full bg-zinc-700 rounded blur-[3px]" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-zinc-500" />
                        <div className="h-4 w-24 bg-zinc-700 rounded blur-[3px]" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Linkedin className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-red-400 blur-[2px]">linkedin.com/in/████████</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-zinc-400">Amsterdam, NL</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Outreach Preview */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-white">AI-Generated Outreach</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed italic">
                      "Hi [Name], I noticed you've been building impressive data pipelines at Tech Company. We're scaling our engineering team and your experience with AWS and Python would be perfect for our Senior Engineer role..."
                    </p>
                  </div>

                  {/* Lock Notice */}
                  <div className="flex items-center justify-center gap-2 py-3">
                    <Lock className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-zinc-500">Purchase to unlock full data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { step: 1, icon: CreditCard, title: "Purchase Nest", desc: "Get instant access to all profiles" },
                { step: 2, icon: Briefcase, title: "Add Your Roles", desc: "Define your open positions" },
                { step: 3, icon: Sparkles, title: "SYNC Matches", desc: "AI matches & scores candidates" },
                { step: 4, icon: Rocket, title: "Reach Out", desc: "Send personalized messages" },
              ].map((item, i) => (
                <div key={i} className="relative p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                    {item.step}
                  </div>
                  <item.icon className="w-6 h-6 text-zinc-500 mb-3" />
                  <h3 className="font-medium text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-zinc-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Purchase Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Price Card */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-center mb-5">
                <p className="text-4xl font-bold text-white">€{price.toFixed(0)}</p>
                <p className="text-sm text-zinc-500 mt-1">one-time payment</p>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  `${itemCount.toLocaleString()} candidate profiles`,
                  "SYNC Intel auto-matching",
                  "AI personalized outreach",
                  "Full contact details",
                  "Export to CSV",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowPurchaseDialog(true)}
                className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium"
              >
                Purchase Nest
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-zinc-600 text-center mt-3">
                Instant access after purchase
              </p>
            </div>

            {/* Trust Badges */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Verified Data</p>
                    <p className="text-xs text-zinc-500">Updated within 30 days</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Instant Access</p>
                    <p className="text-xs text-zinc-500">Available immediately</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">SYNC Intel</p>
                    <p className="text-xs text-zinc-500">AI-powered insights</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Purchase CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur-lg border-t border-white/[0.08] z-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-white">€{price.toFixed(0)}</p>
            <p className="text-xs text-zinc-500">{itemCount.toLocaleString()} profiles</p>
          </div>
          <Button
            onClick={() => setShowPurchaseDialog(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-6"
          >
            Purchase Nest
          </Button>
        </div>
      </div>

      {/* Spacer for mobile fixed CTA */}
      <div className="lg:hidden h-20" />

      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        nest={nest}
        onPurchase={handlePurchase}
      />
    </div>
  );
}
