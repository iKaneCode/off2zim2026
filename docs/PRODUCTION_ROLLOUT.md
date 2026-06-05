# Off2Zim Production Rollout

Last updated: 2026-06-04

## Canonical Architecture

- PostgreSQL through Prisma is the single source of truth.
- Travelers, service provider owners, provider companies, listings, bookings,
  messages, analytics, audit logs, and tier requests use the same database.
- Supabase is infrastructure only:
  - hosted PostgreSQL
  - private object storage
- All web and Android clients use the shared Next.js API. They must not access
  database tables or Supabase Storage directly.

## Implemented Foundation

- Provider owners are persisted as company `super_admin` members.
- Premium upgrades and downgrades are durable, auditable tier-change requests.
- Only Off2Zim admins can change an active provider tier.
- Web authentication uses an HttpOnly session cookie.
- Android authentication continues to use bearer sessions.
- Rate limits are shared through PostgreSQL and work across server instances.
- Web page views and Android screen views are written to `analytics_events`.
- Upload endpoints support local development storage and Supabase Storage.
- Upload type and 20 MB size limits are enforced centrally.

## Required Production Secrets

Configure these in the deployment secret manager. Do not commit them:

```env
DATABASE_URL="Supabase pooled PostgreSQL URL"
DIRECT_URL="Supabase direct or session-pooler PostgreSQL URL"
APP_URL="https://your-production-domain"
NEXT_PUBLIC_APP_URL="https://your-production-domain"
NEXT_PUBLIC_PORTAL_APP_URL="https://admin.your-production-domain"
NEXT_PUBLIC_ADMIN_APP_URL="https://admin.your-production-domain"
NEXT_PUBLIC_PROVIDER_APP_URL="https://admin.your-production-domain"
UPLOAD_STORAGE_DRIVER="supabase"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SECRET_KEY="sb_secret_server-only-key"
SUPABASE_STORAGE_PUBLIC_BUCKET="off2zim-public-media"
SUPABASE_STORAGE_PRIVATE_BUCKET="off2zim-private"
AUTH_EMAIL_FROM="Off2Zim <verified-sender@your-domain>"
RESEND_API_KEY="resend-secret"
EXPO_PUBLIC_API_BASE_URL="https://your-production-domain"
PAYNOW_INTEGRATION_ID="paynow-integration-id"
PAYNOW_INTEGRATION_KEY="paynow-integration-key"
PAYNOW_RESULT_URL="https://your-production-domain/api/payments/paynow/webhook"
PAYNOW_RETURN_URL="https://your-production-domain/booking/success"
```

Run `npm run production:check` after setting the production environment.

## Staging Rollout

1. Create a Supabase project for staging.
2. Use the transaction pooler for `DATABASE_URL` when deploying to serverless
   or auto-scaling infrastructure. Use a direct connection for `DIRECT_URL`,
   or the session pooler when the migration environment is IPv4-only.
3. Apply the generated Postgres baseline to the empty staging database:

   ```bash
   npx prisma db execute --file prisma/postgres-baseline.sql --url "$DIRECT_URL"
   ```

4. Mark the repository's existing migrations as represented by the baseline:

   ```bash
   npx prisma migrate resolve --applied 20250609044818_init
   npx prisma migrate resolve --applied 20260604120000_add_support_messages
   npx prisma migrate resolve --applied 20260604170000_add_support_message_delivery_attachments
   npx prisma migrate resolve --applied 20260604190000_add_provider_members_and_tier_requests
   npx prisma migrate resolve --applied 20260604193000_add_shared_rate_limits
   npx prisma migrate resolve --applied add-service-provider-id
   ```

5. Run `npm run storage:bootstrap:supabase`.
6. Deploy the Next.js API and portals to Vercel.
7. Point the Android staging builds at the deployed API.
8. Verify signup, email verification, provider review, tier approval, uploads,
   bookings, messaging, analytics, and audit logs.
9. Run backup and restore drills before production launch.

## Production Gates

- Replace the historical mixed migration history with a clean Postgres
  baseline. Do not run all historical migrations against an existing database.
- Configure database backups and point-in-time recovery.
- Configure the verified email sender.
- Configure payment production credentials and webhook verification.
- Add error monitoring and uptime alerts.
- Add retention and deletion policies for analytics, audit logs, messages, and
  uploaded files.
- Complete provider team authorization before enabling the Account page invite
  control. The schema exists, but current provider APIs still authorize the
  owner account only.

## Analytics

The built-in analytics pipeline records app surface, page or screen, session,
authenticated user when available, device platform, and country/city headers
provided by the deployment edge. It is the canonical dataset for provider and
admin dashboards.

PostHog can be added later for funnels, session replay, and experiments, but it
should feed the same event naming plan rather than replace canonical booking,
revenue, and provider data in PostgreSQL.
