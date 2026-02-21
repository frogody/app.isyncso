/**
 * manage-custom-domain - Edge function for DNS verification and custom domain management.
 *
 * POST with { action, domain, organizationId }
 * Actions:
 *   "verify" - Fetch dns.google/resolve, check CNAME
 *   "status" - Return SSL status
 *   "remove" - Clear domain from config
 * CORS headers. Supabase service role from env.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CNAME_TARGET = 'cname.isyncso.com';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { action, domain, organizationId } = await req.json();

    if (!action || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, organizationId' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ----- VERIFY -----
    if (action === 'verify') {
      if (!domain) {
        return new Response(
          JSON.stringify({ verified: false, message: 'Domain is required' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // Query Google DNS to check CNAME record
      const dnsUrl = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`;
      const dnsRes = await fetch(dnsUrl);
      const dnsData = await dnsRes.json();

      let verified = false;

      if (dnsData.Answer && Array.isArray(dnsData.Answer)) {
        verified = dnsData.Answer.some(
          (record: { data?: string }) =>
            record.data &&
            (record.data.replace(/\.$/, '').toLowerCase() === CNAME_TARGET.toLowerCase())
        );
      }

      if (verified) {
        // Update store config with verified domain
        await supabase
          .from('b2b_store_configs')
          .update({
            custom_domain: domain.toLowerCase(),
            ssl_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);
      }

      return new Response(
        JSON.stringify({
          verified,
          domain,
          message: verified
            ? 'CNAME record verified successfully.'
            : 'CNAME record not found. Make sure you have added a CNAME record pointing to ' + CNAME_TARGET,
          dns_response: dnsData,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ----- STATUS -----
    if (action === 'status') {
      const { data, error } = await supabase
        .from('b2b_store_configs')
        .select('custom_domain, ssl_status')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          domain: data?.custom_domain,
          ssl_status: data?.ssl_status || 'none',
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ----- REMOVE -----
    if (action === 'remove') {
      await supabase
        .from('b2b_store_configs')
        .update({
          custom_domain: null,
          ssl_status: null,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      return new Response(
        JSON.stringify({ success: true, message: 'Custom domain removed.' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[manage-custom-domain] error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
