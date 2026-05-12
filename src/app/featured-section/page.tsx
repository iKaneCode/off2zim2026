"use client";

import { useState } from "react";
import {
  Award,
  BarChart3,
  Clock3,
  HeartHandshake,
  LucideIcon,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

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
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="theme-panel-strong overflow-hidden rounded-[34px]">
          <div className="grid lg:grid-cols-[1.04fr_0.96fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="theme-chip inline-flex rounded-full px-4 py-2 text-xs uppercase tracking-[0.28em]">
                Featured framework
              </div>
              <h1 className="theme-heading mt-4 max-w-3xl text-4xl font-semibold md:text-5xl">
                A clearer way to feature standout businesses and experiences across Zimbabwe
              </h1>
              <p className="theme-muted mt-4 max-w-2xl text-sm leading-7 md:text-base">
                Featured visibility is based on trust, quality, and fair rotation.
              </p>
            </div>
            <div
              className="min-h-[260px] bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.52)), url('/images/destinations/eastern-highlands.jpg')",
              }}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
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
          <div className="grid gap-5 lg:grid-cols-3">
            {featuredItems.map((item) => (
              <article key={item.id} className="theme-card overflow-hidden">
                <div
                  className="min-h-[220px] bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.5)), url('${item.image}')`,
                  }}
                >
                  <div className="p-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-3 py-1 text-sm font-semibold text-white">
                      <Award className="h-4 w-4" />
                      Featured
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="theme-label text-xs uppercase tracking-[0.24em]">{item.type}</div>
                  <h2 className="theme-heading mt-2 text-xl font-semibold">{item.name}</h2>
                  <p className="theme-muted mt-3 text-sm leading-6">{item.description}</p>
                  <div className="theme-muted mt-4 flex flex-wrap gap-4 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#ff7352]" />
                      {item.location}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#ffca74]" />
                      {item.rating} ({item.reviewCount})
                    </span>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="theme-muted text-sm">Featured score</span>
                    <span className="theme-heading text-lg font-semibold">{item.featuredScore}/100</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === "algorithm" ? (
          <div className="theme-panel rounded-[30px] p-6 md:p-8">
            <h2 className="theme-heading text-2xl font-semibold">How selection works</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {fairnessPrinciples.map(({ title, text }) => (
                <div key={title} className="theme-card-soft rounded-[24px] p-4">
                  <div className="theme-heading text-base font-semibold">{title}</div>
                  <div className="theme-muted mt-2 text-sm leading-6">{text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {platformMetrics.map(({ label, value, icon: Icon }) => {
              return (
                <div key={label} className="theme-card rounded-[30px] p-6">
                  <Icon className="h-6 w-6 text-[#ff7352]" />
                  <div className="theme-muted mt-4 text-sm">{label}</div>
                  <div className="theme-heading mt-2 text-3xl font-semibold">{value}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
