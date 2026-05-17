import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useCollapsibleSearchSection } from '@/components/CollapsibleSearchSection';
import { Fonts } from '@/constants/Fonts';
import { eventsService } from '@/services/database';
import type { Event } from '@/types/Event';
import { LocationPill } from '@/components/LocationPill';
import { RatingPill } from '@/components/RatingPill';
import { DateTimePill } from '@/components/DateTimePill';
import { ListImageCard } from '@/components/ListImageCard';
import { isFavorited as isFavoritedUtil, toggleFavorite as toggleFavoriteUtil, subscribeFavorites, getFavoritedIds } from '@/utils/favoritesUtils';

export default function EventsTab() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
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

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(
      event =>
        event.name.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  // Collapsible search section
  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    filterOptions: [
      { key: 'All', label: 'All' },
      { key: 'Harare', label: 'Harare' },
      { key: 'Bulawayo', label: 'Bulawayo' },
      { key: 'Victoria Falls', label: 'Victoria Falls' },
    ],
    activeFilter,
    onFilterChange: setActiveFilter,
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
                  .replace(/,/g, '')} ┬╖ ${item.time}`}
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

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        {searchSection}

        {filteredEvents.length > 0 || eventsLoading ? (
          <FlatList
            data={
              eventsLoading
                ? ([
                    {
                      id: '1',
                      name: '',
                      location: '',
                      venue: '',
                      date: '',
                      time: '',
                      images: [],
                      description: '',
                      rating: 0,
                      totalRatings: 0,
                      ticketPrice: 0,
                      currency: 'USD',
                      ticketTypes: [],
                      category: '',
                      tags: [],
                      organizer: { name: '', contact: '', verified: false },
                    },
                    {
                      id: '2',
                      name: '',
                      location: '',
                      venue: '',
                      date: '',
                      time: '',
                      images: [],
                      description: '',
                      rating: 0,
                      totalRatings: 0,
                      ticketPrice: 0,
                      currency: 'USD',
                      ticketTypes: [],
                      category: '',
                      tags: [],
                      organizer: { name: '', contact: '', verified: false },
                    },
                    {
                      id: '3',
                      name: '',
                      location: '',
                      venue: '',
                      date: '',
                      time: '',
                      images: [],
                      description: '',
                      rating: 0,
                      totalRatings: 0,
                      ticketPrice: 0,
                      currency: 'USD',
                      ticketTypes: [],
                      category: '',
                      tags: [],
                      organizer: { name: '', contact: '', verified: false },
                    },
                  ] as any as Event[])
                : filteredEvents
            }
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
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.7,
    fontFamily: Fonts.regular,
  },
  priceStack: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
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
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  priceCurrency: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  priceUnit: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginLeft: 4,
  },
});
