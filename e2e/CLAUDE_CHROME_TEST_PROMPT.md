# Inbox Phase 3 - Production Test Script for Claude in Chrome

**URL:** https://app.isyncso.com/inbox
**Login:** Use existing session or login with test credentials

## Test Instructions

Please perform each test step below and report back with:
1. Pass/Fail status for each test
2. Any console errors you observe (open DevTools Console)
3. Screenshots if something fails

---

## Pre-Test Setup

1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Clear console (Cmd+K or right-click > Clear console)
4. Navigate to https://app.isyncso.com/inbox
5. Wait for page to fully load (3-5 seconds)

---

## Test 1: Initial Page Load - Console Errors

**Steps:**
1. After page loads, check the Console for errors
2. Look specifically for these errors that should NO LONGER appear:
   - `column m.file_url does not exist` (Bookmarks error)
   - `StorageApiError: Bucket not found` (Storage error)
   - `invalid input syntax for type uuid: "mentions"` (Special channel error)

**Expected:** No critical errors. Some `[Realtime]` info logs are OK.

**Report format:**
```
Test 1: [PASS/FAIL]
Console errors found: [list any errors]
```

---

## Test 2: Select Regular Channel (general)

**Steps:**
1. Click on "#general" channel in the sidebar
2. Wait for messages to load
3. Check Console for errors

**Expected:** Messages load, no UUID errors

**Report format:**
```
Test 2: [PASS/FAIL]
Messages loaded: [Yes/No]
Console errors: [list any errors]
```

---

## Test 3: Send a Message

**Steps:**
1. In the message input at bottom, type: `Test message from Claude Chrome ${timestamp}`
2. Press Enter or click Send button
3. Check if message appears in the list
4. Check Console for errors

**Expected:** Message sends successfully, appears in list, no 400 errors

**Report format:**
```
Test 3: [PASS/FAIL]
Message sent: [Yes/No]
Message visible in list: [Yes/No]
Console errors: [list any errors]
```

---

## Test 4: Open Channel Details Panel

**Steps:**
1. Click the Info icon (i) button in the channel header
2. Check if "Channel Details" panel opens on the right
3. Verify it shows: Members count, Created date, Description
4. Check Console for errors

**Expected:** Panel opens without crash, shows channel info

**Report format:**
```
Test 4: [PASS/FAIL]
Panel opened: [Yes/No]
Content visible: [Members/Created/Description]
Console errors: [list any errors]
```

---

## Test 5: Open Members Panel

**Steps:**
1. Click the Users icon button in the channel header
2. Check if Members panel opens
3. Verify it shows member list with roles
4. Check Console for errors

**Expected:** Panel opens, shows members with role badges

**Report format:**
```
Test 5: [PASS/FAIL]
Panel opened: [Yes/No]
Members visible: [Yes/No]
Console errors: [list any errors]
```

---

## Test 6: Select "Mentions & Reactions" Special Channel

**Steps:**
1. Look in the sidebar for "Mentions & Reactions" (with @ icon)
2. Click on it
3. Check Console for UUID errors

**Expected:** No errors like `invalid input syntax for type uuid: "mentions"`

**Report format:**
```
Test 6: [PASS/FAIL]
Special channel selected: [Yes/No]
UUID errors: [Yes/No - list if any]
Console errors: [list any errors]
```

---

## Test 7: File Attachment (if available)

**Steps:**
1. Go back to #general channel
2. Click the + button next to message input
3. Select an image file to attach
4. Check if preview appears
5. Send the message with attachment
6. Check Console for storage errors

**Expected:** No `Bucket not found` error, file uploads successfully

**Report format:**
```
Test 7: [PASS/FAIL]
File preview shown: [Yes/No]
Upload successful: [Yes/No]
Console errors: [list any errors]
```

---

## Test 8: Mobile Responsive (Optional)

**Steps:**
1. Open DevTools
2. Toggle device toolbar (Cmd+Shift+M)
3. Select iPhone 12 Pro or similar mobile size
4. Check if hamburger menu appears
5. Click hamburger menu
6. Check if sidebar slides in

**Expected:** Mobile layout works, menu opens

**Report format:**
```
Test 8: [PASS/FAIL]
Mobile layout: [Working/Broken]
Hamburger menu: [Works/Broken]
```

---

## Final Summary

Please provide a final summary in this format:

```
## Inbox Phase 3 Test Results - Production

**Date/Time:** [timestamp]
**URL:** https://app.isyncso.com/inbox

### Test Results:
| Test | Status | Notes |
|------|--------|-------|
| 1. Page Load | PASS/FAIL | |
| 2. Channel Select | PASS/FAIL | |
| 3. Send Message | PASS/FAIL | |
| 4. Channel Details | PASS/FAIL | |
| 5. Members Panel | PASS/FAIL | |
| 6. Special Channel | PASS/FAIL | |
| 7. File Attachment | PASS/FAIL | |
| 8. Mobile Layout | PASS/FAIL | |

### Critical Errors Found:
- [List any blocking errors]

### Warnings (non-blocking):
- [List any minor issues]

### Overall Assessment:
[READY FOR USE / NEEDS FIXES]
```

---

## Key Fixes Being Tested

These bugs were just fixed and deployed:

1. **Bookmarks error** - `file_url` column was missing, now reads from metadata JSON
2. **Storage bucket** - Default changed from 'uploads' (missing) to 'attachments'
3. **Special channels UUID** - Added validation to skip DB calls for 'mentions', 'saved' etc.

If any of these errors still appear, the deployment may not have completed. Wait 2-3 minutes and refresh.
