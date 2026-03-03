import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import PulseCard from './PulseCard';
import { Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

export default function BusinessPulse({ compact = false }) {
  const { user } = useUser();
  const { t } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchPulseItems = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error: fetchError } = await supabase
        .from('business_pulse_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('pulse_date', today)
        .eq('dismissed', false)
        .order('priority_score', { ascending: false })
        .limit(7);

      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err) {
      console.error('Failed to fetch pulse items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generatePulse = useCallback(async () => {
    if (!user?.company_id) return;
    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-business-pulse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            company_id: user.company_id,
          }),
        }
      );
      const result = await response.json();
      if (result.success) {
        await fetchPulseItems();
      }
    } catch (err) {
      console.error('Failed to generate pulse:', err);
    } finally {
      setGenerating(false);
    }
  }, [user, fetchPulseItems]);

  useEffect(() => {
    fetchPulseItems();
  }, [fetchPulseItems]);

  const handleDismiss = async (itemId) => {
    await supabase
      .from('business_pulse_items')
      .update({ dismissed: true })
      .eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleActed = async (itemId) => {
    await supabase
      .from('business_pulse_items')
      .update({ acted_on: true })
      .eq('id', itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, acted_on: true } : i));
  };

  if (loading) {
    return (
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('w-6 h-6 rounded-full animate-pulse', t('bg-zinc-200', 'bg-zinc-700'))} />
          <div className={cn('h-5 w-32 rounded animate-pulse', t('bg-zinc-200', 'bg-zinc-700'))} />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={cn('h-20 rounded-xl animate-pulse', t('bg-zinc-100', 'bg-zinc-800/50'))} />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className={cn('text-lg font-semibold', t('text-zinc-900', 'text-white'))}>
            Business Pulse
          </h2>
          {items.length > 0 && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              t('bg-cyan-100 text-cyan-700', 'bg-cyan-500/10 text-cyan-400')
            )}>
              {items.length} items
            </span>
          )}
        </div>
        <button
          onClick={generatePulse}
          disabled={generating}
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors',
            t(
              'text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200',
              'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700'
            ),
            generating && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', generating && 'animate-spin')} />
          {generating ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={cn('text-center py-8', t('text-zinc-400', 'text-zinc-500'))}>
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">All caught up</p>
          <p className="text-xs opacity-70">No action items for today. Click Refresh to generate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.slice(0, compact ? 3 : 7).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <PulseCard
                  item={item}
                  onDismiss={() => handleDismiss(item.id)}
                  onActed={() => handleActed(item.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </GlassCard>
  );
}
