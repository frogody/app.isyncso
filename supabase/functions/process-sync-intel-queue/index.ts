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
}

// Process a single candidate's SYNC Intel (Company Intel first, then Candidate Intel)
async function processCandidateIntel(
  supabase: any,
  candidateId: string,
  organizationId: string | null
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

    // Step 1: Generate Company Intelligence (Explorium) first
    // This enriches the company data so SYNC Intel can use it
    const companyName = candidate.company_name || candidate.current_company;
    const companyDomain = candidate.company_domain || candidate.company_website;

    // Skip company intel if already enriched (within 7 days)
    const hasRecentCompanyIntel = candidate.company_intelligence &&
      candidate.company_intelligence_updated_at &&
      ((Date.now() - new Date(candidate.company_intelligence_updated_at).getTime()) / (1000 * 60 * 60 * 24)) < 7;

    if (companyName && !hasRecentCompanyIntel) {
      console.log(`Generating company intel for ${companyName} (candidate: ${candidateId})`);

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
        console.log(`Company intel completed: ${companyResult.success ? 'success' : 'no match'}`);
      } else {
        console.log(`Company intel failed (non-blocking): ${await companyIntelResponse.text()}`);
        // Don't fail the whole process if company intel fails
      }

      // Small delay to let the DB update propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    } else if (hasRecentCompanyIntel) {
      console.log(`Company intel already exists for candidate ${candidateId}, skipping`);
    } else {
      console.log(`No company name for candidate ${candidateId}, skipping company intel`);
    }

    // Step 2: Generate Candidate Intelligence (SYNC Intel)
    // This will now have access to the enriched company data
    console.log(`Generating candidate intel for ${candidateId}`);

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
      // Mark as processing
      await supabase
        .from('sync_intel_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', item.id);

      // Process the candidate
      const result = await processCandidateIntel(supabase, item.candidate_id, item.organization_id);

      if (result.success) {
        // Mark as completed
        await supabase
          .from('sync_intel_queue')
          .update({
            status: 'completed',
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
