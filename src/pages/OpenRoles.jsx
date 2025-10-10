
import React, { useState, useEffect } from "react";
import { Role } from "@/api/entities";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Plus,
  Search,
  Globe,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";
import { useTranslation } from "@/components/utils/translations";
import RoleModal from "../components/projects/RoleModal";
import { scrapeWebsiteVacancies } from "@/api/functions"; // Keep for now, but deepScrapeVacancies is used
import { deepScrapeVacancies } from "@/api/functions";
import { Checkbox } from "@/components/ui/checkbox"; // Added for selecting scraped roles

export default function OpenRolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [user, setUser] = useState(null);
  
  // Scraper states
  const [showScraperModal, setShowScraperModal] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedVacancies, setScrapedVacancies] = useState([]); // All vacancies found by scraper
  const [showReviewModal, setShowReviewModal] = useState(false); // Modal for reviewing scraped vacancies
  
  // New states for bulk saving scraped roles
  const [selectedRolesToSave, setSelectedRolesToSave] = useState([]); // Vacancies selected for bulk save
  const [savingRoles, setSavingRoles] = useState(false); // Loading state for bulk save
  const [selectedProjectForScrape, setSelectedProjectForScrape] = useState(""); // Project selected in the review modal for bulk save
  
  // Role modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null); // Used for both existing roles and individually edited scraped roles
  const [selectedProject, setSelectedProject] = useState(null); // Used for creating a new role manually

  const { t } = useTranslation(user?.language || 'nl');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...roles];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (projectFilter !== "all") {
      filtered = filtered.filter(r => r.project_id === projectFilter);
    }

    setFilteredRoles(filtered);
  }, [roles, searchQuery, statusFilter, projectFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      const filter = userData?.organization_id
        ? { organization_id: userData.organization_id }
        : {};

      const [allRoles, allProjects] = await Promise.all([
        Role.filter(filter, "-created_date", 100),
        Project.filter(filter)
      ]);

      setRoles(allRoles);
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading roles:", error);
    }
    setLoading(false);
  };

  const handleViewChange = (value) => {
    if (value === 'projects') {
      navigate(createPageUrl('Projects'));
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      alert(user?.language === 'nl' ? 'Voer een website URL in' : 'Please enter a website URL');
      return;
    }

    setScraping(true);
    setScrapedVacancies([]);
    setSelectedRolesToSave([]); // Clear previous selections

    try {
      console.log('Starting deep scrape of:', websiteUrl);
      
      const response = await deepScrapeVacancies({ website_url: websiteUrl });
      
      console.log('Scrape response:', response);

      if (response.data?.success && response.data?.vacancies) {
        setScrapedVacancies(response.data.vacancies);
        // Initially select all found vacancies for potential bulk save
        setSelectedRolesToSave(response.data.vacancies);
        setShowScraperModal(false);
        setShowReviewModal(true);
        setSelectedProjectForScrape(""); // Reset project selection for bulk save
        console.log(`Found ${response.data.vacancies.length} vacancies`);
      } else {
        throw new Error(response.data?.error || 'Failed to scrape website');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      alert(user?.language === 'nl' 
        ? `Fout bij scrapen: ${error.message}` 
        : `Error scraping: ${error.message}`);
    } finally {
      setScraping(false);
    }
  };

  const handleEditScrapedVacancy = (vacancy) => {
    // Open role modal with pre-filled data for individual editing
    setEditingRole({
      title: vacancy.title,
      description: vacancy.description,
      required_skills: vacancy.required_skills || [],
      location_requirements: vacancy.location,
      salary_range: vacancy.salary_range,
      employment_type: vacancy.employment_type || 'full_time',
      seniority_level: vacancy.seniority_level,
      // Add source URL to notes if available
      notes: vacancy.source_url ? `Scraped from: ${vacancy.source_url}` : '',
      // Add flags to identify this as a scraped vacancy for post-save cleanup
      isScraped: true,
      originalScrapedVacancyIdentifier: `${vacancy.source_url}-${vacancy.title}` // Unique identifier
    });
    setShowRoleModal(true);
    // Note: Project will need to be selected in the RoleModal itself if not set via selectedProject state
  };

  const handleToggleVacancySelection = (vacancy, isChecked) => {
    const vacancyIdentifier = `${vacancy.source_url}-${vacancy.title}`; // Unique identifier

    setSelectedRolesToSave(prev => {
      if (isChecked) {
        // Add if not already present
        if (!prev.some(r => `${r.source_url}-${r.title}` === vacancyIdentifier)) {
          return [...prev, vacancy];
        }
      } else {
        // Remove if present
        return prev.filter(r => `${r.source_url}-${r.title}` !== vacancyIdentifier);
      }
      return prev; // No change if already in desired state
    });
  };

  const handleRejectVacancy = (vacancyIndex) => {
    const vacancyToRemove = scrapedVacancies[vacancyIndex];
    // Remove from the list of all scraped vacancies
    setScrapedVacancies(prev => prev.filter((_, i) => i !== vacancyIndex));
    // Also remove from the selected roles to save list
    setSelectedRolesToSave(prev => prev.filter(r => !(r.source_url === vacancyToRemove.source_url && r.title === vacancyToRemove.title)));
  };

  const handleSaveRole = async (roleData) => {
    try {
      if (editingRole && editingRole.id) {
        // Editing an existing role
        await Role.update(editingRole.id, roleData);
      } else {
        // Creating a new role (either from scratch or an individually edited scraped role)
        const newRole = await Role.create({
          ...roleData,
          organization_id: user.organization_id,
          created_by: user.id
        });

        // If this was an individually edited scraped role, remove it from the temporary scrape review list
        if (editingRole && editingRole.isScraped && editingRole.originalScrapedVacancyIdentifier) {
            setScrapedVacancies(prev => prev.filter(v => 
                `${v.source_url}-${v.title}` !== editingRole.originalScrapedVacancyIdentifier
            ));
            setSelectedRolesToSave(prev => prev.filter(r => 
                `${r.source_url}-${r.title}` !== editingRole.originalScrapedVacancyIdentifier
            ));
        }
      }
      
      setShowRoleModal(false);
      setEditingRole(null);
      loadData(); // Reload all roles to show changes
    } catch (error) {
      console.error("Error saving role:", error);
      alert('Error saving role');
    }
  };

  const handleSaveScrapedRoles = async () => {
    if (!selectedRolesToSave || selectedRolesToSave.length === 0) {
      alert(user?.language === 'nl' ? 'Selecteer minimaal één rol om op te slaan' : 'Select at least one role to save');
      return;
    }

    const projectToSaveTo = projects.find(p => p.id === selectedProjectForScrape);
    if (!projectToSaveTo) {
      alert(user?.language === 'nl' ? 'Selecteer eerst een project' : 'Please select a project first');
      return;
    }

    setSavingRoles(true);
    let successCount = 0;
    let errorCount = 0;
    let successfullySavedIdentifiers = [];

    try {
      for (const scrapedRole of selectedRolesToSave) {
        try {
          console.log('[pages/OpenRoles.js] Saving role:', scrapedRole.title);
          
          // Create role with all required fields, providing defaults for potentially missing scraped data
          await Role.create({
            title: scrapedRole.title || 'Untitled Role',
            description: scrapedRole.description || '',
            required_skills: scrapedRole.required_skills || [],
            location_requirements: scrapedRole.location || '',
            salary_range: scrapedRole.salary_range || '',
            employment_type: scrapedRole.employment_type || 'full_time',
            seniority_level: scrapedRole.seniority_level || 'medior',
            status: 'open',
            project_id: projectToSaveTo.id, // Use the project selected in the scrape review modal
            organization_id: user.organization_id,
            created_by: user.id,
            notes: scrapedRole.source_url ? `Scraped from: ${scrapedRole.source_url}` : ''
          });

          successCount++;
          successfullySavedIdentifiers.push(`${scrapedRole.source_url}-${scrapedRole.title}`);
          console.log('[pages/OpenRoles.js] ✓ Role saved:', scrapedRole.title);
        } catch (error) {
          errorCount++;
          console.error('[pages/OpenRoles.js] Error saving role:', error);
        }
      }

      // Show success message
      if (successCount > 0) {
        alert(user?.language === 'nl' 
          ? `✅ ${successCount} rol${successCount > 1 ? 'len' : ''} succesvol opgeslagen!${errorCount > 0 ? ` (${errorCount} mislukt)` : ''}`
          : `✅ ${successCount} role${successCount > 1 ? 's' : ''} saved successfully!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
        );
      }

      // Clear successfully saved roles from the review lists
      setScrapedVacancies(prev => prev.filter(v =>
        !successfullySavedIdentifiers.includes(`${v.source_url}-${v.title}`)
      ));
      setSelectedRolesToSave(prev => prev.filter(v =>
        !successfullySavedIdentifiers.includes(`${v.source_url}-${v.title}`)
      ));
      
      // If no more vacancies left to review, close the modal
      if (scrapedVacancies.length === successfullySavedIdentifiers.length) { 
        setShowReviewModal(false); 
      }
      setSelectedProjectForScrape(""); // Clear project selection
      loadData(); // Reload existing roles in the main view

    } catch (error) {
      console.error('[pages/OpenRoles.js] Error in bulk save:', error);
      alert(user?.language === 'nl' ? '❌ Fout bij opslaan' : '❌ Error saving roles');
    } finally {
      setSavingRoles(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        await Role.delete(roleId);
        loadData();
      } catch (error) {
        console.error("Error deleting role:", error);
      }
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      open: { className: 'bg-green-500/10 border-green-500/30', style: { color: 'rgb(74, 222, 128)' } },
      paused: { className: 'bg-yellow-500/10 border-yellow-500/30', style: { color: 'rgb(250, 204, 21)' } },
      filled: { className: 'bg-blue-500/10 border-blue-500/30', style: { color: 'rgb(96, 165, 250)' } },
      cancelled: { className: 'bg-gray-500/10 border-gray-500/30', style: { color: 'rgb(156, 163, 175)' } }
    };
    return styles[status] || styles.open;
  };

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
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconWrapper icon={Briefcase} size={32} variant="muted" glow={false} />
            <div className="flex-1">
              <Select defaultValue="roles" onValueChange={handleViewChange}>
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
                Manage all open positions and scrape vacancies from your website
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowScraperModal(true)} className="btn-outline">
              <IconWrapper icon={Globe} size={18} variant="muted" className="mr-2" />
              Scrape Website
            </Button>
            <Button 
              onClick={() => { 
                setEditingRole(null); 
                setSelectedProject(null); // Clear selected project if user creates new role manually
                setShowRoleModal(true); 
              }} 
              className="btn-primary"
            >
              <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
              New Role
            </Button>
          </div>
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
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-transparent border text-base h-11"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="btn-outline w-full md:w-[180px]">
                  <SelectValue>Status: {statusFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)' }}>
                  <SelectItem value="all" style={{ color: 'var(--txt)' }}>All Status</SelectItem>
                  <SelectItem value="open" style={{ color: 'var(--txt)' }}>Open</SelectItem>
                  <SelectItem value="paused" style={{ color: 'var(--txt)' }}>Paused</SelectItem>
                  <SelectItem value="filled" style={{ color: 'var(--txt)' }}>Filled</SelectItem>
                  <SelectItem value="cancelled" style={{ color: 'var(--txt)' }}>Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="btn-outline w-full md:w-[200px]">
                  <SelectValue>Project</SelectValue>
                </SelectTrigger>
                <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)' }}>
                  <SelectItem value="all" style={{ color: 'var(--txt)' }}>All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} style={{ color: 'var(--txt)' }}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Roles Grid */}
        {filteredRoles.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <IconWrapper icon={Briefcase} size={48} variant="muted" glow={false} />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  No roles found
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  Create your first role or scrape your website for vacancies
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setShowScraperModal(true)} className="btn-outline">
                    <IconWrapper icon={Globe} size={18} variant="muted" className="mr-2" />
                    Scrape Website
                  </Button>
                  <Button onClick={() => setShowRoleModal(true)} className="btn-primary">
                    <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
                    New Role
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoles.map((role) => {
              const project = projects.find(p => p.id === role.project_id);
              return (
                <Card key={role.id} className="glass-card hover:bg-white/[0.02] transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--txt)' }}>
                          {role.title}
                        </h3>
                        {project && (
                          <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            {project.title}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                        className="h-8 w-8 p-0"
                      >
                        <IconWrapper icon={Trash2} size={16} variant="muted" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Badge {...getStatusStyle(role.status)}>
                        {role.status}
                      </Badge>

                      {role.description && (
                        <p className="text-sm line-clamp-2" style={{ color: 'var(--muted)' }}>
                          {role.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                        <div className="text-sm" style={{ color: 'var(--muted)' }}>
                          {role.seniority_level || 'Not specified'}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRole(role);
                            setShowRoleModal(true);
                          }}
                          className="text-xs"
                        >
                          <IconWrapper icon={Edit} size={14} variant="muted" className="mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Scraper URL Input Modal */}
      <Dialog open={showScraperModal} onOpenChange={setShowScraperModal}>
        <DialogContent 
          className="max-w-2xl border-0"
          style={{
            background: 'rgba(12,16,20,0.98)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '16px'
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2" style={{color: 'var(--txt)'}}>
              <IconWrapper icon={Globe} size={24} variant="accent" />
              Scrape Website for Vacancies
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>
                Website URL
              </label>
              <Input
                placeholder="https://yourcompany.com/careers"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bg-transparent border"
                style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                Enter your company's careers or jobs page URL
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowScraperModal(false)} className="btn-outline">
                Cancel
              </Button>
              <Button onClick={handleScrapeWebsite} disabled={scraping} className="btn-primary">
                {scraping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <IconWrapper icon={Globe} size={16} variant="accent" className="mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Scraped Vacancies Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent 
          className="max-w-4xl max-h-[80vh] border-0"
          style={{
            background: 'rgba(12,16,20,0.98)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '16px'
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold" style={{color: 'var(--txt)'}}>
              Review Scraped Vacancies ({scrapedVacancies.length})
            </DialogTitle>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Select vacancies to save to a project, or edit them individually.
            </p>
          </DialogHeader>

          <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
            <Select value={selectedProjectForScrape} onValueChange={setSelectedProjectForScrape}>
                <SelectTrigger className="btn-outline w-full md:w-[250px]">
                  <SelectValue placeholder="Select Project for saving" />
                </SelectTrigger>
                <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)' }}>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} style={{ color: 'var(--txt)' }}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSaveScrapedRoles} 
                disabled={selectedRolesToSave.length === 0 || !selectedProjectForScrape || savingRoles} 
                className="btn-primary w-full md:w-auto"
              >
                {savingRoles ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <IconWrapper icon={CheckCircle2} size={16} variant="accent" className="mr-2" />
                    Save {selectedRolesToSave.length} Selected Role{selectedRolesToSave.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            {scrapedVacancies.length === 0 && (
                <div className="text-center py-8">
                  <p style={{ color: 'var(--muted)' }}>No vacancies left to review.</p>
                  <Button variant="outline" onClick={() => setShowReviewModal(false)} className="mt-4 btn-outline">
                    Close
                  </Button>
                </div>
            )}
            {scrapedVacancies.map((vacancy, index) => {
              const isSelected = selectedRolesToSave.some(r => `${r.source_url}-${r.title}` === `${vacancy.source_url}-${vacancy.title}`);
              return (
                <Card key={`${vacancy.source_url}-${vacancy.title}-${index}`} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Checkbox 
                                id={`vacancy-${index}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => handleToggleVacancySelection(vacancy, checked)}
                                className="border-gray-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                            />
                            <label htmlFor={`vacancy-${index}`} className="font-semibold text-lg cursor-pointer" style={{ color: 'var(--txt)' }}>
                                {vacancy.title}
                            </label>
                        </div>
                        
                        {vacancy.location && (
                          <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            📍 {vacancy.location}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditScrapedVacancy(vacancy)}
                          className="btn-outline text-xs"
                        >
                          <IconWrapper icon={Edit} size={14} variant="muted" className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectVacancy(index)}
                          className="text-xs"
                        >
                          <IconWrapper icon={XCircle} size={14} variant="muted" />
                        </Button>
                      </div>
                    </div>

                    {vacancy.description && (
                      <p className="text-sm mb-3 line-clamp-3" style={{ color: 'var(--muted)' }}>
                        {vacancy.description}
                      </p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {vacancy.employment_type && (
                        <Badge variant="outline" style={{ background: 'rgba(255,255,255,.02)', color: 'var(--txt)' }}>
                          {vacancy.employment_type}
                        </Badge>
                      )}
                      {vacancy.seniority_level && (
                        <Badge variant="outline" style={{ background: 'rgba(255,255,255,.02)', color: 'var(--txt)' }}>
                          {vacancy.seniority_level}
                        </Badge>
                      )}
                      {vacancy.salary_range && (
                        <Badge variant="outline" style={{ background: 'rgba(255,255,255,.02)', color: 'var(--txt)' }}>
                          💰 {vacancy.salary_range}
                        </Badge>
                      )}
                    </div>

                    {(!vacancy.description || vacancy.required_skills?.length === 0) && (
                      <div className="mt-3 p-2 rounded flex items-center gap-2" style={{ background: 'rgba(239,68,68,.08)' }}>
                        <AlertCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          Missing information - consider editing before saving
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Modal */}
      {showRoleModal && (
        <RoleModal
          open={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setEditingRole(null);
          }}
          role={editingRole}
          projectId={selectedProject}
          onSave={handleSaveRole}
        />
      )}
    </div>
  );
}
