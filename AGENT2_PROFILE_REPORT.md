# Agent 2: Candidate Profile Experience Audit Report

**Date:** 2026-02-26
**Scope:** CandidateDetailDrawer.jsx, TalentCandidateProfile.jsx, usePanelPreferences.js, PanelCustomizationModal.jsx, and all summary widgets.

---

## 1. Data Normalization Audit

### 1.1 CandidateDetailDrawer: Comprehensive Normalization (Good)

**File:** `src/components/talent/CandidateDetailDrawer.jsx`
**Location:** `fetchCandidateDetails()` (lines 1521-1600)

The drawer performs extensive normalization with 20+ field mappings covering name, current_title, current_company, location, linkedin_url, timing_signals, key_insights, outreach_hooks, company_pain_points, company_correlations, inferred_skills, lateral_opportunities, company_intelligence (built from individual DB columns), and Array.isArray guards on skills/work_history/education/certifications/interests.

**Verdict:** Solid normalization. The drawer is the most robust consumer.

### 1.2 TalentCandidateProfile: MINIMAL Normalization (BUG -- P0)

**File:** `src/pages/TalentCandidateProfile.jsx`
**Location:** `fetchCandidate()` (lines 326-348)

```javascript
setCandidate({
  ...data,
  age_group: data.age_group || data.estimated_age_range || null,
  summary: data.summary || data.professional_summary || data.experience_report || null,
});
```

**BUG: Only 2 fields are normalized.** The full-page profile misses ALL of the following normalizations that the drawer performs: name, current_title, current_company, location, linkedin_url, timing_signals, key_insights, outreach_hooks, company_pain_points, company_correlations, inferred_skills, lateral_opportunities, company_intelligence, years_at_company, times_company_hopped, skills (Array guard), work_history (Array guard), education (Array guard), certifications (Array guard), interests (Array guard).

**Impact:**
- Profile page uses raw `candidate.job_title` instead of normalized `current_title`
- Profile page uses raw `candidate.company_name` instead of normalized `current_company`
- Profile page uses raw `candidate.person_home_location` instead of normalized `location`
- Profile page uses raw `candidate.linkedin_profile` instead of normalized `linkedin_url`
- If `skills`, `work_history`, `education` etc. come back as non-array (string or null), `.length` and `.map()` will crash

### 1.3 Profile Page Contact Info Section Uses Raw DB Fields (BUG -- P0)

**File:** `src/pages/TalentCandidateProfile.jsx` lines 1179-1188

```javascript
<InfoRow icon={Mail} label="Email" value={candidate.email} link={...} />
<InfoRow icon={Phone} label="Phone" value={candidate.phone} />
<InfoRow icon={Linkedin} label="LinkedIn" value="View Profile" link={candidate.linkedin_profile} />
<InfoRow icon={MapPin} label="Location" value={candidate.person_home_location} />
```

After enrichment, verified data is stored in `verified_email`, `verified_phone`, `linkedin_url`, and `location` respectively. The drawer correctly checks `candidate.verified_email || candidate.email`, while the profile page only checks `candidate.email`. Enriched candidates show their old/missing contact info on the full profile page.

### 1.4 Education Polymorphic Data: Inconsistent Handling

The `EducationWidget` checks `edu.university` as a fallback for school name. The inline code in both the drawer ProfileTab and profile page does NOT:

```javascript
// EducationWidget (correct - checks 3 sources):
edu.school || edu.institution || edu.university

// Drawer & Profile (missing university):
edu.school || edu.institution
```

### 1.5 Certifications/Skills/Interests: Null-in-Array Bug

All locations use `typeof cert === 'object'` to detect objects. Since `typeof null === 'object'`, a null entry inside an array would produce `JSON.stringify(null)` = the literal text `"null"` displayed as a badge. No `.filter(Boolean)` is applied before `.map()`.

### 1.6 Timing Signals: Missing Type Guard in IntelligenceTab

**File:** `src/components/talent/CandidateDetailDrawer.jsx`, IntelligenceTab (line 1087-1113)

No type guard for individual signal items. If a timing signal is a string instead of an object `{trigger, urgency}`, then `signal.trigger` and `signal.urgency` are `undefined`, displaying `undefined urgency`.

### 1.7 Company Intelligence: `employee_ratings.overall.toFixed(1)` Crash Risk (P1)

**File:** `src/components/talent/CandidateDetailDrawer.jsx`, CompanyTab (line 552)

If `overall` is a string like `"4.2"`, `.toFixed(1)` throws `TypeError`.

**Fix:** `Number(companyIntel.employee_ratings.overall).toFixed(1)`

### 1.8 Salary Range: `Number()` Conversion Risk

Both drawer (line 2282) and profile (line 923): If `salary_range` is `"60k-80k"`, `Number()` returns `NaN`.

**Fix:** Check `isNaN()` and fall back to displaying the raw string.

### 1.9 Drawer Header: Tenure Bypass of Cross-Check (P1)

**File:** `src/components/talent/CandidateDetailDrawer.jsx` line 2287

```javascript
<p>{candidate.years_at_company || 0}y</p>
```

This bypasses the ISS-012 cross-check fix. The `QuickStats` component uses cross-checked tenure, but the header stats bar does not, creating inconsistent tenure display.

**Fix:** Replace with `getCrossCheckedTenure(candidate) || 0` and import from `@/utils/tenureCrossCheck`.

---

## 2. Panel Preferences Audit

### 2.1 Deep Merge Strategy: Forward-Compatible (Good)

**File:** `src/hooks/usePanelPreferences.js` (lines 126-142)

New sections added to `DEFAULT_PANEL_CONFIG` are automatically included with default values for users who have saved older preferences. This is correct.

### 2.2 Deep Merge: Does Not Clean Up Removed Sections (Minor)

Stale keys from removed sections persist in the DB JSONB blob. Not a functional bug, but a data hygiene issue.

### 2.3 Two Sources of Truth for DEFAULT_WIDGETS (BUG)

**`usePanelPreferences.js`** defines `DEFAULT_PANEL_CONFIG.summary_tab.widgets` with 8 widgets (outreach enabled).
**`summary-widgets/index.js`** defines `DEFAULT_WIDGETS` with 14 widgets (outreach disabled).

The `SummaryTabContent` component uses `DEFAULT_WIDGETS` from the index file, producing inconsistent initial state.

**Fix:** Have `usePanelPreferences.js` import `DEFAULT_WIDGETS` from `summary-widgets/index.js` as the single source of truth.

### 2.4 PanelCustomizationModal: Missing summary_tab

The modal only renders tabs: `['summary_card', 'profile', 'intelligence', 'company', 'activity']`. The `summary_tab` widget configuration is only accessible via the inline "Customize" button on the Summary tab itself.

### 2.5 Section Ordering: Not Exposed in UI

Order values exist in the data model but the `PanelCustomizationModal` has no reorder UI for profile/intelligence/company tab sections.

---

## 3. Broken Section Analysis

| # | Section | Severity | Description |
|---|---------|----------|-------------|
| 3.1 | Profile Page Contact Info | **HIGH** | Shows un-enriched `email`/`phone` instead of `verified_email`/`verified_phone` |
| 3.2 | Profile Page Timing Signals | **MEDIUM** | Not normalized; if DB uses `intelligence_timing`, signals are undefined |
| 3.3 | Drawer Header Tenure | **MEDIUM** | Bypasses ISS-012 cross-check, shows raw `years_at_company` |
| 3.4 | Company Tab Ratings | **MEDIUM** | `.toFixed(1)` on string value causes TypeError crash |
| 3.5 | Salary Display | **LOW** | Shows `NaN` for non-numeric salary strings |
| 3.6 | Company Tab Empty State | **LOW** | Never shown because normalized `company_intelligence` always has keys |
| 3.7 | ExperienceItem Company | **LOW** | Undefined company renders empty space next to icon |

---

## 4. Specific Code Fixes

### Fix 4.1 (P0): Add Full Normalization to TalentCandidateProfile.jsx

Replace the 2-field normalization at line 337 with the full 20+ field normalization matching CandidateDetailDrawer.

### Fix 4.2 (P0): Fix Profile Page Contact Info to Use Enriched Fields

Replace line 1183-1186 to use `candidate.verified_email || candidate.email`, `candidate.verified_phone || candidate.phone`, `candidate.linkedin_url || candidate.linkedin_profile`, and composite location.

### Fix 4.3 (P1): Fix Drawer Header Tenure

Replace `candidate.years_at_company || 0` at line 2287 with `getCrossCheckedTenure(candidate) || 0`. Import `getCrossCheckedTenure` from `@/utils/tenureCrossCheck`.

### Fix 4.4 (P1): Fix employee_ratings.overall.toFixed(1)

Wrap with `Number()`: `Number(companyIntel.employee_ratings.overall).toFixed(1)` at line 552.

### Fix 4.5 (P2): Fix Salary NaN Display

Check `isNaN(Number(candidate.salary_range))` and fall back to raw string display.

### Fix 4.6 (P2): Add Type Guard to Timing Signals

Handle `typeof signal === 'string'` case in IntelligenceTab at line 1087. Also add fallback for missing `signal.trigger` and `signal.urgency`.

### Fix 4.7 (P2): Add `.filter(Boolean)` Before All Array `.map()` Calls

Apply to: skills, certifications, interests, outreach_hooks, company_pain_points, key_insights, timing_signals in both drawer and profile page.

### Fix 4.8 (P3): Unify DEFAULT_WIDGETS

Have `usePanelPreferences.js` import and use `DEFAULT_WIDGETS` from `summary-widgets/index.js`.

---

## 5. Centralized Normalization Utility Recommendation

### Problem

The same normalization logic is duplicated across:
1. `CandidateDetailDrawer.jsx` -- comprehensive (20+ fields)
2. `TalentCandidateProfile.jsx` -- minimal (2 fields, buggy)
3. `EducationWidget.jsx` -- has helper functions not shared
4. `WorkHistoryWidget.jsx` -- has local `getStringValue` not shared
5. Inline polymorphic extraction duplicated in 6+ locations

### Proposed Solution

Create `src/utils/normalizeCandidate.js` containing:

- `normalizeCandidate(data)` -- single entry point for all candidate data normalization
- `normalizeArray(value)` -- ensures any value becomes a clean array
- `buildCompanyIntel(data)` -- builds company_intelligence from individual DB columns
- `getDisplayString(value, fallback)` -- extracts display-safe string from polymorphic fields
- `getSchoolName(edu)` -- handles 3 possible school name sources
- `getDegreeName(edu)` -- handles degrees arrays, degree field, field_of_study, majors
- `getJobTitle(job)` -- handles nested title objects
- `getCompanyName(job)` -- handles nested company objects
- `formatSalary(value)` -- safe salary display with NaN handling
- `safeToFixed(value, digits)` -- safe numeric display

Both `CandidateDetailDrawer.jsx` and `TalentCandidateProfile.jsx` would call `normalizeCandidate(data)` instead of doing inline normalization. All widgets and inline renderers would import the shared helpers.

---

## Summary of Findings

| Category | Count |
|----------|-------|
| **Critical bugs (P0)** | 2 (Profile page missing normalization; profile page showing un-enriched contact info) |
| **Medium bugs (P1)** | 4 (Drawer tenure cross-check bypass; employee_ratings crash; timing signals type guard; dual DEFAULT_WIDGETS) |
| **Low/Cosmetic bugs (P2-P3)** | 4 (Salary NaN; null-in-array; company tab empty state; ExperienceItem fallback) |
| **Architectural issues** | 3 (No centralized normalization; orphaned preference keys; summary_tab missing from customization modal) |
