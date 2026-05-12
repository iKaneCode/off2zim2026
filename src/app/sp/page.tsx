import { Building2 } from "lucide-react";
import SurfaceEntryPage from "@/components/layout/SurfaceEntryPage";
import { getSurfaceHref } from "@/lib/app-surface";

export default function ProviderEntryPage() {
  return (
    <SurfaceEntryPage
      eyebrow="Provider account"
      title="The provider app is your business dashboard."
      body="Sign in to manage listings, handle orders, complete verification, and run your Off2Zim business from one place."
      icon={Building2}
      actions={[
        { label: "Provider sign in", href: getSurfaceHref("provider", "/login") },
        {
          label: "Register your business",
          href: getSurfaceHref("provider", "/register"),
          variant: "secondary",
        },
        {
          label: "Open provider dashboard",
          href: getSurfaceHref("provider", "/provider-dashboard"),
          variant: "secondary",
        },
      ]}
      points={[
        "Separate provider access",
        "Listings, orders, and verification",
        "Connected to the same platform travelers use to discover and book",
      ]}
    />
  );
}
