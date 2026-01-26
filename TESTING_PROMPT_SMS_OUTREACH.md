# SMS Outreach System Testing Prompt

**For Claude in Chrome to test at https://app.isyncso.com**

---

## Testing Overview

You are testing a new SMS Outreach feature in the iSyncSO Talent module. The system allows recruiters to send personalized SMS messages to candidates via Twilio, with AI-powered response generation.

---

## Test Checklist

### 1. Navigation & UI
- [ ] Navigate to **Talent → SMS Outreach** (or `/TalentSMSOutreach`)
- [ ] Verify the page loads without console errors
- [ ] Check stats cards display (Total, Sent, Responded, Interested, Scheduled, Queued)
- [ ] Test status filter tabs (All, Queued, Sent, Responded, Interested, Scheduled)
- [ ] Verify empty state shows when no conversations exist

### 2. TalentCandidates.jsx - Pagination Fix
- [ ] Navigate to **Talent → Candidates**
- [ ] If there are many candidates, go to page 10+
- [ ] Verify pagination shows correct page range (e.g., 8-9-10-11-12) not always 1-2-3-4-5
- [ ] Verify Previous/Next buttons work correctly

### 3. TalentCandidates.jsx - Compact Header
- [ ] Verify header section is visually compact (smaller padding, tighter gaps)
- [ ] Verify refresh button uses proper Button component styling

### 4. TalentCandidateProfile.jsx - Compact Design
- [ ] Click on any candidate to view their profile
- [ ] Verify avatar is smaller (16x16 instead of 24x24)
- [ ] Verify overall hero section is more compact
- [ ] Verify stats bar has tighter spacing

### 5. Twilio Integration Check (Settings)
- [ ] Go to **Settings → Integrations**
- [ ] Look for Twilio integration
- [ ] Note: Users need Twilio credentials to use SMS feature
- [ ] Check if there's guidance on how to connect Twilio

---

## Improvement Opportunities to Identify

Look for improvements in these areas:

### SMS Outreach Page
1. **Empty state** - Is it helpful? Does it guide users to set up Twilio?
2. **Loading states** - Are they smooth?
3. **Error handling** - What happens if Twilio isn't connected?
4. **Conversation detail** - Is the message history easy to read?
5. **AI response** - Is the "Generate AI Response" flow clear?
6. **Character counter** - Does it warn near 160 chars?

### Integration with Campaigns
1. Can users easily start SMS from a campaign?
2. Is there a way to bulk-send initial outreach?
3. Is the link between campaigns and SMS conversations clear?

### Twilio Setup Experience
1. Is it clear how to connect Twilio?
2. Should there be a setup wizard?
3. **KEY IMPROVEMENT NEEDED**: Users should purchase phone numbers through iSyncSO, not set up Twilio directly

### Mobile/Responsive
1. Does SMS Outreach page work on mobile?
2. Is the conversation view mobile-friendly?

### Analytics
1. Should there be SMS analytics on the Talent Dashboard?
2. Response rate tracking?
3. Best times to send?

---

## Edge Function Verification

The following edge functions should be deployed:
- `sms-send` - Sends outbound SMS
- `sms-webhook` - Receives Twilio callbacks
- `sms-ai-respond` - Generates AI responses

Test URL (if you have curl access):
```
https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/sms-send
```

---

## Database Table

New table `sms_conversations` with:
- Status: queued, sent, delivered, responded, interested, declined, scheduled, opted_out
- Messages: JSONB array of conversation history
- Opt-out tracking for TCPA/GDPR compliance

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

- `/src/pages/TalentSMSOutreach.jsx` - Main SMS page
- `/src/pages/TalentCandidates.jsx` - Candidates list (pagination fix)
- `/src/pages/TalentCandidateProfile.jsx` - Candidate detail (compact)
- `/supabase/functions/sms-send/index.ts` - Send SMS edge function
- `/supabase/functions/sms-webhook/index.ts` - Webhook handler
- `/supabase/functions/sms-ai-respond/index.ts` - AI response generator
