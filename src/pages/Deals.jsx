import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Euro, Calendar, User, X, Building, MoreVertical, Users } from 'lucide-react';
import { toast } from 'sonner';
import ContactSelector from '@/components/shared/ContactSelector';
import { Label } from '@/components/ui/label';

const STAGES = [
  { id: 'qualification', label: 'Qualification', color: 'blue', dotClass: 'bg-blue-500' },
  { id: 'proposal', label: 'Proposal', color: 'purple', dotClass: 'bg-purple-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'orange', dotClass: 'bg-orange-500' },
  { id: 'closed', label: 'Closed Won', color: 'green', dotClass: 'bg-green-500' }
];

const initialDeals = {
  qualification: [
    { id: 1, title: 'Acme Corp - Enterprise', value: 45000, company: 'Acme Corp', contact: 'John Smith', probability: 30, closeDate: '2025-02-15' },
    { id: 2, title: 'TechStart - Pro Plan', value: 12000, company: 'TechStart', contact: 'Sarah Williams', probability: 40, closeDate: '2025-02-20' }
  ],
  proposal: [
    { id: 3, title: 'BigCorp - Custom Solution', value: 89000, company: 'BigCorp', contact: 'Mike Chen', probability: 60, closeDate: '2025-03-01' }
  ],
  negotiation: [
    { id: 4, title: 'StartupXYZ - Growth Package', value: 34000, company: 'StartupXYZ', contact: 'Emma Davis', probability: 75, closeDate: '2025-02-28' }
  ],
  closed: [
    { id: 5, title: 'InnovateTech - Annual Contract', value: 67000, company: 'InnovateTech', contact: 'Alex Johnson', probability: 100, closeDate: '2025-01-15' }
  ]
};

export default function Deals() {
  const [deals, setDeals] = useState(initialDeals);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: '', value: '', company: '', contact: '', closeDate: '', prospect_id: null });
  const [selectedContact, setSelectedContact] = useState(null);

  // Handle contact selection from ContactSelector
  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    if (contact) {
      setNewDeal(prev => ({
        ...prev,
        company: contact.company_name || prev.company,
        contact: contact.name || prev.contact,
        prospect_id: contact.id
      }));
    } else {
      setNewDeal(prev => ({
        ...prev,
        prospect_id: null
      }));
    }
  };

  const handleDragStart = (deal, stage) => {
    setDraggedDeal({ deal, stage });
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.stage === targetStage) {
      setDraggedDeal(null);
      setDragOverStage(null);
      return;
    }

    setDeals(prev => {
      const newDeals = { ...prev };
      newDeals[draggedDeal.stage] = prev[draggedDeal.stage].filter(d => d.id !== draggedDeal.deal.id);
      newDeals[targetStage] = [...prev[targetStage], draggedDeal.deal];
      return newDeals;
    });

    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const getStageTotal = (stageId) => {
    return deals[stageId].reduce((sum, d) => sum + d.value, 0);
  };

  const handleAddDeal = () => {
    if (!newDeal.title || !newDeal.value) {
      toast.error('Title and value are required');
      return;
    }
    const deal = {
      id: Date.now(),
      title: newDeal.title,
      value: parseFloat(newDeal.value),
      company: newDeal.company,
      contact: newDeal.contact,
      probability: 30,
      closeDate: newDeal.closeDate || new Date().toISOString().split('T')[0],
      prospect_id: newDeal.prospect_id
    };
    setDeals(prev => ({ ...prev, qualification: [...prev.qualification, deal] }));
    setNewDeal({ title: '', value: '', company: '', contact: '', closeDate: '', prospect_id: null });
    setSelectedContact(null);
    setShowAddDeal(false);
    toast.success('Deal created successfully');
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 lg:px-6 py-4 space-y-4">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white mb-1">Deal Pipeline</h1>
            <p className="text-zinc-400 text-xs">
              Total value: <span className="text-orange-400 font-medium">€{Object.values(deals).flat().reduce((sum, d) => sum + d.value, 0).toLocaleString()}</span>
            </p>
          </div>
          <button 
            onClick={() => setShowAddDeal(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Deal
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-3">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`bg-zinc-900/50 border rounded-xl p-3 transition-colors ${
                dragOverStage === stage.id ? 'border-orange-500' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.dotClass}`} />
                  <h3 className="text-xs font-semibold text-white">{stage.label}</h3>
                  <span className="text-[10px] text-zinc-500">({deals[stage.id].length})</span>
                </div>
                <span className="text-[10px] text-zinc-500">€{getStageTotal(stage.id).toLocaleString()}</span>
              </div>

              <div className="space-y-2 min-h-[300px]">
                {deals[stage.id].map((deal, i) => (
                  <motion.div
                    key={deal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    draggable
                    onDragStart={() => handleDragStart(deal, stage.id)}
                    onClick={() => setSelectedDeal(deal)}
                    className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg cursor-grab hover:border-orange-500/50 transition-colors active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-xs font-medium text-white line-clamp-2">{deal.title}</h4>
                      <button onClick={(e) => { e.stopPropagation(); }} className="p-1 hover:bg-zinc-700 rounded">
                        <MoreVertical className="w-3 h-3 text-zinc-500" />
                      </button>
                    </div>
                    <div className="text-sm font-bold text-orange-400 mb-2">€{deal.value.toLocaleString()}</div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{deal.company}</span>
                      <span>{deal.probability}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal Detail Modal */}
      <AnimatePresence>
        {selectedDeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDeal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">{selectedDeal.title}</h3>
                <button onClick={() => setSelectedDeal(null)} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              <div className="text-lg font-bold text-orange-400 mb-4">€{selectedDeal.value.toLocaleString()}</div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <Building className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-300">{selectedDeal.company}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-300">{selectedDeal.contact}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-300">Close: {selectedDeal.closeDate}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Euro className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-300">{selectedDeal.probability}% probability</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => toast.info('Edit deal functionality coming soon')}
                  className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Edit Deal
                </button>
                <button 
                  onClick={() => toast.info('Add activity functionality coming soon')}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Add Activity
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Deal Modal */}
      {showAddDeal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddDeal(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Create Deal</h3>
              <button onClick={() => setShowAddDeal(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Deal Title *"
                value={newDeal.title}
                onChange={(e) => setNewDeal(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Deal Value *"
                value={newDeal.value}
                onChange={(e) => setNewDeal(prev => ({ ...prev, value: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />

              {/* Contact Selector */}
              <div className="space-y-2">
                <Label className="text-zinc-300 flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Select from CRM Contacts
                </Label>
                <p className="text-xs text-zinc-500">
                  Select a contact to auto-fill company and contact info
                </p>
                <ContactSelector
                  value={newDeal.prospect_id}
                  onSelect={handleContactSelect}
                  placeholder="Search CRM contacts..."
                />
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-3">Or enter manually:</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Company"
                    value={newDeal.company}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={newDeal.contact}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <input
                type="date"
                placeholder="Expected Close Date"
                value={newDeal.closeDate}
                onChange={(e) => setNewDeal(prev => ({ ...prev, closeDate: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddDeal(false); setSelectedContact(null); }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDeal}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors"
                >
                  Create Deal
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}