/**
 * Link Nest to Role Modal
 * Shows after a nest purchase to prompt user to link it to a project/role for AI matching
 * Can optionally auto-start matching after campaign creation
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link2, Sparkles, ArrowRight, Loader2, Target, Brain, Rocket, Zap } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

const LinkNestToRoleModal = ({
  isOpen,
  onClose,
  nestId,
  nestName,
  organizationId,
  mode = 'link', // 'link' or 'quickstart'
  candidateCount = 0
}) => {
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchProjectsAndRoles();
    }
  }, [isOpen, organizationId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProject('');
      setSelectedRole('');
    }
  }, [isOpen]);

  const fetchProjectsAndRoles = async () => {
    setFetching(true);
    try {
      const [projectsRes, rolesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_date', { ascending: false }),
        supabase
          .from('roles')
          .select('*, projects(name, title)')
          .eq('organization_id', organizationId)
          .order('created_date', { ascending: false }),
      ]);

      setProjects(projectsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Error fetching projects/roles:', error);
    } finally {
      setFetching(false);
    }
  };

  const getSelectedRoleTitle = () => {
    const role = roles.find(r => r.id === selectedRole);
    return role?.title || 'Campaign';
  };

  const handleCreateCampaign = async (autoMatch = false) => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    setLoading(true);
    try {
      const roleTitle = getSelectedRoleTitle();
      const campaignName = `${roleTitle} - ${nestName}`;

      // Create a campaign linking this nest to the role
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          organization_id: organizationId,
          name: campaignName,
          nest_id: nestId,
          role_id: selectedRole,
          project_id: selectedProject && selectedProject !== '__all__' ? selectedProject : null,
          status: 'draft',
          campaign_type: 'email',
          auto_match_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      if (autoMatch) {
        toast.success('Campaign created! Starting AI matching...');
      } else {
        toast.success('Nest linked to role! You can now run AI matching.');
      }

      // Pass autoMatch flag to determine navigation
      onClose(true, campaign?.id, autoMatch);
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = selectedProject && selectedProject !== '__all__'
    ? roles.filter(r => r.project_id === selectedProject)
    : roles;

  const isQuickStart = mode === 'quickstart';
  const title = isQuickStart ? 'Quick Start Campaign' : 'Link Nest to Role';
  const description = isQuickStart
    ? `Create a campaign from "${nestName}" and start matching ${candidateCount > 0 ? `${candidateCount} candidates` : 'candidates'} instantly.`
    : `Link "${nestName}" to a role to enable AI-powered candidate matching.`;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {isQuickStart ? (
              <Rocket className="w-5 h-5 text-red-400" />
            ) : (
              <Sparkles className="w-5 h-5 text-red-400" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Project (Optional)</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue placeholder="Filter by project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="__all__">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Role *</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {filteredRoles.length === 0 ? (
                      <div className="px-2 py-4 text-center text-zinc-500 text-sm">
                        No roles found. Create a role first.
                      </div>
                    ) : (
                      filteredRoles.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.title} {r.projects && `(${r.projects.title || r.projects.name})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Campaign name preview */}
              {selectedRole && (
                <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <p className="text-xs text-zinc-500 mb-1">Campaign name:</p>
                  <p className="text-sm text-white font-medium">
                    {getSelectedRoleTitle()} - {nestName}
                  </p>
                </div>
              )}

              <div className="bg-zinc-800/50 rounded-lg p-3 text-sm text-zinc-400 border border-zinc-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="font-medium text-zinc-300">What happens next:</span>
                </div>
                <ul className="space-y-1.5 ml-6">
                  <li className="flex items-start gap-2">
                    <Brain className="w-3.5 h-3.5 mt-0.5 text-purple-400 flex-shrink-0" />
                    <span>AI analyzes each candidate against role requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 text-yellow-400 flex-shrink-0" />
                    <span>Candidates are scored and ranked by fit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Link2 className="w-3.5 h-3.5 mt-0.5 text-cyan-400 flex-shrink-0" />
                    <span>Top matches appear in your campaign for outreach</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => onClose(false)}
            className="text-zinc-400 hover:text-white sm:mr-auto"
          >
            {isQuickStart ? 'Cancel' : 'Skip for now'}
          </Button>

          <div className="flex gap-2">
            {!isQuickStart && (
              <Button
                onClick={() => handleCreateCampaign(false)}
                disabled={!selectedRole || loading || fetching}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Link Only
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={() => handleCreateCampaign(true)}
              disabled={!selectedRole || loading || fetching}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-1" />
                  {isQuickStart ? 'Create & Match' : 'Create & Start Matching'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkNestToRoleModal;
