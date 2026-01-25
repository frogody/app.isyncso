import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Target fields for each nest type
const NEST_TARGET_FIELDS = {
  candidates: [
    { id: 'first_name', label: 'First Name', description: 'Person\'s first name', patterns: ['first_name', 'fname', 'voornaam', 'first', 'given name'] },
    { id: 'last_name', label: 'Last Name', description: 'Person\'s last name', patterns: ['last_name', 'lname', 'achternaam', 'surname', 'family name'] },
    { id: 'email', label: 'Email', description: 'Email address', patterns: ['email', 'e-mail', 'mail'] },
    { id: 'phone', label: 'Phone', description: 'Phone number', patterns: ['phone', 'tel', 'telephone', 'mobile', 'telefoon'] },
    { id: 'job_title', label: 'Job Title', description: 'Current job title/position', patterns: ['job_title', 'title', 'position', 'role', 'functie'] },
    { id: 'company_name', label: 'Company', description: 'Current employer', patterns: ['company', 'company_name', 'employer', 'organization', 'bedrijf'] },
    { id: 'linkedin_profile', label: 'LinkedIn URL', description: 'LinkedIn profile URL', patterns: ['linkedin', 'linkedin_profile', 'li_url'] },
    { id: 'person_home_location', label: 'Location', description: 'Home location/city', patterns: ['location', 'city', 'home location', 'person home location', 'locatie'] },
    { id: 'skills', label: 'Skills', description: 'Technical or professional skills', patterns: ['skills', 'expertise', 'competencies'] },
    { id: 'years_experience', label: 'Years Experience', description: 'Total years of experience', patterns: ['years_experience', 'experience', 'years with current company'] },
    { id: 'education', label: 'Education', description: 'Educational background', patterns: ['education', 'degree', 'school', 'university'] },
    { id: 'salary_range', label: 'Salary Range', description: 'Expected or current salary', patterns: ['salary', 'salary_range', 'compensation', 'salary intelligence'] },
    { id: 'industry', label: 'Industry', description: 'Industry sector', patterns: ['industry', 'sector', 'branche'] },
    { id: 'company_size', label: 'Company Size', description: 'Size of employer', patterns: ['company_size', 'company size', 'employees', 'employee count'] },
    { id: 'profile_image_url', label: 'Profile Image', description: 'Profile photo URL', patterns: ['image', 'photo', 'avatar', 'profile_image'] },
  ],
  prospects: [
    { id: 'first_name', label: 'First Name', description: 'Person\'s first name', patterns: ['first_name', 'fname', 'first'] },
    { id: 'last_name', label: 'Last Name', description: 'Person\'s last name', patterns: ['last_name', 'lname', 'surname'] },
    { id: 'email', label: 'Email', description: 'Email address', patterns: ['email', 'e-mail', 'mail'] },
    { id: 'phone', label: 'Phone', description: 'Phone number', patterns: ['phone', 'tel', 'mobile'] },
    { id: 'company', label: 'Company', description: 'Company name', patterns: ['company', 'company_name', 'organization'] },
    { id: 'job_title', label: 'Job Title', description: 'Job title/position', patterns: ['job_title', 'title', 'position', 'role'] },
    { id: 'linkedin_url', label: 'LinkedIn URL', description: 'LinkedIn profile', patterns: ['linkedin', 'linkedin_url', 'li_url'] },
    { id: 'industry', label: 'Industry', description: 'Industry sector', patterns: ['industry', 'sector'] },
    { id: 'deal_value', label: 'Deal Value', description: 'Potential deal value', patterns: ['deal_value', 'value', 'revenue', 'opportunity'] },
    { id: 'website', label: 'Website', description: 'Company website', patterns: ['website', 'url', 'domain', 'company domain'] },
    { id: 'company_size', label: 'Company Size', description: 'Company size', patterns: ['company_size', 'size', 'employees'] },
    { id: 'location', label: 'Location', description: 'Location/city', patterns: ['location', 'city', 'address', 'hq'] },
    { id: 'contact_type', label: 'Contact Type', description: 'Type of contact', patterns: ['type', 'contact_type', 'lead_type'] },
  ],
  investors: [
    { id: 'name', label: 'Name', description: 'Investor name', patterns: ['name', 'investor_name', 'full_name'] },
    { id: 'firm', label: 'Firm', description: 'Investment firm', patterns: ['firm', 'fund', 'company', 'vc_firm'] },
    { id: 'email', label: 'Email', description: 'Email address', patterns: ['email', 'e-mail', 'mail'] },
    { id: 'investor_type', label: 'Investor Type', description: 'Type of investor (VC, Angel, etc)', patterns: ['type', 'investor_type', 'category'] },
    { id: 'check_size_min', label: 'Min Check Size', description: 'Minimum investment', patterns: ['min', 'minimum', 'check_size_min', 'min_investment'] },
    { id: 'check_size_max', label: 'Max Check Size', description: 'Maximum investment', patterns: ['max', 'maximum', 'check_size_max', 'max_investment'] },
    { id: 'focus_areas', label: 'Focus Areas', description: 'Investment focus areas', patterns: ['focus', 'focus_areas', 'sectors', 'industries', 'thesis'] },
    { id: 'linkedin', label: 'LinkedIn URL', description: 'LinkedIn profile', patterns: ['linkedin', 'li_url', 'profile'] },
    { id: 'website', label: 'Website', description: 'Firm website', patterns: ['website', 'url', 'web'] },
    { id: 'location', label: 'Location', description: 'Location/HQ', patterns: ['location', 'city', 'hq', 'headquarters'] },
    { id: 'portfolio', label: 'Portfolio', description: 'Portfolio companies', patterns: ['portfolio', 'investments', 'companies'] },
  ]
};

function buildPromptForNestType(nestType: string, columnInfo: string): string {
  const fields = NEST_TARGET_FIELDS[nestType as keyof typeof NEST_TARGET_FIELDS] || NEST_TARGET_FIELDS.candidates;

  const targetFieldsList = fields.map(f =>
    `- ${f.id}: ${f.description} - Look for: "${f.patterns.join('", "')}"`
  ).join('\n');

  const typeSpecificContext = {
    candidates: `You are mapping recruitment/talent data. Prioritize:
1. Name fields (first_name, last_name)
2. Contact info (email, phone, linkedin_profile)
3. Professional info (job_title, company_name, location)
4. Skills and experience data
5. Salary information if available

IMPORTANT: Many columns may be enrichment/analysis data (like "Job Satisfaction Analysis", "Recruitment Urgency", etc.) - map these to 'skip' unless they clearly match a target field.`,

    prospects: `You are mapping sales/CRM prospect data. Prioritize:
1. Name and contact fields
2. Company information
3. Deal value and opportunity data
4. Industry and company size for segmentation`,

    investors: `You are mapping investor/fundraising data. Prioritize:
1. Investor name and firm
2. Contact information
3. Investment parameters (check size, focus areas)
4. Fund type (VC, Angel, PE, etc.)`
  };

  return `You are a data mapping assistant for a nest upload system. Analyze these spreadsheet column headers and their sample data to suggest mappings to our ${nestType} database fields.

${typeSpecificContext[nestType as keyof typeof typeSpecificContext] || ''}

Source columns with sample data:
${columnInfo}

Target fields to map to:
${targetFieldsList}
- skip: Use this for columns that shouldn't be imported (analysis reports, enrichment data, etc.)

IMPORTANT - Mapping rules:
1. Use the EXACT column names from the source (including spaces, capitalization, underscores)
2. If a column name or its samples clearly match a target field, map it
3. If unsure or the column contains analysis/enrichment data, map to 'skip'
4. LinkedIn URLs should map to the linkedin field for this type
5. Columns with long text analysis reports should be skipped
6. Multiple columns may contain similar data - pick the most direct match

Respond with a valid JSON object:
{
  "mappings": {
    "exact_column_name_from_source": "target_field_id",
    ...
  },
  "confidence": 0.85,
  "notes": ["Any observations about the data mapping"]
}

CRITICAL: Return ONLY valid JSON, no markdown code blocks or extra text.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { headers: rawHeaders, sampleData, detectedTypes, nestType } = await req.json();

    if (!rawHeaders || !Array.isArray(rawHeaders)) {
      return new Response(
        JSON.stringify({ error: 'Headers array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!nestType || !['candidates', 'prospects', 'investors'].includes(nestType)) {
      return new Response(
        JSON.stringify({ error: 'Valid nestType is required (candidates, prospects, investors)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = rawHeaders.map((h: string) => h.trim());

    const TOGETHER_API_KEY = Deno.env.get('TOGETHER_API_KEY');
    if (!TOGETHER_API_KEY) {
      throw new Error('TOGETHER_API_KEY not configured');
    }

    // Build detailed column info for the AI
    const columnInfo = headers.map((h, i) => {
      const samples = sampleData?.[i] || '';
      const detectedType = detectedTypes?.[i] || 'unknown';
      // Truncate long samples
      const truncatedSamples = samples.length > 100 ? samples.substring(0, 100) + '...' : samples;
      return `- Column "${h}": samples=[${truncatedSamples}], type=${detectedType}`;
    }).join('\n');

    const prompt = buildPromptForNestType(nestType, columnInfo);

    console.log(`Mapping columns for ${nestType} nest with ${headers.length} columns...`);

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
            content: 'You are a helpful data mapping assistant. Always respond with valid JSON only, no markdown formatting or code blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
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
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      result = { mappings: {}, confidence: 0, notes: ['Failed to parse AI response'] };
    }

    // Add target fields info for the UI
    result.targetFields = NEST_TARGET_FIELDS[nestType as keyof typeof NEST_TARGET_FIELDS];

    console.log(`AI mapping result for ${nestType}:`, Object.keys(result.mappings || {}).length, 'columns mapped');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('map-nest-columns error:', error);

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
