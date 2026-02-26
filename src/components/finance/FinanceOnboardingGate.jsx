import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { Loader2 } from "lucide-react";
import FinanceOnboardingWizard from "./FinanceOnboardingWizard";

export default function FinanceOnboardingGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const user = await db.auth.me();
      if (!user?.company_id) {
        // No company — let children render (they handle their own empty states)
        setOnboardingCompleted(true);
        setLoading(false);
        return;
      }

      const companyData = await db.entities.Company.get(user.company_id);
      setCompany(companyData);
      setOnboardingCompleted(!!companyData?.finance_onboarding_completed);
    } catch (error) {
      console.error("[FinanceOnboardingGate] Error loading company:", error);
      // On error, let children render to avoid blocking
      setOnboardingCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <FinanceOnboardingWizard
        company={company}
        onComplete={() => setOnboardingCompleted(true)}
      />
    );
  }

  return children;
}
