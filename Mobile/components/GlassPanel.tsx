import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassPanelProps {
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Renders a BlurView on iOS and a plain View on Android.
 * Android blur via BlurView is unreliable — callers should set an opaque
 * `backgroundColor` in `style` so Android looks correct.
 */
export function GlassPanel({ intensity = 28, tint = 'default', style, children }: GlassPanelProps) {
  if (Platform.OS === 'android') {
    return <View style={style}>{children}</View>;
  }
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      experimentalBlurMethod="dimezisBlurView"
      style={style}
    >
      {children}
    </BlurView>
  );
}
