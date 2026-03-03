import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, company_id, period_days, product_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: any;

    switch (action) {
      case 'compute_margins': {
        const { data, error } = await supabase.rpc('compute_product_margins', {
          p_company_id: company_id,
          p_period_days: period_days || 30,
        });
        if (error) throw error;
        result = { success: true, data };
        break;
      }

      case 'compute_health': {
        const { data, error } = await supabase.rpc('compute_product_health', {
          p_company_id: company_id,
        });
        if (error) throw error;
        result = { success: true, data };
        break;
      }

      case 'get_dashboard': {
        // Fetch health scores with product names
        const { data: healthScores, error: healthErr } = await supabase
          .from('product_health_scores')
          .select(`
            *,
            products:product_id (id, name, type, status, featured_image)
          `)
          .eq('company_id', company_id)
          .order('overall_score', { ascending: true });

        if (healthErr) throw healthErr;

        // Fetch margins
        const { data: margins, error: marginErr } = await supabase
          .from('product_margins')
          .select(`
            *,
            products:product_id (id, name, type, status)
          `)
          .eq('company_id', company_id)
          .order('computed_at', { ascending: false });

        if (marginErr) throw marginErr;

        // Fetch unacknowledged alerts
        const { data: alerts, error: alertErr } = await supabase
          .from('margin_alerts')
          .select(`
            *,
            products:product_id (id, name)
          `)
          .eq('company_id', company_id)
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(20);

        if (alertErr) throw alertErr;

        // Summary stats
        const totalProducts = healthScores?.length || 0;
        const byHealth: Record<string, number> = {};
        (healthScores || []).forEach((s: any) => {
          byHealth[s.health_level] = (byHealth[s.health_level] || 0) + 1;
        });

        const avgScore = totalProducts > 0
          ? Math.round((healthScores || []).reduce((sum: number, s: any) => sum + s.overall_score, 0) / totalProducts)
          : 0;

        // Get latest margins only (deduplicate by product)
        const latestMargins = new Map<string, any>();
        (margins || []).forEach((m: any) => {
          if (!latestMargins.has(m.product_id)) {
            latestMargins.set(m.product_id, m);
          }
        });
        const uniqueMargins = Array.from(latestMargins.values());

        // Top and bottom 5 by margin
        const sortedByMargin = [...uniqueMargins].sort((a, b) => b.gross_margin_pct - a.gross_margin_pct);
        const topMargin = sortedByMargin.slice(0, 5);
        const bottomMargin = sortedByMargin.slice(-5).reverse();

        result = {
          success: true,
          data: {
            summary: {
              total_products: totalProducts,
              avg_health_score: avgScore,
              by_health_level: byHealth,
              unack_alerts: (alerts || []).length,
            },
            health_scores: healthScores || [],
            top_margin: topMargin,
            bottom_margin: bottomMargin,
            alerts: alerts || [],
          },
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('product-intelligence error:', err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
