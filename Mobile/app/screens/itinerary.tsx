import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { responsiveFontSize } from '@/constants/Fonts';
import { StyleSheet, View, Platform, Animated, UIManager } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';

// Import reusable components and utilities
import {
  CustomHeader,
  PushScreenOptions,
  type ItineraryData,
  type SwipeAction,
  useCollapsibleSearchSection,
} from '@/components';
import { CalendarView } from '@/components/CalendarView';
import { ListView } from '@/components/ListView';
import {
  getTypeColor as utilGetTypeColor,
  expandAccommodationStays,
  formatTime,
  normalizeItineraryTime,
  FILTER_OPTIONS,
} from '@/utils/itineraryUtils';
import { ANIMATION_DURATION } from '@/utils/calendarUtils';
import {
  DEFAULT_FILTER,
  DEFAULT_VIEW_MODE,
  type ItineraryFilter,
  type ViewMode,
} from '@/utils/itineraryData';
import {
  ITINERARY_COLORS,
  ITINERARY_ANIMATIONS,
  REFRESH_DELAY,
  getCurrentDateString,
} from '@/constants/ItineraryConstants';
import { staysBookingsService } from '@/services/database';
import { useAuth } from '@/context/AuthContext';
import { useAppAlert } from '@/context/AppAlertContext';

// Animation setup for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ItineraryScreen() {
  const colorScheme = useColorScheme();
  const { user, isGuest } = useAuth();
  const { showAlert } = useAppAlert();
  const [itinerary, setItinerary] = useState<ItineraryData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ItineraryFilter>(DEFAULT_FILTER);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fix initial selectedDate to use proper local date format
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Start with no selection

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [isWeekFocused, setIsWeekFocused] = useState(false);
  const [focusedWeekIndex, setFocusedWeekIndex] = useState<number | null>(null);
  const openSwipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  // Expand itinerary to include accommodation for each day of stay
  const expandedItinerary = useMemo(() => {
    return expandAccommodationStays(itinerary);
  }, [itinerary]);

  // Animation for smooth month transitions
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation for week focus transitions
  // No week translation needed for native iOS calendar behavior

  // Animation state for the inline itinerary card
  const inlineCardAnim = useRef(new Animated.Value(0)).current;
  const bottomRowsTranslate = useRef(new Animated.Value(0)).current;
  const prevSelectedDate = useRef<string | null>(null);

  // Handle animation for inline card when selectedDate changes
  useEffect(() => {
    const focused = isWeekFocused && focusedWeekIndex !== null;

    if (focused && selectedDate && prevSelectedDate.current !== selectedDate) {
      // Animate open: card fades/scales in, bottom rows move down (in parallel)
      inlineCardAnim.setValue(0);
      bottomRowsTranslate.setValue(0);
      Animated.parallel([
        Animated.timing(inlineCardAnim, {
          toValue: 1,
          duration: ITINERARY_ANIMATIONS.CARD_ANIMATION,
          useNativeDriver: true,
        }),
        Animated.timing(bottomRowsTranslate, {
          toValue: 1,
          duration: ITINERARY_ANIMATIONS.CARD_ANIMATION,
          useNativeDriver: true,
        }),
      ]).start();
      prevSelectedDate.current = selectedDate;
    } else if (!selectedDate && prevSelectedDate.current) {
      // Animate close: card fades/scales out, bottom rows move up (mirroring the open animation)
      Animated.parallel([
        Animated.timing(inlineCardAnim, {
          toValue: 0,
          duration: ITINERARY_ANIMATIONS.CARD_ANIMATION, // Match the opening duration for symmetry
          useNativeDriver: true,
        }),
        Animated.timing(bottomRowsTranslate, {
          toValue: 0,
          duration: ITINERARY_ANIMATIONS.CARD_ANIMATION, // Match the opening duration for symmetry
          useNativeDriver: true,
        }),
      ]).start(() => {
        prevSelectedDate.current = null;
      });
    }
  }, [selectedDate, isWeekFocused, focusedWeekIndex, inlineCardAnim, bottomRowsTranslate]);

  // Fetch bookings from database and convert to itinerary format
  const fetchItinerary = useCallback(async () => {
    if (!user?.id || isGuest) {
      setItinerary([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await staysBookingsService.getUserBookings(user.id);

      if (error) {
        console.error('Error fetching bookings:', error);
        setItinerary([]);
        return;
      }

      if (!data || data.length === 0) {
        setItinerary([]);
        return;
      }

      // Filter only confirmed or completed bookings for itinerary
      const confirmedBookings = data.filter(
        booking => booking.status === 'confirmed' || booking.status === 'completed'
      );

      // Convert bookings to ItineraryData format
      const itineraryItems: ItineraryData[] = confirmedBookings.map(booking => {
        const stayName = booking.stay_name || booking.stays?.name || 'Stay Booking';
        const location = booking.stays?.full_location || booking.stays?.location || 'Location TBD';
        const checkInDate = typeof booking.check_in_date === 'string' ? booking.check_in_date : '';
        const checkOutDate =
          typeof booking.check_out_date === 'string' ? booking.check_out_date : '';

        const checkInDateObj = new Date(checkInDate);
        const hasValidCheckInDate = !Number.isNaN(checkInDateObj.getTime());
        const checkInDateLabel = hasValidCheckInDate
          ? checkInDateObj.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Date TBD';
        const fallbackCheckInTime = hasValidCheckInDate
          ? `${String(checkInDateObj.getHours()).padStart(2, '0')}:${String(checkInDateObj.getMinutes()).padStart(2, '0')}`
          : undefined;

        const normalizedCheckInTime =
          normalizeItineraryTime(booking.stays?.check_in_time) ?? fallbackCheckInTime;
        const checkInDisplayTime = normalizedCheckInTime
          ? formatTime(normalizedCheckInTime)
          : undefined;

        const checkOutDateObj = new Date(checkOutDate);
        const hasValidCheckOutDate = !Number.isNaN(checkOutDateObj.getTime());
        const fallbackCheckOutTime = hasValidCheckOutDate
          ? `${String(checkOutDateObj.getHours()).padStart(2, '0')}:${String(checkOutDateObj.getMinutes()).padStart(2, '0')}`
          : undefined;
        const normalizedCheckOutTime =
          normalizeItineraryTime(booking.stays?.check_out_time) ?? fallbackCheckOutTime;

        const timeLabel = checkInDisplayTime
          ? `${checkInDateLabel} at ${checkInDisplayTime}`
          : checkInDateLabel;

        const roomsCount =
          typeof booking.rooms_count === 'number' ? booking.rooms_count : undefined;
        const guestsCount =
          typeof booking.guests_count === 'number' ? booking.guests_count : undefined;
        const roomsSummary =
          roomsCount !== undefined
            ? `${roomsCount} room${roomsCount === 1 ? '' : 's'}`
            : 'Room details pending';
        const guestsSummary =
          guestsCount !== undefined
            ? `${guestsCount} guest${guestsCount === 1 ? '' : 's'}`
            : 'Guest count pending';
        const checkInMessagePrefix = checkInDisplayTime
          ? `Check-in: ${checkInDisplayTime}`
          : 'Check-in time to be confirmed';
        const checkInMessage = `${checkInMessagePrefix} - ${roomsSummary}, ${guestsSummary}`;

        return {
          id: booking.id,
          name: stayName,
          message: checkInMessage,
          time: timeLabel,
          actualTime: normalizedCheckInTime,
          isRead: true,
          unreadCount: 0,
          avatar: stayName.substring(0, 2).toUpperCase(),
          status: 'received' as const,
          type: 'accommodation' as const,
          date: checkInDate,
          endDate: checkOutDate,
          location,
          duration: 'Check-in',
          price: Number(booking.total_amount) || 0,
          currency: 'USD',
          confirmationCode: booking.transaction_number,
          notes: `Status: ${booking.status}`,
          paymentMethod: booking.payment_method,
          providerLogo: booking.stays?.service_providers?.logo_url,
          checkInTime: normalizedCheckInTime,
          checkOutTime: normalizedCheckOutTime,
          // Extended booking details
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          customerPhone: booking.customer_phone,
          guestsCount: booking.guests_count,
          adultsCount: booking.adults_count,
          childrenCount: booking.children_count,
          roomsCount: booking.rooms_count,
          roomType: booking.room_type,
          roomTypeRate: booking.room_type_rate,
          checkInDate,
          checkOutDate,
        };
      });

      setItinerary(itineraryItems);
    } catch (error) {
      console.error('Failed to fetch itinerary:', error);
      setItinerary([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isGuest]);

  // Fetch itinerary on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchItinerary();
    }, [fetchItinerary])
  );

  // Utility: Navigate month
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (isAnimating) return;

    // If card is open, animate its dismissal first before month transition
    const cardIsOpen = selectedDate && isWeekFocused && focusedWeekIndex !== null;

    if (cardIsOpen) {
      // Animate card dismissal first
      Animated.parallel([
        Animated.timing(inlineCardAnim, {
          toValue: 0,
          duration: ITINERARY_ANIMATIONS.MONTH_TRANSITION_FAST, // Faster dismissal for month navigation
          useNativeDriver: true,
        }),
        Animated.timing(bottomRowsTranslate, {
          toValue: 0,
          duration: ITINERARY_ANIMATIONS.MONTH_TRANSITION_FAST, // Faster dismissal for month navigation
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Clear card state after animation completes
        setSelectedDate(null);
        setIsWeekFocused(false);
        setFocusedWeekIndex(null);
        prevSelectedDate.current = null;

        // Then proceed with month transition
        proceedWithMonthTransition(direction);
      });
    } else {
      // No card open, proceed directly with month transition
      proceedWithMonthTransition(direction);
    }
  };

  // Helper function for month transition animation
  const proceedWithMonthTransition = (direction: 'prev' | 'next') => {
    setIsAnimating(true);
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: ANIMATION_DURATION.MONTH_TRANSITION.OUT,
      useNativeDriver: true,
    }).start(() => {
      setCurrentMonth(prev => {
        const newMonth = new Date(prev);
        newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newMonth;
      });
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION.MONTH_TRANSITION.IN,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    });
  };

  // Categorize itinerary by date/type
  const categorizedItinerary = useMemo(() => {
    const todayStr = getCurrentDateString();

    return {
      today: expandedItinerary.filter(item => item.date === todayStr),
      upcoming: expandedItinerary.filter(item => item.date > todayStr),
      past: expandedItinerary.filter(item => item.date < todayStr),
      accommodation: expandedItinerary.filter(item => item.type === 'accommodation'),
      activities: expandedItinerary.filter(item => item.type === 'activity'),
      transport: expandedItinerary.filter(item => item.type === 'transport'),
      dining: expandedItinerary.filter(item => item.type === 'dining'),
    };
  }, [expandedItinerary]);

  // Get itinerary for current filter and search
  const filteredItinerary = useMemo(() => {
    let items: ItineraryData[] = [];

    switch (activeFilter) {
      case 'All':
        items = expandedItinerary;
        break;
      case 'Today':
        items = categorizedItinerary.today;
        break;
      case 'Past':
        items = categorizedItinerary.past;
        break;
      case 'Stays':
        items = categorizedItinerary.accommodation;
        break;
      case 'Events':
        // Events include activity-based events (shows, cultural activities) but exclude dining
        items = expandedItinerary.filter(
          item =>
            item.type === 'activity' &&
            (item.name.toLowerCase().includes('dinner') ||
              item.name.toLowerCase().includes('show') ||
              item.name.toLowerCase().includes('cultural') ||
              item.name.toLowerCase().includes('restaurant'))
        );
        break;
      case 'ThingsToDo':
        // Things to do are activities excluding dining/restaurant events
        items = expandedItinerary.filter(
          item =>
            item.type === 'activity' &&
            !(
              item.name.toLowerCase().includes('dinner') ||
              item.name.toLowerCase().includes('show') ||
              item.name.toLowerCase().includes('cultural') ||
              item.name.toLowerCase().includes('restaurant')
            )
        );
        break;
      case 'Flights':
        items = expandedItinerary.filter(
          item =>
            item.type === 'transport' &&
            (item.name.toLowerCase().includes('flight') ||
              item.name.toLowerCase().includes('helicopter') ||
              item.name.toLowerCase().includes('emirates') ||
              item.name.toLowerCase().includes('airline'))
        );
        break;
      case 'Bus':
        items = expandedItinerary.filter(
          item =>
            item.type === 'transport' &&
            (item.name.toLowerCase().includes('bus') ||
              item.name.toLowerCase().includes('coach') ||
              item.name.toLowerCase().includes('intercape'))
        );
        break;
      case 'Dining':
        items = categorizedItinerary.dining;
        break;
      default:
        items = [];
    }

    // Apply search if needed
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      items = items.filter(
        item =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.message.toLowerCase().includes(lowerQuery) ||
          item.location?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort chronologically by date, then by time
    return items.sort((a, b) => {
      // First sort by date
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;

      // If same date, sort by time
      // Handle all-day events (empty actualTime) - they should come first for that day
      if (!a.actualTime && b.actualTime) return -1; // a (all-day) comes before b (timed)
      if (a.actualTime && !b.actualTime) return 1; // b (all-day) comes before a (timed)
      if (!a.actualTime && !b.actualTime) return 0; // Both all-day, maintain order

      // Both have times, sort by actual time
      return (a.actualTime || '').localeCompare(b.actualTime || '');
    });
  }, [categorizedItinerary, expandedItinerary, searchQuery, activeFilter]);

  // Helper function to get avatar colors based on type
  const getAvatarColor = (type: string): string => {
    return utilGetTypeColor(type);
  };

  // Close all open swipeable items
  const closeAllSwipeables = useCallback(() => {
    Object.values(openSwipeableRefs.current).forEach(ref => {
      if (ref) {
        ref.close();
      }
    });
  }, []);

  // Collapsible search section (for list view only)
  const handleFilterChange = useCallback((filter: string) => {
    if (Platform.OS === 'ios') {
    }
    setActiveFilter(filter as ItineraryFilter);
  }, []);

  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    refreshing: isRefreshing,
    filterOptions: FILTER_OPTIONS,
    activeFilter,
    onFilterChange: handleFilterChange,
    containerStyle: { paddingHorizontal: 0, paddingTop: 8, marginTop: 4, overflow: 'hidden' },
    disableAutoReveal: true,
  });

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, REFRESH_DELAY));
    setIsRefreshing(false);
  }, []);

  // Handle delete itinerary item
  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!itemId) {
        return;
      }

      closeAllSwipeables();
      setItinerary(prev => prev.filter(item => item.id !== itemId));

      if (!user?.id || isGuest) {
        return;
      }

      try {
        const { data, error } = await staysBookingsService.markAsDeleted(itemId, user.id);
        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error('No matching item found to delete.');
        }

        await fetchItinerary();
      } catch (error) {
        console.error('Failed to delete itinerary item', error);
        showAlert({
          title: 'Delete failed',
          message: 'We could not delete this item. Please try again.',
          buttons: [{ text: 'OK' }],
        });
        await fetchItinerary();
      }
    },
    [closeAllSwipeables, user?.id, isGuest, fetchItinerary]
  );

  // Swipe actions for itinerary items
  const getSwipeActions = useCallback(
    (item: ItineraryData): SwipeAction[] => [
      {
        icon: 'trash-outline',
        onPress: () => handleDeleteItem(item.id),
        confirmTitle: 'Delete Item',
        confirmMessage: 'Are you sure you want to delete this item? This action cannot be undone.',
        confirmButtonText: 'Delete',
        isDestructive: true,
      },
    ],
    [handleDeleteItem]
  );

  // Handle message item press
  const handleItemPress = (item: ItineraryData) => {
    // Mark as read/unread in the original itinerary (for real IDs only)
    if (!item.id.includes('_stay_')) {
      setItinerary(prevItems =>
        prevItems.map(i => (i.id === item.id ? { ...i, isRead: !i.isRead } : i))
      );
    }
  };

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <>
      <PushScreenOptions />
      <IOSScreenWrapper>
        <ThemedView
          style={styles.container}
          lightColor={ITINERARY_COLORS.light.background}
          darkColor={ITINERARY_COLORS.dark.background}
        >
          <GestureHandlerRootView style={styles.container}>
            <CustomHeader
              showLogo={true}
              leftAction={{
                icon: 'chevron-back',
                onPress: handleGoBack,
                color: '#FF3B30',
              }}
              rightAction={{
                icon: viewMode === 'calendar' ? 'list' : 'calendar',
                onPress: () => {
                  setViewMode(viewMode === 'calendar' ? 'list' : 'calendar');
                  // Reset week focus when switching views
                  setSelectedDate(null);
                  setIsWeekFocused(false);
                  setFocusedWeekIndex(null);
                },
              }}
            />

            {/* Title under logo, left-aligned */}
            <View style={styles.titleSection}>
              <ThemedText type="title1" style={styles.pageTitle}>
                Itinerary
              </ThemedText>
            </View>

            {viewMode === 'list' && searchSection}

            {viewMode === 'calendar' ? (
              <CalendarView
                currentMonth={currentMonth}
                expandedItinerary={expandedItinerary}
                originalItinerary={itinerary}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                isWeekFocused={isWeekFocused}
                setIsWeekFocused={setIsWeekFocused}
                focusedWeekIndex={focusedWeekIndex}
                setFocusedWeekIndex={setFocusedWeekIndex}
                isRefreshing={isRefreshing}
                isAnimating={isAnimating}
                setIsAnimating={setIsAnimating}
                colorScheme={colorScheme as 'light' | 'dark' | null}
                onRefresh={handleRefresh}
                onNavigateMonth={navigateMonth}
                slideAnim={slideAnim}
                opacityAnim={opacityAnim}
                inlineCardAnim={inlineCardAnim}
                bottomRowsTranslate={bottomRowsTranslate}
              />
            ) : (
              <ListView
                filteredItinerary={filteredItinerary}
                searchQuery={searchQuery}
                activeFilter={activeFilter}
                isRefreshing={isRefreshing}
                onRefresh={handleRefresh}
                onItemPress={handleItemPress}
                swipeActions={getSwipeActions}
                openSwipeableRefs={openSwipeableRefs}
                getAvatarColor={getAvatarColor}
                onScrollBeginDrag={closeAllSwipeables}
                colorScheme={colorScheme as 'light' | 'dark' | null}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
              />
            )}
          </GestureHandlerRootView>
        </ThemedView>
      </IOSScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    textAlign: 'left',
  },
});
