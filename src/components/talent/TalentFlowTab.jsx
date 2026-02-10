import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import {
  FlowCanvas,
  NodePalette,
  NodeConfigPanel,
  flowToDatabase,
  databaseToFlow,
  validateFlow,
  autoLayout,
  generateNodeId,
} from '@/components/flows';
import { getFlowById, createFlow, updateFlow } from '@/services/flowService';
import { generateTalentFlowTemplate, getTalentRequiredIntegrations } from '@/services/talentFlowTemplateGenerator';
import IntegrationChecklist from '@/components/growth/campaigns/IntegrationChecklist';

const TalentFlowTab = forwardRef(function TalentFlowTab({ campaign, onFlowSaved }, ref) {
  const { user } = useUser();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flowId, setFlowId] = useState(campaign?.flow_id || null);
  const [validationResult, setValidationResult] = useState(null);

  // Load existing flow or generate template
  useEffect(() => {
    async function loadFlow() {
      setLoading(true);
      try {
        if (campaign?.flow_id) {
          const result = await getFlowById(campaign.flow_id);
          if (result.success && result.flow) {
            const { nodes: dbNodes, edges: dbEdges } = databaseToFlow(
              result.flow.nodes || [],
              result.flow.edges || []
            );
            setNodes(dbNodes);
            setEdges(dbEdges);
            setFlowId(campaign.flow_id);
            return;
          }
        }
        // Generate template if no existing flow
        const template = generateTalentFlowTemplate(campaign);
        setNodes(template.nodes);
        setEdges(template.edges);
      } catch (err) {
        console.error('Error loading flow:', err);
        const template = generateTalentFlowTemplate(campaign);
        setNodes(template.nodes);
        setEdges(template.edges);
      } finally {
        setLoading(false);
      }
    }
    loadFlow();
  }, [campaign?.id, campaign?.flow_id]);

  // Save flow
  const handleSave = async () => {
    setSaving(true);
    try {
      const { nodes: dbNodes, edges: dbEdges } = flowToDatabase(nodes, edges);

      if (flowId) {
        const result = await updateFlow(flowId, {
          nodes: dbNodes,
          edges: dbEdges,
          name: `${campaign?.name || 'Talent'} Outreach Flow`,
        });
        if (!result.success) throw new Error(result.error);
        toast.success('Flow saved');
      } else {
        const result = await createFlow({
          name: `${campaign?.name || 'Talent'} Outreach Flow`,
          description: `Automated outreach flow for campaign: ${campaign?.name}`,
          nodes: dbNodes,
          edges: dbEdges,
          status: 'draft',
          workspace_id: user?.organization_id,
          created_by: user?.id,
        });
        if (!result.success) throw new Error(result.error);

        const newFlowId = result.flow.id;
        setFlowId(newFlowId);

        // Link flow to campaign
        await supabase
          .from('campaigns')
          .update({ flow_id: newFlowId })
          .eq('id', campaign.id);

        onFlowSaved?.(newFlowId);
        toast.success('Flow created and linked to campaign');
      }
    } catch (err) {
      console.error('Save flow error:', err);
      toast.error('Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  // Regenerate template
  const handleRegenerate = () => {
    const template = generateTalentFlowTemplate(campaign);
    setNodes(template.nodes);
    setEdges(template.edges);
    setSelectedNode(null);
    toast.success('Flow regenerated from campaign settings');
  };

  // Validate
  const handleValidate = () => {
    const result = validateFlow(nodes, edges);
    setValidationResult(result);
    if (result.valid && result.warnings.length === 0) {
      toast.success('Flow is valid');
    } else if (result.valid) {
      toast.warning(`Flow is valid with ${result.warnings.length} warning(s)`);
    } else {
      toast.error(`Flow has ${result.errors.length} error(s)`);
    }
  };

  // Auto-layout
  const handleAutoLayout = () => {
    const layouted = autoLayout(nodes, edges);
    setNodes(layouted);
    toast.success('Nodes auto-arranged');
  };

  // Sync handlers — FlowCanvas manages its own state internally;
  // these callbacks keep TalentFlowTab's state in sync for save/validate/regenerate
  const onNodesChange = useCallback((changes, currentNodes) => {
    setNodes(currentNodes || []);
  }, []);

  const onEdgesChange = useCallback((changes, currentEdges) => {
    setEdges(currentEdges || []);
  }, []);

  // Update node data from config panel
  const handleNodeDataChange = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...newData } } : null);
    }
  }, [selectedNode?.id]);

  // Add node from palette
  const handleAddNode = useCallback((nodeType, position) => {
    const newNode = {
      id: generateNodeId(nodeType),
      type: nodeType,
      position: position || { x: 250, y: nodes.length * 130 },
      data: { name: `New ${nodeType}` },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length]);

  const requiredIntegrations = getTalentRequiredIntegrations(nodes);

  // Expose toolbar actions to parent
  useImperativeHandle(ref, () => ({
    save: handleSave,
    regenerate: handleRegenerate,
    validate: handleValidate,
    autoLayout: handleAutoLayout,
    saving,
    validationResult,
  }), [handleSave, handleRegenerate, handleValidate, handleAutoLayout, saving, validationResult]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Integration Requirements */}
      {requiredIntegrations.length > 0 && (
        <div className="mb-3">
          <IntegrationChecklist requiredIntegrations={requiredIntegrations} />
        </div>
      )}

      {/* 3-Panel Layout */}
      <div className="flex gap-0 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50" style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>
        {/* Left: Node Palette */}
        <div className="w-[220px] border-r border-zinc-800 overflow-y-auto bg-zinc-900/80 flex-shrink-0">
          <NodePalette onAddNode={handleAddNode} />
        </div>

        {/* Center: Flow Canvas */}
        <div className="flex-1 relative">
          <FlowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeSelect={(node) => setSelectedNode(node)}
            onSave={(n, e) => { setNodes(n); setEdges(e); handleSave(); }}
          />
        </div>

        {/* Right: Node Config Panel */}
        {selectedNode && (
          <div className="w-[280px] border-l border-zinc-800 overflow-y-auto bg-zinc-900/80 flex-shrink-0">
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={(data) => handleNodeDataChange(selectedNode.id, data)}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default TalentFlowTab;
