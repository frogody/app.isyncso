import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Campaign } from "@/api/entities";
import { Sparkles, Info, Pencil, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

export default function CampaignCreateModal({ open, onClose, onCreated, projects, user }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    project_id: "",
    auto_match_enabled: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  useEffect(() => {
    if (formData.project_id) {
      const project = projects.find(p => p.id === formData.project_id);

      if (project && !formData.name) {
        const defaultName = `${project.title} Campaign`;
        setFormData(prev => ({
          ...prev,
          name: defaultName,
          description: `Outreach campaign for ${project.title}`
        }));
      }
    }
  }, [formData.project_id, projects, formData.name]);

  const handleAutoMatchToggle = (enabled) => {
    setFormData(prev => ({ ...prev, auto_match_enabled: enabled }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.project_id) {
      alert(user?.language === 'nl' 
        ? 'Vul alle verplichte velden in' 
        : 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[components/campaigns/CampaignCreateModal.js] Creating campaign...', {
        name: formData.name,
        description: formData.description,
        project_id: formData.project_id,
        auto_match_enabled: formData.auto_match_enabled
      });

      const payload = {
        name: formData.name,
        description: formData.description,
        project_id: formData.project_id,
        organization_id: user.organization_id,
        created_by: user.id,
        auto_match_enabled: formData.auto_match_enabled,
        matching_criteria: {},
        status: formData.status || 'draft',
        matched_candidates: Array.isArray(formData.matched_candidates) ? formData.matched_candidates : [],
        stats: { total_sent: 0, total_responses: 0, total_interested: 0, response_rate: 0 }
      };

      const newCampaign = await Campaign.create(payload);

      console.log('[components/campaigns/CampaignCreateModal.js] Campaign created successfully:', newCampaign.id);

      onCreated?.(newCampaign);
      onClose?.();

      resetForm();

      try {
        if (newCampaign?.id && payload.auto_match_enabled) {
          console.log('[components/campaigns/CampaignCreateModal.js] Starting auto-match analysis via base44.functions.invoke...');
          await base44.functions.invoke('analyzeCampaignProject', {
            project_id: payload.project_id,
            campaign_id: newCampaign.id
          });
          console.log('[components/campaigns/CampaignCreateModal.js] Auto-match analysis started');
        }
      } catch (e) {
        console.warn('[CampaignCreateModal] analyze failed:', e?.message);
      }
      
    } catch (error) {
      console.error("[components/campaigns/CampaignCreateModal.js] Error creating campaign:", error);
      alert(user?.language === 'nl' 
        ? `Fout bij maken campaign: ${error.message}` 
        : `Error creating campaign: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      project_id: "",
      auto_match_enabled: false,
    });
    setIsEditingName(false);
    setTempName("");
  };

  const handleStartEditName = () => {
    setTempName(formData.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setFormData(prev => ({ ...prev, name: tempName.trim() }));
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setTempName("");
    setIsEditingName(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] border-0 flex flex-col"
        style={{
          background: 'rgba(12,16,20,0.98)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <>
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder={user?.language === 'nl' ? 'Campaign naam...' : 'Campaign name...'}
                  className="text-xl font-semibold bg-transparent flex-1"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveName}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <Check className="w-4 h-4" style={{ color: '#4ADE80' }} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelEditName}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="w-4 h-4" style={{ color: '#EF4444' }} />
                </Button>
              </>
            ) : (
              <>
                <DialogTitle className="text-xl font-semibold" style={{color: 'var(--txt)'}}>
                  {formData.name || (user?.language === 'nl' ? 'Nieuwe Campaign Maken' : 'Create New Campaign')}
                </DialogTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleStartEditName}
                  className="h-8 w-8 flex-shrink-0"
                  title={user?.language === 'nl' ? 'Naam bewerken' : 'Edit name'}
                >
                  <Pencil className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                </Button>
              </>
            )}
          </div>
          <p className="text-sm mt-1" style={{color: 'var(--muted)'}}>
            {user?.language === 'nl' 
              ? 'Selecteer een project en configureer je outreach campaign'
              : 'Select a project and configure your outreach campaign'}
          </p>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 px-1" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="space-y-6 pr-4 pb-4">
              <div>
                <Label htmlFor="project">
                  {user?.language === 'nl' ? 'Selecteer Project' : 'Select Project'} *
                </Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData(prev => ({...prev, project_id: value}))}
                >
                  <SelectTrigger className="bg-transparent mt-1" style={{borderColor: 'rgba(255,255,255,.12)'}}>
                    <SelectValue placeholder={user?.language === 'nl' ? 'Kies een project...' : 'Choose a project...'} />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)' }}>
                    {projects.filter(p => p.status === 'active' || p.status === 'discovery').map(project => (
                      <SelectItem key={project.id} value={project.id} style={{ color: 'var(--txt)' }}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">
                  {user?.language === 'nl' ? 'Beschrijving' : 'Description'}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  placeholder={user?.language === 'nl' 
                    ? 'Beschrijf het doel en de strategie van deze campaign...'
                    : 'Describe the goal and strategy of this campaign...'}
                  rows={4}
                  className="bg-transparent mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>

              <div className="rounded-lg p-4" style={{ background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.15)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5" style={{ color: '#EF4444' }} />
                      <Label htmlFor="auto-match" className="text-base font-semibold cursor-pointer" style={{ color: 'var(--txt)' }}>
                        {user?.language === 'nl' ? 'Auto Match Kandidaten met AI' : 'Auto Match Candidates with AI'}
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' 
                          ? 'Wanneer ingeschakeld zoekt onze AI dagelijks automatisch naar nieuwe kandidaten die matchen met dit project. Kandidaten worden geanalyseerd op basis van functie, ervaring, locatie, bedrijfsgroei, carrière signalen en meer.'
                          : 'When enabled, our AI automatically searches daily for new candidates matching this project. Candidates are analyzed based on role, experience, location, company growth, career signals and more.'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="auto-match"
                    checked={formData.auto_match_enabled}
                    onCheckedChange={handleAutoMatchToggle}
                    disabled={isSubmitting}
                    className="flex-shrink-0"
                    style={{
                      backgroundColor: formData.auto_match_enabled ? '#EF4444' : 'rgba(255,255,255,.08)',
                    }}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t flex-shrink-0" style={{borderColor: 'rgba(255,255,255,.06)'}}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {user?.language === 'nl' ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !formData.project_id || !formData.name} 
              className="btn-primary"
            >
              {isSubmitting 
                ? (user?.language === 'nl' ? 'Bezig...' : 'Processing...')
                : (user?.language === 'nl' ? 'Maak Campaign' : 'Create Campaign')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}