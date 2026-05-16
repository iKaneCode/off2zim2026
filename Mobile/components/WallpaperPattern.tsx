import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface WallpaperPatternProps extends Omit<ViewProps, 'children'> {
  offsetTop?: number;
  offsetBottom?: number;
  unlimited?: boolean;
  height?: number;
}

export function WallpaperPattern({
  offsetTop = 0,
  offsetBottom = 0,
  style,
  ...viewProps
}: WallpaperPatternProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View
      pointerEvents="none"
      {...viewProps}
      style={[
        styles.container,
        {
          top: offsetTop,
          bottom: offsetBottom,
          backgroundColor: theme.appBackground,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    right: 0,
    position: 'absolute',
  },
});
