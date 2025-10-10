import React, { useState, useEffect } from "react";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Briefcase, Building2, Target, RefreshCw, MapPin, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectSelectionModal({ open, onClose, onSelectProject, currentProject }) {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
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
        p.client_company?.toLowerCase().includes(query) ||
        p.role_title?.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      const filter = user?.organization_id 
        ? { organization_id: user.organization_id, is_active: true } 
        : { is_active: true };
      
      const allProjects = await Project.filter(filter, "-updated_date", 50);
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      setProjects([]);
    }
    setIsLoading(false);
  };

  const handleSelect = (project) => {
    onSelectProject(project);
    setSearchQuery("");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'discovery': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'active_search': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'shortlisting': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'interviewing': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'negotiating': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] border-0 p-0 gap-0 overflow-hidden"
        style={{
          background: 'rgba(12,16,20,0.98)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold" style={{color: 'var(--txt)'}}>
            Select Project / Open Role
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color: 'var(--muted)'}} />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border focus-visible:ring-0 focus-visible:ring-offset-0 outline-none transition-colors"
              style={{
                color: 'var(--txt)', 
                borderColor: 'rgba(255,255,255,.14)',
                backgroundColor: 'rgba(255,255,255,.04)'
              }}
            />
          </div>

          {/* Clear Selection Button */}
          {currentProject && (
            <Button
              onClick={() => {
                onSelectProject(null);
                onClose();
              }}
              variant="outline"
              className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              Clear Project Selection
            </Button>
          )}

          {/* Projects List */}
          <ScrollArea className="h-96 pr-2 overflow-x-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin mr-3" style={{color: 'var(--accent)'}} />
                <span style={{color: 'var(--muted)'}}>Loading projects...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-8 h-8 mx-auto mb-3" style={{color: 'var(--muted)'}} />
                <p style={{color: 'var(--muted)'}}>
                  {searchQuery ? 'No matching projects found' : 'No active projects found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    role="button"
                    onClick={() => handleSelect(project)}
                    className={`group p-4 rounded-xl cursor-pointer transition-all duration-150 ${
                      currentProject?.id === project.id ? 'ring-2 ring-red-500/50' : ''
                    }`}
                    style={{
                      background: currentProject?.id === project.id 
                        ? 'rgba(239,68,68,.08)' 
                        : 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.08)'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(project); }}
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{backgroundColor: 'rgba(239,68,68,.15)'}}
                      >
                        <Briefcase className="w-5 h-5" style={{color: 'var(--accent)'}} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate mb-1 text-base" style={{color: 'var(--txt)'}}>
                          {project.title}
                        </h4>
                        
                        <div className="flex items-center gap-2 text-sm mb-2" style={{color: 'var(--muted)'}}>
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{project.client_company}</span>
                        </div>

                        {project.role_title && (
                          <div className="flex items-center gap-2 text-sm mb-2" style={{color: 'var(--muted)'}}>
                            <Target className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{project.role_title}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                          {project.location_requirements && (
                            <Badge variant="outline" className="text-xs border-white/10">
                              <MapPin className="w-3 h-3 mr-1" />
                              {project.location_requirements}
                            </Badge>
                          )}
                          {project.salary_range && (
                            <Badge variant="outline" className="text-xs border-white/10">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {project.salary_range}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t px-0" style={{borderColor: 'rgba(255,255,255,.06)'}}>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="bg-transparent hover:bg-white/5"
              style={{
                color: 'var(--muted)', 
                borderColor: 'rgba(255,255,255,.12)'
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}