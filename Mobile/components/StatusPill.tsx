import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { ThemedText } from './ThemedText';
import { Fonts, responsiveFontSize, responsiveLineHeight, responsiveSize } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';

const DEFAULT_ICON: ComponentProps<typeof Ionicons>['name'] = 'time';

export interface StatusPillProps {
  label: string;
  iconName?: ComponentProps<typeof Ionicons>['name'];
  backgroundColor?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  lightTextColor?: string;
  darkTextColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({
  label,
  iconName = DEFAULT_ICON,
  backgroundColor,
  iconBackgroundColor,
  iconColor,
  lightTextColor,
  darkTextColor,
  iconSize = 11,
  style,
}: StatusPillProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const resolvedBackground =
    backgroundColor ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
  const resolvedIconBackground = iconBackgroundColor ?? (isDark ? '#1C1C1E' : '#FFFFFF');
  const resolvedLightTextColor = lightTextColor ?? '#1C1C1E';
  const resolvedDarkTextColor = darkTextColor ?? '#ECEDEE';
  const resolvedIconColor = iconColor ?? (isDark ? resolvedDarkTextColor : resolvedLightTextColor);

  return (
    <View style={[styles.container, { backgroundColor: resolvedBackground }, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: resolvedIconBackground }]}>
        <Ionicons name={iconName} size={iconSize} color={resolvedIconColor} />
      </View>
      <ThemedText
        style={styles.text}
        numberOfLines={1}
        lightColor={resolvedLightTextColor}
        darkColor={resolvedDarkTextColor}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSize(10, 8, 12),
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  iconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 0,
  },
  text: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(13),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});
