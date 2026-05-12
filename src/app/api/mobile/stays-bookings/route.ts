import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/http';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = "force-dynamic";
type JsonMetadata = Record<string, string | number | boolean | null | undefined>;
type StayBookingRecord = {
  id: string;
  userId: string;
  hotelId: string | null;
  roomId: string | null;
  providerId: string | null;
  confirmationNumber: string;
  metadata: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number | null;
  totalAmount: number;
  status: string;
  createdAt: Date;
  hotel: {
    id: string;
    name: string;
    city: string;
    images: string | null;
  } | null;
  room: {
    id: string;
    name: string;
    price: number;
    capacity: number;
    description: string | null;
  } | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
};

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeStayBooking(booking: StayBookingRecord) {
  const metadata = safeJsonParse<JsonMetadata>(booking.metadata, {});
  return {
    id: booking.id,
    user_id: booking.userId,
    stay_id: booking.hotelId,
    room_id: booking.roomId,
    stay_name: metadata.stay_name || booking.hotel?.name || null,
    transaction_number: metadata.transaction_number || booking.confirmationNumber,
    customer_name: metadata.customer_name || booking.user?.name || '',
    customer_email: metadata.customer_email || booking.user?.email || '',
    customer_phone: metadata.customer_phone || booking.user?.phone || null,
    check_in_date: booking.checkIn?.toISOString() || null,
    check_out_date: booking.checkOut?.toISOString() || null,
    guests_count: booking.guests || 1,
    adults_count: metadata.adults_count || booking.guests || 1,
    children_count: metadata.children_count || 0,
    rooms_count: metadata.rooms_count || 1,
    room_type: metadata.room_type || booking.room?.name || null,
    room_type_rate: metadata.room_type_rate || booking.room?.price || null,
    subtotal: metadata.subtotal || booking.totalAmount,
    tax: metadata.tax || 0,
    total_amount: booking.totalAmount,
    payment_method: metadata.payment_method || null,
    payment_gateway: metadata.payment_gateway || null,
    status: booking.status.toLowerCase(),
    same_as_account_holder: metadata.same_as_account_holder ?? false,
    id_type: metadata.id_type || null,
    identity_number: metadata.identity_number || null,
    date_of_birth: metadata.date_of_birth || null,
    nationality: metadata.nationality || null,
    traveling_with_infant: metadata.traveling_with_infant ?? false,
    marked_as_deleted: metadata.marked_as_deleted ?? false,
    created_at: booking.createdAt.toISOString(),
    stays: booking.hotel
      ? {
          name: booking.hotel.name,
          location: booking.hotel.city,
          image_url: safeJsonParse<string[]>(booking.hotel.images, [])[0] || null,
          provider_id: booking.providerId,
          check_in_time: '14:00',
          check_out_time: '10:00',
          service_providers: null,
          stay_rooms: booking.room
            ? [
                {
                  id: booking.room.id,
                  room_type: booking.room.name,
                  name: booking.room.name,
                  base_price: booking.room.price,
                  max_guests: booking.room.capacity,
                  description: booking.room.description,
                },
              ]
            : [],
          stay_gallery: safeJsonParse<string[]>(booking.hotel.images, []).map(
            (image: string, index: number) => ({
              id: `${booking.hotel?.id || "hotel"}-${index}`,
              image_url: image,
              sort_order: index,
            })
          ),
        }
      : null,
    events: null,
  };
}

const createSchema = z.object({
  userId: z.string().min(1),
  stayId: z.string().nullable().optional(),
  stayName: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  transactionNumber: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().nullable().optional(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  guestsCount: z.number().int().min(1),
  adultsCount: z.number().int().min(1),
  childrenCount: z.number().int().min(0),
  roomsCount: z.number().int().min(1),
  roomType: z.string().nullable().optional(),
  roomTypeRate: z.number().nullable().optional(),
  subtotal: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  totalAmount: z.number(),
  paymentMethod: z.string().nullable().optional(),
  paymentGateway: z.record(z.unknown()).nullable().optional(),
  status: z.string().optional(),
  sameAsAccountHolder: z.boolean().optional(),
  idType: z.string().nullable().optional(),
  identityNumber: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  travelingWithInfant: z.boolean().optional(),
});

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
      },
      include: {
        user: true,
        hotel: true,
        room: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const serialized = bookings
      .map(serializeStayBooking)
      .filter(booking => !booking.marked_as_deleted);
    return NextResponse.json({ bookings: serialized });
  } catch {
    return apiError('Unauthorized', 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    const payload = createSchema.parse(await request.json());

    if (payload.userId !== user.id) {
      return apiError('Unauthorized', 401);
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        bookingType: 'ACCOMMODATION',
        status: (payload.status || 'PENDING').toUpperCase(),
        totalAmount: payload.totalAmount,
        currency: 'USD',
        confirmationNumber: payload.transactionNumber,
        checkIn: new Date(payload.checkInDate),
        checkOut: new Date(payload.checkOutDate),
        guests: payload.guestsCount,
        hotelId: payload.stayId || null,
        roomId: payload.roomId || null,
        metadata: JSON.stringify({
          stay_name: payload.stayName,
          transaction_number: payload.transactionNumber,
          customer_name: payload.customerName,
          customer_email: payload.customerEmail,
          customer_phone: payload.customerPhone,
          adults_count: payload.adultsCount,
          children_count: payload.childrenCount,
          rooms_count: payload.roomsCount,
          room_type: payload.roomType,
          room_type_rate: payload.roomTypeRate,
          subtotal: payload.subtotal,
          tax: payload.tax,
          payment_method: payload.paymentMethod,
          payment_gateway: payload.paymentGateway,
          same_as_account_holder: payload.sameAsAccountHolder,
          id_type: payload.idType,
          identity_number: payload.identityNumber,
          date_of_birth: payload.dateOfBirth,
          nationality: payload.nationality,
          traveling_with_infant: payload.travelingWithInfant,
          marked_as_deleted: false,
        }),
      },
      include: {
        user: true,
        hotel: true,
        room: true,
      },
    });

    return NextResponse.json({ booking: serializeStayBooking(booking) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || 'Invalid booking payload', 422);
    }

    console.error('Mobile stay booking create error:', error);
    return apiError('Unable to create booking right now.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    const payload = z
      .object({
        bookingId: z.string().min(1),
        markedAsDeleted: z.boolean().optional(),
      })
      .parse(await request.json());

    const existing = await prisma.booking.findFirst({
      where: {
        id: payload.bookingId,
        userId: user.id,
      },
      include: {
        user: true,
        hotel: true,
        room: true,
      },
    });

    if (!existing) {
      return apiError('Booking not found.', 404);
    }

    const metadata = safeJsonParse<JsonMetadata>(existing.metadata, {});
    metadata.marked_as_deleted = payload.markedAsDeleted ?? true;

    const booking = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        metadata: JSON.stringify(metadata),
      },
      include: {
        user: true,
        hotel: true,
        room: true,
      },
    });

    return NextResponse.json({ booking: serializeStayBooking(booking) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || 'Invalid booking payload', 422);
    }

    return apiError('Unable to update booking right now.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    const payload = z
      .object({
        bookingId: z.string().min(1),
      })
      .parse(await request.json());

    await prisma.booking.deleteMany({
      where: {
        id: payload.bookingId,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || 'Invalid booking payload', 422);
    }

    return apiError('Unable to delete booking right now.', 500);
  }
}
