import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  serializeSupportConversation,
  supportConversationInclude,
} from "@/lib/support-messages";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError(
        "Only service providers can view provider messages.",
        403,
      );
    }

    await prisma.supportMessage.updateMany({
      where: {
        conversation: { participantUserId: user.id },
        senderUserId: { not: user.id },
        deliveredAt: null,
      },
      data: { deliveredAt: new Date() },
    });

    if (request.nextUrl.searchParams.get("summary") === "unread") {
      const unreadCount = await prisma.supportMessage.count({
        where: {
          conversation: { participantUserId: user.id },
          senderUserId: { not: user.id },
          readAt: null,
        },
      });
      return NextResponse.json({ unreadCount });
    }

    const conversations = await prisma.supportConversation.findMany({
      where: { participantUserId: user.id },
      include: supportConversationInclude,
      orderBy: { lastMessageAt: "desc" },
    });

    return NextResponse.json({
      conversations: conversations.map((conversation) =>
        serializeSupportConversation(conversation, user.id),
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider messages route error:", error);
    return apiError("Unable to load messages right now.", 500);
  }
}
