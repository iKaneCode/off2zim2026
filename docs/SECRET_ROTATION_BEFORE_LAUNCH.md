# Secret Rotation Before Launch

Last updated: 2026-06-05

The following credentials were used during staging setup or pasted into chat.
Rotate them before commercial production launch and update Vercel, Supabase,
Paynow, Resend, local `.env`, and any password manager entries at the same
time.

## Rotate Before Production

- Vercel access token used for staging automation.
- Supabase staging database password.
- Supabase server-only secret key used by backend uploads.
- Paynow integration key and any historical Paynow credentials that were ever
  committed, pasted into chat, or used outside the secret manager.
- Resend API key if it is pasted into chat or shared outside the Resend/Vercel
  secret managers.
- Any admin demo passwords or provider demo passwords used during staging.

## Also Verify

- Vercel environment variables exist only in the intended project and
  environments.
- No production secret is committed to Git.
- `.env` remains ignored locally.
- Supabase production uses a separate database/project from staging, or staging
  data is intentionally promoted after a backup and restore drill.
- Paynow production callbacks point to the final HTTPS domain.
- Email sender domain DNS is verified before enabling required verification
  emails.
