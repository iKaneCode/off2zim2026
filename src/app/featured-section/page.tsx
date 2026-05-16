"use client";

import { useState } from "react";
import {
  Award,
  BarChart3,
  Clock3,
  HeartHandshake,
  LucideIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import CompactPageHero from "@/components/ui/CompactPageHero";
import CompactRailCard from "@/components/ui/CompactRailCard";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";
import HorizontalRail from "@/components/ui/HorizontalRail";

const featuredItems = [
  {
    id: "1",
    name: "Victoria Falls Safari Lodge",
    type: "Accommodation",
    description:
      "A destination-defining stay with strong guest quality, community connection, and reliable traveler value.",
    image: "/images/victoria-falls.jpg",
    rating: 4.8,
    reviewCount: 342,
    location: "Victoria Falls",
    featuredScore: 94,
  },
  {
    id: "2",
    name: "Traditional Village Experience",
    type: "Activity",
    description:
      "A culture-led experience with strong local relevance and clear itinerary value for deeper Zimbabwe travel.",
    image: "/images/jacaranda.JPG",
    rating: 4.9,
    reviewCount: 128,
    location: "Masvingo",
    featuredScore: 91,
  },
  {
    id: "3",
    name: "Hwange Game Drive Specialists",
    type: "Service",
    description:
      "A trusted safari operator with durable route fit, quality consistency, and good local support signals.",
    image: "/images/hwange.jpg",
    rating: 4.7,
    reviewCount: 89,
    location: "Hwange",
    featuredScore: 88,
  },
];

const fairnessPrinciples = [
  {
    title: "Quality-based selection",
    text: "Reward strong guest outcomes and dependable service.",
  },
  {
    title: "Rotation fairness",
    text: "Spread premium visibility across qualifying providers over time.",
  },
  {
    title: "Local business preference",
    text: "Favor businesses with stronger Zimbabwean ownership and local value.",
  },
  {
    title: "Geographic balance",
    text: "Avoid overconcentrating exposure in only one destination.",
  },
  {
    title: "Community impact",
    text: "Reward providers contributing positively to local livelihoods and trust.",
  },
];

const featuredTabs: { key: "current" | "algorithm" | "metrics"; label: string; icon: LucideIcon }[] = [
  { key: "current", label: "Current featured set", icon: Award },
  { key: "algorithm", label: "How selection works", icon: BarChart3 },
  { key: "metrics", label: "Platform metrics", icon: TrendingUp },
];

const platformMetrics: { label: string; value: string; icon: LucideIcon }[] = [
  { label: "Providers in pool", value: "1,247", icon: HeartHandshake },
  { label: "Feature rotation", value: "7 days", icon: Clock3 },
  { label: "Fairness health", value: "96/100", icon: ShieldCheck },
];

export default function FeaturedSectionPage() {
  const [activeTab, setActiveTab] = useState<"current" | "algorithm" | "metrics">("current");

  return (
    <div className="theme-page pb-20">
      <CompactPageHero
        eyebrow="Featured framework"
        title="A clearer way to feature standout businesses and experiences across Zimbabwe"
        description="Featured visibility is based on trust, quality, and fair rotation."
        imageUrl="/images/destinations/eastern-highlands.jpg"
      />

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {featuredTabs.map(({ key, label, icon: Icon }) => {
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === key
                    ? "bg-slate-950 text-white dark:bg-white dark:text-black"
                    : "theme-button-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {activeTab === "current" ? (
          <>
          <CompactSectionHeader title="Current featured set" count={featuredItems.length} />
          <HorizontalRail itemClassName="w-[82vw] max-w-[320px] sm:w-[300px]">
            {featuredItems.map((item) => (
              <CompactRailCard
                key={item.id}
                title={item.name}
                imageUrl={item.image}
                meta={item.type}
                detail={item.location}
                badge={`${item.featuredScore}/100`}
                description={item.description}
              >
                <div className="flex items-center gap-2 text-[10px] text-white/82">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1">
                    <Award className="h-3 w-3 text-[#ffca74]" />
                    Featured
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1">
                    <Sparkles className="h-3 w-3 text-[#ffca74]" />
                    {item.rating} ({item.reviewCount})
                  </span>
                </div>
              </CompactRailCard>
            ))}
          </HorizontalRail>
          </>
        ) : activeTab === "algorithm" ? (
          <div className="theme-panel rounded-2xl p-4 md:p-5">
            <h2 className="theme-heading text-xl font-semibold">How selection works</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {fairnessPrinciples.map(({ title, text }) => (
                <div key={title} className="theme-card-soft rounded-xl p-3">
                  <div className="theme-heading text-base font-semibold">{title}</div>
                  <div className="theme-muted mt-2 text-sm leading-6">{text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {platformMetrics.map(({ label, value, icon: Icon }) => {
              return (
                <div key={label} className="theme-card rounded-xl p-4">
                  <Icon className="h-6 w-6 text-[#ff7352]" />
                  <div className="theme-muted mt-3 text-sm">{label}</div>
                  <div className="theme-heading mt-1 text-2xl font-semibold">{value}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
