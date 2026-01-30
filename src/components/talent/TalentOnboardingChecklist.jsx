/**
 * Talent Onboarding Checklist
 * Interactive checklist to guide new recruiters through the platform
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  X,
  Sparkles,
  Briefcase,
  Users,
  Package,
  Target,
  Send,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';

const STORAGE_KEY = 'talent_onboarding_dismissed';

const CHECKLIST_ITEMS = [
  {
    id: 'create_project',
    title: 'Create your first project',
    description: 'Set up a hiring project to organize your roles',
    icon: Briefcase,
    action: 'new_project',
    color: 'text-red-400',
  },
  {
    id: 'add_role',
    title: 'Add a role to your project',
    description: 'Define the position you\'re hiring for',
    icon: Target,
    action: 'add_role',
    color: 'text-red-400',
  },
  {
    id: 'purchase_nest',
    title: 'Purchase a candidate nest',
    description: 'Get curated candidate pools from the marketplace',
    icon: Package,
    action: 'marketplace',
    color: 'text-red-400',
  },
  {
    id: 'run_matching',
    title: 'Link nest to role and run AI matching',
    description: 'Let AI find the best candidates for your role',
    icon: Sparkles,
    action: 'campaigns',
    color: 'text-red-400',
  },
  {
    id: 'send_outreach',
    title: 'Send your first outreach message',
    description: 'Reach out to matched candidates',
    icon: Send,
    action: 'outreach',
    color: 'text-red-400',
  },
];

const TalentOnboardingChecklist = ({
  organizationId,
  onCreateProject,
  onAddRole,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [completionState, setCompletionState] = useState({
    create_project: false,
    add_role: false,
    purchase_nest: false,
    run_matching: false,
    send_outreach: false,
  });
  const [loading, setLoading] = useState(true);

  // Check if dismissed from localStorage
  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setDismissed(isDismissed);
  }, []);

  // Fetch completion state from database
  useEffect(() => {
    if (!organizationId || dismissed) {
      setLoading(false);
      return;
    }

    const checkCompletionState = async () => {
      try {
        const [
          projectsRes,
          rolesRes,
          purchasesRes,
          campaignsRes,
          messagesRes,
        ] = await Promise.all([
          // Check for projects
          supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),

          // Check for roles
          supabase
            .from('roles')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),

          // Check for nest purchases
          supabase
            .from('nest_purchases')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'completed'),

          // Check for campaigns with matches
          supabase
            .from('campaigns')
            .select('id, matched_candidates')
            .eq('organization_id', organizationId)
            .not('matched_candidates', 'is', null),

          // Check for sent outreach messages
          supabase
            .from('outreach_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'completed'),
        ]);

        // Determine completion states
        const hasProjects = (projectsRes.count || 0) > 0;
        const hasRoles = (rolesRes.count || 0) > 0;
        const hasPurchases = (purchasesRes.count || 0) > 0;

        // Check if any campaign has matched candidates
        const hasMatches = campaignsRes.data?.some(
          c => c.matched_candidates && c.matched_candidates.length > 0
        ) || false;

        const hasSentMessages = (messagesRes.count || 0) > 0;

        setCompletionState({
          create_project: hasProjects,
          add_role: hasRoles,
          purchase_nest: hasPurchases,
          run_matching: hasMatches,
          send_outreach: hasSentMessages,
        });
      } catch (error) {
        console.error('Error checking onboarding state:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCompletionState();
  }, [organizationId, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const handleItemClick = (item) => {
    switch (item.action) {
      case 'new_project':
        if (onCreateProject) {
          onCreateProject();
        }
        break;
      case 'add_role':
        if (onAddRole) {
          onAddRole();
        }
        break;
      case 'marketplace':
        navigate('/marketplace/nests');
        break;
      case 'campaigns':
        navigate('/TalentCampaigns');
        break;
      case 'outreach':
        navigate('/TalentCampaigns');
        break;
      default:
        break;
    }
  };

  // Calculate progress
  const completedCount = Object.values(completionState).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const allComplete = completedCount === totalCount;

  // Don't render if dismissed or all complete
  if (dismissed || allComplete) {
    return null;
  }

  // Don't render while loading
  if (loading) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 p-4 mb-4"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Get Started
                  <span className="text-sm font-normal text-zinc-400">
                    ({completedCount}/{totalCount} complete)
                  </span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Complete these steps to set up your recruiting workflow
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-zinc-800 rounded-full mb-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
            />
          </div>

          {/* Checklist items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {CHECKLIST_ITEMS.map((item, index) => {
              const isComplete = completionState[item.id];
              const Icon = item.icon;
              const isNextStep = !isComplete &&
                CHECKLIST_ITEMS.slice(0, index).every(
                  prev => completionState[prev.id]
                );

              return (
                <motion.button
                  key={item.id}
                  onClick={() => !isComplete && handleItemClick(item)}
                  disabled={isComplete}

                  whileTap={!isComplete ? { scale: 0.98 } : {}}
                  className={`
                    relative p-3 rounded-lg text-left transition-all group
                    ${isComplete
                      ? 'bg-red-500/10 border border-red-500/20 cursor-default'
                      : isNextStep
                        ? 'bg-zinc-800/80 border border-red-500/30 hover:border-red-500/50 cursor-pointer'
                        : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 cursor-pointer'
                    }
                  `}
                >
                  {/* Step number badge */}
                  <div className={`
                    absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                    ${isComplete
                      ? 'bg-red-500 text-white'
                      : isNextStep
                        ? 'bg-red-500 text-white'
                        : 'bg-zinc-700 text-zinc-400'
                    }
                  `}>
                    {isComplete ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="flex items-start gap-2 mt-1">
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      isComplete ? 'text-red-400' : item.color
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium leading-tight ${
                        isComplete ? 'text-red-400 line-through' : 'text-white'
                      }`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Arrow indicator for next step */}
                  {!isComplete && isNextStep && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Dismiss link */}
          <div className="mt-3 text-center">
            <button
              onClick={handleDismiss}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              I know what I'm doing, hide this
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TalentOnboardingChecklist;
