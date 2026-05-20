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
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { IconActionButton, WallpaperPattern, useCollapsibleSearchSection } from '@/components';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { destinationsService } from '@/services/database';
import { weatherService, locationMappings } from '@/services/weather';
import { getCardSurfaceColors } from '@/constants/CardStyles';
import { useDestinations } from '@/context/DestinationsContext';
import {
  getFavoritedIds,
  toggleFavorite as toggleFavoriteUtil,
  subscribeFavorites,
} from '@/utils/favoritesUtils';

const { width: screenWidth } = Dimensions.get('window');

type DatabaseDestination = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  stays_count?: number;
  activities_count?: number;
  weather?: string;
};

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'name', label: 'Name' },
  { key: 'favorite', label: 'Favorites' },
];

export default function DestinationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cardColors = getCardSurfaceColors(colorScheme);

  // Use shared destinations from context (populated by Featured page)
  const { destinations: sharedDestinations } = useDestinations();

  const [destinations, setDestinations] = useState<DatabaseDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0);
  const [heartScales] = useState(() => new Map<string, Animated.Value>());

  // Use shared destinations if available, otherwise fetch
  useEffect(() => {
    if (sharedDestinations.length > 0) {
      // Add mock counts to shared destinations
      const destinationsWithCounts = sharedDestinations.map(dest => ({
        ...dest,
        stays_count: dest.stays_count || Math.floor(Math.random() * 30) + 5,
        activities_count: dest.activities_count || Math.floor(Math.random() * 20) + 3,
      }));
      setDestinations(destinationsWithCounts);
      setLoading(false);
    } else {
      // Fallback to loading if shared data not available yet
      loadDestinations();
    }
  }, [sharedDestinations]);

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
    sortToggleFilters: ['name'],
    searchBarOverrides: { placeholder: 'Search' },
    disableAutoReveal: true, // Disable auto-reveal after scrolling stops
  });

  const loadDestinations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await destinationsService.getAll();
      const data = result.data || [];

      // Fetch weather data
      const locationsForWeather = data.map(dest => ({
        id: dest.id,
        name: dest.name,
        location: locationMappings[dest.name] || dest.location || dest.name,
      }));

      const weatherData = await weatherService.getWeatherForDestinations(locationsForWeather);

      // Add mock counts and weather
      const destinationsWithData = data.map(dest => ({
        ...dest,
        stays_count: Math.floor(Math.random() * 30) + 5, // Random 5-35
        activities_count: Math.floor(Math.random() * 20) + 3, // Random 3-23
        weather: weatherData[dest.id] || undefined,
      }));

      setDestinations(destinationsWithData);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(async () => {
      await loadDestinations();
      setRefreshing(false);
    }, 800);
  }, []);

  const filteredDestinations = useMemo(() => {
    let result = [...destinations];

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        dest =>
          dest.name.toLowerCase().includes(query) || dest.description?.toLowerCase().includes(query)
      );
    }

    switch (activeFilter) {
      case 'name':
        result.sort((a, b) =>
          sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        );
        break;
      case 'favorite':
        void favoritesRefreshKey;
        result = result.filter(dest => favorites.has(dest.id));
        break;
      default:
        break;
    }

    return result;
  }, [destinations, searchQuery, activeFilter, sortDirection, favorites, favoritesRefreshKey]);

  const getHeartScale = useCallback(
    (id: string) => {
      if (!heartScales.has(id)) {
        heartScales.set(id, new Animated.Value(1));
      }
      return heartScales.get(id)!;
    },
    [heartScales]
  );

  const toggleFavorite = useCallback(
    (id: string, type?: string) => {
      const heartScale = getHeartScale(id);

      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(id)) {
          newFavorites.delete(id);
        } else {
          newFavorites.add(id);
        }
        return newFavorites;
      });

      setFavoritesRefreshKey(prev => prev + 1);
    },
    [getHeartScale]
  );

  const handleDestinationPress = useCallback((destination: DatabaseDestination) => {
    // Navigate to destination detail screen
    router.push({
      pathname: '/screens/DestinationDetail',
      params: {
        destinationId: destination.id,
      },
    });
  }, []);

  const handleShare = useCallback(async (destination: DatabaseDestination) => {
    try {
      await Share.share({
        message: `Check out ${destination.name}! ${destination.description || 'An amazing destination in Zimbabwe.'}`,
        title: destination.name,
      });
    } catch {
      // no-op
    }
  }, []);

  const renderDestinationCard = useCallback(
    ({ item }: { item: DatabaseDestination }) => {
      const isFavorited = favorites.has(item.id);
      const heartScale = getHeartScale(item.id);

      return (
        <TouchableOpacity
          style={[
            styles.destinationCard,
            {
              backgroundColor: cardColors.background,
              borderColor: cardColors.border,
            },
          ]}
          onPress={() => handleDestinationPress(item)}
          activeOpacity={0.7}
        >
          {/* Left side - Image */}
          <Image
            source={{
              uri: item.image_url || `https://picsum.photos/400/300?random=${item.id}`,
            }}
            style={styles.destinationImage}
            resizeMode="cover"
          />

          {/* Right side - Content */}
          <View style={styles.destinationContent}>
            <View style={styles.destinationHeader}>
              <View style={styles.destinationTitleSection}>
                <ThemedText style={styles.destinationName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                {item.weather && (
                  <ThemedText style={styles.destinationWeather} numberOfLines={1}>
                    {item.weather}
                  </ThemedText>
                )}
              </View>

              {/* Favorite button */}
              <IconActionButton
                variant="like"
                isActive={isFavorited}
                size={36}
                iconSize={16}
                style={styles.heartContainer}
                onPress={() => toggleFavorite(item.id, 'destination')}
                iconContainerStyle={{ transform: [{ scale: heartScale }] }}
              />
            </View>

            {/* Counts as pills */}
            <View style={styles.countsRow}>
              <View
                style={[
                  styles.countPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Ionicons
                  name="bed-outline"
                  size={12}
                  color={isDark ? '#FFFFFF' : '#000000'}
                  style={styles.pillIcon}
                />
                <ThemedText style={[styles.pillText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  {item.stays_count || 0} stays
                </ThemedText>
              </View>
              <View
                style={[
                  styles.countPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Ionicons
                  name="trail-sign-outline"
                  size={12}
                  color={isDark ? '#FFFFFF' : '#000000'}
                  style={styles.pillIcon}
                />
                <ThemedText style={[styles.pillText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  {item.activities_count || 0} activities
                </ThemedText>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [favorites, cardColors, isDark, handleDestinationPress, toggleFavorite, getHeartScale]
  );

  return (
    <IOSScreenWrapper>
      <ThemedView
        style={styles.container}
        lightColor={Colors.light.appBackground}
        darkColor={Colors.dark.appBackground}
      >
        <WallpaperPattern />
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            {filteredDestinations.length > 0 ? (
              <View style={styles.destinationsContainer}>
                <FlatList
                  data={filteredDestinations}
                  renderItem={renderDestinationCard}
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
                  No destinations matching your search
                </ThemedText>
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
  searchFilterContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationsContainer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Increased padding for better visibility of last card
  },
  destinationCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 16,
    gap: 16,
    alignItems: 'center',
  },
  destinationImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  destinationContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  destinationTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  destinationName: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  destinationWeather: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  heartContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillIcon: {
    marginRight: 4,
  },
  pillText: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.bold,
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
