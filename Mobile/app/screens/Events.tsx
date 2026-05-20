import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme, Animated, RefreshControl, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { CustomHeader } from '@/components/CustomHeader';
import { PushScreenOptions, WebSlideTransition, WallpaperPattern } from '@/components';
import { useCollapsibleSearchSection } from '@/components/CollapsibleSearchSection';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { eventsService } from '@/services/database';
import type { Event } from '@/types/Event';
import { LocationPill } from '@/components/LocationPill';
import { RatingPill } from '@/components/RatingPill';
import { DateTimePill } from '@/components/DateTimePill';
import { ListImageCard } from '@/components/ListImageCard';
import { ListImageCardSkeleton } from '@/components/ListImageCardSkeleton';
import { isFavorited as isFavoritedUtil, toggleFavorite as toggleFavoriteUtil, subscribeFavorites, getFavoritedIds } from '@/utils/favoritesUtils';

function normalizeEventLocationValue(value: string) {
  return value.toLowerCase().replace(/,\s*zimbabwe\b/g, '').replace(/\s+/g, ' ').trim();
}

function eventMatchesLocationScope(eventLocation: string, scopeLocations: string[]) {
  const location = normalizeEventLocationValue(eventLocation);

  return scopeLocations.some(scope =>
    scope.includes(location) || location.includes(scope)
  );
}

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const locationParam = typeof params.location === 'string' && params.location.trim().length > 0 ? params.location.trim() : '';
  const locationsParam = typeof params.locations === 'string' && params.locations.trim().length > 0 ? params.locations.trim() : '';
  const scopedLocations = useMemo(
    () => Array.from(
      new Set(
        (locationsParam ? locationsParam.split('|') : locationParam ? [locationParam] : [])
          .map(normalizeEventLocationValue)
          .filter(Boolean)
      )
    ),
    [locationParam, locationsParam]
  );

  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFavorites(Object.fromEntries(getFavoritedIds().map(id => [id, true])) as Record<string, boolean>);
    const unsub = subscribeFavorites(() => setFavorites(Object.fromEntries(getFavoritedIds().map(id => [id, true])) as Record<string, boolean>));
    return unsub;
  }, []);
  const [heartScales] = useState<Record<string, Animated.Value>>({});

  // Load events from database
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data, error } = await eventsService.getAll();
      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      if (data) {
        // Map database events to Event type
        const mappedEvents: Event[] = data.map((event: any) => {
          // Map gallery images sorted by sort_order
          const galleryImages = event.event_gallery
            ? event.event_gallery
                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((img: any) => img.image_url)
            : [];

          // Combine images from event.images array and gallery
          const allImages = [...(event.images || []), ...galleryImages];

          // Map ticket types from event_tickets table
          const ticketTypes = event.event_tickets
            ? event.event_tickets
                .filter((ticket: any) => ticket.is_active)
                .map((ticket: any) => ({
                  id: ticket.id,
                  name: ticket.name,
                  price: ticket.base_price,
                  description: ticket.description,
                  available: ticket.tickets_available || 0,
                  perks: ticket.perks || [],
                }))
            : [];

          // Get the minimum ticket price as the base ticket price
          const minTicketPrice =
            ticketTypes.length > 0
              ? Math.min(...ticketTypes.map((t: any) => t.price))
              : event.ticket_price || 0;

          return {
            id: event.id,
            name: event.name,
            location: event.destinations?.location || event.location || '',
            venue: event.venue || '',
            date: event.start_date,
            time: event.start_time || '',
            endTime: event.end_time,
            images: allImages,
            description: event.description || '',
            rating: event.rating || 0,
            totalRatings: event.total_ratings || 0,
            ticketPrice: minTicketPrice,
            currency: event.currency || 'USD',
            ticketTypes,
            category: event.category || 'General',
            tags: event.tags || [],
            organizer: event.organizer || { name: '', contact: '', verified: false },
            capacity: event.capacity,
            ticketsAvailable: event.tickets_available,
            featured: event.featured,
            ageRestriction: event.age_restriction,
            accessibility: event.accessibility || [],
            providerId: event.provider_id,
            providerName: event.service_providers?.business_name,
            providerLogo: event.service_providers?.logo_url,
          };
        });
        setEvents(mappedEvents);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  };

  // Filter events to selected location, then by search query
  const filteredEvents = useMemo(() => {
    let result = events;
    if (scopedLocations.length > 0) {
      result = result.filter(e => eventMatchesLocationScope(e.location, scopedLocations));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        event =>
          event.name.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query) ||
          event.venue.toLowerCase().includes(query)
      );
    }
    return result;
  }, [events, searchQuery, scopedLocations]);

  // Collapsible search section (no filters — scoped to selected location)
  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    filterOptions: [],
    activeFilter: '',
    onFilterChange: () => {},
    searchBarOverrides: {
      placeholder: 'Search',
    },
    disableAutoReveal: true,
  });

  // Get or create heart scale animation
  const getHeartScale = useCallback(
    (name: string): Animated.Value => {
      if (!heartScales[name]) {
        heartScales[name] = new Animated.Value(1);
      }
      return heartScales[name];
    },
    [heartScales]
  );

  // Toggle favorite with animation
  const toggleFavorite = useCallback(
    (name: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFavorites(prev => {
        const newFavorites = { ...prev, [name]: !prev[name] };
        const scale = getHeartScale(name);
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        return newFavorites;
      });
    },
    [getHeartScale]
  );

  const renderEventCard = useCallback(
    ({ item }: { item: Event }) => {
      const isFavorited = !!favorites[item.id] || isFavoritedUtil(item.id);
      const heartScale = getHeartScale(item.name);
      const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
      const heartContainerBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
      const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
      const pillTextColor = isDark ? '#FFFFFF' : '#000000';
      const pillIconBackground = isDark ? '#1C1C1E' : '#FFFFFF';
      const baseTicketPrice =
        item.ticketPrice > 0 ? Math.max(1, Math.round(item.ticketPrice)) : undefined;

      const handleEventPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: '/event-profile',
          params: {
            eventId: item.id,
            eventName: item.name,
            eventLocation: item.location,
            eventVenue: item.venue,
            ...(baseTicketPrice !== undefined ? { priceFrom: String(baseTicketPrice) } : {}),
          },
        });
      };

      const displayImage = item.images && item.images.length > 0 ? item.images[0] : '';

      return (
        <ListImageCard
          title={item.name}
          imageUri={displayImage}
          onPress={handleEventPress}
          onToggleFavorite={() => toggleFavoriteUtil(item.id, 'event')}
          isFavorited={isFavorited}
          heartScale={heartScale}
          backgroundColor={cardBg}
          heartBackgroundColor={heartContainerBg}
          topRow={
            <View style={styles.metaRow}>
              <LocationPill
                label={item.location}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                lightTextColor={pillTextColor}
                darkTextColor={pillTextColor}
                variant="compact"
              />

              <RatingPill
                value={item.rating}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                lightTextColor={pillTextColor}
                darkTextColor={pillTextColor}
                style={styles.ratingPillRight}
              />
            </View>
          }
          bottomLeft={
            <View style={styles.infoRow}>
              <DateTimePill
                label={`${new Date(item.date)
                  .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  .replace(/,/g, '')} · ${item.time}`}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                lightTextColor={pillTextColor}
                darkTextColor={pillTextColor}
              />
            </View>
          }
          bottomRight={
            baseTicketPrice !== undefined ? (
              <View style={styles.priceStack}>
                <ThemedText style={styles.priceLabel} lightColor="#8E8E93" darkColor="#8E8E93">
                  from
                </ThemedText>
                <View style={styles.priceRow}>
                  <Ionicons
                    name="ticket-outline"
                    size={14}
                    color="#34C759"
                    style={styles.priceIcon}
                  />
                  <ThemedText
                    style={styles.priceValue}
                    lightColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                    darkColor="#FFFFFF"
                  >
                    <ThemedText
                      style={styles.priceCurrency}
                      lightColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                      darkColor="#FFFFFF"
                    >
                      $
                    </ThemedText>
                    {baseTicketPrice}
                    <ThemedText style={styles.priceUnit} lightColor="#8E8E93" darkColor="#8E8E93">
                      /ticket
                    </ThemedText>
                  </ThemedText>
                </View>
              </View>
            ) : null
          }
        />
      );
    },
    [favorites, getHeartScale, toggleFavorite, isDark]
  );

  const resolvedLocation = locationParam || (
    scopedLocations.length > 0 ? 'Selected locations' : 'All locations'
  );
  const pillBgHeader = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const pillTextColorHeader = isDark ? '#FFFFFF' : '#000000';
  const pillIconBgHeader = isDark ? '#1C1C1E' : '#FFFFFF';

  const handleGoBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <>
      <PushScreenOptions />
      <IOSScreenWrapper>
        <WebSlideTransition>
          <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
            <WallpaperPattern />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.headerArea}>
              <CustomHeader
                showLogo={true}
                leftAction={{
                  icon: 'chevron-back',
                  onPress: handleGoBack,
                }}
                style={{ marginBottom: 4 }}
              />
            </View>

            <View style={styles.titleSection}>
              <ThemedText
                style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                numberOfLines={1}
              >
                Events
              </ThemedText>
              <LocationPill
                label={resolvedLocation}
                backgroundColor={pillBgHeader}
                iconBackgroundColor={pillIconBgHeader}
                lightTextColor={pillTextColorHeader}
                darkTextColor={pillTextColorHeader}
                variant="compact"
              />
            </View>

            <View style={styles.galleryCountWrapper}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isDark ? '#FFFFFF' : '#000000'}
                style={styles.galleryIcon}
              />
              <ThemedText style={styles.galleryCount}>{filteredEvents.length} events</ThemedText>
            </View>

            {searchSection}

            {eventsLoading ? (
              <View style={styles.skeletonContainer}>
                <ListImageCardSkeleton isDark={isDark} count={4} />
              </View>
            ) : filteredEvents.length > 0 ? (
              <FlatList
                data={filteredEvents}
                renderItem={renderEventCard}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons
                  name="search-outline"
                  size={64}
                  color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
                />
                <ThemedText style={styles.emptyStateText}>No events matching your search</ThemedText>
              </View>
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
    position: 'relative',
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
  sectionTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    lineHeight: 28,
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
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Increased padding for better visibility of last card
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingPillRight: {
    marginLeft: 'auto',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
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
    fontFamily: Fonts.regular,
  },
  priceStack: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: responsiveFontSize(11),
    letterSpacing: 0.2,
    fontFamily: Fonts.medium,
    textTransform: 'lowercase',
    marginBottom: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
  },
  priceIcon: {
    marginRight: 6,
  },
  priceValue: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  priceCurrency: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
  },
  priceUnit: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.medium,
    marginLeft: 4,
  },
});
