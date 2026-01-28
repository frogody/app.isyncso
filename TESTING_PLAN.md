# ISYNCSO Talent Platform - Comprehensive Testing Plan

## Overview
This document provides a systematic testing plan for all features implemented in Prompts 1-14 of the recruiter workflow enhancement project.

---

## Pre-Testing Setup

### 1. Environment Verification
- [ ] Application builds without errors
- [ ] Database migrations are applied
- [ ] Supabase connection is working
- [ ] User is authenticated

### 2. Test Data Requirements
- At least 10 candidates with varying data (some with intel, some without)
- At least 2 nests (one purchased, one available in marketplace)
- At least 1 campaign (active)
- At least 1 project

---

## Feature Testing Checklist

### PROMPT 1-2: Recruiter Workflow - Post-Purchase to Campaign

#### Test 1.1: Nest Purchase Flow
**Location:** `/marketplace/nests`
- [ ] Navigate to Nests Marketplace
- [ ] Click on a nest to view details
- [ ] Click "Purchase" button
- [ ] Confirm purchase dialog appears
- [ ] After purchase, success dialog shows with "Start Campaign" CTA
- [ ] "Start Campaign" navigates to `/talent/campaigns?action=new&nestId=X&nestName=Y`

#### Test 1.2: Campaign Creation with Nest Context
**Location:** `/talent/campaigns`
- [ ] URL params auto-open CampaignWizard
- [ ] Nest context banner shows (cyan styling) in step 4
- [ ] "Intel Active" badge displays
- [ ] Campaign creates successfully with `nest_id` linked
- [ ] New campaign appears in campaigns list

#### Test 1.3: Post-Purchase Intel Trigger
- [ ] After nest purchase, candidates are queued to `sync_intel_queue`
- [ ] Check database: candidates from purchased nest have queue entries

---

### PROMPT 3-4: Campaign Detail - AI Matching & Results

#### Test 3.1: Linked Nest Display
**Location:** `/talent/campaigns/:id`
- [ ] Campaign detail shows linked nest banner (if nest_id exists)
- [ ] Nest name displays correctly
- [ ] "View Nest" link works

#### Test 3.2: AI Matching Trigger
- [ ] "Run AI Matching" button visible
- [ ] Click triggers `analyzeCampaignProject` edge function
- [ ] Loading state shows during analysis
- [ ] Results populate after completion

#### Test 3.3: Match Results Display
- [ ] Match cards show with `MatchLevelBadge` (Excellent/Good/Fair/Poor)
- [ ] Color coding correct (green/blue/yellow/red)
- [ ] Expandable AI analysis works
- [ ] Key Strengths section shows
- [ ] Potential Concerns section shows
- [ ] Outreach Angle section shows

#### Test 3.4: Match Filtering
- [ ] Filter tabs show counts (All, Excellent, Good, Fair)
- [ ] Clicking tab filters results
- [ ] Counts update correctly

---

### PROMPT 5: Save Selection & Generate Outreach

#### Test 5.1: Candidate Selection
**Location:** `/talent/campaigns/:id` (Matches tab)
- [ ] Checkboxes appear on match cards
- [ ] Can select/deselect individual candidates
- [ ] Selection count displays

#### Test 5.2: Outreach Generation
- [ ] "Generate Outreach" button appears when candidates selected
- [ ] Click opens OutreachPreviewModal
- [ ] AI-generated messages display for each selected candidate
- [ ] Can navigate between messages (prev/next)
- [ ] Messages are personalized based on match analysis

#### Test 5.3: Outreach Approval
- [ ] "Approve & Create Tasks" button works
- [ ] OutreachSuccessDialog shows task count
- [ ] Next steps guidance displays

---

### PROMPT 6: Nests Marketplace Smart Filtering

#### Test 6.1: FilterSidebar
**Location:** `/marketplace/nests`
- [ ] Filter sidebar renders
- [ ] Industry filter dropdown works
- [ ] Location filter works
- [ ] Price range slider works
- [ ] Nest size filter works
- [ ] Active filter count badge updates

#### Test 6.2: NestCard Enhancements
- [ ] Quick stats show (candidates, avg intel, purchases)
- [ ] Hover effects work
- [ ] Card click navigates to detail

#### Test 6.3: NestPreviewModal
- [ ] "Preview" button on nest card
- [ ] Modal shows sample candidates
- [ ] Close button works

---

### PROMPT 7: Talent Dashboard Quick Actions

#### Test 7.1: Dashboard Layout
**Location:** `/talent`
- [ ] Dashboard loads without errors
- [ ] Stats cards display correctly

#### Test 7.2: WorkflowActionCard
- [ ] 4-step recruiter flow displays
- [ ] Each step has correct icon and label
- [ ] Clicking step navigates to correct page

#### Test 7.3: RecommendedNests Section
- [ ] Shows unpurchased popular nests
- [ ] "View" buttons work
- [ ] "Browse All" link works

#### Test 7.4: Analytics Overview (from Prompt 9)
- [ ] Response Rate Gauge displays
- [ ] Best Performing Campaign shows
- [ ] Smart Recommendations display

---

### PROMPT 8: Outreach Task Creation

#### Test 8.1: Task Creation
**Location:** `/talent/campaigns/:id` (after approving outreach)
- [ ] Tasks created in `outreach_tasks` table
- [ ] Task status is "pending" initially
- [ ] Full metadata stored (campaign, candidate, message)

#### Test 8.2: OutreachQueueTab
- [ ] "Outreach" tab shows in campaign detail
- [ ] Filter tabs work (All, Ready, Sent, Replied)
- [ ] Task cards display correctly
- [ ] "Send" action updates status
- [ ] "Cancel" action works

---

### PROMPT 9: Campaign Analytics

#### Test 9.1: Analytics Tab
**Location:** `/talent/campaigns/:id` (Analytics tab)
- [ ] Tab loads without errors
- [ ] CampaignFunnel displays
- [ ] Funnel stages show correct counts

#### Test 9.2: Metric Cards
- [ ] Selection Rate displays
- [ ] Response Rate displays
- [ ] Values calculate correctly

#### Test 9.3: ResponseTimeline
- [ ] Timeline shows if responses exist
- [ ] Empty state shows if no responses

#### Test 9.4: SourceBreakdown
- [ ] Shows if multiple sources
- [ ] Bar widths proportional to counts

---

### PROMPT 10: Candidate Detail Drawer

#### Test 10.1: Drawer Opening
**Location:** `/talent/candidates`
- [ ] Click candidate row opens drawer
- [ ] Drawer slides in from right
- [ ] Backdrop appears (60% opacity)

#### Test 10.2: Profile Tab
- [ ] Contact info displays (email, phone, LinkedIn)
- [ ] Copy buttons work
- [ ] Experience section shows
- [ ] Skills tags display
- [ ] Education shows

#### Test 10.3: Intelligence Tab
- [ ] Intel score gauge displays
- [ ] Flight risk shows
- [ ] Timing signals show
- [ ] Outreach hooks show
- [ ] "Refresh Intelligence" button present

#### Test 10.4: Match Analysis Tab (Campaign Context)
**Location:** `/talent/campaigns/:id` (click match card)
- [ ] Tab only shows when campaign context provided
- [ ] Match level badge displays
- [ ] Score breakdown shows
- [ ] AI reasoning displays

#### Test 10.5: Activity Tab
- [ ] Timeline shows outreach history
- [ ] Empty state if no activity

---

### PROMPT 11: Bulk Operations & Multi-Select

#### Test 11.1: Selection Mode
**Location:** `/talent/candidates`
- [ ] "Select Multiple" button visible
- [ ] Click toggles selection mode
- [ ] Checkboxes appear on candidate rows
- [ ] Can check/uncheck candidates

#### Test 11.2: Select All / Clear
- [ ] "Select All" selects all filtered candidates
- [ ] "Clear" deselects all
- [ ] Count updates correctly

#### Test 11.3: BulkActionBar
- [ ] Floating bar appears when candidates selected
- [ ] Shows correct count
- [ ] "Add to Campaign" button works
- [ ] "Run Intel" button works
- [ ] "Export" downloads CSV
- [ ] Clear (X) button works

#### Test 11.4: AddToCampaignModal
- [ ] Modal opens from bulk action
- [ ] Shows list of campaigns
- [ ] Can search campaigns
- [ ] Selecting campaign enables "Add" button
- [ ] Success toast shows after adding

---

### PROMPT 12: Smart Search & Advanced Filtering

#### Test 12.1: Search Bar
**Location:** `/talent/candidates`
- [ ] Search input visible
- [ ] Typing filters results (debounced)
- [ ] Clear (X) button clears search
- [ ] Results count updates

#### Test 12.2: Filter Panel
- [ ] "Filters" button toggles panel
- [ ] Panel animates open/closed
- [ ] Filter count badge shows active count

#### Test 12.3: Filter Types
- [ ] Location multi-select works
- [ ] Job Title multi-select works
- [ ] Company multi-select works
- [ ] Skills multi-select works
- [ ] Intel Score range filter works
- [ ] Experience range filter works
- [ ] Has Email toggle works
- [ ] Has LinkedIn toggle works
- [ ] Last Updated dropdown works

#### Test 12.4: Filter Results
- [ ] Applying filters updates results
- [ ] "Clear all filters" resets everything
- [ ] Page resets to 1 on filter change

---

### PROMPT 13: Keyboard Shortcuts & Command Palette

#### Test 13.1: Shortcuts Help Modal
- [ ] Press `?` opens help modal
- [ ] All shortcuts listed by category
- [ ] Close button works
- [ ] Clicking outside closes

#### Test 13.2: Command Palette
- [ ] Press `Cmd/Ctrl + K` opens palette
- [ ] Search filters commands
- [ ] Arrow keys navigate
- [ ] Enter selects command
- [ ] Escape closes

#### Test 13.3: Navigation Shortcuts
- [ ] `g` then `d` → Dashboard
- [ ] `g` then `c` → Candidates
- [ ] `g` then `p` → Campaigns
- [ ] `g` then `n` → Nests
- [ ] `g` then `m` → Marketplace

#### Test 13.4: List Navigation (Candidates Page)
- [ ] `j` moves focus down
- [ ] `k` moves focus up
- [ ] Visual focus ring shows on focused item
- [ ] `Enter` opens focused candidate
- [ ] `x` toggles selection
- [ ] `/` focuses search
- [ ] `Escape` clears focus/selection

---

### PROMPT 14: Real-Time Notifications & Activity Feed

#### Test 14.1: NotificationsDropdown
**Location:** Header (all pages)
- [ ] Bell icon visible in header
- [ ] Unread count badge shows (if unread)
- [ ] Click opens dropdown
- [ ] Notifications list displays

#### Test 14.2: Notification Actions
- [ ] Click notification marks as read
- [ ] Click navigates to action_url
- [ ] "Mark all as read" works
- [ ] "Clear all" works
- [ ] Individual delete works

#### Test 14.3: Real-Time Updates
- [ ] New notification appears without refresh
- [ ] Unread count updates
- [ ] Browser notification shows (if permitted)

#### Test 14.4: Activity Feed
**Location:** `/talent` (Dashboard)
- [ ] Activity feed section visible
- [ ] Recent activities display
- [ ] Icons match activity type
- [ ] Relative times show correctly
- [ ] "View all" link works

---

## Cross-Feature Integration Tests

### Integration 1: Full Recruiter Workflow
1. [ ] Start at Marketplace, purchase a nest
2. [ ] Click "Start Campaign" from success dialog
3. [ ] Complete campaign wizard with nest context
4. [ ] Run AI matching
5. [ ] Select top candidates
6. [ ] Generate outreach messages
7. [ ] Approve and create tasks
8. [ ] View tasks in Outreach tab
9. [ ] Check Analytics tab for metrics

### Integration 2: Candidate Discovery to Outreach
1. [ ] Go to Candidates page
2. [ ] Use search to find specific candidates
3. [ ] Apply filters (location, skills)
4. [ ] Select multiple candidates
5. [ ] Add to existing campaign
6. [ ] Generate bulk outreach
7. [ ] Check notifications for updates

### Integration 3: Power User Flow
1. [ ] Use `Cmd+K` to open command palette
2. [ ] Navigate to Candidates
3. [ ] Use `/` to focus search
4. [ ] Type query, use `j/k` to navigate results
5. [ ] Press `x` to select candidates
6. [ ] Press `Escape` to clear, use shortcuts to navigate away

---

## Known Issues to Verify Fixed

1. [ ] `FolderPlus` import missing in AddToCampaignModal (FIXED)
2. [ ] Check all Lucide icons are imported where used
3. [ ] Verify database tables exist:
   - [ ] `campaigns.nest_id` column
   - [ ] `campaigns.analytics` JSONB column
   - [ ] `outreach_tasks` table with new columns
   - [ ] `user_notifications` table
   - [ ] `activity_log` table

---

## Performance Checks

- [ ] Candidates page loads in < 3 seconds with 100+ candidates
- [ ] Search filter debounce prevents excessive queries
- [ ] Keyboard navigation is smooth (no lag)
- [ ] Drawer animations are 60fps
- [ ] No memory leaks on repeated modal open/close

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Mobile Responsiveness

- [ ] Dashboard adapts to mobile
- [ ] Candidate list scrolls properly
- [ ] Modals are usable on small screens
- [ ] Bulk action bar doesn't overlap content
- [ ] Drawer can be closed on mobile

