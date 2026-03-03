# iSyncSO Technical Overview

**Date:** 2026-03-02
**Application:** app.isyncso.com
**Purpose:** AI-first business suite for e-commerce operations

---

## 1. System Architecture Overview

### High-Level Architecture

```
                        app.isyncso.com (Vercel)
                               |
                    React 18 + Vite SPA
                    React Router DOM v7
                    TanStack React Query
                               |
           +---------+---------+---------+
           |         |         |         |
      Supabase   Composio   Twilio   Stripe
      (Backend)  (30+ SaaS) (SMS)   (Billing)
           |
    +------+------+
    |      |      |
  REST   Edge    Storage
  API    Fns     Buckets
    |      |
  Postgres Together.ai / Groq / Explorium
  (RLS)     (LLM + Embeddings + Enrichment)
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + Vite |
| Routing | React Router DOM v7 (SPA, case-insensitive) |
| State Management | Local React state + React Query (5 min stale, 15 min GC) |
| UI Framework | Tailwind CSS + shadcn/ui components |
| Animations | Framer Motion + anime.js |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, Storage, Realtime) |
| LLM Primary | Together.ai (Kimi K2 Instruct, FLUX image models) |
| LLM Secondary | Groq (Llama 3.3 70B) for matching and outreach |
| Enrichment | Explorium API (prospect + company data) |
| Integrations | Composio (30+ third-party SaaS connectors) |
| SMS/Voice | Twilio (phone numbers, SMS, voice webhooks) |
| Payments | Stripe (subscriptions, nest purchases) |
| Hosting | Vercel (auto-deploy from `main` branch) |
| Embeddings | BAAI/bge-large-en-v1.5 (1024 dims, via Together.ai) |

### Application Entry Point

```
main.jsx
  -> ErrorBoundary
    -> QueryClientProvider
      -> App.jsx
        -> GlobalThemeProvider
          -> CreditCostsProvider
            -> Pages (Router)
              -> Layout (sidebar, nav, providers)
                -> [Page Components]
```

### Provider Stack (Layout.jsx)

The Layout wraps all authenticated pages with:
1. `UserProvider` (auth state, user data)
2. `PermissionProvider` (RBAC permissions)
3. `AchievementProvider` (gamification)
4. `ActivityLoggerProvider` (usage tracking)
5. `AnimationProvider` (animation preferences)
6. `SyncStateProvider` (SYNC AI agent state)
7. `KeyboardShortcutsProvider` (global hotkeys)
8. `NotificationsProvider` (notification center)
9. `OnboardingGuard` (first-run onboarding)
10. `AppLicenseGate` (per-app access control)

### RBAC System

Role hierarchy: `super_admin (100) > admin (80) > manager (60) > user (40) > learner (30) > viewer (20)`

Permission format: `{resource}.{action}` (e.g., `finance.view`, `users.edit`, `admin.access`)

All pages check permissions client-side via `usePermissions()` hook, server-side via RLS policies using optimized STABLE wrapper functions (`auth_uid()`, `auth_company_id()`, `auth_hierarchy_level()`).

### Multi-Tenant Architecture

- **Company-scoped data:** Core business tables use `company_id` from `get_user_company_id()`
- **Organization-scoped data:** Talent module uses `organization_id` (separate namespace)
- **User isolation:** RLS policies enforce row-level access control
- **App licensing:** `user_app_configs` table controls which engine apps each user has access to

---

## 2. App-by-App Breakdown

The platform has **8 "Engine Apps"** (optional modules), **6 Core Apps** (always available), an **Admin Panel**, a **Client Portal**, and the **SYNC AI Agent**.

### 2.1 SYNC (AI Agent & Personal Hub)

**Theme:** Purple | **Routes:** `/sync`, `/aiassistant`

SYNC is the AI orchestrator for the entire platform. It processes natural language commands and executes 51 actions across 10 modules.

**Core Features:**
- Natural language command interface with streaming responses
- Voice mode (speech-to-text + text-to-speech)
- 51 executable actions across finance, products, growth, tasks, inbox, team, learn, sentinel, create, research
- Persistent memory system (session-based + RAG vector retrieval)
- Multi-agent workflow engine (parallel, sequential, iterative)
- Daily journal generation
- User profile and activity tracking
- "Knock" system for proactive notifications

**Key Components:**
- `SyncHub.jsx` (tabbed hub: Agent, Journal, Profile, Activity)
- `SyncAgent.jsx` (full-page agent view)
- `SyncFloatingChat.jsx` (floating chat widget, always accessible)
- `SyncVoiceMode.jsx` (voice interaction overlay)
- `SyncAvatarMini.jsx` (animated sidebar avatar with ring segments)

**Edge Functions:**
- `sync/index.ts` (~1800 lines, main orchestrator)
- `sync/tools/*.ts` (51 action executors)
- `sync/workflows/` (multi-agent engine)
- `sync/memory/` (session, buffer, entities, RAG, embeddings)
- `sync-voice` (voice chat)
- `sync-meeting-wrapup` (meeting summary)

**LLM:** Together.ai (Kimi K2 Instruct), fallback to Llama 3.3 70B

**Database Tables:** `sync_sessions`, `sync_memory_chunks` (vector), `sync_action_templates` (vector)

---

### 2.2 Dashboard (Home)

**Theme:** Cyan | **Route:** `/`, `/dashboard`

**Core Features:**
- Company-wide KPI overview
- Activity feed
- Quick actions
- Module summary cards

**Key Component:** `Dashboard.jsx`

---

### 2.3 CRM (Customer Relationship Management)

**Theme:** Cyan | **Routes:** `/crm*`, `/contacts-import`

**Core Features:**
- Contact management with detailed profiles
- Company profiles with enrichment data
- Sales pipeline (kanban view)
- Campaign management
- Contact import (CSV/manual)

**Key Pages:**
- `CRMDashboard.jsx` - Overview with pipeline stats
- `CRMContacts.jsx` - Contact list with search/filter
- `CRMContactProfile.jsx` - Detailed contact view (Skills & Career tab, LinkedIn data)
- `CRMCompanyProfile.jsx` - Company intelligence view
- `CRMPipeline.jsx` - Kanban deal pipeline
- `CRMCampaigns.jsx` - Email/outreach campaigns
- `ContactsImport.jsx` - Bulk contact import

**Database Tables:** `prospects` (contacts/companies), `prospect_lists`, `prospect_list_memberships`, `icp_templates`

---

### 2.4 Tasks & Projects

**Theme:** Cyan | **Routes:** `/tasks`, `/projects`

**Core Features:**
- Task management with status, priority, assignees
- Project organization with folders
- Task assignments
- Overdue tracking

**Key Pages:**
- `Tasks.jsx` - Task list/board
- `Projects.jsx` - Project management

**Database Tables:** `tasks`, `projects`, `client_folders`

---

### 2.5 Products (Inventory & Catalog)

**Theme:** Cyan | **Routes:** `/products*`, `/productdetail*`, `/inventory*`, `/warehouse`, `/stockpurchases`, `/emailpoolsettings`

**Core Features:**
- Multi-type product catalog (physical, digital, services)
- Product detail pages with variants, pricing tiers, bundles
- Inventory management (stock levels, reorder points)
- Warehouse management (receiving, shipping, pallet builder)
- Purchase orders and stock purchases
- Product data health scoring
- Sales analytics per product
- Barcode generation/display
- Product image management
- bol.com and Shopify integration for multi-channel sales
- Email pool auto-sync for order processing

**Key Pages:**
- `Products.jsx` - Product catalog listing
- `ProductDetail.jsx` - Full product detail with tabs
- `ProductsPhysical.jsx`, `ProductsDigital.jsx`, `ProductsServices.jsx` - Type-specific views
- `Warehouse.jsx` - Warehouse dashboard
- `InventoryReceiving.jsx` - Goods receiving
- `InventoryShipping.jsx` - Shipping management
- `PalletBuilder.jsx` - Pallet assembly
- `ShipmentVerification.jsx` - Shipment QA
- `StockPurchases.jsx` - Purchase orders
- `ProductDataHealth.jsx` - Data quality scoring
- `ProductSalesAnalytics.jsx` - Sales data per product

**Database Tables:** `products`, `digital_products`, `physical_products`, `service_products`, `product_categories`, `product_bundles`, `suppliers`, `product_sales_channels`, `purchase_orders`, `purchase_order_items`, `receiving_tasks`, `shipping_tasks`, `pallets`, `pallet_items`

**Edge Functions:** `bolcom-api`, `shopify-api`, `product-feed-sync`, `research-product`, `research-supplier`, `aftership-register`, `aftership-webhooks`, `bolcom-webhooks`, `shopify-webhooks`

---

### 2.6 B2B Store

**Theme:** Cyan | **Routes:** `/storedashboard`, `/b2bstorebuilder`, `/b2b/*`

**Core Features:**
- B2B storefront builder (full-screen IDE)
- Store dashboard with order management
- Price list management (per-client pricing)
- Client group management
- Catalog management
- Inquiry management
- Order processing and detail view
- Public storefront (subdomain-based: `{store}.isyncso.com`)
- Store preview (iframe-based)

**Key Pages:**
- `StoreDashboard.jsx` - B2B store admin dashboard
- `B2BStoreBuilder.jsx` - Visual store editor (full-screen, own layout)
- `StorePreview.jsx` - Live preview (separate route, no auth layout)
- `PublicStorefront.jsx` - Customer-facing store

**Key B2B Admin Components (src/components/b2b-admin/):**
- `B2BDashboard.jsx` - Admin overview
- `B2BOrdersManager.jsx` - Order management
- `B2BOrderDetail.jsx` - Single order view
- `B2BCatalogManager.jsx` - Product catalog for B2B
- `PriceListManager.jsx` - Price list CRUD
- `PriceListEditor.jsx` - Individual price list editing
- `ClientGroupManager.jsx` - Client segmentation
- `B2BInquiryManager.jsx` - Customer inquiry handling

**Edge Functions:** `b2b-checkout-otp`, `b2b-create-order`, `b2b-order-webhook`, `b2b-portal-api`, `store-builder-ai`

---

### 2.7 Inbox (Messaging & Communication)

**Theme:** Cyan | **Route:** `/inbox`

**Core Features:**
- Internal messaging/chat
- Conversation threads
- Message search
- Unread count tracking
- Video calls with join links
- Calendar booking (Calendly-style public pages)

**Key Pages:**
- `Inbox.jsx` - Main messaging interface
- `JoinCallPage.jsx` - Video call join page

**Key Components:**
- `src/components/inbox/booking/CalendarBookingPage` - Public booking widget

**Database Tables:** `channels`, `messages`

**Edge Functions:** `digest-channel`, `smart-compose`, `scheduling-orchestrator`

---

### 2.8 Finance (Engine App)

**Theme:** Blue | **Routes:** `/finance*`, `/proposal*`

**Core Features:**
- Full double-entry bookkeeping system
- Invoice management (create, send, track, recurring)
- Expense tracking and consolidation
- Proposal builder (with conversion to invoice)
- Vendor management
- Bill management and payments
- Chart of accounts and general ledger
- Journal entries
- Bank account management and reconciliation
- Financial reports (P&L, Balance Sheet, Trial Balance, Aging, Cash Flow)
- Tax rates and BTW Aangifte (Dutch VAT filing)
- Credit notes
- bol.com payout tracking
- Smart invoice import (AI-powered PDF extraction)
- Subscriptions tracking
- Receivables and payables management

**Key Pages (30 finance pages):**
- `FinanceDashboard.jsx` - Overview with KPIs
- `FinanceInvoices.jsx` - Invoice list
- `FinanceExpensesConsolidated.jsx` - Unified expense view
- `FinanceProposalBuilder.jsx` - Visual proposal editor
- `FinanceLedger.jsx` - General ledger
- `FinanceBanking.jsx` - Bank connection hub
- `FinanceBankReconciliation.jsx` - Transaction matching
- `FinanceReports.jsx` - Report center
- `FinanceReportPL.jsx` / `FinanceReportBS.jsx` / `FinanceReportTB.jsx` - Specific reports
- `FinanceSmartImport.jsx` - AI invoice scanner
- `FinanceBTWAangifte.jsx` - Dutch VAT return
- `FinanceBolcomPayouts.jsx` - bol.com payout reconciliation

**Database Tables:** `invoices`, `expenses`, `subscriptions`, `accounts`, `account_types`, `fiscal_periods`, `journal_entries`, `journal_entry_lines`, `vendors`, `bills`, `bill_line_items`, `bill_payments`, `saved_reports`, `proposals`

**Edge Functions:** `finance-ai-accountant`, `process-invoice`, `smart-import-invoice`, `send-invoice-email`, `send-proposal-email`, `revolut-sync`

---

### 2.9 Growth (Engine App)

**Theme:** Indigo | **Routes:** `/growth/*`, `/sequences`, `/deals`, `/leads`, `/prospects`, `/pipeline`

**Core Features:**
- AI-powered prospect research and enrichment
- Campaign wizard (multi-step, ICP-based targeting)
- Data Nests (purchasable prospect pools)
- Customer signals monitoring
- Opportunity discovery
- Outreach builder with multi-channel sequences
- Flow builder (automation workflows)
- Execution monitoring
- Workspace setup for ICP definition
- Enrichment services (Explorium integration)

**Key Pages:**
- `growth/GrowthDashboard.jsx` - Growth metrics overview
- `growth/GrowthCampaignWizard.jsx` - Multi-step campaign creation
- `growth/GrowthCampaignNests.jsx` - Nest selection for campaigns
- `growth/GrowthCampaignReview.jsx` - Campaign review and launch
- `growth/GrowthEnrich.jsx` - Prospect enrichment interface
- `growth/GrowthCustomerSignals.jsx` - Signal monitoring
- `growth/GrowthOpportunities.jsx` - Opportunity pipeline
- `growth/GrowthOutreachBuilder.jsx` - Sequence builder
- `growth/GrowthResearchWorkspace.jsx` - Research workspace
- `growth/GrowthWorkspaceSetup.jsx` - ICP and workspace config
- `growth/GrowthNestRecommendations.jsx` - AI nest suggestions
- `growth/Flows.jsx` - Automation flow list
- `growth/ExecutionMonitor.jsx` - Flow execution tracker
- `FlowBuilder.jsx` - Visual flow editor

**Database Tables:** `prospects`, `growth_campaigns`, `growth_opportunities`, `growth_signals`, `growth_metrics`, `growth_nests`, `growth_nest_purchases`, `icp_templates`

**Edge Functions:** `growth-ai-execute`, `explorium-enrich`, `generateCompanyIntelligence`, `purchase-growth-nest`, `research-demo-prospect`

---

### 2.10 Learn (Engine App)

**Theme:** Teal | **Routes:** `/learn*`, `/course*`, `/lesson*`, `/certificate*`, `/skill*`, `/leaderboard`, `/practice*`, `/teamlearn*`, `/managecourses`

**Core Features:**
- Course catalog and enrollment
- Lesson viewer with interactive content
- Learning path management
- Skill mapping and gap analysis
- Practice challenges
- Certifications and certificates (with public verification)
- Leaderboard and gamification
- Team learning dashboard
- Course builder (admin)
- AI tools for learning
- Learning assistant (AI tutor)
- Student dashboard

**Key Pages:**
- `LearnDashboard.jsx` - Learning overview
- `Learn.jsx` - Course catalog
- `CourseDetail.jsx` - Course overview
- `LessonViewer.jsx` - Interactive lesson player
- `LearningPaths.jsx` - Guided learning paths
- `SkillMap.jsx` - Visual skill tree
- `SkillsOverview.jsx` - Skills summary
- `PracticeChallenges.jsx` - Hands-on exercises
- `Certificates.jsx` - Earned certifications
- `Leaderboard.jsx` - Gamification rankings
- `TeamLearningDashboard.jsx` - Team progress
- `ManageCourses.jsx` - Course builder (admin)
- `LearnAITools.jsx` - AI-powered learning tools
- `LearnAssistant.jsx` - AI tutor chat

**Database Tables:** `courses`, `modules`, `lessons`, `user_progress`, `assessments`, `user_results`, `skills`, `user_skills`, `learning_paths`, `learning_path_steps`, `practice_challenges`, `certificates`, `badges`, `user_gamifications`, `course_ratings`

**Edge Functions:** Course generation, template management, gamification functions

---

### 2.11 Talent (Engine App)

**Theme:** Red | **Routes:** `/talent*`, `/marketplace/*`

**Core Features:**
- Candidate sourcing and management
- Intelligent matching with weighted criteria
- Campaign wizard (4-5 steps: Project, Role, Context, Match Weights, Review)
- AI-powered outreach message generation
- Signal-based matching (M&A, layoffs, flight risk, etc.)
- Intelligence scoring (flight risk assessment)
- Candidate enrichment (LinkedIn, Explorium)
- SMS outreach (Twilio)
- Client management with candidate exclusion
- Data Nests marketplace (purchasable candidate pools)
- Deals tracking
- Project-based recruitment
- Panel customization (per-user section visibility)

**Key Pages:**
- `TalentDashboard.jsx` - Recruitment metrics
- `TalentCandidates.jsx` - Candidate list with enrichment
- `TalentCandidateProfile.jsx` - Full candidate profile (Skills, Career, Company, Intelligence tabs)
- `TalentCampaigns.jsx` - Campaign list
- `TalentCampaignDetail.jsx` - Campaign detail with matching results
- `TalentProjects.jsx` - Recruitment projects
- `TalentClients.jsx` - Client management (with exclusion toggle)
- `TalentDeals.jsx` - Deal tracking
- `TalentNestDetail.jsx` - Purchased nest detail (with ruled-out section)
- `TalentSMSOutreach.jsx` - SMS campaign management
- `marketplace/NestsMarketplace.jsx` - Browse/buy nests
- `marketplace/PurchasedNests.jsx` - Owned nests

**Key Components:**
- `CampaignWizard.jsx` - 5-step campaign creation wizard
- `CandidateMatchCard.jsx` - Match score visualization
- `CandidateDetailDrawer.jsx` - Slide-out candidate detail panel
- `OutreachPipeline.jsx` - Message generation pipeline
- `PhoneNumberManager.jsx` - Twilio number management
- `campaign/CriteriaWeightingStep.jsx` - Match weight sliders
- `campaign/SignalMatchingConfig.jsx` - Intelligence signal toggles
- `campaign/MatchReasonCards.jsx` - Match factor visualization

**Database Tables:** `candidates`, `campaigns`, `candidate_campaign_matches`, `sync_intel_queue`, `twilio_phone_numbers`, `sms_messages`, `user_panel_preferences`

**Edge Functions:** `analyzeCampaignProject` (smart matching), `generateCampaignOutreach` (message generation), `generateCandidateIntelligence` (intelligence scoring), `explorium-enrich` (enrichment), `executeTalentOutreach`, `twilio-numbers`, `sms-send`, `sms-webhook`, `sms-ai-respond`, `purchase-nest`, `upload-nest-data`

---

### 2.12 Sentinel (Engine App)

**Theme:** Sage Green (#86EFAC) | **Routes:** `/sentinel*`, `/aisystem*`, `/compliance*`, `/document*`, `/riskassessment`, `/vendorrisk`, `/trustcenter`

**Core Features:**
- EU AI Act compliance management
- AI system inventory and registration
- Risk classification wizard (5-step)
- Compliance frameworks tracking
- Controls management
- Evidence collection
- Policy management
- Vendor risk assessment
- Trust center (public compliance dashboard)
- Compliance roadmap with AI action plan
- Document generator (Annex IV tech docs, Article 47 conformity declarations)

**Key Pages:**
- `SentinelDashboard.jsx` - Compliance gauge, stats, workflow stepper
- `AISystemInventory.tsx` - Paginated AI system browser (12/page)
- `ComplianceFrameworks.jsx` - Framework list
- `ComplianceControls.jsx` - Control implementation
- `ComplianceEvidence.jsx` - Evidence upload/management
- `CompliancePolicies.jsx` - Policy documents
- `VendorRisk.jsx` - Third-party risk assessment
- `TrustCenter.jsx` - Public-facing compliance page
- `ComplianceRoadmap.tsx` - Timeline and obligations
- `DocumentGenerator.tsx` - AI-generated compliance docs

**Key Components:**
- `AISystemModal.jsx` - System registration with CIDE AI pre-fill
- `RiskAssessmentWizard.jsx` - Multi-step risk classification
- `TechnicalDocTemplate.jsx` - Annex IV template
- `DeclarationOfConformity.jsx` - Article 47 template

**Database Tables:** `ai_systems`, `obligations`, `compliance_requirements`, `regulatory_documents`

---

### 2.13 Raise (Engine App)

**Theme:** Orange | **Routes:** `/raise*`

**Core Features:**
- Fundraising campaign management
- Investor CRM
- Pitch deck builder/manager
- Data room management (secure document sharing)
- Investor enrichment
- Campaign tracking

**Key Pages:**
- `Raise.jsx` - Dashboard
- `RaiseInvestors.jsx` - Investor list and profiles
- `RaisePitchDecks.jsx` - Deck management
- `RaiseDataRoom.jsx` - Secure document room
- `RaiseCampaigns.jsx` - Fundraising campaigns
- `RaiseEnrich.jsx` - Investor enrichment

**Database Tables:** `raise_campaigns`, `raise_investors`, `raise_pitch_decks`, `raise_data_rooms`

**Edge Functions:** `raise-chat`

---

### 2.14 Create (Engine App)

**Theme:** Yellow | **Routes:** `/create*`, `/studio*`, `/syncstudio*`, `/contentcalendar`

**Core Features:**
- AI image generation (FLUX models via Together.ai)
- AI photoshoot (product photography)
- AI video generation
- AI podcast generation
- AI voice generation
- Fashion booth (virtual try-on)
- Avatar creation
- Template library
- Content calendar
- Brand asset management
- Brand builder wizard
- Clip shooting
- Content library

**Key Pages:**
- `Create.jsx` - Creative dashboard
- `StudioImage.jsx` - Image generation
- `StudioPhotoshoot.jsx` - AI product photography
- `StudioVideo.jsx` - Video generation
- `StudioPodcast.jsx` - Podcast creation
- `StudioVoice.jsx` - Voice generation
- `StudioFashionBooth.jsx` - Fashion virtual try-on
- `StudioAvatar.jsx` - Avatar builder
- `StudioTemplates.jsx` - Template browser
- `StudioLibrary.jsx` - Content library
- `StudioClipshoot.jsx` - Clip generation
- `ContentCalendar.jsx` - Publishing calendar
- `CreateBranding.jsx` - Brand management
- `CreateImages.jsx` / `CreateVideos.jsx` - Legacy generation pages

**Sync Studio (Product Photography Pipeline):**
- `SyncStudioHome.jsx` - Studio entry
- `SyncStudioImport.jsx` - Product import
- `SyncStudioDashboard.jsx` - Studio overview
- `SyncStudioPhotoshoot.jsx` - Photoshoot session
- `SyncStudioResults.jsx` - Generated photos
- `SyncStudioReturn.jsx` - Return to catalog

**Database Tables:** `generated_content`, `brand_assets`, `brand_projects`, `render_jobs`, `video_projects`, `video_shots`

**Edge Functions:** `generate-image`, `generate-video`, `generate-podcast`, `generate-shot`, `generate-storyboard`, `generate-fashion-video`, `enhance-prompt`, `generate-brand-strategy`, `generate-verbal-identity`, `generate-visual-language`, `render-video`, `assemble-video`, `sync-studio-*` (7 functions)

---

### 2.15 Reach (Engine App)

**Theme:** Cyan | **Routes:** `/reach*`

**Core Features:**
- Multi-channel ad campaign management
- SEO scanner and optimization
- Content calendar
- Copy studio (AI copywriting)
- Brand voice profiling
- Performance dashboards
- Campaign builder
- Campaign detail and analytics

**Key Pages:**
- `ReachDashboard.jsx` - Performance overview
- `ReachCampaigns.jsx` - Campaign list
- `ReachCampaignBuilder.jsx` - Campaign creation
- `ReachCampaignDetail.jsx` - Campaign analytics
- `ReachSEO.jsx` - SEO scanning tool
- `ReachCalendar.jsx` - Publishing calendar
- `ReachCopyStudio.jsx` - AI copywriting workspace
- `ReachBrandVoice.jsx` - Voice profile management
- `ReachSettings.jsx` - Channel connections

**Database Tables:** `reach_campaigns`, `reach_ad_variants`, `reach_scheduled_posts`, `reach_seo_reports`, `reach_copy_outputs`, `reach_social_connections`, `reach_performance_metrics`, `reach_insights`, `brand_voice_profiles`

**Edge Functions:** `reach-analyze-brand-voice`, `reach-generate-ad-copy`, `reach-generate-ad-image`, `reach-generate-ad-video`, `reach-generate-copy`, `reach-generate-insights`, `reach-publish-post`, `reach-fetch-metrics`, `reach-seo-scan`

---

### 2.16 Admin Panel

**Routes:** `/admin/*` | **Layout:** `AdminLayout` (separate from main Layout)

**Access:** Super admin only (`admin.access` permission)

**Pages (21 admin pages):**
- `AdminDashboard.jsx` - Platform overview
- `AdminUsers.jsx` - User management
- `AdminOrganizations.jsx` - Organization management
- `AdminApps.jsx` - App licensing
- `AdminBilling.jsx` - Billing management
- `AdminCredits.jsx` - Credit allocation
- `AdminFeatureFlags.jsx` - Feature flag control
- `AdminAuditLogs.jsx` - Activity audit trail
- `AdminAnalytics.jsx` - Platform analytics
- `AdminSystem.jsx` - System health
- `AdminSettings.jsx` - Platform settings
- `AdminIntegrations.jsx` - Integration management
- `AdminContent.jsx` - Content moderation
- `AdminSupport.jsx` - Support ticket management
- `AdminAI.jsx` - AI model configuration
- `AdminMarketplace.jsx` - Marketplace management
- `AdminNests.jsx` - Talent nest management
- `AdminGrowthNests.jsx` - Growth nest management
- `AdminDemos.jsx` - Demo management
- `AdminRoadmap.jsx` - Product roadmap
- `AdminStructuralTests.jsx` - System testing

---

### 2.17 Client Portal

**Routes:** `/portal/:org/*` | **Layout:** `ClientLayout` (separate from main Layout)

Two sub-portals:

**A. Project Portal (for service clients):**
- `ClientLogin.jsx` - Client authentication
- `ClientDashboard.jsx` - Client overview
- `ClientProjects.jsx` - Shared projects
- `ClientProjectDetail.jsx` - Project detail
- `ClientApprovals.jsx` - Approval workflows
- `ClientActivity.jsx` - Activity feed

**B. Wholesale Store (B2B e-commerce):**
- `WholesaleHome.jsx` - Store landing
- `WholesaleCatalog.jsx` - Product browsing
- `WholesaleProduct.jsx` - Product detail
- `WholesaleCart.jsx` - Shopping cart
- `WholesaleCheckout.jsx` - Checkout flow
- `WholesaleOrders.jsx` - Order history
- `WholesaleOrderDetail.jsx` - Order detail
- `WholesaleInquiries.jsx` - Product inquiries
- `WholesaleAccount.jsx` - Account settings
- `WholesaleTemplates.jsx` - Order templates
- `WholesaleDashboard.jsx` - Client dashboard

---

### 2.18 Settings

**Route:** `/settings` | Embeds other pages as tabs

**Tabs:**
- General settings (profile, preferences)
- Teams (`TeamManagement embedded`)
- Integrations (`Integrations embedded` + `ComposioIntegrations`)
- Workspace (`AppsManagerModal embedded`)
- Billing (`BillingSettings`)

---

### 2.19 Public Routes (No Auth)

| Route | Page | Purpose |
|-------|------|---------|
| `/demo` | `DemoExperience` | Interactive demo |
| `/request-demo` | `RequestDemo` | Demo request form |
| `/privacy` | `PrivacyPolicy` | Privacy policy |
| `/terms` | `TermsOfService` | Terms of service |
| `/book/:username` | `CalendarBookingPage` | Public booking |
| `/call/:joinCode` | `JoinCallPage` | Video call join |
| `/share/:type/:shareId` | `ShareView` | Shared content |
| `/store-preview/*` | `StorePreview` | Store preview |
| `/verifycertificate` | `VerifyCertificate` | Certificate validation |
| `{subdomain}.isyncso.com` | `PublicStorefront` | B2B store |

---

## 3. Cross-App Integration Map

### 3.1 Data Flow Between Apps

```
CRM (Prospects)
  |
  +---> Growth (Prospect enrichment, ICP targeting)
  |       |
  |       +---> Reach (Ad targeting from prospect data)
  |
  +---> Talent (Client exclusion - don't recruit from clients)
  |
  +---> Finance (Client -> Invoice recipient)

Products
  |
  +---> B2B Store (Product catalog, pricing, orders)
  |
  +---> Create (Product images, photoshoots)
  |
  +---> Finance (Product -> Invoice line items)
  |
  +---> SYNC Agent (Product search, inventory updates)

Talent (Candidates)
  |
  +---> Growth (Shared Nests marketplace)
  |
  +---> CRM (Client data for exclusion)
  |
  +---> Finance (Deal value tracking)

Finance
  |
  +---> Products (Expense tracking, purchase orders)
  |
  +---> CRM (Client invoicing)

SYNC Agent (Orchestrator)
  |
  +---> ALL MODULES (51 actions spanning 10 domains)

Learn
  |
  +---> Sentinel (Compliance training recommendations)
  |
  +---> Company (Team skill tracking)
```

### 3.2 Shared Data Models

| Data Model | Used By | Table |
|-----------|---------|-------|
| `users` | All apps | `users` (auth.users + public.users) |
| `companies` | All company-scoped apps | `companies` |
| `organizations` | Talent module | `organizations` |
| `prospects` | CRM + Growth + Finance (as clients) | `prospects` |
| `products` | Products + B2B Store + Finance + Create | `products` |
| `tasks` | Tasks + SYNC Agent | `tasks` |
| `channels/messages` | Inbox + SYNC Agent | `channels`, `messages` |
| `nests` | Talent + Growth (shared marketplace) | `nests`, `growth_nests` |
| `user_credits` | All AI-consuming features | `user_credits` |

### 3.3 Integration Points

**Composio (30+ SaaS connectors):**
- Connects Gmail, Slack, HubSpot, Salesforce, Notion, Jira, etc.
- OAuth flow managed via `composio-connect` edge function
- Webhook triggers via `composio-webhooks`
- Used by SYNC Agent for cross-platform actions

**Explorium (Data Enrichment):**
- Prospect enrichment (LinkedIn, email, phone, career data)
- Company intelligence (firmographics, technographics, funding, M&A)
- Cached globally (90-day prospect / 180-day company TTL)
- Shared cache across all organizations

**Stripe (Payments):**
- Nest purchases (Talent + Growth)
- Subscription billing
- Credit purchases

**Twilio (Communications):**
- SMS outreach (Talent campaigns)
- Phone number management
- Voice webhooks
- AI-powered SMS auto-respond

**bol.com (E-commerce Channel):**
- Product feed sync
- Order management
- Payout tracking
- Webhook processing

**Shopify (E-commerce Channel):**
- Product sync
- Order management
- Webhook handling

**AfterShip (Logistics):**
- Shipment tracking registration
- Tracking webhooks

---

## 4. API Surface

### 4.1 Supabase Edge Functions (97 total)

**SYNC & AI Core:**
| Function | Purpose |
|----------|---------|
| `sync` | Main SYNC agent (NL commands, 51 actions) |
| `sync-voice` | Voice chat |
| `sync-voice-demo` | Demo voice chat |
| `sync-meeting-wrapup` | Meeting summary generation |
| `agents` | Generic agent handler |
| `commander-chat` | Admin commander chat |
| `execute-ai-node` | AI node execution in flows |
| `invokeGrok` | Grok LLM invocation |

**Content Generation:**
| Function | Purpose |
|----------|---------|
| `generate-image` | AI image generation (FLUX models) |
| `generate-video` | AI video generation |
| `generate-podcast` | AI podcast generation |
| `generate-shot` | Scene shot generation |
| `generate-storyboard` | Video storyboard |
| `generate-fashion-video` | Fashion content |
| `enhance-prompt` | Prompt enhancement |
| `generate-social-post` | Social media posts |
| `render-video` | Video rendering |
| `assemble-video` | Video assembly |
| `generate-brand-strategy` | Brand strategy document |
| `generate-verbal-identity` | Brand verbal identity |
| `generate-visual-language` | Brand visual language |
| `generate-daily-journal` | Daily journal entry |
| `generate-user-profile` | User profile generation |
| `generate-acknowledgments` | Acknowledgment generation |

**Sync Studio (Product Photography):**
| Function | Purpose |
|----------|---------|
| `sync-studio-import-catalog` | Import product catalog |
| `sync-studio-generate-plans` | Generate photoshoot plans |
| `sync-studio-approve-plan` | Approve photoshoot plan |
| `sync-studio-execute-photoshoot` | Run photoshoot |
| `sync-studio-regenerate-shot` | Regenerate single shot |
| `sync-studio-job-progress` | Check job progress |
| `sync-studio-export-zip` | Export photos as ZIP |
| `sync-studio-update-plan` | Update photoshoot plan |
| `sync-studio-publish-bol` | Publish to bol.com |

**Enrichment & Research:**
| Function | Purpose |
|----------|---------|
| `explorium-enrich` | Prospect enrichment (with cache) |
| `exploriumPeople` | People search |
| `exploriumFirmographics` | Company firmographics |
| `generateCompanyIntelligence` | Company intel report |
| `generateCandidateIntelligence` | Candidate intel scoring |
| `auto-enrich-company` | Background company enrichment |
| `research-product` | Product research |
| `research-supplier` | Supplier research |
| `research-demo-prospect` | Demo prospect research |
| `vendor-research` | Vendor assessment |
| `scrape-product-url` | Product URL scraper |
| `scrape-job-url` | Job posting scraper |
| `scrape-embed` | Generic URL scraper |
| `search-knowledge` | Knowledge base search |

**Talent & Outreach:**
| Function | Purpose |
|----------|---------|
| `analyzeCampaignProject` | Smart AI candidate matching |
| `generateCampaignOutreach` | Outreach message generation |
| `executeTalentOutreach` | Execute outreach delivery |
| `searchJobPosting` | Job posting search |
| `purchase-nest` | Talent nest purchase |
| `upload-nest-data` | Nest data upload |
| `purchase-growth-nest` | Growth nest purchase |

**Communication:**
| Function | Purpose |
|----------|---------|
| `sms-send` | Send SMS |
| `sms-webhook` | Incoming SMS handler |
| `sms-ai-respond` | AI SMS auto-response |
| `twilio-numbers` | Phone number management |
| `twilio-token` | Twilio access token |
| `voice-webhook` | Voice call handler |
| `send-invitation-email` | Invitation emails |
| `send-invoice-email` | Invoice emails |
| `send-proposal-email` | Proposal emails |
| `send-license-email` | License emails |
| `smart-compose` | AI email composition |
| `digest-channel` | Channel digest |
| `email-invoice-import` | Email-based invoice import |
| `scheduling-orchestrator` | Calendar scheduling |

**Finance:**
| Function | Purpose |
|----------|---------|
| `finance-ai-accountant` | AI bookkeeping assistant |
| `smart-import-invoice` | AI invoice processing |

**E-commerce Integrations:**
| Function | Purpose |
|----------|---------|
| `bolcom-api` | bol.com Retailer API |
| `bolcom-webhooks` | bol.com webhook handler |
| `shopify-api` | Shopify Admin API |
| `shopify-webhooks` | Shopify webhook handler |
| `product-feed-sync` | Multi-channel product sync |
| `aftership-register` | AfterShip tracking registration |
| `aftership-webhooks` | AfterShip webhook handler |

**Reach (Marketing):**
| Function | Purpose |
|----------|---------|
| `reach-analyze-brand-voice` | Brand voice analysis |
| `reach-generate-ad-copy` | Ad copywriting |
| `reach-generate-ad-image` | Ad image generation |
| `reach-generate-ad-video` | Ad video generation (stub) |
| `reach-generate-copy` | General copy generation |
| `reach-generate-insights` | Marketing insights |
| `reach-publish-post` | Social media posting (stub) |
| `reach-fetch-metrics` | Metrics fetching (stub) |
| `reach-seo-scan` | SEO audit |

**Third-Party Integration:**
| Function | Purpose |
|----------|---------|
| `composio-connect` | Composio OAuth and tool execution |
| `composio-webhooks` | Composio webhook handler |
| `stripe-webhook` | Stripe payment webhooks |
| `revolut-sync` | Revolut bank sync |
| `github-integration` | GitHub integration |

**Billing & Admin:**
| Function | Purpose |
|----------|---------|
| `create-checkout` | Stripe checkout session |
| `create-billing-portal` | Stripe billing portal |
| `create-public-demo` | Demo environment creation |
| `admin-api` | Admin operations API |
| `health-runner` | Health check runner |
| `api-diagnostics` | API diagnostic tool |
| `getTeamMembers` | Team member listing |

**Other:**
| Function | Purpose |
|----------|---------|
| `analyze-action` | Action analysis |
| `analyze-product-campaign` | Product campaign analysis |
| `analyze-screenshots` | Screenshot analysis |
| `audit-listing` | Listing audit |
| `generate-listing-copy` | Listing copy generation |
| `publish-listing` | Listing publication |
| `embed-document` | Document embedding |
| `execute-action` | Generic action execution |
| `execute-flow-node` | Flow node execution |
| `growth-ai-execute` | Growth AI execution |
| `manage-custom-domain` | Custom domain management |
| `task-pixel` | Task tracking pixel |
| `tracking-checkpoint-manual` | Manual tracking checkpoint |
| `tracking-cycle` | Tracking cycle |
| `transcribe-audio` | Audio transcription |
| `b2b-checkout-otp` | B2B checkout OTP |
| `b2b-create-order` | B2B order creation |
| `b2b-order-webhook` | B2B order webhooks |
| `b2b-portal-api` | B2B portal API |
| `store-builder-ai` | AI store builder |

### 4.2 Frontend API Layer

**`src/api/supabaseClient.js`:** Entity wrapper providing CRUD operations (`.list()`, `.filter()`, `.get()`, `.create()`, `.update()`, `.delete()`) for all ~65 database tables via a Base44-compatible interface.

**`src/api/entities.js`:** Named exports for all entity wrappers (Activity, Course, Product, Invoice, Prospect, Candidate, etc.)

**`src/api/functions.js`:** Named exports for edge function invocations (~60 function wrappers)

**`src/api/integrations.js`:** Integration helpers (InvokeLLM, SendEmail, UploadFile, GenerateImage)

### 4.3 Service Layer

**`src/services/`:**
- `flowExecutionEngine.js` - Automation flow runtime
- `flowService.js` - Flow CRUD operations
- `flowTemplateGenerator.js` - Flow template creation
- `talentFlowTemplateGenerator.js` - Talent-specific templates
- `GrowthAIService.js` - Growth AI operations
- `agentTools.js` - Agent tool definitions
- `contextBuilder.js` - AI context assembly
- `embeddingService.js` - Text embedding
- `metrics.js` - Metrics collection
- `queueService.js` - Background job queue

---

## 5. User Workflow Inventory

### 5.1 Core Business Workflows

**Prospect to Customer (CRM + Growth + Finance):**
1. Import/research prospects (CRM or Growth)
2. Enrich with Explorium (company + contact data)
3. Run Growth campaign or manual outreach
4. Move through CRM pipeline stages
5. Convert to client -> create proposals in Finance
6. Send invoice, track payment

**Product to Sale (Products + B2B Store + Finance):**
1. Create product (physical/digital/service)
2. Set pricing, variants, images
3. Publish to B2B store and/or bol.com/Shopify
4. Receive orders via B2B portal or marketplace
5. Pick, pack, ship from Warehouse
6. Generate invoice, reconcile payment

**Recruitment Workflow (Talent):**
1. Create project and define role
2. Browse/purchase candidate nests
3. Auto-intel queues candidates for background scoring
4. Create campaign with match criteria and weights
5. AI matching produces ranked candidates with scores
6. Generate personalized outreach (email/LinkedIn/SMS)
7. Track responses, move through pipeline
8. Client exclusion prevents contacting candidates at client companies

**Content Creation Workflow (Create + Studio):**
1. Define brand assets (logo, colors, voice)
2. Generate product images with AI (FLUX models)
3. Or run AI photoshoot session with reference images
4. Generate videos, podcasts, voice content
5. Schedule via content calendar
6. Publish to social channels via Reach

**Learning Workflow (Learn):**
1. Browse course catalog or get AI recommendations
2. Enroll and work through lessons
3. Complete assessments and practice challenges
4. Track skill development on skill map
5. Earn certificates and badges
6. Team leads monitor via team dashboard

**Compliance Workflow (Sentinel):**
1. Register AI systems in inventory
2. Run risk assessment wizard (5 steps)
3. Map to compliance frameworks
4. Implement controls and collect evidence
5. Generate technical documentation (Annex IV)
6. Monitor vendor risk
7. Publish trust center

**Fundraising Workflow (Raise):**
1. Set up investor CRM
2. Enrich investor profiles
3. Create and manage pitch decks
4. Organize data room documents
5. Run fundraising campaigns
6. Track campaign progress

### 5.2 Data Generated per Workflow

| Workflow | Data Created |
|----------|-------------|
| Prospect to Customer | Prospects, enrichment data, pipeline stages, proposals, invoices |
| Product to Sale | Products, variants, orders, shipments, pallets, invoices, expenses |
| Recruitment | Candidates, intelligence scores, campaign matches, outreach messages, SMS records |
| Content Creation | Generated images/videos/podcasts, brand assets, render jobs, content calendar entries |
| Learning | Course progress, assessment results, skills, certificates, badges, gamification scores |
| Compliance | AI system records, risk assessments, obligations, evidence, policies, compliance documents |
| Fundraising | Investors, pitch decks, data room documents, campaign records |

### 5.3 SYNC Agent Touchpoints

SYNC can interact with all workflows via natural language:
- "Create an invoice for Client X for 5,000 euros"
- "Show me low stock products"
- "Add a task for the design team due Friday"
- "Generate a product image for the new collection"
- "What's my pipeline looking like?"
- "Enroll me in the AI Ethics course"
- "Search the web for competitor pricing"

---

## Appendix A: File Structure Summary

```
src/
  api/              # Supabase client, entity wrappers, function wrappers, integrations
  components/       # ~55 feature directories + shared UI components
  config/           # App configuration
  constants/        # Static constants
  contexts/         # React contexts (Theme, Credits, Keyboard, Notifications)
  data/             # Static data files
  features/         # Feature modules (brand-builder)
  hooks/            # Custom React hooks (~30 hooks)
  lib/              # Utility libraries, agent configs, constants, services
  pages/            # Page components (~180+ pages)
    admin/          # Admin panel pages (21)
    growth/         # Growth module pages (14)
    marketplace/    # Marketplace pages (3)
    portal/         # Client portal pages (18)
  remotion/         # Video rendering (Remotion framework)
  services/         # Business logic services
  styles/           # CSS/style files
  tokens/           # Design tokens
  types/            # TypeScript type definitions
  utils/            # Utility functions

supabase/
  functions/        # 97 Supabase Edge Functions
  migrations/       # Database migrations
  config.toml       # Edge function configuration
```

## Appendix B: Edge Function Count by Domain

| Domain | Count |
|--------|-------|
| SYNC & AI Core | 8 |
| Content Generation | 15 |
| Sync Studio | 8 |
| Enrichment & Research | 14 |
| Talent & Outreach | 7 |
| Communication | 14 |
| Finance | 2 |
| E-commerce | 7 |
| Reach (Marketing) | 9 |
| Third-Party Integration | 5 |
| Billing & Admin | 6 |
| Other / Utilities | 15 |
| **Total** | **~110** |

## Appendix C: Storage Buckets

| Bucket | Public | Size Limit | Purpose |
|--------|--------|------------|---------|
| `avatars` | Yes | 5MB | User profile pictures |
| `documents` | No | 50MB | Private documents |
| `attachments` | No | 25MB | Message/task attachments |
| `exports` | No | 100MB | Data exports |
| `product-images` | Yes | 10MB | Product catalog images |
| `generated-content` | Yes | Unlimited | AI-generated content |
| `brand-assets` | Yes | 10MB | Company logos & branding |
