"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { Camera, Loader2, X } from "lucide-react";

interface ListingImageManagerProps {
  listingId: string;
  /** Current images array (URLs) from the listing record */
  images: string[];
  /** Called after a successful save so parent can update its state */
  onSaved: (images: string[]) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 8;
const MAX_IMAGES = 12;

export default function ListingImageManager({
  listingId,
  images: initialImages,
  onSaved,
}: ListingImageManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Upload a single file ──────────────────────────────────────────────────
  async function uploadFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPEG, PNG and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setUploadError(`Maximum ${MAX_IMAGES} images per listing.`);
      return;
    }

    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("contentType", "listing");
      form.append("contentId", listingId);

      const data = await apiFetch<{ asset: { fileUrl: string } }>(
        "/api/provider/uploads/content",
        { method: "POST", body: form }
      );
      setImages((prev) => [...prev, data.asset.fileUrl]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadFile(file); // sequential to keep order predictable
    }
  }

  // ── Remove an image (local only — persisted on Save) ─────────────────────
  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  // ── Move image left/right ─────────────────────────────────────────────────
  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= images.length) return;
    const arr = [...images];
    [arr[index], arr[next]] = [arr[next], arr[index]];
    setImages(arr);
  }

  // ── Save order/deletions to backend ──────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await apiFetch(`/api/provider/listings/${listingId}`, {
        method: "PATCH",
        body: JSON.stringify({ images }),
      });
      onSaved(images);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save images.");
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    JSON.stringify(images) !== JSON.stringify(initialImages);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/70">
          Listing photos
          <span className="ml-2 text-xs text-white/30">
            {images.length}/{MAX_IMAGES}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-[#ff5630] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? "Saving…" : "Save order"}
            </button>
          )}
          {saved && !dirty && (
            <span className="text-xs text-[#4ade80]">Saved ✓</span>
          )}
        </div>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Listing photo ${i + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Cover badge on first image */}
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white/80">
                  Cover
                </span>
              )}

              {/* Hover controls */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                {i > 0 && (
                  <button
                    onClick={() => move(i, -1)}
                    className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/35"
                    title="Move left"
                  >
                    ‹
                  </button>
                )}
                <button
                  onClick={() => removeImage(url)}
                  className="rounded-full bg-[#ff5630]/80 p-1.5 text-white hover:bg-[#ff5630]"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {i < images.length - 1 && (
                  <button
                    onClick={() => move(i, 1)}
                    className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/35"
                    title="Move right"
                  >
                    ›
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {images.length < MAX_IMAGES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-4 text-sm text-white/40 transition hover:border-white/30 hover:text-white/60 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Add photos"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {uploadError && (
        <p className="text-xs text-[#ff5630]">{uploadError}</p>
      )}
      {error && (
        <p className="text-xs text-[#ff5630]">{error}</p>
      )}
    </div>
  );
}
