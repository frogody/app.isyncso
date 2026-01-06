import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Support both formats: { businesses: [...] } and { companyName, domain }
    let businessesToMatch: { name?: string | null; domain?: string | null }[] = []

    if (body.businesses && Array.isArray(body.businesses)) {
      // Frontend sends { businesses: [{ name, domain }] }
      businessesToMatch = body.businesses.map((b: any) => ({
        name: b.name || null,
        domain: b.domain || null
      }))
    } else if (body.companyName || body.domain) {
      // Direct format { companyName, domain }
      businessesToMatch = [{
        name: body.companyName || null,
        domain: body.domain || null
      }]
    }

    // Get Explorium API key from environment
    const exploriumApiKey = Deno.env.get('EXPLORIUM_API_KEY')

    if (!exploriumApiKey) {
      return new Response(
        JSON.stringify({ error: 'Explorium API key not configured', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (businessesToMatch.length === 0 || (!businessesToMatch[0].name && !businessesToMatch[0].domain)) {
      return new Response(
        JSON.stringify({ error: 'Either companyName/name or domain is required', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Call Explorium Firmographics API - first match the business
    const matchResponse = await fetch('https://api.explorium.ai/v1/businesses/match', {
      method: 'POST',
      headers: {
        'API_KEY': exploriumApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businesses_to_match: businessesToMatch
      }),
    })

    if (!matchResponse.ok) {
      const errorText = await matchResponse.text()
      console.error('Explorium match error:', matchResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Explorium match error: ${matchResponse.status}`, data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const matchData = await matchResponse.json()
    const businessIds = matchData.matched_businesses?.map((b: any) => b.business_id) || []

    if (businessIds.length === 0) {
      return new Response(
        JSON.stringify({ error: null, data: [], message: 'No matching businesses found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Now enrich the matched businesses
    const response = await fetch('https://api.explorium.ai/v1/businesses/firmographics/bulk_enrich', {
      method: 'POST',
      headers: {
        'api_key': exploriumApiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        business_ids: businessIds
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Explorium API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ error: `Explorium API error: ${response.status}`, data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({ data, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message, data: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
