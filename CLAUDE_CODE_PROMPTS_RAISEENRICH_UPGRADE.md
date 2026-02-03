# Claude Code Prompts: RaisEnrich Upgrade Plan

## Overview
This document contains step-by-step prompts to upgrade RaisEnrich to match Clay's capabilities.
Execute these prompts sequentially in your terminal with Claude Code.

**Core Principle:** Keep the Nest-first approach as a differentiator!

---

## Phase 1: Core Table UX Improvements

### Prompt 1.1: Add Filter System
```
I need to add a comprehensive filter system to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Add a "Filters" button in the toolbar next to Sort
2. Create a FilterPanel component that shows when clicked
3. Support filter types:
   - Text: contains, equals, starts with, ends with, is empty, is not empty
   - Number: equals, greater than, less than, between
4. Allow multiple filters (AND logic)
5. Show active filter count badge on the button
6. Store filters in component state and apply to visibleRows
7. Add a "Clear all filters" button

Style to match existing dark theme (zinc colors, orange accents).
The filter panel should slide in from the right side, similar to Clay's Actions panel.

Current file structure uses:
- rt() for theme-aware classnames
- RaiseButton, RaiseBadge for UI components
- Lucide icons

Please implement this feature.
```

### Prompt 1.2: Add Sort Functionality
```
Add comprehensive sort functionality to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Make column headers clickable to toggle sort
2. Show sort direction indicator (arrow up/down) on sorted column
3. Support multi-column sort (Shift+click to add secondary sort)
4. Sort types based on column content:
   - Text: alphabetical
   - Numbers: numerical
   - Dates: chronological
5. Add "Sort" button in toolbar that opens a sort configuration panel
6. Store sort state: { columnId, direction: 'asc' | 'desc' }[]

The sorting should be applied after filtering but before virtual scroll calculations.

Current implementation has:
- columns state array
- rows state array
- visibleRows computed from virtual scroll

Please implement this feature maintaining the existing code patterns.
```

### Prompt 1.3: Add Search Functionality
```
Add global table search to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Add a search input in the toolbar (using the existing Search icon import)
2. Search across all visible columns
3. Highlight matching cells (subtle yellow/orange background)
4. Show match count: "X matches in Y rows"
5. Add keyboard shortcut: Cmd/Ctrl+F to focus search
6. Clear search with Escape key
7. Debounce search input (300ms)

The search should filter rows to only show those with matches.
Integrate with existing filter system (search is additive to filters).

Please implement this feature.
```

### Prompt 1.4: Add Progress Indicators
```
Add comprehensive progress indicators to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Add column-level progress bar in header (like Clay shows "100%")
   - Calculate: (completed cells / total rows) * 100
   - Show for enrichment and AI columns only
   - Color: green for complete, yellow for partial, gray for empty

2. Add a global progress indicator in the toolbar
   - Show overall table completion percentage
   - Format: "85% complete" or "10/10 rows"

3. Enhance StatusDot component:
   - pending: yellow pulsing dot
   - error: red dot with tooltip showing error message
   - complete: green dot
   - empty: no dot

4. Add row-level status indicator in the row number column
   - Show if any cell in the row has errors

The existing StatusDot component can be enhanced. Store completion stats in useMemo.

Please implement this feature.
```

### Prompt 1.5: Add Auto-Run Toggle
```
Add auto-run functionality to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Add "Auto-run" toggle button in the toolbar (like Clay)
2. When enabled, automatically run enrichment columns when:
   - A new row is added
   - Input column value changes
   - New enrichment column is added
3. Store auto-run state in workspace metadata (enrich_workspaces table)
4. Add visual indicator when auto-run is active (green dot)
5. Add confirmation dialog when enabling: "Auto-run will use credits automatically. Continue?"

Implementation notes:
- Use useEffect to watch for row/cell changes
- Debounce auto-run triggers (1 second)
- Only run for rows that haven't been processed yet
- Skip if column already has complete status

Please implement this feature.
```

---

## Phase 2: Enhanced Column Types

### Prompt 2.1: Add Waterfall Enrichment Column Type
```
Add a new "Waterfall" column type to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Add new column type: { value: 'waterfall', label: 'Waterfall', icon: Layers, desc: 'Try multiple sources in order' }
2. Waterfall config should include:
   - sources: Array of { function, input_column_id, output_field, priority }
   - stopOnSuccess: boolean (default true)
3. UI for configuring waterfall:
   - Drag-and-drop list of enrichment sources
   - Add/remove sources
   - Set priority order
4. Execution logic:
   - Try first source
   - If result is empty/null, try next source
   - Continue until success or all sources exhausted
   - Store which source succeeded in cell metadata

This is a key Clay feature - allows users to set up fallback enrichment sources.

Please implement this feature, adding Layers icon to imports.
```

### Prompt 2.2: Add HTTP API Column Type
```
Add a new "HTTP API" column type to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Add new column type: { value: 'http', label: 'HTTP API', icon: Globe, desc: 'Call custom API endpoints' }
2. HTTP config should include:
   - url: string (supports column references with /ColumnName syntax)
   - method: GET | POST | PUT
   - headers: key-value pairs
   - body: JSON template with column references
   - outputPath: dot notation for extracting response field
   - authentication: { type: 'none' | 'bearer' | 'basic', token/credentials }

3. UI for configuring HTTP:
   - URL input with /column autocomplete
   - Method dropdown
   - Headers section (add/remove pairs)
   - Body textarea with /column autocomplete
   - Response path input
   - Test button to try with first row

4. Execution:
   - Replace column references in URL/body
   - Make fetch request
   - Parse JSON response
   - Extract value using outputPath
   - Handle errors gracefully

This enables users to connect to any API, making the system extensible.

Please implement this feature, adding Globe icon to imports.
```

### Prompt 2.3: Add More Data Type Columns
```
Enhance the Field column type in RaisEnrich to support multiple data types.

Requirements:
1. Add data type selection to Field columns:
   - text (default)
   - number (with formatting options)
   - currency (with currency symbol selection)
   - date (with format selection)
   - url (clickable link)
   - email (clickable mailto link)
   - checkbox (boolean toggle)
   - select (dropdown with predefined options)

2. For each type, update:
   - Cell rendering (format display value)
   - Cell editing (appropriate input type)
   - Sorting behavior
   - Filtering options

3. UI changes:
   - Add "Data Type" dropdown in Field column config
   - Show type-specific options when selected
   - Update column header icon based on type

4. Type-specific features:
   - Number: decimal places, thousands separator
   - Currency: symbol position, currency code
   - Date: display format (MM/DD/YYYY, etc.)
   - Select: manage options list

Please implement these data type enhancements.
```

### Prompt 2.4: Add Merge Columns Feature
```
Add a "Merge Columns" column type to RaisEnrich (src/pages/RaiseEnrich.jsx).

Requirements:
1. Add new column type: { value: 'merge', label: 'Merge Columns', icon: Combine, desc: 'Combine multiple columns' }

2. Merge config:
   - sourceColumns: Array of column IDs to merge
   - separator: string (default: " ")
   - format: 'concatenate' | 'first_non_empty' | 'all_non_empty' | 'json_array'
   - skipEmpty: boolean

3. UI for configuration:
   - Multi-select for source columns
   - Separator input
   - Format dropdown
   - Preview of merged result

4. The merge should be computed on-the-fly (like formula), not stored in cells

This helps users combine data from multiple sources into a single column.

Please implement this feature, adding Combine icon from lucide-react.
```

---

## Phase 3: AI Enhancement

### Prompt 3.1: Add AI Chat Assistant (Sculptor-like)
```
Add an AI assistant panel to RaisEnrich, similar to Clay's "Sculptor".

Requirements:
1. Add "AI Assistant" button in toolbar that toggles a right sidebar panel
2. Panel features:
   - Chat interface with message history
   - Input field: "Ask questions and add enrichments..."
   - Suggested prompts section:
     - "Add Company Website"
     - "Find Email Addresses"
     - "Analyze company size distribution"

3. AI capabilities (via Claude API):
   - Answer questions about the data
   - Suggest enrichments based on columns
   - Add columns via natural language: "Add a column for company revenue"
   - Run analysis: "Show me companies with 50+ employees"

4. Context passing:
   - Include column names and types
   - Include sample data (first 5 rows)
   - Include selected cell context

5. Response handling:
   - Display formatted responses
   - Handle action responses (add column, run filter)
   - Show loading state

Create a new component: src/components/enrich/AIAssistantPanel.jsx
Add necessary API integration for Claude.

Please implement this feature.
```

### Prompt 3.2: Enhance AI Column with Model Selection
```
Enhance the AI column type in RaisEnrich with advanced options.

Requirements:
1. Add model selection dropdown:
   - Claude 3.5 Sonnet (default)
   - Claude 3 Opus
   - GPT-4o
   - GPT-3.5 Turbo

2. Add configuration options:
   - Temperature slider (0-1)
   - Max tokens input
   - Output format: text | json | number | boolean
   - System prompt (optional advanced setting)

3. Add "Use AI" quick actions:
   - Summarize
   - Extract key points
   - Classify/categorize
   - Translate
   - Generate pitch

4. Implement actual AI execution:
   - Create src/lib/ai-providers.js for multi-provider support
   - Handle API keys from environment/settings
   - Process prompts with column references
   - Parse and format outputs

5. Add caching:
   - Cache AI results by input hash
   - Show "cached" indicator on cells

Please implement these AI enhancements.
```

---

## Phase 4: Advanced Features

### Prompt 4.1: Add Sandbox Mode
```
Add Sandbox mode to RaisEnrich for testing enrichments without affecting data.

Requirements:
1. Add "Sandbox Mode" toggle button in toolbar
2. When enabled:
   - All changes are stored in local state only
   - Show prominent "SANDBOX" badge in header
   - Add yellow/warning color scheme
   - Disable auto-save
   - Add "Exit Sandbox" button with options:
     - "Discard changes" - revert to original
     - "Apply changes" - persist to database

3. Sandbox features:
   - Track all changes in a diff array
   - Show change count badge
   - Allow previewing changes before applying
   - Highlight modified cells

4. Implementation:
   - Create sandboxCells and sandboxRows state
   - Modify save functions to check sandbox mode
   - Add apply/discard handlers

This helps users test enrichment configurations without using credits.

Please implement this feature.
```

### Prompt 4.2: Add History/Versioning
```
Add history tracking and versioning to RaisEnrich.

Requirements:
1. Add "History" button in toolbar that opens a history panel
2. Track changes:
   - Cell edits
   - Column additions/deletions
   - Row additions/deletions
   - Enrichment runs

3. History panel features:
   - Timeline view of changes
   - Filter by change type
   - User attribution
   - Timestamp
   - "Restore" action for each item

4. Database schema (create migration):
   - enrich_history table:
     - id, workspace_id, user_id
     - action_type, entity_type, entity_id
     - before_value, after_value
     - created_at

5. Implement undo/redo:
   - Cmd/Ctrl+Z for undo
   - Cmd/Ctrl+Shift+Z for redo
   - Keep last 50 actions in memory

Please implement this feature with necessary database migrations.
```

### Prompt 4.3: Add Views System
```
Add a Views system to RaisEnrich, allowing users to save and switch between different table configurations.

Requirements:
1. Add "Views" dropdown in toolbar (replacing "Default view")
2. View includes:
   - Visible columns and their order
   - Column widths
   - Active filters
   - Sort configuration
   - Row grouping (optional)

3. View management:
   - Create new view
   - Rename view
   - Duplicate view
   - Delete view (except default)
   - Set as default

4. Database schema:
   - enrich_views table:
     - id, workspace_id, name, is_default
     - config (JSON): columns, filters, sorts, etc.
     - created_by, created_at

5. UI:
   - Dropdown with view list
   - Star icon for default
   - Edit/delete in dropdown
   - "Save current view" option

Please implement this feature.
```

---

## Execution Instructions

1. **Start with Phase 1** - These are the core UX improvements that will have immediate impact.

2. **Test after each prompt** - Run the app and verify the feature works before moving to the next.

3. **Commit frequently** - After each successful feature, commit with descriptive message.

4. **Handle errors** - If a prompt doesn't produce working code, iterate with Claude Code to fix issues.

5. **Skip if blocked** - If a feature requires infrastructure you don't have (e.g., AI API keys), note it and continue.

---

## Quick Reference: Current File Structure

```
src/
├── pages/
│   └── RaiseEnrich.jsx          # Main component (1690 lines)
├── lib/
│   └── explorium-api.js         # Enrichment API functions
├── components/
│   ├── raise/
│   │   └── ui/                  # RaiseButton, RaiseBadge, etc.
│   └── ui/                      # Shared UI components
└── api/
    └── supabaseClient.js        # Database client
```

## Database Tables
- `enrich_workspaces` - Workspace metadata
- `enrich_columns` - Column definitions
- `enrich_rows` - Row data
- `enrich_cells` - Cell values and status

Good luck with the upgrade! 🚀
