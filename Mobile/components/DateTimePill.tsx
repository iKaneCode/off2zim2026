import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { Fonts, responsiveFontSize, responsiveLineHeight } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export interface DateTimePillProps {
  label: string;
  backgroundColor?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  iconSize?: number;
  iconName?: IoniconName;
  lightTextColor?: string;
  darkTextColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function DateTimePill({
  label,
  backgroundColor,
  iconBackgroundColor,
  iconColor = '#8E8E93',
  iconSize = 11,
  iconName = 'calendar',
  lightTextColor,
  darkTextColor,
  style,
}: DateTimePillProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const resolvedBackground =
    backgroundColor ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
  const resolvedIconBackground = iconBackgroundColor ?? (isDark ? '#2C2C2E' : '#E5E5EA');
  const resolvedLightTextColor = lightTextColor ?? '#1C1C1E';
  const resolvedDarkTextColor = darkTextColor ?? '#ECEDEE';

  return (
    <View style={[styles.container, { backgroundColor: resolvedBackground }, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: resolvedIconBackground }]}>
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
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
    paddingHorizontal: 10,
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
