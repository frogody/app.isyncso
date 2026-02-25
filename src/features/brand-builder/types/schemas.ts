// =============================================================================
// ISYNCSO Brand Builder — Type Definitions
// =============================================================================
// Imported from spec. BrandProject adapted to match our database schema.
// Stage-specific interfaces are complete for IDE intellisense.
// =============================================================================

type HexColor = string;
type SVGData = string;
type AssetPath = string;

// ---------------------------------------------------------------------------
// STAGE 1: Brand DNA
// ---------------------------------------------------------------------------

export interface BrandDNA {
  company_name: string;
  tagline: string | null;
  industry: IndustrySpec;
  company_stage: "startup" | "growing" | "established" | "rebrand";
  personality_vector: PersonalityVector;
  personality_description: string;
  visual_preference_vector: number[];
  selected_direction_ids: string[];
  strategy: BrandStrategy;
  competitor_brands: string[];
  must_words: string[];
  must_not_words: string[];
  existing_assets: ExistingAssets | null;
}

export interface IndustrySpec {
  primary: string;
  sub: string;
  sic_code: string;
}

export type PersonalityVector = [number, number, number, number, number];

export interface BrandStrategy {
  mission: string;
  vision: string;
  values: BrandValue[];
  positioning: PositioningStatement;
  brand_story: string;
  tagline_options: string[];
  elevator_pitch: string;
}

export interface BrandValue {
  name: string;
  description: string;
  behavioral_example: string;
}

export interface PositioningStatement {
  target: string;
  category: string;
  differentiation: string;
  reason_to_believe: string;
  statement: string;
}

export interface ExistingAssets {
  logo_files: AssetPath[];
  extracted_colors: HexColor[];
  extracted_fonts: string[];
  extracted_url: string | null;
  brand_audit_gaps: string[];
}

// ---------------------------------------------------------------------------
// STAGE 2: Color System
// ---------------------------------------------------------------------------

export interface ColorSystem {
  palette: ColorPalette;
  usage_rules: ColorUsageRules;
  specifications: Record<string, ColorSpec>;
  accessibility: AccessibilityReport;
  mood: string;
  temperature: "warm" | "cool" | "neutral";
  saturation_level: "muted" | "moderate" | "vibrant";
}

export interface ColorPalette {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  neutrals: NeutralScale;
  semantic: SemanticColors;
  extended: ExtendedColors;
  dark_mode: DarkModeColors;
}

export interface ColorScale {
  base: HexColor;
  light: HexColor;
  dark: HexColor;
  ramp: Record<number, HexColor>;
}

export interface NeutralScale {
  white: HexColor;
  light_gray: HexColor;
  mid_gray: HexColor;
  dark_gray: HexColor;
  near_black: HexColor;
  ramp: Record<number, HexColor>;
}

export interface SemanticColors {
  success: HexColor;
  warning: HexColor;
  error: HexColor;
  info: HexColor;
}

export interface ExtendedColors {
  gradients: GradientSpec[];
}

export interface GradientSpec {
  name: string;
  from: HexColor;
  to: HexColor;
  angle: number;
  css: string;
}

export interface DarkModeColors {
  background: HexColor;
  surface: HexColor;
  primary: HexColor;
  secondary: HexColor;
  text_primary: HexColor;
  text_secondary: HexColor;
}

export interface ColorUsageRules {
  primary_ratio: number;
  secondary_ratio: number;
  accent_ratio: number;
  background_default: "white" | "light_gray" | "near_black";
  text_on_light: HexColor;
  text_on_dark: HexColor;
  link_color: HexColor;
  link_hover: HexColor;
}

export interface ColorSpec {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  cmyk: { c: number; m: number; y: number; k: number };
  pantone: string | null;
  css_variable: string;
  tailwind_key: string;
}

export interface AccessibilityReport {
  contrast_matrix: Record<string, Record<string, number>>;
  wcag_aa_pairs: [string, string][];
  wcag_aaa_pairs: [string, string][];
  colorblind_safe: boolean;
}

// ---------------------------------------------------------------------------
// STAGE 3: Typography System
// ---------------------------------------------------------------------------

export interface TypographySystem {
  primary_font: FontSpec;
  secondary_font: FontSpec;
  accent_font: FontSpec | null;
  scale: TypeScale;
  scale_ratio: number;
  base_size: number;
  pairing_rationale: string;
  usage_rules: TypographyRules;
  css_declarations: string;
  tailwind_config: Record<string, any>;
}

export interface FontSpec {
  family: string;
  classification: string;
  weights_available: number[];
  source: "google_fonts" | "licensed" | "system";
  license: string;
  google_fonts_url: string | null;
  files: {
    woff2: Record<number, AssetPath>;
    woff: Record<number, AssetPath>;
    otf: Record<number, AssetPath>;
    ttf: Record<number, AssetPath>;
  };
}

export interface TypeScale {
  display_1: TypeSpec;
  display_2: TypeSpec;
  h1: TypeSpec;
  h2: TypeSpec;
  h3: TypeSpec;
  h4: TypeSpec;
  h5: TypeSpec;
  h6: TypeSpec;
  body_large: TypeSpec;
  body: TypeSpec;
  body_small: TypeSpec;
  caption: TypeSpec;
  overline: TypeSpec;
  button: TypeSpec;
  code: TypeSpec;
}

export interface TypeSpec {
  font_family: string;
  font_weight: number;
  font_size_px: number;
  font_size_rem: number;
  line_height: number;
  letter_spacing: string;
  text_transform: "none" | "uppercase" | "capitalize";
  responsive: { mobile_size_px: number; tablet_size_px: number };
}

export interface TypographyRules {
  heading_font_usage: string;
  body_font_usage: string;
  never_combine: string[];
  minimum_body_size: number;
  maximum_line_length: string;
  paragraph_spacing: string;
}

// ---------------------------------------------------------------------------
// STAGE 4: Logo System
// ---------------------------------------------------------------------------

export interface LogoSystem {
  concept: LogoConcept;
  variations: LogoVariations;
  rules: LogoRules;
  grid: LogoGrid;
  exports: LogoExports;
}

export interface LogoConcept {
  svg_source: SVGData;
  design_rationale: string;
  icon_keywords: string[];
  style: "icon_wordmark" | "wordmark_only" | "lettermark" | "abstract";
}

export interface LogoVariations {
  primary: LogoVariation;
  secondary: LogoVariation;
  submark: LogoVariation;
  wordmark: LogoVariation;
  favicon: LogoVariation;
  social_avatar: LogoVariation;
}

export interface LogoVariation {
  color_modes: {
    full_color_light: SVGData;
    full_color_dark: SVGData;
    full_color_on_brand: SVGData;
    reversed: SVGData;
    mono_black: SVGData;
    mono_white: SVGData;
    grayscale: SVGData;
  };
}

export interface LogoRules {
  clear_space: { unit: string; value: number; description: string };
  minimum_size: { digital_px: number; print_mm: number };
  approved_backgrounds: HexColor[];
  donts: LogoDont[];
}

export interface LogoDont {
  description: string;
  example_svg: SVGData;
  rule_id: string;
}

export interface LogoGrid {
  svg: SVGData;
  description: string;
}

export type LogoExports = Record<string, Record<string, Record<string, AssetPath>>>;

// ---------------------------------------------------------------------------
// STAGE 5: Verbal Identity
// ---------------------------------------------------------------------------

export interface VerbalIdentity {
  voice_attributes: VoiceAttribute[];
  tone_spectrum: ToneContext[];
  writing_guidelines: WritingGuidelines;
  messaging_framework: MessagingSegment[];
}

export interface VoiceAttribute {
  attribute: string;
  description: string;
  spectrum: { we_are: string; we_are_not: string };
  example_sentences: {
    social_media: string;
    website_hero: string;
    email_subject: string;
    error_message: string;
    customer_support: string;
  };
}

export interface ToneContext {
  context: string;
  formality: number;
  humor: number;
  technicality: number;
  warmth: number;
  example_paragraph: string;
}

export interface WritingGuidelines {
  vocabulary: {
    preferred_words: { word: string; instead_of: string; why: string }[];
    banned_words: { word: string; why: string }[];
    jargon_policy: "avoid" | "use_sparingly" | "embrace";
    emoji_policy: "never" | "sparingly" | "frequently";
  };
  grammar_style: GrammarStyle;
  do_dont_pairs: { do_example: { text: string; explanation: string }; dont_example: { text: string; explanation: string } }[];
  sample_copy: SampleCopy;
}

export interface GrammarStyle {
  oxford_comma: boolean;
  sentence_length: "short" | "medium" | "varied";
  paragraph_length: "brief" | "moderate" | "detailed";
  active_voice_preference: boolean;
  contraction_usage: "never" | "sometimes" | "always";
  exclamation_marks: "never" | "rarely" | "frequently";
  capitalization: "sentence_case" | "title_case" | "all_caps_headings";
}

export interface SampleCopy {
  homepage_hero: { headline: string; subheadline: string; cta: string };
  about_page_intro: string;
  social_media_post: string;
  email_newsletter_opening: string;
  product_description: string;
  four_oh_four_page: string;
  onboarding_welcome: string;
}

export interface MessagingSegment {
  audience_segment: string;
  key_message: string;
  proof_points: string[];
  tone_adjustment: string;
}

// ---------------------------------------------------------------------------
// STAGE 6: Visual Language
// ---------------------------------------------------------------------------

export interface VisualLanguage {
  photography: PhotographyStyle;
  illustration: IllustrationStyle;
  iconography: IconographySystem;
  patterns: PatternSystem;
}

export interface PhotographyStyle {
  mood: string;
  lighting: string;
  composition: string;
  color_treatment: string;
  subjects: string;
  on_brand_descriptors: string[];
  off_brand_descriptors: string[];
  reference_image_urls: string[];
  overlay_rules: {
    allowed_overlays: { color: HexColor; opacity: number }[];
    text_on_photo: { treatment: string; min_contrast: number };
  };
}

export interface IllustrationStyle {
  style: string;
  line_weight: string;
  corner_radius: string;
  color_usage: string;
  complexity: string;
  geometric_properties: { primary_shapes: string[]; stroke_style: string; fill_style: string };
}

export interface IconographySystem {
  style: "outlined" | "filled" | "duotone";
  stroke_weight: number;
  grid_size: number;
  corner_radius: number;
  color_rules: string;
  base_set: { name: string; svg: SVGData; keywords: string[] }[];
}

export interface PatternSystem {
  patterns: { name: string; svg_tile: SVGData; usage: string; scale_range: { min: number; max: number }; color_variants: { foreground: HexColor; background: HexColor }[] }[];
  graphic_devices: { name: string; svg: SVGData; usage: string; derived_from: string }[];
}

// ---------------------------------------------------------------------------
// STAGE 7: Applications
// ---------------------------------------------------------------------------

export interface Applications {
  stationery: { business_card_front: AssetPath; business_card_back: AssetPath; letterhead: AssetPath; envelope: AssetPath };
  digital: { email_signature_html: string; email_signature_assets: AssetPath[]; social_profiles: Record<string, AssetPath>; social_covers: Record<string, AssetPath>; social_post_templates: AssetPath[]; og_image: AssetPath; zoom_background: AssetPath };
  presentation: { pptx: AssetPath; keynote: AssetPath | null; slides: { type: string; name: string; preview: AssetPath }[] };
  website_mockup: { html: AssetPath; screenshot_desktop: AssetPath; screenshot_mobile: AssetPath };
}

// ---------------------------------------------------------------------------
// STAGE 8: Brand Book + Export
// ---------------------------------------------------------------------------

export interface BrandBook {
  pdf_path: AssetPath;
  quick_reference_pdf_path: AssetPath;
  html_path: AssetPath;
  page_count: number;
  sections: { id: string; title: string; page_start: number; page_end: number }[];
}

export interface ExportPackage {
  zip_path: AssetPath;
  total_files: number;
  total_size_mb: number;
  manifest: {
    folders: { path: string; description: string; file_count: number }[];
    files: { path: string; format: string; size_bytes: number; category: string }[];
  };
}

// ---------------------------------------------------------------------------
// MASTER STATE: Brand Project (matches our DB schema)
// ---------------------------------------------------------------------------

export interface BrandProject {
  id: string;
  company_id: string;
  created_by: string;
  name: string;
  status: "draft" | "active" | "completed" | "archived";
  current_stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  brand_dna: BrandDNA | null;
  color_system: ColorSystem | null;
  typography_system: TypographySystem | null;
  logo_system: LogoSystem | null;
  verbal_identity: VerbalIdentity | null;
  visual_language: VisualLanguage | null;
  applications: Applications | null;
  brand_book: BrandBook | null;
  wizard_state: WizardState;
  export_package: ExportPackage | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// WIZARD STATE
// ---------------------------------------------------------------------------

export interface WizardState {
  current_screen?: string;
  completed_screens?: string[];
  entry_path?: "scratch" | "import";
  moodboard_selections?: string[];
  color_candidates?: ColorPalette[];
  selected_color_index?: number | null;
  typography_choices?: ("left" | "right")[];
  typography_candidates?: { primary: FontSpec; secondary: FontSpec }[];
  selected_typography_index?: number | null;
  logo_candidates?: LogoConcept[];
  selected_logo_index?: number | null;
  voice_candidates?: VoiceAttribute[][];
  selected_voice_index?: number | null;
}

// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------

export interface GenerationRequest {
  project_id: string;
  stage: number;
  inputs: Record<string, any>;
}

export interface GenerationResponse {
  project_id: string;
  stage: number;
  status: "generating" | "completed" | "error";
  candidates?: any[];
  selected?: any;
  error?: string;
}

export interface RegenerationRequest {
  project_id: string;
  stage: number;
  changed_fields: string[];
}
