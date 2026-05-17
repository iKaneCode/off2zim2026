import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Haptics from 'expo-haptics';
import { FontAwesome6 } from '@expo/vector-icons';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { getFilterPillColors } from '@/utils/filterPillStyles';

interface FilterOption {
  key: string;
  label: string;
}

interface FilterBarProps {
  options: FilterOption[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  style?: any;
  containerStyle?: any;
  sortDirection?: 'asc' | 'desc';
  onSortDirectionChange?: (direction: 'asc' | 'desc') => void;
  showSortToggle?: boolean;
  activePillBackground?: string;
  activePillTextColor?: string;
}

export function FilterBar({
  options,
  activeFilter,
  onFilterChange,
  style,
  containerStyle,
  sortDirection = 'desc',
  onSortDirectionChange,
  showSortToggle = false,
  activePillBackground,
  activePillTextColor,
}: FilterBarProps) {
  const colorScheme = useColorScheme();
  const pillColors = getFilterPillColors(colorScheme);
  const scrollViewRef = useRef<ScrollView>(null);
  const pillOffsets = useRef<Record<string, number>>({});

  // Filter button animations
  const filterAnimations = useRef(
    options.reduce(
      (acc, option) => {
        acc[option.key] = new Animated.Value(activeFilter === option.key ? 1 : 0);
        return acc;
      },
      {} as Record<string, Animated.Value>
    )
  ).current;

  // Define animation for tab switching
  const tabSwitchAnim = useMemo(
    () => ({
      duration: 300,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
        duration: 200,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
        duration: 350,
      },
    }),
    []
  );

  // Scroll to the active filter pill whenever it changes
  useEffect(() => {
    const offset = pillOffsets.current[activeFilter];
    if (offset !== undefined) {
      scrollViewRef.current?.scrollTo({ x: Math.max(0, offset - 16), animated: true });
    }
  }, [activeFilter]);

  // Update filter animation values when activeFilter changes
  useEffect(() => {
    LayoutAnimation.configureNext(tabSwitchAnim);

    Object.keys(filterAnimations).forEach(key => {
      if (key === activeFilter) {
        filterAnimations[key].setValue(1);
      } else {
        filterAnimations[key].setValue(0);
      }
    });
  }, [activeFilter, filterAnimations, tabSwitchAnim]);

  const handleFilterPress = (filter: string) => {
    if (filter !== activeFilter) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onFilterChange(filter);
    }
  };

  const handleSortToggle = () => {
    if (onSortDirectionChange) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSortDirectionChange(newDirection);
    }
  };

  return (
    <View style={[styles.filterContainer, containerStyle]}>
      <View style={styles.filterWrapper}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterScrollContent, style]}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
        >
          {options.map(option => {
            const isActive = activeFilter === option.key;
            const animValue = filterAnimations[option.key];

            const scale = animValue.interpolate({
              inputRange: [0, 0.4, 0.8, 1],
              outputRange: [0.94, 0.96, 0.99, 1],
              extrapolate: 'clamp',
            });

            const textOpacity = animValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.7, 0.85, 1],
              extrapolate: 'clamp',
            });

            const translateY = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            });

            return (
              <TouchableOpacity
                key={option.key}
                onLayout={e => { pillOffsets.current[option.key] = e.nativeEvent.layout.x; }}
                style={[
                  styles.filterButton,
                  isActive && styles.filterButtonActive,
                  isActive && {
                    backgroundColor: activePillBackground ?? pillColors.activeBackground,
                  },
                  !isActive && {
                    backgroundColor: pillColors.inactiveBackground,
                  },
                ]}
                onPress={() => handleFilterPress(option.key)}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={{
                    transform: [{ scale }, { translateY }],
                    opacity: textOpacity,
                  }}
                >
                  <ThemedText
                    style={[
                      styles.filterText,
                      isActive && styles.filterTextActive,
                      {
                        color: isActive ? (activePillTextColor ?? pillColors.activeText) : pillColors.inactiveText,
                      },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {showSortToggle && (
          <TouchableOpacity
            style={[
              styles.sortToggle,
              {
                backgroundColor: pillColors.inactiveBackground,
              },
            ]}
            onPress={handleSortToggle}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name={sortDirection === 'asc' ? 'arrow-up-wide-short' : 'arrow-down-wide-short'}
              size={18}
              color={pillColors.sortIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  filterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  filterText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.regular,
    color: '#AAAAAA',
  },
  filterTextActive: {
    fontFamily: Fonts.bold,
  },
  sortToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
});
