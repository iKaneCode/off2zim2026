import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import React from 'react';
import { usePathname } from 'expo-router';

// Import the navigateToFeatured function
let navigateToFeatured: (() => void) | null = null;
let scrollToTopAndRefresh: (() => void) | null = null;

// Allow the index screen to register its navigation function
export function registerHomeTabNavigation(navigateFn: () => void) {
  navigateToFeatured = navigateFn;
}

// Allow Featured screen to register its scroll and refresh function
export function registerFeaturedScrollAndRefresh(scrollRefreshFn: () => void) {
  scrollToTopAndRefresh = scrollRefreshFn;
}

export function HomeTabButton(props: BottomTabBarButtonProps) {
  const pathname = usePathname();
  const isOnHomePage = pathname === '/' || pathname.startsWith('/index');
  const isOnFeaturedTab =
    pathname === '/' || pathname === '/index' || pathname === '/index/Featured';

  const handlePress = (ev: any) => {
    console.log('🏠 Home tab pressed', {
      pathname,
      isOnHomePage,
      isOnFeaturedTab,
      hasNavigation: !!navigateToFeatured,
      hasScrollRefresh: !!scrollToTopAndRefresh,
    });

    // If we're on Featured tab and have scroll/refresh, do that instead
    if (isOnFeaturedTab && scrollToTopAndRefresh) {
      console.log('📜 Scrolling to top and refreshing Featured');
      scrollToTopAndRefresh();
      if (process.env.EXPO_OS === 'ios') {
      }
      return;
    }

    // If we're already on the home page (but not Featured) and have navigation, go to Featured
    if (isOnHomePage && navigateToFeatured) {
      console.log('🎯 Calling navigation to Featured');
      navigateToFeatured();
      if (process.env.EXPO_OS === 'ios') {
      }
      // Don't prevent default - let the tab still get focus
      return;
    }

    // Otherwise, let the default behavior happen
    if (props.onPress) {
      props.onPress(ev);
    }
  };

  return (
    <PlatformPressable
      {...props}
      onPressIn={ev => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
        }
        props.onPressIn?.(ev);
      }}
      onPress={handlePress}
    />
  );
}
