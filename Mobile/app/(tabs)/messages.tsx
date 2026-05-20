import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  Easing,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';

// Import reusable components and utilities
import { CustomHeader, MessageItem, useCollapsibleSearchSection } from '@/components';
import type { MessageData, SwipeAction } from '@/components';
import { generateInitialMessages } from '@/utils/messageData';
import { messageAnimations } from '@/utils/messageAnimations';
import { getAvatarColor, categorizeMessages, filterMessagesBySearch } from '@/utils/messageUtils';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import { useMessagesContext } from '@/context/MessagesContext';
import { useAppAlert } from '@/context/AppAlertContext';
import { listCardBase, listCardDynamicStyle } from '@/styles/cardStyles';

// Constants
const { width: screenWidth } = Dimensions.get('window');

const SCREEN_HORIZONTAL_PADDING = responsiveSize(16, 14, 20);
const TITLE_BOTTOM_PADDING = responsiveSize(8, 6, 10);
const SEARCH_TOP_PADDING = responsiveSize(8, 6, 10);
const SEARCH_TOP_MARGIN = responsiveSize(4, 3, 6);
const CARD_RADIUS = responsiveSize(18, 15, 22);
const CARD_BOTTOM_GAP = responsiveSize(12, 10, 15);
const LIST_BOTTOM_PADDING = responsiveSize(100, 82, 124);
const EMPTY_HORIZONTAL_PADDING = responsiveSize(32, 24, 40);
const EMPTY_TOP_PADDING = responsiveSize(80, 64, 96);
const EMPTY_ICON_SIZE = responsiveSize(60, 52, 70);
const EMPTY_TITLE_TOP_MARGIN = responsiveSize(12, 10, 16);
const EMPTY_TEXT_TOP_MARGIN = responsiveSize(6, 4, 8);
const MESSAGE_ITEM_HEIGHT = responsiveSize(96, 88, 108);

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MessagesScreen() {
  const [messages, setMessages] = useState<MessageData[]>(generateInitialMessages());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const { setUnreadCount } = useMessagesContext();
  const { showAlert } = useAppAlert();

  // Helper function to replace all isDark references
  const isDarkMode = () => colorScheme === 'dark';

  // Keep the messages tab badge in sync — sum all unread counts across conversations
  useEffect(() => {
    const count = messages.reduce((sum, m) => sum + (m.unreadCount || 0), 0);
    setUnreadCount(count);
  }, [messages]);

  const showAppAlert = useCallback(
    (config: {
      title: string;
      message: string;
      buttons: {
        text: string;
        style?: 'default' | 'cancel' | 'destructive';
        onPress?: () => void;
      }[];
    }) => {
      showAlert(config);
    },
    [showAlert]
  );

  // Animation value for list transitions (cross-fade between lists)
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Define filter options (using only 'all' and 'unread' for messages)
  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
  ];

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Check for updated/new message when returning from message-detail
  useFocusEffect(
    useCallback(() => {
      if (params.returnMessage) {
        try {
          const updatedMessageData = JSON.parse(params.returnMessage as string);

          // Check if message already exists
          setMessages(prevMessages => {
            const existingIndex = prevMessages.findIndex(m => m.id === updatedMessageData.id);

            if (existingIndex >= 0) {
              // Update existing message (move to top and update content)
              const updatedMessages = [...prevMessages];
              updatedMessages[existingIndex] = {
                ...updatedMessages[existingIndex],
                ...updatedMessageData,
                time: updatedMessageData.time,
                timestamp: Date.now(), // keep it at top after sort
              };
              // Move to top
              const [updated] = updatedMessages.splice(existingIndex, 1);
              return [updated, ...updatedMessages];
            } else {
              // Add new message to top of list (only if there was actual conversation)
              if (updatedMessageData.message && updatedMessageData.message.trim() !== '') {
                return [{ ...updatedMessageData, timestamp: Date.now() }, ...prevMessages];
              }
              return prevMessages;
            }
          });

          // Clear the param to avoid re-adding on next focus
          router.setParams({ returnMessage: undefined });
        } catch (error) {
          console.error('Error parsing return message:', error);
        }
      }
    }, [params.returnMessage])
  );

  // Provider cards and drawer entry points land on the Messages tab without adding a back stack.
  useFocusEffect(
    useCallback(() => {
      if (!params.providerMessage) {
        return;
      }

      try {
        const providerMessageData = JSON.parse(params.providerMessage as string) as MessageData;

        setActiveFilter('all');
        setSearchQuery('');
        setMessages(prevMessages => {
          const existingIndex = prevMessages.findIndex(m => m.id === providerMessageData.id);
          const normalizedMessage = {
            ...providerMessageData,
            message: providerMessageData.message || 'Tap to start a conversation',
            timestamp: Date.now(),
            isRead: true,
            unreadCount: 0,
          };

          if (existingIndex >= 0) {
            const updatedMessages = [...prevMessages];
            updatedMessages[existingIndex] = {
              ...updatedMessages[existingIndex],
              ...normalizedMessage,
            };
            const [updated] = updatedMessages.splice(existingIndex, 1);
            return [updated, ...updatedMessages];
          }

          return [normalizedMessage, ...prevMessages];
        });

        router.setParams({ providerMessage: undefined });
      } catch (error) {
        console.error('Error parsing provider message:', error);
      }
    }, [params.providerMessage])
  );

  const handleFilterChange = useCallback((filter: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilter(filter);
  }, []);

  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    refreshing,
    filterOptions,
    activeFilter,
    onFilterChange: handleFilterChange,
    containerStyle: styles.searchFilterContainer,
    disableAutoReveal: true,
  });

  const closeAllSwipeables = useCallback(() => {
    swipeableRefs.current.forEach(ref => {
      if (ref) ref.close();
    });
  }, []);

  const closeOtherSwipeables = useCallback((itemId: string) => {
    swipeableRefs.current.forEach((ref, key) => {
      if (key !== itemId && ref) {
        ref.close();
      }
    });
  }, []);

  // Ensure the active filter is always at value 1 and inactive at 0
  useEffect(() => {
    // Close all swipeables when changing tab
    closeAllSwipeables();

    // Cross-fade lists with animated value
    fadeAnim.setValue(0.7);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [activeFilter, fadeAnim, closeAllSwipeables]);

  // Simulate refresh - just refresh existing data (no new messages unless from real server)
  const onRefresh = () => {
    setRefreshing(true);
    // Simulate a network request to check for updates
    setTimeout(() => {
      // In a real app, this would fetch from server
      // For now, just refresh the existing data without adding anything
      setRefreshing(false);
      // Add haptic feedback after refresh completes
      if (Platform.OS === 'ios') {
      }
    }, 1500); // Slightly longer delay for more natural feel
  }; // Pre-classify messages into categories for instant filtering
  const categorizedMessages = useMemo(() => {
    return categorizeMessages(messages);
  }, [messages]); // Only recalculate when messages change

  // Get messages for current filter and search
  const filteredMessages = useMemo(() => {
    // Get the pre-filtered category
    const categoryMessages =
      categorizedMessages[activeFilter as keyof typeof categorizedMessages] || [];

    // Apply search if needed, then sort most-recent first
    return filterMessagesBySearch(categoryMessages, searchQuery)
      .slice()
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [categorizedMessages, searchQuery, activeFilter]);

  const openMessage = (message: MessageData) => {
    // Mark as read when opening
    setMessages(prevMessages =>
      prevMessages.map(item => {
        if (item.id === message.id) {
          return { ...item, isRead: true, unreadCount: 0 };
        }
        return item;
      })
    );

    // Navigate to message detail page
    router.push({
      pathname: '/message-detail',
      params: {
        message: JSON.stringify(message),
      },
    });
  };

  const reportMessage = (id: string) => {
    const swipeable = swipeableRefs.current.get(id);
    if (swipeable) {
      swipeable.close();
    }

    showAppAlert({
      title: 'Thank You',
      message: "Your report has been submitted. We'll review this conversation shortly.",
      buttons: [{ text: 'Close' }],
    });
  };

  const deleteMessage = (id: string) => {
    LayoutAnimation.configureNext(messageAnimations.deletion);
    setMessages(prevMessages => prevMessages.filter(item => item.id !== id));
  };

  const clearAllMessages = () => {
    showAppAlert({
      title: 'Delete All Messages',
      message: 'Are you sure you want to delete all messages? This action cannot be undone.',
      buttons: [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
            }
            LayoutAnimation.configureNext(messageAnimations.batchOperation);
            setMessages([]);
          },
        },
      ],
    });
  };

  // Handle swipe with better haptic timing
  const handleSwipeStart = () => {
    if (Platform.OS === 'ios') {
    }
  };

  const renderItem = ({ item }: { item: MessageData }) => {
    const swipeActions: SwipeAction[] = [
      {
        icon: 'flag',
        onPress: () =>
          showAppAlert({
            title: 'Report Message',
            message: 'Are you sure you want to report this message?',
            buttons: [
              { text: 'Close', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => reportMessage(item.id),
              },
            ],
          }),
        isDestructive: true,
      },
      {
        icon: 'trash-outline',
        onPress: () =>
          showAppAlert({
            title: 'Delete Message',
            message: 'Are you sure you want to delete this message? This action cannot be undone.',
            buttons: [
              { text: 'Close', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteMessage(item.id),
              },
            ],
          }),
        isDestructive: true,
      },
    ];

    return (
      <MessageItem
        item={item}
        onPress={() => openMessage(item)}
        // Long press disabled per request
        swipeActions={swipeActions}
        swipeableRef={ref => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        onSwipeStart={handleSwipeStart}
        onSwipeOpen={() => closeOtherSwipeables(item.id)}
        getAvatarColor={getAvatarColor}
        style={[styles.messageCard, listCardDynamicStyle(isDarkMode())]}
      />
    );
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <IOSScreenWrapper>
        <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
          <CustomHeader
            showLogo={true}
            rightAction={{
              icon: 'trash-outline',
              onPress: clearAllMessages,
              color: '#FF3B30',
            }}
          />

          {/* Title under logo, left-aligned */}
          <View style={styles.titleSection}>
            <ThemedText type="title1" style={styles.pageTitle}>
              Messages
            </ThemedText>
          </View>

          {searchSection}

          <ScrollView
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            {/* Messages list */}
            {filteredMessages.length > 0 ? (
              <Animated.View style={{ opacity: fadeAnim }}>
                <FlatList
                  data={filteredMessages}
                  renderItem={renderItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false} // Disable FlatList scroll since ScrollView handles it
                  getItemLayout={(data, index) => ({
                    length: MESSAGE_ITEM_HEIGHT,
                    offset: MESSAGE_ITEM_HEIGHT * index,
                    index,
                  })}
                  onScrollBeginDrag={() => closeAllSwipeables()}
                />
              </Animated.View>
            ) : (
              <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
                {searchQuery.length > 0 ? (
                  <>
                    <Ionicons
                      name="search-outline"
                      size={60}
                      color={isDarkMode() ? '#555' : '#ccc'}
                    />
                    <ThemedText type="headline" style={styles.emptyText}>
                      No matching messages
                    </ThemedText>
                    <ThemedText type="caption" style={styles.emptySubText}>
                      No messages match your search term “{searchQuery}”
                    </ThemedText>
                  </>
                ) : activeFilter === 'unread' ? (
                  <>
                    <Ionicons
                      name="mail-open-outline"
                      size={60}
                      color={isDarkMode() ? '#555' : '#ccc'}
                    />
                    <ThemedText type="headline" style={styles.emptyText}>
                      No unread messages
                    </ThemedText>
                    <ThemedText type="caption" style={styles.emptySubText}>
                      All your messages have been read
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={60}
                      color={isDarkMode() ? '#555' : '#ccc'}
                    />
                    <ThemedText type="headline" style={styles.emptyText}>
                      No messages
                    </ThemedText>
                    <ThemedText type="caption" style={styles.emptySubText}>
                      You don’t have any messages at the moment
                    </ThemedText>
                  </>
                )}
              </Animated.View>
            )}
          </ScrollView>
        </ThemedView>
      </IOSScreenWrapper>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  titleSection: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 0,
    paddingBottom: TITLE_BOTTOM_PADDING,
  },
  searchFilterContainer: {
    paddingHorizontal: 0,
    paddingTop: SEARCH_TOP_PADDING,
    marginTop: SEARCH_TOP_MARGIN,
    overflow: 'hidden',
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    lineHeight: responsiveLineHeight(24),
    fontFamily: Fonts.bold,
    textAlign: 'left',
  },
  listContent: {
    paddingBottom: LIST_BOTTOM_PADDING,
  },
  messageCard: {
    borderRadius: CARD_RADIUS,
    marginHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: CARD_BOTTOM_GAP,
    ...listCardBase,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: EMPTY_HORIZONTAL_PADDING,
    paddingTop: EMPTY_TOP_PADDING,
  },
  emptyText: {
    marginTop: EMPTY_TITLE_TOP_MARGIN,
    fontSize: responsiveFontSize(17),
    lineHeight: responsiveLineHeight(17),
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: EMPTY_TEXT_TOP_MARGIN,
    color: '#8E8E93',
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(13),
  },
});
