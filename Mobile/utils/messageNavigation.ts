import { router } from 'expo-router';

import type { MessageData } from '@/components';

type ProviderMessageData = MessageData & {
  isNewConversation?: boolean;
  providerId?: string;
  sourceType?: string;
  prefilledMessage?: string;
};

export const buildProviderMessage = ({
  id,
  name,
  avatarImage,
  sourceType,
  providerId,
  prefilledMessage,
}: {
  id: string;
  name: string;
  avatarImage?: string;
  sourceType?: string;
  providerId?: string;
  prefilledMessage?: string;
}): ProviderMessageData => {
  const now = new Date();
  return {
    id,
    name,
    message: prefilledMessage?.trim() || 'Tap to start a conversation',
    time: now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    timestamp: now.getTime(),
    isRead: true,
    unreadCount: 0,
    avatar:
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || 'SP',
    avatarImage,
    status: 'received',
    isNewConversation: true,
    sourceType,
    providerId,
    prefilledMessage,
  };
};

export const openProviderMessagesTab = (message: ProviderMessageData) => {
  router.replace({
    pathname: '/(tabs)/messages',
    params: {
      providerMessage: JSON.stringify(message),
    },
  });
};
