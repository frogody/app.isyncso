// ---------------------------------------------------------------------------
// storeValidation.js -- Validation utilities for StoreConfig objects used by
// the B2B Store Builder.
// ---------------------------------------------------------------------------

/**
 * All recognised section type strings. Any section whose `type` is not in this
 * list is considered invalid.
 */
export const VALID_SECTION_TYPES = [
  'hero',
  'featured_products',
  'category_grid',
  'about',
  'testimonials',
  'cta',
  'faq',
  'contact',
  'banner',
  'stats',
  'rich_text',
  'logo_grid',
];

/**
 * Returns `true` when `type` is one of the 12 recognised section types.
 *
 * @param {string} type
 * @returns {boolean}
 */
export function isValidSectionType(type) {
  return VALID_SECTION_TYPES.includes(type);
}

// ---- Internal helpers -----------------------------------------------------

const REQUIRED_THEME_FIELDS = [
  'mode',
  'primaryColor',
  'backgroundColor',
  'textColor',
  'font',
];

const VALID_THEME_MODES = ['light', 'dark'];

const VALID_NAV_LAYOUTS = ['horizontal', 'vertical'];

const VALID_FOOTER_STYLES = ['simple', 'multi-column', 'minimal'];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function looksLikeColor(value) {
  if (typeof value !== 'string') return false;
  // Accept hex, rgb(), rgba(), hsl(), hsla(), or named CSS colors (loose check)
  return (
    HEX_COLOR_RE.test(value) ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    /^[a-zA-Z]+$/.test(value)
  );
}

// ---- Main validator -------------------------------------------------------

/**
 * Validates a StoreConfig object, returning a result with a `valid` boolean
 * and an `errors` array of human-readable messages.
 *
 * @param {object} config - The StoreConfig to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateStoreConfig(config) {
  const errors = [];

  // -- Top-level structure --------------------------------------------------

  if (config === null || config === undefined || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be a non-null object.'] };
  }

  // Version
  if (config.version !== '1.0') {
    errors.push(
      `Invalid or missing version. Expected "1.0", received "${String(config.version)}".`
    );
  }

  // -- Theme ----------------------------------------------------------------

  if (!config.theme || typeof config.theme !== 'object') {
    errors.push('Missing or invalid "theme" object.');
  } else {
    for (const field of REQUIRED_THEME_FIELDS) {
      if (!isNonEmptyString(config.theme[field])) {
        errors.push(`Theme is missing required field "${field}".`);
      }
    }

    if (
      config.theme.mode &&
      !VALID_THEME_MODES.includes(config.theme.mode)
    ) {
      errors.push(
        `Invalid theme mode "${config.theme.mode}". Expected one of: ${VALID_THEME_MODES.join(', ')}.`
      );
    }

    // Validate color fields look like valid CSS colors
    const colorFields = [
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'backgroundColor',
      'surfaceColor',
      'textColor',
      'mutedTextColor',
      'borderColor',
    ];
    for (const field of colorFields) {
      const value = config.theme[field];
      if (value !== undefined && value !== null && !looksLikeColor(value)) {
        errors.push(
          `Theme field "${field}" does not look like a valid CSS color: "${String(value)}".`
        );
      }
    }
  }

  // -- Sections -------------------------------------------------------------

  if (!Array.isArray(config.sections)) {
    errors.push('Missing or invalid "sections" array.');
  } else {
    const sectionIds = new Set();

    config.sections.forEach((section, index) => {
      if (!section || typeof section !== 'object') {
        errors.push(`Section at index ${index} is not a valid object.`);
        return;
      }

      // id
      if (!isNonEmptyString(section.id)) {
        errors.push(`Section at index ${index} is missing a valid "id".`);
      } else if (sectionIds.has(section.id)) {
        errors.push(`Duplicate section id "${section.id}" at index ${index}.`);
      } else {
        sectionIds.add(section.id);
      }

      // type
      if (!isNonEmptyString(section.type)) {
        errors.push(`Section at index ${index} is missing a "type".`);
      } else if (!isValidSectionType(section.type)) {
        errors.push(
          `Section "${section.id || index}" has invalid type "${section.type}". Valid types: ${VALID_SECTION_TYPES.join(', ')}.`
        );
      }

      // order
      if (section.order !== undefined && typeof section.order !== 'number') {
        errors.push(
          `Section "${section.id || index}" has a non-numeric "order" value.`
        );
      }

      // visible
      if (
        section.visible !== undefined &&
        typeof section.visible !== 'boolean'
      ) {
        errors.push(
          `Section "${section.id || index}" has a non-boolean "visible" value.`
        );
      }
    });
  }

  // -- Navigation -----------------------------------------------------------

  if (!config.navigation || typeof config.navigation !== 'object') {
    errors.push('Missing or invalid "navigation" object.');
  } else {
    if (
      config.navigation.layout &&
      !VALID_NAV_LAYOUTS.includes(config.navigation.layout)
    ) {
      errors.push(
        `Invalid navigation layout "${config.navigation.layout}". Expected one of: ${VALID_NAV_LAYOUTS.join(', ')}.`
      );
    }

    if (
      config.navigation.items !== undefined &&
      !Array.isArray(config.navigation.items)
    ) {
      errors.push('Navigation "items" must be an array if provided.');
    }
  }

  // -- Footer ---------------------------------------------------------------

  if (!config.footer || typeof config.footer !== 'object') {
    errors.push('Missing or invalid "footer" object.');
  } else {
    if (
      config.footer.style &&
      !VALID_FOOTER_STYLES.includes(config.footer.style)
    ) {
      errors.push(
        `Invalid footer style "${config.footer.style}". Expected one of: ${VALID_FOOTER_STYLES.join(', ')}.`
      );
    }
  }

  // -- Catalog & Product Detail (optional but validated if present) ----------

  if (config.catalog !== undefined && typeof config.catalog !== 'object') {
    errors.push('"catalog" must be an object if provided.');
  }

  if (
    config.productDetail !== undefined &&
    typeof config.productDetail !== 'object'
  ) {
    errors.push('"productDetail" must be an object if provided.');
  }

  // -- SEO (optional but validated if present) ------------------------------

  if (config.seo !== undefined && typeof config.seo !== 'object') {
    errors.push('"seo" must be an object if provided.');
  }

  // -- Result ---------------------------------------------------------------

  return {
    valid: errors.length === 0,
    errors,
  };
}
