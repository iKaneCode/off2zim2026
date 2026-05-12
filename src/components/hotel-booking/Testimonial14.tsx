import React from "react";
import { Star } from "lucide-react";

function RatingRow() {
  return (
    <div className="flex items-center gap-1 text-yellow-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className="h-4 w-4 fill-current" />
      ))}
    </div>
  );
}

export const Testimonial14: React.FC = () => {
  return (
    <section className="px-[5%] py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What Our Guests Say
          </h2>
          <p className="text-gray-600">Real reviews from real travelers</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="text-gray-700 mb-4">
              &quot;Amazing service and beautiful location. Highly recommended!&quot;
            </p>
            <div className="font-semibold text-gray-900">Sarah Johnson</div>
            <RatingRow />
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="text-gray-700 mb-4">
              &quot;Perfect for our Zimbabwe safari trip. Great hospitality.&quot;
            </p>
            <div className="font-semibold text-gray-900">Michael Chen</div>
            <RatingRow />
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="text-gray-700 mb-4">
              &quot;Excellent facilities and friendly staff. Will visit again!&quot;
            </p>
            <div className="font-semibold text-gray-900">Emma Wilson</div>
            <RatingRow />
          </div>
        </div>
      </div>
    </section>
  );
};
