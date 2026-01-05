/**
 * Design Tokens - Centralized design system values
 * Use these constants to ensure consistency across the app
 */

export const COLORS = {
  // Feature-specific colors
  sentinel: {
    primary: 'cyan-500',
    light: 'cyan-400',
    dark: 'cyan-600',
    bg: 'cyan-950/30',
    border: 'cyan-500/30',
    text: 'cyan-400',
  },
  learn: {
    primary: 'yellow-500',
    light: 'yellow-400',
    dark: 'yellow-600',
    bg: 'yellow-950/30',
    border: 'yellow-500/30',
    text: 'yellow-400',
  },
  cide: {
    primary: 'indigo-500',
    light: 'indigo-400',
    dark: 'indigo-600',
    bg: 'indigo-950/30',
    border: 'indigo-500/30',
    text: 'indigo-400',
  },
  
  // Semantic colors
  success: {
    primary: 'green-500',
    bg: 'green-500/20',
    border: 'green-500/30',
    text: 'green-400',
  },
  error: {
    primary: 'red-500',
    bg: 'red-500/20',
    border: 'red-500/30',
    text: 'red-400',
  },
  warning: {
    primary: 'yellow-500',
    bg: 'yellow-500/20',
    border: 'yellow-500/30',
    text: 'yellow-400',
  },
  info: {
    primary: 'blue-500',
    bg: 'blue-500/20',
    border: 'blue-500/30',
    text: 'blue-400',
  },
  
  // Base colors
  text: {
    primary: 'white',
    secondary: 'gray-400',
    muted: 'gray-500',
    disabled: 'gray-600',
  },
  background: {
    primary: 'black',
    secondary: 'gray-900',
    card: 'white/5',
    hover: 'white/10',
  },
};

export const SPACING = {
  card: 'p-6',
  cardSmall: 'p-4',
  cardLarge: 'p-8',
  section: 'space-y-6',
  sectionSmall: 'space-y-4',
  sectionLarge: 'space-y-8',
  grid: 'gap-6',
  gridSmall: 'gap-4',
  gridLarge: 'gap-8',
};

export const RADIUS = {
  card: 'rounded-xl',
  button: 'rounded-lg',
  input: 'rounded-lg',
  badge: 'rounded-full',
  modal: 'rounded-xl',
  avatar: 'rounded-full',
};

export const TYPOGRAPHY = {
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-medium',
  body: 'text-base',
  small: 'text-sm',
  tiny: 'text-xs',
};

export const SHADOWS = {
  card: '',  // No shadow by default
  modal: 'shadow-2xl',
  dropdown: 'shadow-lg',
  none: 'shadow-none',
};

export const TRANSITIONS = {
  default: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  fast: 'transition-all duration-100',
};

// Helper function to get feature colors
export function getFeatureColors(feature) {
  const colorMap = {
    sentinel: COLORS.sentinel,
    learn: COLORS.learn,
    cide: COLORS.cide,
  };
  return colorMap[feature] || COLORS.sentinel;
}

// Helper for glass card classes
export function getGlassCardClasses(feature = null, size = 'default') {
  const padding = size === 'small' ? SPACING.cardSmall : size === 'large' ? SPACING.cardLarge : SPACING.card;
  const borderColor = feature ? getFeatureColors(feature).border : 'white/10';
  
  return `glass-card border-0 border-${borderColor} ${padding} ${RADIUS.card}`;
}

// Helper for button classes
export function getButtonClasses(variant = 'primary', feature = null) {
  const featureColors = feature ? getFeatureColors(feature) : null;
  
  switch (variant) {
    case 'primary':
      if (featureColors) {
        return `bg-${featureColors.primary} hover:bg-${featureColors.light} text-white ${RADIUS.button} ${TRANSITIONS.default}`;
      }
      return `bg-cyan-600 hover:bg-cyan-500 text-white ${RADIUS.button} ${TRANSITIONS.default}`;
    
    case 'outline':
      return `border border-gray-700 text-gray-300 hover:bg-white/5 ${RADIUS.button} ${TRANSITIONS.default}`;
    
    case 'destructive':
      return `bg-red-600 hover:bg-red-500 text-white ${RADIUS.button} ${TRANSITIONS.default}`;
    
    default:
      return `${RADIUS.button} ${TRANSITIONS.default}`;
  }
}

export default {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  TRANSITIONS,
  getFeatureColors,
  getGlassCardClasses,
  getButtonClasses,
};