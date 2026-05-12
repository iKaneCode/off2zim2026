import {
  BadgeCheck,
  Building2,
  Compass,
  FileSearch,
  Flag,
  ListChecks,
  LayoutDashboard,
  MapPinned,
  MessageCircleQuestion,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import type { AppSurface } from "@/lib/app-surface";

type NonPublicSurface = Exclude<AppSurface, "public">;

export const portalMeta: Record<
  NonPublicSurface,
  {
    label: string;
    title: string;
    description: string;
    href: string;
    icon: typeof LayoutDashboard;
  }
> = {
  explorer: {
    label: "Explorer",
    title: "Traveler workspace",
    description: "Trips, bookings, saved places, and account details.",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  provider: {
    label: "Service Provider",
    title: "Provider workspace",
    description: "Listings, orders, verification, and business tools.",
    href: "/provider-dashboard",
    icon: Building2,
  },
  admin: {
    label: "Admin",
    title: "Admin workspace",
    description: "Operations, onboarding, account reviews, and platform oversight.",
    href: "/admin/overview",
    icon: ShieldCheck,
  },
};

export type PortalLink = {
  label: string;
  href: string;
  icon?: typeof LayoutDashboard;
  section?: string;
};

export const portalLinks: Record<NonPublicSurface, PortalLink[]> = {
  explorer: [
    { label: "Workspace", href: "/dashboard" },
    { label: "Trip planner", href: "/trip-planner" },
    { label: "Featured", href: "/featured" },
    { label: "Bookings", href: "/bookings" },
    { label: "Shop", href: "/shop" },
    { label: "Cart", href: "/cart" },
    { label: "Profile", href: "/profile" },
  ],
  provider: [
    { label: "Dashboard", href: "/provider-dashboard" },
    { label: "Listings", href: "/provider-dashboard?tab=listings" },
    { label: "Products", href: "/provider-dashboard?tab=shop" },
    { label: "Orders", href: "/provider-dashboard?tab=orders" },
    { label: "Subscriptions", href: "/provider-dashboard?tab=subscriptions" },
    { label: "Verification", href: "/provider-dashboard?tab=verification" },
  ],
  admin: [
    {
      label: "Overview",
      href: "/admin/overview",
      icon: LayoutDashboard,
      section: "Operations",
    },
    {
      label: "Provider onboarding",
      href: "/admin/providers",
      icon: BadgeCheck,
      section: "Providers",
    },
    {
      label: "Listings",
      href: "/admin/listings",
      icon: ShoppingBag,
      section: "Providers",
    },
    {
      label: "Bookings",
      href: "/admin/bookings",
      icon: ListChecks,
      section: "Travelers",
    },
    {
      label: "Disputes",
      href: "/admin/disputes",
      icon: Flag,
      section: "Risk",
    },
    {
      label: "Compliance reviews",
      href: "/admin/providers",
      icon: FileSearch,
      section: "Risk",
    },
    {
      label: "Guide applications",
      href: "/admin/guide-applications",
      icon: MessageCircleQuestion,
      section: "Community",
    },
    {
      label: "Revenue",
      href: "/admin/revenue",
      icon: ShoppingBag,
      section: "Monetization",
    },
    {
      label: "Featured",
      href: "/admin/featured",
      icon: Sparkles,
      section: "Monetization",
    },
  ],
};

export const authSurfaceCopy: Record<
  AppSurface,
  {
    login: {
      eyebrow: string;
      title: string;
      body: string;
      cardA: string;
      cardB: string;
      cardABody: string;
      cardBBody: string;
    };
    register: {
      eyebrow: string;
      title: string;
      body: string;
      cardA: string;
      cardB: string;
      cardABody: string;
      cardBBody: string;
    };
  }
> = {
  public: {
    login: {
      eyebrow: "Explorer access",
      title: "Welcome back to your travel account.",
      body: "Saved places, trip plans, bookings, and account tools stay in one place.",
      cardA: "Continue planning",
      cardB: "One account across the platform",
      cardABody: "Return to your plans without starting from scratch.",
      cardBBody: "Travel tools, bookings, and provider connections stay under one login.",
    },
    register: {
      eyebrow: "Create account",
      title: "Create the account that fits how you travel or do business.",
      body: "Traveler and provider accounts start from one clear entry point.",
      cardA: "For explorers",
      cardB: "For providers",
      cardABody: "Save places, plan days, and manage every booking in one view.",
      cardBBody: "List your business, manage orders, and complete verification.",
    },
  },
  explorer: {
    login: {
      eyebrow: "Explorer access",
      title: "Sign in to your travel account.",
      body: "Trips, saved places, bookings, and route planning stay in one place.",
      cardA: "Continue your trip plans",
      cardB: "Keep everything together",
      cardABody: "Resume your itinerary and bookings without losing your progress.",
      cardBBody: "Planning, saved places, and booking actions stay connected.",
    },
    register: {
      eyebrow: "Create traveler account",
      title: "Create your travel account.",
      body: "Start saving places, building itineraries, and organizing bookings.",
      cardA: "Plan your trip in one place",
      cardB: "Use one account across Off2Zim",
      cardABody: "Destinations, stays, activities, and planning tools stay connected.",
      cardBBody: "Discover, plan, and book with one traveler account.",
    },
  },
  provider: {
    login: {
      eyebrow: "Provider access",
      title: "Sign in to your business dashboard.",
      body: "Listings, order flow, verification, and company tools stay in one place.",
      cardA: "Manage live listings",
      cardB: "Track orders and company status",
      cardABody: "Get back to operational work without digging through the public site.",
      cardBBody: "One provider account gives you access to listings, verification, and orders.",
    },
    register: {
      eyebrow: "Create provider account",
      title: "Create your provider account.",
      body: "Set up your business account first, then complete onboarding inside the provider tools.",
      cardA: "Create your business account",
      cardB: "Finish verification in your dashboard",
      cardABody: "Get your business onto the platform without a long first form.",
      cardBBody: "Complete verification, listings, and order setup after account creation.",
    },
  },
  admin: {
    login: {
      eyebrow: "Admin access",
      title: "Sign in to the admin workspace.",
      body: "Bookings, disputes, providers, and reviews stay behind one secure admin login.",
      cardA: "Review providers and issues",
      cardB: "Oversee platform activity",
      cardABody: "Go straight to reviews, approvals, and issue handling.",
      cardBBody: "Monitor provider activity, bookings, and disputes from one place.",
    },
    register: {
      eyebrow: "Admin access",
      title: "Admin accounts are provisioned centrally.",
      body: "Use your assigned operations credentials to enter the admin workspace.",
      cardA: "Operations-only access",
      cardB: "Shared backend, stricter access",
      cardABody: "Admin accounts should be issued through secure internal workflows.",
      cardBBody: "Admin access stays safer when it is managed separately.",
    },
  },
};

export const explorerWorkspaceCards = [
  {
    title: "Profile",
    body: "Your travel details, identity information, and account settings.",
    href: "/profile",
    label: "Open profile",
    icon: Compass,
    accent: "text-[#ff7352]",
  },
  {
    title: "Bookings",
    body: "Current reservations, confirmations, and next actions.",
    href: "/bookings",
    label: "View bookings",
    icon: Users,
    accent: "text-[#8cf0a1]",
  },
  {
    title: "Planner studio",
    body: "Build your route, organize each day, and keep your trip on track.",
    href: "/trip-planner",
    label: "Open planner",
    icon: MapPinned,
    accent: "text-[#5aa7ff]",
  },
  {
    title: "Shop Zimbabwe",
    body: "Handcrafted goods, art, and authentic products from local vendors.",
    href: "/shop",
    label: "Browse shop",
    icon: ShoppingBag,
    accent: "text-[#8dc9ff]",
  },
];
