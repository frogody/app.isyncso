
import React, { useState, useEffect } from "react";
import { Project } from "@/api/entities";
import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";
import { Role } from "@/api/entities"; // New: Import Role entity
import { useTranslation } from "@/components/utils/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Users,
  Filter,
  MoreVertical, // New: For dropdown menu on project card
  Eye,          // New: For view action in dropdown
  Edit,         // New: For edit action in dropdown
  Trash2        // New: For delete action in dropdown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProjectCreateModal from "../components/projects/ProjectCreateModal";
import ProjectDetailsModal from "../components/projects/ProjectDetailsModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // New: Dropdown menu for project actions
import { format } from 'date-fns'; // New: For date formatting
import { nl } from 'date-fns/locale'; // New: For date-fns Dutch locale
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// New imports for the updated design
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";
import { Card, CardContent, CardTitle } from "@/components/ui/card"; // CardHeader is removed from card usage

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all"); // New: priority filter state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null); // New: for editing an existing project
  const [showDetailsModal, setShowDetailsModal] = useState(false); // New: to control details modal
  const [user, setUser] = useState(null);
  const [projectCandidateCounts, setProjectCandidateCounts] = useState({});
  const [projectRoleCounts, setProjectRoleCounts] = useState({}); // New: State for role counts

  const { t } = useTranslation(user?.language || 'nl');

  // Helper function to translate status values
  const translateStatus = (status) => {
    const statusMap = {
      'discovery': t('status_discovery'),
      'active_search': t('status_active_search'),
      'shortlisting': t('status_shortlisting'),
      'interviewing': t('status_interviewing'),
      'negotiating': t('status_negotiating'),
      'closed': t('status_closed'),
      'on_hold': t('status_on_hold'),
      'all': t('all_projects')
    };
    return statusMap[status] || status;
  };

  const translatePriority = (priority) => {
    const priorityMap = {
      'low': t('priority_low'),
      'medium': t('priority_medium'),
      'high': t('priority_high'),
      'urgent': t('priority_urgent'),
      'all': t('filter_all_priority')
    };
    return priorityMap[priority] || priority;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...projects];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.client_company.toLowerCase().includes(query) ||
        p.role_title?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(p => p.priority === priorityFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, statusFilter, priorityFilter]); // Added priorityFilter to dependencies

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      const filter = userData?.organization_id
        ? { organization_id: userData.organization_id }
        : {};

      const allProjects = await Project.filter(filter, "-updated_date", 100);
      setProjects(allProjects);

      const candidates = await Candidate.filter(filter);
      const roles = await Role.filter(filter); // New: Fetch roles
      
      const counts = {};
      const roleCounts = {}; // New: Initialize role counts object
      
      allProjects.forEach(project => {
        counts[project.id] = candidates.filter(c => c.project_id === project.id).length;
        roleCounts[project.id] = roles.filter(r => r.project_id === project.id).length; // New: Count roles per project
      });
      
      setProjectCandidateCounts(counts);
      setProjectRoleCounts(roleCounts); // New: Set role counts state

    } catch (error) {
      console.error("Error loading projects:", error);
    }
    setLoading(false);
  };

  const handleSaveProject = async (projectData) => {
    try {
      // Add user and organization data
      const dataToSave = {
        ...projectData,
        organization_id: user.organization_id,
        created_by: user.id
      };

      if (editingProject) {
        // Update existing project
        await Project.update(editingProject.id, dataToSave);
      } else {
        // Create new project
        await Project.create(dataToSave);
      }

      setShowCreateModal(false);
      setEditingProject(null);
      loadData();
    } catch (error) {
      console.error("Error saving project:", error);
      alert(user?.language === 'nl' ? 'Fout bij opslaan project' : 'Error saving project');
    }
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  const handleEditProject = (project) => { // New: for editing
    setEditingProject(project);
    setShowCreateModal(true);
    setShowDetailsModal(false); // Close details modal if open
  };

  const handleDeleteProject = async (projectId) => { // New: for deleting
    if (window.confirm(t('confirm_delete_project'))) {
      try {
        await Project.delete(projectId);
        loadData();
        setShowDetailsModal(false);
        setSelectedProject(null);
      } catch (error) {
        console.error("Error deleting project:", error);
        alert(t('error_deleting_project'));
      }
    }
  };

  const handleViewChange = (value) => {
    if (value === 'roles') {
      navigate(createPageUrl('OpenRoles'));
    }
  };

  // New helper functions for badge styling and labels
  const getStatusStyle = (status) => {
    const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium border ';
    switch (status) {
      case 'discovery': return { className: base + 'bg-blue-500/10 border-blue-500/30', style: { color: 'rgb(var(--blue-rgb))' } };
      case 'active_search': return { className: base + 'bg-green-500/10 border-green-500/30', style: { color: 'rgb(var(--green-rgb))' } };
      case 'shortlisting': return { className: base + 'bg-yellow-500/10 border-yellow-500/30', style: { color: 'rgb(var(--yellow-rgb))' } };
      case 'interviewing': return { className: base + 'bg-orange-500/10 border-orange-500/30', style: { color: 'rgb(var(--orange-rgb))' } };
      case 'negotiating': return { className: base + 'bg-purple-500/10 border-purple-500/30', style: { color: 'rgb(var(--purple-rgb))' } };
      case 'closed': return { className: base + 'bg-gray-500/10 border-gray-500/30', style: { color: 'rgb(var(--gray-rgb))' } };
      case 'on_hold': return { className: base + 'bg-red-500/10 border-red-500/30', style: { color: 'rgb(var(--red-rgb))' } };
      default: return { className: base + 'bg-gray-500/10 border-gray-500/30', style: { color: 'rgb(var(--gray-rgb))' } };
    }
  };

  const getStatusLabel = (status) => translateStatus(status);

  const getPriorityStyle = (priority) => {
    const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium border ';
    switch (priority) {
      case 'low': return { className: base + 'bg-green-500/10 border-green-500/30', style: { color: 'rgb(var(--green-rgb))' } };
      case 'medium': return { className: base + 'bg-yellow-500/10 border-yellow-500/30', style: { color: 'rgb(var(--yellow-rgb))' } };
      case 'high': return { className: base + 'bg-orange-500/10 border-orange-500/30', style: { color: 'rgb(var(--orange-rgb))' } };
      case 'urgent': return { className: base + 'bg-red-500/10 border-red-500/30', style: { color: 'rgb(var(--red-rgb))' } };
      default: return { className: base + 'bg-gray-500/10 border-gray-500/30', style: { color: 'rgb(var(--gray-rgb))' } };
    }
  };

  const getPriorityLabel = (priority) => translatePriority(priority);

  // The 'activeProjects', 'onHoldProjects', 'closedProjects' are removed
  // as the stats section is no longer present in the updated layout.

  // New loading state rendering
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>{t('loading_projects')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      {/* Updated CSS Styling */}
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
          --blue-rgb: 96, 165, 250; /* Tailwind blue-400 */
          --green-rgb: 74, 222, 128; /* Tailwind green-400 */
          --yellow-rgb: 250, 204, 21; /* Tailwind yellow-400 */
          --orange-rgb: 251, 146, 60; /* Tailwind orange-400 */
          --purple-rgb: 192, 132, 252; /* Tailwind purple-400 */
          --red-rgb: 239, 68, 68; /* Tailwind red-500 */
          --gray-rgb: 156, 163, 175; /* Tailwind gray-400 */
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
          border-color: rgba(239,68,68,.4) !important;
        }
        .btn-outline {
          background: rgba(255,255,255,.04) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.08) !important;
          color: #FFFFFF !important;
        }
      `}</style>

      <div className="w-full mx-auto space-y-6">
        {/* Header with Dropdown */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconWrapper icon={Briefcase} size={32} variant="muted" glow={false} />
            <div className="flex-1">
              <Select defaultValue="projects" onValueChange={handleViewChange}>
                <SelectTrigger className="border-0 p-0 h-auto focus:ring-0 bg-transparent">
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
                    <SelectValue />
                  </h1>
                </SelectTrigger>
                <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                  <SelectItem value="projects" style={{ color: 'var(--txt)' }}>{t('projects_title')}</SelectItem>
                  <SelectItem value="roles" style={{ color: 'var(--txt)' }}>Open Roles</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {t('projects_subtitle')}
              </p>
            </div>
          </div>

          <Button
            onClick={() => { setShowCreateModal(true); setEditingProject(null); }} // Clear editingProject for new project
            className="btn-primary"
          >
            <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
            {t('new_project')}
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <IconWrapper
                  icon={Search}
                  size={18}
                  variant="muted"
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <Input
                  placeholder={t('search_projects')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-transparent border text-base h-11"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="btn-outline w-full md:w-[180px]">
                  <div className="flex items-center gap-2">
                    <IconWrapper icon={Filter} size={16} variant="muted" />
                    <SelectValue>{translateStatus(statusFilter)}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)' }}>
                  <SelectItem value="all" style={{ color: 'var(--txt)' }}>{t('all_projects')}</SelectItem>
                  <SelectItem value="discovery" style={{ color: 'var(--txt)' }}>{t('status_discovery')}</SelectItem>
                  <SelectItem value="active_search" style={{ color: 'var(--txt)' }}>{t('status_active_search')}</SelectItem>
                  <SelectItem value="shortlisting" style={{ color: 'var(--txt)' }}>{t('status_shortlisting')}</SelectItem>
                  <SelectItem value="interviewing" style={{ color: 'var(--txt)' }}>{t('status_interviewing')}</SelectItem>
                  <SelectItem value="negotiating" style={{ color: 'var(--txt)' }}>{t('status_negotiating')}</SelectItem>
                  <SelectItem value="on_hold" style={{ color: 'var(--txt)' }}>{t('status_on_hold')}</SelectItem>
                  <SelectItem value="closed" style={{ color: 'var(--txt)' }}>{t('status_closed')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="btn-outline w-full md:w-[180px]">
                  <div className="flex items-center gap-2">
                    <IconWrapper icon={Filter} size={16} variant="muted" /> {/* Reusing Filter for consistency */}
                    <SelectValue>{translatePriority(priorityFilter)}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)' }}>
                  <SelectItem value="all" style={{ color: 'var(--txt)' }}>{t('filter_all_priority')}</SelectItem>
                  <SelectItem value="urgent" style={{ color: 'var(--txt)' }}>{t('priority_urgent')}</SelectItem>
                  <SelectItem value="high" style={{ color: 'var(--txt)' }}>{t('priority_high')}</SelectItem>
                  <SelectItem value="medium" style={{ color: 'var(--txt)' }}>{t('priority_medium')}</SelectItem>
                  <SelectItem value="low" style={{ color: 'var(--txt)' }}>{t('priority_low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <IconWrapper icon={Briefcase} size={48} variant="muted" glow={false} />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  {t('no_projects_found')}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {t('no_projects_desc')}
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
                  {t('new_project')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="glass-card hover:bg-white/[0.02] transition-all cursor-pointer"
                onClick={() => handleViewProject(project)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1" style={{ color: 'var(--txt)' }}>
                        {project.title}
                      </CardTitle>
                      {/* Removed: <p className="text-sm" style={{ color: 'var(--muted)' }}>{project.client_company}</p> */}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <IconWrapper icon={MoreVertical} size={16} variant="muted" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewProject(project); }} style={{ color: 'var(--txt)' }}>
                          <IconWrapper icon={Eye} size={16} variant="muted" className="mr-2" />
                          {t('view_details')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProject(project); }} style={{ color: 'var(--txt)' }}>
                          <IconWrapper icon={Edit} size={16} variant="muted" className="mr-2" />
                          {t('edit_project')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,.06)' }} />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} style={{ color: 'var(--accent)' }}>
                          <IconWrapper icon={Trash2} size={16} variant="accent" className="mr-2" />
                          {t('delete_project')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge {...getStatusStyle(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                      {project.priority && (
                        <Badge {...getPriorityStyle(project.priority)}>
                          {getPriorityLabel(project.priority)}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
                      {project.client_company && (
                        <div className="flex items-center gap-2">
                          <IconWrapper icon={Briefcase} size={14} variant="muted" />
                          <span>{project.client_company}</span>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex items-center gap-2">
                          <IconWrapper icon={Calendar} size={14} variant="muted" />
                          <span>{format(new Date(project.deadline), user?.language === 'en' ? 'MMM d, yyyy' : 'd MMM yyyy', { locale: user?.language === 'en' ? undefined : nl })}</span>
                        </div>
                      )}
                      {project.budget && (
                        <div className="flex items-center gap-2">
                          <IconWrapper icon={DollarSign} size={14} variant="muted" />
                          <span>€{project.budget.toLocaleString()}</span>
                        </div>
                      )}
                      {/* New: Display open roles count */}
                      <div className="flex items-center gap-2">
                        <IconWrapper icon={Briefcase} size={14} variant="muted" />
                        <span>
                          {projectRoleCounts[project.id] || 0} {user?.language === 'nl' ? 'open rollen' : 'open roles'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconWrapper icon={Users} size={14} variant="muted" />
                        <span>
                          {projectCandidateCounts[project.id] || 0} {t('candidates')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <ProjectCreateModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingProject(null);
          }}
          project={editingProject} // Pass project for editing
          onSave={handleSaveProject} // Handles both creation and update
        />
      )}

      {/* Details Modal */}
      {selectedProject && (
        <ProjectDetailsModal
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
        />
      )}
    </div>
  );
}
