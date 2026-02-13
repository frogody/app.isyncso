/**
 * Generate Daily Journal Edge Function
 *
 * Generates a daily journal from hourly activity summaries.
 * Includes AI-generated rich narrative content using Together.ai.
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
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

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
  ocr_text?: string;
  semantic_category?: string;
  commitments?: any;
  activities_summary?: string;
  screen_captures?: any[];
}

interface DayHighlight {
  type: 'achievement' | 'focus_session' | 'productive_streak' | 'meeting_heavy' | 'communication_heavy';
  description: string;
  timeRange?: string;
  durationMinutes?: number;
}

interface AIGeneratedContent {
  overview: string;
  summaryPoints: string[];
  timelineNarrative: string;
  personalNotes: string;
  communications: string;
  actionItems: string;
}

interface WeeklyJournal {
  journal_date: string;
  total_active_minutes: number;
  productivity_score: number;
  overview?: string;
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

// AI Content Generation using Together.ai
async function generateAIContent(
  date: Date,
  totalMinutes: number,
  avgFocusScore: number,
  topApps: { name: string; minutes: number }[],
  focusAreas: FocusArea[],
  highlights: DayHighlight[],
  hourlyData: { hour: number; minutes: number; focusScore: number; semanticCategory?: string; ocrSnippet?: string }[],
  weeklyJournals: WeeklyJournal[],
  deepContext?: {
    ocrTexts: { hour: number; text: string }[];
    semanticCategories: { hour: number; category: string }[];
    commitments: any[];
  }
): Promise<AIGeneratedContent | null> {
  if (!TOGETHER_API_KEY) {
    console.log('[generate-daily-journal] No TOGETHER_API_KEY, skipping AI generation');
    return null;
  }

  // Lower threshold when deep context is available
  const minMinutes = deepContext?.ocrTexts?.length ? 5 : 30;
  if (totalMinutes < minMinutes) {
    console.log(`[generate-daily-journal] Less than ${minMinutes} minutes tracked, skipping AI generation`);
    return null;
  }

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const hours = Math.round(totalMinutes / 60 * 10) / 10;
  const focusPercent = Math.round(avgFocusScore * 100);

  // Build hourly breakdown for timeline (now with semantic categories)
  const hourlyBreakdown = hourlyData
    .filter(h => h.minutes > 5)
    .sort((a, b) => a.hour - b.hour)
    .map(h => {
      let line = `${formatHour(h.hour)}: ${h.minutes}m active, ${Math.round(h.focusScore * 100)}% focus`;
      if (h.activitiesSummary) line += ` — ${h.activitiesSummary}`;
      else if (h.semanticCategory) line += ` [${h.semanticCategory}]`;
      if (h.ocrSnippet) line += ` — "${h.ocrSnippet.slice(0, 100)}..."`;
      return line;
    })
    .join('\n');

  // Build weekly context
  let weeklyContext = '';
  if (weeklyJournals.length > 0) {
    const avgWeeklyMinutes = weeklyJournals.reduce((sum, j) => sum + j.total_active_minutes, 0) / weeklyJournals.length;
    const avgWeeklyScore = weeklyJournals.reduce((sum, j) => sum + j.productivity_score, 0) / weeklyJournals.length;
    const comparison = totalMinutes > avgWeeklyMinutes ? 'more active than' : totalMinutes < avgWeeklyMinutes ? 'less active than' : 'about the same as';
    weeklyContext = `This week's average: ${Math.round(avgWeeklyMinutes)} minutes/day, ${Math.round(avgWeeklyScore * 100)}% productivity. Today was ${comparison} average.`;
  }

  // Build deep context section for prompt
  let deepContextSection = '';
  if (deepContext) {
    // OCR captured text (what the user was actually reading/writing)
    if (deepContext.ocrTexts.length > 0) {
      const ocrSummary = deepContext.ocrTexts
        .sort((a, b) => a.hour - b.hour)
        .map(o => {
          // Truncate to keep prompt reasonable
          const snippet = o.text.length > 300 ? o.text.slice(0, 300) + '...' : o.text;
          return `  ${formatHour(o.hour)}: "${snippet}"`;
        })
        .join('\n');
      deepContextSection += `\nScreen Content Captured (what was on screen):\n${ocrSummary}\n`;
    }

    // Semantic categories per hour (what type of work)
    if (deepContext.semanticCategories.length > 0) {
      const catSummary = deepContext.semanticCategories
        .sort((a, b) => a.hour - b.hour)
        .map(c => `  ${formatHour(c.hour)}: ${c.category}`)
        .join('\n');
      deepContextSection += `\nWork Types by Hour:\n${catSummary}\n`;
    }

    // Commitments detected during the day
    if (deepContext.commitments.length > 0) {
      const commitmentLines = deepContext.commitments
        .map(c => {
          if (typeof c === 'string') return `  - ${c}`;
          const desc = c.description || c.text || c.content || JSON.stringify(c);
          const status = c.status ? ` (${c.status})` : '';
          const due = c.dueDate || c.due_date ? ` — due: ${c.dueDate || c.due_date}` : '';
          return `  - ${desc}${status}${due}`;
        })
        .join('\n');
      deepContextSection += `\nCommitments Detected Today:\n${commitmentLines}\n`;
    }
  }

  // Also generate per-hour activity summaries for the timeline view
  const hourlyActivities = hourlyData
    .filter(h => h.minutes > 0)
    .sort((a, b) => a.hour - b.hour)
    .map(h => {
      let line = `${formatHour(h.hour)}: ${h.minutes}m`;
      if (h.activitiesSummary) line += ` — ${h.activitiesSummary}`;
      else if (h.semanticCategory) line += ` [${h.semanticCategory}]`;
      if (h.ocrSnippet) line += ` "${h.ocrSnippet.slice(0, 150)}"`;
      return line;
    })
    .join('\n');

  const hasDeepContext = deepContextSection.length > 0;

  const systemPrompt = `You are a workplace activity report generator for a business productivity platform. Your job is to produce factual, concise daily activity reports in third person. Write like a professional executive assistant summarizing what an employee did during the day.

Rules:
- Be factual and specific. State what was done, when, and for how long.
- Use third person ("The user worked on..." or "Spent 2 hours in...").
- Never use flowery language, metaphors, or creative writing.
- Never write "like a campfire" or any poetic comparisons.
- Do NOT use markdown formatting, bullet points with *, or headers with #.
- If screen content or OCR data is available, reference specific projects, documents, emails, meetings, and conversations by name.
- If communication apps were used (Slack, Teams, Zoom, Google Meet, Mail, etc.), note who was communicated with if detectable from screen content.
- Keep it professional and to the point. This is a business tool, not a personal diary.`;

  const userPrompt = `Generate a daily activity report for ${dayName}, ${dateStr}.

Activity Data:
- Total active time: ${hours} hours (${totalMinutes} minutes)
- Overall focus score: ${focusPercent}%
- Top applications: ${topApps.slice(0, 5).map(a => `${a.name} (${a.minutes}m)`).join(', ')}
- Focus areas: ${focusAreas.slice(0, 3).map(f => `${f.category}: ${f.percentage}%`).join(', ')}
- Highlights: ${highlights.map(h => h.description).join(', ') || 'None detected'}

Hourly Activity:
${hourlyBreakdown || 'No detailed hourly data'}
${deepContextSection}
${weeklyContext ? `Weekly Context: ${weeklyContext}` : ''}

Generate the following sections in JSON format:
{
  "overview": "2-3 factual sentences summarizing the day: total active hours, primary focus areas, and key accomplishments. Example: 'Active for 6.2 hours with 72% focus. Primarily worked on development (3.5h) and communication (1.2h). Peak productivity between 10am-12pm.'",
  "summaryPoints": ["5-8 factual bullet points of key activities and tasks completed. Each should state WHAT was done and for HOW LONG. ${hasDeepContext ? 'Reference specific project names, document titles, email threads, code repos, and websites from the screen content data.' : 'Reference the applications and categories used.'} Example: 'Worked in VS Code for 3 hours on the sync-desktop project.' or 'Attended a 45-minute Zoom meeting from 2pm-2:45pm.'"],
  "timelineNarrative": "A chronological hour-by-hour activity log. For each active hour, state the time range, what apps were used, what category of work it was, and what specifically was being done if known from screen content. Write as compact paragraphs grouped by time blocks, not as a list. Example: '9:00-10:00: Started the day in Terminal and VS Code working on the scheduler service. Focus score 85%. 10:00-11:30: Switched to Chrome for research, then back to VS Code for implementation.'",
  "communications": "Summary of all detected communications: emails sent/read, Slack/Teams messages, video calls, meetings. Include who was communicated with if detectable from screen content, and what topics were discussed. If no communication detected, state 'No communication activity detected.'",
  "actionItems": "List any commitments, follow-ups, or action items detected during the day.${hasDeepContext && deepContext?.commitments?.length ? ' Include the commitments detected from screen content.' : ''} If none detected, state 'No action items detected.'",
  "personalNotes": "1-2 factual observations about work patterns. Example: 'Focus score dropped after 3pm — consider scheduling deep work in the morning.' or 'Spent 40% of the day in meetings, higher than this week\\'s average of 25%.'"
}

Respond ONLY with valid JSON, no additional text.`;

  try {
    console.log('[generate-daily-journal] Calling Together.ai for AI content generation');

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/Kimi-K2-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-daily-journal] Together.ai error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[generate-daily-journal] No content in response');
      return null;
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    console.log('[generate-daily-journal] AI content generated successfully');

    return {
      overview: parsed.overview || '',
      summaryPoints: Array.isArray(parsed.summaryPoints) ? parsed.summaryPoints : [],
      timelineNarrative: parsed.timelineNarrative || '',
      personalNotes: parsed.personalNotes || '',
      communications: parsed.communications || '',
      actionItems: parsed.actionItems || '',
    };
  } catch (error: any) {
    console.error('[generate-daily-journal] AI generation error:', error.message);
    return null;
  }
}

function computeJournal(summaries: HourlySummary[], date: Date) {
  let totalMinutes = 0;
  let totalFocusScore = 0;
  const appMinutes = new Map<string, { minutes: number; category: string }>();
  const categoryMinutes = new Map<string, { minutes: number; apps: Set<string> }>();
  const hourlyData: { hour: number; minutes: number; focusScore: number; semanticCategory?: string; ocrSnippet?: string; activitiesSummary?: string }[] = [];

  // Deep context aggregation
  const ocrTexts: { hour: number; text: string }[] = [];
  const semanticCategories: { hour: number; category: string }[] = [];
  const allCommitments: any[] = [];

  for (const summary of summaries) {
    totalMinutes += summary.total_minutes;
    totalFocusScore += summary.focus_score;

    const hour = new Date(summary.hour_start).getHours();
    hourlyData.push({
      hour,
      minutes: summary.total_minutes,
      focusScore: summary.focus_score,
      semanticCategory: summary.semantic_category || undefined,
      ocrSnippet: summary.ocr_text ? summary.ocr_text.slice(0, 200) : undefined,
      activitiesSummary: summary.activities_summary || undefined,
    });

    // Collect deep context data
    if (summary.ocr_text) {
      ocrTexts.push({ hour, text: summary.ocr_text });
    }
    if (summary.semantic_category) {
      semanticCategories.push({ hour, category: summary.semantic_category });
    }
    if (summary.commitments) {
      const commitments = typeof summary.commitments === 'string'
        ? JSON.parse(summary.commitments)
        : summary.commitments;
      if (Array.isArray(commitments)) {
        allCommitments.push(...commitments);
      } else if (commitments && typeof commitments === 'object') {
        allCommitments.push(commitments);
      }
    }

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
    hourly_data: hourlyData,
    // Deep context aggregations
    ocr_texts: ocrTexts,
    semantic_categories: semanticCategories,
    commitments_detected: allCommitments,
    has_deep_context: ocrTexts.length > 0 || allCommitments.length > 0,
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

    // Generate the deterministic journal data
    const journalData = computeJournal(summaries as HourlySummary[], targetDate);

    // Fetch last 7 days of journals for weekly context
    const weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - 7);
    const { data: weeklyJournals } = await supabase
      .from('daily_journals')
      .select('journal_date, total_active_minutes, productivity_score, overview')
      .eq('user_id', user_id)
      .gte('journal_date', weekStart.toISOString().split('T')[0])
      .lt('journal_date', journalDate)
      .order('journal_date', { ascending: false })
      .limit(7);

    // Generate AI content if API key is available and sufficient data
    let aiContent: AIGeneratedContent | null = null;
    let weeklyContext = '';

    // Lower minimum threshold when deep context data is available
    const minMinutes = journalData.has_deep_context ? 5 : 30;
    if (TOGETHER_API_KEY && journalData.total_active_minutes >= minMinutes) {
      // Build weekly context string
      if (weeklyJournals && weeklyJournals.length > 0) {
        const avgWeeklyMinutes = weeklyJournals.reduce((sum, j) => sum + j.total_active_minutes, 0) / weeklyJournals.length;
        const avgWeeklyScore = weeklyJournals.reduce((sum, j) => sum + j.productivity_score, 0) / weeklyJournals.length;
        const comparison = journalData.total_active_minutes > avgWeeklyMinutes ? 'more active than' : journalData.total_active_minutes < avgWeeklyMinutes ? 'less active than' : 'about the same as';
        weeklyContext = `Compared to your ${weeklyJournals.length}-day average of ${Math.round(avgWeeklyMinutes)} minutes and ${Math.round(avgWeeklyScore * 100)}% productivity, today was ${comparison} your recent baseline.`;
      }

      aiContent = await generateAIContent(
        targetDate,
        journalData.total_active_minutes,
        journalData.productivity_score,
        journalData.top_apps,
        journalData.focus_areas,
        journalData.highlights,
        journalData.hourly_data,
        (weeklyJournals || []) as WeeklyJournal[],
        journalData.has_deep_context ? {
          ocrTexts: journalData.ocr_texts,
          semanticCategories: journalData.semantic_categories,
          commitments: journalData.commitments_detected,
        } : undefined
      );
    }

    // Prepare journal record with AI content if available
    const journalRecord = {
      user_id,
      company_id: company_id || summaries[0]?.company_id,
      journal_date: journalDate,
      overview: aiContent?.overview || journalData.overview,
      highlights: journalData.highlights,
      focus_areas: journalData.focus_areas,
      total_active_minutes: journalData.total_active_minutes,
      productivity_score: journalData.productivity_score,
      top_apps: journalData.top_apps,
      // New AI-generated fields
      summary_points: aiContent?.summaryPoints || [],
      timeline_narrative: aiContent?.timelineNarrative || null,
      personal_notes: aiContent?.personalNotes || null,
      communications: aiContent?.communications || null,
      action_items: aiContent?.actionItems || null,
      weekly_context: weeklyContext || null,
      ai_generated: !!aiContent,
    };

    // Upsert the journal
    const { data: journal, error: journalError } = await supabase
      .from('daily_journals')
      .upsert(journalRecord, {
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

    console.log(`[generate-daily-journal] Successfully generated ${aiContent ? 'AI-enhanced' : 'basic'} journal for ${journalDate}`);

    return new Response(
      JSON.stringify({
        success: true,
        journal,
        summaries_count: summaries.length,
        date: journalDate,
        ai_generated: !!aiContent,
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
