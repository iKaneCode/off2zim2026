import React from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { Fonts, responsiveFontSize, responsiveSize } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getProfileLocationPillColors } from '@/utils/profileLocationPillStyles';

export interface ProfileLocationPillProps {
  label: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  iconBackgroundColor?: string;
  textColor?: string;
  iconColor?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
}

export function ProfileLocationPill({
  label,
  style,
  textStyle,
  backgroundColor,
  iconBackgroundColor,
  textColor,
  iconColor = '#FF3B30',
  iconName = 'location',
  iconSize = 10,
}: ProfileLocationPillProps) {
  const colorScheme = useColorScheme();
  const pillColors = getProfileLocationPillColors(colorScheme);

  const resolvedBackground = backgroundColor ?? pillColors.background;
  const resolvedIconBackground = iconBackgroundColor ?? pillColors.iconBackground;
  const resolvedTextColor = textColor ?? pillColors.text;

  return (
    <View style={[styles.pill, { backgroundColor: resolvedBackground }, style]}>
      <View style={[styles.iconBubble, { backgroundColor: resolvedIconBackground }]}>
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      </View>
      <ThemedText style={[styles.text, { color: resolvedTextColor }, textStyle]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSize(10, 8, 12),
    paddingVertical: responsiveSize(5, 4, 7),
    borderRadius: 999,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  iconBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    elevation: 0,
  },
  text: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
});

ProfileLocationPill.displayName = 'ProfileLocationPill';
