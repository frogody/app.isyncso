/**
 * Generate Daily Journal Edge Function
 *
 * Generates a daily journal from hourly activity summaries.
 * Can be called on-demand from the web app.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Types
interface AppBreakdown {
  appName: string;
  minutes: number;
  percentage: number;
  category: string;
}

interface HourlySummary {
  id: string;
  user_id: string;
  company_id: string;
  hour_start: string;
  app_breakdown: AppBreakdown[];
  total_minutes: number;
  focus_score: number;
}

interface DayHighlight {
  type: 'achievement' | 'focus_session' | 'productive_streak' | 'meeting_heavy' | 'communication_heavy';
  description: string;
  timeRange?: string;
  durationMinutes?: number;
}

interface FocusArea {
  category: string;
  minutes: number;
  percentage: number;
  apps: string[];
}

// Helper functions
function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function findLongestStreak(hours: number[]): number[] {
  if (hours.length === 0) return [];

  const sorted = [...hours].sort((a, b) => a - b);
  let longest: number[] = [sorted[0]];
  let current: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current.push(sorted[i]);
    } else {
      if (current.length > longest.length) {
        longest = [...current];
      }
      current = [sorted[i]];
    }
  }

  if (current.length > longest.length) {
    longest = current;
  }

  return longest;
}

function generateFocusAreas(
  categoryMinutes: Map<string, { minutes: number; apps: Set<string> }>,
  totalMinutes: number
): FocusArea[] {
  const areas: FocusArea[] = [];

  for (const [category, data] of categoryMinutes) {
    areas.push({
      category,
      minutes: data.minutes,
      percentage: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
      apps: Array.from(data.apps).slice(0, 5),
    });
  }

  return areas.sort((a, b) => b.minutes - a.minutes);
}

function generateHighlights(
  hourlyData: { hour: number; minutes: number; focusScore: number }[],
  categoryMinutes: Map<string, { minutes: number; apps: Set<string> }>,
  totalMinutes: number,
  avgFocusScore: number
): DayHighlight[] {
  const highlights: DayHighlight[] = [];

  // Check for high focus sessions
  const highFocusHours = hourlyData.filter((h) => h.focusScore > 0.7);
  if (highFocusHours.length >= 2) {
    const streak = findLongestStreak(highFocusHours.map((h) => h.hour));
    if (streak.length >= 2) {
      highlights.push({
        type: 'productive_streak',
        description: `${streak.length}-hour productive streak`,
        timeRange: `${formatHour(streak[0])} - ${formatHour(streak[streak.length - 1] + 1)}`,
        durationMinutes: streak.length * 60,
      });
    }
  }

  // Check for deep work achievement
  const devMinutes = categoryMinutes.get('Development')?.minutes || 0;
  const productivityMinutes = categoryMinutes.get('Productivity')?.minutes || 0;
  const deepWorkMinutes = devMinutes + productivityMinutes;
  if (deepWorkMinutes >= 120) {
    highlights.push({
      type: 'achievement',
      description: `${Math.round(deepWorkMinutes / 60)} hours of deep work`,
      durationMinutes: deepWorkMinutes,
    });
  }

  // Check for meeting-heavy day
  const meetingMinutes = categoryMinutes.get('Meetings')?.minutes || 0;
  if (meetingMinutes >= 120 && totalMinutes > 0 && meetingMinutes / totalMinutes > 0.3) {
    highlights.push({
      type: 'meeting_heavy',
      description: `${Math.round(meetingMinutes / 60)} hours in meetings`,
      durationMinutes: meetingMinutes,
    });
  }

  // Check for communication-heavy day
  const commMinutes = categoryMinutes.get('Communication')?.minutes || 0;
  if (commMinutes >= 60 && totalMinutes > 0 && commMinutes / totalMinutes > 0.2) {
    highlights.push({
      type: 'communication_heavy',
      description: `${Math.round(commMinutes / 60)} hours in communication apps`,
      durationMinutes: commMinutes,
    });
  }

  // Check for focus session achievement
  if (avgFocusScore >= 0.6) {
    highlights.push({
      type: 'focus_session',
      description: `High focus day (${Math.round(avgFocusScore * 100)}% score)`,
    });
  }

  return highlights.slice(0, 5);
}

function generateOverview(
  date: Date,
  totalMinutes: number,
  avgFocusScore: number,
  mostUsedApp: string,
  topCategory: string,
  highlights: DayHighlight[]
): string {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const hours = Math.round(totalMinutes / 60 * 10) / 10;
  const focusPercent = Math.round(avgFocusScore * 100);

  let overview = `On ${dayName}, you were active for ${hours} hours with a ${focusPercent}% focus score. `;
  overview += `Most time was spent in ${mostUsedApp}, primarily doing ${topCategory.toLowerCase()}. `;

  if (highlights.length > 0) {
    const highlightTexts = highlights
      .slice(0, 2)
      .map((h) => h.description.toLowerCase());
    overview += `Notable: ${highlightTexts.join(', ')}.`;
  }

  return overview;
}

function computeJournal(summaries: HourlySummary[], date: Date) {
  let totalMinutes = 0;
  let totalFocusScore = 0;
  const appMinutes = new Map<string, { minutes: number; category: string }>();
  const categoryMinutes = new Map<string, { minutes: number; apps: Set<string> }>();
  const hourlyData: { hour: number; minutes: number; focusScore: number }[] = [];

  for (const summary of summaries) {
    totalMinutes += summary.total_minutes;
    totalFocusScore += summary.focus_score;

    const hour = new Date(summary.hour_start).getHours();
    hourlyData.push({
      hour,
      minutes: summary.total_minutes,
      focusScore: summary.focus_score,
    });

    // Handle both array and legacy object formats
    const breakdown: AppBreakdown[] = Array.isArray(summary.app_breakdown)
      ? summary.app_breakdown
      : Object.entries(summary.app_breakdown || {}).map(([appName, mins]) => ({
          appName,
          minutes: typeof mins === 'number' ? mins : 0,
          percentage: 0,
          category: 'Other',
        }));

    for (const app of breakdown) {
      const existing = appMinutes.get(app.appName);
      if (existing) {
        existing.minutes += app.minutes;
      } else {
        appMinutes.set(app.appName, { minutes: app.minutes, category: app.category || 'Other' });
      }

      const category = app.category || 'Other';
      const catExisting = categoryMinutes.get(category);
      if (catExisting) {
        catExisting.minutes += app.minutes;
        catExisting.apps.add(app.appName);
      } else {
        categoryMinutes.set(category, {
          minutes: app.minutes,
          apps: new Set([app.appName]),
        });
      }
    }
  }

  const avgFocusScore = summaries.length > 0
    ? Math.round((totalFocusScore / summaries.length) * 100) / 100
    : 0;

  // Find peak productivity hour
  const peakHour = hourlyData.reduce(
    (best, current) => current.focusScore > best.focusScore ? current : best,
    { hour: 0, minutes: 0, focusScore: 0 }
  );
  const peakProductivityHour = formatHour(peakHour.hour);

  // Find most used app
  let mostUsedApp = 'None';
  let maxAppMinutes = 0;
  for (const [app, data] of appMinutes) {
    if (data.minutes > maxAppMinutes) {
      maxAppMinutes = data.minutes;
      mostUsedApp = app;
    }
  }

  // Generate focus areas, highlights, and overview
  const focusAreas = generateFocusAreas(categoryMinutes, totalMinutes);
  const highlights = generateHighlights(hourlyData, categoryMinutes, totalMinutes, avgFocusScore);
  const overview = generateOverview(
    date,
    totalMinutes,
    avgFocusScore,
    mostUsedApp,
    focusAreas[0]?.category || 'various activities',
    highlights
  );

  // Get top apps for the journal
  const topApps = Array.from(appMinutes.entries())
    .map(([name, data]) => ({ name, minutes: data.minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  return {
    overview,
    highlights,
    focus_areas: focusAreas,
    total_active_minutes: totalMinutes,
    productivity_score: avgFocusScore,
    peak_productivity_hour: peakProductivityHour,
    most_used_app: mostUsedApp,
    top_apps: topApps,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, company_id, date } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse date or use today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const dayStart = targetDate.toISOString();
    const dayEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const journalDate = targetDate.toISOString().split('T')[0];

    console.log(`[generate-daily-journal] Generating for user ${user_id}, date ${journalDate}`);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch hourly summaries for the day
    const { data: summaries, error: summariesError } = await supabase
      .from('desktop_activity_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('hour_start', dayStart)
      .lt('hour_start', dayEnd)
      .order('hour_start', { ascending: true });

    if (summariesError) {
      console.error('[generate-daily-journal] Error fetching summaries:', summariesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch activity data', details: summariesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!summaries || summaries.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No activity data for this date',
          date: journalDate,
          summaries_count: 0
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-daily-journal] Found ${summaries.length} hourly summaries`);

    // Generate the journal
    const journalData = computeJournal(summaries as HourlySummary[], targetDate);

    // Upsert the journal
    const { data: journal, error: journalError } = await supabase
      .from('daily_journals')
      .upsert({
        user_id,
        company_id: company_id || summaries[0]?.company_id,
        journal_date: journalDate,
        overview: journalData.overview,
        highlights: journalData.highlights,
        focus_areas: journalData.focus_areas,
        total_active_minutes: journalData.total_active_minutes,
        productivity_score: journalData.productivity_score,
        top_apps: journalData.top_apps,
      }, {
        onConflict: 'user_id,journal_date',
      })
      .select()
      .single();

    if (journalError) {
      console.error('[generate-daily-journal] Error upserting journal:', journalError);
      return new Response(
        JSON.stringify({ error: 'Failed to save journal', details: journalError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-daily-journal] Successfully generated journal for ${journalDate}`);

    return new Response(
      JSON.stringify({
        success: true,
        journal,
        summaries_count: summaries.length,
        date: journalDate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[generate-daily-journal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
