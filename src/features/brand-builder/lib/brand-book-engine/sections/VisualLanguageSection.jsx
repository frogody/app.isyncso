/**
 * Brand Book PDF — Visual Language Section.
 * Photography style, iconography, patterns, graphic devices.
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

export default function VisualLanguageSection({ project, images, styles }) {
  const vl = project?.visual_language;
  const brandName = project?.brand_dna?.company_name || '';

  if (!vl) return null;

  const photo = vl.photography;
  const illus = vl.illustration;
  const icono = vl.iconography;
  const pats = vl.patterns;

  return (
    <>
      {/* Page 1: Photography + Illustration */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visual Language</Text>
          <Text style={styles.sectionSubtitle}>Photography, illustration, iconography, and patterns</Text>
        </View>

        {/* Photography */}
        {photo && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Photography Style</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.label}>Mood</Text>
                <Text style={styles.body}>{photo.mood}</Text>
                <Text style={styles.label}>Lighting</Text>
                <Text style={styles.body}>{photo.lighting}</Text>
                <Text style={styles.label}>Composition</Text>
                <Text style={styles.body}>{photo.composition}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Color Treatment</Text>
                <Text style={styles.body}>{photo.color_treatment}</Text>
                <Text style={styles.label}>Subjects</Text>
                <Text style={styles.body}>{photo.subjects}</Text>
              </View>
            </View>

            {photo.on_brand_descriptors?.length > 0 && (
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={[styles.bodyBold, { color: '#22c55e' }]}>On-Brand</Text>
                  {photo.on_brand_descriptors.map((d, i) => (
                    <Text key={i} style={styles.body}>+ {d}</Text>
                  ))}
                </View>
                <View style={styles.col}>
                  <Text style={[styles.bodyBold, { color: '#ef4444' }]}>Off-Brand</Text>
                  {(photo.off_brand_descriptors || []).map((d, i) => (
                    <Text key={i} style={styles.body}>- {d}</Text>
                  ))}
                </View>
              </View>
            )}

            {photo.overlay_rules && (
              <View style={styles.mb8}>
                <Text style={styles.bodyBold}>Overlay Rules</Text>
                {photo.overlay_rules.allowed !== undefined && (
                  <Text style={styles.body}>
                    Overlays: {photo.overlay_rules.allowed ? 'Allowed' : 'Not allowed'}
                  </Text>
                )}
                {photo.overlay_rules.max_opacity && (
                  <Text style={styles.body}>Max opacity: {photo.overlay_rules.max_opacity}%</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Illustration */}
        {illus && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Illustration Style</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                {illus.style && (
                  <>
                    <Text style={styles.label}>Style</Text>
                    <Text style={styles.body}>{illus.style}</Text>
                  </>
                )}
                {illus.line_weight && (
                  <>
                    <Text style={styles.label}>Line Weight</Text>
                    <Text style={styles.body}>{illus.line_weight}</Text>
                  </>
                )}
              </View>
              <View style={styles.col}>
                {illus.color_approach && (
                  <>
                    <Text style={styles.label}>Color Approach</Text>
                    <Text style={styles.body}>{illus.color_approach}</Text>
                  </>
                )}
                {illus.complexity && (
                  <>
                    <Text style={styles.label}>Complexity</Text>
                    <Text style={styles.body}>{illus.complexity}</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 2: Iconography + Patterns */}
      <Page size="A4" style={styles.page} wrap>
        {/* Iconography */}
        {icono && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Iconography</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.label}>Style</Text>
                <Text style={styles.body}>{icono.style}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Stroke Weight</Text>
                <Text style={styles.body}>{icono.stroke_weight}px</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Grid Size</Text>
                <Text style={styles.body}>{icono.grid_size}px</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Corner Radius</Text>
                <Text style={styles.body}>{icono.corner_radius}px</Text>
              </View>
            </View>

            {icono.color_rules && (
              <View style={styles.mb8}>
                <Text style={styles.bodyBold}>Color Rules</Text>
                <Text style={styles.body}>{icono.color_rules}</Text>
              </View>
            )}

            {/* Icon specimens */}
            {icono.base_set?.length > 0 && (
              <View style={styles.mb8}>
                <Text style={styles.bodyBold}>Base Icon Set</Text>
                <View style={styles.imageGrid}>
                  {icono.base_set.map((icon, i) => {
                    const img = images?.[`icon_${i}`];
                    if (!img) return null;
                    return (
                      <View key={i} style={{ width: 70, alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ width: 50, height: 50, backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center' }}>
                          <Image src={img} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        </View>
                        <Text style={[styles.caption, { textAlign: 'center' }]}>{icon.name}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Patterns */}
        {pats?.patterns?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Patterns</Text>
            <View style={styles.imageGrid}>
              {pats.patterns.map((pat, i) => {
                const img = images?.[`pattern_${i}`];
                if (!img) return null;
                return (
                  <View key={i} style={{ width: 130, marginBottom: 10 }}>
                    <View style={{ width: 130, height: 100, backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={img} style={{ width: 110, height: 80, objectFit: 'contain' }} />
                    </View>
                    <Text style={[styles.caption, { textAlign: 'center' }]}>{pat.name}</Text>
                    <Text style={[styles.caption, { textAlign: 'center', fontSize: 7 }]}>{pat.usage}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Graphic Devices */}
        {pats?.graphic_devices?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Graphic Devices</Text>
            <View style={styles.imageGrid}>
              {pats.graphic_devices.map((dev, i) => {
                const img = images?.[`device_${i}`];
                if (!img) return null;
                return (
                  <View key={i} style={{ width: 130, marginBottom: 10 }}>
                    <View style={{ width: 130, height: 80, backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={img} style={{ width: 110, height: 60, objectFit: 'contain' }} />
                    </View>
                    <Text style={[styles.caption, { textAlign: 'center' }]}>{dev.name}</Text>
                    <Text style={[styles.caption, { textAlign: 'center', fontSize: 7 }]}>{dev.usage}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>
    </>
  );
}
