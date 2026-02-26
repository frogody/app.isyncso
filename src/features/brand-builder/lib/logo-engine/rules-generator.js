/**
 * Logo rules generator.
 * Produces clear space rules, minimum sizes, approved backgrounds,
 * 8 "don'ts" with example SVGs, and a construction grid.
 */

/**
 * Generate logo usage rules.
 * @param {object} concept - The final LogoConcept with svg_source
 * @param {object} palette - Color system palette
 * @param {object} typography - Typography system
 * @returns {object} LogoRules schema-compliant
 */
export function generateLogoRules(concept, palette, typography) {
  const h1Size = typography?.scale?.h1?.font_size_px || 36;
  const capHeight = Math.round(h1Size * 0.7);

  return {
    clear_space: {
      unit: 'cap_height',
      value: 1.5,
      description: `Maintain a clear space of 1.5\u00d7 the logo\u2019s cap height (~${Math.round(capHeight * 1.5)}px) on all sides. No text, images, or other elements may enter this zone.`,
    },
    minimum_size: {
      digital_px: 80,
      print_mm: 20,
    },
    approved_backgrounds: [
      '#FFFFFF',
      palette?.neutrals?.light_gray || '#F5F5F5',
      palette?.neutrals?.near_black || '#1A1A1A',
      palette?.primary?.base || '#000000',
    ],
    donts: generateDonts(concept.svg_source),
  };
}

/**
 * Generate the construction grid SVG overlay.
 * @param {object} concept - The final LogoConcept
 * @returns {object} LogoGrid { svg, description }
 */
export function generateConstructionGrid(concept) {
  // Build a grid overlay showing geometric proportions
  const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
<defs>
<pattern id="grid-sm" width="10" height="10" patternUnits="userSpaceOnUse">
<path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(59,130,246,0.15)" stroke-width="0.5"/>
</pattern>
<pattern id="grid-lg" width="50" height="50" patternUnits="userSpaceOnUse">
<rect width="50" height="50" fill="url(#grid-sm)"/>
<path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(59,130,246,0.3)" stroke-width="1"/>
</pattern>
</defs>
<rect width="400" height="200" fill="url(#grid-lg)"/>
<!-- Center lines -->
<line x1="200" y1="0" x2="200" y2="200" stroke="rgba(239,68,68,0.4)" stroke-width="1" stroke-dasharray="4,4"/>
<line x1="0" y1="100" x2="400" y2="100" stroke="rgba(239,68,68,0.4)" stroke-width="1" stroke-dasharray="4,4"/>
<!-- Golden ratio guide circles -->
<circle cx="200" cy="100" r="80" fill="none" stroke="rgba(59,130,246,0.3)" stroke-width="1" stroke-dasharray="6,3"/>
<circle cx="200" cy="100" r="50" fill="none" stroke="rgba(59,130,246,0.2)" stroke-width="1" stroke-dasharray="6,3"/>
<!-- Bounding box -->
<rect x="50" y="30" width="300" height="140" fill="none" stroke="rgba(234,179,8,0.5)" stroke-width="1.5" stroke-dasharray="8,4"/>
</svg>`;

  return {
    svg: gridSvg,
    description: 'Construction grid showing alignment axes, proportional circles, and bounding box. The logo is centered within the golden-ratio guides to ensure visual balance across all applications.',
  };
}

// ── Don'ts Generator ──────────────────────────────────────────────────────────

function generateDonts(svgSource) {
  return [
    {
      description: 'Do not stretch or distort the logo',
      example_svg: wrapWithTransform(svgSource, 'scale(1.5, 1)'),
      rule_id: 'no-stretch',
    },
    {
      description: 'Do not rotate the logo',
      example_svg: wrapWithTransform(svgSource, 'rotate(15, 200, 100)'),
      rule_id: 'no-rotate',
    },
    {
      description: 'Do not use unauthorized colors',
      example_svg: recolorAll(svgSource, '#FF00FF'),
      rule_id: 'no-wrong-colors',
    },
    {
      description: 'Do not add drop shadows or effects',
      example_svg: addDropShadow(svgSource),
      rule_id: 'no-effects',
    },
    {
      description: 'Do not crop or cover parts of the logo',
      example_svg: addCropClip(svgSource),
      rule_id: 'no-crop',
    },
    {
      description: 'Do not place on busy or patterned backgrounds',
      example_svg: addBusyBackground(svgSource),
      rule_id: 'no-busy-bg',
    },
    {
      description: 'Do not add outlines or borders to the logo',
      example_svg: addOutline(svgSource),
      rule_id: 'no-outline',
    },
    {
      description: 'Do not reduce opacity or make transparent',
      example_svg: addOpacity(svgSource),
      rule_id: 'no-opacity',
    },
  ];
}

// ── SVG Manipulation Helpers ──────────────────────────────────────────────────

function wrapWithTransform(svgString, transform) {
  // Wrap the SVG content (everything between first <svg> and </svg>) in a <g> with transform
  return svgString.replace(
    /(<svg[^>]*>)([\s\S]*?)(<\/svg>)/,
    `$1<g transform="${transform}">$2</g>$3`,
  );
}

function recolorAll(svgString, wrongColor) {
  return svgString.replace(/fill="(#[0-9a-fA-F]{3,8})"/g, `fill="${wrongColor}"`);
}

function addDropShadow(svgString) {
  const filterDef = `<defs><filter id="ds"><feDropShadow dx="4" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/></filter></defs>`;
  return svgString.replace(
    /(<svg[^>]*>)([\s\S]*?)(<\/svg>)/,
    `$1${filterDef}<g filter="url(#ds)">$2</g>$3`,
  );
}

function addCropClip(svgString) {
  // Clip to right 70% to simulate cropping
  const clipDef = `<defs><clipPath id="crop"><rect x="0" y="0" width="70%" height="100%"/></clipPath></defs>`;
  return svgString.replace(
    /(<svg[^>]*>)([\s\S]*?)(<\/svg>)/,
    `$1${clipDef}<g clip-path="url(#crop)">$2</g>$3`,
  );
}

function addBusyBackground(svgString) {
  // Add diagonal stripes behind the logo
  const bg = `<defs><pattern id="busy" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="rgba(200,200,200,0.5)"/></pattern></defs><rect width="100%" height="100%" fill="url(#busy)"/>`;
  return svgString.replace(
    /(<svg[^>]*>)/,
    `$1${bg}`,
  );
}

function addOutline(svgString) {
  // Add stroke to all paths
  return svgString
    .replace(/<path /g, '<path stroke="#FF0000" stroke-width="3" ')
    .replace(/<text /g, '<text stroke="#FF0000" stroke-width="1" ');
}

function addOpacity(svgString) {
  return svgString.replace(
    /(<svg[^>]*>)([\s\S]*?)(<\/svg>)/,
    `$1<g opacity="0.3">$2</g>$3`,
  );
}
