import Layout from "./Layout.jsx";

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

import Certificates from "./Certificates";

import CompanyDashboard from "./CompanyDashboard";

import CompanyInvite from "./CompanyInvite";

import CompanyProfile from "./CompanyProfile";

import ComplianceCenter from "./ComplianceCenter";

import ComplianceRoadmap from "./ComplianceRoadmap";

import ComponentShowcase from "./ComponentShowcase";

import ComposioIntegrations from "./ComposioIntegrations";

import Contacts from "./Contacts";

import CourseDetail from "./CourseDetail";

import CourseUpgrader from "./CourseUpgrader";

import Courses from "./Courses";

import Dashboard from "./Dashboard";

import Deals from "./Deals";

import DesktopActivity from "./DesktopActivity";

import DailyJournal from "./DailyJournal";

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

import Home from "./Home";

import Inbox from "./Inbox";

import Insights from "./Insights";

import Leaderboard from "./Leaderboard";

import Leads from "./Leads";

import Learn from "./Learn";

import LearnAITools from "./LearnAITools";

import LearnAssistant from "./LearnAssistant";

import LearnDashboard from "./LearnDashboard";

import LessonViewer from "./LessonViewer";

import ManageCourses from "./ManageCourses";

import ManagerDashboard from "./ManagerDashboard";

import Onboarding from "./Onboarding";

import Projects from "./Projects";

import RecommendationsFeed from "./RecommendationsFeed";

import RiskAssessment from "./RiskAssessment";

import Sentinel from "./Sentinel";

import SentinelDashboard from "./SentinelDashboard";

import Sequences from "./Sequences";

import Settings from "./Settings";

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

import Finance from "./Finance";

import FinanceOverview from "./FinanceOverview";

import FinanceInvoices from "./FinanceInvoices";

import FinanceExpenses from "./FinanceExpenses";

import FinanceSubscriptions from "./FinanceSubscriptions";

import Raise from "./Raise";

import RaiseInvestors from "./RaiseInvestors";

import RaisePitchDecks from "./RaisePitchDecks";

import RaiseDataRoom from "./RaiseDataRoom";

import RaiseCampaigns from "./RaiseCampaigns";

import TeamManagement from "./TeamManagement";

import Agents from "./Agents";

import AgentDetail from "./AgentDetail";

import Products from "./Products";

import ProductsDigital from "./ProductsDigital";

import ProductsPhysical from "./ProductsPhysical";

import ProductDetail from "./ProductDetail";

import CreateBranding from "./CreateBranding";

import CreateImages from "./CreateImages";

import CreateVideos from "./CreateVideos";

import CreateLibrary from "./CreateLibrary";

import InventoryReceiving from "./InventoryReceiving";

import InventoryShipping from "./InventoryShipping";

import InventoryExpenses from "./InventoryExpenses";
import StockPurchases from "./StockPurchases";

import SyncAgent from "./SyncAgent";

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

import TalentNests from "./TalentNests";

import TalentNestDetail from "./TalentNestDetail";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

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

    Certificates: Certificates,
    
    CompanyDashboard: CompanyDashboard,
    
    CompanyInvite: CompanyInvite,
    
    CompanyProfile: CompanyProfile,
    
    ComplianceCenter: ComplianceCenter,
    
    ComplianceRoadmap: ComplianceRoadmap,
    
    ComponentShowcase: ComponentShowcase,

    ComposioIntegrations: ComposioIntegrations,

    Contacts: Contacts,
    
    CourseDetail: CourseDetail,
    
    CourseUpgrader: CourseUpgrader,
    
    Courses: Courses,
    
    Dashboard: Dashboard,
    
    Deals: Deals,

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
    
    Home: Home,
    
    Inbox: Inbox,
    
    Insights: Insights,
    
    Leaderboard: Leaderboard,
    
    Leads: Leads,
    
    Learn: Learn,
    
    LearnAITools: LearnAITools,

    LearnAssistant: LearnAssistant,

    LearnDashboard: LearnDashboard,
    
    LessonViewer: LessonViewer,
    
    ManageCourses: ManageCourses,
    
    ManagerDashboard: ManagerDashboard,
    
    Onboarding: Onboarding,
    
    Projects: Projects,
    
    RecommendationsFeed: RecommendationsFeed,
    
    RiskAssessment: RiskAssessment,
    
    Sentinel: Sentinel,
    
    SentinelDashboard: SentinelDashboard,
    
    Sequences: Sequences,
    
    Settings: Settings,
    
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

    Finance: Finance,

    FinanceOverview: FinanceOverview,

    FinanceInvoices: FinanceInvoices,

    FinanceExpenses: FinanceExpenses,

    FinanceSubscriptions: FinanceSubscriptions,

    Raise: Raise,

    RaiseInvestors: RaiseInvestors,

    RaisePitchDecks: RaisePitchDecks,

    RaiseDataRoom: RaiseDataRoom,

    RaiseCampaigns: RaiseCampaigns,

    TeamManagement: TeamManagement,

    Agents: Agents,

    AgentDetail: AgentDetail,

    Products: Products,

    ProductsDigital: ProductsDigital,

    ProductsPhysical: ProductsPhysical,

    ProductDetail: ProductDetail,

    CreateBranding: CreateBranding,

    CreateImages: CreateImages,

    CreateVideos: CreateVideos,

    CreateLibrary: CreateLibrary,

    InventoryReceiving: InventoryReceiving,

    InventoryShipping: InventoryShipping,

    InventoryExpenses: InventoryExpenses,

    StockPurchases: StockPurchases,

    SyncAgent: SyncAgent,

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

    TalentNests: TalentNests,

    TalentNestDetail: TalentNestDetail,

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

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
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
                
                <Route path="/CRMContacts" element={<CRMContacts />} />

                <Route path="/CRMCompanyProfile" element={<CRMCompanyProfile />} />

                <Route path="/CRMContactProfile" element={<CRMContactProfile />} />

                <Route path="/Certificates" element={<Certificates />} />
                
                <Route path="/CompanyDashboard" element={<CompanyDashboard />} />
                
                <Route path="/CompanyInvite" element={<CompanyInvite />} />
                
                <Route path="/CompanyProfile" element={<CompanyProfile />} />
                
                <Route path="/ComplianceCenter" element={<ComplianceCenter />} />
                
                <Route path="/ComplianceRoadmap" element={<ComplianceRoadmap />} />
                
                <Route path="/ComponentShowcase" element={<ComponentShowcase />} />

                <Route path="/ComposioIntegrations" element={<Navigate to="/Integrations" replace />} />
                <Route path="/settings/integrations" element={<Navigate to="/Integrations" replace />} />

                <Route path="/Contacts" element={<Contacts />} />
                
                <Route path="/CourseDetail" element={<CourseDetail />} />
                
                <Route path="/CourseUpgrader" element={<CourseUpgrader />} />
                
                <Route path="/Courses" element={<Courses />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Deals" element={<Navigate to="/GrowthPipeline" replace />} />
                
                <Route path="/DocumentGenerator" element={<DocumentGenerator />} />

                <Route path="/DesktopActivity" element={<DesktopActivity />} />

                <Route path="/DailyJournal" element={<DailyJournal />} />

                <Route path="/DownloadApp" element={<DownloadApp />} />
                
                <Route path="/Glossary" element={<Glossary />} />
                
                <Route path="/Growth" element={<Growth />} />
                
                <Route path="/GrowthAssistant" element={<GrowthAssistant />} />
                
                <Route path="/GrowthCampaigns" element={<GrowthCampaigns />} />
                
                <Route path="/GrowthPipeline" element={<GrowthPipeline />} />
                
                <Route path="/GrowthProspects" element={<GrowthProspects />} />

                <Route path="/FinanceProposals" element={<FinanceProposals />} />

                <Route path="/FinanceProposalBuilder" element={<FinanceProposalBuilder />} />

                <Route path="/GrowthResearch" element={<GrowthResearch />} />
                
                <Route path="/GrowthSignals" element={<GrowthSignals />} />
                
                <Route path="/GrowthTemplates" element={<GrowthTemplates />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Inbox" element={<Inbox />} />
                
                <Route path="/Insights" element={<Insights />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Leads" element={<Leads />} />
                
                <Route path="/Learn" element={<Learn />} />
                
                <Route path="/LearnAITools" element={<LearnAITools />} />

                <Route path="/LearnAssistant" element={<LearnAssistant />} />

                <Route path="/LearnDashboard" element={<LearnDashboard />} />
                
                <Route path="/LessonViewer" element={<LessonViewer />} />
                
                <Route path="/ManageCourses" element={<ManageCourses />} />
                
                <Route path="/ManagerDashboard" element={<ManagerDashboard />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Projects" element={<Projects />} />
                
                <Route path="/RecommendationsFeed" element={<RecommendationsFeed />} />
                
                <Route path="/RiskAssessment" element={<RiskAssessment />} />
                
                <Route path="/Sentinel" element={<Sentinel />} />
                
                <Route path="/SentinelDashboard" element={<SentinelDashboard />} />
                
                <Route path="/Sequences" element={<Sequences />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/ShareView" element={<ShareView />} />
                
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

                <Route path="/Finance" element={<Finance />} />

                <Route path="/FinanceOverview" element={<FinanceOverview />} />

                <Route path="/FinanceInvoices" element={<FinanceInvoices />} />

                <Route path="/FinanceExpenses" element={<FinanceExpenses />} />

                <Route path="/FinanceSubscriptions" element={<FinanceSubscriptions />} />

                <Route path="/Raise" element={<Raise />} />

                <Route path="/RaiseInvestors" element={<RaiseInvestors />} />

                <Route path="/RaisePitchDecks" element={<RaisePitchDecks />} />

                <Route path="/RaiseDataRoom" element={<RaiseDataRoom />} />

                <Route path="/RaiseCampaigns" element={<RaiseCampaigns />} />

                <Route path="/TeamManagement" element={<TeamManagement />} />

                <Route path="/Agents" element={<Agents />} />

                <Route path="/AgentDetail" element={<AgentDetail />} />

                <Route path="/Products" element={<Products />} />

                <Route path="/ProductsDigital" element={<ProductsDigital />} />

                <Route path="/ProductsPhysical" element={<ProductsPhysical />} />

                <Route path="/ProductDetail" element={<ProductDetail />} />

                <Route path="/CreateBranding" element={<CreateBranding />} />

                <Route path="/CreateImages" element={<CreateImages />} />

                <Route path="/CreateVideos" element={<CreateVideos />} />

                <Route path="/CreateLibrary" element={<CreateLibrary />} />

                <Route path="/InventoryReceiving" element={<InventoryReceiving />} />

                <Route path="/InventoryShipping" element={<InventoryShipping />} />

                <Route path="/StockPurchases" element={<StockPurchases />} />

                <Route path="/SyncAgent" element={<SyncAgent />} />

                <Route path="/InventoryExpenses" element={<Navigate to="/StockPurchases" replace />} />

                <Route path="/InventoryImport" element={<InventoryImport />} />

                <Route path="/ContactsImport" element={<ContactsImport />} />

                <Route path="/Integrations" element={<Integrations />} />

                <Route path="/TalentDashboard" element={<TalentDashboard />} />

                <Route path="/TalentClients" element={<TalentClients />} />

                <Route path="/TalentDeals" element={<TalentDeals />} />

                <Route path="/TalentCandidates" element={<TalentCandidates />} />

                <Route path="/TalentCandidateProfile" element={<TalentCandidateProfile />} />

                <Route path="/TalentCampaigns" element={<TalentCampaigns />} />

                <Route path="/TalentCampaignDetail" element={<TalentCampaignDetail />} />

                <Route path="/TalentProjects" element={<TalentProjects />} />

                <Route path="/TalentAnalytics" element={<Navigate to="/TalentDashboard" replace />} />

                <Route path="/TalentNests" element={<TalentNests />} />

                <Route path="/TalentNestDetail" element={<TalentNestDetail />} />

                {/* 404 catch-all route */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                    <div className="text-center">
                      <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--txt)' }}>404</h1>
                      <p style={{ color: 'var(--muted)' }}>Page not found</p>
                    </div>
                  </div>
                } />

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