/**
 * Delivery Tracking Agent
 *
 * Monitors shipment deliveries, checks tracking status,
 * and handles escalations for overdue packages.
 */

import Together from 'together-ai';
import type { AgentContext } from '../types';
import type { TrackingCheckResult, EscalationDecision } from './types';
import { DELIVERY_TRACKING_CONFIG } from './types';
import { DEFAULT_TRACKING_ALERT_DAYS } from '@/lib/db/schema';
import {
  getJobsDueForCheck,
  getJobsForEscalation,
  updateTrackingStatus,
  markDelivered,
  escalateTracking,
  addTrackingEvent,
  detectCarrier,
  getTrackingUrl,
} from '@/lib/db/queries/tracking';
import {
  createDeliveryOverdueNotification,
} from '@/lib/db/queries/notifications';
import { updateShippingTask, updateSalesOrder } from '@/lib/db/queries/sales-orders';

export class DeliveryTrackingAgent {
  private client: Together;
  private config = DELIVERY_TRACKING_CONFIG;

  constructor(apiKey?: string) {
    const key = apiKey || import.meta.env.VITE_TOGETHER_API_KEY;
    if (!key) {
      throw new Error('Together API key is required');
    }
    this.client = new Together({ apiKey: key });
  }

  /**
   * Run the tracking check cycle for a company
   * This should be called by a cron job / scheduled function
   */
  async runTrackingCycle(companyId: string): Promise<{
    checked: number;
    delivered: number;
    escalated: number;
    errors: string[];
  }> {
    const results = {
      checked: 0,
      delivered: 0,
      escalated: 0,
      errors: [] as string[],
    };

    try {
      // 1. Get jobs due for checking
      const jobsDueForCheck = await getJobsDueForCheck(companyId);

      for (const job of jobsDueForCheck) {
        try {
          const trackingResult = await this.checkTracking(
            job.carrier,
            job.track_trace_code
          );

          results.checked++;

          if (trackingResult.is_delivered) {
            // Mark as delivered
            await markDelivered(job.id, {
              deliveredAt: trackingResult.delivery_date || new Date().toISOString(),
              location: trackingResult.location,
              signature: trackingResult.delivery_signature,
            });

            // Update shipping task
            if (job.shipping_task_id) {
              await updateShippingTask(job.shipping_task_id, {
                status: 'delivered',
                delivered_at: trackingResult.delivery_date || new Date().toISOString(),
                delivery_signature: trackingResult.delivery_signature,
              });
            }

            // Update sales order
            if (job.sales_order_id) {
              await updateSalesOrder(job.sales_order_id, {
                status: 'delivered',
                delivered_at: trackingResult.delivery_date || new Date().toISOString(),
              });
            }

            results.delivered++;
          } else {
            // Update tracking status
            await updateTrackingStatus(job.id, {
              status: trackingResult.status || 'unknown',
              location: trackingResult.location,
              rawData: trackingResult.raw_response,
            });

            // Add tracking event
            if (trackingResult.status) {
              await addTrackingEvent({
                tracking_job_id: job.id,
                event_timestamp: trackingResult.timestamp || new Date().toISOString(),
                status_code: trackingResult.status_code,
                status_description: trackingResult.status,
                location: trackingResult.location,
                raw_event: trackingResult.raw_response as Record<string, unknown>,
              });
            }
          }
        } catch (error) {
          results.errors.push(
            `Job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // 2. Check for escalations
      const jobsForEscalation = await getJobsForEscalation(companyId);

      for (const job of jobsForEscalation) {
        try {
          const decision = await this.evaluateEscalation(job);

          if (decision.should_escalate) {
            // Create notification
            const shippedAt = job.shipping_tasks?.shipped_at;
            const daysSinceShipped = shippedAt
              ? Math.floor(
                  (Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24)
                )
              : 0;

            const notification = await createDeliveryOverdueNotification(
              companyId,
              job.id,
              job.shipping_task_id,
              job.sales_orders?.order_number || 'Unknown',
              job.customers?.name || 'Unknown Customer',
              daysSinceShipped
            );

            // Mark as escalated
            await escalateTracking(job.id, notification.id);

            results.escalated++;
          }
        } catch (error) {
          results.errors.push(
            `Escalation ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    } catch (error) {
      results.errors.push(
        `Cycle error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return results;
  }

  /**
   * Check tracking status for a specific shipment
   */
  async checkTracking(
    carrier: string,
    trackTraceCode: string
  ): Promise<TrackingCheckResult> {
    // Detect carrier if not provided
    const detectedCarrier = carrier || detectCarrier(trackTraceCode) || 'unknown';

    try {
      // In production, this would call actual carrier APIs
      // For now, use AI to simulate/parse tracking responses
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a delivery tracking assistant. Given a carrier and tracking code, simulate a realistic tracking status check.

Return JSON with:
{
  "success": boolean,
  "status": "in_transit" | "out_for_delivery" | "delivered" | "delivery_failed" | "returned" | "unknown",
  "status_code": string,
  "location": string | null,
  "timestamp": ISO date string,
  "is_delivered": boolean,
  "delivery_date": ISO date string | null,
  "delivery_signature": string | null,
  "events": [{ "timestamp": string, "status": string, "location": string }]
}

For demonstration purposes, randomly generate realistic tracking events based on the carrier type.`,
          },
          {
            role: 'user',
            content: `Check tracking for:
Carrier: ${detectedCarrier}
Tracking Code: ${trackTraceCode}

Generate a realistic tracking status response.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          is_delivered: false,
          error: 'No response from tracking service',
        };
      }

      const parsed = JSON.parse(content);

      return {
        success: parsed.success ?? true,
        status: parsed.status,
        status_code: parsed.status_code,
        location: parsed.location,
        timestamp: parsed.timestamp,
        is_delivered: parsed.is_delivered ?? parsed.status === 'delivered',
        delivery_date: parsed.delivery_date,
        delivery_signature: parsed.delivery_signature,
        events: parsed.events,
        raw_response: parsed,
      };
    } catch (error) {
      return {
        success: false,
        is_delivered: false,
        error: error instanceof Error ? error.message : 'Tracking check failed',
      };
    }
  }

  /**
   * Evaluate whether a tracking job should be escalated
   */
  async evaluateEscalation(job: {
    id: string;
    track_trace_code: string;
    current_tracking_status?: string;
    alert_after_days: number;
    shipping_tasks?: { shipped_at?: string };
    customers?: { tracking_alert_days?: number };
  }): Promise<EscalationDecision> {
    const shippedAt = job.shipping_tasks?.shipped_at;
    if (!shippedAt) {
      return {
        should_escalate: false,
        severity: 'low',
        reason: 'No shipping date recorded',
      };
    }

    const daysSinceShipped = Math.floor(
      (Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const alertDays =
      job.customers?.tracking_alert_days ||
      job.alert_after_days ||
      DEFAULT_TRACKING_ALERT_DAYS;

    // Immediate escalation for certain statuses
    const immediateEscalationStatuses = [
      'returned',
      'refused',
      'return_to_sender',
      'damaged',
    ];

    if (
      job.current_tracking_status &&
      immediateEscalationStatuses.includes(job.current_tracking_status.toLowerCase())
    ) {
      return {
        should_escalate: true,
        severity: 'critical',
        reason: `Package status: ${job.current_tracking_status}`,
        recommended_action: 'Contact customer immediately and arrange resolution',
      };
    }

    // High priority statuses
    const highPriorityStatuses = ['delivery_failed', 'address_issue', 'held_at_customs'];

    if (
      job.current_tracking_status &&
      highPriorityStatuses.includes(job.current_tracking_status.toLowerCase())
    ) {
      return {
        should_escalate: true,
        severity: 'high',
        reason: `Delivery issue: ${job.current_tracking_status}`,
        recommended_action: 'Verify delivery address with customer',
      };
    }

    // Time-based escalation
    if (daysSinceShipped >= alertDays) {
      let severity: 'low' | 'medium' | 'high' | 'critical';

      if (daysSinceShipped >= alertDays * 2) {
        severity = 'critical';
      } else if (daysSinceShipped >= alertDays * 1.5) {
        severity = 'high';
      } else {
        severity = 'medium';
      }

      return {
        should_escalate: true,
        severity,
        reason: `Package has been in transit for ${daysSinceShipped} days (alert threshold: ${alertDays} days)`,
        recommended_action: 'Check tracking details and consider contacting carrier or customer',
      };
    }

    return {
      should_escalate: false,
      severity: 'low',
      reason: `Package is within acceptable delivery window (${daysSinceShipped}/${alertDays} days)`,
    };
  }

  /**
   * Generate a tracking URL for customer communication
   */
  generateTrackingUrl(carrier: string, trackTraceCode: string): string | null {
    return getTrackingUrl(carrier, trackTraceCode);
  }

  /**
   * Auto-detect carrier from tracking code
   */
  detectCarrier(trackTraceCode: string): string | null {
    return detectCarrier(trackTraceCode);
  }
}

// Export singleton factory
let instance: DeliveryTrackingAgent | null = null;

export function getDeliveryTrackingAgent(apiKey?: string): DeliveryTrackingAgent {
  if (!instance) {
    instance = new DeliveryTrackingAgent(apiKey);
  }
  return instance;
}
