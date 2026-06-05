import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/http";
import { getSessionTokenFromHeaders, getUserBySessionToken } from "@/lib/auth";
import { isPrivateUploadBucket, readStoredUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireDocumentAccess(
  relativePath: string,
  request: NextRequest,
) {
  const sessionToken = await getSessionTokenFromHeaders();
  if (!sessionToken) {
    return false;
  }

  const user = await getUserBySessionToken(sessionToken);
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const fileUrl = new URL(request.url).pathname;
  const document = await prisma.providerDocument.findFirst({
    where: {
      fileUrl,
      company: {
        ownerUserId: user.id,
      },
    },
    select: { id: true },
  });

  return Boolean(document && relativePath.startsWith("provider-documents/"));
}

async function requireSupportMessageAccess(
  relativePath: string,
  request: NextRequest,
) {
  const sessionToken = await getSessionTokenFromHeaders();
  if (!sessionToken) return false;

  const user = await getUserBySessionToken(sessionToken);
  if (!user) return false;
  if (user.role === "admin") return true;

  const [, conversationId] = relativePath.split("/");
  if (!conversationId) return false;

  const conversation = await prisma.supportConversation.findFirst({
    where: {
      id: conversationId,
      participantUserId: user.id,
    },
    select: { id: true },
  });

  return Boolean(conversation);
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ bucket: string; segments: string[] }>;
  },
) {
  try {
    const resolvedParams = await params;
    const relativePath = [
      resolvedParams.bucket,
      ...(resolvedParams.segments || []),
    ].join("/");

    if (resolvedParams.bucket === "provider-documents") {
      const allowed = await requireDocumentAccess(relativePath, request);
      if (!allowed) {
        return apiError("Unauthorized", 401);
      }
    }
    if (resolvedParams.bucket === "support-messages") {
      const allowed = await requireSupportMessageAccess(relativePath, request);
      if (!allowed) {
        return apiError("Unauthorized", 401);
      }
    }

    const { contentType, data } = await readStoredUpload(relativePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isPrivateUploadBucket(resolvedParams.bucket)
          ? "private, max-age=60"
          : "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return apiError("File not found.", 404);
  }
}
