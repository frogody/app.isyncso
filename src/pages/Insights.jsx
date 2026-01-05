import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertCircle, Zap, ThumbsUp, Target, Clock, Send, Lightbulb, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const mockInsights = [
  { id: 1, type: 'opportunity', icon: TrendingUp, title: 'Revenue Prediction', value: '$156K', description: 'Expected revenue next month based on current pipeline', color: 'green' },
  { id: 2, type: 'risk', icon: AlertCircle, title: 'At-Risk Deals', value: '3', description: 'Deals that need immediate attention', color: 'red' },
  { id: 3, type: 'timing', icon: Clock, title: 'Best Time to Email', value: '9-11 AM', description: 'Highest open rate window for your audience', color: 'blue' },
  { id: 4, type: 'win', icon: Zap, title: 'Quick Wins', value: '5', description: 'High probability deals ready to close', color: 'orange' }
];

const mockPredictions = [
  { deal: 'Acme Corp - Enterprise', probability: 85, value: 45000, action: 'Schedule follow-up call this week', daysToClose: 14 },
  { deal: 'TechStart - Pro Plan', probability: 62, value: 12000, action: 'Send pricing proposal', daysToClose: 21 },
  { deal: 'BigCorp - Custom Solution', probability: 45, value: 89000, action: 'Address budget concerns', daysToClose: 30 }
];

const mockRecommendations = [
  { title: 'Follow up with John Smith', reason: 'Opened your email 3 times in the last 24 hours', priority: 'high' },
  { title: 'Re-engage cold leads from Q3', reason: '23 leads haven\'t been contacted in 60+ days', priority: 'medium' },
  { title: 'Update Acme Corp proposal', reason: 'Competitor mentioned in recent conversation', priority: 'high' }
];

const chatMessages = [
  { role: 'assistant', content: 'How can I help you today? I can analyze your pipeline, suggest next actions, or help you prioritize your deals.' },
  { role: 'user', content: 'Which deals should I focus on this week?' },
  { role: 'assistant', content: 'Based on your pipeline analysis, I recommend prioritizing:\n\n1. **Acme Corp** (85% probability) - They\'ve been very engaged. Schedule a call to close.\n\n2. **TechStart** (62% probability) - Send the pricing proposal they requested.\n\n3. **BigCorp** (45% probability) - They have budget concerns. Prepare a ROI analysis.' }
];

export default function Insights() {
  const [messages, setMessages] = useState(chatMessages);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Let me analyze that for you... Based on your current data, I recommend focusing on high-engagement leads first. Would you like me to create a prioritized list?' }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-400" />
            AI Insights
          </h1>
          <p className="text-zinc-400 text-sm">Intelligent recommendations powered by AI</p>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {mockInsights.map((insight, i) => {
            const Icon = insight.icon;
            const colorClasses = {
              green: 'bg-green-500/20 text-green-400',
              red: 'bg-red-500/20 text-red-400',
              blue: 'bg-blue-500/20 text-blue-400',
              orange: 'bg-orange-500/20 text-orange-400'
            };
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => toast.info(`View details for: ${insight.title}`)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg ${colorClasses[insight.color]} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{insight.value}</div>
                <div className="text-sm font-medium text-white mb-1">{insight.title}</div>
                <div className="text-xs text-zinc-500">{insight.description}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Predictions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                Deal Predictions
              </h3>
              <div className="space-y-4">
                {mockPredictions.map((pred, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-orange-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-white font-medium">{pred.deal}</h4>
                        <p className="text-sm text-orange-400">${pred.value.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{pred.probability}%</div>
                        <div className="text-xs text-zinc-500">win rate</div>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pred.probability}%` }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                        className="h-full bg-orange-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        {pred.action}
                      </div>
                      <span className="text-zinc-500">{pred.daysToClose} days to close</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-orange-400" />
                Recommended Actions
              </h3>
              <div className="space-y-3">
                {mockRecommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => toast.info(`Action: ${rec.title}`)}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-cyan-500/30 transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium">{rec.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">{rec.reason}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-orange-400 transition-colors" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Chat */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col h-[600px]">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                AI Assistant
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center mr-2 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user' 
                      ? 'bg-orange-500/20 border border-orange-500/30' 
                      : 'bg-zinc-800/50'
                  }`}>
                    <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-4 border-t border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask AI anything..."
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}