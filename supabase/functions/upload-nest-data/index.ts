import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ParsedRow {
  [key: string]: string;
}

// Parse CSV content into array of objects
function parseCSV(csvText: string): ParsedRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: ParsedRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, '') || '';
    });
    rows.push(row);
  }

  return rows;
}

// Handle CSV line parsing with quoted values
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

// Create candidate from row
async function createCandidate(supabase: any, row: ParsedRow): Promise<string | null> {
  // Parse name into first/last
  const name = row.name || '';
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Parse skills (comma or semicolon separated)
  const skillsStr = row.skills || '';
  const skills = skillsStr ? skillsStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: row.email || null,
      phone: row.phone || null,
      job_title: row.title || row.job_title || null,
      company_name: row.company || row.company_name || null,
      linkedin_profile: row.linkedin_url || row.linkedin || null,
      skills: skills.length > 0 ? skills : null,
      person_home_location: row.location || null,
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

// Create prospect from row
async function createProspect(supabase: any, row: ParsedRow): Promise<string | null> {
  // Parse contact name into first/last
  const contactName = row.contact_name || row.name || '';
  const nameParts = contactName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const dealValue = row.deal_value ? parseFloat(row.deal_value.replace(/[^0-9.-]/g, '')) : null;

  const { data, error } = await supabase
    .from('prospects')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: row.email || null,
      phone: row.phone || null,
      company: row.company_name || row.company || null,
      job_title: row.title || row.job_title || null,
      linkedin_url: row.linkedin_url || row.linkedin || null,
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

// Create investor from row
async function createInvestor(supabase: any, row: ParsedRow): Promise<string | null> {
  // Parse check sizes
  const checkSizeMin = row.check_size_min ? parseFloat(row.check_size_min.replace(/[^0-9.-]/g, '')) : null;
  const checkSizeMax = row.check_size_max ? parseFloat(row.check_size_max.replace(/[^0-9.-]/g, '')) : null;

  // Parse focus areas
  const focusAreasStr = row.focus_areas || '';
  const focusAreas = focusAreasStr ? focusAreasStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

  const profile = {
    name: row.name || '',
    firm: row.firm || '',
    email: row.email || null,
    type: row.type || row.investor_type || 'VC',
    check_size_min: checkSizeMin,
    check_size_max: checkSizeMax,
    focus_areas: focusAreas,
    linkedin: row.linkedin_url || row.linkedin || null,
    website: row.website || null,
  };

  const { data, error } = await supabase
    .from('raise_investors')
    .insert({
      investor_type: row.type || row.investor_type || 'vc',
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
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const nestId = formData.get('nest_id') as string;
    const nestType = formData.get('nest_type') as string;

    if (!file || !nestId || !nestType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file, nest_id, nest_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read file content
    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid data rows found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
            errors.push(`Row ${i + 2}: Failed to link entity to nest`);
            errorCount++;
          } else {
            createdCount++;
          }
        } else {
          errors.push(`Row ${i + 2}: Failed to create entity`);
          errorCount++;
        }
      } catch (err: any) {
        console.error(`Error processing row ${i}:`, err);
        errors.push(`Row ${i + 2}: ${err.message}`);
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
