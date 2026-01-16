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
    const searchQuery = `${roleTitle} ${companyName} ${location || ''} job vacancy site:linkedin.com OR site:indeed.com OR site:glassdoor.com OR site:werkenbij OR site:careers`;

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
          `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&num=5`
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
      // Filter for job posting URLs
      const jobUrls = searchResults.filter(r =>
        r.link?.includes('linkedin.com/jobs') ||
        r.link?.includes('indeed.com') ||
        r.link?.includes('glassdoor.com') ||
        r.link?.includes('werkenbij') ||
        r.link?.includes('careers')
      );

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
      }

      // Use search snippets if we couldn't fetch the page
      if (!jobPostingContent) {
        jobPostingContent = searchResults
          .slice(0, 5)
          .map(r => `${r.title}\n${r.snippet || ''}`)
          .join('\n\n');
      }
    }

    // If no search results, construct a synthetic query based on the inputs
    if (!jobPostingContent) {
      jobPostingContent = `Job posting for ${roleTitle} at ${companyName}${location ? ` in ${location}` : ''}.
      Please generate realistic job requirements based on this role type.`;
    }

    // Use LLM to parse/generate structured job data
    if (!togetherApiKey) {
      return new Response(
        JSON.stringify({ error: "LLM API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a job posting parser. Extract structured information from the provided content about a job posting.
If the content is limited, infer reasonable requirements based on the role type, company, and location provided.

Return a valid JSON object with these fields:
{
  "title": "exact job title",
  "company": "company name",
  "location": "full location (city, region, country)",
  "description": "2-3 sentence job description",
  "requirements": ["requirement 1", "requirement 2", ...], // 5-8 key requirements
  "responsibilities": ["responsibility 1", "responsibility 2", ...], // 5-8 key responsibilities
  "salary_range": "estimated salary range or null if unknown",
  "employment_type": "full_time|part_time|contract|freelance",
  "experience_level": "junior|mid|senior|lead|executive or null",
  "benefits": ["benefit 1", "benefit 2", ...] // common benefits for this type of role
}

Be realistic based on the role type and location. For example:
- Finance roles should mention accounting software, financial analysis, compliance
- Tech roles should mention specific technologies
- European roles might have different salary ranges than US roles`;

    const userPrompt = `Parse this job posting information:

Role: ${roleTitle}
Company: ${companyName}
Location: ${location || 'Not specified'}

Content found:
${jobPostingContent}

Return only valid JSON, no other text.`;

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
        temperature: 0.3,
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
    let parsedJob: ParsedJobPosting;
    try {
      // Extract JSON from response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsedJob = JSON.parse(jsonMatch[0]);
      parsedJob.source_url = sourceUrl || null;
      parsedJob.source_domain = sourceUrl ? new URL(sourceUrl).hostname : null;
    } catch (e) {
      console.error("Failed to parse LLM response:", content);
      // Return a basic structure if parsing fails
      parsedJob = {
        title: roleTitle,
        company: companyName,
        location: location || "Not specified",
        description: `${roleTitle} position at ${companyName}`,
        requirements: ["Relevant experience required", "Strong communication skills"],
        responsibilities: ["Perform role-related duties", "Collaborate with team members"],
        salary_range: null,
        employment_type: "full_time",
        experience_level: null,
        benefits: [],
        source_url: sourceUrl || null,
        source_domain: sourceUrl ? new URL(sourceUrl).hostname : null,
      };
    }

    console.log("Parsed job posting:", JSON.stringify(parsedJob, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        job: parsedJob,
        search_results_count: searchResults.length,
        has_source: !!sourceUrl
      }),
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
