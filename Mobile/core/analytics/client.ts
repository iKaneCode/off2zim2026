import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { mobileAppVariant } from '@/config/appVariant';
import { apiFetch } from '@/core/http/apiClient';

const ANALYTICS_SESSION_KEY = 'off2zim_analytics_session';

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getAnalyticsSessionId() {
  const existing = await AsyncStorage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  await AsyncStorage.setItem(ANALYTICS_SESSION_KEY, sessionId);
  return sessionId;
}

function getAppSurface() {
  if (mobileAppVariant === 'provider') {
    return 'provider_android';
  }

  if (mobileAppVariant === 'admin') {
    return 'admin_web';
  }

  return 'tourist_app';
}

export async function trackMobileAnalyticsEvent(
  eventType: string,
  metadata: Record<string, unknown> = {}
) {
  await apiFetch('/api/analytics/events', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: await getAnalyticsSessionId(),
      eventType,
      appSurface: getAppSurface(),
      device: Platform.OS,
      platform: Platform.OS,
      metadata: {
        appVariant: mobileAppVariant,
        ...metadata,
      },
    }),
  });
}
