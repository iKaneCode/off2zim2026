import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import {
  View,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Share,
  ScrollView,
  RefreshControl,
  LayoutAnimation,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { StayCard, useCollapsibleSearchSection } from '@/components';
import type { Stay } from '@/types/Stay';
import { isFavorited as isFavoriteStored } from '@/utils/favoritesUtils';
import { cloneStay } from '@/constants/StayData';
import { navigateToStayProfile } from '@/utils/navigationUtils';
import { getAmenityIcon } from '@/utils/amenityUtils';
import { staysService } from '@/services/database';

export default function Stays() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0);

  const fetchStays = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await staysService.getAll();

      if (error) {
        console.error('Error fetching stays:', error);
        return;
      }

      if (data) {
        // Map database stays to Stay type format
        const mappedStays: Stay[] = data.map((stay: any) => {
          // Get gallery images, sorted by sort_order
          const galleryImages =
            stay.stay_gallery
              ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((img: any) => img.image_url) || [];

          // Get room types
          const roomTypes =
            stay.stay_rooms?.map((room: any) => ({
              id: room.id,
              name: room.name || room.room_type,
              price: room.base_price,
              maxGuests: room.max_guests,
              description: room.description,
              amenities: room.amenities || [],
              available: room.is_active,
              totalRooms: room.total_rooms || 0,
              availableRooms: room.available_rooms || 0,
              stayName: room.stay_name || stay.name,
            })) || [];

          // Use lowest priced room as base price
          const basePrice =
            roomTypes.length > 0
              ? Math.min(...roomTypes.map((room: { price: number }) => room.price))
              : stay.price || 0;

          // Use amenities from stays table only
          const stayAmenities = Array.isArray(stay.amenities) ? stay.amenities : [];

          console.log(`Stay "${stay.name}":`, {
            amenitiesCount: stayAmenities.length,
            amenitiesList: stayAmenities,
          });

          return {
            id: stay.id,
            name: stay.name,
            location: stay.location || stay.destinations?.location || '',
            description: stay.description || '',
            price: basePrice,
            rating: stay.rating || 0,
            imageUrl: stay.image_url || galleryImages[0] || '',
            images: galleryImages.length > 0 ? galleryImages : stay.images || [],
            amenities: stayAmenities,
            host: stay.host || {
              name: 'Host',
              avatar: '',
              rating: 0,
            },
            reviews: stay.reviews || [],
            featured: stay.featured || false,
            destination_id: stay.destination_id,
            roomTypes: roomTypes.length > 0 ? roomTypes : undefined,
            providerLogo: stay.service_providers?.logo_url,
            providerName: stay.service_providers?.business_name,
            providerId: stay.provider_id,
            phone: stay.phone,
            fullLocation: stay.full_location,
            totalReviews: stay.total_reviews || 0,
            checkInTime: stay.check_in_time,
            checkOutTime: stay.check_out_time,
          };
        });

        setStays(mappedStays);
      }
    } catch (error) {
      console.error('Error fetching stays:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'rating', label: 'Rating' },
    { key: 'price', label: 'Price' },
    { key: 'favorite', label: 'Favorites' },
  ];

  const handleFilterChange = useCallback((filter: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilter(filter);
  }, []);

  const handleSortDirectionChange = useCallback((direction: 'asc' | 'desc') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSortDirection(direction);
  }, []);

  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    refreshing,
    filterOptions,
    activeFilter,
    onFilterChange: handleFilterChange,
    containerStyle: styles.searchFilterContainer,
    sortDirection,
    onSortDirectionChange: handleSortDirectionChange,
    sortToggleFilters: ['rating', 'price'],
    disableAutoReveal: true,
  });

  const handleShare = useCallback(async (stay: Stay) => {
    try {
      await Share.share({
        message: `Check out ${stay.name} in ${stay.location}! It looks amazing.`,
        title: `${stay.name} in ${stay.location}`,
        url: stay.imageUrl,
      });
    } catch {
      // no-op
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStays();
    setRefreshing(false);
  }, [fetchStays]);

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
      case 'favorite': {
        void favoritesRefreshKey;
        result = result.filter(stay => isFavoriteStored(stay.id));
        break;
      }
      default:
        break;
    }

    return result;
  }, [stays, searchQuery, activeFilter, sortDirection, favoritesRefreshKey]);

  const handleStayPress = useCallback((selectedStay: Stay) => {
    navigateToStayProfile(selectedStay, {
      source: 'stays-tab',
      location: selectedStay.location,
    });
  }, []);

  const handleBookStay = useCallback((selectedStay: Stay) => {
    console.log(`Booking ${selectedStay.name}`);
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
        showLocation={true}
        style={styles.stayCardWrapper}
      />
    ),
    [handleBookStay, handleFavoriteToggle, handleShare, handleStayPress, isDark]
  );

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Animated container for Search and Filter Components */}
        {searchSection}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16} // Update at 60fps
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
                  scrollEnabled={false} // Disable scrolling for nested FlatList
                />
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons
                  name="search-outline"
                  size={64}
                  color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
                />
                <ThemedText style={styles.emptyStateText}>No stays matching your search</ThemedText>
              </View>
            )}
          </ScrollView>
        )}
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchFilterContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    marginTop: 4,
    overflow: 'hidden',
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
