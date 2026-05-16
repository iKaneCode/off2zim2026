import React from 'react';
import { StyleSheet, View, FlatList, Platform, ScrollView, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ItineraryItem, type ItineraryData } from '@/components';
import { SwipeAction } from '@/components/SwipeActions';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

interface ListViewProps {
  filteredItinerary: ItineraryData[];
  searchQuery: string;
  activeFilter: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onItemPress: (item: ItineraryData) => void;
  swipeActions: SwipeAction[] | ((item: ItineraryData) => SwipeAction[]);
  openSwipeableRefs: React.MutableRefObject<{ [key: string]: Swipeable | null }>;
  getAvatarColor: (type: string) => string;
  onScrollBeginDrag: () => void;
  colorScheme: 'light' | 'dark' | null;
  onScroll?: (event: any) => void;
  onMomentumScrollEnd?: (event: any) => void;
}

export function ListView({
  filteredItinerary,
  searchQuery,
  activeFilter,
  isRefreshing,
  onRefresh,
  onItemPress,
  swipeActions,
  openSwipeableRefs,
  getAvatarColor,
  onScrollBeginDrag,
  colorScheme,
  onScroll,
  onMomentumScrollEnd,
}: ListViewProps) {
  const isDarkMode = colorScheme === 'dark';
  const [currentOpenSwipeable, setCurrentOpenSwipeable] = React.useState<string | null>(null);

  const handleSwipeOpen = (itemId: string) => {
    // Close previously open swipeable if it's different from the current one
    if (currentOpenSwipeable && currentOpenSwipeable !== itemId) {
      openSwipeableRefs.current[currentOpenSwipeable]?.close();
    }
    setCurrentOpenSwipeable(itemId);
  };

  // Custom render for empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {searchQuery.length > 0 ? (
        <>
          <Ionicons name="search-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No matching itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            No itinerary items match your search term “{searchQuery}”
          </ThemedText>
        </>
      ) : activeFilter === 'Today' ? (
        <>
          <Ionicons name="calendar-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No itinerary today</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any itinerary items scheduled for today
          </ThemedText>
        </>
      ) : activeFilter === 'Past' ? (
        <>
          <Ionicons name="calendar-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No past itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any past itinerary items
          </ThemedText>
        </>
      ) : activeFilter === 'Stays' ? (
        <>
          <Ionicons name="bed-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No stays itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any accommodation bookings at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Flights' ? (
        <>
          <Ionicons name="airplane-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No flights itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any flight bookings at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Bus' ? (
        <>
          <Ionicons name="bus-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No bus itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any bus bookings at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'ThingsToDo' ? (
        <>
          <Ionicons name="map-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No activities itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any activities planned at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Events' ? (
        <>
          <Ionicons name="ticket-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No events itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any events planned at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Dining' ? (
        <>
          <Ionicons name="restaurant-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No dining itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any dining reservations at the moment
          </ThemedText>
        </>
      ) : (
        <>
          <Ionicons name="calendar-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText style={styles.emptyTitle}>No itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any itinerary items at the moment
          </ThemedText>
        </>
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={onMomentumScrollEnd}
      contentInsetAdjustmentBehavior="never"
    >
      {filteredItinerary.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredItinerary}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ItineraryItem
              item={item}
              onPress={() => onItemPress(item)}
              swipeActions={typeof swipeActions === 'function' ? swipeActions(item) : swipeActions}
              swipeableRef={(ref: any) => {
                openSwipeableRefs.current[item.id] = ref;
              }}
              onSwipeOpen={() => handleSwipeOpen(item.id)}
              getAvatarColor={() => getAvatarColor((item as ItineraryData).type)}
              style={[
                styles.itineraryCard,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                },
              ]}
            />
          )}
          scrollEnabled={false} // Disable FlatList scroll since ScrollView handles it
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={onScrollBeginDrag}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 80, // More padding for iOS due to home indicator
  },
  itineraryCard: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    height: '70%',
  },
  emptyTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: responsiveFontSize(14),
    textAlign: 'center',
    marginTop: 6,
    color: '#8E8E93',
  },
});
