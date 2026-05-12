import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPayoutRequestReceived } from "@/lib/platform-email";

export const dynamic = "force-dynamic";

const requestPayoutSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["bank_transfer", "ecocash", "onemoney", "telecash"]),
  accountRef: z.string().min(1, "Account reference is required"),
  notes: z.string().optional(),
});

async function findCompany(userId: string) {
  return prisma.providerCompany.findUnique({
    where: { ownerUserId: userId },
    select: { id: true, companyName: true },
  });
}

export async function GET() {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    const payouts = await prisma.payout.findMany({
      where: { companyId: company.id },
      orderBy: { requestedAt: "desc" },
      take: 50,
    });

    const pendingPayoutTotal = await prisma.payout.aggregate({
      where: { companyId: company.id, status: { in: ["pending", "processing"] } },
      _sum: { amount: true },
    });

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        accountRef: p.accountRef,
        status: p.status,
        reference: p.reference,
        notes: p.notes,
        requestedAt: p.requestedAt.toISOString(),
        processedAt: p.processedAt?.toISOString() ?? null,
      })),
      pendingPayoutTotal: pendingPayoutTotal._sum.amount ?? 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to load payouts.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") return apiError("Providers only.", 403);

    const company = await findCompany(user.id);
    if (!company) return apiError("Provider company not found.", 404);

    const payload = requestPayoutSchema.parse(await request.json());

    const payout = await prisma.payout.create({
      data: {
        companyId: company.id,
        amount: payload.amount,
        currency: "USD",
        method: payload.method,
        accountRef: payload.accountRef,
        notes: payload.notes ?? null,
        status: "pending",
      },
    });

    // Notify provider their request was received
    void sendPayoutRequestReceived({
      to: user.email,
      providerName: company.companyName,
      amount: payout.amount,
      currency: payout.currency,
      method: payout.method,
    }).catch(() => {});

    return NextResponse.json({
      payout: {
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        method: payout.method,
        status: payout.status,
        requestedAt: payout.requestedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "Invalid payout data.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    return apiError("Unable to request payout.", 500);
  }
}
