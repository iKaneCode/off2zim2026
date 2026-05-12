"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  Search,
  Heart,
  Reply,
  MapPin,
  Star,
  Badge,
  Users,
  ThumbsUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ForumPost {
  id: string;
  title: string;
  author: {
    name: string;
    avatar: string;
    isVerified: boolean;
    isLocal: boolean;
    reputation: number;
  };
  content: string;
  category: string;
  location: string;
  timestamp: string;
  likes: number;
  replies: number;
  tags: string[];
  isAnswered: boolean;
}

const mockPosts: ForumPost[] = [
  {
    id: "1",
    title: "Best time to visit Victoria Falls for photography?",
    author: {
      name: "Sarah Chen",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face",
      isVerified: false,
      isLocal: false,
      reputation: 45,
    },
    content:
      "I'm planning a photography trip to Victoria Falls. What's the best time of year for capturing the falls with good lighting and water levels?",
    category: "Photography",
    location: "Victoria Falls",
    timestamp: "2 hours ago",
    likes: 12,
    replies: 8,
    tags: ["photography", "victoria-falls", "timing"],
    isAnswered: true,
  },
  {
    id: "2",
    title: "Hidden local restaurants in Harare that tourists don't know?",
    author: {
      name: "James Wilson",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      isVerified: false,
      isLocal: false,
      reputation: 28,
    },
    content:
      "Looking for authentic Zimbabwean cuisine away from the tourist spots. Any locals know great places for sadza, muriwo, and traditional dishes?",
    category: "Food & Dining",
    location: "Harare",
    timestamp: "4 hours ago",
    likes: 18,
    replies: 15,
    tags: ["food", "harare", "local-cuisine"],
    isAnswered: true,
  },
  {
    id: "3",
    title: "Transport from Harare to Matobo National Park - budget options?",
    author: {
      name: "Emma Rodriguez",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
      isVerified: false,
      isLocal: false,
      reputation: 62,
    },
    content:
      "Traveling solo and looking for affordable transport options from Harare to Matobo. Is there reliable public transport or should I look into shared rides?",
    category: "Transportation",
    location: "Matobo National Park",
    timestamp: "6 hours ago",
    likes: 8,
    replies: 12,
    tags: ["transport", "budget", "matobo", "solo-travel"],
    isAnswered: false,
  },
];

const categories = [
  "All Categories",
  "Accommodation",
  "Transportation",
  "Food & Dining",
  "Activities",
  "Photography",
  "Culture",
  "Safety",
  "Budget Tips",
  "Shopping",
];

export default function AskLocalForum() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [, setShowNewPostForm] = useState(false);

  const filteredPosts = mockPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All Categories" ||
      post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ask a Local Forum
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Get authentic advice from locals and fellow travelers. Ask
            questions, share experiences, and help build our community knowledge
            base.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search questions, topics, or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="lg:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Ask Question Button */}
            <button
              onClick={() => setShowNewPostForm(true)}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Ask Question
            </button>
          </div>
        </div>

        {/* Forum Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 text-center">
            <MessageCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">1,247</div>
            <div className="text-gray-600">Questions Asked</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">856</div>
            <div className="text-gray-600">Active Locals</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <ThumbsUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">94%</div>
            <div className="text-gray-600">Questions Answered</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">2.3h</div>
            <div className="text-gray-600">Avg Response Time</div>
          </div>
        </div>

        {/* Forum Posts */}
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">
                        {post.author.name}
                      </span>
                      {post.author.isVerified && (
                        <Badge className="w-4 h-4 text-blue-600" />
                      )}
                      {post.author.isLocal && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Local
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span>{post.author.reputation}</span>
                      </div>
                      <span>{post.timestamp}</span>
                    </div>
                  </div>
                </div>

                {post.isAnswered && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Answered
                    </span>
                  </span>
                )}
              </div>

              {/* Post Content */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-700 mb-3">{post.content}</p>

                {/* Post Meta */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{post.location}</span>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {post.category}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-6">
                  <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors">
                    <Heart className="w-5 h-5" />
                    <span>{post.likes}</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors">
                    <Reply className="w-5 h-5" />
                    <span>{post.replies} replies</span>
                  </button>
                </div>

                <button className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors">
                  View Discussion
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12">
          <button className="px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
            Load More Questions
          </button>
        </div>

        {/* Community Guidelines */}
        <div className="mt-16 bg-blue-50 rounded-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Community Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="mb-2 inline-flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Do:
              </h4>
              <ul className="space-y-1">
                <li>• Be respectful and helpful</li>
                <li>• Search before asking</li>
                <li>• Provide context and details</li>
                <li>• Thank helpful contributors</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 inline-flex items-center gap-2 font-semibold">
                <XCircle className="h-4 w-4 text-red-600" />
                Don&apos;t:
              </h4>
              <ul className="space-y-1">
                <li>• Post promotional content</li>
                <li>• Share personal information</li>
                <li>• Use offensive language</li>
                <li>• Spam or duplicate posts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
