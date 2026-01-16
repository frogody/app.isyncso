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

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
}

// Job site patterns to identify job postings
const JOB_SITE_PATTERNS = [
  'indeed.com', 'nl.indeed.com', 'de.indeed.com', 'uk.indeed.com',
  'linkedin.com/jobs', 'linkedin.com/company',
  'glassdoor.com', 'glassdoor.nl',
  'werkenbij', 'werken-bij',
  '/careers', '/vacatures', '/jobs', '/vacature',
  'monsterboard', 'nationalevacaturebank',
  'intermediair.nl', 'jobbird.com',
  'stepstone', 'efinancialcareers'
];

// Patterns to EXCLUDE (salary pages, review pages, etc.)
const EXCLUDE_URL_PATTERNS = [
  '/salaries', '/salary', '/reviews', '/review',
  '/company-reviews', '/interview',
  'salary-search', 'salaris'
];

// Check if URL is a job site
function isJobSiteUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return JOB_SITE_PATTERNS.some(pattern => urlLower.includes(pattern));
}

// Check if URL should be excluded (salary page, reviews, etc.)
function shouldExcludeUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return EXCLUDE_URL_PATTERNS.some(pattern => urlLower.includes(pattern));
}

// Normalize company name for matching
function normalizeCompanyName(name: string): string {
  return name.toLowerCase()
    .replace(/\s*(b\.?v\.?|n\.?v\.?|gmbh|ltd|inc|corp|llc)\s*/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Check if content mentions company
function mentionsCompany(text: string, companyName: string): boolean {
  const textLower = text.toLowerCase();
  const companyLower = companyName.toLowerCase();
  const companyNormalized = normalizeCompanyName(companyName);

  return textLower.includes(companyLower) ||
         textLower.includes(companyNormalized) ||
         textLower.includes(companyLower.replace(/\s+/g, ''));
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

    // Use Tavily for web search (much better than SerpAPI for this use case)
    const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");

    if (!tavilyApiKey) {
      console.error("TAVILY_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          found: false,
          error: "Search API not configured",
          message: "Job search is not properly configured. Please contact support."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let allResults: TavilyResult[] = [];
    let foundJobContent = "";
    let sourceUrl = "";

    // Search strategy: Multiple queries to maximize chances of finding the job
    // We collect all results and then rank them by relevance
    const searchQueries = [
      // Direct Indeed search for this company
      `${companyName} ${roleTitle} ${location || ''} indeed.com vacature`,
      // Direct search with company name prominent
      `"${companyName}" ${roleTitle} ${location || ''} vacature job`,
      // LinkedIn job search
      `${companyName} ${roleTitle} linkedin jobs ${location || ''}`,
      // Broader Dutch job search
      `${roleTitle} bij ${companyName} ${location || ''} werkenbij vacature`,
      // Even broader with all terms
      `${roleTitle} ${companyName} ${location || ''} careers vacancy hiring`,
    ];

    // Run all searches to maximize result collection
    for (const query of searchQueries) {
      // Continue searching even if we have results - we want the best match

      console.log(`Searching with query: ${query}`);

      try {
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: tavilyApiKey,
            query: query,
            search_depth: 'advanced', // Better results for job postings
            max_results: 10,
            include_answer: true,
            include_raw_content: true, // Get full page content when available
          }),
        });

        if (tavilyResponse.ok) {
          const data: TavilyResponse = await tavilyResponse.json();
          console.log(`Tavily returned ${data.results?.length || 0} results for query: ${query.substring(0, 50)}...`);

          if (data.results && data.results.length > 0) {
            // Add unique results
            for (const result of data.results) {
              if (!allResults.some(r => r.url === result.url)) {
                allResults.push(result);
              }
            }
          }
        } else {
          const errorText = await tavilyResponse.text();
          console.error(`Tavily error: ${errorText}`);
        }
      } catch (e) {
        console.error(`Search error for query "${query}":`, e);
      }
    }

    console.log(`Total unique results: ${allResults.length}`);

    // Log all results for debugging
    allResults.forEach((r, i) => {
      console.log(`Result ${i + 1}: ${r.title?.substring(0, 60) || 'no title'} - ${r.url?.substring(0, 80) || 'no url'}`);
    });

    // Filter and rank results with stronger company matching
    const rankedResults = allResults
      .map(r => {
        let score = 0;
        const titleLower = (r.title || '').toLowerCase();
        const contentLower = (r.content || '').toLowerCase();
        const urlLower = (r.url || '').toLowerCase();
        const textToCheck = `${titleLower} ${contentLower} ${urlLower}`;
        const companyLower = companyName.toLowerCase();
        const roleLower = roleTitle.toLowerCase();

        // EXCLUDE salary pages, review pages, etc.
        if (shouldExcludeUrl(r.url)) {
          return { ...r, relevanceScore: -100 }; // Negative score to filter out
        }

        // CRITICAL: Must mention company name - this is the most important filter
        const hasCompanyInTitle = titleLower.includes(companyLower);
        const hasCompanyInContent = contentLower.includes(companyLower);
        const hasCompanyInUrl = urlLower.includes(companyLower.replace(/\s+/g, ''));

        if (hasCompanyInTitle) score += 50; // Strong signal - company in title
        else if (hasCompanyInContent) score += 35; // Good signal - company in content
        else if (hasCompanyInUrl) score += 25; // Decent signal - company in URL
        // If none of the above, this result might not be relevant

        // Higher score for job sites
        if (isJobSiteUrl(r.url)) score += 25;

        // Bonus for Indeed job pages (not salary pages) and LinkedIn jobs
        if (urlLower.includes('indeed.com/viewjob') || urlLower.includes('indeed.com/rc/clk')) score += 20;
        if (urlLower.includes('linkedin.com/jobs/view')) score += 20;

        // Generic Indeed/LinkedIn bonus
        if (urlLower.includes('indeed.com')) score += 10;
        if (urlLower.includes('linkedin.com/jobs')) score += 10;

        // Higher score for mentioning role
        if (titleLower.includes(roleLower)) score += 25;
        else if (contentLower.includes(roleLower)) score += 15;

        // Higher score for location match
        if (location && textToCheck.includes(location.toLowerCase())) score += 15;

        // Bonus for having substantial content (suggests actual job posting)
        if (r.content && r.content.length > 300) score += 10;
        if (r.raw_content && r.raw_content.length > 500) score += 15;

        // Bonus for job-related keywords in content
        if (contentLower.includes('vacature') || contentLower.includes('vacancy') ||
            contentLower.includes('apply') || contentLower.includes('sollicit')) {
          score += 15;
        }

        return { ...r, relevanceScore: score };
      })
      .filter(r => {
        // MUST mention company name somewhere and have positive score
        const textToCheck = `${r.title || ''} ${r.content || ''} ${r.url || ''}`.toLowerCase();
        return r.relevanceScore >= 40 && mentionsCompany(textToCheck, companyName);
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`Ranked results (filtered for company match): ${rankedResults.length}`);
    if (rankedResults.length > 0) {
      console.log(`Top result: ${rankedResults[0].title} - Score: ${rankedResults[0].relevanceScore}`);
    }

    // Try to get job content from the best result
    if (rankedResults.length > 0) {
      const bestResult = rankedResults[0];
      sourceUrl = bestResult.url;

      // Use raw_content if available (from Tavily), otherwise use content
      if (bestResult.raw_content && bestResult.raw_content.length > 200) {
        foundJobContent = bestResult.raw_content.slice(0, 10000);
        console.log(`Using raw_content from Tavily (${foundJobContent.length} chars)`);
      } else if (bestResult.content && bestResult.content.length > 100) {
        // Combine content from top results
        foundJobContent = rankedResults
          .slice(0, 3)
          .map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.content}`)
          .join('\n\n---\n\n');
        console.log(`Using combined content from top ${Math.min(3, rankedResults.length)} results`);
      }

      // If still no good content, try to fetch the page directly
      if (!foundJobContent || foundJobContent.length < 200) {
        console.log(`Attempting direct fetch of: ${sourceUrl}`);
        try {
          const pageResponse = await fetch(sourceUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
            },
            redirect: 'follow',
          });

          if (pageResponse.ok) {
            const html = await pageResponse.text();
            // Extract text content
            foundJobContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
              .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
              .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 10000);
            console.log(`Direct fetch successful (${foundJobContent.length} chars)`);
          } else {
            console.log(`Direct fetch failed: ${pageResponse.status}`);
          }
        } catch (e) {
          console.log(`Could not fetch page directly: ${e}`);
        }
      }
    }

    // GUARDRAIL: If no relevant job posting was found, return NOT FOUND
    if (!foundJobContent || foundJobContent.length < 100 || !sourceUrl) {
      console.log("No matching job posting found - returning not_found");
      console.log(`Content length: ${foundJobContent?.length || 0}, Source URL: ${sourceUrl || 'none'}`);

      const response: SearchResponse = {
        success: true,
        found: false,
        job: null,
        search_results_count: allResults.length,
        source_url: null,
        message: `No job posting found for "${roleTitle}" at "${companyName}"${location ? ` in ${location}` : ''}. The search returned ${allResults.length} results but none matched the criteria. You can manually enter the role details instead.`
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use LLM to parse the content
    if (!togetherApiKey) {
      console.error("TOGETHER_API_KEY not configured");
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
7. Extract in the original language of the job posting (Dutch, English, etc.)

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

    const userPrompt = `Extract job posting information from this content about a "${roleTitle}" position at "${companyName}".
Remember: ONLY extract what's explicitly stated. Do NOT make up or assume any details.

Source URL: ${sourceUrl}

Content:
${foundJobContent}

Return only valid JSON.`;

    console.log("Calling LLM to parse job posting...");

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
        temperature: 0.1,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LLM API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to parse job posting", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const llmData = await llmResponse.json();
    const content = llmData.choices?.[0]?.message?.content || "";

    // Parse JSON from LLM response
    let parsedJob: ParsedJobPosting | null = null;
    try {
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
          search_results_count: allResults.length,
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

      const response: SearchResponse = {
        success: true,
        found: false,
        job: null,
        search_results_count: allResults.length,
        source_url: sourceUrl,
        message: "Found potential sources but could not parse job details. You can manually enter the role details."
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully parsed job posting:", JSON.stringify(parsedJob, null, 2));

    const response: SearchResponse = {
      success: true,
      found: true,
      job: parsedJob,
      search_results_count: allResults.length,
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
