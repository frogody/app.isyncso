import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Calendar,
  Target,
  Image,
  Video,
  Type,
  Layers,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Globe,
  Search as SearchIcon,
  Music2,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PLATFORMS,
  CAMPAIGN_STATUSES,
  AD_TYPES,
  CAMPAIGN_GOALS,
} from "@/lib/reach-constants";

const PLATFORM_ICONS = {
  Instagram: Instagram,
  Facebook: Facebook,
  Linkedin: Linkedin,
  Youtube: Youtube,
  Globe: Globe,
  Search: SearchIcon,
  Music2: Music2,
};

const STATUS_STYLES = {
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  active: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  completed: "border-green-500/30 bg-green-500/10 text-green-400",
};

const AD_TYPE_ICONS = {
  single_image: Image,
  carousel: Layers,
  video: Video,
  story_reel: Video,
  text_image: Type,
};

function StatusFilterPills({ value, onChange }) {
  const statuses = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
      {statuses.map((s) => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            value === s.key
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function CampaignCard({ campaign, onClick }) {
  const status = CAMPAIGN_STATUSES[campaign.status] || CAMPAIGN_STATUSES.draft;
  const adType = AD_TYPES.find((t) => t.value === campaign.ad_type);
  const goal = CAMPAIGN_GOALS.find((g) => g.value === campaign.campaign_goal);
  const AdTypeIcon = AD_TYPE_ICONS[campaign.ad_type] || Image;

  const platformKeys = campaign.platforms || [];
  const uniquePlatformIcons = [];
  const seenIcons = new Set();
  for (const key of platformKeys) {
    const plat = PLATFORMS[key];
    if (plat && !seenIcons.has(plat.icon)) {
      seenIcons.add(plat.icon);
      uniquePlatformIcons.push({ icon: plat.icon, name: plat.name });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-cyan-500/30 hover:bg-zinc-900/80 transition-all duration-300 overflow-hidden"
    >
      <div className="p-5 space-y-4">
        {/* Header: name + status */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-white truncate group-hover:text-cyan-50 transition-colors">
            {campaign.name || "Untitled Campaign"}
          </h3>
          <span
            className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              STATUS_STYLES[campaign.status] || STATUS_STYLES.draft
            }`}
          >
            {status.label}
          </span>
        </div>

        {/* Product */}
        {campaign.product_name && (
          <p className="text-sm text-zinc-400 truncate">
            {campaign.product_name}
          </p>
        )}

        {/* Platform icons row */}
        {uniquePlatformIcons.length > 0 && (
          <div className="flex items-center gap-2">
            {uniquePlatformIcons.map(({ icon, name }) => {
              const IconComp = PLATFORM_ICONS[icon];
              return IconComp ? (
                <div
                  key={icon}
                  className="p-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40"
                  title={name}
                >
                  <IconComp className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {adType && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <AdTypeIcon className="w-3.5 h-3.5" />
              <span>{adType.label}</span>
            </div>
          )}
          {goal && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Target className="w-3.5 h-3.5" />
              <span>{goal.label}</span>
            </div>
          )}
        </div>

        {/* Footer: date */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(campaign.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ReachCampaigns() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user?.company_id) return;
    fetchCampaigns();
  }, [user?.company_id]);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reach_campaigns")
        .select("*, products:product_id(name)")
        .eq("company_id", user.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((c) => ({
        ...c,
        product_name: c.products?.name || null,
      }));
      setCampaigns(mapped);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (statusFilter === "all") return campaigns;
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Megaphone className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Ad Campaigns</h1>
            <p className="text-sm text-zinc-400">
              Create and manage ad campaigns across platforms
            </p>
          </div>
        </div>
        <Button
          variant="glow"
          onClick={() => navigate(createPageUrl("ReachCampaignBuilder"))}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <StatusFilterPills value={statusFilter} onChange={setStatusFilter} />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border border-zinc-800 bg-zinc-900/50"
        >
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
              <Megaphone className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-lg font-medium">
              {statusFilter === "all"
                ? "No campaigns yet"
                : `No ${statusFilter} campaigns`}
            </p>
            <p className="text-zinc-500 text-sm max-w-sm">
              Create your first ad campaign to start generating content for your
              products across all platforms.
            </p>
            {statusFilter === "all" && (
              <Button
                variant="glow"
                className="mt-4 gap-2"
                onClick={() =>
                  navigate(createPageUrl("ReachCampaignBuilder"))
                }
              >
                <Plus className="w-4 h-4" />
                Create your first campaign
              </Button>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() =>
                  navigate(
                    createPageUrl(
                      `ReachCampaignDetail?id=${campaign.id}`
                    )
                  )
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
