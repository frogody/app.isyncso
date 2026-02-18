// ---------------------------------------------------------------------------
// Reach Marketing Hub -- Platform & Campaign Constants
// ---------------------------------------------------------------------------

/**
 * Supported advertising placements with their native dimensions,
 * caption limits, and the Lucide icon name used in the UI.
 */
export const PLATFORMS = {
  instagram_feed: { name: 'Instagram Feed', width: 1080, height: 1080, maxCaption: 2200, icon: 'Instagram' },
  instagram_stories: { name: 'Instagram Stories/Reels', width: 1080, height: 1920, maxCaption: 2200, icon: 'Instagram' },
  facebook_feed: { name: 'Facebook Feed', width: 1200, height: 628, maxCaption: 63206, icon: 'Facebook' },
  facebook_stories: { name: 'Facebook Stories', width: 1080, height: 1920, maxCaption: 2200, icon: 'Facebook' },
  linkedin_feed: { name: 'LinkedIn Feed', width: 1200, height: 627, maxCaption: 3000, icon: 'Linkedin' },
  linkedin_sidebar: { name: 'LinkedIn Sidebar', width: 300, height: 250, maxCaption: 150, icon: 'Linkedin' },
  tiktok_feed: { name: 'TikTok Feed', width: 1080, height: 1920, maxCaption: 2200, icon: 'Music2' },
  google_display: { name: 'Google Display', width: 728, height: 90, maxCaption: 90, icon: 'Globe' },
  google_search: { name: 'Google Search', width: null, height: null, maxHeadline: 30, maxDescription: 90, icon: 'Search' },
  youtube_preroll: { name: 'YouTube Pre-roll', width: 1920, height: 1080, maxCaption: 100, icon: 'Youtube' },
};

/**
 * Creative / ad format types available when building a variant.
 */
export const AD_TYPES = [
  { value: 'single_image', label: 'Single Image' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'video', label: 'Video' },
  { value: 'story_reel', label: 'Story / Reel' },
  { value: 'text_image', label: 'Text + Image' },
];

/**
 * High-level campaign objectives that drive optimisation strategy.
 */
export const CAMPAIGN_GOALS = [
  { value: 'awareness', label: 'Awareness', description: 'Increase brand visibility and reach' },
  { value: 'traffic', label: 'Traffic', description: 'Drive visitors to your website' },
  { value: 'conversions', label: 'Conversions', description: 'Generate leads and sales' },
  { value: 'retargeting', label: 'Retargeting', description: 'Re-engage previous visitors' },
];

/**
 * Tone-of-voice presets for AI copy generation.
 */
export const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'bold', label: 'Bold' },
  { value: 'playful', label: 'Playful' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'minimal', label: 'Minimal' },
];

/**
 * Copy-generation use-case templates shown in the AI copywriter.
 */
export const COPY_USE_CASES = [
  { value: 'ad_copy', label: 'Ad Copy', icon: 'Megaphone' },
  { value: 'email_campaign', label: 'Email Campaign', icon: 'Mail' },
  { value: 'landing_page', label: 'Landing Page', icon: 'Layout' },
  { value: 'social_caption', label: 'Social Captions', icon: 'MessageCircle' },
  { value: 'product_description', label: 'Product Description', icon: 'Package' },
  { value: 'cold_outreach', label: 'Cold Outreach', icon: 'Send' },
];

// ---------------------------------------------------------------------------
// Status maps -- each status maps to a display label and a Tailwind color
// token used for badges, dots, and background tints.
// ---------------------------------------------------------------------------

export const POST_STATUSES = {
  draft: { label: 'Draft', color: 'zinc' },
  scheduled: { label: 'Scheduled', color: 'blue' },
  publishing: { label: 'Publishing', color: 'cyan' },
  published: { label: 'Published', color: 'green' },
  partial: { label: 'Partial', color: 'amber' },
  failed: { label: 'Failed', color: 'red' },
};

export const CAMPAIGN_STATUSES = {
  draft: { label: 'Draft', color: 'zinc' },
  active: { label: 'Active', color: 'cyan' },
  paused: { label: 'Paused', color: 'amber' },
  completed: { label: 'Completed', color: 'green' },
};

export const VARIANT_STATUSES = {
  draft: { label: 'Draft', color: 'zinc' },
  approved: { label: 'Approved', color: 'cyan' },
  exported: { label: 'Exported', color: 'blue' },
  published: { label: 'Published', color: 'green' },
};

// ---------------------------------------------------------------------------
// Platform grouping for the selector UI
// ---------------------------------------------------------------------------

export const PLATFORM_GROUPS = {
  instagram: { label: 'Instagram', placements: ['instagram_feed', 'instagram_stories'] },
  facebook: { label: 'Facebook', placements: ['facebook_feed', 'facebook_stories'] },
  linkedin: { label: 'LinkedIn', placements: ['linkedin_feed', 'linkedin_sidebar'] },
  tiktok: { label: 'TikTok', placements: ['tiktok_feed'] },
  google: { label: 'Google', placements: ['google_display', 'google_search'] },
  youtube: { label: 'YouTube', placements: ['youtube_preroll'] },
};

// ---------------------------------------------------------------------------
// Social platforms for connections / publishing integrations
// ---------------------------------------------------------------------------

export const SOCIAL_PLATFORMS = {
  instagram: { name: 'Instagram', icon: 'Instagram', color: '#E4405F' },
  facebook: { name: 'Facebook', icon: 'Facebook', color: '#1877F2' },
  linkedin: { name: 'LinkedIn', icon: 'Linkedin', color: '#0A66C2' },
  twitter: { name: 'X / Twitter', icon: 'Twitter', color: '#1DA1F2' },
  tiktok: { name: 'TikTok', icon: 'Music2', color: '#000000' },
  google_analytics: { name: 'Google Analytics', icon: 'BarChart3', color: '#F9AB00' },
};
