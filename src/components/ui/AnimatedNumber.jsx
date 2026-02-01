import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.5,
  delay = 0,
  className = '',
  formatOptions = {},
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => {
    const num = decimals > 0
      ? current.toFixed(decimals)
      : Math.round(current);

    const formatted = formatOptions.useLocale
      ? Number(num).toLocaleString(formatOptions.locale || 'en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : num;

    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        spring.set(value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, spring, delay]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay }}
    >
      {display}
    </motion.span>
  );
}

export function AnimatedCurrency({ value, currency = '$', ...props }) {
  return (
    <AnimatedNumber
      value={value}
      prefix={currency}
      decimals={0}
      formatOptions={{ useLocale: true }}
      {...props}
    />
  );
}

export function AnimatedPercentage({ value, ...props }) {
  return (
    <AnimatedNumber
      value={value}
      suffix="%"
      decimals={0}
      {...props}
    />
  );
}

export function AnimatedCount({ value, ...props }) {
  return (
    <AnimatedNumber
      value={value}
      decimals={0}
      formatOptions={{ useLocale: true }}
      {...props}
    />
  );
}
