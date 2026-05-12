"use client";

import React from "react";
import { usePayment } from "@/contexts/PaymentContext";
import { BookingItem } from "@/types/payment";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";

interface AddToCartButtonProps {
  item: BookingItem;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  item,
  variant = "default",
  size = "default",
  className = "",
  showIcon = true,
  children,
}) => {
  const { addToBooking } = usePayment();

  const handleAddToCart = () => {
    try {
      addToBooking(item);
      toast.success(`${item.name} added to your booking!`);
    } catch (error) {
      toast.error("Failed to add item to cart");
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      variant={variant}
      size={size}
      className={`${className} ${showIcon ? "flex items-center gap-2" : ""}`}
    >
      {showIcon && <Plus className="w-4 h-4" />}
      {children || "Add to Cart"}
    </Button>
  );
};

export default AddToCartButton;
