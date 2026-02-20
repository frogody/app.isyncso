// ---------------------------------------------------------------------------
// storeTemplates.js -- Six built-in B2B store templates, each providing a
// complete StoreConfig ready for immediate use or customisation.
// ---------------------------------------------------------------------------

import { DEFAULT_SECTION_PROPS } from './storeDefaults.js';

// ---- Helpers --------------------------------------------------------------

/** Create a section with an explicit id to keep templates deterministic. */
function section(id, type, order, propsOverrides = {}, sectionOverrides = {}) {
  return {
    id,
    type,
    visible: true,
    order,
    padding: 'lg',
    background: 'default',
    customClass: '',
    props: { ...DEFAULT_SECTION_PROPS[type], ...propsOverrides },
    ...sectionOverrides,
  };
}

// ---- 1. Modern Minimal ----------------------------------------------------

const modernMinimal = {
  id: 'tpl_modern_minimal',
  name: 'Modern Minimal',
  description:
    'Clean, light design with generous whitespace. Perfect for brands that value simplicity and clarity.',
  category: 'minimal',
  industry: 'general',
  thumbnail: null,
  config: {
    version: '1.0',
    theme: {
      mode: 'light',
      primaryColor: '#3b82f6',
      secondaryColor: '#6366f1',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      surfaceColor: '#f8fafc',
      textColor: '#0f172a',
      mutedTextColor: '#64748b',
      borderColor: '#e2e8f0',
      font: 'Inter',
      headingFont: 'Inter',
      borderRadius: 'md',
      spacing: 'comfortable',
    },
    navigation: {
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
    },
    catalog: {
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
    },
    productDetail: {
      imagePosition: 'left',
      showGallery: true,
      showSpecifications: true,
      showRelatedProducts: true,
      showInquiryButton: true,
      showBulkPricing: true,
      showStock: true,
      showSKU: true,
      showCategories: true,
    },
    footer: {
      style: 'simple',
      copyrightText: '\u00a9 {year} Your Company. All rights reserved.',
      showSocial: false,
      socialLinks: [],
      columns: [],
      showNewsletter: false,
    },
    seo: {
      title: '',
      description: '',
      ogImage: null,
      favicon: null,
      keywords: [],
      robots: 'index, follow',
    },
    sections: [
      section('mm_hero', 'hero', 0, {
        heading: 'Quality Products, Delivered Simply',
        subheading:
          'No clutter, no noise. Just the products your business needs, at wholesale prices you can count on.',
        ctaText: 'View Products',
        ctaLink: '/products',
        secondaryCtaText: 'Get a Quote',
        secondaryCtaLink: '/contact',
        alignment: 'center',
      }),
      section('mm_featured', 'featured_products', 1, {
        heading: 'New Arrivals',
        subheading: 'The latest additions to our wholesale catalog',
        columns: 4,
      }),
      section('mm_cta', 'cta', 2, {
        heading: 'Start Ordering Today',
        subheading:
          'Create your free wholesale account in minutes and gain access to our complete catalog with exclusive pricing.',
        ctaText: 'Get Started',
        ctaLink: '/register',
        secondaryCtaText: 'Learn More',
        secondaryCtaLink: '/about',
        style: 'banner',
      }),
    ],
    customCss: '',
    customHead: '',
  },
};

// ---- 2. Dark Professional -------------------------------------------------

const darkProfessional = {
  id: 'tpl_dark_professional',
  name: 'Dark Professional',
  description:
    'Sleek dark interface with cyan accents and monospace headings. Ideal for tech, electronics, and modern wholesale brands.',
  category: 'dark',
  industry: 'technology',
  thumbnail: null,
  config: {
    version: '1.0',
    theme: {
      mode: 'dark',
      primaryColor: '#06b6d4',
      secondaryColor: '#14b8a6',
      accentColor: '#f59e0b',
      backgroundColor: '#09090b',
      surfaceColor: '#18181b',
      textColor: '#fafafa',
      mutedTextColor: '#a1a1aa',
      borderColor: '#27272a',
      font: 'Inter',
      headingFont: 'JetBrains Mono',
      borderRadius: 'md',
      spacing: 'comfortable',
    },
    navigation: {
      layout: 'horizontal',
      sticky: true,
      items: [
        { id: 'nav_products', label: 'Products', href: '/products', type: 'link' },
        { id: 'nav_solutions', label: 'Solutions', href: '/solutions', type: 'link' },
        { id: 'nav_about', label: 'About', href: '/about', type: 'link' },
        { id: 'nav_contact', label: 'Contact', href: '/contact', type: 'link' },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      logoPosition: 'left',
    },
    catalog: {
      layout: 'grid',
      columns: 3,
      cardStyle: 'detailed',
      showFilters: true,
      showSearch: true,
      showPricing: true,
      showStock: true,
      itemsPerPage: 24,
      sortOptions: ['name', 'price', 'newest', 'popularity'],
      defaultSort: 'popularity',
    },
    productDetail: {
      imagePosition: 'left',
      showGallery: true,
      showSpecifications: true,
      showRelatedProducts: true,
      showInquiryButton: true,
      showBulkPricing: true,
      showStock: true,
      showSKU: true,
      showCategories: true,
    },
    footer: {
      style: 'simple',
      copyrightText: '\u00a9 {year} Your Company. All rights reserved.',
      showSocial: true,
      socialLinks: [
        { platform: 'linkedin', url: '#' },
        { platform: 'twitter', url: '#' },
      ],
      columns: [],
      showNewsletter: true,
    },
    seo: {
      title: '',
      description: '',
      ogImage: null,
      favicon: null,
      keywords: [],
      robots: 'index, follow',
    },
    sections: [
      section('dp_hero', 'hero', 0, {
        heading: 'Enterprise-Grade Supply Chain',
        subheading:
          'Cutting-edge products backed by data-driven logistics. Scale your operations with a partner built for performance.',
        ctaText: 'Explore Catalog',
        ctaLink: '/products',
        secondaryCtaText: 'Book a Demo',
        secondaryCtaLink: '/contact',
        alignment: 'center',
        overlay: true,
        overlayOpacity: 0.7,
      }),
      section('dp_stats', 'stats', 1, {
        heading: 'Built for Scale',
        items: [
          { value: '50M+', label: 'Units Shipped Annually' },
          { value: '99.8%', label: 'Uptime Guarantee' },
          { value: '2,500+', label: 'Enterprise Clients' },
          { value: '24/7', label: 'Technical Support' },
        ],
        style: 'simple',
      }),
      section('dp_featured', 'featured_products', 2, {
        heading: 'Trending Products',
        subheading: 'High-demand items moving fast across our network',
        columns: 4,
      }),
      section('dp_about', 'about', 3, {
        heading: 'Powering Modern Commerce',
        content:
          'Our platform combines advanced inventory management with a global distribution network. We deliver precision logistics so you can focus on growing your business.',
        stats: [
          { label: 'Distribution Centers', value: '12' },
          { label: 'Countries Served', value: '35+' },
          { label: 'SKUs Available', value: '50,000+' },
        ],
        imagePosition: 'right',
      }),
    ],
    customCss: '',
    customHead: '',
  },
};

// ---- 3. Industrial --------------------------------------------------------

const industrial = {
  id: 'tpl_industrial',
  name: 'Industrial',
  description:
    'Bold dark design with orange accents. Built for industrial equipment, hardware, and manufacturing supply companies.',
  category: 'bold',
  industry: 'industrial',
  thumbnail: null,
  config: {
    version: '1.0',
    theme: {
      mode: 'dark',
      primaryColor: '#f97316',
      secondaryColor: '#ea580c',
      accentColor: '#facc15',
      backgroundColor: '#1c1917',
      surfaceColor: '#292524',
      textColor: '#fafaf9',
      mutedTextColor: '#a8a29e',
      borderColor: '#44403c',
      font: 'Inter',
      headingFont: 'Inter',
      borderRadius: 'sm',
      spacing: 'comfortable',
    },
    navigation: {
      layout: 'horizontal',
      sticky: true,
      items: [
        { id: 'nav_products', label: 'Products', href: '/products', type: 'link' },
        { id: 'nav_categories', label: 'Categories', href: '/categories', type: 'link' },
        { id: 'nav_contact', label: 'Contact', href: '/contact', type: 'link' },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      logoPosition: 'left',
    },
    catalog: {
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
    },
    productDetail: {
      imagePosition: 'left',
      showGallery: true,
      showSpecifications: true,
      showRelatedProducts: true,
      showInquiryButton: true,
      showBulkPricing: true,
      showStock: true,
      showSKU: true,
      showCategories: true,
    },
    footer: {
      style: 'simple',
      copyrightText: '\u00a9 {year} Your Company. All rights reserved.',
      showSocial: false,
      socialLinks: [],
      columns: [],
      showNewsletter: false,
    },
    seo: {
      title: '',
      description: '',
      ogImage: null,
      favicon: null,
      keywords: [],
      robots: 'index, follow',
    },
    sections: [
      section('ind_hero', 'hero', 0, {
        heading: 'Industrial Supplies, Built to Last',
        subheading:
          'Heavy-duty equipment, raw materials, and industrial components. Sourced from trusted manufacturers, delivered on time.',
        ctaText: 'Shop Equipment',
        ctaLink: '/products',
        secondaryCtaText: 'Request Bulk Quote',
        secondaryCtaLink: '/contact',
        alignment: 'left',
        overlay: true,
        overlayOpacity: 0.65,
      }),
      section('ind_categories', 'category_grid', 1, {
        heading: 'Product Categories',
        subheading: 'Find exactly what your operation needs',
        columns: 3,
        style: 'card',
      }),
      section('ind_stats', 'stats', 2, {
        heading: 'Proven Track Record',
        items: [
          { value: '25+', label: 'Years in the Industry' },
          { value: '8,000+', label: 'Industrial SKUs' },
          { value: '98.7%', label: 'On-Time Delivery' },
          { value: '1,200+', label: 'Active Accounts' },
        ],
        style: 'simple',
      }),
      section('ind_contact', 'contact', 3, {
        heading: 'Talk to Our Team',
        subheading:
          'Need a custom order or technical specifications? Our industrial specialists are standing by.',
        showForm: true,
        showPhone: true,
        showEmail: true,
        showAddress: true,
        phone: '+1 (555) 000-0000',
        email: 'industrial@example.com',
        address: '456 Industrial Parkway, Building C, Manufacturing City, ST 67890',
      }),
    ],
    customCss: '',
    customHead: '',
  },
};

// ---- 4. Premium Wholesale -------------------------------------------------

const premiumWholesale = {
  id: 'tpl_premium_wholesale',
  name: 'Premium Wholesale',
  description:
    'Refined light design with cream tones and serif headings. Perfect for luxury goods, premium food & beverage, and artisan wholesale.',
  category: 'premium',
  industry: 'luxury',
  thumbnail: null,
  config: {
    version: '1.0',
    theme: {
      mode: 'light',
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      accentColor: '#d97706',
      backgroundColor: '#faf5ef',
      surfaceColor: '#ffffff',
      textColor: '#1c1917',
      mutedTextColor: '#78716c',
      borderColor: '#e7e5e4',
      font: 'Inter',
      headingFont: 'Playfair Display',
      borderRadius: 'md',
      spacing: 'spacious',
    },
    navigation: {
      layout: 'horizontal',
      sticky: true,
      items: [
        { id: 'nav_collection', label: 'Collection', href: '/products', type: 'link' },
        { id: 'nav_brands', label: 'Brands', href: '/brands', type: 'link' },
        { id: 'nav_about', label: 'Our Story', href: '/about', type: 'link' },
        { id: 'nav_contact', label: 'Contact', href: '/contact', type: 'link' },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      logoPosition: 'center',
    },
    catalog: {
      layout: 'grid',
      columns: 3,
      cardStyle: 'detailed',
      showFilters: true,
      showSearch: true,
      showPricing: true,
      showStock: true,
      itemsPerPage: 24,
      sortOptions: ['name', 'price', 'newest', 'popularity'],
      defaultSort: 'newest',
    },
    productDetail: {
      imagePosition: 'left',
      showGallery: true,
      showSpecifications: true,
      showRelatedProducts: true,
      showInquiryButton: true,
      showBulkPricing: true,
      showStock: true,
      showSKU: true,
      showCategories: true,
    },
    footer: {
      style: 'simple',
      copyrightText: '\u00a9 {year} Your Company. All rights reserved.',
      showSocial: true,
      socialLinks: [
        { platform: 'instagram', url: '#' },
        { platform: 'linkedin', url: '#' },
      ],
      columns: [],
      showNewsletter: true,
    },
    seo: {
      title: '',
      description: '',
      ogImage: null,
      favicon: null,
      keywords: [],
      robots: 'index, follow',
    },
    sections: [
      section('pw_hero', 'hero', 0, {
        heading: 'Curated Excellence, Wholesale Pricing',
        subheading:
          'Discover our hand-selected collection of premium products. Exceptional quality meets wholesale value for discerning businesses.',
        ctaText: 'Explore Collection',
        ctaLink: '/products',
        secondaryCtaText: 'Become a Partner',
        secondaryCtaLink: '/contact',
        alignment: 'center',
        overlay: true,
        overlayOpacity: 0.4,
      }),
      section('pw_logos', 'logo_grid', 1, {
        heading: 'Our Brand Partners',
        subheading: 'Representing the finest names in the industry',
        columns: 6,
        grayscale: true,
      }),
      section('pw_featured', 'featured_products', 2, {
        heading: 'Editor\'s Selection',
        subheading: 'This season\'s most sought-after wholesale items',
        columns: 4,
      }),
      section('pw_testimonials', 'testimonials', 3, {
        heading: 'Partner Testimonials',
        subheading: 'Hear from businesses that trust our curation',
        items: [
          {
            quote:
              'The quality of their curated selection is unmatched. Our customers immediately notice the difference.',
            author: 'Alexandre Dubois',
            company: 'Maison Dubois',
            avatar: null,
          },
          {
            quote:
              'Working with a supplier that genuinely understands premium products has transformed our retail offering.',
            author: 'Elena Vasquez',
            company: 'Vasquez Fine Goods',
            avatar: null,
          },
          {
            quote:
              'Reliable, refined, and always ahead of the curve. They are the gold standard for wholesale partners.',
            author: 'Thomas Andersson',
            company: 'Nordic Select Imports',
            avatar: null,
          },
        ],
        style: 'card',
        columns: 3,
      }),
    ],
    customCss: '',
    customHead: '',
  },
};

// ---- 5. Fresh & Clean -----------------------------------------------------

const freshAndClean = {
  id: 'tpl_fresh_clean',
  name: 'Fresh & Clean',
  description:
    'Bright, friendly design with green accents and rounded elements. Great for organic, health, food, or eco-friendly wholesale.',
  category: 'friendly',
  industry: 'health',
  thumbnail: null,
  config: {
    version: '1.0',
    theme: {
      mode: 'light',
      primaryColor: '#22c55e',
      secondaryColor: '#16a34a',
      accentColor: '#eab308',
      backgroundColor: '#ffffff',
      surfaceColor: '#f0fdf4',
      textColor: '#14532d',
      mutedTextColor: '#6b7280',
      borderColor: '#d1d5db',
      font: 'Inter',
      headingFont: 'Inter',
      borderRadius: 'lg',
      spacing: 'comfortable',
    },
    navigation: {
      layout: 'horizontal',
      sticky: true,
      items: [
        { id: 'nav_products', label: 'Products', href: '/products', type: 'link' },
        { id: 'nav_about', label: 'About Us', href: '/about', type: 'link' },
        { id: 'nav_faq', label: 'FAQ', href: '/faq', type: 'link' },
        { id: 'nav_contact', label: 'Contact', href: '/contact', type: 'link' },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      logoPosition: 'left',
    },
    catalog: {
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
    },
    productDetail: {
      imagePosition: 'left',
      showGallery: true,
      showSpecifications: true,
      showRelatedProducts: true,
      showInquiryButton: true,
      showBulkPricing: true,
      showStock: true,
      showSKU: true,
      showCategories: true,
    },
    footer: {
      style: 'simple',
      copyrightText: '\u00a9 {year} Your Company. All rights reserved.',
      showSocial: true,
      socialLinks: [
        { platform: 'instagram', url: '#' },
        { platform: 'facebook', url: '#' },
      ],
      columns: [],
      showNewsletter: true,
    },
    seo: {
      title: '',
      description: '',
      ogImage: null,
      favicon: null,
      keywords: [],
      robots: 'index, follow',
    },
    sections: [
      section('fc_hero', 'hero', 0, {
        heading: 'Fresh Products, Fair Prices',
        subheading:
          'Sourced responsibly, delivered reliably. Your one-stop wholesale partner for natural and organic products.',
        ctaText: 'Browse Products',
        ctaLink: '/products',
        secondaryCtaText: 'Our Mission',
        secondaryCtaLink: '/about',
        alignment: 'center',
      }),
      section('fc_categories', 'category_grid', 1, {
        heading: 'Shop by Category',
        subheading: 'From farm to shelf, we cover every aisle',
        columns: 3,
        style: 'card',
      }),
      section('fc_about', 'about', 2, {
        heading: 'Our Story',
        content:
          'We believe that every business deserves access to high-quality, responsibly sourced products. Founded with a mission to make wholesale simple and sustainable, we work directly with growers and manufacturers to bring you the best.',
        imagePosition: 'right',
        stats: [
          { label: 'Partner Farms', value: '200+' },
          { label: 'Organic Products', value: '3,000+' },
          { label: 'Happy Retailers', value: '800+' },
        ],
      }),
      section('fc_faq', 'faq', 3, {
        heading: 'Common Questions',
        subheading: 'Quick answers to help you get started',
        items: [
          {
            question: 'Are all products certified organic?',
            answer:
              'We carry both certified organic and conventionally grown products. Each listing clearly displays its certifications so you can choose what fits your store.',
          },
          {
            question: 'What is your return policy?',
            answer:
              'We offer a 30-day satisfaction guarantee on all shelf-stable products. Perishable items must be reported within 48 hours of delivery.',
          },
          {
            question: 'Do you offer drop-shipping?',
            answer:
              'Yes, we support drop-shipping for qualifying accounts. Contact our team to learn about requirements and setup.',
          },
          {
            question: 'How quickly do orders ship?',
            answer:
              'Orders placed before 2 PM ship same day. Standard delivery takes 2-5 business days depending on your location.',
          },
        ],
        style: 'accordion',
      }),
    ],
    customCss: '',
    customHead: '',
  },
};

// ---- 6. Corporate ---------------------------------------------------------

const corporate = {
  id: 'tpl_corporate',
  name: 'Corporate',
  description:
    'Structured, professional design with navy tones. Built for large-scale distributors, B2B marketplaces, and enterprise procurement.',
  category: 'corporate',
  industry: 'enterprise',
  thumbnail: null,
  config: {
    version: '1.0',
    theme: {
      mode: 'light',
      primaryColor: '#1e3a5f',
      secondaryColor: '#2563eb',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      surfaceColor: '#f1f5f9',
      textColor: '#0f172a',
      mutedTextColor: '#64748b',
      borderColor: '#cbd5e1',
      font: 'Inter',
      headingFont: 'Inter',
      borderRadius: 'sm',
      spacing: 'comfortable',
    },
    navigation: {
      layout: 'horizontal',
      sticky: true,
      items: [
        { id: 'nav_products', label: 'Products', href: '/products', type: 'link' },
        { id: 'nav_solutions', label: 'Solutions', href: '/solutions', type: 'link' },
        { id: 'nav_industries', label: 'Industries', href: '/industries', type: 'link' },
        { id: 'nav_about', label: 'Company', href: '/about', type: 'link' },
        { id: 'nav_contact', label: 'Contact', href: '/contact', type: 'link' },
      ],
      showSearch: true,
      showCart: true,
      showAccount: true,
      logoPosition: 'left',
    },
    catalog: {
      layout: 'grid',
      columns: 4,
      cardStyle: 'detailed',
      showFilters: true,
      showSearch: true,
      showPricing: true,
      showStock: true,
      itemsPerPage: 24,
      sortOptions: ['name', 'price', 'newest', 'popularity'],
      defaultSort: 'popularity',
    },
    productDetail: {
      imagePosition: 'left',
      showGallery: true,
      showSpecifications: true,
      showRelatedProducts: true,
      showInquiryButton: true,
      showBulkPricing: true,
      showStock: true,
      showSKU: true,
      showCategories: true,
    },
    footer: {
      style: 'simple',
      copyrightText: '\u00a9 {year} Your Company. All rights reserved.',
      showSocial: true,
      socialLinks: [
        { platform: 'linkedin', url: '#' },
        { platform: 'twitter', url: '#' },
      ],
      columns: [],
      showNewsletter: true,
    },
    seo: {
      title: '',
      description: '',
      ogImage: null,
      favicon: null,
      keywords: [],
      robots: 'index, follow',
    },
    sections: [
      section('corp_hero', 'hero', 0, {
        heading: 'Your Trusted Distribution Partner',
        subheading:
          'Enterprise procurement made simple. Access 50,000+ products from verified suppliers with transparent pricing and dedicated account management.',
        ctaText: 'Request a Demo',
        ctaLink: '/contact',
        secondaryCtaText: 'View Products',
        secondaryCtaLink: '/products',
        alignment: 'left',
        overlay: true,
        overlayOpacity: 0.55,
      }),
      section('corp_stats', 'stats', 1, {
        heading: 'The Numbers Speak',
        items: [
          { value: '$2B+', label: 'Annual Transaction Volume' },
          { value: '50,000+', label: 'Products Available' },
          { value: '3,500+', label: 'Enterprise Clients' },
          { value: '45', label: 'Countries Served' },
        ],
        columns: 4,
        style: 'simple',
      }),
      section('corp_featured', 'featured_products', 2, {
        heading: 'Popular This Quarter',
        subheading: 'Top-performing products across our enterprise client base',
        columns: 4,
      }),
      section('corp_testimonials', 'testimonials', 3, {
        heading: 'Client Success Stories',
        subheading: 'How leading companies streamline procurement with us',
        items: [
          {
            quote:
              'Consolidating our supply chain through a single platform reduced our procurement costs by 18% in the first year.',
            author: 'David Park',
            company: 'GlobalTech Industries',
            avatar: null,
          },
          {
            quote:
              'The transparency in pricing and real-time inventory has eliminated guesswork from our ordering process.',
            author: 'Linda Nguyen',
            company: 'Pacific Health Systems',
            avatar: null,
          },
          {
            quote:
              'Their account management team understands enterprise needs. They are not just a supplier, they are a strategic partner.',
            author: 'Richard Stein',
            company: 'Stein Manufacturing Group',
            avatar: null,
          },
        ],
        style: 'card',
        columns: 3,
      }),
      section('corp_cta', 'cta', 4, {
        heading: 'Ready to Modernize Your Procurement?',
        subheading:
          'Join thousands of enterprises that trust our platform for reliable, cost-effective wholesale purchasing.',
        ctaText: 'Schedule Consultation',
        ctaLink: '/contact',
        secondaryCtaText: 'Download Brochure',
        secondaryCtaLink: '/resources',
        style: 'banner',
      }),
    ],
    customCss: '',
    customHead: '',
  },
};

// ---- Export ----------------------------------------------------------------

export const STORE_TEMPLATES = [
  modernMinimal,
  darkProfessional,
  industrial,
  premiumWholesale,
  freshAndClean,
  corporate,
];
