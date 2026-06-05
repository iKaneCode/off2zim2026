# Off2Zim Vercel Staging Setup

Last updated: 2026-06-05

This guide deploys the current single Next.js app to Vercel, with Supabase as
the staging database and Storage backend.

## Deployment Shape

- One Vercel project deploys the tourist site, admin portal, service-provider
  portal, and `/api/*` routes.
- `off2zim.co.zw` serves the tourist-facing app and mobile API.
- `admin.off2zim.co.zw` serves `/admin/*` and `/sp/*` portal routes.
- Messaging stays in the Off2Zim database through the existing Next.js message
  APIs and soft-refresh polling. No third-party chat service is required for
  staging.
- Uploaded profile, listing, gallery, document, and message files are stored in
  Supabase Storage through server-side upload routes.

## Vercel Project

1. Open Vercel and import GitHub repository `iKaneCode/off2zim2026`.
2. Use root directory `.`.
3. Framework preset: Next.js.
4. Build command comes from `vercel.json`: `npm run vercel:build`.
5. Keep this as one project for staging. Splitting admin/provider/API into
   separate projects can wait until there is an operational reason.

Vercel will automatically build on GitHub pushes after the repository is linked.

## Required Environment Variables

Set these in Vercel Project Settings > Environment Variables. For this staging
phase, add them to Production and Preview so domain deployments and branch
previews behave consistently.

```env
DATABASE_URL="Supabase transaction pooler URL on port 6543 with ?pgbouncer=true"
DIRECT_URL="Supabase session pooler URL on port 5432"
APP_URL="https://off2zim.co.zw"
NEXT_PUBLIC_APP_URL="https://off2zim.co.zw"
NEXT_PUBLIC_PORTAL_APP_URL="https://admin.off2zim.co.zw"
NEXT_PUBLIC_ADMIN_APP_URL="https://admin.off2zim.co.zw"
NEXT_PUBLIC_PROVIDER_APP_URL="https://admin.off2zim.co.zw"
NEXT_PUBLIC_EXPLORER_APP_URL=""
EXPO_PUBLIC_API_BASE_URL="https://off2zim.co.zw"
UPLOAD_STORAGE_DRIVER="supabase"
SUPABASE_URL="https://frqbzsapkewiryfitcfd.supabase.co"
SUPABASE_SECRET_KEY="Supabase server-only secret key"
SUPABASE_STORAGE_PUBLIC_BUCKET="off2zim-public-media"
SUPABASE_STORAGE_PRIVATE_BUCKET="off2zim-private"
AUTH_EMAIL_FROM="Off2Zim <no-reply@off2zim.co.zw>"
RESEND_API_KEY="Resend API key for the verified Off2Zim sending domain"
PAYNOW_INTEGRATION_ID="Paynow test/staging integration ID"
PAYNOW_INTEGRATION_KEY="Paynow test/staging integration key"
PAYNOW_RESULT_URL="https://off2zim.co.zw/api/payments/paynow/webhook"
PAYNOW_RETURN_URL="https://off2zim.co.zw/booking/success"
NEXT_TELEMETRY_DISABLED="1"
```

Do not add `NEXT_PUBLIC_*` to secrets unless the browser or mobile app must
read them. Never expose `DATABASE_URL`, `DIRECT_URL`, or `SUPABASE_SECRET_KEY`
to the client.

## Domains And DNS

After the first successful Vercel deployment:

1. Add `off2zim.co.zw` to the Vercel project.
2. Add `admin.off2zim.co.zw` to the same Vercel project.
3. In the domain registrar/DNS host, add the exact records Vercel shows.
   Typically the apex domain uses an `A` record and subdomains use `CNAME`,
   but use Vercel's displayed values as the source of truth.
4. Wait for Vercel to mark both domains valid and issue HTTPS certificates.

## Email Domain

Use Resend for staging transactional email:

1. Add `off2zim.co.zw` in Resend Domains.
2. Add the SPF and DKIM DNS records Resend provides.
3. Verify the domain in Resend.
4. Create a restricted API key and set it as `RESEND_API_KEY` in Vercel.

If Off2Zim already uses root-domain email elsewhere, using a sending subdomain
such as `mail.off2zim.co.zw` is safer for reputation isolation. If the sender
must remain root-domain branded, keep `AUTH_EMAIL_FROM` as
`Off2Zim <no-reply@off2zim.co.zw>`.

## Permission Points

Codex can prepare code and docs locally. You need to grant or perform these
external actions:

- Vercel: authorize GitHub access and import `iKaneCode/off2zim2026`.
- Vercel: add environment variables from the staging secret set.
- Vercel: add `off2zim.co.zw` and `admin.off2zim.co.zw`.
- DNS host/registrar: create the Vercel domain records.
- Resend: verify the Off2Zim email domain and create the API key.
- Paynow: set staging callback URLs once the Vercel domain is live.
- GitHub: push the deployment-prep changes when ready.

If a temporary Vercel access token is available locally, run:

```bash
VERCEL_TOKEN="temporary-token" VERCEL_TEAM_SLUG="off2zim" VERCEL_PROJECT_NAME="off2zim" node scripts/sync-vercel-env.mjs
```

The script reads the local `.env`, upserts the approved variables into the
existing Production and Preview environments, and does not print secret values.

## Validation

Before attaching custom domains, run locally:

```bash
npm run production:check
npm run type-check
npm run build
```

After Vercel deploys:

1. Visit `/api/health`.
2. Register a tourist account.
3. Register a service-provider account.
4. Upload a provider document and gallery image.
5. Confirm admin review, listing approval, messages, bookings, analytics, and
   audit logs write to Supabase.

## Plan Note

Vercel Hobby is useful for staging and early testing, but it is documented as a
personal/non-commercial plan. Move to Pro before commercial launch.
