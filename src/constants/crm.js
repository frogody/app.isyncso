/**
 * CRM Constants
 * Shared configuration for pipeline stages, contact types, and colors
 * Used across CRMContacts, CRMContactProfile, GrowthPipeline, etc.
 */

// Pipeline stages for deals/contacts
export const PIPELINE_STAGES = [
  { id: 'new', label: 'New Lead', color: 'blue', probability: 10 },
  { id: 'contacted', label: 'Contacted', color: 'cyan', probability: 20 },
  { id: 'qualified', label: 'Qualified', color: 'indigo', probability: 40 },
  { id: 'proposal', label: 'Proposal', color: 'purple', probability: 60 },
  { id: 'negotiation', label: 'Negotiation', color: 'yellow', probability: 80 },
  { id: 'won', label: 'Won', color: 'green', probability: 100 },
  { id: 'lost', label: 'Lost', color: 'red', probability: 0 },
];

// Extended stage config with styling (for GrowthPipeline)
export const STAGES_WITH_STYLE = [
  { id: 'new', label: 'New Lead', color: 'from-blue-500 to-blue-600', accent: 'text-blue-400', bgAccent: 'bg-blue-500', borderAccent: 'border-blue-500/50', probability: 10 },
  { id: 'contacted', label: 'Contacted', color: 'from-cyan-500 to-cyan-600', accent: 'text-cyan-400', bgAccent: 'bg-cyan-500', borderAccent: 'border-cyan-500/50', probability: 20 },
  { id: 'qualified', label: 'Qualified', color: 'from-indigo-500/60 to-indigo-600/60', accent: 'text-indigo-400/70', bgAccent: 'bg-indigo-500/60', borderAccent: 'border-indigo-500/40', probability: 40 },
  { id: 'proposal', label: 'Proposal', color: 'from-purple-500/70 to-purple-600/70', accent: 'text-purple-400/80', bgAccent: 'bg-purple-500/70', borderAccent: 'border-purple-500/50', probability: 60 },
  { id: 'negotiation', label: 'Negotiation', color: 'from-yellow-500/80 to-yellow-600/80', accent: 'text-yellow-400/90', bgAccent: 'bg-yellow-500/80', borderAccent: 'border-yellow-500/60', probability: 80 },
  { id: 'won', label: 'Won', color: 'from-green-500 to-green-600', accent: 'text-green-400', bgAccent: 'bg-green-500', borderAccent: 'border-green-500/70', probability: 100 },
];

// Contact types for CRM
export const CONTACT_TYPES = [
  { id: 'contact', label: 'Contact', icon: 'Contact', description: 'General contacts — sort into a category later' },
  { id: 'company', label: 'Company', icon: 'Building2', description: 'Companies and organizations — not tied to a specific person' },
  { id: 'lead', label: 'Lead', icon: 'UserPlus', description: 'Unqualified contacts for initial outreach' },
  { id: 'prospect', label: 'Prospect', icon: 'Target', description: 'Qualified leads in sales pipeline' },
  { id: 'customer', label: 'Customer', icon: 'UserCheck', description: 'Paying customers with active relationships' },
  { id: 'supplier', label: 'Supplier', icon: 'Package', description: 'Vendors and product suppliers' },
  { id: 'partner', label: 'Partner', icon: 'Handshake', description: 'Business partners and affiliates' },
  { id: 'candidate', label: 'Candidate', icon: 'Briefcase', description: 'Job applicants and HR contacts' },
  { id: 'target', label: 'Target', icon: 'Crosshair', description: 'Target accounts for outbound' },
];

// Stage colors for badges and indicators
export const STAGE_COLORS = {
  'New Lead': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'new': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Contacted': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'contacted': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Qualified': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'qualified': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'Proposal': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'proposal': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Negotiation': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'negotiation': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Won': 'bg-green-500/20 text-green-400 border-green-500/30',
  'won': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Lost': 'bg-red-500/20 text-red-400 border-red-500/30',
  'lost': 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Contact type colors
export const CONTACT_TYPE_COLORS = {
  contact: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  company: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  lead: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  prospect: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  customer: 'bg-green-500/20 text-green-400 border-green-500/30',
  supplier: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  partner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  candidate: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  target: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

// Activity types for tracking interactions
export const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call', icon: 'Phone' },
  { id: 'email', label: 'Email', icon: 'Mail' },
  { id: 'meeting', label: 'Meeting', icon: 'Calendar' },
  { id: 'note', label: 'Note', icon: 'FileText' },
  { id: 'task', label: 'Task', icon: 'CheckSquare' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin' },
  { id: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

// Helper functions
export function getStageById(stageId) {
  return PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];
}

export function getContactTypeById(typeId) {
  return CONTACT_TYPES.find(t => t.id === typeId) || CONTACT_TYPES[0];
}

export function getStageColor(stage) {
  return STAGE_COLORS[stage] || STAGE_COLORS['new'];
}

export function getContactTypeColor(type) {
  return CONTACT_TYPE_COLORS[type] || CONTACT_TYPE_COLORS['lead'];
}

// Check if enrichment data might be stale (older than 30 days)
export function isEnrichmentStale(enrichedAt) {
  if (!enrichedAt) return true;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(enrichedAt) < thirtyDaysAgo;
}

// Check if contact is missing critical enrichment data
export function isMissingEnrichmentData(contact) {
  // If there's no tech stack and no funding data, enrichment might be incomplete
  const hasTechStack = contact.company_tech_stack && contact.company_tech_stack.length > 0;
  const hasFundingData = contact.company_funding_rounds && contact.company_funding_rounds.length > 0;
  const hasCompanyData = contact.company_industry || contact.company_size || contact.company_description;

  // If contact was enriched but missing tech/funding, might need re-enrichment
  if (contact.enriched_at && !hasTechStack && !hasFundingData && hasCompanyData) {
    return true;
  }
  return false;
}
