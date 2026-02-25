/**
 * SVG string → PNG data URL converter for PDF embedding.
 * Uses browser canvas to rasterize SVGs into base64 PNGs
 * that @react-pdf/renderer can embed via <Image>.
 */

/**
 * Convert a single SVG string to a PNG data URL.
 * @param {string} svgString — raw SVG markup
 * @param {number} width — output pixel width
 * @param {number} height — output pixel height
 * @returns {Promise<string|null>} base64 PNG data URL or null on failure
 */
export function svgToPng(svgString, width = 400, height = 400) {
  if (!svgString) return Promise.resolve(null);

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Batch-convert multiple SVGs to PNGs in parallel.
 * @param {{ key: string, svg: string, width: number, height: number }[]} items
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<Record<string, string|null>>} key → data URL map
 */
export async function batchSvgToPng(items, onProgress) {
  const result = {};
  let done = 0;
  const total = items.length;

  // Process in chunks of 6 to avoid overwhelming the browser
  const CHUNK = 6;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const pngs = await Promise.all(
      chunk.map((item) => svgToPng(item.svg, item.width, item.height)),
    );
    chunk.forEach((item, idx) => {
      result[item.key] = pngs[idx];
    });
    done += chunk.length;
    onProgress?.(done, total);
  }

  return result;
}

/**
 * Fetch a remote image URL and convert to base64 data URL for PDF embedding.
 */
async function fetchUrlAsDataUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Batch-fetch multiple image URLs as data URLs.
 */
async function batchFetchUrls(items) {
  const result = {};
  const CHUNK = 4;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const dataUrls = await Promise.all(
      chunk.map((item) => fetchUrlAsDataUrl(item.url))
    );
    chunk.forEach((item, idx) => {
      result[item.key] = dataUrls[idx];
    });
  }
  return result;
}

/**
 * Extract ALL SVGs from a completed brand project and convert to PNGs.
 * Also fetches AI-generated image URLs and converts them to base64.
 * Organized by section for the PDF renderer.
 */
export async function prepareAllImages(project, onProgress) {
  const items = [];

  // ── Cover: primary logo ───────────────────────────────────────
  const primaryLogo =
    project?.logo_system?.variations?.primary?.color_modes?.full_color_light;
  if (primaryLogo) {
    items.push({ key: 'cover_logo', svg: primaryLogo, width: 600, height: 400 });
  }

  // ── Logos: key variations (subset — not all 42) ───────────────
  const variations = project?.logo_system?.variations;
  if (variations) {
    const varNames = ['primary', 'secondary', 'submark', 'wordmark', 'favicon', 'social_avatar'];
    const modes = ['full_color_light', 'full_color_dark', 'mono_black', 'mono_white'];
    for (const v of varNames) {
      for (const m of modes) {
        const svg = variations[v]?.color_modes?.[m];
        if (svg) {
          items.push({ key: `logo_${v}_${m}`, svg, width: 400, height: 300 });
        }
      }
    }
  }

  // ── Logo grid SVG ─────────────────────────────────────────────
  const gridSvg = project?.logo_system?.grid?.svg;
  if (gridSvg) {
    items.push({ key: 'logo_grid', svg: gridSvg, width: 600, height: 600 });
  }

  // ── Iconography base set ──────────────────────────────────────
  const icons = project?.visual_language?.iconography?.base_set || [];
  icons.forEach((icon, i) => {
    if (icon.svg) {
      items.push({ key: `icon_${i}`, svg: icon.svg, width: 200, height: 200 });
    }
  });

  // ── Patterns ──────────────────────────────────────────────────
  const patterns = project?.visual_language?.patterns?.patterns || [];
  patterns.forEach((pat, i) => {
    if (pat.svg_tile) {
      items.push({ key: `pattern_${i}`, svg: pat.svg_tile, width: 300, height: 300 });
    }
  });

  // ── Graphic devices ───────────────────────────────────────────
  const devices = project?.visual_language?.patterns?.graphic_devices || [];
  devices.forEach((dev, i) => {
    if (dev.svg) {
      items.push({ key: `device_${i}`, svg: dev.svg, width: 300, height: 200 });
    }
  });

  // ── Stationery ────────────────────────────────────────────────
  const st = project?.applications?.stationery;
  if (st) {
    if (st.business_card_front)
      items.push({ key: 'stationery_card_front', svg: st.business_card_front, width: 700, height: 400 });
    if (st.business_card_back)
      items.push({ key: 'stationery_card_back', svg: st.business_card_back, width: 700, height: 400 });
    if (st.letterhead)
      items.push({ key: 'stationery_letterhead', svg: st.letterhead, width: 500, height: 707 });
    if (st.envelope)
      items.push({ key: 'stationery_envelope', svg: st.envelope, width: 700, height: 322 });
  }

  // ── Digital ───────────────────────────────────────────────────
  const dg = project?.applications?.digital;
  if (dg) {
    // Social profiles
    const profiles = dg.social_profiles || {};
    for (const [platform, svg] of Object.entries(profiles)) {
      if (svg) items.push({ key: `social_profile_${platform}`, svg, width: 300, height: 300 });
    }
    // Social covers
    const covers = dg.social_covers || {};
    for (const [platform, svg] of Object.entries(covers)) {
      if (svg) items.push({ key: `social_cover_${platform}`, svg, width: 600, height: 200 });
    }
    // Social post
    if (dg.social_post_templates?.[0])
      items.push({ key: 'social_post', svg: dg.social_post_templates[0], width: 500, height: 500 });
    // OG image
    if (dg.og_image)
      items.push({ key: 'og_image', svg: dg.og_image, width: 600, height: 315 });
    // Zoom background
    if (dg.zoom_background)
      items.push({ key: 'zoom_bg', svg: dg.zoom_background, width: 640, height: 360 });
  }

  // ── Presentation slides ───────────────────────────────────────
  const slides = project?.applications?.presentation?.slides || [];
  slides.forEach((slide, i) => {
    if (slide.preview) {
      items.push({ key: `slide_${i}`, svg: slide.preview, width: 640, height: 360 });
    }
  });

  // ── Website mockups ───────────────────────────────────────────
  const web = project?.applications?.website_mockup;
  if (web) {
    if (web.screenshot_desktop)
      items.push({ key: 'web_desktop', svg: web.screenshot_desktop, width: 720, height: 450 });
    if (web.screenshot_mobile)
      items.push({ key: 'web_mobile', svg: web.screenshot_mobile, width: 300, height: 650 });
  }

  // ── Batch convert SVGs ────────────────────────────────────────
  const images = await batchSvgToPng(items, onProgress);

  // ── AI-generated images (fetch URLs → base64) ───────────────
  const urlItems = [];

  // AI logos (stored in brand_dna._aiLogos)
  const aiLogos = project?.brand_dna?._aiLogos || [];
  aiLogos.forEach((logo, i) => {
    if (logo?.url) urlItems.push({ key: `ai_logo_${i}`, url: logo.url });
  });

  // AI mockups (stored in applications._aiMockups)
  const aiMockups = project?.applications?._aiMockups || {};
  for (const [type, url] of Object.entries(aiMockups)) {
    if (url && typeof url === 'string' && !type.endsWith('_error')) {
      urlItems.push({ key: `ai_mockup_${type}`, url });
    }
  }

  // AI visual examples (stored in visual_language._aiExamples)
  const aiExamples = project?.visual_language?._aiExamples || {};
  (aiExamples.photography || []).forEach((img, i) => {
    if (img?.url) urlItems.push({ key: `ai_photo_${i}`, url: img.url });
  });
  (aiExamples.illustration || []).forEach((img, i) => {
    if (img?.url) urlItems.push({ key: `ai_illustration_${i}`, url: img.url });
  });

  if (urlItems.length > 0) {
    const aiImages = await batchFetchUrls(urlItems);
    Object.assign(images, aiImages);
  }

  return images;
}
