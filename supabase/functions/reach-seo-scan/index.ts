import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
  category: "critical" | "warning" | "passed";
  title: string;
  description: string;
  suggestion: string;
}

interface MetaAnalysis {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  charset: string | null;
  viewport: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  robots: string | null;
  language: string | null;
}

interface PerformanceSignals {
  scriptCount: number;
  inlineCssBlocks: number;
  imageCount: number;
  imagesWithoutAlt: number;
  internalLinks: number;
  externalLinks: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  hasJsonLd: boolean;
  wordCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractMetaContent(html: string, name: string): string | null {
  // Match name="..." or property="..."
  const patterns = [
    new RegExp(
      `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractMetaCharset(html: string): string | null {
  const match = html.match(
    /<meta[^>]*charset=["']?([^"'\s>]+)["']?/i
  );
  return match ? match[1] : null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

function countTag(html: string, tag: string): number {
  const regex = new RegExp(`<${tag}[\\s>]`, "gi");
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

function countImagesWithoutAlt(html: string): {
  total: number;
  withoutAlt: number;
} {
  const imgRegex = /<img[^>]*>/gi;
  const images = html.match(imgRegex) || [];
  let withoutAlt = 0;
  for (const img of images) {
    // No alt attribute at all, or alt=""
    if (!img.match(/alt=["'][^"']+["']/i)) {
      withoutAlt++;
    }
  }
  return { total: images.length, withoutAlt };
}

function countLinks(
  html: string,
  baseUrl: string
): { internal: number; external: number } {
  const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
  let internal = 0;
  let external = 0;
  let match;
  const baseDomain = new URL(baseUrl).hostname;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      continue;
    }
    if (
      href.startsWith("/") ||
      href.startsWith("./") ||
      href.startsWith("../")
    ) {
      internal++;
    } else {
      try {
        const linkDomain = new URL(href).hostname;
        if (linkDomain === baseDomain) {
          internal++;
        } else {
          external++;
        }
      } catch {
        internal++;
      }
    }
  }
  return { internal, external };
}

function countInlineCss(html: string): number {
  const matches = html.match(/<style[^>]*>/gi);
  return matches ? matches.length : 0;
}

function hasJsonLd(html: string): boolean {
  return /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
}

function countWords(html: string): number {
  // Strip tags, then count words
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(" ").filter((w) => w.length > 0).length;
}

function extractCanonical(html: string): string | null {
  const match = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i
  );
  if (match) return match[1];
  // Reversed attribute order
  const match2 = html.match(
    /<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i
  );
  return match2 ? match2[1] : null;
}

function extractRobots(html: string): string | null {
  return extractMetaContent(html, "robots");
}

function extractLanguage(html: string): string | null {
  const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function analyzeHtml(
  html: string,
  url: string
): {
  score: number;
  findings: Finding[];
  meta_analysis: MetaAnalysis;
  performance_signals: PerformanceSignals;
} {
  const findings: Finding[] = [];
  let score = 0;

  // Extract all meta data
  const title = extractTitle(html);
  const titleLength = title ? title.length : 0;
  const description = extractMetaContent(html, "description");
  const descriptionLength = description ? description.length : 0;
  const charset = extractMetaCharset(html);
  const viewport = extractMetaContent(html, "viewport");
  const canonical = extractCanonical(html);
  const ogTitle = extractMetaContent(html, "og:title");
  const ogDescription = extractMetaContent(html, "og:description");
  const ogImage = extractMetaContent(html, "og:image");
  const ogUrl = extractMetaContent(html, "og:url");
  const robots = extractRobots(html);
  const language = extractLanguage(html);

  const h1Count = countTag(html, "h1");
  const h2Count = countTag(html, "h2");
  const h3Count = countTag(html, "h3");
  const h4Count = countTag(html, "h4");
  const h5Count = countTag(html, "h5");
  const h6Count = countTag(html, "h6");
  const { total: imageCount, withoutAlt: imagesWithoutAlt } =
    countImagesWithoutAlt(html);
  const { internal: internalLinks, external: externalLinks } = countLinks(
    html,
    url
  );
  const scriptCount = countTag(html, "script");
  const inlineCssBlocks = countInlineCss(html);
  const jsonLdPresent = hasJsonLd(html);
  const wordCount = countWords(html);

  // -----------------------------------------------------------------------
  // 1. Title tag (10 pts)
  // -----------------------------------------------------------------------
  if (!title || titleLength === 0) {
    findings.push({
      category: "critical",
      title: "Missing page title",
      description: "No <title> tag was found on this page.",
      suggestion:
        "Add a unique, descriptive <title> tag between 30 and 60 characters.",
    });
  } else if (titleLength < 30) {
    findings.push({
      category: "warning",
      title: "Title tag too short",
      description: `The title is only ${titleLength} characters. Aim for 30-60 characters.`,
      suggestion:
        "Expand the title to include relevant keywords while staying under 60 characters.",
    });
    score += 5;
  } else if (titleLength > 60) {
    findings.push({
      category: "warning",
      title: "Title tag too long",
      description: `The title is ${titleLength} characters. Search engines typically truncate after 60.`,
      suggestion:
        "Shorten the title to 60 characters or fewer while keeping important keywords at the start.",
    });
    score += 6;
  } else {
    findings.push({
      category: "passed",
      title: "Title tag is well-optimized",
      description: `Title is ${titleLength} characters, which is within the recommended 30-60 range.`,
      suggestion: "No changes needed.",
    });
    score += 10;
  }

  // -----------------------------------------------------------------------
  // 2. Meta description (10 pts)
  // -----------------------------------------------------------------------
  if (!description || descriptionLength === 0) {
    findings.push({
      category: "critical",
      title: "Missing meta description",
      description:
        "No meta description was found. Search engines may generate one from page content.",
      suggestion:
        "Add a compelling meta description between 120 and 160 characters that summarizes the page.",
    });
  } else if (descriptionLength < 120) {
    findings.push({
      category: "warning",
      title: "Meta description too short",
      description: `Description is ${descriptionLength} characters. Aim for 120-160 characters.`,
      suggestion:
        "Expand the description to fully utilize the available snippet space in search results.",
    });
    score += 5;
  } else if (descriptionLength > 160) {
    findings.push({
      category: "warning",
      title: "Meta description too long",
      description: `Description is ${descriptionLength} characters. It may be truncated in search results.`,
      suggestion:
        "Trim the description to 160 characters, placing key information first.",
    });
    score += 6;
  } else {
    findings.push({
      category: "passed",
      title: "Meta description is well-optimized",
      description: `Description is ${descriptionLength} characters, within the recommended 120-160 range.`,
      suggestion: "No changes needed.",
    });
    score += 10;
  }

  // -----------------------------------------------------------------------
  // 3. H1 tag (10 pts)
  // -----------------------------------------------------------------------
  if (h1Count === 0) {
    findings.push({
      category: "critical",
      title: "Missing H1 heading",
      description:
        "No H1 heading found on the page. The H1 is critical for SEO and accessibility.",
      suggestion:
        "Add exactly one H1 tag that clearly describes the main topic of the page.",
    });
  } else if (h1Count === 1) {
    findings.push({
      category: "passed",
      title: "Single H1 heading present",
      description:
        "Page has exactly one H1 tag, which is the recommended practice.",
      suggestion: "No changes needed.",
    });
    score += 10;
  } else {
    findings.push({
      category: "warning",
      title: "Multiple H1 headings found",
      description: `Found ${h1Count} H1 tags. Having more than one can confuse search engines about the main topic.`,
      suggestion:
        "Reduce to a single H1 and convert others to H2 or lower-level headings.",
    });
    score += 5;
  }

  // -----------------------------------------------------------------------
  // 4. OG tags (10 pts)
  // -----------------------------------------------------------------------
  const ogChecks = [ogTitle, ogDescription, ogImage, ogUrl];
  const ogPassed = ogChecks.filter(Boolean).length;

  if (ogPassed === 0) {
    findings.push({
      category: "critical",
      title: "No Open Graph tags found",
      description:
        "Open Graph tags control how the page appears when shared on social media.",
      suggestion:
        "Add og:title, og:description, og:image, and og:url meta tags.",
    });
  } else if (ogPassed < 4) {
    const missing: string[] = [];
    if (!ogTitle) missing.push("og:title");
    if (!ogDescription) missing.push("og:description");
    if (!ogImage) missing.push("og:image");
    if (!ogUrl) missing.push("og:url");
    findings.push({
      category: "warning",
      title: "Incomplete Open Graph tags",
      description: `Missing: ${missing.join(", ")}. Social media shares may not display correctly.`,
      suggestion: `Add the missing tags: ${missing.join(", ")}.`,
    });
    score += Math.round((ogPassed / 4) * 10);
  } else {
    findings.push({
      category: "passed",
      title: "All Open Graph tags present",
      description:
        "og:title, og:description, og:image, and og:url are all configured.",
      suggestion: "No changes needed.",
    });
    score += 10;
  }

  // -----------------------------------------------------------------------
  // 5. Image alt text (10 pts)
  // -----------------------------------------------------------------------
  if (imageCount === 0) {
    findings.push({
      category: "passed",
      title: "No images to check",
      description:
        "Page has no images, so alt text is not applicable.",
      suggestion:
        "Consider adding relevant images to make the content more engaging.",
    });
    score += 10;
  } else if (imagesWithoutAlt === 0) {
    findings.push({
      category: "passed",
      title: "All images have alt text",
      description: `All ${imageCount} images have descriptive alt attributes.`,
      suggestion: "No changes needed.",
    });
    score += 10;
  } else {
    const ratio = imagesWithoutAlt / imageCount;
    if (ratio > 0.5) {
      findings.push({
        category: "critical",
        title: "Many images missing alt text",
        description: `${imagesWithoutAlt} of ${imageCount} images lack alt text. This hurts accessibility and image SEO.`,
        suggestion:
          "Add descriptive alt attributes to all images that convey meaningful content.",
      });
      score += 2;
    } else {
      findings.push({
        category: "warning",
        title: "Some images missing alt text",
        description: `${imagesWithoutAlt} of ${imageCount} images lack alt text.`,
        suggestion:
          "Add descriptive alt attributes to the remaining images.",
      });
      score += 6;
    }
  }

  // -----------------------------------------------------------------------
  // 6. Mobile viewport (10 pts)
  // -----------------------------------------------------------------------
  if (!viewport) {
    findings.push({
      category: "critical",
      title: "No viewport meta tag",
      description:
        "Without a viewport tag, the page may not render correctly on mobile devices.",
      suggestion:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
    });
  } else {
    findings.push({
      category: "passed",
      title: "Viewport meta tag present",
      description: "The page has a viewport meta tag for mobile responsiveness.",
      suggestion: "No changes needed.",
    });
    score += 10;
  }

  // -----------------------------------------------------------------------
  // 7. Canonical URL (5 pts)
  // -----------------------------------------------------------------------
  if (!canonical) {
    findings.push({
      category: "warning",
      title: "No canonical URL specified",
      description:
        "Without a canonical tag, search engines may index duplicate versions of this page.",
      suggestion:
        "Add a <link rel=\"canonical\"> tag pointing to the preferred URL.",
    });
  } else {
    findings.push({
      category: "passed",
      title: "Canonical URL present",
      description: `Canonical URL is set to: ${canonical}`,
      suggestion: "No changes needed.",
    });
    score += 5;
  }

  // -----------------------------------------------------------------------
  // 8. Structured data / JSON-LD (5 pts)
  // -----------------------------------------------------------------------
  if (!jsonLdPresent) {
    findings.push({
      category: "warning",
      title: "No structured data found",
      description:
        "No JSON-LD structured data detected. Rich snippets in search results require structured data.",
      suggestion:
        "Add JSON-LD structured data (e.g., Organization, WebSite, Article) to enable rich results.",
    });
  } else {
    findings.push({
      category: "passed",
      title: "Structured data (JSON-LD) present",
      description:
        "Page includes JSON-LD structured data for enhanced search results.",
      suggestion: "No changes needed.",
    });
    score += 5;
  }

  // -----------------------------------------------------------------------
  // 9. Heading hierarchy (10 pts)
  // -----------------------------------------------------------------------
  const totalHeadings = h1Count + h2Count + h3Count + h4Count + h5Count + h6Count;
  if (totalHeadings === 0) {
    findings.push({
      category: "critical",
      title: "No headings found",
      description:
        "The page has no heading tags (H1-H6), making it hard for search engines to understand structure.",
      suggestion:
        "Add a clear heading hierarchy starting with one H1 and using H2-H6 for subsections.",
    });
  } else if (h1Count > 0 && h2Count > 0) {
    // Check if there's a gap (e.g. H1 followed by H3 with no H2)
    const hasH3WithoutH2 = h3Count > 0 && h2Count === 0;
    if (hasH3WithoutH2) {
      findings.push({
        category: "warning",
        title: "Heading hierarchy has gaps",
        description:
          "H3 tags are used without any H2 tags, creating a gap in the heading hierarchy.",
        suggestion:
          "Maintain a sequential heading structure: H1 > H2 > H3 without skipping levels.",
      });
      score += 5;
    } else {
      findings.push({
        category: "passed",
        title: "Good heading hierarchy",
        description: `Found ${totalHeadings} headings with a proper hierarchy (H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}).`,
        suggestion: "No changes needed.",
      });
      score += 10;
    }
  } else if (h1Count > 0) {
    findings.push({
      category: "warning",
      title: "Limited heading structure",
      description:
        "Only H1 headings found. Adding H2-H3 headings improves content structure.",
      suggestion:
        "Break content into sections with H2 and H3 subheadings for better SEO.",
    });
    score += 5;
  } else {
    findings.push({
      category: "warning",
      title: "Missing primary heading",
      description: `Found ${totalHeadings} headings but no H1 tag.`,
      suggestion: "Add an H1 heading as the main topic of the page.",
    });
    score += 3;
  }

  // -----------------------------------------------------------------------
  // 10. Links analysis (10 pts)
  // -----------------------------------------------------------------------
  const totalLinks = internalLinks + externalLinks;
  if (totalLinks === 0) {
    findings.push({
      category: "warning",
      title: "No links found",
      description:
        "The page has no links. Internal linking helps search engines discover content.",
      suggestion:
        "Add internal links to related pages and external links to authoritative sources.",
    });
    score += 2;
  } else {
    let linkScore = 10;
    const linkNotes: string[] = [];

    if (internalLinks === 0) {
      linkNotes.push("No internal links found");
      linkScore -= 4;
    }
    if (externalLinks === 0 && internalLinks > 0) {
      linkNotes.push("No external links found");
      linkScore -= 2;
    }
    if (totalLinks > 200) {
      linkNotes.push(`High link count (${totalLinks})`);
      linkScore -= 3;
    }

    if (linkScore >= 8) {
      findings.push({
        category: "passed",
        title: "Good link profile",
        description: `Found ${internalLinks} internal and ${externalLinks} external links.`,
        suggestion: "No changes needed.",
      });
    } else {
      findings.push({
        category: "warning",
        title: "Link profile could be improved",
        description: `${internalLinks} internal, ${externalLinks} external links. ${linkNotes.join(". ")}.`,
        suggestion:
          "Add internal links to related pages and authoritative external references.",
      });
    }
    score += Math.max(0, linkScore);
  }

  // -----------------------------------------------------------------------
  // 11. Performance hints (10 pts)
  // -----------------------------------------------------------------------
  {
    let perfScore = 10;
    const perfIssues: string[] = [];

    if (scriptCount > 15) {
      perfIssues.push(`${scriptCount} script tags (excessive)`);
      perfScore -= 3;
    }
    if (inlineCssBlocks > 5) {
      perfIssues.push(`${inlineCssBlocks} inline CSS blocks`);
      perfScore -= 2;
    }
    if (imageCount > 30) {
      perfIssues.push(`${imageCount} images (consider lazy loading)`);
      perfScore -= 2;
    }
    if (wordCount < 300) {
      perfIssues.push(
        `Only ${wordCount} words (thin content may rank poorly)`
      );
      perfScore -= 3;
    }

    if (perfIssues.length === 0) {
      findings.push({
        category: "passed",
        title: "No major performance concerns",
        description: `${scriptCount} scripts, ${inlineCssBlocks} inline styles, ${imageCount} images, ${wordCount} words.`,
        suggestion: "No changes needed.",
      });
    } else {
      findings.push({
        category: perfScore <= 5 ? "critical" : "warning",
        title: "Performance optimization recommended",
        description: perfIssues.join(". ") + ".",
        suggestion:
          "Reduce script count, minimize inline CSS, lazy-load images, and ensure sufficient content depth.",
      });
    }
    score += Math.max(0, perfScore);
  }

  // Clamp score
  score = Math.min(100, Math.max(0, score));

  const meta_analysis: MetaAnalysis = {
    title,
    titleLength,
    description,
    descriptionLength,
    charset,
    viewport,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    robots,
    language,
  };

  const performance_signals: PerformanceSignals = {
    scriptCount,
    inlineCssBlocks,
    imageCount,
    imagesWithoutAlt,
    internalLinks,
    externalLinks,
    h1Count,
    h2Count,
    h3Count,
    h4Count,
    h5Count,
    h6Count,
    hasJsonLd: jsonLdPresent,
    wordCount,
  };

  return { score, findings, meta_analysis, performance_signals };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "A valid URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return new Response(
        JSON.stringify({
          error: "URL must start with http:// or https://",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let html: string;
    try {
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; iSyncSO SEO Scanner/1.0; +https://isyncso.com)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: `Failed to fetch URL: HTTP ${response.status} ${response.statusText}`,
          }),
          {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      html = await response.text();
    } catch (fetchErr: unknown) {
      clearTimeout(timeout);
      const message =
        fetchErr instanceof Error ? fetchErr.message : "Unknown fetch error";
      return new Response(
        JSON.stringify({
          error: `Could not reach URL: ${message}`,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Analyze
    const result = analyzeHtml(html, parsedUrl.toString());

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
