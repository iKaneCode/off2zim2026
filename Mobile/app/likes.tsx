import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { CustomHeader } from '@/components/CustomHeader';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { WallpaperPattern, useCollapsibleSearchSection } from '@/components';
import { EmptyState } from '@/components/EmptyState';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { destinationsService, staysService, eventsService } from '@/services/database';
import { getFavoritedIds, getFavoritesByType, subscribeFavorites } from '@/utils/favoritesUtils';
import { thingsToDoData, busOperatorsData, flightOperatorsData } from '@/constants/FeaturedData';
import { Ionicons } from '@expo/vector-icons';
import { getCardSurfaceColors } from '@/constants/CardStyles';

type LikedItem = {
  id: string;
  type: 'destination' | 'stay' | 'event' | 'activity' | 'bus' | 'flight' | 'gallery';
  name: string;
  description?: string | null;
  image_url?: string | null;
  meta?: any;
};

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'destinations', label: 'Destinations' },
  { key: 'stays', label: 'Stays' },
  { key: 'events', label: 'Upcoming Events' },
  { key: 'things', label: 'Things To Do' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'bus', label: 'Bus' },
  { key: 'flights', label: 'Flights' },
];

const categoryOrder: LikedItem['type'][] = [
  'stay',
  'event',
  'activity',
  'gallery',
  'bus',
  'flight',
  'destination',
];

const categoryMeta: Record<
  LikedItem['type'],
  { title: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  stay: { title: 'Stays', icon: 'bed-outline', label: 'Stay' },
  event: { title: 'Upcoming Events', icon: 'calendar-outline', label: 'Upcoming Event' },
  activity: { title: 'Things To Do', icon: 'trail-sign-outline', label: 'Thing To Do' },
  gallery: { title: 'Gallery', icon: 'images-outline', label: 'Gallery' },
  bus: { title: 'Bus', icon: 'bus-outline', label: 'Bus' },
  flight: { title: 'Flights', icon: 'airplane-outline', label: 'Flight' },
  destination: { title: 'Destinations', icon: 'location-outline', label: 'Destination' },
};

export default function LikesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cardColors = getCardSurfaceColors(colorScheme);

  const [destinations, setDestinations] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [favoritesVersion, setFavoritesVersion] = useState(0);

  // Subscribe to favorites changes so the screen updates when favorites are toggled elsewhere
  useEffect(() => {
    const unsubscribe = subscribeFavorites(() => setFavoritesVersion(v => v + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Load both destinations and stays so we can render liked items across categories
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const destRes = await destinationsService.getAll();
        const staysRes = await staysService.getAll();
        const eventsRes = await eventsService.getAll();

        if (!mounted) return;
        setDestinations(destRes.data || []);
        setStays(staysRes.data || []);
        setEvents(eventsRes.data || []);
        // Local constants
        setActivities(thingsToDoData || []);
        setBuses(busOperatorsData || []);
        setFlights(flightOperatorsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    refreshing,
    filterOptions,
    activeFilter,
    onFilterChange: handleFilterChange,
    containerStyle: [
      styles.searchFilterContainer,
      { backgroundColor: isDark ? Colors.dark.appBackground : Colors.light.appBackground },
    ],
    sortDirection,
    onSortDirectionChange: setSortDirection,
    sortToggleFilters: ['name'],
    searchBarOverrides: { placeholder: 'Search' },
    disableAutoReveal: true,
  });

  // Recompute favorites each render to reflect DB-backed changes immediately
  const isMarkedFavorite = useCallback((entity: { id?: string; name?: string }) => {
    if (!entity) return false;
    const ids = new Set(getFavoritedIds());
    if (entity.id && ids.has(entity.id)) return true;
    if (entity.name && ids.has(entity.name)) return true;
    return false;
  }, []);

  const likedItems: LikedItem[] = useMemo(() => {
    const items: LikedItem[] = [];
    const matchedFavoriteIds = new Set<string>();
    const groupedFavoriteIds = getFavoritesByType();

    destinations.forEach(d => {
      if (isMarkedFavorite(d)) {
        matchedFavoriteIds.add(d.id);
        items.push({
          id: d.id,
          type: 'destination',
          name: d.name,
          description: d.description,
          image_url: d.image_url,
          meta: d,
        });
      }
    });

    stays.forEach(s => {
      if (isMarkedFavorite(s)) {
        matchedFavoriteIds.add(s.id);
        items.push({
          id: s.id,
          type: 'stay',
          name: s.name,
          description: s.description,
          image_url: s.stay_gallery?.[0]?.image_url || s.images?.[0],
          meta: s,
        });
      }
    });

    events.forEach(e => {
      if (isMarkedFavorite(e)) {
        matchedFavoriteIds.add(e.id);
        items.push({
          id: e.id,
          type: 'event',
          name: e.name,
          description: e.description,
          image_url: e.event_gallery?.[0]?.image_url || null,
          meta: e,
        });
      }
    });

    activities.forEach(a => {
      if (isMarkedFavorite(a)) {
        matchedFavoriteIds.add(a.id);
        items.push({
          id: a.id,
          type: 'activity',
          name: a.name,
          description: a.location,
          image_url: `https://picsum.photos/300/200?random=${a.imageRandom}`,
          meta: a,
        });
      }
    });

    buses.forEach(b => {
      if (isMarkedFavorite(b)) {
        matchedFavoriteIds.add(b.id);
        items.push({
          id: b.id,
          type: 'bus',
          name: b.name,
          description: b.route,
          image_url: `https://picsum.photos/300/200?random=${b.imageRandom}`,
          meta: b,
        });
      }
    });

    flights.forEach(f => {
      if (isMarkedFavorite(f)) {
        matchedFavoriteIds.add(f.id);
        items.push({
          id: f.id,
          type: 'flight',
          name: f.name,
          description: f.route,
          image_url: `https://picsum.photos/300/200?random=${f.imageRandom}`,
          meta: f,
        });
      }
    });

    const galleryFavoriteIds = [
      ...(groupedFavoriteIds.gallery ?? []),
      ...(groupedFavoriteIds.unknown ?? []).filter(id => /^https?:\/\//i.test(id)),
    ];

    galleryFavoriteIds.forEach((imageUrl, index) => {
      if (matchedFavoriteIds.has(imageUrl)) {
        return;
      }

      matchedFavoriteIds.add(imageUrl);
      items.push({
        id: imageUrl,
        type: 'gallery',
        name: `Gallery Image ${index + 1}`,
        description: 'Saved gallery photo',
        image_url: imageUrl,
        meta: { imageUrl },
      });
    });

    // Apply search and filter
    let result = items;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        it =>
          (it.name || '').toLowerCase().includes(q) ||
          (it.description || '').toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case 'destinations':
        result = result.filter(it => it.type === 'destination');
        break;
      case 'stays':
        result = result.filter(it => it.type === 'stay');
        break;
      case 'events':
        result = result.filter(it => it.type === 'event');
        break;
      case 'things':
        result = result.filter(it => it.type === 'activity');
        break;
      case 'gallery':
        result = result.filter(it => it.type === 'gallery');
        break;
      case 'bus':
        result = result.filter(it => it.type === 'bus');
        break;
      case 'flights':
        result = result.filter(it => it.type === 'flight');
        break;
      default:
        break;
    }

    if (sortDirection === 'asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [
    destinations,
    stays,
    events,
    activities,
    buses,
    flights,
    searchQuery,
    activeFilter,
    sortDirection,
    favoritesVersion,
    isMarkedFavorite,
  ]);

  const likedSections = useMemo(
    () =>
      categoryOrder
        .map(type => ({
          type,
          ...categoryMeta[type],
          data: likedItems.filter(item => item.type === type),
        }))
        .filter(section => section.data.length > 0),
    [likedItems]
  );

  const renderLikedCard = useCallback(
    ({ item }: { item: LikedItem }) => {
      return (
        <TouchableOpacity
          style={[
            styles.destinationCard,
            { backgroundColor: cardColors.background, borderColor: cardColors.border },
          ]}
          onPress={() => {
            if (item.type === 'destination') {
              router.push({
                pathname: '/screens/DestinationDetail',
                params: { destinationId: item.id },
              });
            } else if (item.type === 'stay') {
              router.push({ pathname: '/stay-profile', params: { stayId: item.id } });
            } else if (item.type === 'event') {
              router.push({ pathname: '/event-profile', params: { eventId: item.id } });
            } else if (item.type === 'activity') {
              router.push({ pathname: '/activity-profile', params: { activityId: item.id } });
            } else if (item.type === 'bus') {
              router.push({ pathname: '/bus-profile', params: { busName: item.name } });
            } else if (item.type === 'flight') {
              router.push({ pathname: '/flight-profile', params: { flightName: item.name } });
            } else if (item.type === 'gallery') {
              router.push({
                pathname: '/gallery',
                params: {
                  images: JSON.stringify([item.image_url || item.id]),
                  title: 'Gallery',
                },
              });
            }
          }}
        >
          <Image
            source={{ uri: item.image_url || `https://picsum.photos/400/300?random=${item.id}` }}
            style={styles.destinationImage}
          />

          <View style={styles.destinationContent}>
            <View style={styles.destinationHeader}>
              <View style={styles.destinationTitleSection}>
                <ThemedText style={styles.destinationName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
              </View>
            </View>

            <View style={styles.countsRow}>
              <View
                style={[
                  styles.countPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Ionicons
                  name={categoryMeta[item.type].icon}
                  size={12}
                  color={isDark ? '#FFFFFF' : '#000000'}
                  style={styles.pillIcon}
                />

                <ThemedText style={[styles.pillText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  {categoryMeta[item.type].label}
                </ThemedText>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [cardColors, isDark]
  );

  return (
    <IOSScreenWrapper>
      <ThemedView
        style={styles.container}
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
            Likes
          </ThemedText>
        </View>

        {searchSection}

        {likedItems.length === 0 && !loading ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            <EmptyState
              icon="heart-outline"
              title="No Likes Yet"
              description="Items and places you like will appear here for easy access."
            />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            {likedSections.map(section => (
              <View key={section.type} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryIconBubble,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={section.icon}
                      size={18}
                      color={isDark ? '#FFFFFF' : '#000000'}
                    />
                  </View>
                  <ThemedText style={styles.categoryTitle}>{section.title}</ThemedText>
                </View>
                {section.data.map(item => (
                  <React.Fragment key={`${item.type}-${item.id}`}>
                    {renderLikedCard({ item })}
                  </React.Fragment>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchFilterContainer: { paddingHorizontal: 0, paddingTop: 8, marginTop: 4, overflow: 'hidden' },
  titleSection: { paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 0 },
  pageTitle: { fontSize: responsiveFontSize(24), textAlign: 'left' },
  content: { flex: 1 },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  categorySection: {
    marginBottom: 18,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  categoryIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '800',
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
  destinationImage: { width: 90, height: 90, borderRadius: 12 },
  destinationContent: { flex: 1, justifyContent: 'center', gap: 8 },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  destinationTitleSection: { flex: 1, marginRight: 12 },
  destinationName: { fontSize: responsiveFontSize(18), fontWeight: '700' },
  countsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillIcon: { marginRight: 4 },
  pillText: { fontSize: responsiveFontSize(12), fontWeight: '700' },
});
