import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/api/supabaseClient';
import {
  Loader2,
  CheckCircle,
  Users,
  Ticket,
  Building2,
  Briefcase,
  Calculator,
  FolderOpen,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Calendar,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORIES = [
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Google Calendar, Outlook Calendar',
    icon: Calendar,
    gradient: 'from-blue-600/80 to-cyan-600/80',
    featured: true
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Gmail, Outlook, Microsoft 365',
    icon: Mail,
    gradient: 'from-rose-600/80 to-pink-600/80',
    featured: true
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'HubSpot, Salesforce, Pipedrive',
    icon: Users,
    gradient: 'from-cyan-700/80 to-blue-700/80'
  },
  {
    id: 'ticketing',
    label: 'Ticketing',
    description: 'Jira, Zendesk, Linear, Asana',
    icon: Ticket,
    gradient: 'from-cyan-700/80 to-blue-700/80'
  },
  {
    id: 'hris',
    label: 'HR',
    description: 'BambooHR, Workday, Gusto',
    icon: Building2,
    gradient: 'from-cyan-700/80 to-blue-700/80'
  },
  {
    id: 'ats',
    label: 'Recruiting',
    description: 'Greenhouse, Lever, Workable',
    icon: Briefcase,
    gradient: 'from-cyan-700/80 to-blue-700/80'
  },
  {
    id: 'accounting',
    label: 'Accounting',
    description: 'QuickBooks, Xero, FreshBooks',
    icon: Calculator,
    gradient: 'from-cyan-700/80 to-blue-700/80'
  },
  {
    id: 'filestorage',
    label: 'File Storage',
    description: 'Dropbox, Box, Google Drive',
    icon: FolderOpen,
    gradient: 'from-cyan-700/80 to-blue-700/80'
  },
  {
    id: 'mktg',
    label: 'Marketing',
    description: 'Mailchimp, HubSpot Marketing',
    icon: MessageSquare,
    gradient: 'from-cyan-700/80 to-blue-700/80'
  }
];

export default function ConnectIntegrationModal({ 
  open, 
  onClose, 
  onSuccess,
  existingIntegrations = []
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select');

  const existingCategories = existingIntegrations
    .filter(i => i.status === 'active')
    .map(i => i.category);

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    setLoading(true);

    try {
      const response = await db.functions.invoke('mergeCreateLinkToken', {
        categories: [category.id]
      });

      const data = response.data;
      if (data.link_token || data.magic_link_url) {
        setStep('connecting');
        const mergeUrl = data.magic_link_url || `https://link.merge.dev/?link_token=${data.link_token}`;
        openMergeLink(mergeUrl, category.id, data.link_token);
      } else {
        throw new Error('Failed to get link token');
      }
    } catch (error) {
      console.error('Error creating link token:', error);
      toast.error('Failed to initialize connection');
      setSelectedCategory(null);
    } finally {
      setLoading(false);
    }
  };

  const openMergeLink = (mergeUrl, categoryId, linkToken) => {
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      mergeUrl,
      'MergeLink',
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    let pollAttempts = 0;
    const maxPollAttempts = 120;

    const pollTimer = setInterval(async () => {
      pollAttempts++;

      if (popup && popup.closed) {
        clearInterval(pollTimer);
        await checkIntegrationStatus(categoryId, linkToken);
      }

      if (pollAttempts >= maxPollAttempts) {
        clearInterval(pollTimer);
        setStep('select');
        setSelectedCategory(null);
        toast.error('Connection timed out');
      }
    }, 1000);

    const handleMessage = async (event) => {
      if (event.origin === 'https://link.merge.dev') {
        const { public_token } = event.data;
        if (public_token) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          await exchangeToken(public_token, categoryId);
        }
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const checkIntegrationStatus = async (categoryId, linkToken) => {
    setStep('connecting');

    try {
      const response = await db.functions.invoke('mergeCheckLinkedAccount', {
        category: categoryId,
        link_token: linkToken
      });

      if (response.data?.success && response.data?.integration) {
        setStep('success');
        toast.success(`Connected ${response.data.integration.integration_name}!`);
        setTimeout(() => {
          onSuccess?.(response.data.integration);
          handleClose();
        }, 1500);
      } else {
        setStep('select');
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Error checking integration status:', error);
      setStep('select');
      setSelectedCategory(null);
    }
  };

  const exchangeToken = async (publicToken, categoryId) => {
    setStep('connecting');
    try {
      const response = await db.functions.invoke('mergeExchangeToken', {
        public_token: publicToken,
        category: categoryId
      });

      if (response.data.success) {
        setStep('success');
        toast.success(`Connected ${response.data.integration.integration_name}!`);
        setTimeout(() => {
          onSuccess?.(response.data.integration);
          handleClose();
        }, 1500);
      } else {
        throw new Error('Failed to exchange token');
      }
    } catch (error) {
      console.error('Error exchanging token:', error);
      toast.error('Failed to complete connection');
      setStep('select');
      setSelectedCategory(null);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedCategory(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            {step === 'success' ? (
              <><CheckCircle className="w-6 h-6 text-cyan-400/80" />Connection Successful!</>
            ) : (
              <><Sparkles className="w-6 h-6 text-cyan-400/80" />Connect Integration</>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === 'select' && 'Choose a category to connect your favorite tools via Merge.'}
            {step === 'connecting' && 'Complete the authorization in the popup window...'}
            {step === 'success' && 'Your integration is now active and ready to use.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div 
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-4 mt-4"
            >
              {CATEGORIES.map((category, i) => {
                const Icon = category.icon;
                const isConnected = existingCategories.includes(category.id);
                
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => !isConnected && handleCategorySelect(category)}
                    disabled={loading || isConnected}
                    className={cn(
                      'p-5 rounded-xl border text-left transition-all group relative overflow-hidden',
                      'border-zinc-700/60 hover:border-cyan-800/50',
                      isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-800/50',
                      selectedCategory?.id === category.id && loading && 'border-cyan-800/50 bg-zinc-800/50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br', category.gradient)}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {isConnected && (
                        <Badge className="bg-cyan-900/30 text-cyan-300/80 border-cyan-800/40 text-xs">
                          Connected
                        </Badge>
                      )}
                      {selectedCategory?.id === category.id && loading && (
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400/80" />
                      )}
                    </div>
                    <h3 className="font-semibold text-white mb-1 group-hover:text-cyan-300/80 transition-colors">{category.label}</h3>
                    <p className="text-xs text-zinc-500">{category.description}</p>
                    
                    {!isConnected && (
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-5 h-5 text-cyan-400/80" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {step === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-700/80 to-blue-700/80 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-cyan-800/20 animate-ping" />
              </div>
              <p className="text-white font-medium mb-2">Connecting...</p>
              <p className="text-zinc-500 text-sm text-center max-w-xs">
                Complete the authorization in the popup window. If blocked, please allow popups.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-6 border-zinc-700 text-zinc-400 hover:text-white"
                onClick={() => {
                  setStep('select');
                  setSelectedCategory(null);
                }}
              >
                Cancel
              </Button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 rounded-2xl bg-cyan-900/30 border border-cyan-800/40 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-cyan-400/80" />
              </div>
              <p className="text-white text-lg font-semibold mb-2">Integration Connected!</p>
              <p className="text-zinc-400 text-sm">You can now execute actions through this integration.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}