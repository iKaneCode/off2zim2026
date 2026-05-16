import React, { FC, useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  ScrollView,
  Animated,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { TabBarBackground } from '@/components/ui/BlurBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Fonts, TabFontSizes } from '@/constants/Fonts';

interface TabMeasurement {
  x: number;
  width: number;
  label: string;
}

interface CustomSlidingTabBarProps extends MaterialTopTabBarProps {
  containerStyle?: ViewStyle;
}

// This component is designed to work as a direct replacement for Material Top Tabs tab bar
const SlidingTabBar: FC<CustomSlidingTabBarProps> = props => {
  const { state, descriptors, navigation, containerStyle } = props;

  const scrollRef = useRef<ScrollView>(null);
  const indicatorAnim = useRef({
    x: new Animated.Value(0),
    width: new Animated.Value(0),
  }).current;

  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Pan gesture for swipe between tabs
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd(e => {
      // Swipe left or right based on velocity and distance
      if (Math.abs(e.velocityX) > 200 || Math.abs(e.translationX) > 40) {
        const direction = e.velocityX > 0 ? -1 : 1;
        const nextIndex = Math.max(0, Math.min(state.routes.length - 1, state.index + direction));
        if (nextIndex !== state.index) {
          navigation.navigate(state.routes[nextIndex].name);
        }
      }
    });

  // Smoothly animate the indicator when tab changes
  useEffect(() => {
    if (measurements.length <= state.index) return;

    const { x, width } = measurements[state.index] || { x: 0, width: 0 };

    Animated.parallel([
      Animated.spring(indicatorAnim.x, {
        toValue: x,
        tension: 350,
        friction: 25,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorAnim.width, {
        toValue: width,
        tension: 350,
        friction: 25,
        useNativeDriver: false,
      }),
    ]).start();
  }, [state.index, indicatorAnim.width, indicatorAnim.x, measurements]);

  // Measure each tab label
  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setMeasurements(prev => {
        const next = [...prev];
        next[index] = {
          x,
          width,
          label: state.routes[index].name,
        };
        return next;
      });
    },
    [state.routes]
  );

  // Initialize indicator position and width
  useEffect(() => {
    if (measurements[state.index]) {
      const { x, width } = measurements[state.index];
      indicatorAnim.x.setValue(x);
      indicatorAnim.width.setValue(width);
    }
  }, [measurements, state.index, indicatorAnim.width, indicatorAnim.x]);

  const handleTabPress = useCallback(
    (index: number) => {
      const route = state.routes[index];
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented && state.index !== index) {
        navigation.navigate(route.name);
      }
    },
    [navigation, state.index, state.routes]
  );

  const handleTabLongPress = (index: number) => {
    navigation.emit({
      type: 'tabLongPress',
      target: state.routes[index].key,
    });
  };

  useEffect(() => {
    if (measurements.length <= state.index) {
      return;
    }

    const { x, width } = measurements[state.index];
    const scrollTo = x - screenWidth / 2 + width / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, scrollTo), animated: true });
  }, [state.index, measurements, screenWidth]);

  // Determine theme-specific colors
  const activeIndicatorColor = theme.tint;
  const labelInactiveColor = theme.inactive;

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, containerStyle]}>
        <View style={styles.tabBarBackground}>
          <TabBarBackground />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const color = focused ? activeIndicatorColor : labelInactiveColor;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel}
                onPress={() => handleTabPress(index)}
                onLongPress={() => handleTabLongPress(index)}
                onLayout={event => handleTabLayout(index, event)}
                activeOpacity={0.8}
                style={styles.tabButton}
              >
                <ThemedText
                  type="default"
                  style={[
                    styles.tabLabel,
                    {
                      color,
                      fontFamily: focused ? Fonts.bold : Fonts.medium,
                      fontSize: focused ? TabFontSizes.labelFocused : TabFontSizes.label,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {descriptors[route.key]?.options.title ?? route.name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}

          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                transform: [{ translateX: indicatorAnim.x }],
                width: indicatorAnim.width,
                backgroundColor: activeIndicatorColor,
              },
            ]}
          />
        </ScrollView>
      </View>
    </GestureDetector>
  );
};

export default memo(SlidingTabBar);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBarBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: -1,
  },
  scrollContent: {
    alignItems: 'center',
    minHeight: 48,
  },
  tabButton: {
    paddingHorizontal: 12,
    height: 48,
  },
  tabLabel: {
    fontSize: TabFontSizes.label,
    color: '#687076',
    fontFamily: Fonts.medium,
    opacity: 1,
    textShadowRadius: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
  },
  indicator: {
    position: 'absolute',
    bottom: 6,
    height: 5,
    borderRadius: 999,
    zIndex: 1,
    opacity: 1,
  },
});
