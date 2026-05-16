import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ShimmerPlaceholderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const colorScheme = useColorScheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1450,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1450,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: colorScheme === 'dark' ? [0.62, 1] : [0.72, 1],
  });

  const overlayOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: colorScheme === 'dark' ? [0.08, 0.2] : [0.12, 0.36],
  });

  const baseColor = colorScheme === 'dark' ? '#25272B' : '#D5DCE3';
  const overlayColor = colorScheme === 'dark' ? '#FFFFFF' : '#FFFFFF';

  return (
    <Animated.View
      style={[
        styles.placeholder,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          opacity,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.softOverlay,
          {
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    overflow: 'hidden',
  },
  softOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
