import React, { useState, useCallback, useRef } from 'react';

import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle,
  Sparkles,
  Camera,
  Video,
  Image as ImageIcon,
  Plus,
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Settings,
  Download,
  Play,
  Smile,
  Meh,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
  Sun,
  Monitor,
  Trees,
  Palette,
  Square,
  Smartphone,
  RectangleHorizontal,
  Linkedin,
  Clapperboard,
  MessageSquare,
  ShoppingBag,
  Presentation,
  Loader2,
  Trash2,
  Zap,
  Crown,
  Paintbrush,
  Shirt,
} from 'lucide-react';

// --- Constants ---

const SAMPLE_AVATARS = [];

const PHOTO_SLOTS = [
  { id: 'front', label: 'Front facing', icon: Eye, required: true },
  { id: 'left', label: 'Left profile', icon: ArrowLeft, required: false },
  { id: 'right', label: 'Right profile', icon: ArrowRight, required: false },
  { id: 'up', label: 'Looking up', icon: ArrowUp, required: false },
  { id: 'down', label: 'Looking down', icon: ArrowDown, required: false },
  { id: 'smile', label: 'Smiling', icon: Smile, required: false },
  { id: 'neutral', label: 'Neutral expression', icon: Meh, required: false },
];

const STYLE_OPTIONS = [
  { id: 'professional', label: 'Professional', icon: Shirt, desc: 'Clean, polished look for business content' },
  { id: 'casual', label: 'Casual', icon: Smile, desc: 'Relaxed, approachable vibe for social media' },
  { id: 'creative', label: 'Creative', icon: Paintbrush, desc: 'Artistic, expressive style for unique content' },
  { id: 'glamorous', label: 'Glamorous', icon: Crown, desc: 'High-end, refined aesthetic for premium brands' },
];

const BACKGROUND_OPTIONS = [
  { id: 'solid', label: 'Solid Color', icon: Square },
  { id: 'office', label: 'Office', icon: Monitor },
  { id: 'studio', label: 'Studio', icon: Sun },
  { id: 'outdoor', label: 'Outdoor', icon: Trees },
  { id: 'custom', label: 'Custom', icon: Palette },
];

const OUTPUT_FORMATS = [
  { id: 'instagram-post', label: 'Instagram Post', ratio: '1:1', icon: Square },
  { id: 'instagram-story', label: 'Instagram Story', ratio: '9:16', icon: Smartphone },
  { id: 'youtube-thumb', label: 'YouTube Thumbnail', ratio: '16:9', icon: RectangleHorizontal },
  { id: 'linkedin', label: 'LinkedIn', ratio: '1:1', icon: Linkedin },
];

const USE_CASES = [
  {
    icon: Clapperboard,
    title: 'UGC Videos',
    desc: 'Create talking-head videos for TikTok and Instagram Reels that look and feel authentic.',
    gradient: 'from-yellow-500/20 to-amber-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: ShoppingBag,
    title: 'Product Reviews',
    desc: 'Let your avatar present and review products naturally, building trust with your audience.',
    gradient: 'from-yellow-500/20 to-amber-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Social Posts',
    desc: 'Generate consistent, branded social content at scale without scheduling photoshoots.',
    gradient: 'from-yellow-500/20 to-amber-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: Presentation,
    title: 'Presentations',
    desc: 'Professional avatar presenter for business decks, webinars, and training materials.',
    gradient: 'from-yellow-500/20 to-amber-500/10',
    border: 'border-yellow-500/20',
  },
];

const TRAINING_STAGES = [
  { label: 'Analyzing photos...', duration: 2500 },
  { label: 'Learning features...', duration: 3000 },
  { label: 'Creating avatar...', duration: 3500 },
  { label: 'Finalizing...', duration: 2000 },
];

const PREVIEW_POSES = [
  { id: 'p1', label: 'Professional headshot', gradient: 'from-yellow-600 to-amber-700' },
  { id: 'p2', label: 'Casual angle', gradient: 'from-yellow-600 to-amber-700' },
  { id: 'p3', label: 'Presentation pose', gradient: 'from-yellow-600 to-amber-700' },
  { id: 'p4', label: 'Lifestyle setting', gradient: 'from-yellow-600 to-amber-700' },
];

// --- Animation Variants ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const fadeSlide = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

// --- Sub-components ---

function StatusBadge({ status }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Training
    </span>
  );
}

function StyleTag({ style }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
      {style}
    </span>
  );
}

function AvatarCard({ avatar, onCreateVideo, onCreatePost }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-5 flex flex-col items-center text-center relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center mb-4 ring-2 ring-zinc-800/60 group-hover:ring-yellow-500/30 transition-all duration-300`}>
        <span className="text-xl font-bold text-white/90">{avatar.initials}</span>
      </div>

      <h3 className="text-sm font-semibold text-white mb-1.5 relative z-10">{avatar.name}</h3>

      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={avatar.status} />
        <StyleTag style={avatar.style} />
      </div>

      <div className="flex items-center gap-2 w-full mt-auto relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => onCreateVideo?.(avatar)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold transition-colors"
        >
          <Video className="w-3 h-3" />
          Video
        </button>
        <button
          onClick={() => onCreatePost?.(avatar)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700/60 transition-colors"
        >
          <ImageIcon className="w-3 h-3" />
          Post
        </button>
      </div>
    </motion.div>
  );
}

function CreateNewCard({ onClick }) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group bg-zinc-900/30 border-2 border-dashed border-zinc-700/50 hover:border-yellow-500/40 rounded-[20px] p-5 flex flex-col items-center justify-center text-center min-h-[220px] transition-all duration-300 cursor-pointer"
    >
      <div className="w-14 h-14 rounded-full bg-zinc-800/60 group-hover:bg-yellow-500/10 border border-zinc-700/50 group-hover:border-yellow-500/30 flex items-center justify-center mb-3 transition-all duration-300">
        <Plus className="w-6 h-6 text-zinc-500 group-hover:text-yellow-400 transition-colors" />
      </div>
      <span className="text-sm font-semibold text-zinc-400 group-hover:text-yellow-300 transition-colors">Create New Avatar</span>
      <span className="text-xs text-zinc-600 mt-1">Upload photos to get started</span>
    </motion.button>
  );
}

function StepIndicator({ currentStep, totalSteps }) {
  const steps = ['Upload Photos', 'Settings', 'Generate'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div className={`flex-1 h-px ${isCompleted ? 'bg-yellow-500/60' : 'bg-zinc-800'}`} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-yellow-500text-white ring-4 ring-yellow-500/20'
                    : isCompleted
                    ? 'bg-yellow-500/80 text-white'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/60'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? 'text-yellow-300' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PhotoUploadSlot({ slot, photo, onUpload, onRemove }) {
  const fileInputRef = useRef(null);
  const Icon = slot.icon;

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be under 10MB');
        return;
      }
      const url = URL.createObjectURL(file);
      onUpload(slot.id, { file, url });
    }
    e.target.value = '';
  };

  return (
    <div className="relative group">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {photo ? (
        <div className="relative aspect-square rounded-xl overflow-hidden border border-zinc-700/60 group-hover:border-yellow-500/40 transition-colors">
          <img src={photo.url} alt={slot.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onRemove(slot.id)}
              className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="absolute bottom-1.5 left-1.5 right-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-white/80">
              <Check className="w-2.5 h-2.5 text-emerald-400" />
              {slot.label}
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className="w-full aspect-square rounded-xl border-2 border-dashed border-zinc-700/50 hover:border-yellow-500/40 bg-zinc-900/30 hover:bg-yellow-500/[0.03] flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
        >
          <Icon className="w-5 h-5 text-zinc-600 group-hover:text-yellow-400 transition-colors" />
          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-tight text-center px-1">
            {slot.label}
          </span>
          {slot.required && (
            <span className="text-[9px] text-yellow-400/60 font-medium">Required</span>
          )}
        </button>
      )}
    </div>
  );
}

function UploadProgress({ count, max }) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-400">{count} of {max} photos uploaded</span>
        <span className="text-xs font-semibold text-yellow-400">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function GuidelinesCard() {
  const tips = [
    'Multiple angles for best results',
    'Good, even lighting',
    'Plain background preferred',
    'Clear, unobstructed face',
    'Consistent hair and makeup',
    'No sunglasses or heavy filters',
  ];
  return (
    <div className="bg-yellow-500/[0.05] border border-yellow-500/15 rounded-[20px] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <h4 className="text-sm font-semibold text-yellow-300">Photo Guidelines</h4>
      </div>
      <p className="text-xs text-zinc-400 mb-3">For best results, upload 5-10 high-quality photos following these tips:</p>
      <ul className="space-y-1.5">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-xs text-zinc-500">
            <Check className="w-3 h-3 text-yellow-400/60 mt-0.5 shrink-0" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GenerationProgress({ stage, progress }) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-24 h-24 mb-6">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(39,39,42)" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#progressGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 42}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress / 100) }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{Math.round(progress)}%</span>
        </div>
      </div>
      <p className="text-sm font-medium text-white mb-1">{stage}</p>
      <p className="text-xs text-zinc-500">This may take a few moments</p>
    </div>
  );
}

// --- Main Component ---

export default function StudioAvatar() {
  const { user } = useUser();

  // Gallery state
  const [avatars] = useState(SAMPLE_AVATARS);
  const [showCreator, setShowCreator] = useState(false);

  // Creator state
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState({});
  const [extraPhotos, setExtraPhotos] = useState([]);
  const [avatarName, setAvatarName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('studio');
  const [selectedFormats, setSelectedFormats] = useState(['instagram-post']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);

  const extraInputRef = useRef(null);

  const photoCount = Object.keys(photos).length + extraPhotos.length;
  const maxPhotos = 10;
  const slotPhotos = Object.keys(photos).length;
  const canProceedStep1 = photoCount >= 5 && photos.front;
  const canProceedStep2 = avatarName.trim().length > 0 && selectedStyle && selectedBackground && selectedFormats.length > 0;

  const handlePhotoUpload = useCallback((slotId, photo) => {
    setPhotos((prev) => ({ ...prev, [slotId]: photo }));
    toast.success(`Photo uploaded: ${slotId}`);
  }, []);

  const handlePhotoRemove = useCallback((slotId) => {
    setPhotos((prev) => {
      const next = { ...prev };
      if (next[slotId]?.url) URL.revokeObjectURL(next[slotId].url);
      delete next[slotId];
      return next;
    });
  }, []);

  const handleExtraUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxPhotos - photoCount;
    if (remaining <= 0) {
      toast.error('Maximum 10 photos reached');
      return;
    }
    const toAdd = files.slice(0, remaining);
    const newExtras = toAdd
      .filter((f) => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
      .map((file) => ({ file, url: URL.createObjectURL(file), id: `extra-${Date.now()}-${Math.random().toString(36).slice(2)}` }));
    setExtraPhotos((prev) => [...prev, ...newExtras]);
    if (newExtras.length > 0) toast.success(`${newExtras.length} photo(s) added`);
    e.target.value = '';
  }, [photoCount]);

  const handleRemoveExtra = useCallback((id) => {
    setExtraPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const toggleFormat = useCallback((formatId) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId)
        ? prev.filter((f) => f !== formatId)
        : [...prev, formatId]
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    toast.info('AI Avatar generation is coming soon!');
  }, []);

  const resetCreator = useCallback(() => {
    setShowCreator(false);
    setStep(1);
    setPhotos({});
    setExtraPhotos([]);
    setAvatarName('');
    setSelectedStyle('');
    setSelectedBackground('studio');
    setSelectedFormats(['instagram-post']);
    setIsGenerating(false);
    setGenerationStage('');
    setGenerationProgress(0);
    setGenerationComplete(false);
  }, []);

  const handleCreateVideo = useCallback(() => {
    toast.info('AI Avatar videos are coming soon!');
  }, []);

  const handleCreatePost = useCallback(() => {
    toast.info('AI Avatar posts are coming soon!');
  }, []);

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="w-full px-4 lg:px-6 py-6 pb-24 space-y-5">
        {/* ============ SECTION 1: My Avatars Gallery ============ */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-3">
                <UserCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-300">AI Avatars</span>
              </div>
              <h1 className="text-2xl font-bold text-white">My Avatars</h1>
              <p className="text-sm text-zinc-500 mt-1">Create and manage your AI-generated avatars for videos and social content.</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {avatars.length === 0 ? (
              <div className="col-span-full">
                <div className="relative overflow-hidden rounded-[20px] border border-yellow-500/20 bg-gradient-to-br from-yellow-500/[0.05] via-transparent to-amber-500/[0.03] p-8 text-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-[20px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                      <UserCircle className="w-8 h-8 text-yellow-400/60" />
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-medium text-amber-300">Coming Soon</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">AI Avatars are coming</h3>
                    <p className="text-sm text-zinc-500 max-w-md mb-6">
                      We're building AI-powered avatar creation that will let you generate realistic talking-head videos,
                      product reviews, and social content with your own digital likeness.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {['UGC Videos', 'Product Reviews', 'Social Posts', 'Presentations'].map(feature => (
                        <span key={feature} className="px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-xs text-zinc-400">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {avatars.map((avatar) => (
                  <AvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    onCreateVideo={handleCreateVideo}
                    onCreatePost={handleCreatePost}
                  />
                ))}
                <CreateNewCard onClick={() => setShowCreator(true)} />
              </>
            )}
          </div>
        </motion.section>

        {/* ============ SECTION 2: Avatar Creation Studio ============ */}
        <AnimatePresence mode="wait">
          {showCreator && (
            <motion.section
              key="creator"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Avatar Creation Studio</h2>
                      <p className="text-xs text-zinc-500">Upload photos, customize settings, generate your avatar</p>
                    </div>
                  </div>
                  <button
                    onClick={resetCreator}
                    className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Step indicator */}
                <StepIndicator currentStep={step} totalSteps={3} />

                {/* Step Content */}
                <AnimatePresence mode="wait">
                  {/* ----- STEP 1: Upload Photos ----- */}
                  {step === 1 && (
                    <motion.div key="step1" {...fadeSlide}>
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* Photo grid */}
                        <div className="lg:col-span-2">
                          <h3 className="text-sm font-semibold text-white mb-1">Training Photos</h3>
                          <p className="text-xs text-zinc-500 mb-4">Upload 5-10 photos of yourself. More angles produce better results.</p>

                          {/* Required + angle slots */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                            {PHOTO_SLOTS.map((slot) => (
                              <PhotoUploadSlot
                                key={slot.id}
                                slot={slot}
                                photo={photos[slot.id]}
                                onUpload={handlePhotoUpload}
                                onRemove={handlePhotoRemove}
                              />
                            ))}
                          </div>

                          {/* Extra photos row */}
                          {extraPhotos.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-zinc-500 mb-2">Additional Photos</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {extraPhotos.map((ep) => (
                                  <div key={ep.id} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-700/60 group">
                                    <img src={ep.url} alt="Extra" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        onClick={() => handleRemoveExtra(ep.id)}
                                        className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Add more button */}
                          {photoCount < maxPhotos && (
                            <>
                              <input ref={extraInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraUpload} />
                              <button
                                onClick={() => extraInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-zinc-700/50 hover:border-yellow-500/40 text-xs text-zinc-400 hover:text-yellow-300 transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Add more photos ({photoCount}/{maxPhotos})
                              </button>
                            </>
                          )}

                          <UploadProgress count={photoCount} max={maxPhotos} />
                        </div>

                        {/* Guidelines sidebar */}
                        <div className="lg:col-span-1">
                          <GuidelinesCard />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ----- STEP 2: Settings ----- */}
                  {step === 2 && (
                    <motion.div key="step2" {...fadeSlide}>
                      <div className="space-y-8">
                        {/* Name input */}
                        <div>
                          <label className="block text-sm font-semibold text-white mb-2">Avatar Name</label>
                          <input
                            type="text"
                            value={avatarName}
                            onChange={(e) => setAvatarName(e.target.value)}
                            placeholder="e.g. Business Professional"
                            className="w-full max-w-md px-4 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 transition-all"
                          />
                        </div>

                        {/* Style selector */}
                        <div>
                          <label className="block text-sm font-semibold text-white mb-3">Avatar Style</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {STYLE_OPTIONS.map((style) => {
                              const Icon = style.icon;
                              const isSelected = selectedStyle === style.id;
                              return (
                                <button
                                  key={style.id}
                                  onClick={() => setSelectedStyle(style.id)}
                                  className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-yellow-500/10 border-yellow-500/40 ring-1 ring-yellow-500/20'
                                      : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600/60'
                                  }`}
                                >
                                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-yellow-400' : 'text-zinc-500'}`} />
                                  <p className={`text-sm font-semibold mb-0.5 ${isSelected ? 'text-yellow-300' : 'text-white'}`}>{style.label}</p>
                                  <p className="text-[11px] text-zinc-500 leading-snug">{style.desc}</p>
                                  {isSelected && (
                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-yellow-500flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Background preference */}
                        <div>
                          <label className="block text-sm font-semibold text-white mb-3">Background Preference</label>
                          <div className="flex flex-wrap gap-2">
                            {BACKGROUND_OPTIONS.map((bg) => {
                              const Icon = bg.icon;
                              const isSelected = selectedBackground === bg.id;
                              return (
                                <button
                                  key={bg.id}
                                  onClick={() => setSelectedBackground(bg.id)}
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-yellow-500/10 border border-yellow-500/40 text-yellow-300'
                                      : 'bg-zinc-800/40 border border-zinc-700/50 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600/60'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {bg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Output formats */}
                        <div>
                          <label className="block text-sm font-semibold text-white mb-3">Output Formats</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {OUTPUT_FORMATS.map((fmt) => {
                              const Icon = fmt.icon;
                              const isSelected = selectedFormats.includes(fmt.id);
                              return (
                                <button
                                  key={fmt.id}
                                  onClick={() => toggleFormat(fmt.id)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-yellow-500/10 border-yellow-500/40'
                                      : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600/60'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-yellow-500/20' : 'bg-zinc-800/60'}`}>
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-yellow-400' : 'text-zinc-500'}`} />
                                  </div>
                                  <div className="text-left">
                                    <p className={`text-xs font-semibold ${isSelected ? 'text-yellow-300' : 'text-white'}`}>{fmt.label}</p>
                                    <p className="text-[10px] text-zinc-500">{fmt.ratio}</p>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-yellow-400 ml-auto" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ----- STEP 3: Generate & Preview ----- */}
                  {step === 3 && (
                    <motion.div key="step3" {...fadeSlide}>
                      {!isGenerating && !generationComplete && (
                        <div>
                          {/* Summary */}
                          <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-5 mb-6">
                            <h3 className="text-sm font-semibold text-white mb-3">Generation Summary</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">Name</span>
                                  <span className="text-xs font-medium text-white">{avatarName || 'Untitled'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">Style</span>
                                  <span className="text-xs font-medium text-white capitalize">{selectedStyle}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">Background</span>
                                  <span className="text-xs font-medium text-white capitalize">{selectedBackground}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">Photos</span>
                                  <span className="text-xs font-medium text-white">{photoCount} uploaded</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">Formats</span>
                                  <span className="text-xs font-medium text-white">{selectedFormats.length} selected</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-zinc-500">Est. Time</span>
                                  <span className="text-xs font-medium text-zinc-400">~2 minutes</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-center">
                            <button
                              onClick={handleGenerate}
                              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors shadow-lg shadow-yellow-500/20"
                            >
                              <Zap className="w-4 h-4" />
                              Generate Avatar
                            </button>
                          </div>
                        </div>
                      )}

                      {isGenerating && (
                        <GenerationProgress stage={generationStage} progress={generationProgress} />
                      )}

                      {generationComplete && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        >
                          <div className="flex items-center gap-2 mb-5">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">Avatar Generated Successfully</h3>
                          </div>

                          {/* Preview grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {PREVIEW_POSES.map((pose) => (
                              <motion.div
                                key={pose.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="group relative aspect-[3/4] rounded-[20px] overflow-hidden border border-zinc-700/50 cursor-pointer"
                              >
                                <div className={`absolute inset-0 bg-gradient-to-br ${pose.gradient}`} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <UserCircle className="w-10 h-10 text-white/60" />
                                  </div>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                  <p className="text-[11px] text-white/80 font-medium">{pose.label}</p>
                                </div>
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap items-center gap-3 justify-center">
                            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors">
                              <Download className="w-4 h-4" />
                              Download All
                            </button>
                            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm border border-zinc-700/60 transition-colors">
                              <Video className="w-4 h-4" />
                              Use in Video
                            </button>
                            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm border border-zinc-700/60 transition-colors">
                              <ImageIcon className="w-4 h-4" />
                              Create Post
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step navigation */}
                {!isGenerating && !generationComplete && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800/60">
                    <button
                      onClick={() => {
                        if (step === 1) {
                          resetCreator();
                        } else {
                          setStep((s) => s - 1);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {step < 3 && (
                      <button
                        onClick={() => setStep((s) => s + 1)}
                        disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Done button after generation */}
                {generationComplete && (
                  <div className="flex justify-center mt-8 pt-6 border-t border-zinc-800/60">
                    <button
                      onClick={resetCreator}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm border border-zinc-700/60 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ============ SECTION 3: Use Cases Showcase ============ */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mb-6">
            <h2 className="text-lg font-bold text-white">What You Can Do With AI Avatars</h2>
            <p className="text-sm text-zinc-500 mt-1">Transform your content strategy with personalized AI representations.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              return (
                <motion.div
                  key={uc.title}
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`bg-gradient-to-br ${uc.gradient} border ${uc.border} rounded-[20px] p-5 group cursor-pointer`}
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-900/60 border border-zinc-800/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                    <Icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{uc.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{uc.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
