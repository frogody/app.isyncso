import Layout from "./Layout.jsx";
import { CalendarBookingPage } from "@/components/inbox/booking";
import FinanceErrorWrapper from "@/components/finance/FinanceErrorWrapper";

import AIAssistant from "./AIAssistant";

import AISystemInventory from "./AISystemInventory";

import AuthCallback from "./AuthCallback";
import DesktopAuth from "./DesktopAuth";

import Login from "./Login";

import Actions from "./Actions";

import ActivityTimeline from "./ActivityTimeline";

import AdminDashboard from "./AdminDashboard";

import AdminMigration from "./AdminMigration";

import Analytics from "./Analytics";

import AnalyticsDashboard from "./AnalyticsDashboard";

import Assignments from "./Assignments";

import BackendSetup from "./BackendSetup";

import BackendStatus from "./BackendStatus";

import CRMContacts from "./CRMContacts";

import CRMCompanyProfile from "./CRMCompanyProfile";

import CRMContactProfile from "./CRMContactProfile";

import CRMDashboard from "./CRMDashboard";

import CRMPipeline from "./CRMPipeline";

import CRMCampaigns from "./CRMCampaigns";

import Certificates from "./Certificates";

import CompanyDashboard from "./CompanyDashboard";

import Credits from "./Credits";

import CompanyInvite from "./CompanyInvite";

import CompanyProfile from "./CompanyProfile";

import ComplianceCenter from "./ComplianceCenter";

import ComplianceControls from "./ComplianceControls";

import ComplianceEvidence from "./ComplianceEvidence";

import ComplianceFrameworks from "./ComplianceFrameworks";

import CompliancePolicies from "./CompliancePolicies";

import ComplianceRoadmap from "./ComplianceRoadmap";

import ComponentShowcase from "./ComponentShowcase";

import ComposioIntegrations from "./ComposioIntegrations";

// Contacts.jsx deprecated - redirects to CRMContacts

import CourseDetail from "./CourseDetail";

import CourseUpgrader from "./CourseUpgrader";

import Courses from "./Courses";

import Dashboard from "./Dashboard";

// Deals.jsx deprecated - redirects to CRMPipeline

import DesktopActivity from "./DesktopActivity";

import DailyJournal from "./DailyJournal";

import PrivacyAIAct from "./PrivacyAIAct";

import DocumentGenerator from "./DocumentGenerator";

import DownloadApp from "./DownloadApp";

import Glossary from "./Glossary";

import Growth from "./Growth";

import GrowthAssistant from "./GrowthAssistant";

import GrowthCampaigns from "./GrowthCampaigns";

import GrowthPipeline from "./GrowthPipeline";

import GrowthProspects from "./GrowthProspects";

import FinanceProposals from "./FinanceProposals";

import FinanceProposalBuilder from "./FinanceProposalBuilder";

import GrowthResearch from "./GrowthResearch";

import GrowthSignals from "./GrowthSignals";

import GrowthTemplates from "./GrowthTemplates";

import GrowthEnrich from "./growth/GrowthEnrich";

import GrowthDashboard from "./growth/GrowthDashboard";

import GrowthCampaignWizard from "./growth/GrowthCampaignWizard";

import GrowthNestRecommendations from "./growth/GrowthNestRecommendations";

import GrowthWorkspaceSetup from "./growth/GrowthWorkspaceSetup";

import GrowthResearchWorkspace from "./growth/GrowthResearchWorkspace";

import GrowthOutreachBuilder from "./growth/GrowthOutreachBuilder";

import FlowBuilder from "./FlowBuilder";
import Flows from "./growth/Flows";
import ExecutionMonitor from "./growth/ExecutionMonitor";

import GrowthCustomerSignals from "./growth/GrowthCustomerSignals";

import GrowthCampaignNests from "./growth/GrowthCampaignNests";

import GrowthCampaignReview from "./growth/GrowthCampaignReview";

import GrowthOpportunities from "./growth/GrowthOpportunities";

import Home from "./Home";

import Inbox from "./Inbox";

import Insights from "./Insights";

import Leaderboard from "./Leaderboard";

// Leads.jsx deprecated - redirects to CRMContacts?tab=lead

import Learn from "./Learn";

import LearnAITools from "./LearnAITools";

import LearnAssistant from "./LearnAssistant";

import LearnDashboard from "./LearnDashboard";

import LearningPaths from "./LearningPaths";

import LessonViewer from "./LessonViewer";

import PracticeChallenges from "./PracticeChallenges";

import TeamLearningDashboard from "./TeamLearningDashboard";

// Marketplace pages
import NestsMarketplace from "./marketplace/NestsMarketplace";
import PurchasedNests from "./marketplace/PurchasedNests";

import ManageCourses from "./ManageCourses";

import ManagerDashboard from "./ManagerDashboard";

import Onboarding from "./Onboarding";

import Projects from "./Projects";

import RecommendationsFeed from "./RecommendationsFeed";

import ReachDashboard from "./ReachDashboard";
import ReachCampaigns from "./ReachCampaigns";
import ReachCampaignBuilder from "./ReachCampaignBuilder";
import ReachCampaignDetail from "./ReachCampaignDetail";
import ReachSEO from "./ReachSEO";
import ReachCalendar from "./ReachCalendar";
import ReachCopyStudio from "./ReachCopyStudio";
import ReachBrandVoice from "./ReachBrandVoice";
import ReachSettings from "./ReachSettings";

import RiskAssessment from "./RiskAssessment";

import Sentinel from "./Sentinel";

import SentinelDashboard from "./SentinelDashboard";

import TrustCenter from "./TrustCenter";

import VendorRisk from "./VendorRisk";

import Sequences from "./Sequences";

import Settings from "./Settings";

import ShopifyCallback from "./ShopifyCallback";

import ShareView from "./ShareView";

import SkillFrameworks from "./SkillFrameworks";

import SkillMap from "./SkillMap";

import SkillsOverview from "./SkillsOverview";

import StudentDashboard from "./StudentDashboard";

import Support from "./Support";

import SystemWorkflow from "./SystemWorkflow";

import Tasks from "./Tasks";

import Templates from "./Templates";

import UserAnalytics from "./UserAnalytics";

import VerifyCertificate from "./VerifyCertificate";

import VisionTest from "./VisionTest";

import WorkflowEditor from "./WorkflowEditor";

import MCPIntegrations from "./MCPIntegrations";

import OAuthCallback from "./OAuthCallback";

// Finance.jsx removed — /Finance route redirects to FinanceDashboard

// FinanceOverview.jsx is legacy — /FinanceOverview route redirects to FinanceDashboard

import FinanceDashboard from "./FinanceDashboard";

import FinanceInvoices from "./FinanceInvoices";

import FinanceExpenses from "./FinanceExpenses";

import FinanceSubscriptions from "./FinanceSubscriptions";
import FinanceExpensesConsolidated from "./FinanceExpensesConsolidated";

import FinanceAccounts from "./FinanceAccounts";

import FinanceJournalEntries from "./FinanceJournalEntries";

import FinanceGeneralLedger from "./FinanceGeneralLedger";
import FinanceLedger from "./FinanceLedger";

import FinanceVendors from "./FinanceVendors";

import FinanceBills from "./FinanceBills";

import FinanceBillPayments from "./FinanceBillPayments";
import FinancePayables from "./FinancePayables";

import FinanceReportPL from "./FinanceReportPL";

import FinanceReportBS from "./FinanceReportBS";

import FinanceReportTB from "./FinanceReportTB";

import FinanceReportAging from "./FinanceReportAging";
import FinanceReportCashFlow from "./FinanceReportCashFlow";
import FinanceReports from "./FinanceReports";
import FinanceTaxRates from "./FinanceTaxRates";
import FinanceBTWAangifte from "./FinanceBTWAangifte";
import FinanceRecurringInvoices from "./FinanceRecurringInvoices";
import FinanceCreditNotes from "./FinanceCreditNotes";
import FinanceBankAccounts from "./FinanceBankAccounts";
import FinanceBankReconciliation from "./FinanceBankReconciliation";
import FinanceSmartImport from "./FinanceSmartImport";

import Raise from "./Raise";

import RaiseInvestors from "./RaiseInvestors";

import RaisePitchDecks from "./RaisePitchDecks";

import RaiseDataRoom from "./RaiseDataRoom";

import RaiseCampaigns from "./RaiseCampaigns";

import RaiseEnrich from "./RaiseEnrich";

import TeamManagement from "./TeamManagement";

import AgentDetail from "./AgentDetail";

import Products from "./Products";

import ProductsDigital from "./ProductsDigital";

import ProductsPhysical from "./ProductsPhysical";

import ProductsServices from "./ProductsServices";

import ProductDetail from "./ProductDetail";

import Create from "./Create";

import CreateBranding from "./CreateBranding";

import CreateImages from "./CreateImages";

import CreateVideos from "./CreateVideos";

import CreateLibrary from "./CreateLibrary";

import ContentCalendar from "./ContentCalendar";

import SyncStudioHome from "./SyncStudioHome";

import SyncStudioImport from "./SyncStudioImport";

import SyncStudioDashboard from "./SyncStudioDashboard";

import SyncStudioPhotoshoot from "./SyncStudioPhotoshoot";

import SyncStudioResults from "./SyncStudioResults";

import SyncStudioReturn from "./SyncStudioReturn";

import Studio from "./Studio";
import StudioImage from "./StudioImage";
import StudioVideo from "./StudioVideo";
import StudioPhotoshoot from "./StudioPhotoshoot";
import StudioClipshoot from "./StudioClipshoot";
import StudioTemplates from "./StudioTemplates";
import StudioLibrary from "./StudioLibrary";
import StudioPodcast from "./StudioPodcast";
import StudioVoice from "./StudioVoice";
import StudioFashionBooth from "./StudioFashionBooth";
import StudioAvatar from "./StudioAvatar";

import InventoryReceiving from "./InventoryReceiving";

import InventoryShipping from "./InventoryShipping";
import PalletBuilder from "./PalletBuilder";
import ShipmentVerification from "./ShipmentVerification";
import Warehouse from "./Warehouse";

import InventoryExpenses from "./InventoryExpenses";
import InventoryReturns from "./InventoryReturns";
import StockPurchases from "./StockPurchases";
import EmailPoolSettings from "./EmailPoolSettings";

import SyncAgent from "./SyncAgent";

import SyncPhone from "./SyncPhone";

import InventoryImport from "./InventoryImport";

import ContactsImport from "./ContactsImport";

import Integrations from "./Integrations";

import TalentDashboard from "./TalentDashboard";

import TalentDeals from "./TalentDeals";

import TalentCandidates from "./TalentCandidates";

import TalentCandidateProfile from "./TalentCandidateProfile";

import TalentCampaigns from "./TalentCampaigns";

import TalentCampaignDetail from "./TalentCampaignDetail";

import TalentProjects from "./TalentProjects";

import TalentAnalytics from "./TalentAnalytics";

import TalentClients from "./TalentClients";

import TalentNestDetail from "./TalentNestDetail";

import TalentSMSOutreach from "./TalentSMSOutreach";

// Admin Panel Pages
import AdminLayout from "@/components/admin/AdminLayout";
import PlatformAdminDashboard from "./admin/AdminDashboard";
import PlatformAdminSettings from "./admin/AdminSettings";
import PlatformAdminFeatureFlags from "./admin/AdminFeatureFlags";
import PlatformAdminAuditLogs from "./admin/AdminAuditLogs";
import PlatformAdminUsers from "./admin/AdminUsers";
import PlatformAdminOrganizations from "./admin/AdminOrganizations";
import PlatformAdminMarketplace from "./admin/AdminMarketplace";
import PlatformAdminNests from "./admin/AdminNests";
import PlatformAdminApps from "./admin/AdminApps";
import PlatformAdminAnalytics from "./admin/AdminAnalytics";
import PlatformAdminSystem from "./admin/AdminSystem";
import PlatformAdminIntegrations from "./admin/AdminIntegrations";
import PlatformAdminBilling from "./admin/AdminBilling";
import PlatformAdminContent from "./admin/AdminContent";
import PlatformAdminSupport from "./admin/AdminSupport";
import PlatformAdminAI from "./admin/AdminAI";
import PlatformAdminCredits from "./admin/AdminCredits";
import PlatformAdminGrowthNests from "./admin/AdminGrowthNests";
import PlatformAdminDemos from "./admin/AdminDemos";
import PlatformAdminRoadmap from "./admin/AdminRoadmap";
import PlatformAdminStructuralTests from "./admin/AdminStructuralTests";

import DemoExperience from "./DemoExperience";
import RequestDemo from "./RequestDemo";

import B2BStoreBuilder from "./B2BStoreBuilder";
import StoreDashboard from "./StoreDashboard";
import NotFound from "./NotFound";

// Providers needed for admin routes (since they don't use main Layout)
import { UserProvider } from "@/components/context/UserContext";
import { PermissionProvider } from "@/components/context/PermissionContext";

// Client Portal imports
import ClientProvider from "@/components/portal/ClientProvider";
import ClientLayout from "@/components/portal/ClientLayout";
import ClientLogin from "./portal/ClientLogin";
import ClientAuthCallback from "./portal/ClientAuthCallback";
import ClientDashboard from "./portal/ClientDashboard";
import ClientProjectDetail from "./portal/ClientProjectDetail";
import ClientProjects from "./portal/ClientProjects";
import ClientApprovals from "./portal/ClientApprovals";
import ClientActivity from "./portal/ClientActivity";
import WholesaleHome from "./portal/WholesaleHome";
import WholesaleCatalog from "./portal/WholesaleCatalog";
import WholesaleProduct from "./portal/WholesaleProduct";
import WholesaleCart from "./portal/WholesaleCart";
import WholesaleCheckout from "./portal/WholesaleCheckout";
import WholesaleOrders from "./portal/WholesaleOrders";
import WholesaleOrderDetail from "./portal/WholesaleOrderDetail";
import WholesaleInquiries from "./portal/WholesaleInquiries";
import WholesaleAccount from "./portal/WholesaleAccount";

import B2BOrderDetail from "@/components/b2b-admin/B2BOrderDetail";
import B2BCatalogManager from "@/components/b2b-admin/B2BCatalogManager";
import B2BInquiryManager from "@/components/b2b-admin/B2BInquiryManager";
import B2BDashboard from "@/components/b2b-admin/B2BDashboard";
import PriceListManager from "@/components/b2b-admin/PriceListManager";
import B2BOrdersManager from "@/components/b2b-admin/B2BOrdersManager";
import PriceListEditor from "@/components/b2b-admin/PriceListEditor";
import ClientGroupManager from "@/components/b2b-admin/ClientGroupManager";
import StorePreview from "./StorePreview";
import PublicStorefront from "./PublicStorefront";
import { getStoreSubdomain } from '@/lib/subdomain';

import { BrowserRouter as Router, Route, Routes, useLocation, useParams, Navigate } from 'react-router-dom';

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
    
    Analytics: Analytics,
    
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
    
    ComponentShowcase: ComponentShowcase,

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
    
    Insights: Insights,
    
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
    FinanceSmartImport: FinanceSmartImport,

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

    InventoryExpenses: InventoryExpenses,

    InventoryReturns: InventoryReturns,

    StockPurchases: StockPurchases,

    EmailPoolSettings: EmailPoolSettings,

    SyncAgent: SyncAgent,
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

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    // Public B2B Store — subdomain routing (MUST be first, before all other routes)
    if (_storeSubdomain) {
        return <PublicStorefront subdomain={_storeSubdomain} />;
    }

    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isShareRoute = location.pathname.startsWith('/share');
    const isPortalRoute = location.pathname.startsWith('/portal');

    // Share routes render without the main Layout (no sidebar for public views)
    if (isShareRoute) {
        return (
            <Routes>
                <Route path="/share/:type/:shareId" element={<ShareView />} />
            </Routes>
        );
    }

    // Demo routes - public, no auth required
    const isDemoRoute = location.pathname.startsWith('/demo') || location.pathname === '/request-demo';
    if (isDemoRoute) {
        return (
            <Routes>
                <Route path="/demo" element={<DemoExperience />} />
                <Route path="/request-demo" element={<RequestDemo />} />
            </Routes>
        );
    }

    // Public booking page - Calendly-style, no auth required
    const isBookingRoute = location.pathname.startsWith('/book');
    if (isBookingRoute) {
        return (
            <Routes>
                <Route path="/book/:username" element={<CalendarBookingPage />} />
            </Routes>
        );
    }

    // Store Preview - lightweight iframe preview for the store builder (no auth/layout)
    const isStorePreviewRoute = location.pathname.startsWith('/store-preview');
    if (isStorePreviewRoute) {
        return (
            <Routes>
                <Route path="/store-preview/:orgId/*" element={<StorePreview />} />
                <Route path="/store-preview/*" element={<StorePreview />} />
                <Route path="/store-preview/:orgId" element={<StorePreview />} />
                <Route path="/store-preview" element={<StorePreview />} />
            </Routes>
        );
    }

    // B2B Store Builder - full-screen IDE experience (no main Layout)
    const isStoreBuilderRoute = location.pathname.startsWith('/b2bstorebuilder');
    if (isStoreBuilderRoute) {
        return (
            <UserProvider>
                <PermissionProvider>
                    <Routes>
                        <Route path="/b2bstorebuilder" element={<B2BStoreBuilder />} />
                    </Routes>
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
            </ClientProvider>
        );
    }

    // Admin routes use their own AdminLayout (no main Layout wrapper)
    // Must wrap with UserProvider and PermissionProvider since they're outside Layout
    if (isAdminRoute) {
        return (
            <UserProvider>
                <PermissionProvider>
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
                </PermissionProvider>
            </UserProvider>
        );
    }

    // Check if this is a completely unknown route — render standalone 404 outside Layout
    const pathSegment = location.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
    const knownPrefixes = new Set([
      '', 'aiassistant', 'sync', 'aisysteminventory', 'authcallback', 'desktop-auth',
      'login', 'actions', 'activitytimeline', 'admindashboard', 'adminmigration',
      'analytics', 'analyticsdashboard', 'assignments', 'backendsetup', 'backendstatus',
      'crmdashboard', 'crmcontacts', 'crmpipeline', 'crmcampaigns', 'crmcompanyprofile',
      'crmcontactprofile', 'certificates', 'credits', 'companydashboard', 'companyinvite',
      'companyprofile', 'compliancecenter', 'compliancecontrols', 'complianceevidence',
      'complianceframeworks', 'compliancepolicies', 'complianceroadmap', 'componentshowcase',
      'composiointegrations', 'settings', 'contacts', 'coursedetail', 'courseupgrader',
      'courses', 'dashboard', 'deals', 'documentgenerator', 'desktopactivity',
      'dailyjournal', 'privacyaiact', 'downloadapp', 'glossary', 'growth',
      'growthassistant', 'growthcampaigns', 'growthpipeline', 'growthprospects',
      'financeproposals', 'financeproposalbuilder', 'growthresearch', 'growthsignals',
      'growthtemplates', 'growthenrich', 'growthdashboard', 'growthcampaignwizard',
      'growthnestrecommendations', 'growthworkspacesetup', 'growthresearchworkspace',
      'growthoutreachbuilder', 'growthcustomersignals', 'growthcampaignnests',
      'growthcampaignreview', 'growthopportunities', 'flowbuilder',
      'home', 'inbox', 'insights', 'leaderboard', 'leads', 'learn', 'learnaitools',
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
      'financesmartimport',
      'raise', 'raiseinvestors', 'raisepitchdecks', 'raisedataroom', 'raisecampaigns',
      'raiseenrich', 'teammanagement', 'agentdetail',
      'storedashboard', 'b2b', 'marketplace',
      'products', 'productsdigital', 'productsphysical', 'productsservices', 'productdetail',
      'create', 'createbranding', 'createimages', 'createvideos', 'createlibrary',
      'contentcalendar', 'syncstudiohome', 'syncstudio', 'syncstudioimport',
      'syncstudiodashboard', 'syncstudiophotoshoot', 'syncstudioresults', 'syncstudioreturn',
      'studio', 'studioimage', 'studiovideo', 'studiophotoshoot', 'studioclipshoot',
      'studiotemplates', 'studiolibrary', 'studiopodcast', 'studiovoice',
      'studiofashionbooth', 'studioavatar',
      'warehouse', 'inventoryreceiving', 'inventoryshipping', 'palletbuilder',
      'shipmentverification', 'stockpurchases', 'emailpoolsettings',
      'syncagent', 'syncphone', 'inventoryreturns', 'inventoryexpenses',
      'inventoryimport', 'contactsimport', 'integrations',
      'talentdashboard', 'talentclients', 'talentdeals', 'talentcandidates', 'candidates',
      'talentcandidateprofile', 'talentcampaigns', 'talentcampaigndetail',
      'talentprojects', 'talentanalytics', 'talentnests', 'talentnestdetail',
      'talentsmsoutreach', 'roles',
      'reachdashboard', 'reachperformance', 'reachcampaigns', 'reachcampaignbuilder',
      'reachcampaigndetail', 'reachseo', 'reachcalendar', 'reachcopystudio',
      'reachbrandvoice', 'reachsettings',
      'learningpaths',
    ]);
    if (pathSegment && !knownPrefixes.has(pathSegment)) {
      return <NotFound />;
    }

    return (
        <Layout currentPageName={currentPage}>
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
                
                <Route path="/Analytics" element={<Analytics />} />
                
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
                
                <Route path="/ComponentShowcase" element={<ComponentShowcase />} />

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
                
                <Route path="/Insights" element={<Insights />} />
                
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

                <Route path="/Finance" element={<FinanceErrorWrapper><FinanceDashboard /></FinanceErrorWrapper>} />

                <Route path="/FinanceOverview" element={<FinanceErrorWrapper><FinanceDashboard /></FinanceErrorWrapper>} />

                <Route path="/FinanceDashboard" element={<FinanceErrorWrapper><FinanceDashboard /></FinanceErrorWrapper>} />

                <Route path="/FinanceInvoices" element={<FinanceErrorWrapper><FinanceInvoices /></FinanceErrorWrapper>} />

                <Route path="/FinanceExpenses" element={<FinanceErrorWrapper><FinanceExpenses /></FinanceErrorWrapper>} />
                <Route path="/FinanceExpensesConsolidated" element={<FinanceErrorWrapper><FinanceExpensesConsolidated /></FinanceErrorWrapper>} />

                <Route path="/FinanceSubscriptions" element={<FinanceErrorWrapper><FinanceSubscriptions /></FinanceErrorWrapper>} />

                <Route path="/FinanceAccounts" element={<FinanceErrorWrapper><FinanceAccounts /></FinanceErrorWrapper>} />

                <Route path="/FinanceJournalEntries" element={<FinanceErrorWrapper><FinanceJournalEntries /></FinanceErrorWrapper>} />

                <Route path="/FinanceGeneralLedger" element={<FinanceErrorWrapper><FinanceGeneralLedger /></FinanceErrorWrapper>} />
                <Route path="/FinanceLedger" element={<FinanceErrorWrapper><FinanceLedger /></FinanceErrorWrapper>} />

                <Route path="/FinanceVendors" element={<FinanceErrorWrapper><FinanceVendors /></FinanceErrorWrapper>} />

                <Route path="/FinanceBills" element={<FinanceErrorWrapper><FinanceBills /></FinanceErrorWrapper>} />

                <Route path="/FinanceBillPayments" element={<FinanceErrorWrapper><FinanceBillPayments /></FinanceErrorWrapper>} />
                <Route path="/FinancePayables" element={<FinanceErrorWrapper><FinancePayables /></FinanceErrorWrapper>} />

                <Route path="/FinanceReportPL" element={<FinanceErrorWrapper><FinanceReportPL /></FinanceErrorWrapper>} />

                <Route path="/FinanceReportBS" element={<FinanceErrorWrapper><FinanceReportBS /></FinanceErrorWrapper>} />

                <Route path="/FinanceReportTB" element={<FinanceErrorWrapper><FinanceReportTB /></FinanceErrorWrapper>} />

                <Route path="/FinanceReportAging" element={<FinanceErrorWrapper><FinanceReportAging /></FinanceErrorWrapper>} />
                <Route path="/FinanceReportCashFlow" element={<FinanceErrorWrapper><FinanceReportCashFlow /></FinanceErrorWrapper>} />
                <Route path="/FinanceReports" element={<FinanceErrorWrapper><FinanceReports /></FinanceErrorWrapper>} />
                <Route path="/FinanceTaxRates" element={<FinanceErrorWrapper><FinanceTaxRates /></FinanceErrorWrapper>} />
                <Route path="/FinanceBTWAangifte" element={<FinanceErrorWrapper><FinanceBTWAangifte /></FinanceErrorWrapper>} />
                <Route path="/FinanceRecurringInvoices" element={<FinanceErrorWrapper><FinanceRecurringInvoices /></FinanceErrorWrapper>} />
                <Route path="/FinanceCreditNotes" element={<FinanceErrorWrapper><FinanceCreditNotes /></FinanceErrorWrapper>} />
                <Route path="/FinanceBankAccounts" element={<FinanceErrorWrapper><FinanceBankAccounts /></FinanceErrorWrapper>} />
                <Route path="/FinanceBankReconciliation" element={<FinanceErrorWrapper><FinanceBankReconciliation /></FinanceErrorWrapper>} />
                <Route path="/FinanceSmartImport" element={<FinanceErrorWrapper><FinanceSmartImport /></FinanceErrorWrapper>} />

                <Route path="/Raise" element={<Raise />} />

                <Route path="/RaiseInvestors" element={<RaiseInvestors />} />

                <Route path="/RaisePitchDecks" element={<RaisePitchDecks />} />

                <Route path="/RaiseDataRoom" element={<RaiseDataRoom />} />

                <Route path="/RaiseCampaigns" element={<RaiseCampaigns />} />
                <Route path="/RaiseEnrich" element={<RaiseEnrich />} />

                <Route path="/TeamManagement" element={<TeamManagement />} />

                <Route path="/AgentDetail" element={<AgentDetail />} />

                <Route path="/storedashboard" element={<StoreDashboard />} />
                <Route path="/b2b/dashboard" element={<B2BDashboard />} />
                <Route path="/b2b/orders" element={<B2BOrdersManager />} />
                <Route path="/b2b/orders/:orderId" element={<B2BOrderDetail />} />
                <Route path="/b2b/price-lists" element={<PriceListManager />} />
                <Route path="/b2b/price-lists/:id" element={<PriceListEditor />} />
                <Route path="/b2b/client-groups" element={<ClientGroupManager />} />
                <Route path="/b2b/catalog" element={<B2BCatalogManager />} />
                <Route path="/b2b/inquiries" element={<B2BInquiryManager />} />

                <Route path="/Products" element={<Products />} />

                <Route path="/ProductsDigital" element={<Navigate to="/Products?tab=digital" replace />} />

                <Route path="/ProductsPhysical" element={<Navigate to="/Products?tab=physical" replace />} />

                <Route path="/ProductsServices" element={<Navigate to="/Products?tab=service" replace />} />

                <Route path="/ProductDetail" element={<ProductDetail />} />

                <Route path="/Create" element={<Create />} />

                <Route path="/CreateBranding" element={<CreateBranding />} />

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