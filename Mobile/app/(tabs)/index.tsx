import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { registerHomeTabNavigation } from '../../components/HomeTabButton';

// Components
import { ThemedView } from '@/components/ThemedView';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { CustomHeader } from '@/components';
import { Fonts, TopTabFontSizes } from '@/constants/Fonts';

// Hooks & Context
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useOverlayDrawer } from '@/context/OverlayDrawerContext';

// Screens
import Featured from '@/app/screens/Featured';
import DestinationsScreen from '@/app/screens/DestinationsScreen';
import Stays from '@/app/screens/Stays';
import Events from '@/app/screens/Events';
import ThingsToDoScreen from '@/app/screens/ThingsToDoScreen';
import Bus from '@/app/screens/Bus';
import Flights from '@/app/screens/Flights';

const TopTab = createMaterialTopTabNavigator();

// Navigation registration component
function NavigationRegistrar() {
  const navigation = useNavigation();

  useEffect(() => {
    console.log('📱 Registering home tab navigation');
    registerHomeTabNavigation(() => {
      console.log('🎯 Navigation function called, navigating to Featured');
      navigation.navigate('Featured' as never);
    });
  }, [navigation]);

  return null;
}

// Wrapper component for Featured to include navigation registrar
function FeaturedWrapper() {
  return (
    <>
      <NavigationRegistrar />
      <Featured />
    </>
  );
}

// Tab configuration data
const TAB_SCREENS = [
  { name: 'Featured', component: FeaturedWrapper, label: 'Featured' },
  { name: 'Destinations', component: DestinationsScreen, label: 'Destinations' },
  { name: 'Stays', component: Stays, label: 'Stays' },
  { name: 'Events', component: Events, label: 'Events' },
  { name: 'ThingsToDo', component: ThingsToDoScreen, label: 'Experiences' },
  { name: 'Bus', component: Bus, label: 'Transport' },
  { name: 'Flights', component: Flights, label: 'Flights' },
] as const;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Use our custom drawer context
  const { openDrawer } = useOverlayDrawer();

  const handleItineraryPress = () => {
    router.push('/screens/itinerary');
  };

  // Simple direct drawer handler
  const handleMenuPress = useCallback(() => {
    openDrawer();
  }, [openDrawer]);

  const getTabBarOptions = () => {
    const theme = Colors[colorScheme ?? 'light'];
    const tintColor = isDark ? theme.white : theme.tint;
    const backgroundColor = isDark ? theme.appBackground : theme.appBackground;

    return {
      tabBarScrollEnabled: true,
      tabBarStyle: [styles.tabBar, { backgroundColor }],
      tabBarItemStyle: styles.tabBarItem,
      tabBarLabelStyle: {
        textTransform: 'none' as const,
      },
      tabBarActiveTintColor: tintColor,
      tabBarInactiveTintColor: theme.inactive,
      tabBarIndicatorStyle: {
        ...styles.tabBarIndicator,
        backgroundColor: tintColor,
      },
      tabBarPressColor: 'transparent',
    };
  };

  return (
    <ThemedView
      style={styles.container}
      lightColor={Colors.light.appBackground}
      darkColor={Colors.dark.appBackground}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <IOSScreenWrapper>
        <View
          style={[
            styles.headerTabBlock,
            { backgroundColor: isDark ? Colors.dark.appBackground : Colors.light.appBackground },
          ]}
        >
          <CustomHeader
            showLogo
            leftAction={{
              icon: 'menu',
              onPress: handleMenuPress,
              color: '#FF3B30',
            }}
            rightAction={{
              icon: 'calendar-outline',
              onPress: handleItineraryPress,
              color: '#FF3B30',
            }}
            style={{ marginBottom: 0 }}
          />

          <View style={styles.tabBarContainer}>
            <TopTab.Navigator initialRouteName="Featured" screenOptions={getTabBarOptions()}>
              {TAB_SCREENS.map(({ name, component, label }) => (
                <TopTab.Screen
                  key={name}
                  name={name}
                  component={component}
                  options={{
                    // Render label inside a Text component to satisfy RN requirement
                    tabBarLabel: ({ focused }) => (
                      <Text
                        style={{
                          color: focused
                            ? isDark
                              ? Colors.dark.tint
                              : Colors.light.tint
                            : Colors[colorScheme ?? 'light'].inactive,
                          fontFamily: focused ? Fonts.bold : Fonts.regular,
                          fontSize: focused ? TopTabFontSizes.labelFocused : TopTabFontSizes.label,
                          textTransform: 'none',
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                      >
                        {label}
                      </Text>
                    ),
                  }}
                />
              ))}
            </TopTab.Navigator>
          </View>
        </View>
      </IOSScreenWrapper>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  headerTabBlock: {
    flex: 1,
    // backgroundColor will be set dynamically based on theme
  },
  tabBarContainer: {
    flex: 1,
    position: 'relative',
  },
  tabBar: {
    // backgroundColor will be set dynamically based on theme
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
    height: 50,
  },
  tabBarItem: {
    paddingVertical: 10,
  },
  tabBarIndicator: {
    height: 4,
    borderRadius: 2,
    bottom: 0,
  },
});
