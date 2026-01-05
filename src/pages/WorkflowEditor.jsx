
import React from "react";
import { Lesson } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import WorkflowBuilder from "@/components/lessons/WorkflowBuilder";
import { createPageUrl } from "@/utils";
import { DEFAULT_NODE_ORDER } from "@/components/lessons/workflow_builder/nodes";

export default function WorkflowEditor() {
  const [loading, setLoading] = React.useState(true);
  const [lesson, setLesson] = React.useState(null);
  const [activityIndex, setActivityIndex] = React.useState(0);
  const [activity, setActivity] = React.useState(null);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get("lessonId");
    const idx = parseInt(urlParams.get("activityIndex") || "0", 10);
    setActivityIndex(idx);

    const ensureConfig = (a) => {
      const cfg = a?.workflow_config || {};
      return {
        ...a,
        type: a?.type || "workflow_builder",
        button_label: a?.button_label || "Open Builder",
        workflow_config: {
          goal: cfg.goal || a?.title || "Design a focused, testable workflow",
          available_nodes: Array.isArray(cfg.available_nodes) && cfg.available_nodes.length ? cfg.available_nodes : DEFAULT_NODE_ORDER,
          initial_steps: Array.isArray(cfg.initial_steps) ? cfg.initial_steps : [
            { id: "input-1", node_id: "Input", values: { title: "Define Inputs" } },
            { id: "ai-1", node_id: "AI", values: { title: "Draft or Transform" } },
            { id: "decision-1", node_id: "Decision", values: { expression: "true", true_label: "Continue", false_label: "Stop" } }
          ],
          ai_guidance: Array.isArray(cfg.ai_guidance) && cfg.ai_guidance.length ? cfg.ai_guidance : [
            "Be explicit about the goal and success criteria.",
            "Prefer simple flows; test with sample payloads.",
            "Add only the nodes that create clear value."
          ],
          nodes: Array.isArray(cfg.nodes) ? cfg.nodes : [],
          edges: Array.isArray(cfg.edges) ? cfg.edges : [],
        }
      };
    };

    const load = async () => {
      if (!lessonId) { setLoading(false); return; }
      let rec = null;
      try {
        const res = await Lesson.filter({ id: lessonId });
        rec = res[0];
      } catch {
        const list = await Lesson.list();
        rec = list.find((l)=>l.id === lessonId);
      }
      if (!rec) { setLoading(false); return; }

      const acts = rec?.interactive_config?.activities || [];
      const current = acts[idx];
      const fixed = ensureConfig(current || { title: "Workflow Task" });

      // Persist minimal defaults if missing
      const changed = JSON.stringify(current) !== JSON.stringify(fixed);
      if (changed) {
        const nextActs = [...acts];
        nextActs[idx] = fixed;
        await Lesson.update(rec.id, {
          interactive_config: { ...(rec.interactive_config || {}), activities: nextActs }
        });
      }

      setLesson(rec);
      setActivity(fixed);
      setLoading(false);
    };

    load();
  }, []);

  const goBack = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get("courseId");
    window.location.href = courseId ? createPageUrl(`LessonViewer?courseId=${courseId}`) : createPageUrl("Dashboard");
  };

  const handleSave = async (payload) => {
    // payload: {nodes, edges, initial_steps}
    if (!lesson) return;
    const acts = lesson?.interactive_config?.activities || [];
    const updated = { ...(activity || {}) };
    updated.workflow_config = {
      ...(updated.workflow_config || {}),
      goal: updated.workflow_config?.goal || updated.title || "Design a focused, testable workflow",
      available_nodes: updated.workflow_config?.available_nodes || undefined,
      nodes: payload.nodes,
      edges: payload.edges,
      initial_steps: payload.initial_steps,
    };

    const nextActs = [...acts];
    nextActs[activityIndex] = updated;

    const updatedLesson = await Lesson.update(lesson.id, {
      interactive_config: { ...(lesson.interactive_config || {}), activities: nextActs },
    });

    setLesson(updatedLesson);
    setActivity(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={goBack} className="btn-outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-white text-lg font-semibold">
            {activity?.title || "Workflow Task"}
          </div>
          <div />
        </div>

        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <WorkflowBuilder activity={activity} onSave={handleSave} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
