/**
 * Specialized Agents
 * Export all agent implementations
 */

// Invoice Agent (Finance)
export {
  InvoiceAgent,
  registerInvoiceAgent,
  INVOICE_AGENT_CONFIG,
  INVOICE_TOOLS,
  BTW_RATE,
  BTW_REDUCED_RATE,
  type Invoice,
  type InvoiceItem,
  type InvoiceClient,
  type InvoiceStatus,
  type InvoiceFilters,
  type PaymentInfo,
  type PaymentEvent,
} from './invoice';

// Email Agent (Growth)
export {
  EmailAgent,
  registerEmailAgent,
  EMAIL_AGENT_CONFIG,
  EMAIL_TOOLS,
  type Email,
  type EmailRecipient,
  type EmailTemplate,
  type EmailCategory,
  type EmailStatus,
  type EmailSequence,
  type EmailSequenceStep,
} from './email';

// Research Agent (Growth)
export {
  ResearchAgent,
  registerResearchAgent,
  RESEARCH_AGENT_CONFIG,
  RESEARCH_TOOLS,
  type Company,
  type CompanySize,
  type Contact,
  type Prospect,
  type ProspectStatus,
  type Signal,
  type SignalType,
  type ICP,
  type SocialProfiles,
} from './research';

// Compliance Agent (Sentinel)
export {
  ComplianceAgent,
  registerComplianceAgent,
  COMPLIANCE_AGENT_CONFIG,
  COMPLIANCE_TOOLS,
  type AISystem,
  type AISystemType,
  type RiskLevel,
  type ComplianceStatus,
  type RiskAssessment,
  type Obligation,
  type ObligationCategory,
  type ComplianceReport,
} from './compliance';

// Proposal Agent (Finance)
export {
  ProposalAgent,
  registerProposalAgent,
  PROPOSAL_AGENT_CONFIG,
  PROPOSAL_TOOLS,
  type Proposal,
  type ProposalItem,
  type ProposalClient,
  type ProposalStatus,
  type ProposalTemplate,
} from './proposal';

// Image Agent (Create)
export {
  ImageAgent,
  registerImageAgent,
  IMAGE_AGENT_CONFIG,
  IMAGE_TOOLS,
  type GeneratedImage,
  type ImageGenerationRequest,
  type ImageStyle,
  type AspectRatio,
  type ImageModel,
  type ImageUseCase,
  type BrandContext,
  type ImageTemplate,
} from './image';

// ============================================================================
// Registration Helper
// ============================================================================

/**
 * Register all available agents with the registry
 */
export function registerAllAgents(): void {
  registerInvoiceAgent();
  registerEmailAgent();
  registerResearchAgent();
  registerComplianceAgent();
  registerProposalAgent();
  registerImageAgent();
}
