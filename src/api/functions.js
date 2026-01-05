/**
 * Edge Functions Wrapper
 * Provides exports for all Supabase Edge Functions
 */
import { functions } from './supabaseClient';

// Helper to create a function wrapper
const createFunction = (name) => async (params) => {
  return functions.invoke(name, params);
};

// Activity functions
export const activitySession = createFunction('activity/session');
export const activitySkillApplication = createFunction('activity/skillApplication');

// Recommendations functions
export const recommendationsNextCourse = createFunction('recommendations/nextCourse');
export const recommendationsPracticeChallenge = createFunction('recommendations/practiceChallenge');

// User functions
export const userSkillGap = createFunction('user/skillGap');
export const userDashboard = createFunction('user/dashboard');

// Auth functions
export const authDevice = createFunction('auth/device');

// Automation functions
export const automationSkillDecay = createFunction('automation/skillDecay');
export const automationProgressCelebration = createFunction('automation/progressCelebration');
export const automationSkillGapPriority = createFunction('automation/skillGapPriority');
export const automationWeeklyReport = createFunction('automation/weeklyReport');

// Course functions
export const courseGenerateFromActivity = createFunction('course/generateFromActivity');
export const parsePdfCourses = createFunction('parsePdfCourses');
export const createCourseFromTemplate = createFunction('createCourseFromTemplate');

// Explorium functions
export const exploriumPeople = createFunction('exploriumPeople');
export const exploriumFirmographics = createFunction('exploriumFirmographics');
export const exploriumTechnographics = createFunction('exploriumTechnographics');
export const exploriumFunding = createFunction('exploriumFunding');
export const exploriumCompanies = createFunction('exploriumCompanies');

// Utils functions
export const utilsValidation = createFunction('utils/validation');

// Context functions
export const getUserContext = createFunction('getUserContext');
export const getCompanyContext = createFunction('getCompanyContext');

// Company functions
export const researchCompany = createFunction('researchCompany');
export const getCompanyUsers = createFunction('getCompanyUsers');
export const refreshCompanyEnrichment = createFunction('refreshCompanyEnrichment');
export const enrichCompanyFromExplorium = createFunction('enrichCompanyFromExplorium');
export const enrichCompanyProfile = createFunction('enrichCompanyProfile');

// Credits functions
export const initializeUserCredits = createFunction('initializeUserCredits');
export const addCreditsToUsers = createFunction('addCreditsToUsers');
export const grantOnboardingCredits = createFunction('grantOnboardingCredits');
export const adminAddCredits = createFunction('adminAddCredits');

// Template/Course generation functions
export const generateTemplateCourseContent = createFunction('generateTemplateCourseContent');
export const populateAllTemplateCourses = createFunction('populateAllTemplateCourses');
export const personalizeCourse = createFunction('personalizeCourse');
export const generateTemplateLibrary = createFunction('generateTemplateLibrary');
export const importCourseTemplates = createFunction('importCourseTemplates');
export const importTemplates = createFunction('importTemplates');
export const verifyCourseLibrary = createFunction('verifyCourseLibrary');
export const batchImportTemplates = createFunction('batchImportTemplates');
export const replaceCourseLibrary = createFunction('replaceCourseLibrary');

// Sentinel AI functions
export const getCompanyAISystems = createFunction('getCompanyAISystems');
export const getSystemObligations = createFunction('getSystemObligations');
export const getComplianceOverview = createFunction('getComplianceOverview');
export const analyzeAISystem = createFunction('analyzeAISystem');
export const createComplianceTrainingRecommendation = createFunction('createComplianceTrainingRecommendation');
export const getSentinelLearningRecommendations = createFunction('getSentinelLearningRecommendations');

// Prospect functions
export const saveProspectList = createFunction('saveProspectList');
export const searchProspects = createFunction('searchProspects');

// Email functions
export const verifyEmail = createFunction('verifyEmail');
export const verifyEmailsBulk = createFunction('verifyEmailsBulk');

// ICP Template functions
export const saveICPTemplate = createFunction('saveICPTemplate');
export const getICPTemplates = createFunction('getICPTemplates');
export const loadICPTemplate = createFunction('loadICPTemplate');

// Export functions
export const exportForSalesforce = createFunction('exportForSalesforce');
export const exportForHubSpot = createFunction('exportForHubSpot');

// Gamification functions
export const updateGamification = createFunction('updateGamification');
export const getLeaderboard = createFunction('getLeaderboard');
export const generateCertificate = createFunction('generateCertificate');

// Skills functions
export const updateUserSkills = createFunction('updateUserSkills');
export const getUserSkillMap = createFunction('getUserSkillMap');

// Migration functions
export const migrateCompanyData = createFunction('migrateCompanyData');
export const verifyMigration = createFunction('verifyMigration');

// Settings functions
export const getUserSettings = createFunction('getUserSettings');
export const updateUserSettings = createFunction('updateUserSettings');
export const calculateProfileCompleteness = createFunction('calculateProfileCompleteness');

// Account functions
export const deleteUserAccount = createFunction('deleteUserAccount');
export const deleteUser = createFunction('deleteUser');

// Audio/Voice functions
export const generateLessonAudio = createFunction('generateLessonAudio');
export const voiceChat = createFunction('voiceChat');
export const generateVoice = createFunction('generateVoice');
export const generateVoiceStream = createFunction('generateVoiceStream');
export const voiceChatx = createFunction('voiceChatx');

// Analytics functions
export const getTeamAnalytics = createFunction('getTeamAnalytics');
export const getTeamMembers = createFunction('getTeamMembers');

// Content functions
export const remixContent = createFunction('remixContent');

// Vision functions
export const analyzeScreenWithClaude = createFunction('analyzeScreenWithClaude');

// Clay/Growth functions
export const generateClaySuggestions = createFunction('generateClaySuggestions');

// Merge Integration functions
export const mergeCreateLinkToken = createFunction('mergeCreateLinkToken');
export const mergeExchangeToken = createFunction('mergeExchangeToken');
export const mergeExecuteAction = createFunction('mergeExecuteAction');
export const mergeDisconnect = createFunction('mergeDisconnect');
export const mergeCheckLinkedAccount = createFunction('mergeCheckLinkedAccount');

// Assistant functions
export const personalAssistant = createFunction('personalAssistant');

// LinkedIn functions
export const enrichLinkedInProfile = createFunction('enrichLinkedInProfile');

// Lib functions
export const libContextGatherer = createFunction('lib/contextGatherer');

// Legacy function name mappings for backwards compatibility
// (allows old code using base44.functions['activity/session'] to continue working)
export const functionMap = {
  'activity/session': activitySession,
  'activity/skillApplication': activitySkillApplication,
  'recommendations/nextCourse': recommendationsNextCourse,
  'recommendations/practiceChallenge': recommendationsPracticeChallenge,
  'user/skillGap': userSkillGap,
  'user/dashboard': userDashboard,
  'auth/device': authDevice,
  'automation/skillDecay': automationSkillDecay,
  'automation/progressCelebration': automationProgressCelebration,
  'automation/skillGapPriority': automationSkillGapPriority,
  'automation/weeklyReport': automationWeeklyReport,
  'course/generateFromActivity': courseGenerateFromActivity,
  'utils/validation': utilsValidation,
  'lib/contextGatherer': libContextGatherer,
};
