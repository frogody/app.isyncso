/**
 * AdminDemos Page
 * Demo link management for platform administrators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import {
  Presentation,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  RefreshCw,
  Users,
  Eye,
  CheckCircle,
  Clock,
  Search,
  Link2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Building2,
  Target,
  Lightbulb,
  Shield,
  Languages,
} from 'lucide-react';
import { LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_NAMES } from '@/constants/languages';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Marketing',
  'Consulting',
  'Real Estate',
  'Other',
];

const MODULE_OPTIONS = [
  'Dashboard',
  'Growth',
  'CRM',
  'Talent',
  'Finance',
  'Learn',
  'Create',
  'Products',
  'Raise',
  'Sentinel',
  'Inbox',
  'Tasks',
  'Integrations',
];

const STATUS_STYLES = {
  created: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  viewed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
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

function getSyncDialogue(stepOrder, recipientName, companyName) {
  const dialogues = {
    1: `Welcome to iSyncso, ${recipientName}. I'm SYNC, your AI assistant, and I'll walk you through every part of this platform. Before we dive in — notice the sidebar on your left. That's your main navigation. The top icons are your core tools: CRM, Projects, Products, and Inbox. Below the divider are your engine apps — Finance, Growth, Learn, Talent, Sentinel, Raise, and Create — each color-coded so you can spot them instantly. When you click into any module, a floating sub-menu appears with all the pages inside it, just like in the real product. You can click any icon to explore on your own at any time. Now, this Dashboard is ${companyName}'s command center. It pulls live data from every module into one view: revenue trends from Finance, your pipeline funnel from Growth, learning progress from Learn, and compliance scores from Sentinel. The activity feed on the right shows real-time events — a deal just moved to negotiation, an invoice was paid, a new candidate was matched. Instead of logging into five different tools every morning, your team opens this one screen. Let me show you how a real deal works from start to finish — let's head to Growth.`,

    2: `This is Growth, ${recipientName} — it's ${companyName}'s sales engine. Growth is where you manage your entire revenue pipeline: tracking deals, running outbound campaigns, and monitoring buying signals. Here's a real example. Say TechVentures, a mid-market SaaS company, just visited your pricing page four times this week. Our AI picks that up as a hot buying signal and flags it right here. Your sales rep drags that lead into the pipeline board — you can see deals flow through stages from lead to qualified to proposal to negotiation. Right now ${companyName} has forty-two active deals worth three hundred and eighty-seven K. The conversion funnel shows exactly where deals stall — looks like qualified-to-proposal needs coaching. You can also launch outbound campaigns from here — email sequences, LinkedIn touches, multi-channel — and track open rates and responses per channel. Notice the sub-menu on the left? You've got dedicated pages for Campaigns, Customer Signals, Opportunities, and Data Nests where you can buy curated lead lists. But a deal is only as good as the intelligence behind the contact — let me show you the CRM.`,

    3: `This is the CRM, ${recipientName} — it's your customer intelligence hub. The CRM manages every relationship ${companyName} has: leads, prospects, customers, suppliers, partners, and candidates — all in one place. Check the sub-menu on the left — you can filter by contact type: Leads, Prospects, Customers, even import contacts in bulk. Here's the TechVentures example continued. When Alex Morgan from TechVentures enters your CRM, the system automatically enriches their profile with AI intelligence — company data, tech stack, funding rounds, even employee sentiment from review sites. See that lead score of ninety-two? That's calculated from dozens of signals: website visits, email engagement, company growth indicators, hiring patterns. The Quick Intel panel gives your rep everything they need before picking up the phone: what Alex cares about, recent interactions, smart tags the AI surfaced. Your team instantly knows this is someone worth a call. Now let's say Alex's deal closes — watch what happens next in Finance.`,

    4: `Welcome to Talent, ${recipientName}. This is ${companyName}'s recruitment command center — it handles everything from sourcing candidates to making the hire. Here's the use case: ${companyName} just won the TechVentures deal and needs to staff a senior engineer for the project. In Talent, you create a recruitment project, define the role, and our AI immediately starts matching candidates from your database. Those match scores you see? They factor in six dimensions: skills, experience, title, location, culture fit, and timing. The timing intelligence is the game-changer — that candidate with the flight risk flag? Their company just announced layoffs, they haven't been promoted in three years, and they just hit their work anniversary. Our AI generates personalized outreach angles specific to each candidate's situation. Check the sub-menu — you've got Candidates for your full database, Projects for open roles, Campaigns for outreach sequences, SMS Outreach for direct messaging, Clients to manage your hiring clients, and Nests which is a marketplace where you can purchase curated candidate pools by industry or skill set. The pipeline tracks everyone from first contact to signed offer.`,

    5: `This is Finance, ${recipientName} — ${companyName}'s complete financial operating system. Finance handles invoicing, proposals, expense tracking, accounts payable, general ledger, and financial reporting — all connected to the rest of the platform. Here's what makes it powerful: remember the TechVentures deal? It just closed in Growth for forty-five thousand dollars. The invoice is already here, pre-populated with the correct line items, client details, and payment terms. No re-entering data. Your team sent TechVentures a proposal last week, they accepted it, and it auto-converted into this invoice. Look at the sub-menu — Invoices manages your receivables, Proposals tracks quotes and approvals, Expenses monitors spending against budget, the Ledger is your chart of accounts with journal entries, Payables shows what ${companyName} owes vendors with AP aging, and Reports gives you P and L statements, balance sheets, and cash flow analysis. The revenue-versus-expense chart updates in real time. One financial source of truth that's fully connected to your pipeline, your products, and your team.`,

    6: `This is Learn, ${recipientName} — ${companyName}'s training and development platform. Learn manages courses, skills tracking, certifications, and team development all in one place. Here's the scenario: you just hired that engineer for the TechVentures project. They need onboarding. In Learn, you assign a learning path — say, three courses they must complete before they're client-ready. Each course has chapters, quizzes, and completion certificates. The skill matrix shows your entire team's competency levels across leadership, technical, communication, and compliance. The sub-menu gives you My Courses for enrolled content, Skills for the competency matrix, Course Builder where you create custom training material, and AI Tools that help generate course content and assessments. The leaderboard drives healthy competition with XP and streaks. And those certifications? When an audit comes, ${companyName} has verified, timestamped records ready. If someone needs EU AI Act training before working on AI projects, that's tracked here and connects directly to Sentinel.`,

    7: `This is Create, ${recipientName} — ${companyName}'s AI content studio. Create lets your team generate professional marketing images, product visuals, videos, and branded templates in minutes instead of days. The use case: TechVentures deal is live, the team is onboarded, and now you need marketing assets for the launch. Instead of waiting for a designer, your marketing lead types a prompt and gets a polished product image in seconds. The brand kit is already loaded — your logo, colors, and fonts — so every generated asset stays on-brand automatically. Need a social media banner? A product demo video? An email header? It's all here. Check the sub-menu — Branding manages your brand kit and design system, Images is the AI image generator, Videos handles AI video creation, and Library stores every asset organized by type with usage analytics. For ${companyName}, this means going from campaign idea to published content in a single sitting. Now let's look at what you're actually selling.`,

    8: `This is Products, ${recipientName} — where ${companyName} manages its entire catalog. Products handles both digital subscriptions and physical goods, with full inventory management, shipping, and receiving. Example: you're launching a new service tier for the TechVentures project. You add the product here, set up pricing — one-time, subscription, or per-seat — and track inventory in real time. See those amber and red alerts? Three items are below reorder point right now. The sub-menu shows the full picture: Digital for SaaS products and licenses, Physical for tangible goods with SKU management, Receiving for inbound supplier shipments with quality checks, Shipping for outbound order tracking across carriers, Stock Purchases for procurement, and Import for bulk catalog uploads. Everything connects: sell a product through Growth, invoice it in Finance, ship it from Products, track the revenue on Dashboard. No spreadsheets, no separate inventory system.`,

    9: `This is Raise, ${recipientName} — ${companyName}'s fundraising command center. Raise manages your investor pipeline, pitch materials, data room, and outreach campaigns all in one place. Walk through a real round: you've sourced twenty investors, five are in active conversation, three are in due diligence, and two have committed. Each investor card tracks check size, meeting notes, and sentiment. The sub-menu breaks it down — Investors is your pipeline with a kanban board from sourced to committed, Pitch Decks stores your decks with slide-by-slide view analytics so you know which slides investors spend the most time on, Data Room is an encrypted vault with watermarked PDFs for financials and legal docs where you can see the moment an investor opens a document, Campaigns manages investor outreach sequences, and Enrich auto-populates investor profiles with fund data and portfolio info. The round summary shows your terms at a glance: pre-money valuation, dilution, board seats. Everything a board member or investor needs, professionally organized.`,

    10: `This is Sentinel, ${recipientName} — ${companyName}'s EU AI Act compliance management system. If your company uses any form of AI — a chatbot, a recommendation engine, a resume screener — Sentinel makes sure you're compliant. Here's how it works: say ${companyName} has a customer service chatbot and an AI-powered resume screener. First, you register each system in the AI Systems inventory. The chatbot is classified as limited risk, the resume screener as high risk under the EU AI Act. For each system, you complete a risk assessment, and Sentinel tells you exactly what documentation you need. The sub-menu shows AI Systems for your inventory, Roadmap for compliance milestones and deadlines — the EU AI Act obligations are phased in over time and Sentinel tracks every one — and Documents where it generates the required Annex IV technical documentation and Article 47 conformity declarations. Right now, two of your twelve systems need attention. This is about staying ahead of regulation instead of reacting to it.`,

    11: `This is the Inbox, ${recipientName} — ${companyName}'s unified messaging hub. Instead of bouncing between Slack, email, and internal chat tools, every conversation flows into one stream. Think about the TechVentures deal: the client's questions, your team's internal discussion about the project scope, and my AI notifications about deal updates — they're all here in one thread. Channels are organized by type: team discussions, direct messages, and AI conversations. You can search across every message ever sent in ${companyName}. No more digging through Slack to find that one conversation from two weeks ago. For ${companyName}, this eliminates the context-switching that kills productivity. One place, every conversation, fully searchable.`,

    12: `This is the task management system, ${recipientName}. Remember everything that came out of the TechVentures deal? Onboard the new hire, send the invoice, create the marketing assets, complete the compliance review, set up the product tier. In Tasks, all of that gets tracked with AI prioritization. SYNC — that's me — analyzes deadlines, dependencies, and business impact to flag what actually matters most right now. See that brain icon? It means the AI calculated that the compliance review should come before the marketing push because the Sentinel deadline is closer. Your team gets a kanban board, list view, velocity stats, and overdue items flagged in red. Nothing slips through the cracks because every action across every module can generate a task automatically.`,

    13: `This is Integrations, ${recipientName}. iSyncso connects to over thirty tools ${companyName} already uses — Slack, Gmail, HubSpot, Salesforce, Google Drive, Stripe, Zoom, GitHub, Jira, QuickBooks, and more. But this isn't just data syncing. When TechVentures signs the contract in HubSpot, your Growth pipeline updates automatically. When a team member sends a Slack message about the project, it appears in your Inbox. When Stripe processes a payment, Finance records the transaction. Twenty-one thousand records synced, twelve hundred automated actions, thirty-four hours saved this month. Your tools finally work as one system instead of separate silos. And any integration can trigger SYNC actions automatically — which brings me to the most important part of this platform.`,

    14: `${recipientName}, let me properly introduce myself. I'm SYNC — the AI agent that connects and operates across every module you've just seen. I'm not just a chatbot. I'm a full autonomous agent with fifty-one actions spanning ten modules, and I work through both voice and text. Here's what that means in practice: tell me to create an invoice for TechVentures, and I draft it with the correct line items pulled from the CRM. Ask me to find senior engineers in Europe, and I search your Talent database, rank them by match score, and generate personalized outreach messages. Need a compliance report? I pull the data from Sentinel. Want a marketing image? I generate it through Create with your brand guidelines applied. I remember our entire conversation — I know we've been talking about TechVentures this whole time. I can chain multiple actions together in one request: qualify a lead, create a follow-up task, draft an outreach email, and schedule the meeting. I also have persistent memory across sessions, so next time you come back, I know exactly where we left off. The activity log tracks every action I've taken — you can see it in the SYNC sub-menu. You can even talk to me right now. Ask me anything about what we've covered, or tell me to navigate somewhere. I respond to voice and text in the panel on your right.`,

    15: `That's the full picture, ${recipientName}. You've just seen a complete deal lifecycle for ${companyName}: a lead came in through Growth, we enriched them in the CRM, closed the deal, auto-generated the invoice in Finance, hired and onboarded the team through Talent and Learn, created marketing assets in Create, managed the product catalog in Products, tracked compliance with Sentinel, and coordinated everything through Tasks and the Inbox — with SYNC operating as the AI backbone across all of it. Every module has its own sub-pages you can explore using the sidebar navigation. And remember, you can click any icon in the sidebar or just ask me to take you anywhere. Want to schedule a call to explore how this maps to ${companyName}'s specific workflow? I'd love to dive deeper into the modules that matter most to you.`,
  };
  return dialogues[stepOrder] || '';
}

function getAuthSupabase(accessToken) {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  );
}

// Stats Card
function StatCard({ title, value, icon: Icon, colorClass, isLoading }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-400 mb-0.5">{title}</p>
            {isLoading ? (
              <div className="h-6 w-16 bg-zinc-800 animate-pulse rounded" />
            ) : (
              <h3 className="text-lg font-bold text-white">{value}</h3>
            )}
          </div>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border',
              colorClass
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatStatusLabel(status) {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Create Demo Dialog
function CreateDemoDialog({ open, onOpenChange, onCreated }) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedModules, setSelectedModules] = useState(
    MODULE_OPTIONS.reduce((acc, m) => ({ ...acc, [m]: true }), {})
  );
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isCreating, setIsCreating] = useState(false);
  const [research, setResearch] = useState(null);
  const [explorium, setExplorium] = useState(null);
  const [prospectData, setProspectData] = useState(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchExpanded, setResearchExpanded] = useState(true);
  const [researchPhase, setResearchPhase] = useState('');

  const resetForm = () => {
    setRecipientName('');
    setRecipientEmail('');
    setCompanyName('');
    setCompanyDomain('');
    setIndustry('');
    setNotes('');
    setLanguage(DEFAULT_LANGUAGE);
    setResearch(null);
    setExplorium(null);
    setProspectData(null);
    setIsResearching(false);
    setResearchExpanded(true);
    setResearchPhase('');
    setSelectedModules(
      MODULE_OPTIONS.reduce((acc, m) => ({ ...acc, [m]: true }), {})
    );
  };

  // Auto-extract domain from email
  const handleEmailChange = (email) => {
    setRecipientEmail(email);
    if (!companyDomain && email.includes('@')) {
      const domain = email.split('@')[1];
      if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('hotmail') && !domain.includes('outlook')) {
        setCompanyDomain(domain);
      }
    }
  };

  const handleResearch = async () => {
    if (!companyName.trim()) {
      toast.error('Enter a company name first.');
      return;
    }
    setIsResearching(true);
    setResearchPhase('Enriching with Explorium...');

    try {
      // Phase 1: Call Explorium for real company data + prospect data in parallel
      const exploriumPromises = [];

      // Company intelligence (firmographics, tech stack, funding, workforce, competitors, traffic)
      exploriumPromises.push(
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCompanyIntelligence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: companyName.trim(),
            companyDomain: companyDomain.trim() || null,
          }),
        }).then(r => r.json()).catch(e => ({ error: e.message }))
      );

      // Prospect enrichment (if email provided)
      if (recipientEmail.trim()) {
        exploriumPromises.push(
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explorium-enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'full_enrich',
              email: recipientEmail.trim(),
              full_name: recipientName.trim() || null,
              company_name: companyName.trim(),
            }),
          }).then(r => r.json()).catch(e => ({ error: e.message }))
        );
      }

      const [companyResult, prospectResult] = await Promise.all(exploriumPromises);

      const exploriumIntel = companyResult?.intelligence || null;
      const prospectEnriched = prospectResult?.error ? null : (prospectResult || null);

      setExplorium(exploriumIntel);
      setProspectData(prospectEnriched);

      // Phase 2: Pass Explorium data to LLM for intelligent strategy generation
      setResearchPhase('Generating AI strategy...');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-demo-prospect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientName: recipientName.trim(),
            recipientEmail: recipientEmail.trim(),
            companyName: companyName.trim(),
            companyDomain: companyDomain.trim() || null,
            industry,
            notes: notes.trim(),
            exploriumData: exploriumIntel,
            prospectData: prospectEnriched,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResearch(data.research);
      setResearchExpanded(true);

      // Auto-fill industry from Explorium if not set
      if (!industry && exploriumIntel?.firmographics?.industry) {
        setIndustry(
          INDUSTRY_OPTIONS.find(o => exploriumIntel.firmographics.industry.toLowerCase().includes(o.toLowerCase())) || 'Other'
        );
      }

      // Auto-select priority modules from research
      if (data.research?.demo_strategy?.priority_modules) {
        const priorities = data.research.demo_strategy.priority_modules;
        const newModules = { ...selectedModules };
        MODULE_OPTIONS.forEach((mod) => {
          const key = mod.toLowerCase();
          newModules[mod] = priorities.includes(key);
        });
        newModules['Dashboard'] = true;
        setSelectedModules(newModules);
      }

      toast.success('Research complete!');
    } catch (err) {
      console.error('[AdminDemos] Research error:', err);
      toast.error(err.message || 'Research failed.');
    } finally {
      setIsResearching(false);
      setResearchPhase('');
    }
  };

  const handleToggleModule = (mod) => {
    setSelectedModules((prev) => ({ ...prev, [mod]: !prev[mod] }));
  };

  const handleCreate = async () => {
    if (!recipientName.trim() || !recipientEmail.trim() || !companyName.trim()) {
      toast.error('Recipient name, email, and company name are required.');
      return;
    }

    setIsCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Not authenticated. Please log in again.');
        setIsCreating(false);
        return;
      }

      const authSupabase = getAuthSupabase(accessToken);
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      const modules = Object.entries(selectedModules)
        .filter(([, v]) => v)
        .map(([k]) => k.toLowerCase());

      const { data: demoLink, error: insertError } = await authSupabase
        .from('demo_links')
        .insert({
          token,
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          company_name: companyName.trim(),
          company_context: {
            industry: industry || null,
            notes: notes.trim() || null,
            domain: companyDomain.trim() || null,
            research: research || null,
            explorium: explorium || null,
            prospect: prospectData || null,
          },
          modules_to_demo: modules,
          language,
          status: 'created',
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Insert default demo script steps
      const steps = DEFAULT_DEMO_STEPS.map((step) => ({
        demo_link_id: demoLink.id,
        step_order: step.step_order,
        title: step.title,
        page_key: step.page_key,
        sync_dialogue: getSyncDialogue(
          step.step_order,
          recipientName.trim(),
          companyName.trim()
        ),
        wait_for_user: step.wait_for_user,
      }));

      const { error: stepsError } = await authSupabase
        .from('demo_script_steps')
        .insert(steps);

      if (stepsError) {
        console.error('[AdminDemos] Error inserting demo steps:', stepsError);
        // Demo link was created, steps failed - non-fatal
        toast.warning('Demo link created, but script steps could not be saved.');
      } else {
        toast.success('Demo link created successfully!');
      }

      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      console.error('[AdminDemos] Error creating demo link:', error);
      toast.error(error.message || 'Failed to create demo link.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Link2 className="w-5 h-5 text-red-400" />
            Create Demo Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Recipient Name */}
          <div className="space-y-1.5">
            <Label htmlFor="recipient-name" className="text-zinc-300 text-xs">
              Recipient Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="recipient-name"
              placeholder="John Doe"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Recipient Email */}
          <div className="space-y-1.5">
            <Label htmlFor="recipient-email" className="text-zinc-300 text-xs">
              Recipient Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="john@company.com"
              value={recipientEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="text-zinc-300 text-xs">
              Company Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="company-name"
              placeholder="Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Company Domain */}
          <div className="space-y-1.5">
            <Label htmlFor="company-domain" className="text-zinc-300 text-xs">
              Company Domain
              <span className="text-zinc-600 ml-1 font-normal">(auto-filled from email)</span>
            </Label>
            <Input
              id="company-domain"
              placeholder="company.com"
              value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select industry..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {INDUSTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes / Pain Points */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-zinc-300 text-xs">
              Notes / Pain Points
            </Label>
            <Textarea
              id="notes"
              placeholder="Describe pain points, specific needs, or context for this demo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
            />
          </div>


          {/* AI Research Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 text-xs">AI Prospect Research</Label>
              {research && (
                <button
                  onClick={() => setResearchExpanded(!researchExpanded)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
                >
                  {researchExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {researchExpanded ? 'Collapse' : 'Expand'}
                </button>
              )}
            </div>
            {!research && !explorium ? (
              <Button
                onClick={handleResearch}
                disabled={isResearching || !companyName.trim()}
                variant="outline"
                size="sm"
                className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
              >
                {isResearching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    {researchPhase || `Researching ${companyName || '...'}`}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Research Prospect & Company
                  </>
                )}
              </Button>
            ) : (
              <>
                {researchExpanded && (
                  <div className="space-y-2 text-xs">
                    {/* Explorium Real Data */}
                    {explorium && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Shield className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-purple-400 font-medium">Explorium Intelligence</span>
                          {explorium.data_quality && (
                            <span className="text-[10px] text-zinc-500 ml-auto">{explorium.data_quality.completeness}/8 sources</span>
                          )}
                        </div>

                        {/* Firmographics */}
                        {explorium.firmographics && (
                          <div className="mb-1.5">
                            <p className="text-zinc-300 leading-relaxed">
                              {explorium.firmographics.description || explorium.firmographics.company_name}
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-zinc-500">
                              {explorium.firmographics.industry && <span><span className="text-zinc-400">Industry:</span> {explorium.firmographics.industry}</span>}
                              {explorium.firmographics.employee_count_range && <span><span className="text-zinc-400">Size:</span> {explorium.firmographics.employee_count_range}</span>}
                              {explorium.firmographics.revenue_range && <span><span className="text-zinc-400">Revenue:</span> {explorium.firmographics.revenue_range}</span>}
                              {explorium.firmographics.headquarters && <span><span className="text-zinc-400">HQ:</span> {explorium.firmographics.headquarters}</span>}
                              {explorium.firmographics.founded_year && <span><span className="text-zinc-400">Founded:</span> {explorium.firmographics.founded_year}</span>}
                            </div>
                          </div>
                        )}

                        {/* Tech Stack */}
                        {explorium.technographics?.tech_stack?.length > 0 && (
                          <div className="mb-1.5">
                            <span className="text-[10px] text-zinc-400">Tech Stack ({explorium.technographics.tech_count}):</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {explorium.technographics.tech_stack.slice(0, 4).map((cat, i) => (
                                <span key={i} className="text-[10px] text-purple-400/70">
                                  {cat.category}: {cat.technologies.slice(0, 3).join(', ')}{cat.technologies.length > 3 ? ` +${cat.technologies.length - 3}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Funding */}
                        {explorium.funding && explorium.funding.total_funding && (
                          <div className="mb-1.5 text-[10px] text-zinc-500">
                            <span className="text-zinc-400">Funding:</span> {explorium.funding.total_funding}
                            {explorium.funding.funding_stage && <> ({explorium.funding.funding_stage})</>}
                            {explorium.funding.last_funding_date && <> — last: {explorium.funding.last_funding_date}</>}
                          </div>
                        )}

                        {/* Competitors */}
                        {explorium.competitive_landscape?.competitors?.length > 0 && (
                          <div className="mb-1.5">
                            <span className="text-[10px] text-zinc-400">Competitors:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {explorium.competitive_landscape.competitors.slice(0, 5).map((c, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400/80 rounded text-[10px]">{c.name}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Workforce */}
                        {explorium.workforce?.departments?.length > 0 && (
                          <div className="text-[10px] text-zinc-500">
                            <span className="text-zinc-400">Departments:</span>{' '}
                            {explorium.workforce.departments.slice(0, 5).map(d => `${d.name} ${d.percentage}%`).join(', ')}
                          </div>
                        )}

                        {/* Employee Ratings */}
                        {explorium.employee_ratings?.overall_rating && (
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            <span className="text-zinc-400">Employee Rating:</span> {explorium.employee_ratings.overall_rating}/5
                            {explorium.employee_ratings.recommend_percent && <> — {explorium.employee_ratings.recommend_percent}% recommend</>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prospect Enrichment */}
                    {prospectData && !prospectData.error && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-blue-400 font-medium">Prospect Profile</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
                          {prospectData.job_title && <span><span className="text-zinc-400">Title:</span> {prospectData.job_title}</span>}
                          {prospectData.job_department && <span><span className="text-zinc-400">Dept:</span> {prospectData.job_department}</span>}
                          {prospectData.job_seniority_level && <span><span className="text-zinc-400">Level:</span> {prospectData.job_seniority_level}</span>}
                          {(prospectData.location_city || prospectData.location_country) && (
                            <span><span className="text-zinc-400">Location:</span> {[prospectData.location_city, prospectData.location_country].filter(Boolean).join(', ')}</span>
                          )}
                        </div>
                        {prospectData.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {prospectData.skills.slice(0, 8).map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400/80 rounded text-[10px]">
                                {typeof s === 'string' ? s : s?.name || s?.skill || ''}
                              </span>
                            ))}
                            {prospectData.skills.length > 8 && <span className="text-[10px] text-zinc-600">+{prospectData.skills.length - 8} more</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LLM Company Analysis (only if no Explorium data, avoid duplication) */}
                    {research?.company && !explorium?.firmographics && (
                      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-cyan-400 font-medium">Company (AI Analysis)</span>
                          {research.company.estimated_size && (
                            <span className="text-[10px] text-zinc-500 ml-auto">{research.company.estimated_size}</span>
                          )}
                        </div>
                        <p className="text-zinc-300 leading-relaxed">{research.company.description}</p>
                        {research.company.products_services?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {research.company.products_services.map((p, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400/80 rounded text-[10px]">{p}</span>
                            ))}
                          </div>
                        )}
                        {research.company.target_audience && (
                          <p className="text-zinc-500 mt-1.5"><span className="text-zinc-400">Audience:</span> {research.company.target_audience}</p>
                        )}
                      </div>
                    )}

                    {/* Pain points & competitive */}
                    {research?.competitive_landscape && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400 font-medium">Pain Points & Competition</span>
                        </div>
                        {research.competitive_landscape.pain_points?.length > 0 && (
                          <ul className="space-y-0.5 text-zinc-300">
                            {research.competitive_landscape.pain_points.map((p, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-amber-400/60 mt-0.5">-</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {research.competitive_landscape.likely_tools?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {research.competitive_landscape.likely_tools.map((t, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400/80 rounded text-[10px]">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Demo strategy */}
                    {research?.demo_strategy && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Demo Strategy</span>
                        </div>
                        {research.demo_strategy.opening_hook && (
                          <p className="text-zinc-300 italic mb-1.5">"{research.demo_strategy.opening_hook}"</p>
                        )}
                        {research.demo_strategy.killer_scenarios?.length > 0 && (
                          <div className="space-y-1">
                            {research.demo_strategy.killer_scenarios.map((s, i) => (
                              <p key={i} className="text-zinc-400 text-[10px]">
                                <span className="text-emerald-400/60">Scenario {i + 1}:</span> {s}
                              </p>
                            ))}
                          </div>
                        )}
                        {research.demo_strategy.closing_angle && (
                          <p className="text-zinc-500 mt-1.5 text-[10px]">
                            <span className="text-emerald-400/60">Close:</span> {research.demo_strategy.closing_angle}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Re-research button */}
                    <Button
                      onClick={handleResearch}
                      disabled={isResearching}
                      variant="ghost"
                      size="sm"
                      className="w-full text-zinc-500 hover:text-zinc-300 text-[10px] h-6"
                    >
                      <RefreshCw className={cn("w-3 h-3 mr-1.5", isResearching && "animate-spin")} />
                      Re-research
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modules to Demo */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs">
              Modules to Demo
              {research?.demo_strategy?.priority_modules && (
                <span className="text-cyan-400/60 ml-1.5 text-[10px] font-normal">(auto-selected from research)</span>
              )}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {MODULE_OPTIONS.map((mod) => (
                <label
                  key={mod}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                    selectedModules[mod]
                      ? 'bg-red-500/10 border-red-500/30 text-white'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules[mod]}
                    onChange={() => handleToggleModule(mod)}
                    className="rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                  />
                  <span className="text-xs">{mod}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isCreating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Dialog
function DeleteDemoDialog({ demo, open, onOpenChange, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!demo) return;
    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('Not authenticated.');
        setIsDeleting(false);
        return;
      }

      const authSupabase = getAuthSupabase(accessToken);
      const { error } = await authSupabase
        .from('demo_links')
        .delete()
        .eq('id', demo.id);

      if (error) throw new Error(error.message);

      toast.success('Demo link deleted.');
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error('[AdminDemos] Error deleting demo:', error);
      toast.error(error.message || 'Failed to delete demo link.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="w-5 h-5" />
            Delete Demo Link
          </DialogTitle>
        </DialogHeader>
        <p className="text-zinc-400 text-sm">
          Are you sure you want to delete the demo link for{' '}
          <span className="text-white font-medium">
            {demo?.recipient_name}
          </span>{' '}
          at{' '}
          <span className="text-white font-medium">
            {demo?.company_name}
          </span>
          ? This will also delete all associated script steps and cannot be undone.
        </p>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function AdminDemos() {
  const { adminRole } = useAdmin();

  const [demos, setDemos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch demos
  const fetchDemos = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      const authSupabase = getAuthSupabase(accessToken);
      let query = authSupabase
        .from('demo_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(
          `recipient_name.ilike.%${search}%,recipient_email.ilike.%${search}%,company_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AdminDemos] Error fetching demos:', error);
        toast.error('Failed to load demo links.');
      } else {
        setDemos(data || []);
      }
    } catch (error) {
      console.error('[AdminDemos] Error:', error);
      toast.error('Failed to load demo links.');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  // Stats
  const totalDemos = demos.length;
  const viewedStatuses = ['viewed', 'in_progress', 'completed'];
  const viewedCount = demos.filter((d) => viewedStatuses.includes(d.status)).length;
  const completedCount = demos.filter((d) => d.status === 'completed').length;
  const conversionPct =
    totalDemos > 0 ? ((completedCount / totalDemos) * 100).toFixed(1) : '0.0';

  // Copy link to clipboard
  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/demo?token=${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Demo link copied to clipboard!'),
      () => toast.error('Failed to copy link.')
    );
  };

  // Open delete dialog
  const handleDeleteClick = (demo) => {
    setDeleteTarget(demo);
    setIsDeleteOpen(true);
  };

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Presentation className="w-5 h-5 text-red-400" />
            Demo Links
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">
            Create and manage personalized demo links for prospects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDemos}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-7 text-xs"
          >
            <RefreshCw
              className={cn('w-3 h-3 mr-1.5', isLoading && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Create Demo Link
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Demos"
          value={totalDemos}
          icon={Presentation}
          colorClass="bg-blue-500/20 text-blue-400 border-blue-500/30"
          isLoading={isLoading}
        />
        <StatCard
          title="Viewed"
          value={viewedCount}
          icon={Eye}
          colorClass="bg-amber-500/20 text-amber-400 border-amber-500/30"
          isLoading={isLoading}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={CheckCircle}
          colorClass="bg-green-500/20 text-green-400 border-green-500/30"
          isLoading={isLoading}
        />
        <StatCard
          title="Conversion %"
          value={`${conversionPct}%`}
          icon={Users}
          colorClass="bg-red-500/20 text-red-400 border-red-500/30"
          isLoading={isLoading}
        />
      </div>

      {/* Search */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-zinc-500" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-7 text-xs bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Demo Links Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="border-b border-zinc-800 py-2 px-3">
          <CardTitle className="text-white flex items-center gap-1.5 text-sm">
            <Link2 className="w-4 h-4 text-red-400" />
            Demo Links ({demos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">
              <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin mx-auto mb-2" />
              <p className="text-zinc-500 text-xs">Loading demo links...</p>
            </div>
          ) : demos.length === 0 ? (
            <div className="p-6 text-center">
              <Presentation className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-xs">No demo links found</p>
              <p className="text-zinc-500 text-[10px] mt-0.5">
                {search
                  ? 'Try adjusting your search'
                  : 'Create your first demo link to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      Recipient
                    </th>
                    <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      Company
                    </th>
                    <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      Lang
                    </th>
                    <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      Status
                    </th>
                    <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      Created
                    </th>
                    <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      First Viewed
                    </th>
                    <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      Duration
                    </th>
                    <th className="text-right text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <AnimatePresence>
                    {demos.map((demo, index) => (
                      <motion.tr
                        key={demo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-zinc-800/50 transition-colors h-9"
                      >
                        {/* Recipient */}
                        <td className="px-2 py-1.5">
                          <div>
                            <p className="text-white font-medium text-xs">
                              {demo.recipient_name}
                            </p>
                            <p className="text-zinc-500 text-[10px]">
                              {demo.recipient_email}
                            </p>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="px-2 py-1.5">
                          <span className="text-zinc-300 text-xs">
                            {demo.company_name}
                          </span>
                          {demo.company_context?.industry && (
                            <p className="text-zinc-500 text-[10px]">
                              {demo.company_context.industry}
                            </p>
                          )}
                        </td>

                        {/* Language */}
                        <td className="px-2 py-1.5">
                          <Badge className="text-[10px] px-1.5 py-px bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                            {(demo.language || 'en').toUpperCase()}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="px-2 py-1.5">
                          <Badge
                            className={cn(
                              'text-[10px] px-1.5 py-px',
                              STATUS_STYLES[demo.status] || STATUS_STYLES.created
                            )}
                          >
                            {formatStatusLabel(demo.status)}
                          </Badge>
                        </td>

                        {/* Created */}
                        <td className="px-2 py-1.5">
                          <span className="text-zinc-400 text-xs">
                            {formatDate(demo.created_at)}
                          </span>
                        </td>

                        {/* First Viewed */}
                        <td className="px-2 py-1.5">
                          <span className="text-zinc-400 text-xs">
                            {formatDate(demo.first_viewed_at)}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="px-2 py-1.5">
                          <span className="text-zinc-400 text-xs">
                            {formatDuration(demo.duration_seconds)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(demo.token)}
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                              title="Copy link"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `${window.location.origin}/demo?token=${demo.token}`,
                                  '_blank'
                                )
                              }
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                              title="Open demo"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(demo)}
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Demo Dialog */}
      <CreateDemoDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={fetchDemos}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDemoDialog
        demo={deleteTarget}
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={fetchDemos}
      />
    </div>
  );
}
