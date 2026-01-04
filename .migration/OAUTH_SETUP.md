# OAuth Configuration for ISYNCSO

This guide walks through configuring OAuth providers in Supabase Dashboard.

## Prerequisites

- Access to Supabase Dashboard: https://supabase.com/dashboard/project/sfxpmzicgpaxfntqleig
- Google Cloud Console access (for Google OAuth)
- Your production domain ready

---

## Step 1: Access Authentication Settings

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Each provider needs to be enabled and configured

---

## Step 2: Configure Google OAuth

### 2.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   ```
   https://sfxpmzicgpaxfntqleig.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret**

### 2.2 Configure in Supabase

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google**
4. Paste your **Client ID**
5. Paste your **Client Secret**
6. Click **Save**

---

## Step 3: Configure Redirect URLs

In **Authentication** → **URL Configuration**:

### Site URL
```
https://your-production-domain.com
```

### Redirect URLs (add all that apply)
```
https://your-production-domain.com/auth/callback
http://localhost:5173/auth/callback
http://localhost:3000/auth/callback
https://your-staging-domain.com/auth/callback
```

---

## Step 4: Email Templates (Optional)

In **Authentication** → **Email Templates**, customize:

- **Confirm signup**: Email verification
- **Invite user**: Team member invitations
- **Magic Link**: Passwordless login
- **Change Email Address**: Email change confirmation
- **Reset Password**: Password reset emails

### Example Invite Template
```html
<h2>You've been invited to ISYNCSO</h2>

<p>{{ .Email }} has invited you to join their organization on ISYNCSO.</p>

<p><a href="{{ .ConfirmationURL }}">Accept Invitation</a></p>

<p>This invitation expires in 24 hours.</p>
```

---

## Step 5: Configure SMTP (Optional but Recommended)

For production, configure your own SMTP:

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Add your SMTP credentials:
   - Host: `smtp.resend.com` (if using Resend)
   - Port: `465`
   - User: `resend`
   - Password: Your Resend API key
   - Sender email: `noreply@your-domain.com`

---

## Step 6: Update Frontend Environment

In your `.env` file:

```bash
# Enable Supabase
VITE_USE_SUPABASE=true

# Supabase Configuration
VITE_SUPABASE_URL=https://sfxpmzicgpaxfntqleig.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 7: Test Authentication Flow

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Test sign up flow
3. Test Google OAuth login
4. Test email verification
5. Test password reset
6. Test team invitations

---

## Troubleshooting

### "OAuth callback URL mismatch"
- Verify redirect URLs match exactly in Google Console and Supabase
- Check for trailing slashes

### "Email not sending"
- Check Supabase rate limits (4 emails/hour on free tier)
- Configure custom SMTP for production

### "User not created in users table"
- Check the database trigger `handle_new_user`
- Verify RLS policies allow insert

### "Cannot sign in after signup"
- Check if email confirmation is required
- Verify the user exists in both `auth.users` and `public.users`

---

## Security Checklist

- [ ] OAuth credentials not exposed in frontend code
- [ ] Redirect URLs are production domains only
- [ ] Rate limiting configured
- [ ] Email verification enabled for production
- [ ] Password requirements set (min 8 chars, etc.)
- [ ] Session timeout configured appropriately

---

## Reference Links

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
