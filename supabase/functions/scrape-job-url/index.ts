// Supabase Edge Function: scrape-job-url
// Scrapes a job posting URL and extracts structured role information using LLM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid URL format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`[scrape-job-url] Fetching: ${url}`);

    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${response.status} ${response.statusText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const html = await response.text();
    console.log(`[scrape-job-url] Got ${html.length} chars of HTML`);

    // Extract text content from HTML (strip tags, scripts, styles)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 12000); // Limit to ~12k chars for LLM context

    if (textContent.length < 100) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not extract meaningful content from the page" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Also try to extract JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    let structuredData = "";
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        const jsonContent = match.replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim();
        try {
          const parsed = JSON.parse(jsonContent);
          if (parsed["@type"] === "JobPosting" || parsed["@type"]?.includes?.("JobPosting")) {
            structuredData = JSON.stringify(parsed, null, 2);
            break;
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    console.log(`[scrape-job-url] Text: ${textContent.length} chars, Structured data: ${structuredData ? "found" : "none"}`);

    // Use Groq LLM to extract structured role info
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "GROQ_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const systemPrompt = `You are a job posting data extractor. Given the text content of a job posting page, extract structured information about the role.

Return ONLY a valid JSON object with these fields (use null for missing fields):
{
  "title": "Job title",
  "description": "Brief role description (2-3 sentences)",
  "requirements": ["requirement 1", "requirement 2", ...],
  "responsibilities": "Key responsibilities as a paragraph",
  "location": "City, Country or Remote",
  "employment_type": "full_time" | "part_time" | "contract" | "freelance",
  "salary_min": number or null,
  "salary_max": number or null,
  "salary_currency": "EUR" | "USD" | "GBP" etc,
  "experience_required": "e.g. 3-5 years",
  "remote_policy": "remote" | "hybrid" | "onsite" | null,
  "company_name": "The hiring company name",
  "department": "Department if mentioned"
}

Important:
- Extract salary as numbers only (no currency symbols). If salary is "€80k-100k", set salary_min=80000, salary_max=100000
- For requirements, create a clean array of individual requirements
- Be thorough but concise`;

    const userPrompt = structuredData
      ? `Extract the job role information from this page.\n\nStructured data found:\n${structuredData}\n\nPage text:\n${textContent}`
      : `Extract the job role information from this page text:\n\n${textContent}`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error(`[scrape-job-url] Groq API error: ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to analyze job posting" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "No response from AI" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let roleData;
    try {
      roleData = JSON.parse(content);
    } catch {
      console.error(`[scrape-job-url] Failed to parse LLM response: ${content}`);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse extracted data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`[scrape-job-url] Extracted role: ${roleData.title} at ${roleData.company_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        role: roleData,
        source_url: url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[scrape-job-url] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
