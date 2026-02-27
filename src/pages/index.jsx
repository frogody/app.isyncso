import { lazy, Suspense } from 'react';
import Layout from "./Layout.jsx";
import FinancePageWrapper from "@/components/finance/FinancePageWrapper";
const NotFound = lazy(() => import("./NotFound"));
const Dashboard = lazy(() => import("./Dashboard"));
import { UserProvider } from "@/components/context/UserContext";
import { PermissionProvider } from "@/components/context/PermissionContext";
import ClientProvider from "@/components/portal/ClientProvider";
import ClientLayout from "@/components/portal/ClientLayout";
import AdminLayout from "@/components/admin/AdminLayout";
import { getStoreSubdomain } from '@/lib/subdomain';
import { BrowserRouter as Router, Route, Routes, useLocation, useParams, Navigate } from 'react-router-dom';

// Lazy-loaded page components
const CalendarBookingPage = lazy(() => import("@/components/inbox/booking").then(m => ({ default: m.CalendarBookingPage })));
const JoinCallPage = lazy(() => import("./JoinCallPage"));
const AIAssistant = lazy(() => import("./AIAssistant"));
const AISystemInventory = lazy(() => import("./AISystemInventory"));
const AuthCallback = lazy(() => import("./AuthCallback"));
const DesktopAuth = lazy(() => import("./DesktopAuth"));
const Login = lazy(() => import("./Login"));
const Actions = lazy(() => import("./Actions"));
const ActivityTimeline = lazy(() => import("./ActivityTimeline"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminMigration = lazy(() => import("./AdminMigration"));
const AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));
const Assignments = lazy(() => import("./Assignments"));
const BackendSetup = lazy(() => import("./BackendSetup"));
const BackendStatus = lazy(() => import("./BackendStatus"));
const CRMContacts = lazy(() => import("./CRMContacts"));
const CRMCompanyProfile = lazy(() => import("./CRMCompanyProfile"));
const CRMContactProfile = lazy(() => import("./CRMContactProfile"));
const CRMDashboard = lazy(() => import("./CRMDashboard"));
const CRMPipeline = lazy(() => import("./CRMPipeline"));
const CRMCampaigns = lazy(() => import("./CRMCampaigns"));
const Certificates = lazy(() => import("./Certificates"));
const CompanyDashboard = lazy(() => import("./CompanyDashboard"));
const Credits = lazy(() => import("./Credits"));
const CompanyInvite = lazy(() => import("./CompanyInvite"));
const CompanyProfile = lazy(() => import("./CompanyProfile"));
const ComplianceCenter = lazy(() => import("./ComplianceCenter"));
const ComplianceControls = lazy(() => import("./ComplianceControls"));
const ComplianceEvidence = lazy(() => import("./ComplianceEvidence"));
const ComplianceFrameworks = lazy(() => import("./ComplianceFrameworks"));
const CompliancePolicies = lazy(() => import("./CompliancePolicies"));
const ComplianceRoadmap = lazy(() => import("./ComplianceRoadmap"));
const ComposioIntegrations = lazy(() => import("./ComposioIntegrations"));
const CourseDetail = lazy(() => import("./CourseDetail"));
const CourseUpgrader = lazy(() => import("./CourseUpgrader"));
const Courses = lazy(() => import("./Courses"));
const DesktopActivity = lazy(() => import("./DesktopActivity"));
const DailyJournal = lazy(() => import("./DailyJournal"));
const PrivacyAIAct = lazy(() => import("./PrivacyAIAct"));
const DocumentGenerator = lazy(() => import("./DocumentGenerator"));
const DownloadApp = lazy(() => import("./DownloadApp"));
const Glossary = lazy(() => import("./Glossary"));
const Growth = lazy(() => import("./Growth"));
const GrowthAssistant = lazy(() => import("./GrowthAssistant"));
const GrowthCampaigns = lazy(() => import("./GrowthCampaigns"));
const GrowthPipeline = lazy(() => import("./GrowthPipeline"));
const GrowthProspects = lazy(() => import("./GrowthProspects"));
const FinanceProposals = lazy(() => import("./FinanceProposals"));
const FinanceProposalBuilder = lazy(() => import("./FinanceProposalBuilder"));
const GrowthResearch = lazy(() => import("./GrowthResearch"));
const GrowthSignals = lazy(() => import("./GrowthSignals"));
const GrowthTemplates = lazy(() => import("./GrowthTemplates"));
const GrowthEnrich = lazy(() => import("./growth/GrowthEnrich"));
const GrowthDashboard = lazy(() => import("./growth/GrowthDashboard"));
const GrowthCampaignWizard = lazy(() => import("./growth/GrowthCampaignWizard"));
const GrowthNestRecommendations = lazy(() => import("./growth/GrowthNestRecommendations"));
const GrowthWorkspaceSetup = lazy(() => import("./growth/GrowthWorkspaceSetup"));
const GrowthResearchWorkspace = lazy(() => import("./growth/GrowthResearchWorkspace"));
const GrowthOutreachBuilder = lazy(() => import("./growth/GrowthOutreachBuilder"));
const FlowBuilder = lazy(() => import("./FlowBuilder"));
const Flows = lazy(() => import("./growth/Flows"));
const ExecutionMonitor = lazy(() => import("./growth/ExecutionMonitor"));
const GrowthCustomerSignals = lazy(() => import("./growth/GrowthCustomerSignals"));
const GrowthCampaignNests = lazy(() => import("./growth/GrowthCampaignNests"));
const GrowthCampaignReview = lazy(() => import("./growth/GrowthCampaignReview"));
const GrowthOpportunities = lazy(() => import("./growth/GrowthOpportunities"));
const Home = lazy(() => import("./Home"));
const Inbox = lazy(() => import("./Inbox"));
const Leaderboard = lazy(() => import("./Leaderboard"));
const Learn = lazy(() => import("./Learn"));
const LearnAITools = lazy(() => import("./LearnAITools"));
const LearnAssistant = lazy(() => import("./LearnAssistant"));
const LearnDashboard = lazy(() => import("./LearnDashboard"));
const LearningPaths = lazy(() => import("./LearningPaths"));
const LessonViewer = lazy(() => import("./LessonViewer"));
const PracticeChallenges = lazy(() => import("./PracticeChallenges"));
const TeamLearningDashboard = lazy(() => import("./TeamLearningDashboard"));
const NestsMarketplace = lazy(() => import("./marketplace/NestsMarketplace"));
const PurchasedNests = lazy(() => import("./marketplace/PurchasedNests"));
const ManageCourses = lazy(() => import("./ManageCourses"));
const ManagerDashboard = lazy(() => import("./ManagerDashboard"));
const Onboarding = lazy(() => import("./Onboarding"));
const Projects = lazy(() => import("./Projects"));
const RecommendationsFeed = lazy(() => import("./RecommendationsFeed"));
const ReachDashboard = lazy(() => import("./ReachDashboard"));
const ReachCampaigns = lazy(() => import("./ReachCampaigns"));
const ReachCampaignBuilder = lazy(() => import("./ReachCampaignBuilder"));
const ReachCampaignDetail = lazy(() => import("./ReachCampaignDetail"));
const ReachSEO = lazy(() => import("./ReachSEO"));
const ReachCalendar = lazy(() => import("./ReachCalendar"));
const ReachCopyStudio = lazy(() => import("./ReachCopyStudio"));
const ReachBrandVoice = lazy(() => import("./ReachBrandVoice"));
const ReachSettings = lazy(() => import("./ReachSettings"));
const RiskAssessment = lazy(() => import("./RiskAssessment"));
const Sentinel = lazy(() => import("./Sentinel"));
const SentinelDashboard = lazy(() => import("./SentinelDashboard"));
const TrustCenter = lazy(() => import("./TrustCenter"));
const VendorRisk = lazy(() => import("./VendorRisk"));
const Sequences = lazy(() => import("./Sequences"));
const Settings = lazy(() => import("./Settings"));
const ShopifyCallback = lazy(() => import("./ShopifyCallback"));
const ShareView = lazy(() => import("./ShareView"));
const SkillFrameworks = lazy(() => import("./SkillFrameworks"));
const SkillMap = lazy(() => import("./SkillMap"));
const SkillsOverview = lazy(() => import("./SkillsOverview"));
const StudentDashboard = lazy(() => import("./StudentDashboard"));
const Support = lazy(() => import("./Support"));
const SystemWorkflow = lazy(() => import("./SystemWorkflow"));
const Tasks = lazy(() => import("./Tasks"));
const Templates = lazy(() => import("./Templates"));
const UserAnalytics = lazy(() => import("./UserAnalytics"));
const VerifyCertificate = lazy(() => import("./VerifyCertificate"));
const VisionTest = lazy(() => import("./VisionTest"));
const WorkflowEditor = lazy(() => import("./WorkflowEditor"));
const MCPIntegrations = lazy(() => import("./MCPIntegrations"));
const OAuthCallback = lazy(() => import("./OAuthCallback"));
const FinanceDashboard = lazy(() => import("./FinanceDashboard"));
const FinanceInvoices = lazy(() => import("./FinanceInvoices"));
const FinanceExpenses = lazy(() => import("./FinanceExpenses"));
const FinanceSubscriptions = lazy(() => import("./FinanceSubscriptions"));
const FinanceExpensesConsolidated = lazy(() => import("./FinanceExpensesConsolidated"));
const FinanceAccounts = lazy(() => import("./FinanceAccounts"));
const FinanceJournalEntries = lazy(() => import("./FinanceJournalEntries"));
const FinanceGeneralLedger = lazy(() => import("./FinanceGeneralLedger"));
const FinanceLedger = lazy(() => import("./FinanceLedger"));
const FinanceVendors = lazy(() => import("./FinanceVendors"));
const FinanceBills = lazy(() => import("./FinanceBills"));
const FinanceBillPayments = lazy(() => import("./FinanceBillPayments"));
const FinancePayables = lazy(() => import("./FinancePayables"));
const FinanceReportPL = lazy(() => import("./FinanceReportPL"));
const FinanceReportBS = lazy(() => import("./FinanceReportBS"));
const FinanceReportTB = lazy(() => import("./FinanceReportTB"));
const FinanceReportAging = lazy(() => import("./FinanceReportAging"));
const FinanceReportCashFlow = lazy(() => import("./FinanceReportCashFlow"));
const FinanceReports = lazy(() => import("./FinanceReports"));
const FinanceTaxRates = lazy(() => import("./FinanceTaxRates"));
const FinanceBTWAangifte = lazy(() => import("./FinanceBTWAangifte"));
const FinanceRecurringInvoices = lazy(() => import("./FinanceRecurringInvoices"));
const FinanceCreditNotes = lazy(() => import("./FinanceCreditNotes"));
const FinanceBankAccounts = lazy(() => import("./FinanceBankAccounts"));
const FinanceBankReconciliation = lazy(() => import("./FinanceBankReconciliation"));
const FinanceBolcomPayouts = lazy(() => import("./FinanceBolcomPayouts"));
const FinanceSmartImport = lazy(() => import("./FinanceSmartImport"));
const FinanceReceivables = lazy(() => import("./FinanceReceivables"));
const FinanceSettings = lazy(() => import("./FinanceSettings"));
const FinanceBanking = lazy(() => import("./FinanceBanking"));
const Raise = lazy(() => import("./Raise"));
const RaiseInvestors = lazy(() => import("./RaiseInvestors"));
const RaisePitchDecks = lazy(() => import("./RaisePitchDecks"));
const RaiseDataRoom = lazy(() => import("./RaiseDataRoom"));
const RaiseCampaigns = lazy(() => import("./RaiseCampaigns"));
const RaiseEnrich = lazy(() => import("./RaiseEnrich"));
const TeamManagement = lazy(() => import("./TeamManagement"));
const AgentDetail = lazy(() => import("./AgentDetail"));
const Products = lazy(() => import("./Products"));
const ProductsDigital = lazy(() => import("./ProductsDigital"));
const ProductsPhysical = lazy(() => import("./ProductsPhysical"));
const ProductsServices = lazy(() => import("./ProductsServices"));
const ProductDetail = lazy(() => import("./ProductDetail"));
const ProductDataHealth = lazy(() => import("./ProductDataHealth"));
const Create = lazy(() => import("./Create"));
const CreateBranding = lazy(() => import("./CreateBranding"));
const BrandBuilderWizard = lazy(() => import("@/features/brand-builder/BrandBuilderWizard"));
const CreateImages = lazy(() => import("./CreateImages"));
const CreateVideos = lazy(() => import("./CreateVideos"));
const CreateLibrary = lazy(() => import("./CreateLibrary"));
const ContentCalendar = lazy(() => import("./ContentCalendar"));
const SyncStudioHome = lazy(() => import("./SyncStudioHome"));
const SyncStudioImport = lazy(() => import("./SyncStudioImport"));
const SyncStudioDashboard = lazy(() => import("./SyncStudioDashboard"));
const SyncStudioPhotoshoot = lazy(() => import("./SyncStudioPhotoshoot"));
const SyncStudioResults = lazy(() => import("./SyncStudioResults"));
const SyncStudioReturn = lazy(() => import("./SyncStudioReturn"));
const Studio = lazy(() => import("./Studio"));
const StudioImage = lazy(() => import("./StudioImage"));
const StudioVideo = lazy(() => import("./StudioVideo"));
const StudioPhotoshoot = lazy(() => import("./StudioPhotoshoot"));
const StudioClipshoot = lazy(() => import("./StudioClipshoot"));
const StudioTemplates = lazy(() => import("./StudioTemplates"));
const StudioLibrary = lazy(() => import("./StudioLibrary"));
const StudioPodcast = lazy(() => import("./StudioPodcast"));
const StudioVoice = lazy(() => import("./StudioVoice"));
const StudioFashionBooth = lazy(() => import("./StudioFashionBooth"));
const StudioAvatar = lazy(() => import("./StudioAvatar"));
const InventoryReceiving = lazy(() => import("./InventoryReceiving"));
const InventoryShipping = lazy(() => import("./InventoryShipping"));
const PalletBuilder = lazy(() => import("./PalletBuilder"));
const ShipmentVerification = lazy(() => import("./ShipmentVerification"));
const Warehouse = lazy(() => import("./Warehouse"));
const InventoryReturns = lazy(() => import("./InventoryReturns"));
const StockPurchases = lazy(() => import("./StockPurchases"));
const EmailPoolSettings = lazy(() => import("./EmailPoolSettings"));
const SyncAgent = lazy(() => import("./SyncAgent"));
const SyncProfile = lazy(() => import("./SyncProfile"));
const SyncPhone = lazy(() => import("./SyncPhone"));
const InventoryImport = lazy(() => import("./InventoryImport"));
const ContactsImport = lazy(() => import("./ContactsImport"));
const Integrations = lazy(() => import("./Integrations"));
const TalentDashboard = lazy(() => import("./TalentDashboard"));
const TalentDeals = lazy(() => import("./TalentDeals"));
const TalentCandidates = lazy(() => import("./TalentCandidates"));
const TalentCandidateProfile = lazy(() => import("./TalentCandidateProfile"));
const TalentCampaigns = lazy(() => import("./TalentCampaigns"));
const TalentCampaignDetail = lazy(() => import("./TalentCampaignDetail"));
const TalentProjects = lazy(() => import("./TalentProjects"));
const TalentAnalytics = lazy(() => import("./TalentAnalytics"));
const TalentClients = lazy(() => import("./TalentClients"));
const TalentNestDetail = lazy(() => import("./TalentNestDetail"));
const TalentSMSOutreach = lazy(() => import("./TalentSMSOutreach"));

// Admin Panel Pages (lazy)
const PlatformAdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const PlatformAdminSettings = lazy(() => import("./admin/AdminSettings"));
const PlatformAdminFeatureFlags = lazy(() => import("./admin/AdminFeatureFlags"));
const PlatformAdminAuditLogs = lazy(() => import("./admin/AdminAuditLogs"));
const PlatformAdminUsers = lazy(() => import("./admin/AdminUsers"));
const PlatformAdminOrganizations = lazy(() => import("./admin/AdminOrganizations"));
const PlatformAdminMarketplace = lazy(() => import("./admin/AdminMarketplace"));
const PlatformAdminNests = lazy(() => import("./admin/AdminNests"));
const PlatformAdminApps = lazy(() => import("./admin/AdminApps"));
const PlatformAdminAnalytics = lazy(() => import("./admin/AdminAnalytics"));
const PlatformAdminSystem = lazy(() => import("./admin/AdminSystem"));
const PlatformAdminIntegrations = lazy(() => import("./admin/AdminIntegrations"));
const PlatformAdminBilling = lazy(() => import("./admin/AdminBilling"));
const PlatformAdminContent = lazy(() => import("./admin/AdminContent"));
const PlatformAdminSupport = lazy(() => import("./admin/AdminSupport"));
const PlatformAdminAI = lazy(() => import("./admin/AdminAI"));
const PlatformAdminCredits = lazy(() => import("./admin/AdminCredits"));
const PlatformAdminGrowthNests = lazy(() => import("./admin/AdminGrowthNests"));
const PlatformAdminDemos = lazy(() => import("./admin/AdminDemos"));
const PlatformAdminRoadmap = lazy(() => import("./admin/AdminRoadmap"));
const PlatformAdminStructuralTests = lazy(() => import("./admin/AdminStructuralTests"));

const DemoExperience = lazy(() => import("./DemoExperience"));
const RequestDemo = lazy(() => import("./RequestDemo"));
const PrivacyPolicy = lazy(() => import("./PrivacyPolicy"));
const TermsOfService = lazy(() => import("./TermsOfService"));
const B2BStoreBuilder = lazy(() => import("./B2BStoreBuilder"));
const StoreDashboard = lazy(() => import("./StoreDashboard"));
const ProductSalesAnalytics = lazy(() => import("./ProductSalesAnalytics"));

// Client Portal pages (lazy)
const ClientLogin = lazy(() => import("./portal/ClientLogin"));
const ClientAuthCallback = lazy(() => import("./portal/ClientAuthCallback"));
const ClientDashboard = lazy(() => import("./portal/ClientDashboard"));
const ClientProjectDetail = lazy(() => import("./portal/ClientProjectDetail"));
const ClientProjects = lazy(() => import("./portal/ClientProjects"));
const ClientApprovals = lazy(() => import("./portal/ClientApprovals"));
const ClientActivity = lazy(() => import("./portal/ClientActivity"));
const WholesaleHome = lazy(() => import("./portal/WholesaleHome"));
const WholesaleCatalog = lazy(() => import("./portal/WholesaleCatalog"));
const WholesaleProduct = lazy(() => import("./portal/WholesaleProduct"));
const WholesaleCart = lazy(() => import("./portal/WholesaleCart"));
const WholesaleCheckout = lazy(() => import("./portal/WholesaleCheckout"));
const WholesaleOrders = lazy(() => import("./portal/WholesaleOrders"));
const WholesaleOrderDetail = lazy(() => import("./portal/WholesaleOrderDetail"));
const WholesaleInquiries = lazy(() => import("./portal/WholesaleInquiries"));
const WholesaleAccount = lazy(() => import("./portal/WholesaleAccount"));
const WholesaleTemplates = lazy(() => import("./portal/WholesaleTemplates"));
const WholesaleDashboard = lazy(() => import("./portal/WholesaleDashboard"));

// B2B Admin components (lazy)
const B2BOrderDetail = lazy(() => import("@/components/b2b-admin/B2BOrderDetail"));
const B2BCatalogManager = lazy(() => import("@/components/b2b-admin/B2BCatalogManager"));
const B2BInquiryManager = lazy(() => import("@/components/b2b-admin/B2BInquiryManager"));
const B2BStoreAccess = lazy(() => import("./B2BStoreAccess"));
const B2BDashboard = lazy(() => import("@/components/b2b-admin/B2BDashboard"));
const PriceListManager = lazy(() => import("@/components/b2b-admin/PriceListManager"));
const B2BOrdersManager = lazy(() => import("@/components/b2b-admin/B2BOrdersManager"));
const PriceListEditor = lazy(() => import("@/components/b2b-admin/PriceListEditor"));
const ClientGroupManager = lazy(() => import("@/components/b2b-admin/ClientGroupManager"));
const StorePreview = lazy(() => import("./StorePreview"));
const PublicStorefront = lazy(() => import("./PublicStorefront"));

// Redirect /marketplace/nests/:nestId to /TalentNestDetail?id=:nestId
function NestDetailRedirect() {
  const { nestId } = useParams();
  return <Navigate to={`/TalentNestDetail?id=${nestId}`} replace />;
}

const PAGES = {

    AIAssistant: AIAssistant,

    Sync: AIAssistant,

    AISystemInventory: AISystemInventory,

    AuthCallback: AuthCallback,

    Login: Login,

    Actions: Actions,

    ActivityTimeline: ActivityTimeline,

    AdminDashboard: AdminDashboard,

    AdminMigration: AdminMigration,

    AnalyticsDashboard: AnalyticsDashboard,

    Assignments: Assignments,

    BackendSetup: BackendSetup,

    BackendStatus: BackendStatus,

    CRMContacts: CRMContacts,

    CRMCompanyProfile: CRMCompanyProfile,

    CRMContactProfile: CRMContactProfile,

    CRMDashboard: CRMDashboard,

    CRMPipeline: CRMPipeline,

    CRMCampaigns: CRMCampaigns,

    Certificates: Certificates,

    CompanyDashboard: CompanyDashboard,

    CompanyInvite: CompanyInvite,

    CompanyProfile: CompanyProfile,

    ComplianceCenter: ComplianceCenter,

    ComplianceControls: ComplianceControls,

    ComplianceEvidence: ComplianceEvidence,

    ComplianceFrameworks: ComplianceFrameworks,

    CompliancePolicies: CompliancePolicies,

    ComplianceRoadmap: ComplianceRoadmap,


    ComposioIntegrations: ComposioIntegrations,

    CourseDetail: CourseDetail,

    CourseUpgrader: CourseUpgrader,

    Courses: Courses,

    Dashboard: Dashboard,
    DailyJournal: DailyJournal,

    DocumentGenerator: DocumentGenerator,

    DownloadApp: DownloadApp,

    Glossary: Glossary,

    Growth: Growth,

    GrowthAssistant: GrowthAssistant,

    GrowthCampaigns: GrowthCampaigns,

    GrowthPipeline: GrowthPipeline,

    GrowthProspects: GrowthProspects,

    FinanceProposals: FinanceProposals,

    FinanceProposalBuilder: FinanceProposalBuilder,

    GrowthResearch: GrowthResearch,

    GrowthSignals: GrowthSignals,

    GrowthTemplates: GrowthTemplates,

    GrowthEnrich: GrowthEnrich,

    GrowthDashboard: GrowthDashboard,

    GrowthCampaignWizard: GrowthCampaignWizard,

    GrowthNestRecommendations: GrowthNestRecommendations,

    GrowthWorkspaceSetup: GrowthWorkspaceSetup,

    GrowthResearchWorkspace: GrowthResearchWorkspace,

    GrowthOutreachBuilder: GrowthOutreachBuilder,
    FlowBuilder: FlowBuilder,

    GrowthCustomerSignals: GrowthCustomerSignals,

    GrowthCampaignNests: GrowthCampaignNests,

    GrowthCampaignReview: GrowthCampaignReview,

    GrowthOpportunities: GrowthOpportunities,

    Home: Home,

    Inbox: Inbox,

    Leaderboard: Leaderboard,

    Learn: Learn,

    LearnAITools: LearnAITools,

    LearnAssistant: LearnAssistant,

    LearnDashboard: LearnDashboard,

    LearningPaths: LearningPaths,

    LessonViewer: LessonViewer,

    PracticeChallenges: PracticeChallenges,

    ManageCourses: ManageCourses,

    TeamLearningDashboard: TeamLearningDashboard,

    ManagerDashboard: ManagerDashboard,

    Onboarding: Onboarding,

    Projects: Projects,

    RecommendationsFeed: RecommendationsFeed,

    RiskAssessment: RiskAssessment,

    Sentinel: Sentinel,

    SentinelDashboard: SentinelDashboard,

    TrustCenter: TrustCenter,

    VendorRisk: VendorRisk,

    Sequences: Sequences,

    Settings: Settings,

    ShopifyCallback: ShopifyCallback,

    ShareView: ShareView,

    SkillFrameworks: SkillFrameworks,

    SkillMap: SkillMap,

    SkillsOverview: SkillsOverview,

    StudentDashboard: StudentDashboard,

    Support: Support,

    SystemWorkflow: SystemWorkflow,

    Tasks: Tasks,

    Templates: Templates,

    UserAnalytics: UserAnalytics,

    VerifyCertificate: VerifyCertificate,

    VisionTest: VisionTest,

    WorkflowEditor: WorkflowEditor,

    MCPIntegrations: MCPIntegrations,

    OAuthCallback: OAuthCallback,

    Finance: FinanceDashboard,

    FinanceOverview: FinanceDashboard,

    FinanceDashboard: FinanceDashboard,

    FinanceInvoices: FinanceInvoices,

    FinanceExpenses: FinanceExpenses,
    FinanceExpensesConsolidated: FinanceExpensesConsolidated,

    FinanceSubscriptions: FinanceSubscriptions,

    FinanceAccounts: FinanceAccounts,

    FinanceJournalEntries: FinanceJournalEntries,

    FinanceGeneralLedger: FinanceGeneralLedger,
    FinanceLedger: FinanceLedger,

    FinanceVendors: FinanceVendors,

    FinanceBills: FinanceBills,

    FinanceBillPayments: FinanceBillPayments,
    FinancePayables: FinancePayables,

    FinanceReportPL: FinanceReportPL,

    FinanceReportBS: FinanceReportBS,

    FinanceReportTB: FinanceReportTB,

    FinanceReportAging: FinanceReportAging,
    FinanceReportCashFlow: FinanceReportCashFlow,
    FinanceReports: FinanceReports,
    FinanceTaxRates: FinanceTaxRates,
    FinanceBTWAangifte: FinanceBTWAangifte,
    FinanceRecurringInvoices: FinanceRecurringInvoices,
    FinanceCreditNotes: FinanceCreditNotes,
    FinanceBankAccounts: FinanceBankAccounts,
    FinanceBankReconciliation: FinanceBankReconciliation,
    FinanceBolcomPayouts: FinanceBolcomPayouts,
    FinanceSmartImport: FinanceSmartImport,
    FinanceReceivables: FinanceReceivables,
    FinanceSettings: FinanceSettings,
    FinanceBanking: FinanceBanking,

    Raise: Raise,

    RaiseInvestors: RaiseInvestors,

    RaisePitchDecks: RaisePitchDecks,

    RaiseDataRoom: RaiseDataRoom,

    RaiseCampaigns: RaiseCampaigns,

    RaiseEnrich: RaiseEnrich,

    TeamManagement: TeamManagement,

    AgentDetail: AgentDetail,

    Products: Products,

    ProductsDigital: ProductsDigital,

    ProductsPhysical: ProductsPhysical,

    ProductsServices: ProductsServices,

    ProductDetail: ProductDetail,

    ProductDataHealth: ProductDataHealth,

    Create: Create,

    CreateBranding: CreateBranding,

    CreateImages: CreateImages,

    CreateVideos: CreateVideos,

    CreateLibrary: CreateLibrary,

    ContentCalendar: ContentCalendar,

    SyncStudioHome: SyncStudioHome,

    SyncStudioImport: SyncStudioImport,

    SyncStudioDashboard: SyncStudioDashboard,
    SyncStudioPhotoshoot: SyncStudioPhotoshoot,
    SyncStudioResults: SyncStudioResults,
    SyncStudioReturn: SyncStudioReturn,

    Studio: Studio,
    StudioImage: StudioImage,
    StudioVideo: StudioVideo,
    StudioPhotoshoot: StudioPhotoshoot,
    StudioClipshoot: StudioClipshoot,
    StudioTemplates: StudioTemplates,
    StudioLibrary: StudioLibrary,
    StudioPodcast: StudioPodcast,
    StudioVoice: StudioVoice,
    StudioFashionBooth: StudioFashionBooth,
    StudioAvatar: StudioAvatar,

    InventoryReceiving: InventoryReceiving,

    InventoryShipping: InventoryShipping,

    PalletBuilder: PalletBuilder,
    ShipmentVerification: ShipmentVerification,
    Warehouse: Warehouse,

    InventoryReturns: InventoryReturns,

    StockPurchases: StockPurchases,

    EmailPoolSettings: EmailPoolSettings,

    SyncAgent: SyncAgent,
    SyncProfile: SyncProfile,
    SyncPhone: SyncPhone,

    InventoryImport: InventoryImport,

    ContactsImport: ContactsImport,

    Integrations: Integrations,

    TalentDashboard: TalentDashboard,

    TalentDeals: TalentDeals,

    TalentCandidates: TalentCandidates,

    TalentCandidateProfile: TalentCandidateProfile,

    TalentCampaigns: TalentCampaigns,

    TalentCampaignDetail: TalentCampaignDetail,

    TalentProjects: TalentProjects,

    TalentAnalytics: TalentAnalytics,

    TalentClients: TalentClients,

    TalentNestDetail: TalentNestDetail,

    TalentSMSOutreach: TalentSMSOutreach,

    ReachDashboard: ReachDashboard,
    ReachCampaigns: ReachCampaigns,
    ReachCampaignBuilder: ReachCampaignBuilder,
    ReachCampaignDetail: ReachCampaignDetail,
    ReachSEO: ReachSEO,
    ReachCalendar: ReachCalendar,
    ReachCopyStudio: ReachCopyStudio,
    ReachBrandVoice: ReachBrandVoice,
    ReachPerformance: ReachDashboard,
    ReachSettings: ReachSettings,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Detect store subdomain once at module level (hostname doesn't change)
const _storeSubdomain = getStoreSubdomain();

const PageLoadingFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
  </div>
);

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    // Public B2B Store — subdomain routing (MUST be first, before all other routes)
    if (_storeSubdomain) {
        return (
            <Suspense fallback={<PageLoadingFallback />}>
                <PublicStorefront subdomain={_storeSubdomain} />
            </Suspense>
        );
    }

    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isShareRoute = location.pathname.startsWith('/share');
    const isPortalRoute = location.pathname.startsWith('/portal');

    // Share routes render without the main Layout (no sidebar for public views)
    if (isShareRoute) {
        return (
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                    <Route path="/share/:type/:shareId" element={<ShareView />} />
                </Routes>
            </Suspense>
        );
    }

    // Demo routes - public, no auth required
    const isDemoRoute = location.pathname.startsWith('/demo') || location.pathname === '/request-demo';
    if (isDemoRoute) {
        return (
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                    <Route path="/demo" element={<DemoExperience />} />
                    <Route path="/request-demo" element={<RequestDemo />} />
                </Routes>
            </Suspense>
        );
    }

    // Legal pages - public, no auth required
    const isLegalRoute = location.pathname === '/privacy' || location.pathname === '/terms';
    if (isLegalRoute) {
        return (
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                </Routes>
            </Suspense>
        );
    }

    // Public booking page - Calendly-style, no auth required
    const isBookingRoute = location.pathname.startsWith('/book');
    if (isBookingRoute) {
        return (
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                    <Route path="/book/:username" element={<CalendarBookingPage />} />
                </Routes>
            </Suspense>
        );
    }

    // Video call join page - UserProvider needed for auth-aware join flow
    const isCallRoute = location.pathname.startsWith('/call');
    if (isCallRoute) {
        return (
            <UserProvider>
                <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                        <Route path="/call/:joinCode" element={<JoinCallPage />} />
                    </Routes>
                </Suspense>
            </UserProvider>
        );
    }

    // Store Preview - lightweight iframe preview for the store builder (no auth/layout)
    const isStorePreviewRoute = location.pathname.startsWith('/store-preview');
    if (isStorePreviewRoute) {
        return (
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                    <Route path="/store-preview/:orgId/*" element={<StorePreview />} />
                    <Route path="/store-preview/*" element={<StorePreview />} />
                    <Route path="/store-preview/:orgId" element={<StorePreview />} />
                    <Route path="/store-preview" element={<StorePreview />} />
                </Routes>
            </Suspense>
        );
    }

    // B2B Store Builder - full-screen IDE experience (no main Layout)
    const isStoreBuilderRoute = location.pathname.startsWith('/b2bstorebuilder');
    if (isStoreBuilderRoute) {
        return (
            <UserProvider>
                <PermissionProvider>
                    <Suspense fallback={<PageLoadingFallback />}>
                        <Routes>
                            <Route path="/b2bstorebuilder" element={<B2BStoreBuilder />} />
                        </Routes>
                    </Suspense>
                </PermissionProvider>
            </UserProvider>
        );
    }

    // Client Portal routes - uses ClientProvider and ClientLayout
    // URL Structure: /portal/:org/... where :org is the organization slug
    // This makes it clear each organization has its own branded portal
    if (isPortalRoute) {
        return (
            <ClientProvider>
                <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                        {/* Auth callback - org-scoped (preferred) and org-agnostic (fallback) */}
                        <Route path="/portal/:org/auth/callback" element={<ClientAuthCallback />} />
                        <Route path="/portal/auth/callback" element={<ClientAuthCallback />} />

                        {/* Wholesale store routes */}
                        <Route path="/portal/:org/shop" element={<WholesaleHome />} />
                        <Route path="/portal/:org/shop/catalog" element={<WholesaleCatalog />} />
                        <Route path="/portal/:org/shop/product/:productId" element={<WholesaleProduct />} />
                        <Route path="/portal/:org/shop/cart" element={<WholesaleCart />} />
                        <Route path="/portal/:org/shop/checkout" element={<WholesaleCheckout />} />
                        <Route path="/portal/:org/shop/orders" element={<WholesaleOrders />} />
                        <Route path="/portal/:org/shop/orders/:orderId" element={<WholesaleOrderDetail />} />
                        <Route path="/portal/:org/shop/inquiries" element={<WholesaleInquiries />} />
                        <Route path="/portal/:org/shop/account" element={<WholesaleAccount />} />
                        <Route path="/portal/:org/shop/templates" element={<WholesaleTemplates />} />
                        <Route path="/portal/:org/shop/dashboard" element={<WholesaleDashboard />} />

                        {/* Organization-scoped routes */}
                        <Route path="/portal/:org/login" element={<ClientLogin />} />
                        <Route element={<ClientLayout />}>
                            <Route path="/portal/:org" element={<ClientDashboard />} />
                            <Route path="/portal/:org/projects" element={<ClientProjects />} />
                            <Route path="/portal/:org/project/:id" element={<ClientProjectDetail />} />
                            <Route path="/portal/:org/approvals" element={<ClientApprovals />} />
                            <Route path="/portal/:org/activity" element={<ClientActivity />} />
                            <Route path="/portal/:org/settings" element={<ClientDashboard />} />
                        </Route>

                        {/* Legacy/fallback routes */}
                        <Route path="/portal/login" element={<ClientLogin />} />
                        <Route path="/portal" element={<ClientLogin />} />
                    </Routes>
                </Suspense>
            </ClientProvider>
        );
    }

    // Admin routes use their own AdminLayout (no main Layout wrapper)
    // Must wrap with UserProvider and PermissionProvider since they're outside Layout
    if (isAdminRoute) {
        return (
            <UserProvider>
                <PermissionProvider>
                    <Suspense fallback={<PageLoadingFallback />}>
                        <Routes>
                            <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<PlatformAdminDashboard />} />
                                <Route path="settings" element={<PlatformAdminSettings />} />
                                <Route path="feature-flags" element={<PlatformAdminFeatureFlags />} />
                                <Route path="audit-logs" element={<PlatformAdminAuditLogs />} />
                                <Route path="users" element={<PlatformAdminUsers />} />
                                <Route path="organizations" element={<PlatformAdminOrganizations />} />
                                <Route path="marketplace" element={<PlatformAdminMarketplace />} />
                                <Route path="nests" element={<PlatformAdminNests />} />
                                <Route path="apps" element={<PlatformAdminApps />} />
                                <Route path="analytics" element={<PlatformAdminAnalytics />} />
                                <Route path="system" element={<PlatformAdminSystem />} />
                                <Route path="integrations" element={<PlatformAdminIntegrations />} />
                                <Route path="billing" element={<PlatformAdminBilling />} />
                                <Route path="content" element={<PlatformAdminContent />} />
                                <Route path="support" element={<PlatformAdminSupport />} />
                                <Route path="ai" element={<PlatformAdminAI />} />
                                <Route path="credits" element={<PlatformAdminCredits />} />
                                <Route path="growth-nests" element={<PlatformAdminGrowthNests />} />
                                <Route path="demos" element={<PlatformAdminDemos />} />
                                <Route path="roadmap" element={<PlatformAdminRoadmap />} />
                                <Route path="structural-tests" element={<PlatformAdminStructuralTests />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </PermissionProvider>
            </UserProvider>
        );
    }

    // Check if this is a completely unknown route — render standalone 404 outside Layout
    const pathSegment = location.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
    const knownPrefixes = new Set([
      '', 'aiassistant', 'sync', 'aisysteminventory', 'authcallback', 'call', 'desktop-auth',
      'login', 'actions', 'activitytimeline', 'admindashboard', 'adminmigration',
      'analyticsdashboard', 'assignments', 'backendsetup', 'backendstatus',
      'crmdashboard', 'crmcontacts', 'crmpipeline', 'crmcampaigns', 'crmcompanyprofile',
      'crmcontactprofile', 'certificates', 'credits', 'companydashboard', 'companyinvite',
      'companyprofile', 'compliancecenter', 'compliancecontrols', 'complianceevidence',
      'complianceframeworks', 'compliancepolicies', 'complianceroadmap',
      'composiointegrations', 'settings', 'contacts', 'coursedetail', 'courseupgrader',
      'courses', 'dashboard', 'deals', 'documentgenerator', 'desktopactivity',
      'dailyjournal', 'privacyaiact', 'downloadapp', 'glossary', 'growth',
      'growthassistant', 'growthcampaigns', 'growthpipeline', 'growthprospects',
      'financeproposals', 'financeproposalbuilder', 'growthresearch', 'growthsignals',
      'growthtemplates', 'growthenrich', 'growthdashboard', 'growthcampaignwizard',
      'growthnestrecommendations', 'growthworkspacesetup', 'growthresearchworkspace',
      'growthoutreachbuilder', 'growthcustomersignals', 'growthcampaignnests',
      'growthcampaignreview', 'growthopportunities', 'flowbuilder',
      'home', 'inbox', 'leaderboard', 'leads', 'learn', 'learnaitools',
      'learnassistant', 'learndashboard', 'lessonviewer', 'practicechallenges',
      'managecourses', 'teamlearningdashboard', 'managerdashboard', 'onboarding',
      'projects', 'recommendationsfeed', 'riskassessment', 'sentinel', 'sentineldashboard',
      'trustcenter', 'vendorrisk', 'sequences', 'shopifycallback', 'skillframeworks',
      'skillmap', 'skillsoverview', 'studentdashboard', 'support', 'systemworkflow',
      'tasks', 'templates', 'useranalytics', 'verifycertificate', 'visiontest',
      'workfloweditor', 'mcpintegrations', 'oauthcallback',
      'finance', 'financeoverview', 'financedashboard', 'financeinvoices', 'financeexpenses',
      'financeexpensesconsolidated', 'financesubscriptions', 'financeaccounts',
      'financejournalentries', 'financegeneralledger', 'financeledger', 'financevendors',
      'financebills', 'financebillpayments', 'financepayables', 'financereportpl',
      'financereportbs', 'financereporttb', 'financereportaging', 'financereportcashflow',
      'financereports', 'financetaxrates', 'financebtwaangifte', 'financerecurringinvoices',
      'financecreditnotes', 'financebankaccounts', 'financebankreconciliation',
      'financebolcompayouts', 'financesmartimport',
      'financereceivables', 'financesettings', 'financebanking',
      'raise', 'raiseinvestors', 'raisepitchdecks', 'raisedataroom', 'raisecampaigns',
      'raiseenrich', 'teammanagement', 'agentdetail',
      'storedashboard', 'b2b', 'marketplace',
      'products', 'productsdigital', 'productsphysical', 'productsservices', 'productdetail', 'productdatahealth', 'productsalesanalytics',
      'create', 'createbranding', 'createimages', 'createvideos', 'createlibrary',
      'contentcalendar', 'syncstudiohome', 'syncstudio', 'syncstudioimport',
      'syncstudiodashboard', 'syncstudiophotoshoot', 'syncstudioresults', 'syncstudioreturn',
      'studio', 'studioimage', 'studiovideo', 'studiophotoshoot', 'studioclipshoot',
      'studiotemplates', 'studiolibrary', 'studiopodcast', 'studiovoice',
      'studiofashionbooth', 'studioavatar',
      'warehouse', 'inventoryreceiving', 'inventoryshipping', 'palletbuilder',
      'shipmentverification', 'stockpurchases', 'emailpoolsettings',
      'syncagent', 'syncprofile', 'syncphone', 'inventoryreturns', 'inventoryexpenses',
      'inventoryimport', 'contactsimport', 'integrations',
      'talentdashboard', 'talentclients', 'talentdeals', 'talentcandidates', 'candidates',
      'talentcandidateprofile', 'talentcampaigns', 'talentcampaigndetail',
      'talentprojects', 'talentanalytics', 'talentnests', 'talentnestdetail',
      'talentsmsoutreach', 'roles',
      'reachdashboard', 'reachperformance', 'reachcampaigns', 'reachcampaignbuilder',
      'reachcampaigndetail', 'reachseo', 'reachcalendar', 'reachcopystudio',
      'reachbrandvoice', 'reachsettings',
      'learningpaths',
      'privacy', 'terms',
    ]);
    if (pathSegment && !knownPrefixes.has(pathSegment)) {
      return <Suspense fallback={<PageLoadingFallback />}><NotFound /></Suspense>;
    }

    return (
        <Layout currentPageName={currentPage}>
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>

                    <Route path="/" element={<Dashboard />} />


                <Route path="/AIAssistant" element={<AIAssistant />} />

                <Route path="/Sync" element={<AIAssistant />} />

                <Route path="/AISystemInventory" element={<AISystemInventory />} />

                <Route path="/AuthCallback" element={<AuthCallback />} />

                <Route path="/desktop-auth" element={<DesktopAuth />} />

                <Route path="/Login" element={<Login />} />

                <Route path="/Actions" element={<Actions />} />

                <Route path="/ActivityTimeline" element={<ActivityTimeline />} />

                <Route path="/AdminDashboard" element={<AdminDashboard />} />

                <Route path="/AdminMigration" element={<AdminMigration />} />

                <Route path="/AnalyticsDashboard" element={<AnalyticsDashboard />} />

                <Route path="/Assignments" element={<Assignments />} />

                <Route path="/BackendSetup" element={<BackendSetup />} />

                <Route path="/BackendStatus" element={<BackendStatus />} />

                <Route path="/CRMDashboard" element={<CRMDashboard />} />

                <Route path="/CRMContacts" element={<CRMContacts />} />

                <Route path="/CRMPipeline" element={<CRMPipeline />} />

                <Route path="/CRMCampaigns" element={<CRMCampaigns />} />

                <Route path="/CRMCompanyProfile" element={<CRMCompanyProfile />} />

                <Route path="/CRMContactProfile" element={<CRMContactProfile />} />

                <Route path="/Certificates" element={<Certificates />} />

                <Route path="/Credits" element={<Credits />} />

                <Route path="/CompanyDashboard" element={<CompanyDashboard />} />

                <Route path="/CompanyInvite" element={<CompanyInvite />} />

                <Route path="/CompanyProfile" element={<CompanyProfile />} />

                <Route path="/ComplianceCenter" element={<ComplianceCenter />} />

                <Route path="/ComplianceControls" element={<ComplianceControls />} />

                <Route path="/ComplianceEvidence" element={<ComplianceEvidence />} />

                <Route path="/ComplianceFrameworks" element={<ComplianceFrameworks />} />

                <Route path="/CompliancePolicies" element={<CompliancePolicies />} />

                <Route path="/ComplianceRoadmap" element={<ComplianceRoadmap />} />


                <Route path="/ComposioIntegrations" element={<Navigate to="/Integrations" replace />} />
                <Route path="/settings/integrations" element={<Navigate to="/Integrations" replace />} />

                <Route path="/Contacts" element={<Navigate to="/CRMContacts" replace />} />

                <Route path="/CourseDetail" element={<CourseDetail />} />

                <Route path="/CourseUpgrader" element={<CourseUpgrader />} />

                <Route path="/Courses" element={<Courses />} />

                <Route path="/Dashboard" element={<Dashboard />} />

                <Route path="/Deals" element={<Navigate to="/CRMPipeline" replace />} />

                <Route path="/DocumentGenerator" element={<DocumentGenerator />} />

                <Route path="/DesktopActivity" element={<DesktopActivity />} />

                <Route path="/DailyJournal" element={<DailyJournal />} />

                <Route path="/PrivacyAIAct" element={<PrivacyAIAct />} />

                <Route path="/DownloadApp" element={<DownloadApp />} />

                <Route path="/Glossary" element={<Glossary />} />

                <Route path="/Growth" element={<Growth />} />

                <Route path="/GrowthAssistant" element={<GrowthAssistant />} />

                <Route path="/GrowthCampaigns" element={<GrowthCampaigns />} />
                <Route path="/growth/campaigns" element={<GrowthCampaigns />} />

                <Route path="/GrowthPipeline" element={<GrowthPipeline />} />

                <Route path="/GrowthProspects" element={<GrowthProspects />} />

                <Route path="/FinanceProposals" element={<FinanceProposals />} />

                <Route path="/FinanceProposalBuilder" element={<FinanceProposalBuilder />} />

                <Route path="/GrowthResearch" element={<GrowthResearch />} />

                <Route path="/GrowthSignals" element={<GrowthSignals />} />

                <Route path="/GrowthTemplates" element={<GrowthTemplates />} />

                <Route path="/GrowthNestsMarketplace" element={<Navigate to="/marketplace/nests" replace />} />

                <Route path="/GrowthEnrich" element={<GrowthEnrich />} />

                <Route path="/GrowthDashboard" element={<GrowthDashboard />} />
                <Route path="/growth/dashboard" element={<GrowthDashboard />} />
                <Route path="/growth" element={<Navigate to="/growth/dashboard" replace />} />

                <Route path="/GrowthCampaignWizard" element={<GrowthCampaignWizard />} />
                <Route path="/growth/campaign/new" element={<GrowthCampaignWizard />} />

                <Route path="/GrowthNestRecommendations" element={<GrowthNestRecommendations />} />
                <Route path="/growth/nests" element={<GrowthNestRecommendations />} />

                <Route path="/GrowthWorkspaceSetup" element={<GrowthWorkspaceSetup />} />
                <Route path="/growth/workspace/setup" element={<GrowthWorkspaceSetup />} />

                <Route path="/GrowthResearchWorkspace/:workspaceId" element={<GrowthResearchWorkspace />} />
                <Route path="/growth/research/:workspaceId" element={<GrowthResearchWorkspace />} />
                <Route path="/growth/research" element={<GrowthResearchWorkspace />} />

                <Route path="/GrowthOutreachBuilder" element={<GrowthOutreachBuilder />} />
                <Route path="/GrowthOutreachBuilder/:workspaceId" element={<GrowthOutreachBuilder />} />
                <Route path="/growth/outreach" element={<Navigate to="/growth/outreach/new" replace />} />
                <Route path="/growth/outreach/new" element={<GrowthOutreachBuilder />} />
                <Route path="/growth/outreach/:workspaceId" element={<GrowthOutreachBuilder />} />

                <Route path="/growth/flows" element={<Flows />} />
                <Route path="/growth/flows/new" element={<FlowBuilder />} />
                <Route path="/growth/flows/:flowId" element={<FlowBuilder />} />
                <Route path="/FlowBuilder" element={<FlowBuilder />} />
                <Route path="/FlowBuilder/:flowId" element={<FlowBuilder />} />

                <Route path="/growth/executions" element={<ExecutionMonitor />} />
                <Route path="/ExecutionMonitor" element={<ExecutionMonitor />} />

                <Route path="/GrowthCustomerSignals" element={<GrowthCustomerSignals />} />
                <Route path="/growth/signals" element={<GrowthCustomerSignals />} />
                <Route path="/growth/customers" element={<GrowthCustomerSignals />} />

                <Route path="/growth/campaign/:campaignId/nests" element={<GrowthCampaignNests />} />
                <Route path="/growth/campaign/:campaignId/enrich" element={<GrowthEnrich />} />
                <Route path="/growth/campaign/:campaignId/flow" element={<FlowBuilder />} />
                <Route path="/growth/campaign/:campaignId/review" element={<GrowthCampaignReview />} />

                <Route path="/GrowthOpportunities" element={<GrowthOpportunities />} />
                <Route path="/growth/opportunities" element={<GrowthOpportunities />} />

                <Route path="/Home" element={<Home />} />

                <Route path="/Inbox" element={<Inbox />} />

                <Route path="/Leaderboard" element={<Leaderboard />} />

                <Route path="/Leads" element={<Navigate to="/CRMContacts?tab=lead" replace />} />

                <Route path="/Learn" element={<Learn />} />

                <Route path="/LearnAITools" element={<LearnAITools />} />

                <Route path="/LearnAssistant" element={<LearnAssistant />} />

                <Route path="/LearnDashboard" element={<LearnDashboard />} />

                <Route path="/LessonViewer" element={<LessonViewer />} />

                {/* Marketplace Routes */}
                <Route path="/marketplace/nests" element={<NestsMarketplace />} />
                <Route path="/marketplace/nests/purchased" element={<PurchasedNests />} />
                <Route path="/marketplace/nests/:nestId" element={<NestDetailRedirect />} />

                <Route path="/ManageCourses" element={<ManageCourses />} />

                <Route path="/ManagerDashboard" element={<ManagerDashboard />} />

                <Route path="/Onboarding" element={<Onboarding />} />

                <Route path="/Projects" element={<Projects />} />

                <Route path="/RecommendationsFeed" element={<RecommendationsFeed />} />

                <Route path="/RiskAssessment" element={<RiskAssessment />} />

                <Route path="/Sentinel" element={<Sentinel />} />

                <Route path="/SentinelDashboard" element={<SentinelDashboard />} />

                <Route path="/TrustCenter" element={<TrustCenter />} />

                <Route path="/VendorRisk" element={<VendorRisk />} />

                <Route path="/Sequences" element={<Sequences />} />

                <Route path="/Settings" element={<Settings />} />

                <Route path="/shopifycallback" element={<ShopifyCallback />} />

                <Route path="/SkillFrameworks" element={<SkillFrameworks />} />

                <Route path="/SkillMap" element={<SkillMap />} />

                <Route path="/SkillsOverview" element={<SkillsOverview />} />

                <Route path="/StudentDashboard" element={<StudentDashboard />} />

                <Route path="/Support" element={<Support />} />

                <Route path="/SystemWorkflow" element={<SystemWorkflow />} />

                <Route path="/Tasks" element={<Tasks />} />

                <Route path="/Templates" element={<Templates />} />

                <Route path="/UserAnalytics" element={<UserAnalytics />} />

                <Route path="/VerifyCertificate" element={<VerifyCertificate />} />

                <Route path="/VisionTest" element={<VisionTest />} />

                <Route path="/WorkflowEditor" element={<WorkflowEditor />} />

                <Route path="/MCPIntegrations" element={<Navigate to="/Integrations" replace />} />

                <Route path="/OAuthCallback" element={<OAuthCallback />} />

                <Route path="/Finance" element={<FinancePageWrapper><FinanceDashboard /></FinancePageWrapper>} />

                <Route path="/FinanceOverview" element={<FinancePageWrapper><FinanceDashboard /></FinancePageWrapper>} />

                <Route path="/FinanceDashboard" element={<FinancePageWrapper><FinanceDashboard /></FinancePageWrapper>} />

                <Route path="/FinanceInvoices" element={<FinancePageWrapper><FinanceInvoices /></FinancePageWrapper>} />

                <Route path="/FinanceExpenses" element={<FinancePageWrapper><FinanceExpenses /></FinancePageWrapper>} />
                <Route path="/FinanceExpensesConsolidated" element={<FinancePageWrapper><FinanceExpensesConsolidated /></FinancePageWrapper>} />

                <Route path="/FinanceSubscriptions" element={<FinancePageWrapper><FinanceSubscriptions /></FinancePageWrapper>} />

                <Route path="/FinanceAccounts" element={<FinancePageWrapper><FinanceAccounts /></FinancePageWrapper>} />

                <Route path="/FinanceJournalEntries" element={<FinancePageWrapper><FinanceJournalEntries /></FinancePageWrapper>} />

                <Route path="/FinanceGeneralLedger" element={<FinancePageWrapper><FinanceGeneralLedger /></FinancePageWrapper>} />
                <Route path="/FinanceLedger" element={<FinancePageWrapper><FinanceLedger /></FinancePageWrapper>} />

                <Route path="/FinanceVendors" element={<FinancePageWrapper><FinanceVendors /></FinancePageWrapper>} />

                <Route path="/FinanceBills" element={<FinancePageWrapper><FinanceBills /></FinancePageWrapper>} />

                <Route path="/FinanceBillPayments" element={<FinancePageWrapper><FinanceBillPayments /></FinancePageWrapper>} />
                <Route path="/FinancePayables" element={<FinancePageWrapper><FinancePayables /></FinancePageWrapper>} />

                <Route path="/FinanceReportPL" element={<FinancePageWrapper><FinanceReportPL /></FinancePageWrapper>} />

                <Route path="/FinanceReportBS" element={<FinancePageWrapper><FinanceReportBS /></FinancePageWrapper>} />

                <Route path="/FinanceReportTB" element={<FinancePageWrapper><FinanceReportTB /></FinancePageWrapper>} />

                <Route path="/FinanceReportAging" element={<FinancePageWrapper><FinanceReportAging /></FinancePageWrapper>} />
                <Route path="/FinanceReportCashFlow" element={<FinancePageWrapper><FinanceReportCashFlow /></FinancePageWrapper>} />
                <Route path="/FinanceReports" element={<FinancePageWrapper><FinanceReports /></FinancePageWrapper>} />
                <Route path="/FinanceTaxRates" element={<FinancePageWrapper><FinanceTaxRates /></FinancePageWrapper>} />
                <Route path="/FinanceBTWAangifte" element={<FinancePageWrapper><FinanceBTWAangifte /></FinancePageWrapper>} />
                <Route path="/FinanceRecurringInvoices" element={<FinancePageWrapper><FinanceRecurringInvoices /></FinancePageWrapper>} />
                <Route path="/FinanceCreditNotes" element={<FinancePageWrapper><FinanceCreditNotes /></FinancePageWrapper>} />
                <Route path="/FinanceBankAccounts" element={<FinancePageWrapper><FinanceBankAccounts /></FinancePageWrapper>} />
                <Route path="/FinanceBankReconciliation" element={<FinancePageWrapper><FinanceBankReconciliation /></FinancePageWrapper>} />
                <Route path="/FinanceBolcomPayouts" element={<FinancePageWrapper><FinanceBolcomPayouts /></FinancePageWrapper>} />
                <Route path="/FinanceSmartImport" element={<FinancePageWrapper><FinanceSmartImport /></FinancePageWrapper>} />
                <Route path="/FinanceReceivables" element={<FinancePageWrapper><FinanceReceivables /></FinancePageWrapper>} />
                <Route path="/FinanceSettings" element={<FinancePageWrapper><FinanceSettings /></FinancePageWrapper>} />
                <Route path="/FinanceBanking" element={<FinancePageWrapper><FinanceBanking /></FinancePageWrapper>} />

                <Route path="/Raise" element={<Raise />} />

                <Route path="/RaiseInvestors" element={<RaiseInvestors />} />

                <Route path="/RaisePitchDecks" element={<RaisePitchDecks />} />

                <Route path="/RaiseDataRoom" element={<RaiseDataRoom />} />

                <Route path="/RaiseCampaigns" element={<RaiseCampaigns />} />
                <Route path="/RaiseEnrich" element={<RaiseEnrich />} />

                <Route path="/TeamManagement" element={<TeamManagement />} />

                <Route path="/AgentDetail" element={<AgentDetail />} />

                <Route path="/storedashboard" element={<StoreDashboard />} />
                <Route path="/ProductSalesAnalytics" element={<ProductSalesAnalytics />} />
                <Route path="/b2b/dashboard" element={<B2BDashboard />} />
                <Route path="/b2b/orders" element={<B2BOrdersManager />} />
                <Route path="/b2b/orders/:orderId" element={<B2BOrderDetail />} />
                <Route path="/b2b/price-lists" element={<PriceListManager />} />
                <Route path="/b2b/price-lists/:id" element={<PriceListEditor />} />
                <Route path="/b2b/client-groups" element={<ClientGroupManager />} />
                <Route path="/b2b/catalog" element={<B2BCatalogManager />} />
                <Route path="/b2b/inquiries" element={<B2BInquiryManager />} />
                <Route path="/b2b/clients" element={<B2BStoreAccess />} />

                <Route path="/Products" element={<Products />} />

                <Route path="/ProductsDigital" element={<Navigate to="/Products?tab=digital" replace />} />

                <Route path="/ProductsPhysical" element={<Navigate to="/Products?tab=physical" replace />} />

                <Route path="/ProductsServices" element={<Navigate to="/Products?tab=service" replace />} />

                <Route path="/ProductDetail" element={<ProductDetail />} />

                <Route path="/productdatahealth" element={<ProductDataHealth />} />

                <Route path="/Create" element={<Create />} />

                <Route path="/CreateBranding" element={<CreateBranding />} />

                <Route path="/create/brand-builder/:projectId" element={<BrandBuilderWizard />} />
                <Route path="/create/brand-builder/:projectId/:screen" element={<BrandBuilderWizard />} />

                <Route path="/CreateImages" element={<Navigate to="/StudioImage" replace />} />

                <Route path="/CreateVideos" element={<Navigate to="/StudioVideo" replace />} />

                <Route path="/CreateLibrary" element={<Navigate to="/StudioLibrary" replace />} />

                <Route path="/ContentCalendar" element={<ContentCalendar />} />

                <Route path="/SyncStudioHome" element={<SyncStudioHome />} />
                <Route path="/SyncStudio" element={<SyncStudioHome />} />
                <Route path="/SyncStudioImport" element={<SyncStudioImport />} />
                <Route path="/SyncStudioDashboard" element={<SyncStudioDashboard />} />
                <Route path="/SyncStudioPhotoshoot" element={<SyncStudioPhotoshoot />} />
                <Route path="/SyncStudioResults" element={<SyncStudioResults />} />
                <Route path="/SyncStudioReturn" element={<SyncStudioReturn />} />

                {/* Unified Studio routes */}
                <Route path="/Studio" element={<Navigate to="/Create" replace />} />
                <Route path="/StudioImage" element={<StudioImage />} />
                <Route path="/StudioVideo" element={<StudioVideo />} />
                <Route path="/StudioPhotoshoot" element={<StudioPhotoshoot />} />
                <Route path="/StudioClipshoot" element={<StudioClipshoot />} />
                <Route path="/StudioTemplates" element={<StudioTemplates />} />
                <Route path="/StudioLibrary" element={<StudioLibrary />} />
                <Route path="/StudioPodcast" element={<StudioPodcast />} />
                <Route path="/StudioVoice" element={<StudioVoice />} />
                <Route path="/StudioFashionBooth" element={<StudioFashionBooth />} />
                <Route path="/StudioAvatar" element={<StudioAvatar />} />

                <Route path="/Warehouse" element={<Warehouse />} />
                <Route path="/InventoryReceiving" element={<Navigate to="/Warehouse?tab=receiving" replace />} />
                <Route path="/InventoryShipping" element={<Navigate to="/Warehouse?tab=shipping" replace />} />
                <Route path="/PalletBuilder" element={<Navigate to="/Warehouse?tab=packing" replace />} />
                <Route path="/ShipmentVerification" element={<Navigate to="/Warehouse?tab=verification" replace />} />

                <Route path="/StockPurchases" element={<StockPurchases />} />

                <Route path="/EmailPoolSettings" element={<Navigate to="/Settings?tab=email-pool" replace />} />

                <Route path="/SyncAgent" element={<SyncAgent />} />
                <Route path="/SyncProfile" element={<SyncProfile />} />
                <Route path="/SyncPhone" element={<SyncPhone />} />

                <Route path="/InventoryReturns" element={<InventoryReturns />} />

                <Route path="/InventoryExpenses" element={<Navigate to="/StockPurchases" replace />} />

                <Route path="/InventoryImport" element={<InventoryImport />} />

                <Route path="/ContactsImport" element={<ContactsImport />} />

                <Route path="/Integrations" element={<Integrations />} />

                <Route path="/TalentDashboard" element={<TalentDashboard />} />

                <Route path="/TalentClients" element={<TalentClients />} />

                <Route path="/TalentDeals" element={<TalentDeals />} />

                <Route path="/TalentCandidates" element={<TalentCandidates />} />

                {/* Redirect /candidates to /TalentCandidates for convenience */}
                <Route path="/candidates" element={<Navigate to="/TalentCandidates" replace />} />

                <Route path="/TalentCandidateProfile" element={<TalentCandidateProfile />} />

                <Route path="/TalentCampaigns" element={<TalentCampaigns />} />

                {/* Lowercase alias for talent campaigns */}
                <Route path="/talentcampaigns" element={<Navigate to="/TalentCampaigns" replace />} />

                <Route path="/TalentCampaignDetail" element={<TalentCampaignDetail />} />

                <Route path="/TalentProjects" element={<TalentProjects />} />

                {/* Redirect /projects to /TalentProjects for Talent context */}
                <Route path="/talentprojects" element={<Navigate to="/TalentProjects" replace />} />

                {/* Redirect /roles - roles are managed within projects */}
                <Route path="/roles" element={<Navigate to="/TalentProjects" replace />} />

                <Route path="/TalentAnalytics" element={<Navigate to="/TalentDashboard" replace />} />

                <Route path="/TalentNests" element={<Navigate to="/marketplace/nests" replace />} />

                <Route path="/TalentNestDetail" element={<TalentNestDetail />} />

                <Route path="/TalentSMSOutreach" element={<TalentSMSOutreach />} />

                {/* Reach Marketing Hub */}
                <Route path="/ReachDashboard" element={<ReachDashboard />} />
                <Route path="/ReachPerformance" element={<ReachDashboard />} />
                <Route path="/ReachCampaigns" element={<ReachCampaigns />} />
                <Route path="/ReachCampaignBuilder" element={<ReachCampaignBuilder />} />
                <Route path="/ReachCampaignDetail" element={<ReachCampaignDetail />} />
                <Route path="/ReachSEO" element={<ReachSEO />} />
                <Route path="/ReachCalendar" element={<ReachCalendar />} />
                <Route path="/ReachCopyStudio" element={<ReachCopyStudio />} />
                <Route path="/ReachBrandVoice" element={<ReachBrandVoice />} />
                <Route path="/ReachSettings" element={<ReachSettings />} />

                {/* 404 catch-all route */}
                <Route path="*" element={<NotFound />} />

            </Routes>
            </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
