import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    if (STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      event = JSON.parse(body);
      console.warn('Processing webhook without signature verification');
    }

    console.log(`Processing Stripe event: ${event.type}`);

    // ─── checkout.session.completed ───────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      // Route by metadata.type
      if (metadata.type === 'subscription') {
        return await handleSubscriptionCheckout(supabase, session, metadata);
      }

      if (metadata.type === 'credit_pack') {
        return await handleCreditPackCheckout(supabase, session, metadata);
      }

      // Legacy: nest purchase (no metadata.type, uses nest_id)
      if (metadata.nest_id) {
        return await handleNestPurchaseCheckout(supabase, session, metadata);
      }

      console.log('Checkout completed but no recognized type in metadata');
      return jsonResponse({ received: true, message: 'Unrecognized checkout type' });
    }

    // ─── customer.subscription.updated ───────────────────────
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.company_id;

      if (companyId) {
        await supabase
          .from('company_subscriptions')
          .update({
            status: subscription.status === 'active' ? 'active' : subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);

        console.log(`Subscription updated for company ${companyId}: ${subscription.status}`);
      }

      return jsonResponse({ received: true });
    }

    // ─── customer.subscription.deleted ───────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.company_id;

      if (companyId) {
        await supabase
          .from('company_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);

        // Deactivate app licenses
        await supabase
          .from('app_licenses')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('company_id', companyId)
          .eq('source', 'subscription');

        console.log(`Subscription canceled for company ${companyId}`);
      }

      return jsonResponse({ received: true });
    }

    // ─── invoice.paid ────────────────────────────────────────
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        // Find the company subscription
        const { data: sub } = await supabase
          .from('company_subscriptions')
          .select('company_id, plan_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub) {
          // Insert invoice record
          await supabase.from('invoices').insert({
            company_id: sub.company_id,
            stripe_invoice_id: invoice.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency?.toUpperCase() || 'EUR',
            status: 'paid',
            invoice_date: new Date((invoice.created || 0) * 1000).toISOString(),
            paid_at: new Date().toISOString(),
            invoice_url: invoice.hosted_invoice_url || null,
            invoice_pdf: invoice.invoice_pdf || null,
          });

          // Reset monthly credits for the plan
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('limits')
            .eq('id', sub.plan_id)
            .single();

          if (plan?.limits?.credits_monthly) {
            // Get all users in this company and add monthly credits
            const { data: companyUsers } = await supabase
              .from('users')
              .select('id')
              .eq('company_id', sub.company_id);

            if (companyUsers?.length) {
              // Add credits to each user (distributed evenly or to all)
              for (const u of companyUsers) {
                await supabase.rpc('add_credits', {
                  p_user_id: u.id,
                  p_amount: Math.floor(plan.limits.credits_monthly / companyUsers.length),
                  p_reason: 'monthly_subscription_renewal',
                  p_source_type: 'subscription',
                });
              }
            }
          }

          console.log(`Invoice paid for company ${sub.company_id}: ${invoice.id}`);
        }
      }

      return jsonResponse({ received: true });
    }

    // ─── invoice.payment_failed ──────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        await supabase
          .from('company_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`Payment failed for subscription ${subscriptionId}`);
      }

      return jsonResponse({ received: true });
    }

    // ─── payment_intent.payment_failed (legacy nest) ─────────
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata || {};
      const { purchase_id } = metadata;

      if (purchase_id) {
        await supabase
          .from('nest_purchases')
          .update({
            status: 'failed',
            metadata: {
              failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
            }
          })
          .eq('id', purchase_id);

        console.log(`Purchase ${purchase_id} marked as failed`);
      }

      return jsonResponse({ received: true });
    }

    return jsonResponse({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ─── Helper: JSON response ──────────────────────────────────
function jsonResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─── Handler: Subscription checkout ─────────────────────────
async function handleSubscriptionCheckout(
  supabase: any,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { company_id, user_id, plan_id, plan_slug, billing_cycle } = metadata;

  if (!company_id || !plan_id) {
    console.error('Missing company_id or plan_id in subscription metadata');
    return jsonResponse({ received: true, error: 'Missing metadata' });
  }

  // Get the Stripe subscription ID from the session
  const stripeSubscriptionId = session.subscription as string;

  // Upsert company_subscriptions
  await supabase
    .from('company_subscriptions')
    .upsert({
      company_id,
      plan_id,
      status: 'active',
      billing_cycle: billing_cycle || 'monthly',
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: session.customer as string,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 86400000).toISOString(),
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

  // Get plan details for app licensing
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('limits, name')
    .eq('id', plan_id)
    .single();

  // Sync app licenses based on plan
  if (plan?.limits?.apps && Array.isArray(plan.limits.apps)) {
    // Deactivate old subscription licenses
    await supabase
      .from('app_licenses')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('company_id', company_id)
      .eq('source', 'subscription');

    // Create new licenses for plan's apps
    for (const appSlug of plan.limits.apps) {
      await supabase
        .from('app_licenses')
        .upsert({
          company_id,
          app_slug: appSlug,
          is_active: true,
          source: 'subscription',
          granted_by: user_id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,app_slug' });
    }
  }

  // Add initial monthly credits
  if (plan?.limits?.credits_monthly) {
    const { data: companyUsers } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', company_id);

    if (companyUsers?.length) {
      for (const u of companyUsers) {
        await supabase.rpc('add_credits', {
          p_user_id: u.id,
          p_amount: Math.floor(plan.limits.credits_monthly / companyUsers.length),
          p_reason: 'subscription_activated',
          p_source_type: 'subscription',
        });
      }
    }
  }

  console.log(`Subscription activated for company ${company_id}: plan ${plan_slug}`);
  return jsonResponse({ received: true, company_id, plan_slug });
}

// ─── Handler: Credit pack checkout ──────────────────────────
async function handleCreditPackCheckout(
  supabase: any,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { company_id, user_id, pack_id, purchase_id, credits } = metadata;

  if (!user_id || !credits || !purchase_id) {
    console.error('Missing metadata in credit pack checkout');
    return jsonResponse({ received: true, error: 'Missing metadata' });
  }

  // Verify payment was successful
  if (session.payment_status !== 'paid') {
    console.log(`Credit pack payment not completed: ${session.payment_status}`);
    return jsonResponse({ received: true, message: 'Payment not completed' });
  }

  // Add credits to user
  await supabase.rpc('add_credits', {
    p_user_id: user_id,
    p_amount: parseInt(credits),
    p_reason: 'credit_pack_purchase',
    p_source_type: 'purchase',
  });

  // Update purchase record
  await supabase
    .from('credit_pack_purchases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', purchase_id);

  console.log(`Credit pack completed: ${credits} credits added to user ${user_id}`);
  return jsonResponse({ received: true, credits_added: parseInt(credits) });
}

// ─── Handler: Nest purchase checkout (legacy) ───────────────
async function handleNestPurchaseCheckout(
  supabase: any,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { nest_id, organization_id, purchase_id, user_id } = metadata;

  if (!nest_id || !organization_id || !purchase_id) {
    console.log('Missing nest purchase metadata');
    return jsonResponse({ received: true, message: 'Missing nest metadata' });
  }

  if (session.payment_status !== 'paid') {
    return jsonResponse({ received: true, message: 'Payment not completed' });
  }

  // Get purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('nest_purchases')
    .select('*')
    .eq('id', purchase_id)
    .single();

  if (purchaseError || !purchase) {
    console.error('Purchase not found:', purchaseError);
    return jsonResponse({ error: 'Purchase not found' }, 404);
  }

  if (purchase.status === 'completed' && purchase.items_copied) {
    return jsonResponse({ received: true, message: 'Already completed' });
  }

  // Update purchase status
  await supabase
    .from('nest_purchases')
    .update({
      status: 'completed',
      stripe_payment_intent_id: session.payment_intent as string || session.id,
      completed_at: new Date().toISOString(),
    })
    .eq('id', purchase_id);

  // Copy nest items
  const { data: copyResult, error: copyError } = await supabase.rpc(
    'copy_nest_to_organization',
    { p_nest_id: nest_id, p_organization_id: organization_id, p_purchase_id: purchase_id }
  );

  if (copyError) {
    console.error('Failed to copy nest items:', copyError);
    await supabase
      .from('nest_purchases')
      .update({ items_copied: false, metadata: { copy_error: copyError.message } })
      .eq('id', purchase_id);
  }

  return jsonResponse({
    received: true,
    purchase_id,
    nest_id,
    items_copied: copyResult?.copied_count || 0,
  });
}
