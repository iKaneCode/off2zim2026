import React from "react";

export const Faq3: React.FC = () => {
  return (
    <section className="px-[5%] py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600">
            Everything you need to know about booking with us
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              What is your cancellation policy?
            </h3>
            <p className="text-gray-600">
              Free cancellation up to 24 hours before check-in. After that, one
              night&apos;s rate applies.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Do you accept international credit cards?
            </h3>
            <p className="text-gray-600">
              Yes, we accept all major international credit cards as well as
              mobile money payments.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Is breakfast included?
            </h3>
            <p className="text-gray-600">
              Breakfast is included with all our premium and suite bookings.
              Standard rooms can add breakfast for $15/person.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
