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

    // Verify webhook signature if secret is configured
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
      // Parse event without verification (for testing)
      event = JSON.parse(body);
      console.warn('Processing webhook without signature verification');
    }

    console.log(`Processing Stripe event: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if this is a nest purchase
      const metadata = session.metadata || {};
      const { nest_id, organization_id, purchase_id, user_id } = metadata;

      if (!nest_id || !organization_id || !purchase_id) {
        console.log('Not a nest purchase, skipping');
        return new Response(
          JSON.stringify({ received: true, message: 'Not a nest purchase' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Processing nest purchase: ${purchase_id} for nest ${nest_id}`);

      // Verify payment was successful
      if (session.payment_status !== 'paid') {
        console.log(`Payment not completed: ${session.payment_status}`);
        return new Response(
          JSON.stringify({ received: true, message: 'Payment not completed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('nest_purchases')
        .select('*')
        .eq('id', purchase_id)
        .single();

      if (purchaseError || !purchase) {
        console.error('Purchase not found:', purchaseError);
        return new Response(
          JSON.stringify({ error: 'Purchase not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Skip if already completed
      if (purchase.status === 'completed' && purchase.items_copied) {
        console.log('Purchase already completed, skipping');
        return new Response(
          JSON.stringify({ received: true, message: 'Already completed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update purchase status
      const { error: updateError } = await supabase
        .from('nest_purchases')
        .update({
          status: 'completed',
          stripe_payment_intent_id: session.payment_intent as string || session.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', purchase_id);

      if (updateError) {
        console.error('Failed to update purchase:', updateError);
      }

      // Copy nest items to organization
      const { data: copyResult, error: copyError } = await supabase.rpc(
        'copy_nest_to_organization',
        {
          p_nest_id: nest_id,
          p_organization_id: organization_id,
          p_purchase_id: purchase_id,
        }
      );

      if (copyError) {
        console.error('Failed to copy nest items:', copyError);
        // Update purchase to indicate copy failed
        await supabase
          .from('nest_purchases')
          .update({
            items_copied: false,
            metadata: { copy_error: copyError.message }
          })
          .eq('id', purchase_id);
      } else {
        console.log(`Nest items copied successfully:`, copyResult);
      }

      return new Response(
        JSON.stringify({
          received: true,
          purchase_id,
          nest_id,
          items_copied: copyResult?.copied_count || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle payment_intent.payment_failed event
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

      return new Response(
        JSON.stringify({ received: true, message: 'Payment failure recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success for other event types
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
