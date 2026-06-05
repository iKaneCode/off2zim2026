# Supabase Connection Setup

Project reference: `frqbzsapkewiryfitcfd`

This guide connects Off2Zim to the supplied Supabase project without exposing
database or Storage credentials to browsers, mobile apps, Git, or chat.

The connection host shows that this project is in AWS `eu-west-1` (Ireland).
Supabase does not currently list an African database region, so keep this
project for staging and measure Zimbabwe-to-Ireland API and upload latency
before confirming it as the production project.

## 1. Confirm Environment Purpose

Confirm whether this project is staging or production. The recommended rollout
is to use it for staging first, complete end-to-end testing, and then create a
separate production project.

## 2. Obtain Or Reset The Database Password

The password is the one selected when the Supabase project was created.
Supabase does not display the existing value.

If it is unavailable:

1. Open the Supabase project.
2. Go to **Database > Settings > Database password**.
3. Reset or re-save the database password.
4. Store the replacement in a password manager and deployment secret manager.

Do not paste the password into chat. URL encode special characters before
putting it inside a connection string.

For local application testing and Prisma CLI work, put secrets in `.env`. The
file is now ignored and removed from active Git tracking. The Next.js app,
Prisma, and the repository's rollout scripts load it. Use `.env.local` only
when a Next.js-specific local override is useful.

The staging database password supplied on 2026-06-05 was confirmed working
after reset. The hosted staging database has been upgraded in place and now
matches `prisma/schema.prisma`.

## 3. Configure PostgreSQL Connections

The supplied connection is the Shared Pooler in session mode on port `5432`.
Use it for migrations and administration on IPv4 networks:

```env
DIRECT_URL="postgresql://postgres.frqbzsapkewiryfitcfd:URL_ENCODED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

For a serverless or auto-scaling Next.js deployment, use the same Shared Pooler
in transaction mode on port `6543`:

```env
DATABASE_URL="postgresql://postgres.frqbzsapkewiryfitcfd:URL_ENCODED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

For a persistent VM or container, the session pooler can be used as
`DATABASE_URL`. Do not use the transaction pooler for migrations.

## 4. Create The Server-Only Storage Key

1. Open **Project Settings > API Keys**.
2. Create a new secret key named `off2zim-backend`.
3. Store it as `SUPABASE_SECRET_KEY` in the server/deployment secret manager.
4. Never place it in an `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable.

The application still supports the legacy `service_role` key, but the new
independently rotatable `sb_secret_...` key is preferred.

```env
SUPABASE_URL="https://frqbzsapkewiryfitcfd.supabase.co"
SUPABASE_SECRET_KEY="sb_secret_..."
UPLOAD_STORAGE_DRIVER="supabase"
SUPABASE_STORAGE_PUBLIC_BUCKET="off2zim-public-media"
SUPABASE_STORAGE_PRIVATE_BUCKET="off2zim-private"
```

## 5. Configure Hosted Application Values

These depend on the final deployment domain:

```env
APP_URL="https://your-domain"
NEXT_PUBLIC_APP_URL="https://your-domain"
NEXT_PUBLIC_PORTAL_APP_URL="https://admin.your-domain"
NEXT_PUBLIC_ADMIN_APP_URL="https://admin.your-domain"
NEXT_PUBLIC_PROVIDER_APP_URL="https://admin.your-domain"
EXPO_PUBLIC_API_BASE_URL="https://your-domain"
```

Mobile apps receive only the Off2Zim API URL. They do not receive PostgreSQL
credentials or the Supabase server key.

## 6. Configure Email

1. Create a Resend account.
2. Verify an Off2Zim-controlled domain or subdomain.
3. Create a sending-only API key restricted to that domain.
4. Configure:

```env
AUTH_EMAIL_FROM="Off2Zim <no-reply@your-domain>"
RESEND_API_KEY="re_..."
```

## 7. Configure Payments

Rotate the Paynow integration key because Paynow configuration previously
existed in Git history. Configure the replacement only in the secret manager:

```env
PAYNOW_INTEGRATION_ID="..."
PAYNOW_INTEGRATION_KEY="..."
PAYNOW_RESULT_URL="https://your-domain/api/payments/paynow/webhook"
PAYNOW_RETURN_URL="https://your-domain/booking/success"
```

## 8. Complete The First Cutover

Staging database and Storage are now connected. Remaining hosted rollout work:

1. Configure Vercel project environment variables.
2. Point `off2zim.co.zw` and `admin.off2zim.co.zw` at the deployment.
3. Configure Resend sender and API key.
4. Configure Paynow staging/test callback URLs.
5. Run `node scripts/check-production-readiness.mjs`.
6. Deploy the API and portals.
7. Test registration, verification, provider review, uploads, bookings,
   payments, messaging, analytics, and audit logs.

## Optional Agent Skills

`npx skills add supabase/agent-skills` installs guidance for developer AI tools.
It does not configure the database, add security, deploy the application, or
affect production. It is optional and can be installed separately from the
backend rollout.
