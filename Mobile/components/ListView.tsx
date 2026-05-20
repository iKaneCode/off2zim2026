import React from 'react';
import { StyleSheet, View, FlatList, Platform, ScrollView, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ItineraryItem, type ItineraryData } from '@/components';
import { SwipeAction } from '@/components/SwipeActions';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Asset } from 'expo-asset';
import { SvgUri } from 'react-native-svg';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

const ACCOMMODATION_ICON_ASSET = require('@/assets/icons/accommodation.svg');
const EVENTS_ICON_ASSET = require('@/assets/icons/events.svg');
const THINGS_ICON_ASSET = require('@/assets/icons/things.svg');

type EmptyIconType =
  | 'default'
  | 'search'
  | 'stays'
  | 'events'
  | 'things'
  | 'flights'
  | 'bus'
  | 'dining';

const emptyStateTone: Record<EmptyIconType, string> = {
  default: '#8E8E93',
  search: '#8E8E93',
  stays: '#FF6B6B',
  events: '#AF52DE',
  things: '#34C759',
  flights: '#007AFF',
  bus: '#FF9500',
  dining: '#FF9F0A',
};

function ExploreAssetIcon({
  assetModule,
  color,
  size,
}: {
  assetModule: number;
  color: string;
  size: number;
}) {
  const asset = React.useMemo(() => Asset.fromModule(assetModule), [assetModule]);
  const [uri, setUri] = React.useState<string | null>(
    asset.localUri ?? (asset.downloaded ? asset.uri : null)
  );

  React.useEffect(() => {
    let mounted = true;

    const prepare = async () => {
      if (!asset.localUri && !asset.downloaded) {
        await asset.downloadAsync();
      }

      if (mounted) {
        setUri(asset.localUri ?? asset.uri ?? null);
      }
    };

    prepare();

    return () => {
      mounted = false;
    };
  }, [asset]);

  if (!uri) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgUri uri={uri} width={size} height={size} color={color} fill={color} />;
}

function ItineraryEmptyIcon({ type, isDarkMode }: { type: EmptyIconType; isDarkMode: boolean }) {
  const color = emptyStateTone[type];
  const bubbleColor = isDarkMode ? `${color}26` : `${color}18`;

  const icon =
    type === 'stays' ? (
      <ExploreAssetIcon assetModule={ACCOMMODATION_ICON_ASSET} color={color} size={34} />
    ) : type === 'events' ? (
      <ExploreAssetIcon assetModule={EVENTS_ICON_ASSET} color={color} size={34} />
    ) : type === 'things' ? (
      <ExploreAssetIcon assetModule={THINGS_ICON_ASSET} color={color} size={34} />
    ) : (
      <Ionicons
        name={
          type === 'search'
            ? 'search-outline'
            : type === 'flights'
              ? 'airplane-outline'
              : type === 'bus'
                ? 'bus-outline'
                : type === 'dining'
                  ? 'restaurant-outline'
                  : 'calendar-outline'
        }
        size={34}
        color={color}
      />
    );

  return <View style={[styles.emptyIconBubble, { backgroundColor: bubbleColor }]}>{icon}</View>;
}

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
          <ItineraryEmptyIcon type="search" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No matching itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            No itinerary items match your search term “{searchQuery}”
          </ThemedText>
        </>
      ) : activeFilter === 'Today' ? (
        <>
          <ItineraryEmptyIcon type="default" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No itinerary today</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any itinerary items scheduled for today
          </ThemedText>
        </>
      ) : activeFilter === 'Past' ? (
        <>
          <ItineraryEmptyIcon type="default" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No past itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any past itinerary items
          </ThemedText>
        </>
      ) : activeFilter === 'Stays' ? (
        <>
          <ItineraryEmptyIcon type="stays" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No stays itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any accommodation bookings at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Flights' ? (
        <>
          <ItineraryEmptyIcon type="flights" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No flights itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any flight bookings at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Bus' ? (
        <>
          <ItineraryEmptyIcon type="bus" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No bus itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any bus bookings at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'ThingsToDo' ? (
        <>
          <ItineraryEmptyIcon type="things" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No things to do scheduled</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any activities planned at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Events' ? (
        <>
          <ItineraryEmptyIcon type="events" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No upcoming events</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any events planned at the moment
          </ThemedText>
        </>
      ) : activeFilter === 'Dining' ? (
        <>
          <ItineraryEmptyIcon type="dining" isDarkMode={isDarkMode} />
          <ThemedText style={styles.emptyTitle}>No dining itinerary</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            You don’t have any dining reservations at the moment
          </ThemedText>
        </>
      ) : (
        <>
          <ItineraryEmptyIcon type="default" isDarkMode={isDarkMode} />
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
  emptyIconBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
