/**
 * DomainSetup - Domain configuration panel for the B2B store builder.
 *
 * SubdomainSection: input + .isyncso.com suffix, availability check via debounce.
 * CustomDomainSection: domain input, DNS instructions with CNAME record display,
 * verify button calling manage-custom-domain edge fn, SSL badge.
 * RedirectSettings: www redirect toggle, force HTTPS toggle.
 * Props: config, onUpdate.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Check,
  X,
  Loader2,
  AlertCircle,
  Copy,
  Shield,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Lock,
  Info,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// SubdomainSection
// ---------------------------------------------------------------------------

function SubdomainSection({ subdomain, onUpdate }) {
  const [value, setValue] = useState(subdomain || '');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null); // null | true | false
  const debounceRef = useRef(null);

  const checkAvailability = useCallback(async (slug) => {
    if (!slug || slug.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);

    try {
      const { data, error } = await supabase
        .from('b2b_store_configs')
        .select('id')
        .eq('subdomain', slug.toLowerCase())
        .neq('organization_id', onUpdate._orgId || '')
        .limit(1);

      if (error) throw error;
      setAvailable(!data || data.length === 0);
    } catch (err) {
      console.error('[DomainSetup] subdomain check error:', err);
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  }, [onUpdate._orgId]);

  const handleChange = (e) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setValue(raw);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkAvailability(raw), 500);
  };

  const handleSave = () => {
    if (available && value.length >= 3) {
      onUpdate({ subdomain: value.toLowerCase() });
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <Globe className="w-4 h-4 text-cyan-400" />
        Subdomain
      </h3>
      <p className="text-xs text-zinc-500 mb-4">Your free subdomain on isyncso.com</p>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="your-store"
            maxLength={48}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors pr-36 font-mono"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none">
            .isyncso.com
          </span>
        </div>

        {/* Status indicator */}
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          {checking ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
          ) : available === true ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : available === false ? (
            <X className="w-4 h-4 text-red-400" />
          ) : null}
        </div>
      </div>

      {/* Feedback text */}
      {available === false && (
        <p className="text-xs text-red-400 mt-2">This subdomain is already taken.</p>
      )}
      {available === true && value.length >= 3 && (
        <p className="text-xs text-emerald-400 mt-2">This subdomain is available.</p>
      )}
      {value.length > 0 && value.length < 3 && (
        <p className="text-xs text-zinc-500 mt-2">Minimum 3 characters.</p>
      )}

      {/* Save */}
      {available && value !== subdomain && value.length >= 3 && (
        <button
          onClick={handleSave}
          className="mt-3 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
        >
          Save Subdomain
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CustomDomainSection
// ---------------------------------------------------------------------------

function CustomDomainSection({ customDomain, sslStatus, organizationId, onUpdate }) {
  const [domain, setDomain] = useState(customDomain || '');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { success, message }
  const [copied, setCopied] = useState(false);

  const cnameTarget = 'cname.isyncso.com';

  const handleVerify = async () => {
    if (!domain.trim()) return;
    setVerifying(true);
    setVerifyResult(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-custom-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'verify',
          domain: domain.trim().toLowerCase(),
          organizationId,
        }),
      });

      const result = await response.json();

      if (result.verified) {
        setVerifyResult({ success: true, message: 'Domain verified successfully.' });
        onUpdate({ custom_domain: domain.trim().toLowerCase(), ssl_status: 'pending' });
      } else {
        setVerifyResult({
          success: false,
          message: result.message || 'CNAME record not found. Please check your DNS settings.',
        });
      }
    } catch (err) {
      console.error('[DomainSetup] verify error:', err);
      setVerifyResult({ success: false, message: 'Verification failed. Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/manage-custom-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'remove',
          domain: customDomain,
          organizationId,
        }),
      });
      onUpdate({ custom_domain: null, ssl_status: null });
      setDomain('');
      setVerifyResult(null);
    } catch (err) {
      console.error('[DomainSetup] remove error:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <Lock className="w-4 h-4 text-cyan-400" />
        Custom Domain
      </h3>
      <p className="text-xs text-zinc-500 mb-4">Connect your own domain to the store</p>

      {/* Domain input */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/\s/g, ''))}
          placeholder="store.yourdomain.com"
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors font-mono"
        />
        <button
          onClick={handleVerify}
          disabled={verifying || !domain.trim()}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Verify
        </button>
      </div>

      {/* DNS instructions */}
      <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-zinc-300">DNS Configuration</span>
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          Add the following CNAME record to your domain's DNS settings:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700/50">
                <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Type</th>
                <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Name</th>
                <th className="text-left py-2 pr-4 text-zinc-500 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 pr-4 text-cyan-400 font-mono">CNAME</td>
                <td className="py-2 pr-4 text-zinc-300 font-mono">
                  {domain ? domain.split('.')[0] : 'store'}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-mono">{cnameTarget}</span>
                    <button
                      onClick={() => copyToClipboard(cnameTarget)}
                      className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                      title="Copy"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify result */}
      <AnimatePresence>
        {verifyResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-xs ${
              verifyResult.success
                ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/5 border border-red-500/20 text-red-400'
            }`}
          >
            {verifyResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {verifyResult.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SSL status badge */}
      {customDomain && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sslStatus === 'active' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Shield className="w-4 h-4 text-amber-400" />
            )}
            <span className={`text-xs font-medium ${sslStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
              SSL {sslStatus === 'active' ? 'Active' : 'Pending'}
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Remove domain
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RedirectSettings
// ---------------------------------------------------------------------------

function RedirectSettings({ wwwRedirect, forceHttps, onUpdate }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-cyan-400" />
        Redirect Settings
      </h3>

      <div className="space-y-4">
        {/* WWW redirect */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">WWW Redirect</p>
            <p className="text-xs text-zinc-500">Redirect www.domain.com to domain.com</p>
          </div>
          <button
            onClick={() => onUpdate({ www_redirect: !wwwRedirect })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              wwwRedirect ? 'bg-cyan-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                wwwRedirect ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Force HTTPS */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">Force HTTPS</p>
            <p className="text-xs text-zinc-500">Redirect all HTTP traffic to HTTPS</p>
          </div>
          <button
            onClick={() => onUpdate({ force_https: !forceHttps })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              forceHttps ? 'bg-cyan-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                forceHttps ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DomainSetup({ config, onUpdate }) {
  // Attach org ID to onUpdate for subdomain check to filter self
  const enhancedOnUpdate = Object.assign(onUpdate, { _orgId: config?.organization_id });

  return (
    <div className="space-y-6">
      <SubdomainSection
        subdomain={config?.subdomain}
        onUpdate={enhancedOnUpdate}
      />

      <CustomDomainSection
        customDomain={config?.custom_domain}
        sslStatus={config?.ssl_status}
        organizationId={config?.organization_id}
        onUpdate={onUpdate}
      />

      <RedirectSettings
        wwwRedirect={config?.www_redirect !== false}
        forceHttps={config?.force_https !== false}
        onUpdate={onUpdate}
      />
    </div>
  );
}
