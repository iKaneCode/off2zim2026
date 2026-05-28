-- Add serviceProviderId to ProviderCompany
ALTER TABLE "ProviderCompany"
ADD COLUMN "serviceProviderId" VARCHAR(20) UNIQUE;