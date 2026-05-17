import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface ListImageCardSkeletonProps {
  isDark?: boolean;
  count?: number;
}

function SkeletonBlock({
  width,
  height,
  borderRadius = 6,
  opacity,
  baseColor,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  opacity: Animated.AnimatedInterpolation<number>;
  baseColor: string;
}) {
  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor: baseColor,
        opacity,
      }}
    />
  );
}

function SingleSkeleton({ isDark }: { isDark: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  const baseColor = isDark ? '#3A3A3C' : '#D1D1D6';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Image area */}
      <SkeletonBlock
        width={90}
        height={90}
        borderRadius={12}
        opacity={opacity}
        baseColor={baseColor}
      />

      {/* Content area */}
      <View style={styles.content}>
        {/* Title */}
        <SkeletonBlock
          width="70%"
          height={18}
          borderRadius={6}
          opacity={opacity}
          baseColor={baseColor}
        />

        {/* Top row — two pill shapes */}
        <View style={styles.pillRow}>
          <SkeletonBlock
            width={90}
            height={26}
            borderRadius={13}
            opacity={opacity}
            baseColor={baseColor}
          />
          <SkeletonBlock
            width={60}
            height={26}
            borderRadius={13}
            opacity={opacity}
            baseColor={baseColor}
          />
        </View>

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <SkeletonBlock
            width={80}
            height={26}
            borderRadius={13}
            opacity={opacity}
            baseColor={baseColor}
          />
          <View style={styles.bottomRight}>
            <SkeletonBlock
              width={30}
              height={12}
              borderRadius={4}
              opacity={opacity}
              baseColor={baseColor}
            />
            <SkeletonBlock
              width={60}
              height={18}
              borderRadius={4}
              opacity={opacity}
              baseColor={baseColor}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export function ListImageCardSkeleton({ isDark = false, count = 3 }: ListImageCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeleton key={i} isDark={isDark} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  bottomRight: {
    marginLeft: 'auto',
    gap: 4,
    alignItems: 'flex-end',
  },
});
