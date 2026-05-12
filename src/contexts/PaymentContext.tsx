"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  BookingItem,
  PaymentIntent,
  BookingConfirmation,
  PaymentError,
} from "@/types/payment";

interface PaymentContextType {
  currentBooking: BookingItem[] | null;
  paymentIntent: PaymentIntent | null;
  isProcessing: boolean;
  error: PaymentError | null;

  // Actions
  addToBooking: (item: BookingItem) => void;
  addToCart: (item: BookingItem) => void; // Alias for addToBooking
  removeFromBooking: (itemId: string) => void;
  clearBooking: () => void;
  createPaymentIntent: (items: BookingItem[]) => Promise<PaymentIntent | null>;
  confirmPayment: (
    paymentIntentId: string
  ) => Promise<BookingConfirmation | null>;
  setError: (error: PaymentError | null) => void;

  // Utilities
  calculateTotal: () => number;
  getItemCount: () => number;

  // Aliases for compatibility
  items: BookingItem[] | null; // Alias for currentBooking
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
};

interface PaymentProviderProps {
  children: React.ReactNode;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({
  children,
}) => {
  const [currentBooking, setCurrentBooking] = useState<BookingItem[] | null>(
    null
  );
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);

  useEffect(() => {
    try {
      const savedItems = localStorage.getItem("checkout_items");
      if (savedItems) {
        setCurrentBooking(JSON.parse(savedItems));
      }
    } catch {
      // Ignore malformed persisted checkout state.
    }
  }, []);

  useEffect(() => {
    // Don't touch localStorage on the initial null state — only act once the
    // booking has been explicitly set (addToBooking) or explicitly cleared
    // (clearBooking, which calls localStorage.removeItem itself).
    if (currentBooking === null) return;
    if (currentBooking.length > 0) {
      localStorage.setItem("checkout_items", JSON.stringify(currentBooking));
    } else {
      localStorage.removeItem("checkout_items");
    }
  }, [currentBooking]);

  const addToBooking = useCallback((item: BookingItem) => {
    setCurrentBooking((prev) => {
      if (!prev) return [item];

      // Check if item already exists
      const existingIndex = prev.findIndex(
        (existing) => existing.id === item.id && existing.type === item.type
      );

      if (existingIndex !== -1) {
        // Update existing item
        const updated = [...prev];
        const existing = updated[existingIndex];
        if (
          existing.metadata?.source === "trip-planner" &&
          item.metadata?.source === "trip-planner"
        ) {
          updated[existingIndex] = item;
          return updated;
        }

        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + item.quantity,
        };
        return updated;
      }

      return [...prev, item];
    });
  }, []);

  const removeFromBooking = useCallback((itemId: string) => {
    setCurrentBooking((prev) => {
      if (!prev) return null;
      // Return [] (not null) when the last item is removed so the persistence
      // effect can clean up localStorage (it ignores null).
      return prev.filter((item) => item.id !== itemId);
    });
  }, []);

  const clearBooking = useCallback(() => {
    setCurrentBooking(null);
    localStorage.removeItem("checkout_items"); // effect won't run for null, so clear explicitly
    setPaymentIntent(null);
    setError(null);
  }, []);

  const calculateTotal = useCallback(() => {
    if (!currentBooking) return 0;
    return currentBooking.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }, [currentBooking]);

  const getItemCount = useCallback(() => {
    if (!currentBooking) return 0;
    return currentBooking.reduce((count, item) => count + item.quantity, 0);
  }, [currentBooking]);

  const createPaymentIntent = useCallback(
    async (items: BookingItem[]): Promise<PaymentIntent | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items }),
        });

        if (!response.ok) {
          throw new Error("Failed to create payment intent");
        }

        const intent = await response.json();
        setPaymentIntent(intent);
        return intent;
      } catch (err) {
        const error: PaymentError = {
          type: "api_error",
          message:
            err instanceof Error ? err.message : "Unknown error occurred",
        };
        setError(error);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const confirmPayment = useCallback(
    async (paymentIntentId: string): Promise<BookingConfirmation | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentIntentId }),
        });

        if (!response.ok) {
          throw new Error("Failed to confirm payment");
        }

        const confirmation = await response.json();

        // Clear booking after successful payment
        clearBooking();

        return confirmation;
      } catch (err) {
        const error: PaymentError = {
          type: "api_error",
          message:
            err instanceof Error ? err.message : "Payment confirmation failed",
        };
        setError(error);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [clearBooking]
  );

  const value: PaymentContextType = {
    currentBooking,
    paymentIntent,
    isProcessing,
    error,
    addToBooking,
    addToCart: addToBooking, // Alias for compatibility
    removeFromBooking,
    clearBooking,
    createPaymentIntent,
    confirmPayment,
    setError,
    calculateTotal,
    getItemCount,
    items: currentBooking, // Alias for compatibility
  };

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
};
