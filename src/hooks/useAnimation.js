import { useEffect, useRef, useCallback } from 'react';
import anime from 'animejs';
import { prefersReducedMotion } from '@/lib/animations';

/**
 * Hook for staggered entrance animation on list items
 * @param {unknown[]} deps - Dependencies to trigger animation
 * @returns {React.RefObject} - Ref to attach to container element
 */
export function useStaggeredEntrance(deps = []) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) return;

    const children = containerRef.current.children;
    if (children.length === 0) return;

    // Set initial state
    Array.from(children).forEach(child => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(20px)';
    });

    // Animate
    anime({
      targets: children,
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(50),
      duration: 400,
      easing: 'easeOutQuad',
    });
  }, deps);

  return containerRef;
}

/**
 * Hook for button press feedback animation
 * @returns {Object} - Props to spread on button element
 */
export function useButtonFeedback() {
  const handlePress = useCallback((e) => {
    if (prefersReducedMotion()) return;

    anime({
      targets: e.currentTarget,
      scale: [1, 0.97, 1],
      duration: 150,
      easing: 'easeInOutQuad',
    });
  }, []);

  return { onMouseDown: handlePress };
}

/**
 * Hook for hover lift effect on cards
 * @returns {React.RefObject} - Ref to attach to card element
 */
export function useHoverLift() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const enter = () => {
      anime.remove(el);
      anime({
        targets: el,
        translateY: -4,
        duration: 200,
        easing: 'easeOutQuad',
      });
    };

    const leave = () => {
      anime.remove(el);
      anime({
        targets: el,
        translateY: 0,
        duration: 200,
        easing: 'easeOutQuad',
      });
    };

    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    };
  }, []);

  return ref;
}

/**
 * Hook for counting up numbers
 * @param {number} endValue - Target value to count to
 * @param {number} duration - Animation duration in ms
 * @returns {React.RefObject} - Ref to attach to element
 */
export function useCountUp(endValue, duration = 1000) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    if (prefersReducedMotion()) {
      ref.current.textContent = endValue.toLocaleString();
      return;
    }

    const obj = { value: 0 };
    anime({
      targets: obj,
      value: endValue,
      round: 1,
      duration,
      easing: 'easeOutExpo',
      update: () => {
        if (ref.current) {
          ref.current.textContent = obj.value.toLocaleString();
        }
      },
    });
  }, [endValue, duration]);

  return ref;
}

/**
 * Hook for modal entrance animation
 * @param {boolean} isOpen - Whether modal is open
 * @returns {React.RefObject} - Ref to attach to modal element
 */
export function useModalAnimation(isOpen) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    if (isOpen) {
      anime({
        targets: ref.current,
        scale: [0.95, 1],
        opacity: [0, 1],
        duration: 200,
        easing: 'easeOutQuad',
      });
    }
  }, [isOpen]);

  return ref;
}

/**
 * Hook for fade in animation on mount
 * @param {unknown[]} deps - Dependencies to trigger animation
 * @returns {React.RefObject} - Ref to attach to element
 */
export function useFadeIn(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    ref.current.style.opacity = '0';

    anime({
      targets: ref.current,
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad',
    });
  }, deps);

  return ref;
}

/**
 * Hook for slide up animation on mount
 * @param {unknown[]} deps - Dependencies to trigger animation
 * @param {number} distance - Distance to slide from
 * @returns {React.RefObject} - Ref to attach to element
 */
export function useSlideUp(deps = [], distance = 20) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    anime({
      targets: ref.current,
      translateY: [distance, 0],
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad',
    });
  }, deps);

  return ref;
}

/**
 * Hook for table rows staggered entrance
 * @param {unknown[]} deps - Dependencies to trigger animation
 * @returns {React.RefObject} - Ref to attach to tbody element
 */
export function useTableRowsAnimation(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;

    const rows = ref.current.querySelectorAll('tr');
    if (rows.length === 0) return;

    anime({
      targets: rows,
      opacity: [0, 1],
      translateX: [-10, 0],
      delay: anime.stagger(30),
      duration: 300,
      easing: 'easeOutQuad',
    });
  }, deps);

  return ref;
}

/**
 * Hook for success animation
 * @returns {Function} - Trigger function to call on success
 */
export function useSuccessAnimation() {
  const ref = useRef(null);

  const trigger = useCallback(() => {
    if (!ref.current || prefersReducedMotion()) return;

    anime({
      targets: ref.current,
      scale: [0, 1.1, 1],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutBack',
    });
  }, []);

  return [ref, trigger];
}

/**
 * Hook for error shake animation
 * @returns {Function} - Trigger function to call on error
 */
export function useErrorShake() {
  const ref = useRef(null);

  const trigger = useCallback(() => {
    if (!ref.current || prefersReducedMotion()) return;

    anime({
      targets: ref.current,
      translateX: [0, -8, 8, -8, 8, -4, 4, 0],
      duration: 400,
      easing: 'easeInOutQuad',
    });
  }, []);

  return [ref, trigger];
}

export default {
  useStaggeredEntrance,
  useButtonFeedback,
  useHoverLift,
  useCountUp,
  useModalAnimation,
  useFadeIn,
  useSlideUp,
  useTableRowsAnimation,
  useSuccessAnimation,
  useErrorShake,
};
