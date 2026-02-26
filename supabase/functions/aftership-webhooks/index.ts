/**
 * AfterShip Webhooks Edge Function
 *
 * Receives real-time webhook pushes from AfterShip when tracking status changes.
 * Verifies HMAC-SHA256 signature, geocodes checkpoint locations, upserts to DB.
 * Auto-updates order status to "delivered" when AfterShip reports delivery.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, aftership-hmac-sha256',
};

// ─── HMAC Verification ──────────────────────────────────────────────────────

async function verifyHmac(body: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('AFTERSHIP_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('[aftership-webhooks] No AFTERSHIP_WEBHOOK_SECRET — skipping verification');
    return true;
  }
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signed)));

  return computed === signature;
}

// ─── Geocoding ──────────────────────────────────────────────────────────────

interface GeoResult {
  latitude: number;
  longitude: number;
}

async function geocodeLocation(
  city: string | null,
  countryIso3: string | null,
  supabase: ReturnType<typeof createClient>,
): Promise<GeoResult | null> {
  if (!city && !countryIso3) return null;

  const queryKey = `${(city || '').toLowerCase().trim()}|${(countryIso3 || '').toLowerCase().trim()}`;

  // Check cache first
  const { data: cached } = await supabase
    .from('geocode_cache')
    .select('latitude, longitude')
    .eq('query_key', queryKey)
    .maybeSingle();

  if (cached) return cached;

  // Call Mapbox Geocoding API
  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!mapboxToken) return null;

  const searchText = [city, countryIso3].filter(Boolean).join(', ');
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?access_token=${mapboxToken}&limit=1`;

  try {
    const resp = await fetch(url);
    const json = await resp.json();
    const feature = json.features?.[0];
    if (!feature) return null;

    const [longitude, latitude] = feature.center;
    const result = { latitude, longitude };

    // Cache the result
    await supabase
      .from('geocode_cache')
      .upsert({ query_key: queryKey, latitude, longitude }, { onConflict: 'query_key' });

    return result;
  } catch (err) {
    console.error('[aftership-webhooks] Geocoding failed:', err);
    return null;
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const bodyText = await req.text();

  // Verify HMAC signature
  const signature = req.headers.get('aftership-hmac-sha256');
  const valid = await verifyHmac(bodyText, signature);
  if (!valid) {
    console.error('[aftership-webhooks] Invalid HMAC signature');
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const payload = JSON.parse(bodyText);
    const tracking = payload.msg;

    if (!tracking?.id) {
      return new Response('No tracking data', { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const aftershipId = tracking.id;
    console.log(`[aftership-webhooks] Received update for aftership_id=${aftershipId}, tag=${tracking.tag}`);

    // Find our tracking_jobs row
    const { data: trackingJob, error: findErr } = await supabase
      .from('tracking_jobs')
      .select('id, shipping_task_id, company_id')
      .eq('aftership_id', aftershipId)
      .maybeSingle();

    if (findErr || !trackingJob) {
      console.error('[aftership-webhooks] Tracking job not found for aftership_id:', aftershipId);
      return new Response(
        JSON.stringify({ error: 'Tracking job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Process checkpoints
    const checkpoints = tracking.checkpoints || [];
    let inserted = 0;

    for (const cp of checkpoints) {
      // Geocode if we have city/country
      const geo = await geocodeLocation(cp.city, cp.country_iso3, supabase);

      const locationName = [cp.city, cp.state, cp.country_name]
        .filter(Boolean)
        .join(', ');

      const { error: upsertErr } = await supabase
        .from('shipment_checkpoints')
        .upsert(
          {
            tracking_job_id: trackingJob.id,
            status_tag: cp.tag,
            status_subtag: cp.subtag || null,
            status_description: cp.subtag_message || null,
            message: cp.message || null,
            location_name: locationName || null,
            city: cp.city || null,
            state: cp.state || null,
            country_iso3: cp.country_iso3 || null,
            zip: cp.zip || null,
            latitude: geo?.latitude || null,
            longitude: geo?.longitude || null,
            checkpoint_time: cp.checkpoint_time,
            source: 'aftership',
            raw_event: cp,
          },
          { onConflict: 'tracking_job_id,checkpoint_time,status_tag' },
        );

      if (upsertErr) {
        console.error('[aftership-webhooks] Checkpoint upsert error:', upsertErr);
      } else {
        inserted++;
      }
    }

    console.log(`[aftership-webhooks] Upserted ${inserted}/${checkpoints.length} checkpoints`);

    // Update tracking_jobs with latest status
    const updateData: Record<string, unknown> = {
      aftership_tag: tracking.tag,
      aftership_subtag: tracking.subtag || null,
    };

    if (tracking.expected_delivery) {
      updateData.expected_delivery = tracking.expected_delivery;
    }
    if (tracking.origin_city) {
      updateData.origin_city = tracking.origin_city;
    }
    if (tracking.origin_country_iso3) {
      updateData.origin_country_iso3 = tracking.origin_country_iso3;
    }
    if (tracking.destination_city) {
      updateData.destination_city = tracking.destination_city;
    }
    if (tracking.destination_country_iso3) {
      updateData.destination_country_iso3 = tracking.destination_country_iso3;
    }

    await supabase
      .from('tracking_jobs')
      .update(updateData)
      .eq('id', trackingJob.id);

    // Auto-deliver: if AfterShip says "Delivered", update order status
    if (tracking.tag === 'Delivered' && trackingJob.shipping_task_id) {
      console.log(`[aftership-webhooks] Auto-delivering for shipping_task=${trackingJob.shipping_task_id}`);

      // Get the b2b_order_id from shipping_tasks
      const { data: shippingTask } = await supabase
        .from('shipping_tasks')
        .select('b2b_order_id')
        .eq('id', trackingJob.shipping_task_id)
        .maybeSingle();

      if (shippingTask?.b2b_order_id) {
        // Update shipping task status
        await supabase
          .from('shipping_tasks')
          .update({ status: 'delivered' })
          .eq('id', trackingJob.shipping_task_id);

        // Update b2b order status
        await supabase
          .from('b2b_orders')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          })
          .eq('id', shippingTask.b2b_order_id);

        // Mark tracking job as delivered
        await supabase
          .from('tracking_jobs')
          .update({ status: 'delivered' })
          .eq('id', trackingJob.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, checkpoints_processed: inserted }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[aftership-webhooks] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
