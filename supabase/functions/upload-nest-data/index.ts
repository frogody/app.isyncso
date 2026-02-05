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

interface DuplicateCheckResult {
  existingId: string | null;
  matchType: 'email' | 'linkedin' | null;
  inCurrentNest: boolean;
}

// Check if a candidate already exists in the current nest
async function checkIfInNest(supabase: any, candidateId: string, nestId: string): Promise<boolean> {
  const { data } = await supabase
    .from('nest_items')
    .select('id')
    .eq('nest_id', nestId)
    .eq('candidate_id', candidateId)
    .limit(1)
    .maybeSingle();

  return !!data;
}

// Normalize LinkedIn URL for consistent matching
function normalizeLinkedInUrl(url: string): string {
  if (!url) return '';
  let normalized = url.toLowerCase().trim();
  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');
  // Extract the profile path (handle various formats)
  const match = normalized.match(/linkedin\.com\/in\/([^\/\?]+)/);
  if (match) {
    return `linkedin.com/in/${match[1]}`;
  }
  return normalized;
}

// Find existing candidate by LinkedIn (primary) or email (secondary)
// IMPORTANT: Only searches platform-owned candidates (organization_id IS NULL)
// and prioritizes candidates already linked to the current nest
// NOTE: Name matching is NOT used as it's unreliable for deduplication
async function findExistingCandidate(
  supabase: any,
  row: MappedRow,
  nestId: string
): Promise<DuplicateCheckResult> {
  const linkedin = row.linkedin_profile?.toString().trim();
  const email = row.email?.toString().toLowerCase().trim();

  // Helper to find candidate, preferring ones already in the current nest
  async function findWithNestPriority(
    query: any,
    matchType: 'email' | 'linkedin'
  ): Promise<DuplicateCheckResult | null> {
    const { data: candidates } = await query
      .is('organization_id', null) // Only platform-owned
      .limit(10);

    if (candidates && candidates.length > 0) {
      // Check each candidate to see if it's already in this nest
      for (const candidate of candidates) {
        const inNest = await checkIfInNest(supabase, candidate.id, nestId);
        if (inNest) {
          return { existingId: candidate.id, matchType, inCurrentNest: true };
        }
      }
      // None in nest, return the first platform-owned one
      return { existingId: candidates[0].id, matchType, inCurrentNest: false };
    }
    return null;
  }

  // Priority 1: LinkedIn profile match (most reliable unique identifier)
  if (linkedin) {
    const normalizedLinkedin = normalizeLinkedInUrl(linkedin);
    if (normalizedLinkedin) {
      // Use contains match for flexibility with URL variations
      const result = await findWithNestPriority(
        supabase.from('candidates').select('id').ilike('linkedin_profile', `%${normalizedLinkedin}%`),
        'linkedin'
      );
      if (result) return result;
    }
  }

  // Priority 2: Email match (secondary identifier)
  if (email) {
    const result = await findWithNestPriority(
      supabase.from('candidates').select('id').ilike('email', email),
      'email'
    );
    if (result) return result;
  }

  // No name matching - names are not unique identifiers
  return { existingId: null, matchType: null, inCurrentNest: false };
}

interface UpdateResult {
  success: boolean;
  error?: string;
}

// Update existing candidate with new data (only non-null values)
async function updateCandidate(supabase: any, candidateId: string, row: MappedRow): Promise<UpdateResult> {
  // Handle skills
  const skillsStr = row.skills?.toString() || '';
  const skills = skillsStr ? skillsStr.split(/[,;]/).map(s => s.trim()).filter(Boolean) : null;

  // Parse years experience
  let yearsExperience = null;
  if (row.years_experience) {
    const expStr = row.years_experience.toString();
    const match = expStr.match(/(\d+(?:\.\d+)?)/);
    if (match) yearsExperience = parseFloat(match[1]);
  }

  // Parse employee count
  let employeeCount = null;
  if (row.employee_count) {
    const countStr = row.employee_count.toString().replace(/,/g, '');
    const match = countStr.match(/(\d+)/);
    if (match) employeeCount = parseInt(match[1], 10);
  }

  // Build update object with only provided values
  const updates: Record<string, any> = {};

  // Only update fields that have values
  if (row.first_name) updates.first_name = row.first_name;
  if (row.last_name) updates.last_name = row.last_name;
  if (row.email) updates.email = row.email;
  if (row.phone) updates.phone = row.phone;
  if (row.linkedin_profile) updates.linkedin_profile = row.linkedin_profile;
  if (row.profile_image_url) updates.profile_image_url = row.profile_image_url;
  if (row.job_title) updates.job_title = row.job_title;
  if (skills) updates.skills = skills;
  if (yearsExperience !== null) updates.years_experience = yearsExperience;
  if (row.education) updates.education = row.education;
  if (row.salary_range) updates.salary_range = row.salary_range;
  if (row.person_home_location) updates.person_home_location = row.person_home_location;
  if (row.work_address) updates.work_address = row.work_address;
  if (row.company_name) updates.company_name = row.company_name;
  if (row.company_domain) updates.company_domain = row.company_domain;
  if (row.company_hq) updates.company_hq = row.company_hq;
  if (row.company_linkedin) updates.company_linkedin = row.company_linkedin;
  if (row.company_description) updates.company_description = row.company_description;
  if (row.company_type) updates.company_type = row.company_type;
  if (row.industry) updates.industry = row.industry;
  if (row.company_size) updates.company_size = row.company_size;
  if (employeeCount !== null) updates.employee_count = employeeCount;
  if (row.times_promoted) updates.times_promoted = parseInt(row.times_promoted.toString());
  if (row.times_company_hopped) updates.times_company_hopped = parseInt(row.times_company_hopped.toString());
  if (row.years_at_company) updates.years_at_company = parseFloat(row.years_at_company.toString().replace(/[^0-9.]/g, ''));
  if (row.job_satisfaction) updates.job_satisfaction = row.job_satisfaction;
  if (row.estimated_age_range) updates.estimated_age_range = row.estimated_age_range;
  if (row.market_position) updates.market_position = row.market_position;
  if (row.employee_growth_rate) updates.employee_growth_rate = parseFloat(row.employee_growth_rate.toString());
  if (row.recruitment_urgency) updates.recruitment_urgency = row.recruitment_urgency;
  if (row.experience_report) updates.experience_report = row.experience_report;
  if (row.experience_analysis) updates.experience_analysis = row.experience_analysis;
  if (row.job_satisfaction_analysis) updates.job_satisfaction_analysis = row.job_satisfaction_analysis;
  if (row.avg_promotion_threshold) updates.avg_promotion_threshold = parseFloat(row.avg_promotion_threshold.toString());
  if (row.outreach_urgency_reasoning) updates.outreach_urgency_reasoning = row.outreach_urgency_reasoning;
  if (row.recent_ma_news) updates.recent_ma_news = row.recent_ma_news;

  // Check if there's anything to update (before adding timestamp)
  if (Object.keys(updates).length === 0) {
    return { success: true }; // Nothing to update, but not an error
  }

  const { error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', candidateId);

  if (error) {
    return { success: false, error: error.message || 'Database update failed' };
  }
  return { success: true };
}

interface CreateResult {
  id: string | null;
  error?: string;
}

// Create candidate from pre-mapped row data
async function createCandidate(supabase: any, row: MappedRow): Promise<CreateResult> {
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

      // Enrichment data (field names match TalentCandidateProfile.jsx)
      times_promoted: row.times_promoted ? parseInt(row.times_promoted.toString()) : null,
      times_company_hopped: row.times_company_hopped ? parseInt(row.times_company_hopped.toString()) : null,
      years_at_company: row.years_at_company ? parseFloat(row.years_at_company.toString().replace(/[^0-9.]/g, '')) : null,
      job_satisfaction: row.job_satisfaction || null,
      estimated_age_range: row.estimated_age_range || null,
      market_position: row.market_position || null,
      employee_growth_rate: row.employee_growth_rate ? parseFloat(row.employee_growth_rate.toString()) : null,
      recruitment_urgency: row.recruitment_urgency || null,

      // Analysis/Report fields (displayed on profile)
      experience_report: row.experience_report || null,
      experience_analysis: row.experience_analysis || null,
      job_satisfaction_analysis: row.job_satisfaction_analysis || null,
      avg_promotion_threshold: row.avg_promotion_threshold ? parseFloat(row.avg_promotion_threshold.toString()) : null,
      outreach_urgency_reasoning: row.outreach_urgency_reasoning || null,
      recent_ma_news: row.recent_ma_news || null,

      // Meta
      source: 'nest_upload',
      imported_at: new Date().toISOString(),
      organization_id: null, // Platform-owned
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create candidate:', error);
    return { id: null, error: error.message || 'Database insert failed' };
  }
  return { id: data?.id || null };
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
    name: row.name || row.company_name || '',
    firm: row.firm || '',
    email: row.email || null,
    type: row.investor_type || row.company_type || 'VC',
    check_size_min: checkSizeMin,
    check_size_max: checkSizeMax,
    focus_areas: focusAreas,
    linkedin: row.linkedin || row.linkedin_url || row.company_linkedin || null,
    website: row.website || row.domain || row.company_domain || null,
    location: row.location || row.hq_location || row.company_hq || null,
    portfolio: row.portfolio || null,
    description: row.company_description || row.description || null,
    industry: row.industry || null,
    company_size: row.company_size || null,
    country: row.country || row.hq_country || null,
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

// Create company from pre-mapped row data
async function createCompany(supabase: any, row: MappedRow): Promise<string | null> {
  const employeeCount = row.employee_count
    ? parseInt(row.employee_count.toString().replace(/[^0-9]/g, ''), 10) || null
    : null;
  const foundedYear = row.founded_year
    ? parseInt(row.founded_year.toString().replace(/[^0-9]/g, ''), 10) || null
    : null;

  // Parse tech_stack (comma or semicolon separated)
  const techStr = row.tech_stack?.toString() || '';
  const techStack = techStr ? techStr.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean) : [];

  // Parse tags
  const tagsStr = row.tags?.toString() || '';
  const tags = tagsStr ? tagsStr.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean) : [];

  const { data, error } = await supabase
    .from('crm_companies')
    .insert({
      name: row.company_name || row.name || '',
      description: row.company_description || row.description || null,
      industry: row.industry || null,
      company_size: row.company_size || null,
      company_type: row.company_type || null,
      hq_location: row.hq_location || row.location || null,
      hq_country: row.hq_country || row.country || null,
      domain: row.domain || null,
      linkedin_url: row.linkedin_url || null,
      employee_count: employeeCount,
      founded_year: foundedYear,
      revenue_range: row.revenue_range || null,
      funding_total: row.funding_total || null,
      tech_stack: techStack.length ? techStack : null,
      tags: tags.length ? tags : null,
      source: 'nest_upload',
      organization_id: null, // Platform-owned
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create company:', error);
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

    // Verify nest exists — check both talent nests and growth nests tables
    let nestTable = 'nests';
    const { data: nest, error: nestError } = await supabase
      .from('nests')
      .select('id, nest_type')
      .eq('id', nestId)
      .single();

    if (nestError || !nest) {
      // Not in talent nests — check growth_nests
      const { data: growthNest, error: growthNestError } = await supabase
        .from('growth_nests')
        .select('id, name')
        .eq('id', nestId)
        .single();

      if (growthNestError || !growthNest) {
        return new Response(
          JSON.stringify({ error: 'Nest not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      nestTable = 'growth_nests';
      // Growth nests always use prospects type
      if (nestType !== 'prospects') {
        nestType = 'prospects';
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    let linkedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let entityId: string | null = null;
      let skipNestItem = false;
      let wasLinked = false; // Track if this was linked from another nest

      try {
        if (nestType === 'candidates') {
          // Check for existing candidate (duplicate detection)
          const duplicate = await findExistingCandidate(supabase, row, nestId);
          wasLinked = duplicate.existingId !== null && !duplicate.inCurrentNest;

          if (duplicate.existingId) {
            if (duplicate.inCurrentNest) {
              // Already in this nest - just update the data
              console.log(`Row ${i + 1}: Found duplicate in this nest (match: ${duplicate.matchType}), updating...`);
              const updateResult = await updateCandidate(supabase, duplicate.existingId, row);
              if (updateResult.success) {
                updatedCount++;
              } else {
                const reason = updateResult.error || 'Unknown error';
                errors.push(`Row ${i + 1}: Failed to update existing candidate - ${reason}`);
                errorCount++;
              }
              skipNestItem = true; // Don't create new nest_item
            } else {
              // Exists globally but not in this nest - update and link
              console.log(`Row ${i + 1}: Found duplicate in other nest (match: ${duplicate.matchType}), linking...`);
              const updateResult = await updateCandidate(supabase, duplicate.existingId, row);
              if (!updateResult.success) {
                console.warn(`Row ${i + 1}: Update before link failed: ${updateResult.error}`);
              }
              entityId = duplicate.existingId;
              linkedCount++;
            }
          } else {
            // New candidate - create
            const createResult = await createCandidate(supabase, row);
            if (createResult.id) {
              entityId = createResult.id;
            } else {
              const reason = createResult.error || 'Unknown error';
              errors.push(`Row ${i + 1}: Failed to create candidate - ${reason}`);
              errorCount++;
            }
          }
        } else if (nestType === 'prospects') {
          entityId = await createProspect(supabase, row);
        } else if (nestType === 'investors') {
          entityId = await createInvestor(supabase, row);
        } else if (nestType === 'companies') {
          entityId = await createCompany(supabase, row);
        } else {
          throw new Error(`Unknown nest type: ${nestType}`);
        }

        if (!skipNestItem && entityId) {
          let linkError: any = null;

          if (nestTable === 'growth_nests') {
            // Growth nests use growth_nest_items table (FK to growth_nests)
            const { error } = await supabase
              .from('growth_nest_items')
              .insert({
                growth_nest_id: nestId,
                prospect_id: entityId,
                item_order: i,
                is_preview: i < 5,
              });
            linkError = error;
          } else {
            // Talent nests use nest_items table (FK to nests)
            const itemData: any = {
              nest_id: nestId,
              item_order: i,
              is_preview: i < 5,
            };

            if (nestType === 'candidates') {
              itemData.candidate_id = entityId;
            } else if (nestType === 'prospects') {
              itemData.prospect_id = entityId;
            } else if (nestType === 'investors') {
              itemData.investor_id = entityId;
            } else if (nestType === 'companies') {
              itemData.company_id = entityId;
            }

            const { error } = await supabase
              .from('nest_items')
              .insert(itemData);
            linkError = error;
          }

          if (linkError) {
            console.error(`Failed to link item ${i}:`, linkError);
            const linkReason = linkError.message || 'Database error';
            errors.push(`Row ${i + 1}: Failed to link to nest - ${linkReason}`);
            errorCount++;
            // If this was a linked item, decrement the count since link failed
            if (wasLinked) {
              linkedCount--;
            }
          } else if (!wasLinked) {
            // Only count as created if it was a brand new entity (not linked from other nest)
            createdCount++;
          }
        } else if (!skipNestItem && !entityId) {
          // Only add error if not already captured above
          if (!errors.some(e => e.startsWith(`Row ${i + 1}:`))) {
            errors.push(`Row ${i + 1}: Failed to create entity - no data returned`);
            errorCount++;
          }
        }
      } catch (err: any) {
        console.error(`Error processing row ${i}:`, err);
        const errorMsg = err.message || 'Unknown error occurred';
        errors.push(`Row ${i + 1}: ${errorMsg}`);
        errorCount++;
      }
    }

    console.log(`Created ${createdCount} new, ${updatedCount} updated, ${linkedCount} linked, ${errorCount} errors`);

    // Update the nest's item_count to reflect actual count
    let actualCount: number | null = 0;
    if (nestTable === 'growth_nests') {
      const { count } = await supabase
        .from('growth_nest_items')
        .select('*', { count: 'exact', head: true })
        .eq('growth_nest_id', nestId);
      actualCount = count;
    } else {
      const { count } = await supabase
        .from('nest_items')
        .select('*', { count: 'exact', head: true })
        .eq('nest_id', nestId);
      actualCount = count;
    }

    if (nestTable === 'growth_nests') {
      await supabase
        .from('growth_nests')
        .update({
          lead_count: actualCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nestId);
      console.log(`Updated growth_nest ${nestId} lead_count to ${actualCount}`);
    } else {
      await supabase
        .from('nests')
        .update({
          item_count: actualCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nestId);
      console.log(`Updated nest ${nestId} item_count to ${actualCount}, updated_at refreshed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        created_count: createdCount,
        updated_count: updatedCount,
        linked_count: linkedCount,
        error_count: errorCount,
        total_rows: rows.length,
        item_count: actualCount || 0,
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
