import React, { createContext, useContext, useState } from 'react';
import { generateInitialMessages } from '@/utils/messageData';

interface MessagesContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const MessagesContext = createContext<MessagesContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  // Compute the initial badge count from seed data so it shows before the tab is visited
  const [unreadCount, setUnreadCount] = useState(() =>
    generateInitialMessages().reduce((sum, m) => sum + (m.unreadCount || 0), 0)
  );

  return (
    <MessagesContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessagesContext() {
  return useContext(MessagesContext);
}
