/**
 * FlowCanvas - Main React Flow canvas component
 * Handles nodes, edges, connections, and canvas interactions
 */

import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { edgeTypes } from './CustomEdge';
import { generateNodeId } from './flowUtils';

// Default edge options
const defaultEdgeOptions = {
  type: 'custom',
  animated: false,
  style: { strokeWidth: 2 }
};

// Connection line style
const connectionLineStyle = {
  stroke: '#64748b',
  strokeWidth: 2,
  strokeDasharray: '5,5'
};

function FlowCanvasInner({
  initialNodes = [],
  initialEdges = [],
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onNodeSelect,
  onSave,
  readOnly = false
}) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle node changes
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    if (externalOnNodesChange) {
      externalOnNodesChange(changes, nodes);
    }
  }, [onNodesChange, externalOnNodesChange, nodes]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    if (externalOnEdgesChange) {
      externalOnEdgesChange(changes, edges);
    }
  }, [onEdgesChange, externalOnEdgesChange, edges]);

  // Handle new connections
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'custom',
        id: `edge-${params.source}-${params.sourceHandle || 'default'}-${params.target}`
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle drop from palette
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: generateNodeId(type),
        type,
        position,
        data: {
          name: '',
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node selection
  const onSelectionChange = useCallback(({ nodes: selectedNodes }) => {
    if (onNodeSelect && selectedNodes.length === 1) {
      onNodeSelect(selectedNodes[0]);
    } else if (onNodeSelect && selectedNodes.length === 0) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  // Handle keyboard shortcuts
  const onKeyDown = useCallback((event) => {
    if (readOnly) return;

    // Delete selected nodes/edges on backspace or delete
    if (event.key === 'Backspace' || event.key === 'Delete') {
      setNodes((nds) => nds.filter((node) => !node.selected));
      setEdges((eds) => eds.filter((edge) => !edge.selected));
    }

    // Ctrl/Cmd + S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (onSave) {
        onSave(nodes, edges);
      }
    }
  }, [readOnly, setNodes, setEdges, onSave, nodes, edges]);

  // Expose current state to parent
  const getCurrentState = useCallback(() => ({
    nodes,
    edges
  }), [nodes, edges]);

  // Attach ref for external access
  if (reactFlowWrapper.current) {
    reactFlowWrapper.current.getCurrentState = getCurrentState;
  }

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        selectionKeyCode={readOnly ? null : 'Shift'}
        multiSelectionKeyCode={readOnly ? null : ['Meta', 'Control']}
        panOnScroll
        selectionOnDrag={!readOnly}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        proOptions={{ hideAttribution: true }}
      >
        {/* Background grid */}
        <Background
          variant="dots"
          gap={20}
          size={1}
          color="#374151"
        />

        {/* Controls */}
        <Controls
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg"
          showZoom={true}
          showFitView={true}
          showInteractive={!readOnly}
        />

        {/* MiniMap */}
        <MiniMap
          className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
              case 'start':
                return '#34d399';
              case 'aiAnalysis':
              case 'ai_analysis':
              case 'research':
                return '#a855f7';
              case 'sendEmail':
              case 'send_email':
                return '#3b82f6';
              case 'timer':
              case 'delay':
                return '#f97316';
              case 'condition':
              case 'branch':
                return '#eab308';
              case 'linkedin':
                return '#0A66C2';
              case 'sms':
                return '#14b8a6';
              case 'followUp':
              case 'follow_up':
                return '#6366f1';
              case 'updateStatus':
              case 'update_status':
                return '#71717a';
              case 'end':
                return '#ef4444';
              default:
                return '#64748b';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />

        {/* Top panel for flow info */}
        <Panel position="top-center" className="!m-0">
          <div className="px-3 py-1.5 rounded-b-lg bg-zinc-800/90 border border-t-0 border-zinc-700 backdrop-blur-sm">
            <span className="text-xs text-zinc-400">
              {nodes.length} nodes • {edges.length} connections
            </span>
          </div>
        </Panel>

        {/* Save indicator */}
        {onSave && (
          <Panel position="top-right" className="!m-2">
            <button
              onClick={() => onSave(nodes, edges)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs text-cyan-300 transition-colors"
            >
              Save (⌘S)
            </button>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export default function FlowCanvas(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
