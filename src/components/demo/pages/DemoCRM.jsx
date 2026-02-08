import {
  Users,
  UserPlus,
  MessageSquare,
  AlertCircle,
  Sparkles,
  Mail,
  Building2,
  Clock,
  Search,
  Filter,
} from 'lucide-react';

const contactStats = [
  { label: 'Total Contacts', value: '1,247', icon: Users, color: 'cyan' },
  { label: 'New This Month', value: '89', icon: UserPlus, color: 'emerald' },
  { label: 'Engaged', value: '34', icon: MessageSquare, color: 'violet' },
  { label: 'At Risk', value: '12', icon: AlertCircle, color: 'red' },
];

const statusStyles = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Engaged: 'bg-cyan-500/15 text-cyan-400',
  New: 'bg-violet-500/15 text-violet-400',
  'At Risk': 'bg-red-500/15 text-red-400',
};

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  violet: 'bg-violet-500/15 text-violet-400',
  red: 'bg-red-500/15 text-red-400',
};

export default function DemoCRM({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const contacts = [
    {
      name: 'Sarah Mitchell',
      email: 'sarah@techventures.io',
      company: 'TechVentures',
      status: 'Active',
      lastActivity: '2 hours ago',
      enriched: true,
      avatar: 'SM',
    },
    {
      name: 'James Park',
      email: `james@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
      company: companyName,
      status: 'Engaged',
      lastActivity: '5 hours ago',
      enriched: true,
      avatar: 'JP',
    },
    {
      name: 'Lisa Tran',
      email: 'lisa.tran@meridianhealth.co',
      company: 'Meridian Health',
      status: 'New',
      lastActivity: '1 day ago',
      enriched: false,
      avatar: 'LT',
    },
    {
      name: 'Robert Kim',
      email: `robert@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
      company: companyName,
      status: 'Active',
      lastActivity: '3 hours ago',
      enriched: true,
      avatar: 'RK',
    },
    {
      name: 'Nina Patel',
      email: 'nina@greenleaf.vc',
      company: 'GreenLeaf Ventures',
      status: 'At Risk',
      lastActivity: '5 days ago',
      enriched: false,
      avatar: 'NP',
    },
    {
      name: 'Michael Chen',
      email: 'mchen@databridge.com',
      company: 'DataBridge Corp',
      status: 'Engaged',
      lastActivity: '12 hours ago',
      enriched: true,
      avatar: 'MC',
    },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Contacts</h1>
          <p className="text-zinc-400 mt-1">Manage and enrich your contact database.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search contacts...</span>
          </div>
          <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400">
            <Filter className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Contact Stats */}
      <div data-demo="contact-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {contactStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${iconBgMap[stat.color]}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contact List */}
      <div
        data-demo="contacts"
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last Activity</th>
                <th className="px-5 py-3 font-medium">Enrichment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {contacts.map((contact) => (
                <tr key={contact.email} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                        {contact.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{contact.name}</p>
                        <div className="flex items-center gap-1 text-zinc-500 text-xs mt-0.5">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      {contact.company}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${statusStyles[contact.status]}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {contact.lastActivity}
                    </div>
                  </td>
                  <td className="px-5 py-4" data-demo="enrichment">
                    {contact.enriched ? (
                      <span className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full w-fit">
                        <Sparkles className="w-3 h-3" />
                        AI Enriched
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">Not enriched</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
