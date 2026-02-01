"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion, useSpring, useTransform } from "framer-motion"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, indicatorClassName, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}>
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 transition-all", indicatorClassName || "bg-primary")}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

const COLOR_CONFIG = {
  cyan: {
    bg: "bg-cyan-500",
    glow: "shadow-[0_0_12px_rgba(6,182,212,0.5)]",
    gradient: "bg-gradient-to-r from-cyan-400 to-cyan-600",
    track: "bg-cyan-500/20",
    text: "text-cyan-400",
  },
  emerald: {
    bg: "bg-emerald-500",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    gradient: "bg-gradient-to-r from-emerald-400 to-emerald-600",
    track: "bg-emerald-500/20",
    text: "text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.5)]",
    gradient: "bg-gradient-to-r from-amber-400 to-amber-600",
    track: "bg-amber-500/20",
    text: "text-amber-400",
  },
  rose: {
    bg: "bg-rose-500",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.5)]",
    gradient: "bg-gradient-to-r from-rose-400 to-rose-600",
    track: "bg-rose-500/20",
    text: "text-rose-400",
  },
  purple: {
    bg: "bg-purple-500",
    glow: "shadow-[0_0_12px_rgba(168,85,247,0.5)]",
    gradient: "bg-gradient-to-r from-purple-400 to-purple-600",
    track: "bg-purple-500/20",
    text: "text-purple-400",
  },
}

const AnimatedProgress = React.forwardRef(({
  className,
  value = 0,
  color = "cyan",
  glow = false,
  gradient = false,
  striped = false,
  showValue = false,
  ...props
}, ref) => {
  const cfg = COLOR_CONFIG[color] || COLOR_CONFIG.cyan
  const spring = useSpring(0, { stiffness: 100, damping: 20 })
  const width = useTransform(spring, v => `${v}%`)

  React.useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return (
    <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
      <div className={cn("relative h-2 w-full overflow-hidden rounded-full", cfg.track)}>
        <motion.div
          className={cn(
            "h-full rounded-full",
            gradient ? cfg.gradient : cfg.bg,
            glow && cfg.glow,
          )}
          style={{
            width,
            ...(striped && {
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.15) 6px, rgba(255,255,255,0.15) 12px)",
              backgroundSize: "24px 24px",
              animation: "progress-stripes 0.6s linear infinite",
            }),
          }}
        />
      </div>
      {showValue && (
        <span className={cn("text-xs font-medium tabular-nums w-8 text-right", cfg.text)}>
          {Math.round(value)}%
        </span>
      )}
    </div>
  )
})
AnimatedProgress.displayName = "AnimatedProgress"

export { Progress, AnimatedProgress }
