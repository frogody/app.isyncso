import React, { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RoleModal({ open, onClose, role, projectId, onSave, language = 'nl' }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    required_skills: [],
    preferred_experience: "",
    location_requirements: "",
    salary_range: "",
    employment_type: "full_time",
    seniority_level: "",
    status: "open",
    target_start_date: null,
    notes: ""
  });

  const [currentSkill, setCurrentSkill] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role) {
      setFormData({
        ...role,
        target_start_date: role.target_start_date ? new Date(role.target_start_date) : null,
        required_skills: role.required_skills || []
      });
    } else {
      setFormData({
        title: "",
        description: "",
        required_skills: [],
        preferred_experience: "",
        location_requirements: "",
        salary_range: "",
        employment_type: "full_time",
        seniority_level: "",
        status: "open",
        target_start_date: null,
        notes: ""
      });
    }
  }, [role, open]);

  const addSkill = () => {
    if (currentSkill.trim() && !formData.required_skills.includes(currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, currentSkill.trim()]
      }));
      setCurrentSkill("");
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s !== skill)
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && currentSkill.trim()) {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        project_id: projectId,
        target_start_date: formData.target_start_date ? formData.target_start_date.toISOString().split('T')[0] : undefined
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = (key) => {
    const translations = {
      nl: {
        create_role: 'Rol Toevoegen',
        edit_role: 'Rol Bewerken',
        role_title: 'Rol Titel',
        role_title_placeholder: 'bijv. Senior Finance Manager',
        description: 'Beschrijving',
        description_placeholder: 'Gedetailleerde beschrijving van de rol...',
        required_skills: 'Vereiste Vaardigheden',
        add_skill: 'Vaardigheid toevoegen...',
        preferred_experience: 'Gewenste Ervaring',
        location: 'Locatie',
        location_placeholder: 'bijv. Amsterdam, Remote, Hybrid',
        salary_range: 'Salaris Bereik',
        salary_placeholder: 'bijv. €80,000 - €120,000',
        employment_type: 'Type Dienstverband',
        full_time: 'Fulltime',
        part_time: 'Parttime',
        contract: 'Contract',
        freelance: 'Freelance',
        seniority: 'Seniority Niveau',
        junior: 'Junior',
        medior: 'Medior',
        senior: 'Senior',
        lead: 'Lead',
        executive: 'Executive',
        status: 'Status',
        open: 'Open',
        paused: 'Gepauzeerd',
        filled: 'Ingevuld',
        cancelled: 'Geannuleerd',
        target_start: 'Gewenste Start Datum',
        pick_date: 'Kies datum',
        notes: 'Notities',
        cancel: 'Annuleren',
        save: 'Opslaan',
        create: 'Aanmaken'
      },
      en: {
        create_role: 'Add Role',
        edit_role: 'Edit Role',
        role_title: 'Role Title',
        role_title_placeholder: 'e.g. Senior Finance Manager',
        description: 'Description',
        description_placeholder: 'Detailed description of the role...',
        required_skills: 'Required Skills',
        add_skill: 'Add skill...',
        preferred_experience: 'Preferred Experience',
        location: 'Location',
        location_placeholder: 'e.g. Amsterdam, Remote, Hybrid',
        salary_range: 'Salary Range',
        salary_placeholder: 'e.g. €80,000 - €120,000',
        employment_type: 'Employment Type',
        full_time: 'Full Time',
        part_time: 'Part Time',
        contract: 'Contract',
        freelance: 'Freelance',
        seniority: 'Seniority Level',
        junior: 'Junior',
        medior: 'Medior',
        senior: 'Senior',
        lead: 'Lead',
        executive: 'Executive',
        status: 'Status',
        open: 'Open',
        paused: 'Paused',
        filled: 'Filled',
        cancelled: 'Cancelled',
        target_start: 'Target Start Date',
        pick_date: 'Pick date',
        notes: 'Notes',
        cancel: 'Cancel',
        save: 'Save',
        create: 'Create'
      }
    };
    return translations[language][key] || key;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-hidden border-0"
        style={{
          background: 'rgba(12,16,20,0.98)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader>
          <DialogTitle style={{color: 'var(--txt)'}}>
            {role ? t('edit_role') : t('create_role')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] pr-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t('role_title')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                  placeholder={t('role_title_placeholder')}
                  required
                  className="bg-transparent mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>

              <div>
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  placeholder={t('description_placeholder')}
                  rows={4}
                  className="bg-transparent mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>

              <div>
                <Label>{t('required_skills')}</Label>
                <div className="mt-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('add_skill')}
                      className="bg-transparent"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                    />
                    <Button type="button" onClick={addSkill} size="sm" className="btn-primary">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.required_skills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                          style={{background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.20)'}}
                        >
                          <span style={{color: 'var(--txt)'}}>{skill}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" style={{color: 'var(--accent)'}} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="preferred_experience">{t('preferred_experience')}</Label>
                <Textarea
                  id="preferred_experience"
                  value={formData.preferred_experience}
                  onChange={(e) => setFormData(prev => ({...prev, preferred_experience: e.target.value}))}
                  rows={3}
                  className="bg-transparent mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location_requirements">{t('location')}</Label>
                  <Input
                    id="location_requirements"
                    value={formData.location_requirements}
                    onChange={(e) => setFormData(prev => ({...prev, location_requirements: e.target.value}))}
                    placeholder={t('location_placeholder')}
                    className="bg-transparent mt-1"
                    style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                  />
                </div>

                <div>
                  <Label htmlFor="salary_range">{t('salary_range')}</Label>
                  <Input
                    id="salary_range"
                    value={formData.salary_range}
                    onChange={(e) => setFormData(prev => ({...prev, salary_range: e.target.value}))}
                    placeholder={t('salary_placeholder')}
                    className="bg-transparent mt-1"
                    style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employment_type">{t('employment_type')}</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(value) => setFormData(prev => ({...prev, employment_type: value}))}
                  >
                    <SelectTrigger className="bg-transparent mt-1" style={{borderColor: 'rgba(255,255,255,.12)'}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">{t('full_time')}</SelectItem>
                      <SelectItem value="part_time">{t('part_time')}</SelectItem>
                      <SelectItem value="contract">{t('contract')}</SelectItem>
                      <SelectItem value="freelance">{t('freelance')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="seniority_level">{t('seniority')}</Label>
                  <Select
                    value={formData.seniority_level}
                    onValueChange={(value) => setFormData(prev => ({...prev, seniority_level: value}))}
                  >
                    <SelectTrigger className="bg-transparent mt-1" style={{borderColor: 'rgba(255,255,255,.12)'}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">{t('junior')}</SelectItem>
                      <SelectItem value="medior">{t('medior')}</SelectItem>
                      <SelectItem value="senior">{t('senior')}</SelectItem>
                      <SelectItem value="lead">{t('lead')}</SelectItem>
                      <SelectItem value="executive">{t('executive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">{t('status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({...prev, status: value}))}
                  >
                    <SelectTrigger className="bg-transparent mt-1" style={{borderColor: 'rgba(255,255,255,.12)'}}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t('open')}</SelectItem>
                      <SelectItem value="paused">{t('paused')}</SelectItem>
                      <SelectItem value="filled">{t('filled')}</SelectItem>
                      <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('target_start')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start mt-1 bg-transparent"
                        style={{borderColor: 'rgba(255,255,255,.12)'}}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.target_start_date ? format(formData.target_start_date, 'PPP') : <span>{t('pick_date')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.target_start_date}
                        onSelect={(date) => setFormData(prev => ({...prev, target_start_date: date}))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">{t('notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="bg-transparent mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t" style={{borderColor: 'rgba(255,255,255,.06)'}}>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? t('save') + '...' : (role ? t('save') : t('create'))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}