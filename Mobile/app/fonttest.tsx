import React from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function FontTestScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.appBackground }}>
      <View style={styles.container}>
        <Text style={[styles.heading, { color: palette.text }]}>Font Test Page</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          This page demonstrates different font styles in our application
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  heading: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: responsiveFontSize(16),
    lineHeight: 24,
    textAlign: 'center',
  },
});