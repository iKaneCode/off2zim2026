import React from "react";

export const Cta27: React.FC = () => {
  return (
    <section className="px-[5%] py-16 bg-gradient-to-r from-orange-500 to-red-600">
      <div className="container">
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Experience Zimbabwe&apos;s Flavors?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Book your table now and embark on a culinary journey
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Make Reservation
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-orange-600 transition-colors">
              View Menu
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
