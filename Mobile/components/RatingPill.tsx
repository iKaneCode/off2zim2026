import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { Fonts, responsiveFontSize, responsiveLineHeight } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface RatingPillProps {
  value: number | string;
  backgroundColor?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  iconSize?: number;
  lightTextColor?: string;
  darkTextColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function RatingPill({
  value,
  backgroundColor,
  iconBackgroundColor,
  iconColor = '#DAA520',
  iconSize = 11,
  lightTextColor,
  darkTextColor,
  style,
}: RatingPillProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const resolvedBackground =
    backgroundColor ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
  const resolvedIconBackground = iconBackgroundColor ?? (isDark ? '#1C1C1E' : '#FFFFFF');
  const resolvedLightTextColor = lightTextColor ?? '#1C1C1E';
  const resolvedDarkTextColor = darkTextColor ?? '#ECEDEE';
  const displayValue = typeof value === 'number' ? value.toFixed(1) : value;

  return (
    <View style={[styles.container, { backgroundColor: resolvedBackground }, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: resolvedIconBackground }]}>
        <Ionicons name="star" size={iconSize} color={iconColor} />
      </View>
      <ThemedText
        style={styles.text}
        numberOfLines={1}
        lightColor={resolvedLightTextColor}
        darkColor={resolvedDarkTextColor}
      >
        {displayValue}
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
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  text: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(13),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
});
