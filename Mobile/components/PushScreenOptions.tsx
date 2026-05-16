import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface PushScreenOptionsProps {
  headerShown?: boolean;
}

export function PushScreenOptions({ headerShown = false }: PushScreenOptionsProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack.Screen
      options={{
        headerShown,
        animation: Platform.OS === 'android' ? 'ios_from_right' : 'slide_from_right',
        animationTypeForReplace: 'push',
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: Platform.OS === 'ios',
        contentStyle: { backgroundColor: theme.appBackground },
      }}
    />
  );
}
