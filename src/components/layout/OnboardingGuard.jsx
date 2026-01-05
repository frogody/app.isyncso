import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Dynamically import to avoid circular dependencies
const Onboarding = React.lazy(() => import("../../pages/Onboarding"));

/**
 * OnboardingGuard - Enforces onboarding completion before accessing the app
 * 
 * Flow:
 * 1. Checks if user is authenticated and has completed onboarding
 * 2. If onboarding incomplete, shows Onboarding component
 * 3. If onboarding complete but user tries to access /Onboarding, redirects to Dashboard
 * 4. Otherwise, renders children (normal app)
 * 
 * Special Cases:
 * - Always allows access to Onboarding page itself (prevents redirect loops)
 * - Uses Suspense for lazy-loaded Onboarding component
 * - Shows loading spinner during auth check
 * 
 * Note: This guard wraps the entire app in Layout.js, so it runs on every route
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - App content to render after onboarding
 */
export default function OnboardingGuard({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { base44 } = await import("@/api/base44Client");
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("OnboardingGuard error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const loadingSpinner = (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500"></div>
    </div>
  );

  if (loading) {
    return loadingSpinner;
  }

  // Always allow access to Onboarding page itself to prevent redirect loops
  const onboardingPath = createPageUrl("Onboarding");
  const isOnOnboardingPage = location.pathname === onboardingPath;
  
  // Check if user has completed onboarding
  const hasCompletedOnboarding = user?.job_title?.trim()?.length > 0 || user?.onboarding_completed === true;
  
  // If user completed onboarding and tries to access onboarding page, redirect to Dashboard
  if (isOnOnboardingPage && user && hasCompletedOnboarding) {
    window.location.href = createPageUrl("Dashboard");
    return loadingSpinner;
  }
  
  if (isOnOnboardingPage) {
    return (
      <Suspense fallback={loadingSpinner}>
        <Onboarding />
      </Suspense>
    );
  }

  const needsOnboarding = !user || !hasCompletedOnboarding;

  if (needsOnboarding) {
    return (
      <Suspense fallback={loadingSpinner}>
        <Onboarding />
      </Suspense>
    );
  }

  // User has completed onboarding - show normal app
  return children;
}