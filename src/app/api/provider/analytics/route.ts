import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REVENUE_STATUSES = new Set(["CONFIRMED", "COMPLETED"]);
const ACTIVE_DISPUTE_STATUSES = new Set(["open", "under_review"]);

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError("Only providers can view provider analytics.", 403);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!company) {
      return apiError("Provider company profile not found.", 404);
    }

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);

    const [bookings, listings, disputes, payouts] = await Promise.all([
      prisma.booking.findMany({
        where: { providerId: company.id },
        include: {
          listing: true,
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.providerListing.findMany({
        where: { companyId: company.id },
        include: {
          bookings: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.dispute.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.payout.findMany({
        where: { companyId: company.id },
        orderBy: { requestedAt: "desc" },
        take: 5,
      }),
    ]);

    const revenueBookings = bookings.filter((booking) =>
      REVENUE_STATUSES.has(booking.status)
    );
    const periodBookings = bookings.filter((booking) => booking.createdAt >= periodStart);
    const periodRevenueBookings = periodBookings.filter((booking) =>
      REVENUE_STATUSES.has(booking.status)
    );
    const totalRevenue = revenueBookings.reduce(
      (total, booking) => total + booking.totalAmount,
      0
    );
    const periodRevenue = periodRevenueBookings.reduce(
      (total, booking) => total + booking.totalAmount,
      0
    );
    const activeDisputes = disputes.filter((dispute) =>
      ACTIVE_DISPUTE_STATUSES.has(dispute.status)
    ).length;
    const completedBookings = bookings.filter(
      (booking) => booking.status === "COMPLETED"
    ).length;
    const cancelledBookings = bookings.filter(
      (booking) => booking.status === "CANCELLED"
    ).length;
    const pendingBookings = bookings.filter((booking) =>
      ["REQUESTED", "PENDING"].includes(booking.status)
    ).length;
    const bookingRate =
      bookings.length > 0
        ? Math.round(
            ((bookings.length - cancelledBookings) / bookings.length) * 100
          )
        : 0;
    const averageOrderValue =
      revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0;

    const sixMonthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return monthKey(date);
    });
    const revenueByMonth = new Map(sixMonthKeys.map((key) => [key, 0]));
    revenueBookings.forEach((booking) => {
      const key = monthKey(booking.createdAt);
      if (revenueByMonth.has(key)) {
        revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + booking.totalAmount);
      }
    });

    const topListings = listings
      .map((listing) => {
        const listingBookings = bookings.filter(
          (booking) => booking.listingId === listing.id
        );
        const listingRevenue = listingBookings
          .filter((booking) => REVENUE_STATUSES.has(booking.status))
          .reduce((total, booking) => total + booking.totalAmount, 0);

        return {
          id: listing.id,
          title: listing.title,
          status: listing.status,
          bookings: listingBookings.length,
          revenue: listingRevenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
      .slice(0, 5);

    const bookingActivity = bookings.slice(0, 5).map((booking) => ({
      id: booking.id,
      type: "booking",
      title: `Booking ${booking.status.toLowerCase()}`,
      body: booking.listing?.title || booking.confirmationNumber,
      meta: booking.createdAt.toISOString(),
      amount: `${booking.currency} ${booking.totalAmount.toFixed(2)}`,
    }));
    const disputeActivity = disputes.slice(0, 5).map((dispute) => ({
      id: dispute.id,
      type: "dispute",
      title: `Dispute ${dispute.status.replace(/_/g, " ")}`,
      body: dispute.reason,
      meta: dispute.createdAt.toISOString(),
      amount: dispute.status,
    }));
    const payoutActivity = payouts.slice(0, 5).map((payout) => ({
      id: payout.id,
      type: "payout",
      title: `Payout ${payout.status}`,
      body: payout.method.replace(/_/g, " "),
      meta: payout.requestedAt.toISOString(),
      amount: `${payout.currency} ${payout.amount.toFixed(2)}`,
    }));

    const recentActivity = [...bookingActivity, ...disputeActivity, ...payoutActivity]
      .sort((a, b) => new Date(b.meta).getTime() - new Date(a.meta).getTime())
      .slice(0, 8);

    return NextResponse.json({
      analytics: {
        periodLabel: "Last 30 days",
        currency: bookings[0]?.currency || "USD",
        metrics: {
          totalRevenue,
          periodRevenue,
          totalBookings: bookings.length,
          periodBookings: periodBookings.length,
          pendingBookings,
          completedBookings,
          cancelledBookings,
          activeDisputes,
          activeListings: listings.filter((listing) => listing.status === "active").length,
          totalListings: listings.length,
          bookingRate,
          averageOrderValue,
        },
        revenueSeries: sixMonthKeys.map((key) => ({
          label: monthLabel(key),
          revenue: revenueByMonth.get(key) || 0,
        })),
        topListings,
        recentActivity,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider analytics route error:", error);
    return apiError("Unable to load provider analytics right now.", 500);
  }
}
