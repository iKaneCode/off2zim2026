import "./load-env.mjs";

const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const serverKey =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const buckets = [
  {
    id:
      process.env.SUPABASE_STORAGE_PUBLIC_BUCKET?.trim() ||
      "off2zim-public-media",
    public: false,
  },
  {
    id:
      process.env.SUPABASE_STORAGE_PRIVATE_BUCKET?.trim() || "off2zim-private",
    public: false,
  },
];

if (!url || !serverKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SECRET_KEY are required to create storage buckets.",
  );
}

const headers = {
  apikey: serverKey,
  "Content-Type": "application/json",
};

if (!serverKey.startsWith("sb_secret_")) {
  headers.Authorization = `Bearer ${serverKey}`;
}

for (const bucket of buckets) {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: bucket.id,
      name: bucket.id,
      public: bucket.public,
      file_size_limit: 20 * 1024 * 1024,
      allowed_mime_types: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
      ],
    }),
  });

  if (response.ok) {
    console.log(`Created Supabase Storage bucket: ${bucket.id}`);
    continue;
  }

  const message = await response.text();
  if (response.status === 409 || message.toLowerCase().includes("already")) {
    console.log(`Supabase Storage bucket already exists: ${bucket.id}`);
    continue;
  }

  throw new Error(
    `Unable to create Supabase Storage bucket ${bucket.id}: ${response.status} ${message}`,
  );
}
