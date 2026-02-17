# SENTINEL App Analysis & Rebuild Plan

## Executive Summary

**SENTINEL** is an EU AI Act Compliance Management tool within the ISYNCSO platform. It helps organizations track AI systems, assess risks, and generate compliance documentation for EU AI Act requirements.

---

## 1. Current Frontend Analysis

### Tech Stack Identified
| Technology | Usage |
|------------|-------|
| **Tailwind CSS** | Primary styling framework |
| **Supabase** | Backend database & API |
| **Vercel** | Hosting platform |
| **React/Next.js** | Framework (SSR, detected via structure) |

### Color System (Current Implementation)

```css
/* Primary Theme Color: Mint Green */
--theme-primary: #86EFAC;
--theme-primary-tint-10: rgba(134, 239, 172, 0.1);
--theme-primary-tint-20: rgba(134, 239, 172, 0.2);

/* Backgrounds */
--bg-page: #000000 (bg-black);
--bg-surface: rgba(39, 39, 42, 0.5) (bg-zinc-900/50);
--bg-elevated: rgba(39, 39, 42, 0.6) (bg-zinc-900/60);

/* Borders */
--border-default: rgba(63, 63, 70, 0.6) (border-zinc-800/60);
--border-accent: rgba(134, 239, 172, 0.3) (border-[#86EFAC]/30);

/* Text */
--text-primary: #FFFFFF (text-white);
--text-secondary: #D1D5DB (text-gray-300);
--text-muted: #9CA3AF (text-gray-400);
--text-accent: #86EFAC (text-[#86EFAC]);

/* Semantic Colors */
--error: #F87171 (text-red-400);
--warning: #FBBF24 (text-yellow-400);
--success: #6EE7B7 (text-emerald-400);
```

### Border Radius System
- `rounded-xl` (12px) - Cards, navigation items
- `rounded-lg` (8px) - Buttons, inputs
- `rounded-full` (9999px) - Badges, avatars, pills

### Animation Classes Found
- `transition-all duration-200`
- `transition-all duration-300`
- `hover:scale-105`
- `group-hover:` patterns

---

## 2. Component Architecture

### Page Structure

```
/sentineldashboard (Dashboard)
├── Header: "EU AI Act Compliance" + CTA Button
├── Compliance Score Widget (Gauge)
├── Stat Cards Row (4 cards)
├── Workflow Steps (4-step progress)
├── Action Cards (3 cards)
├── Risk Classification Card
├── Compliance Status Card
└── Welcome CTA Section

/aisysteminventory (AI System Inventory)
├── Header + CTA Button
├── Stat Cards Row (4 cards)
├── Search + Filter Bar
└── Systems List/Grid (or Empty State)

/complianceroadmap (Compliance Roadmap)
├── Header + "AI Action Plan" Button
├── Stat Cards Row (5 cards)
├── Tab Navigation (Timeline, By System, Urgent)
└── Timeline Cards with colored left borders

/documentgenerator (Document Generator)
├── Header + "Dashboard" Back Button
├── Stat Cards Row (4 cards)
└── Content Area (or Empty State)
```

### Reusable Components Identified

1. **StatCard** - Displays metric with icon
2. **ActionCard** - Clickable card with icon + title + description
3. **WorkflowStep** - Circular progress indicator + labels
4. **RiskBadge** - Colored pill badge (PROHIBITED, HIGH RISK, etc.)
5. **StatusRow** - Label + count with color coding
6. **TimelineCard** - Card with colored left border + status badge
7. **FilterDropdown** - Select with icon
8. **SearchInput** - Input with search icon
9. **EmptyState** - Icon + title + description + CTA

---

## 3. Data Flow & API Connections

### Supabase Tables Identified

| Table | Purpose |
|-------|---------|
| `ai_systems` | Main AI systems inventory |
| `users` | User profiles |
| `user_app_configs` | Per-user app settings |
| `companies` | Company data |
| `team_members` | Team membership |
| `teams` | Team structure |
| `organizations` | Organization hierarchy |
| `user_notifications` | Notification system |
| `sync_intel_queue` | Processing queue |

### RPC Functions
- `get_user_effective_apps` - Gets apps available to user
- `get_user_roles` - Gets user roles
- `get_user_permissions` - Gets user permissions

### Supabase Project
- **Project ID**: `sfxpmzicgpaxfntqleig`
- **API Base**: `https://sfxpmzicgpaxfntqleig.supabase.co/rest/v1/`

---

## 4. Claude Code Prompts for Deep Analysis

Use these prompts in Claude Code (terminal) to get comprehensive backend information:

### PROMPT 1: Repository Structure Analysis

```
Analyze the SENTINEL codebase structure. I need to understand:

1. The folder structure for Sentinel-related components
2. Where the pages are defined (likely /app or /pages directory)
3. The component organization pattern
4. Shared utilities and hooks used

Focus on these paths if they exist:
- /app/sentineldashboard
- /app/aisysteminventory
- /app/complianceroadmap
- /app/documentgenerator
- /components/sentinel
- /lib or /utils related to sentinel

List all files and their purposes.
```

### PROMPT 2: Supabase Schema & Database Analysis

```
Using the Supabase Management API, retrieve the complete database schema for Sentinel. I need:

1. Full schema for these tables:
   - ai_systems
   - compliance_tasks (if exists)
   - compliance_documents (if exists)
   - risk_assessments (if exists)

2. All relationships and foreign keys

3. Row Level Security (RLS) policies on these tables

4. Any database functions or triggers related to Sentinel

Run: supabase db dump --schema public --data-only=false

Or use the Management API to introspect the schema.
```

### PROMPT 3: Component Implementation Details

```
Read and analyze these Sentinel component files (adjust paths as needed):

1. The main dashboard page component
2. The StatCard component
3. The ComplianceScoreGauge component
4. The WorkflowSteps component
5. Any animation implementations (framer-motion or animated.js usage)

For each component, tell me:
- Props interface/types
- State management approach
- Data fetching pattern
- Animation libraries used
- Styling approach (Tailwind classes, CSS modules, etc.)
```

### PROMPT 4: API Routes & Server Actions

```
Find all API routes and server actions related to Sentinel. Look for:

1. /api/sentinel/* routes
2. /api/ai-systems/* routes
3. /api/compliance/* routes
4. Server actions in app directory

For each, document:
- HTTP method
- Request/response types
- Supabase queries used
- Authentication requirements
```

### PROMPT 5: State Management & Data Hooks

```
Identify how Sentinel manages state and fetches data:

1. Find all custom hooks (useAISystems, useComplianceStatus, etc.)
2. Check for React Query/TanStack Query usage
3. Check for Zustand/Redux stores
4. Find Supabase realtime subscriptions

Document the data fetching patterns and caching strategies.
```

### PROMPT 6: Animation Implementation Analysis

```
Analyze the current animation implementation:

1. Find all animated.js usage in Sentinel components
2. Find any framer-motion implementations (you mentioned building this)
3. Document animation patterns:
   - Page transitions
   - Card hover effects
   - Loading states
   - Micro-interactions

Show me the code for key animations so we can plan the framer-motion migration.
```

### PROMPT 7: Design Tokens & Theme Configuration

```
Find the design token/theme configuration:

1. tailwind.config.js - custom colors, spacing, etc.
2. globals.css or global styles
3. Any CSS variables defined
4. Component-level style constants

Compare with the ISYNCSO Design System document to identify gaps.
```

### PROMPT 8: Type Definitions

```
Find all TypeScript type definitions related to Sentinel:

1. AI System types
2. Compliance types
3. Risk classification enums
4. API response types

This will help ensure type safety in the rebuild.
```

---

## 5. Design System Alignment

### Gap Analysis: Current vs. Design System

Based on the uploaded design system document, here's what needs alignment:

| Aspect | Current | Design System Spec | Action |
|--------|---------|-------------------|--------|
| Primary Color | #86EFAC (Mint) | SENTINEL Blue (TBD) | Update theme |
| Card Radius | 12px (rounded-xl) | 20px (RADIUS_LG) | Increase |
| Button Style | Mixed | Pill (9999px) | Standardize |
| Shadows | Minimal | SHADOW_SM on cards | Add |
| Typography | System | SF Pro Display/Inter | Implement |

### Theme Tokens to Define

```typescript
// tokens/sentinel.ts
export const sentinelTheme = {
  THEME_PRIMARY: '#0066FF', // Define your blue
  THEME_PRIMARY_SHADE: '#0052CC',
  THEME_PRIMARY_TINT_10: 'rgba(0, 102, 255, 0.1)',
  THEME_PRIMARY_TINT_20: 'rgba(0, 102, 255, 0.2)',
};
```

---

## 6. Next Steps

After receiving Claude Code responses:

1. **Map exact file locations** for all Sentinel components
2. **Document the data layer** completely
3. **Create component inventory** with current vs. desired specs
4. **Plan migration strategy** for design tokens
5. **Design framer-motion animation system**
6. **Build component library** aligned with design system

---

*Generated by Claude for ISYNCSO - January 2026*
