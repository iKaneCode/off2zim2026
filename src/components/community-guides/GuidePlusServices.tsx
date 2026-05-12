"use client";

import React, { useState } from "react";
import {
  Star,
  MapPin,
  Clock,
  Users,
  Award,
  Mail,
  Calendar,
  Badge,
  Camera,
  Mountain,
  Utensils,
  Heart,
  type LucideIcon,
} from "lucide-react";

interface Guide {
  id: string;
  name: string;
  avatar: string;
  location: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  experience: string;
  languages: string[];
  isVerified: boolean;
  hourlyRate: number;
  responseTime: string;
  description: string;
  services: Service[];
  badges: string[];
}

interface Service {
  id: string;
  title: string;
  description: string;
  duration: string;
  price: number;
  maxGuests: number;
  category: string;
  icon: LucideIcon;
}

const mockGuides: Guide[] = [
  {
    id: "1",
    name: "Tendai Mukamuri",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    location: "Harare & Victoria Falls",
    specialties: ["Cultural Tours", "Photography", "Adventure"],
    rating: 4.9,
    reviewCount: 127,
    experience: "8 years",
    languages: ["English", "Shona", "Ndebele"],
    isVerified: true,
    hourlyRate: 25,
    responseTime: "Within 2 hours",
    description:
      "Born and raised in Zimbabwe, I'm passionate about sharing the authentic beauty and rich culture of my homeland. Specialized in off-the-beaten-path experiences.",
    badges: ["Photography Expert", "Cultural Specialist", "Adventure Guide"],
    services: [
      {
        id: "s1",
        title: "Victoria Falls Photography Tour",
        description:
          "Capture the falls from secret viewpoints only locals know",
        duration: "4 hours",
        price: 80,
        maxGuests: 6,
        category: "Photography",
        icon: Camera,
      },
      {
        id: "s2",
        title: "Harare Cultural Walking Tour",
        description:
          "Explore local markets, meet artisans, and taste authentic cuisine",
        duration: "3 hours",
        price: 45,
        maxGuests: 8,
        category: "Culture",
        icon: Users,
      },
    ],
  },
  {
    id: "2",
    name: "Chipo Ndoro",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
    location: "Bulawayo & Matobo",
    specialties: ["Wildlife", "History", "Rock Art"],
    rating: 4.8,
    reviewCount: 89,
    experience: "6 years",
    languages: ["English", "Ndebele", "Shona"],
    isVerified: true,
    hourlyRate: 22,
    responseTime: "Within 1 hour",
    description:
      "Wildlife enthusiast and history buff specializing in Matobo National Park. I help visitors connect with Zimbabwe's ancient heritage and incredible wildlife.",
    badges: ["Wildlife Expert", "Rock Art Specialist", "History Buff"],
    services: [
      {
        id: "s3",
        title: "Matobo Rock Art & Wildlife Tour",
        description:
          "Discover ancient San rock paintings and spot unique wildlife",
        duration: "6 hours",
        price: 95,
        maxGuests: 4,
        category: "Wildlife",
        icon: Mountain,
      },
      {
        id: "s4",
        title: "Traditional Cooking Experience",
        description:
          "Learn to prepare authentic Zimbabwean dishes with local families",
        duration: "3 hours",
        price: 35,
        maxGuests: 6,
        category: "Culinary",
        icon: Utensils,
      },
    ],
  },
];

const serviceCategories = [
  "All Services",
  "Cultural Tours",
  "Photography",
  "Wildlife",
  "Adventure",
  "Culinary",
  "Shopping",
  "Transportation",
];

export default function GuidePlusServices() {
  const [selectedCategory, setSelectedCategory] = useState("All Services");

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 mb-4">
            <Award className="w-8 h-8 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900">
              Guide+ services
            </h2>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Book personalized services with verified local experts. Guide+ professionals help travelers plan better trips and enjoy more personal experiences in Zimbabwe.
          </p>
        </div>

        {/* Service Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {serviceCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {mockGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              {/* Guide Header */}
              <div className="flex items-start space-x-4 mb-6">
                <div className="relative">
                  <img
                    src={guide.avatar}
                    alt={guide.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {guide.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1">
                      <Badge className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {guide.name}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="font-semibold">{guide.rating}</span>
                      <span className="text-gray-500">
                        ({guide.reviewCount})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{guide.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{guide.experience}</span>
                    </div>
                    <div className="text-green-600 font-medium">
                      ${guide.hourlyRate}/hour
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-3">
                    {guide.description}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {guide.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  {/* Languages */}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Languages:</span>{" "}
                    {guide.languages.join(", ")}
                  </div>
                </div>
              </div>

              {/* Guide Services */}
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-gray-900">
                  Available Services:
                </h4>
                {guide.services.map((service) => (
                  <div
                    key={service.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <service.icon className="w-5 h-5 text-blue-600" />
                        <h5 className="font-semibold text-gray-900">
                          {service.title}
                        </h5>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        ${service.price}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-3">
                      {service.description}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {service.duration}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Up to {service.maxGuests} guests
                        </span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium">
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guide Actions */}
              <div className="flex space-x-3">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  View Profile
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                  <Mail className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Become a Guide+ CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
          <Award className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
          <h3 className="text-2xl font-bold mb-4">
            Become a Guide+ Professional
          </h3>
          <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
            Share your local expertise and earn income by offering premium guide
            services. Join our verified community of professional local guides.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              Apply to Become a Guide+
            </button>
            <button className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
              Learn More
            </button>
          </div>
        </div>

        {/* Guide+ Benefits */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <Badge className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Verified & Trusted
            </h4>
            <p className="text-gray-600">
              All Guide+ professionals are verified through our comprehensive
              background check process.
            </p>
          </div>

          <div className="text-center">
            <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Quality Guaranteed
            </h4>
            <p className="text-gray-600">
              Premium experiences backed by our quality guarantee and 24/7
              customer support.
            </p>
          </div>

          <div className="text-center">
            <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Easy Booking
            </h4>
            <p className="text-gray-600">
              Simple booking process with instant confirmation and flexible
              cancellation policies.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
