// Supabase Edge Function: processOutreachScheduler
// Automated scheduler for creating follow-up outreach tasks

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OutreachTask {
  id: string;
  organization_id: string;
  campaign_id?: string;
  candidate_id: string;
  task_type: string;
  status: string;
  stage: string;
  attempt_number: number;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

interface FollowUpConfig {
  days_after_sent: number;
  task_type: string;
  stage: string;
}

// Follow-up schedule configuration
const FOLLOW_UP_SCHEDULE: FollowUpConfig[] = [
  { days_after_sent: 3, task_type: "follow_up_1", stage: "follow_up_1" },
  { days_after_sent: 7, task_type: "follow_up_2", stage: "follow_up_2" },
];

// Calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      organization_id,
      campaign_id,
      dry_run = false,
      force = false // Skip session throttle check
    } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Session throttle check (30 minutes) - unless forced
    if (!force) {
      const { data: recentRun } = await supabase
        .from("system_logs")
        .select("created_at")
        .eq("organization_id", organization_id)
        .eq("event_type", "outreach_scheduler_run")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentRun) {
        const lastRunTime = new Date(recentRun.created_at);
        const now = new Date();
        const minutesSinceLastRun = (now.getTime() - lastRunTime.getTime()) / (1000 * 60);
        
        if (minutesSinceLastRun < 30) {
          return new Response(
            JSON.stringify({
              success: true,
              skipped: true,
              message: `Scheduler ran ${Math.round(minutesSinceLastRun)} minutes ago. Next run available in ${Math.round(30 - minutesSinceLastRun)} minutes.`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get sent outreach tasks that might need follow-ups
    let query = supabase
      .from("outreach_tasks")
      .select("*, candidates(name, email)")
      .eq("organization_id", organization_id)
      .eq("status", "sent")
      .not("sent_at", "is", null);

    if (campaign_id) {
      query = query.eq("campaign_id", campaign_id);
    }

    const { data: sentTasks, error: tasksError } = await query;

    if (tasksError) throw tasksError;

    const now = new Date();
    const tasksToCreate: Array<{
      organization_id: string;
      campaign_id?: string;
      candidate_id: string;
      task_type: string;
      status: string;
      stage: string;
      attempt_number: number;
      metadata: Record<string, any>;
    }> = [];

    const processedCandidates = new Set<string>();
    const skippedReasons: string[] = [];

    for (const task of sentTasks || []) {
      // Skip if we already processed this candidate in this run
      if (processedCandidates.has(task.candidate_id)) {
        continue;
      }

      const sentDate = new Date(task.sent_at!);
      const daysSinceSent = daysBetween(now, sentDate);

      // Check if any follow-up is needed
      for (const followUp of FOLLOW_UP_SCHEDULE) {
        if (daysSinceSent >= followUp.days_after_sent) {
          // Check if this follow-up already exists
          const { data: existingFollowUp } = await supabase
            .from("outreach_tasks")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("candidate_id", task.candidate_id)
            .eq("task_type", followUp.task_type)
            .limit(1)
            .single();

          if (existingFollowUp) {
            skippedReasons.push(
              `${task.candidates?.name || task.candidate_id}: ${followUp.task_type} already exists`
            );
            continue;
          }

          // Check if candidate has replied (don't send follow-up)
          const { data: hasReplied } = await supabase
            .from("outreach_tasks")
            .select("id")
            .eq("candidate_id", task.candidate_id)
            .eq("status", "replied")
            .limit(1)
            .single();

          if (hasReplied) {
            skippedReasons.push(
              `${task.candidates?.name || task.candidate_id}: Already replied`
            );
            processedCandidates.add(task.candidate_id);
            continue;
          }

          // Check campaign automation_config for auto-approve setting
          let followUpStatus = "pending";
          if (task.campaign_id) {
            const { data: campaignData } = await supabase
              .from("campaigns")
              .select("automation_config")
              .eq("id", task.campaign_id)
              .single();
            if (campaignData?.automation_config?.auto_approve_followups) {
              followUpStatus = "approved_ready";
            }
          }

          // Create follow-up task
          tasksToCreate.push({
            organization_id: task.organization_id,
            campaign_id: task.campaign_id,
            candidate_id: task.candidate_id,
            task_type: followUp.task_type,
            status: followUpStatus,
            stage: followUp.stage,
            channel: task.channel || "linkedin",
            attempt_number: task.attempt_number + 1,
            auto_generated: true,
            metadata: {
              auto_generated: true,
              previous_task_id: task.id,
              days_since_last_contact: daysSinceSent,
              scheduled_by: "outreach_scheduler",
            },
          });

          processedCandidates.add(task.candidate_id);
          break; // Only create one follow-up at a time per candidate
        }
      }
    }

    let createdTasks: any[] = [];

    if (!dry_run && tasksToCreate.length > 0) {
      // Create the follow-up tasks
      const { data, error: insertError } = await supabase
        .from("outreach_tasks")
        .insert(tasksToCreate)
        .select();

      if (insertError) throw insertError;
      createdTasks = data || [];

      // If any tasks were auto-approved, trigger execution engine
      const autoApproved = createdTasks.filter((t: any) => t.status === 'approved_ready');
      if (autoApproved.length > 0) {
        // Find the user who owns this org to pass as user_id
        const { data: orgUser } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', organization_id)
          .limit(1)
          .single();

        if (orgUser) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/executeTalentOutreach`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_id: orgUser.id,
                campaign_id: campaign_id || undefined,
              }),
            });
            console.log(`[processOutreachScheduler] Triggered auto-send for ${autoApproved.length} tasks`);
          } catch (triggerErr) {
            console.error('[processOutreachScheduler] Failed to trigger auto-send:', triggerErr);
          }
        }
      }

      // Log the scheduler run (only try if table exists)
      try {
        await supabase
          .from("system_logs")
          .insert({
            organization_id,
            event_type: "outreach_scheduler_run",
            metadata: {
              tasks_created: createdTasks.length,
              candidates_processed: processedCandidates.size,
              campaign_id,
            },
          });
      } catch (logError) {
        // Ignore if system_logs table doesn't exist
        console.log("Could not log scheduler run:", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        sent_tasks_analyzed: sentTasks?.length || 0,
        follow_ups_created: dry_run ? tasksToCreate.length : createdTasks.length,
        tasks_to_create: dry_run ? tasksToCreate : undefined,
        created_tasks: dry_run ? undefined : createdTasks,
        skipped: skippedReasons.slice(0, 10), // Limit for response size
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
