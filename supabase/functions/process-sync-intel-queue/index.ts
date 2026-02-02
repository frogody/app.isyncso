import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY")!;

const BATCH_SIZE = 3; // Process 3 candidates at a time (reduced due to company intel calls)
const MAX_RETRIES = 3;

interface QueueItem {
  id: string;
  candidate_id: string;
  organization_id: string | null;
  source: string;
  priority: number;
  status: string;
  current_stage: string | null;
}

// Stage 0: LinkedIn Enrichment via Explorium
async function enrichFromLinkedIn(
  supabase: any,
  candidateId: string,
  linkedinUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Stage 0] LinkedIn enrichment for candidate ${candidateId}`);

    // Call the explorium-enrich edge function with full_enrich action
    const enrichResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/explorium-enrich`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'full_enrich',
          linkedin: linkedinUrl,
        }),
      }
    );

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      console.warn(`[Stage 0] LinkedIn enrichment API failed: ${errorText}`);
      return { success: false, error: `LinkedIn enrichment failed: ${enrichResponse.status}` };
    }

    const enriched = await enrichResponse.json();

    // Build update object — only overwrite empty fields
    const updateData: Record<string, any> = {
      enriched_at: new Date().toISOString(),
      enrichment_source: 'explorium',
    };

    // Contact info
    if (enriched.email) updateData.verified_email = enriched.email;
    if (enriched.phone) updateData.verified_phone = enriched.phone;
    if (enriched.mobile_phone) updateData.verified_mobile = enriched.mobile_phone;
    if (enriched.personal_email) updateData.personal_email = enriched.personal_email;
    if (enriched.work_phone) updateData.work_phone = enriched.work_phone;
    if (enriched.email_status) updateData.email_status = enriched.email_status;

    // Professional info
    if (enriched.job_title) updateData.job_title = enriched.job_title;
    if (enriched.company) updateData.company_name = enriched.company;
    if (enriched.job_department) updateData.job_department = enriched.job_department;
    if (enriched.job_seniority_level) updateData.job_seniority_level = enriched.job_seniority_level;

    // Location
    if (enriched.location_city) updateData.location_city = enriched.location_city;
    if (enriched.location_region) updateData.location_region = enriched.location_region;
    if (enriched.location_country) updateData.location_country = enriched.location_country;

    // Demographics
    if (enriched.age_group) updateData.age_group = enriched.age_group;
    if (enriched.gender) updateData.gender = enriched.gender;

    // LinkedIn career data — only overwrite if enriched data has items
    if (enriched.skills?.length) {
      updateData.skills = enriched.skills;
      updateData.inferred_skills = enriched.skills;
    }
    if (enriched.work_history?.length) updateData.work_history = enriched.work_history;
    if (enriched.education?.length) updateData.education = enriched.education;
    if (enriched.certifications?.length) updateData.certifications = enriched.certifications;
    if (enriched.interests?.length) updateData.interests = enriched.interests;

    // Explorium IDs for re-enrichment
    if (enriched.explorium_prospect_id) updateData.explorium_prospect_id = enriched.explorium_prospect_id;
    if (enriched.explorium_business_id) updateData.explorium_business_id = enriched.explorium_business_id;

    // Company domain (useful for Stage 1)
    if (enriched.company_domain) updateData.company_domain = enriched.company_domain;

    const { error: updateError } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', candidateId);

    if (updateError) {
      console.warn(`[Stage 0] DB update failed: ${updateError.message}`);
      return { success: false, error: `DB update failed: ${updateError.message}` };
    }

    const enrichedFields = Object.keys(updateData).filter(k => k !== 'enriched_at' && k !== 'enrichment_source');
    console.log(`[Stage 0] LinkedIn enrichment complete: ${enrichedFields.length} fields updated`);
    return { success: true };
  } catch (err: any) {
    console.warn(`[Stage 0] LinkedIn enrichment error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Process a single candidate's full enrichment pipeline:
// Stage 0: LinkedIn Enrichment (NEW)
// Stage 1: Company Intelligence (Explorium)
// Stage 2: Candidate Intelligence (LLM)
async function processCandidateIntel(
  supabase: any,
  candidateId: string,
  organizationId: string | null,
  queueItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      return { success: false, error: 'Candidate not found' };
    }

    // Skip if already has recent intelligence (within 7 days)
    if (candidate.last_intelligence_update) {
      const lastUpdate = new Date(candidate.last_intelligence_update);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        console.log(`Candidate ${candidateId} already has recent intel, skipping`);
        return { success: true };
      }
    }

    // --- Stage 0: LinkedIn Enrichment (NEW) ---
    const linkedinUrl = candidate.linkedin_url || candidate.linkedin_profile;
    if (linkedinUrl && !candidate.enriched_at) {
      await supabase.from('sync_intel_queue').update({ current_stage: 'linkedin' }).eq('id', queueItemId);

      const linkedInResult = await enrichFromLinkedIn(supabase, candidateId, linkedinUrl);
      if (linkedInResult.success) {
        console.log(`[Stage 0] Success for ${candidateId}`);
      } else {
        console.warn(`[Stage 0] Failed for ${candidateId}: ${linkedInResult.error} (continuing)`);
      }

      // Delay to let DB propagate before next stage
      await new Promise(resolve => setTimeout(resolve, 500));

      // Re-fetch candidate to get enriched data for subsequent stages
      const { data: refreshed } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();
      if (refreshed) Object.assign(candidate, refreshed);
    } else if (candidate.enriched_at) {
      console.log(`[Stage 0] LinkedIn already enriched for ${candidateId}, skipping`);
    } else {
      console.log(`[Stage 0] No LinkedIn URL for ${candidateId}, skipping`);
    }

    // --- Stage 1: Generate Company Intelligence (Explorium) ---
    await supabase.from('sync_intel_queue').update({ current_stage: 'company' }).eq('id', queueItemId);

    const companyName = candidate.company_name || candidate.current_company;
    const companyDomain = candidate.company_domain || candidate.company_website;

    // Skip company intel if already enriched (within 7 days)
    const hasRecentCompanyIntel = candidate.company_intelligence &&
      candidate.company_intelligence_updated_at &&
      ((Date.now() - new Date(candidate.company_intelligence_updated_at).getTime()) / (1000 * 60 * 60 * 24)) < 7;

    if (companyName && !hasRecentCompanyIntel) {
      console.log(`[Stage 1] Generating company intel for ${companyName} (candidate: ${candidateId})`);

      const companyIntelResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/generateCompanyIntelligence`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            companyName: companyName,
            companyDomain: companyDomain,
            entityType: 'candidate',
            entityId: candidateId,
          }),
        }
      );

      if (companyIntelResponse.ok) {
        const companyResult = await companyIntelResponse.json();
        console.log(`[Stage 1] Company intel completed: ${companyResult.success ? 'success' : 'no match'}`);
      } else {
        console.log(`[Stage 1] Company intel failed (non-blocking): ${await companyIntelResponse.text()}`);
        // Don't fail the whole process if company intel fails
      }

      // Small delay to let the DB update propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    } else if (hasRecentCompanyIntel) {
      console.log(`[Stage 1] Company intel already exists for candidate ${candidateId}, skipping`);
    } else {
      console.log(`[Stage 1] No company name for candidate ${candidateId}, skipping company intel`);
    }

    // --- Stage 2: Generate Candidate Intelligence (SYNC Intel) ---
    await supabase.from('sync_intel_queue').update({ current_stage: 'candidate' }).eq('id', queueItemId);

    console.log(`[Stage 2] Generating candidate intel for ${candidateId}`);

    const intelResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/generateCandidateIntelligence`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          candidate_id: candidateId,
          organization_id: organizationId,
          skip_company: false,
        }),
      }
    );

    if (!intelResponse.ok) {
      const errorText = await intelResponse.text();
      return { success: false, error: `Intel generation failed: ${errorText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Concurrency guard: skip if another run is already processing items
    const { data: activeItems } = await supabase
      .from('sync_intel_queue')
      .select('id')
      .eq('status', 'processing')
      .limit(1);

    if (activeItems && activeItems.length > 0) {
      console.log('Another processor is already running, skipping');
      return new Response(
        JSON.stringify({ message: 'Processor already running', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pending queue items, ordered by priority and creation time
    const { data: queueItems, error: queueError } = await supabase
      .from('sync_intel_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queueError) {
      console.error('Error fetching queue:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No items in queue', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${queueItems.length} queue items`);

    let successCount = 0;
    let failCount = 0;

    for (const item of queueItems as QueueItem[]) {
      // Skip excluded candidates (belt-and-suspenders guard)
      const { data: candidate } = await supabase
        .from('candidates')
        .select('excluded_reason')
        .eq('id', item.candidate_id)
        .single();

      if (candidate?.excluded_reason) {
        await supabase
          .from('sync_intel_queue')
          .update({ status: 'completed', current_stage: 'skipped_excluded', completed_at: new Date().toISOString() })
          .eq('id', item.id);
        console.log(`Skipped excluded candidate ${item.candidate_id}`);
        continue;
      }

      // Mark as processing
      await supabase
        .from('sync_intel_queue')
        .update({ status: 'processing', started_at: new Date().toISOString(), current_stage: 'linkedin' })
        .eq('id', item.id);

      // Process the candidate through all 3 stages
      const result = await processCandidateIntel(supabase, item.candidate_id, item.organization_id, item.id);

      if (result.success) {
        // Mark as completed
        await supabase
          .from('sync_intel_queue')
          .update({
            status: 'completed',
            current_stage: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        successCount++;
      } else {
        // Mark as failed
        await supabase
          .from('sync_intel_queue')
          .update({
            status: 'failed',
            current_stage: 'failed',
            error_message: result.error,
            completed_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        failCount++;
      }

      // Delay between candidates to avoid rate limiting (increased due to company intel calls)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`Processed: ${successCount} success, ${failCount} failed`);

    // Check if there are more items to process
    const { count: remainingCount } = await supabase
      .from('sync_intel_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Self-retrigger if items remain (fire-and-forget)
    if (remainingCount && remainingCount > 0) {
      console.log(`${remainingCount} items remaining, retriggering...`);
      fetch(`${SUPABASE_URL}/functions/v1/process-sync-intel-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ triggered_by: 'self_retrigger' }),
      }).catch(() => {}); // fire-and-forget
    }

    return new Response(
      JSON.stringify({
        processed: queueItems.length,
        success: successCount,
        failed: failCount,
        remaining: remainingCount || 0,
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
