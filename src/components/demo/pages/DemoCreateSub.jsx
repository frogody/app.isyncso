import {
  Brush,
  Type,
  Copy,
  Image,
  Sparkles,
  Download,
  Pencil,
  Clock,
  Video,
  Play,
  Timer,
  FolderOpen,
  Filter,
  Search,
  Trash2,
  Share2,
  FileImage,
  FileVideo,
  LayoutTemplate,
  HardDrive,
} from 'lucide-react';

// ─── 1. DemoCreateBranding ──────────────────────────────────────────────────────

const brandColors = [
  { hex: '#EAB308', label: 'Primary' },
  { hex: '#F59E0B', label: 'Secondary' },
  { hex: '#78716C', label: 'Neutral' },
  { hex: '#1C1917', label: 'Dark' },
  { hex: '#FAFAF9', label: 'Light' },
  { hex: '#3B82F6', label: 'Accent' },
];

const logoVariations = ['Full Logo', 'Icon Only', 'Monochrome', 'Dark / Light'];

const brandedTemplates = [
  { name: 'Social Post', uses: 48, gradient: 'from-yellow-600 to-amber-800' },
  { name: 'Email Header', uses: 31, gradient: 'from-violet-600 to-purple-900' },
  { name: 'Presentation Slide', uses: 22, gradient: 'from-emerald-600 to-teal-800' },
  { name: 'Product Banner', uses: 17, gradient: 'from-rose-600 to-pink-900' },
];

export function DemoCreateBranding({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="brand-kit" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/20 rounded-xl">
            <Brush className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Brand Kit</h1>
            <p className="text-zinc-400 mt-0.5">Manage the {companyName} brand identity.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-medium text-sm rounded-xl transition-colors">
          <Pencil className="w-4 h-4" />
          Edit Brand Kit
        </button>
      </div>

      {/* Brand Overview */}
      <div className="grid grid-cols-3 gap-4">
        {/* Logo */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Company Logo</span>
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-black font-bold text-3xl mx-auto">
            {companyName.charAt(0)}
          </div>
          <p className="text-sm text-zinc-400 text-center">{companyName} Primary Mark</p>
        </div>

        {/* Colors */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Primary / Secondary / Accent</span>
          <div className="flex items-center gap-2">
            {brandColors.slice(0, 3).map((c) => (
              <div key={c.hex} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-xl border border-zinc-700" style={{ backgroundColor: c.hex }} />
                <span className="text-[10px] text-zinc-500">{c.label}</span>
                <span className="text-[9px] text-zinc-600 font-mono">{c.hex}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Typography</span>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm text-white font-semibold">Inter</p>
                <p className="text-[11px] text-zinc-500">Heading Font &middot; 24 / 20 / 16px</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-300">Inter</p>
                <p className="text-[11px] text-zinc-500">Body Font &middot; 14 / 12px</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Color Palette</h2>
        <div className="flex items-center gap-4">
          {brandColors.map((c) => (
            <div key={c.hex} className="flex flex-col items-center gap-2 group cursor-default">
              <div className="w-16 h-16 rounded-xl border border-zinc-700 relative" style={{ backgroundColor: c.hex }}>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
                  <Copy className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-xs text-zinc-400">{c.label}</span>
              <span className="text-[10px] text-zinc-600 font-mono">{c.hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logo Variations */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Logo Variations</h2>
        <div className="grid grid-cols-4 gap-3">
          {logoVariations.map((v) => (
            <div key={v} className="bg-zinc-800/40 border border-zinc-800/50 rounded-xl p-5 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500/80 to-amber-600/80 flex items-center justify-center text-black font-bold text-xl">
                {companyName.charAt(0)}
              </div>
              <span className="text-xs text-zinc-400">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Guidelines */}
      <div className="bg-gradient-to-br from-yellow-600/10 to-amber-900/10 border border-yellow-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h2 className="text-white font-semibold">AI Brand Compliance</h2>
        </div>
        <p className="text-sm text-zinc-400">
          All AI-generated content automatically uses your brand kit. Colors, fonts, and tone of voice are applied consistently across every asset.
        </p>
      </div>

      {/* Template Gallery */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Branded Templates</h2>
          <span className="text-xs text-zinc-500">{brandedTemplates.length} templates</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {brandedTemplates.map((t) => (
            <div key={t.name} className="bg-zinc-800/30 border border-zinc-800/50 rounded-xl overflow-hidden group cursor-default">
              <div className={`h-28 bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                <LayoutTemplate className="w-8 h-8 text-white/20" />
              </div>
              <div className="p-3">
                <p className="text-sm text-white font-medium">{t.name}</p>
                <p className="text-[11px] text-zinc-500">{t.uses} uses</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 2. DemoCreateImages ────────────────────────────────────────────────────────

const stylePresets = ['Photorealistic', 'Illustration', 'Product Photo', 'Social Media', 'Abstract'];

const recentImages = [
  { prompt: 'Professional product shot on marble surface...', style: 'Photorealistic', resolution: '2048x2048', date: 'Feb 6, 2026', gradient: 'from-yellow-600 to-amber-800' },
  { prompt: 'Abstract geometric brand pattern...', style: 'Abstract', resolution: '1920x1080', date: 'Feb 5, 2026', gradient: 'from-violet-600 to-purple-900' },
  { prompt: 'Team collaboration illustration, flat...', style: 'Illustration', resolution: '1200x628', date: 'Feb 4, 2026', gradient: 'from-emerald-600 to-teal-800' },
  { prompt: 'E-commerce product banner, clean white...', style: 'Product Photo', resolution: '2400x600', date: 'Feb 3, 2026', gradient: 'from-rose-600 to-pink-900' },
  { prompt: 'LinkedIn carousel slide, data visual...', style: 'Social Media', resolution: '1080x1080', date: 'Feb 2, 2026', gradient: 'from-indigo-600 to-blue-900' },
  { prompt: 'Minimalist icon set for landing page...', style: 'Illustration', resolution: '512x512', date: 'Feb 1, 2026', gradient: 'from-amber-600 to-orange-800' },
];

const imageStats = [
  { label: 'Images Generated', value: '156' },
  { label: 'This Week', value: '12' },
  { label: 'Avg Quality Score', value: '4.2 / 5' },
];

export function DemoCreateImages({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="image-generator" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/20 rounded-xl">
            <Image className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Image Generation</h1>
            <p className="text-zinc-400 mt-0.5">Create AI-powered visuals for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Generation Interface */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="bg-black/30 border border-zinc-800/50 rounded-xl p-3">
          <input
            type="text"
            readOnly
            placeholder="Describe the image you want to generate..."
            className="w-full bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none cursor-default"
          />
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 cursor-default appearance-none">
            {stylePresets.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 cursor-default appearance-none">
            <option>1:1</option>
            <option>16:9</option>
            <option>4:3</option>
            <option>9:16</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium text-sm rounded-xl transition-colors ml-auto">
            <Sparkles className="w-3.5 h-3.5" />
            Generate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {imageStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <span className="text-zinc-400 text-sm">{stat.label}</span>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Style Presets */}
      <div className="flex items-center gap-2">
        {stylePresets.map((s, i) => (
          <div
            key={s}
            className={`px-4 py-2 rounded-xl text-sm cursor-default transition-colors ${
              i === 0
                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800'
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Recent Generations Grid */}
      <div className="grid grid-cols-3 gap-4">
        {recentImages.map((img, idx) => (
          <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden group">
            <div className={`h-40 bg-gradient-to-br ${img.gradient} flex items-center justify-center relative`}>
              <Image className="w-8 h-8 text-white/20" />
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-zinc-300 truncate">{img.prompt}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">{img.style}</span>
                <span className="text-[11px] text-zinc-600">{img.resolution}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {img.date}
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 cursor-default" />
                  <Pencil className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 cursor-default" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. DemoCreateVideos ────────────────────────────────────────────────────────

const recentVideos = [
  { title: 'Product Launch Teaser', duration: '30s', status: 'Complete', statusStyle: 'bg-emerald-500/15 text-emerald-400', gradient: 'from-yellow-600 to-amber-800' },
  { title: 'Social Ad - Q1 Campaign', duration: '15s', status: 'Generating', statusStyle: 'bg-amber-500/15 text-amber-400', gradient: 'from-violet-600 to-purple-900' },
  { title: 'Feature Walkthrough', duration: '60s', status: 'Complete', statusStyle: 'bg-emerald-500/15 text-emerald-400', gradient: 'from-emerald-600 to-teal-800' },
  { title: 'Customer Testimonial Edit', duration: '30s', status: 'Processing', statusStyle: 'bg-indigo-500/15 text-indigo-400', gradient: 'from-rose-600 to-pink-900' },
];

const videoStats = [
  { label: 'Videos Created', value: '24' },
  { label: 'In Queue', value: '3' },
  { label: 'Total Duration', value: '12m' },
];

const timelineSegments = [
  { label: 'Intro', width: '25%', color: 'bg-yellow-500/60' },
  { label: 'Main', width: '50%', color: 'bg-amber-500/60' },
  { label: 'CTA', width: '25%', color: 'bg-yellow-400/60' },
];

export function DemoCreateVideos({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="video-generator" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/20 rounded-xl">
            <Video className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Video Generation</h1>
            <p className="text-zinc-400 mt-0.5">Create and manage video content for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Video Creation Panel */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="bg-black/30 border border-zinc-800/50 rounded-xl p-3">
          <input
            type="text"
            readOnly
            placeholder="Describe the video you want to create..."
            className="w-full bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none cursor-default"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-zinc-500" />
            {['15s', '30s', '60s'].map((d, i) => (
              <button
                key={d}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  i === 1
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <select className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 cursor-default appearance-none">
            <option>Cinematic</option>
            <option>Product Demo</option>
            <option>Social Reel</option>
            <option>Animation</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium text-sm rounded-xl transition-colors ml-auto">
            <Sparkles className="w-3.5 h-3.5" />
            Create Video
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {videoStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <span className="text-zinc-400 text-sm">{stat.label}</span>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Videos Grid */}
      <div className="grid grid-cols-2 gap-4">
        {recentVideos.map((v, idx) => (
          <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden group">
            <div className={`h-44 bg-gradient-to-br ${v.gradient} flex items-center justify-center relative`}>
              <div className="p-3 bg-black/40 rounded-full backdrop-blur-sm">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="absolute top-3 right-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.statusStyle}`}>
                  {v.status}
                </span>
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-white/70 bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                <Timer className="w-3 h-3" />
                {v.duration}
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-white">{v.title}</h3>
              <p className="text-[11px] text-zinc-500 mt-1">{v.duration} &middot; {v.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Project Timeline */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Project Timeline</h2>
        <div className="flex items-center gap-1 h-10 rounded-xl overflow-hidden">
          {timelineSegments.map((seg) => (
            <div
              key={seg.label}
              className={`h-full ${seg.color} flex items-center justify-center rounded-lg`}
              style={{ width: seg.width }}
            >
              <span className="text-[11px] text-white font-medium">{seg.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-zinc-600">0:00</span>
          <span className="text-[11px] text-zinc-600">0:30</span>
        </div>
      </div>
    </div>
  );
}

// ─── 4. DemoCreateLibrary ───────────────────────────────────────────────────────

const typeBadgeMap = {
  Image: 'bg-yellow-500/15 text-yellow-400',
  Video: 'bg-amber-500/15 text-amber-400',
  Template: 'bg-violet-500/15 text-violet-400',
  Document: 'bg-zinc-700/50 text-zinc-300',
};

const typeIconMap = {
  Image: FileImage,
  Video: FileVideo,
  Template: LayoutTemplate,
  Document: FolderOpen,
};

const libraryAssets = [
  { name: 'Hero Banner v3', type: 'Image', size: '2.4 MB', date: 'Feb 6, 2026', uses: 12, gradient: 'from-yellow-600 to-amber-800' },
  { name: 'Product Demo Clip', type: 'Video', size: '18.7 MB', date: 'Feb 5, 2026', uses: 8, gradient: 'from-violet-600 to-purple-900' },
  { name: 'Email Campaign', type: 'Template', size: '340 KB', date: 'Feb 4, 2026', uses: 24, gradient: 'from-emerald-600 to-teal-800' },
  { name: 'Brand Guidelines PDF', type: 'Document', size: '5.1 MB', date: 'Feb 3, 2026', uses: 6, gradient: 'from-rose-600 to-pink-900' },
  { name: 'Social Pack Q1', type: 'Image', size: '8.2 MB', date: 'Feb 2, 2026', uses: 31, gradient: 'from-indigo-600 to-blue-900' },
  { name: 'Onboarding Video', type: 'Video', size: '42.1 MB', date: 'Jan 30, 2026', uses: 5, gradient: 'from-amber-600 to-orange-800' },
  { name: 'Pitch Deck Template', type: 'Template', size: '1.8 MB', date: 'Jan 28, 2026', uses: 14, gradient: 'from-cyan-600 to-teal-800' },
  { name: 'Logo Variations', type: 'Image', size: '3.6 MB', date: 'Jan 25, 2026', uses: 9, gradient: 'from-pink-600 to-rose-900' },
];

const folders = [
  { name: 'Marketing', count: 42 },
  { name: 'Product', count: 28 },
  { name: 'Social', count: 35 },
  { name: 'Internal', count: 18 },
  { name: 'Brand Assets', count: 12 },
];

export function DemoCreateLibrary({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const storageUsed = 2.4;
  const storageTotal = 10;
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div data-demo="asset-library" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/20 rounded-xl">
            <FolderOpen className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Asset Library</h1>
            <p className="text-zinc-400 mt-0.5">{companyName} creative assets and files.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="Search assets..."
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-400 placeholder-zinc-600 w-56 cursor-default focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Folders */}
        <div className="w-48 shrink-0 space-y-2">
          <h3 className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Folders</h3>
          {folders.map((f, i) => (
            <div
              key={f.name}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-default transition-colors ${
                i === 0 ? 'bg-yellow-500/10 text-yellow-400' : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm">{f.name}</span>
              </div>
              <span className="text-[10px] text-zinc-600">{f.count}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            {['All', 'Images', 'Videos', 'Templates'].map((t, i) => (
              <button
                key={t}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  i === 0
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700'
                }`}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-xs text-zinc-400">
                <Download className="w-3 h-3" />
                Download
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-xs text-zinc-400">
                <Share2 className="w-3 h-3" />
                Share
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 border border-zinc-700 rounded-lg text-xs text-zinc-400">
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-4 gap-3">
            {libraryAssets.map((asset, idx) => {
              const TypeIcon = typeIconMap[asset.type] || FileImage;
              return (
                <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden group cursor-default">
                  <div className={`h-28 bg-gradient-to-br ${asset.gradient} flex items-center justify-center`}>
                    <TypeIcon className="w-6 h-6 text-white/20" />
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="text-sm text-white font-medium truncate">{asset.name}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeBadgeMap[asset.type]}`}>{asset.type}</span>
                      <span className="text-[10px] text-zinc-600">{asset.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">{asset.date}</span>
                      <span className="text-[10px] text-zinc-500">{asset.uses} uses</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Storage Usage */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">Storage</span>
              </div>
              <span className="text-xs text-zinc-500">{storageUsed} GB of {storageTotal} GB used</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
