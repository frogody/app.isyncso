/**
 * Brand-book-specific PDF StyleSheet for @react-pdf/renderer.
 * Dynamically creates styles using the project's own brand colors.
 */
import { StyleSheet } from '@react-pdf/renderer';

/**
 * Create a brand-book StyleSheet themed with project colors.
 */
export function createBrandBookStyles(project) {
  const primary = project?.color_system?.palettes?.primary?.base || '#1a1a1a';
  const secondary = project?.color_system?.palettes?.secondary?.base || '#4a4a4a';
  const accent = project?.color_system?.palettes?.accent?.base || '#2563eb';

  return StyleSheet.create({
    // ── Page ──────────────────────────────────────────────
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 40,
      paddingBottom: 60,
      fontFamily: 'Helvetica',
    },

    // ── Cover ─────────────────────────────────────────────
    coverPage: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 0,
      fontFamily: 'Helvetica',
      justifyContent: 'center',
      alignItems: 'center',
    },
    coverLogo: {
      width: 180,
      height: 120,
      objectFit: 'contain',
      marginBottom: 30,
    },
    coverTitle: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#18181b',
      marginBottom: 8,
      textAlign: 'center',
    },
    coverTagline: {
      fontSize: 14,
      color: '#71717a',
      marginBottom: 40,
      textAlign: 'center',
    },
    coverDivider: {
      width: 60,
      height: 3,
      backgroundColor: primary,
      marginBottom: 40,
    },
    coverMeta: {
      fontSize: 10,
      color: '#a1a1aa',
      textAlign: 'center',
      marginBottom: 4,
    },

    // ── Section headers ───────────────────────────────────
    sectionHeader: {
      marginBottom: 24,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: primary,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#18181b',
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 11,
      color: '#71717a',
    },

    // ── Sub-section ───────────────────────────────────────
    subSection: {
      marginBottom: 18,
    },
    subSectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#18181b',
      marginBottom: 8,
    },

    // ── Text ──────────────────────────────────────────────
    body: {
      fontSize: 10,
      color: '#3f3f46',
      lineHeight: 1.6,
      marginBottom: 6,
    },
    bodyBold: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#18181b',
      marginBottom: 4,
    },
    label: {
      fontSize: 8,
      color: '#a1a1aa',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    caption: {
      fontSize: 8,
      color: '#a1a1aa',
      marginTop: 4,
    },

    // ── Cards ─────────────────────────────────────────────
    card: {
      backgroundColor: '#fafafa',
      borderRadius: 6,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#e4e4e7',
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#18181b',
      marginBottom: 4,
    },
    cardBody: {
      fontSize: 9,
      color: '#52525b',
      lineHeight: 1.5,
    },

    // ── Emphasis box ──────────────────────────────────────
    emphasisBox: {
      backgroundColor: '#f4f4f5',
      borderLeftWidth: 3,
      borderLeftColor: primary,
      padding: 14,
      marginBottom: 12,
      borderRadius: 4,
    },

    // ── Color swatches ────────────────────────────────────
    swatchRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    swatchContainer: {
      alignItems: 'center',
      width: 80,
      marginBottom: 8,
    },
    swatch: {
      width: 60,
      height: 60,
      borderRadius: 6,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: '#e4e4e7',
    },
    swatchLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#18181b',
      textAlign: 'center',
    },
    swatchHex: {
      fontSize: 7,
      color: '#a1a1aa',
      textAlign: 'center',
    },

    // ── Table ─────────────────────────────────────────────
    table: {
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#f4f4f5',
      borderBottomWidth: 1,
      borderBottomColor: '#e4e4e7',
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f4f4f5',
      paddingVertical: 5,
      paddingHorizontal: 8,
    },
    tableCell: {
      fontSize: 9,
      color: '#3f3f46',
      flex: 1,
    },
    tableCellHeader: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#71717a',
      textTransform: 'uppercase',
      flex: 1,
    },

    // ── Image grid ────────────────────────────────────────
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    imageCell: {
      width: 150,
      height: 110,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#e4e4e7',
      overflow: 'hidden',
    },
    imageLarge: {
      width: '100%',
      marginBottom: 10,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#e4e4e7',
    },
    imageMedium: {
      width: 240,
      marginBottom: 10,
      borderRadius: 4,
    },

    // ── Two-column ────────────────────────────────────────
    twoCol: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    col: {
      flex: 1,
    },

    // ── Do/Don't ──────────────────────────────────────────
    doItem: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    doIcon: {
      fontSize: 10,
      color: '#22c55e',
      marginRight: 6,
      width: 14,
    },
    dontIcon: {
      fontSize: 10,
      color: '#ef4444',
      marginRight: 6,
      width: 14,
    },

    // ── Footer ────────────────────────────────────────────
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#e4e4e7',
      paddingTop: 8,
    },
    footerText: {
      fontSize: 7,
      color: '#a1a1aa',
    },
    footerPage: {
      fontSize: 7,
      color: '#a1a1aa',
    },

    // ── Utilities ─────────────────────────────────────────
    row: { flexDirection: 'row', alignItems: 'center' },
    spaceBetween: { justifyContent: 'space-between' },
    mb4: { marginBottom: 4 },
    mb8: { marginBottom: 8 },
    mb12: { marginBottom: 12 },
    mb16: { marginBottom: 16 },
    mb24: { marginBottom: 24 },
    mt8: { marginTop: 8 },
    mt16: { marginTop: 16 },
    flex1: { flex: 1 },

    // ── Brand accent colors (dynamic) ─────────────────────
    accentPrimary: { color: primary },
    bgAccentPrimary: { backgroundColor: primary },
    accentSecondary: { color: secondary },
    bgAccentSecondary: { backgroundColor: secondary },
    accentHighlight: { color: accent },
    bgAccentHighlight: { backgroundColor: accent },
  });
}

/**
 * Brand color values for inline use where StyleSheet can't be used.
 */
export function getBrandColors(project) {
  const palettes = project?.color_system?.palettes || {};
  return {
    primary: palettes.primary?.base || '#1a1a1a',
    primaryLight: palettes.primary?.light || '#4a4a4a',
    primaryDark: palettes.primary?.dark || '#0a0a0a',
    secondary: palettes.secondary?.base || '#4a4a4a',
    secondaryLight: palettes.secondary?.light || '#7a7a7a',
    accent: palettes.accent?.base || '#2563eb',
    accentLight: palettes.accent?.light || '#60a5fa',
    neutralBase: palettes.neutrals?.base || '#71717a',
    neutralLight: palettes.neutrals?.light || '#d4d4d8',
    neutralDark: palettes.neutrals?.dark || '#27272a',
  };
}
