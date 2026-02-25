import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import { requireCredits, refundCredits } from '../_shared/credit-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vendor_name, vendor_country, user_id } = await req.json();

    if (!vendor_name || !user_id) {
      return new Response(
        JSON.stringify({ error: 'vendor_name and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Deduct 1 credit
    const credit = await requireCredits(supabase, user_id, 'vendor-research');
    if (!credit.success) return credit.errorResponse!;

    // Build search query
    const countryHint = vendor_country ? ` ${vendor_country}` : '';
    const query = `"${vendor_name}"${countryHint} company what do they do`;

    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
    if (!TAVILY_API_KEY) {
      await refundCredits(supabase, user_id, credit.credits_deducted, 'vendor-research', 'Missing TAVILY_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Tavily API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Tavily search
    let tavilyResult;
    try {
      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          search_depth: 'basic',
          max_results: 3,
          include_answer: true,
        }),
      });

      if (!tavilyRes.ok) {
        throw new Error(`Tavily API returned ${tavilyRes.status}`);
      }

      tavilyResult = await tavilyRes.json();
    } catch (tavilyError) {
      // Refund credit on Tavily failure
      await refundCredits(supabase, user_id, credit.credits_deducted, 'vendor-research', `Tavily error: ${tavilyError.message}`);
      return new Response(
        JSON.stringify({ error: 'Vendor research failed. Credit refunded.', details: tavilyError.message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format response
    const sources = (tavilyResult.results || []).slice(0, 2).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 200) || '',
    }));

    return new Response(
      JSON.stringify({
        answer: tavilyResult.answer || 'No summary available.',
        sources,
        credits_deducted: credit.credits_deducted,
        balance_after: credit.balance_after,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[vendor-research] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
