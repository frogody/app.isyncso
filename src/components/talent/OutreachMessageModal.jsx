import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Linkedin,
  MessageSquare,
  Sparkles,
  Loader2,
  Send,
  Clock,
  Save,
  Calendar,
} from "lucide-react";

const MESSAGE_TYPES = [
  { value: "email", label: "Email", icon: Mail },
  { value: "linkedin", label: "LinkedIn Message", icon: Linkedin },
  { value: "linkedin_connection", label: "LinkedIn Connection", icon: Linkedin },
];

export default function OutreachMessageModal({
  isOpen,
  onClose,
  task,
  candidate,
  campaignId,
  onSuccess,
}) {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    task_type: "email",
    subject: "",
    content: "",
    scheduled_at: "",
    status: "draft",
  });

  // Populate form when editing existing task
  useEffect(() => {
    if (task) {
      setFormData({
        task_type: task.task_type || "email",
        subject: task.subject || "",
        content: task.content || "",
        scheduled_at: task.scheduled_at ? task.scheduled_at.slice(0, 16) : "",
        status: task.status || "draft",
      });
    } else {
      setFormData({
        task_type: "email",
        subject: "",
        content: "",
        scheduled_at: "",
        status: "draft",
      });
    }
  }, [task]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateMessage = async () => {
    if (!candidate) {
      toast.error("No candidate selected");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Generate a personalized ${formData.task_type === "email" ? "cold email" : formData.task_type === "linkedin" ? "LinkedIn message" : "LinkedIn connection request"} for recruiting.

Candidate Information:
- Name: ${candidate.name}
- Current Company: ${candidate.current_company || "Unknown"}
- Current Title: ${candidate.current_title || "Unknown"}
- Location: ${candidate.location || "Unknown"}

Requirements:
- Keep it concise (${formData.task_type === "email" ? "3-4 sentences" : "2-3 sentences"})
- Be professional but conversational
- Reference their background if relevant
- Include a clear call to action
${formData.task_type === "email" ? "- Also provide a compelling subject line" : ""}

Return as JSON with ${formData.task_type === "email" ? '"subject" and "content"' : '"content"'} fields.`;

      const { data, error } = await supabase.functions.invoke("invokeGrok", {
        body: { prompt },
      });

      if (error) throw error;

      // Parse the response
      let result = data;
      if (typeof data === "string") {
        try {
          result = JSON.parse(data);
        } catch {
          result = { content: data };
        }
      }

      if (result.subject) {
        handleChange("subject", result.subject);
      }
      if (result.content) {
        handleChange("content", result.content);
      }

      toast.success("Message generated!");
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (saveAs = "draft") => {
    if (!formData.content.trim()) {
      toast.error("Message content is required");
      return;
    }

    if (formData.task_type === "email" && !formData.subject.trim()) {
      toast.error("Subject line is required for emails");
      return;
    }

    if (!candidate?.id && !task?.candidate_id) {
      toast.error("No candidate selected");
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        task_type: formData.task_type,
        subject: formData.subject || null,
        content: formData.content,
        scheduled_at: formData.scheduled_at || null,
        status: saveAs,
        candidate_id: task?.candidate_id || candidate?.id,
        campaign_id: task?.campaign_id || campaignId || null,
        organization_id: user.organization_id,
      };

      let result;
      if (task?.id) {
        // Update existing task
        const { data, error } = await supabase
          .from("outreach_tasks")
          .update(taskData)
          .eq("id", task.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        toast.success(saveAs === "draft" ? "Draft saved" : "Task queued for sending");
      } else {
        // Create new task
        const { data, error } = await supabase
          .from("outreach_tasks")
          .insert([taskData])
          .select()
          .single();

        if (error) throw error;
        result = data;
        toast.success(saveAs === "draft" ? "Draft created" : "Task queued for sending");
      }

      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(error.message || "Failed to save message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = MESSAGE_TYPES.find((t) => t.value === formData.task_type);
  const TypeIcon = selectedType?.icon || Mail;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            {task ? "Edit Outreach Message" : "Compose Outreach Message"}
          </DialogTitle>
        </DialogHeader>

        {candidate && (
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-semibold">
              {candidate.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{candidate.name}</p>
              <p className="text-sm text-zinc-400">
                {candidate.current_title ? `${candidate.current_title} at ` : ""}
                {candidate.current_company || "Unknown Company"}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-400">Message Type</Label>
            <Select
              value={formData.task_type}
              onValueChange={(v) => handleChange("task_type", v)}
            >
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                <div className="flex items-center gap-2">
                  <TypeIcon className="w-4 h-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {MESSAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.task_type === "email" && (
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-zinc-400">
                Subject Line
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="Quick question about your background"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content" className="text-zinc-400">
                Message Content
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateMessage}
                disabled={isGenerating || !candidate}
                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate with AI
              </Button>
            </div>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange("content", e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white resize-none min-h-[150px]"
              placeholder={`Hi ${candidate?.name?.split(" ")[0] || "there"},\n\nI noticed your background in...`}
            />
            <p className="text-xs text-zinc-600">
              Use {"{{first_name}}"}, {"{{company}}"}, {"{{title}}"} for personalization
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_at" className="text-zinc-400">
              Schedule Send (Optional)
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => handleChange("scheduled_at", e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit("draft")}
              disabled={isSubmitting}
              className="border-zinc-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit("pending")}
              disabled={isSubmitting}
              className="bg-violet-500 hover:bg-violet-600"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : formData.scheduled_at ? (
                <Clock className="w-4 h-4 mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {formData.scheduled_at ? "Schedule" : "Queue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
