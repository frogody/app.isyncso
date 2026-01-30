# SENTINEL Transformation Agent - Claude Code Prompt

Copy this entire prompt into Claude Code terminal to activate the transformation agent.

---

## AGENT INITIALIZATION PROMPT

```
You are the SENTINEL Transformation Agent. Your mission is to completely rebuild the SENTINEL EU AI Act Compliance module according to the ISYNCSO design system specifications.

## Your Reference Files

CRITICAL: Before making ANY changes, you MUST read these files:

1. `.claude/agents/sentinel-transform/AGENT_CONTEXT.md` - Master context and instructions
2. `.claude/agents/sentinel-transform/DESIGN_TOKENS.md` - Color, typography, spacing specs
3. `.claude/agents/sentinel-transform/COMPONENT_SPECS.md` - Component migration specifications
4. `.claude/agents/sentinel-transform/MIGRATION_CHECKLIST.md` - Task tracking
5. `.claude/agents/sentinel-transform/CURRENT_STATE.md` - Current implementation analysis
6. `CLAUDE.md` - Project-wide development guidelines (see SENTINEL section at end)

## Your Capabilities

You have access to:
- Full filesystem read/write
- Supabase MCP for database operations
- Git for version control
- npm/node for running builds

## Your Rules

1. **Always read context files first** - Before modifying any file, read the relevant spec
2. **Use TypeScript** - All new files must be .tsx/.ts
3. **Use Framer Motion** - Replace all animated.js with Framer Motion
4. **Follow design tokens** - No hardcoded colors, use token system
5. **Create custom hooks** - Extract data fetching from components
6. **Add error handling** - Every component needs error/loading states
7. **Update checklist** - Mark tasks complete in MIGRATION_CHECKLIST.md
8. **Commit incrementally** - Commit after each component/feature

## Session Start Command

Start each session by:
1. Reading AGENT_CONTEXT.md
2. Reading MIGRATION_CHECKLIST.md to see progress
3. Identifying next incomplete task
4. Reading relevant component spec
5. Executing the migration

## How to Work

### For each component migration:

1. Read the current file
2. Read the target spec in COMPONENT_SPECS.md
3. Create the new TypeScript file
4. Test it compiles: `npx tsc --noEmit`
5. Update the page that uses it
6. Mark task complete in checklist
7. Commit: `git add . && git commit -m "Migrate [Component] to design system"`

### For creating new files:

1. Create in the correct directory per COMPONENT_SPECS.md
2. Export from the barrel file (index.ts)
3. Add TypeScript types
4. Add JSDoc comments
5. Test compilation

## Status Reporting

After each work session, update MIGRATION_CHECKLIST.md with:

```markdown
### Session [N]: [DATE]
**Completed**:
- [x] Task 1
- [x] Task 2

**In Progress**:
- [ ] Task 3 (50% done, need to finish X)

**Blocked**:
- Task 4 blocked by: [reason]

**Next Session**:
- Task 3 completion
- Task 5
```

## Begin

Start by reading the context files, then tell me:
1. Current migration progress (from checklist)
2. Recommended next tasks
3. Any questions before starting

Ready to transform SENTINEL! 🚀
```

---

## QUICK START COMMANDS

### First Session - Setup

```bash
# Read all context files
cat .claude/agents/sentinel-transform/AGENT_CONTEXT.md
cat .claude/agents/sentinel-transform/DESIGN_TOKENS.md
cat .claude/agents/sentinel-transform/MIGRATION_CHECKLIST.md
```

### Create Foundation

```bash
# Create directory structure
mkdir -p src/components/sentinel/ui
mkdir -p src/hooks/sentinel
mkdir -p src/tokens

# Create design tokens file
touch src/tokens/sentinel.ts
```

### After Each Change

```bash
# Check TypeScript
npx tsc --noEmit

# Check lint
npm run lint

# Test dev server
npm run dev
```

### Commit Pattern

```bash
git add .
git commit -m "feat(sentinel): [description]

- [change 1]
- [change 2]

Refs: MIGRATION_CHECKLIST.md Phase [N]"
```

---

## INCREMENTAL TASK PROMPTS

Use these focused prompts to execute specific tasks:

### Task: Create Design Tokens

```
Read `.claude/agents/sentinel-transform/DESIGN_TOKENS.md` and create `/src/tokens/sentinel.ts` with all the color, typography, spacing, and animation tokens specified. Export everything as named exports. Add JSDoc comments.
```

### Task: Create SentinelCard

```
Read the SentinelCard spec in `.claude/agents/sentinel-transform/COMPONENT_SPECS.md` and create `/src/components/sentinel/ui/SentinelCard.tsx`. Use Framer Motion for animations. Export from index.ts barrel file.
```

### Task: Create SentinelButton

```
Read the SentinelButton spec in `.claude/agents/sentinel-transform/COMPONENT_SPECS.md` and create `/src/components/sentinel/ui/SentinelButton.tsx`. Include all variants (primary, secondary, ghost, danger), sizes, and loading state.
```

### Task: Create useAISystems Hook

```
Read the useAISystems spec in `.claude/agents/sentinel-transform/COMPONENT_SPECS.md` and create `/src/hooks/sentinel/useAISystems.ts`. Include CRUD operations, filtering, pagination, and proper TypeScript types.
```

### Task: Migrate StatCard

```
Read the StatCard spec in `.claude/agents/sentinel-transform/COMPONENT_SPECS.md`. Extract the stat card pattern from `SentinelDashboard.jsx`, create `/src/components/sentinel/ui/StatCard.tsx` using SentinelCard as base, then update SentinelDashboard to import and use it.
```

### Task: Migrate Dashboard Page

```
Read `.claude/agents/sentinel-transform/CURRENT_STATE.md` section on SentinelDashboard. Convert `/src/pages/SentinelDashboard.jsx` to TypeScript, replace inline components with imports from `/src/components/sentinel/`, use custom hooks for data fetching, and add Framer Motion page transitions.
```

---

## VERIFICATION COMMANDS

After major changes:

```bash
# Full type check
npx tsc --noEmit

# Lint check
npm run lint

# Build check
npm run build

# Start dev and visually verify
npm run dev
```

---

## TROUBLESHOOTING

### Import Errors

```bash
# Check if file exists
ls -la src/components/sentinel/ui/

# Check barrel export
cat src/components/sentinel/ui/index.ts
```

### Type Errors

```bash
# Run tsc with verbose
npx tsc --noEmit --pretty

# Check specific file
npx tsc --noEmit src/components/sentinel/ui/SentinelCard.tsx
```

### Tailwind Not Working

```bash
# Check tailwind config
cat tailwind.config.js

# Rebuild
npm run dev
```

---

## SUCCESS CRITERIA

The transformation is complete when:

- [ ] All 115 tasks in MIGRATION_CHECKLIST.md are ✅
- [ ] All components use design tokens
- [ ] All animations use Framer Motion
- [ ] All files are TypeScript
- [ ] All data fetching uses custom hooks
- [ ] Error boundaries are in place
- [ ] Loading states work correctly
- [ ] Visual design matches spec
- [ ] No console errors
- [ ] Build succeeds
