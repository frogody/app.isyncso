import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Mail,
  Inbox,
  Users,
  Target,
  BarChart3,
  Clock,
  Award,
  FileText,
  UsersRound,
  Settings,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Send,
  Star,
  Phone,
  MapPin,
  Briefcase,
  Euro,
  Calendar,
  CheckCircle,
  AlertCircle,
  Zap,
  ThumbsUp,
  MessageSquare,
  Activity,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Bell,
  Lock,
  CreditCard,
  Shield,
  Globe,
  Palette,
  Trophy
} from 'lucide-react';

// Mock data
const mockMetrics = [
  { label: 'Total Revenue', value: '€124,592', change: '+12.5%', trend: 'up', icon: Euro },
  { label: 'Active Deals', value: '48', change: '+8.2%', trend: 'up', icon: Target },
  { label: 'Response Rate', value: '67%', change: '-3.1%', trend: 'down', icon: Mail },
  { label: 'Conversion', value: '24%', change: '+5.4%', trend: 'up', icon: TrendingUp }
];

const mockActivities = [
  { type: 'email', user: 'Sarah Chen', action: 'sent email to', target: 'Acme Corp', time: '2m ago', icon: Mail },
  { type: 'call', user: 'Mike Johnson', action: 'completed call with', target: 'TechStart Inc', time: '15m ago', icon: Phone },
  { type: 'deal', user: 'Emma Davis', action: 'moved deal to', target: 'Negotiation', time: '1h ago', icon: Target },
  { type: 'note', user: 'Alex Kim', action: 'added note to', target: 'BigCorp LLC', time: '2h ago', icon: FileText }
];

const mockContacts = [
  { id: 1, name: 'John Smith', company: 'Acme Corp', email: 'john@acme.com', phone: '+1 234-567-8900', score: 92, status: 'hot' },
  { id: 2, name: 'Sarah Williams', company: 'TechStart', email: 'sarah@techstart.io', phone: '+1 234-567-8901', score: 78, status: 'warm' },
  { id: 3, name: 'Mike Chen', company: 'BigCorp LLC', email: 'mike@bigcorp.com', phone: '+1 234-567-8902', score: 45, status: 'cold' }
];

const mockDeals = {
  'Qualification': [
    { id: 1, title: 'Acme Corp - Enterprise', value: 45000, company: 'Acme Corp', probability: 30 },
    { id: 2, title: 'TechStart - Pro Plan', value: 12000, company: 'TechStart', probability: 40 }
  ],
  'Proposal': [
    { id: 3, title: 'BigCorp - Custom Solution', value: 89000, company: 'BigCorp', probability: 60 }
  ],
  'Negotiation': [
    { id: 4, title: 'StartupXYZ - Growth Package', value: 34000, company: 'StartupXYZ', probability: 75 }
  ],
  'Closed Won': [
    { id: 5, title: 'InnovateTech - Annual Contract', value: 67000, company: 'InnovateTech', probability: 100 }
  ]
};

const mockChartData = {
  revenue: [
    { month: 'Jan', value: 45000 },
    { month: 'Feb', value: 52000 },
    { month: 'Mar', value: 48000 },
    { month: 'Apr', value: 61000 },
    { month: 'May', value: 72000 },
    { month: 'Jun', value: 68000 }
  ],
  conversion: [
    { stage: 'Leads', value: 1200 },
    { stage: 'Qualified', value: 480 },
    { stage: 'Proposals', value: 240 },
    { stage: 'Negotiation', value: 120 },
    { stage: 'Closed', value: 48 }
  ]
};

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sequences', label: 'Sequences', icon: Mail },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'deals', label: 'Deals', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'scoring', label: 'Lead Scoring', icon: Award },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'team', label: 'Team', icon: UsersRound },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'ai', label: 'AI Insights', icon: Sparkles }
];

export default function ComponentShowcase() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedContact, setSelectedContact] = useState(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Component Showcase
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Explore all features and components</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-6 flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'border-orange-500 text-orange-400' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'sequences' && <SequencesTab />}
            {activeTab === 'inbox' && <InboxTab />}
            {activeTab === 'contacts' && <ContactsTab selectedContact={selectedContact} setSelectedContact={setSelectedContact} />}
            {activeTab === 'deals' && <DealsTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'timeline' && <TimelineTab />}
            {activeTab === 'scoring' && <ScoringTab />}
            {activeTab === 'templates' && <TemplatesTab />}
            {activeTab === 'team' && <TeamTab />}
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'ai' && <AITab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Dashboard Tab
function DashboardTab() {
  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockMetrics.map((metric, i) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-orange-400" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${metric.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  <TrendIcon className="w-4 h-4" />
                  {metric.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
              <div className="text-sm text-zinc-400">{metric.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64 flex items-end gap-4">
            {mockChartData.revenue.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-zinc-800 rounded-t-lg relative overflow-hidden" style={{ height: `${(item.value / 72000) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-500 to-orange-400" />
                </div>
                <span className="text-xs text-zinc-500">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {mockActivities.map((activity, i) => {
              const Icon = activity.icon;
              return (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium">{activity.user}</span> {activity.action}{' '}
                      <span className="text-orange-400">{activity.target}</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sequences Tab
function SequencesTab() {
  const [steps, setSteps] = useState([
    { id: 1, type: 'email', delay: 0, subject: 'Initial Outreach' },
    { id: 2, type: 'wait', delay: 2, subject: 'Wait 2 days' },
    { id: 3, type: 'email', delay: 0, subject: 'Follow-up' }
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Email Sequence Builder</h3>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        </div>
        
        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-orange-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  {step.type === 'email' ? <Mail className="w-4 h-4 text-orange-400" /> : <Clock className="w-4 h-4 text-orange-400" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{step.subject}</div>
                  {step.delay > 0 && <div className="text-xs text-zinc-500 mt-1">Delay: {step.delay} days</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Inbox Tab
function InboxTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Email List */}
      <div className="lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search emails..."
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">John Smith</span>
                <span className="text-xs text-zinc-500">2h ago</span>
              </div>
              <div className="text-xs text-zinc-400 mb-1">Re: Partnership Opportunity</div>
              <div className="text-xs text-zinc-500 line-clamp-2">Thanks for reaching out. I'd love to discuss...</div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Content */}
      <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="border-b border-zinc-800 pb-4 mb-4">
          <h3 className="text-lg font-semibold mb-2">Re: Partnership Opportunity</h3>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>From: john@acme.com</span>
            <span>•</span>
            <span>2 hours ago</span>
          </div>
        </div>
        <div className="prose prose-invert max-w-none mb-6">
          <p className="text-zinc-300">Hi there,</p>
          <p className="text-zinc-300">Thanks for reaching out. I'd love to discuss the partnership opportunity further. Could we schedule a call next week?</p>
          <p className="text-zinc-300">Best regards,<br />John</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Send className="w-4 h-4" />
            Reply
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}

// Contacts Tab
function ContactsTab({ selectedContact, setSelectedContact }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Contact List */}
      <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="space-y-3">
          {mockContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-orange-500/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-orange-400 font-medium">{contact.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{contact.name}</div>
                    <div className="text-xs text-zinc-400">{contact.company}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    contact.status === 'hot' ? 'bg-red-500/20 text-red-400' :
                    contact.status === 'warm' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {contact.status.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-orange-400">{contact.score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Detail */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        {selectedContact ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl text-orange-400 font-medium">{selectedContact.name.charAt(0)}</span>
              </div>
              <h3 className="text-lg font-semibold">{selectedContact.name}</h3>
              <p className="text-sm text-zinc-400">{selectedContact.company}</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Email</div>
                <div className="text-sm text-white">{selectedContact.email}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Phone</div>
                <div className="text-sm text-white">{selectedContact.phone}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Lead Score</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${selectedContact.score}%` }} />
                  </div>
                  <span className="text-sm font-medium text-orange-400">{selectedContact.score}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors">
                Send Email
              </button>
              <button className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                Schedule Call
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-zinc-500 py-12">
            Select a contact to view details
          </div>
        )}
      </div>
    </div>
  );
}

// Deals Tab
function DealsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(mockDeals).map(([stage, deals]) => (
        <div key={stage} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">{stage}</h3>
            <span className="text-xs text-zinc-500">{deals.length}</span>
          </div>
          <div className="space-y-3">
            {deals.map((deal) => (
              <motion.div
                key={deal.id}

                className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg cursor-move hover:border-orange-500/50 transition-colors"
              >
                <div className="text-sm font-medium text-white mb-1">{deal.title}</div>
                <div className="text-xs text-zinc-400 mb-2">{deal.company}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-orange-400">${deal.value.toLocaleString()}</span>
                  <span className="text-xs text-zinc-500">{deal.probability}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Analytics Tab
function AnalyticsTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Line Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Growth</h3>
        <div className="h-64 flex items-end gap-4">
          {mockChartData.revenue.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-zinc-800 rounded-t-lg relative overflow-hidden" style={{ height: `${(item.value / 72000) * 100}%` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-orange-500 to-orange-400" />
              </div>
              <span className="text-xs text-zinc-500">{item.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {mockChartData.conversion.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-400">{item.stage}</span>
                <span className="text-sm text-white font-medium">{item.value}</span>
              </div>
              <div className="h-8 bg-zinc-800 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                  style={{ width: `${(item.value / 1200) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Donut Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Deal Distribution</h3>
        <div className="flex items-center justify-center py-8">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="80" fill="none" stroke="#27272a" strokeWidth="32" />
              <circle cx="96" cy="96" r="80" fill="none" stroke="#f97316" strokeWidth="32" strokeDasharray="502" strokeDashoffset="125" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">75%</div>
                <div className="text-xs text-zinc-400">Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
        <div className="space-y-4">
          {['Sarah', 'Mike', 'Emma', 'Alex'].map((name, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{name}</span>
                <span className="text-sm text-orange-400">{(85 - i * 10)}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${85 - i * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Timeline Tab
function TimelineTab() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            All Activities
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            Emails
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            Calls
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
            Meetings
          </button>
        </div>

        <div className="space-y-6">
          {mockActivities.map((activity, i) => {
            const Icon = activity.icon;
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-orange-400" />
                  </div>
                  {i < mockActivities.length - 1 && (
                    <div className="w-0.5 h-12 bg-zinc-800 mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{activity.user}</span>
                      <span className="text-xs text-zinc-500">{activity.time}</span>
                    </div>
                    <p className="text-sm text-zinc-300">
                      {activity.action} <span className="text-orange-400">{activity.target}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Scoring Tab
function ScoringTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Score Badges */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Scores</h3>
          <div className="grid grid-cols-3 gap-4">
            {mockContacts.map((contact) => (
              <div key={contact.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-orange-400">{contact.score}</span>
                </div>
                <div className="text-sm font-medium text-white">{contact.name}</div>
                <div className="text-xs text-zinc-400">{contact.company}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
          <div className="space-y-4">
            {[
              { label: 'Email Engagement', score: 25 },
              { label: 'Website Activity', score: 20 },
              { label: 'Company Fit', score: 30 },
              { label: 'Social Engagement', score: 15 }
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">{item.label}</span>
                  <span className="text-sm text-orange-400">{item.score} pts</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${(item.score / 30) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Scoring Rules</h3>
        <div className="space-y-4">
          {[
            { rule: 'Email Open', points: 5 },
            { rule: 'Email Click', points: 10 },
            { rule: 'Website Visit', points: 15 },
            { rule: 'Demo Request', points: 50 }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <span className="text-sm text-white">{item.rule}</span>
              <span className="text-sm font-medium text-orange-400">+{item.points}</span>
            </div>
          ))}
          <button className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors mt-4">
            Edit Rules
          </button>
        </div>
      </div>
    </div>
  );
}

// Templates Tab
function TemplatesTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Email Template Editor</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Template Name"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Subject Line"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
          />
          <textarea
            placeholder="Email body..."
            rows={12}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors">
              Save Template
            </button>
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
              Preview
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Template Library</h3>
        <div className="space-y-2">
          {['Cold Outreach', 'Follow-up', 'Meeting Request', 'Thank You'].map((name, i) => (
            <div key={i} className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-orange-500/50 cursor-pointer transition-colors">
              <div className="text-sm font-medium text-white mb-1">{name}</div>
              <div className="text-xs text-zinc-500">Last edited 2d ago</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Team Tab
function TeamTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['Sarah Chen', 'Mike Johnson', 'Emma Davis', 'Alex Kim'].map((name, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/50 transition-colors"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <span className="text-orange-400 font-medium text-lg">{name.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{name}</div>
                  <div className="text-xs text-zinc-400">Sales Rep</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Deals Closed</span>
                  <span className="text-white font-medium">{12 - i * 2}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Revenue</span>
                  <span className="text-orange-400 font-medium">${(120 - i * 20)}K</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
        <div className="space-y-3">
          {['Sarah Chen', 'Mike Johnson', 'Emma Davis'].map((name, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                i === 1 ? 'bg-gray-400/20 text-gray-400' :
                'bg-orange-500/20 text-orange-400'
              }`}>
                #{i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{name}</div>
                <div className="text-xs text-zinc-500">{120 - i * 20}K revenue</div>
              </div>
              <Trophy className="w-5 h-5 text-orange-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Settings Tab
function SettingsTab() {
  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Profile */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-400" />
          Profile Settings
        </h3>
        <div className="space-y-4">
          <input type="text" placeholder="Full Name" className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none" />
          <input type="email" placeholder="Email" className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none" />
          <button className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-400" />
          Notifications
        </h3>
        <div className="space-y-3">
          {['Email notifications', 'Push notifications', 'Weekly reports'].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <span className="text-sm text-white">{item}</span>
              <div className="w-10 h-6 bg-orange-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-orange-400" />
          Security
        </h3>
        <div className="space-y-4">
          <button className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-left transition-colors">
            Change Password
          </button>
          <button className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-left transition-colors">
            Two-Factor Authentication
          </button>
          <button className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-left transition-colors">
            Connected Devices
          </button>
        </div>
      </div>

      {/* Billing */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-orange-400" />
          Billing
        </h3>
        <div className="space-y-3">
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <div className="text-sm text-zinc-400 mb-1">Current Plan</div>
            <div className="text-lg font-bold text-white">Pro Plan</div>
            <div className="text-sm text-orange-400">€49/month</div>
          </div>
          <button className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// AI Tab
function AITab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: TrendingUp, title: 'Revenue Prediction', value: '€156K', desc: 'Expected next month', color: 'green' },
            { icon: AlertCircle, title: 'At-Risk Deals', value: '3', desc: 'Need immediate attention', color: 'red' },
            { icon: ThumbsUp, title: 'Best Time to Email', value: '9-11 AM', desc: 'Highest open rate', color: 'blue' },
            { icon: Zap, title: 'Quick Wins', value: '5', desc: 'High probability deals', color: 'orange' }
          ].map((insight, i) => {
            const Icon = insight.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="text-sm font-medium text-white">{insight.title}</div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{insight.value}</div>
                <div className="text-sm text-zinc-400">{insight.desc}</div>
              </motion.div>
            );
          })}
        </div>

        {/* AI Predictions */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">AI Predictions</h3>
          <div className="space-y-4">
            {[
              { deal: 'Acme Corp Deal', probability: 85, action: 'Schedule follow-up call' },
              { deal: 'TechStart Contract', probability: 62, action: 'Send pricing proposal' },
              { deal: 'BigCorp Partnership', probability: 45, action: 'Address budget concerns' }
            ].map((item, i) => (
              <div key={i} className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{item.deal}</span>
                  <span className="text-sm text-orange-400">{item.probability}% win rate</span>
                </div>
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-orange-500" style={{ width: `${item.probability}%` }} />
                </div>
                <div className="text-xs text-zinc-400">
                  💡 Suggested: {item.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Chat */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          AI Assistant
        </h3>
        <div className="space-y-3 mb-4 h-96 overflow-y-auto">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 bg-zinc-800/50 rounded-lg p-3">
              <p className="text-sm text-white">How can I help you today?</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="flex-1 bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 max-w-[80%]">
              <p className="text-sm text-white">Which deals should I prioritize?</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 bg-zinc-800/50 rounded-lg p-3">
              <p className="text-sm text-white">Based on your pipeline, I recommend focusing on the Acme Corp deal (85% win rate) and following up with TechStart.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask AI anything..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
          />
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}