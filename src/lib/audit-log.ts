import { prisma } from "@/lib/prisma";

type AuditLogInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  companyId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAuditLog({
  actorUserId,
  action,
  targetType,
  targetId,
  summary,
  companyId,
  metadata,
}: AuditLogInput) {
  return prisma.adminAuditLog.create({
    data: {
      adminUserId: actorUserId,
      action,
      targetType,
      targetId,
      summary,
      companyId: companyId || null,
      metadata: JSON.stringify(metadata ?? {}),
    },
  });
}
