import React from 'react';
import { Text } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Fonts, TabFontSizes } from '@/constants/Fonts';

interface TabLabelProps {
  focused: boolean;
  label: string;
  isDark?: boolean;
}

export default function TabLabel({ focused, label, isDark }: TabLabelProps) {
  const colorScheme = useColorScheme();
  const resolvedIsDark = isDark ?? colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Text
      style={{
        fontFamily: focused ? Fonts.bold : Fonts.regular, // More pronounced contrast between selected and unselected
        fontSize: focused ? TabFontSizes.labelFocused : TabFontSizes.label,
        color: focused ? (resolvedIsDark ? theme.white : theme.tint) : theme.inactive,
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.82}
    >
      {label}
    </Text>
  );
}
