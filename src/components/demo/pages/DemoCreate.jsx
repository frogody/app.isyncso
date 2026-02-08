import {
  Palette,
  Image,
  Video,
  Brush,
  FolderOpen,
  Clock,
  Type,
} from 'lucide-react';

const tabs = [
  { label: 'Images', icon: Image },
  { label: 'Videos', icon: Video },
  { label: 'Branding', icon: Brush },
  { label: 'Library', icon: FolderOpen },
];

const typeBadgeStyles = {
  'Product Shot': 'bg-cyan-500/15 text-cyan-400',
  Marketing: 'bg-violet-500/15 text-violet-400',
  Social: 'bg-amber-500/15 text-amber-400',
};

const galleryItems = [
  { title: 'Hero Banner Q1', type: 'Marketing', date: 'Feb 5, 2026', gradient: 'from-cyan-600 to-blue-800' },
  { title: 'Product Showcase', type: 'Product Shot', date: 'Feb 3, 2026', gradient: 'from-violet-600 to-purple-900' },
  { title: 'LinkedIn Post', type: 'Social', date: 'Feb 1, 2026', gradient: 'from-amber-600 to-orange-800' },
  { title: 'Email Header', type: 'Marketing', date: 'Jan 28, 2026', gradient: 'from-emerald-600 to-teal-800' },
  { title: 'Feature Preview', type: 'Product Shot', date: 'Jan 25, 2026', gradient: 'from-rose-600 to-pink-900' },
  { title: 'Instagram Story', type: 'Social', date: 'Jan 22, 2026', gradient: 'from-indigo-600 to-blue-900' },
];

const brandColors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#1E293B', '#F4F4F5'];

export default function DemoCreate({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <Palette className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Create Studio</h1>
          <p className="text-zinc-400 mt-0.5">
            Generate and manage creative assets for {companyName}.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((tab, i) => (
          <div
            key={tab.label}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm cursor-default transition-colors ${
              i === 0
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </div>
        ))}
      </div>

      {/* Gallery Grid */}
      <div data-demo="gallery" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {galleryItems.map((item) => (
          <div
            key={item.title}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            {/* Thumbnail placeholder */}
            <div className={`h-36 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
              <Image className="w-8 h-8 text-white/30" />
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-medium text-white">{item.title}</h3>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${typeBadgeStyles[item.type]}`}>
                  {item.type}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                {item.date}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Brand Assets */}
      <div data-demo="brand-assets" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Brand Assets</h2>
        <div className="flex items-center gap-6">
          {/* Logo placeholder */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {companyName.charAt(0)}
          </div>

          {/* Color palette */}
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-500">Color Palette</span>
            <div className="flex items-center gap-2">
              {brandColors.map((color) => (
                <div
                  key={color}
                  className="w-8 h-8 rounded-lg border border-zinc-700"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Font */}
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-500">Primary Font</span>
            <div className="flex items-center gap-1.5 text-sm text-zinc-300">
              <Type className="w-4 h-4 text-zinc-500" />
              Inter Variable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
