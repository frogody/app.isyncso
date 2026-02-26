/**
 * Brand Book PDF — Color System Section.
 * Palette swatches, specifications, usage rules, dark mode, accessibility.
 */
import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import { getBrandColors } from '../pdf-styles.js';

function PageFooter({ styles, brandName }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{brandName} Brand Guidelines</Text>
      <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Swatch({ color, name, hex, styles }) {
  return (
    <View style={styles.swatchContainer}>
      <View style={[styles.swatch, { backgroundColor: color || '#ccc' }]} />
      <Text style={styles.swatchLabel}>{name}</Text>
      <Text style={styles.swatchHex}>{hex || color}</Text>
    </View>
  );
}

function ColorScaleRow({ label, scale, specs, styles }) {
  if (!scale) return null;
  return (
    <View style={styles.subSection}>
      <Text style={styles.subSectionTitle}>{label}</Text>
      <View style={styles.swatchRow}>
        {scale.light && <Swatch color={scale.light} name="Light" hex={scale.light} styles={styles} />}
        <Swatch color={scale.base} name="Base" hex={scale.base} styles={styles} />
        {scale.dark && <Swatch color={scale.dark} name="Dark" hex={scale.dark} styles={styles} />}
        {/* Show ramp if available */}
        {scale.ramp && Object.entries(scale.ramp).slice(0, 5).map(([step, hex]) => (
          <Swatch key={step} color={hex} name={step} hex={hex} styles={styles} />
        ))}
      </View>
      {/* Specs for base color */}
      {specs && (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {specs.rgb && (
            <Text style={styles.caption}>
              RGB: {specs.rgb.r}, {specs.rgb.g}, {specs.rgb.b}
            </Text>
          )}
          {specs.hsl && (
            <Text style={styles.caption}>
              HSL: {Math.round(specs.hsl.h)}, {Math.round(specs.hsl.s)}%, {Math.round(specs.hsl.l)}%
            </Text>
          )}
          {specs.cmyk && (
            <Text style={styles.caption}>
              CMYK: {specs.cmyk.c}, {specs.cmyk.m}, {specs.cmyk.y}, {specs.cmyk.k}
            </Text>
          )}
          {specs.pantone && (
            <Text style={styles.caption}>Pantone: {specs.pantone}</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function ColorSection({ project, styles }) {
  const cs = project?.color_system;
  const palette = cs?.palette;
  const brandName = project?.brand_dna?.company_name || '';
  const specs = cs?.specifications || {};

  if (!cs) return null;

  return (
    <>
      {/* Page 1: Core Palette */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Color System</Text>
          <Text style={styles.sectionSubtitle}>
            {cs.mood ? `${cs.mood} ` : ''}
            {cs.temperature ? `${cs.temperature} ` : ''}
            {cs.saturation_level ? `${cs.saturation_level} palette` : 'palette'}
          </Text>
        </View>

        <ColorScaleRow label="Primary" scale={palette?.primary} specs={specs.primary} styles={styles} />
        <ColorScaleRow label="Secondary" scale={palette?.secondary} specs={specs.secondary} styles={styles} />
        <ColorScaleRow label="Accent" scale={palette?.accent} specs={specs.accent} styles={styles} />

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 2: Neutrals, Semantic, Usage Rules */}
      <Page size="A4" style={styles.page} wrap>
        {/* Neutrals */}
        {palette?.neutrals && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Neutral Scale</Text>
            <View style={styles.swatchRow}>
              <Swatch color={palette.neutrals.white} name="White" hex={palette.neutrals.white} styles={styles} />
              <Swatch color={palette.neutrals.light_gray} name="Light Gray" hex={palette.neutrals.light_gray} styles={styles} />
              <Swatch color={palette.neutrals.mid_gray} name="Mid Gray" hex={palette.neutrals.mid_gray} styles={styles} />
              <Swatch color={palette.neutrals.dark_gray} name="Dark Gray" hex={palette.neutrals.dark_gray} styles={styles} />
              <Swatch color={palette.neutrals.near_black} name="Near Black" hex={palette.neutrals.near_black} styles={styles} />
            </View>
          </View>
        )}

        {/* Semantic Colors */}
        {palette?.semantic && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Semantic Colors</Text>
            <View style={styles.swatchRow}>
              <Swatch color={palette.semantic.success} name="Success" hex={palette.semantic.success} styles={styles} />
              <Swatch color={palette.semantic.warning} name="Warning" hex={palette.semantic.warning} styles={styles} />
              <Swatch color={palette.semantic.error} name="Error" hex={palette.semantic.error} styles={styles} />
              <Swatch color={palette.semantic.info} name="Info" hex={palette.semantic.info} styles={styles} />
            </View>
          </View>
        )}

        {/* Usage Rules */}
        {cs.usage_rules && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Color Usage Rules</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { flex: 2 }]}>Rule</Text>
                <Text style={styles.tableCellHeader}>Value</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Primary Color Ratio</Text>
                <Text style={styles.tableCell}>{cs.usage_rules.primary_ratio}%</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Secondary Color Ratio</Text>
                <Text style={styles.tableCell}>{cs.usage_rules.secondary_ratio}%</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Accent Color Ratio</Text>
                <Text style={styles.tableCell}>{cs.usage_rules.accent_ratio}%</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Default Background</Text>
                <Text style={styles.tableCell}>{cs.usage_rules.background_default}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Dark Mode */}
        {palette?.dark_mode && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Dark Mode</Text>
            <View style={styles.swatchRow}>
              <Swatch color={palette.dark_mode.background} name="Background" hex={palette.dark_mode.background} styles={styles} />
              <Swatch color={palette.dark_mode.surface} name="Surface" hex={palette.dark_mode.surface} styles={styles} />
              <Swatch color={palette.dark_mode.primary} name="Primary" hex={palette.dark_mode.primary} styles={styles} />
              <Swatch color={palette.dark_mode.text_primary} name="Text" hex={palette.dark_mode.text_primary} styles={styles} />
            </View>
          </View>
        )}

        {/* Accessibility */}
        {cs.accessibility && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Accessibility</Text>
            <Text style={styles.body}>
              Colorblind safe: {cs.accessibility.colorblind_safe ? 'Yes' : 'No'}
            </Text>
            {cs.accessibility.wcag_aa_pairs?.length > 0 && (
              <Text style={styles.body}>
                WCAG AA compliant pairs: {cs.accessibility.wcag_aa_pairs.length}
              </Text>
            )}
            {cs.accessibility.wcag_aaa_pairs?.length > 0 && (
              <Text style={styles.body}>
                WCAG AAA compliant pairs: {cs.accessibility.wcag_aaa_pairs.length}
              </Text>
            )}
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>
    </>
  );
}
