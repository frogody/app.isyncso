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
} from 'lucide-react';

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
    1: `Welcome to iSyncso, ${recipientName}. This is your command center — the first thing you'll see every morning. Up top you've got real-time KPIs pulling from every module: revenue, active deals, tasks due today, team performance. Everything updates live, so you're never looking at stale data. Below that you'll see your growth pipeline funnel, a finance snapshot with monthly trends, your team's learning progress, and even your compliance score from Sentinel. There's also a live activity feed showing exactly what's happening across ${companyName} right now — deals closing, tasks completing, invoices going out. And those quick action buttons? One click to create an invoice, add a prospect, or kick off a campaign. Think of this as mission control for your entire operation.`,

    2: `Now let's talk revenue, ${recipientName}. The Growth module is where your sales team lives and breathes. You're looking at a full pipeline view with deals organized in a kanban board — drag and drop between stages, and everything updates instantly. But here's where it gets powerful: we track conversion rates at every stage of your funnel, so you can see exactly where deals are stalling. The revenue trend chart shows you month-over-month trajectory, making it easy to forecast. You can run outbound campaigns right from here — set up sequences, track response rates, and see which channels actually convert for ${companyName}. We also surface growth signals automatically: hot leads that just visited your pricing page, renewals coming up, expansion opportunities. Your team stops guessing and starts selling with real intelligence behind every move.`,

    3: `This is your CRM, and it's nothing like a traditional contact database, ${recipientName}. Every contact in here is automatically enriched with AI intelligence. We pull in company data, social profiles, tech stack, funding history — even employee sentiment from review sites. See those lead scores? They're calculated using dozens of signals, not just form fills. For ${companyName}, that means your team immediately knows who's worth a call and who needs more nurturing. You can filter by pipeline stage, enrichment status, company size — whatever matters to your workflow. And over on the right, the Quick Intel panel gives you a deep profile of any contact: their history with you, key insights the AI surfaced, recent interactions, and smart tags. The goal is simple: your team should never walk into a conversation unprepared.`,

    4: `The Talent module is built for modern recruiting, ${recipientName}. It's not just a candidate tracker — it's an intelligence platform. We use AI to calculate match scores for every candidate against your open roles, factoring in skills, experience, title fit, location, culture alignment, and timing. That timing piece is huge: we detect flight risk signals like stagnation at their current company, recent layoffs, leadership changes. See those intelligence indicators? They tell your recruiters exactly when someone is most likely to be open to a conversation. For each candidate, we generate personalized outreach angles based on what we know about them. The pipeline stages track everything from first contact through to hire, with response rate analytics so you know which approaches work best for ${companyName}'s brand.`,

    5: `Finance is fully integrated, ${recipientName} — no separate accounting tool needed. You're looking at revenue versus expenses over the last six months, a full profit and loss breakdown, and all your recent invoices in one view. You can create invoices and proposals right here, convert proposals to invoices when deals close, and track every expense against your budget. The accounts payable aging chart shows you exactly what's outstanding and for how long, so nothing falls through the cracks. Upcoming bills are flagged with urgency so ${companyName} never misses a payment. The real power is how this connects to everything else: close a deal in Growth, and the invoice is ready to send. Log an expense, and it shows up in your P&L instantly. One source of truth for all your financial data.`,

    6: `Learning and development is a competitive advantage, and that's exactly what this module delivers for ${companyName}. You can see overall team progress at a glance — completion rates, active courses, certifications earned. The progress ring shows how your team is tracking against learning goals. Each course card shows difficulty level, current chapter, and how far along the learner is. Down below, the skill progress bars break down competencies across your organization: leadership, data analysis, communication, technical skills. We even have a contribution-style activity heatmap so managers can see learning patterns over time. The leaderboard drives healthy competition with XP points and streak tracking. And those certifications? They're verified and trackable, so when a compliance audit comes around, ${companyName} has the records ready to go.`,

    7: `This is the Create studio — your team's AI-powered content engine, ${recipientName}. Instead of hiring designers for every asset, you generate marketing images, product visuals, social templates, and video content right inside iSyncso. The bento grid at the top gives you quick access to each generation tool: image creation with natural language prompts, video generation, your brand kit with colors and fonts, and a content calendar to plan it all out. Below that is your asset gallery — everything you've generated, organized by type, with view counts and resolution info. Your brand kit ensures consistency: upload your logo, define your color palette, set your fonts, and every generated asset automatically stays on brand. The recent prompts section lets you quickly re-run or tweak previous generations. For ${companyName}, this means going from idea to polished asset in minutes instead of days.`,

    8: `Your product catalog is the backbone of what ${companyName} sells, and this module makes managing it effortless. Every product has a detail card with pricing model, category, star ratings, and real-time stock levels. We support one-time pricing, subscriptions, and per-seat models — all in the same catalog. You can filter by category, search instantly, and see your total product count and revenue contribution at the top. The quick actions bar lets you bulk import products, export your catalog, manage pricing across the board, or run inventory reports. And those inventory alerts at the bottom? They flag items that are running low before you're caught off guard. Critical stock levels get red alerts, warnings get amber. No more spreadsheets, no more guessing — ${companyName}'s entire product operation in one clean interface.`,

    9: `If ${companyName} is raising capital, this is where it all comes together, ${recipientName}. The hero section shows your fundraise progress: how much you've committed versus your target, with milestone markers along the way. The investor kanban tracks every investor relationship from sourced through to committed — you can see who's in due diligence, who's sent a term sheet, and where each conversation stands. Each card shows the check size, last meeting, and conversation notes. Your data room is built in: upload pitch decks, financials, and legal documents, and track exactly how many times each investor has viewed them. Upcoming meetings are organized with prep status so you never walk in cold. And the round summary card gives you a snapshot of your terms — pre-money valuation, dilution, board seats, pro-rata rights — everything an investor or board member would want to see at a glance.`,

    10: `Sentinel is our EU AI Act compliance module, and it's becoming essential for any company using AI, ${recipientName}. It starts with a compliance score — ${companyName}'s overall posture at a glance. The workflow stepper guides you through the process: register your AI systems, classify their risk level, complete assessments, and generate the required documentation. The risk classification chart breaks down all your AI systems by category: prohibited, unacceptable, high risk, limited, and minimal. Each system in the inventory has its own compliance status, last assessment date, and quick actions. The upcoming obligations section tracks regulatory deadlines so nothing sneaks up on you. And the document status bars show how far along you are with technical documentation, conformity declarations, and risk assessments. If you're using AI in any capacity — and most companies are — Sentinel keeps ${companyName} ahead of regulators instead of scrambling to catch up.`,

    11: `Your unified inbox, ${recipientName}. Instead of bouncing between Slack, email, and internal tools, everything flows into one stream. On the left you've got channels organized by type: team channels, direct messages, and SYNC AI conversations. The middle panel shows your message feed with previews, timestamps, and unread indicators. Click into any conversation and you get the full thread on the right, with reactions, replies, and file attachments. You can see typing indicators in real time, and search across every conversation you've ever had. For ${companyName}, this eliminates the constant context-switching that kills productivity. Client messages, team updates, AI alerts — all searchable, all in one place. Your team spends less time hunting for information and more time acting on it.`,

    12: `Task management with a twist, ${recipientName}. The kanban board gives your team a clear view of what's in flight: to-do, in progress, review, and done. But what makes this different is the AI prioritization. See those brain icons? SYNC analyzes deadlines, dependencies, and business impact to flag which tasks actually matter most. Each card shows labels, subtask progress, priority level, assignee, and due date — overdue items get flagged in red so nothing slips. You can toggle between board and list views depending on your preference. The stats at the top give ${companyName}'s leadership instant visibility: total tasks, what's in progress, what's due today, and weekly completion velocity. It's project management that actually helps your team focus instead of just tracking work.`,

    13: `iSyncso connects to over thirty tools ${companyName}'s team already relies on, ${recipientName}. Slack, Gmail, HubSpot, Notion, Google Drive, Stripe, Salesforce, LinkedIn, Zoom, GitHub, Jira, QuickBooks — they're all here. Each integration card shows its connection status, how many records have synced, and when the last sync happened. The stats at the top tell you the full picture: over twenty-one thousand records synced, twelve hundred automated actions, and thirty-four hours saved this month. Setting up is straightforward: click connect, authorize, and data starts flowing. The real value is that every module in iSyncso gets smarter when your tools are connected. Close a deal in HubSpot? Growth pipeline updates. Get a Slack message about a project? It shows up in your inbox. It's not just about syncing data — it's about making all your tools work as one system.`,

    14: `And the best part, ${recipientName}? Everything you've just seen — I can do it for you. I'm SYNC, and I work across all thirteen modules. Tell me to create an invoice, and I'll draft it with the right line items. Ask me to find prospects in a specific industry, and I'll search your CRM and pipeline. Need to schedule a task, generate a report, or even create a marketing image? Just tell me in plain English — voice or text, your choice. I remember context from our conversations, so you don't have to repeat yourself. I can run multi-step workflows: like qualifying a lead, creating a task for follow-up, and drafting the outreach email — all from a single request. For ${companyName}, that means less time clicking through menus and more time on the work that actually moves the needle.`,

    15: `That's a full tour of what iSyncso can do for ${companyName}, ${recipientName}. You've seen the command center dashboard, the AI-powered growth pipeline and CRM, intelligent talent acquisition, integrated finance, learning and development, content creation, product management, fundraising tools, AI compliance with Sentinel, unified messaging, smart task management, and thirty-plus integrations — all tied together by SYNC. Want to schedule a call to explore how this would work specifically for ${companyName}'s workflow? I'd love to dive deeper into the modules that matter most to you.`,
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
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedModules, setSelectedModules] = useState(
    MODULE_OPTIONS.reduce((acc, m) => ({ ...acc, [m]: true }), {})
  );
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setRecipientName('');
    setRecipientEmail('');
    setCompanyName('');
    setIndustry('');
    setNotes('');
    setSelectedModules(
      MODULE_OPTIONS.reduce((acc, m) => ({ ...acc, [m]: true }), {})
    );
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
          },
          modules_to_demo: modules,
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
              onChange={(e) => setRecipientEmail(e.target.value)}
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

          {/* Modules to Demo */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs">Modules to Demo</Label>
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
