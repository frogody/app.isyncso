/**
 * Dynamic Google Fonts loader.
 * Injects <link> tags on-demand with deduplication.
 */

const loadedFonts = new Set();

/**
 * Load a single Google Font by family name.
 * Optionally specify weights; defaults to all common weights.
 */
export function loadGoogleFont(family, weights) {
  if (loadedFonts.has(family)) return;
  if (typeof document === 'undefined') return;

  const weightStr = weights ? weights.join(';') : '400;500;600;700';
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightStr}&display=swap`;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);

  loadedFonts.add(family);
}

/**
 * Load multiple Google Fonts at once.
 * @param {Array<string|{family:string, weights?:number[]}>} fonts
 */
export function loadGoogleFonts(fonts) {
  for (const font of fonts) {
    if (typeof font === 'string') {
      loadGoogleFont(font);
    } else {
      loadGoogleFont(font.family, font.weights);
    }
  }
}

/** Check if a font family has already been loaded. */
export function isFontLoaded(family) {
  return loadedFonts.has(family);
}
