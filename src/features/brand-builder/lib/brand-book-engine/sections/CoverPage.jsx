/**
 * Brand Book PDF — Cover Page.
 * Full-page title with logo, company name, tagline, metadata.
 */
import React from 'react';
import { Page, View, Text, Image } from '@react-pdf/renderer';

export default function CoverPage({ project, images, config, styles }) {
  const name = project?.brand_dna?.company_name || project?.name || 'Brand Guidelines';
  const tagline = project?.brand_dna?.tagline || '';
  const date = config?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const version = config?.version || '1.0';
  const preparedBy = config?.preparedBy || '';

  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 }}>
        {images?.cover_logo && (
          <Image src={images.cover_logo} style={styles.coverLogo} />
        )}

        <Text style={styles.coverTitle}>{name}</Text>

        {tagline ? (
          <Text style={styles.coverTagline}>{tagline}</Text>
        ) : null}

        <View style={styles.coverDivider} />

        <Text style={[styles.coverMeta, { fontSize: 12, color: '#52525b', marginBottom: 8 }]}>
          Brand Guidelines
        </Text>

        <Text style={styles.coverMeta}>Version {version}</Text>
        <Text style={styles.coverMeta}>{date}</Text>

        {preparedBy ? (
          <Text style={[styles.coverMeta, { marginTop: 16 }]}>
            Prepared by {preparedBy}
          </Text>
        ) : null}
      </View>
    </Page>
  );
}
