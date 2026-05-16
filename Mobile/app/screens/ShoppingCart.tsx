import React from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomHeader } from '@/components';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ShoppingCart() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const handleGoBack = () => {
    router.back();
  };

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <CustomHeader
          showLogo={true}
          leftAction={{
            icon: 'chevron-back',
            onPress: handleGoBack,
            color: '#FF3B30',
          }}
        />

        {/* Title under logo, left-aligned */}
        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Shopping Cart
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
            <ThemedText type="headline" style={styles.emptyText}>
              Your cart is empty
            </ThemedText>
            <ThemedText type="caption" style={styles.emptySubText}>
              Add items to your cart to see them here
            </ThemedText>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Increased padding for better visibility
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 12,
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: 6,
    color: '#8E8E93',
  },
});