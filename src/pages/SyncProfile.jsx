import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Sparkles, Loader2, Monitor, Users, Zap, Calendar,
  Briefcase, Star, CheckCircle2, XCircle, MessageSquare,
  Brain, Heart, Palette, Clock, Target
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/GlassCard';
import { SyncPageHeader } from '@/components/sync/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useUser } from '@/components/context/UserContext';

const SLIDE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = (delay = 0) => ({
  ...SLIDE_UP,
  transition: { ...SLIDE_UP.transition, delay },
});

const CATEGORY_COLORS = {
  work_style: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  preference: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  skill: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  interest: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  personality: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  habit: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
};

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.work_style;
}

export default function SyncProfile() {
  const { user, company } = useUser();
  const [biography, setBiography] = useState(null);
  const [assumptions, setAssumptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, assumption: null });
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [bioRes, assumpRes] = await Promise.all([
        db.from('user_profile_biography').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
        db.from('user_profile_assumptions').select('*').eq('user_id', user.id).order('confidence', { ascending: false }),
      ]);
      if (bioRes.data) setBiography(bioRes.data);
      if (assumpRes.data) setAssumptions(assumpRes.data);
    } catch (err) {
      // No data yet is fine
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co'}/functions/v1/generate-user-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId: user.id, companyId: user.company_id }),
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate profile');
      }
      toast.success('Profile generated successfully');
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to generate profile');
    } finally {
      setGenerating(false);
    }
  }

  async function handleConfirmAssumption(assumption) {
    const { error } = await db
      .from('user_profile_assumptions')
      .update({ status: 'confirmed', reviewed_at: new Date().toISOString() })
      .eq('id', assumption.id);
    if (error) {
      toast.error('Failed to confirm assumption');
      return;
    }
    setAssumptions((prev) =>
      prev.map((a) => (a.id === assumption.id ? { ...a, status: 'confirmed', reviewed_at: new Date().toISOString() } : a))
    );
    toast.success('Assumption confirmed');
  }

  async function handleRejectAssumption() {
    const assumption = feedbackModal.assumption;
    if (!assumption) return;
    const { error } = await db
      .from('user_profile_assumptions')
      .update({ status: 'rejected', user_feedback: feedbackText, reviewed_at: new Date().toISOString() })
      .eq('id', assumption.id);
    if (error) {
      toast.error('Failed to submit correction');
      return;
    }
    setAssumptions((prev) =>
      prev.map((a) =>
        a.id === assumption.id ? { ...a, status: 'rejected', user_feedback: feedbackText, reviewed_at: new Date().toISOString() } : a
      )
    );
    setFeedbackModal({ open: false, assumption: null });
    setFeedbackText('');
    toast.success('Correction submitted');
  }

  const displayName = user?.full_name || user?.name || user?.email || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const topApps = biography?.top_apps || [];
  const topClients = biography?.top_clients || [];
  const dataSources = biography?.data_sources_used || {};
  const workStyle = biography?.work_style || [];
  const interests = biography?.interests || [];
  const skills = biography?.skills || [];
  const topCoworkers = biography?.top_coworkers || [];

  const maxAppMinutes = topApps.length > 0 ? Math.max(...topApps.map((a) => a.avg_daily_minutes || a.daily_minutes || 0), 1) : 1;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <SyncPageHeader icon={User} title="Profile" subtitle="Your AI-generated biography" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl bg-zinc-800/50" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl bg-zinc-800/50" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-48 rounded-2xl bg-zinc-800/50" />
              <Skeleton className="h-48 rounded-2xl bg-zinc-800/50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!biography) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <SyncPageHeader icon={User} title="Profile" subtitle="Your AI-generated biography" />
          <motion.div {...stagger(0.1)} className="flex flex-col items-center justify-center py-24">
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-12 max-w-md text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <User className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">SYNC hasn't built your profile yet</h2>
                <p className="text-sm text-zinc-400">Generate your first biography to see how SYNC understands you.</p>
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate My Profile
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <SyncPageHeader icon={User} title="Profile" subtitle="Your AI-generated biography">
          <Button onClick={handleGenerate} disabled={generating} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Regenerate Profile
              </>
            )}
          </Button>
        </SyncPageHeader>

        {/* Hero Card */}
        <motion.div {...stagger(0.05)} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-start gap-5 mb-6">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-500/30 flex items-center justify-center">
                <span className="text-xl font-bold text-cyan-400">{initials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-white">{displayName}</h2>
              {biography.tagline && <p className="text-sm text-cyan-400 mt-0.5 italic">"{biography.tagline}"</p>}
              <p className="text-xs text-zinc-500 mt-1">
                {company?.name || 'Your company'}
                {biography.created_at && (
                  <> &middot; Last generated {formatDistanceToNow(new Date(biography.updated_at || biography.created_at), { addSuffix: true })}</>
                )}
              </p>
            </div>
          </div>
          {biography.biography && (
            <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
              {biography.biography.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </motion.div>

        {/* Stats Row */}
        <motion.div {...stagger(0.1)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Monitor} label="Active Apps" value={topApps.length} color="cyan" delay={0.1} />
          <StatCard icon={Users} label="Top Clients" value={topClients.length} color="blue" delay={0.15} />
          <StatCard icon={Zap} label="Actions Run" value={dataSources.action_templates || 0} color="purple" delay={0.2} />
          <StatCard icon={Calendar} label="Days Tracked" value={dataSources.activity_days || 0} color="amber" delay={0.25} />
        </motion.div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Style Card */}
          <motion.div {...stagger(0.15)} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-white">Work Style</h3>
            </div>
            {workStyle.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {workStyle.map((item, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  >
                    {typeof item === 'string' ? item : item.label || item.name || JSON.stringify(item)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No work style data yet</p>
            )}
          </motion.div>

          {/* Interests & Skills Card */}
          <motion.div {...stagger(0.2)} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-white">Interests & Skills</h3>
            </div>
            <div className="space-y-3">
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interests.map((item, i) => (
                    <span
                      key={`int-${i}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                      {typeof item === 'string' ? item : item.name || JSON.stringify(item)}
                    </span>
                  ))}
                </div>
              )}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((item, i) => (
                    <span
                      key={`skill-${i}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-700/50 text-zinc-300 border border-zinc-600/30"
                    >
                      {typeof item === 'string' ? item : item.name || JSON.stringify(item)}
                    </span>
                  ))}
                </div>
              )}
              {interests.length === 0 && skills.length === 0 && (
                <p className="text-xs text-zinc-500">No interests or skills data yet</p>
              )}
            </div>
          </motion.div>

          {/* Top Coworkers Card */}
          <motion.div {...stagger(0.25)} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-white">Top Coworkers</h3>
            </div>
            {topCoworkers.length > 0 ? (
              <div className="space-y-3">
                {topCoworkers.map((cw, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{cw.name || cw.full_name || 'Unknown'}</p>
                      {cw.context && <p className="text-xs text-zinc-500 truncate">{cw.context}</p>}
                    </div>
                    <span className="text-xs text-zinc-400 whitespace-nowrap ml-3">
                      {cw.interaction_count || cw.interactions || 0} interactions
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No coworker data yet</p>
            )}
          </motion.div>

          {/* Top Apps Card */}
          <motion.div {...stagger(0.3)} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-medium text-white">Top Apps</h3>
            </div>
            {topApps.length > 0 ? (
              <div className="space-y-3">
                {topApps.map((app, i) => {
                  const mins = app.avg_daily_minutes || app.daily_minutes || 0;
                  const pct = Math.round((mins / maxAppMinutes) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-white truncate">{app.name || app.app_name || 'Unknown'}</p>
                        <span className="text-xs text-zinc-400 whitespace-nowrap ml-3">{app.avg_daily_minutes || app.daily_minutes || 0} min/day</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No app usage data yet</p>
            )}
          </motion.div>
        </div>

        {/* Assumptions Card (Full Width) */}
        {assumptions.length > 0 && (
          <motion.div {...stagger(0.35)} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Brain className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-white">What SYNC thinks about you</h3>
              <span className="text-xs text-zinc-500 ml-auto">{assumptions.length} assumptions</span>
            </div>
            <div className="space-y-4">
              {assumptions.map((a) => {
                const catColor = getCategoryColor(a.category);
                const isConfirmed = a.status === 'confirmed';
                const isRejected = a.status === 'rejected';

                return (
                  <div key={a.id} className="border border-zinc-800/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 px-2.5 py-1 text-[10px] font-medium rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                        {(a.category || 'general').replace('_', ' ')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isRejected ? 'line-through text-zinc-500' : 'text-white'}`}>
                          "{a.assumption}"
                        </p>
                        {a.evidence && (
                          <p className="text-xs text-zinc-500 mt-1">
                            Evidence: {a.evidence}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs text-zinc-500 whitespace-nowrap">Confidence:</span>
                            <div className="flex-1 max-w-[120px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500/60 rounded-full"
                                style={{ width: `${Math.round((a.confidence || 0) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-400 whitespace-nowrap">{Math.round((a.confidence || 0) * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isConfirmed ? (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed
                              </Badge>
                            ) : isRejected ? (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                                <XCircle className="w-3 h-3 mr-1" /> Rejected
                              </Badge>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-green-400 hover:bg-green-500/10"
                                  onClick={() => handleConfirmAssumption(a)}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-400 hover:bg-red-500/10"
                                  onClick={() => {
                                    setFeedbackModal({ open: true, assumption: a });
                                    setFeedbackText('');
                                  }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" /> Wrong
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Feedback Modal */}
      <Dialog open={feedbackModal.open} onOpenChange={(open) => setFeedbackModal({ open, assumption: open ? feedbackModal.assumption : null })}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Why is this wrong?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">"{feedbackModal.assumption?.assumption}"</p>
          <textarea
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            rows={4}
            placeholder="Explain why this assumption is incorrect..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFeedbackModal({ open: false, assumption: null })}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleRejectAssumption}>
              Submit Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
