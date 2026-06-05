# Off2Zim Deployment Recommendation

Last updated: 2026-06-05

## Recommendation

Use Vercel for the Next.js web app and API, with Supabase for PostgreSQL and
Storage.

This is the simplest first production shape because Off2Zim is currently a
single Next.js app that contains:

- tourist-facing web/API routes
- service-provider portal routes
- Off2Zim admin portal routes
- shared authentication/session cookies
- shared `/api/*` endpoints for web and mobile clients

Vercel's managed Next.js deployment, environment variables, preview
deployments, and custom-domain flow match that shape well. Supabase transaction
pooling on port `6543` is the right runtime database connection for serverless
or auto-scaling deployments, while the session pooler on port `5432` remains
the migration/admin connection for IPv4 environments.

## Domain Plan

The registered domain is `off2zim.co.zw`.

### Staging Domain Cutover

Use the generated Vercel preview URL for the first smoke test, then attach the
same final domains once the deployment is stable:

Use `off2zim.co.zw` for tourists and travelers:

```text
off2zim.co.zw
```

Use `admin.off2zim.co.zw` for both Off2Zim admin and service-provider portal
pages:

```text
admin.off2zim.co.zw
admin.off2zim.co.zw/sp/provider-dashboard
admin.off2zim.co.zw/admin/overview
```

Set:

```env
APP_URL="https://off2zim.co.zw"
NEXT_PUBLIC_APP_URL="https://off2zim.co.zw"
NEXT_PUBLIC_PORTAL_APP_URL="https://admin.off2zim.co.zw"
NEXT_PUBLIC_ADMIN_APP_URL="https://admin.off2zim.co.zw"
NEXT_PUBLIC_PROVIDER_APP_URL="https://admin.off2zim.co.zw"
EXPO_PUBLIC_API_BASE_URL="https://off2zim.co.zw"
PAYNOW_RESULT_URL="https://off2zim.co.zw/api/payments/paynow/webhook"
PAYNOW_RETURN_URL="https://off2zim.co.zw/booking/success"
```

The current Supabase project and Paynow credentials remain staging/test values.
Before commercial production, rotate secrets, switch to production payment
credentials, and consider moving the Vercel project to Pro because Vercel Hobby
is for personal, non-commercial use.

Keep the portals as secured routes under the admin host:

```text
https://admin.off2zim.co.zw/admin/overview
https://admin.off2zim.co.zw/sp/provider-dashboard
```

This keeps service-provider and admin workspaces away from the tourist-facing
root domain while still allowing one Next.js deployment and one shared API.
Later, if Off2Zim wants stronger separation, add vanity redirects or rewrites:

```text
providers.off2zim.co.zw
api.off2zim.co.zw
www.off2zim.co.zw
```

Do not split the API onto a separate host until there is a real operational
reason; it adds cookie/CORS and deployment complexity.

## Alternatives

| Provider | When to choose it                                                                             |
| -------- | --------------------------------------------------------------------------------------------- |
| Vercel   | Best default for managed Next.js, preview deployments, custom domains, and serverless scaling |
| Render   | Good if Off2Zim wants a persistent Node server with more traditional runtime behavior         |
| Netlify  | Viable for Next.js, but less natural for this app's API-heavy provider/admin platform         |
| Fly.io   | Good later if regional runtime control becomes important                                      |

## Current Staging Status

- Supabase project: `frqbzsapkewiryfitcfd`
- Storage buckets created:
  - `off2zim-public-media`
  - `off2zim-private`
- Supabase server-only key works for Storage.
- Supabase staging database connection works through the shared pooler.
- The hosted staging schema was upgraded to match `prisma/schema.prisma`.
- Existing staging data was preserved:
  - users: 6
  - providers: 1
  - provider listings: 1
- Existing provider owner membership was backfilled as `super_admin`.
- Existing provider was assigned public ID `202604/00001`.
- Supabase Storage upload/delete smoke test passed.

## Security Note

The Supabase staging key and database password were pasted into chat. Treat them
as exposed. This is acceptable for temporary staging work, but rotate both
before production and never reuse them in production.
