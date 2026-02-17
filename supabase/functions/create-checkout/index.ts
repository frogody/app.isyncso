import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://app.isyncso.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, plan_slug, billing_cycle, pack_slug } = await req.json();

    if (!type || !['subscription', 'credit_pack'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "subscription" or "credit_pack"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's company
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('id, company_id, email')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData?.company_id) {
      return new Response(
        JSON.stringify({ error: 'User has no company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get or create Stripe customer
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, name, stripe_customer_id')
      .eq('id', userData.company_id)
      .single();

    let stripeCustomerId = company?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: company?.name || undefined,
        metadata: { company_id: userData.company_id, user_id: user.id },
      });
      stripeCustomerId = customer.id;

      await supabaseAdmin
        .from('companies')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userData.company_id);
    }

    // SUBSCRIPTION CHECKOUT
    if (type === 'subscription') {
      if (!plan_slug || !billing_cycle) {
        return new Response(
          JSON.stringify({ error: 'Missing plan_slug or billing_cycle' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: plan, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('slug', plan_slug)
        .eq('is_active', true)
        .single();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: 'Plan not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const price = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
      const stripePriceId = billing_cycle === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;

      // If we have a Stripe price ID, use it; otherwise create price dynamically
      let lineItems;
      if (stripePriceId) {
        lineItems = [{ price: stripePriceId, quantity: 1 }];
      } else {
        lineItems = [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${plan.name} Plan (${billing_cycle === 'yearly' ? 'Annual' : 'Monthly'})`,
              description: plan.description || `iSyncSO ${plan.name} subscription`,
            },
            unit_amount: Math.round(price * 100),
            recurring: {
              interval: billing_cycle === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        }];
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card', 'ideal'],
        line_items: lineItems,
        mode: 'subscription',
        success_url: `${APP_URL}/settings?tab=billing&success=true`,
        cancel_url: `${APP_URL}/settings?tab=billing&canceled=true`,
        metadata: {
          type: 'subscription',
          company_id: userData.company_id,
          user_id: user.id,
          plan_id: plan.id,
          plan_slug: plan.slug,
          billing_cycle,
        },
        subscription_data: {
          metadata: {
            company_id: userData.company_id,
            plan_id: plan.id,
            plan_slug: plan.slug,
          },
        },
      });

      return new Response(
        JSON.stringify({ checkout_url: session.url, session_id: session.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREDIT PACK CHECKOUT
    if (type === 'credit_pack') {
      if (!pack_slug) {
        return new Response(
          JSON.stringify({ error: 'Missing pack_slug' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: pack, error: packError } = await supabaseAdmin
        .from('credit_packs')
        .select('*')
        .eq('slug', pack_slug)
        .eq('is_active', true)
        .single();

      if (packError || !pack) {
        return new Response(
          JSON.stringify({ error: 'Credit pack not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create pending purchase record
      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('credit_pack_purchases')
        .insert({
          company_id: userData.company_id,
          user_id: user.id,
          credit_pack_id: pack.id,
          credits: pack.credits,
          amount_paid: pack.price,
          currency: pack.currency || 'EUR',
          status: 'pending',
        })
        .select('id')
        .single();

      if (purchaseError) {
        console.error('Failed to create purchase record:', purchaseError);
        return new Response(
          JSON.stringify({ error: 'Failed to create purchase record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let lineItems;
      if (pack.stripe_price_id) {
        lineItems = [{ price: pack.stripe_price_id, quantity: 1 }];
      } else {
        lineItems = [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: pack.name,
              description: `${pack.credits} credits for iSyncSO`,
            },
            unit_amount: Math.round(pack.price * 100),
          },
          quantity: 1,
        }];
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card', 'ideal'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${APP_URL}/settings?tab=billing&success=true`,
        cancel_url: `${APP_URL}/settings?tab=billing&canceled=true`,
        metadata: {
          type: 'credit_pack',
          company_id: userData.company_id,
          user_id: user.id,
          pack_id: pack.id,
          purchase_id: purchase.id,
          credits: String(pack.credits),
        },
      });

      // Update purchase with session ID
      await supabaseAdmin
        .from('credit_pack_purchases')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', purchase.id);

      return new Response(
        JSON.stringify({ checkout_url: session.url, session_id: session.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('create-checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
