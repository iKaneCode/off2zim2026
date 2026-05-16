/**
 * Dynamic notification data generation utilities
 */

import type { MessageData } from '@/components';

// Define NotificationData interface that extends MessageData for consistency
export interface NotificationData extends MessageData {
  type: string; // Keep for icon determination
}

// Notification providers and their details
const NOTIFICATION_PROVIDERS = [
  {
    name: 'Emirates',
    avatar: 'EM',
    color: '#C8102E',
    // TODO(db): replace avatarImage with service_providers.logo_url from DB
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Emirates')}&size=128&backgroundColor=FF4757`,
    types: ['travel', 'reminder', 'check-in'],
  },
  {
    name: 'Hwange Safari Lodge',
    avatar: 'HS',
    color: '#228B22',
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Hwange Safari Lodge')}&size=128&backgroundColor=FF4757`,
    types: ['payment', 'booking', 'safari'],
  },
  {
    name: 'Victoria Falls Activities',
    avatar: 'VF',
    color: '#007AFF',
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Victoria Falls Activities')}&size=128&backgroundColor=FF4757`,
    types: ['promotion', 'booking', 'activities'],
  },
  {
    name: 'Victoria Falls Hotel',
    avatar: 'VH',
    color: '#8B4513',
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Victoria Falls Hotel')}&size=128&backgroundColor=FF4757`,
    types: ['feedback', 'booking', 'service'],
  },
  {
    name: 'Intercape Bus',
    avatar: 'IB',
    color: '#FF6B35',
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Intercape Bus')}&size=128&backgroundColor=FF4757`,
    types: ['travel', 'booking', 'schedule'],
  },
  {
    name: 'Zambezi Helicopter Tours',
    avatar: 'ZH',
    color: '#4682B4',
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Zambezi Helicopter Tours')}&size=128&backgroundColor=FF4757`,
    types: ['travel', 'weather', 'booking'],
  },
  {
    name: 'Zimbabwe Tourism Authority',
    avatar: 'ZT',
    color: '#2E8B57',
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Zimbabwe Tourism Authority')}&size=128&backgroundColor=FF4757`,
    types: ['promotion', 'information', 'events'],
  },
  {
    name: 'Air Zimbabwe',
    avatar: 'AZ',
    color: '#DC143C',
    avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent('Air Zimbabwe')}&size=128&backgroundColor=FF4757`,
    types: ['travel', 'delay', 'check-in'],
  },
] as const;

// Dynamic notification templates
const NOTIFICATION_TEMPLATES = {
  travel: [
    'Flight reminder: Your flight {code} to {destination} departs {time}. Check-in is now open.',
    'Boarding announcement: Your flight is now boarding at gate {gate}.',
    'Journey update: Your {transport} to {destination} is scheduled for {time}.',
    'Travel alert: Please arrive {minutes} minutes early for your {transport} departure.',
  ],
  payment: [
    'Payment confirmed: Your {service} booking has been successfully processed. Reference: {ref}.',
    'Payment reminder: Your booking payment of ${amount} is due {time}.',
    'Refund processed: Your refund of ${amount} has been processed and will reflect within 3-5 business days.',
    'Invoice ready: Your booking invoice is now available for download.',
  ],
  promotion: [
    'Limited time offer: Get {percent}% off all {category} when you book before {deadline}!',
    'Flash sale: Book your {service} now and save {percent}%!',
    'Special deal: {service} packages starting from ${amount} for a limited time.',
    'Early bird special: Book {days} days in advance and get {percent}% off!',
  ],
  feedback: [
    'Rate your stay: How was your recent experience with us? Your feedback helps us improve our service.',
    'Review reminder: Please take a moment to review your recent {service} experience.',
    'Satisfaction survey: Help us serve you better by completing our quick survey.',
    'Thank you: We appreciate your recent feedback about your {service} experience.',
  ],
  booking: [
    'Booking confirmation: Your {service} on {date} has been confirmed. {details}',
    "Booking reminder: Don't forget about your {service} scheduled for {time}.",
    'Booking update: Your {service} has been updated. Please check the new details.',
    'Last chance: Complete your {service} booking before it expires in {hours} hours.',
  ],
  weather: [
    'Weather update: Perfect conditions for your {activity} tomorrow. Prepare for stunning views!',
    'Weather alert: Due to weather conditions, your {activity} may be rescheduled.',
    'Forecast: Excellent weather expected for your {activity} on {date}.',
    'Advisory: Strong winds expected - your helicopter tour may be affected.',
  ],
} as const;

// Generate realistic notification content
const generateNotificationContent = (provider: any, type: string) => {
  const templates =
    NOTIFICATION_TEMPLATES[type as keyof typeof NOTIFICATION_TEMPLATES] ||
    NOTIFICATION_TEMPLATES.booking;
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders with realistic data
  return template
    .replace('{code}', `${provider.avatar}${Math.floor(Math.random() * 999 + 100)}`)
    .replace(
      '{destination}',
      ['Victoria Falls', 'Harare', 'Bulawayo', 'Hwange'][Math.floor(Math.random() * 4)]
    )
    .replace(
      '{time}',
      ['tomorrow at 10:30 AM', '2:45 PM today', 'Monday at 8:00 AM'][Math.floor(Math.random() * 3)]
    )
    .replace('{transport}', ['bus', 'shuttle', 'transfer'][Math.floor(Math.random() * 3)])
    .replace('{gate}', `${Math.floor(Math.random() * 20 + 1)}`)
    .replace('{minutes}', `${[30, 45, 60, 90][Math.floor(Math.random() * 4)]}`)
    .replace(
      '{service}',
      ['safari tour', 'helicopter ride', 'hotel stay', 'bus journey'][Math.floor(Math.random() * 4)]
    )
    .replace('{ref}', `${provider.avatar}${Math.floor(Math.random() * 90000 + 10000)}`)
    .replace('{amount}', `${Math.floor(Math.random() * 500 + 50)}`)
    .replace('{percent}', `${[10, 15, 20, 25][Math.floor(Math.random() * 4)]}`)
    .replace(
      '{category}',
      ['adventure activities', 'safari tours', 'helicopter flights'][Math.floor(Math.random() * 3)]
    )
    .replace(
      '{deadline}',
      ['this weekend', 'end of month', 'next Friday'][Math.floor(Math.random() * 3)]
    )
    .replace('{days}', `${[7, 14, 21][Math.floor(Math.random() * 3)]}`)
    .replace('{date}', ['July 15th', 'next Monday', 'this weekend'][Math.floor(Math.random() * 3)])
    .replace('{details}', 'Departure: 07:00 AM.')
    .replace('{hours}', `${[24, 48, 72][Math.floor(Math.random() * 3)]}`)
    .replace(
      '{activity}',
      ['Flight of Angels tour', 'safari drive', 'river cruise'][Math.floor(Math.random() * 3)]
    );
};

// Generate time stamps
const generateTimeStamp = () => {
  const timeOptions = [
    '2 hours ago',
    '1 day ago',
    '2 days ago',
    '3 days ago',
    '4 days ago',
    '1 week ago',
    '2 weeks ago',
    'Yesterday',
    'Monday',
    'Tuesday',
  ];
  return timeOptions[Math.floor(Math.random() * timeOptions.length)];
};

// Convert a millisecond offset to a human-readable display string
const offsetToDisplayTime = (offsetMs: number): string => {
  const hours = offsetMs / (60 * 60 * 1000);
  if (hours < 2) return 'Just now';
  if (hours < 24) return `${Math.round(hours)} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  return '2 weeks ago';
};

// Generate initial notifications with dynamic content
export const generateInitialNotifications = (): NotificationData[] => {
  const notifications: NotificationData[] = [];
  const now = Date.now();
  // Timestamps spread over the past 2 weeks, most recent first
  const offsets = [
    1 * 60 * 60 * 1000,         // 1 hour ago
    6 * 60 * 60 * 1000,         // 6 hours ago
    24 * 60 * 60 * 1000,        // 1 day ago
    2 * 24 * 60 * 60 * 1000,    // 2 days ago
    3 * 24 * 60 * 60 * 1000,    // 3 days ago
    5 * 24 * 60 * 60 * 1000,    // 5 days ago
    7 * 24 * 60 * 60 * 1000,    // 1 week ago
    14 * 24 * 60 * 60 * 1000,   // 2 weeks ago
  ];

  for (let i = 0; i < 8; i++) {
    const provider = NOTIFICATION_PROVIDERS[i % NOTIFICATION_PROVIDERS.length];
    const type = provider.types[Math.floor(Math.random() * provider.types.length)];
    const isRead = Math.random() > 0.4; // 60% chance of being read

    notifications.push({
      id: `${i + 1}`,
      name: provider.name,
      message: generateNotificationContent(provider, type),
      time: offsetToDisplayTime(offsets[i]),
      timestamp: now - offsets[i],
      isRead,
      unreadCount: 0,
      avatar: provider.avatar,
      avatarImage: provider.avatarImage,
      status: 'received',
      type,
    });
  }

  return notifications;
};

// Generate a single new notification
export const generateNewNotification = (): NotificationData => {
  const provider =
    NOTIFICATION_PROVIDERS[Math.floor(Math.random() * NOTIFICATION_PROVIDERS.length)];
  const type = provider.types[Math.floor(Math.random() * provider.types.length)];

  return {
    id: `new_${Date.now()}`,
    name: provider.name,
    message: generateNotificationContent(provider, type),
    time: 'Just now',
    timestamp: Date.now(),
    isRead: false,
    unreadCount: 0,
    avatar: provider.avatar,
    avatarImage: provider.avatarImage,
    status: 'received',
    type,
  };
};

// Filter options for notifications
export const NOTIFICATION_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
] as const;
