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
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';

// Import reusable components and utilities
import { CustomHeader, GlassPanel, MessageItem, useCollapsibleSearchSection } from '@/components';
import type { SwipeAction } from '@/components';
import { generateInitialNotifications } from '@/utils/notificationData';
import type { NotificationData } from '@/utils/notificationData';
import { messageAnimations } from '@/utils/messageAnimations';
import {
  getNotificationAvatarColor,
  categorizeNotifications,
  filterNotificationsBySearch,
} from '@/utils/notificationUtils';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import { useNotificationsContext } from '@/context/NotificationsContext';
import { useAppAlert } from '@/context/AppAlertContext';
import { listCardBase, listCardDynamicStyle } from '@/styles/cardStyles';

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
const NOTIFICATION_ROW_HEIGHT = responsiveSize(78, 70, 90);

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationData[]>(
    generateInitialNotifications()
  );
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    name: string;
    message: string;
    avatar: string;
    avatarImage?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const { setUnreadCount } = useNotificationsContext();
  const { showAlert } = useAppAlert();

  // Keep the tab bar badge in sync with unread notifications
  useEffect(() => {
    const count = notifications.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notifications]);

  // Helper function to replace all isDark references
  const isDarkMode = () => colorScheme === 'dark';

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

  // Define filter options
  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
  ];

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

  // Simulate refresh - just refresh existing data (no new notifications unless from real server)
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
    }, 1000); // Shorter delay since we're not actually doing anything
  };
  // Pre-classify notifications into categories for instant filtering
  const categorizedNotifications = useMemo(() => {
    return categorizeNotifications(notifications);
  }, [notifications]); // Only recalculate when notifications change

  // Get notifications for current filter and search
  const filteredNotifications = useMemo(() => {
    // Get the pre-filtered category
    const categoryNotifications =
      categorizedNotifications[activeFilter as keyof typeof categorizedNotifications] || [];

    // Apply search if needed, then sort most-recent first
    return filterNotificationsBySearch(categoryNotifications, searchQuery)
      .slice()
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [categorizedNotifications, searchQuery, activeFilter]);

  const markAsRead = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(item => {
        if (item.id === id) {
          return { ...item, isRead: true };
        }
        return item;
      })
    );
  };

  const openNotification = (notification: NotificationData) => {
    markAsRead(notification.id);
    setActiveNotification({
      id: notification.id,
      name: notification.name,
      message: notification.message,
      avatar: notification.avatar,
      avatarImage: notification.avatarImage,
    });
  };

  // Using OrderSheet's internal status pill logic; no local statusConfig/details needed

  const reportNotification = (id: string) => {
    const swipeable = swipeableRefs.current.get(id);
    if (swipeable) {
      swipeable.close();
    }

    showAppAlert({
      title: 'Thank You',
      message: "Your report has been submitted. We'll review this notification shortly.",
      buttons: [{ text: 'Close' }],
    });
  };

  const deleteNotification = (id: string) => {
    LayoutAnimation.configureNext(messageAnimations.deletion);
    setNotifications(prevNotifications => prevNotifications.filter(item => item.id !== id));
  };

  const clearAllNotifications = () => {
    showAppAlert({
      title: 'Delete All Notifications',
      message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
      buttons: [
        {
          text: 'Close',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
            }

            LayoutAnimation.configureNext(messageAnimations.batchOperation);
            setNotifications([]);
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

  const renderItem = ({ item }: { item: NotificationData }) => {
    const swipeActions: SwipeAction[] = [
      {
        icon: 'flag',
        onPress: () =>
          showAppAlert({
            title: 'Report Notification',
            message: 'Are you sure you want to report this notification?',
            buttons: [
              { text: 'Close', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => reportNotification(item.id),
              },
            ],
          }),
        isDestructive: true,
      },
      {
        icon: 'trash-outline',
        onPress: () =>
          showAppAlert({
            title: 'Delete Notification',
            message:
              'Are you sure you want to delete this notification? This action cannot be undone.',
            buttons: [
              { text: 'Close', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteNotification(item.id),
              },
            ],
          }),
        isDestructive: true,
      },
    ];

    return (
      <MessageItem
        item={item}
        onPress={() => openNotification(item)}
        // Long press disabled per request
        swipeActions={swipeActions}
        swipeableRef={ref => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        onSwipeStart={handleSwipeStart}
        onSwipeOpen={() => closeOtherSwipeables(item.id)}
        getAvatarColor={getNotificationAvatarColor}
        style={[styles.notificationCard, listCardDynamicStyle(isDarkMode())]}
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
              onPress: clearAllNotifications,
              color: '#FF3B30',
            }}
          />

          {/* Title under logo, left-aligned */}
          <View style={styles.titleSection}>
            <ThemedText type="title1" style={styles.pageTitle}>
              Notifications
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
            {filteredNotifications.length > 0 ? (
              <Animated.View style={{ flex: 1, opacity: fadeAnim, paddingBottom: 0 }}>
                <FlatList
                  data={filteredNotifications}
                  renderItem={renderItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={[
                    styles.listContent,
                    { paddingHorizontal: 0, paddingBottom: LIST_BOTTOM_PADDING },
                  ]}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false} // Disable FlatList scroll since ScrollView handles it
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={10}
                  removeClippedSubviews={true}
                  getItemLayout={(data, index) => ({
                    length: NOTIFICATION_ROW_HEIGHT,
                    offset: NOTIFICATION_ROW_HEIGHT * index,
                    index,
                  })}
                  extraData={activeFilter}
                  onScrollBeginDrag={() => closeAllSwipeables()}
                />
              </Animated.View>
            ) : (
              <Animated.View
                style={[
                  styles.emptyContainer,
                  {
                    opacity: fadeAnim,
                    position: 'relative',
                    height: '70%',
                  },
                ]}
              >
                {searchQuery.length > 0 ? (
                  <>
                    <Ionicons
                      name="search-outline"
                      size={EMPTY_ICON_SIZE}
                      color={isDarkMode() ? '#555' : '#ccc'}
                    />
                    <ThemedText type="headline" style={styles.emptyText}>
                      No matching notifications
                    </ThemedText>
                    <ThemedText type="caption" style={styles.emptySubText}>
                      No notifications match your search term “{searchQuery}”
                    </ThemedText>
                  </>
                ) : activeFilter === 'unread' ? (
                  <>
                    <Ionicons
                      name="notifications-off-outline"
                      size={EMPTY_ICON_SIZE}
                      color={isDarkMode() ? '#555' : '#ccc'}
                    />
                    <ThemedText type="headline" style={styles.emptyText}>
                      No unread notifications
                    </ThemedText>
                    <ThemedText type="caption" style={styles.emptySubText}>
                      All your notifications have been read
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="notifications-off-outline"
                      size={EMPTY_ICON_SIZE}
                      color={isDarkMode() ? '#555' : '#ccc'}
                    />
                    <ThemedText type="headline" style={styles.emptyText}>
                      No notifications
                    </ThemedText>
                    <ThemedText type="caption" style={styles.emptySubText}>
                      You don’t have any notifications at the moment
                    </ThemedText>
                  </>
                )}
              </Animated.View>
            )}
          </ScrollView>

          {/* Wrap with Modal to match booking sheet presentation/position */}
          <Modal
            visible={!!activeNotification}
            transparent
            animationType="fade"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={() => setActiveNotification(null)}
          >
            <Pressable style={styles.alertBackdrop} onPress={() => setActiveNotification(null)}>
              <Pressable style={styles.alertCard}>
                <GlassPanel
                  intensity={isDarkMode() ? 22 : 32}
                  tint={isDarkMode() ? 'dark' : 'light'}
                  style={[
                    styles.alertGlass,
                    {
                      backgroundColor: isDarkMode()
                        ? Platform.OS === 'android'
                          ? 'rgba(38, 38, 40, 0.97)'
                          : 'rgba(44, 44, 46, 0.82)'
                        : Platform.OS === 'android'
                          ? 'rgba(248, 248, 250, 0.98)'
                          : 'rgba(246, 246, 248, 0.88)',
                      borderColor: isDarkMode()
                        ? 'rgba(255,255,255,0.16)'
                        : 'rgba(255,255,255,0.82)',
                    },
                  ]}
                >
                  <View style={styles.alertContent}>
                    <View style={styles.notifProviderRow}>
                      <View
                        style={[
                          styles.notifAvatar,
                          {
                            backgroundColor: activeNotification?.avatarImage
                              ? 'transparent'
                              : getNotificationAvatarColor(activeNotification?.avatar ?? ''),
                          },
                        ]}
                      >
                        {activeNotification?.avatarImage ? (
                          <Image
                            source={{ uri: activeNotification.avatarImage }}
                            style={styles.notifAvatarImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <ThemedText allowFontScaling={false} style={styles.notifAvatarText}>
                            {activeNotification?.avatar}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText allowFontScaling={false} style={styles.alertTitle}>
                        {activeNotification?.name}
                      </ThemedText>
                    </View>
                    <ThemedText
                      allowFontScaling={false}
                      style={[
                        styles.alertMessage,
                        { color: isDarkMode() ? 'rgba(235,235,245,0.78)' : '#2F2F36' },
                      ]}
                    >
                      {activeNotification?.message}
                    </ThemedText>
                  </View>
                  <View style={styles.alertButtonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.alertButton,
                        {
                          backgroundColor: isDarkMode()
                            ? 'rgba(120,120,128,0.28)'
                            : 'rgba(120,120,128,0.14)',
                        },
                      ]}
                      activeOpacity={0.68}
                      onPress={() => setActiveNotification(null)}
                    >
                      <ThemedText
                        allowFontScaling={false}
                        style={[styles.alertButtonText, styles.alertButtonCancel]}
                      >
                        Close
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.alertButton,
                        {
                          backgroundColor: isDarkMode()
                            ? 'rgba(255,69,58,0.22)'
                            : 'rgba(255,59,48,0.12)',
                        },
                      ]}
                      activeOpacity={0.68}
                      onPress={() => {
                        const id = activeNotification!.id;
                        setActiveNotification(null);
                        showAppAlert({
                          title: 'Delete Notification',
                          message:
                            'Are you sure you want to delete this notification? This action cannot be undone.',
                          buttons: [
                            { text: 'Close', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteNotification(id),
                            },
                          ],
                        });
                      }}
                    >
                      <ThemedText
                        allowFontScaling={false}
                        style={[styles.alertButtonText, styles.alertButtonDestructive]}
                      >
                        Delete
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </GlassPanel>
              </Pressable>
            </Pressable>
          </Modal>
        </ThemedView>
      </IOSScreenWrapper>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0, // Remove bottom padding to let FlatList handle it
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
    paddingBottom: responsiveSize(32, 26, 40),
  },
  notificationCard: {
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
  notifProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSize(8, 7, 10),
    marginBottom: responsiveSize(2, 1, 4),
  },
  notifAvatar: {
    width: responsiveSize(30, 26, 36),
    height: responsiveSize(30, 26, 36),
    borderRadius: responsiveSize(15, 13, 18),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  notifAvatarImg: {
    width: responsiveSize(30, 26, 36),
    height: responsiveSize(30, 26, 36),
    borderRadius: responsiveSize(15, 13, 18),
  },
  notifAvatarText: {
    fontSize: responsiveFontSize(11),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.26)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveSize(16, 14, 20),
  },
  alertCard: {
    width: Math.min(
      Dimensions.get('window').width - responsiveSize(48, 40, 60),
      responsiveSize(320, 304, 340)
    ),
    borderRadius: responsiveSize(22, 20, 26),
    overflow: 'hidden',
  },
  alertGlass: {
    overflow: 'hidden',
    borderRadius: responsiveSize(22, 20, 26),
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  alertContent: {
    paddingHorizontal: responsiveSize(18, 16, 20),
    paddingTop: responsiveSize(18, 16, 20),
    paddingBottom: responsiveSize(14, 12, 17),
  },
  alertTitle: {
    fontSize: responsiveFontSize(17),
    lineHeight: responsiveLineHeight(17),
    fontFamily: Fonts.bold,
    flexShrink: 1,
  },
  alertMessage: {
    marginTop: responsiveSize(6, 4, 8),
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveLineHeight(15),
    fontFamily: Fonts.regular,
    opacity: 0.92,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: responsiveSize(14, 12, 18),
    paddingBottom: responsiveSize(14, 12, 18),
    paddingTop: responsiveSize(4, 3, 6),
    gap: responsiveSize(9, 8, 11),
  },
  alertButton: {
    flex: 1,
    height: responsiveSize(44, 42, 48),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: responsiveSize(10, 8, 13),
  },
  alertButtonText: {
    fontSize: responsiveFontSize(17),
    lineHeight: responsiveLineHeight(17),
    fontFamily: Fonts.bold,
    color: '#007AFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  alertButtonCancel: {
    color: '#007AFF',
  },
  alertButtonDestructive: {
    color: '#FF3B30',
  },
});
