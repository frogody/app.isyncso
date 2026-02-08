import {
  Plug,
  Link2,
  Layers,
  Wifi,
} from 'lucide-react';

const integrationStats = [
  { label: 'Available', value: '30+', icon: Layers, color: 'cyan' },
  { label: 'Connected', value: '8', icon: Link2, color: 'emerald' },
  { label: 'Categories', value: '3', icon: Wifi, color: 'violet' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  violet: 'bg-violet-500/15 text-violet-400',
};

const integrations = [
  { name: 'Slack', category: 'Communication', connected: true, color: '#E01E5A' },
  { name: 'Gmail', category: 'Communication', connected: true, color: '#EA4335' },
  { name: 'HubSpot', category: 'CRM', connected: true, color: '#FF7A59' },
  { name: 'Notion', category: 'Productivity', connected: true, color: '#FFFFFF' },
  { name: 'Google Drive', category: 'Productivity', connected: true, color: '#4285F4' },
  { name: 'Stripe', category: 'Finance', connected: true, color: '#635BFF' },
  { name: 'Salesforce', category: 'CRM', connected: false, color: '#00A1E0' },
  { name: 'LinkedIn', category: 'CRM', connected: true, color: '#0A66C2' },
  { name: 'Zoom', category: 'Communication', connected: true, color: '#2D8CFF' },
];

export default function DemoIntegrations({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <Plug className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Integrations</h1>
          <p className="text-zinc-400 mt-0.5">
            Connect {companyName} to your favorite tools.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {integrationStats.map((stat) => (
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

      {/* Integration Grid */}
      <div data-demo="integrations" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            data-demo={integration.connected ? 'connected' : undefined}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"
          >
            {/* Icon placeholder */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm"
              style={{ backgroundColor: `${integration.color}20`, color: integration.color }}
            >
              {integration.name.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
              <p className="text-xs text-zinc-500">{integration.category}</p>
            </div>

            {/* Status */}
            {integration.connected ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-400">Connected</span>
              </div>
            ) : (
              <span className="text-xs text-cyan-400 cursor-default">Connect</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
