/**
 * AfterShip Register Edge Function
 *
 * Called after shipping to register a tracking number with AfterShip.
 * Non-blocking: failure here should never block the shipping flow.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createTracking,
  detectCarrier,
  detectCarrierApi,
  normalizeCarrierSlug,
} from '../_shared/aftership-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      trackingJobId,
      trackingNumber,
      carrier,
      orderNumber,
      companyId,
    } = await req.json();

    if (!trackingJobId || !trackingNumber) {
      return new Response(
        JSON.stringify({ error: 'trackingJobId and trackingNumber required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve carrier slug
    let slug = carrier ? normalizeCarrierSlug(carrier) : null;
    if (!slug) slug = detectCarrier(trackingNumber);
    if (!slug) slug = await detectCarrierApi(trackingNumber);

    console.log(`[aftership-register] Registering ${trackingNumber} with slug=${slug}`);

    // Register with AfterShip
    const result = await createTracking(
      trackingNumber,
      slug ?? undefined,
      orderNumber ? `Order ${orderNumber}` : undefined,
    );

    console.log(`[aftership-register] Created: aftership_id=${result.id}, slug=${result.slug}`);

    // Update tracking_jobs with AfterShip info
    const { error: updateError } = await supabase
      .from('tracking_jobs')
      .update({
        aftership_id: result.id,
        aftership_slug: result.slug,
        tracking_source: 'aftership',
      })
      .eq('id', trackingJobId);

    if (updateError) {
      console.error('[aftership-register] DB update failed:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, aftership_id: result.id, slug: result.slug }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[aftership-register] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
