Migration: Add serviceProviderId to ProviderCompany

- Adds a new field `serviceProviderId` (String, unique, nullable) to the ProviderCompany model.
- This field will store the sequential Service Provider ID in the format YYYYMM/00001, assigned at creation.
- Next steps: generate and run the migration, then update backend logic to assign this value when a new provider is created.