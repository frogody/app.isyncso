/**
 * TriggerManager Component
 * Shows active trigger subscriptions, toggle auto-enrichment, and webhook event log
 * Phase 4 - A-5: Composio Auto-Enrichment UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useComposio } from '@/hooks/useComposio';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Radio,
  ToggleRight,
  ToggleLeft,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const ENRICHMENT_TRIGGERS = [
  { slug: 'GMAIL_NEW_GMAIL_MESSAGE', label: 'Gmail - New Email', toolkit: 'gmail' },
  { slug: 'OUTLOOK_MESSAGE_TRIGGER', label: 'Outlook - New Email', toolkit: 'outlook' },
];

export function TriggerManager() {
  const { user } = useUser();
  const composio = useComposio();

  const [subscriptions, setSubscriptions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingSlug, setTogglingSlug] = useState(null);
  const [showEvents, setShowEvents] = useState(false);

  // Load active subscriptions and recent events
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [subsResult, eventsResult] = await Promise.all([
        supabase
          .from('composio_trigger_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('composio_webhook_events')
          .select('id, trigger_slug, processed, processed_at, created_at, error')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setSubscriptions(subsResult.data || []);
      setEvents(eventsResult.data || []);
    } catch (err) {
      console.error('Failed to load trigger data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if a trigger is actively subscribed
  const isSubscribed = (triggerSlug) => {
    return subscriptions.some(
      (s) => s.trigger_slug === triggerSlug && s.status === 'active'
    );
  };

  // Toggle trigger subscription
  const toggleTrigger = async (trigger) => {
    if (!user?.id) return;
    setTogglingSlug(trigger.slug);

    try {
      const existing = subscriptions.find(
        (s) => s.trigger_slug === trigger.slug
      );

      if (existing && existing.status === 'active') {
        // Unsubscribe
        await supabase
          .from('composio_trigger_subscriptions')
          .update({ status: 'inactive' })
          .eq('id', existing.id);

        toast.success(`Disabled ${trigger.label} auto-enrichment`);
      } else {
        // Get the user's connection for this toolkit
        const connection = await composio.getConnection(user.id, trigger.toolkit);
        if (!connection) {
          toast.error(`Connect ${trigger.toolkit} first in the integrations section above`);
          setTogglingSlug(null);
          return;
        }

        // Subscribe to trigger
        const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/composio-webhooks`;
        await composio.subscribeTrigger(
          trigger.slug,
          connection.composio_connected_account_id,
          webhookUrl,
          {},
          user.id
        );

        toast.success(`Enabled ${trigger.label} auto-enrichment`);
      }

      await loadData();
    } catch (err) {
      console.error('Toggle trigger error:', err);
      toast.error(`Failed to toggle: ${err.message}`);
    } finally {
      setTogglingSlug(null);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auto-Enrichment Triggers */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Auto-Enrichment</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Automatically extract contacts and organizations from incoming emails into your semantic graph.
        </p>

        <div className="space-y-3">
          {ENRICHMENT_TRIGGERS.map((trigger) => {
            const subscribed = isSubscribed(trigger.slug);
            const toggling = togglingSlug === trigger.slug;

            return (
              <div
                key={trigger.slug}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{trigger.label}</p>
                    <p className="text-xs text-zinc-500">
                      {subscribed ? 'Active — enriching contacts from emails' : 'Disabled'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleTrigger(trigger)}
                  disabled={toggling}
                  className="flex items-center gap-1.5 transition-colors"
                >
                  {toggling ? (
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  ) : subscribed ? (
                    <ToggleRight className="w-7 h-7 text-cyan-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-zinc-600" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Active Subscriptions Count */}
        {subscriptions.filter((s) => s.status === 'active').length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-cyan-400">
            <Radio className="w-3.5 h-3.5" />
            {subscriptions.filter((s) => s.status === 'active').length} active trigger(s)
          </div>
        )}
      </GlassCard>

      {/* Recent Webhook Events Log */}
      <GlassCard className="p-6">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            <h3 className="text-base font-semibold text-white">Recent Events</h3>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              {events.length}
            </span>
          </div>
          {showEvents ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {showEvents && (
          <div className="mt-4 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No webhook events yet</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-zinc-800/50"
                >
                  {event.processed ? (
                    <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  ) : event.error ? (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">
                      {event.trigger_slug?.replace(/_/g, ' ')}
                    </p>
                    {event.error && (
                      <p className="text-xs text-red-400 truncate">{event.error}</p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {formatTimeAgo(event.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default TriggerManager;
