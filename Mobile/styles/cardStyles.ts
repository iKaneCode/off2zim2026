import { Platform, StyleSheet } from 'react-native';

/**
 * Shared style for message/notification list cards.
 * Used by both the Messages and Notifications screens.
 */
export const listCardBase = {
  shadowColor: '#000' as const,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 0,
};

export function listCardDynamicStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? 'rgba(37, 37, 41, 0.9)' : '#FFFFFF',
    ...(Platform.OS === 'android' && {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    }),
  };
}

/**
 * Platform-safe shadow.
 * iOS: subtle drop-shadow.   Android: elevation 0 (prevents harsh shadows) + hairline border.
 *
 * Usage:  ...appShadow(isDark)
 */
export function appShadow(
  isDark: boolean,
  opts?: { opacity?: number; radius?: number; height?: number }
) {
  const { opacity = 0.1, radius = 8, height = 2 } = opts ?? {};
  return {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: 0,
    ...(Platform.OS === 'android' && {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    }),
  };
}

/**
 * Same as appShadow but without an Android hairline border (use for non-card surfaces).
 */
export function appShadowIOS(opts?: { opacity?: number; radius?: number; height?: number }) {
  const { opacity = 0.1, radius = 8, height = 2 } = opts ?? {};
  return {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: 0,
  };
}
