import { animate, stagger } from 'animejs';

// Respect user preferences
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Safe animate wrapper
export const safeAnimate = (targets, params) => {
  if (prefersReducedMotion()) {
    return animate({ targets, ...params, duration: 0 });
  }
  return animate({ targets, ...params });
};

// Staggered list entrance
export const staggerIn = (selector, delay = 50) =>
  safeAnimate(selector, {
    translateY: [20, 0],
    opacity: [0, 1],
    delay: stagger(delay),
    duration: 400,
    easing: 'easeOutQuad',
  });

// Modal/dialog entrance
export const modalIn = (selector) =>
  safeAnimate(selector, {
    scale: [0.95, 1],
    opacity: [0, 1],
    duration: 200,
    easing: 'easeOutQuad',
  });

// Modal/dialog exit
export const modalOut = (selector) =>
  safeAnimate(selector, {
    scale: [1, 0.95],
    opacity: [1, 0],
    duration: 150,
    easing: 'easeInQuad',
  });

// Button press feedback
export const buttonPress = (element) =>
  safeAnimate(element, {
    scale: [1, 0.97, 1],
    duration: 150,
    easing: 'easeInOutQuad',
  });

// Success animation (checkmark pop)
export const successPop = (selector) =>
  safeAnimate(selector, {
    scale: [0, 1.1, 1],
    opacity: [0, 1],
    duration: 400,
    easing: 'easeOutBack',
  });

// Error shake
export const errorShake = (selector) =>
  safeAnimate(selector, {
    translateX: [0, -8, 8, -8, 8, -4, 4, 0],
    duration: 400,
    easing: 'easeInOutQuad',
  });

// Fade in
export const fadeIn = (selector, duration = 300) =>
  safeAnimate(selector, {
    opacity: [0, 1],
    duration,
    easing: 'easeOutQuad',
  });

// Fade out
export const fadeOut = (selector, duration = 200) =>
  safeAnimate(selector, {
    opacity: [1, 0],
    translateY: [0, -10],
    duration,
    easing: 'easeInQuad',
  });

// Slide in from bottom
export const slideInUp = (selector, distance = 20) =>
  safeAnimate(selector, {
    translateY: [distance, 0],
    opacity: [0, 1],
    duration: 300,
    easing: 'easeOutQuad',
  });

// Slide in from right
export const slideInRight = (selector, distance = 20) =>
  safeAnimate(selector, {
    translateX: [distance, 0],
    opacity: [0, 1],
    duration: 300,
    easing: 'easeOutQuad',
  });

// Card hover lift
export const hoverLift = (element) =>
  safeAnimate(element, {
    translateY: -4,
    duration: 200,
    easing: 'easeOutQuad',
  });

// Card hover release
export const hoverRelease = (element) =>
  safeAnimate(element, {
    translateY: 0,
    duration: 200,
    easing: 'easeOutQuad',
  });

// Number counter animation
export const countUp = (element, endValue, duration = 1000) => {
  if (prefersReducedMotion()) {
    element.textContent = endValue.toLocaleString();
    return;
  }

  const obj = { value: 0 };
  return animate({
    targets: obj,
    value: endValue,
    round: 1,
    duration,
    easing: 'easeOutExpo',
    update: () => {
      element.textContent = obj.value.toLocaleString();
    },
  });
};

// Skeleton pulse (for loading states)
export const skeletonPulse = (selector) =>
  safeAnimate(selector, {
    opacity: [0.5, 1, 0.5],
    duration: 1500,
    loop: true,
    easing: 'easeInOutSine',
  });

// Attention pulse (for notifications/badges)
export const attentionPulse = (selector) =>
  safeAnimate(selector, {
    scale: [1, 1.05, 1],
    duration: 600,
    easing: 'easeInOutQuad',
  });

// Page transition in
export const pageIn = (selector) =>
  safeAnimate(selector, {
    opacity: [0, 1],
    translateY: [10, 0],
    duration: 300,
    easing: 'easeOutQuint',
  });

// Tooltip entrance
export const tooltipIn = (selector) =>
  safeAnimate(selector, {
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 150,
    easing: 'easeOutQuad',
  });

// Dropdown menu entrance
export const dropdownIn = (selector) =>
  safeAnimate(selector, {
    opacity: [0, 1],
    translateY: [-8, 0],
    duration: 150,
    easing: 'easeOutQuad',
  });

// Table row entrance (staggered)
export const tableRowsIn = (selector, delay = 30) =>
  safeAnimate(selector, {
    opacity: [0, 1],
    translateX: [-10, 0],
    delay: stagger(delay),
    duration: 300,
    easing: 'easeOutQuad',
  });

// Card grid entrance
export const gridCardsIn = (selector, delay = 50) =>
  safeAnimate(selector, {
    opacity: [0, 1],
    scale: [0.95, 1],
    delay: stagger(delay, { grid: [4, 4], from: 'first' }),
    duration: 400,
    easing: 'easeOutQuad',
  });

export default { animate, stagger };
