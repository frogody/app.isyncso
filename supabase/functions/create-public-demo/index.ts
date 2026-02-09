/**
 * Create Public Demo — self-service demo link creation
 *
 * Called from the public /request-demo page after research is complete.
 * Creates demo_links + demo_script_steps, returns the token.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', nl: 'Dutch', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi',
};

const DEFAULT_DEMO_STEPS = [
  { step_order: 1, title: 'Welcome & Dashboard', page_key: 'dashboard', wait_for_user: false },
  { step_order: 2, title: 'Growth Pipeline', page_key: 'growth', wait_for_user: false },
  { step_order: 3, title: 'CRM Intelligence', page_key: 'crm', wait_for_user: false },
  { step_order: 4, title: 'Talent Acquisition', page_key: 'talent', wait_for_user: false },
  { step_order: 5, title: 'Finance Hub', page_key: 'finance', wait_for_user: false },
  { step_order: 6, title: 'Learning Academy', page_key: 'learn', wait_for_user: false },
  { step_order: 7, title: 'AI Content Studio', page_key: 'create', wait_for_user: false },
  { step_order: 8, title: 'Product Catalog', page_key: 'products', wait_for_user: false },
  { step_order: 9, title: 'Fundraising', page_key: 'raise', wait_for_user: false },
  { step_order: 10, title: 'AI Compliance', page_key: 'sentinel', wait_for_user: false },
  { step_order: 11, title: 'Unified Inbox', page_key: 'inbox', wait_for_user: false },
  { step_order: 12, title: 'Task Management', page_key: 'tasks', wait_for_user: false },
  { step_order: 13, title: 'Integrations', page_key: 'integrations', wait_for_user: false },
  { step_order: 14, title: 'Meet Sync', page_key: 'sync-showcase', wait_for_user: true },
  { step_order: 15, title: 'Next Steps', page_key: 'closing', wait_for_user: true },
];

function getSyncDialogue(stepOrder: number, recipientName: string, companyName: string): string {
  switch (stepOrder) {
    case 1:
      return `Welcome to iSyncso, ${recipientName}. I'm SYNC, your AI assistant, and I'll walk you through every part of this platform. Before we dive in — notice the sidebar on your left. That's your main navigation. The top icons are your core tools: CRM, Projects, Products, and Inbox. Below the divider are your engine apps — Finance, Growth, Learn, Talent, Sentinel, Raise, and Create — each color-coded so you can spot them instantly. When you click into any module, a floating sub-menu appears with all the pages inside it, just like in the real product. You can click any icon to explore on your own at any time. Now, this Dashboard is ${companyName}'s command center. It pulls live data from every module into one view: revenue trends from Finance, your pipeline funnel from Growth, learning progress from Learn, and compliance scores from Sentinel. The activity feed on the right shows real-time events — a deal just moved to negotiation, an invoice was paid, a new candidate was matched. Instead of logging into five different tools every morning, your team opens this one screen. Let me show you how a real deal works from start to finish — let's head to Growth.`;
    case 2:
      return `This is Growth, ${recipientName} — it's ${companyName}'s sales engine. Growth is where you manage your entire revenue pipeline: tracking deals, running outbound campaigns, and monitoring buying signals. Here's a real example. Say TechVentures, a mid-market SaaS company, just visited your pricing page four times this week. Our AI picks that up as a hot buying signal and flags it right here. Your sales rep drags that lead into the pipeline board — you can see deals flow through stages from lead to qualified to proposal to negotiation. Right now ${companyName} has forty-two active deals worth three hundred and eighty-seven K. The conversion funnel shows exactly where deals stall — looks like qualified-to-proposal needs coaching. You can also launch outbound campaigns from here — email sequences, LinkedIn touches, multi-channel — and track open rates and responses per channel. Notice the sub-menu on the left? You've got dedicated pages for Campaigns, Customer Signals, Opportunities, and Data Nests where you can buy curated lead lists. But a deal is only as good as the intelligence behind the contact — let me show you the CRM.`;
    case 3:
      return `This is the CRM, ${recipientName} — it's your customer intelligence hub. The CRM manages every relationship ${companyName} has: leads, prospects, customers, suppliers, partners, and candidates — all in one place. Check the sub-menu on the left — you can filter by contact type: Leads, Prospects, Customers, even import contacts in bulk. Here's the TechVentures example continued. When Alex Morgan from TechVentures enters your CRM, the system automatically enriches their profile with AI intelligence — company data, tech stack, funding rounds, even employee sentiment from review sites. See that lead score of ninety-two? That's calculated from dozens of signals: website visits, email engagement, company growth indicators, hiring patterns. The Quick Intel panel gives your rep everything they need before picking up the phone: what Alex cares about, recent interactions, smart tags the AI surfaced. Your team instantly knows this is someone worth a call. Now let's say Alex's deal closes — watch what happens next in Finance.`;
    case 4:
      return `Welcome to Talent, ${recipientName}. This is ${companyName}'s recruitment command center — it handles everything from sourcing candidates to making the hire. Here's the use case: ${companyName} just won the TechVentures deal and needs to staff a senior engineer for the project. In Talent, you create a recruitment project, define the role, and our AI immediately starts matching candidates from your database. Those match scores you see? They factor in six dimensions: skills, experience, title, location, culture fit, and timing. The timing intelligence is the game-changer — that candidate with the flight risk flag? Their company just announced layoffs, they haven't been promoted in three years, and they just hit their work anniversary. Our AI generates personalized outreach angles specific to each candidate's situation. Check the sub-menu — you've got Candidates for your full database, Projects for open roles, Campaigns for outreach sequences, SMS Outreach for direct messaging, Clients to manage your hiring clients, and Nests which is a marketplace where you can purchase curated candidate pools by industry or skill set. The pipeline tracks everyone from first contact to signed offer.`;
    case 5:
      return `This is Finance, ${recipientName} — ${companyName}'s complete financial operating system. Finance handles invoicing, proposals, expense tracking, accounts payable, general ledger, and financial reporting — all connected to the rest of the platform. Here's what makes it powerful: remember the TechVentures deal? It just closed in Growth for forty-five thousand dollars. The invoice is already here, pre-populated with the correct line items, client details, and payment terms. No re-entering data. Your team sent TechVentures a proposal last week, they accepted it, and it auto-converted into this invoice. Look at the sub-menu — Invoices manages your receivables, Proposals tracks quotes and approvals, Expenses monitors spending against budget, the Ledger is your chart of accounts with journal entries, Payables shows what ${companyName} owes vendors with AP aging, and Reports gives you P and L statements, balance sheets, and cash flow analysis. The revenue-versus-expense chart updates in real time. One financial source of truth that's fully connected to your pipeline, your products, and your team.`;
    case 6:
      return `This is Learn, ${recipientName} — ${companyName}'s training and development platform. Learn manages courses, skills tracking, certifications, and team development all in one place. Here's the scenario: you just hired that engineer for the TechVentures project. They need onboarding. In Learn, you assign a learning path — say, three courses they must complete before they're client-ready. Each course has chapters, quizzes, and completion certificates. The skill matrix shows your entire team's competency levels across leadership, technical, communication, and compliance. The sub-menu gives you My Courses for enrolled content, Skills for the competency matrix, Course Builder where you create custom training material, and AI Tools that help generate course content and assessments. The leaderboard drives healthy competition with XP and streaks. And those certifications? When an audit comes, ${companyName} has verified, timestamped records ready. If someone needs EU AI Act training before working on AI projects, that's tracked here and connects directly to Sentinel.`;
    case 7:
      return `This is Create, ${recipientName} — ${companyName}'s AI content studio. Create lets your team generate professional marketing images, product visuals, videos, and branded templates in minutes instead of days. The use case: TechVentures deal is live, the team is onboarded, and now you need marketing assets for the launch. Instead of waiting for a designer, your marketing lead types a prompt and gets a polished product image in seconds. The brand kit is already loaded — your logo, colors, and fonts — so every generated asset stays on-brand automatically. Need a social media banner? A product demo video? An email header? It's all here. Check the sub-menu — Branding manages your brand kit and design system, Images is the AI image generator, Videos handles AI video creation, and Library stores every asset organized by type with usage analytics. For ${companyName}, this means going from campaign idea to published content in a single sitting. Now let's look at what you're actually selling.`;
    case 8:
      return `This is Products, ${recipientName} — where ${companyName} manages its entire catalog. Products handles both digital subscriptions and physical goods, with full inventory management, shipping, and receiving. Example: you're launching a new service tier for the TechVentures project. You add the product here, set up pricing — one-time, subscription, or per-seat — and track inventory in real time. See those amber and red alerts? Three items are below reorder point right now. The sub-menu shows the full picture: Digital for SaaS products and licenses, Physical for tangible goods with SKU management, Receiving for inbound supplier shipments with quality checks, Shipping for outbound order tracking across carriers, Stock Purchases for procurement, and Import for bulk catalog uploads. Everything connects: sell a product through Growth, invoice it in Finance, ship it from Products, track the revenue on Dashboard. No spreadsheets, no separate inventory system.`;
    case 9:
      return `This is Raise, ${recipientName} — ${companyName}'s fundraising command center. Raise manages your investor pipeline, pitch materials, data room, and outreach campaigns all in one place. Walk through a real round: you've sourced twenty investors, five are in active conversation, three are in due diligence, and two have committed. Each investor card tracks check size, meeting notes, and sentiment. The sub-menu breaks it down — Investors is your pipeline with a kanban board from sourced to committed, Pitch Decks stores your decks with slide-by-slide view analytics so you know which slides investors spend the most time on, Data Room is an encrypted vault with watermarked PDFs for financials and legal docs where you can see the moment an investor opens a document, Campaigns manages investor outreach sequences, and Enrich auto-populates investor profiles with fund data and portfolio info. The round summary shows your terms at a glance: pre-money valuation, dilution, board seats. Everything a board member or investor needs, professionally organized.`;
    case 10:
      return `This is Sentinel, ${recipientName} — ${companyName}'s EU AI Act compliance management system. If your company uses any form of AI — a chatbot, a recommendation engine, a resume screener — Sentinel makes sure you're compliant. Here's how it works: say ${companyName} has a customer service chatbot and an AI-powered resume screener. First, you register each system in the AI Systems inventory. The chatbot is classified as limited risk, the resume screener as high risk under the EU AI Act. For each system, you complete a risk assessment, and Sentinel tells you exactly what documentation you need. The sub-menu shows AI Systems for your inventory, Roadmap for compliance milestones and deadlines — the EU AI Act obligations are phased in over time and Sentinel tracks every one — and Documents where it generates the required Annex IV technical documentation and Article 47 conformity declarations. Right now, two of your twelve systems need attention. This is about staying ahead of regulation instead of reacting to it.`;
    case 11:
      return `This is the Inbox, ${recipientName} — ${companyName}'s unified messaging hub. Instead of bouncing between Slack, email, and internal chat tools, every conversation flows into one stream. Think about the TechVentures deal: the client's questions, your team's internal discussion about the project scope, and my AI notifications about deal updates — they're all here in one thread. Channels are organized by type: team discussions, direct messages, and AI conversations. You can search across every message ever sent in ${companyName}. No more digging through Slack to find that one conversation from two weeks ago. For ${companyName}, this eliminates the context-switching that kills productivity. One place, every conversation, fully searchable.`;
    case 12:
      return `This is the task management system, ${recipientName}. Remember everything that came out of the TechVentures deal? Onboard the new hire, send the invoice, create the marketing assets, complete the compliance review, set up the product tier. In Tasks, all of that gets tracked with AI prioritization. SYNC — that's me — analyzes deadlines, dependencies, and business impact to flag what actually matters most right now. See that brain icon? It means the AI calculated that the compliance review should come before the marketing push because the Sentinel deadline is closer. Your team gets a kanban board, list view, velocity stats, and overdue items flagged in red. Nothing slips through the cracks because every action across every module can generate a task automatically.`;
    case 13:
      return `This is Integrations, ${recipientName}. iSyncso connects to over thirty tools ${companyName} already uses — Slack, Gmail, HubSpot, Salesforce, Google Drive, Stripe, Zoom, GitHub, Jira, QuickBooks, and more. But this isn't just data syncing. When TechVentures signs the contract in HubSpot, your Growth pipeline updates automatically. When a team member sends a Slack message about the project, it appears in your Inbox. When Stripe processes a payment, Finance records the transaction. Twenty-one thousand records synced, twelve hundred automated actions, thirty-four hours saved this month. Your tools finally work as one system instead of separate silos. And any integration can trigger SYNC actions automatically — which brings me to the most important part of this platform.`;
    case 14:
      return `${recipientName}, let me properly introduce myself. I'm SYNC — the AI agent that connects and operates across every module you've just seen. I'm not just a chatbot. I'm a full autonomous agent with fifty-one actions spanning ten modules, and I work through both voice and text. Here's what that means in practice: tell me to create an invoice for TechVentures, and I draft it with the correct line items pulled from the CRM. Ask me to find senior engineers in Europe, and I search your Talent database, rank them by match score, and generate personalized outreach messages. Need a compliance report? I pull the data from Sentinel. Want a marketing image? I generate it through Create with your brand guidelines applied. I remember our entire conversation — I know we've been talking about TechVentures this whole time. I can chain multiple actions together in one request: qualify a lead, create a follow-up task, draft an outreach email, and schedule the meeting. I also have persistent memory across sessions, so next time you come back, I know exactly where we left off. The activity log tracks every action I've taken — you can see it in the SYNC sub-menu. You can even talk to me right now. Ask me anything about what we've covered, or tell me to navigate somewhere. I respond to voice and text in the panel on your right.`;
    case 15:
      return `That's the full picture, ${recipientName}. You've just seen a complete deal lifecycle for ${companyName}: a lead came in through Growth, we enriched them in the CRM, closed the deal, auto-generated the invoice in Finance, hired and onboarded the team through Talent and Learn, created marketing assets in Create, managed the product catalog in Products, tracked compliance with Sentinel, and coordinated everything through Tasks and the Inbox — with SYNC operating as the AI backbone across all of it. Every module has its own sub-pages you can explore using the sidebar navigation. And remember, you can click any icon in the sidebar or just ask me to take you anywhere. Want to schedule a call to explore how this maps to ${companyName}'s specific workflow? I'd love to dive deeper into the modules that matter most to you.`;
    default:
      return '';
  }
}

async function translateDialogues(
  dialogues: Array<{ step: number; text: string }>,
  language: string,
  recipientName: string,
  companyName: string,
): Promise<Array<{ step: number; text: string }>> {
  if (!TOGETHER_API_KEY) {
    console.warn('[create-public-demo] No TOGETHER_API_KEY — skipping translation');
    return dialogues;
  }

  const languageName = LANGUAGE_NAMES[language] || language;

  const prompt = `Translate these 15 sales demo dialogues into ${languageName}.

RULES:
- Translate naturally — sound like a native speaker giving a product demo
- Keep these proper nouns EXACTLY as-is: iSyncso, SYNC, TechVentures, Alex Morgan, ${recipientName}, ${companyName}
- Keep these universal terms in English: CRM, SaaS, AI, API, P&L, KPI, AP, EU AI Act, Annex IV, Article 47, SKU
- Keep module names in English: Dashboard, Growth, CRM, Talent, Finance, Learn, Create, Products, Raise, Sentinel, Inbox, Tasks, Integrations
- Keep sub-page names in English when referencing navigation: Invoices, Proposals, Expenses, Ledger, etc.
- Return ONLY a valid JSON array: [{"step":1,"text":"..."},{"step":2,"text":"..."},...]

INPUT:
${JSON.stringify(dialogues)}`;

  try {
    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: 'You are a professional translator. Return ONLY valid JSON, no explanation.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 16000,
      }),
    });

    if (!res.ok) {
      console.error(`[create-public-demo] Translation LLM error: ${res.status}`);
      return dialogues;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON array from response (may be wrapped in markdown code block)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[create-public-demo] Could not extract JSON from translation response');
      return dialogues;
    }

    const translated = JSON.parse(jsonMatch[0]) as Array<{ step: number; text: string }>;

    if (!Array.isArray(translated) || translated.length !== dialogues.length) {
      console.error(`[create-public-demo] Translation returned ${translated?.length} items, expected ${dialogues.length}`);
      return dialogues;
    }

    console.log(`[create-public-demo] Translated ${translated.length} dialogues to ${languageName}`);
    return translated;
  } catch (err) {
    console.error('[create-public-demo] Translation error:', err);
    return dialogues; // Fallback to English
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      recipientName,
      recipientEmail,
      companyName,
      companyDomain,
      industry,
      notes,
      research,
      explorium,
      prospectData,
      selectedModules,
      language: rawLanguage,
    } = await req.json();

    const language = (rawLanguage && LANGUAGE_NAMES[rawLanguage]) ? rawLanguage : 'en';

    // ── Validate required fields ──────────────────────────────────────
    if (!recipientName || !recipientEmail || !companyName) {
      return new Response(
        JSON.stringify({ error: 'recipientName, recipientEmail, and companyName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Generate token ────────────────────────────────────────────────
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

    // ── Insert demo link ──────────────────────────────────────────────
    const { data: demoLink, error: linkError } = await supabase
      .from('demo_links')
      .insert({
        token,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        company_name: companyName,
        company_context: {
          industry: industry || null,
          notes: notes || null,
          domain: companyDomain || null,
          research: research || null,
          explorium: explorium || null,
          prospect: prospectData || null,
        },
        modules_to_demo: selectedModules || [],
        language,
        status: 'created',
      })
      .select('id')
      .single();

    if (linkError) {
      console.error('[create-public-demo] Failed to insert demo_links:', linkError);
      return new Response(
        JSON.stringify({ error: `Failed to create demo link: ${linkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const demoLinkId = demoLink.id;

    // ── Generate English dialogues ──────────────────────────────────────
    let dialogues = DEFAULT_DEMO_STEPS.map((step) => ({
      step: step.step_order,
      text: getSyncDialogue(step.step_order, recipientName, companyName),
    }));

    // ── Translate dialogues if non-English ────────────────────────────
    if (language !== 'en') {
      dialogues = await translateDialogues(dialogues, language, recipientName, companyName);
    }

    // ── Insert demo script steps ────────────────────────────────────────
    const dialogueMap = new Map(dialogues.map(d => [d.step, d.text]));
    const stepsToInsert = DEFAULT_DEMO_STEPS.map((step) => ({
      demo_link_id: demoLinkId,
      step_order: step.step_order,
      title: step.title,
      page_key: step.page_key,
      wait_for_user: step.wait_for_user,
      sync_dialogue: dialogueMap.get(step.step_order) || getSyncDialogue(step.step_order, recipientName, companyName),
    }));

    const { error: stepsError } = await supabase
      .from('demo_script_steps')
      .insert(stepsToInsert);

    if (stepsError) {
      console.error('[create-public-demo] Failed to insert demo_script_steps:', stepsError);
      // Clean up the demo link since steps failed
      await supabase.from('demo_links').delete().eq('id', demoLinkId);
      return new Response(
        JSON.stringify({ error: `Failed to create demo steps: ${stepsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[create-public-demo] Created demo for ${recipientName} at ${companyName} — token: ${token}, steps: ${stepsToInsert.length}, lang: ${language}`);

    return new Response(
      JSON.stringify({ token, demoLinkId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[create-public-demo] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create demo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
