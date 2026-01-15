import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function AddCandidateModal({ isOpen, onClose, onSuccess }) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [signalInput, setSignalInput] = useState("");

  const [formData, setFormData] = useState({
    // Basic Info
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    linkedin_profile: "",
    person_home_location: "",
    source: "",
    skills: [],
    // Professional
    company_name: "",
    job_title: "",
    status_notes: "",
    contact_status: "new",
    // Intelligence
    intelligence_score: 50,
    intelligence_level: "Medium",
    intelligence_urgency: "Medium",
    recommended_approach: "direct",
    intelligence_factors: [],
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.skills.includes(tagInput.trim())) {
      handleChange("skills", [...formData.skills, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    handleChange(
      "skills",
      formData.skills.filter((tag) => tag !== tagToRemove)
    );
  };

  const addSignal = () => {
    if (signalInput.trim() && !formData.intelligence_factors.includes(signalInput.trim())) {
      handleChange("intelligence_factors", [...formData.intelligence_factors, signalInput.trim()]);
      setSignalInput("");
    }
  };

  const removeSignal = (signalToRemove) => {
    handleChange(
      "intelligence_factors",
      formData.intelligence_factors.filter((signal) => signal !== signalToRemove)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("First name and last name are required");
      setActiveTab("basic");
      return;
    }

    if (!user?.organization_id) {
      toast.error("Organization not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const candidateData = {
        ...formData,
        organization_id: user.organization_id,
        intelligence_factors: formData.intelligence_factors.length > 0
          ? { signals: formData.intelligence_factors }
          : null,
      };

      const { data, error } = await supabase
        .from("candidates")
        .insert([candidateData])
        .select()
        .single();

      if (error) throw error;

      toast.success("Candidate added successfully");
      onSuccess?.(data);
      onClose();

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        linkedin_profile: "",
        person_home_location: "",
        source: "",
        skills: [],
        company_name: "",
        job_title: "",
        status_notes: "",
        contact_status: "new",
        intelligence_score: 50,
        intelligence_level: "Medium",
        intelligence_urgency: "Medium",
        recommended_approach: "direct",
        intelligence_factors: [],
      });
      setActiveTab("basic");
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error(error.message || "Failed to add candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-red-400" />
            Add New Candidate
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50">
              <TabsTrigger value="basic" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <User className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="professional" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <Briefcase className="w-4 h-4 mr-2" />
                Professional
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <Brain className="w-4 h-4 mr-2" />
                Intelligence
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-2">
              <TabsContent value="basic" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-zinc-400">
                      First Name <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="John"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-zinc-400">
                      Last Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                      placeholder="Doe"
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
                  <Label htmlFor="linkedin_profile" className="text-zinc-400">LinkedIn URL</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="linkedin_profile"
                      value={formData.linkedin_profile}
                      onChange={(e) => handleChange("linkedin_profile", e.target.value)}
                      className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="person_home_location" className="text-zinc-400">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="person_home_location"
                        value={formData.person_home_location}
                        onChange={(e) => handleChange("person_home_location", e.target.value)}
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
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skills.map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-red-500/20 text-red-400">
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
                    <Label htmlFor="company_name" className="text-zinc-400">Current Company</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => handleChange("company_name", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Acme Inc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_title" className="text-zinc-400">Current Title</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="job_title"
                        value={formData.job_title}
                        onChange={(e) => handleChange("job_title", e.target.value)}
                        className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                        placeholder="Senior Engineer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Contact Status</Label>
                    <Select value={formData.contact_status} onValueChange={(v) => handleChange("contact_status", v)}>
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
                    <Label className="text-zinc-400">Years Experience</Label>
                    <Input
                      type="number"
                      value={formData.years_experience || ""}
                      onChange={(e) => handleChange("years_experience", parseInt(e.target.value) || null)}
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_notes" className="text-zinc-400">Notes</Label>
                  <Textarea
                    id="status_notes"
                    value={formData.status_notes}
                    onChange={(e) => handleChange("status_notes", e.target.value)}
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
                      <span className="text-lg font-semibold text-red-400">{formData.intelligence_score}</span>
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
                      <Select value={formData.intelligence_urgency} onValueChange={(v) => handleChange("intelligence_urgency", v)}>
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
                    {formData.intelligence_factors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.intelligence_factors.map((signal) => (
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
            <Button type="submit" disabled={isSubmitting} className="bg-red-500 hover:bg-red-600">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Candidate
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
