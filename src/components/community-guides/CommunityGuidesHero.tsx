"use client";

import React from "react";
import {
  ChatBubbleLeftRightIcon,
  StarIcon,
  ShieldCheckIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

export default function CommunityGuidesHero() {
  return (
    <section className="relative bg-gradient-to-br from-off2zim-earth/10 to-off2zim-primary/10 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Content */}
          <div className="mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4 shadow-lg">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-off2zim-primary" />
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Ask a Local
            </h1>
            <h2 className="text-2xl md:text-3xl text-off2zim-primary mb-6">
              Connect with local guides across Zimbabwe
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Get local advice from verified Community Guides. Ask free questions in the forum or book Guide+ services for more personal trip support.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary">
                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                Ask a Question
              </button>
              <button className="btn-secondary">
                <StarIcon className="w-5 h-5 mr-2" />
                Browse Guide+ services
              </button>
            </div>
          </div>

          {/* Two-Tier System Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Free Forum */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Ask a Local Forum
                </h3>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  FREE
                </span>
              </div>
              <ul className="text-left space-y-2 text-gray-600">
                <li className="flex items-center">
                  <HeartIcon className="w-4 h-4 text-green-500 mr-2" />
                  Free community question and answer forum
                </li>
                <li className="flex items-center">
                  <ShieldCheckIcon className="w-4 h-4 text-green-500 mr-2" />
                  Verified guide answers highlighted
                </li>
                <li className="flex items-center">
                  <StarIcon className="w-4 h-4 text-green-500 mr-2" />
                  Browse previous travel questions
                </li>
              </ul>
            </div>

            {/* Guide+ Services */}
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-off2zim-primary">
              <div className="text-center mb-4">
                <div className="bg-off2zim-primary/10 rounded-full p-3 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <StarIcon className="w-8 h-8 text-off2zim-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Guide+ services
                </h3>
                <span className="bg-off2zim-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                  PREMIUM
                </span>
              </div>
              <ul className="text-left space-y-2 text-gray-600">
                <li className="flex items-center">
                  <StarIcon className="w-4 h-4 text-off2zim-primary mr-2" />
                  Personalized trip planning
                </li>
                <li className="flex items-center">
                  <StarIcon className="w-4 h-4 text-off2zim-primary mr-2" />
                  Video consultations
                </li>
                <li className="flex items-center">
                  <StarIcon className="w-4 h-4 text-off2zim-primary mr-2" />
                  In-person guided tours
                </li>
              </ul>
            </div>
          </div>

          {/* Community Values */}
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Our Community Values
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-off2zim-primary mb-3">
                  <HeartIcon className="w-8 h-8 mx-auto" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Community-Centric
                </h4>
                <p className="text-sm text-gray-600">
                  Building trust between travelers and local guides
                </p>
              </div>
              <div>
                <div className="text-off2zim-sunset mb-3">
                  <ShieldCheckIcon className="w-8 h-8 mx-auto" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Authentic Experiences
                </h4>
                <p className="text-sm text-gray-600">
                  Showing travelers the real Zimbabwe through local knowledge
                </p>
              </div>
              <div>
                <div className="text-off2zim-earth mb-3">
                  <StarIcon className="w-8 h-8 mx-auto" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Trust & Safety
                </h4>
                <p className="text-sm text-gray-600">
                  Verified guides with demonstrated expertise
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
