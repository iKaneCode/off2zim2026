import type {
  SupportContactRecord,
  SupportConversationRecord,
  SupportMessageAttachmentRecord,
  SupportMessageRecord,
} from "@/types/platform";
import { readProviderProfileMeta } from "@/lib/provider-profile-meta";

type SupportUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
};

type SupportCompany = {
  id: string;
  serviceProviderId: string | null;
  companyName: string;
  tradingName: string | null;
  mainContactPerson: string;
  socialMediaLinks: string | null;
};

type SupportMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  attachments: string;
  deliveredAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  sender: SupportUser;
};

type SupportConversation = {
  id: string;
  subject: string;
  status: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  participant: SupportUser;
  company: SupportCompany | null;
  messages: SupportMessage[];
};

export const supportConversationInclude = {
  participant: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      role: true,
      image: true,
    },
  },
  company: {
    select: {
      id: true,
      serviceProviderId: true,
      companyName: true,
      tradingName: true,
      mainContactPerson: true,
      socialMediaLinks: true,
    },
  },
  messages: {
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};

export function formatSupportUserName(user: SupportUser) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.name ||
    user.email
  );
}

export function serializeSupportContact({
  user,
  company,
}: {
  user: SupportUser;
  company?: SupportCompany | null;
}): SupportContactRecord {
  const contactName = company?.mainContactPerson || formatSupportUserName(user);
  const companyProfile = company
    ? readProviderProfileMeta(safeJsonParse(company.socialMediaLinks))
    : null;

  return {
    id: company?.id || user.id,
    userId: user.id,
    companyId: company?.id ?? null,
    serviceProviderId: company?.serviceProviderId ?? null,
    name:
      company?.tradingName ||
      company?.companyName ||
      formatSupportUserName(user),
    contactName,
    email: user.email,
    role: user.role,
    avatarUrl: companyProfile?.profileImageUrl || user.image || null,
    recipientType: company ? "service_provider" : "user",
  };
}

function safeJsonParse(value: string | null | undefined) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

function parseSupportAttachments(
  value: string,
): SupportMessageAttachmentRecord[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (attachment): attachment is SupportMessageAttachmentRecord =>
        Boolean(
          attachment &&
            typeof attachment === "object" &&
            typeof (attachment as SupportMessageAttachmentRecord).fileName ===
              "string" &&
            typeof (attachment as SupportMessageAttachmentRecord).fileUrl ===
              "string" &&
            typeof (attachment as SupportMessageAttachmentRecord)
              .contentType === "string" &&
            typeof (attachment as SupportMessageAttachmentRecord).size ===
              "number",
        ),
    );
  } catch {
    return [];
  }
}

export function serializeSupportMessage(
  message: SupportMessage,
): SupportMessageRecord {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderUserId: message.senderUserId,
    body: message.body,
    attachments: parseSupportAttachments(message.attachments),
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    sender: {
      id: message.sender.id,
      name: formatSupportUserName(message.sender),
      email: message.sender.email,
      role: message.sender.role,
    },
  };
}

export function serializeSupportConversation(
  conversation: SupportConversation,
  currentUserId: string,
  includeMessages = false,
  firstUnreadMessageId: string | null = null,
): SupportConversationRecord {
  const messages = conversation.messages.map(serializeSupportMessage);
  const lastMessage = messages.at(-1) ?? null;

  return {
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    participant: serializeSupportContact({
      user: conversation.participant,
      company: conversation.company,
    }),
    unreadCount: conversation.messages.filter(
      (message) =>
        message.senderUserId !== currentUserId && message.readAt === null,
    ).length,
    lastMessage,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    firstUnreadMessageId,
    ...(includeMessages ? { messages } : {}),
  };
}
