"use client";

import {
  CheckIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export default function TripPlannerFeatures() {
  const features = [
    {
      icon: <UserGroupIcon className="h-8 w-8 text-[#5aa7ff]" />,
      title: "Local advice while you plan",
      description:
        "Bring verified local recommendations into the same place where you organize your trip.",
      benefits: [
        "Ask locals how to sequence your trip",
        "Find less obvious places to visit",
        "Blend logistics with practical local advice",
      ],
    },
    {
      icon: <ShieldCheckIcon className="h-8 w-8 text-[#7ddf8c]" />,
      title: "Trusted services built in",
      description:
        "The planner works best because it connects to verified stays, activities, and service providers.",
      benefits: [
        "Trust signals visible while planning",
        "More confidence before booking",
        "Less guesswork across providers",
      ],
    },
    {
      icon: <ClockIcon className="h-8 w-8 text-[#ffc247]" />,
      title: "Practical trip checks",
      description:
        "Warnings, sequencing, and budget visibility help make the itinerary practical, not just attractive on screen.",
      benefits: [
        "Spot travel gaps early",
        "Reduce timing conflicts",
        "Keep timing and cost visible",
      ],
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pt-6">
      <div className="theme-panel rounded-[32px] p-5 md:rounded-[36px] md:p-8">
        <div className="text-center">
          <p className="theme-label text-sm uppercase tracking-[0.28em]">
            Why it fits Off2Zim
          </p>
          <h2 className="theme-heading mt-3 text-3xl font-semibold md:text-4xl">
            Planning should feel as clear as discovery
          </h2>
          <p className="theme-muted mx-auto mt-4 max-w-2xl text-base leading-7">
            The planner works best when it gives you the same trust, destination focus, and human support found across the rest of Off2Zim.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3 md:gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="theme-card-soft rounded-[26px] p-5 md:p-6">
              {feature.icon}
              <h3 className="theme-heading mt-5 text-xl font-semibold">{feature.title}</h3>
              <p className="theme-muted mt-3 text-sm leading-6">{feature.description}</p>
              <ul className="mt-5 space-y-2">
                {feature.benefits.map((benefit) => (
                  <li key={benefit} className="theme-muted flex items-center gap-2 text-sm">
                    <CheckIcon className="h-4 w-4 text-[#7ddf8c]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-[#ff5630]/20 bg-[linear-gradient(135deg,rgba(255,86,48,0.16),rgba(255,255,255,0.92))] p-5 text-center dark:bg-[linear-gradient(135deg,rgba(255,86,48,0.14),rgba(17,17,17,0.95))] md:rounded-[30px] md:p-6">
          <h3 className="text-2xl font-semibold text-slate-950 dark:text-white">
            Need help shaping the route?
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-700 dark:text-white/75">
            Pair your itinerary with Community Guides for local recommendations, video consultations, or extra help on more complex multi-stop trips.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black">
              Find a local guide
            </button>
            <button className="rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-950 dark:border-white/20 dark:bg-white/10 dark:text-white">
              Learn about Guide+ support
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
