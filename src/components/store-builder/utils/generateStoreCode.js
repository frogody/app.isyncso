// ---------------------------------------------------------------------------
// generateStoreCode.js -- Generates virtual file tree & code from store config
// ---------------------------------------------------------------------------

const SECTION_TYPE_NAMES = {
  hero: 'Hero',
  featured_products: 'FeaturedProducts',
  category_grid: 'CategoryGrid',
  about: 'About',
  testimonials: 'Testimonials',
  cta: 'CallToAction',
  faq: 'FAQ',
  contact: 'Contact',
  banner: 'Banner',
  stats: 'Stats',
  rich_text: 'RichText',
  logo_grid: 'LogoGrid',
};

// ── File Tree Generation ────────────────────────────────────────────────────

export function generateFileTree(config) {
  const sections = (config?.sections || []).filter((s) => s.visible !== false);

  const componentFiles = sections.map((s) => ({
    name: `${SECTION_TYPE_NAMES[s.type] || s.type}.jsx`,
    path: `store/components/${SECTION_TYPE_NAMES[s.type] || s.type}.jsx`,
    lang: 'jsx',
  }));

  if (config?.navigation) {
    componentFiles.push({ name: 'Navigation.jsx', path: 'store/components/Navigation.jsx', lang: 'jsx' });
  }
  if (config?.footer) {
    componentFiles.push({ name: 'Footer.jsx', path: 'store/components/Footer.jsx', lang: 'jsx' });
  }

  return [
    {
      name: 'store',
      path: 'store',
      type: 'folder',
      children: [
        {
          name: 'pages',
          path: 'store/pages',
          type: 'folder',
          children: [
            { name: 'HomePage.jsx', path: 'store/pages/HomePage.jsx', lang: 'jsx' },
            { name: 'CatalogPage.jsx', path: 'store/pages/CatalogPage.jsx', lang: 'jsx' },
            { name: 'ProductDetail.jsx', path: 'store/pages/ProductDetail.jsx', lang: 'jsx' },
          ],
        },
        {
          name: 'components',
          path: 'store/components',
          type: 'folder',
          children: componentFiles,
        },
        {
          name: 'styles',
          path: 'store/styles',
          type: 'folder',
          children: [
            { name: 'theme.css', path: 'store/styles/theme.css', lang: 'css' },
          ],
        },
        {
          name: 'config',
          path: 'store/config',
          type: 'folder',
          children: [
            { name: 'store.json', path: 'store/config/store.json', lang: 'json' },
          ],
        },
        { name: 'package.json', path: 'store/package.json', lang: 'json' },
      ],
    },
  ];
}

// ── File Content Generation ─────────────────────────────────────────────────

export function generateFileContent(filePath, config) {
  if (!config) return '// No config loaded';

  // Pages
  if (filePath === 'store/pages/HomePage.jsx') return generateHomePage(config);
  if (filePath === 'store/pages/CatalogPage.jsx') return generateCatalogPage(config);
  if (filePath === 'store/pages/ProductDetail.jsx') return generateProductDetailPage(config);

  // Components — sections
  if (filePath.startsWith('store/components/')) {
    const fileName = filePath.replace('store/components/', '');
    if (fileName === 'Navigation.jsx') return generateNavigationComponent(config.navigation);
    if (fileName === 'Footer.jsx') return generateFooterComponent(config.footer);

    const componentName = fileName.replace('.jsx', '');
    const sectionType = Object.entries(SECTION_TYPE_NAMES).find(([, v]) => v === componentName)?.[0];
    const section = (config.sections || []).find((s) => s.type === sectionType);
    if (section) return generateSectionComponent(section);
    return `// Component: ${componentName}\n// Section not found in config`;
  }

  // Styles
  if (filePath === 'store/styles/theme.css') return generateThemeCSS(config.theme);

  // Config
  if (filePath === 'store/config/store.json') return JSON.stringify(config, null, 2);

  // Package.json
  if (filePath === 'store/package.json') return generatePackageJson(config);

  return '// Unknown file';
}

// ── Section Components ──────────────────────────────────────────────────────

function generateSectionComponent(section) {
  const name = SECTION_TYPE_NAMES[section.type] || section.type;
  const props = section.props || {};

  switch (section.type) {
    case 'hero':
      return `import React from 'react';

export default function Hero() {
  return (
    <section
      className="hero-section"
      style={{
        padding: '${padVal(section.padding)}',
        textAlign: '${props.alignment || 'center'}',
        backgroundImage: ${props.backgroundImage ? `'url(${props.backgroundImage})'` : 'none'},
      }}
    >
      ${props.overlay ? `<div className="hero-overlay" style={{ opacity: ${(props.overlayOpacity || 50) / 100} }} />` : ''}
      <div className="hero-content">
        <h1 className="hero-headline">
          ${esc(props.headline || 'Welcome to Our Store')}
        </h1>
        <p className="hero-subheadline">
          ${esc(props.subheadline || '')}
        </p>
        <div className="hero-actions">
          <a href="${esc(props.ctaLink || '/catalog')}" className="btn-primary">
            ${esc(props.ctaText || 'Browse Catalog')}
          </a>
          ${props.secondaryCtaText ? `<a href="${esc(props.secondaryCtaLink || '#')}" className="btn-secondary">\n            ${esc(props.secondaryCtaText)}\n          </a>` : ''}
        </div>
      </div>
    </section>
  );
}`;

    case 'featured_products':
      return `import React from 'react';
import { useProducts } from '../hooks/useProducts';

export default function FeaturedProducts() {
  const { products, loading } = useProducts({ featured: true, limit: ${props.maxProducts || 8} });

  return (
    <section className="featured-products" style={{ padding: '${padVal(section.padding)}' }}>
      <h2>${esc(props.title || 'Featured Products')}</h2>
      ${props.subtitle ? `<p className="subtitle">${esc(props.subtitle)}</p>` : ''}
      <div className="product-${props.displayStyle || 'grid'}" style={{ columns: ${props.columns || 4} }}>
        {loading ? (
          <div className="loading-spinner" />
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showPricing={${props.showPricing !== false}}
            />
          ))
        )}
      </div>
    </section>
  );
}`;

    case 'about':
      return `import React from 'react';

export default function About() {
  return (
    <section className="about-section" style={{ padding: '${padVal(section.padding)}' }}>
      <div className="about-layout" style={{ flexDirection: '${props.imagePosition === 'right' ? 'row' : 'row-reverse'}' }}>
        ${props.image ? `<div className="about-image">\n          <img src="${esc(props.image)}" alt="About" />\n        </div>` : ''}
        <div className="about-content">
          <h2>${esc(props.title || 'About Us')}</h2>
          <div className="about-body">
            ${esc(props.body || '')}
          </div>
          ${props.showCta && props.ctaText ? `<a href="${esc(props.ctaLink || '#')}" className="btn-primary">\n            ${esc(props.ctaText)}\n          </a>` : ''}
        </div>
      </div>
    </section>
  );
}`;

    case 'testimonials':
      return `import React from 'react';

export default function Testimonials() {
  const items = ${JSON.stringify(props.items || [], null, 4).replace(/\n/g, '\n  ')};

  return (
    <section className="testimonials-section" style={{ padding: '${padVal(section.padding)}' }}>
      <h2>${esc(props.title || 'What Our Clients Say')}</h2>
      <div className="testimonials-${props.displayStyle || 'grid'}" style={{ columns: ${props.columns || 3} }}>
        {items.map((item, i) => (
          <div key={i} className="testimonial-card">
            {item.avatar && <img src={item.avatar} alt={item.author} className="avatar" />}
            <blockquote>{item.quote}</blockquote>
            <cite>
              <strong>{item.author}</strong>
              {item.company && <span>{item.company}</span>}
            </cite>
            ${props.items?.[0]?.rating !== undefined ? `{item.rating && <div className="rating">{'★'.repeat(item.rating)}</div>}` : ''}
          </div>
        ))}
      </div>
    </section>
  );
}`;

    case 'cta':
      return `import React from 'react';

export default function CallToAction() {
  return (
    <section className="cta-section cta-${props.style || 'banner'}" style={{ padding: '${padVal(section.padding)}' }}>
      <h2>${esc(props.headline || 'Ready to Get Started?')}</h2>
      ${props.subheadline ? `<p>${esc(props.subheadline)}</p>` : ''}
      <a href="${esc(props.ctaLink || '/catalog')}" className="btn-primary">
        ${esc(props.ctaText || 'Get Started')}
      </a>
    </section>
  );
}`;

    case 'faq':
      return `import React, { useState } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const items = ${JSON.stringify(props.items || [], null, 4).replace(/\n/g, '\n  ')};

  return (
    <section className="faq-section faq-${props.style || 'accordion'}" style={{ padding: '${padVal(section.padding)}' }}>
      <h2>${esc(props.title || 'Frequently Asked Questions')}</h2>
      <div className="faq-list">
        {items.map((item, i) => (
          <div key={i} className={\`faq-item \${openIndex === i ? 'open' : ''}\`}>
            <button onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              {item.question}
            </button>
            {openIndex === i && <div className="faq-answer">{item.answer}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}`;

    case 'contact':
      return `import React from 'react';

export default function Contact() {
  return (
    <section className="contact-section" style={{ padding: '${padVal(section.padding)}' }}>
      <h2>${esc(props.title || 'Contact Us')}</h2>
      ${props.subtitle ? `<p className="subtitle">${esc(props.subtitle)}</p>` : ''}
      <div className="contact-grid">
        <div className="contact-info">
          ${props.email ? `<p><strong>Email:</strong> ${esc(props.email)}</p>` : ''}
          ${props.phone ? `<p><strong>Phone:</strong> ${esc(props.phone)}</p>` : ''}
          ${props.address ? `<p><strong>Address:</strong> ${esc(props.address)}</p>` : ''}
        </div>
        ${props.showForm ? `<form className="contact-form">\n          <input type="text" placeholder="Name" required />\n          <input type="email" placeholder="Email" required />\n          <textarea placeholder="Message" required />\n          <button type="submit">Send Message</button>\n        </form>` : ''}
      </div>
    </section>
  );
}`;

    case 'banner':
      return `import React from 'react';

export default function Banner() {
  return (
    <div className="banner banner-${props.style || 'info'}" style={{ padding: '${padVal(section.padding)}' }}>
      ${props.icon ? `<span className="banner-icon">${esc(props.icon)}</span>` : ''}
      <span className="banner-text">
        ${props.link ? `<a href="${esc(props.link)}">` : ''}${esc(props.text || '')}${props.link ? '</a>' : ''}
      </span>
      ${props.dismissible ? `<button className="banner-dismiss" aria-label="Dismiss">×</button>` : ''}
    </div>
  );
}`;

    case 'stats':
      return `import React from 'react';

export default function Stats() {
  const items = ${JSON.stringify(props.items || [], null, 4).replace(/\n/g, '\n  ')};

  return (
    <section className="stats-section stats-${props.style || 'cards'}" style={{ padding: '${padVal(section.padding)}' }}>
      ${props.title ? `<h2>${esc(props.title)}</h2>` : ''}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(${props.columns || 4}, 1fr)' }}>
        {items.map((item, i) => (
          <div key={i} className="stat-card">
            {item.icon && <span className="stat-icon">{item.icon}</span>}
            <span className="stat-value">{item.value}</span>
            <span className="stat-label">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}`;

    case 'rich_text':
      return `import React from 'react';

export default function RichText() {
  return (
    <section className="rich-text-section" style={{ padding: '${padVal(section.padding)}', maxWidth: '${props.maxWidth || 'lg'}' }}>
      <div dangerouslySetInnerHTML={{ __html: \`${esc(props.content || '')}\` }} />
    </section>
  );
}`;

    case 'category_grid':
      return `import React from 'react';
import { useCategories } from '../hooks/useCategories';

export default function CategoryGrid() {
  const { categories, loading } = useCategories();

  return (
    <section className="category-grid" style={{ padding: '${padVal(section.padding)}' }}>
      <h2>${esc(props.title || 'Browse by Category')}</h2>
      ${props.subtitle ? `<p className="subtitle">${esc(props.subtitle)}</p>` : ''}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(${props.columns || 3}, 1fr)' }}>
        {categories.map((cat) => (
          <a key={cat.id} href={\`/catalog?category=\${cat.slug}\`} className="category-card category-${props.style || 'cards'}">
            <span className="category-name">{cat.name}</span>
            ${props.showCount ? `<span className="category-count">{cat.productCount} products</span>` : ''}
          </a>
        ))}
      </div>
    </section>
  );
}`;

    case 'logo_grid':
      return `import React from 'react';

export default function LogoGrid() {
  const logos = ${JSON.stringify(props.logos || [], null, 4).replace(/\n/g, '\n  ')};

  return (
    <section className="logo-grid-section" style={{ padding: '${padVal(section.padding)}' }}>
      ${props.title ? `<h2>${esc(props.title)}</h2>` : ''}
      <div className="logo-${props.style || 'grid'}" style={{ filter: '${props.grayscale ? 'grayscale(1)' : 'none'}' }}>
        {logos.map((logo, i) => (
          <${props.logos?.[0]?.link ? 'a href={logo.link}' : 'div'} key={i} className="logo-item">
            <img src={logo.url} alt={logo.alt} />
          </${props.logos?.[0]?.link ? 'a' : 'div'}>
        ))}
      </div>
    </section>
  );
}`;

    default:
      return `import React from 'react';

export default function ${name}() {
  return (
    <section style={{ padding: '${padVal(section.padding)}' }}>
      <p>${name} section</p>
    </section>
  );
}`;
  }
}

// ── Page Components ─────────────────────────────────────────────────────────

function generateHomePage(config) {
  const sections = (config.sections || []).filter((s) => s.visible !== false);
  const imports = sections
    .map((s) => {
      const name = SECTION_TYPE_NAMES[s.type] || s.type;
      return `import ${name} from '../components/${name}';`;
    })
    .join('\n');

  const renders = sections
    .map((s) => `        <${SECTION_TYPE_NAMES[s.type] || s.type} />`)
    .join('\n');

  return `import React from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
${imports}

export default function HomePage() {
  return (
    <div className="store-page">
      <Navigation />
      <main>
${renders}
      </main>
      <Footer />
    </div>
  );
}`;
}

function generateCatalogPage(config) {
  const cat = config.catalog || {};
  return `import React from 'react';
import { useProducts } from '../hooks/useProducts';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function CatalogPage() {
  const { products, loading, filters, setFilters } = useProducts();

  return (
    <div className="store-page">
      <Navigation />
      <main className="catalog-page">
        <div className="catalog-header">
          <h1>Product Catalog</h1>
          ${cat.showSearch !== false ? `<input type="search" placeholder="Search products..." className="catalog-search" />` : ''}
        </div>
        <div className="catalog-layout">
          ${cat.showFilters !== false ? `<aside className="catalog-filters">\n            ${cat.filterByCategory !== false ? `<div className="filter-group">\n              <h3>Category</h3>\n              {/* CategoryFilter component */}\n            </div>` : ''}\n            ${cat.filterByStock ? `<div className="filter-group">\n              <h3>Availability</h3>\n              {/* StockFilter component */}\n            </div>` : ''}\n          </aside>` : ''}
          <div
            className="product-${cat.layout || 'grid'}"
            style={{ gridTemplateColumns: 'repeat(${cat.columns || 3}, 1fr)' }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                style="${cat.cardStyle || 'minimal'}"
                showPricing={${cat.showPricing !== false}}
                showStock={${!!cat.showStock}}
                showPreorderBadge={${!!cat.showPreorderBadge}}
                showQuickAdd={${!!cat.showQuickAdd}}
              />
            ))}
          </div>
        </div>
        <div className="catalog-pagination">
          {/* Pagination: ${cat.productsPerPage || 12} per page */}
        </div>
      </main>
      <Footer />
    </div>
  );
}`;
}

function generateProductDetailPage(config) {
  const pd = config.productDetail || {};
  return `import React from 'react';
import { useParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function ProductDetail() {
  const { productId } = useParams();
  const { product, loading } = useProduct(productId);

  if (loading) return <div className="loading-spinner" />;
  if (!product) return <div className="not-found">Product not found</div>;

  return (
    <div className="store-page">
      <Navigation />
      <main className="product-detail">
        <div className="product-layout" style={{ flexDirection: '${pd.imagePosition === 'top' ? 'column' : pd.imagePosition === 'right' ? 'row-reverse' : 'row'}' }}>
          <div className="product-media">
            <img src={product.featured_image} alt={product.name} className="product-hero-image" />
            ${pd.showGallery !== false ? `{product.gallery?.length > 0 && (\n              <div className="product-gallery">\n                {product.gallery.map((img, i) => (\n                  <img key={i} src={img} alt={\`\${product.name} \${i + 1}\`} />\n                ))}\n              </div>\n            )}` : ''}
          </div>
          <div className="product-info">
            <h1>{product.name}</h1>
            <div className="product-pricing">
              {/* PricingDisplay: resolves client-specific price */}
            </div>
            ${pd.showStockLevel ? `<div className="stock-indicator">\n              {/* StockIndicator component */}\n            </div>` : ''}
            ${pd.showBulkPricing ? `<div className="bulk-pricing">\n              {/* BulkPricingTable: quantity tier pricing */}\n            </div>` : ''}
            ${pd.showSpecifications ? `<div className="specifications">\n              {/* Product specifications table */}\n            </div>` : ''}
            <div className="product-actions">
              <input type="number" min="1" defaultValue="1" className="quantity-input" />
              <button className="btn-primary">Add to Cart</button>
              ${pd.showInquiryButton ? `<button className="btn-secondary">Ask About This Product</button>` : ''}
            </div>
            ${pd.showPreorderOption ? `{product.preorderAvailable && (\n              <div className="preorder-option">\n                <span className="preorder-badge">Pre-order Available</span>\n                <p>Expected delivery: {product.expectedDeliveryDate}</p>\n              </div>\n            )}` : ''}
          </div>
        </div>
        ${pd.showRelatedProducts ? `<section className="related-products">\n          <h2>Related Products</h2>\n          {/* RelatedProducts grid */}\n        </section>` : ''}
      </main>
      <Footer />
    </div>
  );
}`;
}

// ── Navigation & Footer ─────────────────────────────────────────────────────

function generateNavigationComponent(nav) {
  if (!nav) return '// Navigation config not defined';
  const items = (nav.items || []).filter((i) => i.visible !== false);
  return `import React from 'react';

export default function Navigation() {
  return (
    <header
      className="store-nav nav-${nav.style || 'horizontal'}"
      style={{
        position: '${nav.sticky ? 'sticky' : 'relative'}',
        top: 0,
        background: '${nav.transparent ? 'transparent' : 'var(--color-surface)'}',
      }}
    >
      <div className="nav-inner">
        <div className="nav-brand">
          ${nav.logo?.url ? `<img src="${esc(nav.logo.url)}" alt="${esc(nav.companyName || '')}" height="${nav.logo.height || 32}" />` : `<span className="nav-company-name">${esc(nav.companyName || 'Store')}</span>`}
        </div>
        <nav className="nav-links">
${items.map((item) => `          <a href="${esc(item.href)}">${esc(item.label)}</a>`).join('\n')}
        </nav>
        <div className="nav-actions">
          ${nav.showSearch ? `<button className="nav-search" aria-label="Search">🔍</button>` : ''}
          ${nav.showCart ? `<button className="nav-cart" aria-label="Cart">🛒</button>` : ''}
          ${nav.showAccount ? `<button className="nav-account" aria-label="Account">👤</button>` : ''}
        </div>
      </div>
    </header>
  );
}`;
}

function generateFooterComponent(footer) {
  if (!footer) return '// Footer config not defined';
  return `import React from 'react';

export default function Footer() {
  return (
    <footer className="store-footer footer-${footer.style || 'simple'}">
      <div className="footer-inner">
        ${footer.columns?.length ? `<div className="footer-columns">\n${footer.columns.map((col) => `          <div className="footer-column">\n            <h4>${esc(col.title)}</h4>\n            <ul>\n${(col.links || []).map((l) => `              <li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('\n')}\n            </ul>\n          </div>`).join('\n')}\n        </div>` : ''}
        ${footer.text ? `<p className="footer-text">${esc(footer.text)}</p>` : ''}
        ${footer.showSocial && footer.socialLinks ? `<div className="footer-social">\n${Object.entries(footer.socialLinks).filter(([, v]) => v).map(([k, v]) => `          <a href="${esc(v)}" target="_blank" rel="noopener">${k}</a>`).join('\n')}\n        </div>` : ''}
        <p className="footer-copyright">${esc(footer.copyright || `© ${new Date().getFullYear()}`)}</p>
      </div>
    </footer>
  );
}`;
}

// ── Theme CSS ───────────────────────────────────────────────────────────────

function generateThemeCSS(theme) {
  if (!theme) return '/* No theme config */';
  return `/* ═══════════════════════════════════════════════════
   Store Theme — Auto-generated from config
   ═══════════════════════════════════════════════════ */

:root {
  /* Colors */
  --color-primary: ${theme.primaryColor || '#06b6d4'};
  --color-secondary: ${theme.secondaryColor || '#3b82f6'};
  --color-accent: ${theme.accentColor || '#8b5cf6'};
  --color-background: ${theme.backgroundColor || '#09090b'};
  --color-surface: ${theme.surfaceColor || '#18181b'};
  --color-text: ${theme.textColor || '#ffffff'};
  --color-text-muted: ${theme.textMutedColor || '#a1a1aa'};
  --color-border: ${theme.borderColor || '#27272a'};
  --color-success: ${theme.successColor || '#22c55e'};
  --color-error: ${theme.errorColor || '#ef4444'};

  /* Typography */
  --font-body: '${theme.fontFamily || 'Inter'}', system-ui, sans-serif;
  --font-heading: '${theme.headingFontFamily || theme.fontFamily || 'Inter'}', system-ui, sans-serif;
  --font-size-base: ${theme.fontSize === 'sm' ? '14px' : theme.fontSize === 'lg' ? '18px' : '16px'};

  /* Spacing */
  --spacing-unit: ${theme.spacing === 'compact' ? '4px' : theme.spacing === 'spacious' ? '8px' : '6px'};

  /* Shape */
  --radius: ${theme.borderRadius === 'none' ? '0' : theme.borderRadius === 'sm' ? '4px' : theme.borderRadius === 'lg' ? '12px' : theme.borderRadius === 'xl' ? '16px' : theme.borderRadius === 'full' ? '9999px' : '8px'};
}

/* Base */
body {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-background);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.2;
}

/* Buttons */
.btn-primary {
  background: var(--color-primary);
  color: ${theme.mode === 'dark' ? '#000' : '#fff'};
  border: none;
  border-radius: ${theme.buttonStyle === 'pill' ? '9999px' : 'var(--radius)'};
  padding: calc(var(--spacing-unit) * 2) calc(var(--spacing-unit) * 4);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
${theme.buttonStyle === 'outline' ? `  background: transparent;\n  border: 2px solid var(--color-primary);\n  color: var(--color-primary);` : ''}${theme.buttonStyle === 'ghost' ? `  background: transparent;\n  color: var(--color-primary);` : ''}
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Cards */
.product-card,
.testimonial-card,
.stat-card,
.category-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  overflow: hidden;
${theme.cardStyle === 'raised' ? '  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);' : ''}${theme.cardStyle === 'bordered' ? '  border: 1px solid var(--color-border);' : ''}${theme.cardStyle === 'glass' ? '  backdrop-filter: blur(12px);\n  background: rgba(255, 255, 255, 0.05);' : ''}
}

/* Animations */
${theme.animations !== false ? `@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-section,
.featured-products,
.about-section,
.testimonials-section,
.stats-section {
  animation: fadeInUp 0.6s ease-out;
}` : '/* Animations disabled */'}`;
}

// ── Package JSON ────────────────────────────────────────────────────────────

function generatePackageJson(config) {
  return JSON.stringify(
    {
      name: slugify(config?.navigation?.companyName || 'b2b-store'),
      version: '1.0.0',
      private: true,
      description: config?.seo?.description || 'B2B Wholesale Storefront built with iSyncSO',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        'react-router-dom': '^7.0.0',
        'framer-motion': '^11.0.0',
        'lucide-react': '^0.400.0',
      },
      devDependencies: {
        vite: '^6.0.0',
        '@vitejs/plugin-react': '^4.0.0',
        tailwindcss: '^4.0.0',
      },
    },
    null,
    2,
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function padVal(p) {
  const map = { none: '0', sm: '2rem 1rem', md: '4rem 1rem', lg: '6rem 1rem', xl: '8rem 1rem' };
  return map[p] || map.md;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
