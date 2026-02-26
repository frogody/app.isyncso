# Bank Sync Plan: Enable Banking Integration

**Created:** 2026-02-25
**Status:** Planning

---

## Context

The initial implementation used Revolut's direct Business API (€35/month) for bank transaction sync. This is too expensive and only supports one bank. Dutch accounting tools like Tellow use Open Banking (PSD2) aggregators to support all banks via a single integration.

## Decision: Enable Banking

### Why Enable Banking

1. **Dutch bank coverage** — ING, Rabobank, ABN AMRO, Triodos, ASN/SNS/RegioBank, Van Lanschot (~95% of Dutch business banking)
2. **Free to start** — Sandbox + own accounts at no cost. Volume-based pricing only at scale.
3. **Direct PSD2 connection** — Licensed AISP across 29 EU countries, no middleman markup
4. **Simple REST API** — Accounts + transactions endpoints
5. **Multi-bank from day 1** — Users pick their bank from one integration
6. **Rate limits are bank-side** — Most banks allow 4 background fetches/day (plenty for daily reconciliation)

### Provider Comparison

| Provider | Dutch Banks | Pricing | Status |
|----------|-----------|---------|--------|
| **Enable Banking** | ING, Rabo, ABN, Triodos, ASN, SNS, Van Lanschot | Volume-based, free sandbox | **Selected** |
| GoCardless (Nordigen) | Was free, 2300+ banks | Closed to new signups (July 2025) | Dead end |
| Tink (Visa) | 3,400 banks, NL covered | From €0.50/user/month | Too expensive at scale |
| Yapily | ING, ABN AMRO, 2000 banks | Free sandbox, usage-based | Runner-up |
| Salt Edge | 5,000+ banks, NL expanding | Custom/enterprise | Overkill |
| Mastercard/Aiia | 3,000+ banks (used by Tellow) | Custom/enterprise | Enterprise-focused |
| Revolut Business API | Revolut only | €35/month | Single bank, expensive |

---

## Architecture

### Current (Revolut-only)

```
User connects Revolut (Client ID + OAuth)
  → revolut-sync edge function
  → GET /api/1.0/transactions
  → Insert into bank_transactions
  → Auto-match against journal entries
```

### Target (Enable Banking — any bank)

```
User selects bank (ING, Rabo, ABN, Revolut, etc.)
  → Enable Banking auth flow (redirect to bank app)
  → User consents in their banking app
  → Session stored in bank_connections
  → bank-sync edge function
  → Enable Banking GET /accounts/{id}/transactions
  → Insert into bank_transactions (import_source: 'enable_banking')
  → Auto-match against journal entries
```

### Key Differences

- **Auth**: Bank-side consent via redirect (user approves in their ING/Rabo app) instead of Revolut OAuth
- **Session**: Enable Banking returns a session that needs periodic re-auth (every 90 days per PSD2)
- **Rate limits**: Bank-enforced, typically 4x/day for background fetch
- **Multi-bank**: One integration, user picks bank from Enable Banking's bank selector

---

## Implementation Plan

### Database Changes

Extend `bank_connections` table:
```sql
ALTER TABLE bank_connections
  ADD COLUMN IF NOT EXISTS enable_banking_session_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_institution_id TEXT,  -- Enable Banking institution ID
  ADD COLUMN IF NOT EXISTS bank_name_display TEXT,    -- "ING", "Rabobank", etc.
  ADD COLUMN IF NOT EXISTS consent_expires_at TIMESTAMPTZ,  -- PSD2 90-day consent
  ADD COLUMN IF NOT EXISTS accounts_data JSONB;       -- cached account list from Enable Banking
```

### Edge Function: `bank-sync`

Refactor `revolut-sync` into generic `bank-sync`:
- Support `provider: 'enable_banking'` (and keep `revolut` as legacy)
- Enable Banking API calls:
  1. `GET /sessions/{id}` — check session status
  2. `GET /sessions/{id}/accounts` — list accounts
  3. `GET /accounts/{id}/transactions?date_from=X&date_to=Y` — fetch transactions
- Handle session expiry → notify user to re-consent

### Frontend: Bank Selector

Replace `RevolutConnectionSettings.jsx` with generic `BankConnectionSettings.jsx`:
- Step 1: User clicks "Connect Bank Account"
- Step 2: Show Enable Banking's bank selector (list of supported banks)
- Step 3: Redirect to bank's auth page (ING app, Rabo app, etc.)
- Step 4: Callback → store session → first sync
- Show connected bank name, last sync, consent expiry

### Config

- Add `ENABLE_BANKING_API_KEY` to edge function secrets
- Add `bank-sync` to config.toml
- Keep `revolut-sync` temporarily for backward compatibility

---

## Enable Banking API Reference

### Base URL
- Production: `https://api.enablebanking.com`
- Sandbox: `https://api.enablebanking.com` (with sandbox credentials)

### Key Endpoints (to be confirmed with actual docs)

```
POST /sessions          — Create auth session for a bank
GET  /sessions/{id}     — Check session status
GET  /sessions/{id}/accounts — List accounts
GET  /accounts/{id}/transactions?date_from=&date_to= — Fetch transactions
```

### Auth Flow
1. Create session with institution ID → get redirect URL
2. User redirected to bank → consents in banking app
3. Callback with session confirmation
4. Session valid for 90 days (PSD2 requirement)
5. Background fetch: up to 4x/day per bank

---

## Migration Path

1. **Phase 1**: Set up Enable Banking account, test with sandbox
2. **Phase 2**: Build `bank-sync` edge function + `BankConnectionSettings.jsx`
3. **Phase 3**: Deploy, test with real bank (your Revolut via PSD2 first)
4. **Phase 4**: Once working, deprecate `revolut-sync` and cancel Revolut Business API subscription (save €35/month)

---

## Notes

- Tellow uses Mastercard/Aiia for the same purpose (enterprise pricing)
- Moneybird uses direct bank connections (ING, Rabo) — unclear which aggregator
- GoCardless/Nordigen was the free standard but closed new signups July 2025
- Enable Banking is the best remaining option for startups/SMB SaaS

---

## Privacy Policy & Terms of Service

Created public pages for Enable Banking application registration and GDPR/PSD2 compliance.

### Pages Created

| Page | URL | File |
|------|-----|------|
| Privacy Policy | `https://app.isyncso.com/privacy` | `src/pages/PrivacyPolicy.jsx` |
| Terms of Service | `https://app.isyncso.com/terms` | `src/pages/TermsOfService.jsx` |

Both pages are public (no auth required), rendered outside the main Layout.

### Privacy Policy Key Sections

1. **Introduction** — GDPR + PSD2 compliance statement
2. **Data Controller** — iSyncSO B.V., Netherlands
3. **Personal Data We Collect** — Account, Financial, Bank (PSD2), Email, Technical
4. **Purposes and Legal Basis** — Table mapping each purpose to GDPR article
5. **Open Banking / PSD2 Provisions** — Explicit consent, limited use (Art. 66(3)(g)), 90-day consent, Enable Banking as intermediary
6. **Data Sharing** — Processor list (Supabase, Enable Banking, Vercel, Groq, Composio)
7. **Data Security** — TLS, AES-256, RBAC, RLS, SCA
8. **Data Retention** — 7-year fiscal retention, 90-day bank sessions, 30-day account data
9. **Your Rights** — Full GDPR rights list + Dutch DPA complaint info
10. **International Transfers** — SCCs for non-EEA processors
11. **Cookies** — Essential only, no tracking
12. **Contact** — privacy@isyncso.com

### Terms of Service Key Sections

1. **Agreement** — Binding terms + link to Privacy Policy
2. **Description of Service** — Accounting, bank sync, AI, CRM, inventory
3. **Account Security** — User responsibilities
4. **Open Banking** — Consent, read-only scope, 90-day renewal, limited use (PSD2 Art. 66(3)(g)), bank availability
5. **User Obligations** — Compliance, no fraud, no reverse engineering
6. **Data Ownership** — User owns their data, limited license to us
7. **AI Features** — No warranty on AI accuracy, not financial advice
8. **Third-Party Integrations** — Not responsible for third-party availability
9. **Pricing** — 30-day notice for changes
10. **Limitation of Liability** — As-is, 12-month cap, no consequential damages
11. **Termination** — 30-day data export window, 7-year fiscal retention
12. **Governing Law** — Netherlands, Amsterdam courts

### Enable Banking Registration URLs

Use these in the Enable Banking application form:
- **Privacy Policy URL:** `https://app.isyncso.com/privacy`
- **Terms of Service URL:** `https://app.isyncso.com/terms`
- **Data Protection Contact:** `privacy@isyncso.com`

---

*Waiting for Enable Banking documentation/setup info from user before proceeding with implementation.*
