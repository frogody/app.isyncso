/**
 * Cloud Functions Export
 *
 * This module provides a unified interface for all cloud functions.
 * Uses feature flag to switch between Base44 and Supabase backends.
 */

// Feature flag from environment
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

// Import both backends
import { base44 } from './base44Client';
import { functions as supabaseFunctions } from './supabaseClient';

/**
 * Create a function wrapper that calls either Base44 or Supabase Edge Function
 */
const createFunctionWrapper = (name) => {
  return async (params = {}) => {
    if (USE_SUPABASE) {
      return supabaseFunctions.invoke(name, params);
    } else {
      return base44.functions[name](params);
    }
  };
};

// Google Sheets integrations
export const googleSheetsAuth = createFunctionWrapper('googleSheetsAuth');
export const syncGoogleSheet = createFunctionWrapper('syncGoogleSheet');
export const googleSheetsCallback = createFunctionWrapper('googleSheetsCallback');
export const exchangeGoogleCode = createFunctionWrapper('exchangeGoogleCode');

// API Key management
export const generateApiKey = createFunctionWrapper('generateApiKey');

// Webhooks
export const zapierWebhook = createFunctionWrapper('zapierWebhook');

// Chat & AI
export const chatWithCandidates = createFunctionWrapper('chatWithCandidates');
export const claudeClient = createFunctionWrapper('claudeClient');

// Candidate management
export const assignCandidateRoundRobin = createFunctionWrapper('assignCandidateRoundRobin');
export const generateCandidateIntelligence = createFunctionWrapper('generateCandidateIntelligence');
export const bulkGenerateIntelligence = createFunctionWrapper('bulkGenerateIntelligence');
export const regenerateAllIntelligence = createFunctionWrapper('regenerateAllIntelligence');

// User & Organization management
export const inviteUser = createFunctionWrapper('inviteUser');
export const acceptInvitation = createFunctionWrapper('acceptInvitation');
export const assignUserToOrganization = createFunctionWrapper('assignUserToOrganization');
export const syncDomainUsers = createFunctionWrapper('syncDomainUsers');
export const migrateCandidatesToOrganization = createFunctionWrapper('migrateCandidatesToOrganization');
export const assignOrganizationToCandidates = createFunctionWrapper('assignOrganizationToCandidates');
export const getUsersByIds = createFunctionWrapper('getUsersByIds');
export const assignOwnersEvenly = createFunctionWrapper('assignOwnersEvenly');

// Debug functions
export const testUserData = createFunctionWrapper('testUserData');
export const debugUserEntity = createFunctionWrapper('debugUserEntity');

// Outreach
export const generateOutreachMessage = createFunctionWrapper('generateOutreachMessage');
export const createFollowUpTask = createFunctionWrapper('createFollowUpTask');
export const handleFollowUpResponse = createFunctionWrapper('handleFollowUpResponse');
export const generateFollowUpMessage = createFunctionWrapper('generateFollowUpMessage');
export const createTaskAfterFollowUp = createFunctionWrapper('createTaskAfterFollowUp');
export const clearOutreachAndTasks = createFunctionWrapper('clearOutreachAndTasks');
export const createOutreachTask = createFunctionWrapper('createOutreachTask');
export const getOutreachTasks = createFunctionWrapper('getOutreachTasks');

// File generation
export const generateFile = createFunctionWrapper('generateFile');

// MCP Tools
export const mcpToolsConfig = createFunctionWrapper('mcpToolsConfig');
export const mcpToolsHandler = createFunctionWrapper('mcpToolsHandler');
export const mcpServer = createFunctionWrapper('mcpServer');
export const generateMCPToken = createFunctionWrapper('generateMCPToken');
export const testMcpServer = createFunctionWrapper('testMcpServer');

// Google OAuth
export const googleOAuthUnified = createFunctionWrapper('googleOAuthUnified');
export const googleOAuthCallback = createFunctionWrapper('googleOAuthCallback');

// LinkedIn profile pictures
export const fetchLinkedInProfilePicture = createFunctionWrapper('fetchLinkedInProfilePicture');
export const updateCandidateProfilePictures = createFunctionWrapper('updateCandidateProfilePictures');
export const autoFetchProfilePicture = createFunctionWrapper('autoFetchProfilePicture');
export const extractLinkedInProfilePicture = createFunctionWrapper('extractLinkedInProfilePicture');
export const bulkExtractProfilePictures = createFunctionWrapper('bulkExtractProfilePictures');
export const brightDataLinkedIn = createFunctionWrapper('brightDataLinkedIn');
export const autoLoadAllProfilePictures = createFunctionWrapper('autoLoadAllProfilePictures');
export const testBrightDataConnection = createFunctionWrapper('testBrightDataConnection');

// Campaign & Project
export const analyzeCampaignProject = createFunctionWrapper('analyzeCampaignProject');
export const dailyCampaignMatching = createFunctionWrapper('dailyCampaignMatching');
export const scrapeWebsiteVacancies = createFunctionWrapper('scrapeWebsiteVacancies');
export const deepScrapeVacancies = createFunctionWrapper('deepScrapeVacancies');
export const generateCampaignOutreach = createFunctionWrapper('generateCampaignOutreach');

// Location parsing
export const parseLocationDescription = createFunctionWrapper('parseLocationDescription');

// Sync APIs (for mobile/external integrations)
export const syncGetAllCandidates = createFunctionWrapper('syncGetAllCandidates');
export const syncGetCandidateComplete = createFunctionWrapper('syncGetCandidateComplete');
export const syncGetAllCampaigns = createFunctionWrapper('syncGetAllCampaigns');
export const syncGetCampaignComplete = createFunctionWrapper('syncGetCampaignComplete');
export const syncGetDashboardAnalytics = createFunctionWrapper('syncGetDashboardAnalytics');
export const syncExportData = createFunctionWrapper('syncExportData');

// Note: Some Base44-specific functions with special characters in names
// These are mapped to valid Edge Function names when using Supabase
const specialFunctions = {
  'mcpTools/googleDrive': 'mcpToolsGoogleDrive',
  'mcpTools/googleMaps': 'mcpToolsGoogleMaps',
  'mcpTools/braveSearch': 'mcpToolsBraveSearch',
  'mcpTools/gmail': 'mcpToolsGmail',
  'utils/events': 'utilsEvents'
};

// Export special functions with sanitized names
export const mcpToolsGoogleDrive = createFunctionWrapper('mcpToolsGoogleDrive');
export const mcpToolsGoogleMaps = createFunctionWrapper('mcpToolsGoogleMaps');
export const mcpToolsBraveSearch = createFunctionWrapper('mcpToolsBraveSearch');
export const mcpToolsGmail = createFunctionWrapper('mcpToolsGmail');
export const utilsEvents = createFunctionWrapper('utilsEvents');

// Log which backend is being used (for debugging)
if (typeof window !== 'undefined') {
  console.log(`[ISYNCSO Functions] Using ${USE_SUPABASE ? 'Supabase Edge Functions' : 'Base44 Cloud Functions'}`);
}
