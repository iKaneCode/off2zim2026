import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { consumeEmailVerificationToken } from "@/lib/auth-tokens";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const payload = confirmSchema.parse(await request.json());
    const consumed = await consumeEmailVerificationToken(payload.token);

    if (!consumed) {
      return apiError("This verification link is invalid or has expired.", 400);
    }

    const user = await prisma.user.update({
      where: { id: consumed.userId },
      data: {
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        error.issues[0]?.message || "Invalid verification token",
        422,
      );
    }

    console.error("Verify-email confirm route error:", error);
    return apiError("Unable to verify email right now.", 500);
  }
}
