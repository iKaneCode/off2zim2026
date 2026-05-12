import { Compass } from "lucide-react";
import SurfaceEntryPage from "@/components/layout/SurfaceEntryPage";
import { getSurfaceHref } from "@/lib/app-surface";

export default function ExplorerEntryPage() {
  return (
    <SurfaceEntryPage
      eyebrow="Traveler account"
      title="The traveler app is your personal Off2Zim account."
      body="Sign in to manage saved places, continue trip planning, review bookings, and return to your travel activity without going through the public homepage."
      icon={Compass}
      actions={[
        { label: "Traveler login", href: getSurfaceHref("explorer", "/login") },
        {
          label: "Create traveler account",
          href: getSurfaceHref("explorer", "/register"),
          variant: "secondary",
        },
        {
          label: "Open dashboard",
          href: getSurfaceHref("explorer", "/dashboard"),
          variant: "secondary",
        },
      ]}
      points={[
        "Sign in as a traveler",
        "Continue with trip plans and saved places",
        "Connected to the same platform as bookings, transport, and destination services",
      ]}
    />
  );
}
