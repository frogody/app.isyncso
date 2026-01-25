import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-transparent shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        xs: "h-7 px-2 py-0.5 text-xs file:text-xs",
        sm: "h-8 px-2.5 py-1 text-sm file:text-sm",
        md: "h-9 px-3 py-1 text-base md:text-sm file:text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const Input = React.forwardRef(({ className, type, size, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(inputVariants({ size }), className)}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input, inputVariants }
