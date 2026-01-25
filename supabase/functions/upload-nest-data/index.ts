import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface MappedRow {
  [key: string]: string | number | null;
}

// Create candidate from pre-mapped row data
async function createCandidate(supabase: any, row: MappedRow): Promise<string | null> {
  // Handle skills (comma or semicolon separated string)
  const skillsStr = row.skills?.toString() || '';
  const skills = skillsStr ? skillsStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : null;

  // Parse years experience - handle various formats like "1 year and 10 months", "5", "5.5"
  let yearsExperience = null;
  if (row.years_experience) {
    const expStr = row.years_experience.toString();
    // Try to extract just the numeric part
    const match = expStr.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      yearsExperience = parseFloat(match[1]);
    }
  }

  // Parse employee count - handle various formats
  let employeeCount = null;
  if (row.employee_count) {
    const countStr = row.employee_count.toString().replace(/,/g, '');
    const match = countStr.match(/(\d+)/);
    if (match) {
      employeeCount = parseInt(match[1], 10);
    }
  }

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      // Person basic info
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      email: row.email || null,
      phone: row.phone || null,
      linkedin_profile: row.linkedin_profile || null,
      profile_image_url: row.profile_image_url || null,

      // Person professional info
      job_title: row.job_title || null,
      skills: skills,
      years_experience: yearsExperience,
      education: row.education || null,
      salary_range: row.salary_range || null,

      // Person location
      person_home_location: row.person_home_location || null,
      work_address: row.work_address || null,

      // Company info
      company_name: row.company_name || null,
      company_domain: row.company_domain || null,
      company_hq: row.company_hq || null,
      company_linkedin: row.company_linkedin || null,
      company_description: row.company_description || null,
      company_type: row.company_type || null,
      industry: row.industry || null,
      company_size: row.company_size || null,
      employee_count: employeeCount,

      // Meta
      source: 'nest_upload',
      organization_id: null, // Platform-owned
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create candidate:', error);
    return null;
  }
  return data?.id;
}

// Create prospect from pre-mapped row data
async function createProspect(supabase: any, row: MappedRow): Promise<string | null> {
  // Parse deal value
  const dealValue = row.deal_value
    ? parseFloat(row.deal_value.toString().replace(/[^0-9.-]/g, ''))
    : null;

  const { data, error } = await supabase
    .from('prospects')
    .insert({
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      email: row.email || null,
      phone: row.phone || null,
      company: row.company || null,
      job_title: row.job_title || null,
      linkedin_url: row.linkedin_url || null,
      industry: row.industry || null,
      deal_value: dealValue,
      website: row.website || null,
      company_size: row.company_size || null,
      location: row.location || null,
      contact_type: row.contact_type || 'prospect',
      source: 'nest_upload',
      organization_id: null, // Platform-owned
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create prospect:', error);
    return null;
  }
  return data?.id;
}

// Create investor from pre-mapped row data
async function createInvestor(supabase: any, row: MappedRow): Promise<string | null> {
  // Parse check sizes
  const checkSizeMin = row.check_size_min
    ? parseFloat(row.check_size_min.toString().replace(/[^0-9.-]/g, ''))
    : null;
  const checkSizeMax = row.check_size_max
    ? parseFloat(row.check_size_max.toString().replace(/[^0-9.-]/g, ''))
    : null;

  // Parse focus areas (comma or semicolon separated)
  const focusAreasStr = row.focus_areas?.toString() || '';
  const focusAreas = focusAreasStr ? focusAreasStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

  const profile = {
    name: row.name || '',
    firm: row.firm || '',
    email: row.email || null,
    type: row.investor_type || 'VC',
    check_size_min: checkSizeMin,
    check_size_max: checkSizeMax,
    focus_areas: focusAreas,
    linkedin: row.linkedin || null,
    website: row.website || null,
    location: row.location || null,
    portfolio: row.portfolio || null,
  };

  const { data, error } = await supabase
    .from('raise_investors')
    .insert({
      investor_type: row.investor_type || 'vc',
      profile: profile,
      organization_id: null, // Platform-owned
      user_id: null, // Will be set when copied to buyer
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create investor:', error);
    return null;
  }
  return data?.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    let nestId: string;
    let nestType: string;
    let rows: MappedRow[];

    // Handle JSON body (new mapped data format)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      nestId = body.nest_id;
      nestType = body.nest_type;
      rows = body.rows || [];

      if (!nestId || !nestType || !rows.length) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: nest_id, nest_type, rows' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Handle FormData (legacy CSV upload)
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      nestId = formData.get('nest_id') as string;
      nestType = formData.get('nest_type') as string;

      if (!file || !nestId || !nestType) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: file, nest_id, nest_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse CSV for legacy support
      const csvText = await file.text();
      rows = parseCSV(csvText);

      if (rows.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid data rows found in CSV' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Processing ${rows.length} rows for nest ${nestId} (${nestType})`);

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify nest exists
    const { data: nest, error: nestError } = await supabase
      .from('nests')
      .select('id, nest_type')
      .eq('id', nestId)
      .single();

    if (nestError || !nest) {
      return new Response(
        JSON.stringify({ error: 'Nest not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let createdCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let entityId: string | null = null;

      try {
        switch (nestType) {
          case 'candidates':
            entityId = await createCandidate(supabase, row);
            break;
          case 'prospects':
            entityId = await createProspect(supabase, row);
            break;
          case 'investors':
            entityId = await createInvestor(supabase, row);
            break;
          default:
            throw new Error(`Unknown nest type: ${nestType}`);
        }

        if (entityId) {
          // Create nest_item link
          const itemData: any = {
            nest_id: nestId,
            item_order: i,
            is_preview: i < 5, // First 5 items are preview by default
          };

          // Set the appropriate foreign key based on type
          if (nestType === 'candidates') {
            itemData.candidate_id = entityId;
          } else if (nestType === 'prospects') {
            itemData.prospect_id = entityId;
          } else if (nestType === 'investors') {
            itemData.investor_id = entityId;
          }

          const { error: linkError } = await supabase
            .from('nest_items')
            .insert(itemData);

          if (linkError) {
            console.error(`Failed to link item ${i}:`, linkError);
            errors.push(`Row ${i + 1}: Failed to link entity to nest`);
            errorCount++;
          } else {
            createdCount++;
          }
        } else {
          errors.push(`Row ${i + 1}: Failed to create entity`);
          errorCount++;
        }
      } catch (err: any) {
        console.error(`Error processing row ${i}:`, err);
        errors.push(`Row ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`Created ${createdCount} items, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        created_count: createdCount,
        error_count: errorCount,
        total_rows: rows.length,
        errors: errors.slice(0, 10), // Only return first 10 errors
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

// Legacy CSV parsing for backwards compatibility
function parseCSV(csvText: string): MappedRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  const rows: MappedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: MappedRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, '') || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}
