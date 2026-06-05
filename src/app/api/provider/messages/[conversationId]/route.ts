import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  serializeSupportConversation,
  supportConversationInclude,
} from "@/lib/support-messages";

export const dynamic = "force-dynamic";

const messageSchema = z
  .object({
    body: z.string().trim().max(4000).default(""),
    attachments: z
      .array(
        z.object({
          fileName: z.string().min(1).max(255),
          fileUrl: z.string().min(1).max(1000),
          contentType: z.string().min(1).max(255),
          size: z.number().int().nonnegative(),
        }),
      )
      .max(5)
      .default([]),
  })
  .refine((value) => value.body || value.attachments.length > 0, {
    message: "Write a message or attach a document.",
  });

async function findProviderConversation(
  conversationId: string,
  userId: string,
) {
  return prisma.supportConversation.findFirst({
    where: {
      id: conversationId,
      participantUserId: userId,
    },
    include: supportConversationInclude,
  });
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ conversationId: string }>;
  },
) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError(
        "Only service providers can view provider messages.",
        403,
      );
    }
    const { conversationId } = await params;
    const existing = await findProviderConversation(conversationId, user.id);
    if (!existing) {
      return apiError("Conversation not found.", 404);
    }
    const firstUnreadMessage = existing.messages.find(
      (message) => message.senderUserId !== user.id && message.readAt === null,
    );

    await prisma.supportMessage.updateMany({
      where: {
        conversationId,
        senderUserId: { not: user.id },
        readAt: null,
      },
      data: { deliveredAt: new Date(), readAt: new Date() },
    });
    const conversation = await findProviderConversation(
      conversationId,
      user.id,
    );
    if (!conversation) {
      return apiError("Conversation not found.", 404);
    }

    return NextResponse.json({
      conversation: serializeSupportConversation(conversation, user.id, true),
      firstUnreadMessageId: firstUnreadMessage?.id ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider conversation route error:", error);
    return apiError("Unable to load this conversation right now.", 500);
  }
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ conversationId: string }>;
  },
) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "provider") {
      return apiError(
        "Only service providers can send provider messages.",
        403,
      );
    }
    const { conversationId } = await params;
    const payload = messageSchema.parse(await request.json());
    const conversation = await findProviderConversation(
      conversationId,
      user.id,
    );
    if (!conversation) {
      return apiError("Conversation not found.", 404);
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          conversationId,
          senderUserId: user.id,
          body: payload.body,
          attachments: JSON.stringify(payload.attachments),
        },
      }),
      prisma.supportConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminUserId: user.id,
          companyId: conversation.companyId,
          action: "provider_message_sent",
          targetType: "support_conversation",
          targetId: conversation.id,
          summary: "Service provider sent a message to Off2Zim.",
          metadata: JSON.stringify({ subject: conversation.subject }),
        },
      }),
    ]);

    const updated = await findProviderConversation(conversationId, user.id);
    if (!updated) {
      return apiError("Conversation not found.", 404);
    }
    return NextResponse.json({
      conversation: serializeSupportConversation(updated, user.id, true),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message || "Invalid message.", 422);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Provider send message error:", error);
    return apiError("Unable to send this message right now.", 500);
  }
}
