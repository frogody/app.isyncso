import React from 'react';
import { Folder, Package, ArrowRight } from 'lucide-react';

/**
 * CategoryGridRenderer
 *
 * Grid of category cards for the B2B wholesale storefront.
 * Supports three display styles: 'card', 'overlay', and 'minimal'.
 * Falls back to placeholder categories when none are provided.
 */

const PLACEHOLDER_CATEGORIES = [
  { name: 'Electronics', image: null, count: 142 },
  { name: 'Industrial Parts', image: null, count: 89 },
  { name: 'Safety Equipment', image: null, count: 56 },
  { name: 'Tools & Hardware', image: null, count: 234 },
  { name: 'Packaging', image: null, count: 67 },
  { name: 'Raw Materials', image: null, count: 31 },
];

/**
 * Map columns number to Tailwind grid classes.
 */
function getGridClasses(columns) {
  const desktop = Math.min(Math.max(columns || 3, 2), 6);
  const desktopMap = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  };
  return `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${desktopMap[desktop] || 'lg:grid-cols-3'}`;
}

/**
 * Card style: surface background, image on top, text below.
 */
function CardStyleCategory({ category, showCount, showImage }) {
  return (
    <div
      className="group flex flex-col rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      {/* Image area */}
      {showImage && (
        <div
          className="relative flex items-center justify-center aspect-[16/10]"
          style={{ backgroundColor: 'var(--ws-bg)' }}
        >
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Folder
              className="w-10 h-10 transition-transform duration-200 group-hover:scale-110"
              style={{ color: 'var(--ws-muted)' }}
            />
          )}
        </div>
      )}

      {/* Text */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3
            className="text-base font-semibold truncate"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            {category.name}
          </h3>
          {showCount && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--ws-muted)' }}>
              {category.count} {category.count === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        <ArrowRight
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1"
          style={{ color: 'var(--ws-muted)' }}
        />
      </div>
    </div>
  );
}

/**
 * Overlay style: image fills card, text at bottom with gradient.
 */
function OverlayStyleCategory({ category, showCount }) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden cursor-pointer aspect-[4/3]"
      style={{ border: '1px solid var(--ws-border)' }}
    >
      {/* Background: image or placeholder */}
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--ws-surface)' }}>
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Package
              className="w-14 h-14 opacity-30 transition-transform duration-200 group-hover:scale-110"
              style={{ color: 'var(--ws-muted)' }}
            />
          </div>
        )}
      </div>

      {/* Bottom gradient overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, transparent 100%)',
        }}
      />

      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-base font-semibold truncate text-white"
            style={{ fontFamily: 'var(--ws-heading-font)' }}
          >
            {category.name}
          </h3>
          {showCount && (
            <p className="text-sm mt-0.5 text-white/70">
              {category.count} {category.count === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 flex-shrink-0 text-white/70 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </div>
  );
}

/**
 * Minimal style: text and count only, no images.
 */
function MinimalStyleCategory({ category, showCount }) {
  return (
    <div
      className="group flex items-center justify-between gap-4 rounded-lg px-5 py-4 transition-all duration-200 cursor-pointer"
      style={{ border: '1px solid var(--ws-border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Folder className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
        <h3
          className="text-sm font-semibold truncate"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {category.name}
        </h3>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {showCount && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--ws-surface)',
              color: 'var(--ws-muted)',
            }}
          >
            {category.count}
          </span>
        )}
        <ArrowRight
          className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
          style={{ color: 'var(--ws-muted)' }}
        />
      </div>
    </div>
  );
}

const STYLE_COMPONENTS = {
  card: CardStyleCategory,
  overlay: OverlayStyleCategory,
  minimal: MinimalStyleCategory,
};

export default function CategoryGridRenderer({ section, theme }) {
  const {
    heading = '',
    subheading = '',
    categories: rawCategories = [],
    columns = 3,
    style = 'card',
    showCount = true,
    showImage = true,
  } = section?.props || {};

  const categories =
    Array.isArray(rawCategories) && rawCategories.length > 0
      ? rawCategories
      : PLACEHOLDER_CATEGORIES;

  const CategoryComponent = STYLE_COMPONENTS[style] || CardStyleCategory;
  const gridClasses = getGridClasses(columns);

  return (
    <section
      className="w-full px-6 sm:px-10 lg:px-20 py-16 lg:py-20"
      style={{
        fontFamily: 'var(--ws-font)',
        color: 'var(--ws-text)',
        backgroundColor: 'var(--ws-bg)',
      }}
    >
      {/* Section header */}
      {(heading || subheading) && (
        <div className="mb-10 max-w-2xl">
          {heading && (
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3"
              style={{ fontFamily: 'var(--ws-heading-font)' }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p className="text-base lg:text-lg leading-relaxed" style={{ color: 'var(--ws-muted)' }}>
              {subheading}
            </p>
          )}
        </div>
      )}

      {/* Category grid */}
      <div className={`grid gap-5 ${gridClasses}`}>
        {categories.map((category, index) => (
          <CategoryComponent
            key={category.name || index}
            category={category}
            showCount={showCount}
            showImage={showImage}
          />
        ))}
      </div>
    </section>
  );
}
