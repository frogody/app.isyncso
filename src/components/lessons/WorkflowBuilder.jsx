import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save } from "lucide-react";

export default function WorkflowBuilder({ activity, onSave }) {
  const [nodes, setNodes] = useState(activity?.interactive_config?.nodes || []);
  const [edges, setEdges] = useState(activity?.interactive_config?.edges || []);
  const [initialSteps, setInitialSteps] = useState(activity?.interactive_config?.initial_steps || []);

  const addNode = () => {
    setNodes([...nodes, { id: `node-${Date.now()}`, label: "New Node", type: "task" }]);
  };

  const removeNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.source !== id && e.target !== id));
  };

  const updateNode = (id, field, value) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleSave = () => {
    onSave({ nodes, edges, initial_steps: initialSteps });
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white">Workflow Nodes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nodes.map(node => (
            <div key={node.id} className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Node label"
                  value={node.label || ""}
                  onChange={(e) => updateNode(node.id, "label", e.target.value)}
                  className="bg-transparent flex-1"
                />
                <Button onClick={() => removeNode(node.id)} variant="outline" size="sm" className="btn-outline">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Node description"
                value={node.description || ""}
                onChange={(e) => updateNode(node.id, "description", e.target.value)}
                className="bg-transparent"
              />
            </div>
          ))}
          <Button onClick={addNode} className="btn-primary w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Node
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4 mr-2" />
          Save Workflow
        </Button>
      </div>
    </div>
  );
}