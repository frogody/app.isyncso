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
      section('mm_stats', 'stats', 1, {
        heading: 'Why Businesses Choose Us',
        subheading: 'Simple approach, proven results',
        items: [
          { value: '5,000+', label: 'Products' },
          { value: '1,200+', label: 'Happy Clients' },
          { value: '99%', label: 'Satisfaction' },
          { value: '48h', label: 'Avg. Delivery' },
        ],
        style: 'card',
      }, { background: 'alt' }),
      section('mm_featured', 'featured_products', 2, {
        heading: 'New Arrivals',
        subheading: 'The latest additions to our wholesale catalog',
        columns: 4,
      }),
      section('mm_about', 'about', 3, {
        heading: 'Our Philosophy',
        content: 'We believe wholesale should be straightforward. No hidden fees, no complex minimums. Just quality products at fair prices, delivered when you need them.',
        imagePosition: 'right',
        stats: [
          { label: 'Years Active', value: '10+' },
          { label: 'SKUs Available', value: '5,000+' },
          { label: 'Repeat Rate', value: '94%' },
        ],
      }),
      section('mm_testimonials', 'testimonials', 4, null, { background: 'alt' }),
      section('mm_faq', 'faq', 5),
      section('mm_cta', 'cta', 6, {
        heading: 'Start Ordering Today',
        subheading:
          'Create your free wholesale account in minutes and gain access to our complete catalog with exclusive pricing.',
        ctaText: 'Get Started',
        ctaLink: '/register',
        secondaryCtaText: 'Learn More',
        secondaryCtaLink: '/about',
        style: 'banner',
      }, { background: 'primary' }),
      section('mm_contact', 'contact', 7),
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
      section('dp_banner', 'banner', 0, {
        text: 'Enterprise pricing unlocked — volume discounts on 50,000+ SKUs',
        dismissible: true,
        style: 'promo',
      }),
      section('dp_hero', 'hero', 1, {
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
      section('dp_stats', 'stats', 2, {
        heading: 'Built for Scale',
        subheading: 'Infrastructure that grows with your business',
        items: [
          { value: '50M+', label: 'Units Shipped Annually' },
          { value: '99.8%', label: 'Uptime Guarantee' },
          { value: '2,500+', label: 'Enterprise Clients' },
          { value: '24/7', label: 'Technical Support' },
        ],
        style: 'card',
      }, { background: 'alt' }),
      section('dp_featured', 'featured_products', 3, {
        heading: 'Trending Products',
        subheading: 'High-demand items moving fast across our network',
        columns: 4,
      }),
      section('dp_about', 'about', 4, {
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
      section('dp_testimonials', 'testimonials', 5, {
        heading: 'Trusted by Industry Leaders',
        subheading: 'See how enterprises scale with our platform',
        items: [
          {
            quote: 'Their logistics platform cut our fulfillment time by 40%. The real-time tracking alone was worth the switch.',
            author: 'Marcus Wei',
            company: 'NovaTech Solutions',
            avatar: null,
          },
          {
            quote: 'We consolidated three suppliers into one partnership. The efficiency gains have been remarkable.',
            author: 'Priya Sharma',
            company: 'Apex Manufacturing',
            avatar: null,
          },
          {
            quote: 'Enterprise-grade reliability with startup-level responsiveness. A rare combination in wholesale.',
            author: 'Daniel Foster',
            company: 'Foster Distribution Group',
            avatar: null,
          },
        ],
        style: 'card',
      }, { background: 'alt' }),
      section('dp_faq', 'faq', 6),
      section('dp_cta', 'cta', 7, {
        heading: 'Scale Your Operations Today',
        subheading: 'Join 2,500+ enterprises that trust our platform for mission-critical supply chain operations.',
        ctaText: 'Book a Demo',
        ctaLink: '/contact',
        secondaryCtaText: 'View Pricing',
        secondaryCtaLink: '/pricing',
        style: 'banner',
      }, { background: 'primary' }),
      section('dp_contact', 'contact', 8, {
        heading: 'Talk to Our Team',
        subheading: 'Our enterprise specialists are ready to design a solution for your business.',
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
      section('ind_banner', 'banner', 0, {
        text: 'Now stocking heavy-duty power tools — bulk pricing available',
        dismissible: true,
        style: 'promo',
      }),
      section('ind_hero', 'hero', 1, {
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
      section('ind_stats', 'stats', 2, {
        heading: 'Proven Track Record',
        subheading: 'Decades of industrial expertise you can rely on',
        items: [
          { value: '25+', label: 'Years in the Industry' },
          { value: '8,000+', label: 'Industrial SKUs' },
          { value: '98.7%', label: 'On-Time Delivery' },
          { value: '1,200+', label: 'Active Accounts' },
        ],
        style: 'card',
      }, { background: 'alt' }),
      section('ind_featured', 'featured_products', 3, {
        heading: 'Top Sellers',
        subheading: 'Most ordered industrial products this quarter',
        columns: 4,
      }),
      section('ind_categories', 'category_grid', 4, {
        heading: 'Product Categories',
        subheading: 'Find exactly what your operation needs',
        columns: 3,
        style: 'overlay',
      }, { background: 'alt' }),
      section('ind_about', 'about', 5, {
        heading: 'Built for Industry',
        content: 'Since 1998, we have been the go-to supplier for manufacturers, contractors, and industrial operations. Our warehouse stocks over 8,000 SKUs ready for same-day dispatch, backed by a team that understands the demands of heavy industry.',
        imagePosition: 'right',
        stats: [
          { label: 'Warehouse Sq Ft', value: '120,000' },
          { label: 'Same-Day Items', value: '5,000+' },
          { label: 'Repeat Rate', value: '92%' },
        ],
      }),
      section('ind_testimonials', 'testimonials', 6, {
        heading: 'Trusted on the Job Site',
        subheading: 'What our industrial clients say',
        items: [
          {
            quote: 'Reliable stock levels and fast delivery. When a production line depends on parts, you need a supplier you can count on.',
            author: 'Mike Hernandez',
            company: 'Hernandez Manufacturing',
            avatar: null,
          },
          {
            quote: 'Their technical team helped us spec the right components for our retrofit project. Real expertise, not just order-taking.',
            author: 'Karen O\'Brien',
            company: 'Midwest Industrial Services',
            avatar: null,
          },
          {
            quote: 'We switched from three regional suppliers to one. The consolidated pricing and single-invoice billing saves us thousands annually.',
            author: 'Robert Tanaka',
            company: 'Pacific Coast Contractors',
            avatar: null,
          },
        ],
        style: 'card',
      }, { background: 'alt' }),
      section('ind_faq', 'faq', 7, {
        heading: 'Common Questions',
        subheading: 'Answers for industrial buyers',
        items: [
          {
            question: 'Do you offer technical specifications and safety data sheets?',
            answer: 'Yes, every industrial product listing includes downloadable spec sheets, MSDS documents, and compliance certificates where applicable.',
          },
          {
            question: 'What are your lead times for custom or special orders?',
            answer: 'Standard industrial items ship within 24 hours. Custom fabrication and special orders typically require 5-10 business days depending on complexity.',
          },
          {
            question: 'Do you offer on-site delivery for heavy equipment?',
            answer: 'We provide liftgate delivery, forklift-ready pallets, and can arrange crane delivery for oversized items. Contact our logistics team for details.',
          },
          {
            question: 'Can I set up recurring orders for consumables?',
            answer: 'Absolutely. Our auto-reorder system lets you schedule recurring deliveries for consumables like fasteners, lubricants, and PPE at locked-in pricing.',
          },
        ],
      }),
      section('ind_cta', 'cta', 8, {
        heading: 'Ready to Order?',
        subheading: 'Open a wholesale account and get access to industrial-grade pricing, priority support, and same-day dispatch.',
        ctaText: 'Open Account',
        ctaLink: '/register',
        secondaryCtaText: 'Request Quote',
        secondaryCtaLink: '/contact',
        style: 'banner',
      }, { background: 'primary' }),
      section('ind_contact', 'contact', 9, {
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
      section('pw_banner', 'banner', 0, {
        text: 'New season collection now available — exclusive early access for partners',
        dismissible: true,
        style: 'promo',
      }),
      section('pw_hero', 'hero', 1, {
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
      section('pw_logos', 'logo_grid', 2, {
        heading: 'Our Brand Partners',
        subheading: 'Representing the finest names in the industry',
        columns: 6,
        grayscale: true,
      }, { background: 'alt' }),
      section('pw_stats', 'stats', 3, {
        heading: 'The Premium Standard',
        subheading: 'Excellence in every metric',
        items: [
          { value: '200+', label: 'Curated Brands' },
          { value: '12,000+', label: 'Premium SKUs' },
          { value: '40+', label: 'Countries Served' },
          { value: '98%', label: 'Partner Retention' },
        ],
        style: 'card',
      }),
      section('pw_featured', 'featured_products', 4, {
        heading: 'Editor\'s Selection',
        subheading: 'This season\'s most sought-after wholesale items',
        columns: 4,
      }),
      section('pw_about', 'about', 5, {
        heading: 'Our Story',
        content: 'Founded on a passion for quality, we bridge the gap between exceptional manufacturers and discerning retailers. Every product in our catalog is hand-selected, tested, and vetted to meet the highest standards. We believe premium wholesale should be an experience, not just a transaction.',
        imagePosition: 'right',
        stats: [
          { label: 'Years Curating', value: '18+' },
          { label: 'Brand Partners', value: '200+' },
          { label: 'Retail Partners', value: '1,500+' },
        ],
      }, { background: 'alt' }),
      section('pw_testimonials', 'testimonials', 6, {
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
      section('pw_faq', 'faq', 7, {
        heading: 'Frequently Asked Questions',
        subheading: 'Everything you need to know about partnering with us',
        items: [
          {
            question: 'How do you select the brands in your catalog?',
            answer: 'Every brand goes through a rigorous vetting process covering product quality, ethical sourcing, brand reputation, and market demand. We accept fewer than 15% of brand applications.',
          },
          {
            question: 'What are your minimum order requirements?',
            answer: 'Minimum orders start at just 6 units per SKU for most products, making it easy for boutique retailers to access premium wholesale pricing.',
          },
          {
            question: 'Do you offer exclusivity arrangements?',
            answer: 'Yes, we offer regional exclusivity for qualifying partners. Contact our partnerships team to discuss territory arrangements.',
          },
          {
            question: 'What is your return policy for premium goods?',
            answer: 'We offer a 60-day return policy on all standard items. Seasonal and limited-edition items are final sale unless defective.',
          },
        ],
        style: 'accordion',
      }, { background: 'alt' }),
      section('pw_cta', 'cta', 8, {
        heading: 'Elevate Your Retail Offering',
        subheading: 'Join our network of 1,500+ retail partners and access the world\'s finest wholesale catalog.',
        ctaText: 'Apply for Partnership',
        ctaLink: '/register',
        secondaryCtaText: 'Request Catalog',
        secondaryCtaLink: '/contact',
        style: 'banner',
      }, { background: 'primary' }),
      section('pw_contact', 'contact', 9, {
        heading: 'Get in Touch',
        subheading: 'Our partnerships team is ready to help you discover the perfect products for your business.',
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
      section('fc_banner', 'banner', 0, {
        text: 'Spring harvest catalog is here — 150+ new organic products added',
        dismissible: true,
        style: 'promo',
      }),
      section('fc_hero', 'hero', 1, {
        heading: 'Fresh Products, Fair Prices',
        subheading:
          'Sourced responsibly, delivered reliably. Your one-stop wholesale partner for natural and organic products.',
        ctaText: 'Browse Products',
        ctaLink: '/products',
        secondaryCtaText: 'Our Mission',
        secondaryCtaLink: '/about',
        alignment: 'center',
      }),
      section('fc_stats', 'stats', 2, {
        heading: 'Farm-Fresh by the Numbers',
        subheading: 'Sustainability you can measure',
        items: [
          { value: '200+', label: 'Partner Farms' },
          { value: '3,000+', label: 'Organic Products' },
          { value: '800+', label: 'Happy Retailers' },
          { value: '100%', label: 'Traceable Sourcing' },
        ],
        style: 'card',
      }, { background: 'alt' }),
      section('fc_featured', 'featured_products', 3, {
        heading: 'Seasonal Picks',
        subheading: 'Our freshest selections, handpicked this week',
        columns: 4,
      }),
      section('fc_categories', 'category_grid', 4, {
        heading: 'Shop by Category',
        subheading: 'From farm to shelf, we cover every aisle',
        columns: 3,
        style: 'overlay',
      }, { background: 'alt' }),
      section('fc_about', 'about', 5, {
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
      section('fc_testimonials', 'testimonials', 6, {
        heading: 'What Retailers Say',
        subheading: 'Partners who share our values',
        items: [
          {
            quote: 'Their organic range transformed our store. Customers love the quality and we love the margins.',
            author: 'Lisa Park',
            company: 'Green Leaf Market',
            avatar: null,
          },
          {
            quote: 'Consistent quality, transparent sourcing, and deliveries that always arrive fresh. Exactly what we need.',
            author: 'Tom Davies',
            company: 'The Wholesome Pantry',
            avatar: null,
          },
          {
            quote: 'Switching to their platform simplified our ordering and cut our sourcing time in half.',
            author: 'Ana Costa',
            company: 'Costa Natural Foods',
            avatar: null,
          },
        ],
        style: 'card',
      }, { background: 'alt' }),
      section('fc_faq', 'faq', 7, {
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
      section('fc_cta', 'cta', 8, {
        heading: 'Grow Your Business Naturally',
        subheading: 'Join 800+ retailers who trust us for fresh, responsibly sourced wholesale products.',
        ctaText: 'Create Account',
        ctaLink: '/register',
        secondaryCtaText: 'Request Samples',
        secondaryCtaLink: '/contact',
        style: 'banner',
      }, { background: 'primary' }),
      section('fc_contact', 'contact', 9, {
        heading: 'Get in Touch',
        subheading: 'Questions about our products or sourcing? Our team is happy to help.',
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
      section('corp_banner', 'banner', 0, {
        text: 'Q1 procurement report available — download your savings analysis',
        dismissible: true,
        style: 'promo',
      }),
      section('corp_hero', 'hero', 1, {
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
      section('corp_stats', 'stats', 2, {
        heading: 'The Numbers Speak',
        subheading: 'Scale, reliability, and global reach',
        items: [
          { value: '$2B+', label: 'Annual Transaction Volume' },
          { value: '50,000+', label: 'Products Available' },
          { value: '3,500+', label: 'Enterprise Clients' },
          { value: '45', label: 'Countries Served' },
        ],
        columns: 4,
        style: 'card',
      }, { background: 'alt' }),
      section('corp_featured', 'featured_products', 3, {
        heading: 'Popular This Quarter',
        subheading: 'Top-performing products across our enterprise client base',
        columns: 4,
      }),
      section('corp_about', 'about', 4, {
        heading: 'Enterprise-Grade Infrastructure',
        content: 'Our platform serves as the backbone of procurement for Fortune 500 companies and fast-growing enterprises alike. With dedicated account managers, custom pricing tiers, and real-time inventory visibility, we turn complex supply chains into competitive advantages.',
        imagePosition: 'right',
        stats: [
          { label: 'Avg. Cost Savings', value: '18%' },
          { label: 'Verified Suppliers', value: '2,000+' },
          { label: 'SLA Uptime', value: '99.9%' },
        ],
      }),
      section('corp_testimonials', 'testimonials', 5, {
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
      }, { background: 'alt' }),
      section('corp_faq', 'faq', 6, {
        heading: 'Enterprise FAQ',
        subheading: 'Common questions from procurement teams',
        items: [
          {
            question: 'How does enterprise pricing work?',
            answer: 'Enterprise clients receive custom pricing tiers based on annual volume commitments. Your dedicated account manager will structure a pricing plan tailored to your procurement patterns.',
          },
          {
            question: 'Can we integrate with our existing ERP system?',
            answer: 'Yes, we offer API integrations and EDI connectivity with all major ERP platforms including SAP, Oracle, and Microsoft Dynamics. Our integration team handles setup.',
          },
          {
            question: 'What SLAs do you guarantee?',
            answer: 'Enterprise accounts include 99.9% platform uptime, 4-hour response time for critical issues, and guaranteed order fulfillment within 24 hours for in-stock items.',
          },
          {
            question: 'Do you support multi-location delivery?',
            answer: 'Absolutely. Our logistics network supports delivery to unlimited locations with centralized billing and per-location reporting.',
          },
        ],
        style: 'accordion',
      }),
      section('corp_cta', 'cta', 7, {
        heading: 'Ready to Modernize Your Procurement?',
        subheading:
          'Join thousands of enterprises that trust our platform for reliable, cost-effective wholesale purchasing.',
        ctaText: 'Schedule Consultation',
        ctaLink: '/contact',
        secondaryCtaText: 'Download Brochure',
        secondaryCtaLink: '/resources',
        style: 'banner',
      }, { background: 'primary' }),
      section('corp_contact', 'contact', 8, {
        heading: 'Contact Enterprise Sales',
        subheading: 'Our enterprise team is ready to build a procurement solution for your organization.',
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
