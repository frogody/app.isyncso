const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_ANALYSIS = {
  colorPalette: {
    primary: '#06b6d4',
    secondary: '#1a1a2e',
    background: '#0f0f0f',
    text: '#ffffff',
    accent: '#06b6d4',
  },
  typography: {
    style: 'modern',
    hasRoundedFonts: true,
    fontFamily: 'Inter',
    headingSize: 'medium',
    headingWeight: 'bold',
  },
  uiStyle: {
    cardStyle: 'elevated',
    borderRadius: 'medium',
    density: 'comfortable',
    shadowStyle: 'medium',
    spacing: 'normal',
  },
  components: [],
  layoutPattern: 'dashboard',
  overallVibe: 'professional',
  iconStyle: 'outlined',
};

/**
 * Analyzes product screenshots using AI vision to extract design system information.
 * Returns a structured analysis object with colors, typography, UI style, and layout info.
 *
 * Requires a working Anthropic API key configured on the edge function.
 *
 * @param {string[]} screenshots - Array of screenshot URLs
 * @param {string} productName - Product name for context
 * @returns {Promise<object>} Design analysis object
 */
export async function analyzeScreenshots(screenshots, productName) {
  if (!screenshots?.length) {
    return { ...DEFAULT_ANALYSIS };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/analyze-screenshots`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ screenshots, productName }),
      }
    );

    if (!response.ok) {
      console.warn('Screenshot analysis failed:', response.status);
      return { ...DEFAULT_ANALYSIS };
    }

    const data = await response.json();

    if (!data.success || !data.analysis) {
      console.warn('Screenshot analysis returned no data:', data.error);
      return { ...DEFAULT_ANALYSIS };
    }

    // Merge with defaults to fill any missing fields
    return {
      colorPalette: { ...DEFAULT_ANALYSIS.colorPalette, ...data.analysis.colorPalette },
      typography: { ...DEFAULT_ANALYSIS.typography, ...data.analysis.typography },
      uiStyle: { ...DEFAULT_ANALYSIS.uiStyle, ...data.analysis.uiStyle },
      components: data.analysis.components || DEFAULT_ANALYSIS.components,
      layoutPattern: data.analysis.layoutPattern || DEFAULT_ANALYSIS.layoutPattern,
      overallVibe: data.analysis.overallVibe || DEFAULT_ANALYSIS.overallVibe,
      iconStyle: data.analysis.iconStyle || DEFAULT_ANALYSIS.iconStyle,
    };
  } catch (error) {
    console.error('Screenshot analysis error:', error);
    return { ...DEFAULT_ANALYSIS };
  }
}

export { DEFAULT_ANALYSIS };
