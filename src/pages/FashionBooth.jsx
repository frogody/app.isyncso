import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets, GeneratedContent, Product, PhysicalProduct } from '@/api/entities';
import {
  Shirt, Upload, Loader2, Download, Sparkles, Camera, X, Check,
  ChevronDown, ChevronRight, Image as ImageIcon, RefreshCw, Package,
  Eye, Move, RotateCw, Maximize, User, Users, Layers, Square,
  RectangleHorizontal, RectangleVertical, Zap, ArrowLeft,
  Sun, Moon,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CREATE_LIMITS } from '@/tokens/create';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { PRESET_AVATARS } from '@/components/shared/AvatarSelector';

// ─── POSE PRESETS (20+) ───────────────────────────────────────────
const POSE_PRESETS = [
  { id: 'standing_front', label: 'Standing Front', desc: 'Facing camera, relaxed posture', category: 'standing' },
  { id: 'standing_3q', label: 'Three-Quarter', desc: 'Angled 45° toward camera', category: 'standing' },
  { id: 'standing_side', label: 'Side Profile', desc: 'Full side view', category: 'standing' },
  { id: 'standing_back', label: 'Back View', desc: 'Facing away from camera', category: 'standing' },
  { id: 'walking_casual', label: 'Casual Walk', desc: 'Mid-stride, natural movement', category: 'walking' },
  { id: 'walking_confident', label: 'Power Walk', desc: 'Confident runway-style stride', category: 'walking' },
  { id: 'walking_street', label: 'Street Walk', desc: 'Relaxed urban walking', category: 'walking' },
  { id: 'sitting_casual', label: 'Casual Sit', desc: 'Sitting on stool or ledge', category: 'sitting' },
  { id: 'sitting_cross', label: 'Cross-Legged', desc: 'Sitting with crossed legs', category: 'sitting' },
  { id: 'sitting_lean', label: 'Lean Back', desc: 'Leaning back casually', category: 'sitting' },
  { id: 'pose_hand_hip', label: 'Hand on Hip', desc: 'Confident, one hand on hip', category: 'pose' },
  { id: 'pose_arms_crossed', label: 'Arms Crossed', desc: 'Crossed arms, editorial', category: 'pose' },
  { id: 'pose_hands_pockets', label: 'Hands in Pockets', desc: 'Relaxed, hands in pockets', category: 'pose' },
  { id: 'pose_looking_away', label: 'Look Away', desc: 'Gazing to the side', category: 'pose' },
  { id: 'pose_over_shoulder', label: 'Over Shoulder', desc: 'Looking back over shoulder', category: 'pose' },
  { id: 'pose_dynamic', label: 'Dynamic Motion', desc: 'Mid-movement, fabric flowing', category: 'pose' },
  { id: 'pose_editorial', label: 'Editorial Pose', desc: 'High-fashion magazine pose', category: 'pose' },
  { id: 'pose_lean_wall', label: 'Wall Lean', desc: 'Leaning against a wall', category: 'pose' },
  { id: 'pose_crouch', label: 'Crouch', desc: 'Crouching or low angle pose', category: 'pose' },
  { id: 'pose_jump', label: 'Jump', desc: 'Mid-air, energetic', category: 'pose' },
  { id: 'flat_lay', label: 'Flat-Lay', desc: 'No model — garment laid flat', category: 'no_model' },
  { id: 'ghost_mannequin', label: 'Ghost Mannequin', desc: 'Invisible mannequin, garment shape visible', category: 'no_model' },
  { id: 'hanger', label: 'On Hanger', desc: 'Hung on a premium hanger', category: 'no_model' },
  { id: 'draped', label: 'Draped', desc: 'Draped over furniture or prop', category: 'no_model' },
];

const POSE_CATEGORIES = [
  { id: 'standing', label: 'Standing' },
  { id: 'walking', label: 'Walking' },
  { id: 'sitting', label: 'Sitting' },
  { id: 'pose', label: 'Editorial Poses' },
  { id: 'no_model', label: 'No Model' },
];

// ─── FRAMING OPTIONS ──────────────────────────────────────────────
const FRAMING_OPTIONS = [
  { id: 'full_body', label: 'Full Body', desc: 'Head to toe', icon: User },
  { id: 'three_quarter', label: '3/4 Body', desc: 'Head to mid-thigh', icon: User },
  { id: 'upper_body', label: 'Upper Body', desc: 'Head to waist', icon: User },
  { id: 'close_up', label: 'Close-Up', desc: 'Detail shot of garment', icon: Eye },
  { id: 'mid_shot', label: 'Mid Shot', desc: 'Waist up', icon: User },
  { id: 'extreme_close', label: 'Extreme Close-Up', desc: 'Fabric texture detail', icon: Maximize },
];

// ─── CAMERA ANGLE OPTIONS ─────────────────────────────────────────
const CAMERA_ANGLES = [
  { id: 'eye_level', label: 'Eye Level', desc: 'Straight on, natural perspective' },
  { id: 'low_angle', label: 'Low Angle', desc: 'Looking up, empowering & dramatic' },
  { id: 'high_angle', label: 'High Angle', desc: 'Looking down, editorial feel' },
  { id: 'dutch_angle', label: 'Dutch Angle', desc: 'Tilted, dynamic & edgy' },
  { id: 'birds_eye', label: "Bird's Eye", desc: 'Top-down view (best for flat-lays)' },
  { id: 'worms_eye', label: "Worm's Eye", desc: 'Extreme low angle, dramatic' },
  { id: 'three_quarter_low', label: '3/4 Low', desc: 'Slight low angle with 3/4 turn' },
  { id: 'profile_angle', label: 'Profile', desc: 'Side view, 90° from front' },
];

// ─── SCENE / BACKGROUND PRESETS ───────────────────────────────────
const SCENE_PRESETS = [
  { id: 'studio_white', label: 'White Studio', desc: 'Clean white cyclorama studio' },
  { id: 'studio_dark', label: 'Dark Studio', desc: 'Moody black studio backdrop' },
  { id: 'studio_grey', label: 'Grey Studio', desc: 'Neutral grey seamless paper' },
  { id: 'urban_street', label: 'Urban Street', desc: 'City street with architecture' },
  { id: 'urban_alley', label: 'Urban Alley', desc: 'Gritty industrial alleyway' },
  { id: 'nature_outdoor', label: 'Outdoor Nature', desc: 'Lush greenery, natural light' },
  { id: 'golden_hour', label: 'Golden Hour', desc: 'Warm sunset backlighting' },
  { id: 'cafe_interior', label: 'Cafe', desc: 'Cozy cafe interior setting' },
  { id: 'luxury_interior', label: 'Luxury Interior', desc: 'High-end hotel or lounge' },
  { id: 'beach', label: 'Beach', desc: 'Sandy beach with ocean backdrop' },
  { id: 'rooftop', label: 'Rooftop', desc: 'Urban rooftop with skyline' },
  { id: 'runway', label: 'Runway', desc: 'Fashion show runway setting' },
  { id: 'abstract_gradient', label: 'Abstract', desc: 'Soft abstract gradient background' },
  { id: 'custom', label: 'Custom Scene', desc: 'Describe your own scene in the prompt' },
];

// ─── ASPECT RATIOS ────────────────────────────────────────────────
const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', width: 1024, height: 1024, icon: Square },
  { id: '4:5', label: '4:5', width: 1024, height: 1280, icon: RectangleVertical },
  { id: '9:16', label: '9:16', width: 1024, height: 1792, icon: RectangleVertical },
  { id: '3:4', label: '3:4', width: 1024, height: 1365, icon: RectangleVertical },
  { id: '16:9', label: '16:9', width: 1792, height: 1024, icon: RectangleHorizontal },
];

// ─── QUICK SUGGESTIONS ────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  'Editorial white studio',
  'Urban streetwear look',
  'Golden hour outdoor portrait',
  'Luxury lifestyle scene',
  'Runway show under spotlights',
  'Casual cafe setting',
  'Flat-lay on marble surface',
  'Night city neon vibe',
];

export default function FashionBooth({ embedded = false }) {
  const { user } = useUser();
  const { theme, toggleTheme, ct } = useTheme();

  // ─── STATE ────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null);
  const [selectedPose, setSelectedPose] = useState('standing_front');
  const [selectedFraming, setSelectedFraming] = useState('full_body');
  const [selectedAngle, setSelectedAngle] = useState('eye_level');
  const [selectedScene, setSelectedScene] = useState('studio_white');
  const [aspectRatio, setAspectRatio] = useState('4:5');
  const [garmentReferenceUrl, setGarmentReferenceUrl] = useState(null);
  const [uploadingGarment, setUploadingGarment] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [expandedPoseCategory, setExpandedPoseCategory] = useState('standing');
  const [showHistory, setShowHistory] = useState(false);
  const [brandAssets, setBrandAssets] = useState(null);

  // ─── DATA LOADING ─────────────────────────────────────────
  useEffect(() => {
    if (user?.company_id) {
      loadProducts();
      loadBrandAssets();
      loadHistory();
    }
  }, [user?.company_id]);

  const loadProducts = async () => {
    try {
      const data = await Product.filter({ company_id: user.company_id });
      setProducts(data || []);
    } catch (e) { console.error('Error loading products:', e); }
  };

  const loadBrandAssets = async () => {
    try {
      const data = await BrandAssets.filter({ company_id: user.company_id });
      if (data?.length > 0) setBrandAssets(data[0]);
    } catch (e) { console.error('Error loading brand assets:', e); }
  };

  const loadHistory = async () => {
    try {
      const data = await GeneratedContent.filter({
        company_id: user.company_id,
        content_type: 'image'
      }, '-created_at', 20);
      setGenerationHistory(data || []);
    } catch (e) { console.error('Error loading history:', e); }
  };

  const loadProductImages = async (product) => {
    if (!product || product.type !== 'physical') { setProductImages([]); return; }
    try {
      const physicalProducts = await PhysicalProduct.filter({ product_id: product.id });
      const physicalDetails = physicalProducts?.[0];
      const images = [];
      if (product.featured_image?.url) images.push(product.featured_image.url);
      if (product.gallery) product.gallery.forEach(img => { if (img.url && !images.includes(img.url)) images.push(img.url); });
      if (physicalDetails?.images) physicalDetails.images.forEach(img => { const url = typeof img === 'string' ? img : img.url; if (url && !images.includes(url)) images.push(url); });
      setProductImages(images);
      if (images.length > 0) setGarmentReferenceUrl(images[0]);
    } catch (e) { console.error('Error loading product images:', e); setProductImages([]); }
  };

  // ─── GARMENT UPLOAD ───────────────────────────────────────
  const handleGarmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploadingGarment(true);
    try {
      const fileName = `fashion-booth-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('generated-content').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('generated-content').getPublicUrl(fileName);
      setGarmentReferenceUrl(publicUrl);
      toast.success('Garment image uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload garment image');
    } finally {
      setUploadingGarment(false);
    }
  };

  // ─── AVATAR UPLOAD ────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    try {
      const fileName = `avatar-ref-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('generated-content').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('generated-content').getPublicUrl(fileName);
      setCustomAvatarUrl(publicUrl);
      setSelectedAvatar({ id: 'custom', url: publicUrl });
      toast.success('Avatar reference uploaded');
    } catch (err) {
      toast.error('Failed to upload avatar');
    }
  };

  // ─── PRODUCT SELECT ───────────────────────────────────────
  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    setProductSearch('');
    if (product) {
      await loadProductImages(product);
    } else {
      setProductImages([]);
      setGarmentReferenceUrl(null);
    }
  };

  // ─── BUILD PROMPT ─────────────────────────────────────────
  const buildFashionPrompt = () => {
    const pose = POSE_PRESETS.find(p => p.id === selectedPose);
    const framing = FRAMING_OPTIONS.find(f => f.id === selectedFraming);
    const angle = CAMERA_ANGLES.find(a => a.id === selectedAngle);
    const scene = SCENE_PRESETS.find(s => s.id === selectedScene);
    const isNoModel = pose?.category === 'no_model';

    let parts = [];

    // Core garment preservation instruction
    parts.push('CRITICAL: Preserve the EXACT garment design from the reference image — same fabric texture, same color, same pattern, same stitching, same silhouette, same proportions, same details. Do NOT change the garment in any way.');

    if (isNoModel) {
      // No-model modes
      const poseDescs = {
        flat_lay: 'Professional flat-lay arrangement of the garment on a clean surface, styled with minimal props, shot from directly above',
        ghost_mannequin: 'The garment displayed on an invisible/ghost mannequin showing the natural 3D shape of the garment, no visible mannequin',
        hanger: 'The garment displayed on a premium wooden or velvet hanger against a clean backdrop',
        draped: 'The garment artfully draped over a chair, bench, or minimal furniture piece',
      };
      parts.push(poseDescs[selectedPose] || pose.desc);
    } else {
      // Model-based generation
      if (selectedAvatar?.url) {
        parts.push(`The model should look EXACTLY like the person in the avatar reference image — same face, same body type, same skin tone, same hair. Character-consistent generation.`);
      }

      parts.push(`The model is ${pose.desc.toLowerCase()}.`);
      parts.push(`Camera framing: ${framing.label} shot (${framing.desc.toLowerCase()}).`);
      parts.push(`Camera angle: ${angle.label} (${angle.desc.toLowerCase()}).`);
    }

    // Scene
    if (scene && scene.id !== 'custom') {
      parts.push(`Scene/background: ${scene.desc}.`);
    }

    // User prompt additions
    if (prompt.trim()) {
      parts.push(prompt.trim());
    }

    // Photography quality
    parts.push('Professional fashion photography, 85mm lens, f/4 aperture, crisp focus on garment details, editorial lighting, high-resolution.');

    return parts.join('\n\n');
  };

  // ─── GENERATE ─────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!garmentReferenceUrl) {
      toast.error('Please upload a garment reference image first');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const fullPrompt = buildFashionPrompt();
      const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            product_name: selectedProduct?.name || 'Fashion garment',
            product_images: garmentReferenceUrl ? [garmentReferenceUrl] : [],
            reference_image_url: garmentReferenceUrl,
            use_case: 'fashion_tryon',
            style: 'photorealistic',
            width: ratio?.width || 1024,
            height: ratio?.height || 1280,
            aspect_ratio: aspectRatio,
            brand_context: brandAssets ? {
              brand_name: brandAssets.brand_name,
              brand_colors: brandAssets.brand_colors,
              brand_style: brandAssets.brand_style,
            } : null,
            is_fashion: true,
            fashion_booth: true,
            fashion_pose: selectedPose,
            fashion_framing: selectedFraming,
            fashion_angle: selectedAngle,
            fashion_scene: selectedScene,
            fashion_avatar_url: selectedAvatar?.url || null,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.url) {
        setGeneratedImage(data);
        toast.success('Fashion image generated!');
        // Save to generated content
        try {
          await GeneratedContent.create({
            company_id: user.company_id,
            user_id: user.id,
            content_type: 'image',
            url: data.url,
            name: `Fashion Booth - ${selectedProduct?.name || 'Custom'}`,
            metadata: {
              source: 'fashion_booth',
              pose: selectedPose,
              framing: selectedFraming,
              angle: selectedAngle,
              scene: selectedScene,
              prompt: prompt,
            },
          });
          loadHistory();
        } catch (saveErr) {
          console.warn('Failed to save to history:', saveErr);
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── DOWNLOAD ─────────────────────────────────────────────
  const handleDownload = async () => {
    if (!generatedImage?.url) return;
    try {
      const response = await fetch(generatedImage.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fashion-booth-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  // ─── FILTERED PRODUCTS ────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 10);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 10);
  }, [products, productSearch]);

  const canGenerate = garmentReferenceUrl && !isGenerating;

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#09090b]'}>
      <div className="w-full px-4 lg:px-8 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 flex items-center justify-center border border-rose-500/20">
              <Shirt className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Fashion Booth</h1>
              <p className="text-xs text-zinc-500">AI fashion photography with garment-accurate generation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 hover:text-white transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ════════════════════════════════════════════════════════
              LEFT COLUMN - Controls
              ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">

            {/* ── 1. Garment Reference ── */}
            <Section title="Garment Reference" icon={Shirt} color="rose" required>
              {/* Product selector */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800/60 rounded-xl text-white placeholder-zinc-600 focus:border-rose-500/40 focus:outline-none"
                />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleProductSelect(p)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/60 text-sm text-zinc-300"
                      >
                        {p.featured_image?.url && (
                          <img src={p.featured_image.url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        )}
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Garment images from product */}
              {productImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {productImages.slice(0, 8).map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setGarmentReferenceUrl(url)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        garmentReferenceUrl === url
                          ? 'border-rose-500 ring-2 ring-rose-500/30'
                          : 'border-zinc-800/60 hover:border-zinc-700'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-zinc-700 hover:border-rose-500/40 bg-zinc-900/30 cursor-pointer transition-all group">
                <input type="file" accept="image/*" onChange={handleGarmentUpload} className="hidden" />
                {uploadingGarment ? (
                  <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 transition-colors" />
                )}
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  {uploadingGarment ? 'Uploading...' : 'Upload garment photo'}
                </span>
              </label>

              {/* Current reference preview */}
              {garmentReferenceUrl && (
                <div className="mt-3 relative">
                  <img src={garmentReferenceUrl} alt="Reference" className="w-full max-h-48 object-contain rounded-xl border border-zinc-800/60" />
                  <button
                    onClick={() => { setGarmentReferenceUrl(null); setSelectedProduct(null); setProductImages([]); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </Section>

            {/* ── 2. Avatar / Model ── */}
            <Section title="Model / Avatar" icon={User} color="violet">
              <p className="text-[11px] text-zinc-500 mb-3">Select an avatar for character-consistent generation, or skip for generic model.</p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {/* No avatar option */}
                <button
                  onClick={() => { setSelectedAvatar(null); setCustomAvatarUrl(null); }}
                  className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                    !selectedAvatar
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-800/60 hover:border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  <Users className="w-5 h-5 text-zinc-500" />
                </button>
                {/* Preset avatars */}
                {PRESET_AVATARS.map(av => (
                  <button
                    key={av.id}
                    onClick={() => setSelectedAvatar(av)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedAvatar?.id === av.id
                        ? 'border-violet-500 ring-2 ring-violet-500/30'
                        : 'border-zinc-800/60 hover:border-zinc-700'
                    }`}
                  >
                    <img src={av.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {/* Upload custom avatar */}
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800/60 hover:border-violet-500/30 bg-zinc-900/30 cursor-pointer transition-all group text-xs text-zinc-500">
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <Upload className="w-3.5 h-3.5 group-hover:text-violet-400" />
                Upload custom model reference
              </label>
              {customAvatarUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={customAvatarUrl} className="w-10 h-10 rounded-lg object-cover border border-violet-500/30" alt="" />
                  <span className="text-xs text-violet-400">Custom avatar selected</span>
                </div>
              )}
            </Section>

            {/* ── 3. Pose ── */}
            <Section title="Model Pose" icon={Move} color="amber">
              {POSE_CATEGORIES.map(cat => {
                const poses = POSE_PRESETS.filter(p => p.category === cat.id);
                const isExpanded = expandedPoseCategory === cat.id;
                const hasActive = poses.some(p => p.id === selectedPose);
                return (
                  <div key={cat.id} className="mb-1">
                    <button
                      onClick={() => setExpandedPoseCategory(isExpanded ? null : cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        hasActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
                      }`}
                    >
                      <span>{cat.label} ({poses.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-1.5 pt-2 pb-1">
                            {poses.map(pose => (
                              <button
                                key={pose.id}
                                onClick={() => setSelectedPose(pose.id)}
                                className={`text-left px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                                  selectedPose === pose.id
                                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                                    : 'border border-zinc-800/40 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
                                }`}
                              >
                                <span className="font-medium block">{pose.label}</span>
                                <span className="text-zinc-500 text-[10px]">{pose.desc}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </Section>

            {/* ── 4. Framing ── */}
            <Section title="Framing" icon={Maximize} color="cyan">
              <div className="grid grid-cols-3 gap-2">
                {FRAMING_OPTIONS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFraming(f.id)}
                    className={`text-left px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                      selectedFraming === f.id
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                        : 'border border-zinc-800/40 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                  >
                    <span className="font-medium block">{f.label}</span>
                    <span className="text-zinc-500 text-[10px]">{f.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── 5. Camera Angle ── */}
            <Section title="Camera Angle" icon={RotateCw} color="blue">
              <div className="grid grid-cols-2 gap-2">
                {CAMERA_ANGLES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAngle(a.id)}
                    className={`text-left px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                      selectedAngle === a.id
                        ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                        : 'border border-zinc-800/40 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                  >
                    <span className="font-medium block">{a.label}</span>
                    <span className="text-zinc-500 text-[10px]">{a.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── 6. Scene ── */}
            <Section title="Scene / Background" icon={Layers} color="emerald">
              <div className="grid grid-cols-2 gap-2">
                {SCENE_PRESETS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScene(s.id)}
                    className={`text-left px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                      selectedScene === s.id
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'border border-zinc-800/40 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                  >
                    <span className="font-medium block">{s.label}</span>
                    <span className="text-zinc-500 text-[10px]">{s.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── 7. Aspect Ratio ── */}
            <Section title="Aspect Ratio" icon={Square} color="zinc">
              <div className="flex items-center gap-2">
                {ASPECT_RATIOS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setAspectRatio(r.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      aspectRatio === r.id
                        ? 'bg-white/10 border border-white/20 text-white'
                        : 'border border-zinc-800/40 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </Section>

          </div>

          {/* ════════════════════════════════════════════════════════
              RIGHT COLUMN - Prompt + Output
              ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">

            {/* ── Prompt Area ── */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-medium text-white">Additional Scene Instructions</span>
                <span className="text-[10px] text-zinc-500">(optional — the main prompt is built from your selections above)</span>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, CREATE_LIMITS.PROMPT_MAX_LENGTH))}
                placeholder="Add extra details: lighting preferences, mood, props, styling notes..."
                className="min-h-[80px] bg-zinc-950/50 border-zinc-800/40 text-white placeholder-zinc-600 text-sm resize-none rounded-xl"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => setPrompt(prev => prev ? `${prev}, ${chip.toLowerCase()}` : chip)}
                      className="px-2.5 py-1 rounded-full text-[10px] bg-zinc-800/60 text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 border border-zinc-800/40 hover:border-rose-500/20 transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-600">{prompt.length}/{CREATE_LIMITS.PROMPT_MAX_LENGTH}</span>
              </div>
            </div>

            {/* ── Selection Summary ── */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-white">Generation Summary</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {garmentReferenceUrl && <SummaryBadge label="Garment" value="Uploaded" color="rose" />}
                {selectedAvatar && <SummaryBadge label="Avatar" value={selectedAvatar.id === 'custom' ? 'Custom' : `Preset ${selectedAvatar.id.split('-')[1]}`} color="violet" />}
                <SummaryBadge label="Pose" value={POSE_PRESETS.find(p => p.id === selectedPose)?.label} color="amber" />
                <SummaryBadge label="Framing" value={FRAMING_OPTIONS.find(f => f.id === selectedFraming)?.label} color="cyan" />
                <SummaryBadge label="Angle" value={CAMERA_ANGLES.find(a => a.id === selectedAngle)?.label} color="blue" />
                <SummaryBadge label="Scene" value={SCENE_PRESETS.find(s => s.id === selectedScene)?.label} color="emerald" />
                <SummaryBadge label="Ratio" value={aspectRatio} color="zinc" />
              </div>
            </div>

            {/* ── Generate Button ── */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                canGenerate
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating fashion image...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Fashion Image
                </>
              )}
            </button>

            {/* ── Generated Result ── */}
            <AnimatePresence mode="wait">
              {generatedImage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={generatedImage.url}
                      alt="Generated fashion"
                      className="w-full object-contain max-h-[600px]"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        onClick={handleDownload}
                        className="p-2.5 rounded-xl bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="p-2.5 rounded-xl bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {generatedImage.enhanced_prompt && (
                    <div className="p-4 border-t border-zinc-800/60">
                      <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3">{generatedImage.enhanced_prompt}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Recent History ── */}
            {generationHistory.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 mb-3 transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                  Recent generations ({generationHistory.length})
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {generationHistory.slice(0, 12).map(item => (
                          <div
                            key={item.id}
                            className="aspect-square rounded-xl overflow-hidden border border-zinc-800/40 hover:border-zinc-700 cursor-pointer transition-all"
                            onClick={() => setGeneratedImage(item)}
                          >
                            {item.url && <img src={item.url} alt="" className="w-full h-full object-cover" />}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REUSABLE SECTION COMPONENT ───────────────────────────────────
function Section({ title, icon: Icon, color, required, children }) {
  const [open, setOpen] = useState(true);
  const colorMap = {
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    zinc: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  };
  const colors = colorMap[color] || colorMap.zinc;
  const [textColor] = colors.split(' ');

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg ${colors} flex items-center justify-center border`}>
            <Icon className={`w-3.5 h-3.5 ${textColor}`} />
          </div>
          <span className="text-sm font-medium text-white">{title}</span>
          {required && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Required</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SUMMARY BADGE ────────────────────────────────────────────────
function SummaryBadge({ label, value, color }) {
  const colorMap = {
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    zinc: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border ${colorMap[color] || colorMap.zinc}`}>
      <span className="text-zinc-500 font-medium">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}
