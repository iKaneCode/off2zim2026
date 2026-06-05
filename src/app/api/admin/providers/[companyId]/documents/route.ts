import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireSessionUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { serializeCompany } from "@/lib/platform";
import { saveUploadedFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function companyInclude() {
  return {
    documents: true,
    verificationReviews: {
      include: {
        reviewedBy: true,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
    },
    listings: {
      include: {
        bookings: true,
      },
    },
    bookings: {
      include: {
        disputes: true,
        user: true,
        listing: true,
      },
    },
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError(
        "Only administrators can upload provider documents.",
        403,
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = String(formData.get("documentType") || "");

    if (!documentType.trim()) {
      return apiError("A document type is required.", 422);
    }

    if (!(file instanceof File)) {
      return apiError("A document file is required.", 422);
    }

    const company = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      select: { id: true, companyName: true },
    });

    if (!company) {
      return apiError("Service provider not found.", 404);
    }

    const uploaded = await saveUploadedFile(
      "provider-documents",
      file,
      `${companyId}-${documentType}`,
    );

    const existingDocument = await prisma.providerDocument.findFirst({
      where: {
        companyId,
        type: documentType,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    const savedDocument = existingDocument
      ? await prisma.providerDocument.update({
          where: { id: existingDocument.id },
          data: {
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            status: "uploaded",
            notes: null,
            reviewedAt: null,
          },
        })
      : await prisma.providerDocument.create({
          data: {
            companyId,
            type: documentType,
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            status: "uploaded",
          },
        });

    await createAuditLog({
      actorUserId: user.id,
      action: existingDocument
        ? "provider_document_updated"
        : "provider_document_uploaded",
      targetType: "provider_document",
      targetId: savedDocument.id,
      companyId,
      summary: `${user.email} ${existingDocument ? "updated" : "uploaded"} ${documentType} for ${company.companyName}`,
      metadata: {
        documentType,
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
      },
    });

    const updatedCompany = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      include: companyInclude(),
    });

    if (!updatedCompany) {
      return apiError("Service provider not found.", 404);
    }

    return NextResponse.json({ provider: serializeCompany(updatedCompany) });
  } catch (error) {
    console.error("Admin provider document upload error:", error);
    return apiError("Unable to upload the provider document right now.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await params;
    const { user } = await requireSessionUser();
    if (user.role !== "admin") {
      return apiError(
        "Only administrators can delete provider documents.",
        403,
      );
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get("type") || "";

    if (!documentType.trim()) {
      return apiError("A document type is required.", 422);
    }

    const document = await prisma.providerDocument.findFirst({
      where: { companyId, type: documentType },
      orderBy: { uploadedAt: "desc" },
    });

    if (!document) {
      return apiError("Document not found.", 404);
    }

    await prisma.providerDocument.delete({ where: { id: document.id } });

    await createAuditLog({
      actorUserId: user.id,
      action: "provider_document_deleted",
      targetType: "provider_document",
      targetId: document.id,
      companyId,
      summary: `${user.email} deleted ${document.type} from a service provider profile`,
      metadata: {
        documentType: document.type,
        fileName: document.fileName,
      },
    });

    const updatedCompany = await prisma.providerCompany.findUnique({
      where: { id: companyId },
      include: companyInclude(),
    });

    if (!updatedCompany) {
      return apiError("Service provider not found.", 404);
    }

    return NextResponse.json({ provider: serializeCompany(updatedCompany) });
  } catch (error) {
    console.error("Admin provider document delete error:", error);
    return apiError("Unable to delete the provider document right now.", 500);
  }
}
