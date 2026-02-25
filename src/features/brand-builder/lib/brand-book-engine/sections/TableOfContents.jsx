/**
 * Brand Book PDF — Table of Contents.
 * Lists enabled sections with estimated page numbers.
 */
import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';

const SECTION_DEFS = [
  { id: 'brand_dna', title: 'Brand DNA', pages: 3 },
  { id: 'color_system', title: 'Color System', pages: 3 },
  { id: 'typography', title: 'Typography', pages: 2 },
  { id: 'logo_system', title: 'Logo System', pages: 5 },
  { id: 'verbal_identity', title: 'Verbal Identity', pages: 4 },
  { id: 'visual_language', title: 'Visual Language', pages: 3 },
  { id: 'applications', title: 'Applications', pages: 5 },
];

export default function TableOfContents({ enabledSections, styles }) {
  // Calculate page starts (cover=1, TOC=2, first section starts at 3)
  let pageNum = 3;
  const entries = [];

  for (const def of SECTION_DEFS) {
    if (!enabledSections[def.id]) continue;
    entries.push({ ...def, pageStart: pageNum });
    pageNum += def.pages;
  }

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Table of Contents</Text>
      </View>

      {entries.map((entry, idx) => (
        <View
          key={entry.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#f4f4f5',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 12, color: '#a1a1aa', width: 20 }}>
              {String(idx + 1).padStart(2, '0')}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#18181b' }}>
              {entry.title}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: '#a1a1aa' }}>{entry.pageStart}</Text>
        </View>
      ))}
    </Page>
  );
}

export { SECTION_DEFS };
