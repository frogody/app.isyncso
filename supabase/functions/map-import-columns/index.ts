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
    const { headers, sampleData, detectedTypes } = await req.json();

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

    // Build detailed column info for the AI
    const columnInfo = headers.map((h, i) => {
      const samples = sampleData?.[i] || '';
      const detectedType = detectedTypes?.[i] || 'unknown';
      return `- Column "${h}": samples=[${samples}], detected_type=${detectedType}`;
    }).join('\n');

    const prompt = `You are a data mapping assistant. Analyze these spreadsheet column headers and their sample data to suggest mappings to our product database fields.

Source columns:
${columnInfo}

Target fields to map to:
- name: Product name/title (REQUIRED) - Look for columns like "product", "name", "item", "artikel", "artikelnaam", "productnaam"
- purchase_price: Unit cost/price (REQUIRED) - Look for columns with "price", "prijs", "cost", "kosten", "per stuk", "stukprijs", currency symbols like €
- quantity: Stock quantity (REQUIRED) - Look for columns with "qty", "quantity", "aantal", "stock", "ontvangen", "received"
- ean: EAN/GTIN barcode (8-13 digits) - Look for columns with "ean", "gtin", "barcode", or 8-13 digit numbers
- sku: Internal product code - Look for columns with "sku", "code", "artikelnummer", "artikel nr"
- supplier: Supplier/vendor name - Look for columns with "supplier", "vendor", "leverancier"
- purchase_date: Purchase date - Look for columns with "date", "datum", "inkoop"
- order_number: Order/invoice reference - Look for columns with "order", "invoice", "bestelling", "bestelnummer"
- category: Product category - Look for columns with "category", "categorie", "type"

IMPORTANT - Dutch terms:
- "Artikelnaam" = Product name (name)
- "Prijs per stuk" or "stukprijs" or "prijs (ex btw)" = Unit price (purchase_price)
- "Aantal ontvangen" or "ontvangen" = Quantity received (quantity) - PREFER this over "aantal ingekocht"
- "Aantal ingekocht" = Quantity ordered (less preferred for quantity)
- "Leverancier" = Supplier (supplier)
- "Datum inkoop" = Purchase date (purchase_date)
- "Bestelnummer" = Order number (order_number)

The detected_type field gives hints:
- currency = price field (likely purchase_price)
- number = could be quantity or price
- barcode = EAN/GTIN
- date = date field
- text = name, supplier, or other text

Respond with a valid JSON object:
{
  "mappings": {
    "exact_column_name_from_source": "target_field_id",
    ...
  },
  "confidence": 0.85,
  "notes": ["Any observations about the data"]
}

CRITICAL: Use the EXACT column names from the source (including spaces, capitalization). Map all required fields if possible.`;

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
