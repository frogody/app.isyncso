import React from 'react';

/**
 * PageContainer - Enforces consistent width constraints and padding across pages
 * Optimized for iPhone (mobile), iPad (tablet), and desktop
 *
 * @param {string} size - Container size: 'narrow' | 'default' | 'wide' | 'full'
 * @param {string} className - Additional Tailwind classes
 * @param {React.ReactNode} children
 */
export function PageContainer({ children, size = 'default', className = '' }) {
  const sizeClasses = {
    narrow: 'max-w-3xl',      // 768px - forms, settings, single-column content
    default: 'max-w-6xl',     // 1152px - dashboards, standard pages
    wide: 'max-w-7xl',        // 1280px - data tables, wide grids
    full: 'max-w-none'        // 100% - edge-to-edge layouts
  };

  return (
    <div className={`w-full ${sizeClasses[size]} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

/**
 * MobilePageWrapper - Full-page wrapper with safe area support
 * Use this for main page content to handle notched devices
 */
export function MobilePageWrapper({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-black pb-safe ${className}`}>
      {children}
    </div>
  );
}

/**
 * TouchCard - Card component with proper touch targets
 * Provides visual feedback on touch/click
 */
export function TouchCard({ children, onClick, className = '', disabled = false }) {
  const baseClasses = "rounded-xl sm:rounded-2xl bg-zinc-900/50 border border-zinc-800 transition-all duration-200";
  const interactiveClasses = onClick && !disabled
    ? "cursor-pointer active:scale-[0.98] hover:bg-zinc-800/50 active:bg-zinc-800"
    : "";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${interactiveClasses} ${disabledClasses} ${className}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/**
 * MobileHeader - Sticky header optimized for mobile
 * Automatically handles safe area insets
 */
export function MobileHeader({ children, className = '' }) {
  return (
    <header className={`sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800 pt-safe ${className}`}>
      <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center">
        {children}
      </div>
    </header>
  );
}

/**
 * MobileFooter - Fixed footer with safe area support
 * For bottom navigation or action buttons
 */
export function MobileFooter({ children, className = '' }) {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-zinc-800 pb-safe ${className}`}>
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        {children}
      </div>
    </footer>
  );
}

/**
 * ResponsiveGrid - Auto-responsive grid that adapts columns based on breakpoints
 * 
 * @param {object} cols - Column config: { default: 1, sm: 2, md: 2, lg: 3, xl: 4 }
 * @param {string} gap - Gap size: 'sm' | 'md' | 'lg'
 * @param {string} className - Additional Tailwind classes
 */
export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = '' 
}) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  };

  // Build dynamic grid classes
  const gridCols = [
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`
  ].filter(Boolean).join(' ');
  
  return (
    <div className={`grid ${gridCols} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * StatsGrid - Specialized grid for stat cards (2 cols mobile, 4 cols desktop)
 */
export function StatsGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardsGrid - Standard card grid (1 col mobile → 2-3 cols desktop)
 */
export function CardsGrid({ children, maxCols = 3, className = '' }) {
  const colClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };
  
  return (
    <div className={`grid grid-cols-1 ${colClasses[maxCols] || colClasses[3]} gap-4 sm:gap-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * ResponsiveTable - Wraps tables with horizontal scroll on mobile
 */
export function ResponsiveTable({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * FormGrid - Responsive form layout (1 col mobile → 2 cols desktop)
 */
export function FormGrid({ children, cols = 2, className = '' }) {
  const colClass = cols === 2 ? 'md:grid-cols-2' : 'lg:grid-cols-3';
  
  return (
    <div className={`grid grid-cols-1 ${colClass} gap-4 sm:gap-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * MobileStack - Stack elements on mobile, horizontal on desktop
 */
export function MobileStack({ children, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Section - Page section with consistent spacing
 */
export function Section({ children, className = '' }) {
  return (
    <section className={`py-4 sm:py-6 lg:py-8 ${className}`}>
      {children}
    </section>
  );
}

/**
 * TabletGrid - Optimized grid for iPad (768-1024px)
 * Shows 2 columns on tablet, 1 on mobile, 3+ on desktop
 */
export function TabletGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * ActionBar - Bottom action bar for mobile forms
 * Sticks to bottom with safe area support
 */
export function ActionBar({ children, className = '' }) {
  return (
    <div className={`sticky bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-zinc-800 p-4 pb-safe -mx-4 sm:mx-0 sm:relative sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none sm:p-0 ${className}`}>
      {children}
    </div>
  );
}

/**
 * ScrollContainer - Horizontal scroll container for mobile
 * Shows items in a horizontal scrollable row on mobile
 */
export function ScrollContainer({ children, className = '' }) {
  return (
    <div className={`-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-hide scroll-smooth-ios ${className}`}>
      <div className="flex gap-3 sm:gap-4 pb-2 sm:pb-0">
        {children}
      </div>
    </div>
  );
}

/**
 * ResponsiveText - Text that scales appropriately across devices
 */
export function ResponsiveText({
  children,
  as: Component = 'p',
  variant = 'body',
  className = ''
}) {
  const variants = {
    hero: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
    h1: 'text-xl sm:text-2xl lg:text-3xl font-bold',
    h2: 'text-lg sm:text-xl lg:text-2xl font-semibold',
    h3: 'text-base sm:text-lg font-semibold',
    body: 'text-sm sm:text-base',
    small: 'text-xs sm:text-sm',
    caption: 'text-[11px] sm:text-xs'
  };

  return (
    <Component className={`${variants[variant] || variants.body} ${className}`}>
      {children}
    </Component>
  );
}