import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Monitor } from "lucide-react";
import { db } from "@/api/supabaseClient";

/**
 * DesktopAuth - Handles authentication for the SYNC Desktop app
 *
 * Flow:
 * 1. Desktop app opens browser to /desktop-auth?state=xxx
 * 2. If not logged in, redirect to login with returnUrl
 * 3. If logged in, get session token
 * 4. Redirect to isyncso://auth?token=xxx&state=yyy
 * 5. Desktop app receives token via deep link
 */
export default function DesktopAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Connecting to SYNC Desktop...");

  useEffect(() => {
    const handleDesktopAuth = async () => {
      try {
        // Get state parameter from URL (CSRF protection)
        const state = searchParams.get("state");

        if (!state) {
          setStatus("error");
          setMessage("Invalid request: missing state parameter");
          return;
        }

        // Check if user is logged in
        const isAuth = await db.auth.isAuthenticated();

        if (!isAuth) {
          // Not logged in - redirect to login with returnUrl
          // After login, user will be redirected back here
          const returnUrl = `/desktop-auth?state=${state}`;
          localStorage.setItem("returnUrl", returnUrl);
          navigate("/Login", { replace: true });
          return;
        }

        // User is logged in - get the session
        const { data: sessionData, error: sessionError } = await db.supabase.auth.getSession();

        if (sessionError || !sessionData?.session?.access_token) {
          setStatus("error");
          setMessage("Failed to get session. Please try logging in again.");
          setTimeout(() => {
            navigate("/Login", { replace: true });
          }, 3000);
          return;
        }

        const accessToken = sessionData.session.access_token;

        // Success! Redirect to desktop app via deep link
        setStatus("success");
        setMessage("Authentication successful! Opening SYNC Desktop...");

        // Build the deep link URL
        const deepLinkUrl = `isyncso://auth?token=${encodeURIComponent(accessToken)}&state=${encodeURIComponent(state)}`;

        // Small delay to show success message, then redirect
        setTimeout(() => {
          // Redirect to deep link
          window.location.href = deepLinkUrl;

          // Show a message in case the redirect doesn't work
          setTimeout(() => {
            setMessage("If the desktop app didn't open, please make sure SYNC Desktop is installed and try again.");
          }, 2000);
        }, 1000);

      } catch (error) {
        console.error("Desktop auth error:", error);
        setStatus("error");
        setMessage(error.message || "An unexpected error occurred");
      }
    };

    handleDesktopAuth();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-md px-6">
        {/* Desktop App Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto border border-white/10">
            <Monitor className="w-10 h-10 text-purple-400" />
          </div>
        </div>

        {status === "processing" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-white mb-2">{message}</h1>
            <p className="text-zinc-500">Please wait while we verify your account</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Connected!</h1>
            <p className="text-zinc-400 mb-4">{message}</p>
            <p className="text-sm text-zinc-600">
              You can close this tab and return to the desktop app.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Connection Failed</h1>
            <p className="text-red-400 mb-4">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </>
        )}

        {/* Info box */}
        <div className="mt-12 p-4 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-sm font-medium text-white mb-2">About SYNC Desktop</h3>
          <p className="text-xs text-zinc-500">
            SYNC Desktop tracks your activity to provide smarter assistance.
            Your data is encrypted and only you can access it.
          </p>
        </div>
      </div>
    </div>
  );
}
