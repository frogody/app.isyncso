import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import ChannelConnectionStatus from "./ChannelConnectionStatus";
import {
  Loader2,
  Play,
  Sparkles,
  Send,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Linkedin,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://sfxpmzicgpaxfntqleig.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const CHANNEL_LIMITS = {
  linkedin: { label: "LinkedIn", icon: Linkedin, defaultLimit: 25 },
  email: { label: "Email", icon: Mail, defaultLimit: 200 },
  sms: { label: "SMS", icon: Phone, defaultLimit: 100 },
};

export default function AutomationPanel({ campaign }) {
  const { user } = useUser();
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [autoApproveFollowups, setAutoApproveFollowups] = useState(false);
  const [rateLimits, setRateLimits] = useState([]);
  const [executionLog, setExecutionLog] = useState([]);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingLog, setLoadingLog] = useState(true);

  // Load state from campaign automation_config
  useEffect(() => {
    if (campaign?.automation_config) {
      setAutomationEnabled(campaign.automation_config.enabled || false);
      setAutoApproveFollowups(campaign.automation_config.auto_approve_followups || false);
    }
  }, [campaign?.automation_config]);

  // Fetch rate limits and execution log
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Rate limits
      const { data: limits } = await supabase.rpc("get_rate_limit_status", {
        p_user_id: user.id,
      });
      setRateLimits(limits || []);
    } catch {
      // Ignore if RPC doesn't exist yet
    }

    try {
      // Execution log
      const { data: log } = await supabase
        .from("outreach_execution_log")
        .select("*")
        .eq("organization_id", campaign?.organization_id)
        .order("created_at", { ascending: false })
        .limit(20);
      setExecutionLog(log || []);
    } catch {
      // Ignore if table doesn't exist yet
    } finally {
      setLoadingLog(false);
    }
  }, [user?.id, campaign?.organization_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update automation config
  const updateConfig = async (field, value) => {
    if (!campaign?.id) return;

    const newConfig = {
      ...(campaign.automation_config || {}),
      [field]: value,
    };

    const { error } = await supabase
      .from("campaigns")
      .update({ automation_config: newConfig })
      .eq("id", campaign.id);

    if (error) {
      toast.error("Failed to update automation config");
      return;
    }

    toast.success(`Automation ${field === "enabled" ? (value ? "enabled" : "disabled") : "updated"}`);
  };

  const handleToggleAutomation = async (checked) => {
    setAutomationEnabled(checked);
    await updateConfig("enabled", checked);
  };

  const handleToggleAutoApprove = async (checked) => {
    setAutoApproveFollowups(checked);
    await updateConfig("auto_approve_followups", checked);
  };

  // Trigger send approved
  const handleSendApproved = async () => {
    if (!user?.id) return;
    setSending(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/executeTalentOutreach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          campaign_id: campaign?.id,
        }),
      });

      const result = await res.json();

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Sent: ${result.sent}, Failed: ${result.failed}, Rate-limited: ${result.skipped_rate_limit}`
        );
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to send outreach: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Trigger generate messages
  const handleGenerateMessages = async () => {
    if (!user?.id || !campaign?.id) return;
    setGenerating(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: `Generate outreach messages for all ungenerated matches in campaign ${campaign.id}`,
          context: {
            userId: user.id,
            companyId: user.organization_id,
          },
          action: {
            action: "talent_generate_messages",
            data: { campaign_id: campaign.id },
          },
        }),
      });

      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Message generation started");
      }
    } catch (err) {
      toast.error("Failed to generate messages: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case "failed":
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case "skipped_rate_limit":
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case "skipped_no_connection":
        return <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const channelIcon = (channel) => {
    switch (channel) {
      case "linkedin":
        return <Linkedin className="w-3.5 h-3.5" />;
      case "email":
        return <Mail className="w-3.5 h-3.5" />;
      case "sms":
        return <Phone className="w-3.5 h-3.5" />;
      default:
        return <Send className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Automation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Toggle */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-semibold text-white">Automation</h3>
            </div>
            <Switch
              checked={automationEnabled}
              onCheckedChange={handleToggleAutomation}
            />
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            When enabled, follow-ups are automatically scheduled and sent based on your sequence timing.
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Auto-approve follow-ups</span>
            </div>
            <Switch
              checked={autoApproveFollowups}
              onCheckedChange={handleToggleAutoApprove}
              disabled={!automationEnabled}
            />
          </div>
        </GlassCard>

        {/* Channel Connections */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Channels</h3>
          </div>
          <ChannelConnectionStatus />
        </GlassCard>
      </div>

      {/* Rate Limits */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Daily Rate Limits</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchData}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(CHANNEL_LIMITS).map(([channel, config]) => {
            const limit = rateLimits.find((r) => r.channel === channel);
            const sent = limit?.send_count || 0;
            const max = limit?.daily_limit || config.defaultLimit;
            const pct = Math.min((sent / max) * 100, 100);
            const Icon = config.icon;

            return (
              <div key={channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-400">{config.label}</span>
                  </div>
                  <span className="text-xs font-medium text-white">
                    {sent}/{max}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGenerateMessages}
          disabled={generating}
          className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate All Messages
        </Button>
        <Button
          onClick={handleSendApproved}
          disabled={sending}
          className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Send Approved Now
        </Button>
      </div>

      {/* Execution Log */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-semibold text-white">Execution Log</h3>
          <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
            Last 20
          </Badge>
        </div>

        {loadingLog ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : executionLog.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No execution history yet. Send some outreach to see results here.
          </div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {executionLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
              >
                {statusIcon(entry.status)}
                {channelIcon(entry.channel)}
                <span className="text-xs text-zinc-300 flex-1 truncate">
                  {entry.task_id?.slice(0, 8)}...
                </span>
                <span className="text-xs text-zinc-500">
                  {entry.action}
                </span>
                {entry.error && (
                  <span className="text-xs text-red-400 truncate max-w-[200px]" title={entry.error}>
                    {entry.error}
                  </span>
                )}
                <span className="text-xs text-zinc-600 whitespace-nowrap">
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
