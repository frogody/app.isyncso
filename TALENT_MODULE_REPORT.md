# Talent Module - Complete User Capabilities Report

## Executive Summary

The Talent Module in app.isyncso is a comprehensive talent management and recruitment automation system. It provides organizations with tools to manage candidates, run outreach campaigns, track flight risk intelligence, and automate multi-channel recruitment outreach.

---

## 1. Talent Dashboard (`/TalentDashboard`)

The central hub for talent operations, providing:

### Overview Statistics
- **Total Candidates** - Count of all candidates in the system
- **Active Campaigns** - Number of campaigns currently running
- **High Risk Alerts** - Candidates with critical/high intelligence scores requiring immediate attention
- **Pending Outreach** - Tasks awaiting approval or sending

### Flight Risk Leaderboard
- Top 5 candidates with highest intelligence (flight risk) scores
- Visual gauge showing risk level (0-100 scale)
- Recommended approach for each candidate
- Quick navigation to candidate profiles

### Outreach Queue Widget
- Compact view of pending outreach tasks
- Quick approve/delete actions
- Filter by status
- Direct editing capability

### Quick Actions
- **Add Candidate** - Opens modal to create new candidate
- **Create Campaign** - Navigate to campaign creation
- **Intelligence Report** - Generate flight risk analysis
- **Import Candidates** - Bulk import functionality

---

## 2. Candidate Management (`/TalentCandidates`)

Full CRUD operations for candidate records:

### Viewing Candidates
- **List View** - Detailed table format with all candidate information
- **Grid View** - Card-based visual display
- Search by name, email, company
- Filter by intelligence level (Low, Medium, High, Critical)
- Sort by various fields

### Candidate Information Displayed
- Name, email, phone, location
- Current company and title
- LinkedIn profile link
- Intelligence score with visual gauge
- Intelligence level badge
- Recommended approach
- Stage in pipeline (New, Contacted, Responded, Screening, Interview, Offer, Hired, Rejected)
- Tags for categorization
- Source (LinkedIn, Referral, Job Board, Website, Event, Other)

### Actions Available
- **Add Candidate** - Create new candidate with full details
- **Edit Candidate** - Modify any candidate field
- **Delete Candidate** - Remove with confirmation (cascades to outreach tasks)
- **Bulk Selection** - Select multiple candidates via checkboxes
- **Bulk Delete** - Delete multiple selected candidates at once
- **Export CSV** - Download all candidates as CSV file
- **View Profile** - Navigate to detailed candidate profile
- **Refresh Data** - Reload candidate list

---

## 3. Add/Edit Candidate Modals

### Three-Tab Interface

#### Tab 1: Basic Info
- Full name
- Email address
- Phone number
- LinkedIn URL
- Location
- Source (how candidate was found)
- Tags (multiple, with add/remove)
- Notes (free-text)

#### Tab 2: Professional
- Current company
- Current title
- Stage in pipeline
- Status (Active, Passive, Not Interested, Do Not Contact)

#### Tab 3: Intelligence
- Intelligence Score (0-100 slider)
- Intelligence Level (Low, Medium, High, Critical)
- Urgency Level (Low, Medium, High, Urgent)
- Recommended Approach (Direct Outreach, Warm Introduction, Referral, Inbound, Event)
- Intelligence Signals (multiple, with add/remove)

---

## 4. Candidate Profile (`/TalentCandidateProfile`)

Detailed view of individual candidate:

### Profile Header
- Large intelligence gauge with score and risk level
- Contact information with action buttons
- Edit and delete options
- Refresh intelligence data

### Intelligence Assessment
- Risk factors (contributing to high score)
- Opportunity factors (positive signals)
- Timing signals (when to reach out)

### Outreach History
- Timeline of all outreach activities
- Message content and status
- Sent/completed dates
- Attempt tracking

### Active Outreach Tasks
- Current pending tasks for this candidate
- Task type and status
- Message preview

---

## 5. Campaign Management (`/TalentCampaigns`)

Manage recruitment and growth campaigns:

### Campaign List View
- Campaign name and description
- Status badge (Draft, Active, Paused, Completed, Archived)
- Type badge (Email, LinkedIn, Cold Call, Multi-Channel)
- Progress ring showing completion percentage
- Matched candidates count
- Sent and reply statistics

### Campaign Actions
- **Create Campaign** - New campaign with settings
- **Edit Campaign** - Modify campaign details
- **Duplicate Campaign** - Clone existing campaign
- **Activate/Pause Campaign** - Toggle campaign status
- **Delete Campaign** - Remove with confirmation
- **View Details** - Navigate to campaign detail page

### Campaign Statistics Cards
- Total campaigns count
- Active campaigns
- Total candidates matched
- Response rate percentage

---

## 6. Campaign Detail (`/TalentCampaignDetail`)

Comprehensive campaign management with tabbed interface:

### Settings Tab
- Campaign name and description
- Campaign type selection (Email, LinkedIn, Cold Call, Multi-Channel)
- Status control (Draft, Active, Paused, Completed, Archived)
- Daily sending limit
- Delay settings (min/max minutes between sends)

### Sequence Tab
- Visual sequence builder
- Message templates for each step
- Timing configuration
- A/B testing options

### Candidates Tab (CandidateMatchingPanel)
- View all available candidates
- Search and filter by intelligence level
- **AI Match** button - Automatically selects best candidates based on:
  - Intelligence score
  - Urgency bonus
  - Level bonus
- Manual candidate selection with checkboxes
- Save matched candidates to campaign

### Outreach Tab (OutreachQueue)
- All outreach tasks for this campaign
- Filter by status
- Bulk approve selected tasks
- Bulk delete selected tasks
- Edit individual messages

### Metrics Tab
- Campaign performance analytics
- Open rates, click rates, reply rates
- Conversion funnel visualization
- Time-based trends

---

## 7. Outreach Queue (`/TalentDashboard` widget & Campaign Detail)

Centralized outreach task management:

### Task Display
- Candidate name
- Message preview
- Task type (Email, LinkedIn, LinkedIn Connection, Call)
- Stage (First Message, Follow-up 1, Follow-up 2, etc.)
- Status with icon (Draft, Pending, Ready, Sent, Replied, Failed)
- Created/scheduled date

### Task Statuses
- **Draft** - Message being composed
- **Pending** - Awaiting approval
- **Approved Ready** - Approved and queued for sending
- **Sent** - Successfully sent
- **Replied** - Candidate responded
- **Failed** - Delivery failed

### Actions
- Select individual tasks
- Select all tasks
- **Bulk Approve** - Approve selected for sending
- **Bulk Delete** - Remove selected tasks
- **Edit Task** - Open message modal for editing
- Status filter dropdown
- Refresh data

---

## 8. Outreach Message Modal

Compose and edit outreach messages:

### Message Configuration
- **Type Selection**: Email, LinkedIn Message, LinkedIn Connection Request
- **Subject Line** (for email only)
- **Message Content** - Rich text area
- **AI Generate** button - Automatically generate personalized message based on:
  - Candidate profile
  - Campaign context
  - Message style preferences
- **Schedule** - Optional datetime for future sending

### Actions
- **Save as Draft** - Save without queuing
- **Queue for Sending** - Approve and queue
- **Cancel** - Close without saving

---

## 9. Intelligence System

### Flight Risk Scoring
- 0-100 score indicating likelihood candidate will leave current role
- Based on multiple factors:
  - Tenure signals
  - Company health indicators
  - Career trajectory patterns
  - Market conditions
  - Social signals

### Intelligence Levels
- **Low (0-39)** - Stable, unlikely to move
- **Medium (40-59)** - Some signals, worth monitoring
- **High (60-79)** - Strong indicators, good timing for outreach
- **Critical (80-100)** - Very likely to move soon, immediate action recommended

### Recommended Approaches
- **Nurture** - Long-term relationship building
- **Targeted** - Specific opportunity matching
- **Immediate** - Direct, urgent outreach

### Intelligence Signals
- Anniversary dates approaching
- Promotion patterns
- Company news (layoffs, acquisitions)
- Activity patterns on LinkedIn
- Skill development indicators

---

## 10. Data Model Summary

### Candidates Table
| Field | Description |
|-------|-------------|
| name | Full name |
| email | Email address |
| phone | Phone number |
| linkedin_url | LinkedIn profile URL |
| location | Geographic location |
| source | How candidate was found |
| tags | Array of categorization tags |
| current_company | Current employer |
| current_title | Current job title |
| notes | Free-text notes |
| stage | Pipeline stage |
| status | Active/Passive/Not Interested/DNC |
| intelligence_score | 0-100 flight risk score |
| intelligence_level | Low/Medium/High/Critical |
| urgency | Low/Medium/High |
| recommended_approach | nurture/targeted/immediate |
| intelligence_signals | Array of signal strings |

### Campaigns Table
| Field | Description |
|-------|-------------|
| name | Campaign name |
| description | Campaign description |
| campaign_type | email/linkedin/cold_call/multi_channel |
| status | draft/active/paused/completed/archived |
| daily_limit | Max sends per day |
| delay_min_minutes | Minimum delay between sends |
| delay_max_minutes | Maximum delay between sends |
| sequence_steps | Array of message templates |
| matched_candidates | Array of candidate references |
| message_style | Styling preferences object |

### Outreach Tasks Table
| Field | Description |
|-------|-------------|
| campaign_id | Associated campaign |
| candidate_id | Target candidate |
| task_type | initial_outreach/follow_up_1/follow_up_2/check_reply |
| message_content | Message text |
| status | draft/pending/approved_ready/sent/replied/failed |
| stage | first_message/follow_up_1/follow_up_2/connected/etc |
| attempt_number | Which attempt this is |
| scheduled_for | Optional scheduled send time |
| sent_at | When actually sent |

---

## 11. User Workflows

### Workflow 1: Add New Candidate
1. Navigate to TalentCandidates or TalentDashboard
2. Click "Add Candidate" button
3. Fill Basic Info tab (name, email, etc.)
4. Fill Professional tab (company, title, stage)
5. Fill Intelligence tab (score, level, approach)
6. Click "Add Candidate" to save

### Workflow 2: Create Outreach Campaign
1. Navigate to TalentCampaigns
2. Click "New Campaign"
3. Configure Settings (name, type, limits)
4. Build Sequence (message templates, timing)
5. Match Candidates (use AI Match or manual selection)
6. Review Outreach queue
7. Activate campaign

### Workflow 3: Process Outreach Queue
1. Navigate to TalentDashboard or Campaign Detail
2. Review pending outreach tasks
3. Click task to edit/personalize message
4. Select tasks to approve
5. Click "Approve Selected" for bulk approval
6. Tasks move to "Ready" status for sending

### Workflow 4: Track Flight Risk Candidates
1. View TalentDashboard leaderboard
2. See top flight-risk candidates
3. Click candidate for full profile
4. Review intelligence factors
5. Create targeted outreach
6. Monitor response in queue

---

## 12. Integration Points

- **Supabase Database** - All data persistence
- **Supabase Edge Functions** - AI message generation
- **Real-time Updates** - Live data synchronization
- **Row Level Security** - Organization-based data isolation
- **Export** - CSV download capability

---

## Summary

The Talent Module provides a complete recruitment automation platform with:
- Full candidate lifecycle management
- Intelligent flight risk scoring
- Multi-channel campaign orchestration
- AI-powered message generation
- Bulk operations and workflow automation
- Comprehensive analytics and tracking

All features are organization-scoped with proper security and real-time data synchronization.
