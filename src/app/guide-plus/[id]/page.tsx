"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Star, Video, Map, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";

interface GuideService {
  id: string;
  title: string;
  description: string;
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
  languages: string[];
  destinations: string[];
  rating: number;
  reviewCount: number;
  avatarUrl: string | null;
  services: GuideService[];
}

const SERVICE_ICONS: Record<string, typeof BookOpen> = {
  planning: BookOpen,
  video_call: Video,
  in_person_tour: Map,
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  planning: "Trip Planning",
  video_call: "Video Consultation",
  in_person_tour: "In-Person Tour",
};

export default function GuidePlusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingService, setBookingService] = useState<GuideService | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    apiFetch<{ guide: Guide }>(`/api/guides/${id}`)
      .then((payload) => setGuide(payload.guide))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load guide."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingService || !scheduledAt) return;
    setBooking(true);
    setBookingError("");
    try {
      await apiFetch(`/api/guides/${id}/book`, {
        method: "POST",
        body: JSON.stringify({ serviceId: bookingService.id, scheduledAt, notes }),
      });
      setBooked(true);
      setBookingService(null);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Unable to complete booking.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center">
        <p className="theme-muted text-sm">Loading guide...</p>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center p-8">
        <div className="theme-panel max-w-sm rounded-[28px] p-6 text-center">
          <p className="theme-muted text-sm">{error || "Guide not found."}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[#ff5630] px-5 text-sm font-semibold text-white"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="theme-muted mb-4 flex items-center gap-2 text-sm hover:text-current"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to guides
        </button>

        {booked ? (
          <div className="theme-panel rounded-2xl p-6 text-center">
            <Calendar className="mx-auto h-12 w-12 text-[#4ade80]" />
            <h2 className="theme-heading mt-5 text-2xl font-semibold">Booking confirmed</h2>
            <p className="theme-muted mt-3 text-sm">
              Your Guide+ session is booked. {guide.name} will confirm the details shortly.
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Left — guide details */}
          <div className="space-y-4">
            <div className="theme-panel rounded-2xl p-4 md:p-5">
              <div className="flex items-start gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#ff5630]/15 text-2xl font-semibold text-[#ff5630]">
                  {guide.avatarUrl ? (
                    <img
                      src={guide.avatarUrl}
                      alt={guide.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    guide.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="theme-heading text-2xl font-semibold">{guide.name}</h1>
                    <VerifiedBadge />
                  </div>
                  {guide.rating > 0 ? (
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-white/55">
                      <Star className="h-4 w-4 fill-[#fbbf24] text-[#fbbf24]" />
                      <span>{guide.rating.toFixed(1)}</span>
                      <span>· {guide.reviewCount} reviews</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <p className="theme-muted mt-4 text-sm leading-6">{guide.bio}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {guide.specialties.length > 0 ? (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/35 mb-2">Specialties</div>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.specialties.map((s) => (
                        <span key={s} className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/65">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {guide.languages.length > 0 ? (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/35 mb-2">Languages</div>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.languages.map((l) => (
                        <span key={l} className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/65">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {guide.destinations.length > 0 ? (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/35 mb-2">Destinations</div>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.destinations.map((d) => (
                        <span key={d} className="inline-flex items-center gap-1 rounded-full bg-[#13283a] px-2.5 py-1 text-xs text-[#8dc9ff]">
                          <MapPin className="h-3 w-3" />
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Services */}
            <div>
              <h2 className="theme-heading mb-4 text-xl font-semibold">Available services</h2>
              <div className="space-y-3">
                {guide.services.map((service) => {
                  const Icon = SERVICE_ICONS[service.serviceType] ?? BookOpen;
                  return (
                    <div
                      key={service.id}
                      className="theme-panel rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#ff5630]/12 text-[#ff5630]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="theme-heading font-semibold">{service.title}</div>
                            <div className="theme-muted mt-0.5 text-xs">
                              {SERVICE_TYPE_LABELS[service.serviceType]} ·{" "}
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {service.durationMin >= 60
                                  ? `${Math.round(service.durationMin / 60)}h`
                                  : `${service.durationMin}min`}
                              </span>
                            </div>
                            <p className="theme-muted mt-2 text-sm leading-6">{service.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="theme-heading text-lg font-semibold">
                            ${service.price}
                          </div>
                          <div className="theme-muted text-xs">{service.currency}</div>
                        </div>
                      </div>
                      {user ? (
                        <button
                          onClick={() => {
                            setBookingService(service);
                            setBooked(false);
                          }}
                          className="mt-4 w-full rounded-full bg-[#ff5630] py-2.5 text-sm font-semibold text-white"
                        >
                          Book this session
                        </button>
                      ) : (
                        <a
                          href={`/login?redirect=/guide-plus/${id}`}
                          className="mt-4 block w-full rounded-full border border-white/15 py-2.5 text-center text-sm font-medium text-white/70"
                        >
                          Traveler login to book
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right — booking form */}
          {bookingService ? (
            <div className="lg:sticky lg:top-6 h-fit">
              <div className="theme-panel rounded-[28px] p-6">
                <h3 className="theme-heading font-semibold">Book: {bookingService.title}</h3>
                <div className="mt-1 text-sm text-white/50">
                  ${bookingService.price} {bookingService.currency}
                </div>

                <form onSubmit={handleBook} className="mt-5 space-y-4">
                  <div>
                    <label className="theme-muted mb-1.5 block text-sm">
                      Preferred date &amp; time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="theme-input h-12 w-full rounded-2xl px-4 text-sm"
                    />
                  </div>
                  <div>
                    <label className="theme-muted mb-1.5 block text-sm">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="theme-input w-full rounded-2xl px-4 py-3 text-sm resize-none"
                      placeholder="Any specific requirements or questions..."
                    />
                  </div>

                  {bookingError ? (
                    <div className="rounded-2xl bg-[#2d1714] px-4 py-3 text-sm text-[#ff8a78]">
                      {bookingError}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={booking}
                    className="w-full rounded-full bg-[#ff5630] py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {booking ? "Confirming..." : "Confirm session"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingService(null)}
                    className="w-full rounded-full border border-white/10 py-3 text-sm text-white/60"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
