
import React, { useState, useEffect } from "react";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Briefcase,
  X,
  Trash2,
  Building2,
  Calendar,
  Target,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SyncAvatar from "../ui/SyncAvatar"; // Added SyncAvatar import

const ProjectSidebar = ({ open, onClose, currentProject, onProjectSelect, onProjectCreate }) => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  // Form state
  const [newProject, setNewProject] = useState({
    title: "",
    client_company: "",
    client_contact_name: "",
    client_contact_email: "",
    role_title: "",
    role_description: "",
    location_requirements: "",
    salary_range: "",
    project_type: "retained_search",
    status: "discovery",
    priority: "medium",
    deadline: "",
    budget: "",
    notes: ""
  });

  useEffect(() => {
    if (open) {
      loadUser();
      loadProjects();
    }
  }, [open]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredProjects(projects);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = projects.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.client_company.toLowerCase().includes(query) ||
        p.role_title?.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      const filter = userData.organization_id ? { organization_id: userData.organization_id } : {};
      const allProjects = await Project.filter(filter, "-updated_date", 50);
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title.trim() || !newProject.client_company.trim() || !newProject.role_title.trim()) {
      alert("Vul minimaal titel, client bedrijf en rol titel in.");
      return;
    }
    
    setLoading(true);
    try {
      const projectData = {
        ...newProject,
        organization_id: user?.organization_id || null,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined
      };
      
      const createdProject = await Project.create(projectData);
      
      setNewProject({
        title: "",
        client_company: "",
        client_contact_name: "",
        client_contact_email: "",
        role_title: "",
        role_description: "",
        location_requirements: "",
        salary_range: "",
        project_type: "retained_search",
        status: "discovery",
        priority: "medium",
        deadline: "",
        budget: "",
        notes: ""
      });
      
      setShowCreateModal(false);
      await loadProjects();
      onProjectCreate(createdProject);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Er ging iets mis bij het aanmaken van het project.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Weet je zeker dat je dit project wilt verwijderen?")) return;
    setLoading(true);
    try {
      await Project.delete(projectId);
      await loadProjects();
      if (currentProject && currentProject.id === projectId) {
        onProjectSelect(null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'discovery': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'active_search': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'shortlisting': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'interviewing': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'negotiating': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'on_hold': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'bg-green-500/10 text-green-400';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400';
      case 'high': return 'bg-orange-500/10 text-orange-400';
      case 'urgent': return 'bg-red-500/10 text-red-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col transition-all duration-300 border-l"
        style={{ 
          width: '400px',
          background: 'rgba(12,16,20,.98)',
          borderColor: 'rgba(255,255,255,.06)',
          backdropFilter: 'blur(8px)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--txt)' }}>Projects</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-6 w-6 hover:bg-white/10" style={{ color: 'var(--muted)' }}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border focus-visible:ring-0"
              style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)' }}
            />
          </div>
        </div>

        {/* Create Project Button */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary w-full"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuw Project
          </Button>
        </div>

        {/* Projects List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <SyncAvatar size={48} />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {searchQuery ? 'No matching projects found' : 'No projects found'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`group p-4 rounded-lg cursor-pointer transition-all border ${
                    currentProject?.id === project.id
                      ? 'glass-card'
                      : 'hover:bg-white/5 border-transparent hover:border-white/10'
                  }`}
                  style={{
                    backgroundColor: currentProject?.id === project.id
                      ? 'rgba(239,68,68,.06)'
                      : 'transparent',
                    borderColor: currentProject?.id === project.id
                      ? 'rgba(239,68,68,.15)'
                      : 'transparent'
                  }}
                  onClick={() => onProjectSelect(project)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-sm" style={{ color: 'var(--txt)' }} title={project.title}>
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }} title={project.client_company}>
                          {project.client_company}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-400 hover:bg-red-500/20" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {project.role_title && (
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                      <p className="text-xs truncate" style={{ color: 'var(--txt)' }}>
                        {project.role_title}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={`text-xs ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </Badge>
                  </div>

                  {(project.deadline || project.budget) && (
                    <div className="flex items-center gap-4 text-xs mt-2" style={{ color: 'var(--muted)' }}>
                      {project.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(project.deadline).toLocaleDateString('nl-NL')}</span>
                        </div>
                      )}
                      {project.budget && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>€{project.budget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-white/10" style={{background: 'rgba(15,20,24,.95)', borderColor: 'rgba(255,255,255,.06)'}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{color: 'var(--txt)'}}>
              <Briefcase className="w-5 h-5" style={{color: 'var(--accent)'}} />
              Nieuw Project
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Project Titel *</label>
                <Input
                  value={newProject.title}
                  onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  placeholder="Senior Backend Developer Search"
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Client Bedrijf *</label>
                <Input
                  value={newProject.client_company}
                  onChange={(e) => setNewProject({...newProject, client_company: e.target.value})}
                  placeholder="Tech Solutions Inc."
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Contact Persoon</label>
                <Input
                  value={newProject.client_contact_name}
                  onChange={(e) => setNewProject({...newProject, client_contact_name: e.target.value})}
                  placeholder="Jan van der Berg"
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Contact Email</label>
                <Input
                  value={newProject.client_contact_email}
                  onChange={(e) => setNewProject({...newProject, client_contact_email: e.target.value})}
                  placeholder="jan@techsolutions.com"
                  type="email"
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Rol Titel *</label>
              <Input
                value={newProject.role_title}
                onChange={(e) => setNewProject({...newProject, role_title: e.target.value})}
                placeholder="Senior Backend Developer"
                className="bg-transparent text-white border-gray-700 focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Rol Beschrijving</label>
              <Textarea
                value={newProject.role_description}
                onChange={(e) => setNewProject({...newProject, role_description: e.target.value})}
                placeholder="Uitgebreide beschrijving van de rol, verantwoordelijkheden, en wat we zoeken..."
                className="bg-transparent text-white border-gray-700 focus:border-red-400 h-24"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Project Type</label>
                <Select value={newProject.project_type} onValueChange={(value) => setNewProject({...newProject, project_type: value})}>
                  <SelectTrigger className="bg-transparent border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                    <SelectItem value="retained_search" style={{color: 'var(--txt)'}}>Retained Search</SelectItem>
                    <SelectItem value="contingency" style={{color: 'var(--txt)'}}>Contingency</SelectItem>
                    <SelectItem value="contract" style={{color: 'var(--txt)'}}>Contract</SelectItem>
                    <SelectItem value="temp_to_perm" style={{color: 'var(--txt)'}}>Temp to Perm</SelectItem>
                    <SelectItem value="consulting" style={{color: 'var(--txt)'}}>Consulting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Status</label>
                <Select value={newProject.status} onValueChange={(value) => setNewProject({...newProject, status: value})}>
                  <SelectTrigger className="bg-transparent border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                    <SelectItem value="discovery" style={{color: 'var(--txt)'}}>Discovery</SelectItem>
                    <SelectItem value="active_search" style={{color: 'var(--txt)'}}>Active Search</SelectItem>
                    <SelectItem value="shortlisting" style={{color: 'var(--txt)'}}>Shortlisting</SelectItem>
                    <SelectItem value="interviewing" style={{color: 'var(--txt)'}}>Interviewing</SelectItem>
                    <SelectItem value="negotiating" style={{color: 'var(--txt)'}}>Negotiating</SelectItem>
                    <SelectItem value="closed" style={{color: 'var(--txt)'}}>Closed</SelectItem>
                    <SelectItem value="on_hold" style={{color: 'var(--txt)'}}>On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Prioriteit</label>
                <Select value={newProject.priority} onValueChange={(value) => setNewProject({...newProject, priority: value})}>
                  <SelectTrigger className="bg-transparent border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                    <SelectItem value="low" style={{color: 'var(--txt)'}}>Low</SelectItem>
                    <SelectItem value="medium" style={{color: 'var(--txt)'}}>Medium</SelectItem>
                    <SelectItem value="high" style={{color: 'var(--txt)'}}>High</SelectItem>
                    <SelectItem value="urgent" style={{color: 'var(--txt)'}}>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Locatie Vereisten</label>
                <Input
                  value={newProject.location_requirements}
                  onChange={(e) => setNewProject({...newProject, location_requirements: e.target.value})}
                  placeholder="Amsterdam, Remote, Hybrid"
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Salaris Bereik</label>
                <Input
                  value={newProject.salary_range}
                  onChange={(e) => setNewProject({...newProject, salary_range: e.target.value})}
                  placeholder="€80.000 - €120.000"
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Deadline</label>
                <Input
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                  type="date"
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Budget (€)</label>
                <Input
                  value={newProject.budget}
                  onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                  placeholder="25000"
                  type="number"
                  className="bg-transparent text-white border-gray-700 focus:border-red-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>Notities</label>
              <Textarea
                value={newProject.notes}
                onChange={(e) => setNewProject({...newProject, notes: e.target.value})}
                placeholder="Interne notities en opmerkingen over dit project..."
                className="bg-transparent text-white border-gray-700 focus:border-red-400 h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)} 
              className="border-gray-700 text-gray-400 hover:bg-gray-800"
            >
              Annuleer
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={loading} 
              className="btn-primary"
            >
              {loading ? 'Aanmaken...' : 'Project Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectSidebar;
