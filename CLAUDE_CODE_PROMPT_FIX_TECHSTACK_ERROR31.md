# Claude Code Prompt: Fix React Error #31 in TechStackWidget

## Problem
The TechStackWidget in the Summary tab is crashing with **React Error #31**: "Objects are not valid as a React child (found: object with keys {name})".

This error occurs because technology data or category names may contain nested object structures instead of plain strings, and the widget tries to render these objects directly as React children.

## Root Cause
The `getTechName` function extracts `tech.name` but doesn't handle cases where `tech.name` itself is an object (nested structure like `{ name: { en: "Technology Name" } }`).

Similarly, `categoryObj.category` is used directly without ensuring it's a string.

## File to Modify
`/src/components/talent/summary-widgets/TechStackWidget.jsx`

## Required Changes

### 1. Add a `safeString` helper function (after line 76)
Add this helper function to safely extract strings from potentially nested structures:

```javascript
// Safely extract a string value from potentially nested structures
const safeString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    // Handle nested patterns like { en: "Name" } or { value: "Name" }
    const extracted = value.en || value.value || value.name || value.text || value.label;
    return typeof extracted === 'string' ? extracted : String(value);
  }
  return String(value);
};
```

### 2. Update the `getTechName` function (lines 78-86)
Replace the existing function with this safer version:

```javascript
// Extract tech name from various formats - handles nested objects safely
const getTechName = (tech) => {
  if (!tech) return null;
  if (typeof tech === 'string') return tech;
  if (typeof tech === 'object') {
    // Extract the name field
    const rawName = tech.name || tech.title || tech.technology || tech.label;

    // If rawName is still an object (nested structure), extract string from it
    if (rawName && typeof rawName === 'object') {
      // Handle common nested patterns like { en: "Name" } or { value: "Name" }
      const nestedValue = rawName.en || rawName.value || rawName.name || rawName.text;
      return typeof nestedValue === 'string' ? nestedValue : null;
    }

    // Ensure we return a string or null
    return typeof rawName === 'string' ? rawName : null;
  }
  return String(tech);
};
```

### 3. Update category name extraction in the processing loop (~line 116)
Change:
```javascript
const categoryName = (categoryObj?.category || '').toUpperCase();
```
To:
```javascript
// Safely extract category name as string
const categoryNameRaw = safeString(categoryObj?.category);
const categoryName = categoryNameRaw.toUpperCase();
```

### 4. Update category storage in relevant/other arrays (~lines 130, 135)
Change both occurrences of:
```javascript
category: categoryObj.category,
```
To:
```javascript
category: categoryNameRaw, // Use the safe string version
```

### 5. Update the fallback section (~line 243)
In the fallback rendering section, add safe category extraction:

Change:
```javascript
{techStackData.slice(0, expanded ? undefined : 3).map((cat, catIndex) => {
  const techs = (cat?.technologies || cat?.techs || []).map(t => getTechName(t)).filter(Boolean);
  if (techs.length === 0) return null;
  return (
    <div key={catIndex} className="space-y-1.5">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {cat.category}
      </p>
```

To:
```javascript
{techStackData.slice(0, expanded ? undefined : 3).map((cat, catIndex) => {
  const categoryName = safeString(cat?.category);
  const techs = (cat?.technologies || cat?.techs || []).map(t => getTechName(t)).filter(Boolean);
  if (techs.length === 0) return null;
  return (
    <div key={catIndex} className="space-y-1.5">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {categoryName}
      </p>
```

## Testing
After the fix:
1. Open a candidate drawer (e.g., Bouke Verburg - Senior Manager Audit at KPMG)
2. Go to Summary tab
3. Scroll down to find the Tech Stack widget
4. It should display "Relevant Tech (X)" with FINANCE AND ACCOUNTING technologies filtered for the audit role
5. No React Error #31 should appear in the console

## Summary
The fix ensures all values rendered as React children are strings, not objects, by:
1. Adding a `safeString` helper for nested object extraction
2. Updating `getTechName` to handle nested name structures
3. Using `safeString` for category name extraction and storage
4. Applying the fix to the fallback rendering section
