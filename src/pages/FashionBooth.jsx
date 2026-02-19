import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets, GeneratedContent, Product, PhysicalProduct } from '@/api/entities';
import {
  Shirt, Upload, Loader2, Download, Sparkles, Camera, X, Check,
  ChevronDown, ChevronRight, Image as ImageIcon, RefreshCw, Package,
  Eye, Move, RotateCw, Maximize, User, Users, Layers, Square,
  RectangleHorizontal, RectangleVertical, Zap, ArrowLeft,
  Sun, Moon, Scissors, Grid3X3,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CREATE_LIMITS } from '@/tokens/create';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

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

// ─── AVATAR MODELS (Multi-Reference Training Sets) ──────────────
const STORAGE_BASE = 'https://sfxpmzicgpaxfntqleig.supabase.co/storage/v1/object/public/generated-content/fashion-avatars';

const FASHION_AVATAR_MODELS = [
  {
    id: 'euro-male-01',
    name: 'Lucas',
    gender: 'male',
    description: '25yo European male model',
    characterPrompt: 'Young European male model, approximately 25 years old, with tousled wavy light brown hair with natural golden highlights, blue-green eyes, light stubble along jawline and chin, athletic lean build, strong jawline, defined cheekbones, fair skin with light sun-kissed complexion.',
    thumbnail: `${STORAGE_BASE}/euro-male-01/Warm_genuine_smile_-_eye_level.jpg`,
    trainingImages: [
      {
        id: 'warm_smile',
        url: `${STORAGE_BASE}/euro-male-01/Warm_genuine_smile_-_eye_level.jpg`,
        label: 'Warm Smile',
        desc: 'Front, eye-level, genuine smile',
        bestFor: ['standing_front', 'walking_casual', 'walking_street', 'pose_hands_pockets', 'sitting_casual'],
        angle: 'front',
        framing: 'three_quarter',
      },
      {
        id: 'confident_smirk',
        url: `${STORAGE_BASE}/euro-male-01/Confident_slight_smirk_-_45deg_angle.jpg`,
        label: 'Confident',
        desc: '45° angle, slight smirk',
        bestFor: ['standing_3q', 'walking_confident', 'pose_hand_hip', 'pose_editorial', 'pose_dynamic'],
        angle: '45deg',
        framing: 'three_quarter',
      },
      {
        id: 'serious_low',
        url: `${STORAGE_BASE}/euro-male-01/Serious_-_low_angle.jpg`,
        label: 'Serious',
        desc: 'Close-up, low angle, intense',
        bestFor: ['pose_arms_crossed', 'pose_lean_wall', 'pose_crouch'],
        angle: 'low',
        framing: 'close_up',
      },
      {
        id: 'intense',
        url: `${STORAGE_BASE}/euro-male-01/Intense_-_dramatic_lighting.jpg`,
        label: 'Intense',
        desc: 'Looking down, dramatic mood',
        bestFor: ['pose_looking_away', 'sitting_lean', 'pose_editorial'],
        angle: 'front_down',
        framing: 'three_quarter',
      },
      {
        id: 'amused_close',
        url: `${STORAGE_BASE}/euro-male-01/Slightly_amused_-_close_crop.jpg`,
        label: 'Close-Up',
        desc: 'Close crop, subtle smile',
        bestFor: ['close_up', 'extreme_close', 'mid_shot'],
        angle: 'front_close',
        framing: 'close_up',
      },
      {
        id: 'side_profile',
        url: `${STORAGE_BASE}/euro-male-01/Thoughtful_-_side_profile.jpg`,
        label: 'Side Profile',
        desc: 'Full side view, thoughtful',
        bestFor: ['standing_side', 'standing_back', 'pose_over_shoulder', 'profile_angle'],
        angle: 'side',
        framing: 'upper_body',
      },
      {
        id: 'relaxed_above',
        url: `${STORAGE_BASE}/euro-male-01/Relaxed_candid_-_slightly_above.jpg`,
        label: 'Relaxed',
        desc: 'From above, leaning forward, candid',
        bestFor: ['sitting_cross', 'high_angle', 'birds_eye', 'pose_jump'],
        angle: 'above',
        framing: 'upper_body',
      },
    ],
  },
  {
    id: 'euro-female-01',
    name: 'Sophia',
    gender: 'female',
    description: '25yo European female model',
    characterPrompt: 'Young European female model, approximately 25 years old, with long wavy honey-blonde hair, warm brown eyes, soft natural makeup, clear fair skin, slim feminine build, high cheekbones, gentle smile, natural elegance.',
    thumbnail: `${STORAGE_BASE}/euro-female-01/Genuine_warm_smile_eye_level.jpg`,
    trainingImages: [
      {
        id: 'warm_smile',
        url: `${STORAGE_BASE}/euro-female-01/Genuine_warm_smile_eye_level.jpg`,
        label: 'Warm Smile',
        desc: 'Front, eye-level, genuine warm smile',
        bestFor: ['standing_front', 'walking_casual', 'walking_street', 'pose_hands_pockets', 'sitting_casual'],
        angle: 'front',
        framing: 'three_quarter',
      },
      {
        id: 'confident_3q',
        url: `${STORAGE_BASE}/euro-female-01/Soft_confident_smile_45_three-quarter.jpg`,
        label: 'Confident 3/4',
        desc: '45° three-quarter, soft confident smile',
        bestFor: ['standing_3q', 'walking_confident', 'pose_hand_hip', 'pose_editorial', 'pose_dynamic'],
        angle: '45deg',
        framing: 'three_quarter',
      },
      {
        id: 'serious_low',
        url: `${STORAGE_BASE}/euro-female-01/Serious_editorial_look_low_angle.jpg`,
        label: 'Serious',
        desc: 'Low angle, serious editorial look',
        bestFor: ['pose_arms_crossed', 'pose_lean_wall', 'pose_crouch'],
        angle: 'low',
        framing: 'three_quarter',
      },
      {
        id: 'intense',
        url: `${STORAGE_BASE}/euro-female-01/Intense_fashion_look_dramatic_contrast.jpg`,
        label: 'Intense',
        desc: 'Dramatic contrast, intense fashion look',
        bestFor: ['pose_looking_away', 'sitting_lean', 'pose_editorial'],
        angle: 'front_down',
        framing: 'three_quarter',
      },
      {
        id: 'curious_lean',
        url: `${STORAGE_BASE}/euro-female-01/Curious_expression_slight_forward_lean.jpg`,
        label: 'Curious',
        desc: 'Slight forward lean, curious expression',
        bestFor: ['sitting_cross', 'pose_dynamic', 'pose_jump'],
        angle: 'front_close',
        framing: 'upper_body',
      },
      {
        id: 'side_profile',
        url: `${STORAGE_BASE}/euro-female-01/Thoughtful_side_profile_90_angle.jpg`,
        label: 'Side Profile',
        desc: 'Full side view, thoughtful',
        bestFor: ['standing_side', 'standing_back', 'pose_over_shoulder', 'profile_angle'],
        angle: 'side',
        framing: 'upper_body',
      },
      {
        id: 'relaxed_above',
        url: `${STORAGE_BASE}/euro-female-01/Relaxed_candid_camera_slightly_above.jpg`,
        label: 'Relaxed',
        desc: 'From above, candid relaxed',
        bestFor: ['high_angle', 'birds_eye'],
        angle: 'above',
        framing: 'upper_body',
      },
      {
        id: 'playful_tilt',
        url: `${STORAGE_BASE}/euro-female-01/Subtle_playful_expression_slight_head_tilt.jpg`,
        label: 'Playful',
        desc: 'Slight head tilt, playful expression',
        bestFor: ['close_up', 'extreme_close', 'mid_shot'],
        angle: 'front',
        framing: 'close_up',
      },
    ],
  },
];

// Auto-suggest the best training image for a given pose + angle + framing combination
function suggestBestReference(model, poseId, angleId, framingId) {
  if (!model?.trainingImages?.length) return null;

  // Score each training image by how well it matches the current selections
  let bestScore = -1;
  let bestImg = model.trainingImages[0];

  for (const img of model.trainingImages) {
    let score = 0;
    // Pose match
    if (img.bestFor?.includes(poseId)) score += 3;
    // Angle match
    if (angleId === 'profile_angle' && img.angle === 'side') score += 2;
    if (angleId === 'low_angle' && img.angle === 'low') score += 2;
    if (angleId === 'high_angle' && img.angle === 'above') score += 2;
    if (angleId === 'eye_level' && img.angle === 'front') score += 2;
    if (angleId === 'three_quarter_low' && img.angle === '45deg') score += 2;
    if (angleId === 'dutch_angle' && img.angle === '45deg') score += 1;
    // Framing match
    if (framingId === img.framing) score += 1;
    if (framingId === 'close_up' && img.framing === 'close_up') score += 2;
    if (framingId === 'full_body' && img.framing === 'three_quarter') score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestImg = img;
    }
  }

  return bestImg;
}

export default function FashionBooth({ embedded = false }) {
  const { user } = useUser();
  const { theme, toggleTheme, ct } = useTheme();

  // ─── MODE ─────────────────────────────────────────────────
  const [activeMode, setActiveMode] = useState('booth'); // 'booth' | 'extractor'

  // ─── STATE ────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [selectedAvatarModel, setSelectedAvatarModel] = useState(null);
  const [selectedTrainingImage, setSelectedTrainingImage] = useState(null);
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

  // ─── OUTFIT EXTRACTOR STATE ────────────────────────────────
  const [extractorSourceUrl, setExtractorSourceUrl] = useState(null);
  const [extractorUploading, setExtractorUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPieces, setExtractedPieces] = useState([]);
  const [extractorGarments, setExtractorGarments] = useState([]);

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

  // ─── AUTO-SUGGEST BEST REFERENCE ON POSE/ANGLE/FRAMING CHANGE ──
  useEffect(() => {
    if (selectedAvatarModel) {
      const best = suggestBestReference(selectedAvatarModel, selectedPose, selectedAngle, selectedFraming);
      if (best && best.id !== selectedTrainingImage?.id) {
        setSelectedTrainingImage(best);
      }
    }
  }, [selectedPose, selectedAngle, selectedFraming]);

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
      setSelectedAvatarModel(null);
      setSelectedTrainingImage({ id: 'custom', url: publicUrl, label: 'Custom Upload' });
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
      // Model-based generation with character consistency
      if (selectedAvatarModel?.characterPrompt) {
        parts.push(`The model MUST look EXACTLY like the person in the avatar reference image. Character description for consistency: ${selectedAvatarModel.characterPrompt} The face, body type, skin tone, hair style, and overall appearance must be identical to the reference — this is the same person.`);
      } else if (selectedTrainingImage?.url) {
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

      // Build garment description for the AI prompt
      // When an avatar is selected, Kontext Max uses the avatar as image reference
      // and describes the garment change in text — so garment description matters
      const garmentDesc = selectedProduct?.name
        || (prompt.trim() ? '' : 'the garment from the uploaded reference image');

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
            original_prompt: prompt,
            product_context: selectedProduct ? { name: selectedProduct.name, description: selectedProduct.description || selectedProduct.short_description || '' } : { name: garmentDesc },
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
            fashion_avatar_url: selectedTrainingImage?.url || null,
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
            created_by: user.id,
            content_type: 'image',
            url: data.url,
            name: `Fashion Booth - ${selectedProduct?.name || 'Custom'}`,
            generation_config: {
              source: 'fashion_booth',
              pose: selectedPose,
              framing: selectedFraming,
              angle: selectedAngle,
              scene: selectedScene,
              prompt: prompt,
            },
            tags: ['fashion_booth'],
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

  // ─── OUTFIT EXTRACTOR UPLOAD ─────────────────────────────
  const handleExtractorUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setExtractorUploading(true);
    try {
      const fileName = `outfit-source-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('generated-content').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('generated-content').getPublicUrl(fileName);
      setExtractorSourceUrl(publicUrl);
      setExtractedPieces([]);
      setExtractorGarments([]);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setExtractorUploading(false);
    }
  };

  // ─── OUTFIT EXTRACT ────────────────────────────────────────
  const handleExtract = async () => {
    if (!extractorSourceUrl) { toast.error('Please upload an image first'); return; }
    setIsExtracting(true);
    setExtractedPieces([]);
    setExtractorGarments([]);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            outfit_extract: true,
            outfit_source_url: extractorSourceUrl,
            company_id: user?.company_id,
            user_id: user?.id,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Extraction failed');

      if (data.pieces?.length > 0) {
        setExtractedPieces(data.pieces);
        setExtractorGarments(data.garments_identified || []);
        toast.success(`Extracted ${data.pieces.length} garment pieces!`);

        // Save each piece to generated content
        for (const piece of data.pieces) {
          try {
            await GeneratedContent.create({
              company_id: user.company_id,
              created_by: user.id,
              content_type: 'image',
              url: piece.url,
              name: `Outfit Extract - ${piece.label}`,
              generation_config: { source: 'outfit_extractor', label: piece.label, description: piece.description, prompt: `Extracted ${piece.label} from outfit photo` },
              tags: ['outfit_extractor', piece.label],
            });
          } catch (saveErr) { console.warn('Failed to save piece:', saveErr); }
        }
      } else {
        toast.error('No garment pieces could be extracted');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      toast.error(err.message || 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadPiece = async (piece) => {
    try {
      const response = await fetch(piece.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outfit-${piece.label}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
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
      <div className="w-full px-4 lg:px-6 py-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 flex items-center justify-center border border-rose-500/20">
              <Shirt className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Fashion Studio</h1>
              <p className="text-xs text-zinc-500">AI fashion photography & outfit extraction</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-1">
              <button
                onClick={() => setActiveMode('booth')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeMode === 'booth'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Fashion Booth
              </button>
              <button
                onClick={() => setActiveMode('extractor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeMode === 'extractor'
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                Outfit Extractor
              </button>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 hover:text-white transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {activeMode === 'booth' ? (
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
              <p className="text-[11px] text-zinc-500 mb-3">Select a model for character-consistent generation, or skip for generic model.</p>

              {/* Model selector row */}
              <div className="flex items-center gap-2 mb-3">
                {/* No model option */}
                <button
                  onClick={() => { setSelectedAvatarModel(null); setSelectedTrainingImage(null); setCustomAvatarUrl(null); }}
                  className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                    !selectedAvatarModel && !customAvatarUrl
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-800/60 hover:border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  <Users className="w-5 h-5 text-zinc-500" />
                </button>
                {/* Avatar models */}
                {FASHION_AVATAR_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedAvatarModel(model);
                      setCustomAvatarUrl(null);
                      // Auto-select best reference for current pose/angle/framing
                      const best = suggestBestReference(model, selectedPose, selectedAngle, selectedFraming);
                      setSelectedTrainingImage(best);
                    }}
                    className={`w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border-2 transition-all relative group ${
                      selectedAvatarModel?.id === model.id
                        ? 'border-violet-500 ring-2 ring-violet-500/30'
                        : 'border-zinc-800/60 hover:border-zinc-700'
                    }`}
                  >
                    <img src={model.thumbnail} alt={model.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                      <span className="text-[8px] font-medium text-white leading-none">{model.name}</span>
                    </div>
                  </button>
                ))}
                {/* Custom upload option */}
                {customAvatarUrl && (
                  <button
                    onClick={() => { setSelectedAvatarModel(null); setSelectedTrainingImage({ id: 'custom', url: customAvatarUrl, label: 'Custom' }); }}
                    className={`w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border-2 transition-all ${
                      !selectedAvatarModel && customAvatarUrl
                        ? 'border-violet-500 ring-2 ring-violet-500/30'
                        : 'border-zinc-800/60 hover:border-zinc-700'
                    }`}
                  >
                    <img src={customAvatarUrl} alt="Custom" className="w-full h-full object-cover" />
                  </button>
                )}
              </div>

              {/* Training image reference selector (shown when a model is selected) */}
              {selectedAvatarModel && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-violet-400">Reference angle for this shot</span>
                    <button
                      onClick={() => {
                        const best = suggestBestReference(selectedAvatarModel, selectedPose, selectedAngle, selectedFraming);
                        setSelectedTrainingImage(best);
                        toast.success(`Auto-selected: ${best.label}`);
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Auto-suggest
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {selectedAvatarModel.trainingImages.map(img => {
                      const isSelected = selectedTrainingImage?.id === img.id;
                      const isSuggested = suggestBestReference(selectedAvatarModel, selectedPose, selectedAngle, selectedFraming)?.id === img.id;
                      return (
                        <button
                          key={img.id}
                          onClick={() => setSelectedTrainingImage(img)}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                            isSelected
                              ? 'border-violet-500 ring-2 ring-violet-500/30'
                              : isSuggested
                                ? 'border-violet-500/40 border-dashed'
                                : 'border-zinc-800/40 hover:border-zinc-700'
                          }`}
                        >
                          <img src={img.url} alt={img.label} className="w-full aspect-square object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-4">
                            <span className="text-[9px] font-medium text-white leading-tight block">{img.label}</span>
                            <span className="text-[8px] text-zinc-400 leading-tight block">{img.desc}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {isSuggested && !isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-500/40 flex items-center justify-center">
                              <Zap className="w-3 h-3 text-violet-300" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    <Zap className="w-3 h-3 inline text-violet-500/50 mr-0.5" />
                    Dashed border = best match for your current pose/angle. Select any reference you prefer.
                  </p>
                </div>
              )}

              {/* Upload custom avatar */}
              <label className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg border border-zinc-800/60 hover:border-violet-500/30 bg-zinc-900/30 cursor-pointer transition-all group text-xs text-zinc-500">
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <Upload className="w-3.5 h-3.5 group-hover:text-violet-400" />
                Upload custom model reference
              </label>
              {customAvatarUrl && !selectedAvatarModel && (
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
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
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
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-white">Generation Summary</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {garmentReferenceUrl && <SummaryBadge label="Garment" value="Uploaded" color="rose" />}
                {selectedAvatarModel && <SummaryBadge label="Model" value={selectedAvatarModel.name} color="violet" />}
                {selectedTrainingImage && <SummaryBadge label="Ref" value={selectedTrainingImage.label} color="violet" />}
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
              className={`w-full py-4 rounded-[20px] font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
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
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] overflow-hidden"
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
        ) : (
        /* ══════════════════════════════════════════════════════════
           OUTFIT EXTRACTOR MODE
           ══════════════════════════════════════════════════════════ */
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ── Upload Section ── */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Outfit Extractor</h2>
                <p className="text-[11px] text-zinc-500">Upload a photo of someone wearing an outfit. AI will identify and extract each garment piece as individual product shots.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Upload area */}
              <div>
                {extractorSourceUrl ? (
                  <div className="relative">
                    <img src={extractorSourceUrl} alt="Source outfit" className="w-full max-h-[400px] object-contain rounded-xl border border-zinc-800/60" />
                    <button
                      onClick={() => { setExtractorSourceUrl(null); setExtractedPieces([]); setExtractorGarments([]); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 h-64 rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500/40 bg-zinc-900/30 cursor-pointer transition-all group">
                    <input type="file" accept="image/*" onChange={handleExtractorUpload} className="hidden" />
                    {extractorUploading ? (
                      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                        <span className="text-sm text-zinc-500 group-hover:text-zinc-300">Upload outfit photo</span>
                        <span className="text-[10px] text-zinc-600">JPG, PNG up to 10MB</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Right: Info + Generate */}
              <div className="flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800/40">
                    <h3 className="text-xs font-semibold text-violet-400 mb-2">How it works</h3>
                    <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal list-inside">
                      <li>Upload a photo of a person wearing clothes</li>
                      <li>AI identifies each visible garment piece</li>
                      <li>Generates individual flat-lay product shots</li>
                      <li>Plus one combined image with all pieces</li>
                    </ol>
                  </div>
                  {extractorGarments.length > 0 && (
                    <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800/40">
                      <h3 className="text-xs font-semibold text-zinc-300 mb-2">Detected garments</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {extractorGarments.map(g => (
                          <span key={g} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 capitalize">{g}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExtract}
                  disabled={!extractorSourceUrl || isExtracting}
                  className={`w-full py-4 mt-4 rounded-[20px] font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    extractorSourceUrl && !isExtracting
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Extracting garments...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5" />
                      Extract Outfit Pieces
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Extracted Pieces Grid ── */}
          <AnimatePresence>
            {extractedPieces.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white">Extracted Pieces ({extractedPieces.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {extractedPieces.map((piece, i) => (
                    <motion.div
                      key={piece.label + i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] overflow-hidden group"
                    >
                      <div className="relative">
                        <img src={piece.url} alt={piece.label} className="w-full aspect-square object-contain bg-zinc-950/50 p-2" />
                        <button
                          onClick={() => handleDownloadPiece(piece)}
                          className="absolute top-2 right-2 p-2 rounded-xl bg-black/70 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {piece.label === 'complete_outfit' && (
                          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-violet-500/80 text-white text-[10px] font-semibold">
                            COMBINED
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-zinc-800/40">
                        <span className="text-xs font-medium text-white capitalize">{piece.label === 'complete_outfit' ? 'Complete Outfit' : piece.label}</span>
                        {piece.description && piece.label !== 'complete_outfit' && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{piece.description}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}
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
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] overflow-hidden">
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
