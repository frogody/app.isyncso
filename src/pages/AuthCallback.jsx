import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { db } from "@/api/supabaseClient";

/**
 * AuthCallback - Handles Supabase OAuth redirect callbacks
 *
 * This page is the redirect target after Google OAuth sign-in.
 * Supabase automatically handles the token exchange via URL hash params.
 * We just need to verify the session and redirect appropriately.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Completing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Small delay to let Supabase process the hash params
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we have a valid session now
        const isAuth = await db.auth.isAuthenticated();

        if (isAuth) {
          setStatus("success");
          setMessage("Authentication successful!");

          // Ensure user profile exists
          await db.auth.ensureUserProfile();

          // Get user data to check onboarding status
          const user = await db.auth.me();
          const hasCompletedOnboarding = user?.job_title?.trim()?.length > 0 || user?.onboarding_completed === true;

          // Determine redirect destination
          let redirectUrl;
          if (!hasCompletedOnboarding) {
            redirectUrl = '/Onboarding';
          } else {
            redirectUrl = localStorage.getItem('returnUrl') || '/Dashboard';
            localStorage.removeItem('returnUrl');
          }

          // Small delay to show success message
          setTimeout(() => {
            navigate(redirectUrl, { replace: true });
          }, 1000);
        } else {
          // Check for error in URL params
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          if (error) {
            setStatus("error");
            setMessage(errorDescription || error || "Authentication failed");
            setTimeout(() => {
              navigate('/Login', { replace: true });
            }, 3000);
          } else {
            // No session and no error - something went wrong
            setStatus("error");
            setMessage("Session not found. Please try again.");
            setTimeout(() => {
              navigate('/Login', { replace: true });
            }, 3000);
          }
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage(error.message || "An unexpected error occurred");
        setTimeout(() => {
          navigate('/Login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center">
        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-white mb-2">{message}</h1>
            <p className="text-zinc-500">Please wait while we complete your sign-in</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">{message}</h1>
            <p className="text-zinc-500">Redirecting you now...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Authentication Failed</h1>
            <p className="text-red-400 mb-2">{message}</p>
            <p className="text-zinc-500">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
