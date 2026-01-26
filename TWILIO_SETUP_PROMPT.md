# Twilio Master Account Setup Prompt

**For Claude in Chrome - Copy this entire prompt**

---

## Your Task

You are helping set up the Twilio master account for iSyncSO's SMS Outreach feature. iSyncSO will own the Twilio account and provision phone numbers for customers through its platform.

**Report back with:**
1. Account SID
2. Auth Token
3. Webhook URL confirmation
4. Any issues encountered

---

## Step-by-Step Setup

### Step 1: Twilio Account

**If no Twilio account exists:**
1. Go to https://www.twilio.com/try-twilio
2. Create account with business email
3. Verify phone number
4. Complete business verification if prompted

**If Twilio account exists:**
1. Go to https://console.twilio.com
2. Log in

### Step 2: Get Master Credentials

1. In Twilio Console, go to **Account** → **API keys & tokens** (or look at the dashboard)
2. Find and copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click "Show" to reveal)

**Save these securely - you'll need them for Step 4.**

### Step 3: Configure Webhook Settings

The webhook URL for incoming SMS is:
```
https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/sms-webhook
```

This is automatically set when numbers are purchased through the app, but verify:
1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. If any numbers exist, click on one
3. Under "Messaging", ensure:
   - **A MESSAGE COMES IN**: Webhook
   - **URL**: `https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/sms-webhook`
   - **HTTP**: POST

### Step 4: Set Supabase Secrets

Run this command in terminal (replace placeholders):

```bash
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" \
npx supabase secrets set \
  TWILIO_MASTER_ACCOUNT_SID="AC_YOUR_ACCOUNT_SID_HERE" \
  TWILIO_MASTER_AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE" \
  --project-ref sfxpmzicgpaxfntqleig
```

**After setting secrets, redeploy the functions:**

```bash
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" \
npx supabase functions deploy twilio-numbers --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" \
npx supabase functions deploy sms-send --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

### Step 5: Verify Setup

1. Go to https://app.isyncso.com/TalentSMSOutreach
2. Click "Get Number" button
3. Search for numbers (US, area code 415)
4. If numbers appear → Setup successful!
5. If error → Check console for details

### Step 6: Test Purchase (Optional)

If you want to test the full flow:
1. Search for a number
2. Click "Buy" on any number
3. Verify it appears in the purchased numbers list
4. Note: This will charge the Twilio account (~$1-2)

---

## Troubleshooting

### "Twilio master account not configured"
- Secrets not set or functions not redeployed
- Run the secrets command again
- Redeploy both functions

### "Failed to search numbers"
- Check Twilio account has billing set up
- Check Account SID and Auth Token are correct
- Check Twilio account is active (not suspended)

### Numbers don't appear after purchase
- Check browser console for errors
- Check Supabase logs: https://supabase.com/dashboard/project/sfxpmzicgpaxfntqleig/logs/edge-logs

### Webhook not receiving messages
- Verify webhook URL is set on the number in Twilio
- Check the number is SMS-enabled
- Test with Twilio's "Test Message" feature

---

## Report Template

Please report back with:

```
## Twilio Setup Report

### Credentials
- Account SID: AC________________ (first 8 chars only for security)
- Auth Token: Set ✅/❌
- Secrets configured: ✅/❌
- Functions redeployed: ✅/❌

### Testing
- Number search works: ✅/❌
- Sample numbers found: [count]
- Purchase test: ✅/❌/Skipped

### Webhook
- URL configured: ✅/❌
- Test message received: ✅/❌/Not tested

### Issues
- [List any issues encountered]

### Notes
- [Any additional observations]
```

---

## Security Notes

- Never share the full Auth Token
- The Account SID is semi-public (visible in API calls)
- Secrets are encrypted in Supabase
- Webhook URL is public but requires valid Twilio signature

---

## Cost Expectations

| Item | Cost |
|------|------|
| Twilio account | Free |
| Phone number (US) | ~$1.15/month |
| SMS outbound | ~$0.0079/segment |
| SMS inbound | ~$0.0079/segment |

iSyncSO pricing to customers:
- $2/month per number
- $0.01 per SMS sent

Margin covers infrastructure, support, and webhook processing.
