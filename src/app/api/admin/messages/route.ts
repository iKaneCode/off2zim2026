import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ensureServiceProviderIds } from "@/lib/provider-company-ids";
import {
  serializeSupportContact,
  serializeSupportConversation,
  supportConversationInclude,
} from "@/lib/support-messages";

export const dynamic = "force-dynamic";

const createConversationSchema = z
  .object({
    participantUserId: z.string().min(1),
    companyId: z.string().min(1).optional().nullable(),
    subject: z.string().trim().min(1).max(120).optional(),
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

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can view platform messages.", 403);
    }

    await prisma.supportMessage.updateMany({
      where: {
        senderUserId: { not: user.id },
        deliveredAt: null,
      },
      data: { deliveredAt: new Date() },
    });

    if (request.nextUrl.searchParams.get("summary") === "unread") {
      const unreadCount = await prisma.supportMessage.count({
        where: {
          senderUserId: { not: user.id },
          readAt: null,
        },
      });
      return NextResponse.json({ unreadCount });
    }

    const [users, companies, conversations] = await Promise.all([
      prisma.user.findMany({
        where: { role: { not: "admin" } },
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
        take: 500,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      }),
      prisma.providerCompany.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          ownerUserId: true,
          serviceProviderId: true,
          companyName: true,
          tradingName: true,
          mainContactPerson: true,
          socialMediaLinks: true,
          createdAt: true,
        },
      }),
      prisma.supportConversation.findMany({
        include: supportConversationInclude,
        orderBy: { lastMessageAt: "desc" },
        take: 500,
      }),
    ]);
    const companiesWithIds = await ensureServiceProviderIds(companies);
    const companyByOwnerId = new Map(
      companiesWithIds.map((company) => [company.ownerUserId, company]),
    );

    return NextResponse.json({
      contacts: users.map((contactUser) =>
        serializeSupportContact({
          user: contactUser,
          company: companyByOwnerId.get(contactUser.id) ?? null,
        }),
      ),
      conversations: conversations.map((conversation) =>
        serializeSupportConversation(conversation, user.id),
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Admin messages route error:", error);
    return apiError("Unable to load messages right now.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError("Only administrators can start conversations.", 403);
    }

    const payload = createConversationSchema.parse(await request.json());
    const participant = await prisma.user.findUnique({
      where: { id: payload.participantUserId },
      select: { id: true, email: true, role: true },
    });
    if (!participant || participant.role === "admin") {
      return apiError("Choose a valid service provider or user.", 404);
    }

    if (payload.companyId) {
      const company = await prisma.providerCompany.findFirst({
        where: {
          id: payload.companyId,
          ownerUserId: participant.id,
        },
        select: { id: true },
      });
      if (!company) {
        return apiError(
          "The selected company does not belong to this user.",
          422,
        );
      }
    }

    const now = new Date();
    let conversation = await prisma.supportConversation.findFirst({
      where: {
        participantUserId: participant.id,
        companyId: payload.companyId ?? null,
        status: "open",
      },
      select: { id: true },
    });

    const conversationId = await prisma.$transaction(async (tx) => {
      if (!conversation) {
        conversation = await tx.supportConversation.create({
          data: {
            participantUserId: participant.id,
            companyId: payload.companyId ?? null,
            createdById: user.id,
            subject: payload.subject || "Off2Zim support",
            lastMessageAt: now,
          },
          select: { id: true },
        });
      }

      await tx.supportMessage.create({
        data: {
          conversationId: conversation.id,
          senderUserId: user.id,
          body: payload.body,
          attachments: JSON.stringify(payload.attachments),
        },
      });
      await tx.supportConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: now },
      });
      await tx.adminAuditLog.create({
        data: {
          adminUserId: user.id,
          companyId: payload.companyId ?? null,
          action: "admin_message_sent",
          targetType: "support_conversation",
          targetId: conversation.id,
          summary: `Off2Zim admin sent a message to ${participant.email}.`,
          metadata: JSON.stringify({
            participantUserId: participant.id,
            participantEmail: participant.email,
          }),
        },
      });

      return conversation.id;
    });

    const updated = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: supportConversationInclude,
    });
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
    console.error("Admin create conversation error:", error);
    return apiError("Unable to send this message right now.", 500);
  }
}
