import type { ColorSchemeName } from 'react-native';

export type ProfileLocationPillTone = 'surface' | 'overlay';

export function getProfileLocationPillColors(
  colorScheme: ColorSchemeName | null | undefined,
  tone: ProfileLocationPillTone = 'surface'
) {
  const isDark = colorScheme === 'dark';

  if (tone === 'overlay') {
    return {
      background: 'rgba(0,0,0,0.48)',
      border: 'rgba(255,255,255,0.15)',
      iconBackground: 'rgba(255,255,255,0.16)',
      icon: '#FF3B30',
      text: '#FFFFFF',
    };
  }

  return {
    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    iconBackground: isDark ? '#1C1C1E' : '#FFFFFF',
    icon: '#FF3B30',
    text: isDark ? '#FFFFFF' : '#1C1C1E',
  };
}
