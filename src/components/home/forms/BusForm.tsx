"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import DestinationDropdown from "./DestinationDropdown";
import DatePicker from "./DatePicker";

interface BusFormData {
  from: string;
  to: string;
  departDate: Date | null;
  returnDate: Date | null;
  passengers: number;
  tripType: "one-way" | "round-trip";
}

function formatDateParam(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BusForm() {
  const router = useRouter();
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showDepartDate, setShowDepartDate] = useState(false);
  const [showReturnDate, setShowReturnDate] = useState(false);

  const { handleSubmit, watch, setValue } = useForm<BusFormData>({
    defaultValues: {
      from: "",
      to: "",
      departDate: null,
      returnDate: null,
      passengers: 1,
      tripType: "one-way",
    },
  });

  const formData = watch();

  const onSubmit = (data: BusFormData) => {
    const params = new URLSearchParams();
    params.set("listingType", "transport");
    params.set("search", [data.from, data.to].filter(Boolean).join(" "));
    params.set("passengers", String(data.passengers));
    params.set("travelers", String(data.passengers));
    params.set("title", [data.from, data.to].filter(Boolean).join(" to ") || "Zimbabwe bus itinerary");
    const departDate = formatDateParam(data.departDate);
    const returnDate = formatDateParam(data.returnDate);
    if (departDate) params.set("startDate", departDate);
    if (returnDate && data.tripType === "round-trip") params.set("endDate", returnDate);
    router.push(`/trip-planner/search?${params.toString()}`);
  };

  const busDestinations = [
    "Harare",
    "Bulawayo",
    "Mutare",
    "Gweru",
    "Masvingo",
    "Chitungwiza",
    "Kwekwe",
    "Kadoma",
    "Marondera",
    "Norton",
  ];

  const popularRoutes = [
    { from: "Harare", to: "Bulawayo", duration: "4h 30m", price: "USD 25" },
    { from: "Harare", to: "Mutare", duration: "3h 15m", price: "USD 20" },
    {
      from: "Bulawayo",
      to: "Victoria Falls",
      duration: "2h 45m",
      price: "USD 18",
    },
    { from: "Harare", to: "Gweru", duration: "2h 30m", price: "USD 15" },
  ];

  return (
    <div className="space-y-6">
      {/* Trip Type Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => {
            setTripType("one-way");
            setValue("tripType", "one-way");
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tripType === "one-way"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          One-way
        </button>
        <button
          type="button"
          onClick={() => {
            setTripType("round-trip");
            setValue("tripType", "round-trip");
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tripType === "round-trip"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Round-trip
        </button>
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
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span
                    className={
                      formData.from ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {formData.from || "Select departure city"}
                  </span>
                </div>
              </div>
              {showFromDropdown && (
                <DestinationDropdown
                  isOpen={showFromDropdown}
                  destinations={busDestinations}
                  onSelect={(destination) => {
                    setValue("from", destination);
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
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span
                    className={formData.to ? "text-gray-900" : "text-gray-500"}
                  >
                    {formData.to || "Select destination"}
                  </span>
                </div>
              </div>
              {showToDropdown && (
                <DestinationDropdown
                  isOpen={showToDropdown}
                  destinations={busDestinations}
                  onSelect={(destination) => {
                    setValue("to", destination);
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

          {/* Passengers */}
          <div className={tripType === "one-way" ? "md:col-start-4" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passengers
            </label>
            <div className="input flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span>
                  {formData.passengers} passenger
                  {formData.passengers !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    setValue("passengers", Math.max(1, formData.passengers - 1))
                  }
                  className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue("passengers", Math.min(9, formData.passengers + 1))
                  }
                  className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>
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
                  {route.from} → {route.to}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {route.duration}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {route.price}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <button type="submit" className="w-full btn-primary">
          Search Buses
        </button>
      </form>
    </div>
  );
}
