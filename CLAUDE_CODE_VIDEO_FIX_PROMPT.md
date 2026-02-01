# Video Generation System Overhaul - Full Context Integration

## THE PROBLEM

The current video generation system extracts only shallow design tokens (colors, components) but completely ignores the rich product context that's available:

**What we have but aren't using:**
1. Product name, tagline, and full description
2. Product tags/keywords (e.g., "EU AI Act", "compliance automation", "RegTech")
3. Screenshot CONTENT and MEANING (not just visual design)
4. Target audience and value proposition

**Result:** Videos show generic feature cards like "AI Document Generation" instead of the ACTUAL product features like "EU AI Act Compliance Dashboard" with regulatory timeline.

---

## THE SOLUTION

### Phase 1: Enhance the `analyze-screenshots` Edge Function

**File:** `supabase/functions/analyze-screenshots/index.ts`

Update the Claude Vision API prompt to extract SEMANTIC meaning, not just design tokens:

```typescript
const analysisPrompt = `You are analyzing screenshots of a SaaS product called "${productName}".

Product Description: ${productDescription}
Product Tags: ${productTags.join(', ')}

Analyze these screenshots and extract:

## 1. BRAND IDENTITY
- exact_primary_color: The EXACT hex color of the main accent/CTA buttons (sample from screenshot)
- exact_secondary_color: The secondary accent color
- exact_background_color: The main background color
- color_scheme: "dark" | "light" | "mixed"
- typography_style: What font style - modern, corporate, playful, technical

## 2. PRODUCT UNDERSTANDING (CRITICAL - THIS IS NEW)
- product_category: What type of product is this? (e.g., "RegTech/Compliance Platform", "CRM", "Analytics Tool")
- primary_use_case: What is the main thing users do with this product?
- target_audience: Who would use this? (e.g., "Compliance officers, legal teams, ML engineers")
- value_proposition: What problem does it solve? (1-2 sentences)
- industry_vertical: What industry is this for? (e.g., "Legal/Regulatory Tech", "Healthcare", "Finance")

## 3. KEY SCREENS IDENTIFIED (CRITICAL - THIS IS NEW)
For EACH screenshot, identify:
- screen_name: What is this screen called? (e.g., "Compliance Dashboard", "AI System Inventory")
- screen_purpose: What does the user do here?
- key_metrics_shown: Any numbers, percentages, scores displayed
- key_actions_available: What CTAs/buttons are visible?
- notable_ui_elements: Important UI components visible

## 4. FEATURE EXTRACTION (CRITICAL - THIS IS NEW)
Based on ALL screenshots, list the top 5 product features with:
- feature_name: Exact name as shown in UI (e.g., "Compliance Roadmap", NOT "Project Timeline")
- feature_description: What it does (from the UI, not made up)
- feature_icon_suggestion: What icon would represent this

## 5. DESIGN TOKENS (existing, keep this)
- components_detected: navbar, sidebar, cards, tables, charts, etc.
- card_style: elevated, flat, bordered
- border_radius: none, small, medium, large
- layout_pattern: dashboard, list, kanban, etc.

Return as structured JSON.`;
```

### Phase 2: Update the Database Schema

Add new columns to store the semantic analysis:

```sql
ALTER TABLE screenshot_analyses ADD COLUMN IF NOT EXISTS product_understanding JSONB;
ALTER TABLE screenshot_analyses ADD COLUMN IF NOT EXISTS key_screens JSONB;
ALTER TABLE screenshot_analyses ADD COLUMN IF NOT EXISTS extracted_features JSONB;
```

### Phase 3: Create a New "Product-Aware" Video Composition

**File:** `src/remotion/compositions/ProductShowcase.tsx`

This composition should:

1. **Use the ACTUAL product name and tagline** from the database
2. **Use EXACT brand colors** extracted from screenshots
3. **Show ACTUAL features** from the extracted_features analysis
4. **Reference ACTUAL screens** from key_screens analysis
5. **Speak to the TARGET AUDIENCE** identified in product_understanding

**Structure for a 15-second video:**

```
0-3s:   Product logo/name + tagline animation (dark bg, exact brand colors)
3-6s:   Problem statement for target audience
        "Compliance officers: EU AI Act deadlines are approaching..."
6-12s:  Feature showcase (3 features, 2s each)
        - Show actual feature names from screenshots
        - Use icons that match the product aesthetic
        - Brief value-focused descriptions
12-15s: CTA + product name
        "Stay compliant. Automatically."
```

### Phase 4: Update the Video Rendering Request

When a video render is requested, pass ALL context to the composition:

```typescript
const inputProps = {
  // Product basics
  productName: product.name,
  productTagline: product.tagline,
  productDescription: product.description,
  productTags: product.tags,

  // From screenshot analysis
  brandColors: {
    primary: analysis.exact_primary_color,    // e.g., "#14b8a6" (teal)
    secondary: analysis.exact_secondary_color,
    background: analysis.exact_background_color,
    scheme: analysis.color_scheme              // "dark"
  },

  // Semantic understanding
  productCategory: analysis.product_understanding.product_category,
  targetAudience: analysis.product_understanding.target_audience,
  valueProposition: analysis.product_understanding.value_proposition,

  // Actual features (not made up)
  features: analysis.extracted_features.map(f => ({
    name: f.feature_name,           // "Compliance Roadmap"
    description: f.feature_description,
    icon: f.feature_icon_suggestion
  })),

  // Key screens for potential mockup display
  keyScreens: analysis.key_screens
};
```

### Phase 5: Example - What Sentinel's Video SHOULD Look Like

**Opening (0-3s):**
- Dark background (#1a1a2e)
- "SENTINEL" text animates in with teal (#14b8a6) accent
- Tagline: "AI compliance made easy"

**Problem Hook (3-6s):**
- Text: "EU AI Act deadlines are here."
- Timeline graphic showing Feb 2025, Aug 2025 dates
- "Are your AI systems compliant?"

**Features (6-12s):**
Feature 1: "Compliance Dashboard"
- Animated compliance score gauge
- "Real-time compliance monitoring"

Feature 2: "Risk Classification"
- Show PROHIBITED / HIGH RISK / GPAI categories
- "Automated risk assessment"

Feature 3: "Document Generator"
- Document icon with checkmark
- "Annex IV documentation, automated"

**CTA (12-15s):**
- "SENTINEL"
- "Transform compliance burden into automated confidence"
- "Get Started" button in teal

---

## IMPLEMENTATION CHECKLIST

1. [ ] Update `analyze-screenshots` edge function with semantic extraction prompt
2. [ ] Add new database columns for product_understanding, key_screens, extracted_features
3. [ ] Create new `ProductShowcase.tsx` composition
4. [ ] Update video rendering to pass full context
5. [ ] Create animated components that use exact brand colors
6. [ ] Test with Sentinel product
7. [ ] Verify video shows ACTUAL features and branding

---

## KEY PRINCIPLE

**The video should look like it was made BY the company, FOR their target audience.**

Not a generic tech video with random gradients and made-up feature names.

Every element should be traceable to actual product data:
- Colors → from screenshots
- Features → from UI analysis
- Messaging → from product description
- Audience → from product context
