import React, { useCallback, useRef, useEffect, useState } from 'react';

/**
 * CategoryFilter
 *
 * Category filtering component for the B2B wholesale catalog.
 * Supports 'pills' (horizontal scrollable) and 'list' (vertical checkboxes)
 * layouts with multi-select and an "All" option.
 */

// ---------------------------------------------------------------------------
// Checkbox icon (simple SVG, avoids lucide dependency for this component)
// ---------------------------------------------------------------------------

function CheckIcon({ checked }) {
  return (
    <span
      className="flex items-center justify-center w-4 h-4 rounded flex-shrink-0 transition-colors duration-150"
      style={{
        backgroundColor: checked ? 'var(--ws-primary)' : 'transparent',
        border: checked ? 'none' : '1.5px solid var(--ws-border)',
      }}
    >
      {checked && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 5.5L4 7.5L8 3"
            stroke="var(--ws-bg, #000)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Count badge
// ---------------------------------------------------------------------------

function CountBadge({ count, isSelected }) {
  return (
    <span
      className="text-[11px] font-medium leading-none px-1.5 py-0.5 rounded-full transition-colors duration-150"
      style={{
        backgroundColor: isSelected
          ? 'rgba(var(--ws-bg-rgb, 0, 0, 0), 0.25)'
          : 'rgba(255, 255, 255, 0.06)',
        color: isSelected ? 'var(--ws-bg, #000)' : 'var(--ws-muted)',
      }}
    >
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pills layout
// ---------------------------------------------------------------------------

function PillsLayout({ categories, selected, onToggle, totalCount }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isAllSelected = selected.length === 0;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, categories]);

  return (
    <div className="relative" style={{ fontFamily: 'var(--ws-font)' }}>
      {/* Left fade */}
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, var(--ws-bg, #09090b), transparent)',
          }}
        />
      )}

      {/* Right fade */}
      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to left, var(--ws-bg, #09090b), transparent)',
          }}
        />
      )}

      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* "All" pill */}
        <button
          onClick={() => onToggle(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0"
          style={{
            backgroundColor: isAllSelected ? 'var(--ws-primary)' : 'transparent',
            color: isAllSelected ? 'var(--ws-bg, #000)' : 'var(--ws-text)',
            border: isAllSelected
              ? '1px solid var(--ws-primary)'
              : '1px solid var(--ws-border)',
          }}
        >
          All
          {totalCount > 0 && (
            <CountBadge count={totalCount} isSelected={isAllSelected} />
          )}
        </button>

        {/* Category pills */}
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0"
              style={{
                backgroundColor: isSelected ? 'var(--ws-primary)' : 'transparent',
                color: isSelected ? 'var(--ws-bg, #000)' : 'var(--ws-text)',
                border: isSelected
                  ? '1px solid var(--ws-primary)'
                  : '1px solid var(--ws-border)',
              }}
            >
              {cat.name}
              {cat.product_count != null && (
                <CountBadge count={cat.product_count} isSelected={isSelected} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List layout
// ---------------------------------------------------------------------------

function ListLayout({ categories, selected, onToggle, totalCount }) {
  const isAllSelected = selected.length === 0;

  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      {/* "All" item */}
      <button
        onClick={() => onToggle(null)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors duration-150"
        style={{
          backgroundColor: isAllSelected
            ? 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.08)'
            : 'transparent',
        }}
      >
        <CheckIcon checked={isAllSelected} />
        <span
          className="text-sm font-medium flex-1"
          style={{
            color: isAllSelected ? 'var(--ws-primary)' : 'var(--ws-text)',
          }}
        >
          All Categories
        </span>
        {totalCount > 0 && (
          <CountBadge count={totalCount} isSelected={false} />
        )}
      </button>

      {/* Category items */}
      {categories.map((cat) => {
        const isSelected = selected.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors duration-150"
            style={{
              backgroundColor: isSelected
                ? 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.08)'
                : 'transparent',
            }}
          >
            <CheckIcon checked={isSelected} />
            <span
              className="text-sm font-medium flex-1 truncate"
              style={{
                color: isSelected ? 'var(--ws-primary)' : 'var(--ws-text)',
              }}
            >
              {cat.name}
            </span>
            {cat.product_count != null && (
              <CountBadge count={cat.product_count} isSelected={false} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function CategoryFilter({
  categories = [],
  selected = [],
  onChange,
  layout = 'pills',
}) {
  const totalCount = categories.reduce(
    (sum, cat) => sum + (cat.product_count ?? 0),
    0,
  );

  const handleToggle = useCallback(
    (categoryId) => {
      if (!onChange) return;

      // "All" clicked: clear selection
      if (categoryId === null) {
        onChange([]);
        return;
      }

      // Toggle individual category
      const isCurrentlySelected = selected.includes(categoryId);
      const next = isCurrentlySelected
        ? selected.filter((id) => id !== categoryId)
        : [...selected, categoryId];

      onChange(next);
    },
    [onChange, selected],
  );

  if (layout === 'list') {
    return (
      <ListLayout
        categories={categories}
        selected={selected}
        onToggle={handleToggle}
        totalCount={totalCount}
      />
    );
  }

  return (
    <PillsLayout
      categories={categories}
      selected={selected}
      onToggle={handleToggle}
      totalCount={totalCount}
    />
  );
}

export default React.memo(CategoryFilter);
