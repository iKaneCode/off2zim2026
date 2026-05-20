import { Redirect, Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Platform, Animated, Text } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { HomeTabButton } from '../../components/HomeTabButton';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { TabBarIcon } from '@/components/TabBarIcon';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts, TabFontSizes } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getMobilePostAuthRoute, mobileAppVariant } from '@/config/appVariant';
import { useNotificationsContext } from '@/context/NotificationsContext';
import { useMessagesContext } from '@/context/MessagesContext';

function AnimatedTabLabel({
  focused,
  children,
  color,
}: {
  focused: boolean;
  children: string;
  color: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.05 : 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.Text
      style={{
        fontFamily: Fonts.bold,
        fontSize: focused ? TabFontSizes.labelFocused : TabFontSizes.label,
        letterSpacing: 0.4,
        color,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.82}
    >
      {children}
    </Animated.Text>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { unreadCount } = useNotificationsContext();
  const { unreadCount: unreadMessages } = useMessagesContext();

  if (mobileAppVariant !== 'explorer') {
    return <Redirect href={getMobilePostAuthRoute()} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        headerTitleAlign: 'center',
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: {
          fontFamily: Fonts.bold,
          fontSize: TabFontSizes.label,
          letterSpacing: 0.4,
        },
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            backgroundColor: 'transparent',
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false, // We'll use our custom SimpleHeader instead
          tabBarButton: HomeTabButton,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" focused={focused} color={color} size={24} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel focused={focused} color={color}>
              Home
            </AnimatedTabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerShown: false, // Use custom header instead of the default tab header
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            fontSize: responsiveFontSize(9),
            lineHeight: 14,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 3,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="notifications" focused={focused} color={color} size={24} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel focused={focused} color={color}>
              Notifications
            </AnimatedTabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: false, // Use custom header instead of the default tab header
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="earth" focused={focused} color={color} size={24} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel focused={focused} color={color}>
              Explore
            </AnimatedTabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Bookings',
          headerShown: false, // Use custom header instead of the default tab header
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="bag" focused={focused} color={color} size={24} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel focused={focused} color={color}>
              Bookings
            </AnimatedTabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerShown: false, // Use custom header instead of the default tab header
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: {
            fontSize: responsiveFontSize(9),
            lineHeight: 14,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 3,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="chatbubbles" focused={focused} color={color} size={24} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <AnimatedTabLabel focused={focused} color={color}>
              Messages
            </AnimatedTabLabel>
          ),
        }}
      />
    </Tabs>
  );
}
