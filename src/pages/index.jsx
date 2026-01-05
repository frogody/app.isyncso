import Layout from "./Layout.jsx";

import Candidates from "./Candidates";

import AddCandidate from "./AddCandidate";

import Settings from "./Settings";

import Profile from "./Profile";

import Chat from "./Chat";

import OrganizationSettings from "./OrganizationSettings";

import AcceptInvite from "./AcceptInvite";

import CandidateProfile from "./CandidateProfile";

import CandidateAnalytics from "./CandidateAnalytics";

import Outreach from "./Outreach";

import Tasks from "./Tasks";

import Projects from "./Projects";

import Dashboard from "./Dashboard";

import RegenerateIntelligence from "./RegenerateIntelligence";

import OutreachTaskDetail from "./OutreachTaskDetail";

import AgentBacklog from "./AgentBacklog";

import CandidatesMobile from "./CandidatesMobile";

import Campaigns from "./Campaigns";

import OpenRoles from "./OpenRoles";

import Agents from "./Agents";

import AuthCallback from "./AuthCallback";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Candidates: Candidates,
    
    AddCandidate: AddCandidate,
    
    Settings: Settings,
    
    Profile: Profile,
    
    Chat: Chat,
    
    OrganizationSettings: OrganizationSettings,
    
    AcceptInvite: AcceptInvite,
    
    CandidateProfile: CandidateProfile,
    
    CandidateAnalytics: CandidateAnalytics,
    
    Outreach: Outreach,
    
    Tasks: Tasks,
    
    Projects: Projects,
    
    Dashboard: Dashboard,
    
    RegenerateIntelligence: RegenerateIntelligence,
    
    OutreachTaskDetail: OutreachTaskDetail,
    
    AgentBacklog: AgentBacklog,
    
    CandidatesMobile: CandidatesMobile,
    
    Campaigns: Campaigns,
    
    OpenRoles: OpenRoles,
    
    Agents: Agents,

    AuthCallback: AuthCallback,

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
                
                    <Route path="/" element={<Candidates />} />
                
                
                <Route path="/Candidates" element={<Candidates />} />
                
                <Route path="/AddCandidate" element={<AddCandidate />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/Chat" element={<Chat />} />
                
                <Route path="/OrganizationSettings" element={<OrganizationSettings />} />
                
                <Route path="/AcceptInvite" element={<AcceptInvite />} />
                
                <Route path="/CandidateProfile" element={<CandidateProfile />} />
                
                <Route path="/CandidateAnalytics" element={<CandidateAnalytics />} />
                
                <Route path="/Outreach" element={<Outreach />} />
                
                <Route path="/Tasks" element={<Tasks />} />
                
                <Route path="/Projects" element={<Projects />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/RegenerateIntelligence" element={<RegenerateIntelligence />} />
                
                <Route path="/OutreachTaskDetail" element={<OutreachTaskDetail />} />
                
                <Route path="/AgentBacklog" element={<AgentBacklog />} />
                
                <Route path="/CandidatesMobile" element={<CandidatesMobile />} />
                
                <Route path="/Campaigns" element={<Campaigns />} />
                
                <Route path="/OpenRoles" element={<OpenRoles />} />
                
                <Route path="/Agents" element={<Agents />} />

                <Route path="/auth/callback" element={<AuthCallback />} />

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