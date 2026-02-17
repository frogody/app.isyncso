# Testing Guide — Phase 4 (bol.com), Phase 5 (Returns) & Email Pool

Hey! This doc walks you through testing everything we recently built. Please follow the sections in order — some things depend on earlier steps working.

---

## How to Report Results

When you find something that doesn't work or looks off, please report it in this format so we can fix it fast:

```
## Bug: [Short description]

**Page:** [Which page you were on, e.g. Settings > bol.com tab]
**Steps:**
1. What you did step by step
2. ...

**Expected:** What should have happened
**Actual:** What actually happened

**Screenshot:** [paste screenshot if possible]
**Console errors:** Open browser DevTools (Cmd+Option+I > Console tab),
                    copy any red error messages
**URL bar:** Copy the full URL you were on
```

A simple list also works:
- Page name
- What you clicked / did
- What went wrong (error message, blank screen, wrong data, etc.)
- Screenshot + console errors

The more context you give, the faster the fix. Console errors are the most valuable — they tell us exactly what broke.

---

## Before You Start

1. **Hard refresh** the app: `Cmd + Shift + R` (clears cached JS)
2. Make sure you're logged in as an admin/super_admin account
3. Have the browser DevTools Console open (Cmd+Option+I > Console) so you can catch errors as they happen
4. The app is at: `https://app.isyncso.com`

---

## PHASE 4: bol.com Retailer API

### Test 1: Credentials & Connection

**Where:** Settings page > look for a "bol.com" tab or section

1. Navigate to **Settings**
2. Find the bol.com section/tab
3. You should see:
   - Client ID field
   - Client Secret field (with show/hide toggle)
   - "Save Credentials" button
   - "Test Connection" button (appears after saving)

**Test steps:**
- [ ] Enter valid bol.com API Client ID and Client Secret
- [ ] Click "Save Credentials" — should show success toast
- [ ] Click "Test Connection" — should show green "Connected" status
- [ ] Refresh the page — credentials should still be there (shown as dots)
- [ ] Try saving empty credentials — should show error or be blocked

**Report:** Does the connection test succeed? What status badge shows? Any errors in console?

---

### Test 2: EAN-to-Product Mappings

**Where:** Settings > bol.com tab (below credentials)

After connecting:
- [ ] You should see a table of EAN-to-Product mappings
- [ ] Each row shows: EAN, Product name, Offer ID, bol.com Stock, Active status
- [ ] Click the Refresh button — table should reload
- [ ] Check if the product names match what you expect

**Report:** Does the mappings table populate? How many rows? Any missing products?

---

### Test 3: Inventory Comparison

**Where:** Settings > bol.com tab (below mappings)

- [ ] Click "Compare Stock" button
- [ ] Should show 4 stat cards: In Sync, Out of Sync, bol.com Only, Local Only
- [ ] If there are "Out of Sync" items, a table should appear showing:
  - EAN, Local Stock, bol.com Stock, Difference (green = we have more, red = they have more)
- [ ] Check if the numbers make sense for a few products you know

**Report:** How many in sync vs out of sync? Do the numbers look correct for products you can verify?

---

### Test 4: Push Shipment to bol.com (Replenishment)

**Where:** Pallet Builder page

**Prerequisites:** You need a finalized shipment of type "b2c_lvb" (bol.com LVB). If you don't have one, create a test shipment first.

1. Go to **Pallet Builder**
2. Find or create a shipment with type "b2c_lvb"
3. Finalize the shipment
4. You should see a **"Push to bol.com"** button (cyan, bottom of shipment panel)
5. Click it — a dialog should open with 3 steps:

**Step 1 — Loading:**
- [ ] Shows spinner "Loading product destinations from bol.com..."
- [ ] Should auto-advance to Step 2 (wait up to 15 seconds)

**Step 2 — Review & Date:**
- [ ] Shows replenishment summary (reference, pallets, EAN lines, total items, weight)
- [ ] Date picker for delivery date (minimum = tomorrow)
- [ ] Items table showing EAN + quantity
- [ ] Select a delivery date
- [ ] Click "Create Replenishment"

**Step 3 — Confirmation:**
- [ ] Shows checkmark and "Replenishment Submitted"
- [ ] Shows Process Status ID
- [ ] "Download Labels" button may appear (could take a minute for bol.com to process)

**Report:** Did all 3 steps complete? Any error at Step 1 (loading destinations)? Did you get a Process Status ID? Could you download labels?

---

### Test 5: Shipment Verification with bol.com Data

**Where:** Shipment Verification page

1. Go to **Verification** (sidebar under Products)
2. Select a shipment that was pushed to bol.com (from Test 4)
3. You should see:
   - [ ] Blue banner at top: "bol.com Replenishment" with replenishment ID
   - [ ] State badge: CREATED / ANNOUNCED / IN_TRANSIT / ARRIVED
   - [ ] "Download Labels" link (if labels are ready)
4. Below that, the quantity comparison table:
   - [ ] Columns: EAN, Product, Purchased, Received, Packed, Status
   - [ ] Check if statuses make sense

**Report:** Does the bol.com banner show? What state is it in? Does the comparison table load correctly?

---

### Test 6: Replenishment History

**Where:** Settings > bol.com tab (bottom section)

- [ ] Click "Show History" toggle
- [ ] Should show recent replenishments with: shipment code, pallet/item counts, date, state badge
- [ ] States should be color-coded: CREATED (cyan), IN_TRANSIT (amber), ARRIVED (green)
- [ ] If a replenishment has labels, there should be a download button

**Report:** Does history show? How many entries? Do states look correct?

---

## PHASE 5: Returns Workflow

### Test 7: Returns Page Navigation

**Where:** Sidebar under Products

- [ ] Click "Returns" in the sidebar (should be between Verification and Stock Purchases)
- [ ] Page should load without errors
- [ ] You should see: stats bar at top, search/filter controls, return cards below

**Report:** Does the page load? Any blank screen or console errors?

---

### Test 8: Sync bol.com Returns

**Where:** Returns page

1. Click the **"Sync bol.com"** button (top right area)
2. Button should show spinner while syncing
3. Should show toast: "Synced X returns from bol.com"

- [ ] After sync, return cards should appear (if there are any unhandled returns on bol.com)
- [ ] Each card shows: return code (RET-BOL-xxx), status badge, source badge ("bol.com"), item count, date

**Report:** Did sync complete? How many returns synced? Any errors?

---

### Test 9: Create Manual Return

**Where:** Returns page

1. Click the **"+"** or **"New Return"** button
2. A dialog should open asking for:
   - EAN (search field — type an EAN and it should find the product)
   - Quantity
   - Reason (dropdown: defective, wrong item, not as described, etc.)
   - Notes (optional)
3. You can add multiple items
4. Click "Create Return"

- [ ] Return should appear in the list with status "registered"
- [ ] Return code should be auto-generated (RET-MANUAL-xxx or similar)

**Report:** Did the create dialog work? Could you search for products by EAN? Did the return appear in the list?

---

### Test 10: Process Return Items

**Where:** Returns page > click on a return card

1. Click on a return to open the detail dialog
2. You should see:
   - Status stepper at top: registered > received > inspected > processed
   - List of items with action buttons
3. For each item, test the actions:
   - [ ] **Restock** — should create a receiving log entry and update inventory
   - [ ] **Dispose** — should mark item as disposed
   - [ ] **Inspect** — should mark item for further inspection
4. When all items are processed, return should auto-advance to "processed"

**Report:** Do the action buttons work? Does inventory update after restock? Does the status auto-advance?

---

### Test 11: Send bol.com Return Handling

**Where:** Returns page > detail dialog for a bol.com-sourced return

For returns that came from bol.com (source = "bol.com", has a bol_return_id):
- [ ] There should be a "Send to bol.com" button
- [ ] Click it — should send the handling result back to bol.com
- [ ] Should show success toast

**Report:** Does the "Send to bol.com" button appear? Does it succeed?

---

## EMAIL POOL (New Feature)

### Test 12: Email Pool Page Navigation

**Where:** Sidebar under Products > "Email Pool"

- [ ] Click "Email Pool" in the sidebar
- [ ] Page should load with: header, stats bar (4 cards), section tabs (Accounts / Supplier Patterns / Sync Log)
- [ ] Initially should show empty state: "No pool accounts yet"

**Report:** Does the page load? Do all sections render?

---

### Test 13: Add Pool Account

**Where:** Email Pool page

1. Click **"Add Account"** button (top right)
2. Dialog should open with:
   - Email Address field
   - Provider dropdown (Gmail / Outlook)
   - Label field (optional)
3. Enter a test email address (e.g., shop@yourdomain.com)
4. Click "Add Account"

- [ ] Account card should appear with "Disconnected" status
- [ ] Card shows: email address, provider, stats (all 0), Connect/Settings/Delete buttons

**Report:** Did the account card appear? Does it show the correct email and provider?

---

### Test 14: Connect Pool Account (OAuth)

**Where:** Email Pool page > click "Connect" on an account card

1. Click **"Connect"** on a Gmail account card
2. Should open Google OAuth popup
3. Sign in and grant access
4. Popup should close, card should update to "Connected" (green badge)

**Important:** This requires a real Gmail account. If you don't have a test account, just verify that:
- [ ] The "Connect" button triggers an OAuth popup
- [ ] If you cancel the popup, the status goes to "Error" with a message

**Report:** Did the OAuth popup open? Did it connect successfully? What's the connection status after?

---

### Test 15: Account Settings

**Where:** Email Pool page > click Settings (gear icon) on an account card

- [ ] Settings dialog should open showing:
  - Display Name
  - Label
  - Default Sales Channel (Undecided / B2B / B2C)
  - Auto-approve Orders toggle + confidence threshold slider
  - Sync to Finance toggle
  - Active toggle
- [ ] Change some settings and click "Save"
- [ ] Verify settings persist after closing and reopening

**Report:** Does the settings dialog render correctly? Do settings save and persist?

---

### Test 16: Supplier Patterns

**Where:** Email Pool page > "Supplier Patterns" tab

1. Click the **"Supplier Patterns"** tab
2. Should show empty state with "Load Defaults" button
3. Click **"Load Defaults"**
4. Should add 5 default suppliers: Amazon, bol.com, Coolblue, Joybuy, De'Longhi

- [ ] Each pattern shows: supplier name, country badge, sales channel badge, sender/subject patterns
- [ ] Click the edit (pencil) icon on a pattern — should show edit fields
- [ ] Try adding a new pattern with the "Add" button
- [ ] Try deleting a pattern with the trash icon

**Report:** Did defaults load? Can you add/edit/delete patterns?

---

### Test 17: Sync Log

**Where:** Email Pool page > "Sync Log" tab

- [ ] Click the "Sync Log" tab
- [ ] Initially should show "No emails processed yet"
- [ ] Filter dropdown should work (All / Orders / Shipping / Other / Skipped)
- [ ] Refresh button should reload

(This will only have data after real emails are processed through a connected account)

**Report:** Does the sync log tab render? Does the filter dropdown work?

---

### Test 18: Source Filter on Stock Purchases

**Where:** Stock Purchases page

1. Go to **Stock Purchases** (sidebar)
2. In the filter bar, you should see a new **"All Sources"** dropdown
3. Options: All Sources / Manual / Invoice / Email Pool

- [ ] Dropdown renders and is clickable
- [ ] Selecting "Manual" filters to only manual purchases
- [ ] Selecting "Email Pool" filters to email pool purchases (probably empty for now)
- [ ] Source badges should appear on purchase cards: "Email Pool" (cyan) or "Invoice" (blue)

**Report:** Does the source filter dropdown appear? Does filtering work?

---

## Edge Function Deployment

**Note for David:** The edge functions (`process-order-email`, `composio-webhooks`, `bolcom-api`, `bolcom-webhooks`) need to be deployed for the backend to work. If the tester hits errors about "function not found" or 404s on API calls, check if the functions are deployed:

```bash
SUPABASE_ACCESS_TOKEN="<PAT>" npx supabase functions deploy process-order-email --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
SUPABASE_ACCESS_TOKEN="<PAT>" npx supabase functions deploy composio-webhooks --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

---

## Quick Summary Checklist

After testing, fill this in and send it back:

```
Phase 4 - bol.com:
- [ ] Credentials save + test connection: PASS / FAIL
- [ ] EAN mappings table loads: PASS / FAIL
- [ ] Inventory comparison works: PASS / FAIL
- [ ] Push to bol.com (replenishment): PASS / FAIL / SKIP
- [ ] Shipment verification shows bol.com data: PASS / FAIL / SKIP
- [ ] Replenishment history: PASS / FAIL

Phase 5 - Returns:
- [ ] Returns page loads: PASS / FAIL
- [ ] Sync bol.com returns: PASS / FAIL
- [ ] Create manual return: PASS / FAIL
- [ ] Process return items (restock/dispose): PASS / FAIL
- [ ] Send handling to bol.com: PASS / FAIL / SKIP

Email Pool:
- [ ] Email Pool page loads: PASS / FAIL
- [ ] Add account: PASS / FAIL
- [ ] Connect OAuth: PASS / FAIL / SKIP
- [ ] Account settings dialog: PASS / FAIL
- [ ] Supplier patterns (load defaults, add, edit, delete): PASS / FAIL
- [ ] Sync log tab: PASS / FAIL
- [ ] Source filter on Stock Purchases: PASS / FAIL

Bugs found: [number]
(attach bug reports below)
```

Thanks for testing!
