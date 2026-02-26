import React, { useState } from "react";
import { Copy, FileText, Bug, Megaphone, Users, Sparkles, Lightbulb, CheckSquare, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TEMPLATES = [
  {
    id: "bug_report",
    name: "Bug Report",
    icon: Bug,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    task: {
      title: "Bug: ",
      description: "**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Environment:**\n- Browser: \n- OS: ",
      priority: "high",
      status: "pending",
      labels: ["bug"],
    },
  },
  {
    id: "feature_request",
    name: "Feature Request",
    icon: Lightbulb,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    task: {
      title: "Feature: ",
      description: "**Problem:**\nDescribe the problem this feature would solve.\n\n**Proposed Solution:**\nDescribe the desired solution.\n\n**Alternatives Considered:**\nList any alternative solutions.",
      priority: "medium",
      status: "pending",
      labels: ["feature"],
    },
  },
  {
    id: "meeting_followup",
    name: "Meeting Follow-up",
    icon: MessageSquare,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    task: {
      title: "Follow-up: ",
      description: "**Meeting Date:**\n\n**Key Discussion Points:**\n- \n\n**Action Items:**\n- [ ] \n- [ ] \n\n**Next Steps:**\n",
      priority: "medium",
      status: "pending",
      labels: ["meeting"],
      checklist: [
        { id: "1", title: "Send meeting notes", done: false },
        { id: "2", title: "Schedule follow-up", done: false },
      ],
    },
  },
  {
    id: "content_creation",
    name: "Content Creation",
    icon: FileText,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    task: {
      title: "Content: ",
      description: "**Content Type:**\n\n**Target Audience:**\n\n**Key Messages:**\n- \n\n**Deadline:**\n\n**Distribution Channels:**\n",
      priority: "medium",
      status: "pending",
      labels: ["content"],
      checklist: [
        { id: "1", title: "Draft content", done: false },
        { id: "2", title: "Review and edit", done: false },
        { id: "3", title: "Get approval", done: false },
        { id: "4", title: "Publish", done: false },
      ],
    },
  },
  {
    id: "marketing_campaign",
    name: "Marketing Campaign",
    icon: Megaphone,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    task: {
      title: "Campaign: ",
      description: "**Campaign Goal:**\n\n**Target Audience:**\n\n**Budget:**\n\n**Timeline:**\n\n**Channels:**\n- \n\n**KPIs:**\n- ",
      priority: "high",
      status: "pending",
      labels: ["marketing"],
      estimated_minutes: 480,
    },
  },
  {
    id: "onboarding",
    name: "Team Onboarding",
    icon: Users,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    task: {
      title: "Onboard: ",
      description: "**New Team Member:**\n\n**Start Date:**\n\n**Department:**\n",
      priority: "high",
      status: "pending",
      labels: ["onboarding"],
      checklist: [
        { id: "1", title: "Set up accounts and access", done: false },
        { id: "2", title: "Schedule welcome meeting", done: false },
        { id: "3", title: "Assign buddy/mentor", done: false },
        { id: "4", title: "Share documentation and resources", done: false },
        { id: "5", title: "First week check-in", done: false },
      ],
    },
  },
  {
    id: "code_review",
    name: "Code Review",
    icon: CheckSquare,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    task: {
      title: "Review: ",
      description: "**PR/Branch:**\n\n**Changes Summary:**\n\n**Review Focus Areas:**\n- Code quality\n- Performance\n- Security\n- Test coverage",
      priority: "medium",
      status: "pending",
      labels: ["review"],
      estimated_minutes: 60,
    },
  },
  {
    id: "sprint_task",
    name: "Sprint Task",
    icon: Zap,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    task: {
      title: "",
      description: "**Acceptance Criteria:**\n- [ ] \n- [ ] \n\n**Technical Notes:**\n\n**Dependencies:**\n",
      priority: "medium",
      status: "pending",
      labels: ["sprint"],
      estimated_minutes: 120,
    },
  },
];

/**
 * Reusable task template selector.
 * Opens as a dialog, returns selected template data for pre-filling TaskModal.
 */
export default function TaskTemplates({ open, onOpenChange, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  const handleSelect = (template) => {
    onSelect?.(template.task);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Task Templates
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Choose a template to quickly create a pre-filled task
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  hoveredId === template.id
                    ? "bg-zinc-800 border-zinc-600"
                    : "bg-zinc-800/50 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${template.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${template.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-zinc-200 font-medium">
                    {template.name}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {template.task.labels?.[0] || "task"}
                    {template.task.checklist?.length > 0 &&
                      ` · ${template.task.checklist.length} items`}
                    {template.task.estimated_minutes &&
                      ` · ~${template.task.estimated_minutes}m`}
                  </div>
                </div>
                <Copy className="w-3 h-3 text-zinc-600 flex-shrink-0 ml-auto" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { TEMPLATES };
