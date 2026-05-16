"use client";

import React, { useState, useEffect } from "react";
import SearchTab from "./SearchTab";
import StaysForm from "./forms/StaysForm";
import BusForm from "./forms/BusForm";
import CarRentalForm from "./forms/CarRentalForm";
import HouseboatForm from "./forms/HouseboatForm";
import ThingsToDoForm from "./forms/ThingsToDoForm";

export type SearchTabType =
  | "stays"
  | "bus"
  | "cars"
  | "cruises"
  | "things-to-do";

const tabs = [
  { id: "stays" as const, label: "Stays" },
  { id: "bus" as const, label: "Bus" },
  { id: "cars" as const, label: "Car Rental" },
  { id: "cruises" as const, label: "Houseboat" },
  { id: "things-to-do" as const, label: "Things to Do" },
];

export default function SearchSection() {
  const [activeTab, setActiveTab] = useState<SearchTabType>("stays");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const renderActiveForm = () => {
    switch (activeTab) {
      case "stays":
        return <StaysForm />;
      case "bus":
        return <BusForm />;
      case "cars":
        return <CarRentalForm />;
      case "cruises":
        return <HouseboatForm />;
      case "things-to-do":
        return <ThingsToDoForm />;
      default:
        return <StaysForm />;
    }
  };

  return (
    <section className="bg-gradient-to-br from-off2zim-primary/5 via-white/80 to-off2zim-sunset/5 backdrop-blur-sm py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Search Tabs */}
        <div
          className={`search-tabs justify-center mb-6 md:mb-8 ${
            isMobile ? "flex-wrap gap-2" : ""
          }`}
        >
          {tabs.map((tab) => (
            <SearchTab
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Search Forms */}
        <div className="max-w-4xl mx-auto">
          <div
            className={`search-form bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-off2zim-primary/10 ${
              isMobile ? "p-4" : "p-6"
            }`}
          >
            {renderActiveForm()}
          </div>
        </div>

        {/* Mobile Search Hint */}
        {isMobile && (
          <div className="mt-4 text-center">
            <p className="text-sm text-off2zim-earth/70">
              Swipe or scroll to explore all search options
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
