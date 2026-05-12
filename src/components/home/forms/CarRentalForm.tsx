"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Clock, Car } from "lucide-react";
import DestinationDropdown from "./DestinationDropdown";
import DatePicker from "./DatePicker";

interface CarRentalFormData {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: Date | null;
  pickupTime: string;
  dropoffDate: Date | null;
  dropoffTime: string;
  driverAge: string;
  sameLocation: boolean;
}

function formatDateParam(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CarRentalForm() {
  const router = useRouter();
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);
  const [showPickupDate, setShowPickupDate] = useState(false);
  const [showDropoffDate, setShowDropoffDate] = useState(false);

  const { register, handleSubmit, watch, setValue } =
    useForm<CarRentalFormData>({
      defaultValues: {
        pickupLocation: "",
        dropoffLocation: "",
        pickupDate: null,
        pickupTime: "10:00",
        dropoffDate: null,
        dropoffTime: "10:00",
        driverAge: "25-65",
        sameLocation: true,
      },
    });

  const formData = watch();

  const onSubmit = (data: CarRentalFormData) => {
    const params = new URLSearchParams();
    params.set("listingType", "transport");
    params.set(
      "search",
      [data.pickupLocation, data.sameLocation ? "" : data.dropoffLocation]
        .filter(Boolean)
        .join(" ")
    );
    params.set("driverAge", data.driverAge);
    params.set(
      "title",
      `${data.pickupLocation || "Zimbabwe"} car rental itinerary`
    );
    const pickupDate = formatDateParam(data.pickupDate);
    const dropoffDate = formatDateParam(data.dropoffDate);
    if (pickupDate) params.set("startDate", pickupDate);
    if (dropoffDate) params.set("endDate", dropoffDate);
    router.push(`/trip-planner/search?${params.toString()}`);
  };

  const locations = [
    "Harare City Center",
    "Harare Airport (HRE)",
    "Bulawayo City Center",
    "Bulawayo Airport (BUQ)",
    "Victoria Falls Airport (VFA)",
    "Victoria Falls Town",
    "Mutare City Center",
    "Gweru City Center",
    "Masvingo City Center",
    "Kariba Town",
  ];

  const timeSlots = [
    "06:00",
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
  ];

  const carTypes = [
    {
      type: "Economy",
      examples: "Toyota Vitz, Suzuki Swift",
      price: "USD 25/day",
      features: ["Manual", "4 seats", "AC"],
    },
    {
      type: "Compact",
      examples: "Toyota Aqua, Honda Fit",
      price: "USD 35/day",
      features: ["Manual/Auto", "5 seats", "AC"],
    },
    {
      type: "SUV",
      examples: "Toyota RAV4, Honda CR-V",
      price: "USD 55/day",
      features: ["4WD", "7 seats", "AC"],
    },
    {
      type: "Luxury",
      examples: "BMW X5, Mercedes GLE",
      price: "USD 95/day",
      features: ["Auto", "Premium", "Full features"],
    },
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Same Location Toggle */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="sameLocation"
            {...register("sameLocation")}
            onChange={(e) => {
              setValue("sameLocation", e.target.checked);
              if (e.target.checked) {
                setValue("dropoffLocation", formData.pickupLocation);
              }
            }}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="sameLocation" className="text-sm text-gray-700">
            Return car to same location
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pickup Location */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location
            </label>
            <div className="relative">
              <div
                className="input cursor-pointer flex items-center justify-between"
                onClick={() => setShowPickupDropdown(!showPickupDropdown)}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span
                    className={
                      formData.pickupLocation
                        ? "text-gray-900"
                        : "text-gray-500"
                    }
                  >
                    {formData.pickupLocation || "Select pickup location"}
                  </span>
                </div>
              </div>
              {showPickupDropdown && (
                <DestinationDropdown
                  isOpen={showPickupDropdown}
                  destinations={locations}
                  onSelect={(location) => {
                    setValue("pickupLocation", location);
                    if (formData.sameLocation) {
                      setValue("dropoffLocation", location);
                    }
                    setShowPickupDropdown(false);
                  }}
                  onClose={() => setShowPickupDropdown(false)}
                />
              )}
            </div>
          </div>

          {/* Dropoff Location */}
          {!formData.sameLocation && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dropoff Location
              </label>
              <div className="relative">
                <div
                  className="input cursor-pointer flex items-center justify-between"
                  onClick={() => setShowDropoffDropdown(!showDropoffDropdown)}
                >
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span
                      className={
                        formData.dropoffLocation
                          ? "text-gray-900"
                          : "text-gray-500"
                      }
                    >
                      {formData.dropoffLocation || "Select dropoff location"}
                    </span>
                  </div>
                </div>
                {showDropoffDropdown && (
                  <DestinationDropdown
                    isOpen={showDropoffDropdown}
                    destinations={locations}
                    onSelect={(location) => {
                      setValue("dropoffLocation", location);
                      setShowDropoffDropdown(false);
                    }}
                    onClose={() => setShowDropoffDropdown(false)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pickup Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Date
            </label>
            <div className="relative">
              <div
                className="input cursor-pointer flex items-center justify-between"
                onClick={() => setShowPickupDate(!showPickupDate)}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span
                    className={
                      formData.pickupDate ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {formData.pickupDate
                      ? formData.pickupDate.toLocaleDateString()
                      : "Select date"}
                  </span>
                </div>
              </div>
              {showPickupDate && (
                <DatePicker
                  isOpen={showPickupDate}
                  selectedDate={formData.pickupDate}
                  onDateSelect={(date) => {
                    setValue("pickupDate", date);
                    setShowPickupDate(false);
                  }}
                  onClose={() => setShowPickupDate(false)}
                  minDate={new Date()}
                />
              )}
            </div>
          </div>

          {/* Pickup Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select {...register("pickupTime")} className="input pl-10">
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dropoff Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dropoff Date
            </label>
            <div className="relative">
              <div
                className="input cursor-pointer flex items-center justify-between"
                onClick={() => setShowDropoffDate(!showDropoffDate)}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span
                    className={
                      formData.dropoffDate ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {formData.dropoffDate
                      ? formData.dropoffDate.toLocaleDateString()
                      : "Select date"}
                  </span>
                </div>
              </div>
              {showDropoffDate && (
                <DatePicker
                  isOpen={showDropoffDate}
                  selectedDate={formData.dropoffDate}
                  onDateSelect={(date) => {
                    setValue("dropoffDate", date);
                    setShowDropoffDate(false);
                  }}
                  onClose={() => setShowDropoffDate(false)}
                  minDate={formData.pickupDate || new Date()}
                />
              )}
            </div>
          </div>

          {/* Dropoff Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dropoff Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select {...register("dropoffTime")} className="input pl-10">
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Driver Age */}
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Driver Age
          </label>
          <select {...register("driverAge")} className="input">
            <option value="18-24">18-24 years</option>
            <option value="25-65">25-65 years</option>
            <option value="65+">65+ years</option>
          </select>
        </div>

        {/* Car Types */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Popular Car Types
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {carTypes.map((car, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-3 hover:border-primary transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Car className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                  <span className="font-medium text-sm text-gray-900 group-hover:text-primary">
                    {car.type}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">{car.examples}</div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {car.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs font-medium text-primary mt-2">
                  {car.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <button type="submit" className="w-full btn-primary">
          Search Cars
        </button>
      </form>
    </div>
  );
}
