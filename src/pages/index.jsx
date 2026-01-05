import React, { Suspense, lazy } from "react";
import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import SyncAvatar from "@/components/ui/SyncAvatar";

// Lazy load all page components for code splitting
const Candidates = lazy(() => import("./Candidates"));
const AddCandidate = lazy(() => import("./AddCandidate"));
const Settings = lazy(() => import("./Settings"));
const Profile = lazy(() => import("./Profile"));
const Chat = lazy(() => import("./Chat"));
const OrganizationSettings = lazy(() => import("./OrganizationSettings"));
const AcceptInvite = lazy(() => import("./AcceptInvite"));
const CandidateProfile = lazy(() => import("./CandidateProfile"));
const CandidateAnalytics = lazy(() => import("./CandidateAnalytics"));
const Outreach = lazy(() => import("./Outreach"));
const Tasks = lazy(() => import("./Tasks"));
const Projects = lazy(() => import("./Projects"));
const Dashboard = lazy(() => import("./Dashboard"));
const RegenerateIntelligence = lazy(() => import("./RegenerateIntelligence"));
const OutreachTaskDetail = lazy(() => import("./OutreachTaskDetail"));
const AgentBacklog = lazy(() => import("./AgentBacklog"));
const CandidatesMobile = lazy(() => import("./CandidatesMobile"));
const Campaigns = lazy(() => import("./Campaigns"));
const OpenRoles = lazy(() => import("./OpenRoles"));
const Agents = lazy(() => import("./Agents"));
const AuthCallback = lazy(() => import("./AuthCallback"));

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

// Loading fallback component
function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg, #151A1F)' }}>
            <SyncAvatar size={48} />
        </div>
    );
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Layout currentPageName={currentPage}>
            <Suspense fallback={<PageLoader />}>
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
