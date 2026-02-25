/**
 * Brand Book PDF — Applications Section.
 * Stationery mockups, digital assets, presentation slides, website mockups.
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

function MockupImage({ src, label, width, height, styles }) {
  if (!src) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', padding: 8, alignItems: 'center' }}>
        <Image src={src} style={{ width, height, objectFit: 'contain' }} />
      </View>
      {label && <Text style={[styles.caption, { textAlign: 'center' }]}>{label}</Text>}
    </View>
  );
}

const PLATFORM_LABELS = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

export default function ApplicationsSection({ project, images, styles }) {
  const apps = project?.applications;
  const brandName = project?.brand_dna?.company_name || '';

  if (!apps) return null;

  return (
    <>
      {/* Page 1: Stationery */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Brand Applications</Text>
          <Text style={styles.sectionSubtitle}>Your brand applied to real-world touchpoints</Text>
        </View>

        <Text style={[styles.subSectionTitle, styles.mb8]}>Stationery</Text>

        {/* Business Cards */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <MockupImage
              src={images?.stationery_card_front}
              label="Business Card — Front"
              width={200}
              height={115}
              styles={styles}
            />
          </View>
          <View style={styles.col}>
            <MockupImage
              src={images?.stationery_card_back}
              label="Business Card — Back"
              width={200}
              height={115}
              styles={styles}
            />
          </View>
        </View>

        {/* Letterhead + Envelope */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <MockupImage
              src={images?.stationery_letterhead}
              label="A4 Letterhead"
              width={170}
              height={240}
              styles={styles}
            />
          </View>
          <View style={styles.col}>
            <MockupImage
              src={images?.stationery_envelope}
              label="#10 Envelope"
              width={210}
              height={97}
              styles={styles}
            />
          </View>
        </View>

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 2: Digital — Social */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={[styles.subSectionTitle, styles.mb8]}>Digital — Social Media</Text>

        {/* Social Profiles */}
        <View style={styles.mb12}>
          <Text style={styles.bodyBold}>Profile Pictures</Text>
          <View style={styles.imageGrid}>
            {['linkedin', 'twitter', 'instagram', 'facebook'].map((platform) => {
              const img = images?.[`social_profile_${platform}`];
              if (!img) return null;
              return (
                <View key={platform} style={{ width: 90, alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 70, height: 70, borderRadius: 35, overflow: 'hidden', borderWidth: 1, borderColor: '#e4e4e7' }}>
                    <Image src={img} style={{ width: 70, height: 70 }} />
                  </View>
                  <Text style={[styles.caption, { textAlign: 'center' }]}>
                    {PLATFORM_LABELS[platform]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Social Covers */}
        <View style={styles.mb12}>
          <Text style={styles.bodyBold}>Cover Images</Text>
          {['linkedin', 'twitter', 'facebook'].map((platform) => {
            const img = images?.[`social_cover_${platform}`];
            if (!img) return null;
            return (
              <View key={platform} style={{ marginBottom: 8 }}>
                <View style={{ backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', padding: 6, alignItems: 'center' }}>
                  <Image src={img} style={{ width: '100%', height: 70, objectFit: 'contain' }} />
                </View>
                <Text style={styles.caption}>{PLATFORM_LABELS[platform]} Cover</Text>
              </View>
            );
          })}
        </View>

        {/* Social Post + OG */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <MockupImage
              src={images?.social_post}
              label="Social Post Template"
              width={160}
              height={160}
              styles={styles}
            />
          </View>
          <View style={styles.col}>
            <MockupImage
              src={images?.og_image}
              label="Open Graph Image"
              width={200}
              height={105}
              styles={styles}
            />
          </View>
        </View>

        <PageFooter styles={styles} brandName={brandName} />
      </Page>

      {/* Page 3: Presentations + Website */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={[styles.subSectionTitle, styles.mb8]}>Presentation Templates</Text>

        {/* Slides 2x2 grid */}
        <View style={styles.imageGrid}>
          {(apps.presentation?.slides || []).map((slide, i) => {
            const img = images?.[`slide_${i}`];
            if (!img) return null;
            return (
              <View key={i} style={{ width: 230, marginBottom: 10 }}>
                <View style={{ backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', padding: 6 }}>
                  <Image src={img} style={{ width: 218, height: 123, objectFit: 'contain' }} />
                </View>
                <Text style={[styles.caption, { textAlign: 'center' }]}>{slide.name}</Text>
              </View>
            );
          })}
        </View>

        {/* Website Mockups */}
        <Text style={[styles.subSectionTitle, styles.mb8, styles.mt16]}>Website Mockup</Text>

        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          {images?.web_desktop && (
            <View style={{ flex: 1 }}>
              <View style={{ backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', padding: 6, alignItems: 'center' }}>
                <Image src={images.web_desktop} style={{ width: '100%', height: 200, objectFit: 'contain' }} />
              </View>
              <Text style={[styles.caption, { textAlign: 'center' }]}>Desktop</Text>
            </View>
          )}
          {images?.web_mobile && (
            <View style={{ width: 80 }}>
              <View style={{ backgroundColor: '#fafafa', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7', padding: 4, alignItems: 'center' }}>
                <Image src={images.web_mobile} style={{ width: 60, height: 130, objectFit: 'contain' }} />
              </View>
              <Text style={[styles.caption, { textAlign: 'center' }]}>Mobile</Text>
            </View>
          )}
        </View>

        {/* Zoom Background */}
        {images?.zoom_bg && (
          <View style={styles.mt16}>
            <MockupImage
              src={images.zoom_bg}
              label="Zoom Background"
              width="100%"
              height={150}
              styles={styles}
            />
          </View>
        )}

        <PageFooter styles={styles} brandName={brandName} />
      </Page>
    </>
  );
}
