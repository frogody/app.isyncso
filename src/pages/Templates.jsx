import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Star, Copy, Edit, Trash2, Eye, X, Mail } from 'lucide-react';
import { toast } from 'sonner';

const initialTemplates = [
  { id: 1, name: 'Cold Outreach', subject: 'Quick question about {{company}}', category: 'Outreach', uses: 234, starred: true, preview: 'Hi {{first_name}},\n\nI noticed {{company}} is doing great things in {{industry}}...' },
  { id: 2, name: 'Follow-up #1', subject: 'Following up on my previous email', category: 'Follow-up', uses: 189, starred: true, preview: 'Hi {{first_name}},\n\nI wanted to follow up on my previous email...' },
  { id: 3, name: 'Meeting Request', subject: 'Quick call this week?', category: 'Meeting', uses: 156, starred: false, preview: 'Hi {{first_name}},\n\nWould you have 15 minutes this week to chat about...' },
  { id: 4, name: 'Thank You', subject: 'Great meeting today!', category: 'Follow-up', uses: 98, starred: false, preview: 'Hi {{first_name}},\n\nThank you for taking the time to meet today...' }
];

const categories = ['All', 'Outreach', 'Follow-up', 'Meeting', 'Proposal'];

export default function Templates() {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editData, setEditData] = useState({ name: '', subject: '', preview: '', category: 'Outreach' });

  const handleToggleStar = (e, template) => {
    e.stopPropagation();
    setTemplates(prev => prev.map(t => 
      t.id === template.id ? { ...t, starred: !t.starred } : t
    ));
    toast.success(`Template ${!template.starred ? 'starred' : 'unstarred'}`);
  };

  const handleCopy = (e, template) => {
    e.stopPropagation();
    navigator.clipboard.writeText(template.preview);
    toast.success('Template copied to clipboard');
  };

  const handleSaveTemplate = () => {
    if (!editData.name || !editData.subject) {
      toast.error('Name and subject are required');
      return;
    }
    if (selectedTemplate) {
      // Edit existing
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id ? { ...t, ...editData } : t
      ));
      toast.success('Template updated');
    } else {
      // Create new
      const newTemplate = {
        id: Date.now(),
        ...editData,
        uses: 0,
        starred: false
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast.success('Template created');
    }
    setShowEditor(false);
    setSelectedTemplate(null);
    setEditData({ name: '', subject: '', preview: '', category: 'Outreach' });
  };

  const handleOpenEditor = (template) => {
    if (template) {
      setEditData({
        name: template.name,
        subject: template.subject,
        preview: template.preview,
        category: template.category
      });
      setSelectedTemplate(template);
    } else {
      setEditData({ name: '', subject: '', preview: '', category: 'Outreach' });
      setSelectedTemplate(null);
    }
    setShowEditor(true);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-zinc-950 px-4 lg:px-6 py-4 space-y-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Email Templates</h1>
            <p className="text-zinc-400 text-xs">{templates.length} templates available</p>
          </div>
          <button
            onClick={() => handleOpenEditor(null)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-orange-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">{template.name}</h3>
                    <p className="text-[10px] text-zinc-500">{template.category}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => handleToggleStar(e, template)}
                  className="p-1 hover:bg-zinc-800 rounded"
                >
                  <Star className={`w-4 h-4 ${template.starred ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`} />
                </button>
              </div>

              <div className="mb-3">
                <div className="text-[10px] text-zinc-500 mb-1">Subject</div>
                <div className="text-sm text-zinc-300 truncate">{template.subject}</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">{template.uses} uses</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedTemplate(template); setShowPreview(true); }}
                    className="p-1 hover:bg-zinc-800 rounded-lg"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    onClick={(e) => handleCopy(e, template)}
                    className="p-1 hover:bg-zinc-800 rounded-lg"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEditor(template); }}
                    className="p-1 hover:bg-zinc-800 rounded-lg"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowEditor(false); setSelectedTemplate(null); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">
                  {selectedTemplate ? 'Edit Template' : 'New Template'}
                </h3>
                <button onClick={() => { setShowEditor(false); setSelectedTemplate(null); }} className="p-1 hover:bg-zinc-800 rounded-lg">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <input
                  type="text"
                  placeholder="Template Name"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
                <select
                  value={editData.category}
                  onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Subject Line"
                  value={editData.subject}
                  onChange={(e) => setEditData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
                <textarea
                  placeholder="Email body... Use {{variable}} for personalization"
                  rows={10}
                  value={editData.preview}
                  onChange={(e) => setEditData(prev => ({ ...prev, preview: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setShowEditor(false);
                      setSelectedTemplate(null);
                      setEditData({ name: '', subject: '', preview: '', category: 'Outreach' });
                    }}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveTemplate}
                    className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors"
                  >
                    {selectedTemplate ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowPreview(false); setSelectedTemplate(null); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">Preview</h3>
                <button onClick={() => { setShowPreview(false); setSelectedTemplate(null); }} className="p-1 hover:bg-zinc-800 rounded-lg">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <div className="text-[10px] text-zinc-500 mb-1">Subject</div>
                  <div className="text-white font-medium">{selectedTemplate.subject}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">{selectedTemplate.preview}</pre>
                </div>
                <button
                  onClick={() => {
                    toast.success(`Using template: ${selectedTemplate.name}`);
                    setShowPreview(false);
                    setSelectedTemplate(null);
                  }}
                  className="w-full mt-3 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Use Template
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}