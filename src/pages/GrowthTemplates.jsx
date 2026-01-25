import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Plus, Search, Copy, Trash2, Edit, X,
  Building2, Users, MapPin, Briefcase, Save, Sparkles
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";

export default function GrowthTemplates() {
  const { user } = useUser();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    industry: '',
    company_size: '',
    location: '',
    job_titles: '',
    tech_stack: '',
    keywords: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await db.functions.invoke('getICPTemplates');
      setTemplates(response.data?.templates || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name || '',
      description: template.description || '',
      industry: template.industry || '',
      company_size: template.company_size || '',
      location: template.location || '',
      job_titles: template.job_titles?.join(', ') || '',
      tech_stack: template.tech_stack?.join(', ') || '',
      keywords: template.keywords?.join(', ') || ''
    });
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setForm({
      name: '',
      description: '',
      industry: '',
      company_size: '',
      location: '',
      job_titles: '',
      tech_stack: '',
      keywords: ''
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templateData = {
        ...form,
        job_titles: form.job_titles.split(',').map(s => s.trim()).filter(Boolean),
        tech_stack: form.tech_stack.split(',').map(s => s.trim()).filter(Boolean),
        keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
      };
      
      await db.functions.invoke('saveICPTemplate', {
        template: editingTemplate ? { ...templateData, id: editingTemplate.id } : templateData
      });
      
      await loadTemplates();
      setShowEditor(false);
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Delete this template?')) return;
    try {
      await db.entities.ICPTemplate.delete(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleUseTemplate = (template) => {
    const query = [
      template.industry,
      template.company_size,
      template.location,
      template.job_titles?.join(' '),
    ].filter(Boolean).join(' ');
    
    window.location.href = createPageUrl(`GrowthResearch?query=${encodeURIComponent(query)}`);
  };

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 bg-zinc-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          icon={FileText}
          title="ICP Templates"
          subtitle="Reusable ideal customer profiles for quick research"
          color="indigo"
          badge={`${templates.length} templates`}
          actions={
            <Button onClick={handleCreate} className="bg-indigo-500 hover:bg-indigo-400 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          }
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700 text-white"
          />
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filteredTemplates.map((template, i) => (
                <motion.div
                  key={template.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard glow="indigo" className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} className="text-zinc-400 hover:text-white h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="text-zinc-400 hover:text-red-400 h-8 w-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-white text-sm mb-2">{template.name}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{template.description}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {template.industry && (
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          <Briefcase className="w-3 h-3 mr-1" />{template.industry}
                        </Badge>
                      )}
                      {template.company_size && (
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          <Users className="w-3 h-3 mr-1" />{template.company_size}
                        </Badge>
                      )}
                      {template.location && (
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          <MapPin className="w-3 h-3 mr-1" />{template.location}
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={() => handleUseTemplate(template)}
                      className="w-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <GlassCard className="p-8 text-center">
            <FileText className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-2">
              {searchTerm ? "No Templates Found" : "No Templates Yet"}
            </h3>
            <p className="text-zinc-400 mb-6">
              {searchTerm ? "Try a different search" : "Create reusable ICP templates for faster research"}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreate} className="bg-indigo-500 hover:bg-indigo-400 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            )}
          </GlassCard>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowEditor(false)} className="text-zinc-400">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Template Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Enterprise SaaS Buyers"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe this ICP..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Industry</label>
                    <Input
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      placeholder="e.g., Technology"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Company Size</label>
                    <Input
                      value={form.company_size}
                      onChange={(e) => setForm({ ...form, company_size: e.target.value })}
                      placeholder="e.g., 50-200"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Location</label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g., United States, Europe"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Job Titles (comma-separated)</label>
                  <Input
                    value={form.job_titles}
                    onChange={(e) => setForm({ ...form, job_titles: e.target.value })}
                    placeholder="e.g., VP Sales, CTO, Head of Marketing"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Tech Stack (comma-separated)</label>
                  <Input
                    value={form.tech_stack}
                    onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
                    placeholder="e.g., Salesforce, HubSpot, AWS"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Keywords (comma-separated)</label>
                  <Input
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="e.g., B2B, SaaS, Enterprise"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowEditor(false)} className="border-zinc-700 text-zinc-300">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!form.name || saving} className="bg-indigo-500 hover:bg-indigo-400 text-white">
                  {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save Template</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}