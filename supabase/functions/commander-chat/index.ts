/**
 * Commander Chat - Roadmap Manager Agent
 *
 * Processes natural language feature requests, understands the app structure,
 * and places features on the roadmap with correct module, priority, and dependencies.
 *
 * Supports SSE streaming responses following the SYNC pattern.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Module Categories (matches AdminRoadmap.jsx) ──────────
const MODULES = {
  platform: "Platform Core — auth, layout, navigation, settings, roles, permissions",
  crm: "CRM & Sales — contacts, companies, pipeline, proposals, outreach",
  finance: "Finance — invoices, expenses, payments, proposals, billing",
  products: "Products — inventory, catalog, pricing, variants, bundles, barcode",
  sync_agent: "SYNC Agent — AI assistant, actions, memory, workflows, chat",
  talent: "Talent & Recruitment — candidates, nests, campaigns, outreach, intel",
  growth: "Growth & Marketing — leads, pipeline, campaigns, analytics",
  marketplace: "Marketplace — listings, nests, templates, purchasing",
  admin: "Admin Panel — dashboard, user management, analytics, settings",
  sentinel: "Sentinel — EU AI Act compliance, risk assessment, documentation",
  integrations: "Integrations — Composio, third-party APIs, webhooks",
  infrastructure: "Infrastructure — database, edge functions, storage, performance",
  learn: "Learn — courses, certificates, quizzes, learning paths",
};

// ─── System Prompt ─────────────────────────────────────────
async function buildSystemPrompt(): Promise<string> {
  // Fetch current roadmap stats
  const { data: items } = await supabase
    .from("roadmap_items")
    .select("id, title, category, status, priority, depends_on");

  const stats: Record<string, Record<string, number>> = {};
  const allItems: Array<{ id: string; title: string; category: string; status: string }> = [];

  for (const item of items || []) {
    if (!stats[item.category]) stats[item.category] = {};
    stats[item.category][item.status] = (stats[item.category][item.status] || 0) + 1;
    allItems.push(item);
  }

  const moduleContext = Object.entries(MODULES)
    .map(([key, desc]) => {
      const s = stats[key] || {};
      const total = Object.values(s).reduce((a: number, b: number) => a + b, 0);
      return `- **${key}**: ${desc} (${total} items: ${s.shipped || 0} shipped, ${s.in_progress || 0} in progress, ${s.planned || 0} planned)`;
    })
    .join("\n");

  // Fetch agent status
  const { data: agents } = await supabase
    .from("agent_registry")
    .select("id, name, status, current_task_id");

  const agentStatus = (agents || [])
    .map((a) => `- ${a.name}: ${a.status}${a.current_task_id ? " (working)" : ""}`)
    .join("\n");

  return `You are the **Roadmap Commander** for iSyncSO — the on-demand app development platform manager.

## Your Role
You help the owner (Gody) plan and organize features for the iSyncSO platform. You understand the entire app structure and can:
1. Parse natural language feature requests
2. Determine which module a feature belongs to
3. Assess priority and dependencies
4. Create roadmap items with correct metadata
5. Queue features for auto-build by the worker fleet
6. Report on agent status and platform health

## App Modules
${moduleContext}

## Worker Fleet Status
${agentStatus || "No agents registered yet"}

## Current Date
${new Date().toISOString().split("T")[0]}

## How to Respond

When the user describes a feature:
1. Confirm you understand what they want
2. Suggest which **module** it belongs to
3. Suggest a **priority** (critical, high, medium, low)
4. Identify **files likely affected** if you can infer them
5. Note any **dependencies** on existing features
6. Ask if they want to place it on the roadmap

When the user confirms, output an ACTION block:
[ACTION]{"action":"create_roadmap_item","data":{"title":"...","description":"...","category":"module_key","priority":"high","files_affected":["src/..."],"tags":["tag1"],"auto_queued":false}}[/ACTION]

If the user says to queue it for build, set auto_queued to true.

Other available actions:
[ACTION]{"action":"get_agent_status"}[/ACTION]
[ACTION]{"action":"get_health_summary"}[/ACTION]
[ACTION]{"action":"update_item","data":{"id":"uuid","status":"planned","priority":"high"}}[/ACTION]

## Style
- Be concise and direct — Gody is technical
- Use bullet points for feature breakdowns
- Don't over-explain obvious things
- When unsure about module placement, suggest your best guess and ask

## Existing Features (for dependency awareness)
${allItems.slice(-30).map((i) => `- [${i.category}] ${i.title} (${i.status})`).join("\n")}
`;
}

// ─── Execute Actions ───────────────────────────────────────
async function executeAction(action: string, data: Record<string, unknown>): Promise<string> {
  switch (action) {
    case "create_roadmap_item": {
      const { error, data: item } = await supabase
        .from("roadmap_items")
        .insert({
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority || "medium",
          status: "planned",
          files_affected: data.files_affected || [],
          tags: data.tags || [],
          auto_queued: data.auto_queued || false,
          subtasks: data.subtasks || [],
          depends_on: data.depends_on || [],
          created_by: "commander",
          history: [
            { action: "Created via Roadmap Commander", actor: "commander", at: new Date().toISOString() },
          ],
        })
        .select()
        .single();

      if (error) return `Failed to create item: ${error.message}`;
      return `Created roadmap item: **${item.title}** in ${item.category} (${item.priority})${item.auto_queued ? " — queued for auto-build" : ""}. ID: ${item.id}`;
    }

    case "get_agent_status": {
      const { data: agents } = await supabase.from("agent_registry").select("*");
      if (!agents?.length) return "No agents registered.";
      return agents
        .map((a) => `**${a.name}** (${a.agent_type}): ${a.status} | Tasks: ${a.metrics?.tasks_completed || 0} | Errors: ${a.metrics?.error_count || 0}`)
        .join("\n");
    }

    case "get_health_summary": {
      const { data: score } = await supabase
        .from("platform_health_score")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!score) return "No health data available yet. Run a health check first.";
      return `Platform Health: **${score.score}/100** | Tests: ${score.total_tests} (${score.passed} passed, ${score.failed} failed, ${score.skipped} skipped)`;
    }

    case "update_item": {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from("roadmap_items")
        .update(updates)
        .eq("id", id);

      if (error) return `Failed to update: ${error.message}`;
      return `Updated roadmap item ${id}`;
    }

    default:
      return `Unknown action: ${action}`;
  }
}

// ─── Stream from Together.ai ───────────────────────────────
async function streamChat(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const response = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "moonshotai/Kimi-K2-Instruct",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Together API error: ${response.status} ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullResponse;
}

// ─── Extract actions from response ─────────────────────────
function extractActions(text: string): Array<{ action: string; data: Record<string, unknown> }> {
  const actions: Array<{ action: string; data: Record<string, unknown> }> = [];
  const regex = /\[ACTION\](.*?)\[\/ACTION\]/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      actions.push(parsed);
    } catch {
      // skip malformed actions
    }
  }
  return actions;
}

// ─── Main Handler ──────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, sessionId, stream = true, context = {} } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load or create session
    let session: { id: string; messages: Array<{ role: string; content: string }> };
    if (sessionId) {
      const { data } = await supabase
        .from("commander_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      session = data
        ? { id: data.id, messages: data.messages || [] }
        : { id: sessionId, messages: [] };
    } else {
      const { data } = await supabase
        .from("commander_sessions")
        .insert({ messages: [], title: message.substring(0, 50) })
        .select()
        .single();

      session = { id: data.id, messages: [] };
    }

    // Add user message
    session.messages.push({ role: "user", content: message });

    // Keep last 20 messages for context
    const recentMessages = session.messages.slice(-20);

    // Build system prompt with current app state
    const systemPrompt = await buildSystemPrompt();

    if (stream) {
      // SSE streaming response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Send session ID first
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "session", sessionId: session.id })}\n\n`)
            );

            const fullResponse = await streamChat(recentMessages, systemPrompt, (chunk) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
              );
            });

            // Execute any actions in the response
            const actions = extractActions(fullResponse);
            for (const { action, data } of actions) {
              const result = await executeAction(action, data);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "action_result", action, result })}\n\n`)
              );
            }

            // Save session
            session.messages.push({ role: "assistant", content: fullResponse });
            await supabase
              .from("commander_sessions")
              .upsert({
                id: session.id,
                messages: session.messages.slice(-40),
                updated_at: new Date().toISOString(),
              });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
          } catch (err) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming response
      let fullResponse = "";
      await streamChat(recentMessages, systemPrompt, (chunk) => {
        fullResponse += chunk;
      });

      const actions = extractActions(fullResponse);
      const actionResults = [];
      for (const { action, data } of actions) {
        const result = await executeAction(action, data);
        actionResults.push({ action, result });
      }

      session.messages.push({ role: "assistant", content: fullResponse });
      await supabase.from("commander_sessions").upsert({
        id: session.id,
        messages: session.messages.slice(-40),
        updated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          response: fullResponse,
          sessionId: session.id,
          actions: actionResults,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
