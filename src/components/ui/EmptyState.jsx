import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className,
  size = 'md',
  animated = true,
}) {
  const sizeConfig = {
    sm: {
      iconContainer: 'w-12 h-12',
      icon: 'w-6 h-6',
      title: 'text-sm',
      description: 'text-xs',
      padding: 'py-6',
    },
    md: {
      iconContainer: 'w-16 h-16',
      icon: 'w-8 h-8',
      title: 'text-base',
      description: 'text-sm',
      padding: 'py-10',
    },
    lg: {
      iconContainer: 'w-20 h-20',
      icon: 'w-10 h-10',
      title: 'text-lg',
      description: 'text-base',
      padding: 'py-16',
    },
  };

  const s = sizeConfig[size] || sizeConfig.md;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.5, 0.3, 0.5],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const Wrapper = animated ? motion.div : 'div';
  const IconWrapper = animated ? motion.div : 'div';
  const TextWrapper = animated ? motion.div : 'div';

  return (
    <Wrapper
      className={cn('flex flex-col items-center justify-center text-center', s.padding, className)}
      variants={animated ? containerVariants : undefined}
      initial={animated ? 'hidden' : undefined}
      animate={animated ? 'visible' : undefined}
    >
      {/* Animated icon with glow effect */}
      <div className="relative mb-4">
        {animated && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 blur-xl',
              s.iconContainer
            )}
            variants={pulseVariants}
            animate="animate"
          />
        )}
        <IconWrapper
          className={cn(
            'relative flex items-center justify-center rounded-2xl',
            'bg-gradient-to-br from-zinc-800/80 to-zinc-900/80',
            'border border-white/10',
            s.iconContainer
          )}
          variants={animated ? iconVariants : undefined}
        >
          {Icon && <Icon className={cn('text-zinc-500', s.icon)} />}
        </IconWrapper>
      </div>

      {title && (
        <TextWrapper variants={animated ? itemVariants : undefined}>
          <h3 className={cn('font-medium text-white/80 mb-1', s.title)}>{title}</h3>
        </TextWrapper>
      )}

      {description && (
        <TextWrapper variants={animated ? itemVariants : undefined}>
          <p className={cn('text-zinc-500 max-w-[280px]', s.description)}>{description}</p>
        </TextWrapper>
      )}

      {action && actionLabel && (
        <TextWrapper variants={animated ? itemVariants : undefined} className="mt-4">
          <motion.button
            onClick={action}
            className="px-4 py-2 text-sm font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {actionLabel}
          </motion.button>
        </TextWrapper>
      )}
    </Wrapper>
  );
}

export function NoDataEmptyState({ title = 'No data yet', description, ...props }) {
  return (
    <EmptyState
      title={title}
      description={description || "Data will appear here once it's available"}
      {...props}
    />
  );
}

export function NoResultsEmptyState({ searchTerm, ...props }) {
  return (
    <EmptyState
      title="No results found"
      description={searchTerm ? `No matches for "${searchTerm}"` : 'Try adjusting your filters'}
      {...props}
    />
  );
}
