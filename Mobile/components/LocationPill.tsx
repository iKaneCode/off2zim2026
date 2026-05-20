import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { Fonts, responsiveFontSize, responsiveLineHeight } from '@/constants/Fonts';
import type { IoniconName } from '@/utils/amenityUtils';
import { useColorScheme } from '@/hooks/useColorScheme';


export interface LocationPillProps {
  label: string;
  backgroundColor?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  iconName?: IoniconName;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  lightTextColor?: string;
  darkTextColor?: string;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
  variant?: 'default' | 'compact';
}

export function LocationPill({
  label,
  backgroundColor,
  iconBackgroundColor,
  iconColor,
  iconName = 'location',
  style,
  iconSize,
  lightTextColor,
  darkTextColor,
  textColor,
  textStyle,
  variant = 'default',
}: LocationPillProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const resolvedIconSize = iconSize ?? (variant === 'compact' ? 11 : 12);
  const resolvedBackground = backgroundColor ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
  const resolvedIconBackground = iconBackgroundColor ?? (isDark ? '#1C1C1E' : '#FFFFFF');
  const resolvedIconColor = iconColor ?? '#FF3B30';
  const resolvedLightTextColor = textColor ?? lightTextColor ?? (isDark ? '#FFFFFF' : '#000000');
  const resolvedDarkTextColor = textColor ?? darkTextColor ?? (isDark ? '#FFFFFF' : '#000000');

  return (
    <View
      style={[
        styles.container,
        variant === 'compact' && styles.containerCompact,
        { backgroundColor: resolvedBackground },
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrapper,
          variant === 'compact' && styles.iconWrapperCompact,
          { backgroundColor: resolvedIconBackground },
        ]}
      >
        <Ionicons name={iconName} size={resolvedIconSize} color={resolvedIconColor} />
      </View>
      <ThemedText
        style={[styles.text, variant === 'compact' && styles.textCompact, textStyle]}
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  containerCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  iconWrapperCompact: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 4,
  },
  text: {
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveLineHeight(15),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  textCompact: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(13),
  },
});
