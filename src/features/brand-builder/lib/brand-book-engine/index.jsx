/**
 * Brand Book Engine — barrel exports + orchestration.
 * Generates complete brand book PDFs from project data.
 */
import React from 'react';
import { pdf, Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { prepareAllImages } from './svg-to-png.js';
import { createBrandBookStyles, getBrandColors } from './pdf-styles.js';
import BrandBookPdf from './BrandBookPdf.jsx';

// Re-export utilities
export { prepareAllImages } from './svg-to-png.js';
export { createBrandBookStyles, getBrandColors } from './pdf-styles.js';
export { default as BrandBookPdf } from './BrandBookPdf.jsx';

/**
 * Default section config — all sections enabled.
 */
export const DEFAULT_SECTIONS = {
  brand_dna: true,
  color_system: true,
  typography: true,
  logo_system: true,
  verbal_identity: true,
  visual_language: true,
  applications: true,
};

/**
 * Section metadata for UI and TOC.
 */
export const SECTION_META = [
  { id: 'brand_dna', title: 'Brand DNA', description: 'Mission, vision, values, and positioning' },
  { id: 'color_system', title: 'Color System', description: 'Palette, usage rules, and accessibility' },
  { id: 'typography', title: 'Typography', description: 'Font selection, type scale, and guidelines' },
  { id: 'logo_system', title: 'Logo System', description: 'Variations, color modes, and rules' },
  { id: 'verbal_identity', title: 'Verbal Identity', description: 'Voice, tone, and writing guidelines' },
  { id: 'visual_language', title: 'Visual Language', description: 'Photography, icons, and patterns' },
  { id: 'applications', title: 'Applications', description: 'Stationery, digital, and web mockups' },
];

/**
 * Generate the complete brand book PDF.
 *
 * @param {Object} project — full BrandProject with all 7 stages
 * @param {Object} config — { sections, version, date, preparedBy, includeQuickRef }
 * @param {(label: string, progress: number) => void} [onProgress]
 * @returns {Promise<{ blob: Blob, sections: Array }>}
 */
export async function generateBrandBookPdf(project, config, onProgress) {
  // 1. Convert SVGs to PNGs
  onProgress?.('Converting images...', 0.05);
  const images = await prepareAllImages(project, (done, total) => {
    const pct = 0.05 + (done / total) * 0.5;
    onProgress?.(`Converting images (${done}/${total})...`, pct);
  });

  // 2. Create styles
  onProgress?.('Preparing styles...', 0.58);
  const styles = createBrandBookStyles(project);

  // 3. Render PDF
  onProgress?.('Rendering PDF...', 0.62);
  const doc = (
    <BrandBookPdf
      project={project}
      images={images}
      config={config}
      styles={styles}
    />
  );

  const blob = await pdf(doc).toBlob();

  // 4. Build section metadata for TOC
  const enabledSections = config?.sections || DEFAULT_SECTIONS;
  const sections = SECTION_META
    .filter((s) => enabledSections[s.id])
    .map((s, i) => ({
      id: s.id,
      title: s.title,
      page_start: 3 + i * 3, // rough estimate
      page_end: 3 + (i + 1) * 3 - 1,
    }));

  onProgress?.('Done', 1.0);

  return { blob, sections };
}

/**
 * Generate a single-page quick reference PDF.
 */
export async function generateQuickReference(project, onProgress) {
  onProgress?.('Generating quick reference...', 0.3);

  const brandName = project?.brand_dna?.company_name || project?.name || 'Brand';
  const tagline = project?.brand_dna?.tagline || '';
  const colors = getBrandColors(project);
  const primaryFont = project?.typography_system?.primary_font?.family || 'N/A';
  const secondaryFont = project?.typography_system?.secondary_font?.family || 'N/A';

  // Build a simple quick-reference document
  const doc = (
    <Document title={`${brandName} Quick Reference`}>
      <Page size="A4" style={{ padding: 30, fontFamily: 'Helvetica', backgroundColor: '#ffffff' }}>
        {/* Header */}
        <View style={{ marginBottom: 20, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: colors.primary }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#18181b' }}>
            {brandName} — Quick Reference
          </Text>
          {tagline ? <Text style={{ fontSize: 10, color: '#71717a', marginTop: 4 }}>{tagline}</Text> : null}
        </View>

        {/* Colors */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: '#18181b' }}>Brand Colors</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { name: 'Primary', color: colors.primary },
              { name: 'Secondary', color: colors.secondary },
              { name: 'Accent', color: colors.accent },
            ].map((c) => (
              <View key={c.name} style={{ alignItems: 'center', width: 70 }}>
                <View style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: c.color, borderWidth: 1, borderColor: '#e4e4e7', marginBottom: 2 }} />
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#18181b' }}>{c.name}</Text>
                <Text style={{ fontSize: 6, color: '#a1a1aa' }}>{c.color}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Typography */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: '#18181b' }}>Typography</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View>
              <Text style={{ fontSize: 8, color: '#a1a1aa', textTransform: 'uppercase' }}>Primary Font</Text>
              <Text style={{ fontSize: 10, color: '#18181b' }}>{primaryFont}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 8, color: '#a1a1aa', textTransform: 'uppercase' }}>Secondary Font</Text>
              <Text style={{ fontSize: 10, color: '#18181b' }}>{secondaryFont}</Text>
            </View>
          </View>
        </View>

        {/* Voice */}
        {project?.verbal_identity?.voice_attributes?.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: '#18181b' }}>Brand Voice</Text>
            <Text style={{ fontSize: 9, color: '#3f3f46', lineHeight: 1.5 }}>
              {project.verbal_identity.voice_attributes.map((a) => a.attribute).join(' / ')}
            </Text>
          </View>
        )}

        {/* Mission */}
        {project?.brand_dna?.strategy?.mission && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4, color: '#18181b' }}>Mission</Text>
            <Text style={{ fontSize: 9, color: '#3f3f46', lineHeight: 1.5 }}>
              {project.brand_dna.strategy.mission}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 20, left: 30, right: 30, borderTopWidth: 1, borderTopColor: '#e4e4e7', paddingTop: 6 }}>
          <Text style={{ fontSize: 7, color: '#a1a1aa' }}>
            {brandName} Brand Quick Reference | Generated {new Date().toLocaleDateString()}
          </Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  onProgress?.('Done', 1.0);
  return blob;
}
