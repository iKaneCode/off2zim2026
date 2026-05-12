import React from "react";
import { Star } from "lucide-react";

function RatingRow() {
  return (
    <div className="flex items-center gap-1 text-orange-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className="h-4 w-4 fill-current" />
      ))}
    </div>
  );
}

export const Testimonial1: React.FC = () => {
  return (
    <section className="px-[5%] py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What Our Diners Say
          </h2>
          <p className="text-gray-600">Real reviews from satisfied customers</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                AM
              </div>
              <div className="ml-4">
                <div className="font-semibold text-gray-900">Alice Mthembu</div>
                <RatingRow />
              </div>
            </div>
            <p className="text-gray-700">
              &quot;Incredible authentic flavors! The sadza and beef stew reminded me
              of home. Highly recommend!&quot;
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                JT
              </div>
              <div className="ml-4">
                <div className="font-semibold text-gray-900">John Thompson</div>
                <RatingRow />
              </div>
            </div>
            <p className="text-gray-700">
              &quot;Amazing service and atmosphere. The traditional music made the
              evening perfect.&quot;
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                SM
              </div>
              <div className="ml-4">
                <div className="font-semibold text-gray-900">Sarah Moyo</div>
                <RatingRow />
              </div>
            </div>
            <p className="text-gray-700">
              &quot;Best dining experience in Zimbabwe! The chef&apos;s special was
              outstanding.&quot;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
