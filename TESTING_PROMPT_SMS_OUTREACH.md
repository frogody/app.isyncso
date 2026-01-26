# SMS Outreach System Testing Prompt

**For Claude in Chrome to test at https://app.isyncso.com**

---

## Testing Overview

You are testing the new SMS Outreach feature in the iSyncSO Talent module. The system allows recruiters to:
1. **Purchase phone numbers** directly through iSyncSO (no Twilio account needed)
2. **Send personalized SMS** to candidates
3. **Receive AI-powered response** suggestions
4. **Track conversation status** and engagement

---

## Test Checklist

### 1. Phone Number Purchasing (NEW - Priority)
- [ ] Navigate to **Talent → SMS Outreach** (`/TalentSMSOutreach`)
- [ ] Verify the "Get a Phone Number" banner appears if no numbers configured
- [ ] Click "Get Number" button in header or banner
- [ ] Test phone number search:
  - Search by country (US, UK, NL, etc.)
  - Search by area code (e.g., 415)
  - Search by pattern (e.g., "2024")
- [ ] Verify number results show:
  - Formatted phone number
  - Location (city, state)
  - Capabilities (SMS, MMS, Voice icons)
  - Pricing ($2/mo + $1 setup)
- [ ] Test purchasing a number (if testing with real Twilio)
- [ ] Verify purchased numbers appear in the list
- [ ] Test renaming a number (edit button)
- [ ] Test releasing a number (delete button - shows confirmation)

### 2. Navigation & UI
- [ ] Navigate to **Talent → SMS Outreach** in sidebar
- [ ] Verify the page loads without console errors
- [ ] Check stats cards display (Total, Sent, Responded, Interested, Scheduled, Queued)
- [ ] Test status filter dropdown
- [ ] Test search functionality
- [ ] Verify empty state shows when no conversations exist

### 3. TalentCandidates.jsx - Pagination Fix
- [ ] Navigate to **Talent → Candidates**
- [ ] If there are many candidates, go to page 10+
- [ ] Verify pagination shows correct page range (e.g., 8-9-10-11-12) not always 1-2-3-4-5
- [ ] Verify Previous/Next buttons work correctly

### 4. TalentCandidates.jsx - Compact Header
- [ ] Verify header section is visually compact (smaller padding, tighter gaps)
- [ ] Verify refresh button uses proper Button component styling

### 5. TalentCandidateProfile.jsx - Compact Design
- [ ] Click on any candidate to view their profile
- [ ] Verify avatar is smaller (16x16 instead of 24x24)
- [ ] Verify overall hero section is more compact
- [ ] Verify stats bar has tighter spacing

---

## Improvement Opportunities to Identify

Look for improvements in these areas:

### Phone Number Management
1. **Pricing display** - Is it clear what users will pay?
2. **Country selection** - Are the most common countries listed first?
3. **Search UX** - Is it easy to find a number in a specific area?
4. **Number status** - Is it clear which numbers are active?
5. **Usage tracking** - Can users see how many messages sent/received?

### SMS Outreach Page
1. **Empty state** - Does it guide users to purchase a number first?
2. **Loading states** - Are they smooth?
3. **Error handling** - What happens if SMS fails?
4. **Conversation detail** - Is the message history easy to read?
5. **AI response** - Is the "Generate AI Response" flow clear?
6. **Character counter** - Does it warn near 160 chars?

### Integration with Campaigns
1. Can users easily start SMS from a campaign?
2. Is there a way to bulk-send initial outreach?
3. Is the link between campaigns and SMS conversations clear?

### Mobile/Responsive
1. Does SMS Outreach page work on mobile?
2. Is the phone number purchase modal mobile-friendly?
3. Is the conversation view mobile-friendly?

### Analytics
1. Should there be SMS analytics on the Talent Dashboard?
2. Response rate tracking?
3. Best times to send?
4. Cost tracking per campaign?

---

## Edge Function Verification

The following edge functions should be deployed:
- `sms-send` - Sends outbound SMS (supports managed + legacy numbers)
- `sms-webhook` - Receives Twilio callbacks
- `sms-ai-respond` - Generates AI responses
- `twilio-numbers` - Manages phone number purchasing

---

## Database Tables

### sms_conversations
- Status: queued, sent, delivered, responded, interested, declined, scheduled, opted_out
- Messages: JSONB array of conversation history
- Opt-out tracking for TCPA/GDPR compliance

### organization_phone_numbers (NEW)
- Phone numbers purchased through iSyncSO
- Tracks usage (messages_sent, messages_received)
- Monthly billing cycle

---

## Report Format

After testing, provide:

1. **Bugs Found** - List any errors or broken functionality
2. **UX Issues** - List any confusing flows or poor experiences
3. **Missing Features** - What's needed but missing?
4. **Enhancement Ideas** - Nice-to-haves that would improve the feature
5. **Priority Recommendations** - Top 3 things to fix/add first

---

## Key Files Reference

**Frontend:**
- `/src/pages/TalentSMSOutreach.jsx` - Main SMS page
- `/src/components/integrations/PhoneNumberManager.jsx` - Phone purchase UI
- `/src/pages/TalentCandidates.jsx` - Candidates list (pagination fix)
- `/src/pages/TalentCandidateProfile.jsx` - Candidate detail (compact)

**Edge Functions:**
- `/supabase/functions/sms-send/index.ts` - Send SMS
- `/supabase/functions/sms-webhook/index.ts` - Webhook handler
- `/supabase/functions/sms-ai-respond/index.ts` - AI response generator
- `/supabase/functions/twilio-numbers/index.ts` - Phone number purchasing

**Migrations:**
- `/supabase/migrations/20260126150000_create_sms_conversations.sql`
- `/supabase/migrations/20260126160000_organization_phone_numbers.sql`

---

## Architecture Notes

### Phone Number Strategy
- iSyncSO owns a **master Twilio account**
- Users purchase numbers through iSyncSO UI
- Numbers are provisioned via Twilio API on iSyncSO's account
- Webhooks automatically configured to point to `sms-webhook`
- This allows:
  - Users don't need their own Twilio account
  - iSyncSO controls the phone infrastructure
  - Future: Voice calls, call recording, etc.

### SMS Flow
1. User purchases number → stored in `organization_phone_numbers`
2. User creates campaign with SMS channel
3. SMS sent via `sms-send` using purchased number
4. Inbound messages → `sms-webhook` → `sms-ai-respond`
5. AI draft stored for human review
6. User sends or edits response

### Pricing Model
- $2/month per number (Twilio costs ~$1)
- $0.01 per SMS (Twilio costs ~$0.0075)
- Margin for infrastructure + support
