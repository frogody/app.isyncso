/**
 * Brand Book PDF — Verbal Identity Section.
 * Voice attributes, tone spectrum, writing guidelines, sample copy.
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

export default function VerbalIdentitySection({ project, styles }) {
  const vi = project?.verbal_identity;
  const brandName = project?.brand_dna?.company_name || '';

  if (!vi) return null;

  const wg = vi.writing_guidelines;
  const sc = wg?.sample_copy;

  return (
    <>
      {/* Page 1: Voice Attributes + Tone Spectrum */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Verbal Identity</Text>
          <Text style={styles.sectionSubtitle}>How our brand speaks, writes, and communicates</Text>
        </View>

        {/* Voice Attributes */}
        {vi.voice_attributes?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Voice Attributes</Text>
            {vi.voice_attributes.map((attr, i) => (
              <View key={i} style={[styles.card, { marginBottom: 8 }]}>
                <Text style={styles.cardTitle}>{attr.attribute}</Text>
                <Text style={styles.cardBody}>{attr.description}</Text>
                {attr.spectrum && (
                  <View style={{ flexDirection: 'row', marginTop: 6, gap: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.caption, { color: '#22c55e' }]}>We are</Text>
                      <Text style={styles.cardBody}>{attr.spectrum.we_are}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.caption, { color: '#ef4444' }]}>We are not</Text>
                      <Text style={styles.cardBody}>{attr.spectrum.we_are_not}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 2: Tone Spectrum + Writing Guidelines */}
      <Page size="A4" style={styles.page} wrap>
        {/* Tone Spectrum */}
        {vi.tone_spectrum?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Tone Spectrum</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Context</Text>
                <Text style={styles.tableCellHeader}>Formality</Text>
                <Text style={styles.tableCellHeader}>Warmth</Text>
                <Text style={styles.tableCellHeader}>Humor</Text>
              </View>
              {vi.tone_spectrum.map((ctx, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{ctx.context}</Text>
                  <Text style={styles.tableCell}>{ctx.formality}/10</Text>
                  <Text style={styles.tableCell}>{ctx.warmth}/10</Text>
                  <Text style={styles.tableCell}>{ctx.humor}/10</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Vocabulary */}
        {wg?.vocabulary && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Vocabulary Guidelines</Text>

            {wg.vocabulary.preferred_words?.length > 0 && (
              <View style={styles.mb8}>
                <Text style={styles.bodyBold}>Preferred Words</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableCellHeader}>Use</Text>
                    <Text style={styles.tableCellHeader}>Instead of</Text>
                    <Text style={[styles.tableCellHeader, { flex: 2 }]}>Why</Text>
                  </View>
                  {wg.vocabulary.preferred_words.map((pw, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{pw.word}</Text>
                      <Text style={[styles.tableCell, { textDecoration: 'line-through' }]}>{pw.instead_of}</Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{pw.why}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {wg.vocabulary.jargon_policy && (
              <Text style={styles.body}>Jargon policy: {wg.vocabulary.jargon_policy}</Text>
            )}
            {wg.vocabulary.emoji_policy && (
              <Text style={styles.body}>Emoji policy: {wg.vocabulary.emoji_policy}</Text>
            )}
          </View>
        )}

        {/* Grammar Style */}
        {wg?.grammar_style && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Grammar & Style</Text>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.body}>Oxford comma: {wg.grammar_style.oxford_comma ? 'Yes' : 'No'}</Text>
                <Text style={styles.body}>Sentence length: {wg.grammar_style.sentence_length}</Text>
                <Text style={styles.body}>Active voice: {wg.grammar_style.active_voice_preference ? 'Preferred' : 'Optional'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.body}>Contractions: {wg.grammar_style.contraction_usage}</Text>
                <Text style={styles.body}>Exclamation marks: {wg.grammar_style.exclamation_marks}</Text>
                <Text style={styles.body}>Capitalization: {wg.grammar_style.capitalization?.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 3: Do/Don't + Sample Copy */}
      <Page size="A4" style={styles.page} wrap>
        {/* Do/Don't Pairs */}
        {wg?.do_dont_pairs?.length > 0 && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Writing Do's and Don'ts</Text>
            {wg.do_dont_pairs.map((pair, i) => (
              <View key={i} style={[styles.twoCol, { marginBottom: 8 }]}>
                <View style={[styles.col, styles.card, { borderLeftWidth: 3, borderLeftColor: '#22c55e' }]}>
                  <View style={styles.doItem}>
                    <Text style={styles.doIcon}>+</Text>
                    <Text style={[styles.cardBody, { flex: 1 }]}>{pair.do_example?.text}</Text>
                  </View>
                  {pair.do_example?.explanation && (
                    <Text style={styles.caption}>{pair.do_example.explanation}</Text>
                  )}
                </View>
                <View style={[styles.col, styles.card, { borderLeftWidth: 3, borderLeftColor: '#ef4444' }]}>
                  <View style={styles.doItem}>
                    <Text style={styles.dontIcon}>-</Text>
                    <Text style={[styles.cardBody, { flex: 1 }]}>{pair.dont_example?.text}</Text>
                  </View>
                  {pair.dont_example?.explanation && (
                    <Text style={styles.caption}>{pair.dont_example.explanation}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sample Copy */}
        {sc && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Sample Copy</Text>

            {sc.homepage_hero && (
              <View style={[styles.card, { marginBottom: 8 }]}>
                <Text style={styles.label}>Homepage Hero</Text>
                <Text style={[styles.cardTitle, { fontSize: 14 }]}>{sc.homepage_hero.headline}</Text>
                <Text style={styles.cardBody}>{sc.homepage_hero.subheadline}</Text>
                {sc.homepage_hero.cta && (
                  <Text style={[styles.cardBody, { fontWeight: 'bold', marginTop: 4 }]}>
                    CTA: {sc.homepage_hero.cta}
                  </Text>
                )}
              </View>
            )}

            {sc.social_media_post && (
              <View style={[styles.card, { marginBottom: 8 }]}>
                <Text style={styles.label}>Social Media Post</Text>
                <Text style={styles.cardBody}>{sc.social_media_post}</Text>
              </View>
            )}

            {sc.about_page_intro && (
              <View style={[styles.card, { marginBottom: 8 }]}>
                <Text style={styles.label}>About Page Intro</Text>
                <Text style={styles.cardBody}>{sc.about_page_intro}</Text>
              </View>
            )}

            {sc.email_newsletter_opening && (
              <View style={[styles.card, { marginBottom: 8 }]}>
                <Text style={styles.label}>Email Newsletter Opening</Text>
                <Text style={styles.cardBody}>{sc.email_newsletter_opening}</Text>
              </View>
            )}

            {sc.product_description && (
              <View style={[styles.card, { marginBottom: 8 }]}>
                <Text style={styles.label}>Product Description</Text>
                <Text style={styles.cardBody}>{sc.product_description}</Text>
              </View>
            )}
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>
    </>
  );
}
