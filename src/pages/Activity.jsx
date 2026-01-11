import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Phone, Calendar, FileText, Target, MessageSquare, Clock, TrendingUp, Users, CheckCircle,
  RefreshCw, Copy, Check, Send, Zap, Activity as ActivityIcon, Briefcase, Globe, Wifi, WifiOff,
  Loader2, AlertTriangle, Settings, Trash2, ChevronRight, Sparkles, BarChart3, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard, StatCard, ProgressRing } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  supabase, subscribeToEvents, fetchEvents, sendClaudePrompt, registerSession, checkSession
} from "@/components/sync/supabaseSync";
import { formatTimeAgo } from "@/utils/dateUtils";

const CLAY_ICON_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/68ebfb48566133bc1cface8c/d80dd1b25_ClayArchMarque.png";
const LINKEDIN_ICON_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/68ebfb48566133bc1cface8c/6c9d5c78c_linkedin.png";
const CLAUDE_ICON_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/68ebfb48566133bc1cface8c/1850cd012_claude-color.png";

const PLATFORM_CONFIG = {
  linkedin: { icon: null, image: LINKEDIN_ICON_URL, color: 'blue', label: 'LinkedIn', gradient: 'from-blue-500 to-blue-600' },
  gmail: { icon: Mail, color: 'red', label: 'Gmail', gradient: 'from-red-500 to-orange-500' },
  clay: { icon: null, image: CLAY_ICON_URL, color: 'orange', label: 'Clay', gradient: 'from-orange-500 to-amber-500' },
  claude: { icon: null, image: CLAUDE_ICON_URL, color: 'purple', label: 'Claude', gradient: 'from-purple-500 to-pink-500' },
  hubspot: { icon: TrendingUp, color: 'amber', label: 'HubSpot', gradient: 'from-amber-500 to-orange-500' }
};

const EVENT_ICONS = {
  'platform:detected': Zap,
  'page:view': ActivityIcon,
  'profile:view': Users,
  'action:connect_click': Users,
  'action:message_click': MessageSquare,
  'action:like': ActivityIcon,
  'connection:sent': CheckCircle,
  'message:sent': Send,
  'search:query': ActivityIcon,
  'email:open': Mail,
  'email:sent': Send,
  'prompt:sent': MessageSquare
};



const integrationSuggestions = {
  email: { name: 'Gmail', icon: Mail, description: 'Sync emails automatically', color: 'red', stats: '2.4k synced' },
  call: { name: 'Google Meet', icon: Phone, description: 'Track call recordings', color: 'green', stats: '156 calls' },
  meeting: { name: 'Google Calendar', icon: Calendar, description: 'Sync all meetings', color: 'blue', stats: '89 events' },
  deal: { name: 'HubSpot', icon: Target, description: 'Track deal progress', color: 'orange', stats: '$248k' },
  note: { name: 'Notion', icon: FileText, description: 'Sync notes & docs', color: 'gray', stats: '312 notes' }
};

export default function Activity() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [inputSessionId, setInputSessionId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncErrors, setSyncErrors] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncLinkedIn, setSyncLinkedIn] = useState(true);
  const [syncGmail, setSyncGmail] = useState(true);


  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await db.auth.me();
      setUser(userData);
      const storedSession = localStorage.getItem(`sync_session_${userData.id}`);
      if (storedSession) {
        // Verify the session still exists in Supabase before auto-connecting
        const { exists } = await checkSession(storedSession);
        if (exists) {
          setSessionId(storedSession);
          setInputSessionId(storedSession);
          await registerSession(storedSession, userData?.id, userData?.email);
        } else {
          // Clear stale session from localStorage
          localStorage.removeItem(`sync_session_${userData.id}`);
          console.log('Cleared stale session from localStorage');
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    const checkRecentActivity = (events) => {
      if (!events || events.length === 0) return false;
      const mostRecent = new Date(events[0].created_at);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return mostRecent.getTime() > fiveMinutesAgo;
    };

    const loadEvents = async () => {
      const { data } = await fetchEvents(sessionId, 100);
      if (data) {
        setEvents(data);
        setIsConnected(checkRecentActivity(data));
        if (data.length > 0) setLastSyncTime(new Date(data[0].created_at));
      }
    };
    loadEvents();

    const subscription = subscribeToEvents(sessionId, (newEvent) => {
      setEvents(prev => [newEvent, ...prev]);
      setIsConnected(true);
      setLastSyncTime(new Date());
    });

    // Periodically check if connection is still active (no events in 5 min = disconnected)
    const connectionCheck = setInterval(() => {
      setEvents(prev => {
        setIsConnected(checkRecentActivity(prev));
        return prev;
      });
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(connectionCheck);
    };
  }, [sessionId]);

  const connectSession = async () => {
    if (!inputSessionId.trim()) return;
    const cleanSessionId = inputSessionId.trim();
    setConnecting(true);
    
    try {
      const { data, error, isNew } = await registerSession(cleanSessionId, user?.id, user?.email);
      if (error) {
        console.error('Session registration error:', error);
        toast.error(`Session error: ${error.message || 'Unknown error'}`);
        return;
      }
      
      toast.success(isNew ? 'Session created! Now paste this ID in your extension.' : 'Session reconnected!');
      setSessionId(cleanSessionId);
      if (user) localStorage.setItem(`sync_session_${user.id}`, cleanSessionId);
    } catch (err) {
      console.error('Failed to register session:', err);
      toast.error('Failed to register session');
    } finally {
      setConnecting(false);
    }
  };

  const generateSessionId = () => {
    // Generate a unique session ID using crypto for better uniqueness
    const randomPart = crypto.randomUUID().split('-')[0];
    const timestamp = Date.now().toString(36);
    const userPart = user?.email?.split('@')[0]?.slice(0, 8) || 'user';
    const newId = `${userPart}-${timestamp}-${randomPart}`;
    setInputSessionId(newId);
    console.log('Generated new session ID:', newId);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const { data } = await fetchEvents(sessionId, 100);
      if (data) {
        setEvents(data);
        setLastSyncTime(new Date());
        toast.success('Synced!');
      }
    } catch (error) {
      setSyncErrors(prev => [...prev, { time: new Date(), message: error.message }]);
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = () => {
    if (!confirm('Clear all cached data?')) return;
    setEvents([]);
    setSyncErrors([]);
    toast.success('Cache cleared');
  };

  const handleDisconnectSession = () => {
    if (!confirm('Disconnect this session? You will need to reconnect with a new session ID.')) return;
    if (user) localStorage.removeItem(`sync_session_${user.id}`);
    setSessionId('');
    setInputSessionId('');
    setEvents([]);
    setIsConnected(false);
    toast.success('Session disconnected');
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || !sessionId) return;
    setSending(true);
    try {
      await sendClaudePrompt(sessionId, prompt);
      setPrompt('');
      toast.success('Prompt sent to Claude');
    } catch (error) {
      toast.error('Failed to send prompt');
    } finally {
      setSending(false);
    }
  };

  const platformStats = events.reduce((acc, event) => {
    if (!acc[event.platform]) acc[event.platform] = { count: 0 };
    acc[event.platform].count++;
    return acc;
  }, {});

  const todayEvents = events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
  const weekEvents = events.filter(e => new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  // Using centralized formatTimeAgo from @/utils/dateUtils

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 p-6">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-10 bg-cyan-600" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl opacity-10 bg-blue-700" />
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            {/* Top row: Title and Sync button */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <ActivityIcon className="w-7 h-7 text-cyan-400/80" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Activity Center</h1>
                    {sessionId && (
                      <Badge className={`${isConnected ? 'bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30' : 'bg-amber-950/40 text-amber-300/80 border-amber-800/30'}`}>
                        {isConnected ? <><Wifi className="w-3 h-3 mr-1" />Live</> : <><WifiOff className="w-3 h-3 mr-1" />Idle</>}
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-500 mt-1">Track all your activities & browser sync in real-time</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {sessionId && (
                  <Button onClick={handleForceSync} disabled={syncing} variant="outline" className="border-cyan-800/40 bg-cyan-950/30 text-cyan-300/80 hover:bg-cyan-950/50 hover:text-cyan-200">
                    {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Sync
                  </Button>
                )}
              </div>
            </div>

            {/* Extension Status row (when session is connected) */}
            {sessionId && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConnected ? 'bg-zinc-800/80 border border-cyan-800/40' : 'bg-zinc-800/80 border border-amber-800/40'}`}>
                    {isConnected ? <Wifi className="w-5 h-5 text-cyan-400/80" /> : <WifiOff className="w-5 h-5 text-amber-400/80" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">{isConnected ? 'Extension Active' : 'Extension Idle'}</span>
                      {isConnected && <span className="w-2 h-2 rounded-full bg-cyan-400/80 animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-1.5">
                        <code className="text-cyan-400/80 bg-cyan-950/40 px-1.5 py-0.5 rounded text-[10px]">{sessionId}</code>
                        <button onClick={copySessionId} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                          {copied ? <Check className="w-3.5 h-3.5 text-cyan-400/80" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                      {lastSyncTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last activity: {formatTimeAgo(lastSyncTime)}</span>}
                    </div>
                    {!isConnected && events.length > 0 && (
                      <p className="text-[10px] text-amber-400/60 mt-0.5">No activity in the last 5 minutes. Use your browser to generate events.</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleClearCache} className="h-8 border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs">
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear Cache
                  </Button>
                  <Button size="sm" onClick={handleDisconnectSession} className="h-8 border border-red-900/40 bg-red-950/30 text-red-400/80 hover:bg-red-950/50 hover:text-red-300 text-xs">
                    <WifiOff className="w-3.5 h-3.5 mr-1.5" />Disconnect
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-400/70" />
                </div>
                <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">+12%</Badge>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{todayEvents.length}</div>
              <div className="text-sm text-zinc-500">Today's Activity</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-cyan-300/70" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{weekEvents.length}</div>
              <div className="text-sm text-zinc-500">This Week</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-cyan-400/70" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{events.length}</div>
              <div className="text-sm text-zinc-500">Total Synced</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-cyan-400/70" />
                </div>
                <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">Active</Badge>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{Object.keys(platformStats).length}</div>
              <div className="text-sm text-zinc-500">Platforms</div>
            </div>
          </motion.div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1.5 gap-1">
            <TabsTrigger value="timeline" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-4">
              <Clock className="w-4 h-4 mr-2" />Timeline
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-4">
              <Globe className="w-4 h-4 mr-2" />Integrations
            </TabsTrigger>
            <TabsTrigger value="sync" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-4">
              <Wifi className="w-4 h-4 mr-2" />Browser Sync
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300/90 text-zinc-500 px-4">
              <Settings className="w-4 h-4 mr-2" />Settings
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6 space-y-6">
            {/* Activity Feed */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                  <ActivityIcon className="w-5 h-5 text-cyan-400/70" />
                  Activity Feed
                </h3>
                <Badge className="bg-zinc-800/80 text-zinc-400 border-zinc-700/60">{events.length} events</Badge>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-zinc-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-zinc-100 mb-2">No Activity Yet</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto mb-6">Connect integrations or your browser extension to start tracking activity</p>
                  <Button onClick={() => setActiveTab('integrations')} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium">
                    <Globe className="w-4 h-4 mr-2" />Connect Integrations
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  <AnimatePresence>
                    {events.slice(0, 50).map((event, i) => {
                      const IconComponent = EVENT_ICONS[event.event_type] || ActivityIcon;
                      const platformConfig = PLATFORM_CONFIG[event.platform] || {};
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-all border border-zinc-700/30 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center flex-shrink-0">
                            {platformConfig.image ? (
                              <img src={platformConfig.image} alt={platformConfig.label} className="w-5 h-5 object-contain" />
                            ) : (
                              <IconComponent className="w-5 h-5 text-cyan-400/70" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">{event.platform}</Badge>
                              <span className="text-sm font-medium text-zinc-200">{event.event_type.replace(':', ' → ').replace(/_/g, ' ')}</span>
                            </div>
                            {event.data?.url && (
                              <p className="text-xs text-zinc-600 truncate">{event.data.url}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(event.created_at)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(integrationSuggestions).map(([key, integration], i) => {
                const Icon = integration.icon;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="p-6 h-full rounded-2xl bg-zinc-900/50 border border-zinc-800/60 hover:border-cyan-800/40 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                          <Icon className="w-7 h-7 text-cyan-400/70" />
                        </div>
                        <Badge className="bg-zinc-800/80 text-zinc-500 border-zinc-700/60 text-xs">{integration.stats}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{integration.name}</h3>
                      <p className="text-sm text-zinc-500 mb-4">{integration.description}</p>
                      <Button 
                        className="w-full bg-cyan-950/30 hover:bg-cyan-950/50 text-cyan-300/80 border border-cyan-800/40 font-medium"
                        onClick={() => toast.info(`${integration.name} integration coming soon!`)}
                      >
                        Connect
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Add Custom Integration Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="p-6 h-full rounded-2xl bg-zinc-900/30 border border-dashed border-zinc-700/60 hover:border-cyan-800/40 transition-all">
                  <div className="flex flex-col items-center justify-center h-full text-center py-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-200 mb-2">Request Integration</h3>
                    <p className="text-sm text-zinc-500 mb-4">Need a specific integration? Let us know!</p>
                    <Button className="border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                      Request
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* Browser Sync Tab */}
          <TabsContent value="sync" className="mt-6 space-y-6">
            {!sessionId ? (
              <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mx-auto mb-6">
                    <Wifi className="w-10 h-10 text-cyan-400/70" />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-100 mb-3">Connect Your Browser Extension</h3>
                  <p className="text-zinc-500 mb-8">Enter or generate a session ID to connect your SYNC browser extension and start tracking activity.</p>
                  
                  <div className="flex gap-3 max-w-md mx-auto mb-8">
                    <Input 
                      value={inputSessionId} 
                      onChange={(e) => setInputSessionId(e.target.value)} 
                      placeholder="Enter session ID..." 
                      className="flex-1 bg-zinc-800/50 border-zinc-700/60 text-white h-12" 
                    />
                    <Button onClick={generateSessionId} className="border border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 h-12 px-4">
                      Generate
                    </Button>
                    <Button 
                      onClick={connectSession}
                      disabled={connecting || !inputSessionId.trim()}
                      className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium h-12 px-6"
                    >
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                    {['Install Extension', 'Click Icon', 'Paste Session ID', 'Start Tracking'].map((step, i) => (
                      <div key={i} className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950/50 text-cyan-300/80 flex items-center justify-center text-sm font-bold mb-2">{i + 1}</div>
                        <p className="text-sm text-zinc-400">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Platform Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {Object.entries(PLATFORM_CONFIG).map(([platform, config], i) => {
                    const stats = platformStats[platform];
                    const Icon = config.icon;
                    return (
                      <motion.div key={platform} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                              {config.image ? (
                                <img src={config.image} alt={config.label} className="w-5 h-5 object-contain" />
                              ) : (
                                <Icon className="w-5 h-5 text-cyan-400/70" />
                              )}
                            </div>
                            <div>
                              <div className="text-xl font-bold text-zinc-100">{stats?.count || 0}</div>
                              <div className="text-xs text-zinc-500">{config.label}</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Claude Prompt */}
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-cyan-400/70" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-200">Send to Claude</h3>
                      <p className="text-sm text-zinc-500">Send a prompt to Claude via your extension</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Input 
                      value={prompt} 
                      onChange={(e) => setPrompt(e.target.value)} 
                      placeholder="Type your prompt..." 
                      className="flex-1 bg-zinc-800/50 border-zinc-700/60 text-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                    />
                    <Button onClick={handleSendPrompt} disabled={sending || !prompt.trim()} className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Sync Feed */}
                <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                      <ActivityIcon className="w-5 h-5 text-cyan-400/70" />
                      Real-time Sync Feed
                    </h3>
                    <Badge className="bg-zinc-800/80 text-zinc-400 border-zinc-700/60">{events.length} events</Badge>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="text-center py-12">
                        <Globe className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-500">No activity yet</p>
                        <p className="text-sm text-zinc-600">Browse with your extension connected</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {events.slice(0, 30).map((event, i) => {
                          const IconComponent = EVENT_ICONS[event.event_type] || ActivityIcon;
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-zinc-700/30"
                            >
                              <IconComponent className="w-5 h-5 text-cyan-400/70 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">{event.platform}</Badge>
                                  <span className="text-sm font-medium text-zinc-200">{event.event_type.replace(':', ' → ').replace(/_/g, ' ')}</span>
                                </div>
                                <span className="text-xs text-zinc-600">{formatTimeAgo(event.created_at)}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400/70" />
                  Sync Preferences
                </h3>
                <div className="space-y-4">
                  {[
                    { key: 'autoSync', label: 'Auto Sync', desc: 'Automatically sync activity', checked: autoSync, onChange: setAutoSync },
                    { key: 'syncLinkedIn', label: 'Sync LinkedIn', desc: 'Track LinkedIn activity', checked: syncLinkedIn, onChange: setSyncLinkedIn },
                    { key: 'syncGmail', label: 'Sync Gmail', desc: 'Track email activity', checked: syncGmail, onChange: setSyncGmail },
                  ].map(({ key, label, desc, checked, onChange }) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                      <div>
                        <p className="text-zinc-200 font-medium">{label}</p>
                        <p className="text-sm text-zinc-500">{desc}</p>
                      </div>
                      <Switch checked={checked} onCheckedChange={onChange} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400/70" />
                  Error Log
                </h3>
                {syncErrors.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-cyan-400/70" />
                    </div>
                    <p className="text-zinc-500">No errors</p>
                    <p className="text-sm text-zinc-600">Everything is running smoothly</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {syncErrors.map((err, i) => (
                      <div key={i} className="p-3 rounded-xl bg-red-950/30 border border-red-900/40">
                        <p className="text-red-400/80 text-sm">{err.message}</p>
                        <p className="text-xs text-zinc-600 mt-1">{formatTimeAgo(err.time)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}