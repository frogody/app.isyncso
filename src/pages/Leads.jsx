import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, Mail, Globe, Building, Users, Settings, ChevronRight, Plus } from 'lucide-react';

const mockLeads = [
  { id: 1, name: 'John Smith', company: 'Acme Corp', email: 'john@acme.com', score: 92, breakdown: { engagement: 30, fit: 35, intent: 27 }, status: 'hot' },
  { id: 2, name: 'Sarah Williams', company: 'TechStart', email: 'sarah@techstart.io', score: 78, breakdown: { engagement: 25, fit: 28, intent: 25 }, status: 'warm' },
  { id: 3, name: 'Mike Chen', company: 'BigCorp LLC', email: 'mike@bigcorp.com', score: 65, breakdown: { engagement: 20, fit: 25, intent: 20 }, status: 'warm' },
  { id: 4, name: 'Emma Davis', company: 'Startup Co', email: 'emma@startup.co', score: 45, breakdown: { engagement: 15, fit: 18, intent: 12 }, status: 'cold' }
];

const scoringRules = [
  { rule: 'Email Open', points: 5, category: 'Engagement' },
  { rule: 'Email Click', points: 10, category: 'Engagement' },
  { rule: 'Website Visit', points: 15, category: 'Intent' },
  { rule: 'Demo Request', points: 50, category: 'Intent' },
  { rule: 'Company Size Match', points: 20, category: 'Fit' },
  { rule: 'Industry Match', points: 15, category: 'Fit' }
];

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState(mockLeads[0]);
  const [showConfig, setShowConfig] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-orange-400 bg-orange-500/20';
    return 'text-blue-400 bg-blue-500/20';
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Lead Scoring</h1>
            <p className="text-zinc-400 text-sm">Prioritize your best prospects</p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure Rules
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Cards */}
          <div className="lg:col-span-2 space-y-4">
            {mockLeads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedLead(lead)}
                className={`bg-zinc-900/50 border rounded-xl p-6 cursor-pointer transition-colors ${
                  selectedLead?.id === lead.id ? 'border-orange-500' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreColor(lead.score)}`}>
                      <span className="text-2xl font-bold">{lead.score}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{lead.name}</h3>
                      <p className="text-sm text-zinc-400">{lead.company}</p>
                      <p className="text-xs text-zinc-500">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'hot' ? 'bg-red-500/20 text-red-400' :
                      lead.status === 'warm' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {lead.status.toUpperCase()}
                    </span>
                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                  </div>
                </div>

                {/* Mini Breakdown */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-800">
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">{lead.breakdown.engagement}</div>
                    <div className="text-xs text-zinc-500">Engagement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">{lead.breakdown.fit}</div>
                    <div className="text-xs text-zinc-500">Fit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">{lead.breakdown.intent}</div>
                    <div className="text-xs text-zinc-500">Intent</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Detail Panel / Config */}
          <div className="space-y-6">
            {/* Score Breakdown */}
            {selectedLead && !showConfig && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
                <div className="text-center mb-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${getScoreColor(selectedLead.score)}`}>
                    <span className="text-4xl font-bold">{selectedLead.score}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">{selectedLead.name}</p>
                </div>

                <div className="space-y-4">
                  {Object.entries(selectedLead.breakdown).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-400 capitalize">{key}</span>
                        <span className="text-sm text-orange-400 font-medium">{value} pts</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(value / 35) * 100}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-orange-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2">
                  <button 
                    onClick={() => toast.success(`Opening email to ${selectedLead.email}`)}
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Send Outreach
                  </button>
                  <button 
                    onClick={() => toast.info('Detailed profile view coming soon')}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </motion.div>
            )}

            {/* Scoring Configuration */}
            {showConfig && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Scoring Rules</h3>
                <div className="space-y-3">
                  {scoringRules.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <div className="text-sm text-white">{rule.rule}</div>
                        <div className="text-xs text-zinc-500">{rule.category}</div>
                      </div>
                      <span className="text-sm font-medium text-orange-400">+{rule.points}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => toast.info('Add scoring rule functionality coming soon')}
                  className="w-full mt-4 py-2 border border-dashed border-zinc-700 rounded-lg text-sm text-zinc-500 hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Rule
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}