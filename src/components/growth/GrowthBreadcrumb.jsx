import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Rocket } from 'lucide-react';

const ROUTE_NAMES = {
  '/growth/dashboard': 'Dashboard',
  '/growth/campaign/new': 'New Campaign',
  '/growth/campaigns': 'Campaigns',
  '/growth/nests': 'Select Nests',
  '/growth/workspace/setup': 'Setup Workspace',
  '/growth/research': 'Research',
  '/growth/outreach/new': 'Create Sequence',
  '/growth/signals': 'Customer Signals',
  '/growth/customers': 'Customers',
  '/growth/opportunities': 'Opportunities',
  '/GrowthDashboard': 'Dashboard',
  '/GrowthCampaignWizard': 'New Campaign',
  '/GrowthNestRecommendations': 'Select Nests',
  '/GrowthWorkspaceSetup': 'Setup Workspace',
  '/GrowthResearchWorkspace': 'Research',
  '/GrowthOutreachBuilder': 'Create Sequence',
  '/GrowthCustomerSignals': 'Customer Signals',
  '/GrowthOpportunities': 'Opportunities',
};

export default function GrowthBreadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathName = ROUTE_NAMES[location.pathname] || 'Growth';

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
      <button
        onClick={() => navigate('/growth/dashboard')}
        className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
      >
        <Rocket className="w-4 h-4" />
        Growth
      </button>
      {pathName !== 'Dashboard' && (
        <>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <span className="text-white">{pathName}</span>
        </>
      )}
    </div>
  );
}
