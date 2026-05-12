"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Star, Clock } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface GuideService {
  id: string;
  title: string;
  serviceType: string;
  price: number;
  currency: string;
  durationMin: number;
}

interface Guide {
  id: string;
  name: string;
  bio: string;
  specialties: string[];
  destinations: string[];
  rating: number;
  reviewCount: number;
  avatarUrl: string | null;
  services: GuideService[];
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  planning: "Trip Planning",
  video_call: "Video Consultation",
  in_person_tour: "In-Person Tour",
};

export default function GuidePlusPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ guides: Guide[] }>("/api/guides")
      .then((payload) => setGuides(payload.guides))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load guides."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5630]/25 bg-[#ff5630]/8 px-4 py-2 text-sm font-medium text-[#ff5630]">
            Guide+
          </div>
          <h1 className="theme-heading mt-4 text-4xl font-semibold">Book a local guide</h1>
          <p className="theme-muted mt-4 text-sm leading-7">
            Connect with vetted Community Guides in Zimbabwe for trip planning, video consultations, and in-person tours.
          </p>
          <Link
            href="/community-guides/apply"
            className="mt-5 inline-flex h-10 items-center rounded-full border border-black/12 bg-black/[0.04] px-5 text-sm font-medium text-black/70 transition hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70 dark:hover:bg-white/[0.09]"
          >
            Become a guide
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-sm text-[#ff5630]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="theme-panel rounded-[28px] p-6 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-white/10" />
                <div className="mt-4 h-4 w-32 rounded bg-white/10" />
                <div className="mt-2 h-3 w-full rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : guides.length === 0 ? (
          <div className="theme-panel rounded-[28px] p-8 text-center">
            <p className="theme-muted text-sm">No guides are available right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={`/guide-plus/${guide.id}`}
                className="theme-panel group rounded-[28px] p-6 transition hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff5630]/15 text-lg font-semibold text-[#ff5630]">
                    {guide.avatarUrl ? (
                      <img
                        src={guide.avatarUrl}
                        alt={guide.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      guide.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="theme-heading font-semibold truncate">{guide.name}</span>
                      <VerifiedBadge size="sm" showLabel={false} />
                    </div>
                    {guide.rating > 0 ? (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-white/55">
                        <Star className="h-3 w-3 fill-[#fbbf24] text-[#fbbf24]" />
                        <span>{guide.rating.toFixed(1)}</span>
                        <span>({guide.reviewCount})</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <p className="theme-muted mt-4 text-sm leading-6 line-clamp-3">{guide.bio}</p>

                {guide.destinations.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#8dc9ff] mt-0.5 shrink-0" />
                    {guide.destinations.slice(0, 3).map((d) => (
                      <span key={d} className="text-xs text-white/55">{d}</span>
                    ))}
                    {guide.destinations.length > 3 ? (
                      <span className="text-xs text-white/35">+{guide.destinations.length - 3}</span>
                    ) : null}
                  </div>
                ) : null}

                {guide.services.length > 0 ? (
                  <div className="mt-4 space-y-2 border-t border-white/8 pt-4">
                    {guide.services.slice(0, 2).map((service) => (
                      <div key={service.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white/70">
                          <Clock className="h-3.5 w-3.5 text-white/35" />
                          <span>{SERVICE_TYPE_LABELS[service.serviceType] ?? service.serviceType}</span>
                        </div>
                        <span className="font-semibold text-white">
                          ${service.price} {service.currency}
                        </span>
                      </div>
                    ))}
                    {guide.services.length > 2 ? (
                      <div className="text-xs text-white/35">
                        +{guide.services.length - 2} more services
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
