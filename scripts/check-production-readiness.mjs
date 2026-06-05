import "./load-env.mjs";

const required = [
  ["DATABASE_URL", "Shared PostgreSQL pooled connection"],
  ["DIRECT_URL", "Shared PostgreSQL direct connection"],
  ["APP_URL", "Public HTTPS application URL"],
  ["NEXT_PUBLIC_APP_URL", "Public HTTPS web application URL"],
  ["NEXT_PUBLIC_PORTAL_APP_URL", "Portal HTTPS application URL"],
  ["NEXT_PUBLIC_ADMIN_APP_URL", "Off2Zim admin HTTPS application URL"],
  [
    "NEXT_PUBLIC_PROVIDER_APP_URL",
    "Service-provider portal HTTPS application URL",
  ],
  ["EXPO_PUBLIC_API_BASE_URL", "Public HTTPS mobile API URL"],
  ["SUPABASE_URL", "Supabase project URL"],
  ["AUTH_EMAIL_FROM", "Verified email sender"],
  ["RESEND_API_KEY", "Transactional email API key"],
  ["PAYNOW_INTEGRATION_ID", "Paynow integration ID"],
  ["PAYNOW_INTEGRATION_KEY", "Paynow integration key"],
  ["PAYNOW_RESULT_URL", "Public Paynow webhook URL"],
  ["PAYNOW_RETURN_URL", "Public Paynow return URL"],
];

const issues = [];
const publicUrlSettings = new Set([
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_PORTAL_APP_URL",
  "NEXT_PUBLIC_ADMIN_APP_URL",
  "NEXT_PUBLIC_PROVIDER_APP_URL",
  "NEXT_PUBLIC_EXPLORER_APP_URL",
  "EXPO_PUBLIC_API_BASE_URL",
  "SUPABASE_URL",
  "PAYNOW_RESULT_URL",
  "PAYNOW_RETURN_URL",
]);
const nonLocalSettings = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  ...publicUrlSettings,
]);

for (const [name, label] of required) {
  const value = process.env[name]?.trim();
  if (!value) {
    issues.push(`${name}: missing (${label})`);
    continue;
  }

  if (/replace-me|example\.com/i.test(value)) {
    issues.push(`${name}: still contains a placeholder value`);
  }

  if (nonLocalSettings.has(name) && /localhost|127\.0\.0\.1/i.test(value)) {
    issues.push(`${name}: still points to a local environment`);
  }

  if (
    publicUrlSettings.has(name) &&
    !value.toLowerCase().startsWith("https://")
  ) {
    issues.push(`${name}: must use HTTPS in production`);
  }
}

if (process.env.UPLOAD_STORAGE_DRIVER !== "supabase") {
  issues.push("UPLOAD_STORAGE_DRIVER: must be set to supabase in production");
}

const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseServerKey) {
  issues.push(
    "SUPABASE_SECRET_KEY: missing (Supabase server-only Storage key)",
  );
} else if (supabaseServerKey.startsWith("sb_publishable_")) {
  issues.push(
    "SUPABASE_SECRET_KEY: a publishable key cannot be used by the storage adapter",
  );
}

if (issues.length > 0) {
  console.error("Off2Zim production readiness check failed:\n");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exitCode = 1;
} else {
  console.log("Off2Zim core production environment is configured.");
}
