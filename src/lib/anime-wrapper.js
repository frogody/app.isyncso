// Wrapper to ensure proper ES module export of anime.js
// This file acts as a stable interface for anime.js imports
// eslint-disable-next-line import/no-unresolved
import * as animeModule from 'animejs/lib/anime.es.js';

// anime.es.js exports anime as default
const anime = animeModule.default || animeModule;

// Re-export as default
export default anime;
