import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { db, supabase } from "@/api/supabaseClient";
import { Sparkles } from "lucide-react";

import {
  WelcomeStep,
  PersonaStep,
  CompanyStep,
  AvatarStep,
  ProgressIndicator,
  PERSONAS
} from "@/components/onboarding/OnboardingSteps";
import ImmersiveOnboarding from "@/components/onboarding/immersive/ImmersiveOnboarding";

// Feature flag — set to true to use the immersive 10-page onboarding
const useImmersive = true;

// Helper to get default widgets based on selected apps
const getDefaultWidgetsForApps = (apps) => {
  const widgets = ['actions_recent', 'quick_actions'];
  if (apps.includes('sync')) widgets.push('sync_recent', 'sync_quick');
  if (apps.includes('learn')) widgets.push('learn_progress', 'learn_stats');
  if (apps.includes('growth')) widgets.push('growth_pipeline', 'growth_stats', 'growth_deals');
  if (apps.includes('sentinel')) widgets.push('sentinel_compliance', 'sentinel_systems');
  if (apps.includes('finance')) widgets.push('finance_overview', 'finance_invoices');
  if (apps.includes('raise')) widgets.push('raise_progress', 'raise_investors');
  if (apps.includes('talent')) widgets.push('talent_pipeline', 'talent_candidates');
  if (apps.includes('products')) widgets.push('products_inventory', 'products_lowstock');
  if (apps.includes('create')) widgets.push('create_recent', 'create_gallery');
  return widgets;
};


export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [existingCompany, setExistingCompany] = useState(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    persona: null,
    companyName: '',
    companyWebsite: '',
    avatarUrl: '',
  });

  // Check if user was invited (already has company_id)
  React.useEffect(() => {
    const checkInvitedUser = async () => {
      try {
        const user = await db.auth.me();
        if (user?.company_id) {
          setIsInvitedUser(true);
          try {
            const company = await db.entities.Company.get(user.company_id);
            if (company) {
              setExistingCompany(company);
              setFormData(prev => ({
                ...prev,
                fullName: user.full_name || '',
                companyName: company.name || '',
                companyWebsite: company.domain || company.website || '',
              }));
            } else {
              setFormData(prev => ({ ...prev, fullName: user.full_name || '' }));
            }
          } catch (companyError) {
            console.warn('[Onboarding] Failed to load company:', companyError);
            setFormData(prev => ({ ...prev, fullName: user.full_name || '' }));
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

  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Get the selected persona config
  const getPersonaConfig = () => {
    return PERSONAS.find(p => p.id === formData.persona) || null;
  };

  // ─────────────────────────────────────────────
  // SUBMIT: Create workspace based on persona
  // ─────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const user = await db.auth.me();
      const persona = getPersonaConfig();

      if (!persona) {
        console.error('[Onboarding] No persona selected');
        return;
      }

      // 1. Update user profile — CRITICAL: must succeed for guard to pass
      let profileUpdated = false;
      try {
        const profileUpdate = {
          full_name: formData.fullName || user.full_name,
          job_title: formData.jobTitle,
          onboarding_completed: true,
        };
        if (formData.avatarUrl) {
          profileUpdate.avatar_url = formData.avatarUrl;
        }
        const result = await db.auth.updateMe(profileUpdate);
        profileUpdated = !!(result?.onboarding_completed);
        console.log('[Onboarding] Profile update result:', { profileUpdated, result });
      } catch (e) {
        console.warn('[Onboarding] Profile update via updateMe failed, trying direct:', e);
      }

      // Fallback: direct supabase update if updateMe failed
      if (!profileUpdated) {
        try {
          const directUpdate = {
            full_name: formData.fullName || user.full_name,
            job_title: formData.jobTitle,
            onboarding_completed: true,
          };
          if (formData.avatarUrl) {
            directUpdate.avatar_url = formData.avatarUrl;
          }
          const { data: directResult, error: directErr } = await supabase
            .from('users')
            .update(directUpdate)
            .eq('id', user.id)
            .select('onboarding_completed')
            .single();
          if (directErr) throw directErr;
          profileUpdated = !!(directResult?.onboarding_completed);
          console.log('[Onboarding] Direct update result:', { profileUpdated });
        } catch (e2) {
          console.error('[Onboarding] Direct profile update also failed:', e2);
        }
      }

      // Belt-and-suspenders: set localStorage so guard doesn't loop
      localStorage.setItem('onboarding_completed', 'true');

      // 2. Create or link company (skip for invited users)
      let companyId = null;
      let companyDomain = '';

      if (isInvitedUser) {
        const currentUser = await db.auth.me();
        companyId = existingCompany?.id || currentUser?.company_id;
        companyDomain = existingCompany?.domain || '';
      } else if (formData.companyWebsite?.trim()) {
        try {
          const cleanUrl = formData.companyWebsite.trim();
          const urlString = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
          companyDomain = new URL(urlString).hostname;
        } catch (e) {
          companyDomain = formData.companyWebsite.replace(/^https?:\/\//, '').split('/')[0];
        }

        try {
          const existingCompanies = await db.entities.Company.filter({ domain: companyDomain });

          if (existingCompanies.length > 0) {
            companyId = existingCompanies[0].id;
            await db.entities.Company.update(companyId, {
              name: formData.companyName || existingCompanies[0].name,
              website_url: formData.companyWebsite,
              enriched_at: new Date().toISOString(),
              enrichment_source: 'onboarding_research'
            });
          } else {
            const newCompany = await db.entities.Company.create({
              domain: companyDomain,
              name: formData.companyName,
              website_url: formData.companyWebsite,
              tech_stack: [],
              knowledge_files: [],
              enriched_at: new Date().toISOString(),
              enrichment_source: 'onboarding_research',
              settings: {}
            });
            companyId = newCompany.id;
          }

          if (companyId) {
            await db.auth.updateMe({ company_id: companyId });

            try {
              await supabase.rpc('assign_founder_role', {
                p_user_id: user.id,
                p_company_id: companyId
              });
            } catch (roleErr) {
              console.warn('[Onboarding] Role assignment error:', roleErr);
            }
          }
        } catch (companyError) {
          console.error('[Onboarding] Company creation error:', companyError);
        }
      }

      // 3. Save app preferences based on persona
      try {
        const existingConfigs = await db.entities.UserAppConfig.filter({ user_id: user.id });
        const appConfigPayload = {
          enabled_apps: persona.enabledApps,
          app_order: persona.enabledApps,
          dashboard_widgets: persona.dashboardWidgets,
          ...(persona.appConfigs || {})
        };

        if (existingConfigs.length > 0) {
          await db.entities.UserAppConfig.update(existingConfigs[0].id, appConfigPayload);
        } else {
          await db.entities.UserAppConfig.create({
            user_id: user.id,
            ...appConfigPayload
          });
        }

        if (persona.appConfigs?.products_settings) {
          localStorage.setItem('isyncso_products_settings', JSON.stringify(persona.appConfigs.products_settings));
          window.dispatchEvent(new CustomEvent('products-settings-changed', {
            detail: persona.appConfigs.products_settings
          }));
        }

        window.dispatchEvent(new CustomEvent('dashboard-config-updated'));
      } catch (e) {
        console.warn('[Onboarding] App config error:', e);
      }

      // 4. Grant onboarding credits
      try {
        await db.functions.invoke('grantOnboardingCredits', { user_id: user.id });
      } catch (e) {
        console.warn('[Onboarding] Credits error:', e);
      }

      // 5. Fire-and-forget: Explorium company intelligence + research
      if (!isInvitedUser && companyDomain && companyId) {
        Promise.allSettled([
          db.functions.invoke('researchCompany', {
            company_name: formData.companyName,
            company_url: formData.companyWebsite,
            domain: companyDomain,
            industry: 'Technology'
          }),
          db.functions.invoke('generateCompanyIntelligence', {
            companyName: formData.companyName,
            companyDomain: companyDomain
          })
        ]).then(async ([researchResult, intelResult]) => {
          // Normalize intelligence into company table columns
          if (intelResult.status === 'fulfilled' && intelResult.value?.data?.intelligence) {
            const intel = intelResult.value.data.intelligence;
            const firmo = intel.firmographics || {};
            const funding = intel.funding || {};
            const tech = intel.technographics || {};
            const social = intel.social_media || {};
            const workforce = intel.workforce || {};

            // Flatten tech stack into simple array
            const flatTechStack = (tech.tech_stack || [])
              .flatMap(cat => cat.technologies || []);
            // Build tech categories object
            const techCategories = {};
            (tech.tech_stack || []).forEach(cat => {
              if (cat.category && cat.technologies?.length) {
                techCategories[cat.category] = cat.technologies;
              }
            });

            try {
              await db.entities.Company.update(companyId, {
                name: firmo.company_name || formData.companyName,
                description: firmo.description || null,
                industry: firmo.industry || null,
                naics_code: firmo.naics_code || null,
                naics_description: firmo.naics_description || null,
                sic_code: firmo.sic_code || null,
                sic_description: firmo.sic_description || null,
                size_range: firmo.employee_count_range || null,
                employee_count: firmo.employee_count || workforce.total_employees || null,
                revenue_range: firmo.revenue_range || null,
                founded_year: firmo.founded_year || null,
                linkedin_url: firmo.linkedin_url || social.linkedin_url || null,
                website_url: firmo.website || formData.companyWebsite || null,
                twitter_url: social.twitter_url || null,
                facebook_url: social.facebook_url || null,
                logo_url: firmo.logo_url || null,
                headquarters: firmo.headquarters || null,
                hq_city: firmo.city || null,
                hq_state: firmo.state || null,
                hq_country: firmo.country || null,
                hq_postal_code: firmo.zip_code || null,
                hq_address: firmo.street || null,
                locations_count: firmo.locations_count || null,
                tech_stack: flatTechStack.length > 0 ? flatTechStack : [],
                tech_categories: Object.keys(techCategories).length > 0 ? techCategories : null,
                tech_stack_count: flatTechStack.length || 0,
                funding_data: funding.funding_rounds?.length ? funding : null,
                total_funding: funding.total_funding || null,
                funding_stage: funding.funding_stage || null,
                last_funding_date: funding.last_funding_date || null,
                firmographics: intel.firmographics || null,
                technographics: intel.technographics || null,
                funding_raw: intel.funding || null,
                enriched_at: new Date().toISOString(),
                enrichment_source: 'explorium',
                data_completeness: intel.data_quality?.completeness
                  ? Math.round((intel.data_quality.completeness / 8) * 100)
                  : 0
              });
              console.log('[Onboarding] Company enriched from Explorium intelligence');
            } catch (updateErr) {
              console.warn('[Onboarding] Background enrichment update failed:', updateErr);
            }
          }
        }).catch(err => {
          console.warn('[Onboarding] Background enrichment failed:', err);
        });
      }

      // 6. Navigate immediately — don't wait for enrichment
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.href = createPageUrl('Dashboard');

    } catch (error) {
      console.error('[Onboarding] Final error:', error);
      // Still set localStorage so user doesn't get stuck
      localStorage.setItem('onboarding_completed', 'true');
      window.location.href = createPageUrl('Dashboard');
    }
  };

  // Immersive onboarding completion handler.
  // Receives formData from the 10-page immersive flow and runs the full
  // enrichment + save pipeline. Uses data parameter directly to avoid
  // setState race conditions.
  const handleImmersiveComplete = async (immersiveData) => {
    setIsSubmitting(true);

    // Merge immersive data into local state (for any fallback reads)
    setFormData(immersiveData);

    try {
      const user = await db.auth.me();

      // Determine invited user status: a real invite has a company with a domain.
      // The handle_new_user trigger auto-creates a placeholder company (domain=null)
      // for every signup, so we can't just check company_id.
      let existingCompanyData = null;
      if (user?.company_id) {
        try {
          existingCompanyData = await db.entities.Company.get(user.company_id);
        } catch { /* ignore */ }
      }
      const invited = !!(existingCompanyData?.domain);

      // 1. Update basic profile
      try {
        await db.auth.updateMe({
          full_name: immersiveData.fullName || user.full_name,
          job_title: immersiveData.jobTitle,
          linkedin_url: immersiveData.linkedinUrl || null,
          experience_level: immersiveData.experienceLevel || 'intermediate',
          industry: immersiveData.industry || null,
          onboarding_completed: true,
        });
      } catch (e) {
        console.warn('[Onboarding] Profile update warning:', e);
      }

      // 2. Company creation / linking
      let companyId = null;
      let companyDomain = '';

      if (invited) {
        // Real invited user — company already has domain
        companyId = user.company_id;
        companyDomain = existingCompanyData?.domain || '';
      } else if (immersiveData.companyWebsite) {
        // Non-invited user with company info from onboarding form
        try {
          const cleanUrl = immersiveData.companyWebsite.trim();
          const urlString = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
          companyDomain = new URL(urlString).hostname;
        } catch {
          companyDomain = immersiveData.companyWebsite.replace(/^https?:\/\//, '').split('/')[0];
        }

        try {
          // Check if a company with this domain already exists
          const existingCompanies = await db.entities.Company.filter({ domain: companyDomain });
          if (existingCompanies.length > 0) {
            companyId = existingCompanies[0].id;
            await db.entities.Company.update(companyId, {
              name: immersiveData.companyName,
              industry: immersiveData.industry || 'Technology',
              size_range: immersiveData.companySize || '',
              website_url: immersiveData.companyWebsite,
              enriched_at: new Date().toISOString(),
              enrichment_source: 'onboarding_immersive',
            });
          } else if (user.company_id && existingCompanyData) {
            // handle_new_user trigger already created a placeholder company — update it
            companyId = user.company_id;
            await db.entities.Company.update(companyId, {
              domain: companyDomain,
              name: immersiveData.companyName,
              industry: immersiveData.industry || 'Technology',
              size_range: immersiveData.companySize || '',
              website_url: immersiveData.companyWebsite,
              tech_stack: [],
              knowledge_files: [],
              enriched_at: new Date().toISOString(),
              enrichment_source: 'onboarding_immersive',
              settings: {},
            });
          } else {
            // No existing company at all — create new
            const newCompany = await db.entities.Company.create({
              domain: companyDomain,
              name: immersiveData.companyName,
              industry: immersiveData.industry || 'Technology',
              size_range: immersiveData.companySize || '',
              website_url: immersiveData.companyWebsite,
              tech_stack: [],
              knowledge_files: [],
              enriched_at: new Date().toISOString(),
              enrichment_source: 'onboarding_immersive',
              settings: {},
            });
            companyId = newCompany.id;
          }

          if (companyId && companyId !== user.company_id) {
            await db.auth.updateMe({ company_id: companyId });
          }
          if (companyId) {
            try {
              await supabase.rpc('assign_founder_role', {
                p_user_id: user.id,
                p_company_id: companyId,
              });
            } catch (roleErr) {
              console.warn('[Onboarding] Role assignment error:', roleErr);
            }
          }
        } catch (companyError) {
          console.error('[Onboarding] Company creation error:', companyError);
        }
      }

      // 3. Grant credits
      try {
        await db.functions.invoke('grantOnboardingCredits', { user_id: user.id });
      } catch (e) {
        console.warn('[Onboarding] Credits error:', e);
      }

      // 4. Save app preferences
      try {
        const existingConfigs = await db.entities.UserAppConfig.filter({ user_id: user.id });
        const selectedApps = immersiveData.selectedApps || ['sync', 'learn', 'growth', 'sentinel'];
        const defaultWidgets = getDefaultWidgetsForApps(selectedApps);

        if (existingConfigs.length > 0) {
          await db.entities.UserAppConfig.update(existingConfigs[0].id, {
            enabled_apps: selectedApps,
            app_order: selectedApps,
            dashboard_widgets: defaultWidgets,
          });
        } else {
          await db.entities.UserAppConfig.create({
            user_id: user.id,
            enabled_apps: selectedApps,
            app_order: selectedApps,
            dashboard_widgets: defaultWidgets,
          });
        }
        window.dispatchEvent(new CustomEvent('dashboard-config-updated'));
      } catch (e) {
        console.warn('[Onboarding] App config error:', e);
      }

      // 5. Belt-and-suspenders: set localStorage so guard doesn't loop
      localStorage.setItem('onboarding_completed', 'true');

      // 6. Fire-and-forget: Explorium company intelligence + research
      if (!invited && companyId && companyDomain) {
        Promise.allSettled([
          db.functions.invoke('researchCompany', {
            company_name: immersiveData.companyName,
            company_url: immersiveData.companyWebsite,
            domain: companyDomain,
            industry: immersiveData.industry || 'Technology',
          }),
          db.functions.invoke('generateCompanyIntelligence', {
            companyName: immersiveData.companyName,
            companyDomain: companyDomain,
          })
        ]).then(async ([researchResult, intelResult]) => {
          // Normalize intelligence into company table columns
          if (intelResult.status === 'fulfilled' && intelResult.value?.data?.intelligence) {
            const intel = intelResult.value.data.intelligence;
            const firmo = intel.firmographics || {};
            const funding = intel.funding || {};
            const tech = intel.technographics || {};
            const social = intel.social_media || {};
            const workforce = intel.workforce || {};

            // Flatten tech stack into simple array
            const flatTechStack = (tech.tech_stack || [])
              .flatMap(cat => cat.technologies || []);
            // Build tech categories object
            const techCategories = {};
            (tech.tech_stack || []).forEach(cat => {
              if (cat.category && cat.technologies?.length) {
                techCategories[cat.category] = cat.technologies;
              }
            });

            try {
              await db.entities.Company.update(companyId, {
                name: firmo.company_name || immersiveData.companyName,
                description: firmo.description || null,
                industry: firmo.industry || null,
                naics_code: firmo.naics_code || null,
                naics_description: firmo.naics_description || null,
                sic_code: firmo.sic_code || null,
                sic_description: firmo.sic_description || null,
                size_range: firmo.employee_count_range || null,
                employee_count: firmo.employee_count || workforce.total_employees || null,
                revenue_range: firmo.revenue_range || null,
                founded_year: firmo.founded_year || null,
                linkedin_url: firmo.linkedin_url || social.linkedin_url || null,
                website_url: firmo.website || immersiveData.companyWebsite || null,
                twitter_url: social.twitter_url || null,
                facebook_url: social.facebook_url || null,
                logo_url: firmo.logo_url || null,
                headquarters: firmo.headquarters || null,
                hq_city: firmo.city || null,
                hq_state: firmo.state || null,
                hq_country: firmo.country || null,
                hq_postal_code: firmo.zip_code || null,
                hq_address: firmo.street || null,
                locations_count: firmo.locations_count || null,
                tech_stack: flatTechStack.length > 0 ? flatTechStack : [],
                tech_categories: Object.keys(techCategories).length > 0 ? techCategories : null,
                tech_stack_count: flatTechStack.length || 0,
                funding_data: funding.funding_rounds?.length ? funding : null,
                total_funding: funding.total_funding || null,
                funding_stage: funding.funding_stage || null,
                last_funding_date: funding.last_funding_date || null,
                firmographics: intel.firmographics || null,
                technographics: intel.technographics || null,
                funding_raw: intel.funding || null,
                enriched_at: new Date().toISOString(),
                enrichment_source: 'explorium',
                data_completeness: intel.data_quality?.completeness
                  ? Math.round((intel.data_quality.completeness / 8) * 100)
                  : 0
              });
              console.log('[Onboarding] Company enriched from Explorium intelligence');
            } catch (updateErr) {
              console.warn('[Onboarding] Background enrichment update failed:', updateErr);
            }
          }
        }).catch(err => {
          console.warn('[Onboarding] Background enrichment failed:', err);
        });
      }

      // 7. Navigate immediately — don't wait for enrichment
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('[Onboarding] Immersive complete error:', error);
      localStorage.setItem('onboarding_completed', 'true');
      window.location.href = createPageUrl('Dashboard');
    }
  };

  // Handle step navigation - for invited users, skip LinkedIn (2) and Company (3) steps
  // ─────────────────────────────────────────────
  // STEP NAVIGATION
  // ─────────────────────────────────────────────

  // For invited users: step 1 (Welcome) → step 2 (Persona) → step 3 (Avatar) → submit
  // For new users: step 1 (Welcome) → step 2 (Persona) → step 3 (Company) → step 4 (Avatar) → submit
  const totalSteps = isInvitedUser ? 3 : 4;

  const handleNext = () => {
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => s - 1);
  };

  // ── Immersive onboarding ──────────────────────────────────
  if (useImmersive) {
    return (
      <ImmersiveOnboarding
        onComplete={handleImmersiveComplete}
        isSubmitting={isSubmitting}
      />
    );
  }

  // ── Legacy form-based onboarding (feature-flagged off) ───
  // Loading state
  if (!initialCheckDone) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/[0.07] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/[0.07] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-zinc-400">
              {isInvitedUser ? 'Complete Your Profile' : 'Workspace Setup'}
            </span>
          </div>
        </motion.div>

        {/* Progress */}
        <ProgressIndicator currentStep={step} totalSteps={totalSteps} />

        {/* Card */}
        <motion.div
          layout
          className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-xl p-4 lg:p-6"
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
              <PersonaStep
                key="persona"
                data={formData}
                onChange={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
                isLastStep={false}
                isSubmitting={isSubmitting}
              />
            )}

            {step === 3 && !isInvitedUser && (
              <CompanyStep
                key="company"
                data={formData}
                onChange={updateFormData}
                onSubmit={handleNext}
                onBack={handleBack}
                isSubmitting={isSubmitting}
              />
            )}

            {((step === 3 && isInvitedUser) || (step === 4 && !isInvitedUser)) && (
              <AvatarStep
                key="avatar"
                data={formData}
                onChange={updateFormData}
                onNext={handleSubmit}
                onBack={handleBack}
                onSubmit={handleSubmit}
                isLastStep={true}
                isSubmitting={isSubmitting}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-600 mt-4">
          You can add more apps anytime from the sidebar
        </p>
      </div>
    </div>
  );
}
