/**
 * Task Pixel — AI Task Intelligence Edge Function
 *
 * Provides smart suggestions for tasks:
 * - suggest_subtasks: Break a task into checklist items
 * - suggest_priority: Suggest priority based on context
 * - write_description: Generate description from title
 * - estimate_time: Suggest time estimate
 * - summarize_overdue: Summarize overdue task situation
 * - triage_meeting: Process meeting action items into draft tasks
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 200): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJsonResponse(text: string): any {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\[[\s\S]*?\]|\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Fall through
    }
  }
  // Return as array of lines
  return text
    .split('\n')
    .map(l => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

async function suggestSubtasks(context: any): Promise<any> {
  const systemPrompt = `You are Pixel, an AI task assistant. Break down the given task into 3-7 actionable subtasks. Return ONLY a JSON array of strings, no explanation.`;
  const userPrompt = `Task: "${context.taskTitle}"${context.taskDescription ? `\nDescription: ${context.taskDescription}` : ''}`;

  const result = await callGroq(systemPrompt, userPrompt, 300);
  return { suggestions: parseJsonResponse(result) };
}

async function suggestPriority(context: any): Promise<any> {
  const systemPrompt = `You are Pixel, an AI task assistant. Suggest a priority level for the given task. Consider the due date, title, and description. Return ONLY one word: "low", "medium", "high", or "urgent". No explanation.`;
  const dueInfo = context.taskDueDate ? `Due: ${context.taskDueDate}` : 'No due date set';
  const userPrompt = `Task: "${context.taskTitle}"\n${dueInfo}${context.taskDescription ? `\nDescription: ${context.taskDescription}` : ''}`;

  const result = await callGroq(systemPrompt, userPrompt, 10);
  const priority = result.toLowerCase().trim().replace(/[^a-z]/g, '');
  const valid = ['low', 'medium', 'high', 'urgent'];
  return { result: valid.includes(priority) ? priority : 'medium' };
}

async function writeDescription(context: any): Promise<any> {
  const systemPrompt = `You are Pixel, an AI task assistant. Write a brief, clear task description (2-3 sentences max) based on the task title. Be specific and actionable. Return only the description text.`;
  const userPrompt = `Task title: "${context.taskTitle}"`;

  const result = await callGroq(systemPrompt, userPrompt, 150);
  return { result: result.trim() };
}

async function estimateTime(context: any): Promise<any> {
  const systemPrompt = `You are Pixel, an AI task assistant. Estimate the time in minutes to complete this task. Return ONLY a number (integer minutes). No text.`;
  const userPrompt = `Task: "${context.taskTitle}"${context.taskDescription ? `\nDescription: ${context.taskDescription}` : ''}`;

  const result = await callGroq(systemPrompt, userPrompt, 10);
  const minutes = parseInt(result.replace(/\D/g, ''));
  return { result: isNaN(minutes) ? 30 : minutes };
}

async function summarizeOverdue(context: any): Promise<any> {
  const suggestions = [];

  if (context.overdueCount > 0) {
    suggestions.push({
      message: `You have ${context.overdueCount} overdue task${context.overdueCount > 1 ? 's' : ''}. Consider rescheduling or prioritizing them.`,
      action: 'reschedule_overdue',
    });
  }

  if (context.highPriorityCount > 3) {
    suggestions.push({
      message: `${context.highPriorityCount} high-priority tasks detected. Focus on the most urgent ones first.`,
      action: 'focus_high_priority',
    });
  }

  if (context.taskCount > 20) {
    suggestions.push({
      message: `You have ${context.taskCount} tasks. Consider archiving completed ones and breaking down large tasks.`,
      action: 'cleanup',
    });
  }

  return { suggestions };
}

async function triageMeeting(context: any): Promise<any> {
  if (!context.meetingTranscript) {
    return { suggestions: [], error: 'No meeting transcript provided' };
  }

  const systemPrompt = `You are Pixel, an AI task assistant. Extract action items from this meeting transcript. Return a JSON array of objects with fields: "title" (task title), "priority" ("low"/"medium"/"high"/"urgent"), "assignee_hint" (person name if mentioned, null otherwise). Maximum 10 items.`;

  const result = await callGroq(systemPrompt, context.meetingTranscript.slice(0, 3000), 500);
  const items = parseJsonResponse(result);

  return {
    suggestions: Array.isArray(items)
      ? items.map((item: any) => ({
          title: typeof item === 'string' ? item : item.title || String(item),
          priority: item.priority || 'medium',
          assignee_hint: item.assignee_hint || null,
        }))
      : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, context = {} } = body;

    let result;

    switch (action) {
      case 'suggest_subtasks':
        result = await suggestSubtasks(context);
        break;
      case 'suggest_priority':
        result = await suggestPriority(context);
        break;
      case 'write_description':
        result = await writeDescription(context);
        break;
      case 'estimate_time':
        result = await estimateTime(context);
        break;
      case 'summarize_overdue':
        result = await summarizeOverdue(context);
        break;
      case 'triage_meeting':
        result = await triageMeeting(context);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[task-pixel] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
