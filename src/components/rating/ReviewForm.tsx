"use client";

import React, { useState } from "react";
import { Upload, X } from "lucide-react";
import StarRating from "./StarRating";

interface RatingCriteria {
  id: string;
  label: string;
  description: string;
  rating: number;
}

interface ReviewFormProps {
  reviewType: "service" | "explorer" | "guide";
  targetName: string;
  onSubmit: (reviewData: {
    overallRating: number;
    title: string;
    comment: string;
    criteria: Record<string, number>;
    photos: File[];
    reviewType: "service" | "explorer" | "guide";
    targetName: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const SERVICE_CRITERIA: RatingCriteria[] = [
  { id: "quality",        label: "Service Quality",   description: "How well did they deliver their service?", rating: 0 },
  { id: "communication",  label: "Communication",      description: "How responsive and clear were they?",      rating: 0 },
  { id: "value",          label: "Value for Money",    description: "Was the service worth the price?",         rating: 0 },
  { id: "professionalism",label: "Professionalism",    description: "How professional was their conduct?",      rating: 0 },
];

const EXPLORER_CRITERIA: RatingCriteria[] = [
  { id: "communication", label: "Communication",  description: "How well did they communicate?",          rating: 0 },
  { id: "respect",       label: "Respectfulness", description: "How respectful were they?",               rating: 0 },
  { id: "reliability",   label: "Reliability",    description: "Did they follow through on commitments?", rating: 0 },
];

const GUIDE_CRITERIA: RatingCriteria[] = [
  { id: "knowledge",       label: "Local Knowledge", description: "How knowledgeable were they about local areas?",  rating: 0 },
  { id: "helpfulness",     label: "Helpfulness",     description: "How helpful were their recommendations?",          rating: 0 },
  { id: "responsiveness",  label: "Responsiveness",  description: "How quickly did they respond to questions?",       rating: 0 },
];

export const ReviewForm: React.FC<ReviewFormProps> = ({
  reviewType,
  targetName,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const initialCriteria =
    reviewType === "service"  ? SERVICE_CRITERIA  :
    reviewType === "explorer" ? EXPLORER_CRITERIA :
    GUIDE_CRITERIA;

  const [overallRating, setOverallRating] = useState(0);
  const [title, setTitle]     = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos]   = useState<File[]>([]);
  const [criteria, setCriteria] = useState<RatingCriteria[]>(
    initialCriteria.map((c) => ({ ...c }))
  );

  const updateCriteriaRating = (criteriaId: string, rating: number) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === criteriaId ? { ...c, rating } : c))
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files].slice(0, 5));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      overallRating,
      title,
      comment,
      criteria: criteria.reduce((acc, c) => ({ ...acc, [c.id]: c.rating }), {}),
      photos,
      reviewType,
      targetName,
    });
  };

  const isFormValid =
    overallRating > 0 &&
    title.trim() &&
    comment.trim() &&
    criteria.every((c) => c.rating > 0);

  const formTitle =
    reviewType === "service"  ? `Review ${targetName}` :
    reviewType === "explorer" ? `Rate your experience with ${targetName}` :
    `Review Community Guide ${targetName}`;

  return (
    <div className="theme-panel rounded-[28px] p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="theme-heading text-xl font-semibold">{formTitle}</h3>
        <button
          onClick={onCancel}
          className="rounded-full p-1.5 text-white/30 hover:bg-white/8 hover:text-white/60 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Rating */}
        <div>
          <label className="block text-xs font-medium theme-subtle mb-2 uppercase tracking-wide">
            Overall Rating *
          </label>
          <StarRating
            rating={overallRating}
            onRatingChange={setOverallRating}
            size="lg"
            showText
          />
        </div>

        {/* Criteria Ratings */}
        <div>
          <label className="block text-xs font-medium theme-subtle mb-3 uppercase tracking-wide">
            Detailed Ratings *
          </label>
          <div className="space-y-2.5">
            {criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-center justify-between rounded-[16px] bg-white/[0.04] border border-white/[0.07] px-4 py-3"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="theme-heading text-sm font-medium">{criterion.label}</p>
                  <p className="theme-muted text-xs mt-0.5">{criterion.description}</p>
                </div>
                <StarRating
                  rating={criterion.rating}
                  onRatingChange={(r) => updateCriteriaRating(criterion.id, r)}
                  showText={false}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Review Title */}
        <div>
          <label htmlFor="review-title" className="block text-xs font-medium theme-subtle mb-2 uppercase tracking-wide">
            Review Title *
          </label>
          <input
            type="text"
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="theme-input w-full rounded-[14px] px-4 py-3 text-sm"
            placeholder="Summarize your experience in a few words"
            maxLength={100}
          />
          <p className="theme-subtle text-xs mt-1.5">{title.length}/100 characters</p>
        </div>

        {/* Review Comment */}
        <div>
          <label htmlFor="review-comment" className="block text-xs font-medium theme-subtle mb-2 uppercase tracking-wide">
            Your Review *
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="theme-input w-full rounded-[14px] px-4 py-3 text-sm resize-none"
            placeholder="Share details about your experience..."
            maxLength={1000}
          />
          <p className="theme-subtle text-xs mt-1.5">{comment.length}/1000 characters</p>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-xs font-medium theme-subtle mb-2 uppercase tracking-wide">
            Add Photos <span className="normal-case">(optional, up to 5)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Upload ${index + 1}`}
                  className="w-20 h-20 rounded-[12px] object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff5630] text-white hover:bg-[#ff7352]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-[12px] border-2 border-dashed border-white/20 hover:border-white/40 transition-colors">
                <Upload className="h-5 w-5 text-white/30" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onCancel}
            className="theme-button-secondary rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="rounded-full bg-[#ff5630] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
