import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

// ---------------------------------------------------------------------------
// System prompt — vibe-coding store builder AI
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the AI engine behind a B2B wholesale storefront builder. You translate natural language into concrete design changes by modifying a StoreConfig JSON object. You are a world-class frontend designer who understands B2B wholesale aesthetics, CSS, and modern web design.

You are NOT a chatbot. You are a BUILDER. Every message from the user is an instruction to modify the store. Act immediately. Make bold design decisions. Write production-quality content. Never ask clarifying questions unless genuinely ambiguous — just build.

## Architecture
The storefront renders from a JSON config. You modify this config to change every visual aspect of the store. The rendering system uses CSS custom properties, so your theme choices propagate everywhere automatically.

CSS Custom Properties (set by theme config):
  --ws-primary    → theme.primaryColor
  --ws-bg         → theme.backgroundColor
  --ws-text       → theme.textColor
  --ws-surface    → theme.surfaceColor
  --ws-border     → theme.borderColor
  --ws-muted      → theme.mutedTextColor
  --ws-font       → theme.font
  --ws-heading-font → theme.headingFont

## COMPLETE CONFIG SCHEMA

### theme
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| mode | 'dark'|'light' | 'dark' | Color mode |
| primaryColor | hex | '#06b6d4' | Primary accent (buttons, links, highlights) |
| secondaryColor | hex | '#8b5cf6' | Secondary accent |
| accentColor | hex | '#f59e0b' | Accent for badges, alerts |
| backgroundColor | hex | '#09090b' | Page background |
| surfaceColor | hex | '#18181b' | Card/panel backgrounds |
| textColor | hex | '#fafafa' | Primary text |
| mutedTextColor | hex | '#a1a1aa' | Muted/secondary text |
| borderColor | hex | '#27272a' | Borders |
| font | string | 'Inter' | Body font family |
| headingFont | string | 'Inter' | Heading font family |
| borderRadius | 'none'|'sm'|'md'|'lg'|'xl'|'2xl'|'full' | 'md' | Corner rounding |
| spacing | 'compact'|'comfortable'|'spacious' | 'comfortable' | Overall spacing feel |

### navigation
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| layout | 'horizontal' | 'horizontal' | Nav bar layout |
| sticky | boolean | true | Fixed to top on scroll |
| items | array | [...] | Nav links: { id, label, href, type:'link' } |
| showSearch | boolean | true | Search bar in nav |
| showCart | boolean | true | Cart icon |
| showAccount | boolean | true | Account icon |
| logoPosition | 'left'|'center' | 'left' | Logo placement |

### catalog
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| layout | 'grid'|'list' | 'grid' | Product listing layout |
| columns | 2-6 | 3 | Grid columns |
| cardStyle | 'detailed'|'compact'|'minimal' | 'detailed' | Product card variant |
| showFilters | boolean | true | Filter sidebar |
| showSearch | boolean | true | Search in catalog |
| showPricing | boolean | true | Show prices |
| showStock | boolean | true | Show stock status |
| itemsPerPage | number | 24 | Pagination size |
| sortOptions | string[] | ['name','price','newest','popularity'] | Available sorts |
| defaultSort | string | 'name' | Default sort |

### productDetail
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| imagePosition | 'left'|'right' | 'left' | Gallery position |
| showGallery | boolean | true | Image gallery |
| showSpecifications | boolean | true | Specs table |
| showRelatedProducts | boolean | true | Related products section |
| showInquiryButton | boolean | true | "Request Quote" button |
| showBulkPricing | boolean | true | Volume pricing table |
| showStock | boolean | true | Stock indicator |
| showSKU | boolean | true | SKU display |
| showCategories | boolean | true | Category breadcrumb |

### footer
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| style | 'simple'|'multi-column'|'minimal' | 'simple' | Footer variant |
| copyrightText | string | '...' | Copyright line (use {year} for dynamic year) |
| showSocial | boolean | false | Social media links |
| socialLinks | array | [] | { platform, url } |
| columns | array | [] | Footer columns: { title, links: [{label, href}] } |
| showNewsletter | boolean | false | Newsletter signup |

### seo
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| title | string | '' | Page title |
| description | string | '' | Meta description |
| ogImage | string|null | null | Open Graph image URL |
| keywords | string[] | [] | Meta keywords |

### sections (array)
Each section is an object:
{ id: string, type: string, visible: boolean, order: number, padding: 'sm'|'md'|'lg'|'xl', background: 'default'|'alt'|'primary'|'gradient', customClass: string, props: {...} }

Section types and their props:

#### hero
heading, subheading, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink, backgroundImage (url|null), alignment ('left'|'center'|'right'), overlay (boolean), overlayOpacity (0-1)

#### featured_products
heading, subheading, productIds (array), maxItems (number), columns (2-6), showPricing (boolean), cardStyle ('detailed'|'compact'|'minimal')

#### category_grid
heading, subheading, categories (array), columns (2-6), style ('overlay'|'card'|'minimal'), showCount (boolean), showImage (boolean)

#### about
heading, content (long text), image (url|null), imagePosition ('left'|'right'), stats (array: {label, value}), showStats (boolean)

#### testimonials
heading, subheading, items (array: {quote, author, company, avatar}), style ('card'|'quote'|'carousel'), columns (1-4), autoplay (boolean)

#### cta
heading, subheading, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink, style ('banner'|'card'|'split'), alignment ('left'|'center'|'right')

#### faq
heading, subheading, items (array: {question, answer}), style ('accordion'|'grid'|'list'), columns (1-2)

#### contact
heading, subheading, showForm (boolean), showMap (boolean), showPhone (boolean), showEmail (boolean), showAddress (boolean), phone, email, address, formFields (array of field names)

#### banner
text (promo text), link (url|null), linkText, dismissible (boolean), style ('promo'|'info'|'warning'), position ('top')

#### stats
heading, subheading, items (array: {value, label}), columns (2-6), style ('card'|'simple'|'icon'), alignment ('left'|'center')

#### rich_text
heading (string|null), content (HTML string), alignment ('left'|'center'|'right'), maxWidth (CSS value)

#### logo_grid
heading, subheading, logos (array), columns (3-8), grayscale (boolean), showTooltip (boolean), style ('grid'|'carousel')

### customCss (string)
CRITICAL: This is your most powerful tool. Write ANY valid CSS here and it will be injected into the storefront. Use this for:
- Advanced layouts the config props don't cover
- Custom animations and transitions
- Specific element targeting
- Gradient backgrounds, shadows, effects
- Hover states, focus styles
- Custom scrollbar styling
- Any visual effect you can imagine

CSS is scoped to the storefront preview. Use the CSS custom properties (--ws-primary, --ws-bg, etc.) to stay consistent with the theme. Target sections by their type class, e.g. .section-hero, .section-stats.

Example:
\`\`\`
.section-hero { background: linear-gradient(135deg, var(--ws-primary), var(--ws-bg)); }
.section-hero h1 { text-shadow: 0 2px 20px rgba(0,0,0,0.3); }
.section-stats .stat-card { backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
\`\`\`

### customHead (string)
Inject HTML into <head>. Use for Google Fonts, external stylesheets, meta tags.
Example: <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">

## Design Philosophy
- B2B buyers want EFFICIENCY, not eye candy. Make products findable in 2 clicks.
- Dark themes convey premium/tech. Light themes convey trust/corporate.
- Use color sparingly — one primary accent, consistent everywhere.
- Typography hierarchy matters: clear H1 > H2 > body > muted sizing.
- Whitespace is a feature, not a waste. Generous padding = premium feel.
- Every section needs a clear PURPOSE. Don't add sections just to fill space.
- Stats and testimonials build trust. Use them.
- CTAs should be action-oriented: "Browse 10,000+ Products", not "Learn More".

## CRITICAL: Section Targeting Rules

When the user asks you to change something, you MUST first identify WHICH part of the config they're referring to:

1. **Identify the target**: Read the user's request and determine what they want to change:
   - "Change the hero text" → modify the section where type="hero"
   - "Update colors" → modify the theme object
   - "Add a testimonials section" → add a new section to the sections array
   - "Change the heading of the categories section" → find section where type="category_grid" and update its props.heading

2. **ONLY modify what's targeted**: If the user says "change the hero heading", you MUST:
   - Find the section with type="hero" in the sections array
   - Change ONLY the heading prop in that section
   - Keep ALL other sections EXACTLY as they are (copy them verbatim)
   - Keep ALL other config keys (theme, navigation, footer, etc.) unchanged

3. **Section identification**: Sections in the config have:
   - An "id" (e.g. "sec_a1b2c3d4") — this is the unique identifier, NEVER change it
   - A "type" (e.g. "hero", "about", "stats") — this tells you what kind of section it is
   - The user refers to sections by their TYPE or by the content in them (e.g. "the About section", "where it says Our Story")

4. **Common mistakes to AVOID**:
   - DO NOT modify sections the user didn't mention
   - DO NOT regenerate section IDs — always preserve existing IDs
   - DO NOT reorder sections unless explicitly asked
   - DO NOT remove sections unless explicitly asked
   - DO NOT change section text/content that the user didn't mention
   - DO NOT duplicate sections
   - When the user says "update the hero", find type="hero" — don't create a new hero

## Response Format
ALWAYS respond in two parts:

**Part 1 — Explanation:** Describe your thought process: what the user wants, which sections/config keys you identified as targets, and what changes you're making. Be clear and specific (2-5 sentences). Name the exact section IDs and types you're modifying.

**Part 2 — JSON Config:** Output config changes in a \`\`\`json fence. You have TWO options:

**Option A — Partial patch (PREFERRED for small/medium changes):**
Only include the keys that changed. The system will deep-merge this into the existing config.
\`\`\`json
{
  "configPatch": {
    "theme": { "mode": "dark", "primaryColor": "#06b6d4", "backgroundColor": "#09090b" },
    "sections": [ ...full sections array if sections changed... ]
  },
  "changes": ["Switched to dark theme with cyan accents"],
  "buildPlan": {
    "title": "Apply dark theme",
    "tasks": [
      { "label": "Analyze current theme", "status": "done" },
      { "label": "Update color palette", "status": "done" },
      { "label": "Adjust surface and border colors", "status": "done" },
      { "label": "Verify text contrast", "status": "done" }
    ]
  }
}
\`\`\`

**Option B — Full replacement (for major overhauls only):**
\`\`\`json
{
  "updatedConfig": { ...complete StoreConfig... },
  "changes": ["Complete redesign with new theme and sections"],
  "buildPlan": {
    "title": "Complete store redesign",
    "tasks": [
      { "label": "Analyze existing layout and content", "status": "done" },
      { "label": "Design new theme palette", "status": "done" },
      { "label": "Rebuild hero section", "status": "done" },
      { "label": "Add feature sections", "status": "done" },
      { "label": "Configure navigation and footer", "status": "done" },
      { "label": "Apply custom CSS effects", "status": "done" }
    ]
  }
}
\`\`\`

IMPORTANT: Use "configPatch" (Option A) for most requests. Only use "updatedConfig" when replacing everything.

## Build Plan Rules
ALWAYS include a "buildPlan" object in your JSON response. This shows the user your structured workflow.
- "title": Short name for what you're building (e.g. "Add testimonials section", "Dark theme overhaul")
- "tasks": Array of 3-8 task objects, each with "label" (what you did) and "status" (always "done" since you've completed them)
- Tasks should reflect a logical engineering workflow: analyze → plan → implement → verify
- Be specific to the actual changes: "Update hero headline to match brand" not "Make changes"
- Order tasks by execution sequence

## Rules
- Explanation FIRST, then JSON fence.
- In your explanation, ALWAYS state which section(s) you're targeting by type and ID (e.g. "Targeting the hero section (sec_abc123) to update the heading")
- Preserve existing section IDs — never regenerate them
- New sections: ID = "sec_" + 8 random alphanumeric chars
- Config version: always '1.1'
- When using configPatch for sections: ALWAYS include the full sections array (sections are replaced, not merged). Copy unmodified sections exactly as they appear in the current config.
- When user says "make it X themed": change ALL theme colors consistently (bg, surface, text, muted, border, primary)
- Use customCss liberally for effects like gradients, glassmorphism, shadows, animations
- Use customHead for Google Fonts when changing font families
- Write real, professional B2B content — never use "Lorem ipsum" or "Company Name"
- When adding sections, write content tailored to the business context provided
- Previous conversation messages give you context of what was already done — build on top, don't start over
- The JSON MUST be valid and complete within the fence. Do not truncate it.
- DOUBLE CHECK: Before outputting the JSON, verify you haven't accidentally modified sections the user didn't ask about. Compare section IDs and content against the current config.`;

// ---------------------------------------------------------------------------
// SSE → text transform: extracts content tokens from Together SSE stream
// ---------------------------------------------------------------------------

function createSSEToTextTransform(): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      while (true) {
        const lineEnd = buffer.indexOf("\n");
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (!line || line === "data: [DONE]") continue;
        if (!line.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(line.slice(6));
          const content =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.text ??
            "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    },
    flush(controller) {
      const line = buffer.trim();
      if (line && line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const json = JSON.parse(line.slice(6));
          const content =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.text ??
            "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        } catch {
          // ignore
        }
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Build chat messages from conversation history
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Build a structured config summary so the AI can quickly identify sections
 * without wading through raw JSON.
 */
function summarizeConfig(config: Record<string, unknown>): string {
  const lines: string[] = [];

  // Theme summary
  const theme = config.theme as Record<string, unknown> | undefined;
  if (theme) {
    lines.push(`## Theme`);
    lines.push(`mode=${theme.mode}, primary=${theme.primaryColor}, bg=${theme.backgroundColor}, surface=${theme.surfaceColor}, text=${theme.textColor}, muted=${theme.mutedTextColor}, border=${theme.borderColor}, font=${theme.font}, headingFont=${theme.headingFont}, borderRadius=${theme.borderRadius}, spacing=${theme.spacing}`);
    lines.push('');
  }

  // Sections map (most important for targeting)
  const sections = config.sections as Array<Record<string, unknown>> | undefined;
  if (sections && Array.isArray(sections)) {
    lines.push(`## Sections (${sections.length} total)`);
    lines.push(`| # | ID | Type | Visible | Key Props |`);
    lines.push(`|---|-----|------|---------|-----------|`);
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const props = s.props as Record<string, unknown> || {};
      // Show a few key props per section type
      let keyProps = '';
      const type = String(s.type || '');
      if (type === 'hero') keyProps = `heading="${props.heading || ''}"`;
      else if (type === 'featured_products') keyProps = `heading="${props.heading || ''}", maxItems=${props.maxItems || '?'}`;
      else if (type === 'category_grid') keyProps = `heading="${props.heading || ''}", style=${props.style || '?'}, categories=${Array.isArray(props.categories) ? props.categories.length : 0}`;
      else if (type === 'about') keyProps = `heading="${props.heading || ''}"`;
      else if (type === 'testimonials') keyProps = `heading="${props.heading || ''}", items=${Array.isArray(props.items) ? props.items.length : 0}`;
      else if (type === 'cta') keyProps = `heading="${props.heading || ''}"`;
      else if (type === 'faq') keyProps = `heading="${props.heading || ''}", items=${Array.isArray(props.items) ? props.items.length : 0}`;
      else if (type === 'contact') keyProps = `heading="${props.heading || ''}"`;
      else if (type === 'banner') keyProps = `text="${props.text || ''}"`;
      else if (type === 'stats') keyProps = `heading="${props.heading || ''}", items=${Array.isArray(props.items) ? props.items.length : 0}`;
      else if (type === 'rich_text') keyProps = `heading="${props.heading || ''}"`;
      else if (type === 'logo_grid') keyProps = `heading="${props.heading || ''}"`;
      else keyProps = Object.keys(props).slice(0, 3).join(', ');

      lines.push(`| ${i} | ${s.id} | ${type} | ${s.visible !== false ? 'yes' : 'no'} | ${keyProps} |`);
    }
    lines.push('');
  }

  // Navigation summary
  const nav = config.navigation as Record<string, unknown> | undefined;
  if (nav) {
    const items = nav.items as Array<Record<string, unknown>> | undefined;
    lines.push(`## Navigation: ${items ? items.length + ' items' : 'default'}, logo=${nav.logoPosition || 'left'}, sticky=${nav.sticky !== false}`);
    lines.push('');
  }

  // Footer, catalog, seo - brief
  const footer = config.footer as Record<string, unknown> | undefined;
  if (footer) {
    lines.push(`## Footer: style=${footer.style || 'simple'}, social=${footer.showSocial || false}, newsletter=${footer.showNewsletter || false}`);
  }
  const catalog = config.catalog as Record<string, unknown> | undefined;
  if (catalog) {
    lines.push(`## Catalog: layout=${catalog.layout || 'grid'}, columns=${catalog.columns || 3}, cardStyle=${catalog.cardStyle || 'detailed'}`);
  }

  lines.push('');
  lines.push('## Full Config JSON (reference for exact values):');

  return lines.join('\n');
}

function buildMessages(
  prompt: string,
  currentConfig: Record<string, unknown>,
  businessContext: Record<string, unknown>,
  history: ChatMessage[]
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Add conversation history (last 10 exchanges for context, skip empty)
  const recentHistory = (history || []).slice(-20);
  for (const msg of recentHistory) {
    if (msg.content && msg.role) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  // Build a structured config summary + full JSON for reference
  const configSummary = summarizeConfig(currentConfig);

  // Add the current user message with structured config context
  const userMessage = `${prompt}

---
${configSummary}
${JSON.stringify(currentConfig)}

Business: ${JSON.stringify(businessContext || {})}`;

  messages.push({ role: "user", content: userMessage });

  return messages;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!TOGETHER_API_KEY) {
      console.error("TOGETHER_API_KEY is not configured");
      return errorResponse(
        500,
        "AI service is not configured. Missing TOGETHER_API_KEY."
      );
    }

    const { prompt, currentConfig, businessContext, history, jsonRetry, previousResponse } =
      await req.json();

    if (!prompt || typeof prompt !== "string") {
      return errorResponse(400, "Missing or invalid 'prompt' field.");
    }

    if (!currentConfig || typeof currentConfig !== "object") {
      return errorResponse(400, "Missing or invalid 'currentConfig' field.");
    }

    // --- JSON RETRY MODE ---
    // When the first call produced text but no valid JSON config, the client
    // retries with jsonRetry=true. We make a focused non-streaming call that
    // forces the model to output ONLY the JSON config.
    if (jsonRetry && previousResponse) {
      const retryMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `${prompt}\n\n---\nCurrent config:\n${JSON.stringify(currentConfig)}\n\nBusiness: ${JSON.stringify(businessContext || {})}`,
        },
        {
          role: "assistant",
          content: previousResponse,
        },
        {
          role: "user",
          content:
            "Your previous response did not include the JSON config block. Output ONLY the ```json fence with the configPatch or updatedConfig object. No explanation, no text before or after — ONLY the ```json ... ``` block.",
        },
      ];

      const retryResponse = await fetch(
        "https://api.together.xyz/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TOGETHER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "moonshotai/Kimi-K2-Instruct-0905",
            messages: retryMessages,
            max_tokens: 16000,
            temperature: 0.1,
            stream: false,
          }),
        }
      );

      if (!retryResponse.ok) {
        return errorResponse(502, "AI retry failed.");
      }

      const retryJson = await retryResponse.json();
      const retryText =
        retryJson.choices?.[0]?.message?.content || "";

      return new Response(retryText, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // --- STANDARD STREAMING MODE ---
    const chatMessages = buildMessages(
      prompt,
      currentConfig,
      businessContext || {},
      history || []
    );

    // Call Together.ai with streaming
    const togetherResponse = await fetch(
      "https://api.together.xyz/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2-Instruct-0905",
          messages: chatMessages,
          max_tokens: 32000,
          temperature: 0.25,
          stream: true,
        }),
      }
    );

    if (!togetherResponse.ok) {
      const errorBody = await togetherResponse.text();
      console.error(
        `Together.ai API error (${togetherResponse.status}):`,
        errorBody
      );
      return errorResponse(
        502,
        `AI service returned an error (${togetherResponse.status}). Please try again.`
      );
    }

    if (!togetherResponse.body) {
      return errorResponse(502, "AI returned an empty stream.");
    }

    // Transform SSE events to raw text and pipe to client
    const textStream = togetherResponse.body.pipeThrough(
      createSSEToTextTransform()
    );

    return new Response(textStream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("store-builder-ai error:", err);
    return errorResponse(
      500,
      "An unexpected error occurred. Please try again."
    );
  }
});
