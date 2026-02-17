import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  PenTool,
  Image as ImageIcon,
  Video,
  Send,
  Loader2,
  RefreshCw,
  Store,
  Globe,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

import ListingOverview from './ListingOverview';
import ListingImageStudio from './ListingImageStudio';
import ListingVideoStudio from './ListingVideoStudio';
import ListingPublish from './ListingPublish';
import ListingCopywriter from './ListingCopywriter';

const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'copywriter', label: 'AI Copywriter', icon: PenTool },
  { id: 'images', label: 'Image Studio', icon: ImageIcon },
  { id: 'video', label: 'Video Studio', icon: Video },
  { id: 'publish', label: 'Publish', icon: Send },
];

const CHANNELS = [
  { id: 'generic', label: 'All Channels', icon: Globe },
  { id: 'shopify', label: 'Shopify', icon: ShoppingBag },
  { id: 'bolcom', label: 'bol.com', icon: Store },
];

export default function ProductListingBuilder({ product, details, onDetailsUpdate }) {
  const { t } = useTheme();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChannel, setSelectedChannel] = useState('generic');
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Fetch existing listing from DB when product or channel changes
  const fetchListing = useCallback(async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_listings')
        .select('*')
        .eq('product_id', product.id)
        .eq('channel', selectedChannel)
        .maybeSingle();

      if (error) throw error;
      setListing(data || null);
    } catch (err) {
      console.error('[ProductListingBuilder] fetchListing error:', err);
      toast.error('Failed to load listing data');
    } finally {
      setLoading(false);
    }
  }, [product?.id, selectedChannel]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Upsert listing data back to DB
  const saveListing = useCallback(async (updates) => {
    if (!product?.id || !user?.company_id) return null;

    try {
      const payload = {
        ...listing,
        ...updates,
        product_id: product.id,
        company_id: user.company_id,
        channel: selectedChannel,
        updated_at: new Date().toISOString(),
      };

      // Remove null id to let Supabase auto-generate
      if (!payload.id) delete payload.id;

      const { data, error } = await supabase
        .from('product_listings')
        .upsert(payload, { onConflict: 'product_id,channel' })
        .select()
        .single();

      if (error) throw error;
      setListing(data);
      toast.success('Listing saved');
      return data;
    } catch (err) {
      console.error('[ProductListingBuilder] saveListing error:', err);
      toast.error('Failed to save listing');
      throw err;
    }
  }, [listing, product?.id, user?.company_id, selectedChannel]);

  // Generate all listing content via AI
  const handleGenerateAll = useCallback(async () => {
    setGenerating(true);
    try {
      // Placeholder: will call edge function for AI generation
      toast.info('AI generation coming soon');
    } catch (err) {
      console.error('[ProductListingBuilder] generateAll error:', err);
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  }, []);

  // Switch to a specific sub-tab
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Render the active sub-component
  const renderContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <ListingOverview
            product={product}
            details={details}
            listing={listing}
            onGenerateAll={handleGenerateAll}
            onTabChange={handleTabChange}
            loading={generating}
          />
        );
      case 'copywriter':
        return (
          <ListingCopywriter
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
          />
        );
      case 'images':
        return (
          <ListingImageStudio
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
          />
        );
      case 'video':
        return (
          <ListingVideoStudio
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
          />
        );
      case 'publish':
        return (
          <ListingPublish
            product={product}
            details={details}
            listing={listing}
            onUpdate={saveListing}
            channel={selectedChannel}
          />
        );
      default:
        return null;
    }
  }, [activeTab, product, details, listing, generating, handleGenerateAll, handleTabChange, saveListing, selectedChannel, t]);

  return (
    <div className="space-y-6">
      {/* Header: Sub-nav + Channel Selector */}
      <div className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border p-4',
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        {/* Sub-navigation pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 shadow-sm'
                    : cn(
                        t('text-slate-500 hover:text-slate-800 hover:bg-slate-100', 'text-zinc-400 hover:text-white hover:bg-white/5')
                      )
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Channel selector pills */}
        <div className={cn(
          'flex items-center gap-1 rounded-xl border p-1',
          t('border-slate-200 bg-slate-50', 'border-white/5 bg-white/[0.02]')
        )}>
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isActive = selectedChannel === channel.id;
            return (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  isActive
                    ? cn(
                        'shadow-sm',
                        t('bg-white text-slate-900', 'bg-zinc-800 text-white')
                      )
                    : t('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {channel.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className={cn(
          'flex items-center justify-center py-20 rounded-2xl border',
          t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          <Loader2 className={cn('w-8 h-8 animate-spin', t('text-slate-400', 'text-zinc-500'))} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
