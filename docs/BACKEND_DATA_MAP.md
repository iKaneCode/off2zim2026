# Off2Zim Backend Data Map

Last updated: 2026-06-04

## Current Rollout Project

- Supabase project reference: `frqbzsapkewiryfitcfd`
- Supabase project URL: `https://frqbzsapkewiryfitcfd.supabase.co`
- Environment purpose: confirm whether this project is staging or production

The project reference and URL are not secrets. Database passwords, connection
strings, secret/service-role keys, email keys, and payment keys are secrets and
must only be stored in local environment files or the deployment platform's
secret manager.

## Security Action Required

The repository previously tracked `.env` in Git history, including Paynow
configuration. It has now been removed from active Git tracking, but every
secret that was ever stored there must still be treated as exposed:

1. Rotate the Paynow integration key before production.
2. Store replacement secrets in the ignored local `.env` file and in the
   deployment platform's secret manager for hosted environments.
3. Never paste secret values into chat, tickets, or documentation.

The repository ignore rules now protect `.env` and `.env.*`, while preserving
the safe example files.

## Architecture

```mermaid
flowchart LR
  Tourist["Tourist iOS / Android app"]
  Provider["Service provider portal / Android app"]
  Admin["Off2Zim admin portal"]
  API["Shared Next.js API"]
  DB["Supabase PostgreSQL"]
  Storage["Supabase Storage"]
  Email["Resend"]
  Payments["Paynow"]

  Tourist --> API
  Provider --> API
  Admin --> API
  API --> DB
  API --> Storage
  API --> Email
  API --> Payments
```

All clients use the shared Next.js API. Clients do not receive the database
password or Supabase server key and do not write directly to PostgreSQL or
Storage.

## Where Data Is Saved

### PostgreSQL: canonical platform records

Supabase hosts one PostgreSQL database. Prisma defines its structure in
`prisma/schema.prisma`.

| Area                      | Main tables                                                                                                          | What they contain                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Accounts and access       | `users`, `sessions`, `accounts`, `VerificationToken`                                                                 | Travelers, providers, admins, password hashes, email verification, and login sessions      |
| Provider organizations    | `ProviderCompany`, `provider_company_members`, `provider_company_invitations`                                        | Company profile, public service-provider ID, owner, staff roles, and invitations           |
| Provider review           | `ProviderDocument`, `ProviderVerificationReview`, `provider_tier_change_requests`                                    | Uploaded-document metadata, admin review decisions, and tier requests                      |
| Listings and availability | `ProviderListing`, `ListingAvailability`, `ProviderLocation`, `ProviderFee`, `CalendarBlock`                         | Listings, public listing information, prices, locations, and bookable inventory            |
| Bookings and money        | `bookings`, `payments`, `subscriptions`, `PlatformCommission`, `Payout`, `Dispute`                                   | Reservations, payment status, commissions, payouts, and disputes                           |
| Media metadata            | `ProviderMedia`, `StayGallery`, `EventGallery`                                                                       | File URL, listing ownership, approval status, captions, and reviewer                       |
| Messaging                 | `support_conversations`, `support_messages`                                                                          | Admin/provider/user conversations, messages, attachments, delivery, and read state         |
| Governance                | `AdminAuditLog`, `RateLimitBucket`                                                                                   | Immutable activity history and shared API rate-limit counters                              |
| Analytics                 | `analytics_events`                                                                                                   | Page/screen views, sessions, app surface, device, platform, and available location headers |
| Discovery and engagement  | `ExploreContent`, `FeaturedEntry`, `NotificationCampaign`, `PushToken`, `NotificationDelivery`, `Review`, `Favorite` | Explore page, featured listings, notifications, reviews, and favorites                     |

Travelers and service-provider staff are rows in the same `users` table. A
provider's company is a `ProviderCompany`; staff access is connected through
`provider_company_members`. A provider owner is stored as a company
`super_admin` member.

Internal database IDs use CUID values for reliable relationships. Public-facing
provider and listing IDs remain separate human-readable IDs, such as
`202605-00001` and `202605-00001/00001`.

### Supabase Storage: uploaded file bytes

The API stores uploaded file bytes in two private Supabase Storage buckets:

| Bucket                 | Contents                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| `off2zim-public-media` | Avatars, profile/cover images, listing images, and approved gallery media |
| `off2zim-private`      | Provider company documents and message attachments                        |

The buckets are private even when the logical content is public. The API serves
files through stable `/api/uploads/...` URLs after applying the appropriate
access rules. PostgreSQL stores the file URL, owner, listing, review status,
type, and other metadata.

During local development, file bytes remain in `.data/uploads` while
`UPLOAD_STORAGE_DRIVER=local`. Changing the driver to `supabase` moves new
uploads to Supabase Storage; existing local uploads must be migrated separately.

### External services

- Resend sends verification, password-reset, and transactional emails.
- Paynow processes payments. Off2Zim stores booking/payment records and status,
  but must never store customers' card or mobile-wallet credentials.

## Authentication

Off2Zim currently owns authentication rather than using Supabase Auth:

- Account records are in the `users` table.
- Passwords are stored only as salted hashes.
- Browser sessions use an HttpOnly `off2zim_session` cookie.
- Mobile apps use bearer session tokens.
- Session records are stored in the `sessions` table.

This means users appear in the Supabase Table Editor under `users`, not in the
Supabase Authentication Users screen.

## How To Access Data

### Normal operational access

Use the Off2Zim admin portal for moderation, support, analytics, bookings, and
audit-log workflows. This preserves authorization rules and records admin
actions.

### Supabase dashboard

- Table Editor: inspect rows and relationships in the `public` schema.
- SQL Editor: run controlled reports and diagnostics.
- Storage: inspect and download individual objects.
- Database > Backups: inspect available database backups.
- Observability: inspect database connections and service health.

Avoid manually editing production rows or the `storage` schema. Use migrations
for schema changes and the application/API for operational changes.

### Local developer access

- `npm run db:studio`: opens Prisma Studio for the currently configured database.
- `prisma/schema.prisma`: source of truth for the application data model.
- `prisma/postgres-baseline.sql`: baseline used to initialize a fresh hosted database.
- `npm run production:check`: checks whether required production configuration is present.

`DATABASE_URL` is used by the deployed application for runtime traffic.
`DIRECT_URL` is used for migrations and database administration.

## Credentials Still Required

Configure these without committing or sending their values through chat:

| Setting                    | Where to obtain it                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`             | Supabase project dashboard, **Connect**, transaction pooler on port `6543` plus `pgbouncer=true` for serverless Prisma                                 |
| `DIRECT_URL`               | Supabase project dashboard, **Connect**, direct connection; use the supplied session pooler on port `5432` when the migration environment is IPv4-only |
| `SUPABASE_SECRET_KEY`      | Supabase **Settings > API Keys**; create a server-only secret key named `off2zim-backend`                                                              |
| `APP_URL`                  | Final HTTPS domain of the deployed Next.js app/API                                                                                                     |
| `NEXT_PUBLIC_APP_URL`      | Final HTTPS domain used by browser-facing application links and Paynow fallback URLs                                                                   |
| `EXPO_PUBLIC_API_BASE_URL` | Same deployed API domain used by mobile builds                                                                                                         |
| `AUTH_EMAIL_FROM`          | Verified Resend sender, for example `Off2Zim <no-reply@updates.off2zim.co.zw>`                                                                         |
| `RESEND_API_KEY`           | Resend API Keys dashboard; create a sending-only key restricted to the verified domain                                                                 |
| `PAYNOW_INTEGRATION_ID`    | Paynow advanced integration                                                                                                                            |
| `PAYNOW_INTEGRATION_KEY`   | Paynow advanced integration secret; rotate before production                                                                                           |
| `PAYNOW_RESULT_URL`        | Public HTTPS Paynow webhook endpoint                                                                                                                   |
| `PAYNOW_RETURN_URL`        | Public HTTPS booking success page                                                                                                                      |

Also confirm:

1. Whether the supplied Supabase project is staging or production.
2. The deployment provider and final web/API domain.
3. The domain/subdomain available for transactional email.
4. Whether Paynow credentials are test or live.

### Project-Specific Connection Templates

The supplied connection is the IPv4 session pooler. Once the database password
has been entered locally, use:

```env
DIRECT_URL="postgresql://postgres.frqbzsapkewiryfitcfd:URL_ENCODED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
DATABASE_URL="postgresql://postgres.frqbzsapkewiryfitcfd:URL_ENCODED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

`DIRECT_URL` is for migrations, baselines, and administration. `DATABASE_URL`
is for the deployed serverless application. A persistent container deployment
can use the session pooler for runtime traffic, but transaction mode is the
safer default until the deployment target is confirmed.

The database password is the password chosen when the Supabase project was
created. Supabase does not reveal an existing database password. Reset it under
**Project Settings > Database** if it is unavailable, then update every
environment that connects to the project. Password characters such as `@`,
`#`, `/`, and `%` must be URL encoded inside connection strings.

## First Hosted Database Cutover

1. Install the hosted database and server secrets in the deployment secret manager.
2. Apply `prisma/postgres-baseline.sql` to the empty Supabase database.
3. Mark the existing migrations as represented by the baseline, following
   `docs/PRODUCTION_ROLLOUT.md`.
4. Run `npm run storage:bootstrap:supabase`.
5. Set `UPLOAD_STORAGE_DRIVER=supabase`.
6. Deploy the API and portals.
7. Run `npm run production:check`.
8. Test signup, email verification, provider review, uploads, bookings,
   payments, messages, analytics, and audit logs before opening access.

## Backup Rule

Supabase database backups protect PostgreSQL data but do not restore deleted
Storage objects. Off2Zim therefore needs both database backups/PITR and a
separate Storage object backup or replication process.
