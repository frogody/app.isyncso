import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Plus, Clock, Edit, Trash2, Play, Pause, MoreVertical, Users, TrendingUp, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const initialSequences = [
  { id: 1, name: 'Cold Outreach', steps: 5, contacts: 234, openRate: 45, replyRate: 12, status: 'active' },
  { id: 2, name: 'Follow-up Series', steps: 3, contacts: 156, openRate: 52, replyRate: 18, status: 'active' },
  { id: 3, name: 'Re-engagement', steps: 4, contacts: 89, openRate: 38, replyRate: 8, status: 'paused' }
];

export default function Sequences() {
  const [sequences, setSequences] = useState(initialSequences);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [sequenceName, setSequenceName] = useState('');
  const [sequenceDesc, setSequenceDesc] = useState('');
  const [steps, setSteps] = useState([
    { id: 1, type: 'email', subject: 'Initial Outreach', delay: 0 },
    { id: 2, type: 'wait', delay: 2 },
    { id: 3, type: 'email', subject: 'Follow-up', delay: 0 },
    { id: 4, type: 'wait', delay: 3 },
    { id: 5, type: 'email', subject: 'Final Touch', delay: 0 }
  ]);

  const handleCreateSequence = () => {
    if (!sequenceName) {
      toast.error('Sequence name is required');
      return;
    }
    const newSeq = {
      id: Date.now(),
      name: sequenceName,
      steps: 3,
      contacts: 0,
      openRate: 0,
      replyRate: 0,
      status: 'active'
    };
    setSequences(prev => [...prev, newSeq]);
    setSequenceName('');
    setSequenceDesc('');
    setShowEditor(false);
    toast.success('Sequence created successfully');
  };

  const handleToggleStatus = (seq, e) => {
    e.stopPropagation();
    setSequences(prev => prev.map(s => 
      s.id === seq.id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
    ));
    toast.success(`Sequence ${seq.status === 'active' ? 'paused' : 'activated'}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 lg:px-6 py-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white mb-1">Email Sequences</h1>
            <p className="text-zinc-400 text-sm">Automate your outreach campaigns</p>
          </div>
          <button 
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sequence Cards */}
          <div className="lg:col-span-2 space-y-3">
            {sequences.map((seq, i) => (
              <motion.div
                key={seq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedSequence(seq)}
                className={`bg-zinc-900/50 border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedSequence?.id === seq.id ? 'border-orange-500' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{seq.name}</h3>
                      <p className="text-xs text-zinc-500">{seq.steps} steps • {seq.contacts} contacts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleStatus(seq, e)}
                      className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 ${
                        seq.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {seq.status}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info('More options coming soon');
                      }}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                    <div className="text-sm font-bold text-white">{seq.openRate}%</div>
                    <div className="text-[10px] text-zinc-500">Open Rate</div>
                  </div>
                  <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                    <div className="text-sm font-bold text-white">{seq.replyRate}%</div>
                    <div className="text-[10px] text-zinc-500">Reply Rate</div>
                  </div>
                  <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                    <div className="text-sm font-bold text-orange-400">{seq.contacts}</div>
                    <div className="text-[10px] text-zinc-500">Contacts</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Step Editor */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Sequence Steps</h3>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-orange-500/50 transition-colors group"
                >
                  <GripVertical className="w-3 h-3 text-zinc-600 cursor-grab" />
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    {step.type === 'email' ? <Mail className="w-3 h-3 text-orange-400" /> : <Clock className="w-3 h-3 text-orange-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">
                      {step.type === 'email' ? step.subject : `Wait ${step.delay} days`}
                    </div>
                  </div>
                  <button className="p-1 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit className="w-3 h-3 text-zinc-400" />
                  </button>
                </motion.div>
              ))}
              <button className="w-full p-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-3 h-3" />
                Add Step
              </button>
            </div>
          </div>
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
            onClick={() => setShowEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Create Sequence</h3>
                <button onClick={() => setShowEditor(false)} className="p-1 hover:bg-zinc-800 rounded-lg">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Sequence Name"
                  value={sequenceName}
                  onChange={(e) => setSequenceName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
                <textarea
                  placeholder="Description"
                  rows={3}
                  value={sequenceDesc}
                  onChange={(e) => setSequenceDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSequence}
                    className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium text-sm transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}