"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Trash2,
  MapPin,
  Truck,
  Package,
} from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  vendor: {
    name: string;
    location: string;
    verified: boolean;
  };
  shippingType: "pickup" | "delivery" | "shipping";
  maxQuantity: number;
}

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({
  isOpen,
  onClose,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: "1",
      name: "Traditional Shona Stone Sculpture",
      price: 150,
      originalPrice: 200,
      image:
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&q=80",
      quantity: 1,
      vendor: {
        name: "Heritage Arts Zimbabwe",
        location: "Harare, Zimbabwe",
        verified: true,
      },
      shippingType: "shipping",
      maxQuantity: 5,
    },
    {
      id: "2",
      name: "Premium Zimbabwean Coffee Beans",
      price: 25,
      image:
        "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500&q=80",
      quantity: 2,
      vendor: {
        name: "Highland Coffee Co.",
        location: "Mutare, Zimbabwe",
        verified: true,
      },
      shippingType: "shipping",
      maxQuantity: 10,
    },
  ]);

  const [selectedShipping, setSelectedShipping] = useState<{
    [key: string]: string;
  }>({
    "1": "shipping",
    "2": "shipping",
  });

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(itemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.min(newQuantity, item.maxQuantity) }
          : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateShipping = (itemId: string, shippingType: string) => {
    setSelectedShipping((prev) => ({
      ...prev,
      [itemId]: shippingType,
    }));
  };

  const getShippingCost = (item: CartItem, shippingType: string): number => {
    switch (shippingType) {
      case "pickup":
        return 0;
      case "delivery":
        return item.price > 50 ? 0 : 5; // Free delivery over $50
      case "shipping":
        return 15; // Flat rate international shipping
      default:
        return 0;
    }
  };

  const getShippingIcon = (type: string) => {
    switch (type) {
      case "pickup":
        return Package;
      case "delivery":
        return Truck;
      case "shipping":
        return MapPin;
      default:
        return Package;
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalShipping = cartItems.reduce(
    (sum, item) =>
      sum +
      getShippingCost(item, selectedShipping[item.id] || item.shippingType),
    0
  );
  const total = subtotal + totalShipping;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Shopping Cart ({cartItems.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Your cart is empty
                </h3>
                <p className="text-gray-600">
                  Add some products to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {cartItems.map((item) => {
                  const ShippingIcon = getShippingIcon(
                    selectedShipping[item.id] || item.shippingType
                  );
                  return (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {item.name}
                          </h3>

                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {item.vendor.name}
                            </span>
                            {item.vendor.verified && (
                              <div className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">
                                Verified
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-semibold text-gray-900">
                              ${item.price}
                            </span>
                            {item.originalPrice && (
                              <span className="text-sm text-gray-500 line-through">
                                ${item.originalPrice}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">
                            Quantity:
                          </span>
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="p-1 text-gray-600 hover:text-gray-800"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-3 py-1 text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="p-1 text-gray-600 hover:text-gray-800"
                              disabled={item.quantity >= item.maxQuantity}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      {/* Shipping Options */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <ShippingIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Shipping Options
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name={`shipping-${item.id}`}
                                value="pickup"
                                checked={selectedShipping[item.id] === "pickup"}
                                onChange={(e) =>
                                  updateShipping(item.id, e.target.value)
                                }
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                Store Pickup
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">Free</span>
                          </label>

                          <label className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name={`shipping-${item.id}`}
                                value="delivery"
                                checked={
                                  selectedShipping[item.id] === "delivery"
                                }
                                onChange={(e) =>
                                  updateShipping(item.id, e.target.value)
                                }
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                Local Delivery
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {getShippingCost(item, "delivery") === 0
                                ? "Free"
                                : `$${getShippingCost(item, "delivery")}`}
                            </span>
                          </label>

                          <label className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name={`shipping-${item.id}`}
                                value="shipping"
                                checked={
                                  selectedShipping[item.id] === "shipping"
                                }
                                onChange={(e) =>
                                  updateShipping(item.id, e.target.value)
                                }
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                International Shipping
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              ${getShippingCost(item, "shipping")}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              {/* Order Summary */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {totalShipping === 0
                      ? "Free"
                      : `$${totalShipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Proceed to Checkout
              </button>

              <button
                onClick={onClose}
                className="w-full mt-2 text-gray-600 py-2 text-sm hover:text-gray-800"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
