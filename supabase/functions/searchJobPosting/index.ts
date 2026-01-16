import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobSearchRequest {
  roleTitle: string;
  companyName: string;
  location: string;
}

interface ParsedJobPosting {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary_range: string | null;
  employment_type: string;
  experience_level: string | null;
  benefits: string[];
  source_url: string | null;
  source_domain: string | null;
}

interface SearchResponse {
  success: boolean;
  found: boolean;
  job: ParsedJobPosting | null;
  search_results_count: number;
  source_url: string | null;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { roleTitle, companyName, location } = await req.json() as JobSearchRequest;

    if (!roleTitle || !companyName) {
      return new Response(
        JSON.stringify({ error: "Role title and company name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching for job: ${roleTitle} at ${companyName} in ${location || 'any location'}`);

    // Build search query
    const searchQuery = `"${roleTitle}" "${companyName}" ${location || ''} job vacancy site:linkedin.com OR site:indeed.com OR site:glassdoor.com OR site:werkenbij OR site:careers`;

    // Use SerpAPI or Google Custom Search
    const serpApiKey = Deno.env.get("SERP_API_KEY");
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");

    let searchResults: any[] = [];
    let jobPostingContent = "";
    let sourceUrl = "";

    // Try SerpAPI first
    if (serpApiKey) {
      try {
        const serpResponse = await fetch(
          `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&num=10`
        );
        const serpData = await serpResponse.json();
        searchResults = serpData.organic_results || [];
        console.log(`SerpAPI returned ${searchResults.length} results`);
      } catch (e) {
        console.error("SerpAPI error:", e);
      }
    }

    // If we have results, try to fetch the first job posting
    if (searchResults.length > 0) {
      // Filter for job posting URLs that mention both the company and role
      const companyLower = companyName.toLowerCase();
      const roleLower = roleTitle.toLowerCase();

      const jobUrls = searchResults.filter(r => {
        const titleLower = (r.title || '').toLowerCase();
        const snippetLower = (r.snippet || '').toLowerCase();
        const linkLower = (r.link || '').toLowerCase();

        // Must be a job site
        const isJobSite = linkLower.includes('linkedin.com/jobs') ||
          linkLower.includes('indeed.com') ||
          linkLower.includes('glassdoor.com') ||
          linkLower.includes('werkenbij') ||
          linkLower.includes('careers');

        // Must mention the company name somewhere
        const mentionsCompany = titleLower.includes(companyLower) ||
          snippetLower.includes(companyLower) ||
          linkLower.includes(companyLower.replace(/\s+/g, ''));

        return isJobSite && mentionsCompany;
      });

      console.log(`Found ${jobUrls.length} relevant job URLs after filtering`);

      if (jobUrls.length > 0) {
        sourceUrl = jobUrls[0].link;

        // Try to fetch the page content (note: many sites block scraping)
        try {
          const pageResponse = await fetch(sourceUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
          });
          if (pageResponse.ok) {
            const html = await pageResponse.text();
            // Extract text content (basic extraction)
            jobPostingContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 8000); // Limit to 8000 chars for LLM
          }
        } catch (e) {
          console.log("Could not fetch job page directly, using search snippets");
        }

        // Use search snippets if we couldn't fetch the page
        if (!jobPostingContent) {
          jobPostingContent = jobUrls
            .slice(0, 5)
            .map(r => `Source: ${r.link}\nTitle: ${r.title}\nSnippet: ${r.snippet || ''}`)
            .join('\n\n');
        }
      }
    }

    // GUARDRAIL: If no relevant job posting was found, return NOT FOUND
    // DO NOT generate fake content
    if (!jobPostingContent || !sourceUrl) {
      console.log("No matching job posting found - returning not_found");

      const response: SearchResponse = {
        success: true,
        found: false,
        job: null,
        search_results_count: searchResults.length,
        source_url: null,
        message: `No job posting found for "${roleTitle}" at "${companyName}"${location ? ` in ${location}` : ''}. The role may not be publicly listed, or the search didn't return relevant results. You can manually enter the role details instead.`
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use LLM to parse EXISTING content only - NOT to generate new content
    if (!togetherApiKey) {
      return new Response(
        JSON.stringify({ error: "LLM API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GUARDRAIL: Strict system prompt - ONLY extract, NEVER generate
    const systemPrompt = `You are a job posting parser. Your ONLY job is to extract information from the provided content.

CRITICAL RULES:
1. ONLY extract information that EXISTS in the provided content
2. NEVER invent, assume, or generate information not present in the source
3. If a field cannot be determined from the content, set it to null or empty array
4. Do NOT add requirements or responsibilities that aren't explicitly stated
5. If salary is not mentioned, salary_range MUST be null
6. If benefits are not mentioned, benefits MUST be an empty array

Return a valid JSON object with these fields:
{
  "title": "exact job title from posting",
  "company": "company name from posting",
  "location": "location if specified, or null",
  "description": "summary from the actual posting content only",
  "requirements": ["only requirements explicitly mentioned"],
  "responsibilities": ["only responsibilities explicitly mentioned"],
  "salary_range": "only if explicitly mentioned, otherwise null",
  "employment_type": "full_time|part_time|contract|freelance - only if stated",
  "experience_level": "only if explicitly mentioned, otherwise null",
  "benefits": ["only benefits explicitly mentioned, empty array if none"]
}

If the content doesn't contain clear job posting information, return:
{"error": "insufficient_data", "reason": "Could not extract job details from content"}`;

    const userPrompt = `Extract job posting information from this content.
Remember: ONLY extract what's explicitly stated. Do NOT make up or assume any details.

Source URL: ${sourceUrl}

Content:
${jobPostingContent}

Return only valid JSON.`;

    const llmResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for factual extraction
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LLM API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to parse job posting" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const llmData = await llmResponse.json();
    const content = llmData.choices?.[0]?.message?.content || "";

    // Parse JSON from LLM response
    let parsedJob: ParsedJobPosting | null = null;
    try {
      // Extract JSON from response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]);

      // GUARDRAIL: Check if LLM returned an error
      if (parsed.error === "insufficient_data") {
        console.log("LLM could not extract sufficient data:", parsed.reason);

        const response: SearchResponse = {
          success: true,
          found: false,
          job: null,
          search_results_count: searchResults.length,
          source_url: sourceUrl,
          message: `Found a potential source but couldn't extract job details: ${parsed.reason || 'Content did not contain clear job posting information.'}. You can manually enter the role details.`
        };

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      parsedJob = {
        title: parsed.title || roleTitle,
        company: parsed.company || companyName,
        location: parsed.location || location || null,
        description: parsed.description || "",
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
        responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
        salary_range: parsed.salary_range || null,
        employment_type: parsed.employment_type || "full_time",
        experience_level: parsed.experience_level || null,
        benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
        source_url: sourceUrl,
        source_domain: new URL(sourceUrl).hostname,
      };

    } catch (e) {
      console.error("Failed to parse LLM response:", content);

      // GUARDRAIL: If parsing fails, return not found instead of generating fake data
      const response: SearchResponse = {
        success: true,
        found: false,
        job: null,
        search_results_count: searchResults.length,
        source_url: sourceUrl,
        message: "Found potential sources but could not parse job details. You can manually enter the role details."
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsed job posting:", JSON.stringify(parsedJob, null, 2));

    const response: SearchResponse = {
      success: true,
      found: true,
      job: parsedJob,
      search_results_count: searchResults.length,
      source_url: sourceUrl,
      message: `Found job posting from ${parsedJob.source_domain}`
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in searchJobPosting:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
