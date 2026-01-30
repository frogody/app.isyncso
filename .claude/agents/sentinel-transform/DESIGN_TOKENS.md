# SENTINEL Design Tokens Specification

> Reference: `ISYNCSO_Design_System_Analysis_MeetSync_Reference.docx`

---

## Color System

### Theme Primary (SENTINEL Blue)

```typescript
// /src/tokens/sentinel.ts
export const SENTINEL_COLORS = {
  // Primary Theme Color - SENTINEL Blue
  primary: {
    DEFAULT: '#0EA5E9',           // sky-500 - Main brand color
    shade: '#0284C7',             // sky-600 - Hover/pressed states
    light: '#38BDF8',             // sky-400 - Lighter variant
    tint10: 'rgba(14, 165, 233, 0.1)',   // 10% opacity backgrounds
    tint15: 'rgba(14, 165, 233, 0.15)',  // 15% opacity active states
    tint20: 'rgba(14, 165, 233, 0.2)',   // 20% opacity focus rings
  },

  // Alternative: Keep Mint Green for continuity
  // primary: {
  //   DEFAULT: '#86EFAC',
  //   shade: '#6EE7B7',
  //   light: '#A7F3D0',
  //   tint10: 'rgba(134, 239, 172, 0.1)',
  //   tint15: 'rgba(134, 239, 172, 0.15)',
  //   tint20: 'rgba(134, 239, 172, 0.2)',
  // },
};
```

### Neutral Palette

```typescript
export const NEUTRAL_TOKENS = {
  // Backgrounds
  bg: {
    page: '#000000',                    // Pure black canvas
    surface: 'rgba(24, 24, 27, 0.5)',   // zinc-900/50 - Cards
    elevated: 'rgba(39, 39, 42, 0.6)',  // zinc-800/60 - Dropdowns, modals
    input: 'rgba(39, 39, 42, 0.4)',     // Input fields
    hover: 'rgba(63, 63, 70, 0.3)',     // Hover states
  },

  // Borders
  border: {
    default: 'rgba(63, 63, 70, 0.6)',   // zinc-700/60
    subtle: 'rgba(63, 63, 70, 0.3)',    // Lighter border
    focus: 'rgba(14, 165, 233, 0.5)',   // Primary focus
  },

  // Text
  text: {
    primary: '#FFFFFF',                  // White
    secondary: '#D4D4D8',                // zinc-300
    muted: '#A1A1AA',                    // zinc-400
    disabled: '#71717A',                 // zinc-500
  },
};
```

### Semantic Colors

```typescript
export const SEMANTIC_COLORS = {
  success: {
    DEFAULT: '#22C55E',           // green-500
    bg: 'rgba(34, 197, 94, 0.1)',
    text: '#4ADE80',              // green-400
    border: 'rgba(34, 197, 94, 0.3)',
  },
  warning: {
    DEFAULT: '#EAB308',           // yellow-500
    bg: 'rgba(234, 179, 8, 0.1)',
    text: '#FACC15',              // yellow-400
    border: 'rgba(234, 179, 8, 0.3)',
  },
  error: {
    DEFAULT: '#EF4444',           // red-500
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#F87171',              // red-400
    border: 'rgba(239, 68, 68, 0.3)',
  },
  info: {
    DEFAULT: '#3B82F6',           // blue-500
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#60A5FA',              // blue-400
    border: 'rgba(59, 130, 246, 0.3)',
  },
};
```

### Risk Classification Colors

```typescript
export const RISK_COLORS = {
  prohibited: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#F87171',
    border: 'rgba(239, 68, 68, 0.4)',
  },
  highRisk: {
    bg: 'rgba(249, 115, 22, 0.15)',
    text: '#FB923C',
    border: 'rgba(249, 115, 22, 0.4)',
  },
  gpai: {
    bg: 'rgba(168, 85, 247, 0.15)',
    text: '#C084FC',
    border: 'rgba(168, 85, 247, 0.4)',
  },
  limitedRisk: {
    bg: 'rgba(234, 179, 8, 0.15)',
    text: '#FACC15',
    border: 'rgba(234, 179, 8, 0.4)',
  },
  minimalRisk: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: '#4ADE80',
    border: 'rgba(34, 197, 94, 0.4)',
  },
  unclassified: {
    bg: 'rgba(161, 161, 170, 0.15)',
    text: '#A1A1AA',
    border: 'rgba(161, 161, 170, 0.4)',
  },
};
```

---

## Typography

### Font Stack

```typescript
export const TYPOGRAPHY = {
  fontFamily: {
    display: '"SF Pro Display", "Inter", system-ui, sans-serif',
    body: '"Inter", "SF Pro Text", system-ui, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace',
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['2rem', { lineHeight: '2.25rem' }],   // 32px
    '4xl': ['2.5rem', { lineHeight: '2.5rem' }],  // 40px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
```

### Text Styles

```typescript
export const TEXT_STYLES = {
  // Headings
  h1: 'text-3xl font-semibold text-white',
  h2: 'text-2xl font-semibold text-white',
  h3: 'text-lg font-medium text-white',
  h4: 'text-base font-medium text-white',

  // Body
  bodyLg: 'text-base text-zinc-300',
  body: 'text-sm text-zinc-300',
  bodySm: 'text-xs text-zinc-400',

  // Special
  label: 'text-xs font-medium text-zinc-400 uppercase tracking-wider',
  caption: 'text-[11px] font-medium text-zinc-500',
};
```

---

## Spacing

```typescript
export const SPACING = {
  xs: '4px',    // 0.25rem
  sm: '8px',    // 0.5rem
  md: '16px',   // 1rem
  lg: '24px',   // 1.5rem
  xl: '32px',   // 2rem
  '2xl': '48px', // 3rem
};
```

---

## Border Radius

```typescript
export const RADIUS = {
  sm: '8px',      // Inner elements, checkboxes
  md: '12px',     // Inputs, nav items, small cards
  lg: '20px',     // Main cards, modals (DESIGN SYSTEM SPEC)
  full: '9999px', // Buttons, badges, pills, avatars
};
```

**Important**: Current implementation uses `rounded-xl` (12px) for cards. Design system specifies **20px**. Update to `rounded-[20px]`.

---

## Shadows

```typescript
export const SHADOWS = {
  none: 'none',
  sm: '0px 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0px 12px 24px rgba(0, 0, 0, 0.12)',

  // Glow effects (for primary elements)
  glow: '0 0 20px rgba(14, 165, 233, 0.15)',
  glowStrong: '0 0 30px rgba(14, 165, 233, 0.25)',
};
```

---

## Component Tokens

### Buttons

```typescript
export const BUTTON_STYLES = {
  // Sizes
  sizes: {
    sm: 'h-8 px-4 text-xs',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-7 text-base',
  },

  // Variants
  variants: {
    primary: `
      bg-sky-500 text-white
      hover:bg-sky-600
      active:bg-sky-700
      disabled:bg-sky-500/50 disabled:cursor-not-allowed
      rounded-full
      transition-colors duration-200
    `,
    secondary: `
      bg-transparent text-white
      border border-zinc-700
      hover:bg-zinc-800/50
      active:bg-zinc-800
      rounded-full
      transition-colors duration-200
    `,
    ghost: `
      bg-transparent text-zinc-400
      hover:text-white hover:bg-zinc-800/30
      rounded-full
      transition-colors duration-200
    `,
  },
};
```

### Cards

```typescript
export const CARD_STYLES = {
  base: `
    bg-zinc-900/50
    border border-zinc-800/60
    rounded-[20px]
    p-6
    backdrop-blur-sm
  `,
  hover: `
    hover:border-zinc-700/60
    hover:bg-zinc-900/60
    transition-all duration-200
  `,
  interactive: `
    cursor-pointer
    hover:scale-[1.02]
    active:scale-[0.98]
  `,
};
```

### Inputs

```typescript
export const INPUT_STYLES = {
  base: `
    h-11
    bg-zinc-900/40
    border border-zinc-800/60
    rounded-xl
    px-4
    text-white
    placeholder:text-zinc-500
    focus:outline-none
    focus:border-sky-500/50
    focus:ring-2
    focus:ring-sky-500/20
    transition-all duration-200
  `,
};
```

### Badges

```typescript
export const BADGE_STYLES = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  variants: {
    primary: 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
    success: 'bg-green-500/10 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    error: 'bg-red-500/10 text-red-400 border border-red-500/30',
    neutral: 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30',
  },
};
```

---

## Animation Tokens (Framer Motion)

```typescript
export const MOTION_VARIANTS = {
  // Page transitions
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  // Card hover
  card: {
    rest: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  },

  // Fade in
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 },
  },

  // Slide up
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  },

  // Stagger children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },

  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },

  // Progress ring
  progressRing: {
    initial: { pathLength: 0 },
    animate: (value: number) => ({
      pathLength: value / 100,
      transition: { duration: 1, ease: 'easeOut' },
    }),
  },
};
```

---

## Tailwind Config Extension

Add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        sentinel: {
          primary: '#0EA5E9',
          'primary-shade': '#0284C7',
          'primary-light': '#38BDF8',
        },
      },
      borderRadius: {
        'card': '20px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(14, 165, 233, 0.15)',
        'glow-strong': '0 0 30px rgba(14, 165, 233, 0.25)',
      },
    },
  },
};
```
