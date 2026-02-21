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

## Response Format
ALWAYS respond in two parts:

**Part 1 — Explanation (1-3 sentences):** What you changed and why. Be direct, not chatty. Use design terminology.

**Part 2 — JSON Config:** Output the COMPLETE updated config in a \`\`\`json fence:
\`\`\`json
{
  "updatedConfig": { ...complete StoreConfig... },
  "changes": ["Switched to dark premium theme with cyan accents", "Added testimonials section with 3 client quotes", "Wrote custom CSS for glassmorphism card effects"]
}
\`\`\`

## Rules
- Explanation FIRST, then JSON fence
- JSON must be the COMPLETE config (not a partial diff)
- Preserve existing section IDs — never regenerate them
- New sections: ID = "sec_" + 8 random alphanumeric chars
- Config version: always '1.1'
- When user says "make it X themed": change ALL theme colors consistently (bg, surface, text, muted, border, primary)
- Use customCss liberally for effects like gradients, glassmorphism, shadows, animations
- Use customHead for Google Fonts when changing font families
- Write real, professional B2B content — never use "Lorem ipsum" or "Company Name"
- When adding sections, write content tailored to the business context provided
- Previous conversation messages give you context of what was already done — build on top, don't start over`;

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

  // Add the current user message with full config context
  const userMessage = `${prompt}

---
Current store config:
${JSON.stringify(currentConfig, null, 2)}

Business context: ${JSON.stringify(businessContext || {})}`;

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

    const { prompt, currentConfig, businessContext, history } =
      await req.json();

    if (!prompt || typeof prompt !== "string") {
      return errorResponse(400, "Missing or invalid 'prompt' field.");
    }

    if (!currentConfig || typeof currentConfig !== "object") {
      return errorResponse(400, "Missing or invalid 'currentConfig' field.");
    }

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
          max_tokens: 16000,
          temperature: 0.3,
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
