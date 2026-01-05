import Layout from "./Layout.jsx";

import AIAssistant from "./AIAssistant";

import AISystemInventory from "./AISystemInventory";

import Actions from "./Actions";

import Activity from "./Activity";

import ActivityTimeline from "./ActivityTimeline";

import AdminDashboard from "./AdminDashboard";

import AdminMigration from "./AdminMigration";

import Analytics from "./Analytics";

import AnalyticsDashboard from "./AnalyticsDashboard";

import Assignments from "./Assignments";

import BackendSetup from "./BackendSetup";

import BackendStatus from "./BackendStatus";

import CRMContacts from "./CRMContacts";

import Certificates from "./Certificates";

import CompanyDashboard from "./CompanyDashboard";

import CompanyInvite from "./CompanyInvite";

import CompanyProfile from "./CompanyProfile";

import ComplianceCenter from "./ComplianceCenter";

import ComplianceRoadmap from "./ComplianceRoadmap";

import ComponentShowcase from "./ComponentShowcase";

import Contacts from "./Contacts";

import CourseDetail from "./CourseDetail";

import CourseUpgrader from "./CourseUpgrader";

import Courses from "./Courses";

import Dashboard from "./Dashboard";

import Deals from "./Deals";

import DocumentGenerator from "./DocumentGenerator";

import DownloadApp from "./DownloadApp";

import Glossary from "./Glossary";

import Growth from "./Growth";

import GrowthAssistant from "./GrowthAssistant";

import GrowthCampaigns from "./GrowthCampaigns";

import GrowthPipeline from "./GrowthPipeline";

import GrowthProspects from "./GrowthProspects";

import GrowthResearch from "./GrowthResearch";

import GrowthSignals from "./GrowthSignals";

import GrowthTemplates from "./GrowthTemplates";

import Home from "./Home";

import Inbox from "./Inbox";

import Insights from "./Insights";

import Leaderboard from "./Leaderboard";

import Leads from "./Leads";

import Learn from "./Learn";

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

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AIAssistant: AIAssistant,
    
    AISystemInventory: AISystemInventory,
    
    Actions: Actions,
    
    Activity: Activity,
    
    ActivityTimeline: ActivityTimeline,
    
    AdminDashboard: AdminDashboard,
    
    AdminMigration: AdminMigration,
    
    Analytics: Analytics,
    
    AnalyticsDashboard: AnalyticsDashboard,
    
    Assignments: Assignments,
    
    BackendSetup: BackendSetup,
    
    BackendStatus: BackendStatus,
    
    CRMContacts: CRMContacts,
    
    Certificates: Certificates,
    
    CompanyDashboard: CompanyDashboard,
    
    CompanyInvite: CompanyInvite,
    
    CompanyProfile: CompanyProfile,
    
    ComplianceCenter: ComplianceCenter,
    
    ComplianceRoadmap: ComplianceRoadmap,
    
    ComponentShowcase: ComponentShowcase,
    
    Contacts: Contacts,
    
    CourseDetail: CourseDetail,
    
    CourseUpgrader: CourseUpgrader,
    
    Courses: Courses,
    
    Dashboard: Dashboard,
    
    Deals: Deals,
    
    DocumentGenerator: DocumentGenerator,
    
    DownloadApp: DownloadApp,
    
    Glossary: Glossary,
    
    Growth: Growth,
    
    GrowthAssistant: GrowthAssistant,
    
    GrowthCampaigns: GrowthCampaigns,
    
    GrowthPipeline: GrowthPipeline,
    
    GrowthProspects: GrowthProspects,
    
    GrowthResearch: GrowthResearch,
    
    GrowthSignals: GrowthSignals,
    
    GrowthTemplates: GrowthTemplates,
    
    Home: Home,
    
    Inbox: Inbox,
    
    Insights: Insights,
    
    Leaderboard: Leaderboard,
    
    Leads: Leads,
    
    Learn: Learn,
    
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
                
                    <Route path="/" element={<AIAssistant />} />
                
                
                <Route path="/AIAssistant" element={<AIAssistant />} />
                
                <Route path="/AISystemInventory" element={<AISystemInventory />} />
                
                <Route path="/Actions" element={<Actions />} />
                
                <Route path="/Activity" element={<Activity />} />
                
                <Route path="/ActivityTimeline" element={<ActivityTimeline />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/AdminMigration" element={<AdminMigration />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/AnalyticsDashboard" element={<AnalyticsDashboard />} />
                
                <Route path="/Assignments" element={<Assignments />} />
                
                <Route path="/BackendSetup" element={<BackendSetup />} />
                
                <Route path="/BackendStatus" element={<BackendStatus />} />
                
                <Route path="/CRMContacts" element={<CRMContacts />} />
                
                <Route path="/Certificates" element={<Certificates />} />
                
                <Route path="/CompanyDashboard" element={<CompanyDashboard />} />
                
                <Route path="/CompanyInvite" element={<CompanyInvite />} />
                
                <Route path="/CompanyProfile" element={<CompanyProfile />} />
                
                <Route path="/ComplianceCenter" element={<ComplianceCenter />} />
                
                <Route path="/ComplianceRoadmap" element={<ComplianceRoadmap />} />
                
                <Route path="/ComponentShowcase" element={<ComponentShowcase />} />
                
                <Route path="/Contacts" element={<Contacts />} />
                
                <Route path="/CourseDetail" element={<CourseDetail />} />
                
                <Route path="/CourseUpgrader" element={<CourseUpgrader />} />
                
                <Route path="/Courses" element={<Courses />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Deals" element={<Deals />} />
                
                <Route path="/DocumentGenerator" element={<DocumentGenerator />} />
                
                <Route path="/DownloadApp" element={<DownloadApp />} />
                
                <Route path="/Glossary" element={<Glossary />} />
                
                <Route path="/Growth" element={<Growth />} />
                
                <Route path="/GrowthAssistant" element={<GrowthAssistant />} />
                
                <Route path="/GrowthCampaigns" element={<GrowthCampaigns />} />
                
                <Route path="/GrowthPipeline" element={<GrowthPipeline />} />
                
                <Route path="/GrowthProspects" element={<GrowthProspects />} />
                
                <Route path="/GrowthResearch" element={<GrowthResearch />} />
                
                <Route path="/GrowthSignals" element={<GrowthSignals />} />
                
                <Route path="/GrowthTemplates" element={<GrowthTemplates />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Inbox" element={<Inbox />} />
                
                <Route path="/Insights" element={<Insights />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Leads" element={<Leads />} />
                
                <Route path="/Learn" element={<Learn />} />
                
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
                
                <Route path="/MCPIntegrations" element={<MCPIntegrations />} />
                
                <Route path="/OAuthCallback" element={<OAuthCallback />} />
                
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