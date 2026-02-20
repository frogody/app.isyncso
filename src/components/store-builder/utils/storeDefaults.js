// ---------------------------------------------------------------------------
// storeDefaults.js -- Default configuration objects for every store section
// type and the full default StoreConfig used by the B2B Store Builder.
// ---------------------------------------------------------------------------

// ---- Theme ----------------------------------------------------------------

export const DEFAULT_THEME = {
  mode: 'dark',
  primaryColor: '#06b6d4',
  secondaryColor: '#8b5cf6',
  accentColor: '#f59e0b',
  backgroundColor: '#09090b',
  surfaceColor: '#18181b',
  textColor: '#fafafa',
  mutedTextColor: '#a1a1aa',
  borderColor: '#27272a',
  font: 'Inter',
  headingFont: 'Inter',
  borderRadius: 'md',
  spacing: 'comfortable',
};

// ---- Navigation -----------------------------------------------------------

export const DEFAULT_NAVIGATION = {
  layout: 'horizontal',
  sticky: true,
  items: [
    { id: 'nav_products', label: 'Products', href: '/products', type: 'link' },
    { id: 'nav_about', label: 'About', href: '/about', type: 'link' },
    { id: 'nav_contact', label: 'Contact', href: '/contact', type: 'link' },
  ],
  showSearch: true,
  showCart: true,
  showAccount: true,
  logoPosition: 'left',
};

// ---- Catalog --------------------------------------------------------------

export const DEFAULT_CATALOG = {
  layout: 'grid',
  columns: 3,
  cardStyle: 'detailed',
  showFilters: true,
  showSearch: true,
  showPricing: true,
  showStock: true,
  itemsPerPage: 24,
  sortOptions: ['name', 'price', 'newest', 'popularity'],
  defaultSort: 'name',
};

// ---- Product Detail -------------------------------------------------------

export const DEFAULT_PRODUCT_DETAIL = {
  imagePosition: 'left',
  showGallery: true,
  showSpecifications: true,
  showRelatedProducts: true,
  showInquiryButton: true,
  showBulkPricing: true,
  showStock: true,
  showSKU: true,
  showCategories: true,
};

// ---- Footer ---------------------------------------------------------------

export const DEFAULT_FOOTER = {
  style: 'simple',
  copyrightText: '\u00a9 {year} Your Company. All rights reserved.',
  showSocial: false,
  socialLinks: [],
  columns: [],
  showNewsletter: false,
};

// ---- SEO ------------------------------------------------------------------

export const DEFAULT_SEO = {
  title: '',
  description: '',
  ogImage: null,
  favicon: null,
  keywords: [],
  robots: 'index, follow',
};

// ---- Section Props (keyed by section type) --------------------------------

export const DEFAULT_SECTION_PROPS = {
  hero: {
    heading: 'Wholesale Solutions for Your Business',
    subheading:
      'Premium products at competitive prices. Streamline your supply chain with our extensive B2B catalog.',
    ctaText: 'Browse Catalog',
    ctaLink: '/products',
    secondaryCtaText: 'Request Quote',
    secondaryCtaLink: '/contact',
    backgroundImage: null,
    alignment: 'center',
    overlay: true,
    overlayOpacity: 0.6,
  },

  featured_products: {
    heading: 'Featured Products',
    subheading: 'Hand-picked selections from our latest inventory',
    productIds: [],
    maxItems: 8,
    columns: 4,
    showPricing: true,
    showQuickInquiry: true,
    cardStyle: 'detailed',
  },

  category_grid: {
    heading: 'Shop by Category',
    subheading: 'Browse our complete range of wholesale products',
    categories: [],
    columns: 3,
    style: 'card',
    showCount: true,
    showImage: true,
  },

  about: {
    heading: 'About Our Company',
    content:
      'We are a leading wholesale supplier committed to delivering quality products at competitive prices. With years of industry experience, we have built lasting relationships with businesses of all sizes.',
    image: null,
    imagePosition: 'right',
    stats: [
      { label: 'Years in Business', value: '15+' },
      { label: 'Active Clients', value: '500+' },
      { label: 'Products', value: '10,000+' },
    ],
    showStats: true,
  },

  testimonials: {
    heading: 'What Our Clients Say',
    subheading: 'Trusted by businesses across the industry',
    items: [
      {
        quote:
          'Outstanding product quality and reliable delivery. They have been our go-to supplier for over five years.',
        author: 'Sarah Mitchell',
        company: 'Mitchell Retail Group',
        avatar: null,
      },
      {
        quote:
          'Competitive pricing and excellent customer service. Their bulk ordering system saves us hours every week.',
        author: 'James Chen',
        company: 'Pacific Trade Co.',
        avatar: null,
      },
      {
        quote:
          'A true partner in our growth. Their product range and flexible terms have been instrumental in scaling our operations.',
        author: 'Maria Rodriguez',
        company: 'Rodriguez & Sons Distribution',
        avatar: null,
      },
    ],
    style: 'card',
    columns: 3,
    autoplay: false,
  },

  cta: {
    heading: 'Ready to Get Started?',
    subheading:
      'Create your wholesale account today and unlock exclusive pricing, bulk discounts, and priority support.',
    ctaText: 'Create Account',
    ctaLink: '/register',
    secondaryCtaText: 'Contact Sales',
    secondaryCtaLink: '/contact',
    style: 'banner',
    alignment: 'center',
  },

  faq: {
    heading: 'Frequently Asked Questions',
    subheading: 'Everything you need to know about ordering wholesale',
    items: [
      {
        question: 'What are your minimum order quantities?',
        answer:
          'Minimum order quantities vary by product category. Most items start at 10 units, with volume discounts available at higher quantities.',
      },
      {
        question: 'Do you offer international shipping?',
        answer:
          'Yes, we ship to over 40 countries worldwide. Shipping costs and delivery times are calculated at checkout based on your location and order size.',
      },
      {
        question: 'What payment methods do you accept?',
        answer:
          'We accept bank transfers, credit cards, and offer NET-30 payment terms for approved accounts. Contact our sales team for details.',
      },
      {
        question: 'Can I request product samples?',
        answer:
          'Absolutely. Sample requests can be submitted through your account dashboard or by contacting our sales team directly.',
      },
      {
        question: 'How do I apply for a wholesale account?',
        answer:
          'Click the "Create Account" button and complete the registration form. Our team will review your application within 1-2 business days.',
      },
    ],
    style: 'accordion',
    columns: 1,
  },

  contact: {
    heading: 'Get in Touch',
    subheading:
      'Have a question or need a custom quote? Our team is ready to help.',
    showForm: true,
    showMap: false,
    showPhone: true,
    showEmail: true,
    showAddress: true,
    phone: '+1 (555) 000-0000',
    email: 'sales@example.com',
    address: '123 Commerce Street, Suite 100, Business City, ST 12345',
    formFields: ['name', 'email', 'company', 'phone', 'message'],
  },

  banner: {
    text: 'Free shipping on orders over $500 | New customers get 10% off first order',
    link: null,
    linkText: null,
    dismissible: true,
    style: 'info',
    position: 'top',
  },

  stats: {
    heading: 'Why Choose Us',
    subheading: null,
    items: [
      { value: '15+', label: 'Years of Experience' },
      { value: '10,000+', label: 'Products Available' },
      { value: '500+', label: 'Active B2B Clients' },
      { value: '99.5%', label: 'Order Accuracy' },
    ],
    columns: 4,
    style: 'simple',
    alignment: 'center',
  },

  rich_text: {
    heading: null,
    content:
      '<p>Use this section to add custom content, policies, announcements, or any other information relevant to your wholesale customers.</p>',
    alignment: 'left',
    maxWidth: '800px',
  },

  logo_grid: {
    heading: 'Trusted by Industry Leaders',
    subheading: 'Proud to supply businesses that demand the best',
    logos: [],
    columns: 6,
    grayscale: true,
    showTooltip: true,
    style: 'grid',
  },
};

// ---- Section Factory ------------------------------------------------------

let _sectionOrderCounter = 0;

/**
 * Creates a complete section object with a unique id, the given type, default
 * visibility, and the matching default props.
 *
 * @param {string} type - One of the 12 valid section types.
 * @param {number} [order] - Explicit order index. Auto-increments if omitted.
 * @returns {object} A section configuration object.
 */
export function createDefaultSection(type, order) {
  const id = 'sec_' + Math.random().toString(36).slice(2, 10);
  const resolvedOrder = typeof order === 'number' ? order : _sectionOrderCounter++;
  const props = DEFAULT_SECTION_PROPS[type];

  if (!props) {
    throw new Error(`Unknown section type: "${type}". Check VALID_SECTION_TYPES for allowed values.`);
  }

  return {
    id,
    type,
    visible: true,
    order: resolvedOrder,
    padding: 'lg',
    background: 'default',
    customClass: '',
    props: { ...props },
  };
}

// ---- Full Default Store Config --------------------------------------------

export const DEFAULT_STORE_CONFIG = {
  version: '1.0',
  theme: { ...DEFAULT_THEME },
  navigation: {
    ...DEFAULT_NAVIGATION,
    items: DEFAULT_NAVIGATION.items.map((item) => ({ ...item })),
  },
  catalog: { ...DEFAULT_CATALOG },
  productDetail: { ...DEFAULT_PRODUCT_DETAIL },
  footer: { ...DEFAULT_FOOTER },
  seo: { ...DEFAULT_SEO },
  sections: [
    createDefaultSection('hero', 0),
    createDefaultSection('featured_products', 1),
  ],
  customCss: '',
  customHead: '',
};
