/**
 * Tracking Queries
 */

import { supabase } from '@/api/supabaseClient';
import type {
  TrackingJob,
  TrackingJobInsert,
  TrackingJobUpdate,
  TrackingHistory,
  TrackingHistoryInsert
} from '../schema';
import { DEFAULT_TRACKING_ALERT_DAYS } from '../schema';

// =============================================================================
// TRACKING JOBS
// =============================================================================

export async function listTrackingJobs(
  companyId: string,
  filters?: {
    status?: string;
    isOverdue?: boolean;
    carrier?: string;
  }
): Promise<TrackingJob[]> {
  let query = supabase
    .from('tracking_jobs')
    .select(`
      *,
      shipping_tasks (id, task_number, status),
      sales_orders (id, order_number),
      customers (id, name, email, tracking_alert_days)
    `)
    .eq('company_id', companyId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.isOverdue !== undefined) {
    query = query.eq('is_overdue', filters.isOverdue);
  }
  if (filters?.carrier) {
    query = query.eq('carrier', filters.carrier);
  }

  const { data, error } = await query.order('next_check_at');

  if (error) throw error;
  return data || [];
}

export async function getTrackingJob(id: string): Promise<TrackingJob | null> {
  const { data, error } = await supabase
    .from('tracking_jobs')
    .select(`
      *,
      shipping_tasks (
        id, task_number, status, carrier, service_type,
        shipped_at, delivered_at
      ),
      sales_orders (
        id, order_number, customer_id,
        customers (id, name, email, phone, tracking_alert_days)
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getTrackingJobByCode(
  companyId: string,
  trackTraceCode: string
): Promise<TrackingJob | null> {
  const { data, error } = await supabase
    .from('tracking_jobs')
    .select('*')
    .eq('company_id', companyId)
    .eq('track_trace_code', trackTraceCode)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createTrackingJob(job: TrackingJobInsert): Promise<TrackingJob> {
  const { data, error } = await supabase
    .from('tracking_jobs')
    .insert(job)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrackingJob(id: string, updates: TrackingJobUpdate): Promise<TrackingJob> {
  const { data, error } = await supabase
    .from('tracking_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// TRACKING STATUS UPDATES
// =============================================================================

/**
 * Update tracking status from carrier API response
 */
export async function updateTrackingStatus(
  jobId: string,
  statusInfo: {
    status: string;
    location?: string;
    rawData?: unknown;
  }
): Promise<TrackingJob> {
  const now = new Date().toISOString();

  // Get current job to append raw data
  const currentJob = await getTrackingJob(jobId);
  const rawTrackingData = Array.isArray(currentJob?.raw_tracking_data)
    ? [...currentJob.raw_tracking_data, statusInfo.rawData]
    : [statusInfo.rawData];

  // Calculate next check (every 2 days)
  const nextCheck = new Date();
  nextCheck.setDate(nextCheck.getDate() + 2);

  return updateTrackingJob(jobId, {
    current_tracking_status: statusInfo.status,
    last_checked_at: now,
    next_check_at: nextCheck.toISOString(),
    check_count: (currentJob?.check_count || 0) + 1,
    raw_tracking_data: rawTrackingData,
  });
}

/**
 * Mark tracking job as delivered
 */
export async function markDelivered(
  jobId: string,
  deliveryInfo: {
    deliveredAt: string;
    location?: string;
    signature?: string;
  }
): Promise<TrackingJob> {
  return updateTrackingJob(jobId, {
    status: 'delivered',
    delivered_at: deliveryInfo.deliveredAt,
    delivery_location: deliveryInfo.location,
    delivery_signature: deliveryInfo.signature,
    is_overdue: false,
  });
}

/**
 * Mark tracking job as overdue and escalate
 */
export async function escalateTracking(
  jobId: string,
  notificationId?: string
): Promise<TrackingJob> {
  return updateTrackingJob(jobId, {
    is_overdue: true,
    escalated_at: new Date().toISOString(),
    escalation_notification_id: notificationId,
  });
}

// =============================================================================
// TRACKING HISTORY
// =============================================================================

export async function addTrackingEvent(event: TrackingHistoryInsert): Promise<TrackingHistory> {
  const { data, error } = await supabase
    .from('tracking_history')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTrackingHistory(jobId: string): Promise<TrackingHistory[]> {
  const { data, error } = await supabase
    .from('tracking_history')
    .select('*')
    .eq('tracking_job_id', jobId)
    .order('event_timestamp', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =============================================================================
// JOBS DUE FOR CHECK
// =============================================================================

/**
 * Get tracking jobs that need to be checked
 * (next_check_at has passed and status is active)
 */
export async function getJobsDueForCheck(companyId: string): Promise<TrackingJob[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('tracking_jobs')
    .select(`
      *,
      shipping_tasks (id, task_number, shipped_at),
      customers (id, name, email, tracking_alert_days)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .lte('next_check_at', now)
    .order('next_check_at');

  if (error) throw error;
  return data || [];
}

/**
 * Get tracking jobs that should be escalated
 * (shipped longer than alert_after_days ago and not delivered)
 */
export async function getJobsForEscalation(companyId: string): Promise<TrackingJob[]> {
  const { data, error } = await supabase
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

  if (error) throw error;

  // Filter by alert_after_days
  const now = new Date();
  return (data || []).filter(job => {
    const shippedAt = job.shipping_tasks?.shipped_at;
    if (!shippedAt) return false;

    const shippedDate = new Date(shippedAt);
    const daysSinceShipped = Math.floor(
      (now.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const alertDays = job.alert_after_days || DEFAULT_TRACKING_ALERT_DAYS;
    return daysSinceShipped >= alertDays;
  });
}

// =============================================================================
// CARRIER DETECTION
// =============================================================================

const CARRIER_PATTERNS: Record<string, RegExp[]> = {
  'PostNL': [/^3S[A-Z0-9]{11,}$/i, /^[A-Z]{2}\d{9}NL$/i],
  'DHL': [/^JJD\d{18}$/i, /^\d{10,20}$/],
  'DPD': [/^\d{14}$/],
  'UPS': [/^1Z[A-Z0-9]{16}$/i],
  'FedEx': [/^\d{12,22}$/],
  'GLS': [/^[A-Z0-9]{11,}$/i],
};

export function detectCarrier(trackTraceCode: string): string | null {
  for (const [carrier, patterns] of Object.entries(CARRIER_PATTERNS)) {
    if (patterns.some(p => p.test(trackTraceCode))) {
      return carrier;
    }
  }
  return null;
}

/**
 * Generate tracking URL for carrier
 */
export function getTrackingUrl(carrier: string, trackTraceCode: string): string | null {
  const urls: Record<string, string> = {
    'PostNL': `https://postnl.nl/tracktrace/?B=${encodeURIComponent(trackTraceCode)}`,
    'DHL': `https://www.dhl.com/nl-nl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${encodeURIComponent(trackTraceCode)}`,
    'DPD': `https://tracking.dpd.de/parcelstatus?query=${encodeURIComponent(trackTraceCode)}`,
    'UPS': `https://www.ups.com/track?tracknum=${encodeURIComponent(trackTraceCode)}`,
    'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackTraceCode)}`,
    'GLS': `https://gls-group.eu/NL/nl/volg-je-pakket?match=${encodeURIComponent(trackTraceCode)}`,
  };

  return urls[carrier] || null;
}
