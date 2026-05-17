import type { ColorSchemeName } from 'react-native';

export function getFilterPillColors(colorScheme: ColorSchemeName | null | undefined) {
  const isDarkMode = colorScheme === 'dark';

  return {
    activeBackground: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
    activeText: isDarkMode ? '#000000' : '#FFFFFF',
    inactiveBackground: isDarkMode ? 'rgba(120, 120, 120, 0.3)' : 'rgba(120, 120, 120, 0.15)',
    inactiveText: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    sortIcon: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
  };
}
