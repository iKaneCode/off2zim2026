import { prisma } from "@/lib/prisma";
import { BookingItem, BookingConfirmation, PaymentMetadata } from "@/types/payment";

export interface CreateBookingRequest {
  userId: string;
  items: BookingItem[];
  totalAmount: number;
  currency: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  specialRequests?: string;
  paymentIntentId: string;
  paymentMethod?: string;
}

export interface CreatePaymentRequest {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: string; // Changed from enum to string for flexibility
  status?: string;
  mobileProvider?: "ecocash" | "onemoney" | "telecash";
  phoneNumber?: string;
  reference?: string;
  paynowReference?: string; // Added for Paynow
  metadata?: PaymentMetadata;
}

export class BookingService {
  static async createBooking(
    data: CreateBookingRequest
  ): Promise<BookingConfirmation> {
    try {
      // Generate confirmation number
      const confirmationNumber = `OFF2ZIM-${Date.now().toString(36).toUpperCase()}`;

      // Determine booking type and related entity IDs from items
      const bookingType = data.items[0]?.type || "HOTEL";
      const initialStatus =
        data.items[0]?.metadata?.bookingMode === "instant" ||
        data.items[0]?.metadata?.instantBooking
          ? "CONFIRMED"
          : "PENDING";
      const relatedIds: {
        providerId?: string;
        listingId?: string;
        hotelId?: string;
        roomId?: string;
        activityId?: string;
        restaurantId?: string;
        eventId?: string;
      } = {};

      // Extract IDs from the first item (assuming single-item bookings for now)
      if (data.items.length > 0) {
        const item = data.items[0];
        if (typeof item.metadata?.providerId === "string") {
          relatedIds.providerId = item.metadata.providerId;
        }
        if (typeof item.metadata?.listingId === "string") {
          relatedIds.listingId = item.metadata.listingId;
        }
        switch (item.type) {
          case "accommodation":
            // For hotel bookings, we might have hotel and room info in metadata
            if (typeof item.metadata?.hotelId === "string") {
              relatedIds.hotelId = item.metadata.hotelId;
            }
            if (typeof item.metadata?.roomId === "string") {
              relatedIds.roomId = item.metadata.roomId;
            }
            break;
          case "activity":
            relatedIds.activityId = item.id;
            break;
          case "marketplace":
            // Assuming this is restaurant bookings
            relatedIds.restaurantId = item.id;
            break;
          case "trip_package":
            // Assuming this is events
            relatedIds.eventId = item.id;
            break;
        }
      }

      // Create booking in database
      const booking = await prisma.booking.create({
        data: {
          userId: data.userId,
          bookingType: bookingType.toUpperCase(),
          status: initialStatus,
          totalAmount: data.totalAmount,
          currency: data.currency,
          confirmationNumber,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guests: data.guests,
          specialRequests: data.specialRequests,
          metadata: JSON.stringify({
            paymentIntentId: data.paymentIntentId,
            items: data.items,
          }),
          ...relatedIds,
        },
        include: {
          user: true,
          hotel: true,
          room: true,
          activity: true,
          restaurant: true,
          event: true,
        },
      });

      // Create booking confirmation object
      const bookingConfirmation: BookingConfirmation = {
        id: booking.id,
        paymentIntentId: data.paymentIntentId,
        userId: data.userId,
        items: data.items,
        totalAmount: data.totalAmount,
        currency: data.currency,
        status: "pending",
        paymentStatus: "pending",
        bookingDate: booking.createdAt.toISOString(),
        createdAt: new Date(),
        confirmationNumber,
        customerInfo: {
          name: booking.user?.name || "Guest User",
          email: booking.user?.email || "guest@off2zim.com",
          phone: booking.user?.phone || undefined,
        },
        metadata: {
          bookingType,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guests: data.guests,
          specialRequests: data.specialRequests,
        },
      };

      return bookingConfirmation;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw new Error("Failed to create booking");
    }
  }

  static async createPayment(data: CreatePaymentRequest) {
    try {
      const payment = await prisma.payment.create({
        data: {
          bookingId: data.bookingId,
          userId: data.userId,
          amount: data.amount,
          currency: data.currency,
          method: data.method,
          status: data.status || "PENDING",
          mobileProvider: data.mobileProvider,
          phoneNumber: data.phoneNumber,
          reference: data.reference,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          processedAt: data.status === "COMPLETED" ? new Date() : null,
        },
      });

      return payment;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw new Error("Failed to create payment record");
    }
  }

  static async updatePaymentStatus(
    paymentId: string,
    status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED",
    metadata?: PaymentMetadata
  ) {
    try {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          updatedAt: new Date(),
        },
        include: {
          booking: true,
        },
      });

      // If payment is completed, update booking status
      if (status === "COMPLETED") {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: "CONFIRMED",
            updatedAt: new Date(),
          },
        });
      } else if (status === "FAILED") {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: "CANCELLED",
            updatedAt: new Date(),
          },
        });
      }

      return payment;
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw new Error("Failed to update payment status");
    }
  }

  static async getBookingByConfirmationNumber(confirmationNumber: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { confirmationNumber },
        include: {
          user: true,
          hotel: true,
          room: true,
          activity: true,
          restaurant: true,
          event: true,
          payments: true,
        },
      });

      return booking;
    } catch (error) {
      console.error("Error fetching booking:", error);
      throw new Error("Failed to fetch booking");
    }
  }

  static async getUserBookings(userId: string) {
    try {
      const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          hotel: true,
          room: true,
          activity: true,
          restaurant: true,
          event: true,
          payments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return bookings;
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      throw new Error("Failed to fetch user bookings");
    }
  }

  static async updateBookingStatus(
    bookingId: string,
    status: "PENDING" | "CONFIRMED" | "CANCELLED",
    metadata?: PaymentMetadata
  ) {
    try {
      const booking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          updatedAt: new Date(),
        },
      });

      return booking;
    } catch (error) {
      console.error("Error updating booking status:", error);
      throw new Error("Failed to update booking status");
    }
  }

  static async getBookingByConfirmation(confirmationNumber: string) {
    // Alias for getBookingByConfirmationNumber for consistency
    return this.getBookingByConfirmationNumber(confirmationNumber);
  }
}
