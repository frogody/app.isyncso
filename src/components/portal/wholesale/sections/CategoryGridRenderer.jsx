import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Folder, Package, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

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
 * Card style: glass surface, image on top with gradient overlay, hover lift + bottom gradient border.
 */
function CardStyleCategory({ category, showCount, showImage, onClick }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
      className="group flex flex-col rounded-xl overflow-hidden cursor-pointer border"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        borderColor: 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 32px color-mix(in srgb, var(--ws-primary) 10%, transparent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image area */}
      {showImage && (
        <div
          className="relative flex items-center justify-center aspect-[16/10] overflow-hidden"
          style={{ backgroundColor: 'var(--ws-bg)' }}
        >
          {category.image ? (
            <>
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Subtle gradient overlay on image */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 50%)',
                }}
              />
            </>
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 15%, transparent), color-mix(in srgb, var(--ws-primary) 5%, transparent))`,
              }}
            >
              <Folder
                className="w-6 h-6"
                style={{ color: 'var(--ws-muted)' }}
              />
            </div>
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
        <motion.div
          className="shrink-0"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <ArrowRight
            className="w-4 h-4"
            style={{ color: 'var(--ws-muted)' }}
          />
        </motion.div>
      </div>

      {/* Bottom gradient border on hover */}
      <div
        className="h-[2px] w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 30%, transparent))`,
        }}
      />
    </motion.div>
  );
}

/**
 * Overlay style: image fills card, dramatic bottom gradient, badge count, scale on hover.
 */
function OverlayStyleCategory({ category, showCount, onClick }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, transition: { duration: 0.3, ease: 'easeOut' } }}
      className="group relative rounded-xl overflow-hidden cursor-pointer aspect-[4/3] border"
      style={{ borderColor: 'var(--ws-border)' }}
      onClick={onClick}
    >
      {/* Background: image or placeholder */}
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--ws-surface)' }}>
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 15%, transparent), color-mix(in srgb, var(--ws-primary) 5%, transparent))`,
              }}
            >
              <Package
                className="w-8 h-8 opacity-40"
                style={{ color: 'var(--ws-muted)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dramatic bottom gradient overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
        }}
      />

      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-base font-semibold truncate text-white"
            style={{
              fontFamily: 'var(--ws-heading-font)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {category.name}
          </h3>
          {showCount && (
            <div className="mt-1.5 inline-flex items-center">
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 25%, transparent), color-mix(in srgb, var(--ws-primary) 12%, transparent))`,
                  color: 'var(--ws-primary)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {category.count} {category.count === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
        </div>
        <motion.div
          className="shrink-0"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <ArrowRight className="w-4 h-4 text-white/70" />
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Minimal style: glass card with left gradient border, hover highlight.
 */
function MinimalStyleCategory({ category, showCount, onClick }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group flex items-center justify-between gap-4 rounded-xl px-5 py-4 cursor-pointer border overflow-hidden relative"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
        borderColor: 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.3s ease, background-color 0.3s ease',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ws-primary) 30%, var(--ws-border))';
        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--ws-surface) 70%, transparent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--ws-surface) 40%, transparent)';
      }}
    >
      {/* Left gradient border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 30%, transparent))`,
        }}
      />

      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 15%, transparent), color-mix(in srgb, var(--ws-primary) 5%, transparent))`,
          }}
        >
          <Folder className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
        </div>
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
              backgroundColor: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
              color: 'var(--ws-muted)',
              border: '1px solid var(--ws-border)',
            }}
          >
            {category.count}
          </span>
        )}
        <motion.div
          className="shrink-0"
          whileHover={{ x: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <ArrowRight
            className="w-4 h-4"
            style={{ color: 'var(--ws-muted)' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

const STYLE_COMPONENTS = {
  card: CardStyleCategory,
  overlay: OverlayStyleCategory,
  minimal: MinimalStyleCategory,
};

export default function CategoryGridRenderer({ section, theme }) {
  const navigate = useNavigate();
  const { org } = useParams();

  const {
    heading = '',
    subheading = '',
    categories: rawCategories = [],
    columns = 3,
    style = 'card',
    showCount = true,
    showImage = true,
  } = section?.props || {};

  const handleCategoryClick = (categoryName) => {
    const basePath = org ? `/portal/${org}/shop/catalog` : '/catalog';
    navigate(`${basePath}?category=${encodeURIComponent(categoryName)}`);
  };

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
          {/* Gradient accent line */}
          <div
            className="h-[2px] w-16 rounded-full mb-4"
            style={{
              background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 20%, transparent))`,
            }}
          />
          {subheading && (
            <p className="text-base lg:text-lg leading-relaxed" style={{ color: 'var(--ws-muted)' }}>
              {subheading}
            </p>
          )}
        </div>
      )}

      {/* Category grid */}
      <motion.div
        className={`grid gap-5 ${gridClasses}`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {categories.map((category, index) => (
          <CategoryComponent
            key={category.name || index}
            category={category}
            showCount={showCount}
            showImage={showImage}
            onClick={() => handleCategoryClick(category.name)}
          />
        ))}
      </motion.div>
    </section>
  );
}
