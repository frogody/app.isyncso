import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Copy,
  Archive,
  RefreshCw,
  Loader2,
  ChevronRight,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    active: { bg: "bg-red-500/20", text: "text-red-400", label: "Active" },
    filled: { bg: "bg-red-500/20", text: "text-red-400", label: "Filled" },
    on_hold: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "On Hold" },
    cancelled: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Cancelled" },
    draft: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Draft" },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// Priority Badge
const PriorityBadge = ({ priority }) => {
  const styles = {
    urgent: { bg: "bg-red-500/20", text: "text-red-400", label: "Urgent" },
    high: { bg: "bg-red-500/20", text: "text-red-400", label: "High" },
    medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Medium" },
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Low" },
  };

  const style = styles[priority] || styles.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// Progress Ring
const ProgressRing = ({ filled, total, size = 40, strokeWidth = 3 }) => {
  const progress = total > 0 ? Math.round((filled / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-medium text-white">{filled}/{total}</span>
    </div>
  );
};

// Role Card Component
const RoleCard = ({ role, onEdit, onDelete }) => {
  return (
    <motion.div
      variants={itemVariants}
      className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 hover:border-red-500/20 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-white">{role.title}</h4>
          <p className="text-sm text-white/60">{role.department}</p>
        </div>
        <StatusBadge status={role.status} />
      </div>
      
      <div className="flex items-center gap-4 text-sm text-white/50 mb-3">
        {role.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {role.location}
          </span>
        )}
        {role.salary_range && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {role.salary_range}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-700/30">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-red-400" />
          <span className="text-sm text-white/70">
            {role.candidates_matched || 0} candidates matched
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(role)}
            className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(role)}
            className="p-1.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Project Card Component
const ProjectCard = ({ project, roles, onEdit, onDelete, onViewRoles, onAddRole }) => {
  const [showMenu, setShowMenu] = useState(false);
  const projectRoles = roles.filter(r => r.project_id === project.id);
  const filledRoles = projectRoles.filter(r => r.status === "filled").length;

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-6 hover:border-red-500/30 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>
            <h3 className="text-lg font-semibold text-white">{project.name}</h3>
            <p className="text-sm text-white/60 line-clamp-2 mt-1">{project.description}</p>
          </div>
          
          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        onEdit(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Project
                    </button>
                    <button
                      onClick={() => {
                        onAddRole(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Role
                    </button>
                    <button
                      onClick={() => {
                        onDelete(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Client & Timeline */}
        <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
          {project.client_name && (
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {project.client_name}
            </span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(project.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <ProgressRing filled={filledRoles} total={projectRoles.length} />
            <div>
              <p className="text-sm font-medium text-white">Roles Progress</p>
              <p className="text-xs text-white/50">{filledRoles} of {projectRoles.length} filled</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewRoles(project)}
            className="text-red-400 hover:text-red-300"
          >
            View Roles
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Roles Preview */}
        {projectRoles.length > 0 && (
          <div className="space-y-2">
            {projectRoles.slice(0, 3).map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-2 bg-zinc-800/30 rounded"
              >
                <span className="text-sm text-white/80">{role.title}</span>
                <StatusBadge status={role.status} />
              </div>
            ))}
            {projectRoles.length > 3 && (
              <p className="text-xs text-white/40 text-center pt-1">
                +{projectRoles.length - 3} more roles
              </p>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

// Project Modal Component
const ProjectModal = ({ isOpen, onClose, project, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client_name: "",
    status: "active",
    priority: "medium",
    deadline: "",
    budget: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        client_name: project.client_name || "",
        status: project.status || "active",
        priority: project.priority || "medium",
        deadline: project.deadline ? project.deadline.split("T")[0] : "",
        budget: project.budget || "",
        notes: project.notes || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        client_name: "",
        status: "active",
        priority: "medium",
        deadline: "",
        budget: "",
        notes: "",
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, project?.id);
      onClose();
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {project ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-white/70">Project Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Q1 Engineering Hiring"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-white/70">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project description..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Client</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Client name"
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-white/70">Budget</Label>
              <Input
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., $50,000"
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white/70">Deadline</Label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-white/70">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/70">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              project ? "Save Changes" : "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Role Modal Component
const RoleModal = ({ isOpen, onClose, role, projectId, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "",
    employment_type: "full_time",
    salary_range: "",
    requirements: "",
    responsibilities: "",
    status: "active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role) {
      setFormData({
        title: role.title || "",
        department: role.department || "",
        location: role.location || "",
        employment_type: role.employment_type || "full_time",
        salary_range: role.salary_range || "",
        requirements: role.requirements || "",
        responsibilities: role.responsibilities || "",
        status: role.status || "active",
      });
    } else {
      setFormData({
        title: "",
        department: "",
        location: "",
        employment_type: "full_time",
        salary_range: "",
        requirements: "",
        responsibilities: "",
        status: "active",
      });
    }
  }, [role, isOpen]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Role title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, role?.id, projectId);
      onClose();
    } catch (error) {
      console.error("Error saving role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {role ? "Edit Role" : "New Role"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-white/70">Role Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Senior Software Engineer"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Engineering"
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-white/70">Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Remote, NYC"
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Employment Type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white/70">Salary Range</Label>
            <Input
              value={formData.salary_range}
              onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
              placeholder="e.g., $120k - $150k"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-white/70">Requirements</Label>
            <Textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="List key requirements..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-white/70">Responsibilities</Label>
            <Textarea
              value={formData.responsibilities}
              onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
              placeholder="List key responsibilities..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/70">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              role ? "Save Changes" : "Create Role"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Roles Panel Component
const RolesPanel = ({ project, roles, onClose, onEditRole, onDeleteRole, onAddRole }) => {
  const projectRoles = roles.filter(r => r.project_id === project?.id);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed right-0 top-0 h-full w-[450px] bg-slate-900 border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                <p className="text-sm text-white/60">Roles & Positions</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <Button
              onClick={() => onAddRole(project)}
              className="w-full mb-6 bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>

            <div className="space-y-3">
              {projectRoles.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No roles yet</p>
                  <p className="text-sm mt-1">Add roles to this project</p>
                </div>
              ) : (
                projectRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onEdit={onEditRole}
                    onDelete={onDeleteRole}
                  />
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function TalentProjects() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedProjectForRole, setSelectedProjectForRole] = useState(null);
  const [viewingRolesProject, setViewingRolesProject] = useState(null);

  // Delete states
  const [deleteProjectDialog, setDeleteProjectDialog] = useState(null);
  const [deleteRoleDialog, setDeleteRoleDialog] = useState(null);

  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, rolesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("roles")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("created_at", { ascending: false }),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProjects(projectsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !searchQuery ||
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Project CRUD
  const handleSaveProject = async (formData, projectId) => {
    try {
      const projectData = {
        ...formData,
        organization_id: user.organization_id,
      };

      if (projectId) {
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", projectId);
        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        const { error } = await supabase
          .from("projects")
          .insert([projectData]);
        if (error) throw error;
        toast.success("Project created successfully");
      }
      fetchData();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error(error.message || "Failed to save project");
      throw error;
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectDialog) return;

    try {
      // Delete associated roles first
      await supabase
        .from("roles")
        .delete()
        .eq("project_id", deleteProjectDialog.id);

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", deleteProjectDialog.id);

      if (error) throw error;
      toast.success("Project deleted successfully");
      setDeleteProjectDialog(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  // Role CRUD
  const handleSaveRole = async (formData, roleId, projectId) => {
    try {
      const roleData = {
        ...formData,
        organization_id: user.organization_id,
        project_id: projectId || selectedProjectForRole?.id,
      };

      if (roleId) {
        const { error } = await supabase
          .from("roles")
          .update(roleData)
          .eq("id", roleId);
        if (error) throw error;
        toast.success("Role updated successfully");
      } else {
        const { error } = await supabase
          .from("roles")
          .insert([roleData]);
        if (error) throw error;
        toast.success("Role created successfully");
      }
      fetchData();
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error(error.message || "Failed to save role");
      throw error;
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleDialog) return;

    try {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", deleteRoleDialog.id);

      if (error) throw error;
      toast.success("Role deleted successfully");
      setDeleteRoleDialog(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === "active").length;
    const totalRoles = roles.length;
    const filledRoles = roles.filter(r => r.status === "filled").length;
    const activeRoles = roles.filter(r => r.status === "active").length;

    return { activeProjects, totalRoles, filledRoles, activeRoles };
  }, [projects, roles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          title="Recruitment Projects"
          subtitle="Manage hiring projects and open roles"
          color="red"
          actions={
            <Button
              onClick={() => {
                setEditingProject(null);
                setProjectModalOpen(true);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          }
        />

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Projects"
              value={stats.activeProjects}
              icon={Briefcase}
              color="red"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Total Roles"
              value={stats.totalRoles}
              icon={Target}
              color="red"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Roles"
              value={stats.activeRoles}
              icon={Users}
              color="red"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Filled Roles"
              value={stats.filledRoles}
              icon={CheckCircle2}
              color="red"
            />
          </motion.div>
        </motion.div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={fetchData}
            className="text-white/60 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Projects Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filteredProjects.length === 0 ? (
            <div className="col-span-2 text-center py-16">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <h3 className="text-xl font-medium text-white/60 mb-2">No projects found</h3>
              <p className="text-white/40 mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first recruitment project"}
              </p>
              <Button
                onClick={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                roles={roles}
                onEdit={(p) => {
                  setEditingProject(p);
                  setProjectModalOpen(true);
                }}
                onDelete={(p) => setDeleteProjectDialog(p)}
                onViewRoles={(p) => setViewingRolesProject(p)}
                onAddRole={(p) => {
                  setSelectedProjectForRole(p);
                  setEditingRole(null);
                  setRoleModalOpen(true);
                }}
              />
            ))
          )}
        </motion.div>

        {/* Roles Panel */}
        <RolesPanel
          project={viewingRolesProject}
          roles={roles}
          onClose={() => setViewingRolesProject(null)}
          onEditRole={(role) => {
            setEditingRole(role);
            setSelectedProjectForRole({ id: role.project_id });
            setRoleModalOpen(true);
          }}
          onDeleteRole={(role) => setDeleteRoleDialog(role)}
          onAddRole={(project) => {
            setSelectedProjectForRole(project);
            setEditingRole(null);
            setRoleModalOpen(true);
          }}
        />

        {/* Project Modal */}
        <ProjectModal
          isOpen={projectModalOpen}
          onClose={() => {
            setProjectModalOpen(false);
            setEditingProject(null);
          }}
          project={editingProject}
          onSave={handleSaveProject}
        />

        {/* Role Modal */}
        <RoleModal
          isOpen={roleModalOpen}
          onClose={() => {
            setRoleModalOpen(false);
            setEditingRole(null);
            setSelectedProjectForRole(null);
          }}
          role={editingRole}
          projectId={selectedProjectForRole?.id}
          onSave={handleSaveRole}
        />

        {/* Delete Project Dialog */}
        <AlertDialog open={!!deleteProjectDialog} onOpenChange={() => setDeleteProjectDialog(null)}>
          <AlertDialogContent className="bg-slate-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Project?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete "{deleteProjectDialog?.name}" and all associated roles.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Role Dialog */}
        <AlertDialog open={!!deleteRoleDialog} onOpenChange={() => setDeleteRoleDialog(null)}>
          <AlertDialogContent className="bg-slate-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Role?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete the "{deleteRoleDialog?.title}" role.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRole}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
