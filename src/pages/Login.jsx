import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await db.auth.isAuthenticated();
      if (isAuth) {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect');
        const returnUrl = redirectUrl || localStorage.getItem('returnUrl') || '/Dashboard';
        localStorage.removeItem('returnUrl');
        navigate(returnUrl, { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        const { user, error } = await db.auth.signUpWithEmail(
          formData.email, formData.password, { full_name: formData.fullName }
        );
        if (error) { setError(error.message || "Failed to create account"); return; }
        if (user && !user.email_confirmed_at) {
          setSuccess("Check your email for a confirmation link to complete registration.");
        } else {
          await db.auth.ensureUserProfile();
          navigate('/Onboarding', { replace: true });
        }
      } else {
        const { user, error } = await db.auth.signInWithEmail(formData.email, formData.password);
        if (error) {
          if (error.message?.includes('Invalid login')) setError("Invalid email or password");
          else if (error.message?.includes('Email not confirmed')) setError("Please confirm your email before signing in");
          else setError(error.message || "Failed to sign in");
          return;
        }
        if (user) {
          await db.auth.ensureUserProfile();
          const params = new URLSearchParams(window.location.search);
          const redirectUrl = params.get('redirect');
          const returnUrl = redirectUrl || localStorage.getItem('returnUrl') || '/Dashboard';
          localStorage.removeItem('returnUrl');
          navigate(returnUrl, { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await db.auth.signInWithGoogle();
      if (error) { setError(error.message || "Failed to connect to Google"); setGoogleLoading(false); }
    } catch (err) {
      setError(err.message || "Failed to connect to Google");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) { setError("Please enter your email address first"); return; }
    setLoading(true);
    setError(null);
    try {
      const { error } = await db.auth.resetPassword(formData.email);
      if (error) setError(error.message || "Failed to send reset email");
      else setSuccess("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.06] rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[380px]">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-5 shadow-lg shadow-emerald-500/20">
            <span className="text-xl font-bold text-white tracking-tight">iS</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            iSyncSO
          </h1>
          <p className="text-sm text-zinc-500">
            AI-powered business operating system
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {isSignUp ? "Get started with your AI workspace" : "Sign in to your workspace"}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-4">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-white hover:bg-zinc-100 text-zinc-900 border-0 text-sm font-medium rounded-xl"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <GoogleIcon />
              )}
              <span className="ml-2">Continue with Google</span>
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-zinc-900/50 text-zinc-600">or</span>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-zinc-400 text-xs">Full name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Jane Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="h-10 bg-zinc-800/40 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-sm rounded-xl"
                    required={isSignUp}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-400 text-xs">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-10 pl-10 bg-zinc-800/40 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-sm rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zinc-400 text-xs">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignUp ? "Min. 6 characters" : "Enter password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="h-10 pl-10 pr-10 bg-zinc-800/40 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-sm rounded-xl"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium text-sm rounded-xl mt-1"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? "Create account" : "Sign in"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Toggle auth mode */}
        <p className="text-center text-xs text-zinc-600 mt-5">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
            className="text-emerald-400/80 hover:text-emerald-400 font-medium transition-colors"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>

        {/* Trust signal */}
        <p className="text-center text-[11px] text-zinc-700 mt-8">
          Enterprise-grade security &middot; SOC 2 compliant
        </p>
      </div>
    </div>
  );
}
