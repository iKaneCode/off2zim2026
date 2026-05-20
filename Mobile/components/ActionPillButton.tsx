import React from 'react';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from './ThemedText';
import { responsiveFontSize, responsiveSize, Fonts } from '@/constants/Fonts';

export type ActionPillTone = 'neutral' | 'call' | 'message' | 'directions' | 'danger' | 'success';

type ActionPillButtonProps = {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  isDark: boolean;
  tone?: ActionPillTone;
  iconColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
};

const toneColors: Record<ActionPillTone, string> = {
  neutral: '#8E8E93',
  call: '#34C759',
  message: '#007AFF',
  directions: '#0A84FF',
  danger: '#FF3B30',
  success: '#34C759',
};

export function ActionPillButton({
  label,
  iconName,
  onPress,
  disabled = false,
  isDark,
  tone = 'neutral',
  iconColor,
  textColor,
  style,
}: ActionPillButtonProps) {
  const resolvedIconColor = iconColor ?? toneColors[tone];
  const backgroundColor = isDark ? `${resolvedIconColor}24` : `${resolvedIconColor}18`;
  const iconBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const resolvedTextColor = textColor ?? (isDark ? '#FFFFFF' : '#1C1C1E');

  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor, opacity: disabled ? 0.45 : 1 }, style]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBubble, { backgroundColor: iconBackground }]}>
        <Ionicons name={iconName} size={12} color={resolvedIconColor} />
      </View>
      <ThemedText style={[styles.label, { color: resolvedTextColor }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: responsiveSize(38, 34, 42),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveSize(12, 10, 14),
    paddingVertical: responsiveSize(7, 5, 9),
    borderRadius: 999,
    flex: 1,
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
  label: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});
