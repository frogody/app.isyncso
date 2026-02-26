/**
 * Manual Checkpoint Edge Function
 *
 * Inserts a checkpoint for carriers not tracked by AfterShip.
 * Geocodes location if city+country provided but no lat/lng.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function geocode(
  city: string | null,
  countryIso3: string | null,
  supabase: ReturnType<typeof createClient>,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!city && !countryIso3) return null;

  const queryKey = `${(city || '').toLowerCase().trim()}|${(countryIso3 || '').toLowerCase().trim()}`;

  const { data: cached } = await supabase
    .from('geocode_cache')
    .select('latitude, longitude')
    .eq('query_key', queryKey)
    .maybeSingle();

  if (cached) return cached;

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

    await supabase
      .from('geocode_cache')
      .upsert({ query_key: queryKey, latitude, longitude }, { onConflict: 'query_key' });

    return { latitude, longitude };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      trackingJobId,
      statusTag,
      statusDescription,
      message,
      city,
      state,
      countryIso3,
      zip,
      latitude,
      longitude,
      checkpointTime,
    } = await req.json();

    if (!trackingJobId || !statusTag) {
      return new Response(
        JSON.stringify({ error: 'trackingJobId and statusTag required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Geocode if lat/lng not provided
    let lat = latitude;
    let lng = longitude;
    if (!lat && !lng && (city || countryIso3)) {
      const geo = await geocode(city, countryIso3, supabase);
      if (geo) {
        lat = geo.latitude;
        lng = geo.longitude;
      }
    }

    const locationName = [city, state, countryIso3]
      .filter(Boolean)
      .join(', ');

    const { data, error } = await supabase
      .from('shipment_checkpoints')
      .insert({
        tracking_job_id: trackingJobId,
        status_tag: statusTag,
        status_description: statusDescription || null,
        message: message || null,
        location_name: locationName || null,
        city: city || null,
        state: state || null,
        country_iso3: countryIso3 || null,
        zip: zip || null,
        latitude: lat || null,
        longitude: lng || null,
        checkpoint_time: checkpointTime || new Date().toISOString(),
        source: 'manual',
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, checkpoint: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[tracking-checkpoint-manual] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
