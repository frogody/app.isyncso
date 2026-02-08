import {
  Palette,
  Image,
  Video,
  Brush,
  FolderOpen,
  Clock,
  Type,
  Sparkles,
  Wand2,
  Layout,
  Calendar,
  Plus,
  Play,
  Layers,
  Grid3x3,
  PenTool,
  Maximize2,
  ChevronRight,
  Eye,
} from 'lucide-react';

const tabs = [
  { label: 'Images', icon: Image, count: 24 },
  { label: 'Videos', icon: Video, count: 8 },
  { label: 'Branding', icon: Brush, count: null },
  { label: 'Library', icon: FolderOpen, count: 156 },
];

const typeBadgeStyles = {
  'Product Shot': 'bg-cyan-500/15 text-cyan-400',
  Marketing: 'bg-violet-500/15 text-violet-400',
  Social: 'bg-amber-500/15 text-amber-400',
};

const galleryItems = [
  {
    title: 'Hero Banner Q1',
    type: 'Marketing',
    date: 'Feb 5, 2026',
    gradient: 'from-yellow-600 to-amber-800',
    resolution: '1920 x 1080',
    views: 342,
  },
  {
    title: 'Product Showcase',
    type: 'Product Shot',
    date: 'Feb 3, 2026',
    gradient: 'from-violet-600 to-purple-900',
    resolution: '2400 x 2400',
    views: 189,
  },
  {
    title: 'LinkedIn Post',
    type: 'Social',
    date: 'Feb 1, 2026',
    gradient: 'from-amber-600 to-orange-800',
    resolution: '1200 x 628',
    views: 567,
  },
  {
    title: 'Email Header',
    type: 'Marketing',
    date: 'Jan 28, 2026',
    gradient: 'from-emerald-600 to-teal-800',
    resolution: '600 x 200',
    views: 128,
  },
  {
    title: 'Feature Preview',
    type: 'Product Shot',
    date: 'Jan 25, 2026',
    gradient: 'from-rose-600 to-pink-900',
    resolution: '1600 x 900',
    views: 94,
  },
  {
    title: 'Instagram Story',
    type: 'Social',
    date: 'Jan 22, 2026',
    gradient: 'from-indigo-600 to-blue-900',
    resolution: '1080 x 1920',
    views: 712,
  },
];

const brandColors = [
  { hex: '#EAB308', label: 'Primary' },
  { hex: '#F59E0B', label: 'Accent' },
  { hex: '#78716C', label: 'Neutral' },
  { hex: '#1C1917', label: 'Dark' },
  { hex: '#FAFAF9', label: 'Light' },
];

const recentPrompts = [
  {
    prompt: 'Professional product photo of our SaaS dashboard on a MacBook, clean white desk, natural light...',
    type: 'Product Shot',
    icon: Image,
    results: 4,
    time: '2 hours ago',
  },
  {
    prompt: 'Abstract geometric pattern with brand colors for email campaign header, modern minimalist...',
    type: 'Marketing',
    icon: Wand2,
    results: 6,
    time: '5 hours ago',
  },
  {
    prompt: 'Team celebration photo style, diverse professionals in modern office, high-five moment...',
    type: 'Social',
    icon: Layout,
    results: 3,
    time: '1 day ago',
  },
  {
    prompt: 'Isometric illustration of cloud infrastructure with connected nodes, blue-yellow gradient...',
    type: 'Marketing',
    icon: Grid3x3,
    results: 8,
    time: '2 days ago',
  },
];

const socialTemplates = [
  { name: 'LinkedIn Announcement', uses: 34 },
  { name: 'Instagram Product Card', uses: 28 },
  { name: 'Twitter/X Banner', uses: 19 },
  { name: 'Facebook Ad Creative', uses: 15 },
];

const calendarEvents = [
  { day: 'Mon', label: 'Blog Header', color: 'bg-yellow-500/60' },
  { day: 'Tue', label: '', color: '' },
  { day: 'Wed', label: 'Social Pack', color: 'bg-amber-500/60' },
  { day: 'Thu', label: '', color: '' },
  { day: 'Fri', label: 'Newsletter', color: 'bg-yellow-400/60' },
  { day: 'Sat', label: '', color: '' },
  { day: 'Sun', label: '', color: '' },
];

export default function DemoCreate({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Page Header */}
      <div data-demo="header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/20 rounded-xl">
            <Palette className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Create Studio</h1>
            <p className="text-zinc-400 mt-0.5">
              Generate and manage creative assets for {companyName}.
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-medium text-sm rounded-xl transition-colors">
          <Sparkles className="w-4 h-4" />
          Generate New
        </button>
      </div>

      {/* AI Generation Tools - Bento Grid */}
      <div data-demo="ai-tools" className="grid grid-cols-3 gap-4">
        {/* Image Generation - Large card, 2 cols */}
        <div className="col-span-2 bg-gradient-to-br from-yellow-600/20 to-amber-900/20 border border-yellow-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Wand2 className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Image Generation</h3>
                <p className="text-sm text-zinc-400">Create stunning visuals with AI-powered tools</p>
              </div>
            </div>
            <div className="bg-black/30 border border-zinc-800/50 rounded-xl p-3">
              <p className="text-xs text-zinc-500 mb-2">Sample prompt</p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                "Professional product photo of our platform dashboard displayed on a sleek monitor, soft studio lighting, shallow depth of field, {companyName} branding..."
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium text-sm rounded-xl transition-colors">
                <Sparkles className="w-3.5 h-3.5" />
                Generate
              </button>
              <span className="text-xs text-zinc-500">42 credits remaining</span>
            </div>
          </div>
        </div>

        {/* Video Creation */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Video className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-white font-semibold text-sm">Video Creation</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Transform images into short-form videos and animations for social and marketing.
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Play className="w-3.5 h-3.5 text-yellow-400" />
            <span>8 videos generated</span>
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors">
            <Plus className="w-3 h-3" />
            Create Video
          </button>
        </div>

        {/* Brand Kit */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <PenTool className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-white font-semibold text-sm">Brand Kit</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-black font-bold text-xs">
                {companyName.charAt(0)}
              </div>
              <span className="text-xs text-zinc-400">Logo</span>
            </div>
            <div className="flex items-center gap-1.5">
              {brandColors.slice(0, 4).map((c) => (
                <div key={c.hex} className="w-5 h-5 rounded" style={{ backgroundColor: c.hex }} />
              ))}
              <span className="text-[10px] text-zinc-600 ml-1">+1</span>
            </div>
            <div className="text-[11px] text-zinc-500">Inter + Roboto Mono</div>
          </div>
        </div>

        {/* Social Templates */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Layout className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-white font-semibold text-sm">Social Templates</h3>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-zinc-300 font-medium">24 templates</span>
          </div>
          <div className="space-y-1.5">
            {socialTemplates.slice(0, 2).map((t) => (
              <div key={t.name} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 truncate">{t.name}</span>
                <span className="text-zinc-600">{t.uses} uses</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Calendar */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-white font-semibold text-sm">Content Calendar</h3>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarEvents.map((ev) => (
              <div key={ev.day} className="text-center">
                <span className="text-[9px] text-zinc-600 block mb-1">{ev.day}</span>
                <div
                  className={`w-full aspect-square rounded-md flex items-center justify-center ${
                    ev.color ? ev.color : 'bg-zinc-800/40'
                  }`}
                >
                  {ev.label && (
                    <span className="text-[7px] text-white font-medium leading-none px-0.5 text-center">
                      {ev.label.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-zinc-500">3 items scheduled this week</div>
        </div>
      </div>

      {/* Tabs */}
      <div data-demo="tabs" className="flex items-center gap-2">
        {tabs.map((tab, i) => (
          <div
            key={tab.label}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm cursor-default transition-colors ${
              i === 0
                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Gallery Grid */}
      <div data-demo="gallery" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {galleryItems.map((item) => (
          <div
            key={item.title}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden group"
          >
            {/* Thumbnail placeholder */}
            <div className={`h-40 bg-gradient-to-br ${item.gradient} flex items-center justify-center relative`}>
              <Image className="w-8 h-8 text-white/20" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-black/50 rounded-lg backdrop-blur-sm">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <div className="p-2 bg-black/50 rounded-lg backdrop-blur-sm">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-medium text-white">{item.title}</h3>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${typeBadgeStyles[item.type]}`}>
                  {item.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {item.date}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {item.views}
                  </span>
                  <span>{item.resolution}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Brand Assets Section */}
      <div data-demo="brand-assets" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Brand Assets</h2>
          <span className="text-xs text-yellow-400 cursor-default">Edit Brand Kit</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Logo placeholder */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-500 font-medium">Company Logo</span>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-black font-bold text-2xl">
              {companyName.charAt(0)}
            </div>
            <p className="text-[11px] text-zinc-600">{companyName} mark</p>
          </div>

          {/* Color palette */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-500 font-medium">Color Palette</span>
            <div className="flex items-center gap-2">
              {brandColors.map((color) => (
                <div key={color.hex} className="space-y-1">
                  <div
                    className="w-10 h-10 rounded-lg border border-zinc-700 cursor-default"
                    style={{ backgroundColor: color.hex }}
                  />
                  <p className="text-[9px] text-zinc-600 text-center">{color.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-500 font-medium">Typography</span>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Inter</p>
                  <p className="text-[10px] text-zinc-600">Primary - Headings & Body</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-zinc-600" />
                <div>
                  <p className="text-sm text-zinc-400">Roboto Mono</p>
                  <p className="text-[10px] text-zinc-600">Secondary - Code & Data</p>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Voice */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-500 font-medium">Brand Voice</span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Professional yet approachable. Confident without being aggressive. Data-driven insights expressed in clear, human language.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Confident', 'Clear', 'Innovative'].map((trait) => (
                <span key={trait} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400/70">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Prompts */}
      <div data-demo="recent-prompts" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent Prompts</h2>
          <span className="text-xs text-zinc-500">Last 7 days</span>
        </div>
        <div className="space-y-3">
          {recentPrompts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3.5 rounded-xl bg-zinc-800/30 border border-zinc-800/50 group cursor-default"
            >
              <div className="p-2 bg-yellow-500/10 rounded-lg shrink-0">
                <item.icon className="w-4 h-4 text-yellow-400/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{item.prompt}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeBadgeStyles[item.type]}`}>
                    {item.type}
                  </span>
                  <span className="text-[11px] text-zinc-600">{item.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-500">{item.results} results</span>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
