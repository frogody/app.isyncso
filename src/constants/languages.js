/**
 * Language configuration for multi-language demo support.
 * Maps language codes to STT speech codes, Kokoro TTS voices, and display labels.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', speechCode: 'en-US', kokoroVoice: 'af_heart', kokoroSupported: true },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', speechCode: 'nl-NL', kokoroVoice: null, kokoroSupported: false },
  { code: 'es', label: 'Spanish', nativeLabel: 'Espa\u00f1ol', speechCode: 'es-ES', kokoroVoice: 'ef_dora', kokoroSupported: true },
  { code: 'fr', label: 'French', nativeLabel: 'Fran\u00e7ais', speechCode: 'fr-FR', kokoroVoice: 'ff_siwis', kokoroSupported: true },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', speechCode: 'de-DE', kokoroVoice: null, kokoroSupported: false },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', speechCode: 'it-IT', kokoroVoice: 'if_sara', kokoroSupported: true },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Portugu\u00eas', speechCode: 'pt-BR', kokoroVoice: 'pf_dora', kokoroSupported: true },
  { code: 'ja', label: 'Japanese', nativeLabel: '\u65e5\u672c\u8a9e', speechCode: 'ja-JP', kokoroVoice: 'jf_alpha', kokoroSupported: true },
  { code: 'ko', label: 'Korean', nativeLabel: '\ud55c\uad6d\uc5b4', speechCode: 'ko-KR', kokoroVoice: null, kokoroSupported: false },
  { code: 'zh', label: 'Chinese', nativeLabel: '\u4e2d\u6587', speechCode: 'zh-CN', kokoroVoice: 'zf_xiaobei', kokoroSupported: true },
  { code: 'hi', label: 'Hindi', nativeLabel: '\u0939\u093f\u0928\u094d\u0926\u0940', speechCode: 'hi-IN', kokoroVoice: 'hf_alpha', kokoroSupported: true },
];

export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGE_NAMES = {
  en: 'English',
  nl: 'Dutch',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  hi: 'Hindi',
};

export function getLanguageConfig(code) {
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
}
