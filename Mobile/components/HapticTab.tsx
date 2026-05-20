import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import React from 'react';

// Import the navigateToFeatured function
let navigateToFeatured: (() => void) | null = null;

// Allow the index screen to register its navigation function
export function registerHomeTabNavigation(navigateFn: () => void) {
  navigateToFeatured = navigateFn;
}

export function HapticTab(props: BottomTabBarButtonProps) {
  const isAlreadyFocused = props.accessibilityState?.selected;

  // Check if this is the Home tab by inspecting the children
  const isHomeTab = React.Children.toArray(props.children).some((child: any) => {
    return (
      child?.props?.children === 'Home' ||
      (typeof child === 'object' && child?.type?.displayName === 'Home')
    );
  });

  const handlePress = (ev: any) => {
    // If this is the Home tab and it's already focused, navigate to Featured
    if (isHomeTab && isAlreadyFocused && navigateToFeatured) {
      console.log('🏠 Home tab re-pressed, navigating to Featured');
      ev.preventDefault();
      navigateToFeatured();
      if (process.env.EXPO_OS === 'ios') {
      }
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
