import { cloneElement, useEffect, useMemo, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';
import { preloadLogoImages } from '@/utils/imageCache';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { Colors } from '@/constants/Colors';
import { OverlayDrawerProvider, useOverlayDrawer } from '@/context/OverlayDrawerContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DestinationsProvider } from '@/context/DestinationsContext';
import { FeaturedDataProvider } from '@/context/FeaturedDataContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { MessagesProvider } from '@/context/MessagesContext';
import { AppAlertProvider } from '@/context/AppAlertContext';
import { PushDrawer } from '@/components/PushDrawer';
import { getMobilePostAuthRoute, mobileAppVariant } from '@/config/appVariant';

const fullLogoBlack = require('@/assets/images/full_logo_black.png');
const fullLogoWhite = require('@/assets/images/full_logo_white.png');

const AuthHeader = () => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const headerLogo = colorScheme === 'dark' ? fullLogoWhite : fullLogoBlack;
  const palette = Colors[colorScheme ?? 'light'];
  const safeTop = insets.top;
  const imageHeight = 96;
  const headerHeight = safeTop + imageHeight + 32;

  return (
    <View
      style={{
        height: headerHeight,
        paddingTop: safeTop,
        paddingHorizontal: 24,
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <Image
          source={headerLogo}
          style={{ height: imageHeight, width: 288 }}
          resizeMode="contain"
        />
      </View>
      <Text
        style={{
          marginTop: 12,
          fontFamily: Fonts.bold,
          fontSize: responsiveFontSize(28),
          color: palette.text,
          textAlign: 'left',
        }}
      >
        Welcome
      </Text>
    </View>
  );
};

type WithDefaultProps<T> = T & {
  defaultProps?: {
    style?: unknown;
  };
};

const weightToFontFamily = (weight?: TextStyle['fontWeight']) => {
  if (!weight) {
    return undefined;
  }

  const normalized = typeof weight === 'string' ? weight.toLowerCase() : String(weight);

  switch (normalized) {
    case '100':
    case '200':
    case '300':
    case 'light':
      return Fonts.light;
    case '400':
    case 'normal':
    case 'regular':
      return Fonts.regular;
    case '500':
    case '600':
    case 'medium':
    case 'semibold':
    case 'demibold':
      return Fonts.medium;
    case '700':
    case '800':
    case '900':
    case 'bold':
    case 'extrabold':
    case 'black':
      return Fonts.bold;
    default:
      return undefined;
  }
};

const ensureBrandonStyle = (style?: StyleProp<TextStyle>) => {
  const flattened = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...rest } = flattened;

  const mappedFamily = fontFamily ?? weightToFontFamily(fontWeight) ?? Fonts.regular;

  return {
    ...rest,
    fontFamily: mappedFamily,
  };
};

const patchTextComponents = () => {
  const textComponent = Text as any;

  if (!textComponent.__brandonPatched) {
    const defaultRender = textComponent.render;
    textComponent.render = function render(...args: any[]) {
      const origin = defaultRender.call(this, ...args);
      if (!origin) {
        return origin;
      }

      return cloneElement(origin, {
        style: ensureBrandonStyle(origin.props?.style),
      });
    };

    textComponent.__brandonPatched = true;
  }

  const textInputComponent = TextInput as any;

  if (!textInputComponent.__brandonPatched) {
    const defaultRender = textInputComponent.render;
    textInputComponent.render = function render(...args: any[]) {
      const origin = defaultRender.call(this, ...args);
      if (!origin) {
        return origin;
      }

      return cloneElement(origin, {
        style: ensureBrandonStyle(origin.props?.style),
      });
    };

    textInputComponent.__brandonPatched = true;
  }
};

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Inner component that uses the drawer context
function AppWithDrawer() {
  const { isDrawerOpen, closeDrawer, openDrawer } = useOverlayDrawer();
  const { loading, session, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const appColorScheme = useColorScheme();
  const theme = Colors[appColorScheme ?? 'light'];

  // Use a ref to track the previous auth state to avoid unnecessary redirects
  useEffect(() => {
    // Skip during initial loading
    if (loading) {
      return;
    }

    // Get current and previous auth states
    const currentAuthState = { session, isGuest };
    const currentPathIsAuth = pathname === '/auth';

    // Handle navigation based on auth state
    if (!currentAuthState.session && !currentAuthState.isGuest) {
      // User is not authenticated and not in guest mode
      if (!currentPathIsAuth) {
        console.log('Redirecting to auth: User not authenticated');
        router.replace('/auth');
      }
    } else if (
      (currentAuthState.session || currentAuthState.isGuest) &&
      (currentPathIsAuth || pathname === '/')
    ) {
      router.replace(
        getMobilePostAuthRoute(currentAuthState.session?.user, currentAuthState.isGuest)
      );
    } else if (currentAuthState.session) {
      const isOnExplorerSurface = pathname.startsWith('/(tabs)');
      const isOnProviderSurface = pathname.startsWith('/provider');
      const isOnAdminSurface = pathname.startsWith('/admin');

      if (mobileAppVariant === 'provider' && isOnExplorerSurface) {
        router.replace(getMobilePostAuthRoute(currentAuthState.session.user, false));
      }

      if (mobileAppVariant === 'admin' && !isOnAdminSurface) {
        router.replace(getMobilePostAuthRoute(currentAuthState.session.user, false));
      }

      if (mobileAppVariant === 'explorer' && (isOnProviderSurface || isOnAdminSurface)) {
        router.replace(getMobilePostAuthRoute(currentAuthState.session.user, false));
      }
    }
  }, [loading, session, isGuest, pathname, router]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    if (!session && !isGuest) {
      closeDrawer();
    }
  }, [isDrawerOpen, session, isGuest, closeDrawer]);

  if (loading) {
    return null;
  }

  const showAuthScreen = !session && !isGuest;
  const stack = (
    <View style={{ flex: 1, backgroundColor: theme.appBackground }}>
      <Stack
        initialRouteName="auth"
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'android' ? 'ios_from_right' : 'slide_from_right',
          animationTypeForReplace: 'push',
          presentation: 'card',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: Platform.OS === 'ios',
          contentStyle: { backgroundColor: theme.appBackground },
        }}
      >
        <Stack.Screen
          name="auth"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: '',
            header: () => <AuthHeader />,
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="screens" options={{ headerShown: false }} />
        <Stack.Screen name="gallery" options={{ headerShown: false }} />
        <Stack.Screen name="destination-stays" options={{ headerShown: false }} />
        <Stack.Screen name="stay-profile" options={{ headerShown: false }} />
        <Stack.Screen name="activity-profile" options={{ headerShown: false }} />
        <Stack.Screen name="bus-profile" options={{ headerShown: false }} />
        <Stack.Screen name="event-profile" options={{ headerShown: false }} />
        <Stack.Screen name="flight-profile" options={{ headerShown: false }} />
        <Stack.Screen name="bus-search" options={{ headerShown: false }} />
        <Stack.Screen name="flight-search" options={{ headerShown: false }} />
        <Stack.Screen name="passenger-details" options={{ headerShown: false }} />
        <Stack.Screen name="flight-passenger-details" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ headerShown: false }} />
      </Stack>
    </View>
  );

  if (showAuthScreen) {
    return stack;
  }

  return (
    <PushDrawer isVisible={isDrawerOpen} onClose={closeDrawer} onOpen={openDrawer}>
      {stack}
    </PushDrawer>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const rootTheme = Colors[colorScheme ?? 'light'];
  const navigationTheme = useMemo(() => {
    const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: rootTheme.appBackground,
        card: rootTheme.appBackground,
      },
    };
  }, [colorScheme, rootTheme.appBackground]);
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, fontsError] = useFonts({
    [Fonts.light]: require('../assets/fonts/BrandonGrotesque/brandon-grotesque-light.otf'),
    [Fonts.regular]: require('../assets/fonts/BrandonGrotesque/brandon-grotesque-regular.otf'),
    [Fonts.medium]: require('../assets/fonts/BrandonGrotesque/brandon-grotesque-medium.otf'),
    [Fonts.bold]: require('../assets/fonts/BrandonGrotesque/brandon-grotesque-bold.otf'),
  });
  const fontsReady = fontsLoaded || Boolean(fontsError);

  useEffect(() => {
    async function prepare() {
      try {
        await preloadLogoImages();
      } catch (e) {
        console.warn('Failed to preload images:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (fontsError) {
      console.warn(
        'Failed to load Brandon Grotesque fonts. Falling back to system fonts. Ensure licensed font files are placed in assets/fonts/BrandonGrotesque/.',
        fontsError
      );
    }
  }, [fontsError]);

  useEffect(() => {
    if (fontsLoaded) {
      patchTextComponents();

      const textComponent = Text as WithDefaultProps<typeof Text>;
      const textInputComponent = TextInput as WithDefaultProps<typeof TextInput>;

      textComponent.defaultProps = textComponent.defaultProps ?? {};
      textComponent.defaultProps.style = [
        textComponent.defaultProps.style,
        { fontFamily: Fonts.regular },
      ];

      textInputComponent.defaultProps = textInputComponent.defaultProps ?? {};
      textInputComponent.defaultProps.style = [
        textInputComponent.defaultProps.style,
        { fontFamily: Fonts.regular },
      ];
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (appIsReady && fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsReady]);

  if (!appIsReady || !fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootTheme.appBackground }}>
      <ThemeProvider value={navigationTheme}>
        <AuthProvider>
          <DestinationsProvider>
            <FeaturedDataProvider>
              <NotificationsProvider>
                <MessagesProvider>
                  <AppAlertProvider>
                    <OverlayDrawerProvider>
                      <AppWithDrawer />
                    </OverlayDrawerProvider>
                  </AppAlertProvider>
                </MessagesProvider>
              </NotificationsProvider>
            </FeaturedDataProvider>
          </DestinationsProvider>
        </AuthProvider>
        <StatusBar style="auto" backgroundColor={rootTheme.appBackground} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
