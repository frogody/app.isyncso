// Tracking Cycle Edge Function
// Runs every 2 days to check tracking status, update deliveries, and escalate overdue packages
// Uses Supabase REST API directly (no SDK) for smaller bundle size

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DEFAULT_TRACKING_ALERT_DAYS = 14;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Carrier tracking URL generators
const CARRIER_URLS: Record<string, (code: string) => string> = {
  'PostNL': (code) => `https://postnl.nl/tracktrace/?B=${encodeURIComponent(code)}`,
  'DHL': (code) => `https://www.dhl.com/nl-nl/home/tracking.html?tracking-id=${encodeURIComponent(code)}`,
  'DPD': (code) => `https://tracking.dpd.de/parcelstatus?query=${encodeURIComponent(code)}`,
  'UPS': (code) => `https://www.ups.com/track?tracknum=${encodeURIComponent(code)}`,
  'FedEx': (code) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(code)}`,
  'GLS': (code) => `https://gls-group.eu/EU/en/parcel-tracking?match=${encodeURIComponent(code)}`,
};

// Helper for Supabase REST API calls
async function supabaseRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
    const companies = await supabaseRequest(
      'tracking_jobs?select=company_id&status=eq.active&limit=1000'
    ) as { company_id: string }[];

    // Get unique company IDs
    const companyIds = [...new Set(companies?.map(c => c.company_id) || [])];

    for (const companyId of companyIds) {
      try {
        const companyResult = await processCompanyTracking(companyId);

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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

interface TrackingJob {
  id: string;
  company_id: string;
  shipping_task_id?: string;
  sales_order_id?: string;
  customer_id?: string;
  carrier: string;
  track_trace_code: string;
  check_count?: number;
  raw_tracking_data?: unknown[];
  alert_after_days?: number;
  is_overdue: boolean;
}

interface ShippingTask {
  id: string;
  shipped_at?: string;
}

interface Customer {
  id: string;
  name?: string;
  tracking_alert_days?: number;
}

interface SalesOrder {
  id: string;
  order_number?: string;
}

async function processCompanyTracking(companyId: string) {
  const results = { checked: 0, delivered: 0, escalated: 0, errors: [] as string[] };
  const now = new Date().toISOString();

  // 1. Get jobs due for checking
  const jobsDue = await supabaseRequest(
    `tracking_jobs?company_id=eq.${companyId}&status=eq.active&next_check_at=lte.${now}&select=*`
  ) as TrackingJob[];

  for (const job of (jobsDue || [])) {
    try {
      // Check tracking status (placeholder for real carrier APIs)
      const trackingStatus = {
        success: true,
        status: 'in_transit',
        status_code: 'INTRANSIT',
        location: 'Onderweg naar bestemming',
        timestamp: now,
        is_delivered: false,
      };

      results.checked++;

      const nextCheck = new Date();
      nextCheck.setDate(nextCheck.getDate() + 2);

      if (trackingStatus.is_delivered) {
        // Mark as delivered
        await supabaseRequest(
          `tracking_jobs?id=eq.${job.id}`,
          'PATCH',
          {
            status: 'delivered',
            delivered_at: now,
            delivery_location: trackingStatus.location,
            current_tracking_status: 'delivered',
            last_checked_at: now,
            updated_at: now,
          }
        );

        if (job.shipping_task_id) {
          await supabaseRequest(
            `shipping_tasks?id=eq.${job.shipping_task_id}`,
            'PATCH',
            { status: 'delivered', delivered_at: now, updated_at: now }
          );
        }

        if (job.sales_order_id) {
          await supabaseRequest(
            `sales_orders?id=eq.${job.sales_order_id}`,
            'PATCH',
            { status: 'delivered', delivered_at: now, updated_at: now }
          );
        }

        results.delivered++;
      } else {
        // Update tracking status
        const rawData = Array.isArray(job.raw_tracking_data)
          ? [...job.raw_tracking_data, trackingStatus]
          : [trackingStatus];

        await supabaseRequest(
          `tracking_jobs?id=eq.${job.id}`,
          'PATCH',
          {
            current_tracking_status: trackingStatus.status,
            last_checked_at: now,
            next_check_at: nextCheck.toISOString(),
            check_count: (job.check_count || 0) + 1,
            raw_tracking_data: rawData,
            updated_at: now,
          }
        );

        // Add tracking history event
        await supabaseRequest(
          'tracking_history',
          'POST',
          {
            tracking_job_id: job.id,
            event_timestamp: trackingStatus.timestamp,
            status_code: trackingStatus.status_code,
            status_description: trackingStatus.status,
            location: trackingStatus.location,
            raw_event: trackingStatus,
          }
        );
      }
    } catch (error) {
      results.errors.push(
        `Job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // 2. Check for escalations (overdue packages)
  const activeJobs = await supabaseRequest(
    `tracking_jobs?company_id=eq.${companyId}&status=eq.active&is_overdue=eq.false&select=*`
  ) as TrackingJob[];

  for (const job of (activeJobs || [])) {
    try {
      // Get shipping task to check shipped_at
      if (!job.shipping_task_id) continue;

      const tasks = await supabaseRequest(
        `shipping_tasks?id=eq.${job.shipping_task_id}&select=id,shipped_at`
      ) as ShippingTask[];

      const shippedAt = tasks?.[0]?.shipped_at;
      if (!shippedAt) continue;

      const daysSinceShipped = Math.floor(
        (Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get customer for alert days
      let alertDays = job.alert_after_days || DEFAULT_TRACKING_ALERT_DAYS;
      if (job.customer_id) {
        const customers = await supabaseRequest(
          `customers?id=eq.${job.customer_id}&select=id,name,tracking_alert_days`
        ) as Customer[];
        alertDays = customers?.[0]?.tracking_alert_days || alertDays;
      }

      if (daysSinceShipped >= alertDays) {
        // Get order number for notification
        let orderNumber = 'Unknown';
        let customerName = 'Unknown';

        if (job.sales_order_id) {
          const orders = await supabaseRequest(
            `sales_orders?id=eq.${job.sales_order_id}&select=id,order_number`
          ) as SalesOrder[];
          orderNumber = orders?.[0]?.order_number || orderNumber;
        }

        if (job.customer_id) {
          const customers = await supabaseRequest(
            `customers?id=eq.${job.customer_id}&select=id,name`
          ) as Customer[];
          customerName = customers?.[0]?.name || customerName;
        }

        // Create notification
        const notifications = await supabaseRequest(
          'notifications',
          'POST',
          {
            company_id: companyId,
            type: 'delivery_overdue',
            severity: daysSinceShipped > 21 ? 'critical' : 'high',
            tracking_job_id: job.id,
            shipping_task_id: job.shipping_task_id,
            title: `Levering ${daysSinceShipped} dagen onderweg`,
            message: `Order ${orderNumber} voor ${customerName} is al ${daysSinceShipped} dagen onderweg zonder bevestigde levering.`,
            action_required: 'Controleer tracking status en neem contact op met klant indien nodig',
            action_url: `/shipping/${job.shipping_task_id}`,
            context_data: {
              days_since_shipped: daysSinceShipped,
              order_number: orderNumber,
              customer_name: customerName,
              tracking_url: CARRIER_URLS[job.carrier]?.(job.track_trace_code),
            },
            status: 'unread',
          }
        ) as { id: string }[];

        // Mark as escalated
        await supabaseRequest(
          `tracking_jobs?id=eq.${job.id}`,
          'PATCH',
          {
            is_overdue: true,
            escalated_at: now,
            escalation_notification_id: notifications?.[0]?.id,
            updated_at: now,
          }
        );

        results.escalated++;
      }
    } catch (error) {
      results.errors.push(
        `Escalation ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return results;
}
