import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://app.isyncso.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nest_id, organization_id } = await req.json();

    if (!nest_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: nest_id, organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create client with user's JWT to get user info
    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to the organization
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, email')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ error: 'User does not belong to this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get nest details
    const { data: nest, error: nestError } = await supabaseAdmin
      .from('nests')
      .select('*')
      .eq('id', nest_id)
      .eq('is_active', true)
      .single();

    if (nestError || !nest) {
      return new Response(
        JSON.stringify({ error: 'Nest not found or not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabaseAdmin
      .from('nest_purchases')
      .select('id, status')
      .eq('nest_id', nest_id)
      .eq('organization_id', organization_id)
      .single();

    if (existingPurchase) {
      if (existingPurchase.status === 'completed') {
        return new Response(
          JSON.stringify({ error: 'This nest has already been purchased', already_purchased: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // If pending, we might have a pending Stripe payment - let user retry
    }

    const price = parseFloat(nest.price) || 0;

    // FREE NEST - Complete immediately
    if (price === 0) {
      // Create or update purchase record
      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('nest_purchases')
        .upsert({
          nest_id,
          organization_id,
          purchased_by: user.id,
          price_paid: 0,
          currency: nest.currency || 'USD',
          status: 'completed',
          purchased_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'nest_id,organization_id',
          ignoreDuplicates: false
        })
        .select('id')
        .single();

      if (purchaseError) {
        console.error('Failed to create purchase:', purchaseError);
        return new Response(
          JSON.stringify({ error: 'Failed to create purchase record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Copy nest items to organization
      const { data: copyResult, error: copyError } = await supabaseAdmin.rpc(
        'copy_nest_to_organization',
        {
          p_nest_id: nest_id,
          p_organization_id: organization_id,
          p_purchase_id: purchase.id,
        }
      );

      if (copyError) {
        console.error('Failed to copy nest items:', copyError);
        // Don't fail the purchase, just log the error
      }

      console.log(`Free nest ${nest_id} purchased by org ${organization_id}:`, copyResult);

      return new Response(
        JSON.stringify({
          success: true,
          purchase_id: purchase.id,
          nest_type: nest.nest_type,
          items_copied: copyResult?.copied_count || 0,
          message: 'Nest purchased successfully! Data has been added to your account.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PAID NEST - Create Stripe checkout session
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Payment processing is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create or update pending purchase record
    const { data: pendingPurchase, error: pendingError } = await supabaseAdmin
      .from('nest_purchases')
      .upsert({
        nest_id,
        organization_id,
        purchased_by: user.id,
        price_paid: price,
        currency: nest.currency || 'USD',
        status: 'pending',
        purchased_at: new Date().toISOString(),
      }, {
        onConflict: 'nest_id,organization_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (pendingError) {
      console.error('Failed to create pending purchase:', pendingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create purchase record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (nest.currency || 'USD').toLowerCase(),
            product_data: {
              name: nest.name,
              description: `${nest.nest_type} nest with ${nest.item_count || 0} items`,
              metadata: {
                nest_id,
                nest_type: nest.nest_type,
              },
            },
            unit_amount: Math.round(price * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${APP_URL}/marketplace/nests/${nest_id}?success=true&purchase_id=${pendingPurchase.id}`,
      cancel_url: `${APP_URL}/marketplace/nests/${nest_id}?canceled=true`,
      customer_email: userData.email,
      metadata: {
        nest_id,
        organization_id,
        purchase_id: pendingPurchase.id,
        user_id: user.id,
      },
    });

    // Update purchase record with Stripe session ID
    await supabaseAdmin
      .from('nest_purchases')
      .update({ stripe_payment_intent_id: session.id })
      .eq('id', pendingPurchase.id);

    console.log(`Stripe checkout created for nest ${nest_id}, session: ${session.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        purchase_id: pendingPurchase.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
