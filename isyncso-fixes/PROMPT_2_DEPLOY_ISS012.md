# Claude Code Prompt — Deploy ISS-012 Frontend Fix to Vercel

## Context
The ISS-012 tenure calculation fix in `src/components/talent/CandidateDetailDrawer.jsx` has been implemented and the frontend build completed successfully (16.5s, 7,930 modules, no errors). However, the fix is NOT live because it hasn't been pushed to Vercel yet.

The fix adds a cross-check: if the DB `years_at_company` value differs from the calculated value (from experience start dates) by more than 5 years, it uses the calculated value instead. Example: Rene Offenberg shows 3y from DB but has worked at Flynth since 2001 (~25 years).

## Task

### Option A: Deploy via Git Push (Preferred)
If the project uses Vercel's Git integration:

```bash
cd /path/to/isyncso
git add src/components/talent/CandidateDetailDrawer.jsx
git commit -m "fix(ISS-012): tenure cross-check — use calculated value when DB differs by >5 years"
git push origin main
```

Vercel will auto-deploy from the push.

### Option B: Deploy via Vercel CLI
If direct CLI deployment is preferred:

```bash
cd /path/to/isyncso
npx vercel --prod
```

### Verification
After deployment, check Rene Offenberg's profile in the campaign:
- Before fix: Tenure shows "3y"
- After fix: Tenure should show "~25y" (calculated from 2001 start date)

Also check that candidates with consistent DB/calculated tenure values still display the DB value correctly (no regression).
