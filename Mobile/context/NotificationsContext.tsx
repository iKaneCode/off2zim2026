import React, { createContext, useContext, useState } from 'react';
import { generateInitialNotifications } from '@/utils/notificationData';

interface NotificationsContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // Compute the initial badge count from seed data so it shows before the tab is visited
  const [unreadCount, setUnreadCount] = useState(() =>
    generateInitialNotifications().filter(n => !n.isRead).length
  );

  return (
    <NotificationsContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}
