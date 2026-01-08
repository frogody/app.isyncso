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
    const { headers, sampleData } = await req.json();

    if (!headers || !Array.isArray(headers)) {
      return new Response(
        JSON.stringify({ error: 'Headers array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TOGETHER_API_KEY = Deno.env.get('TOGETHER_API_KEY');
    if (!TOGETHER_API_KEY) {
      throw new Error('TOGETHER_API_KEY not configured');
    }

    const prompt = `You are a data mapping assistant. Analyze these spreadsheet column headers and their sample data to suggest mappings to our product database fields.

Source columns (with sample values):
${headers.map((h, i) => `- "${h}": "${sampleData?.[i] || ''}"`).join('\n')}

Target fields to map to:
- name: Product name/title (required) - Look for columns like "product", "name", "item", "artikel", "artikelnaam"
- purchase_price: Unit cost/price (required) - Look for columns with "price", "prijs", "cost", "kosten", currency symbols
- quantity: Stock quantity (required) - Look for columns with "qty", "quantity", "aantal", "stock", "ontvangen"
- ean: EAN/GTIN barcode (13 digits) - Look for columns with "ean", "gtin", "barcode", or 13-digit numbers
- sku: Internal product code - Look for columns with "sku", "code", "artikelnummer"
- supplier: Supplier/vendor name - Look for columns with "supplier", "vendor", "leverancier"
- purchase_date: Purchase date - Look for columns with "date", "datum"
- order_number: Order/invoice reference - Look for columns with "order", "invoice", "bestelling"
- category: Product category - Look for columns with "category", "categorie", "type"

Important considerations:
- Column names may be in Dutch, German, French, or other languages
- Price columns often have currency symbols (€, $) and use comma as decimal separator
- If a column contains mixed data (like order numbers AND EAN codes), only map it if the majority are EANs
- "Aantal ontvangen" (quantity received) is better for quantity than "Aantal ingekocht" (quantity ordered)
- Be conservative - only map columns you're confident about

Respond with a valid JSON object:
{
  "mappings": {
    "source_column_exact_name": "target_field",
    ...
  },
  "transformations": {
    "purchase_price": { "type": "european_currency" },
    "purchase_date": { "type": "date", "format": "DD/MM/YYYY" }
  },
  "confidence": 0.85,
  "notes": ["Any observations about the data"]
}

Only include mappings you're reasonably confident about (>70% certainty).`;

    console.log('Sending to Together AI for column mapping...');

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
            content: 'You are a helpful data mapping assistant. Always respond with valid JSON only, no markdown formatting.'
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

    console.log('AI mapping result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('map-import-columns error:', error);

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
