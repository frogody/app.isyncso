import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Target fields for each nest type
const NEST_TARGET_FIELDS = {
  candidates: [
    // Person basic info
    { id: 'first_name', label: 'First Name', description: 'Person\'s first name', patterns: ['first_name', 'fname', 'voornaam', 'first', 'given name', 'given_name'] },
    { id: 'last_name', label: 'Last Name', description: 'Person\'s last name', patterns: ['last_name', 'lname', 'achternaam', 'surname', 'family name', 'family_name'] },
    { id: 'email', label: 'Email', description: 'Person\'s email address', patterns: ['email', 'e-mail', 'mail', 'personal email', 'work email'] },
    { id: 'phone', label: 'Phone', description: 'Phone number', patterns: ['phone', 'tel', 'telephone', 'mobile', 'telefoon', 'cell'] },
    { id: 'linkedin_profile', label: 'LinkedIn Profile', description: 'Person\'s LinkedIn profile URL (NOT company LinkedIn)', patterns: ['linkedin_profile', 'person linkedin', 'personal linkedin', 'candidate linkedin', 'li_url', 'linkedin url'] },
    { id: 'profile_image_url', label: 'Profile Image', description: 'Profile photo URL', patterns: ['image', 'photo', 'avatar', 'profile_image', 'headshot', 'picture'] },

    // Person professional info
    { id: 'job_title', label: 'Job Title', description: 'Current job title/position', patterns: ['job_title', 'title', 'position', 'role', 'functie', 'job title'] },
    { id: 'skills', label: 'Skills', description: 'Technical or professional skills', patterns: ['skills', 'expertise', 'competencies', 'technologies', 'tech stack'] },
    { id: 'years_experience', label: 'Years Experience', description: 'Total years of professional experience or years at current company', patterns: ['years_experience', 'experience', 'years with current company', 'tenure', 'work experience', 'years of experience'] },
    { id: 'education', label: 'Education', description: 'Educational background, degrees, schools', patterns: ['education', 'degree', 'school', 'university', 'college', 'qualification'] },
    { id: 'salary_range', label: 'Salary Range', description: 'Expected or current salary/compensation', patterns: ['salary', 'salary_range', 'compensation', 'salary intelligence', 'pay', 'remuneration'] },

    // Person location
    { id: 'person_home_location', label: 'Person Location', description: 'Person\'s home location/city', patterns: ['person home location', 'home location', 'person location', 'candidate location', 'locatie'] },
    { id: 'work_address', label: 'Work Address', description: 'Person\'s work/office address', patterns: ['work address', 'office address', 'business address', 'work location'] },

    // Company info
    { id: 'company_name', label: 'Company Name', description: 'Current employer/company name', patterns: ['company', 'company_name', 'company name', 'employer', 'organization', 'bedrijf', 'current company'] },
    { id: 'company_domain', label: 'Company Domain', description: 'Company website domain', patterns: ['company domain', 'domain', 'company website', 'website', 'company url'] },
    { id: 'company_hq', label: 'Company HQ', description: 'Company headquarters location', patterns: ['company hq', 'headquarters', 'hq', 'company location', 'office location'] },
    { id: 'company_linkedin', label: 'Company LinkedIn', description: 'Company\'s LinkedIn page URL (NOT person\'s profile)', patterns: ['company linkedin', 'company_linkedin', 'company li', 'employer linkedin', 'organization linkedin'] },
    { id: 'company_description', label: 'Company Description', description: 'Description of the company', patterns: ['description', 'company description', 'about company', 'company bio', 'company overview'] },
    { id: 'company_type', label: 'Company Type', description: 'Type of company (Private, Public, etc)', patterns: ['type', 'company type', 'organization type', 'business type', 'privately held', 'public'] },
    { id: 'industry', label: 'Industry', description: 'Industry sector', patterns: ['industry', 'sector', 'branche', 'vertical', 'market'] },
    { id: 'company_size', label: 'Company Size', description: 'Size category of employer (e.g., 51-200 employees)', patterns: ['company_size', 'company size', 'size', 'organization size'] },
    { id: 'employee_count', label: 'Employee Count', description: 'Exact number of employees', patterns: ['employee count', 'employee_count', 'employees', 'headcount', 'staff count', 'number of employees'] },
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
    candidates: `You are mapping recruitment/talent candidate data. This data will be displayed on candidate profile pages.

=== MANDATORY MAPPINGS (NEVER SKIP THESE) ===
These column names MUST ALWAYS be mapped to the corresponding target field:
- "linkedin_profile" → linkedin_profile (this is the PERSON's LinkedIn, NOT company!)
- "linkedIn_profile" → linkedin_profile
- "first_Name" or "first_name" → first_name
- "last_name" → last_name
- "Job_Title" or "job_title" → job_title
- "Person Home Location" → person_home_location
- "Company Name" → company_name
- "Company HQ" → company_hq
- "Company Domain" → company_domain
- "Company LinkedIn" → company_linkedin (this is the COMPANY's page)
- "Industry" → industry
- "Company Size" → company_size
- "Employee Count" → employee_count
- "Description" → company_description
- "Type" → company_type
- "Work Address" → work_address
- "Salary_Range" or "salary_range" → salary_range
- "Years With Current Company" → years_experience
- "email" or "Email" → email
- "phone" or "Phone" → phone

=== LINKEDIN DISTINCTION (CRITICAL!) ===
- "linkedin_profile" or "linkedIn_profile" = PERSON's profile → map to linkedin_profile
- "Company LinkedIn" = COMPANY's page → map to company_linkedin
THESE ARE DIFFERENT! Do not confuse them!

=== SKIP THESE ANALYSIS COLUMNS ===
Only skip columns that contain AI-generated analysis, reports, or reasoning:
- Job Satisfaction Analysis, Job Satisfaction, Reasoning - Job Satisfaction
- Recruitment Urgency, Reasoning Outreach Urgency
- Market_Position, Experience report, Accounting Experience Analysis
- Recent M&A News, Find Company Headcount Growth, Percent Employee Growth
- Times_Promoted, Times_Hopped, Average Threshold, Estimated Age Range`,

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
2. MANDATORY: If a column name matches any pattern in the target fields list, map it (don't skip!)
3. "linkedin_profile" column MUST map to linkedin_profile - this is the person's LinkedIn profile!
4. Only skip columns that are clearly analysis/AI reports (Job Satisfaction Analysis, Recruitment Urgency, etc.)
5. When in doubt, MAP the column rather than skip it
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
