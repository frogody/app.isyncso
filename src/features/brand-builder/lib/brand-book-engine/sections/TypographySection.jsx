/**
 * Brand Book PDF — Typography Section.
 * Font documentation, type scale table, pairing rationale, usage rules.
 */
import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';

function PageFooter({ styles, brandName }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{brandName} Brand Guidelines</Text>
      <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function FontCard({ font, role, styles }) {
  if (!font) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{role}</Text>
      <Text style={[styles.cardTitle, { fontSize: 18, marginBottom: 6 }]}>{font.family}</Text>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 4 }}>
        <View>
          <Text style={styles.caption}>Classification</Text>
          <Text style={styles.cardBody}>{font.classification}</Text>
        </View>
        <View>
          <Text style={styles.caption}>Source</Text>
          <Text style={styles.cardBody}>{font.source}</Text>
        </View>
        <View>
          <Text style={styles.caption}>License</Text>
          <Text style={styles.cardBody}>{font.license}</Text>
        </View>
      </View>
      {font.weights_available?.length > 0 && (
        <View>
          <Text style={styles.caption}>Available Weights</Text>
          <Text style={styles.cardBody}>
            {font.weights_available.join(', ')}
          </Text>
        </View>
      )}
      {font.google_fonts_url && (
        <View style={{ marginTop: 4 }}>
          <Text style={styles.caption}>Google Fonts URL</Text>
          <Text style={[styles.cardBody, { color: '#2563eb' }]}>
            {font.google_fonts_url}
          </Text>
        </View>
      )}
    </View>
  );
}

const SCALE_LEVELS = [
  'display_1', 'display_2', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'body_large', 'body', 'body_small', 'caption', 'overline', 'button',
];

const LEVEL_LABELS = {
  display_1: 'Display 1',
  display_2: 'Display 2',
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  h5: 'H5',
  h6: 'H6',
  body_large: 'Body Large',
  body: 'Body',
  body_small: 'Body Small',
  caption: 'Caption',
  overline: 'Overline',
  button: 'Button',
};

export default function TypographySection({ project, styles }) {
  const ts = project?.typography_system;
  const brandName = project?.brand_dna?.company_name || '';

  if (!ts) return null;

  return (
    <>
      {/* Page 1: Fonts + Pairing */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Typography</Text>
          <Text style={styles.sectionSubtitle}>Font selection, type scale, and usage guidelines</Text>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <FontCard font={ts.primary_font} role="Primary Font" styles={styles} />
          </View>
          <View style={styles.col}>
            <FontCard font={ts.secondary_font} role="Secondary Font" styles={styles} />
          </View>
        </View>

        {ts.accent_font && (
          <FontCard font={ts.accent_font} role="Accent Font" styles={styles} />
        )}

        {ts.pairing_rationale && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Pairing Rationale</Text>
            <Text style={styles.body}>{ts.pairing_rationale}</Text>
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 2: Type Scale + Rules */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>Type Scale</Text>
          {ts.base_size && (
            <Text style={[styles.caption, { marginBottom: 8 }]}>
              Base size: {ts.base_size}px | Scale ratio: {ts.scale_ratio}
            </Text>
          )}

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Level</Text>
              <Text style={styles.tableCellHeader}>Size (px)</Text>
              <Text style={styles.tableCellHeader}>Weight</Text>
              <Text style={styles.tableCellHeader}>Line Height</Text>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Font</Text>
            </View>
            {SCALE_LEVELS.map((level) => {
              const spec = ts.scale?.[level];
              if (!spec) return null;
              return (
                <View key={level} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>
                    {LEVEL_LABELS[level]}
                  </Text>
                  <Text style={styles.tableCell}>{spec.font_size_px}px</Text>
                  <Text style={styles.tableCell}>{spec.font_weight}</Text>
                  <Text style={styles.tableCell}>{spec.line_height}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{spec.font_family}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Usage Rules */}
        {ts.usage_rules && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Usage Rules</Text>
            {ts.usage_rules.heading_font_usage && (
              <View style={styles.mb8}>
                <Text style={styles.bodyBold}>Headings</Text>
                <Text style={styles.body}>{ts.usage_rules.heading_font_usage}</Text>
              </View>
            )}
            {ts.usage_rules.body_font_usage && (
              <View style={styles.mb8}>
                <Text style={styles.bodyBold}>Body Text</Text>
                <Text style={styles.body}>{ts.usage_rules.body_font_usage}</Text>
              </View>
            )}
            {ts.usage_rules.minimum_body_size && (
              <Text style={styles.body}>
                Minimum body size: {ts.usage_rules.minimum_body_size}px
              </Text>
            )}
            {ts.usage_rules.maximum_line_length && (
              <Text style={styles.body}>
                Maximum line length: {ts.usage_rules.maximum_line_length}
              </Text>
            )}
            {ts.usage_rules.never_combine?.length > 0 && (
              <View style={styles.mb8}>
                <Text style={styles.bodyBold}>Never Combine</Text>
                {ts.usage_rules.never_combine.map((rule, i) => (
                  <Text key={i} style={styles.body}>- {rule}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>
    </>
  );
}
