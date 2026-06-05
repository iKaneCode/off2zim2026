CREATE TABLE "provider_tier_change_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "fromTier" TEXT NOT NULL,
    "toTier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "reviewNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_tier_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_company_members" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_company_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_company_invitations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_company_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_company_members_companyId_userId_key"
ON "provider_company_members"("companyId", "userId");

CREATE UNIQUE INDEX "provider_company_invitations_tokenHash_key"
ON "provider_company_invitations"("tokenHash");

CREATE INDEX "provider_tier_change_requests_companyId_status_requestedAt_idx"
ON "provider_tier_change_requests"("companyId", "status", "requestedAt");

CREATE INDEX "provider_tier_change_requests_requestedById_requestedAt_idx"
ON "provider_tier_change_requests"("requestedById", "requestedAt");

CREATE INDEX "provider_tier_change_requests_reviewedById_reviewedAt_idx"
ON "provider_tier_change_requests"("reviewedById", "reviewedAt");

CREATE UNIQUE INDEX "provider_tier_change_requests_one_pending_per_company"
ON "provider_tier_change_requests"("companyId")
WHERE "status" = 'pending';

CREATE INDEX "provider_company_members_userId_status_idx"
ON "provider_company_members"("userId", "status");

CREATE INDEX "provider_company_members_companyId_role_status_idx"
ON "provider_company_members"("companyId", "role", "status");

CREATE INDEX "provider_company_invitations_companyId_status_expiresAt_idx"
ON "provider_company_invitations"("companyId", "status", "expiresAt");

CREATE INDEX "provider_company_invitations_email_status_idx"
ON "provider_company_invitations"("email", "status");

ALTER TABLE "provider_tier_change_requests"
ADD CONSTRAINT "provider_tier_change_requests_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "ProviderCompany"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_tier_change_requests"
ADD CONSTRAINT "provider_tier_change_requests_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "provider_tier_change_requests"
ADD CONSTRAINT "provider_tier_change_requests_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_company_members"
ADD CONSTRAINT "provider_company_members_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "ProviderCompany"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_company_members"
ADD CONSTRAINT "provider_company_members_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_company_members"
ADD CONSTRAINT "provider_company_members_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "provider_company_invitations"
ADD CONSTRAINT "provider_company_invitations_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "ProviderCompany"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "provider_company_invitations"
ADD CONSTRAINT "provider_company_invitations_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "provider_company_invitations"
ADD CONSTRAINT "provider_company_invitations_acceptedById_fkey"
FOREIGN KEY ("acceptedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "provider_company_members"
    ("id", "companyId", "userId", "role", "status", "joinedAt", "createdAt", "updatedAt")
SELECT
    'owner_' || "id",
    "id",
    "ownerUserId",
    'super_admin',
    'active',
    "createdAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ProviderCompany"
ON CONFLICT ("companyId", "userId") DO NOTHING;
