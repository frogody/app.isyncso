import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Shield, ArrowRight, Loader2 } from "lucide-react";
import { db, supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";

/**
 * TermsAcceptanceGate - Blocking interstitial for users who haven't accepted ToS/PP.
 *
 * Shown after authentication and onboarding are complete, but before the app renders.
 * User cannot proceed without accepting.
 *
 * @param {Object} props
 * @param {Object} props.user - Current user object (must have .id)
 * @param {Function} props.onAccepted - Callback after successful acceptance
 */
export default function TermsAcceptanceGate({ user, onAccepted }) {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleAccept = async () => {
    if (!accepted) return;
    setSaving(true);
    setError(null);

    const now = new Date().toISOString();
    try {
      // Try updateMe first
      await db.auth.updateMe({ terms_accepted_at: now, terms_version: '2026-02-26' });
      onAccepted?.();
    } catch (e) {
      console.warn('[TermsGate] updateMe failed, trying direct:', e);
      try {
        const { error: dbErr } = await supabase
          .from('users')
          .update({ terms_accepted_at: now, terms_version: '2026-02-26' })
          .eq('id', user.id);
        if (dbErr) throw dbErr;
        onAccepted?.();
      } catch (e2) {
        console.error('[TermsGate] Failed to save:', e2);
        setError('Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.05] rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/isyncso-logo.png"
            alt="ISYNCSO"
            className="w-20 h-20 mx-auto mb-3 object-contain"
           loading="lazy" decoding="async" />
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Updated Terms</h2>
              <p className="text-xs text-zinc-500">Please review and accept to continue</p>
            </div>
          </div>

          <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
            We've published our Terms of Service and Privacy Policy. To continue using ISYNCSO,
            please review and accept them below.
          </p>

          {/* Links */}
          <div className="space-y-2 mb-6">
            <Link
              to="/terms"
              target="_blank"
              className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
            >
              <FileText className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
              <div className="flex-1">
                <span className="text-sm text-white group-hover:text-cyan-400 transition-colors">Terms of Service</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
            </Link>
            <Link
              to="/privacy"
              target="_blank"
              className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
            >
              <Shield className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
              <div className="flex-1">
                <span className="text-sm text-white group-hover:text-cyan-400 transition-colors">Privacy Policy</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
            </Link>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          {/* Checkbox */}
          <label className="flex items-start gap-2.5 mb-5 cursor-pointer group">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
              I have read and agree to the{' '}
              <Link to="/terms" target="_blank" className="text-cyan-400 hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" target="_blank" className="text-cyan-400 hover:underline">Privacy Policy</Link>
            </span>
          </label>

          {/* Submit */}
          <Button
            onClick={handleAccept}
            disabled={!accepted || saving}
            className="w-full h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium text-sm rounded-xl disabled:opacity-30"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue to ISYNCSO
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-[11px] text-zinc-700 mt-6">
          ISYNCSO &middot; GDPR compliant &middot; Your data stays yours
        </p>
      </div>
    </div>
  );
}
