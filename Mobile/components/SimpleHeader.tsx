import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Logo } from './Logo';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';

interface SimpleHeaderProps {
  onMenuPress: () => void;
  onCartPress?: () => void;
  title?: string;
  backgroundColor?: string;
}

export function SimpleHeader({
  onMenuPress,
  onCartPress,
  title,
  backgroundColor,
}: SimpleHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // Use provided backgroundColor or default to app background
  const headerBgColor =
    backgroundColor || (isDark ? Colors.dark.appBackground : Colors.light.appBackground);

  // For iOS, especially notched devices, reduce the actual header height to push content up
  const headerHeight = Platform.OS === 'ios' ? (insets.top > 20 ? 44 : 42) : 56;
  const handleCartPress = () => {
    if (onCartPress) {
      onCartPress();
    } else {
      router.push('/cart');
    }
  };

  // Calculate padding to ensure content is pushed up further on iOS devices
  const notchHeight = insets.top;
  // For iOS, especially devices with notches, use minimal top padding to push content up
  const topPadding = Platform.OS === 'ios' ? (notchHeight > 20 ? 0 : 4) : 8;
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + topPadding,
          paddingBottom: 0,
          height: headerHeight + insets.top,
          borderBottomWidth: 0,
          marginBottom: 0, // Ensure no margin at the bottom
          backgroundColor: headerBgColor, // Use consistent background color
        },
      ]}
    >
      <TouchableOpacity
        style={styles.leftButton}
        onPress={onMenuPress}
        hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        activeOpacity={0.5}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
              overflow: 'visible', // Ensure shadow is visible
            },
            isDark
              ? {
                  shadowColor: '#FFF',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.12,
                  shadowRadius: 2,
                }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                },
          ]}
        >
          <Ionicons name="menu" size={22} color={colors.icon} />
        </View>
      </TouchableOpacity>

      <View
        style={[
          styles.titleContainer,
          // Push logo up more aggressively on iOS, especially with notches
          Platform.OS === 'ios' ? { marginTop: insets.top > 20 ? -6 : -3 } : { marginTop: 0 },
        ]}
      >
        <Logo size="large" />
      </View>

      <TouchableOpacity
        style={styles.rightButton}
        onPress={handleCartPress}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
              overflow: 'visible', // Ensure shadow is visible
            },
            isDark
              ? {
                  shadowColor: '#FFF',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.12,
                  shadowRadius: 2,
                }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                },
          ]}
        >
          <Ionicons name="cart-outline" size={20} color={colors.icon} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    zIndex: 1000,
    position: 'relative', // Needed for the HeaderBackground to position correctly
    overflow: 'hidden', // To ensure blur stays within the header bounds
    // Add solid background for iOS
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      },
    }),
  },
  leftButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 10, // Increased zIndex to ensure it's above other elements
    // Align with logo - push up on iOS
    paddingBottom: 0,
    marginTop: Platform.OS === 'ios' ? -6 : 0,
    paddingLeft: 4, // Add some padding to increase the effective touch area
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: 44,
  },
  rightButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 2,
    // Align with logo - push up on iOS
    paddingBottom: 0,
    marginTop: Platform.OS === 'ios' ? -6 : 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
});
