# SENTINEL — Competitive Compliance Platform Build Plan

## Part 1: Search AI Agent Prompt

Below is a reusable prompt for a research AI agent to continuously scan the compliance platform landscape and feed insights back into the Sentinel product roadmap.

---

### PROMPT: Compliance Platform Intelligence Agent

```
You are a competitive intelligence research agent for SENTINEL, an EU AI Act compliance
module that is being expanded into a full compliance automation platform competing with
Vanta ($10B+), Drata, Secureframe, Sprinto, and OneTrust.

Your job is to research and report on:

1. FEATURE PARITY ANALYSIS
   - What features do Vanta, Drata, Secureframe, and Sprinto ship?
   - Categorize by: Evidence Collection, Continuous Monitoring, Framework Coverage,
     Trust Center, Vendor Risk Management, Access Reviews, Employee Training,
     Policy Management, Audit Readiness, AI Agents, Questionnaire Automation
   - For each feature, note: which platforms have it, how mature it is, and whether
     it is a table-stakes requirement or a differentiator

2. INTEGRATION ECOSYSTEM
   - What integrations do compliance platforms connect to?
   - Categorize by: Cloud (AWS/GCP/Azure), Identity (Okta/Azure AD/Google Workspace),
     HRIS (BambooHR/Rippling/Gusto), Code (GitHub/GitLab/Bitbucket),
     MDM (Jamf/Kandji), SIEM (Datadog/Splunk), Ticketing (Jira/Linear),
     Communication (Slack/Teams)
   - Which integrations are "must-have" vs "nice-to-have"?
   - How do integrations collect evidence? (API polling, webhooks, agents)

3. FRAMEWORK COVERAGE
   - Which compliance frameworks does each platform support?
   - Priority frameworks: SOC 2 Type I & II, ISO 27001, HIPAA, GDPR, PCI DSS,
     EU AI Act, NIS2, DORA, SOX, CCPA, FedRAMP, NIST CSF, NIST 800-53
   - How do platforms handle cross-framework control mapping?
   - What is the typical time-to-compliance for each framework?

4. PRICING & PACKAGING
   - What do competitors charge? (by employee count, by framework, by tier)
   - What add-ons exist? (VRM, questionnaire automation, extra frameworks)
   - Where are the pricing pain points users complain about?
   - What pricing model would undercut incumbents while being sustainable?

5. USER PAIN POINTS & SWITCHING TRIGGERS
   - Search G2, Capterra, Reddit, and HN for complaints about Vanta/Drata/Secureframe
   - Common themes: pricing too high, integrations break, onboarding too slow,
     evidence collection gaps, poor multi-framework support, lock-in
   - What would make someone switch from Vanta to a new platform?

6. AI & AUTOMATION TRENDS (2025-2026)
   - How are platforms using AI? (auto-remediation, questionnaire AI, policy generation,
     risk scoring, anomaly detection, natural language compliance queries)
   - What is Vanta AI doing? (agent-based features, auto-mapping, SLA tracking)
   - Where is AI under-utilized in compliance? (opportunity gaps)

7. EU-SPECIFIC COMPLIANCE (SENTINEL'S DIFFERENTIATOR)
   - EU AI Act: What tools exist? How mature? What's missing?
   - GDPR: DPIAs, data mapping, breach notification workflows
   - NIS2: Network/information security for essential/important entities
   - DORA: Digital operational resilience for financial sector
   - What gap exists between US-focused platforms and EU regulatory needs?

8. TRUST CENTER & PUBLIC COMPLIANCE
   - How do Trust Centers work? (public pages, gated access, badge display)
   - What do buyers look for when evaluating vendor compliance?
   - How does trust center reduce sales friction?

OUTPUT FORMAT:
For each category, provide:
- Current market state (what exists)
- Gap analysis (what SENTINEL is missing)
- Priority (P0 = must-have, P1 = competitive, P2 = differentiator)
- Effort estimate (S/M/L/XL)
- Recommended approach for SENTINEL
```

---

## Part 2: Current State Analysis

### What SENTINEL Has Today

| Feature | Status | Quality |
|---------|--------|---------|
| AI System Inventory | Working | Good — CRUD, filters, search, pagination |
| Risk Classification Wizard | Working | Good — 5-step EU AI Act assessment |
| Compliance Dashboard | Working | Basic — score gauge, stat cards, breakdowns |
| Compliance Roadmap | Partial | Timeline is hardcoded, obligations table missing |
| Document Generator | Partial | Template UI exists, actual generation incomplete |
| CIDE AI Research | Partial | Edge function referenced but may not be deployed |
| Sentinel Chat Agent | Working | NLP interface for compliance questions |
| Multi-Framework Support | None | EU AI Act only |
| Evidence Collection | None | No automated evidence gathering |
| Continuous Monitoring | None | No real-time compliance checks |
| Trust Center | None | No public compliance page |
| Vendor Risk Management | None | No third-party risk tracking |
| Access Reviews | None | No periodic access review workflows |
| Policy Management | None | No policy templates or lifecycle |
| Employee Training | None | No security awareness training |
| Integrations | None | No cloud/identity/HRIS connectors |
| Questionnaire Automation | None | No security questionnaire handling |

### What Competitors Have (Market Table Stakes)

Based on research of Vanta ($10B+, $10K-$80K+/yr), Drata, Secureframe, and Sprinto:

| Feature | Vanta | Drata | Secureframe | Sprinto | Table Stakes? |
|---------|-------|-------|-------------|---------|---------------|
| Automated Evidence Collection | Yes | Yes | Yes | Yes | P0 |
| Continuous Monitoring | Yes | Yes | Yes | Yes | P0 |
| SOC 2 Framework | Yes | Yes | Yes | Yes | P0 |
| ISO 27001 Framework | Yes | Yes | Yes | Yes | P0 |
| HIPAA Framework | Yes | Yes | Yes | Yes | P1 |
| GDPR Framework | Yes | Yes | Yes | Yes | P0 (for EU) |
| PCI DSS | Yes | Yes | Yes | Yes | P1 |
| EU AI Act | Yes | No | No | No | P2 (differentiator) |
| NIS2 | Partial | No | No | No | P2 (EU differentiator) |
| DORA | No | No | No | No | P2 (EU differentiator) |
| Trust Center | Yes | Yes | Yes | Yes | P0 |
| Vendor Risk Mgmt | Add-on | Yes | Yes | Yes | P1 |
| Access Reviews | Yes | Yes | Yes | Yes | P1 |
| Policy Management | Yes | Yes | Yes | Yes | P0 |
| Employee Training | Yes | Yes | Partial | Yes | P1 |
| 100+ Integrations | Yes | Yes | Yes | Partial | P0 |
| AI Questionnaire Auto | Yes | Yes | Yes | Yes | P1 |
| Cross-Framework Mapping | Yes | Yes | Yes | Yes | P0 |
| Audit Workflow | Yes | Yes | Yes | Yes | P0 |
| Risk Scoring | Yes | Yes | Yes | Yes | P1 |

---

## Part 3: Competitive Build Plan

### Strategic Positioning

**SENTINEL's edge: EU-first, AI-native, integrated into iSyncSO's business platform.**

Vanta is US-centric and expensive ($10K-$80K/yr). Drata/Secureframe are Vanta clones. None handle EU AI Act deeply. SENTINEL can win by:

1. **EU-first framework coverage** — EU AI Act, GDPR, NIS2, DORA as first-class citizens
2. **AI-native** — not bolted-on AI features, but AI as the core engine
3. **Integrated platform** — compliance that connects to CRM, HR, Finance (already in iSyncSO)
4. **Aggressive pricing** — undercut Vanta by 60-70% ($3K-$15K/yr)
5. **SMB-friendly** — fast onboarding, self-serve, no enterprise sales motion needed initially

---

### Phase 0: Foundation (Weeks 1-3) — Fix What's Broken

**Goal:** Make existing features production-ready.

| Task | Files | Effort |
|------|-------|--------|
| Create `obligations` table with EU AI Act obligations data | Migration | M |
| Create `compliance_requirements` table | Migration | M |
| Create `compliance_evidence` table (evidence storage) | Migration | M |
| Create `compliance_controls` table (control definitions) | Migration | M |
| Create `compliance_frameworks` table (framework registry) | Migration | S |
| Create `compliance_control_mappings` table (cross-framework) | Migration | M |
| Deploy `analyzeAISystem` edge function (or verify it works) | Edge function | M |
| Fix ComplianceRoadmap to use real obligations from DB | ComplianceRoadmap.tsx | M |
| Fix DocumentGenerator to actually produce downloadable docs | DocumentGenerator.tsx | L |
| Add PDF export for compliance documents | New utility | M |

**Database Schema:**

```sql
-- Frameworks registry
compliance_frameworks (
  id UUID PK,
  company_id UUID FK,
  slug TEXT UNIQUE,           -- 'soc2', 'iso27001', 'eu-ai-act', 'gdpr', 'nis2'
  name TEXT,                  -- 'SOC 2 Type II'
  description TEXT,
  version TEXT,               -- '2024', 'v2'
  category TEXT,              -- 'security', 'privacy', 'ai-governance', 'resilience'
  region TEXT,                -- 'global', 'eu', 'us'
  enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'not-started', -- 'not-started','in-progress','audit-ready','certified'
  target_date TIMESTAMPTZ,
  certified_at TIMESTAMPTZ,
  certificate_url TEXT,
  created_at, updated_at
)

-- Controls (the individual requirements)
compliance_controls (
  id UUID PK,
  framework_id UUID FK,
  control_id TEXT,            -- 'CC6.1', 'A.8.1', 'Article 5(1)'
  title TEXT,
  description TEXT,
  category TEXT,              -- 'access-control', 'risk-management', 'data-protection'
  severity TEXT,              -- 'critical', 'high', 'medium', 'low'
  implementation_guidance TEXT,
  automated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'not-implemented',
  owner_id UUID FK,
  created_at, updated_at
)

-- Cross-framework control mapping
compliance_control_mappings (
  id UUID PK,
  source_control_id UUID FK,
  target_control_id UUID FK,
  mapping_type TEXT,          -- 'equivalent', 'partial', 'related'
  notes TEXT
)

-- Evidence (proof of compliance)
compliance_evidence (
  id UUID PK,
  company_id UUID FK,
  control_id UUID FK,
  type TEXT,                  -- 'screenshot', 'config', 'policy', 'log', 'api-pull', 'manual'
  title TEXT,
  description TEXT,
  source TEXT,                -- 'aws', 'github', 'okta', 'manual', 'integration'
  integration_id TEXT,        -- which integration provided this
  data JSONB,                 -- structured evidence payload
  file_url TEXT,              -- storage URL if file-based
  status TEXT DEFAULT 'pending', -- 'pending', 'valid', 'expired', 'failed'
  collected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  reviewed_by UUID FK,
  reviewed_at TIMESTAMPTZ,
  created_at, updated_at
)

-- Policies
compliance_policies (
  id UUID PK,
  company_id UUID FK,
  framework_id UUID FK,
  title TEXT,
  content TEXT,               -- markdown policy content
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft', -- 'draft', 'review', 'approved', 'published', 'archived'
  approved_by UUID FK,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  acknowledgements JSONB,     -- [{user_id, acknowledged_at}]
  created_at, updated_at
)
```

---

### Phase 1: Core Compliance Engine (Weeks 4-8)

**Goal:** Multi-framework compliance with real controls and evidence tracking.

#### 1A. Framework & Control Library

Pre-seed the database with controls for priority frameworks:

| Framework | Controls | Priority | Region |
|-----------|----------|----------|--------|
| EU AI Act | ~45 articles/obligations | P0 | EU |
| GDPR | ~99 articles, focus on ~40 key ones | P0 | EU |
| SOC 2 Type II | ~65 Trust Service Criteria | P0 | Global |
| ISO 27001:2022 | 93 Annex A controls | P0 | Global |
| NIS2 | ~25 key requirements | P1 | EU |
| HIPAA | ~50 safeguards | P1 | US |
| PCI DSS v4.0 | ~250 requirements | P2 | Global |
| DORA | ~30 key requirements | P2 | EU |

Build cross-framework mapping so completing one control can satisfy overlapping requirements across frameworks (e.g., SOC 2 CC6.1 ≈ ISO 27001 A.8.1 ≈ GDPR Article 32).

#### 1B. Control Dashboard

New page: `ComplianceControls.jsx`

- List all controls for enabled frameworks
- Filter by: framework, category, status, severity, owner
- Bulk actions: assign owner, update status
- Progress bars per framework
- Control detail drawer: description, guidance, linked evidence, mapped controls
- "Needs Attention" view: controls without evidence or with expired evidence

#### 1C. Evidence Management

New page: `ComplianceEvidence.jsx`

- Upload manual evidence (screenshots, docs)
- View auto-collected evidence from integrations
- Evidence lifecycle: pending → valid → expired
- Evidence linked to controls
- Bulk evidence review workflow
- Evidence history/versioning

#### 1D. Policy Management

New page: `CompliancePolicies.jsx`

- 40+ pre-built policy templates (AI-generated, editable)
  - Information Security Policy
  - Acceptable Use Policy
  - Data Retention Policy
  - Incident Response Plan
  - Business Continuity Plan
  - Access Control Policy
  - Vendor Management Policy
  - AI Governance Policy (unique to SENTINEL)
  - Data Protection Impact Assessment template
  - etc.
- Policy lifecycle: draft → review → approved → published → review-due
- Version history
- Employee acknowledgement tracking
- AI policy generation from framework requirements
- Markdown editor with live preview

---

### Phase 2: Automated Evidence Collection (Weeks 9-14)

**Goal:** Connect to infrastructure and automatically collect compliance evidence. This is the core value proposition that justifies subscription pricing.

#### 2A. Integration Framework

```sql
compliance_integrations (
  id UUID PK,
  company_id UUID FK,
  type TEXT,                  -- 'cloud', 'identity', 'hris', 'code', 'mdm', 'communication'
  provider TEXT,              -- 'aws', 'gcp', 'azure', 'okta', 'github', etc.
  status TEXT DEFAULT 'disconnected',
  config JSONB,               -- connection config (encrypted)
  last_sync_at TIMESTAMPTZ,
  sync_interval INTEGER,      -- minutes between syncs
  health TEXT DEFAULT 'unknown',
  error_message TEXT,
  created_at, updated_at
)

compliance_integration_checks (
  id UUID PK,
  integration_id UUID FK,
  control_id UUID FK,
  check_name TEXT,            -- 'mfa_enabled', 'encryption_at_rest', 'access_logging'
  check_type TEXT,            -- 'api_query', 'webhook', 'agent'
  query JSONB,                -- the actual check definition
  passing BOOLEAN,
  last_checked_at TIMESTAMPTZ,
  result JSONB,               -- raw check result
  created_at, updated_at
)
```

#### 2B. Priority Integrations (MVP set)

| Category | Integration | Evidence Collected | Effort |
|----------|-------------|-------------------|--------|
| **Cloud** | AWS | MFA status, encryption, logging, VPC config, IAM policies | XL |
| **Cloud** | Google Cloud | Same as AWS equivalent | L |
| **Cloud** | Azure | Same as AWS equivalent | L |
| **Identity** | Google Workspace | User list, MFA status, admin roles, SSO config | M |
| **Identity** | Okta | SSO config, MFA policies, user provisioning | M |
| **Identity** | Azure AD / Entra | Same as Okta | M |
| **Code** | GitHub | Branch protection, code review requirements, secret scanning | M |
| **Code** | GitLab | Same as GitHub | M |
| **HRIS** | BambooHR | Employee list, onboarding/offboarding status | M |
| **HRIS** | Rippling | Same as BambooHR + device management | M |
| **MDM** | Jamf | Device encryption, OS updates, screen lock | M |
| **MDM** | Kandji | Same as Jamf | M |
| **Communication** | Slack | DLP settings, retention policies | S |
| **Ticketing** | Jira | Change management evidence | M |
| **Monitoring** | Datadog | Alert policies, uptime monitoring | M |

Each integration would:
1. OAuth connect (via Composio or direct)
2. Run periodic checks (configurable interval, default 24h)
3. Store results as evidence linked to controls
4. Surface passing/failing controls on dashboard
5. Alert on drift (previously passing → now failing)

#### 2C. Continuous Monitoring Dashboard

New component on SentinelDashboard: real-time compliance health

- Green/yellow/red status per integration
- "Tests passing" count per framework
- Drift alerts: "3 controls changed to failing in last 24h"
- Compliance score trend over time (30/60/90 day chart)
- Auto-generated remediation suggestions

---

### Phase 3: Trust Center & Audit Readiness (Weeks 15-18)

**Goal:** Public-facing compliance proof + audit workflow support.

#### 3A. Trust Center

New public page: `/trust/:company-slug`

- Company compliance overview (public or gated)
- Framework badges (SOC 2 certified, ISO 27001, GDPR compliant)
- Downloadable documents (SOC 2 report, policies, certifications)
- Gated access: require email/NDA for sensitive docs
- Custom branding (logo, colors)
- Security FAQ section
- Subprocessor list
- Data processing locations
- Penetration test summary
- Uptime/incident history

```sql
trust_center_config (
  id UUID PK,
  company_id UUID FK,
  slug TEXT UNIQUE,
  enabled BOOLEAN DEFAULT false,
  branding JSONB,             -- {logo_url, primary_color, company_name}
  sections JSONB,             -- [{type, title, content, visibility}]
  gated_documents JSONB,      -- [{document_id, require_email, require_nda}]
  custom_domain TEXT,
  created_at, updated_at
)

trust_center_requests (
  id UUID PK,
  trust_center_id UUID FK,
  requester_email TEXT,
  requester_company TEXT,
  document_requested TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  approved_by UUID FK,
  created_at
)
```

#### 3B. Audit Workflow

- Auditor portal: read-only view for external auditors
- Evidence packages: bundle all evidence for a framework into download
- Audit timeline: track audit phases (planning → fieldwork → review → report)
- Finding management: track audit findings, remediation plans, deadlines
- Auditor communication: in-app messaging with audit firm

#### 3C. Security Questionnaire Automation

- Ingest questionnaires (CSV, Excel, PDF)
- AI auto-responds using existing evidence + policies
- Answer library: curated responses per topic
- Approval workflow before sending
- Track questionnaire history per vendor/customer
- SLA tracking (response time commitments)

---

### Phase 4: Vendor Risk Management (Weeks 19-22)

**Goal:** Track third-party risk as part of compliance posture.

```sql
vendor_assessments (
  id UUID PK,
  company_id UUID FK,
  vendor_name TEXT,
  vendor_domain TEXT,
  category TEXT,              -- 'saas', 'infrastructure', 'professional-services'
  criticality TEXT,           -- 'critical', 'high', 'medium', 'low'
  data_access TEXT[],         -- ['pii', 'phi', 'financial', 'none']
  risk_score INTEGER,         -- 0-100
  status TEXT DEFAULT 'pending-review',
  soc2_report_url TEXT,
  iso_cert_url TEXT,
  last_assessment_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  questionnaire_responses JSONB,
  risk_findings JSONB,
  created_at, updated_at
)
```

- Vendor inventory with risk scoring
- Automated vendor security posture checks (via their Trust Center / public data)
- Questionnaire workflows for vendor assessment
- Risk tiering: critical vendors get deeper assessment
- Continuous vendor monitoring (breach alerts, rating changes)
- Subprocessor management (GDPR requirement)

---

### Phase 5: Employee & Access Management (Weeks 23-26)

**Goal:** People-side compliance — training, access reviews, onboarding/offboarding.

#### 5A. Security Training

- Assign compliance training courses (link to existing Learn module in iSyncSO)
- Track completion per employee per framework
- Annual re-certification reminders
- Training topics: security awareness, GDPR, AI ethics, phishing
- Completion evidence auto-linked to controls

#### 5B. Access Reviews

- Periodic access review campaigns (quarterly recommended)
- Pull user lists from identity integrations (Okta, Google Workspace)
- Manager review workflow: confirm/revoke each user's access
- Least-privilege analysis
- Orphaned account detection
- Evidence auto-generated from completed reviews

#### 5C. Onboarding/Offboarding

- Background check tracking
- Policy acknowledgement collection
- Device enrollment verification
- Access provisioning checklist
- Offboarding: access revocation verification, device return tracking

---

### Phase 6: AI-Native Features (Weeks 27-30) — SENTINEL's Differentiator

**Goal:** AI features that go beyond what Vanta/Drata offer.

#### 6A. Compliance AI Agent (enhance existing Sentinel chat)

- "What do I need to do for SOC 2?" → generates personalized roadmap
- "Is our AWS setup compliant?" → runs checks and reports findings
- "Write me an incident response policy" → generates from template + company context
- "What controls does this new vendor affect?" → cross-reference vendor data
- "Prepare evidence package for our auditor" → bundles relevant evidence

#### 6B. AI Risk Assessment

- Continuous risk scoring based on all compliance data
- Anomaly detection: unusual access patterns, config drift
- Predictive compliance: "At current pace, you'll be audit-ready by [date]"
- AI-generated remediation plans with effort estimates
- Natural language compliance queries across all frameworks

#### 6C. AI Document Generation

- Generate complete Annex IV technical documentation from system registry
- Generate DPIAs from data flow analysis
- Generate risk assessments from integration data
- Auto-fill questionnaire responses from evidence library
- Policy generation personalized to company size/industry/frameworks

#### 6D. AI Control Mapping

- When adding a new framework, AI auto-maps to existing controls
- "You're 73% done with ISO 27001 based on your SOC 2 work"
- Suggest which frameworks to pursue based on customer requirements
- Gap analysis: "For ISO 27001, you still need these 12 controls"

---

## Part 4: Pricing Strategy

### Undercut Vanta by 60-70%

| Tier | Price/Year | Includes | Vanta Equivalent |
|------|-----------|----------|-----------------|
| **Starter** | $2,500 | 1 framework, 5 integrations, Trust Center, policy templates | Core ($10K) |
| **Growth** | $6,000 | 3 frameworks, 20 integrations, VRM (25 vendors), questionnaire AI | Growth ($30K) |
| **Business** | $12,000 | Unlimited frameworks, unlimited integrations, full VRM, audit workflow, SSO/SCIM | Scale ($80K) |
| **Enterprise** | Custom | Multi-workspace, dedicated support, custom integrations, on-prem agents | Enterprise ($80K+) |

**Why this works:**
- iSyncSO is already a platform — compliance is an add-on module, not a standalone product
- No enterprise sales team needed initially — self-serve + existing customer base
- Lower infrastructure cost — leveraging Supabase, no heavy monitoring agents
- EU-focused niche reduces competition surface

---

## Part 5: Implementation Priority

### Must Build First (P0 — Weeks 1-14)

1. Database foundation (framework, controls, evidence, policies tables)
2. Multi-framework control library (SOC 2 + ISO 27001 + GDPR + EU AI Act)
3. Cross-framework control mapping
4. Policy template library (AI-generated)
5. Evidence management (manual upload + review)
6. Top 5 integrations (Google Workspace, GitHub, AWS, Slack, Jira)
7. Continuous monitoring dashboard
8. Trust Center (public compliance page)

### Build Next (P1 — Weeks 15-22)

9. Security questionnaire automation
10. Vendor Risk Management
11. Audit workflow + auditor portal
12. 10 more integrations (Okta, Azure AD, BambooHR, Datadog, etc.)
13. Access review campaigns
14. Employee training tracking

### Differentiators (P2 — Weeks 23-30)

15. AI compliance agent (enhanced chat)
16. AI policy generation
17. AI questionnaire auto-response
18. AI control mapping + gap analysis
19. NIS2 + DORA frameworks
20. HIPAA + PCI DSS frameworks

---

## Part 6: Key Technical Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Integration method | Composio (already integrated) + direct OAuth | Composio handles 30+ apps, extend for compliance-specific ones |
| Evidence collection | Edge functions on cron (pg_cron) | Matches existing pattern, no extra infrastructure |
| Policy editor | Markdown with live preview | Simple, exportable, versionable |
| PDF generation | @react-pdf/renderer (already installed) | Client-side, no server needed |
| AI model for policy gen | Groq (Llama 3.3 70B) | Already in stack, fast, cheap |
| Trust Center hosting | Public route on same app | No extra deployment, just auth-gated |
| Control library seeding | JSON seed files + migration | One-time load, admin can edit after |
| Questionnaire AI | RAG over evidence + policies | Use existing memory/embedding infra from SYNC |

---

## Part 7: Success Metrics

| Metric | Target (6 months) | Target (12 months) |
|--------|-------------------|---------------------|
| Frameworks supported | 4 (SOC 2, ISO, GDPR, EU AI Act) | 8+ |
| Integrations | 10 | 25+ |
| Policy templates | 40 | 60+ |
| Time to SOC 2 readiness | < 4 weeks | < 2 weeks |
| Trust Centers published | 20 | 200+ |
| Paying customers | 10 | 100+ |
| ARR | $50K | $500K |
| NPS | 50+ | 60+ |
