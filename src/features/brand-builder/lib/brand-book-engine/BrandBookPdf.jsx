/**
 * Brand Book PDF — Main @react-pdf/renderer Document.
 * Composes all section components into a complete brand guidelines PDF.
 */
import React from 'react';
import { Document } from '@react-pdf/renderer';
import CoverPage from './sections/CoverPage.jsx';
import TableOfContents from './sections/TableOfContents.jsx';
import BrandDNASection from './sections/BrandDNASection.jsx';
import ColorSection from './sections/ColorSection.jsx';
import TypographySection from './sections/TypographySection.jsx';
import LogoSection from './sections/LogoSection.jsx';
import VerbalIdentitySection from './sections/VerbalIdentitySection.jsx';
import VisualLanguageSection from './sections/VisualLanguageSection.jsx';
import ApplicationsSection from './sections/ApplicationsSection.jsx';

/**
 * Complete Brand Book PDF Document.
 *
 * @param {Object} props
 * @param {Object} props.project — full BrandProject
 * @param {Object} props.images — pre-converted PNG data URLs from prepareAllImages
 * @param {Object} props.config — { sections, version, date, preparedBy }
 * @param {Object} props.styles — from createBrandBookStyles
 */
export default function BrandBookPdf({ project, images, config, styles }) {
  const sections = config?.sections || {};

  return (
    <Document
      title={`${project?.brand_dna?.company_name || 'Brand'} Guidelines`}
      author={config?.preparedBy || 'Brand Builder'}
      subject="Brand Guidelines"
    >
      {/* Cover Page — always included */}
      <CoverPage
        project={project}
        images={images}
        config={config}
        styles={styles}
      />

      {/* Table of Contents */}
      <TableOfContents
        enabledSections={sections}
        styles={styles}
      />

      {/* Conditional Sections */}
      {sections.brand_dna && project?.brand_dna && (
        <BrandDNASection project={project} styles={styles} />
      )}

      {sections.color_system && project?.color_system && (
        <ColorSection project={project} styles={styles} />
      )}

      {sections.typography && project?.typography_system && (
        <TypographySection project={project} styles={styles} />
      )}

      {sections.logo_system && project?.logo_system && (
        <LogoSection project={project} images={images} styles={styles} />
      )}

      {sections.verbal_identity && project?.verbal_identity && (
        <VerbalIdentitySection project={project} styles={styles} />
      )}

      {sections.visual_language && project?.visual_language && (
        <VisualLanguageSection project={project} images={images} styles={styles} />
      )}

      {sections.applications && project?.applications && (
        <ApplicationsSection project={project} images={images} styles={styles} />
      )}
    </Document>
  );
}
