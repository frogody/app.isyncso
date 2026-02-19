import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      product_id,
      channel,       // 'shopify' | 'bolcom'
      company_id,
      user_id,
      listing_data,  // full listing record
      product_data,  // product info (name, price, sku, etc.)
    } = await req.json();

    if (!product_id || !channel || !company_id) {
      return new Response(
        JSON.stringify({ error: 'product_id, channel, and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- SHOPIFY PUBLISH ---
    if (channel === 'shopify') {
      // Fetch Shopify credentials for this company
      const { data: creds, error: credsError } = await supabase
        .from('shopify_credentials')
        .select('*')
        .eq('company_id', company_id)
        .maybeSingle();

      if (credsError || !creds) {
        return new Response(
          JSON.stringify({ error: 'Shopify not connected. Go to Settings > Integrations to connect your Shopify store.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build Shopify product payload
      const title = listing_data?.listing_title || listing_data?.title || product_data?.name || 'Untitled';
      const bodyHtml = listing_data?.listing_description || listing_data?.description || product_data?.description || '';
      const seoTitle = listing_data?.seo_title || '';
      const seoDescription = listing_data?.seo_description || '';
      const tags = listing_data?.search_keywords?.join(', ') || '';

      // Collect images
      const images: { src: string; position?: number }[] = [];
      if (listing_data?.hero_image_url) {
        images.push({ src: listing_data.hero_image_url, position: 1 });
      }
      if (listing_data?.gallery_urls && Array.isArray(listing_data.gallery_urls)) {
        listing_data.gallery_urls.forEach((url: string, idx: number) => {
          if (url) images.push({ src: url, position: idx + 2 });
        });
      }

      // Build the product object for Shopify
      const shopifyProduct: Record<string, any> = {
        title,
        body_html: bodyHtml,
        tags,
        images,
        metafields: [],
      };

      // Add SEO metafields
      if (seoTitle) {
        shopifyProduct.metafields.push({
          namespace: 'global',
          key: 'title_tag',
          value: seoTitle,
          type: 'single_line_text_field',
        });
      }
      if (seoDescription) {
        shopifyProduct.metafields.push({
          namespace: 'global',
          key: 'description_tag',
          value: seoDescription,
          type: 'single_line_text_field',
        });
      }

      // Add price if available
      if (product_data?.price) {
        shopifyProduct.variants = [{
          price: String(product_data.price),
          sku: product_data?.sku || '',
          inventory_management: 'shopify',
        }];
      }

      // Call Shopify API
      const shopifyApiUrl = `${SUPABASE_URL}/functions/v1/shopify-api`;
      const shopifyResp = await fetch(shopifyApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'createProduct',
          company_id,
          product: shopifyProduct,
        }),
      });

      const shopifyResult = await shopifyResp.json();

      if (!shopifyResp.ok || shopifyResult?.error) {
        console.error('[publish-listing] Shopify error:', shopifyResult);
        return new Response(
          JSON.stringify({
            error: 'Failed to publish to Shopify',
            details: shopifyResult?.error || shopifyResult?.details || 'Unknown error',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const externalId = shopifyResult?.product?.id || shopifyResult?.id;
      const externalUrl = creds.shop_domain
        ? `https://${creds.shop_domain}/admin/products/${externalId}`
        : null;

      // Update listing record with publish info
      await supabase
        .from('product_listings')
        .update({
          published_at: new Date().toISOString(),
          external_id: String(externalId || ''),
          external_url: externalUrl,
          publish_status: 'published',
          publish_error: null,
        })
        .eq('product_id', product_id)
        .eq('channel', 'shopify');

      return new Response(
        JSON.stringify({
          success: true,
          channel: 'shopify',
          external_id: externalId,
          external_url: externalUrl,
          message: 'Successfully published to Shopify',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- BOL.COM PUBLISH ---
    if (channel === 'bolcom') {
      // Fetch bol.com credentials
      const { data: creds, error: credsError } = await supabase
        .from('bolcom_credentials')
        .select('*')
        .eq('company_id', company_id)
        .maybeSingle();

      if (credsError || !creds) {
        return new Response(
          JSON.stringify({ error: 'bol.com not connected. Go to Settings > Integrations to connect your bol.com account.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ean = product_data?.ean || product_data?.barcode || listing_data?.ean || '';
      if (!ean) {
        return new Response(
          JSON.stringify({ error: 'EAN/barcode is required for bol.com listings. Add it in the product details.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build bol.com offer
      const bolcomOffer: Record<string, any> = {
        ean,
        condition: { name: 'NEW' },
        pricing: {
          bundlePrices: [{
            quantity: 1,
            unitPrice: product_data?.price || 0,
          }],
        },
        stock: {
          amount: product_data?.stock_quantity || product_data?.quantity || 1,
          managedByRetailer: true,
        },
        fulfilment: {
          method: 'FBR',
          deliveryCode: '1-2d',
        },
      };

      // Call bol.com API to create offer
      const bolApiUrl = `${SUPABASE_URL}/functions/v1/bolcom-api`;
      const bolResp = await fetch(bolApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'createOffer',
          company_id,
          offer: bolcomOffer,
        }),
      });

      const bolResult = await bolResp.json();

      if (!bolResp.ok || bolResult?.error) {
        console.error('[publish-listing] bol.com error:', bolResult);
        return new Response(
          JSON.stringify({
            error: 'Failed to publish to bol.com',
            details: bolResult?.error || bolResult?.details || 'Unknown error',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Push images to bol.com Content API
      const imagesToPush: string[] = [];
      if (listing_data?.hero_image_url) imagesToPush.push(listing_data.hero_image_url);
      if (listing_data?.gallery_urls && Array.isArray(listing_data.gallery_urls)) {
        listing_data.gallery_urls.forEach((url: string) => {
          if (url) imagesToPush.push(url);
        });
      }

      let imagesPushed = 0;
      if (imagesToPush.length > 0 && ean) {
        // Get auth token for bol.com Content API
        const tokenResp = await fetch('https://login.bol.com/token?grant_type=client_credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${creds.client_id}:${creds.client_secret}`),
          },
        });

        if (tokenResp.ok) {
          const tokenData = await tokenResp.json();
          const accessToken = tokenData.access_token;

          for (const imageUrl of imagesToPush.slice(0, 8)) {
            try {
              const imgResp = await fetch(`https://api.bol.com/retailer/content/products/${ean}/images`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/vnd.retailer.v10+json',
                },
                body: JSON.stringify({
                  url: imageUrl,
                }),
              });
              if (imgResp.ok || imgResp.status === 202) {
                imagesPushed++;
              } else {
                console.warn(`[publish-listing] bol.com image push failed for ${imageUrl}:`, await imgResp.text());
              }
            } catch (imgErr) {
              console.warn(`[publish-listing] bol.com image push error:`, imgErr);
            }
          }
        }
      }

      const offerId = bolResult?.offerId || bolResult?.processStatusId || '';
      const externalUrl = `https://www.bol.com/nl/nl/p/-/${ean}/`;

      // Update listing record
      await supabase
        .from('product_listings')
        .update({
          published_at: new Date().toISOString(),
          external_id: String(offerId),
          external_url: externalUrl,
          publish_status: 'published',
          publish_error: null,
        })
        .eq('product_id', product_id)
        .eq('channel', 'bolcom');

      return new Response(
        JSON.stringify({
          success: true,
          channel: 'bolcom',
          external_id: offerId,
          external_url: externalUrl,
          images_pushed: imagesPushed,
          message: `Published to bol.com${imagesPushed > 0 ? ` with ${imagesPushed} images` : ''}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unsupported channel: ${channel}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[publish-listing] error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
