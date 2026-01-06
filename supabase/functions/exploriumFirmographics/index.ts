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
    const { companyName, domain } = await req.json()

    // Get Explorium API key from environment
    const exploriumApiKey = Deno.env.get('EXPLORIUM_API_KEY')

    if (!exploriumApiKey) {
      return new Response(
        JSON.stringify({ error: 'Explorium API key not configured', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Build search query
    const searchParams: Record<string, string> = {}
    if (domain) searchParams.domain = domain
    if (companyName) searchParams.company_name = companyName

    if (Object.keys(searchParams).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Either companyName or domain is required', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Call Explorium Firmographics API
    const response = await fetch('https://api.explorium.ai/v1/businesses/match', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${exploriumApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...searchParams,
        enrich: true,
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
