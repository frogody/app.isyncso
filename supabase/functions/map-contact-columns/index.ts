import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { headers: rawHeaders, sampleData, detectedTypes, contactType } = await req.json();

    if (!rawHeaders || !Array.isArray(rawHeaders)) {
      return new Response(
        JSON.stringify({ error: 'Headers array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trim whitespace from headers
    const headers = rawHeaders.map((h: string) => h.trim());

    const TOGETHER_API_KEY = Deno.env.get('TOGETHER_API_KEY');
    if (!TOGETHER_API_KEY) {
      throw new Error('TOGETHER_API_KEY not configured');
    }

    // Build detailed column info for the AI
    const columnInfo = headers.map((h, i) => {
      const samples = sampleData?.[i] || '';
      const detectedType = detectedTypes?.[i] || 'unknown';
      return `- Column "${h}": samples=[${samples}], detected_type=${detectedType}`;
    }).join('\n');

    // Context about the contact type being imported
    const typeContext = contactType ? `
The user is importing ${contactType} contacts. Consider fields relevant to this type:
- leads: focus on source, company, score
- prospects: focus on deal_value, company, stage
- customers: focus on company, deal_value, contract info
- partners: focus on company, partnership details
- candidates: focus on job_title, company (previous employer)
- targets: focus on company, industry, company_size
` : '';

    const prompt = `You are a data mapping assistant. Analyze these spreadsheet column headers and their sample data to suggest mappings to our CRM contact database fields.
${typeContext}
Source columns:
${columnInfo}

Target fields to map to:
- first_name: Contact's first name - Look for "first name", "fname", "voornaam", "first", "given name"
- last_name: Contact's last name - Look for "last name", "lname", "achternaam", "surname", "family name"
- full_name: Full name (will be split) - Look for "name", "full name", "contact name", "naam", "volledige naam"
- email: Email address - Look for "email", "e-mail", "mail", "contact email"
- phone: Phone number - Look for "phone", "tel", "telephone", "mobile", "telefoon", "mobiel"
- company: Company name - Look for "company", "organization", "org", "bedrijf", "organisatie", "werkgever", "employer"
- job_title: Job title/position - Look for "title", "job title", "position", "role", "functie", "rol"
- location: Location/address - Look for "location", "city", "address", "country", "locatie", "stad", "adres"
- website: Website URL - Look for "website", "url", "web", "site"
- linkedin_url: LinkedIn profile - Look for "linkedin", "li_url", "profile"
- source: Lead source - Look for "source", "lead source", "origin", "bron", "herkomst", "channel"
- notes: Notes/comments - Look for "notes", "comments", "description", "notities", "opmerkingen"
- deal_value: Deal/opportunity value - Look for "deal", "value", "amount", "revenue", "omzet", "waarde"
- tags: Tags/labels - Look for "tags", "labels", "categories"
- industry: Industry sector - Look for "industry", "sector", "branche"
- company_size: Company size - Look for "size", "employees", "company size", "medewerkers"
- skip: Use this for columns that shouldn't be imported

IMPORTANT - Common patterns:
- Name columns: "Name", "Contact", "Person", "Naam"
- Email: often contains "@" symbol in samples
- Phone: samples with digits, +, -, ()
- LinkedIn: samples containing "linkedin.com"
- Company: often "Company", "Organization", "Business"

The detected_type field gives hints:
- text = could be name, company, notes
- number = could be deal_value, company_size
- date = skip or custom field
- unknown = analyze sample data

Respond with a valid JSON object:
{
  "mappings": {
    "exact_column_name_from_source": "target_field_id",
    ...
  },
  "confidence": 0.85,
  "suggestedType": "prospect",
  "notes": ["Any observations about the data"]
}

CRITICAL:
1. Use the EXACT column names from the source (including spaces, capitalization)
2. Map to 'full_name' if the column contains both first and last names
3. Prefer 'email' and 'company' as key identifiers
4. If unsure about a column, map to 'skip'
5. If contact type is not specified, suggest one based on the data patterns`;

    console.log('Sending to Together AI for contact column mapping...');

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful CRM data mapping assistant. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Together AI error:', errorText);
      throw new Error(`Together AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let result;
    try {
      // Clean potential markdown code blocks
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return empty mappings as fallback
      result = { mappings: {}, confidence: 0, notes: ['Failed to parse AI response'] };
    }

    console.log('AI contact mapping result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('map-contact-columns error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        mappings: {},
        confidence: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
