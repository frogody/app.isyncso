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

    // Support both formats: { contacts: [...] } and { email, linkedinUrl, ... }
    interface ContactToMatch {
      email?: string | null
      linkedin_url?: string | null
      full_name?: string | null
      company_name?: string | null
      company_domain?: string | null
    }

    let contactsToMatch: ContactToMatch[] = []

    if (body.contacts && Array.isArray(body.contacts)) {
      // Frontend sends { contacts: [{ email, linkedin_url, full_name, company_name }] }
      contactsToMatch = body.contacts.map((c: any) => ({
        email: c.email || null,
        linkedin_url: c.linkedin_url || null,
        full_name: c.full_name || null,
        company_name: c.company_name || null,
        company_domain: c.company_domain || c.domain || null
      }))
    } else if (body.email || body.linkedinUrl || body.fullName || body.companyName) {
      // Direct format { email, linkedinUrl, fullName, companyName, domain }
      contactsToMatch = [{
        email: body.email || null,
        linkedin_url: body.linkedinUrl || null,
        full_name: body.fullName || null,
        company_name: body.companyName || null,
        company_domain: body.domain || null
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

    if (contactsToMatch.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one contact with search parameters is required', data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Call Explorium People API - first match the contact
    const matchResponse = await fetch('https://api.explorium.ai/v1/contacts/match', {
      method: 'POST',
      headers: {
        'API_KEY': exploriumApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contacts_to_match: contactsToMatch
      }),
    })

    if (!matchResponse.ok) {
      const errorText = await matchResponse.text()
      console.error('Explorium contact match error:', matchResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Explorium match error: ${matchResponse.status}`, data: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const matchData = await matchResponse.json()
    const contactIds = matchData.matched_contacts?.map((c: any) => c.contact_id) || []

    if (contactIds.length === 0) {
      return new Response(
        JSON.stringify({ error: null, data: [], message: 'No matching contacts found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Now enrich the matched contacts
    const response = await fetch('https://api.explorium.ai/v1/contacts/enrich', {
      method: 'POST',
      headers: {
        'api_key': exploriumApiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contact_ids: contactIds
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
