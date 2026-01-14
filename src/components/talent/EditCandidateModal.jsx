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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  User,
  Briefcase,
  Brain,
  X,
  Plus,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Building2,
  Tag,
  Trash2,
  Save,
} from "lucide-react";

const STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "passive", label: "Passive" },
  { value: "not_interested", label: "Not Interested" },
  { value: "do_not_contact", label: "Do Not Contact" },
];

const INTELLIGENCE_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const APPROACHES = [
  { value: "direct", label: "Direct Outreach" },
  { value: "warm_intro", label: "Warm Introduction" },
  { value: "referral", label: "Referral" },
  { value: "inbound", label: "Inbound" },
  { value: "event", label: "Event" },
];

const SOURCES = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "job_board", label: "Job Board" },
  { value: "website", label: "Company Website" },
  { value: "event", label: "Event/Conference" },
  { value: "other", label: "Other" },
];

export default function EditCandidateModal({ isOpen, onClose, candidate, onSuccess, onDelete }) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [signalInput, setSignalInput] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    location: "",
    source: "",
    tags: [],
    current_company: "",
    current_title: "",
    notes: "",
    stage: "new",
    status: "active",
    intelligence_score: 50,
    intelligence_level: "medium",
    urgency: "medium",
    recommended_approach: "direct",
    intelligence_signals: [],
  });

  // Populate form when candidate changes
  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        linkedin_url: candidate.linkedin_url || "",
        location: candidate.location || "",
        source: candidate.source || "",
        tags: candidate.tags || [],
        current_company: candidate.current_company || "",
        current_title: candidate.current_title || "",
        notes: candidate.notes || "",
        stage: candidate.stage || "new",
        status: candidate.status || "active",
        intelligence_score: candidate.intelligence_score || 50,
        intelligence_level: candidate.intelligence_level || "medium",
        urgency: candidate.urgency || "medium",
        recommended_approach: candidate.recommended_approach || "direct",
        intelligence_signals: candidate.intelligence_signals || [],
      });
    }
  }, [candidate]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange("tags", [...formData.tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    handleChange("tags", formData.tags.filter((tag) => tag !== tagToRemove));
  };

  const addSignal = () => {
    if (signalInput.trim() && !formData.intelligence_signals.includes(signalInput.trim())) {
      handleChange("intelligence_signals", [...formData.intelligence_signals, signalInput.trim()]);
      setSignalInput("");
    }
  };

  const removeSignal = (signalToRemove) => {
    handleChange(
      "intelligence_signals",
      formData.intelligence_signals.filter((signal) => signal !== signalToRemove)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      setActiveTab("basic");
      return;
    }

    if (!candidate?.id) {
      toast.error("Candidate not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("candidates")
        .update(formData)
        .eq("id", candidate.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Candidate updated successfully");
      onSuccess?.(data);
      onClose();
    } catch (error) {
      console.error("Error updating candidate:", error);
      toast.error(error.message || "Failed to update candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate?.id) return;

    setIsDeleting(true);

    try {
      // First delete related outreach tasks
      const { error: tasksError } = await supabase
        .from("outreach_tasks")
        .delete()
        .eq("candidate_id", candidate.id);

      if (tasksError) {
        console.warn("Error deleting outreach tasks:", tasksError);
      }

      // Then delete the candidate
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", candidate.id);

      if (error) throw error;

      toast.success("Candidate deleted successfully");
      onDelete?.(candidate.id);
      onClose();
    } catch (error) {
      console.error("Error deleting candidate:", error);
      toast.error(error.message || "Failed to delete candidate");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-violet-400" />
              Edit Candidate
            </DialogTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete Candidate</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    Are you sure you want to delete <strong className="text-white">{candidate.name}</strong>? 
                    This will also delete all related outreach tasks. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50">
              <TabsTrigger value="basic" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <User className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="professional" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Briefcase className="w-4 h-4 mr-2" />
                Professional
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Brain className="w-4 h-4 mr-2" />
                Intelligence
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-2">
              <TabsContent value="basic" className="space-y-4 m-0">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-400">
                    Name <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-400">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-zinc-400">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="+1 234 567 890"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="text-zinc-400">LinkedIn URL</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={(e) => handleChange("linkedin_url", e.target.value)}
                      className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-zinc-400">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleChange("location", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="San Francisco, CA"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Source</Label>
                    <Select value={formData.source} onValueChange={(v) => handleChange("source", v)}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {SOURCES.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Tags</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Add tag and press Enter"
                      />
                    </div>
                    <Button type="button" onClick={addTag} variant="outline" className="border-zinc-700">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-violet-500/20 text-violet-400">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-white">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="professional" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_company" className="text-zinc-400">Current Company</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="current_company"
                        value={formData.current_company}
                        onChange={(e) => handleChange("current_company", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Acme Inc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_title" className="text-zinc-400">Current Title</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="current_title"
                        value={formData.current_title}
                        onChange={(e) => handleChange("current_title", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Senior Engineer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Stage</Label>
                    <Select value={formData.stage} onValueChange={(v) => handleChange("stage", v)}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {STAGES.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-zinc-400">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white resize-none"
                    placeholder="Additional notes about the candidate..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="intelligence" className="space-y-4 m-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400">Intelligence Score</Label>
                      <span className="text-lg font-semibold text-violet-400">{formData.intelligence_score}</span>
                    </div>
                    <Slider
                      value={[formData.intelligence_score]}
                      onValueChange={([v]) => handleChange("intelligence_score", v)}
                      max={100}
                      step={1}
                      className="py-2"
                    />
                    <p className="text-xs text-zinc-500">
                      Higher scores indicate higher likelihood of candidate being open to new opportunities
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">Intelligence Level</Label>
                      <Select value={formData.intelligence_level} onValueChange={(v) => handleChange("intelligence_level", v)}>
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {INTELLIGENCE_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-400">Urgency</Label>
                      <Select value={formData.urgency} onValueChange={(v) => handleChange("urgency", v)}>
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          {URGENCY_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Recommended Approach</Label>
                    <Select value={formData.recommended_approach} onValueChange={(v) => handleChange("recommended_approach", v)}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {APPROACHES.map((approach) => (
                          <SelectItem key={approach.value} value={approach.value}>
                            {approach.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-400">Intelligence Signals</Label>
                    <div className="flex gap-2">
                      <Input
                        value={signalInput}
                        onChange={(e) => setSignalInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSignal())}
                        className="bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Add signal (e.g., 'Recently promoted', 'Company layoffs')"
                      />
                      <Button type="button" onClick={addSignal} variant="outline" className="border-zinc-700">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.intelligence_signals.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.intelligence_signals.map((signal) => (
                          <Badge key={signal} variant="secondary" className="bg-amber-500/20 text-amber-400">
                            {signal}
                            <button type="button" onClick={() => removeSignal(signal)} className="ml-1 hover:text-white">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-zinc-500">
                      Signals that indicate candidate readiness or interest in new opportunities
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-zinc-800">
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-violet-500 hover:bg-violet-600">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
