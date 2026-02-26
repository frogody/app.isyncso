# Immersive Onboarding Design for app.isyncso

**Date:** 2026-02-26
**Inspired by:** SkillSync macOS onboarding (story-driven pages, animated icons, personalized flow)
**Target:** app.isyncso web app (React 18, Vite, framer-motion, anime.js)

## Design Summary

Replace the current form-only onboarding with a **10-page story-driven experience** that hooks users with SYNC's value proposition, collects their work context, then delivers a personalized agent introduction tailored to their tools and goals.

## Page Flow

### Hook Phase (Pages 1-2)

**Page 1: "Welcome to SYNC"**
- Animated multi-color ring assembles from scattered dots into unified ring
- Tagline: "10 agents. One intelligence."
- Tech: anime.js SVG timeline (dots animate along paths to ring positions)
- [Continue]

**Page 2: "Meet the Ring"**
- Ring spins slowly, each color segment pulses with agent name
- Brief copy: "Each color is a specialized agent that watches, learns, and helps."
- Tech: CSS animation + anime.js segment pulse on focus
- [Continue]

### Profile Phase (Pages 3-4)

**Page 3: "Tell us about you"**
- Fields: Name, Role (dropdown + custom), Industry (selectable chips)
- Animated icon: person silhouette forming from particles
- Tech: framer-motion stagger entrance for chips
- Maps to existing `formData.fullName`, `formData.jobTitle`, `formData.industry`
- [Continue]

**Page 4: "Your daily tools & goals"**
- Top: Grid of app icons (Slack, Notion, VS Code, Chrome, Figma, Teams, etc.) - tap to select
- Bottom: "What should SYNC help with?" pills (Focus, Productivity, Learning, Meeting prep, Code review, etc.)
- Tech: framer-motion staggered grid entrance, selection ripple animation
- Maps to existing `formData.selectedApps` + `formData.selectedGoals`
- [Continue]

### Personalized Story Phase (Pages 5-8)

These pages are ALWAYS shown but their content adapts based on Pages 3-4 selections.

**Page 5: "Your Activity Tracker" (always shown)**
- Animated: timeline filling with app icons the user selected in Page 4
- Copy: "SYNC quietly observes which apps you use, when you switch, how long you stay"
- Tech: anime.js timeline animation, icons from user selection
- Personalization: shows their actual selected app icons in the timeline

**Page 6: "Your Context Manager" (always shown)**
- Animated: data points connecting into a constellation/web
- Copy: "Every 60 seconds, SYNC builds a rolling picture of what you're doing"
- Tech: tsparticles constellation with links, or anime.js SVG network
- Personalization: node labels derived from user's industry/tools

**Page 7: Personalized Agent Page (varies by selection)**
- Mapping logic:
  - Dev tools (VS Code, GitHub, Terminal) -> "Code Intelligence" variant
  - Comms tools (Slack, Teams, Email) -> "Meeting & Comms Prep" variant
  - Design tools (Figma, Sketch) -> "Creative Flow" variant
  - Focus/Productivity goal -> "Deep Work Guardian" variant
  - Learning goal -> "Skill Growth Tracker" variant
  - Meeting prep goal -> "Meeting Intelligence" variant
- Each variant has its own animated SVG icon and copy
- Tech: framer-motion AnimatePresence to swap variants

**Page 8: "Your Chat Assistant" (always shown)**
- Animated: chat bubble expanding with context flowing into it
- Copy: "Ask SYNC anything - it already knows what you've been working on today"
- Tech: framer-motion layout animation, streaming text effect
- Personalization: example question based on user's role/tools

### Interaction + Launch Phase (Pages 9-10)

**Page 9: "How to reach SYNC"**
- Animated diagram showing the floating avatar:
  - 1 click -> Chat opens (animated expansion)
  - 2 clicks -> Voice mode (animated microphone pulse)
  - 3 clicks -> Web dashboard (animated browser frame)
- Each step animated sequentially with 800ms delays
- Tech: anime.js timeline with SVG diagram

**Page 10: "You're ready"**
- Personalized summary card showing:
  - "SYNC will track [selected tools]"
  - "Help you with [selected goals]"
  - "Using [highlighted agents]"
- Ring animation plays one final time
- [Launch SYNC] button triggers existing `handleConfirm()` logic
- Behind the scenes: runs existing analysis + enrichment flow

## Animation System

### Dependencies

**Already installed:**
- `framer-motion` ^12.31.0 - page transitions, layout animations, stagger
- `animejs` ^4.2.2 - SVG timelines, ring assembly, path animations

**New installs needed:**
- `lottie-react` ^2.4.1 - pre-made animated icons (checkmarks, loaders, success states)
- `@tsparticles/react` ^3.0.0 + `@tsparticles/engine` ^3.9.1 + `@tsparticles/slim` ^3.9.1 - constellation visualization, particle effects

### Animation Mapping

| Page | Primary Animation | Library |
|------|-------------------|---------|
| 1 | Ring assembly from particles | anime.js SVG timeline |
| 2 | Ring spin + segment pulse | CSS + anime.js |
| 3 | Profile icon particle formation | anime.js |
| 4 | Grid stagger + selection ripple | framer-motion |
| 5 | Timeline filling with app icons | anime.js timeline |
| 6 | Constellation connecting | tsparticles or anime.js SVG |
| 7 | Personalized icon (varies) | framer-motion + SVG |
| 8 | Chat bubble + context flow | framer-motion layout |
| 9 | Click interaction diagram | anime.js sequenced timeline |
| 10 | Summary card + final ring | framer-motion + anime.js |

### Page Transitions

Using framer-motion `AnimatePresence` with directional awareness (matching SkillSync pattern):

```jsx
const variants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};
```

## State Management

```typescript
interface OnboardingState {
  step: number;                    // 1-10
  direction: number;               // 1 or -1 for transition direction

  // Profile data (maps to existing formData)
  name: string;
  role: string;
  industry: string;
  dailyTools: string[];
  goals: string[];

  // Computed
  personalizedAgentVariant: string; // 'code' | 'comms' | 'design' | 'focus' | 'learning' | 'meeting'

  // Existing state reuse
  isAnalyzing: boolean;
  dossier: object | null;
}
```

### Integration with existing code

The new onboarding wraps around the existing logic:
- Pages 3-4 collect the same data as current steps 1, 3, 4, 5
- Page 10's "Launch SYNC" triggers the existing `runAnalysis()` -> `handleConfirm()` flow
- LinkedIn and Company steps from current flow can be incorporated into Page 3 or kept as optional
- `OnboardingGuard.jsx` unchanged - still checks `onboarding_completed`

## Personalization Logic

```
User selections -> Agent variant mapping:

Tools:
  vscode | github | terminal     -> 'code'
  slack | teams | email           -> 'comms'
  figma | sketch | adobe          -> 'design'

Goals:
  focus | productivity            -> 'focus'
  learning | growth               -> 'learning'
  meetings | preparation          -> 'meeting'

Priority: goals > tools (goals are more intentional)
Fallback: 'focus' (most universal)
```

## File Structure

```
src/components/onboarding/
  immersive/
    ImmersiveOnboarding.jsx       # Main container, step state machine
    PageTransition.jsx            # AnimatePresence wrapper with direction
    ProgressDots.jsx              # Dot-style progress indicator

    pages/
      WelcomePage.jsx             # Page 1: Ring assembly
      MeetTheRingPage.jsx         # Page 2: Ring spin
      AboutYouPage.jsx            # Page 3: Profile form
      ToolsAndGoalsPage.jsx       # Page 4: Tool grid + goal pills
      ActivityTrackerPage.jsx     # Page 5: Timeline animation
      ContextManagerPage.jsx      # Page 6: Constellation
      PersonalizedAgentPage.jsx   # Page 7: Dynamic variant
      ChatAssistantPage.jsx       # Page 8: Chat bubble
      InteractionGuidePage.jsx    # Page 9: Click explainer
      ReadyPage.jsx               # Page 10: Summary + launch

    animations/
      RingAssembly.jsx            # SVG ring assembly animation
      ConstellationNetwork.jsx    # Particle constellation
      TimelineFill.jsx            # App timeline animation
      ClickDiagram.jsx            # 1/2/3-click animated diagram

    variants/
      CodeIntelligence.jsx        # Dev-focused agent page
      CommsPrep.jsx               # Communication-focused
      CreativeFlow.jsx            # Design-focused
      DeepWorkGuardian.jsx        # Focus-focused
      SkillGrowth.jsx             # Learning-focused
      MeetingIntelligence.jsx     # Meeting-focused
```

## Design Tokens

Following existing app.isyncso dark theme:

```css
Background: bg-black (#000000)
Card surface: bg-zinc-900/40 backdrop-blur-xl border border-zinc-800
Primary accent: cyan-400 / cyan-500 (gradient: from-cyan-500 to-blue-500)
Secondary: blue-400 / blue-500
Text primary: text-white
Text secondary: text-zinc-400 / text-white/70
Text muted: text-zinc-500 / text-white/40
Ring colors: 10 agent colors from SyncAvatarMini.jsx
```

## Install Command

```bash
npm install lottie-react@^2.4.1 @tsparticles/react@^3.0.0 @tsparticles/engine@^3.9.1 @tsparticles/slim@^3.9.1
```

## Success Criteria

1. New users see a 10-page immersive story before reaching the dashboard
2. Each page has a unique animated element (no static pages)
3. Pages 5-8 adapt content based on user selections from pages 3-4
4. Existing enrichment/analysis flow preserved (runs at end)
5. Skip button available after page 2 (jumps to existing form flow)
6. Mobile responsive (pages work on tablet/phone)
7. Total experience: ~90 seconds for engaged users
