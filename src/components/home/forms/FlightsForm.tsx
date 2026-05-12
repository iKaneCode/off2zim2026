"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Calendar, Users, Plane } from "lucide-react";
import DestinationDropdown from "./DestinationDropdown";
import DatePicker from "./DatePicker";

interface FlightsFormData {
  from: string;
  to: string;
  departDate: Date | null;
  returnDate: Date | null;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  class: "economy" | "business" | "first";
  tripType: "one-way" | "round-trip" | "multi-city";
}

function formatDateParam(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function FlightsForm() {
  const router = useRouter();
  const [tripType, setTripType] = useState<
    "one-way" | "round-trip" | "multi-city"
  >("round-trip");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showDepartDate, setShowDepartDate] = useState(false);
  const [showReturnDate, setShowReturnDate] = useState(false);
  const [showPassengersDropdown, setShowPassengersDropdown] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<FlightsFormData>({
    defaultValues: {
      from: "",
      to: "",
      departDate: null,
      returnDate: null,
      passengers: {
        adults: 1,
        children: 0,
        infants: 0,
      },
      class: "economy",
      tripType: "round-trip",
    },
  });

  const formData = watch();

  const onSubmit = (data: FlightsFormData) => {
    const passengers =
      data.passengers.adults + data.passengers.children + data.passengers.infants;
    const params = new URLSearchParams();
    params.set("listingType", "transport");
    params.set("search", [data.from, data.to].filter(Boolean).join(" "));
    params.set("passengers", String(passengers));
    params.set("travelers", String(passengers));
    params.set("title", [data.from, data.to].filter(Boolean).join(" to ") || "Zimbabwe flight itinerary");
    params.set("class", data.class);
    const departDate = formatDateParam(data.departDate);
    const returnDate = formatDateParam(data.returnDate);
    if (departDate) params.set("startDate", departDate);
    if (returnDate && data.tripType === "round-trip") params.set("endDate", returnDate);
    router.push(`/trip-planner/search?${params.toString()}`);
  };

  const airports = [
    {
      code: "HRE",
      city: "Harare",
      name: "Robert Gabriel Mugabe International Airport",
    },
    {
      code: "BUQ",
      city: "Bulawayo",
      name: "Joshua Mqabuko Nkomo International Airport",
    },
    { code: "VFA", city: "Victoria Falls", name: "Victoria Falls Airport" },
    {
      code: "JNB",
      city: "Johannesburg",
      name: "OR Tambo International Airport",
    },
    { code: "CPT", city: "Cape Town", name: "Cape Town International Airport" },
    { code: "DUR", city: "Durban", name: "King Shaka International Airport" },
    {
      code: "LUN",
      city: "Lusaka",
      name: "Kenneth Kaunda International Airport",
    },
    {
      code: "NBO",
      city: "Nairobi",
      name: "Jomo Kenyatta International Airport",
    },
    { code: "ADD", city: "Addis Ababa", name: "Bole International Airport" },
    { code: "LHR", city: "London", name: "Heathrow Airport" },
  ];

  const popularRoutes = [
    {
      from: "HRE",
      to: "JNB",
      fromCity: "Harare",
      toCity: "Johannesburg",
      price: "USD 280",
    },
    {
      from: "HRE",
      to: "CPT",
      fromCity: "Harare",
      toCity: "Cape Town",
      price: "USD 320",
    },
    {
      from: "BUQ",
      to: "JNB",
      fromCity: "Bulawayo",
      toCity: "Johannesburg",
      price: "USD 260",
    },
    {
      from: "VFA",
      to: "JNB",
      fromCity: "Victoria Falls",
      toCity: "Johannesburg",
      price: "USD 240",
    },
  ];

  const totalPassengers =
    formData.passengers.adults +
    formData.passengers.children +
    formData.passengers.infants;

  const formatAirportDisplay = (code: string) => {
    const airport = airports.find((a) => a.code === code);
    return airport ? `${airport.city} (${airport.code})` : code;
  };

  return (
    <div className="space-y-6">
      {/* Trip Type Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        {(["one-way", "round-trip", "multi-city"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setTripType(type);
              setValue("tripType", type);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tripType === type
                ? "bg-white text-primary shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {type === "one-way"
              ? "One-way"
              : type === "round-trip"
                ? "Round-trip"
                : "Multi-city"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* From */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <div className="relative">
              <div
                className="input cursor-pointer flex items-center justify-between"
                onClick={() => setShowFromDropdown(!showFromDropdown)}
              >
                <div className="flex items-center space-x-2">
                  <Plane className="w-4 h-4 text-gray-400" />
                  <span
                    className={
                      formData.from ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {formData.from
                      ? formatAirportDisplay(formData.from)
                      : "Select departure"}
                  </span>
                </div>
              </div>
              {showFromDropdown && (
                <DestinationDropdown
                  isOpen={showFromDropdown}
                  destinations={airports.map((a) => `${a.city} (${a.code})`)}
                  onSelect={(destination) => {
                    const code =
                      destination.match(/\(([^)]+)\)/)?.[1] || destination;
                    setValue("from", code);
                    setShowFromDropdown(false);
                  }}
                  onClose={() => setShowFromDropdown(false)}
                />
              )}
            </div>
          </div>

          {/* To */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <div className="relative">
              <div
                className="input cursor-pointer flex items-center justify-between"
                onClick={() => setShowToDropdown(!showToDropdown)}
              >
                <div className="flex items-center space-x-2">
                  <Plane className="w-4 h-4 text-gray-400 transform rotate-90" />
                  <span
                    className={formData.to ? "text-gray-900" : "text-gray-500"}
                  >
                    {formData.to
                      ? formatAirportDisplay(formData.to)
                      : "Select destination"}
                  </span>
                </div>
              </div>
              {showToDropdown && (
                <DestinationDropdown
                  isOpen={showToDropdown}
                  destinations={airports.map((a) => `${a.city} (${a.code})`)}
                  onSelect={(destination) => {
                    const code =
                      destination.match(/\(([^)]+)\)/)?.[1] || destination;
                    setValue("to", code);
                    setShowToDropdown(false);
                  }}
                  onClose={() => setShowToDropdown(false)}
                />
              )}
            </div>
          </div>

          {/* Departure Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departure
            </label>
            <div className="relative">
              <div
                className="input cursor-pointer flex items-center justify-between"
                onClick={() => setShowDepartDate(!showDepartDate)}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span
                    className={
                      formData.departDate ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {formData.departDate
                      ? formData.departDate.toLocaleDateString()
                      : "Select date"}
                  </span>
                </div>
              </div>
              {showDepartDate && (
                <DatePicker
                  isOpen={showDepartDate}
                  selectedDate={formData.departDate}
                  onDateSelect={(date) => {
                    setValue("departDate", date);
                    setShowDepartDate(false);
                  }}
                  onClose={() => setShowDepartDate(false)}
                  minDate={new Date()}
                />
              )}
            </div>
          </div>

          {/* Return Date (only for round-trip) */}
          {tripType === "round-trip" && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return
              </label>
              <div className="relative">
                <div
                  className="input cursor-pointer flex items-center justify-between"
                  onClick={() => setShowReturnDate(!showReturnDate)}
                >
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span
                      className={
                        formData.returnDate ? "text-gray-900" : "text-gray-500"
                      }
                    >
                      {formData.returnDate
                        ? formData.returnDate.toLocaleDateString()
                        : "Select date"}
                    </span>
                  </div>
                </div>
                {showReturnDate && (
                  <DatePicker
                    isOpen={showReturnDate}
                    selectedDate={formData.returnDate}
                    onDateSelect={(date) => {
                      setValue("returnDate", date);
                      setShowReturnDate(false);
                    }}
                    onClose={() => setShowReturnDate(false)}
                    minDate={formData.departDate || new Date()}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Passengers and Class */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Passengers */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passengers
            </label>
            <div className="relative">
              <div
                className="input cursor-pointer flex items-center justify-between"
                onClick={() =>
                  setShowPassengersDropdown(!showPassengersDropdown)
                }
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>
                    {totalPassengers} passenger
                    {totalPassengers !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {showPassengersDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Adults</div>
                      <div className="text-xs text-gray-500">12+ years</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "passengers.adults",
                            Math.max(1, formData.passengers.adults - 1)
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">
                        {formData.passengers.adults}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "passengers.adults",
                            Math.min(9, formData.passengers.adults + 1)
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Children</div>
                      <div className="text-xs text-gray-500">2-11 years</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "passengers.children",
                            Math.max(0, formData.passengers.children - 1)
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">
                        {formData.passengers.children}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "passengers.children",
                            Math.min(9, formData.passengers.children + 1)
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Infants</div>
                      <div className="text-xs text-gray-500">Under 2 years</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "passengers.infants",
                            Math.max(0, formData.passengers.infants - 1)
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">
                        {formData.passengers.infants}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "passengers.infants",
                            Math.min(
                              formData.passengers.adults,
                              formData.passengers.infants + 1
                            )
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassengersDropdown(false)}
                    className="w-full btn-primary"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class
            </label>
            <select {...register("class")} className="input">
              <option value="economy">Economy</option>
              <option value="business">Business</option>
              <option value="first">First Class</option>
            </select>
          </div>
        </div>

        {/* Popular Routes */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Popular Routes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {popularRoutes.map((route, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setValue("from", route.from);
                  setValue("to", route.to);
                }}
                className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary transition-colors group"
              >
                <div className="font-medium text-sm text-gray-900 group-hover:text-primary">
                  {route.fromCity} → {route.toCity}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  from{" "}
                  <span className="font-medium text-primary">
                    {route.price}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <button type="submit" className="w-full btn-primary">
          Search Flights
        </button>
      </form>
    </div>
  );
}
