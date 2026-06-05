import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPaynowClient, isMobileMethod } from "@/lib/paynow";
import { rateLimit, rateLimitResponse, PAYMENT_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bookingId: z.string().min(1),
  /**
   * "web"       → hosted Paynow redirect page
   * "ecocash"   → EcoCash mobile money (requires phone)
   * "onemoney"  → OneMoney mobile money (requires phone)
   * "telecash"  → TeleCash mobile money (requires phone)
   */
  method: z.string().min(1).default("web"),
  /** Required when method is a mobile money type */
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const limit = await rateLimit(request, "paynow", PAYMENT_LIMIT);
  if (!limit.success) return rateLimitResponse(limit);

  // ── Auth ──────────────────────────────────────────────────────────────────
  let user: { id: string; email: string; name: string | null };
  try {
    ({ user } = await requireSessionUser());
  } catch {
    return apiError("Authentication required.", 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const { bookingId, method, phone } = body;

  if (isMobileMethod(method) && !phone) {
    return apiError("Phone number is required for mobile money payments.", 400);
  }

  // ── Load booking ──────────────────────────────────────────────────────────
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { title: true } } },
  });

  if (!booking) return apiError("Booking not found.", 404);
  if (booking.userId !== user.id) return apiError("Access denied.", 403);

  if (!["PENDING", "REQUESTED", "CONFIRMED"].includes(booking.status)) {
    return apiError(
      `Cannot initiate payment for a booking with status "${booking.status}".`,
      409
    );
  }

  // Prevent duplicate payments for the same booking
  const existing = await prisma.payment.findFirst({
    where: {
      bookingId,
      userId: user.id,
      status: { in: ["PENDING", "PAID"] },
    },
  });
  if (existing) {
    return apiError("A payment for this booking is already in progress.", 409);
  }

  // ── Build Paynow payment ──────────────────────────────────────────────────
  let paynow;
  try {
    paynow = getPaynowClient();
  } catch (err) {
    console.error("[paynow] Client init failed:", err);
    return apiError("Payment provider is not configured.", 503);
  }

  const reference = `OFF2ZIM-${bookingId}`;
  const amount = booking.totalAmount ?? 0;

  if (amount <= 0) {
    return apiError("Booking has no payable amount.", 400);
  }

  const listingTitle = booking.listing?.title ?? "Off2Zim Booking";
  const payment = paynow.createPayment(reference, user.email);
  payment.add(listingTitle, amount);

  // ── Initiate with Paynow ──────────────────────────────────────────────────
  let response;
  try {
    if (isMobileMethod(method)) {
      response = await paynow.processPayment(payment, method);
    } else {
      // Web redirect flow — method "" triggers the hosted payment page
      response = await paynow.processPayment(payment, "");
    }
  } catch (err) {
    console.error("[paynow] processPayment failed:", err);
    return apiError("Could not reach the payment provider. Please try again.", 502);
  }

  if (!response.success) {
    return NextResponse.json(
      { error: response.error ?? "Payment initiation failed." },
      { status: 400 }
    );
  }

  // ── Persist payment record ────────────────────────────────────────────────
  const paymentRecord = await prisma.payment.create({
    data: {
      bookingId,
      userId: user.id,
      amount,
      currency: booking.currency ?? "USD",
      method: isMobileMethod(method) ? method.toUpperCase() : "PAYNOW_WEB",
      status: "PENDING",
      reference,
      phoneNumber: phone ?? null,
      metadata: JSON.stringify({
        pollUrl: response.pollUrl ?? null,
        paynowMethod: method,
      }),
    },
  });

  // ── Return redirect or pending status ─────────────────────────────────────
  if (!isMobileMethod(method) && response.redirectUrl) {
    return NextResponse.json({
      paymentId: paymentRecord.id,
      redirectUrl: response.redirectUrl,
      pollUrl: response.pollUrl,
    });
  }

  // Mobile money — no redirect, user confirms on their phone
  return NextResponse.json({
    paymentId: paymentRecord.id,
    pollUrl: response.pollUrl,
    instructions: response.instructions ?? null,
    message:
      "Payment request sent to your mobile. Approve the prompt on your phone to complete the transaction.",
  });
}

// ── Poll a payment status (GET ?paymentId=...) ─────────────────────────────

export async function GET(request: NextRequest) {
  let user: { id: string };
  try {
    ({ user } = await requireSessionUser());
  } catch {
    return apiError("Authentication required.", 401);
  }

  const paymentId = new URL(request.url).searchParams.get("paymentId");
  if (!paymentId) return apiError("paymentId is required.", 400);

  const record = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!record) return apiError("Payment not found.", 404);
  if (record.userId !== user.id) return apiError("Access denied.", 403);

  // If already settled, return cached status
  if (record.status === "PAID" || record.status === "FAILED") {
    return NextResponse.json({ status: record.status, paymentId: record.id });
  }

  // Poll Paynow for live status
  let paynow;
  try {
    paynow = getPaynowClient();
  } catch {
    return NextResponse.json({ status: record.status, paymentId: record.id });
  }

  const meta = JSON.parse(record.metadata ?? "{}") as { pollUrl?: string };
  if (!meta.pollUrl) {
    return NextResponse.json({ status: record.status, paymentId: record.id });
  }

  try {
    const statusResponse = await paynow.pollTransaction(meta.pollUrl);
    const paynowStatus = statusResponse.status?.toLowerCase();

    let mappedStatus = record.status;
    if (paynowStatus === "paid") mappedStatus = "PAID";
    else if (paynowStatus === "cancelled" || paynowStatus === "failed") mappedStatus = "FAILED";

    if (mappedStatus !== record.status) {
      await prisma.payment.update({
        where: { id: record.id },
        data: {
          status: mappedStatus,
          processedAt: mappedStatus === "PAID" ? new Date() : null,
        },
      });

      // Confirm booking if paid
      if (mappedStatus === "PAID") {
        await prisma.booking.update({
          where: { id: record.bookingId },
          data: { status: "CONFIRMED" },
        });
      }
    }

    return NextResponse.json({ status: mappedStatus, paymentId: record.id });
  } catch (err) {
    console.error("[paynow] pollTransaction failed:", err);
    return NextResponse.json({ status: record.status, paymentId: record.id });
  }
}
