/**
 * CampaignWizard - Step-by-step campaign creation with project/role context
 * Creates a unified flow: Project -> Role -> Role Context -> Find Matches
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/components/context/UserContext";
import { supabase } from "@/api/supabaseClient";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  Briefcase,
  Sparkles,
  Users,
  ChevronRight,
  ChevronLeft,
  Plus,
  Check,
  Loader2,
  Target,
  MessageSquare,
  Star,
  Building,
  MapPin,
  Package,
  Zap,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Select Project", icon: FolderOpen },
  { id: 2, title: "Select Role", icon: Briefcase },
  { id: 3, title: "Define Role Context", icon: Target },
  { id: 4, title: "Review & Launch", icon: Sparkles },
];

export default function CampaignWizard({ open, onOpenChange, onComplete, nestContext }) {
  const { user } = useUser();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Data
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);

  // Selected values
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", client_name: "", description: "" });

  // New role form
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRole, setNewRole] = useState({ title: "", department: "", location: "", job_type: "full_time" });

  // Role context (the deep understanding)
  const [roleContext, setRoleContext] = useState({
    perfect_fit_criteria: "",
    selling_points: "",
    must_haves: "",
    nice_to_haves: "",
    compensation_range: "",
    unique_aspects: "",
  });

  // Campaign details
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("email");

  // Search
  const [projectSearch, setProjectSearch] = useState("");

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!user?.organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", user.organization_id)
        .order("created_date", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user?.organization_id]);

  // Fetch roles for selected project
  const fetchRoles = useCallback(async () => {
    if (!selectedProject?.id) {
      setRoles([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("project_id", selectedProject.id)
        .order("created_date", { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open, fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      fetchRoles();
    }
  }, [selectedProject, fetchRoles]);

  // Auto-generate campaign name
  useEffect(() => {
    if (selectedProject && selectedRole) {
      setCampaignName(`${selectedRole.title} - ${selectedProject.name || selectedProject.client?.name || "Outreach"}`);
    }
  }, [selectedProject, selectedRole]);

  // Create new project
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          organization_id: user.organization_id,
          name: newProject.name,
          client_name: newProject.client_name || null,
          description: newProject.description || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      setProjects([data, ...projects]);
      setSelectedProject(data);
      setShowNewProject(false);
      setNewProject({ name: "", client_name: "", description: "" });
      toast.success("Project created!");
    } catch (err) {
      console.error("Failed to create project:", err);
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  // Create new role
  const handleCreateRole = async () => {
    if (!newRole.title.trim()) {
      toast.error("Role title is required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("roles")
        .insert({
          project_id: selectedProject.id,
          organization_id: user.organization_id,
          title: newRole.title,
          description: newRole.department || null, // Using department input as description
          location_requirements: newRole.location || null,
          employment_type: newRole.job_type,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      setRoles([data, ...roles]);
      setSelectedRole(data);
      setShowNewRole(false);
      setNewRole({ title: "", department: "", location: "", job_type: "full_time" });
      toast.success("Role created!");
    } catch (err) {
      console.error("Failed to create role:", err);
      toast.error("Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  // Create campaign and navigate
  const handleCreateCampaign = async () => {
    console.log("[CampaignWizard] handleCreateCampaign triggered");
    console.log("[CampaignWizard] State:", {
      campaignName,
      creating,
      selectedProject: selectedProject?.id,
      selectedRole: selectedRole?.id,
      user: user?.id,
      organizationId: user?.organization_id
    });

    if (!campaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (!user?.organization_id) {
      toast.error("User organization not found. Please refresh and try again.");
      console.error("[CampaignWizard] Missing organization_id");
      return;
    }

    setCreating(true);
    try {
      // Debug: Verify user's organization in database matches what we're sending
      const { data: dbUser, error: userError } = await supabase
        .from("users")
        .select("id, organization_id")
        .eq("id", user.id)
        .single();

      console.log("[CampaignWizard] Database user check:", {
        dbOrganizationId: dbUser?.organization_id,
        clientOrganizationId: user.organization_id,
        match: dbUser?.organization_id === user.organization_id
      });

      if (userError) {
        console.error("[CampaignWizard] Error fetching user:", userError);
      }

      const campaignData = {
        organization_id: user.organization_id,
        created_by: user.id,
        name: campaignName,
        project_id: selectedProject?.id || null,
        role_id: selectedRole?.id || null,
        campaign_type: campaignType,
        status: "draft",
        role_context: {
          ...roleContext,
          // Store role info in context as well for reference
          role_title: selectedRole?.title,
          project_name: selectedProject?.name,
        },
        auto_match_enabled: true,
        min_match_score: 30,
      };

      // If coming from a nest purchase, link the nest
      if (nestContext?.id) {
        campaignData.nest_id = nestContext.id;
      }

      console.log("[CampaignWizard] Inserting campaign:", JSON.stringify(campaignData, null, 2));

      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        console.error("[CampaignWizard] Supabase error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          full: JSON.stringify(error)
        });
        throw error;
      }

      console.log("[CampaignWizard] Campaign created successfully:", data);
      toast.success("Campaign created!");
      onOpenChange(false);

      if (onComplete) {
        onComplete(data);
      } else {
        navigate(`/TalentCampaignDetail?id=${data.id}`);
      }
    } catch (err) {
      console.error("[CampaignWizard] Failed to create campaign - full error:", JSON.stringify(err, null, 2));
      const errorMsg = err.message || err.details || "Failed to create campaign";
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  // Navigation
  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedProject;
      case 2: return !!selectedRole;
      case 3: return roleContext.perfect_fit_criteria.trim().length > 0 || roleContext.selling_points.trim().length > 0;
      case 4: return campaignName.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Reset when closing
  const handleOpenChange = (open) => {
    if (!open) {
      setStep(1);
      setSelectedProject(null);
      setSelectedRole(null);
      setProjectSearch("");
      setRoleContext({
        perfect_fit_criteria: "",
        selling_points: "",
        must_haves: "",
        nice_to_haves: "",
        compensation_range: "",
        unique_aspects: "",
      });
      setCampaignName("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 p-0 overflow-hidden">
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isComplete = step > s.id;

              return (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-red-500 text-white"
                          : isComplete
                          ? "bg-green-500 text-white"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs hidden sm:block ${isActive ? "text-white" : "text-zinc-500"}`}>
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${step > s.id ? "bg-green-500" : "bg-zinc-800"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Project */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white">Which project is this for?</h2>
                  <p className="text-sm text-zinc-400">Select an existing project or create a new one</p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <>
                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                      />
                      {projectSearch && (
                        <button
                          onClick={() => setProjectSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Project List */}
                    {(() => {
                      const filteredProjects = projects.filter(project =>
                        (project.name || project.title || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
                        (project.client_company || '').toLowerCase().includes(projectSearch.toLowerCase())
                      );

                      if (filteredProjects.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                            <p className="text-zinc-500 text-sm">
                              {projectSearch ? `No projects found matching "${projectSearch}"` : "No projects yet"}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2">
                          {filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          onClick={() => setSelectedProject(project)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedProject?.id === project.id
                              ? "border-red-500 bg-red-500/10"
                              : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              selectedProject?.id === project.id ? "bg-red-500/20" : "bg-zinc-700/50"
                            }`}>
                              <FolderOpen className={`w-4 h-4 ${
                                selectedProject?.id === project.id ? "text-red-400" : "text-zinc-400"
                              }`} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white text-sm">{project.name || project.title}</p>
                              <p className="text-xs text-zinc-500">
                                {project.client_company || "Internal"}
                              </p>
                            </div>
                            {selectedProject?.id === project.id && (
                              <Check className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                        </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* New Project Form */}
                    {showNewProject ? (
                      <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3">
                        <div>
                          <Label className="text-xs text-zinc-400">Project Name *</Label>
                          <Input
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            placeholder="e.g., Q1 Engineering Expansion"
                            className="bg-zinc-900 border-zinc-700 text-white mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Client Name (optional)</Label>
                          <Input
                            value={newProject.client_name}
                            onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                            placeholder="e.g., Acme Corp"
                            className="bg-zinc-900 border-zinc-700 text-white mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCreateProject}
                            disabled={loading || !newProject.name.trim()}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Project"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowNewProject(false)}
                            className="text-zinc-400"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setShowNewProject(true)}
                        className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Project
                      </Button>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Role */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white">Which role are you filling?</h2>
                  <p className="text-sm text-zinc-400">
                    Project: <span className="text-white">{selectedProject?.name || selectedProject?.title}</span>
                  </p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <>
                    {roles.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                        {roles.map((role) => (
                          <div
                            key={role.id}
                            onClick={() => setSelectedRole(role)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedRole?.id === role.id
                                ? "border-red-500 bg-red-500/10"
                                : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                selectedRole?.id === role.id ? "bg-red-500/20" : "bg-zinc-700/50"
                              }`}>
                                <Briefcase className={`w-4 h-4 ${
                                  selectedRole?.id === role.id ? "text-red-400" : "text-zinc-400"
                                }`} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm">{role.title}</p>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                  {role.department && <span>{role.department}</span>}
                                  {role.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {role.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {selectedRole?.id === role.id && (
                                <Check className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-zinc-500">
                        <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No roles in this project yet</p>
                      </div>
                    )}

                    {/* New Role Form */}
                    {showNewRole ? (
                      <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-zinc-400">Role Title *</Label>
                            <Input
                              value={newRole.title}
                              onChange={(e) => setNewRole({ ...newRole, title: e.target.value })}
                              placeholder="e.g., Senior Backend Engineer"
                              className="bg-zinc-900 border-zinc-700 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-zinc-400">Department</Label>
                            <Input
                              value={newRole.department}
                              onChange={(e) => setNewRole({ ...newRole, department: e.target.value })}
                              placeholder="e.g., Engineering"
                              className="bg-zinc-900 border-zinc-700 text-white mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-zinc-400">Location</Label>
                            <Input
                              value={newRole.location}
                              onChange={(e) => setNewRole({ ...newRole, location: e.target.value })}
                              placeholder="e.g., Remote, SF Bay Area"
                              className="bg-zinc-900 border-zinc-700 text-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-zinc-400">Job Type</Label>
                            <Select value={newRole.job_type} onValueChange={(v) => setNewRole({ ...newRole, job_type: v })}>
                              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="full_time">Full-time</SelectItem>
                                <SelectItem value="part_time">Part-time</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCreateRole}
                            disabled={loading || !newRole.title.trim()}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Role"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowNewRole(false)}
                            className="text-zinc-400"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setShowNewRole(true)}
                        className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Role
                      </Button>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Role Context (Deep Understanding) */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white">Let's understand this role deeply</h2>
                  <p className="text-sm text-zinc-400">
                    This helps us find perfect matches and write personalized outreach
                  </p>
                </div>

                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
                  <div>
                    <Label className="text-xs text-zinc-400 flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-500" />
                      What makes someone PERFECT for this role?
                    </Label>
                    <Textarea
                      value={roleContext.perfect_fit_criteria}
                      onChange={(e) => setRoleContext({ ...roleContext, perfect_fit_criteria: e.target.value })}
                      placeholder="e.g., 5+ years Python experience, ideally Django/FastAPI. Has scaled systems to millions of users. Previous startup experience from seed to Series B."
                      className="bg-zinc-900 border-zinc-700 text-white mt-1 min-h-[80px]"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-zinc-400 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 text-green-500" />
                      What's the COMPELLING story for this role?
                    </Label>
                    <Textarea
                      value={roleContext.selling_points}
                      onChange={(e) => setRoleContext({ ...roleContext, selling_points: e.target.value })}
                      placeholder="e.g., Series B startup, just raised $40M. Building next-gen payment infrastructure. Small team (8 eng), massive ownership. Remote-first, competitive equity."
                      className="bg-zinc-900 border-zinc-700 text-white mt-1 min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-zinc-400">Must-Haves</Label>
                      <Textarea
                        value={roleContext.must_haves}
                        onChange={(e) => setRoleContext({ ...roleContext, must_haves: e.target.value })}
                        placeholder="Non-negotiable requirements..."
                        className="bg-zinc-900 border-zinc-700 text-white mt-1 min-h-[60px]"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400">Nice-to-Haves</Label>
                      <Textarea
                        value={roleContext.nice_to_haves}
                        onChange={(e) => setRoleContext({ ...roleContext, nice_to_haves: e.target.value })}
                        placeholder="Bonus qualifications..."
                        className="bg-zinc-900 border-zinc-700 text-white mt-1 min-h-[60px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-zinc-400">Compensation Range</Label>
                      <Input
                        value={roleContext.compensation_range}
                        onChange={(e) => setRoleContext({ ...roleContext, compensation_range: e.target.value })}
                        placeholder="e.g., $180-220k + equity"
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400">Unique Aspects</Label>
                      <Input
                        value={roleContext.unique_aspects}
                        onChange={(e) => setRoleContext({ ...roleContext, unique_aspects: e.target.value })}
                        placeholder="e.g., Direct CEO access, patent opportunity"
                        className="bg-zinc-900 border-zinc-700 text-white mt-1"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review & Launch */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white">Review & Create Campaign</h2>
                  <p className="text-sm text-zinc-400">
                    Ready to find perfect matches for this role
                  </p>
                </div>

                {/* Nest Context Banner - shown when coming from nest purchase */}
                {nestContext && (
                  <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Package className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-cyan-400">Sourcing from Nest</span>
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
                            <Zap className="w-3 h-3 mr-1" />
                            Intel Active
                          </Badge>
                        </div>
                        <p className="text-white text-sm font-medium">{nestContext.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <GlassCard className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-500">Project</span>
                    </div>
                    <p className="font-medium text-white text-sm">{selectedProject?.name || selectedProject?.title}</p>
                    <p className="text-xs text-zinc-500">{selectedProject?.client_company || "Internal"}</p>
                  </GlassCard>

                  <GlassCard className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-500">Role</span>
                    </div>
                    <p className="font-medium text-white text-sm">{selectedRole?.title}</p>
                    <p className="text-xs text-zinc-500">{selectedRole?.location || selectedRole?.department || "No location"}</p>
                  </GlassCard>
                </div>

                {/* Role Context Summary */}
                {(roleContext.perfect_fit_criteria || roleContext.selling_points) && (
                  <GlassCard className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs text-zinc-500">Role Context</span>
                    </div>
                    {roleContext.perfect_fit_criteria && (
                      <p className="text-xs text-zinc-300 mb-1">
                        <span className="text-yellow-500">Perfect Fit:</span> {roleContext.perfect_fit_criteria.substring(0, 100)}...
                      </p>
                    )}
                    {roleContext.selling_points && (
                      <p className="text-xs text-zinc-300">
                        <span className="text-green-500">Story:</span> {roleContext.selling_points.substring(0, 100)}...
                      </p>
                    )}
                  </GlassCard>
                )}

                {/* Campaign Settings */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-zinc-400">Campaign Name</Label>
                    <Input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g., Senior Engineer Outreach - Acme"
                      className="bg-zinc-900 border-zinc-700 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-zinc-400">Outreach Channel</Label>
                    <Select value={campaignType} onValueChange={setCampaignType}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="multi_channel">Multi-Channel (Email + LinkedIn)</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* What happens next */}
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">What happens next</span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1">
                    <li>1. We'll find candidates matching your criteria</li>
                    <li>2. AI will generate personalized messages using role context</li>
                    <li>3. Review matches and approve outreach</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="text-zinc-400"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {step < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-red-500 hover:bg-red-600"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                console.log("[CampaignWizard] Button clicked! campaignName:", campaignName, "creating:", creating);
                handleCreateCampaign();
              }}
              disabled={creating || !campaignName.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Campaign & Find Matches
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
