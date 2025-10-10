// Haptic feedback utility for iOS devices
export const haptics = {
  // Light tap - for selections, toggles
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },
  
  // Medium tap - for buttons, confirmations
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  },
  
  // Heavy tap - for important actions, errors
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
  },
  
  // Success pattern
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  },
  
  // Error pattern
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([20, 30, 20, 30, 20]);
    }
  },
  
  // Selection pattern (like picking from a list)
  selection: () => {
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  }
};

// React hook for haptics
export function useHaptics() {
  return haptics;
}