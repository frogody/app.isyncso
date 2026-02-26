import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { BrandAssets, GeneratedContent, Product, PhysicalProduct } from '@/api/entities';
import {
  Shirt, Upload, Loader2, Download, Sparkles, Camera, X, Check,
  ChevronDown, ChevronRight, Image as ImageIcon, RefreshCw, Package,
  Eye, Move, RotateCw, Maximize, User, Users, Layers, Square,
  RectangleHorizontal, RectangleVertical, Zap, ArrowLeft,
  Sun, Moon, Scissors, Grid3X3, Film, Play, Pause,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Textarea } from '@/components/ui/textarea';
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
  { id: 'pose', label: 'Editorial' },
  { id: 'no_model', label: 'No Model' },
];

// ─── FRAMING OPTIONS ──────────────────────────────────────────────
const FRAMING_OPTIONS = [
  { id: 'full_body', label: 'Full Body', desc: 'Head to toe' },
  { id: 'three_quarter', label: '3/4 Body', desc: 'Head to mid-thigh' },
  { id: 'upper_body', label: 'Upper Body', desc: 'Head to waist' },
  { id: 'close_up', label: 'Close-Up', desc: 'Detail shot' },
  { id: 'mid_shot', label: 'Mid Shot', desc: 'Waist up' },
  { id: 'extreme_close', label: 'Extreme Close', desc: 'Fabric texture' },
];

// ─── CAMERA ANGLE OPTIONS ─────────────────────────────────────────
const CAMERA_ANGLES = [
  { id: 'eye_level', label: 'Eye Level', desc: 'Natural perspective' },
  { id: 'low_angle', label: 'Low Angle', desc: 'Empowering & dramatic' },
  { id: 'high_angle', label: 'High Angle', desc: 'Editorial feel' },
  { id: 'dutch_angle', label: 'Dutch Angle', desc: 'Dynamic & edgy' },
  { id: 'birds_eye', label: "Bird's Eye", desc: 'Top-down (flat-lays)' },
  { id: 'worms_eye', label: "Worm's Eye", desc: 'Extreme low' },
  { id: 'three_quarter_low', label: '3/4 Low', desc: 'Slight low + turn' },
  { id: 'profile_angle', label: 'Profile', desc: 'Side view, 90°' },
];

// ─── SCENE / BACKGROUND PRESETS ───────────────────────────────────
const SCENE_PRESETS = [
  { id: 'studio_white', label: 'White Studio' },
  { id: 'studio_dark', label: 'Dark Studio' },
  { id: 'studio_grey', label: 'Grey Studio' },
  { id: 'urban_street', label: 'Urban Street' },
  { id: 'urban_alley', label: 'Urban Alley' },
  { id: 'nature_outdoor', label: 'Outdoor Nature' },
  { id: 'golden_hour', label: 'Golden Hour' },
  { id: 'cafe_interior', label: 'Cafe' },
  { id: 'luxury_interior', label: 'Luxury Interior' },
  { id: 'beach', label: 'Beach' },
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'runway', label: 'Runway' },
  { id: 'abstract_gradient', label: 'Abstract' },
  { id: 'custom', label: 'Custom Scene' },
];

// Keep full desc map for prompt building
const SCENE_DESC_MAP = {
  studio_white: 'Clean white cyclorama studio', studio_dark: 'Moody black studio backdrop',
  studio_grey: 'Neutral grey seamless paper', urban_street: 'City street with architecture',
  urban_alley: 'Gritty industrial alleyway', nature_outdoor: 'Lush greenery, natural light',
  golden_hour: 'Warm sunset backlighting', cafe_interior: 'Cozy cafe interior setting',
  luxury_interior: 'High-end hotel or lounge', beach: 'Sandy beach with ocean backdrop',
  rooftop: 'Urban rooftop with skyline', runway: 'Fashion show runway setting',
  abstract_gradient: 'Soft abstract gradient background', custom: 'Describe your own scene in the prompt',
};

// ─── ASPECT RATIOS ────────────────────────────────────────────────
const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', width: 1024, height: 1024 },
  { id: '4:5', label: '4:5', width: 1024, height: 1280 },
  { id: '9:16', label: '9:16', width: 1024, height: 1792 },
  { id: '3:4', label: '3:4', width: 1024, height: 1365 },
  { id: '16:9', label: '16:9', width: 1792, height: 1024 },
];

const QUICK_SUGGESTIONS = [
  'Editorial white studio', 'Urban streetwear look', 'Golden hour outdoor',
  'Luxury lifestyle', 'Runway spotlights', 'Casual cafe', 'Flat-lay marble', 'Neon night city',
];

// ─── AVATAR MODELS ───────────────────────────────────────────────
const STORAGE_BASE = 'https://sfxpmzicgpaxfntqleig.supabase.co/storage/v1/object/public/generated-content/fashion-avatars';

const FASHION_AVATAR_MODELS = [
  {
    id: 'euro-male-01', name: 'Lucas', gender: 'male', description: '25yo European male model',
    characterPrompt: 'Young European male model, approximately 25 years old, with tousled wavy light brown hair with natural golden highlights, blue-green eyes, light stubble along jawline and chin, athletic lean build, strong jawline, defined cheekbones, fair skin with light sun-kissed complexion.',
    thumbnail: `${STORAGE_BASE}/euro-male-01/Warm_genuine_smile_-_eye_level.jpg`,
    trainingImages: [
      { id: 'warm_smile', url: `${STORAGE_BASE}/euro-male-01/Warm_genuine_smile_-_eye_level.jpg`, label: 'Warm Smile', desc: 'Front, eye-level', bestFor: ['standing_front', 'walking_casual', 'walking_street', 'pose_hands_pockets', 'sitting_casual'], angle: 'front', framing: 'three_quarter' },
      { id: 'confident_smirk', url: `${STORAGE_BASE}/euro-male-01/Confident_slight_smirk_-_45deg_angle.jpg`, label: 'Confident', desc: '45° angle', bestFor: ['standing_3q', 'walking_confident', 'pose_hand_hip', 'pose_editorial', 'pose_dynamic'], angle: '45deg', framing: 'three_quarter' },
      { id: 'serious_low', url: `${STORAGE_BASE}/euro-male-01/Serious_-_low_angle.jpg`, label: 'Serious', desc: 'Low angle', bestFor: ['pose_arms_crossed', 'pose_lean_wall', 'pose_crouch'], angle: 'low', framing: 'close_up' },
      { id: 'intense', url: `${STORAGE_BASE}/euro-male-01/Intense_-_dramatic_lighting.jpg`, label: 'Intense', desc: 'Dramatic mood', bestFor: ['pose_looking_away', 'sitting_lean', 'pose_editorial'], angle: 'front_down', framing: 'three_quarter' },
      { id: 'amused_close', url: `${STORAGE_BASE}/euro-male-01/Slightly_amused_-_close_crop.jpg`, label: 'Close-Up', desc: 'Close crop', bestFor: ['close_up', 'extreme_close', 'mid_shot'], angle: 'front_close', framing: 'close_up' },
      { id: 'side_profile', url: `${STORAGE_BASE}/euro-male-01/Thoughtful_-_side_profile.jpg`, label: 'Side Profile', desc: 'Full side view', bestFor: ['standing_side', 'standing_back', 'pose_over_shoulder', 'profile_angle'], angle: 'side', framing: 'upper_body' },
      { id: 'relaxed_above', url: `${STORAGE_BASE}/euro-male-01/Relaxed_candid_-_slightly_above.jpg`, label: 'Relaxed', desc: 'From above', bestFor: ['sitting_cross', 'high_angle', 'birds_eye', 'pose_jump'], angle: 'above', framing: 'upper_body' },
    ],
  },
  {
    id: 'euro-female-01', name: 'Sophia', gender: 'female', description: '25yo European female model',
    characterPrompt: 'Young European female model, approximately 25 years old, with long wavy honey-blonde hair, warm brown eyes, soft natural makeup, clear fair skin, slim feminine build, high cheekbones, gentle smile, natural elegance.',
    thumbnail: `${STORAGE_BASE}/euro-female-01/Genuine_warm_smile_eye_level.jpg`,
    trainingImages: [
      { id: 'warm_smile', url: `${STORAGE_BASE}/euro-female-01/Genuine_warm_smile_eye_level.jpg`, label: 'Warm Smile', desc: 'Front, eye-level', bestFor: ['standing_front', 'walking_casual', 'walking_street', 'pose_hands_pockets', 'sitting_casual'], angle: 'front', framing: 'three_quarter' },
      { id: 'confident_3q', url: `${STORAGE_BASE}/euro-female-01/Soft_confident_smile_45_three-quarter.jpg`, label: 'Confident 3/4', desc: '45° three-quarter', bestFor: ['standing_3q', 'walking_confident', 'pose_hand_hip', 'pose_editorial', 'pose_dynamic'], angle: '45deg', framing: 'three_quarter' },
      { id: 'serious_low', url: `${STORAGE_BASE}/euro-female-01/Serious_editorial_look_low_angle.jpg`, label: 'Serious', desc: 'Low angle', bestFor: ['pose_arms_crossed', 'pose_lean_wall', 'pose_crouch'], angle: 'low', framing: 'three_quarter' },
      { id: 'intense', url: `${STORAGE_BASE}/euro-female-01/Intense_fashion_look_dramatic_contrast.jpg`, label: 'Intense', desc: 'Dramatic contrast', bestFor: ['pose_looking_away', 'sitting_lean', 'pose_editorial'], angle: 'front_down', framing: 'three_quarter' },
      { id: 'curious_lean', url: `${STORAGE_BASE}/euro-female-01/Curious_expression_slight_forward_lean.jpg`, label: 'Curious', desc: 'Forward lean', bestFor: ['sitting_cross', 'pose_dynamic', 'pose_jump'], angle: 'front_close', framing: 'upper_body' },
      { id: 'side_profile', url: `${STORAGE_BASE}/euro-female-01/Thoughtful_side_profile_90_angle.jpg`, label: 'Side Profile', desc: 'Full side view', bestFor: ['standing_side', 'standing_back', 'pose_over_shoulder', 'profile_angle'], angle: 'side', framing: 'upper_body' },
      { id: 'relaxed_above', url: `${STORAGE_BASE}/euro-female-01/Relaxed_candid_camera_slightly_above.jpg`, label: 'Relaxed', desc: 'From above', bestFor: ['high_angle', 'birds_eye'], angle: 'above', framing: 'upper_body' },
      { id: 'playful_tilt', url: `${STORAGE_BASE}/euro-female-01/Subtle_playful_expression_slight_head_tilt.jpg`, label: 'Playful', desc: 'Head tilt', bestFor: ['close_up', 'extreme_close', 'mid_shot'], angle: 'front', framing: 'close_up' },
    ],
  },
];

function suggestBestReference(model, poseId, angleId, framingId) {
  if (!model?.trainingImages?.length) return null;
  let bestScore = -1;
  let bestImg = model.trainingImages[0];
  for (const img of model.trainingImages) {
    let score = 0;
    if (img.bestFor?.includes(poseId)) score += 3;
    if (angleId === 'profile_angle' && img.angle === 'side') score += 2;
    if (angleId === 'low_angle' && img.angle === 'low') score += 2;
    if (angleId === 'high_angle' && img.angle === 'above') score += 2;
    if (angleId === 'eye_level' && img.angle === 'front') score += 2;
    if (angleId === 'three_quarter_low' && img.angle === '45deg') score += 2;
    if (angleId === 'dutch_angle' && img.angle === '45deg') score += 1;
    if (framingId === img.framing) score += 1;
    if (framingId === 'close_up' && img.framing === 'close_up') score += 2;
    if (framingId === 'full_body' && img.framing === 'three_quarter') score += 1;
    if (score > bestScore) { bestScore = score; bestImg = img; }
  }
  return bestImg;
}

// ─── SHOT SETTINGS TAB SELECTOR ──────────────────────────────────
const SHOT_TABS = [
  { id: 'pose', label: 'Pose', icon: Move },
  { id: 'framing', label: 'Frame', icon: Maximize },
  { id: 'angle', label: 'Angle', icon: RotateCw },
  { id: 'scene', label: 'Scene', icon: Layers },
];

// ─── VEO VIDEO MODELS ───────────────────────────────────────────────
const VEO_MODELS = [
  { key: 'veo-3.1-fast', label: 'Veo 3.1 Fast', desc: 'Best value, good quality', cost: '$0.15/s' },
  { key: 'veo-3.1', label: 'Veo 3.1', desc: 'Best quality, fabric physics', cost: '$0.40/s' },
  { key: 'veo-3-fast', label: 'Veo 3 Fast', desc: 'Fast with audio', cost: '$0.15/s' },
  { key: 'veo-3', label: 'Veo 3', desc: 'High quality + audio', cost: '$0.40/s' },
  { key: 'veo-2', label: 'Veo 2', desc: 'Stable, no audio', cost: '$0.35/s' },
];

const VIDEO_DURATIONS = [
  { value: 4, label: '4s' },
  { value: 6, label: '6s' },
  { value: 8, label: '8s' },
];

// ─── CAMERA MOVEMENTS ───────────────────────────────────────────────
const CAMERA_MOVEMENTS = [
  { id: 'static', label: 'Static', desc: 'No camera movement', promptHint: 'Handheld static camera, no camera movement, real-time speed.' },
  { id: 'slow_zoom_in', label: 'Zoom In', desc: 'Close in on subject', promptHint: 'Gentle zoom in toward the subject at natural real-time speed.' },
  { id: 'slow_zoom_out', label: 'Zoom Out', desc: 'Pull back to reveal scene', promptHint: 'Gentle zoom out revealing the full outfit at natural real-time speed.' },
  { id: 'pan_left', label: 'Pan Left', desc: 'Camera pans left', promptHint: 'Camera pans from right to left at natural real-time speed.' },
  { id: 'pan_right', label: 'Pan Right', desc: 'Camera pans right', promptHint: 'Camera pans from left to right at natural real-time speed.' },
  { id: 'orbit_cw', label: 'Orbit CW', desc: 'Orbit clockwise around model', promptHint: 'Camera orbits clockwise around the subject at natural walking pace.' },
  { id: 'orbit_ccw', label: 'Orbit CCW', desc: 'Orbit counter-clockwise', promptHint: 'Camera orbits counter-clockwise around the subject at natural walking pace.' },
  { id: 'tilt_up', label: 'Tilt Up', desc: 'Camera tilts from low to high', promptHint: 'Camera tilts upward from feet to head at natural real-time speed.' },
  { id: 'tilt_down', label: 'Tilt Down', desc: 'Camera tilts from high to low', promptHint: 'Camera tilts downward from head to feet at natural real-time speed.' },
  { id: 'dolly_in', label: 'Dolly In', desc: 'Camera moves forward', promptHint: 'Camera moves forward toward the subject at natural walking pace.' },
  { id: 'dolly_out', label: 'Dolly Out', desc: 'Camera moves backward', promptHint: 'Camera moves backward away from the subject at natural walking pace.' },
  { id: 'crane_up', label: 'Crane Up', desc: 'Camera rises up', promptHint: 'Camera rises upward at natural real-time speed.' },
  { id: 'tracking', label: 'Tracking', desc: 'Follow model sideways', promptHint: 'Camera tracks sideways following the model as they walk at natural pace.' },
];

export default function FashionBooth({ embedded = false }) {
  const { user } = useUser();
  const { theme, toggleTheme, ct } = useTheme();

  const [activeMode, setActiveMode] = useState('booth');
  const [shotTab, setShotTab] = useState('pose');

  // State
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

  // Video animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [selectedVeoModel, setSelectedVeoModel] = useState('veo-3.1-fast');
  const [videoDuration, setVideoDuration] = useState(6);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [cameraMovement, setCameraMovement] = useState('static');

  // Outfit extractor
  const [extractorSourceUrl, setExtractorSourceUrl] = useState(null);
  const [extractorUploading, setExtractorUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPieces, setExtractedPieces] = useState([]);
  const [extractorGarments, setExtractorGarments] = useState([]);

  // Data loading
  useEffect(() => {
    if (user?.company_id) { loadProducts(); loadBrandAssets(); loadHistory(); }
  }, [user?.company_id]);

  const loadProducts = async () => {
    try { const data = await Product.filter({ company_id: user.company_id }); setProducts(data || []); }
    catch (e) { console.error('Error loading products:', e); }
  };
  const loadBrandAssets = async () => {
    try { const data = await BrandAssets.filter({ company_id: user.company_id }); if (data?.length > 0) setBrandAssets(data[0]); }
    catch (e) { console.error('Error loading brand assets:', e); }
  };
  const loadHistory = async () => {
    try { const data = await GeneratedContent.filter({ company_id: user.company_id, content_type: 'image' }, '-created_at', 20); setGenerationHistory(data || []); }
    catch (e) { console.error('Error loading history:', e); }
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

  // Auto-suggest best reference
  useEffect(() => {
    if (selectedAvatarModel) {
      const best = suggestBestReference(selectedAvatarModel, selectedPose, selectedAngle, selectedFraming);
      if (best && best.id !== selectedTrainingImage?.id) setSelectedTrainingImage(best);
    }
  }, [selectedPose, selectedAngle, selectedFraming]);

  // Upload handlers
  const handleGarmentUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploadingGarment(true);
    try {
      const fileName = `fashion-booth-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('generated-content').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('generated-content').getPublicUrl(fileName);
      setGarmentReferenceUrl(publicUrl); toast.success('Garment image uploaded');
    } catch (err) { toast.error('Failed to upload garment image'); }
    finally { setUploadingGarment(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    try {
      const fileName = `avatar-ref-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('generated-content').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('generated-content').getPublicUrl(fileName);
      setCustomAvatarUrl(publicUrl); setSelectedAvatarModel(null);
      setSelectedTrainingImage({ id: 'custom', url: publicUrl, label: 'Custom Upload' });
      toast.success('Avatar reference uploaded');
    } catch (err) { toast.error('Failed to upload avatar'); }
  };

  const handleProductSelect = async (product) => {
    setSelectedProduct(product); setProductSearch('');
    if (product) { await loadProductImages(product); } else { setProductImages([]); setGarmentReferenceUrl(null); }
  };

  // Build prompt
  const buildFashionPrompt = () => {
    const pose = POSE_PRESETS.find(p => p.id === selectedPose);
    const framing = FRAMING_OPTIONS.find(f => f.id === selectedFraming);
    const angle = CAMERA_ANGLES.find(a => a.id === selectedAngle);
    const sceneDesc = SCENE_DESC_MAP[selectedScene] || '';
    const isNoModel = pose?.category === 'no_model';
    let parts = [];
    parts.push('CRITICAL: Preserve the EXACT garment design from the reference image — same fabric texture, same color, same pattern, same stitching, same silhouette, same proportions, same details. Do NOT change the garment in any way.');
    if (isNoModel) {
      const poseDescs = { flat_lay: 'Professional flat-lay arrangement of the garment on a clean surface, styled with minimal props, shot from directly above', ghost_mannequin: 'The garment displayed on an invisible/ghost mannequin showing the natural 3D shape of the garment, no visible mannequin', hanger: 'The garment displayed on a premium wooden or velvet hanger against a clean backdrop', draped: 'The garment artfully draped over a chair, bench, or minimal furniture piece' };
      parts.push(poseDescs[selectedPose] || pose.desc);
    } else {
      if (selectedAvatarModel?.characterPrompt) {
        parts.push(`The model MUST look EXACTLY like the person in the avatar reference image. Character description for consistency: ${selectedAvatarModel.characterPrompt} The face, body type, skin tone, hair style, and overall appearance must be identical to the reference — this is the same person.`);
      } else if (selectedTrainingImage?.url) {
        parts.push(`The model should look EXACTLY like the person in the avatar reference image — same face, same body type, same skin tone, same hair. Character-consistent generation.`);
      }
      parts.push(`The model is ${pose.desc.toLowerCase()}.`);
      parts.push(`Camera framing: ${framing.label} shot (${framing.desc.toLowerCase()}).`);
      parts.push(`Camera angle: ${angle.label} (${angle.desc.toLowerCase()}).`);
    }
    if (sceneDesc && selectedScene !== 'custom') parts.push(`Scene/background: ${sceneDesc}.`);
    if (prompt.trim()) parts.push(prompt.trim());
    parts.push('Professional fashion photography, 85mm lens, f/4 aperture, crisp focus on garment details, editorial lighting, high-resolution.');
    return parts.join('\n\n');
  };

  // Generate
  const handleGenerate = async () => {
    if (!garmentReferenceUrl) { toast.error('Please upload a garment reference image first'); return; }
    setIsGenerating(true); setGeneratedImage(null);
    try {
      const fullPrompt = buildFashionPrompt();
      const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio);
      const garmentDesc = selectedProduct?.name || (prompt.trim() ? '' : 'the garment from the uploaded reference image');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          prompt: fullPrompt, original_prompt: prompt,
          product_context: selectedProduct ? { name: selectedProduct.name, description: selectedProduct.description || selectedProduct.short_description || '' } : { name: garmentDesc },
          product_images: garmentReferenceUrl ? [garmentReferenceUrl] : [], reference_image_url: garmentReferenceUrl,
          use_case: 'fashion_tryon', style: 'photorealistic', width: ratio?.width || 1024, height: ratio?.height || 1280, aspect_ratio: aspectRatio,
          brand_context: brandAssets ? { brand_name: brandAssets.brand_name, brand_colors: brandAssets.brand_colors, brand_style: brandAssets.brand_style } : null,
          is_fashion: true, fashion_booth: true, fashion_pose: selectedPose, fashion_framing: selectedFraming, fashion_angle: selectedAngle, fashion_scene: selectedScene,
          fashion_avatar_url: selectedTrainingImage?.url || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      if (data.url) {
        setGeneratedImage(data); toast.success('Fashion image generated!');
        try {
          await GeneratedContent.create({ company_id: user.company_id, created_by: user.id, content_type: 'image', url: data.url, name: `Fashion Booth - ${selectedProduct?.name || 'Custom'}`, generation_config: { source: 'fashion_booth', pose: selectedPose, framing: selectedFraming, angle: selectedAngle, scene: selectedScene, prompt }, tags: ['fashion_booth'] });
          loadHistory();
        } catch (saveErr) { console.warn('Failed to save to history:', saveErr); }
      }
    } catch (err) { toast.error(err.message || 'Generation failed'); }
    finally { setIsGenerating(false); }
  };

  const handleDownload = async () => {
    if (!generatedImage?.url) return;
    try {
      const response = await fetch(generatedImage.url); const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `fashion-booth-${Date.now()}.png`; a.click(); URL.revokeObjectURL(url); toast.success('Image downloaded');
    } catch (err) { toast.error('Download failed'); }
  };

  // ─── Animate (image → video) ──────────────────────────────────────
  const handleAnimate = async () => {
    if (!generatedImage?.url) { toast.error('Generate an image first'); return; }
    setIsAnimating(true); setGeneratedVideo(null);
    try {
      const poseLabel = POSE_PRESETS.find(p => p.id === selectedPose)?.label || 'standing';
      const sceneLabel = SCENE_PRESETS.find(s => s.id === selectedScene)?.label || 'studio';
      const camMove = CAMERA_MOVEMENTS.find(c => c.id === cameraMovement);
      const cameraHint = camMove?.promptHint || '';

      const motionPrompt = videoPrompt.trim()
        || [
          `Raw single-take video shot at natural real-time speed, no slow motion.`,
          `The fashion model moves naturally in a ${sceneLabel.toLowerCase()} setting — subtle weight shifts, a slight turn, natural breathing and micro-movements.`,
          `Real-time fabric movement, natural lighting. Shot on a handheld camera as if captured in one continuous unedited take.`,
          cameraHint,
          `Keep the model's face, body, and outfit exactly as they appear in the image.`,
        ].filter(Boolean).join(' ');

      // If user wrote a custom prompt, append camera movement
      const finalPrompt = videoPrompt.trim()
        ? `${videoPrompt.trim()} ${cameraHint}`.trim()
        : motionPrompt;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-fashion-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          image_url: generatedImage.url,
          prompt: finalPrompt,
          model_key: selectedVeoModel,
          duration_seconds: videoDuration,
          aspect_ratio: aspectRatio === '1:1' ? '16:9' : (aspectRatio === '9:16' || aspectRatio === '4:5' || aspectRatio === '3:4') ? '9:16' : '16:9',
          generate_audio: false,
          company_id: user?.company_id,
          user_id: user?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Video generation failed');

      if (data.url) {
        setGeneratedVideo(data);
        toast.success(`Video created with ${data.model_label || data.model}!`);
        try {
          await GeneratedContent.create({
            company_id: user.company_id, created_by: user.id, content_type: 'video',
            url: data.url, name: `Fashion Video - ${selectedProduct?.name || 'Custom'}`,
            generation_config: { source: 'fashion_video', model: data.model, duration: data.duration_seconds, pose: selectedPose, scene: selectedScene },
            tags: ['fashion_video'],
          });
        } catch (saveErr) { console.warn('Failed to save video to history:', saveErr); }
      }
    } catch (err) { toast.error(err.message || 'Video generation failed'); }
    finally { setIsAnimating(false); }
  };

  const handleDownloadVideo = async () => {
    if (!generatedVideo?.url) return;
    try {
      const response = await fetch(generatedVideo.url); const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `fashion-video-${Date.now()}.mp4`; a.click(); URL.revokeObjectURL(url); toast.success('Video downloaded');
    } catch (err) { toast.error('Download failed'); }
  };

  // Extractor handlers
  const handleExtractorUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setExtractorUploading(true);
    try {
      const fileName = `outfit-source-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('generated-content').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('generated-content').getPublicUrl(fileName);
      setExtractorSourceUrl(publicUrl); setExtractedPieces([]); setExtractorGarments([]); toast.success('Image uploaded');
    } catch (err) { toast.error('Failed to upload image'); }
    finally { setExtractorUploading(false); }
  };

  const handleExtract = async () => {
    if (!extractorSourceUrl) { toast.error('Please upload an image first'); return; }
    setIsExtracting(true); setExtractedPieces([]); setExtractorGarments([]);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ outfit_extract: true, outfit_source_url: extractorSourceUrl, company_id: user?.company_id, user_id: user?.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Extraction failed');
      if (data.pieces?.length > 0) {
        setExtractedPieces(data.pieces); setExtractorGarments(data.garments_identified || []);
        toast.success(`Extracted ${data.pieces.length} garment pieces!`);
        for (const piece of data.pieces) {
          try { await GeneratedContent.create({ company_id: user.company_id, created_by: user.id, content_type: 'image', url: piece.url, name: `Outfit Extract - ${piece.label}`, generation_config: { source: 'outfit_extractor', label: piece.label, description: piece.description, prompt: `Extracted ${piece.label} from outfit photo` }, tags: ['outfit_extractor', piece.label] }); }
          catch (saveErr) { console.warn('Failed to save piece:', saveErr); }
        }
      } else { toast.error('No garment pieces could be extracted'); }
    } catch (err) { toast.error(err.message || 'Extraction failed'); }
    finally { setIsExtracting(false); }
  };

  const handleDownloadPiece = async (piece) => {
    try {
      const response = await fetch(piece.url); const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `outfit-${piece.label}-${Date.now()}.png`; a.click(); URL.revokeObjectURL(url);
    } catch (err) { toast.error('Download failed'); }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 10);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 10);
  }, [products, productSearch]);

  const canGenerate = garmentReferenceUrl && !isGenerating;

  // ─── RENDER ─────────────────────────────────────────────────────
  return (
    <div className={embedded ? ct('bg-slate-50', 'bg-black') : `min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
      <div className="w-full px-4 lg:px-6 py-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Shirt className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white leading-tight">Fashion Studio</h1>
              <p className="text-[11px] text-zinc-500">AI fashion photography & outfit extraction</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900/60 border border-zinc-800/50 rounded-full p-0.5">
              <button
                onClick={() => setActiveMode('booth')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeMode === 'booth' ? 'bg-yellow-500/15 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Booth
              </button>
              <button
                onClick={() => setActiveMode('extractor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeMode === 'extractor' ? 'bg-yellow-500/15 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                Extractor
              </button>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-full bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 hover:text-white transition-colors">
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {activeMode === 'booth' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ height: 'calc(100vh - 120px)' }}>

          {/* ══ LEFT: Controls ══ */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-3 overflow-y-auto pr-1 pb-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>

            {/* ── Garment + Model (compact) ── */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shirt className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-white">Garment</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 ml-auto">Required</span>
              </div>

              {/* Product search */}
              <div className="relative mb-2">
                <input
                  type="text" placeholder="Search products..."
                  value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-950/60 border border-zinc-800/60 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500/40 focus:outline-none"
                />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-40 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => handleProductSelect(p)} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800/60 text-xs text-zinc-300">
                        {p.featured_image?.url && <img src={p.featured_image.url} className="w-6 h-6 rounded-lg object-cover" alt="" />}
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product images row */}
              {productImages.length > 0 && (
                <div className="flex gap-1.5 mb-2 overflow-x-auto">
                  {productImages.slice(0, 6).map((url, i) => (
                    <button key={i} onClick={() => setGarmentReferenceUrl(url)}
                      className={`w-10 h-10 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${garmentReferenceUrl === url ? 'border-yellow-500 ring-1 ring-yellow-500/30' : 'border-zinc-800/60 hover:border-zinc-700'}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Upload + preview inline */}
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-zinc-700/60 hover:border-yellow-500/40 bg-zinc-950/30 cursor-pointer transition-all group">
                  <input type="file" accept="image/*" onChange={handleGarmentUpload} className="hidden" />
                  {uploadingGarment ? <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-zinc-600 group-hover:text-yellow-400" />}
                  <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300">{uploadingGarment ? 'Uploading...' : 'Upload garment'}</span>
                </label>
                {garmentReferenceUrl && (
                  <div className="relative w-10 h-10 shrink-0">
                    <img src={garmentReferenceUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-yellow-500/30" />
                    <button onClick={() => { setGarmentReferenceUrl(null); setSelectedProduct(null); setProductImages([]); }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Model / Avatar (compact) ── */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-white">Model</span>
                <span className="text-[10px] text-zinc-600 ml-auto">optional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setSelectedAvatarModel(null); setSelectedTrainingImage(null); setCustomAvatarUrl(null); }}
                  className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border-2 transition-all ${!selectedAvatarModel && !customAvatarUrl ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800/60 hover:border-zinc-700 bg-zinc-950/50'}`}>
                  <Users className="w-4 h-4 text-zinc-500" />
                </button>
                {FASHION_AVATAR_MODELS.map(model => (
                  <button key={model.id}
                    onClick={() => { setSelectedAvatarModel(model); setCustomAvatarUrl(null); setSelectedTrainingImage(suggestBestReference(model, selectedPose, selectedAngle, selectedFraming)); }}
                    className={`w-10 h-10 rounded-lg shrink-0 overflow-hidden border-2 transition-all relative ${selectedAvatarModel?.id === model.id ? 'border-yellow-500 ring-1 ring-yellow-500/30' : 'border-zinc-800/60 hover:border-zinc-700'}`}>
                    <img src={model.thumbnail} alt={model.name} className="w-full h-full object-cover" />
                  </button>
                ))}
                {customAvatarUrl && (
                  <button onClick={() => { setSelectedAvatarModel(null); setSelectedTrainingImage({ id: 'custom', url: customAvatarUrl, label: 'Custom' }); }}
                    className={`w-10 h-10 rounded-lg shrink-0 overflow-hidden border-2 transition-all ${!selectedAvatarModel && customAvatarUrl ? 'border-yellow-500 ring-1 ring-yellow-500/30' : 'border-zinc-800/60 hover:border-zinc-700'}`}>
                    <img src={customAvatarUrl} alt="Custom" className="w-full h-full object-cover" />
                  </button>
                )}
                <label className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border border-dashed border-zinc-700/60 hover:border-yellow-500/40 cursor-pointer transition-all bg-zinc-950/30">
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <Upload className="w-3.5 h-3.5 text-zinc-600" />
                </label>
              </div>

              {/* Training image references (compact grid) */}
              {selectedAvatarModel && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-yellow-400/80">Reference angle</span>
                    <button onClick={() => { const best = suggestBestReference(selectedAvatarModel, selectedPose, selectedAngle, selectedFraming); setSelectedTrainingImage(best); toast.success(`Auto: ${best.label}`); }}
                      className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> Auto
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {selectedAvatarModel.trainingImages.map(img => (
                      <button key={img.id} onClick={() => setSelectedTrainingImage(img)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${selectedTrainingImage?.id === img.id ? 'border-yellow-500 ring-1 ring-yellow-500/30' : 'border-zinc-800/40 hover:border-zinc-700'}`}>
                        <img src={img.url} alt={img.label} className="w-full aspect-square object-cover" />
                        {selectedTrainingImage?.id === img.id && (
                          <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center"><Check className="w-3 h-3 text-yellow-400" /></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Shot Settings (tabbed card) ── */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-3 flex-1 min-h-0 flex flex-col">
              {/* Tab bar */}
              <div className="flex items-center gap-1 mb-2">
                {SHOT_TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setShotTab(tab.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        shotTab === tab.id ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                      }`}>
                      <Icon className="w-3 h-3" />{tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {shotTab === 'pose' && (
                  <div className="space-y-1">
                    {POSE_CATEGORIES.map(cat => {
                      const poses = POSE_PRESETS.filter(p => p.category === cat.id);
                      const isExpanded = expandedPoseCategory === cat.id;
                      const hasActive = poses.some(p => p.id === selectedPose);
                      return (
                        <div key={cat.id}>
                          <button onClick={() => setExpandedPoseCategory(isExpanded ? null : cat.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              hasActive ? 'bg-yellow-500/10 text-yellow-400' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
                            }`}>
                            <span>{cat.label} ({poses.length})</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {isExpanded && (
                            <div className="grid grid-cols-2 gap-1 py-1">
                              {poses.map(pose => (
                                <button key={pose.id} onClick={() => setSelectedPose(pose.id)}
                                  className={`text-left px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                                    selectedPose === pose.id ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'border border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/30'
                                  }`}>
                                  <span className="font-medium block leading-tight">{pose.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {shotTab === 'framing' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {FRAMING_OPTIONS.map(f => (
                      <button key={f.id} onClick={() => setSelectedFraming(f.id)}
                        className={`text-left px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                          selectedFraming === f.id ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'border border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/30'
                        }`}>
                        <span className="font-medium block">{f.label}</span>
                        <span className="text-zinc-500 text-[10px]">{f.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {shotTab === 'angle' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {CAMERA_ANGLES.map(a => (
                      <button key={a.id} onClick={() => setSelectedAngle(a.id)}
                        className={`text-left px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                          selectedAngle === a.id ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'border border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/30'
                        }`}>
                        <span className="font-medium block">{a.label}</span>
                        <span className="text-zinc-500 text-[10px]">{a.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {shotTab === 'scene' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {SCENE_PRESETS.map(s => (
                      <button key={s.id} onClick={() => setSelectedScene(s.id)}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                          selectedScene === s.id ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'border border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/30'
                        }`}>
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Aspect Ratio (compact strip) ── */}
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] text-zinc-500 shrink-0">Ratio</span>
              {ASPECT_RATIOS.map(r => (
                <button key={r.id} onClick={() => setAspectRatio(r.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    aspectRatio === r.id ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 border border-zinc-800/40 hover:text-zinc-300'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* ══ RIGHT: Prompt + Output ══ */}
          <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-3 overflow-y-auto pb-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>

            {/* ── Prompt + Quick chips ── */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-3">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, CREATE_LIMITS.PROMPT_MAX_LENGTH))}
                placeholder="Extra scene instructions: lighting, mood, props, styling... (optional)"
                className="min-h-[56px] bg-zinc-950/50 border-zinc-800/40 text-white placeholder-zinc-600 text-xs resize-none rounded-xl"
              />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {QUICK_SUGGESTIONS.map(chip => (
                  <button key={chip} onClick={() => setPrompt(prev => prev ? `${prev}, ${chip.toLowerCase()}` : chip)}
                    className="px-2 py-0.5 rounded-full text-[9px] bg-zinc-800/60 text-zinc-500 hover:text-yellow-300 hover:bg-yellow-500/10 border border-zinc-800/40 hover:border-yellow-500/20 transition-all">
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Summary + Generate ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-1.5 flex-wrap overflow-hidden">
                {garmentReferenceUrl && <Chip label="Garment" />}
                {selectedAvatarModel && <Chip label={selectedAvatarModel.name} />}
                <Chip label={POSE_PRESETS.find(p => p.id === selectedPose)?.label} />
                <Chip label={FRAMING_OPTIONS.find(f => f.id === selectedFraming)?.label} />
                <Chip label={CAMERA_ANGLES.find(a => a.id === selectedAngle)?.label} />
                <Chip label={SCENE_PRESETS.find(s => s.id === selectedScene)?.label} />
                <Chip label={aspectRatio} />
              </div>
              <button onClick={handleGenerate} disabled={!canGenerate}
                className={`shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 transition-all ${
                  canGenerate ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-lg shadow-yellow-500/20' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}>
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate <CreditCostBadge credits={12} /></>}
              </button>
            </div>

            {/* ── Generated Result ── */}
            <AnimatePresence mode="wait">
              {generatedImage && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] overflow-hidden flex-1">
                  <div className="relative">
                    <img src={generatedImage.url} alt="Generated fashion" className="w-full object-contain max-h-[400px]" />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button onClick={handleDownload} className="p-2 rounded-xl bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 transition-colors"><Download className="w-4 h-4" /></button>
                      <button onClick={handleGenerate} disabled={isGenerating} className="p-2 rounded-xl bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 transition-colors"><RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} /></button>
                    </div>
                  </div>

                  {/* ── Starting Shot (image → video) ── */}
                  <div className="px-3 py-2.5 border-t border-zinc-800/60">
                    {!showVideoSettings && !isAnimating ? (
                      <button
                        onClick={() => setShowVideoSettings(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black shadow-lg shadow-yellow-500/20 transition-all"
                      >
                        <Film className="w-4 h-4" />
                        Starting Shot
                        <span className="text-[10px] font-normal opacity-70">— Animate to video</span>
                      </button>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Model picker row */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-yellow-400">Google Veo Model</span>
                            <button onClick={() => { setShowVideoSettings(false); }} className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5">
                              <X className="w-3 h-3" /> Close
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {VEO_MODELS.map(m => (
                              <button
                                key={m.key}
                                onClick={() => setSelectedVeoModel(m.key)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                                  selectedVeoModel === m.key
                                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                    : 'text-zinc-500 border border-zinc-800/40 hover:text-zinc-300 hover:bg-zinc-800/30'
                                }`}
                              >
                                <span className="block">{m.label}</span>
                                <span className="text-[8px] opacity-60">{m.cost}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Camera Movement */}
                        <div>
                          <span className="text-[10px] font-semibold text-yellow-400 mb-1.5 block">Camera Movement</span>
                          <div className="flex flex-wrap gap-1.5">
                            {CAMERA_MOVEMENTS.map(c => (
                              <button
                                key={c.id}
                                onClick={() => setCameraMovement(c.id)}
                                title={c.desc}
                                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                  cameraMovement === c.id
                                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                    : 'text-zinc-500 border border-zinc-800/40 hover:text-zinc-300 hover:bg-zinc-800/30'
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                          {cameraMovement !== 'static' && (
                            <p className="text-[9px] text-zinc-600 mt-1">{CAMERA_MOVEMENTS.find(c => c.id === cameraMovement)?.desc}</p>
                          )}
                        </div>

                        {/* Duration + cost row */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500">Duration</span>
                            {VIDEO_DURATIONS.map(d => (
                              <button
                                key={d.value}
                                onClick={() => setVideoDuration(d.value)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                                  videoDuration === d.value
                                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                    : 'text-zinc-500 border border-zinc-800/40 hover:text-zinc-300'
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px] text-zinc-600 ml-auto">
                            Est. ~${(videoDuration * parseFloat((VEO_MODELS.find(m => m.key === selectedVeoModel)?.cost || '$0.15').replace('$','').replace('/s',''))).toFixed(2)}
                          </span>
                        </div>

                        {/* Custom motion prompt */}
                        <input
                          type="text"
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          placeholder="Custom motion: e.g. 'slow spin, hands on hips, fabric flowing' (optional — auto-generated if empty)"
                          className="w-full px-3 py-1.5 text-xs bg-zinc-950/50 border border-zinc-800/40 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500/40 focus:outline-none"
                        />

                        {/* Generate button */}
                        <button
                          onClick={handleAnimate}
                          disabled={isAnimating}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
                            isAnimating
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black shadow-lg shadow-yellow-500/20'
                          }`}
                        >
                          {isAnimating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Creating starting shot...</>
                          ) : (
                            <><Play className="w-4 h-4" />Create Starting Shot <CreditCostBadge credits={30} /></>
                          )}
                        </button>

                        {/* Progress bar */}
                        {isAnimating && (
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <div className="w-full bg-zinc-800/60 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                className="h-full bg-yellow-400/60 rounded-full"
                                initial={{ width: '5%' }}
                                animate={{ width: '90%' }}
                                transition={{ duration: 120, ease: 'linear' }}
                              />
                            </div>
                            <span className="shrink-0 whitespace-nowrap">~1-3 min</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Generated Video Result ── */}
            <AnimatePresence mode="wait">
              {generatedVideo && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] overflow-hidden">
                  <div className="relative">
                    <video
                      src={generatedVideo.url}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full max-h-[400px] object-contain bg-black"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button onClick={handleDownloadVideo} className="p-2 rounded-xl bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 transition-colors"><Download className="w-4 h-4" /></button>
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-black">
                        <Film className="w-3 h-3" />VIDEO
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{generatedVideo.model_label || generatedVideo.model}</span>
                      <span className="text-[10px] text-zinc-600">•</span>
                      <span className="text-[10px] text-zinc-500">{generatedVideo.duration_seconds}s</span>
                      {generatedVideo.cost_usd && (
                        <>
                          <span className="text-[10px] text-zinc-600">•</span>
                          <span className="text-[10px] text-zinc-500">${generatedVideo.cost_usd.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                    <button onClick={handleAnimate} disabled={isAnimating}
                      className="text-[10px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${isAnimating ? 'animate-spin' : ''}`} />New shot
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── History ── */}
            {generationHistory.length > 0 && (
              <div>
                <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 mb-2 transition-colors">
                  <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                  Recent ({generationHistory.length})
                </button>
                {showHistory && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {generationHistory.slice(0, 12).map(item => (
                      <div key={item.id} className="aspect-square rounded-xl overflow-hidden border border-zinc-800/40 hover:border-yellow-500/30 cursor-pointer transition-all" onClick={() => setGeneratedImage(item)}>
                        {item.url && <img src={item.url} alt="" className="w-full h-full object-cover" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        ) : (
        /* ══ OUTFIT EXTRACTOR MODE ══ */
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <Scissors className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Outfit Extractor</h2>
                <p className="text-[11px] text-zinc-500">Upload a photo — AI extracts each garment as individual product shots.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                {extractorSourceUrl ? (
                  <div className="relative">
                    <img src={extractorSourceUrl} alt="Source outfit" className="w-full max-h-[350px] object-contain rounded-xl border border-zinc-800/60" />
                    <button onClick={() => { setExtractorSourceUrl(null); setExtractedPieces([]); setExtractorGarments([]); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-zinc-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 h-56 rounded-xl border-2 border-dashed border-zinc-700 hover:border-yellow-500/40 bg-zinc-950/30 cursor-pointer transition-all group">
                    <input type="file" accept="image/*" onChange={handleExtractorUpload} className="hidden" />
                    {extractorUploading ? <Loader2 className="w-7 h-7 text-yellow-400 animate-spin" /> : (
                      <><Upload className="w-7 h-7 text-zinc-600 group-hover:text-yellow-400 transition-colors" />
                      <span className="text-xs text-zinc-500 group-hover:text-zinc-300">Upload outfit photo</span>
                      <span className="text-[10px] text-zinc-600">JPG, PNG up to 10MB</span></>
                    )}
                  </label>
                )}
              </div>

              <div className="flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-800/40">
                    <h3 className="text-[11px] font-semibold text-yellow-400 mb-1.5">How it works</h3>
                    <ol className="text-[10px] text-zinc-400 space-y-1 list-decimal list-inside">
                      <li>Upload a photo of someone wearing clothes</li>
                      <li>AI identifies each visible garment piece</li>
                      <li>Generates individual flat-lay product shots</li>
                    </ol>
                  </div>
                  {extractorGarments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {extractorGarments.map(g => (
                        <span key={g} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 capitalize">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleExtract} disabled={!extractorSourceUrl || isExtracting}
                  className={`w-full py-3 mt-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    extractorSourceUrl && !isExtracting ? 'bg-yellow-400 hover:bg-yellow-300 text-black' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}>
                  {isExtracting ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting...</> : <><Scissors className="w-4 h-4" />Extract Outfit</>}
                </button>
              </div>
            </div>
          </div>

          {extractedPieces.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <Grid3X3 className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold text-white">Extracted ({extractedPieces.length})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {extractedPieces.map((piece, i) => (
                  <motion.div key={piece.label + i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                    className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] overflow-hidden group">
                    <div className="relative">
                      <img src={piece.url} alt={piece.label} className="w-full aspect-square object-contain bg-zinc-950/50 p-2" />
                      <button onClick={() => handleDownloadPiece(piece)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"><Download className="w-3.5 h-3.5" /></button>
                      {piece.label === 'complete_outfit' && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-yellow-500 text-black text-[9px] font-bold">COMBINED</div>
                      )}
                    </div>
                    <div className="p-2.5 border-t border-zinc-800/40">
                      <span className="text-[11px] font-medium text-white capitalize">{piece.label === 'complete_outfit' ? 'Complete Outfit' : piece.label}</span>
                      {piece.description && piece.label !== 'complete_outfit' && <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">{piece.description}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

// ─── CHIP (summary badge) ────────────────────────────────────────
function Chip({ label }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 whitespace-nowrap">
      {label}
    </span>
  );
}
