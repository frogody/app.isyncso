import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:hidden",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// --- Animated variants ---

const AnimatedTabsContext = React.createContext(null)

const AnimatedTabs = React.forwardRef(({ defaultValue, value, onValueChange, className, children, ...props }, ref) => {
  const [activeTab, setActiveTab] = React.useState(value ?? defaultValue ?? "")

  const currentTab = value !== undefined ? value : activeTab

  const handleValueChange = React.useCallback((val) => {
    if (value === undefined) setActiveTab(val)
    onValueChange?.(val)
  }, [value, onValueChange])

  const ctx = React.useMemo(() => ({ activeTab: currentTab }), [currentTab])

  return (
    <AnimatedTabsContext.Provider value={ctx}>
      <TabsPrimitive.Root
        ref={ref}
        value={currentTab}
        onValueChange={handleValueChange}
        className={className}
        {...props}>
        {children}
      </TabsPrimitive.Root>
    </AnimatedTabsContext.Provider>
  )
})
AnimatedTabs.displayName = "AnimatedTabs"

const AnimatedTabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "relative inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props} />
))
AnimatedTabsList.displayName = "AnimatedTabsList"

const AnimatedTabsTrigger = React.forwardRef(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(AnimatedTabsContext)
  const isActive = ctx?.activeTab === value

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
      {...props}>
      {isActive && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 rounded-md bg-background shadow-sm"
          style={{ zIndex: -1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {props.children}
    </TabsPrimitive.Trigger>
  )
})
AnimatedTabsTrigger.displayName = "AnimatedTabsTrigger"

const AnimatedTabsContent = React.forwardRef(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(AnimatedTabsContext)
  const isActive = ctx?.activeTab === value

  return (
    <TabsPrimitive.Content
      ref={ref}
      value={value}
      forceMount
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !isActive && "hidden",
        className
      )}
      {...props}>
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}>
            {props.children}
          </motion.div>
        )}
      </AnimatePresence>
    </TabsPrimitive.Content>
  )
})
AnimatedTabsContent.displayName = "AnimatedTabsContent"

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AnimatedTabs,
  AnimatedTabsList,
  AnimatedTabsTrigger,
  AnimatedTabsContent,
}
