import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Table2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  PartyPopper,
  Check
} from 'lucide-react';
import { supabase } from '@/components/sync/supabaseSync';
import { toast } from 'sonner';
import { formatTimeAgo } from '@/utils/dateUtils';
import { useTheme } from '@/contexts/GlobalThemeContext';

const WORKFLOW_STAGES = {
  'not-in-table': { label: 'Not in Table', color: 'zinc', icon: Layers },
  'empty': { label: 'Empty Table', color: 'amber', icon: Table2 },
  'needs-columns': { label: 'Needs Columns', color: 'amber', icon: Table2 },
  'has-data': { label: 'Has Data', color: 'blue', icon: Table2 },
  'enriching': { label: 'Enriching...', color: 'purple', icon: Loader2 },
  'has-enrichments': { label: 'Enriched', color: 'green', icon: CheckCircle },
  'unknown': { label: 'Unknown', color: 'zinc', icon: AlertCircle }
};

// Helper to determine workflow stage from state
const determineWorkflowStage = (state) => {
  if (!state) return 'unknown';
  if (state.workflowStage) return state.workflowStage;
  
  const { rowCount, columnCount, enrichments, currentView } = state;
  
  if (currentView && currentView !== 'table') return 'not-in-table';
  if (!rowCount || rowCount === 0) return 'empty';
  
  const hasEnrichmentColumns = enrichments && enrichments.length > 0;
  if (!hasEnrichmentColumns && columnCount < 5) return 'needs-columns';
  
  if (hasEnrichmentColumns) {
    const running = enrichments.filter(e => e.status === 'running').length;
    const complete = enrichments.filter(e => e.status === 'complete').length;
    
    if (running > 0) return 'enriching';
    if (complete > 0) return 'has-enrichments';
  }
  
  return 'has-data';
};

const SUGGESTED_ACTIONS = {
  'not-in-table': [
    { id: 'create-table', label: 'Create New Table' },
    { id: 'open-table', label: 'Open Existing Table' }
  ],
  'empty': [
    { id: 'find-people', label: 'Find People' },
    { id: 'import-csv', label: 'Import CSV' }
  ],
  'needs-columns': [
    { id: 'add-email-column', label: 'Add Email Column' },
    { id: 'add-linkedin-column', label: 'Add LinkedIn Column' }
  ],
  'has-data': [
    { id: 'run-enrichments', label: 'Run Enrichments' },
    { id: 'add-enrichment', label: 'Add Enrichment' }
  ],
  'enriching': [
    { id: 'check-progress', label: 'Check Progress' }
  ],
  'has-enrichments': [
    { id: 'export-data', label: 'Export Data' },
    { id: 'create-sequence', label: 'Create Sequence' }
  ]
};

const SUGGESTED_PROMPTS = {
  'create-table': `I want to create a new Clay table for prospecting.

Please help me:
1. Navigate to Clay and create a new table
2. Set up the right structure for my outreach campaign
3. Choose the best starting point (Find People, Import, or manual)

Let's get started!`,

  'open-table': `I want to open my most recent Clay table.

Please help me navigate to my existing Clay workspace and find my latest table.`,

  'find-people': `I have an empty Clay table and need to find people to add.

Please help me:
1. Understand what "Find People" filters are available in Clay
2. Set up the right filters for my target audience
3. Guide me through the process of finding and adding people

Let's start by defining who I'm looking for.`,

  'import-csv': `I want to import a CSV file into Clay.

Please help me:
1. Prepare my CSV file with the right format
2. Map my columns correctly
3. Avoid common import mistakes

What format should my CSV be in?`,

  'add-enrichment': `I need to add enrichment columns to my Clay table. 

Looking at my current table, please:
1. Recommend the most valuable enrichment columns to add based on my existing data
2. Explain what each enrichment does and its credit cost
3. Guide me through adding them step by step

What enrichments do you recommend?`,

  'add-email-column': `I need to add an email enrichment column to my Clay table. Looking at my current table, please guide me through:

1. Which email enrichment to use (Email Waterfall, Work Email, etc.)
2. How to configure it properly
3. Expected credit costs
4. Best practices for email enrichment

Help me add this column step by step.`,

  'add-linkedin-column': `I need to add a LinkedIn enrichment column to my Clay table. Please guide me through:

1. Which LinkedIn enrichment to use
2. How to configure it properly  
3. Expected credit costs
4. Best practices for LinkedIn data enrichment

Help me add this column step by step.`,

  'add-linkedin': `I need to add a LinkedIn profile enrichment column to my Clay table.

Please guide me through:
1. Adding the LinkedIn enrichment column
2. Understanding the credit cost
3. Running the enrichment on my existing rows`,

  'run-enrichments': `I'm looking at my Clay table right now. I have data loaded but haven't run enrichments yet. 

Please help me:
1. Look at my current columns and suggest which enrichments would be most valuable
2. Guide me through running the enrichments efficiently
3. Explain the credit costs before we proceed

Start by analyzing what columns I have visible.`,

  'check-progress': `I'm waiting for my Clay enrichments to complete.

Please help me:
1. Check the current status of running enrichments
2. Estimate how long they'll take
3. Suggest what I can do while waiting`,

  'export-data': `My Clay enrichments are complete and I'm ready to export.

Please help me:
1. Review my enriched data for quality
2. Choose the right export format (CSV, integration, etc.)
3. Guide me through the export process

What export option do you recommend?`,

  'create-sequence': `My Clay data is enriched and ready. I want to create an outreach sequence.

Please help me:
1. Analyze my enriched data for personalization opportunities
2. Suggest a multi-touch sequence strategy
3. Create personalized templates using the enriched fields

What outreach approach do you recommend?`
};

// Using centralized formatTimeAgo from @/utils/dateUtils

export default function ClayStatePanel({ sessionId: propSessionId, onSendPrompt }) {
  const { gt } = useTheme();
  // Use prop, localStorage, or fallback for testing
  const sessionId = propSessionId
    || localStorage.getItem('sync_session_id');
  
  const [clayState, setClayState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [promptSent, setPromptSent] = useState(false);
  const [timeAgo, setTimeAgo] = useState('never');

  const fetchClayState = async () => {
    console.log('[ClayStatePanel] Fetching state for session:', sessionId);
    
    try {
      const { data, error } = await supabase
        .from('sync_clay_state')
        .select('state, updated_at')
        .eq('session_id', sessionId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      console.log('[ClayStatePanel] Response:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[ClayStatePanel] No state found for session');
          setClayState(null);
        } else {
          console.error('[ClayStatePanel] Fetch error:', error);
        }
        return;
      }

      if (data?.state) {
        const parsedState = typeof data.state === 'string' 
          ? JSON.parse(data.state) 
          : data.state;
        
        console.log('[ClayStatePanel] Parsed state:', parsedState);
        setClayState(parsedState);
        setLastUpdated(new Date(data.updated_at));
      }
    } catch (e) {
      console.error('[ClayStatePanel] Exception:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[ClayStatePanel] Initializing with session:', sessionId);
    
    if (!sessionId) {
      console.warn('[ClayStatePanel] No session ID!');
      setLoading(false);
      return;
    }

    fetchClayState();

    const channel = supabase
      .channel(`clay_state_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_clay_state',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('[ClayStatePanel] Real-time update:', payload);
        if (payload.new?.state) {
          const parsedState = typeof payload.new.state === 'string'
            ? JSON.parse(payload.new.state)
            : payload.new.state;
          setClayState(parsedState);
          setLastUpdated(new Date(payload.new.updated_at || new Date()));
        }
      })
      .subscribe((status) => {
        console.log('[ClayStatePanel] Subscription status:', status);
      });

    const pollInterval = setInterval(fetchClayState, 5000);
    
    const timeInterval = setInterval(() => {
      if (lastUpdated) {
        setTimeAgo(formatTimeAgo(lastUpdated));
      }
    }, 10000);

    return () => {
      console.log('[ClayStatePanel] Cleanup');
      channel.unsubscribe();
      clearInterval(pollInterval);
      clearInterval(timeInterval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (lastUpdated) {
      setTimeAgo(formatTimeAgo(lastUpdated));
    }
  }, [lastUpdated]);

  const handleSuggestedAction = async (action) => {
    const prompt = SUGGESTED_PROMPTS[action.id];
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt);
      
      toast.success('Prompt ready!', {
        description: 'Switch to Clay and press ⌘V in Claude sidebar'
      });
      
      if (onSendPrompt) {
        onSendPrompt(prompt);
      }
      
      setPromptSent(true);
      setTimeout(() => setPromptSent(false), 10000);
      
      console.log('[ClayStatePanel] Prompt copied:', action.id);
    } catch (e) {
      console.error('[ClayStatePanel] Failed to copy prompt:', e);
      toast.error('Failed to copy prompt');
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchClayState();
  };

  if (loading) {
    return (
      <div className={`${gt('bg-white border border-slate-200 shadow-sm', 'bg-zinc-900/80 border border-zinc-800')} rounded-xl p-4`}>
        <div className={`flex items-center gap-2 ${gt('text-slate-500', 'text-zinc-400')}`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading Clay state...</span>
        </div>
      </div>
    );
  }

  if (!clayState) {
    return (
      <div className={`${gt('bg-white border border-slate-200 shadow-sm', 'bg-zinc-900/80 border border-zinc-800')} rounded-xl p-4`}>
        <div className={`text-center ${gt('text-slate-400', 'text-zinc-500')} text-sm`}>
          <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${gt('text-slate-400', 'text-zinc-600')}`} />
          <p>No Clay activity detected</p>
          <p className="text-xs mt-1">Open Clay in your browser to see live state</p>
          {sessionId && (
            <p className={`text-xs mt-2 ${gt('text-slate-400', 'text-zinc-600')} truncate`}>Session: {sessionId.slice(0, 12)}...</p>
          )}
          <button
            className={`mt-3 px-3 py-1.5 text-xs ${gt('text-slate-500 hover:text-slate-900 bg-slate-200 hover:bg-slate-100', 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700')} rounded-lg flex items-center gap-1.5 mx-auto transition-colors`}
            onClick={handleRefresh}
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>
    );
  }

  const workflowStage = determineWorkflowStage(clayState);
  const stage = WORKFLOW_STAGES[workflowStage] || WORKFLOW_STAGES.unknown;
  const StageIcon = stage.icon;
  const suggestedActions = SUGGESTED_ACTIONS[workflowStage] || [];

  const stageColorClasses = {
    zinc: 'text-zinc-400 border-zinc-400/30',
    amber: 'text-amber-400 border-amber-400/30',
    blue: 'text-blue-400 border-blue-400/30',
    purple: 'text-purple-400 border-purple-400/30',
    green: 'text-green-400 border-green-400/30'
  };

  // Generate intelligent insights based on current state
  const getInsights = () => {
    if (!clayState) return [];
    const insights = [];
    
    if (clayState.rowCount > 0 && (clayState.columnCount || 0) < 5) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Limited data columns',
        description: `You have ${clayState.rowCount} prospects but only ${clayState.columnCount || 0} columns. Add enrichments to improve personalization.`,
        actionId: 'add-email-column'
      });
    }
    
    if (clayState.rowCount > 500 && !clayState.enrichments?.some(e => e.status === 'complete')) {
      insights.push({
        type: 'tip',
        icon: Lightbulb,
        title: 'Large list detected',
        description: `With ${clayState.rowCount} prospects, consider filtering to your ideal 100-200 before enriching to save credits.`,
        actionId: 'run-enrichments'
      });
    }

    if (workflowStage === 'has-enrichments') {
      insights.push({
        type: 'success',
        icon: PartyPopper,
        title: 'Ready for outreach!',
        description: 'Your data is enriched. Export to your sequencer or create personalized messages.',
        actionId: 'export-data'
      });
    }
    
    return insights;
  };

  const insights = getInsights();

  return (
    <div className={`${gt('bg-white border border-slate-200 shadow-sm', 'bg-zinc-900/80 border border-zinc-800')} rounded-xl p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <StageIcon className={`w-4 h-4 text-indigo-400 ${clayState.workflowStage === 'enriching' ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className={`text-sm font-medium ${gt('text-slate-900', 'text-white')}`}>Clay Status</h3>
            <span className={`text-xs px-2 py-0.5 rounded border ${stageColorClasses[stage.color]}`}>
              {stage.label}
            </span>
          </div>
        </div>
        <button onClick={fetchClayState} className={`p-2 ${gt('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')} rounded transition-colors`}>
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Table Info - show whenever we have state */}
      <div className={`${gt('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-3 space-y-2`}>
        {clayState.tableName && (
          <div className="flex items-center justify-between text-sm">
            <span className={gt('text-slate-500', 'text-zinc-400')}>Table</span>
            <span className={`${gt('text-slate-900', 'text-white')} font-medium truncate max-w-[150px]`}>{clayState.tableName}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className={gt('text-slate-500', 'text-zinc-400')}>Rows</span>
          <span className={`${gt('text-slate-900', 'text-white')} font-medium`}>{clayState.rowCount?.toLocaleString() || 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={gt('text-slate-500', 'text-zinc-400')}>Columns</span>
          <span className={`${gt('text-slate-900', 'text-white')} font-medium`}>{clayState.columnCount || clayState.columns?.length || 0}</span>
        </div>
        {clayState.enrichments?.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className={gt('text-slate-500', 'text-zinc-400')}>Enrichments</span>
            <div className="flex items-center gap-1">
              {clayState.enrichments.filter(e => e.status === 'running').length > 0 && (
                <span className="bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded">
                  {clayState.enrichments.filter(e => e.status === 'running').length} running
                </span>
              )}
              {clayState.enrichments.filter(e => e.status === 'complete').length > 0 && (
                <span className="bg-green-500/20 text-green-400 text-xs px-1.5 py-0.5 rounded">
                  {clayState.enrichments.filter(e => e.status === 'complete').length} done
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Intelligent Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs ${gt('text-slate-400', 'text-zinc-500')} font-medium`}>Insights</p>
          {insights.map((insight, i) => (
            <div 
              key={i}
              className={`p-3 rounded-lg border ${
                insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <div className="flex items-start gap-2">
                <insight.icon className={`w-4 h-4 mt-0.5 ${
                  insight.type === 'warning' ? 'text-amber-400' :
                  insight.type === 'success' ? 'text-green-400' : 'text-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${gt('text-slate-900', 'text-white')}`}>{insight.title}</p>
                  <p className={`text-xs ${gt('text-slate-500', 'text-zinc-400')} mt-0.5`}>{insight.description}</p>
                  {insight.actionId && (
                    <button
                      className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                      onClick={() => handleSuggestedAction({ id: insight.actionId, label: '' })}
                    >
                      Take action →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs ${gt('text-slate-400', 'text-zinc-500')} font-medium`}>Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, i) => (
              <button
                key={i}
                className={`text-xs px-3 py-1.5 border ${gt('border-slate-200', 'border-zinc-700')} rounded-lg ${gt('text-slate-600', 'text-zinc-300')} hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors`}
                onClick={() => handleSuggestedAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success Feedback */}
      {promptSent && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Prompt ready!</p>
          <p className={`${gt('text-slate-500', 'text-zinc-400')} text-xs mt-1`}>
            Switch to Clay and press <kbd className={`px-1 py-0.5 ${gt('bg-slate-200', 'bg-zinc-700')} rounded`}>Cmd+V</kbd> in Claude sidebar
          </p>
        </div>
      )}

      {/* Footer with timestamp and refresh */}
      <div className={`flex items-center justify-between text-[10px] ${gt('text-slate-400', 'text-zinc-600')}`}>
        <span>Updated {timeAgo}</span>
        <button 
          className={`p-1.5 ${gt('text-slate-400 hover:text-slate-900', 'text-zinc-500 hover:text-white')} rounded transition-colors`}
          onClick={handleRefresh}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}