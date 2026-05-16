import React from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function FallbackScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: palette.appBackground }]}>
      <Text style={[styles.title, { color: palette.text }]}>Loading...</Text>
      <Text style={[styles.subtitle, { color: palette.text }]}>
        Please wait while we prepare your experience
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
  },
});