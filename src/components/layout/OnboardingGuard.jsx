import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Dynamically import to avoid circular dependencies
const Onboarding = React.lazy(() => import("../../pages/Onboarding"));
const Login = React.lazy(() => import("../../pages/Login"));

/**
 * OnboardingGuard - Enforces authentication and onboarding completion
 *
 * Flow:
 * 1. Checks if user is authenticated
 * 2. If not authenticated, redirects to Login page
 * 3. If authenticated but onboarding incomplete, shows Onboarding component
 * 4. If onboarding complete, renders children (normal app)
 *
 * Special Cases:
 * - Always allows access to Login, AuthCallback pages (auth flow)
 * - Always allows access to Onboarding page itself (prevents redirect loops)
 * - Uses Suspense for lazy-loaded components
 * - Shows loading spinner during auth check
 *
 * Note: This guard wraps the entire app in Layout.js, so it runs on every route
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - App content to render after onboarding
 */
export default function OnboardingGuard({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        const { db } = await import("@/api/supabaseClient");

        // First check if user is authenticated
        const authStatus = await db.auth.isAuthenticated();
        setIsAuthenticated(authStatus);

        if (authStatus) {
          // User is authenticated, get their data
          const userData = await db.auth.me();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("OnboardingGuard error:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndOnboarding();
  }, [location.pathname]); // Re-check when route changes (e.g., after OAuth callback)

  const loadingSpinner = (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500"></div>
    </div>
  );

  if (loading) {
    return loadingSpinner;
  }

  // Define paths that don't require authentication
  const publicPaths = ['/Login', '/AuthCallback', '/VerifyCertificate', '/ShareView'];
  const isPublicPage = publicPaths.some(path =>
    location.pathname.toLowerCase() === path.toLowerCase()
  );

  // Allow public pages without authentication
  if (isPublicPage) {
    return children;
  }

  // Check if on onboarding page
  const onboardingPath = createPageUrl("Onboarding");
  const isOnOnboardingPage = location.pathname === onboardingPath ||
    location.pathname.toLowerCase() === '/onboarding';

  // If not authenticated, redirect to Login (except for public pages handled above)
  if (!isAuthenticated) {
    // Store the intended destination for redirect after login
    if (!isPublicPage && !isOnOnboardingPage) {
      localStorage.setItem('returnUrl', location.pathname + location.search);
    }
    return (
      <Suspense fallback={loadingSpinner}>
        <Login />
      </Suspense>
    );
  }

  // User is authenticated - check onboarding status
  const hasCompletedOnboarding = user?.job_title?.trim()?.length > 0 || user?.onboarding_completed === true;

  // If user completed onboarding and tries to access onboarding page, redirect to Dashboard
  if (isOnOnboardingPage && hasCompletedOnboarding) {
    window.location.href = createPageUrl("Dashboard");
    return loadingSpinner;
  }

  // If on onboarding page, show it (user is authenticated but needs to complete onboarding)
  if (isOnOnboardingPage) {
    return (
      <Suspense fallback={loadingSpinner}>
        <Onboarding />
      </Suspense>
    );
  }

  // User is authenticated but hasn't completed onboarding
  if (!hasCompletedOnboarding) {
    return (
      <Suspense fallback={loadingSpinner}>
        <Onboarding />
      </Suspense>
    );
  }

  // User is authenticated and has completed onboarding - show normal app
  return children;
}