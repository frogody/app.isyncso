/**
 * Tracking Cycle Edge Function
 *
 * Scheduled function that runs every 2 days to:
 * 1. Check tracking status for all active shipments
 * 2. Update delivery confirmations
 * 3. Escalate overdue packages
 *
 * Deploy: SUPABASE_ACCESS_TOKEN="..." npx supabase functions deploy tracking-cycle --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
 *
 * Schedule via Supabase pg_cron:
 * SELECT cron.schedule('tracking-cycle', '0 8 */2 * *', $$SELECT net.http_post(...)$$);
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Together from 'https://esm.sh/together-ai@0.9.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TOGETHER_API_KEY = Deno.env.get('TOGETHER_API_KEY')!;

const DEFAULT_TRACKING_ALERT_DAYS = 14;

// Carrier URL generators
const CARRIER_URLS: Record<string, (code: string) => string> = {
  'PostNL': (code) => `https://postnl.nl/tracktrace/?B=${encodeURIComponent(code)}`,
  'DHL': (code) => `https://www.dhl.com/nl-nl/home/tracking.html?tracking-id=${encodeURIComponent(code)}`,
  'DPD': (code) => `https://tracking.dpd.de/parcelstatus?query=${encodeURIComponent(code)}`,
  'UPS': (code) => `https://www.ups.com/track?tracknum=${encodeURIComponent(code)}`,
};

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const together = new Together({ apiKey: TOGETHER_API_KEY });

  const results = {
    timestamp: new Date().toISOString(),
    companies_processed: 0,
    total_checked: 0,
    total_delivered: 0,
    total_escalated: 0,
    errors: [] as string[],
  };

  try {
    // Get all companies with active tracking jobs
    const { data: companies, error: companiesError } = await supabase
      .from('tracking_jobs')
      .select('company_id')
      .eq('status', 'active')
      .limit(1000);

    if (companiesError) throw companiesError;

    // Get unique company IDs
    const companyIds = [...new Set(companies?.map(c => c.company_id) || [])];

    for (const companyId of companyIds) {
      try {
        const companyResult = await processCompanyTracking(
          supabase,
          together,
          companyId
        );

        results.companies_processed++;
        results.total_checked += companyResult.checked;
        results.total_delivered += companyResult.delivered;
        results.total_escalated += companyResult.escalated;

        if (companyResult.errors.length > 0) {
          results.errors.push(...companyResult.errors.map(e => `[${companyId}] ${e}`));
        }
      } catch (error) {
        results.errors.push(
          `Company ${companyId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  } catch (error) {
    results.errors.push(
      `Global error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return new Response(JSON.stringify(results), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

async function processCompanyTracking(
  supabase: ReturnType<typeof createClient>,
  together: Together,
  companyId: string
) {
  const results = {
    checked: 0,
    delivered: 0,
    escalated: 0,
    errors: [] as string[],
  };

  const now = new Date().toISOString();

  // 1. Get jobs due for checking
  const { data: jobsDue, error: jobsError } = await supabase
    .from('tracking_jobs')
    .select(`
      *,
      shipping_tasks (id, task_number, shipped_at),
      sales_orders (id, order_number),
      customers (id, name, email, tracking_alert_days)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .lte('next_check_at', now);

  if (jobsError) throw jobsError;

  for (const job of (jobsDue || [])) {
    try {
      // Simulate tracking check (in production, call actual carrier APIs)
      const trackingStatus = await simulateTrackingCheck(together, job.carrier, job.track_trace_code);

      results.checked++;

      // Calculate next check (every 2 days)
      const nextCheck = new Date();
      nextCheck.setDate(nextCheck.getDate() + 2);

      if (trackingStatus.is_delivered) {
        // Mark as delivered
        await supabase
          .from('tracking_jobs')
          .update({
            status: 'delivered',
            delivered_at: trackingStatus.delivery_date || now,
            delivery_location: trackingStatus.location,
            delivery_signature: trackingStatus.delivery_signature,
            current_tracking_status: 'delivered',
            last_checked_at: now,
            updated_at: now,
          })
          .eq('id', job.id);

        // Update shipping task
        if (job.shipping_task_id) {
          await supabase
            .from('shipping_tasks')
            .update({
              status: 'delivered',
              delivered_at: trackingStatus.delivery_date || now,
              delivery_signature: trackingStatus.delivery_signature,
              updated_at: now,
            })
            .eq('id', job.shipping_task_id);
        }

        // Update sales order
        if (job.sales_order_id) {
          await supabase
            .from('sales_orders')
            .update({
              status: 'delivered',
              delivered_at: trackingStatus.delivery_date || now,
              updated_at: now,
            })
            .eq('id', job.sales_order_id);
        }

        results.delivered++;
      } else {
        // Update tracking status
        const rawData = Array.isArray(job.raw_tracking_data)
          ? [...job.raw_tracking_data, trackingStatus]
          : [trackingStatus];

        await supabase
          .from('tracking_jobs')
          .update({
            current_tracking_status: trackingStatus.status,
            last_checked_at: now,
            next_check_at: nextCheck.toISOString(),
            check_count: (job.check_count || 0) + 1,
            raw_tracking_data: rawData,
            updated_at: now,
          })
          .eq('id', job.id);

        // Add tracking event
        await supabase
          .from('tracking_history')
          .insert({
            tracking_job_id: job.id,
            event_timestamp: trackingStatus.timestamp || now,
            status_code: trackingStatus.status_code,
            status_description: trackingStatus.status,
            location: trackingStatus.location,
            raw_event: trackingStatus,
          });
      }
    } catch (error) {
      results.errors.push(
        `Job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // 2. Check for escalations
  const { data: activeJobs, error: activeError } = await supabase
    .from('tracking_jobs')
    .select(`
      *,
      shipping_tasks (id, task_number, shipped_at),
      sales_orders (id, order_number),
      customers (id, name, email, tracking_alert_days)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .eq('is_overdue', false);

  if (activeError) throw activeError;

  for (const job of (activeJobs || [])) {
    const shippedAt = job.shipping_tasks?.shipped_at;
    if (!shippedAt) continue;

    const daysSinceShipped = Math.floor(
      (Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const alertDays =
      job.customers?.tracking_alert_days ||
      job.alert_after_days ||
      DEFAULT_TRACKING_ALERT_DAYS;

    if (daysSinceShipped >= alertDays) {
      try {
        // Create notification
        const { data: notification } = await supabase
          .from('notifications')
          .insert({
            company_id: companyId,
            type: 'delivery_overdue',
            severity: daysSinceShipped > 21 ? 'critical' : 'high',
            tracking_job_id: job.id,
            shipping_task_id: job.shipping_task_id,
            title: `Levering ${daysSinceShipped} dagen onderweg`,
            message: `Order ${job.sales_orders?.order_number || 'Unknown'} voor ${job.customers?.name || 'Unknown'} is al ${daysSinceShipped} dagen onderweg zonder bevestigde levering.`,
            action_required: 'Controleer tracking status en neem contact op met klant indien nodig',
            action_url: `/shipping/${job.shipping_task_id}`,
            context_data: {
              days_since_shipped: daysSinceShipped,
              order_number: job.sales_orders?.order_number,
              customer_name: job.customers?.name,
            },
            status: 'unread',
          })
          .select()
          .single();

        // Mark as escalated
        await supabase
          .from('tracking_jobs')
          .update({
            is_overdue: true,
            escalated_at: now,
            escalation_notification_id: notification?.id,
            updated_at: now,
          })
          .eq('id', job.id);

        results.escalated++;
      } catch (error) {
        results.errors.push(
          `Escalation ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  return results;
}

async function simulateTrackingCheck(
  together: Together,
  carrier: string,
  trackTraceCode: string
): Promise<{
  success: boolean;
  status: string;
  status_code?: string;
  location?: string;
  timestamp: string;
  is_delivered: boolean;
  delivery_date?: string;
  delivery_signature?: string;
}> {
  try {
    const response = await together.chat.completions.create({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages: [
        {
          role: 'system',
          content: `You are a delivery tracking simulator. Generate realistic tracking status for demonstration.

Return JSON:
{
  "success": true,
  "status": "in_transit" | "out_for_delivery" | "delivered" | "delivery_failed",
  "status_code": string,
  "location": string,
  "timestamp": ISO date string,
  "is_delivered": boolean,
  "delivery_date": ISO string | null,
  "delivery_signature": string | null
}

Make it realistic - most packages are in transit, ~10% are delivered, ~5% have issues.`,
        },
        {
          role: 'user',
          content: `Carrier: ${carrier}, Code: ${trackTraceCode}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    return JSON.parse(content);
  } catch {
    return {
      success: false,
      status: 'unknown',
      timestamp: new Date().toISOString(),
      is_delivered: false,
    };
  }
}
