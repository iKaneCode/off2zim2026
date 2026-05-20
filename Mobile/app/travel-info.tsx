import React from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CustomHeader } from '@/components/CustomHeader';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function TravelInfoScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleGoBack = () => {
    router.back();
  };

  return (
    <IOSScreenWrapper>
      <ThemedView
        style={[styles.container]}
        lightColor={Colors.light.appBackground}
        darkColor={Colors.dark.appBackground}
      >
        <WallpaperPattern />

        <CustomHeader
          showLogo
          leftAction={{ icon: 'chevron-back', onPress: handleGoBack, color: '#FF3B30' }}
        />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Travel Information
          </ThemedText>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <EmptyState
            icon="information-circle-outline"
            title="Travel Information"
            description="Essential travel guides, visa requirements, local customs, and practical tips for your Zimbabwe adventure."
          />
        </ScrollView>
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    textAlign: 'left',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100, // Increased padding for better visibility
  },
});
