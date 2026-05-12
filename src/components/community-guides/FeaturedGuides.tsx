"use client";

import React from "react";
import {
  Star,
  MapPin,
  Award,
  Calendar,
  Users,
  ChevronRight,
  Badge,
  Heart,
  MessageCircle,
} from "lucide-react";

interface FeaturedGuide {
  id: string;
  name: string;
  avatar: string;
  coverImage: string;
  location: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  totalBookings: number;
  yearsExperience: number;
  description: string;
  featuredExperience: {
    title: string;
    description: string;
    price: number;
    duration: string;
    images: string[];
  };
  recentReview: {
    author: string;
    rating: number;
    text: string;
    date: string;
  };
  badges: string[];
  isTopPerformer: boolean;
}

const featuredGuides: FeaturedGuide[] = [
  {
    id: "1",
    name: "Tendai Mukamuri",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    coverImage:
      "https://images.unsplash.com/photo-1621414050345-53e80269dc4a?w=600&h=300&fit=crop",
    location: "Victoria Falls",
    specialty: "Photography & Adventure",
    rating: 4.95,
    reviewCount: 157,
    totalBookings: 432,
    yearsExperience: 8,
    description:
      "Master photographer and adventure guide specializing in capturing Zimbabwe's raw beauty through unique perspectives.",
    featuredExperience: {
      title: "Secret Sunrise Victoria Falls Photo Tour",
      description:
        "Access exclusive viewpoints for golden hour photography, including helicopter pad overlook and secret rainbow spots.",
      price: 120,
      duration: "5 hours",
      images: [
        "https://images.unsplash.com/photo-1621414050345-53e80269dc4a?w=300&h=200&fit=crop",
        "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=300&h=200&fit=crop",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop",
      ],
    },
    recentReview: {
      author: "Sarah M.",
      rating: 5,
      text: "Absolutely incredible experience! Tendai knew all the best spots and timing. Got shots I never could have imagined!",
      date: "2 days ago",
    },
    badges: ["Top Performer", "Photography Expert", "5-Star Guide"],
    isTopPerformer: true,
  },
  {
    id: "2",
    name: "Chipo Ndoro",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face",
    coverImage:
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=300&fit=crop",
    location: "Matobo National Park",
    specialty: "Wildlife & Cultural Heritage",
    rating: 4.88,
    reviewCount: 94,
    totalBookings: 267,
    yearsExperience: 6,
    description:
      "Wildlife enthusiast and cultural heritage specialist with deep knowledge of Matobo's ancient history and unique ecosystem.",
    featuredExperience: {
      title: "Ancient Rock Art & Wildlife Discovery",
      description:
        "Journey through 2,000-year-old San rock paintings while tracking white and black rhinos in their natural habitat.",
      price: 95,
      duration: "8 hours",
      images: [
        "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=300&h=200&fit=crop",
        "https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=300&h=200&fit=crop",
        "https://images.unsplash.com/photo-1564769625905-50c3549feff1?w=300&h=200&fit=crop",
      ],
    },
    recentReview: {
      author: "James W.",
      rating: 5,
      text: "Chipo's knowledge of the area's history and wildlife is extraordinary. A truly enlightening experience!",
      date: "1 week ago",
    },
    badges: ["Cultural Expert", "Wildlife Specialist", "Heritage Guide"],
    isTopPerformer: false,
  },
];

export default function FeaturedGuides() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 mb-4">
            <Star className="w-8 h-8 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Community Guides
            </h2>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Meet our top-rated local experts who consistently deliver
            exceptional experiences. These featured guides represent the best of
            Zimbabwe&apos;s hospitality and knowledge.
          </p>
        </div>

        {/* Featured Guides */}
        <div className="space-y-12">
          {featuredGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Guide Header with Cover Image */}
              <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600">
                <img
                  src={guide.coverImage}
                  alt={guide.name}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30" />

                {/* Top Performer Badge */}
                {guide.isTopPerformer && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-500 text-white font-semibold rounded-full text-sm">
                      <Award className="w-4 h-4" />
                      <span>Top Performer</span>
                    </span>
                  </div>
                )}

                {/* Guide Profile Overlay */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-end space-x-4">
                    <div className="relative">
                      <img
                        src={guide.avatar}
                        alt={guide.name}
                        className="w-20 h-20 rounded-full border-4 border-white object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1">
                        <Badge className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 text-white">
                      <h3 className="text-2xl font-bold">{guide.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{guide.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="font-semibold">{guide.rating}</span>
                          <span className="opacity-80">
                            ({guide.reviewCount} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guide Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Guide Info */}
                  <div className="lg:col-span-1">
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Specialty
                      </h4>
                      <p className="text-lg font-semibold text-gray-900">
                        {guide.specialty}
                      </p>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        About
                      </h4>
                      <p className="text-gray-700">{guide.description}</p>
                    </div>

                    {/* Guide Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {guide.totalBookings}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Bookings
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {guide.yearsExperience}
                        </div>
                        <div className="text-sm text-gray-600">
                          Years Experience
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Achievements
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {guide.badges.map((badge) => (
                          <span
                            key={badge}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Featured Experience */}
                  <div className="lg:col-span-2">
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Featured Experience
                      </h4>

                      <div className="border border-gray-200 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h5 className="text-xl font-bold text-gray-900">
                            {guide.featuredExperience.title}
                          </h5>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${guide.featuredExperience.price}
                            </div>
                            <div className="text-sm text-gray-500">
                              {guide.featuredExperience.duration}
                            </div>
                          </div>
                        </div>

                        <p className="text-gray-700 mb-4">
                          {guide.featuredExperience.description}
                        </p>

                        {/* Experience Images */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {guide.featuredExperience.images.map(
                            (image, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={image}
                                alt={`Experience ${imgIndex + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            )
                          )}
                        </div>

                        <button className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                          Book This Experience
                        </button>
                      </div>
                    </div>

                    {/* Recent Review */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Recent Review
                      </h4>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">
                              {guide.recentReview.author}
                            </span>
                            <div className="flex items-center">
                              {[...Array(guide.recentReview.rating)].map(
                                (_, i) => (
                                  <Star
                                    key={i}
                                    className="w-4 h-4 text-yellow-400 fill-current"
                                  />
                                )
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {guide.recentReview.date}
                          </span>
                        </div>

                        <p className="text-gray-700 italic">
                          &quot;{guide.recentReview.text}&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    View Full Profile
                  </button>
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                    <MessageCircle className="w-5 h-5 inline mr-2" />
                    Message Guide
                  </button>
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                    <Heart className="w-5 h-5 inline mr-2" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Guides CTA */}
        <div className="text-center mt-12">
          <button className="inline-flex items-center space-x-2 px-8 py-4 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors">
            <span>Explore All Community Guides</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Community Trust Indicators */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">150+</div>
            <div className="text-gray-600">Verified Guides</div>
          </div>

          <div className="text-center">
            <Star className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">4.8</div>
            <div className="text-gray-600">Average Rating</div>
          </div>

          <div className="text-center">
            <Calendar className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">2,500+</div>
            <div className="text-gray-600">Experiences Booked</div>
          </div>

          <div className="text-center">
            <Award className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">98%</div>
            <div className="text-gray-600">Customer Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
}
