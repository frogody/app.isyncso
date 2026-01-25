import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
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

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await db.auth.isAuthenticated();
      if (isAuth) {
        const returnUrl = localStorage.getItem('returnUrl') || '/Dashboard';
        localStorage.removeItem('returnUrl');
        navigate(returnUrl, { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        // Sign up
        const { user, error } = await db.auth.signUpWithEmail(
          formData.email,
          formData.password,
          { full_name: formData.fullName }
        );

        if (error) {
          setError(error.message || "Failed to create account");
          return;
        }

        if (user && !user.email_confirmed_at) {
          setSuccess("Check your email for a confirmation link to complete registration.");
        } else {
          // Auto-confirmed (if email confirmation is disabled)
          await db.auth.ensureUserProfile();
          navigate('/Onboarding', { replace: true });
        }
      } else {
        // Sign in
        const { user, error } = await db.auth.signInWithEmail(
          formData.email,
          formData.password
        );

        if (error) {
          if (error.message?.includes('Invalid login')) {
            setError("Invalid email or password");
          } else if (error.message?.includes('Email not confirmed')) {
            setError("Please confirm your email before signing in");
          } else {
            setError(error.message || "Failed to sign in");
          }
          return;
        }

        if (user) {
          await db.auth.ensureUserProfile();
          const returnUrl = localStorage.getItem('returnUrl') || '/Dashboard';
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
      if (error) {
        setError(error.message || "Failed to connect to Google");
        setGoogleLoading(false);
      }
      // If successful, browser will redirect to Google
    } catch (err) {
      setError(err.message || "Failed to connect to Google");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await db.auth.resetPassword(formData.email);
      if (error) {
        setError(error.message || "Failed to send reset email");
      } else {
        setSuccess("Password reset email sent. Check your inbox.");
      }
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border-zinc-800 relative">
        <CardHeader className="text-center space-y-2">
          {/* Logo */}
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-2">
            <span className="text-lg font-bold text-white">iS</span>
          </div>

          <CardTitle className="text-2xl text-white">
            {isSignUp ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {isSignUp
              ? "Start your journey with iSyncSO"
              : "Sign in to continue to iSyncSO"
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Mail className="w-3 h-3 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 bg-white hover:bg-zinc-100 text-zinc-900 border-0"
            onClick={handleGoogleAuth}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <GoogleIcon />
            )}
            <span className="ml-3">Continue with Google</span>
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-900 text-zinc-500">or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-zinc-300">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="h-12 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="h-12 pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="h-12 pl-10 pr-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isSignUp && (
                <p className="text-xs text-zinc-500">Password must be at least 6 characters</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="text-center text-sm text-zinc-400">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
