/**
 * Agents API Endpoint
 * List available agents and their capabilities
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent definitions with full details
const AGENTS = [
  {
    id: 'sync',
    name: 'SYNC',
    shortName: 'Sync',
    description: 'Central AI orchestrator that coordinates all agents and handles general requests.',
    icon: 'brain',
    color: 'purple',
    status: 'active',
    category: 'Core',
    capabilities: [
      'Natural language understanding',
      'Request routing to specialized agents',
      'Multi-agent workflow coordination',
      'Context-aware responses',
      'Session management',
    ],
    model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
    endpoint: '/functions/v1/sync',
  },
  {
    id: 'learn',
    name: 'Learn Agent',
    shortName: 'Learn',
    description: 'AI learning companion for personalized course recommendations, skill tracking, and intelligent tutoring.',
    icon: 'graduation-cap',
    color: 'cyan',
    status: 'active',
    category: 'Productivity',
    capabilities: [
      'Personalized course recommendations',
      'Skill gap analysis',
      'Learning path optimization',
      'AI tutoring assistance',
      'Progress tracking & analytics',
      'Certificate management',
    ],
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    shortName: 'Growth',
    description: 'Accelerate sales pipeline with AI-powered prospect research, campaign automation, and lead scoring.',
    icon: 'trending-up',
    color: 'indigo',
    status: 'active',
    category: 'Sales',
    capabilities: [
      'Lead scoring & qualification',
      'Prospect enrichment',
      'Campaign automation',
      'Email sequence generation',
      'Market research',
      'Competitive intelligence',
    ],
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  },
  {
    id: 'sentinel',
    name: 'Sentinel Agent',
    shortName: 'Sentinel',
    description: 'AI compliance guardian for EU AI Act monitoring, risk assessment, and governance documentation.',
    icon: 'shield',
    color: 'sage',
    status: 'active',
    category: 'Compliance',
    capabilities: [
      'EU AI Act compliance monitoring',
      'Risk assessment automation',
      'AI system classification',
      'Governance documentation',
      'Regulatory tracking',
      'Audit preparation',
    ],
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  },
  {
    id: 'finance',
    name: 'Finance Agent',
    shortName: 'Finance',
    description: 'Streamline financial operations with invoice processing, expense tracking, and Dutch BTW calculation.',
    icon: 'euro',
    color: 'amber',
    status: 'active',
    category: 'Finance',
    capabilities: [
      'Invoice creation with BTW (21%)',
      'EU B2B reverse charge handling',
      'Payment tracking',
      'Expense categorization',
      'Budget forecasting',
      'Financial reporting',
    ],
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    tools: [
      { name: 'create_invoice', description: 'Create invoice with Dutch BTW calculation' },
      { name: 'send_invoice', description: 'Send invoice to client' },
      { name: 'track_payment', description: 'Track payment status' },
      { name: 'list_invoices', description: 'List and filter invoices' },
    ],
  },
  {
    id: 'raise',
    name: 'Raise Agent',
    shortName: 'Raise',
    description: 'Navigate fundraising with AI assistance for investor research, pitch preparation, and deal management.',
    icon: 'rocket',
    color: 'orange',
    status: 'coming_soon',
    category: 'Fundraising',
    capabilities: [
      'Investor matching',
      'Pitch deck analysis',
      'Due diligence preparation',
      'Deal flow tracking',
      'Valuation insights',
      'Term sheet analysis',
    ],
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  },
  {
    id: 'create',
    name: 'Create Agent',
    shortName: 'Create',
    description: 'AI-powered image generation for marketing creatives, product visuals, and brand content.',
    icon: 'sparkles',
    color: 'rose',
    status: 'active',
    category: 'Creative',
    capabilities: [
      'Product image generation',
      'Marketing creative design',
      'Brand-consistent visuals',
      'Scene generation',
      'Image variations',
      'Style transfer',
    ],
    model: 'black-forest-labs/FLUX.1-dev',
    endpoint: '/functions/v1/generate-image',
  },
];

interface AgentsRequest {
  filter?: {
    status?: 'active' | 'coming_soon' | 'inactive';
    category?: string;
  };
  includeTools?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let filter: AgentsRequest['filter'] = undefined;
    let includeTools = false;

    // Parse query parameters for GET requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const category = url.searchParams.get('category');
      includeTools = url.searchParams.get('includeTools') === 'true';

      if (status || category) {
        filter = {};
        if (status) filter.status = status as 'active' | 'coming_soon' | 'inactive';
        if (category) filter.category = category;
      }
    }

    // Parse body for POST requests
    if (req.method === 'POST') {
      try {
        const body: AgentsRequest = await req.json();
        filter = body.filter;
        includeTools = body.includeTools ?? false;
      } catch {
        // Empty body is fine
      }
    }

    // Filter agents
    let agents = [...AGENTS];

    if (filter?.status) {
      agents = agents.filter(a => a.status === filter!.status);
    }

    if (filter?.category) {
      agents = agents.filter(a => a.category.toLowerCase() === filter!.category!.toLowerCase());
    }

    // Remove tools if not requested
    if (!includeTools) {
      agents = agents.map(({ tools, ...agent }) => agent);
    }

    // Build summary
    const summary = {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      comingSoon: agents.filter(a => a.status === 'coming_soon').length,
      categories: [...new Set(agents.map(a => a.category))],
    };

    return new Response(
      JSON.stringify({
        agents,
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Agents API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
