import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FolderPlus, Package, Sparkles, Mail, Plus } from 'lucide-react';
import { createPageUrl } from '@/utils';

export function TalentActionButtons({ extra }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("TalentProjects"))} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700">
        <FolderPlus className="w-4 h-4 mr-1" /> Create Role
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate("/marketplace/nests")} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700">
        <Package className="w-4 h-4 mr-1" /> Browse Nests
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`${createPageUrl("TalentCampaignDetail")}?new=true`)} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700">
        <Sparkles className="w-4 h-4 mr-1" /> Run Matching
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("TalentCampaigns"))} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700">
        <Mail className="w-4 h-4 mr-1" /> Launch Outreach
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`${createPageUrl("TalentCandidates")}?addNew=true`)} className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20">
        <Plus className="w-4 h-4 mr-1" /> Add Candidate
      </Button>
      {extra}
    </div>
  );
}
