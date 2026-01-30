# SENTINEL Component Migration Specifications

> Each component spec includes: Current State, Target State, Migration Steps, and Code Examples

---

## Base UI Components (Create New)

### 1. SentinelCard

**Purpose**: Reusable card container following design system

**Target Implementation**:
```tsx
// /src/components/sentinel/ui/SentinelCard.tsx
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SentinelCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'interactive' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function SentinelCard({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: SentinelCardProps) {
  return (
    <motion.div
      className={cn(
        // Base
        'bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] backdrop-blur-sm',
        // Padding variants
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
        },
        // Variant styles
        {
          'hover:border-zinc-700/60 transition-colors duration-200': variant === 'default',
          'cursor-pointer hover:bg-zinc-900/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200': variant === 'interactive',
          'bg-zinc-800/60 shadow-lg': variant === 'elevated',
        },
        className
      )}
      whileHover={variant === 'interactive' ? { scale: 1.02 } : undefined}
      whileTap={variant === 'interactive' ? { scale: 0.98 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

---

### 2. SentinelButton

**Target Implementation**:
```tsx
// /src/components/sentinel/ui/SentinelButton.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SentinelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function SentinelButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: SentinelButtonProps) {
  return (
    <motion.button
      className={cn(
        // Base
        'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200',
        // Sizes
        {
          'h-8 px-4 text-xs': size === 'sm',
          'h-10 px-6 text-sm': size === 'md',
          'h-12 px-7 text-base': size === 'lg',
        },
        // Variants
        {
          'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700': variant === 'primary',
          'bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50': variant === 'secondary',
          'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30': variant === 'ghost',
          'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20': variant === 'danger',
        },
        // Disabled
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
}
```

---

### 3. SentinelBadge

**Target Implementation**:
```tsx
// /src/components/sentinel/ui/SentinelBadge.tsx
import { cn } from '@/lib/utils';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'prohibited' | 'highRisk' | 'gpai' | 'limitedRisk' | 'minimalRisk';

interface SentinelBadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/10 text-red-400 border-red-500/30',
  neutral: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
  prohibited: 'bg-red-500/15 text-red-400 border-red-500/40',
  highRisk: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  gpai: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
  limitedRisk: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  minimalRisk: 'bg-green-500/15 text-green-400 border-green-500/40',
};

export function SentinelBadge({
  variant = 'neutral',
  size = 'md',
  className,
  children,
}: SentinelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
```

---

## Existing Components to Migrate

### 4. StatCard (Dashboard Stats)

**Current Location**: Inline in `SentinelDashboard.jsx`

**Current Pattern**:
```jsx
<div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
  <div className="flex items-center justify-between">
    <span className="text-zinc-400 text-sm">{label}</span>
    <div className="p-2 bg-[#86EFAC]/10 rounded-lg">
      <Icon className="w-5 h-5 text-[#86EFAC]" />
    </div>
  </div>
  <div className="text-3xl font-bold text-white mt-2">{value}</div>
  {subtitle && <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>}
</div>
```

**Target Implementation**:
```tsx
// /src/components/sentinel/ui/StatCard.tsx
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { SentinelCard } from './SentinelCard';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}

export function StatCard({ label, value, subtitle, icon: Icon, trend, loading }: StatCardProps) {
  if (loading) {
    return <StatCardSkeleton />;
  }

  return (
    <SentinelCard padding="md" className="min-w-[200px]">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm">{label}</span>
        <div className="p-2 bg-sky-500/10 rounded-xl">
          <Icon className="w-5 h-5 text-sky-400" />
        </div>
      </div>
      <motion.div
        className="text-4xl font-bold text-white mt-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.div>
      {subtitle && (
        <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
      )}
      {trend && (
        <div className={`text-xs mt-2 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </SentinelCard>
  );
}

function StatCardSkeleton() {
  return (
    <SentinelCard padding="md" className="min-w-[200px]">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
        <div className="h-9 w-9 bg-zinc-800 rounded-xl animate-pulse" />
      </div>
      <div className="h-10 w-16 bg-zinc-800 rounded mt-3 animate-pulse" />
      <div className="h-3 w-24 bg-zinc-800 rounded mt-2 animate-pulse" />
    </SentinelCard>
  );
}
```

---

### 5. WorkflowStepper

**Current Location**: `/src/components/sentinel/WorkflowStepper.jsx`

**Target Implementation**:
```tsx
// /src/components/sentinel/WorkflowStepper.tsx
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  id: string;
  title: string;
  subtitle: string;
  count?: number;
  status: 'completed' | 'current' | 'upcoming';
  href?: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep) => void;
}

export function WorkflowStepper({ steps, onStepClick }: WorkflowStepperProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          className="flex items-center"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <WorkflowStepCard
            step={step}
            onClick={() => onStepClick?.(step)}
          />
          {index < steps.length - 1 && (
            <ChevronRight className="w-5 h-5 text-zinc-600 mx-2" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function WorkflowStepCard({ step, onClick }: { step: WorkflowStep; onClick: () => void }) {
  const isActive = step.status === 'current';
  const isCompleted = step.status === 'completed';

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 p-4 rounded-[20px] border transition-all duration-200',
        'min-w-[180px]',
        isActive && 'bg-sky-500/10 border-sky-500/30',
        isCompleted && 'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700',
        !isActive && !isCompleted && 'bg-zinc-900/30 border-zinc-800/40 opacity-60'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Status indicator */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isActive && 'bg-sky-500 text-white',
          isCompleted && 'bg-green-500 text-white',
          !isActive && !isCompleted && 'bg-zinc-700 text-zinc-400'
        )}
      >
        {isCompleted ? <Check className="w-4 h-4" /> : (
          <span className="text-sm font-medium">{step.count ?? '0'}</span>
        )}
      </div>

      {/* Content */}
      <div className="text-left">
        <div className={cn(
          'text-sm font-medium',
          isActive ? 'text-sky-400' : 'text-white'
        )}>
          {step.title}
        </div>
        <div className="text-xs text-zinc-500">{step.subtitle}</div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute -bottom-1 left-4 right-4 h-0.5 bg-sky-500 rounded-full"
          layoutId="activeStep"
        />
      )}
    </motion.button>
  );
}
```

---

### 6. RiskClassificationBadge

**Current Pattern**: Uses hardcoded colors like `#86EFAC`

**Target Implementation**:
```tsx
// /src/components/sentinel/RiskClassificationBadge.tsx
import { SentinelBadge } from './ui/SentinelBadge';
import { AlertTriangle, Ban, Brain, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

type RiskLevel = 'prohibited' | 'high_risk' | 'gpai' | 'limited_risk' | 'minimal_risk' | 'unclassified';

interface RiskClassificationBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const riskConfig: Record<RiskLevel, { label: string; variant: string; icon: any }> = {
  prohibited: { label: 'PROHIBITED', variant: 'prohibited', icon: Ban },
  high_risk: { label: 'HIGH RISK', variant: 'highRisk', icon: AlertTriangle },
  gpai: { label: 'GPAI', variant: 'gpai', icon: Brain },
  limited_risk: { label: 'LIMITED RISK', variant: 'limitedRisk', icon: AlertCircle },
  minimal_risk: { label: 'MINIMAL RISK', variant: 'minimalRisk', icon: CheckCircle },
  unclassified: { label: 'UNCLASSIFIED', variant: 'neutral', icon: HelpCircle },
};

export function RiskClassificationBadge({ level, showIcon = true, size = 'md' }: RiskClassificationBadgeProps) {
  const config = riskConfig[level] || riskConfig.unclassified;
  const Icon = config.icon;

  return (
    <SentinelBadge variant={config.variant as any} size={size}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </SentinelBadge>
  );
}
```

---

### 7. ComplianceScoreGauge

**Current**: Uses animated.js or inline SVG

**Target Implementation**:
```tsx
// /src/components/sentinel/ComplianceScoreGauge.tsx
import { motion } from 'framer-motion';

interface ComplianceScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ComplianceScoreGauge({
  score,
  maxScore = 100,
  size = 'md'
}: ComplianceScoreGaugeProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const radius = size === 'sm' ? 40 : size === 'md' ? 60 : 80;
  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 8 : 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75; // 270deg arc

  const getScoreColor = () => {
    if (percentage >= 80) return '#22C55E'; // green
    if (percentage >= 60) return '#EAB308'; // yellow
    if (percentage >= 40) return '#F97316'; // orange
    return '#EF4444'; // red
  };

  const getRiskLabel = () => {
    if (percentage >= 80) return { text: 'Low Risk', color: 'text-green-400' };
    if (percentage >= 60) return { text: 'Medium Risk', color: 'text-yellow-400' };
    if (percentage >= 40) return { text: 'High Risk', color: 'text-orange-400' };
    return { text: 'Critical', color: 'text-red-400' };
  };

  const risk = getRiskLabel();

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={radius * 2 + strokeWidth * 2}
        height={radius * 1.5 + strokeWidth * 2}
        className="transform -rotate-90"
      >
        {/* Background arc */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="rgba(63, 63, 70, 0.4)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference * 0.75}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke={getScoreColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference * 0.75}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference * 0.75 }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-zinc-400">Compliance Score</span>
      </div>

      {/* Risk label */}
      <div className={`mt-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/60 ${risk.color}`}>
        {risk.text}
      </div>
    </div>
  );
}
```

---

## Custom Hooks to Create

### useAISystems

```tsx
// /src/hooks/sentinel/useAISystems.ts
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/api/supabaseClient';

interface AISystem {
  id: string;
  name: string;
  description: string;
  risk_classification: string;
  compliance_status: string;
  created_at: string;
  updated_at: string;
}

interface UseAISystemsOptions {
  limit?: number;
  offset?: number;
  classification?: string;
  status?: string;
}

export function useAISystems(options: UseAISystemsOptions = {}) {
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const fetchSystems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error, count } = await db.entities.AISystem.list({
        limit: options.limit || 12,
        offset: options.offset || 0,
        filters: {
          ...(options.classification && { risk_classification: options.classification }),
          ...(options.status && { compliance_status: options.status }),
        },
      });

      if (error) throw error;
      setSystems(data || []);
      setTotal(count || 0);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options.limit, options.offset, options.classification, options.status]);

  useEffect(() => {
    fetchSystems();
  }, [fetchSystems]);

  const createSystem = async (system: Partial<AISystem>) => {
    const { data, error } = await db.entities.AISystem.create(system);
    if (error) throw error;
    await fetchSystems();
    return data;
  };

  const updateSystem = async (id: string, updates: Partial<AISystem>) => {
    const { data, error } = await db.entities.AISystem.update(id, updates);
    if (error) throw error;
    await fetchSystems();
    return data;
  };

  const deleteSystem = async (id: string) => {
    const { error } = await db.entities.AISystem.delete(id);
    if (error) throw error;
    await fetchSystems();
  };

  return {
    systems,
    loading,
    error,
    total,
    refetch: fetchSystems,
    createSystem,
    updateSystem,
    deleteSystem,
  };
}
```

---

## Directory Structure After Migration

```
src/
├── components/
│   └── sentinel/
│       ├── ui/                          # Base UI components
│       │   ├── SentinelCard.tsx
│       │   ├── SentinelButton.tsx
│       │   ├── SentinelBadge.tsx
│       │   ├── SentinelInput.tsx
│       │   └── index.ts
│       ├── AISystemModal.tsx            # Migrated
│       ├── RiskAssessmentWizard.tsx     # Migrated
│       ├── EnhancedSystemCard.tsx       # Migrated
│       ├── QuickActions.tsx             # Migrated
│       ├── WorkflowStepper.tsx          # Migrated
│       ├── RiskClassificationBadge.tsx  # Migrated
│       ├── ComplianceScoreGauge.tsx     # Migrated
│       ├── StatCard.tsx                 # New
│       └── index.ts                     # Barrel export
├── hooks/
│   └── sentinel/
│       ├── useAISystems.ts
│       ├── useComplianceStatus.ts
│       ├── useRoadmap.ts
│       └── index.ts
├── tokens/
│   └── sentinel.ts                      # Design tokens
└── pages/
    ├── Sentinel.tsx                     # Migrated to TS
    ├── SentinelDashboard.tsx
    ├── AISystemInventory.tsx
    ├── ComplianceRoadmap.tsx
    └── DocumentGenerator.tsx
```
