// Payment types for the Off2Zim platform
export type PaymentMetadata = Record<
  string,
  string | number | boolean | string[] | Date | null | undefined
>;

export interface PaymentMethod {
  id: string;
  type: "card" | "mobile_money" | "bank_transfer";
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  // Mobile Money specific fields
  mobileProvider?: "ecocash" | "onemoney" | "telecash";
  phoneNumber?: string;
}

export interface BookingItem {
  id: string;
  type:
    | "accommodation"
    | "activity"
    | "transport"
    | "marketplace"
    | "trip_package";
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  category?: string; // Optional category field
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  provider?: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: PaymentMetadata;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "requires_capture"
    | "canceled"
    | "succeeded";
  items: BookingItem[];
  userId: string;
  metadata?: PaymentMetadata;
}

export interface BookingConfirmation {
  id: string;
  paymentIntentId: string;
  userId: string;
  items: BookingItem[];
  totalAmount: number;
  currency: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  bookingDate: string;
  confirmationNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  createdAt: Date;
  metadata?: PaymentMetadata;
}

export interface PaymentError {
  type:
    | "card_error"
    | "invalid_request_error"
    | "api_error"
    | "authentication_error"
    | "rate_limit_error";
  code?: string;
  message: string;
  param?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  items: BookingItem[];
  successUrl: string;
  cancelUrl: string;
}

// Mobile Money specific types for Zimbabwe market
export interface MobileMoneyPayment {
  provider: "ecocash" | "onemoney" | "telecash";
  phoneNumber: string;
  amount: number;
  currency: "USD" | "ZWL";
  reference: string;
}

// Payment analytics and reporting
export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topPaymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  monthlyGrowth: number;
  conversionRate: number;
}
