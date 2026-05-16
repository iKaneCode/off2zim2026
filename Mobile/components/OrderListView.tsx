import React from 'react';
import { StyleSheet, View, FlatList, Platform, ScrollView, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ItineraryItem, type ItineraryData } from '@/components';
import { SwipeAction } from '@/components/SwipeActions';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';

interface OrderListViewProps {
  filteredItinerary: ItineraryData[];
  searchQuery: string;
  activeFilter: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onItemPress: (item: ItineraryData) => void;
  getRightSwipeActions?: (item: ItineraryData) => SwipeAction[];
  getLeftSwipeActions?: (item: ItineraryData) => SwipeAction[];
  openSwipeableRefs: React.MutableRefObject<{ [key: string]: Swipeable | null }>;
  getAvatarColor: (type: string) => string;
  onScrollBeginDrag: () => void;
  colorScheme: 'light' | 'dark' | null;
  onScroll?: (event: any) => void;
  onMomentumScrollEnd?: (event: any) => void;
  onSwipeOpen?: (id: string) => void;
  leftActionsWidth?: number;
  rightActionsWidth?: number;
  leftActionsEndOffset?: number;
  rightActionsEndOffset?: number;
}

export function OrderListView({
  filteredItinerary,
  searchQuery,
  activeFilter,
  isRefreshing,
  onRefresh,
  onItemPress,
  getRightSwipeActions,
  getLeftSwipeActions,
  openSwipeableRefs,
  getAvatarColor,
  onScrollBeginDrag,
  colorScheme,
  onScroll,
  onMomentumScrollEnd,
  onSwipeOpen,
  leftActionsWidth = 88,
  rightActionsWidth = 120,
  leftActionsEndOffset = 16,
  rightActionsEndOffset = 16,
}: OrderListViewProps) {
  const isDarkMode = colorScheme === 'dark';

  // Custom render for empty state - order specific
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {searchQuery.length > 0 ? (
        <>
          <Ionicons name="search-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText type="headline" style={styles.emptyTitle}>
            No matching orders
          </ThemedText>
          <ThemedText type="caption" style={styles.emptyDescription}>
            No orders match your search term “{searchQuery}”
          </ThemedText>
        </>
      ) : activeFilter === 'pending' ? (
        <>
          <Ionicons name="time-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText type="headline" style={styles.emptyTitle}>
            No pending orders
          </ThemedText>
          <ThemedText type="caption" style={styles.emptyDescription}>
            You don’t have any orders awaiting payment
          </ThemedText>
        </>
      ) : activeFilter === 'completed' ? (
        <>
          <Ionicons
            name="checkmark-circle-outline"
            size={60}
            color={isDarkMode ? '#555' : '#ccc'}
          />
          <ThemedText type="headline" style={styles.emptyTitle}>
            No completed orders
          </ThemedText>
          <ThemedText type="caption" style={styles.emptyDescription}>
            You don’t have any completed orders yet
          </ThemedText>
        </>
      ) : activeFilter === 'failed' ? (
        <>
          <Ionicons name="close-circle-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText type="headline" style={styles.emptyTitle}>
            No failed orders
          </ThemedText>
          <ThemedText type="caption" style={styles.emptyDescription}>
            You don’t have any failed or cancelled orders
          </ThemedText>
        </>
      ) : (
        <>
          <Ionicons name="receipt-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <ThemedText type="headline" style={styles.emptyTitle}>
            No orders
          </ThemedText>
          <ThemedText type="caption" style={styles.emptyDescription}>
            You don’t have any orders at the moment
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
      contentContainerStyle={styles.scrollContentContainer}
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
              swipeActions={getRightSwipeActions?.(item) ?? []}
              leftSwipeActions={getLeftSwipeActions?.(item) ?? []}
              swipeableRef={(ref: any) => {
                if (ref) {
                  openSwipeableRefs.current[item.id] = ref;
                } else {
                  delete openSwipeableRefs.current[item.id];
                }
              }}
              onSwipeOpen={() => onSwipeOpen?.(item.id)}
              getAvatarColor={() => getAvatarColor((item as ItineraryData).type)}
              leftActionsWidth={leftActionsWidth}
              rightActionsWidth={rightActionsWidth}
              leftActionsEndOffset={leftActionsEndOffset}
              rightActionsEndOffset={rightActionsEndOffset}
              tappable={true}
              style={[
                styles.orderCard,
                {
                  backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                },
              ]}
            />
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={onScrollBeginDrag}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  orderCard: {
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
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    marginTop: 6,
    color: '#8E8E93',
  },
});
