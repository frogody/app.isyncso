/**
 * Color utility functions — conversions, luminance, contrast.
 * Uses culori for perceptual oklch operations.
 */
import { parse, formatHex, converter, formatRgb } from 'culori';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

// ── Conversions ──────────────────────────────────────────────────

export function hexToRgb(hex) {
  const c = parse(hex);
  if (!c) return { r: 0, g: 0, b: 0 };
  const rgb = toRgb(c);
  return {
    r: Math.round((rgb.r ?? 0) * 255),
    g: Math.round((rgb.g ?? 0) * 255),
    b: Math.round((rgb.b ?? 0) * 255),
  };
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  const c = { mode: 'hsl', h, s: s / 100, l: l / 100 };
  return formatHex(c) || '#000000';
}

export function hexToOklch(hex) {
  const c = parse(hex);
  if (!c) return { l: 0, c: 0, h: 0 };
  const oklch = toOklch(c);
  return { l: oklch.l ?? 0, c: oklch.c ?? 0, h: oklch.h ?? 0 };
}

export function oklchToHex(l, c, h) {
  const color = { mode: 'oklch', l, c, h };
  return formatHex(color) || '#000000';
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

// ── CMYK ─────────────────────────────────────────────────────────

export function rgbToCmyk(r, g, b) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - rr - k) / (1 - k)) * 100),
    m: Math.round(((1 - gg - k) / (1 - k)) * 100),
    y: Math.round(((1 - bb - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function hexToCmyk(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToCmyk(r, g, b);
}

// ── Luminance & Contrast (WCAG 2.1) ─────────────────────────────

function linearize(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Interpolation ────────────────────────────────────────────────

export function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function clampHue(h) {
  return ((h % 360) + 360) % 360;
}

// ── CSS variable / Tailwind helpers ──────────────────────────────

export function hexToRgbString(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

export function formatCssVariable(name) {
  return `--color-${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
}

export function formatTailwindKey(name) {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

// ── Build a ColorSpec object for the schema ──────────────────────

export function buildColorSpec(name, hex) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const cmyk = rgbToCmyk(r, g, b);
  return {
    name,
    hex,
    rgb: { r, g, b },
    hsl: { h: hsl.h, s: hsl.s, l: hsl.l },
    cmyk,
    pantone: null,
    css_variable: formatCssVariable(name),
    tailwind_key: formatTailwindKey(name),
  };
}
