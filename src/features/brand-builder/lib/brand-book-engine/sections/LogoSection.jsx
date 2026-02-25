/**
 * Brand Book PDF — Logo System Section.
 * Logo variations grid, color modes, rules, construction grid.
 */
import React from 'react';
import { Page, View, Text, Image } from '@react-pdf/renderer';

function PageFooter({ styles, brandName }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{brandName} Brand Guidelines</Text>
      <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

const VARIATION_LABELS = {
  primary: 'Primary Logo',
  secondary: 'Secondary Logo',
  submark: 'Submark',
  wordmark: 'Wordmark',
  favicon: 'Favicon',
  social_avatar: 'Social Avatar',
};

const MODE_LABELS = {
  full_color_light: 'Full Color (Light)',
  full_color_dark: 'Full Color (Dark)',
  mono_black: 'Mono Black',
  mono_white: 'Mono White',
};

export default function LogoSection({ project, images, styles }) {
  const ls = project?.logo_system;
  const brandName = project?.brand_dna?.company_name || '';

  if (!ls) return null;

  const variations = ls.variations || {};
  const varNames = Object.keys(VARIATION_LABELS);

  return (
    <>
      {/* Page 1: Primary Logo + Design Rationale */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Logo System</Text>
          <Text style={styles.sectionSubtitle}>Logo variations, usage rules, and construction</Text>
        </View>

        {/* Primary logo large */}
        {images?.logo_primary_full_color_light && (
          <View style={[styles.subSection, { alignItems: 'center' }]}>
            <Text style={styles.subSectionTitle}>Primary Logo</Text>
            <View style={{ backgroundColor: '#fafafa', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#e4e4e7', width: '100%', alignItems: 'center' }}>
              <Image
                src={images.logo_primary_full_color_light}
                style={{ width: 250, height: 170, objectFit: 'contain' }}
              />
            </View>
          </View>
        )}

        {/* Design Rationale */}
        {ls.concept?.design_rationale && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Design Rationale</Text>
            <Text style={styles.body}>{ls.concept.design_rationale}</Text>
          </View>
        )}

        {/* Logo Style */}
        {ls.concept?.style && (
          <View style={styles.mb8}>
            <Text style={styles.bodyBold}>
              Logo Style: {ls.concept.style.replace(/_/g, ' ')}
            </Text>
          </View>
        )}

        {/* Icon Keywords */}
        {ls.concept?.icon_keywords?.length > 0 && (
          <View style={styles.mb8}>
            <Text style={styles.bodyBold}>Icon Keywords</Text>
            <Text style={styles.body}>{ls.concept.icon_keywords.join(', ')}</Text>
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 2: All Variations */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={[styles.subSectionTitle, styles.mb12]}>Logo Variations</Text>

        {varNames.map((v) => {
          const fcl = images?.[`logo_${v}_full_color_light`];
          if (!fcl) return null;
          return (
            <View key={v} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 120, height: 80, backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Image src={fcl} style={{ width: 100, height: 65, objectFit: 'contain' }} />
              </View>
              <View>
                <Text style={styles.bodyBold}>{VARIATION_LABELS[v]}</Text>
                <Text style={styles.caption}>Full color on light background</Text>
              </View>
            </View>
          );
        })}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 3: Color Modes Matrix */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={[styles.subSectionTitle, styles.mb12]}>Color Modes</Text>
        <Text style={[styles.body, styles.mb12]}>
          Each logo variation is available in multiple color modes for different backgrounds and contexts.
        </Text>

        {/* Show primary variation in all 4 modes */}
        <View style={styles.subSection}>
          <Text style={styles.bodyBold}>Primary Logo — Color Modes</Text>
          <View style={styles.imageGrid}>
            {Object.entries(MODE_LABELS).map(([mode, label]) => {
              const img = images?.[`logo_primary_${mode}`];
              if (!img) return null;
              const isDark = mode === 'full_color_dark' || mode === 'mono_white';
              return (
                <View key={mode} style={{ width: 130, marginBottom: 8 }}>
                  <View style={{ width: 130, height: 90, backgroundColor: isDark ? '#18181b' : '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src={img} style={{ width: 110, height: 70, objectFit: 'contain' }} />
                  </View>
                  <Text style={[styles.caption, { textAlign: 'center' }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Construction Grid */}
        {images?.logo_grid && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Construction Grid</Text>
            {ls.grid?.description && (
              <Text style={[styles.body, styles.mb8]}>{ls.grid.description}</Text>
            )}
            <View style={{ backgroundColor: '#fafafa', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#e4e4e7', alignItems: 'center' }}>
              <Image src={images.logo_grid} style={{ width: 300, height: 300, objectFit: 'contain' }} />
            </View>
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 4: Rules */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={[styles.subSectionTitle, styles.mb12]}>Logo Usage Rules</Text>

        {/* Clear Space */}
        {ls.rules?.clear_space && (
          <View style={styles.subSection}>
            <Text style={styles.bodyBold}>Clear Space</Text>
            <Text style={styles.body}>{ls.rules.clear_space.description}</Text>
            <Text style={styles.caption}>
              Minimum: {ls.rules.clear_space.value}{ls.rules.clear_space.unit}
            </Text>
          </View>
        )}

        {/* Minimum Size */}
        {ls.rules?.minimum_size && (
          <View style={styles.subSection}>
            <Text style={styles.bodyBold}>Minimum Size</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.label}>Digital</Text>
                <Text style={styles.body}>{ls.rules.minimum_size.digital_px}px</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Print</Text>
                <Text style={styles.body}>{ls.rules.minimum_size.print_mm}mm</Text>
              </View>
            </View>
          </View>
        )}

        {/* Approved Backgrounds */}
        {ls.rules?.approved_backgrounds?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.bodyBold}>Approved Backgrounds</Text>
            <View style={styles.swatchRow}>
              {ls.rules.approved_backgrounds.map((bg, i) => (
                <View key={i} style={styles.swatchContainer}>
                  <View style={[styles.swatch, { backgroundColor: bg, width: 40, height: 40 }]} />
                  <Text style={styles.swatchHex}>{bg}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Don'ts */}
        {ls.rules?.donts?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.bodyBold}>Logo Misuse — Don'ts</Text>
            {ls.rules.donts.map((d, i) => (
              <View key={i} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#ef4444' }]}>
                <Text style={styles.cardBody}>{d.description}</Text>
              </View>
            ))}
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>
    </>
  );
}
