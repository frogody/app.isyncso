import * as React from "react"
import { cva } from "class-variance-authority";
import { motion, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
        warning:
          "border-amber-500/30 bg-amber-500/20 text-amber-400",
        info:
          "border-cyan-500/30 bg-cyan-500/20 text-cyan-400",
        glass:
          "border-white/20 bg-white/10 backdrop-blur-sm text-white",
      },
      size: {
        xs: "px-1.5 py-px text-[10px]",
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant, size }), className)} {...props} />);
}

const GLOW_MAP = {
  default: "shadow-[0_0_10px_rgba(6,182,212,0.4)]",
  success: "shadow-[0_0_10px_rgba(16,185,129,0.4)]",
  warning: "shadow-[0_0_10px_rgba(245,158,11,0.4)]",
  destructive: "shadow-[0_0_10px_rgba(239,68,68,0.4)]",
  info: "shadow-[0_0_10px_rgba(6,182,212,0.4)]",
}

const AnimatedBadge = React.forwardRef(({
  className,
  variant = "default",
  size,
  pulse = false,
  glow = false,
  count,
  children,
  ...props
}, ref) => {
  const prevCount = React.useRef(count)
  const bounceScale = useSpring(1, { stiffness: 500, damping: 15 })
  const scale = useTransform(bounceScale, v => v)

  React.useEffect(() => {
    if (count !== undefined && count !== prevCount.current) {
      prevCount.current = count
      bounceScale.set(1.3)
      const t = setTimeout(() => bounceScale.set(1), 50)
      return () => clearTimeout(t)
    }
  }, [count, bounceScale])

  return (
    <motion.div
      ref={ref}
      className={cn(
        badgeVariants({ variant, size }),
        glow && GLOW_MAP[variant],
        className
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        ...(pulse && {
          scale: [1, 1.05, 1],
          opacity: [1, 0.8, 1],
        }),
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 25,
        ...(pulse && {
          scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        }),
      }}
      style={count !== undefined ? { scale } : undefined}
      {...props}>
      {children}
    </motion.div>
  )
})
AnimatedBadge.displayName = "AnimatedBadge"

export { Badge, AnimatedBadge, badgeVariants }
