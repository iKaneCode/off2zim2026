import path from "path";
import crypto from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";

export type UploadBucket =
  | "provider-documents"
  | "provider-content"
  | "avatars"
  | "listing-images"
  | "support-messages";

type StorageDriver = "local" | "supabase";

const PRIVATE_UPLOAD_BUCKETS = new Set<UploadBucket>([
  "provider-documents",
  "support-messages",
]);
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const DOCUMENT_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeRelativePath(relativePath: string) {
  return relativePath
    .split("/")
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join("/");
}

function encodeStoragePath(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getStorageDriver(): StorageDriver {
  return process.env.UPLOAD_STORAGE_DRIVER?.trim().toLowerCase() === "supabase"
    ? "supabase"
    : "local";
}

function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serverKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serverKey) {
    throw new Error(
      "Supabase Storage requires SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return {
    url,
    serverKey,
    publicBucket:
      process.env.SUPABASE_STORAGE_PUBLIC_BUCKET?.trim() ||
      "off2zim-public-media",
    privateBucket:
      process.env.SUPABASE_STORAGE_PRIVATE_BUCKET?.trim() || "off2zim-private",
  };
}

function getSupabaseStorageHeaders(serverKey: string) {
  const headers: Record<string, string> = {
    apikey: serverKey,
  };

  if (!serverKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${serverKey}`;
  }

  return headers;
}

function getSupabaseObjectIdentity(relativePath: string) {
  const [logicalBucket] = relativePath.split("/");
  const config = getSupabaseStorageConfig();
  const isPrivate = isPrivateUploadBucket(logicalBucket);

  return {
    ...config,
    storageBucket: isPrivate ? config.privateBucket : config.publicBucket,
    objectPath: relativePath,
  };
}

export function isPrivateUploadBucket(bucket: string) {
  return PRIVATE_UPLOAD_BUCKETS.has(bucket as UploadBucket);
}

export function getUploadsRoot() {
  return path.join(process.cwd(), ".data", "uploads");
}

export function inferMimeType(filePath: string) {
  return (
    MIME_TYPES[path.extname(filePath).toLowerCase()] ||
    "application/octet-stream"
  );
}

function validateUpload(bucket: UploadBucket, file: File) {
  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Uploads must be 20 MB or smaller.");
  }

  const contentType = file.type || inferMimeType(file.name);
  const allowedTypes =
    bucket === "provider-documents" || bucket === "support-messages"
      ? DOCUMENT_MIME_TYPES
      : IMAGE_MIME_TYPES;

  if (!allowedTypes.has(contentType)) {
    throw new Error(
      bucket === "provider-documents" || bucket === "support-messages"
        ? "This file type is not supported."
        : "Only JPEG, PNG, WebP, and GIF images are supported.",
    );
  }

  return contentType;
}

async function saveLocalUpload(relativePath: string, bytes: Buffer) {
  const absolutePath = path.join(
    getUploadsRoot(),
    relativePath.split("/").join(path.sep),
  );
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

async function saveSupabaseUpload(
  relativePath: string,
  bytes: Buffer,
  contentType: string,
) {
  const { url, serverKey, storageBucket, objectPath } =
    getSupabaseObjectIdentity(relativePath);
  const response = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(storageBucket)}/${encodeStoragePath(objectPath)}`,
    {
      method: "POST",
      headers: {
        ...getSupabaseStorageHeaders(serverKey),
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: bytes,
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Supabase Storage upload failed (${response.status}): ${message || response.statusText}`,
    );
  }
}

export async function saveUploadedFile(
  bucket: UploadBucket,
  file: File,
  prefix: string,
) {
  const contentType = validateUpload(bucket, file);
  const originalName = sanitizeSegment(file.name || "upload");
  const extension = path.extname(originalName) || ".bin";
  const baseName = path.basename(originalName, extension) || "upload";
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${baseName}${extension}`;
  const relativePath = normalizeRelativePath(
    path.posix.join(bucket, sanitizeSegment(prefix), fileName),
  );
  const bytes = Buffer.from(await file.arrayBuffer());

  if (getStorageDriver() === "supabase") {
    await saveSupabaseUpload(relativePath, bytes, contentType);
  } else {
    await saveLocalUpload(relativePath, bytes);
  }

  return {
    fileName: file.name || fileName,
    storedFileName: fileName,
    relativePath,
    fileUrl: `/api/uploads/${relativePath}`,
    contentType,
    size: bytes.length,
  };
}

async function readSupabaseUpload(relativePath: string) {
  const { url, serverKey, storageBucket, objectPath } =
    getSupabaseObjectIdentity(relativePath);
  const response = await fetch(
    `${url}/storage/v1/object/authenticated/${encodeURIComponent(storageBucket)}/${encodeStoragePath(objectPath)}`,
    {
      headers: {
        ...getSupabaseStorageHeaders(serverKey),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Stored upload not found (${response.status}).`);
  }

  return {
    data: Buffer.from(await response.arrayBuffer()),
    contentType:
      response.headers.get("content-type") || inferMimeType(relativePath),
  };
}

export async function readStoredUpload(relativePath: string) {
  const normalizedPath = normalizeRelativePath(relativePath);
  if (getStorageDriver() === "supabase") {
    return readSupabaseUpload(normalizedPath);
  }

  const absolutePath = path.join(
    getUploadsRoot(),
    normalizedPath.split("/").join(path.sep),
  );
  return {
    data: await readFile(absolutePath),
    contentType: inferMimeType(absolutePath),
  };
}
