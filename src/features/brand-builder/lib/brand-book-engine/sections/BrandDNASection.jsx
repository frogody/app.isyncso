/**
 * Brand Book PDF — Brand DNA Section.
 * Mission, vision, values, personality, positioning, brand story.
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

export default function BrandDNASection({ project, styles }) {
  const dna = project?.brand_dna;
  const strategy = dna?.strategy;
  const brandName = dna?.company_name || project?.name || '';

  if (!dna) return null;

  return (
    <>
      {/* Page 1: Mission, Vision, Values */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Brand DNA</Text>
          <Text style={styles.sectionSubtitle}>The strategic foundation of our brand identity</Text>
        </View>

        {/* Mission */}
        {strategy?.mission && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Mission</Text>
            <View style={styles.emphasisBox}>
              <Text style={styles.body}>{strategy.mission}</Text>
            </View>
          </View>
        )}

        {/* Vision */}
        {strategy?.vision && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Vision</Text>
            <View style={styles.emphasisBox}>
              <Text style={styles.body}>{strategy.vision}</Text>
            </View>
          </View>
        )}

        {/* Core Values */}
        {strategy?.values?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Core Values</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {strategy.values.map((val, i) => (
                <View key={i} style={[styles.card, { width: '47%' }]}>
                  <Text style={styles.cardTitle}>{val.name}</Text>
                  <Text style={styles.cardBody}>{val.description}</Text>
                  {val.behavioral_example && (
                    <Text style={[styles.caption, { marginTop: 4 }]}>
                      Example: {val.behavioral_example}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 2: Personality, Positioning, Story */}
      <Page size="A4" style={styles.page} wrap>
        {/* Brand Personality */}
        {dna.personality_description && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Brand Personality</Text>
            <Text style={styles.body}>{dna.personality_description}</Text>
          </View>
        )}

        {/* Positioning */}
        {strategy?.positioning && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Brand Positioning</Text>
            {strategy.positioning.statement && (
              <View style={styles.emphasisBox}>
                <Text style={styles.body}>{strategy.positioning.statement}</Text>
              </View>
            )}
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.label}>Target</Text>
                <Text style={styles.body}>{strategy.positioning.target}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Category</Text>
                <Text style={styles.body}>{strategy.positioning.category}</Text>
              </View>
            </View>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.label}>Differentiation</Text>
                <Text style={styles.body}>{strategy.positioning.differentiation}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Reason to Believe</Text>
                <Text style={styles.body}>{strategy.positioning.reason_to_believe}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Brand Story */}
        {strategy?.brand_story && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Brand Story</Text>
            <Text style={styles.body}>{strategy.brand_story}</Text>
          </View>
        )}

        {/* Elevator Pitch */}
        {strategy?.elevator_pitch && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Elevator Pitch</Text>
            <View style={styles.emphasisBox}>
              <Text style={styles.body}>{strategy.elevator_pitch}</Text>
            </View>
          </View>
        )}

        {/* Tagline Options */}
        {strategy?.tagline_options?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Tagline Options</Text>
            {strategy.tagline_options.map((tag, i) => (
              <Text key={i} style={[styles.body, { fontStyle: 'italic' }]}>
                "{tag}"
              </Text>
            ))}
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>
    </>
  );
}
