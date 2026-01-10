// Wrapper to ensure proper ES module export of anime.js
// Import directly from node_modules to avoid alias issues
import animeLib from '../../node_modules/animejs/lib/anime.es.js';

// Re-export as default
export default animeLib;

// Also export as named export for flexibility
export const anime = animeLib;
