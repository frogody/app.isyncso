import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

const TableContext = React.createContext({ compact: false })

const Table = React.forwardRef(({ className, compact = false, ...props }, ref) => (
  <TableContext.Provider value={{ compact }}>
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom", compact ? "text-xs" : "text-sm", className)}
        {...props} />
    </div>
  </TableContext.Provider>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-white/5", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => {
  const { compact } = React.useContext(TableContext)
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-white/5 transition-colors hover:bg-white/[0.03] data-[state=selected]:bg-muted",
        compact && "h-9",
        className
      )}
      {...props} />
  )
})
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => {
  const { compact } = React.useContext(TableContext)
  return (
    <th
      ref={ref}
      className={cn(
        "text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        compact ? "h-8 px-2 py-1" : "h-10 px-2",
        className
      )}
      {...props} />
  )
})
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => {
  const { compact } = React.useContext(TableContext)
  return (
    <td
      ref={ref}
      className={cn(
        "align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        compact ? "py-1 px-2" : "p-2",
        className
      )}
      {...props} />
  )
})
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props} />
))
TableCaption.displayName = "TableCaption"

const AnimatedTableRow = React.forwardRef(({ className, index = 0, selected = false, ...props }, ref) => {
  const { compact } = React.useContext(TableContext)
  const delay = Math.min(index * 0.05, 0.3)

  return (
    <motion.tr
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay }}
      className={cn(
        "border-b border-white/5 transition-colors data-[state=selected]:bg-muted",
        compact && "h-9",
        selected && "border-l-2 border-l-cyan-500 shadow-[inset_2px_0_8px_rgba(6,182,212,0.15)]",
        className
      )}
      {...props} />
  )
})
AnimatedTableRow.displayName = "AnimatedTableRow"

const AnimatedTableBody = React.forwardRef(({ className, children, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}>
    <AnimatePresence mode="popLayout">
      {children}
    </AnimatePresence>
  </tbody>
))
AnimatedTableBody.displayName = "AnimatedTableBody"

export {
  Table,
  TableHeader,
  TableBody,
  AnimatedTableBody,
  TableFooter,
  TableHead,
  TableRow,
  AnimatedTableRow,
  TableCell,
  TableCaption,
}
