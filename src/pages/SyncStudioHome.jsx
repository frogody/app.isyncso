import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Link,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const FEATURES = [
  {
    title: 'Auto-Import Catalog',
    description: 'Pull every SKU, title, and image from your Bol.com store in one click.',
  },
  {
    title: 'AI Photo Plans',
    description: 'Get a tailored photoshoot brief for each product, ready for your studio.',
  },
  {
    title: 'Approve & Go',
    description: 'Review, tweak, and launch -- your catalog gets the upgrade it deserves.',
  },
];

export default function SyncStudioHome() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bolConnected, setBolConnected] = useState(false);
  const [hasCatalog, setHasCatalog] = useState(false);
  const [hasActiveImport, setHasActiveImport] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    checkStatus();
  }, [user?.id]);

  async function checkStatus() {
    setLoading(true);
    try {
      const companyId = user.company_id;

      // Run all three checks in parallel
      const [bolRes, catalogRes, importRes] = await Promise.all([
        // Check Bol.com connection
        supabase
          .from('bolcom_credentials')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .limit(1),

        // Check for synced products
        supabase
          .from('sync_studio_products')
          .select('ean')
          .eq('user_id', user.id)
          .limit(1),

        // Check for active import jobs
        supabase
          .from('sync_studio_import_jobs')
          .select('id, status')
          .eq('user_id', user.id)
          .in('status', ['importing', 'planning'])
          .limit(1),
      ]);

      const connected = !bolRes.error && bolRes.data?.length > 0;
      const catalogSynced = !catalogRes.error && catalogRes.data?.length > 0;
      const activeImport = !importRes.error && importRes.data?.length > 0;

      setBolConnected(connected);
      setHasCatalog(catalogSynced);
      setHasActiveImport(activeImport);

      // Auto-redirect: active import takes priority, then existing catalog
      if (activeImport) {
        navigate('/SyncStudioImport', { replace: true });
        return;
      }
      if (catalogSynced) {
        navigate('/SyncStudioDashboard', { replace: true });
        return;
      }
    } catch (err) {
      console.error('SyncStudioHome: status check failed', err);
    } finally {
      setLoading(false);
    }
  }

  // -- Loading state (also shown briefly before redirect for States C/D) --
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Camera className="w-8 h-8 text-yellow-400" />
            </div>
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <p className="text-zinc-400 text-sm">Checking your studio setup...</p>
        </motion.div>
      </div>
    );
  }

  // -- State A: Bol.com NOT connected --
  // -- State B: Connected but no catalog synced --
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-yellow-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-yellow-600/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-yellow-500/[0.02] rounded-full blur-[80px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-24 pb-20">
        {/* Hero */}
        <motion.div
          className="flex flex-col items-center text-center"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Icon */}
          <motion.div variants={fadeUp} custom={0} className="mb-8">
            <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Camera className="w-10 h-10 text-yellow-400" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
          >
            Sync Studio
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-4 text-lg sm:text-xl text-zinc-300 max-w-xl leading-relaxed"
          >
            Turn your entire product catalog into studio-quality photography.{' '}
            <span className="text-yellow-400">Automatically.</span>
          </motion.p>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            custom={3}
            className="mt-4 text-zinc-400 max-w-lg leading-relaxed"
          >
            Connect your Bol.com store and we'll create a professional photoshoot plan
            for every product — you just approve and go.
          </motion.p>

          {/* Connection status badge (State B) */}
          {bolConnected && (
            <motion.div
              variants={fadeUp}
              custom={3.5}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20"
            >
              <CheckCircle2 className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">
                Your Bol.com account is linked
              </span>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div variants={fadeUp} custom={4} className="mt-10">
            {bolConnected ? (
              <button
                onClick={() => navigate('/SyncStudioImport')}
                className="group inline-flex items-center gap-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-xl px-8 py-3.5 text-base transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20"
              >
                Sync My Catalog
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/Integrations')}
                className="group inline-flex items-center gap-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-xl px-8 py-3.5 text-base transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20"
              >
                <Link className="w-4 h-4" />
                Connect Bol.com Store
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </motion.div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          className="mt-20 grid gap-4 sm:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }}
        >
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              custom={i}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 transition-colors hover:border-zinc-700/60"
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <span className="text-yellow-400 text-sm font-bold">{i + 1}</span>
              </div>
              <h3 className="text-white font-semibold text-base mb-1.5">{feature.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-12 text-center text-zinc-500 text-xs"
        >
          Works with your existing Bol.com Retailer API connection.
          No extra setup required.
        </motion.p>
      </div>
    </div>
  );
}
