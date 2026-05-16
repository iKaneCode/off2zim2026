import React, { ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText, type ThemedTextProps } from './ThemedText';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface TitleWithLocationProps {
  title: string;
  location: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  pillStyle?: StyleProp<ViewStyle>;
  pillTextStyle?: StyleProp<TextStyle>;
  titleProps?: Omit<ThemedTextProps, 'children' | 'style'>;
  pillTextProps?: Omit<ThemedTextProps, 'children' | 'style'>;
  pillBackgroundLight?: string;
  pillBackgroundDark?: string;
  pillTextLight?: string;
  pillTextDark?: string;
  iconName?: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  iconColor?: string;
  hideIcon?: boolean;
}

export function TitleWithLocation({
  title,
  location,
  style,
  titleStyle,
  pillStyle,
  pillTextStyle,
  titleProps,
  pillTextProps,
  pillBackgroundLight = 'rgba(255,255,255,0.8)',
  pillBackgroundDark = '#1C1C1E',
  pillTextLight = '#000000',
  pillTextDark = '#FFFFFF',
  iconName = 'location-outline',
  iconSize = 16,
  iconColor = '#FF3B30',
  hideIcon = false,
}: TitleWithLocationProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const pillBackgroundColor = isDark ? pillBackgroundDark : pillBackgroundLight;
  const pillTextColor = isDark ? pillTextDark : pillTextLight;

  return (
    <View style={[styles.container, style]}>
      <ThemedText
        {...titleProps}
        style={[styles.title, titleStyle]}
        numberOfLines={titleProps?.numberOfLines ?? 1}
        ellipsizeMode={titleProps?.ellipsizeMode ?? 'tail'}
      >
        {title}
      </ThemedText>

      <View style={[styles.pillContainer, { backgroundColor: pillBackgroundColor }, pillStyle]}>
        {!hideIcon && (
          <Ionicons name={iconName} size={iconSize} color={iconColor} style={styles.icon} />
        )}
        <ThemedText
          {...pillTextProps}
          style={[styles.pillText, { color: pillTextColor }, pillTextStyle]}
          numberOfLines={pillTextProps?.numberOfLines ?? 1}
          ellipsizeMode={pillTextProps?.ellipsizeMode ?? 'tail'}
        >
          {location}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'nowrap',
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    textAlign: 'left',
    marginRight: 16,
    flexShrink: 1,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: 240,
    minWidth: 100,
  },
  icon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});

TitleWithLocation.displayName = 'TitleWithLocation';
