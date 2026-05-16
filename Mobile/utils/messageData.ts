import type { MessageData } from '@/components';

// Dynamic message generation based on current date/time
const generateDynamicMessages = (): MessageData[] => {
  const now = new Date();
  const D = 24 * 60 * 60 * 1000; // one day in ms
  const yesterday = new Date(now.getTime() - D).toLocaleDateString('en-US', {
    weekday: 'long',
  });

  // Time-based message content
  const currentHour = now.getHours();
  const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

  return [
    {
      id: '1',
      name: 'Victoria Falls Hotel',
      message: `Good ${timeOfDay}! Thank you for your booking inquiry. We have availability for your requested dates. Would you like to proceed with your reservation?`,
      time: `${currentHour > 12 ? currentHour - 12 : currentHour}:${now.getMinutes().toString().padStart(2, '0')} ${currentHour >= 12 ? 'PM' : 'AM'}`,
      timestamp: now.getTime(),
      isRead: false,
      unreadCount: Math.floor(Math.random() * 3) + 1,
      avatar: 'VH',
      // TODO(db): replace with service_providers.logo_url from DB
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Victoria Falls Hotel')}&size=128&backgroundColor=FF4757`,
      status: 'received',
    },
    {
      id: '2',
      name: 'The Boma',
      message: `Your dinner reservation for 4 people on ${new Date(now.getTime() + 2 * D).toLocaleDateString()} has been confirmed. We look forward to providing you with an authentic African dining experience.`,
      time: yesterday,
      timestamp: now.getTime() - D,
      isRead: Math.random() > 0.5,
      unreadCount: 0,
      avatar: 'TB',
      // TODO(db): replace with service_providers.logo_url from DB
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('The Boma')}&size=128&backgroundColor=FF4757`,
      status: 'read',
    },
    {
      id: '3',
      name: 'Shearwater Adventures',
      message: `Your white water rafting experience has been scheduled for tomorrow at 9:00 AM. Please arrive 30 minutes early for safety briefing. Weather conditions look ${Math.random() > 0.5 ? 'perfect' : 'favorable'} for tomorrow!`,
      time: yesterday,
      timestamp: now.getTime() - D - 2 * 60 * 60 * 1000,
      isRead: true,
      unreadCount: 0,
      avatar: 'SA',
      // TODO(db): replace with service_providers.logo_url from DB
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Shearwater Adventures')}&size=128&backgroundColor=FF4757`,
      status: 'read',
    },
    {
      id: '4',
      name: 'Elephant Hills Resort',
      message:
        "We've received your request for the Chobe Day Trip. Please note that this excursion requires a valid passport as it crosses into Botswana.",
      time: 'Tuesday',
      timestamp: now.getTime() - 2 * D,
      isRead: Math.random() > 0.3,
      unreadCount: Math.floor(Math.random() * 4),
      avatar: 'EH',
      // TODO(db): replace with service_providers.logo_url from DB
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Elephant Hills Resort')}&size=128&backgroundColor=FF4757`,
      status: 'received',
    },
    {
      id: '5',
      name: 'Zambezi Helicopter Company',
      message: `Your Flight of Angels helicopter tour over Victoria Falls is confirmed for Friday at 2:00 PM. The weather forecast looks ${['spectacular', 'perfect', 'excellent', 'amazing'][Math.floor(Math.random() * 4)]} for incredible views!`,
      time: 'Monday',
      timestamp: now.getTime() - 3 * D,
      isRead: true,
      unreadCount: 0,
      avatar: 'ZH',
      // TODO(db): replace with service_providers.logo_url from DB
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Zambezi Helicopter Company')}&size=128&backgroundColor=FF4757`,
      status: 'sent',
    },
  ];
};

// Generate messages with some randomization
export const generateInitialMessages = (): MessageData[] => {
  return generateDynamicMessages();
};

// Add new message (simulate receiving a new message)
export const generateNewMessage = (): MessageData => {
  const providers = [
    { name: 'Safari Lodge Booking', avatar: 'SL' },
    { name: 'Airport Transfer Service', avatar: 'AT' },
    { name: 'Victoria Falls Tours', avatar: 'VF' },
    { name: 'Adventure Activities', avatar: 'AA' },
  ];

  const messages = [
    'Your booking has been confirmed!',
    'We have a special offer for you today.',
    'Please confirm your arrival time.',
    'Weather update for your activity.',
    'Thank you for choosing our services.',
  ];

  const provider = providers[Math.floor(Math.random() * providers.length)];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const now = new Date();

  return {
    id: `msg_${Date.now()}`,
    name: provider.name,
    message,
    time: `${now.getHours() > 12 ? now.getHours() - 12 : now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`,
    timestamp: Date.now(),
    isRead: false,
    unreadCount: 1,
    avatar: provider.avatar,
    status: 'received',
  };
};

// Filter options (moved from component)
export const MESSAGE_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'providers', label: 'Providers' },
  { key: 'bookings', label: 'Bookings' },
] as const;
