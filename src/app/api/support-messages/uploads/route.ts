import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireSessionUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const conversationId = String(formData.get("conversationId") || "");

    if (!(file instanceof File) || !conversationId) {
      return apiError("Choose a file and conversation.", 422);
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return apiError("Attachments must be 15 MB or smaller.", 422);
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return apiError("This file type is not supported.", 422);
    }

    const conversation = await prisma.supportConversation.findFirst({
      where: {
        id: conversationId,
        ...(user.role === "admin" ? {} : { participantUserId: user.id }),
      },
      select: { id: true },
    });
    if (!conversation) {
      return apiError("Conversation not found.", 404);
    }

    const uploaded = await saveUploadedFile(
      "support-messages",
      file,
      conversation.id,
    );

    return NextResponse.json({
      attachment: {
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        contentType: uploaded.contentType,
        size: uploaded.size,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("Support message attachment upload error:", error);
    return apiError("Unable to upload this attachment right now.", 500);
  }
}
