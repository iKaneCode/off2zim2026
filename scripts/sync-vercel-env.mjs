import "./load-env.mjs";

const token = process.env.VERCEL_TOKEN?.trim();
const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim() || "off2zim";
const projectName = process.env.VERCEL_PROJECT_NAME?.trim() || "off2zim";

const variables = [
  { key: "DATABASE_URL", type: "sensitive" },
  { key: "DIRECT_URL", type: "sensitive" },
  { key: "APP_URL", type: "plain" },
  { key: "NEXT_PUBLIC_APP_URL", type: "plain" },
  { key: "NEXT_PUBLIC_PORTAL_APP_URL", type: "plain" },
  { key: "NEXT_PUBLIC_ADMIN_APP_URL", type: "plain" },
  { key: "NEXT_PUBLIC_PROVIDER_APP_URL", type: "plain" },
  { key: "NEXT_PUBLIC_EXPLORER_APP_URL", type: "plain", optional: true },
  { key: "EXPO_PUBLIC_API_BASE_URL", type: "plain" },
  { key: "UPLOAD_STORAGE_DRIVER", type: "plain" },
  { key: "SUPABASE_URL", type: "plain" },
  { key: "SUPABASE_SECRET_KEY", type: "sensitive" },
  { key: "SUPABASE_STORAGE_PUBLIC_BUCKET", type: "plain" },
  { key: "SUPABASE_STORAGE_PRIVATE_BUCKET", type: "plain" },
  { key: "AUTH_EMAIL_FROM", type: "plain" },
  { key: "RESEND_API_KEY", type: "sensitive", optional: true },
  { key: "PAYNOW_INTEGRATION_ID", type: "sensitive" },
  { key: "PAYNOW_INTEGRATION_KEY", type: "sensitive" },
  { key: "PAYNOW_RESULT_URL", type: "plain" },
  { key: "PAYNOW_RETURN_URL", type: "plain" },
  { key: "NEXT_TELEMETRY_DISABLED", type: "plain", defaultValue: "1" },
];

if (!token) {
  throw new Error("VERCEL_TOKEN is required.");
}

const missing = variables
  .filter(({ key, optional, defaultValue }) => {
    if (optional || defaultValue !== undefined) {
      return false;
    }

    return !process.env[key]?.trim();
  })
  .map(({ key }) => key);

if (missing.length > 0) {
  console.error("Missing required local environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

const url = new URL(
  `https://api.vercel.com/v10/projects/${encodeURIComponent(projectName)}/env`,
);
url.searchParams.set("upsert", "true");
url.searchParams.set("slug", teamSlug);

const requestBody = variables
  .map(({ key, type, defaultValue }) => ({
    key,
    value: process.env[key]?.trim() || defaultValue || "",
    type,
    target: ["production", "preview"],
    comment: "Managed by Off2Zim staging rollout script.",
  }))
  .filter(({ value }) => value);

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
});

const payload = await response.json().catch(async () => ({
  message: await response.text(),
}));

if (!response.ok) {
  console.error(`Vercel environment sync failed: ${response.status}`);
  console.error(payload?.error?.message || payload?.message || "Unknown error");
  process.exit(1);
}

const created = Array.isArray(payload.created)
  ? payload.created
  : payload.created
    ? [payload.created]
    : [];
const failed = Array.isArray(payload.failed) ? payload.failed : [];

console.log(
  `Synced ${created.length} Vercel environment variable(s) to ${projectName}.`,
);

for (const item of created) {
  console.log(`- ${item.key}: ${item.target?.join(", ") || "updated"}`);
}

if (failed.length > 0) {
  console.error("Some variables failed to sync:");
  for (const item of failed) {
    console.error(
      `- ${item?.error?.key || item?.error?.envVarKey || "unknown"}: ${
        item?.error?.message || "Unknown error"
      }`,
    );
  }
  process.exit(1);
}
