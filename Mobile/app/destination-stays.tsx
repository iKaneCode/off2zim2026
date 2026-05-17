import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  ListImageCardSkeleton,
  LocationPill,
  PushScreenOptions,
  StayCard,
  WallpaperPattern,
  WebSlideTransition,
  useCollapsibleSearchSection,
} from '@/components';
import { CustomHeader } from '@/components/CustomHeader';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import type { Stay } from '@/types/Stay';
import { cloneStay, getStaysByLocation } from '@/constants/StayData';
import { goBackToDestination, navigateToStayProfile } from '@/utils/navigationUtils';
import { isFavorited as isStayFavorited } from '@/utils/favoritesUtils';
import { useColorScheme } from '@/hooks/useColorScheme';

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'rating', label: 'Rating' },
  { key: 'price', label: 'Price' },
  { key: 'favorite', label: 'Favorites' },
];

export default function DestinationStaysScreen() {
  const params = useLocalSearchParams();
  const { location, destinationId } = params;
  const rawLocation = Array.isArray(location) ? location[0] : location;
  const normalizedLocation =
    typeof rawLocation === 'string' && rawLocation.trim().length > 0
      ? rawLocation.trim()
      : undefined;
  const resolvedLocation = normalizedLocation ?? 'All locations';
  const dataLocation =
    normalizedLocation &&
    normalizedLocation.toLowerCase() !== 'all' &&
    normalizedLocation.toLowerCase() !== 'all locations'
      ? normalizedLocation
      : undefined;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0);

  const handleFilterChange = useCallback((filter: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilter(filter);
  }, []);

  const handleSortDirectionChange = useCallback((direction: 'asc' | 'desc') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSortDirection(direction);
  }, []);

  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    refreshing,
    filterOptions: [],
    activeFilter,
    onFilterChange: handleFilterChange,
    containerStyle: styles.searchFilterContainer,
    searchBarOverrides: { placeholder: 'Search' },
    disableAutoReveal: true,
  });

  const loadStays = useCallback(() => {
    setLoading(true);
    const staysByLocation = getStaysByLocation(dataLocation);
    setStays(staysByLocation.map(cloneStay));
    setLoading(false);
  }, [dataLocation]);

  useEffect(() => {
    loadStays();
  }, [loadStays]);

  const handleGoBack = useCallback(() => {
    goBackToDestination(destinationId);
  }, [destinationId]);

  const handleShare = useCallback(async (stay: Stay) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Share.share({
        message: `Check out ${stay.name} in ${stay.location}! It looks amazing.`,
        title: `${stay.name} in ${stay.location}`,
        url: stay.imageUrl,
      });
    } catch {
      // no-op
    }
  }, []);

  const filteredStays = useMemo(() => {
    let result = [...stays];

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        stay =>
          stay.name.toLowerCase().includes(query) ||
          stay.location.toLowerCase().includes(query) ||
          stay.description.toLowerCase().includes(query) ||
          stay.amenities.some(amenity => amenity.toLowerCase().includes(query))
      );
    }

    switch (activeFilter) {
      case 'rating':
        result.sort((a, b) =>
          sortDirection === 'desc' ? b.rating - a.rating : a.rating - b.rating
        );
        break;
      case 'price':
        result.sort((a, b) => (sortDirection === 'asc' ? a.price - b.price : b.price - a.price));
        break;
      case 'favorite':
        void favoritesRefreshKey;
        result = result.filter(stay => isStayFavorited(stay.id));
        break;
      default:
        break;
    }

    return result;
  }, [stays, searchQuery, activeFilter, sortDirection, favoritesRefreshKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadStays();
      setRefreshing(false);
    }, 800);
  }, [loadStays]);

  const getAmenityIcon = useCallback((amenity: string): keyof typeof Ionicons.glyphMap => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi')) return 'wifi';
    if (amenityLower.includes('pool')) return 'water';
    if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return 'barbell-outline';
    if (amenityLower.includes('restaurant')) return 'fast-food';
    if (amenityLower.includes('breakfast')) return 'cafe-outline';
    if (amenityLower.includes('spa')) return 'flower-outline';
    if (amenityLower.includes('bar')) return 'wine-outline';
    if (amenityLower.includes('parking')) return 'car-outline';
    if (amenityLower.includes('air') || amenityLower.includes('ac')) return 'snow-outline';
    if (amenityLower.includes('safari')) return 'compass-outline';
    if (amenityLower.includes('golf')) return 'golf-outline';
    if (amenityLower.includes('casino')) return 'diamond-outline';
    if (amenityLower.includes('conference') || amenityLower.includes('business'))
      return 'briefcase-outline';
    if (amenityLower.includes('garden')) return 'leaf-outline';
    if (amenityLower.includes('fishing')) return 'fish-outline';
    if (amenityLower.includes('horse') || amenityLower.includes('riding'))
      return 'trail-sign-outline';
    if (amenityLower.includes('library')) return 'book-outline';
    return 'checkmark-circle-outline';
  }, []);

  const handleStayPress = useCallback(
    (selectedStay: Stay) => {
      navigateToStayProfile(selectedStay, {
        source: 'destination-stays',
        destinationId,
        location: resolvedLocation === 'All locations' ? undefined : resolvedLocation,
      });
    },
    [destinationId, resolvedLocation]
  );

  const handleBookStay = useCallback((selectedStay: Stay) => {
    console.log(`Booking ${selectedStay.name}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, []);

  const handleFavoriteToggle = useCallback((_stay: Stay, _isFavorite: boolean) => {
    setFavoritesRefreshKey(prev => prev + 1);
  }, []);

  const renderStayItem = useCallback(
    ({ item }: { item: Stay }) => (
      <StayCard
        stay={item}
        isDark={isDark}
        onPress={handleStayPress}
        onShare={handleShare}
        onBook={handleBookStay}
        onFavoriteToggle={handleFavoriteToggle}
        getAmenityIcon={getAmenityIcon}
        style={styles.stayCardWrapper}
      />
    ),
    [getAmenityIcon, handleBookStay, handleFavoriteToggle, handleShare, handleStayPress, isDark]
  );

  return (
    <>
      <PushScreenOptions />
      <IOSScreenWrapper>
        <WebSlideTransition>
          <ThemedView
            style={styles.container}
            lightColor={Colors.light.appBackground}
            darkColor={Colors.dark.appBackground}
          >
            <WallpaperPattern />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.headerArea}>
              <CustomHeader
                showLogo
                leftAction={{
                  icon: 'chevron-back',
                  onPress: handleGoBack,
                }}
                style={{ marginBottom: 4 }}
              />
            </View>

            <View style={styles.titleSection}>
              <ThemedText
                style={[styles.pageTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                numberOfLines={1}
              >
                Stays
              </ThemedText>
              <LocationPill
                label={resolvedLocation}
                backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
                iconBackgroundColor={isDark ? '#1C1C1E' : '#FFFFFF'}
                lightTextColor={isDark ? '#FFFFFF' : '#000000'}
                darkTextColor={isDark ? '#FFFFFF' : '#000000'}
                variant="compact"
              />
            </View>

            <View style={styles.galleryCountWrapper}>
              <Ionicons
                name="bed-outline"
                size={14}
                color={isDark ? '#FFFFFF' : '#000000'}
                style={styles.galleryIcon}
              />
              <ThemedText style={styles.galleryCount}>{filteredStays.length} stays</ThemedText>
            </View>

            <View
              style={[
                styles.searchSectionWrapper,
                { backgroundColor: isDark ? '#000000' : '#f2f2f7' },
              ]}
            >
              {searchSection}
            </View>

            {loading ? (
              <View style={styles.skeletonContainer}>
                <ListImageCardSkeleton isDark={isDark} count={4} />
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleMomentumScrollEnd}
              >
                {filteredStays.length > 0 ? (
                  <View style={styles.staysContainer}>
                    <FlatList
                      data={filteredStays}
                      renderItem={renderStayItem}
                      keyExtractor={item => item.id}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.listContent}
                      scrollEnabled={false}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons
                      name="search-outline"
                      size={64}
                      color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
                    />
                    <ThemedText style={styles.emptyStateText}>
                      No stays matching your search
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            )}
          </ThemedView>
        </WebSlideTransition>
      </IOSScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    width: '100%',
    zIndex: 10,
    marginBottom: 2,
  },
  titleSection: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginBottom: 2,
  },
  galleryCountWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: -6,
  },
  galleryIcon: {
    marginRight: 4,
  },
  galleryCount: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    lineHeight: 28,
  },
  searchSectionWrapper: {
    width: '100%',
  },
  searchFilterContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staysContainer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Increased padding for better visibility of last card
  },
  stayCardWrapper: {
    marginBottom: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: responsiveFontSize(16),
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});
