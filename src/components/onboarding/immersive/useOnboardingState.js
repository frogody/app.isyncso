import { useState, useEffect, useCallback } from 'react';
import { db } from '@/api/supabaseClient';

/**
 * Manages all onboarding form state.
 * Mirrors the formData shape from Onboarding.jsx so the enrichment
 * flow can consume it without modification.
 */
export default function useOnboardingState() {
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
    selectedApps: null,
    // Non-persisted field used only inside the immersive flow
    dailyTools: [],
  });

  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [existingCompany, setExistingCompany] = useState(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Check if user was invited (already has company_id)
  useEffect(() => {
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
                companySize: company.size_range || '',
                industry: company.industry || '',
              }));
            } else {
              setFormData(prev => ({
                ...prev,
                fullName: user.full_name || '',
              }));
            }
          } catch {
            setFormData(prev => ({
              ...prev,
              fullName: user.full_name || '',
            }));
          }
        }
      } catch (error) {
        console.error('[ImmersiveOnboarding] Error checking invited user:', error);
      } finally {
        setInitialCheckDone(true);
      }
    };
    checkInvitedUser();
  }, []);

  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    formData,
    updateFormData,
    isInvitedUser,
    existingCompany,
    initialCheckDone,
  };
}
