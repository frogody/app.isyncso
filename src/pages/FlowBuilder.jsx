/**
 * FlowBuilder - Visual Flow Builder Page
 * Uses React Flow for drag-and-drop flow creation
 * Route: /growth/flows/:flowId or /growth/flows/new
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  LayoutGrid,
  Bug,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

import {
  FlowCanvas,
  NodePalette,
  NodeConfigPanel,
  flowToDatabase,
  databaseToFlow,
  validateFlow,
  autoLayout,
  createEmptyFlow,
  createOutreachTemplate
} from '@/components/flows';
import DebugPanel from '@/components/flows/DebugPanel';
import { runFlowInTestMode, validateFlowConfig } from '@/services/flowTestUtils';
import QuickRunModal from '@/components/flows/QuickRunModal';
import { generateCampaignFlowTemplate, getRequiredIntegrations } from '@/services/flowTemplateGenerator';
import IntegrationChecklist from '@/components/growth/campaigns/IntegrationChecklist';
import JourneyProgressBar from '@/components/growth/campaigns/JourneyProgressBar';

export default function FlowBuilder() {
  const navigate = useNavigate();
  const params = useParams();
  const flowId = params.flowId;
  const campaignIdFromUrl = params.campaignId;
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const { toast } = useToast();

  const campaignId = campaignIdFromUrl || searchParams.get('campaignId');
  const isNewFlow = !flowId || flowId === 'new';
  const templateType = searchParams.get('template');
  const isCampaignMode = !!campaignId;

  // Campaign state
  const [campaign, setCampaign] = useState(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);

  // Flow state
  const [flow, setFlow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // UI state
  const [loading, setLoading] = useState(!isNewFlow);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Test mode state
  const [testMode, setTestMode] = useState(false);
  const [testExecution, setTestExecution] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [showTestRunModal, setShowTestRunModal] = useState(false);
  const [testRunning, setTestRunning] = useState(false);

  // Flow settings
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [agentPersona, setAgentPersona] = useState('');

  // Load flow or create new
  useEffect(() => {
    if (isNewFlow) {
      // Create new flow
      const template = templateType === 'outreach'
        ? createOutreachTemplate()
        : createEmptyFlow();

      setNodes(template.nodes);
      setEdges(template.edges);
      setFlowName(templateType === 'outreach' ? 'New Outreach Flow' : 'New Flow');
      setFlowDescription('');
      setAgentPersona('You are a helpful B2B sales assistant.');
      setLoading(false);
    } else {
      // Load existing flow
      loadFlow();
    }
  }, [flowId, isNewFlow, templateType]);

  // Campaign mode: load campaign and auto-generate flow
  useEffect(() => {
    if (!campaignId || !isNewFlow) return;
    async function loadCampaign() {
      try {
        const { data, error } = await supabase
          .from('growth_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();
        if (error || !data) return;
        setCampaign(data);

        // Generate flow template from campaign
        const template = generateCampaignFlowTemplate(data);
        setNodes(template.nodes);
        setEdges(template.edges);
        setFlowName(`${data.name || 'Campaign'} - Outreach Flow`);
        setFlowDescription(`Auto-generated flow for campaign: ${data.name}`);
        setShowIntegrations(true);
      } catch (err) {
        console.error('Failed to load campaign for flow:', err);
      }
    }
    loadCampaign();
  }, [campaignId, isNewFlow]);

  // Required integrations for current flow
  const requiredIntegrations = React.useMemo(() => getRequiredIntegrations(nodes), [nodes]);

  // Continue to Review handler (campaign mode)
  const handleContinueToReview = async () => {
    if (!campaignId) return;
    // Save first
    await handleSave();
    setSavingCampaign(true);
    try {
      // The flow was saved — get its ID from the URL or flow state
      const savedFlowId = flow?.id || flowId;
      if (savedFlowId && savedFlowId !== 'new') {
        await supabase
          .from('growth_campaigns')
          .update({
            flow_id: savedFlowId,
            journey_phase: 'review',
            updated_date: new Date().toISOString(),
          })
          .eq('id', campaignId);
        navigate(`/growth/campaign/${campaignId}/review`);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingCampaign(false);
    }
  };

  const loadFlow = async () => {
    try {
      const { data, error } = await supabase
        .from('outreach_flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (error) throw error;

      if (data) {
        setFlow(data);
        setFlowName(data.name || '');
        setFlowDescription(data.description || '');
        setAgentPersona(data.agent_persona || '');

        const { nodes: dbNodes, edges: dbEdges } = databaseToFlow(
          data.nodes || [],
          data.edges || []
        );
        setNodes(dbNodes);
        setEdges(dbEdges);
      }
    } catch (error) {
      console.error('Failed to load flow:', error);
      toast({
        title: 'Error',
        description: 'Failed to load flow',
        variant: 'destructive'
      });
      navigate('/growth/flows');
    } finally {
      setLoading(false);
    }
  };

  // Save flow
  const handleSave = async (currentNodes = nodes, currentEdges = edges) => {
    if (!flowName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for your flow',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { nodes: dbNodes, edges: dbEdges } = flowToDatabase(currentNodes, currentEdges);

      const flowData = {
        name: flowName.trim(),
        description: flowDescription.trim(),
        agent_persona: agentPersona.trim(),
        nodes: dbNodes,
        edges: dbEdges,
        workspace_id: user?.company_id || user?.organization_id,
        updated_at: new Date().toISOString()
      };

      if (isNewFlow) {
        const { data, error } = await supabase
          .from('outreach_flows')
          .insert({
            ...flowData,
            status: 'draft',
            created_by: user?.id
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Flow Created',
          description: 'Your flow has been created successfully'
        });

        // Navigate to the saved flow
        navigate(`/growth/flows/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase
          .from('outreach_flows')
          .update(flowData)
          .eq('id', flowId);

        if (error) throw error;

        toast({
          title: 'Flow Saved',
          description: 'Your changes have been saved'
        });
      }
    } catch (error) {
      console.error('Failed to save flow:', error);
      toast({
        title: 'Error',
        description: 'Failed to save flow',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Validate flow
  const handleValidate = () => {
    const result = validateFlow(nodes, edges);
    setValidationResult(result);
    setShowValidation(true);
  };

  // Auto-layout
  const handleAutoLayout = () => {
    const layoutedNodes = autoLayout(nodes, edges);
    setNodes(layoutedNodes);
    toast({
      title: 'Layout Applied',
      description: 'Nodes have been automatically arranged'
    });
  };

  // Test run handler
  const handleTestRun = async (prospect) => {
    if (isNewFlow || !flowId || flowId === 'new') {
      toast({
        title: 'Save Required',
        description: 'Please save the flow before running a test',
        variant: 'destructive'
      });
      return;
    }

    // Validate first
    const validation = await validateFlowConfig({ nodes, edges });
    if (!validation.valid) {
      toast({
        title: 'Validation Failed',
        description: validation.errors[0] || 'Flow has configuration errors',
        variant: 'destructive'
      });
      return;
    }

    setTestRunning(true);
    setShowTestRunModal(false);

    try {
      const workspaceId = user?.company_id || user?.organization_id;
      const result = await runFlowInTestMode(flowId, prospect.id, workspaceId, user?.id);

      if (result.success) {
        setTestExecution(result.execution);
        toast({
          title: 'Test Started',
          description: 'Flow is running in test mode'
        });
      } else {
        toast({
          title: 'Test Failed',
          description: result.error || 'Failed to start test execution',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run test',
        variant: 'destructive'
      });
    } finally {
      setTestRunning(false);
    }
  };

  // Highlight node on canvas (for debug panel)
  const handleHighlightNode = useCallback((nodeId) => {
    setHighlightedNodeId(nodeId);
    // Auto-clear highlight after 3 seconds
    setTimeout(() => setHighlightedNodeId(null), 3000);
  }, []);

  // Update node data
  const handleNodeUpdate = useCallback((nodeId, newData) => {
    setNodes(nds => nds.map(node =>
      node.id === nodeId
        ? { ...node, data: newData }
        : node
    ));
  }, []);

  // Handle node selection
  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, flowName, flowDescription, agentPersona]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Campaign Journey Progress Bar */}
      {isCampaignMode && campaignId && (
        <div className="flex-shrink-0 px-4 pt-3">
          <JourneyProgressBar campaignId={campaignId} currentPhase="flow" />
        </div>
      )}
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/growth/flows')}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>

          <div>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              placeholder="Flow Name"
              className="text-lg font-semibold text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              {isNewFlow ? 'New Flow' : `Last saved: ${flow?.updated_at ? new Date(flow.updated_at).toLocaleString() : 'Never'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Auto Layout
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Validate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>

          {/* Separator */}
          <div className="w-px h-6 bg-zinc-700" />

          {/* Test Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestMode(!testMode)}
            className={`border-zinc-700 ${testMode ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'hover:bg-zinc-800'}`}
          >
            <Bug className="w-4 h-4 mr-2" />
            {testMode ? 'Testing' : 'Test Mode'}
          </Button>

          {/* Test Run Button (visible in test mode) */}
          {testMode && !isNewFlow && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestRunModal(true)}
              disabled={testRunning}
              className="border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
            >
              {testRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Test Run
            </Button>
          )}

          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-cyan-500 hover:bg-cyan-600 text-black"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>

          {/* Campaign mode: Continue to Review */}
          {isCampaignMode && (
            <>
              <div className="w-px h-6 bg-zinc-700" />
              <Button
                onClick={handleContinueToReview}
                disabled={savingCampaign || isNewFlow}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {savingCampaign ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Review & Launch
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Node Palette */}
        <NodePalette className="w-64 flex-shrink-0" />

        {/* Center - Flow Canvas */}
        <div className="flex-1 relative">
          {/* Campaign mode: Integration Checklist overlay */}
          {isCampaignMode && showIntegrations && requiredIntegrations.length > 0 && (
            <div className="absolute top-4 left-4 z-10 w-72">
              <IntegrationChecklist requiredIntegrations={requiredIntegrations} />
              <button
                onClick={() => setShowIntegrations(false)}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Hide checklist
              </button>
            </div>
          )}
          <FlowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={(changes, currentNodes) => {
              // Sync nodes state
              setNodes(currentNodes || []);
            }}
            onEdgesChange={(changes, currentEdges) => {
              // Sync edges state
              setEdges(currentEdges || []);
            }}
            onNodeSelect={handleNodeSelect}
            onSave={handleSave}
            highlightedNodeId={highlightedNodeId}
          />
        </div>

        {/* Right Panel - Node Config or Debug Panel */}
        <AnimatePresence mode="wait">
          {testMode ? (
            <motion.div
              key="debug-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 h-full"
            >
              <DebugPanel
                execution={testExecution}
                onClose={() => setTestMode(false)}
                onHighlightNode={handleHighlightNode}
                className="h-full w-[400px]"
              />
            </motion.div>
          ) : selectedNode ? (
            <motion.div
              key="config-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <NodeConfigPanel
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onUpdate={handleNodeUpdate}
                className="w-80"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Flow Settings</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure your flow's general settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Flow Name</label>
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Enter flow name"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Description</label>
              <Textarea
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                placeholder="What does this flow do?"
                className="bg-zinc-800 border-zinc-700 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">AI Agent Persona</label>
              <Textarea
                value={agentPersona}
                onChange={(e) => setAgentPersona(e.target.value)}
                placeholder="Define how the AI should behave..."
                className="bg-zinc-800 border-zinc-700 min-h-[100px]"
              />
              <p className="text-xs text-zinc-500">
                This persona will be used for all AI nodes in this flow
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowSettings(false)}
              className="bg-cyan-500 hover:bg-cyan-600 text-black"
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {validationResult?.valid ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Flow Valid
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Validation Issues
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {validationResult?.errors?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-400">Errors</h4>
                {validationResult.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    <span className="text-sm text-red-300">{error}</span>
                  </div>
                ))}
              </div>
            )}

            {validationResult?.warnings?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-amber-400">Warnings</h4>
                {validationResult.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                    <span className="text-sm text-amber-300">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {validationResult?.valid && validationResult?.warnings?.length === 0 && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-300">
                  Your flow is valid and ready to use!
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowValidation(false)}
              className="bg-cyan-500 hover:bg-cyan-600 text-black"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Run Modal */}
      <QuickRunModal
        open={showTestRunModal}
        onOpenChange={setShowTestRunModal}
        flow={{ id: flowId, name: flowName, nodes, edges }}
        onSuccess={(prospect) => {
          handleTestRun(prospect);
        }}
      />
    </div>
  );
}
