/**
 * useCalendarSync - Google Calendar sync via Composio
 *
 * Provides bidirectional sync between the local calendar_events table
 * and Google Calendar using the Composio integration layer.
 *
 * Features:
 * - Connection check (isConnected)
 * - Pull from Google Calendar (syncFromGoogle)
 * - Push to Google Calendar (syncToGoogle)
 * - Auto-sync with configurable interval (startAutoSync / stopAutoSync)
 * - Deduplication via metadata.google_event_id
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useComposio } from '@/hooks/useComposio';
import { toast } from 'sonner';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const GOOGLE_TOOLKIT = 'googlecalendar';
const OUTLOOK_TOOLKIT = 'outlookcalendar';

export function useCalendarSync(userId, companyId) {
  const composio = useComposio();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState(null);
  const [connectionLoading, setConnectionLoading] = useState(true);
  // Outlook state
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [outlookConnection, setOutlookConnection] = useState(null);
  // Track which provider is active
  const [activeProvider, setActiveProvider] = useState(null); // 'google' | 'outlook' | null

  const intervalRef = useRef(null);

  // Check for active calendar connections (Google + Outlook)
  const checkConnection = useCallback(async () => {
    if (!userId) {
      setIsConnected(false);
      setConnection(null);
      setIsOutlookConnected(false);
      setOutlookConnection(null);
      setActiveProvider(null);
      setConnectionLoading(false);
      return;
    }

    setConnectionLoading(true);
    try {
      // Check both providers in parallel
      const [googleConn, outlookConn] = await Promise.allSettled([
        composio.getConnection(userId, GOOGLE_TOOLKIT),
        composio.getConnection(userId, OUTLOOK_TOOLKIT),
      ]);

      const gConn = googleConn.status === 'fulfilled' ? googleConn.value : null;
      const oConn = outlookConn.status === 'fulfilled' ? outlookConn.value : null;

      const googleActive = gConn && gConn.status === 'ACTIVE';
      const outlookActive = oConn && oConn.status === 'ACTIVE';

      setIsConnected(googleActive);
      setConnection(googleActive ? gConn : null);
      setIsOutlookConnected(outlookActive);
      setOutlookConnection(outlookActive ? oConn : null);

      // Set active provider (prefer the one already active, default to google)
      if (googleActive && !outlookActive) setActiveProvider('google');
      else if (outlookActive && !googleActive) setActiveProvider('outlook');
      else if (googleActive && outlookActive) setActiveProvider(activeProvider || 'google');
      else setActiveProvider(null);
    } catch (err) {
      console.error('[useCalendarSync] Connection check failed:', err);
      setIsConnected(false);
      setConnection(null);
      setIsOutlookConnected(false);
      setOutlookConnection(null);
      setActiveProvider(null);
    } finally {
      setConnectionLoading(false);
    }
  }, [userId, composio, activeProvider]);

  // Check connection on mount and when userId changes
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  /**
   * Initiate the Composio OAuth flow for Google Calendar.
   */
  const connectGoogleCalendar = useCallback(async () => {
    if (!userId) return;

    try {
      const configs = await composio.getAuthConfigs(GOOGLE_TOOLKIT);
      if (!configs || configs.length === 0) {
        toast.error('No Google Calendar auth config found');
        return;
      }

      const result = await composio.connect(userId, configs[0].id, {
        popup: true,
        toolkitSlug: GOOGLE_TOOLKIT,
      });

      if (result?.connectedAccountId) {
        toast.info('Completing Google Calendar connection...');
        await composio.waitForConnection(result.connectedAccountId, userId);
        toast.success('Google Calendar connected!');
        await checkConnection();
      }
    } catch (err) {
      console.error('[useCalendarSync] Google connect failed:', err);
      toast.error(`Failed to connect: ${err.message}`);
    }
  }, [userId, composio, checkConnection]);

  /**
   * Initiate the Composio OAuth flow for Outlook Calendar.
   */
  const connectOutlookCalendar = useCallback(async () => {
    if (!userId) return;

    try {
      const configs = await composio.getAuthConfigs(OUTLOOK_TOOLKIT);
      if (!configs || configs.length === 0) {
        toast.error('No Outlook Calendar auth config found');
        return;
      }

      const result = await composio.connect(userId, configs[0].id, {
        popup: true,
        toolkitSlug: OUTLOOK_TOOLKIT,
      });

      if (result?.connectedAccountId) {
        toast.info('Completing Outlook Calendar connection...');
        await composio.waitForConnection(result.connectedAccountId, userId);
        toast.success('Outlook Calendar connected!');
        await checkConnection();
      }
    } catch (err) {
      console.error('[useCalendarSync] Outlook connect failed:', err);
      toast.error(`Failed to connect Outlook: ${err.message}`);
    }
  }, [userId, composio, checkConnection]);

  /**
   * Fetch events from Google Calendar and upsert into calendar_events.
   * Deduplicates by checking metadata->>'google_event_id'.
   */
  const syncFromGoogle = useCallback(async () => {
    if (!userId || !companyId || !connection) {
      toast.error('Not connected to Google Calendar');
      return;
    }

    setIsSyncing(true);
    try {
      // Fetch events from Google Calendar via Composio
      const result = await composio.executeTool('GOOGLECALENDAR_FIND_EVENT', {
        connectedAccountId: connection.composio_connected_account_id,
        arguments: {
          // Fetch events in a reasonable window: 30 days back, 90 days forward
          time_min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          time_max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          max_results: 250,
        },
      });

      // Normalize: Composio returns various shapes; extract the events array
      const events = Array.isArray(result)
        ? result
        : result?.events || result?.items || result?.data?.events || result?.data?.items || [];

      if (!Array.isArray(events)) {
        console.warn('[useCalendarSync] Unexpected response shape:', result);
        toast.info('No events found in Google Calendar');
        setLastSyncAt(new Date());
        return;
      }

      let upserted = 0;
      let skipped = 0;

      for (const gEvent of events) {
        const googleEventId = gEvent.id || gEvent.event_id || gEvent.eventId;
        if (!googleEventId) continue;

        // Check if this event already exists locally
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('company_id', companyId)
          .filter('metadata->>google_event_id', 'eq', googleEventId)
          .maybeSingle();

        // Parse start/end times from Google Calendar event format
        const startTime = gEvent.start?.dateTime || gEvent.start?.date || gEvent.start_datetime || gEvent.start_time || gEvent.start;
        const endTime = gEvent.end?.dateTime || gEvent.end?.date || gEvent.end_datetime || gEvent.end_time || gEvent.end;
        const isAllDay = !!(gEvent.start?.date && !gEvent.start?.dateTime);
        const title = gEvent.summary || gEvent.title || 'Untitled Event';
        const description = gEvent.description || null;
        const location = gEvent.location || null;

        if (!startTime) continue;

        const eventData = {
          company_id: companyId,
          created_by: userId,
          title,
          description,
          event_type: 'external',
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          all_day: isAllDay,
          location,
          color: '#f97316', // External event color (orange)
          status: gEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
          metadata: {
            source: 'google_calendar',
            google_event_id: googleEventId,
            google_calendar_id: gEvent.calendarId || 'primary',
            google_html_link: gEvent.htmlLink || null,
            google_hangout_link: gEvent.hangoutLink || null,
            synced_at: new Date().toISOString(),
          },
        };

        if (existing) {
          // Update existing event
          await supabase
            .from('calendar_events')
            .update({
              ...eventData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          skipped++;
        } else {
          // Insert new event
          await supabase
            .from('calendar_events')
            .insert(eventData);
          upserted++;
        }
      }

      setLastSyncAt(new Date());
      toast.success(`Synced ${upserted} new, ${skipped} updated from Google Calendar`);
    } catch (err) {
      console.error('[useCalendarSync] Sync from Google failed:', err);
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, companyId, connection, composio]);

  /**
   * Fetch events from Outlook Calendar and upsert into calendar_events.
   */
  const syncFromOutlook = useCallback(async () => {
    if (!userId || !companyId || !outlookConnection) {
      toast.error('Not connected to Outlook Calendar');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await composio.executeTool('OUTLOOKCALENDAR_LIST_CALENDAR_EVENTS', {
        connectedAccountId: outlookConnection.composio_connected_account_id,
        arguments: {
          start_date_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date_time: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      const events = Array.isArray(result)
        ? result
        : result?.value || result?.events || result?.data?.value || [];

      if (!Array.isArray(events)) {
        toast.info('No events found in Outlook Calendar');
        setLastSyncAt(new Date());
        return;
      }

      let upserted = 0;
      let skipped = 0;

      for (const oEvent of events) {
        const outlookEventId = oEvent.id || oEvent.iCalUId;
        if (!outlookEventId) continue;

        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('company_id', companyId)
          .filter('metadata->>outlook_event_id', 'eq', outlookEventId)
          .maybeSingle();

        const startTime = oEvent.start?.dateTime || oEvent.startDateTime || oEvent.start;
        const endTime = oEvent.end?.dateTime || oEvent.endDateTime || oEvent.end;
        const isAllDay = oEvent.isAllDay || false;
        const title = oEvent.subject || oEvent.title || 'Untitled Event';

        if (!startTime) continue;

        const eventData = {
          company_id: companyId,
          created_by: userId,
          title,
          description: oEvent.bodyPreview || oEvent.body?.content || null,
          event_type: 'external',
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          all_day: isAllDay,
          location: oEvent.location?.displayName || oEvent.location || null,
          color: '#3b82f6', // Outlook = blue
          status: oEvent.isCancelled ? 'cancelled' : 'confirmed',
          metadata: {
            source: 'outlook_calendar',
            outlook_event_id: outlookEventId,
            outlook_web_link: oEvent.webLink || null,
            outlook_teams_link: oEvent.onlineMeeting?.joinUrl || null,
            synced_at: new Date().toISOString(),
          },
        };

        if (existing) {
          await supabase
            .from('calendar_events')
            .update({ ...eventData, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          skipped++;
        } else {
          await supabase.from('calendar_events').insert(eventData);
          upserted++;
        }
      }

      setLastSyncAt(new Date());
      toast.success(`Synced ${upserted} new, ${skipped} updated from Outlook`);
    } catch (err) {
      console.error('[useCalendarSync] Sync from Outlook failed:', err);
      toast.error(`Outlook sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, companyId, outlookConnection, composio]);

  /**
   * Push a local event to Google Calendar.
   */
  const syncToGoogle = useCallback(async (event) => {
    if (!connection) {
      toast.error('Not connected to Google Calendar');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await composio.executeTool('GOOGLECALENDAR_CREATE_EVENT', {
        connectedAccountId: connection.composio_connected_account_id,
        arguments: {
          summary: event.title,
          description: event.description || '',
          start_datetime: new Date(event.start_time).toISOString(),
          end_datetime: new Date(event.end_time).toISOString(),
          location: event.location || '',
          attendees: (event.attendees || [])
            .filter((a) => a.email)
            .map((a) => a.email),
        },
      });

      const googleEventId = result?.id || result?.eventId || result?.event_id || result?.data?.id;

      if (googleEventId && event.id) {
        const existingMetadata = event.metadata || {};
        await supabase
          .from('calendar_events')
          .update({
            metadata: {
              ...existingMetadata,
              source: 'google_calendar',
              google_event_id: googleEventId,
              pushed_to_google_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);
      }

      toast.success('Event pushed to Google Calendar');
      return result;
    } catch (err) {
      console.error('[useCalendarSync] Push to Google failed:', err);
      toast.error(`Failed to push event: ${err.message}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [connection, composio]);

  /**
   * Push a local event to Outlook Calendar.
   */
  const syncToOutlook = useCallback(async (event) => {
    if (!outlookConnection) {
      toast.error('Not connected to Outlook Calendar');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await composio.executeTool('OUTLOOKCALENDAR_CREATE_CALENDAR_EVENT', {
        connectedAccountId: outlookConnection.composio_connected_account_id,
        arguments: {
          subject: event.title,
          body: event.description || '',
          start_date_time: new Date(event.start_time).toISOString(),
          end_date_time: new Date(event.end_time).toISOString(),
          location: event.location || '',
          attendees: (event.attendees || [])
            .filter((a) => a.email)
            .map((a) => ({ email: a.email, name: a.name || '' })),
        },
      });

      const outlookEventId = result?.id || result?.data?.id;

      if (outlookEventId && event.id) {
        const existingMetadata = event.metadata || {};
        await supabase
          .from('calendar_events')
          .update({
            metadata: {
              ...existingMetadata,
              source: 'outlook_calendar',
              outlook_event_id: outlookEventId,
              pushed_to_outlook_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);
      }

      toast.success('Event pushed to Outlook Calendar');
      return result;
    } catch (err) {
      console.error('[useCalendarSync] Push to Outlook failed:', err);
      toast.error(`Failed to push event: ${err.message}`);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [outlookConnection, composio]);

  /**
   * Start periodic auto-sync (every 5 minutes).
   */
  const startAutoSync = useCallback(() => {
    if (intervalRef.current) return; // Already running
    if (!isConnected) return;

    // Run immediately, then set interval
    syncFromGoogle();
    intervalRef.current = setInterval(() => {
      syncFromGoogle();
    }, SYNC_INTERVAL_MS);
  }, [isConnected, syncFromGoogle]);

  /**
   * Stop periodic auto-sync.
   */
  const stopAutoSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    isSyncing,
    lastSyncAt,
    isConnected,
    connectionLoading,
    connection,
    isOutlookConnected,
    outlookConnection,
    activeProvider,
    setActiveProvider,

    // Actions
    connectGoogleCalendar,
    connectOutlookCalendar,
    checkConnection,
    syncFromGoogle,
    syncFromOutlook,
    syncToGoogle,
    syncToOutlook,
    startAutoSync,
    stopAutoSync,
  };
}

export default useCalendarSync;
