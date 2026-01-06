import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";

import {
  WelcomeStep,
  LinkedInStep,
  CompanyStep,
  GoalsStep,
  AnalysisStep,
  ReviewStep,
  ProgressIndicator
} from "@/components/onboarding/OnboardingSteps";
import { AppsSetupStep } from "@/components/onboarding/AppsSetupStep";

// Helper to get default widgets based on selected apps
const getDefaultWidgetsForApps = (apps) => {
  const widgets = ['actions_recent', 'quick_actions'];
  if (apps.includes('learn')) widgets.push('learn_progress', 'learn_stats');
  if (apps.includes('growth')) widgets.push('growth_pipeline', 'growth_stats', 'growth_deals');
  if (apps.includes('sentinel')) widgets.push('sentinel_compliance', 'sentinel_systems');
  return widgets;
};

const ANALYSIS_MESSAGES = [
  "Researching your profile...",
  "Scanning company information...",
  "Analyzing your industry...",
  "Identifying relevant AI use cases...",
  "Mapping skills to your role...",
  "Building personalized roadmap...",
  "Preparing your dashboard..."
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisMessage, setCurrentAnalysisMessage] = useState(ANALYSIS_MESSAGES[0]);
  const [dossier, setDossier] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [companyEnrichment, setCompanyEnrichment] = useState(null); // Explorium data
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [existingCompany, setExistingCompany] = useState(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    experienceLevel: 'intermediate',
    linkedinUrl: '',
    companyName: '',
    companyWebsite: '',
    companySize: '',
    industry: '',
    selectedGoals: [],
    selectedApps: null, // Will be auto-populated based on goals
  });

  // Check if user was invited (already has company_id)
  React.useEffect(() => {
    const checkInvitedUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.company_id) {
          // User has a company_id - they were invited!
          // Mark as invited FIRST, even if company load fails
          setIsInvitedUser(true);
          console.log('[Onboarding] User has company_id, marking as invited user:', user.company_id);

          // Try to load company data for pre-filling form
          try {
            const company = await base44.entities.Company.get(user.company_id);
            if (company) {
              setExistingCompany(company);
              // Pre-fill form with company data
              setFormData(prev => ({
                ...prev,
                fullName: user.full_name || '',
                companyName: company.name || '',
                companyWebsite: company.domain || company.website || '',
                companySize: company.size_range || '',
                industry: company.industry || '',
              }));
              console.log('[Onboarding] Company loaded successfully:', company.name);
            } else {
              // Company couldn't be loaded but user IS invited
              // Just pre-fill what we can from user data
              setFormData(prev => ({
                ...prev,
                fullName: user.full_name || '',
              }));
              console.warn('[Onboarding] Company not found but user has company_id - still treating as invited');
            }
          } catch (companyError) {
            // Company load failed (possibly RLS) but user IS still invited
            console.warn('[Onboarding] Failed to load company (RLS?), but user has company_id:', companyError);
            setFormData(prev => ({
              ...prev,
              fullName: user.full_name || '',
            }));
          }
        }
      } catch (error) {
        console.error('[Onboarding] Error checking invited user:', error);
      } finally {
        setInitialCheckDone(true);
      }
    };
    checkInvitedUser();
  }, []);

  // Update form data
  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Simplified analysis messages for invited users
  const INVITED_USER_MESSAGES = [
    "Setting up your profile...",
    "Configuring your workspace...",
    "Personalizing your experience...",
    "Almost ready..."
  ];

  // Run company and profile analysis
  const runAnalysis = async () => {
    setStep(6); // Analysis step (now step 6 with LinkedIn)
    setIsAnalyzing(true);

    // Use different messages for invited users
    const messages = isInvitedUser ? INVITED_USER_MESSAGES : ANALYSIS_MESSAGES;

    // Cycle through messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCurrentAnalysisMessage(messages[messageIndex]);
    }, 1500);

    // Local variables to store results before setting state
    let finalProfileData = null;
    let finalDossier = null;

    // For invited users, use existing company data and skip research
    if (isInvitedUser) {
      try {
        clearInterval(messageInterval);

        // Build dossier from existing company (if available) or minimal data
        finalDossier = {
          company_name: existingCompany?.name || formData.companyName || 'Your Company',
          business_summary: existingCompany?.description || "Technology company delivering innovative solutions.",
          key_products: ["Platform Services", "Enterprise Solutions"],
          target_audience: "Business professionals and enterprise customers",
          industry_challenges: ["Digital transformation", "Scalability"],
          industry: existingCompany?.industry || formData.industry || 'Technology',
          employee_count: existingCompany?.employee_count || null,
          size_range: existingCompany?.size_range || formData.companySize,
          founded_year: existingCompany?.founded_year || null,
          headquarters: existingCompany?.headquarters || null,
          revenue_range: existingCompany?.revenue_range || null,
          linkedin_url: existingCompany?.linkedin_url || null,
          logo_url: existingCompany?.logo_url || null,
          tech_stack: existingCompany?.tech_stack || [],
          tech_categories: existingCompany?.tech_categories || [],
          funding_data: existingCompany?.funding_data || null,
          total_funding: existingCompany?.total_funding || null,
          funding_stage: existingCompany?.funding_stage || null,
          data_completeness: existingCompany?.data_completeness || 50
        };

        setDossier(finalDossier);
        if (existingCompany) {
          setCompanyEnrichment(existingCompany);
        }

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 1500));

        setStep(7); // Review step
        setIsAnalyzing(false);
        return;
      } catch (error) {
        console.error('[Onboarding] Invited user analysis error:', error);
        clearInterval(messageInterval);
        setIsAnalyzing(false);
        setStep(7);
        return;
      }
    }

    try {
      // Clean URL first
      let cleanUrl = formData.companyWebsite.trim();
      cleanUrl = cleanUrl.split('/')[0].split('?')[0].split('#')[0];
      const urlString = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
      const urlObj = new URL(urlString);
      const companyDomain = urlObj.hostname;

      console.log('[Onboarding] Starting parallel enrichment for domain:', companyDomain);

      // Run ALL enrichments in parallel for speed
      const [profileResult, companyResult, exploriumResult] = await Promise.allSettled([
        // 1. LinkedIn Profile Research
        formData.linkedinUrl?.trim()
          ? base44.functions.invoke('enrichLinkedInProfile', {
              linkedin_url: formData.linkedinUrl.trim(),
              full_name: formData.fullName,
              job_title: formData.jobTitle
            })
          : Promise.resolve({ data: null }),

        // 2. Company Web Research
        base44.functions.invoke('researchCompany', {
          company_name: formData.companyName,
          company_url: urlObj.origin,
          domain: companyDomain,
          industry: formData.industry || "Technology"
        }),

        // 3. Explorium Deep Enrichment (firmographics, technographics, funding)
        base44.functions.invoke('enrichCompanyFromExplorium', {
          domain: companyDomain
        })
      ]);

      clearInterval(messageInterval);

      console.log('[Onboarding] All enrichments completed');
      console.log('[Onboarding] Profile result:', profileResult.status, profileResult.value?.data?.profile ? 'has data' : 'no data');
      console.log('[Onboarding] Company result:', companyResult.status);
      console.log('[Onboarding] Explorium result:', exploriumResult.status, exploriumResult.value?.data?.tech_stack?.length || 0, 'technologies');

      // Process LinkedIn profile
      if (profileResult.status === 'fulfilled' && profileResult.value?.data?.profile) {
        finalProfileData = profileResult.value.data.profile;
        console.log('[Onboarding] LinkedIn profile enriched:', finalProfileData.headline || finalProfileData.current_role);
      }

      // Process Explorium data
      let explorium = null;
      if (exploriumResult.status === 'fulfilled' && exploriumResult.value?.data && !exploriumResult.value.data.error) {
        explorium = exploriumResult.value.data;
        console.log(`[Onboarding] Explorium: ${explorium.tech_stack?.length || 0} technologies, ${explorium.data_completeness || 0}% complete`);
      }

      // Process company research
      const companyData = companyResult.status === 'fulfilled' ? companyResult.value?.data : null;

      // Build dossier combining web research + Explorium
      finalDossier = {
        company_name: explorium?.name || formData.companyName,
        business_summary: explorium?.description || (companyData?.analysis?.summary || companyData?.analysis) || "Technology company delivering innovative solutions.",
        key_products: companyData?.analysis?.products || ["Platform Services", "Enterprise Solutions"],
        target_audience: companyData?.analysis?.audience || "Business professionals and enterprise customers",
        industry_challenges: companyData?.analysis?.challenges || ["Digital transformation", "Scalability"],
        // Add Explorium data to dossier
        industry: explorium?.industry || formData.industry || 'Technology',
        employee_count: explorium?.employee_count || null,
        size_range: explorium?.size_range || formData.companySize,
        founded_year: explorium?.founded_year || null,
        headquarters: explorium?.headquarters || null,
        revenue_range: explorium?.revenue_range || null,
        linkedin_url: explorium?.linkedin_url || null,
        logo_url: explorium?.logo_url || null,
        tech_stack: explorium?.tech_stack || [],
        tech_categories: explorium?.tech_categories || [],
        funding_data: explorium?.funding_data || null,
        total_funding: explorium?.total_funding || null,
        funding_stage: explorium?.funding_stage || null,
        data_completeness: explorium?.data_completeness || 0
      };

      // Set all state at once BEFORE moving to review step
      setProfileData(finalProfileData);
      setCompanyEnrichment(explorium);
      setDossier(finalDossier);

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      setStep(7); // Review step
    } catch (error) {
      console.error('[Onboarding] Analysis error:', error);
      clearInterval(messageInterval);

      // Fallback dossier
      finalDossier = {
        company_name: formData.companyName || formData.companyWebsite.split('.')[0],
        business_summary: "Technology company focused on delivering innovative solutions.",
        key_products: ["Platform Services", "Enterprise Solutions"],
        target_audience: "Business professionals and technical teams",
        industry_challenges: ["Digital transformation", "Scalability"],
        tech_stack: [],
        data_completeness: 0
      };

      setDossier(finalDossier);
      setStep(7);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Final confirmation
  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const user = await base44.auth.me();

      // Update basic profile with all collected data
      try {
        await base44.auth.updateMe({
          full_name: formData.fullName || user.full_name,
          job_title: formData.jobTitle,
          linkedin_url: formData.linkedinUrl || null,
          experience_level: formData.experienceLevel || 'intermediate',
          industry: formData.industry || null,
          onboarding_completed: true
        });
      } catch (e) {
        console.warn('[Onboarding] Profile update warning:', e);
      }

      // For invited users, company already exists - skip company creation
      let companyId = null;
      let companyDomain = '';

      if (isInvitedUser) {
        // Invited user - NEVER create a new company, use their existing company_id
        const currentUser = await base44.auth.me();
        companyId = existingCompany?.id || currentUser?.company_id;

        if (companyId) {
          companyDomain = existingCompany?.domain || '';
          console.log('[Onboarding] Invited user - using existing company:', companyId);
        } else {
          console.error('[Onboarding] Invited user has no company_id! This should not happen.');
        }
      } else {
        // Parse domain from company website
        try {
          const cleanUrl = formData.companyWebsite.trim();
          const urlString = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
          companyDomain = new URL(urlString).hostname;
        } catch (e) {
          companyDomain = formData.companyWebsite.replace(/^https?:\/\//, '').split('/')[0];
        }

        // Note: enrichCompanyProfile is called AFTER Explorium enrichment below
        // This ensures we have the actual tech stack data for personalization

        // Create or link Company entity - THIS IS CRITICAL for Settings page
        try {
          // Check if company with this domain already exists
          const existingCompanies = await base44.entities.Company.filter({ domain: companyDomain });

          if (existingCompanies.length > 0) {
            // Use existing company
            companyId = existingCompanies[0].id;
            console.log('[Onboarding] Found existing company:', companyId);

            // Update company with latest research data
            await base44.entities.Company.update(companyId, {
              name: dossier?.company_name || formData.companyName,
              description: dossier?.business_summary || '',
              industry: formData.industry || 'Technology',
              size_range: formData.companySize || '',
              website_url: formData.companyWebsite,
              enriched_at: new Date().toISOString(),
              enrichment_source: 'onboarding_research'
            });
          } else {
            // Create new company entity with all research data
            const newCompany = await base44.entities.Company.create({
              domain: companyDomain,
              name: dossier?.company_name || formData.companyName,
              description: dossier?.business_summary || '',
              industry: formData.industry || 'Technology',
              size_range: formData.companySize || '',
              website_url: formData.companyWebsite,
              tech_stack: [],
              knowledge_files: [],
              enriched_at: new Date().toISOString(),
              enrichment_source: 'onboarding_research',
              settings: {}
            });
            companyId = newCompany.id;
            console.log('[Onboarding] Created new company:', companyId);
          }

          // Link user to company - this makes Settings work!
          if (companyId) {
            await base44.auth.updateMe({ company_id: companyId });
          }
        } catch (companyError) {
          console.error('[Onboarding] Company creation/linking error:', companyError);
          // Non-critical - continue without company linkage
        }
      }

      // Skip Explorium enrichment for invited users - company data already exists
      if (isInvitedUser && existingCompany) {
        console.log('[Onboarding] Invited user - skipping Explorium enrichment');
      } else if (companyId && companyDomain) {
        // Try Explorium enrichment for additional company data (tech stack, firmographics)
        try {
          const exploriumResult = await base44.functions.invoke('enrichCompanyFromExplorium', {
            domain: companyDomain
          });

          const enrichment = exploriumResult?.data;
          if (enrichment && !enrichment.error) {
            // Update company with ALL enrichment data from Explorium
            await base44.entities.Company.update(companyId, {
              // === BASIC INFO ===
              name: dossier?.company_name || enrichment.name || formData.companyName,
              description: dossier?.business_summary || enrichment.description || null,
              industry: formData.industry || enrichment.industry || 'Technology',

              // === INDUSTRY CLASSIFICATION ===
              naics_code: enrichment.naics_code || null,
              naics_description: enrichment.naics_description || null,
              sic_code: enrichment.sic_code || null,
              sic_description: enrichment.sic_description || null,

              // === SIZE & FINANCIALS ===
              size_range: formData.companySize || enrichment.size_range || null,
              employee_count: enrichment.employee_count || null,
              revenue_range: enrichment.revenue_range || null,
              founded_year: enrichment.founded_year || null,

              // === SOCIAL/WEB PRESENCE ===
              linkedin_url: enrichment.linkedin_url || null,
              website_url: enrichment.website_url || null,
              twitter_url: enrichment.twitter_url || null,
              facebook_url: enrichment.facebook_url || null,
              logo_url: enrichment.logo_url || null,

              // === LOCATION DATA ===
              headquarters: enrichment.headquarters || null,
              hq_city: enrichment.hq_city || null,
              hq_state: enrichment.hq_state || null,
              hq_country: enrichment.hq_country || null,
              hq_postal_code: enrichment.hq_postal_code || null,
              hq_address: enrichment.hq_address || null,
              locations_count: enrichment.locations_count || null,
              locations_distribution: enrichment.locations_distribution || [],

              // === CONTACT INFO ===
              phone: enrichment.phone || null,
              email: enrichment.email || null,

              // === TECH STACK ===
              tech_stack: enrichment.tech_stack || [],
              tech_categories: enrichment.tech_categories || [],
              tech_stack_count: enrichment.tech_stack_count || 0,

              // === FUNDING DATA ===
              funding_data: enrichment.funding_data || null,
              total_funding: enrichment.total_funding || null,
              funding_stage: enrichment.funding_stage || null,
              last_funding_date: enrichment.last_funding_date || null,

              // === RAW DATA FOR DETAILED VIEWS ===
              firmographics: enrichment.firmographics || null,
              technographics: enrichment.technographics || null,
              funding_raw: enrichment.funding_raw || null,

              // === METADATA ===
              enriched_at: new Date().toISOString(),
              enrichment_source: 'explorium',
              data_completeness: enrichment.data_completeness || 0
            });

            console.log(`[Onboarding] Explorium enrichment successful: ${enrichment.tech_stack?.length || 0} technologies found`);

            // Update user profile enrichment with tech stack for personalization
            try {
              const techStackData = enrichment.tech_stack || [];
              await base44.functions.invoke('enrichCompanyProfile', {
                company_name: dossier?.company_name || formData.companyName,
                company_url: formData.companyWebsite,
                job_title: formData.jobTitle,
                company_description: dossier?.business_summary || enrichment.description || '',
                key_products: dossier?.key_products || [],
                target_audience: dossier?.target_audience || '',
                industry_challenges: dossier?.industry_challenges || [],
                // Use actual tech stack data from Explorium!
                tech_stack: techStackData.slice(0, 20),
                ai_tools_used: techStackData.filter(t =>
                  t.toLowerCase().includes('ai') ||
                  t.toLowerCase().includes('ml') ||
                  t.toLowerCase().includes('openai') ||
                  t.toLowerCase().includes('anthropic') ||
                  t.toLowerCase().includes('tensorflow') ||
                  t.toLowerCase().includes('pytorch') ||
                  t.toLowerCase().includes('huggingface') ||
                  t.toLowerCase().includes('langchain')
                ).slice(0, 10),
                industry: formData.industry || enrichment.industry || 'Technology',
                company_size: formData.companySize || enrichment.size_range || 'Unknown',
                user_goals: formData.selectedGoals,
                user_experience_level: formData.experienceLevel,
                linkedin_url: formData.linkedinUrl || '',
                linkedin_profile: profileData || null
              });
              console.log('[Onboarding] Profile enrichment with tech stack completed');
            } catch (profileEnrichError) {
              console.warn('[Onboarding] Profile enrichment optional:', profileEnrichError);
            }
          }
        } catch (exploriumError) {
          console.warn('[Onboarding] Explorium enrichment failed:', exploriumError);
          // Run fallback profile enrichment without tech stack data
          try {
            await base44.functions.invoke('enrichCompanyProfile', {
              company_name: dossier?.company_name || formData.companyName,
              company_url: formData.companyWebsite,
              job_title: formData.jobTitle,
              company_description: dossier?.business_summary || '',
              key_products: dossier?.key_products || [],
              target_audience: dossier?.target_audience || '',
              industry_challenges: dossier?.industry_challenges || [],
              tech_stack: [],
              ai_tools_used: [],
              industry: formData.industry || 'Technology',
              company_size: formData.companySize || 'Unknown',
              user_goals: formData.selectedGoals,
              user_experience_level: formData.experienceLevel,
              linkedin_url: formData.linkedinUrl || '',
              linkedin_profile: profileData || null
            });
          } catch (fallbackError) {
            console.warn('[Onboarding] Fallback enrichment failed:', fallbackError);
          }
        }
      } else {
        // No company created/found - still run basic profile enrichment
        try {
          await base44.functions.invoke('enrichCompanyProfile', {
            company_name: dossier?.company_name || formData.companyName,
            company_url: formData.companyWebsite,
            job_title: formData.jobTitle,
            company_description: dossier?.business_summary || '',
            key_products: dossier?.key_products || [],
            target_audience: dossier?.target_audience || '',
            industry_challenges: dossier?.industry_challenges || [],
            tech_stack: [],
            ai_tools_used: [],
            industry: formData.industry || 'Technology',
            company_size: formData.companySize || 'Unknown',
            user_goals: formData.selectedGoals,
            user_experience_level: formData.experienceLevel,
            linkedin_url: formData.linkedinUrl || '',
            linkedin_profile: profileData || null
          });
        } catch (noCompanyError) {
          console.warn('[Onboarding] Profile enrichment without company:', noCompanyError);
        }
      }

      // Grant onboarding credits
      try {
        await base44.functions.invoke('grantOnboardingCredits', { user_id: user.id });
      } catch (e) {
        console.warn('[Onboarding] Credits error:', e);
      }

      // Save app preferences
      try {
        const existingConfigs = await base44.entities.UserAppConfig.filter({ user_id: user.id });
        const selectedApps = formData.selectedApps || ['learn', 'growth', 'sentinel'];
        const defaultWidgets = getDefaultWidgetsForApps(selectedApps);

        if (existingConfigs.length > 0) {
          await base44.entities.UserAppConfig.update(existingConfigs[0].id, {
            enabled_apps: selectedApps,
            app_order: selectedApps,
            dashboard_widgets: defaultWidgets
          });
        } else {
          await base44.entities.UserAppConfig.create({
            user_id: user.id,
            enabled_apps: selectedApps,
            app_order: selectedApps,
            dashboard_widgets: defaultWidgets
          });
        }

        // Notify other components of config change
        window.dispatchEvent(new CustomEvent('dashboard-config-updated'));
      } catch (e) {
        console.warn('[Onboarding] App config error:', e);
      }

      // Small delay then navigate
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = createPageUrl('Dashboard');

    } catch (error) {
      console.error('[Onboarding] Final error:', error);
      window.location.href = createPageUrl('Dashboard');
    }
  };

  // Handle step navigation - for invited users, skip LinkedIn (2) and Company (3) steps
  const handleNext = () => {
    if (step === 5) {
      runAnalysis(); // Apps step (5) triggers analysis
    } else if (isInvitedUser && step === 1) {
      // Invited users skip LinkedIn and Company steps, go directly to Goals
      setStep(4);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step === 7) {
      setStep(5); // Skip analysis step when going back from review
    } else if (isInvitedUser && step === 4) {
      // Invited users go back from Goals directly to Welcome
      setStep(1);
    } else {
      setStep(s => s - 1);
    }
  };

  // Handle skipping LinkedIn step
  const handleSkipLinkedIn = () => {
    setStep(3); // Skip to company step
  };

  // Calculate total steps for progress indicator
  const totalSteps = isInvitedUser ? 5 : 7; // Invited users skip LinkedIn and Company

  // Map current step to progress step for invited users
  const getProgressStep = () => {
    if (!isInvitedUser) return step;
    // For invited users: 1->1, 4->2, 5->3, 6->4, 7->5
    if (step === 1) return 1;
    if (step === 4) return 2;
    if (step === 5) return 3;
    if (step === 6) return 4;
    if (step === 7) return 5;
    return step;
  };

  // Show loading while checking if user is invited
  if (!initialCheckDone) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-zinc-400">
              {isInvitedUser ? 'Complete Your Profile' : 'Personalized Workspace Setup'}
            </span>
          </div>
        </motion.div>

        {/* Progress - hide during analysis step */}
        {step !== 6 && <ProgressIndicator currentStep={getProgressStep()} totalSteps={totalSteps} />}

        {/* Card */}
        <motion.div
          layout
          className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8"
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <WelcomeStep
                key="welcome"
                data={formData}
                onChange={updateFormData}
                onNext={handleNext}
              />
            )}

            {step === 2 && (
              <LinkedInStep
                key="linkedin"
                data={formData}
                onChange={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={handleSkipLinkedIn}
              />
            )}

            {step === 3 && (
              <CompanyStep
                key="company"
                data={formData}
                onChange={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {step === 4 && (
              <GoalsStep
                key="goals"
                data={formData}
                onChange={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {step === 5 && (
              <AppsSetupStep
                key="apps"
                data={formData}
                onChange={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {step === 6 && (
              <AnalysisStep
                key="analysis"
                data={formData}
                analysisMessages={ANALYSIS_MESSAGES}
                currentMessage={currentAnalysisMessage}
              />
            )}

            {step === 7 && (
              <ReviewStep
                key="review"
                data={formData}
                dossier={dossier}
                profileData={profileData}
                companyEnrichment={companyEnrichment}
                onChange={(updates) => {
                  if (updates.companyName) {
                    setDossier(prev => ({ ...prev, company_name: updates.companyName }));
                  }
                  if (updates.businessSummary) {
                    setDossier(prev => ({ ...prev, business_summary: updates.businessSummary }));
                  }
                  if (updates.keyProducts) {
                    setDossier(prev => ({ ...prev, key_products: updates.keyProducts }));
                  }
                  if (updates.targetAudience) {
                    setDossier(prev => ({ ...prev, target_audience: updates.targetAudience }));
                  }
                }}
                onConfirm={handleConfirm}
                onBack={handleBack}
                isSubmitting={isSubmitting}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Your data is used only to personalize your workspace experience
        </p>
      </div>
    </div>
  );
}