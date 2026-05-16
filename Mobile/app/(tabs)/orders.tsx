import React, { useState, useMemo, useRef, useCallback } from 'react';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import { Modal, Platform, StyleSheet, View, LayoutAnimation, UIManager } from 'react-native';
import { OrderSheet } from '@/components/OrderSheet';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';

// Import reusable components and utilities
import { CustomHeader, useCollapsibleSearchSection } from '@/components';
import { OrderListView } from '@/components/OrderListView';
import type { SwipeAction } from '@/components';
import { ORDER_FILTER_OPTIONS } from '@/utils/orderData';
import type { OrderData } from '@/utils/orderData';
import { messageAnimations } from '@/utils/messageAnimations';
import { getOrderAvatarColor, categorizeOrders, filterOrdersBySearch } from '@/utils/orderUtils';
import type { ItineraryData } from '@/components/ItineraryItem';
import { useAppAlert } from '@/context/AppAlertContext';
import { staysBookingsService } from '@/services/database';

import { useAuth } from '@/context/AuthContext';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_HORIZONTAL_PADDING = responsiveSize(16, 14, 20);
const TITLE_BOTTOM_PADDING = responsiveSize(8, 6, 10);
const SEARCH_TOP_PADDING = responsiveSize(8, 6, 10);
const SEARCH_TOP_MARGIN = responsiveSize(4, 3, 6);

export default function OrdersScreen() {
  const { user, isGuest } = useAuth();
  const { showAlert } = useAppAlert();
  const [activeOrderSheet, setActiveOrderSheet] = useState<{
    order: ItineraryData;
    instanceId: number;
  } | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const openSwipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  const sheetInstanceRef = useRef(0);

  const closeOtherSwipeables = useCallback((activeId: string) => {
    Object.entries(openSwipeableRefs.current).forEach(([id, ref]) => {
      if (id !== activeId && ref) {
        ref.close();
      }
    });
  }, []);

  const filterOptions = useMemo(() => ORDER_FILTER_OPTIONS.map(option => ({ ...option })), []);

  const formatRelativeTime = useCallback((isoDate?: string | null) => {
    if (!isoDate) {
      return '';
    }
    const created = new Date(isoDate);
    if (Number.isNaN(created.getTime())) {
      return '';
    }
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return '1 day ago';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    if (diffDays < 14) {
      return '1 week ago';
    }
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} weeks ago`;
  }, []);

  const mapBookingsToOrders = useCallback(
    (bookings: any[]): OrderData[] => {
      return bookings.map(booking => {
        const rawName =
          [booking?.stay_name, booking?.stays?.name, booking?.customer_name].find(
            value => typeof value === 'string' && value.trim().length > 0
          ) ?? 'Stay booking';
        const resolvedName =
          typeof rawName === 'string' && rawName.trim().length > 0
            ? rawName.trim()
            : 'Stay booking';
        const referenceSource =
          typeof booking.transaction_number === 'string' &&
          booking.transaction_number.trim().length > 0
            ? booking.transaction_number.trim()
            : booking.id;
        const fallbackReference =
          typeof booking.id === 'string' ? `OZ${booking.id.slice(-6).toUpperCase()}` : 'OZ000000';
        const orderNumber =
          typeof referenceSource === 'string' && referenceSource.length > 0
            ? referenceSource.toUpperCase()
            : fallbackReference;
        const createdAt: string =
          typeof booking.created_at === 'string' ? booking.created_at : new Date().toISOString();
        const bookingDateSource =
          typeof booking.check_in_date === 'string' && booking.check_in_date.length > 0
            ? booking.check_in_date
            : createdAt;
        const totalAmountRaw = Number(booking.total_amount ?? 0);
        const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : 0;
        const bookingStatus =
          typeof booking.status === 'string' ? booking.status.toLowerCase() : 'pending';

        const orderStatus: 'pending' | 'completed' | 'failed' = (() => {
          if (bookingStatus === 'completed' || bookingStatus === 'confirmed') {
            return 'completed';
          }
          if (bookingStatus === 'cancelled' || bookingStatus === 'failed') {
            return 'failed';
          }
          return 'pending';
        })();

        const statusMessage =
          orderStatus === 'completed'
            ? 'payment confirmed'
            : orderStatus === 'pending'
              ? 'awaiting payment confirmation'
              : 'payment failed';

        return {
          id: booking.id,
          name: resolvedName,
          message: `Order #${orderNumber}: ${statusMessage}`,
          time: formatRelativeTime(createdAt),
          isRead: false,
          unreadCount: 0,
          avatar: resolvedName.charAt(0).toUpperCase(),
          status: 'received',
          orderNumber,
          amount: `$${totalAmount.toFixed(2)}`,
          category: 'stay',
          confirmationCode: orderNumber,
          bookingDate: bookingDateSource,
          orderStatus,
          // Extended booking details for OrderSheet
          type: 'accommodation',
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          customerPhone: booking.customer_phone,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          guestsCount: booking.guests_count,
          adultsCount: booking.adults_count,
          childrenCount: booking.children_count,
          roomsCount: booking.rooms_count,
          roomType: booking.room_type,
          roomTypeRate: booking.room_type_rate,
          paymentMethod: booking.payment_method,
          price: totalAmount,
          currency: 'USD',
          notes: `Status: ${booking.status}`,
          // TODO(db): logo_url comes from service_providers table; DiceBear is placeholder
          providerLogo: booking.stays?.service_providers?.logo_url ||
            `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent(resolvedName)}&size=128&backgroundColor=FF4757`,
          checkInTime: booking.stays?.check_in_time,
          checkOutTime: booking.stays?.check_out_time,
        } satisfies OrderData;
      });
    },
    [formatRelativeTime]
  );

  const fetchOrders = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setIsRefreshing(true);
      }

      try {
        if (!user?.id || isGuest) {
          setOrders([]);
          return;
        }

        const { data, error } = await staysBookingsService.getUserBookings(user.id);
        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          setOrders([]);
          return;
        }

        setOrders(mapBookingsToOrders(data));
      } catch (error) {
        console.error('Failed to load orders', error);
        setOrders([]);
      } finally {
        if (showSpinner) {
          setIsRefreshing(false);
        }
      }
    },
    [user?.id, isGuest, mapBookingsToOrders]
  );

  const handleFilterChange = useCallback((filter: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilter(filter);
  }, []);

  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    refreshing: isRefreshing,
    filterOptions,
    activeFilter,
    onFilterChange: handleFilterChange,
    containerStyle: styles.searchFilterContainer,
    disableAutoReveal: true,
  });

  // Pre-classify orders into categories for instant filtering
  const categorizedOrders = useMemo(() => {
    return categorizeOrders(orders);
  }, [orders]);

  // Get orders for current filter and search
  const filteredOrders = useMemo(() => {
    const categoryOrders = categorizedOrders[activeFilter as keyof typeof categorizedOrders] || [];
    return filterOrdersBySearch(categoryOrders, searchQuery);
  }, [categorizedOrders, searchQuery, activeFilter]);

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    await fetchOrders(true);
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [fetchOrders]);

  // Close all open swipeable items
  const closeAllSwipeables = useCallback(() => {
    Object.values(openSwipeableRefs.current).forEach(ref => {
      if (ref) {
        ref.close();
      }
    });
  }, []);

  const clearAllOrders = () => {
    showAlert({
      title: 'Delete All Orders',
      message: 'Are you sure you want to delete all orders? This action cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            LayoutAnimation.configureNext(messageAnimations.batchOperation);
            setOrders([]);
          },
        },
      ],
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const handleDeleteOrder = useCallback(
    async (orderId: string) => {
      if (!orderId) {
        return;
      }

      closeAllSwipeables();
      LayoutAnimation.configureNext(messageAnimations.deletion);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setOrders(prev => prev.filter(order => order.id !== orderId));

      if (!user?.id || isGuest) {
        return;
      }

      try {
        const { data, error } = await staysBookingsService.markAsDeleted(orderId, user.id);
        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error('No matching order found to delete.');
        }

        await fetchOrders();
      } catch (error) {
        console.error('Failed to delete order', error);
        showAlert({
          title: 'Delete failed',
          message: 'We could not delete this order. Please try again.',
          buttons: [{ text: 'OK' }],
        });
        await fetchOrders();
      }
    },
    [closeAllSwipeables, user?.id, isGuest, fetchOrders]
  );

  const getRightSwipeActions = useCallback(
    (item: ItineraryData): SwipeAction[] => [
      {
        icon: 'trash-outline',
        onPress: () => handleDeleteOrder(item.id),
        confirmTitle: 'Delete Order',
        confirmMessage: 'Are you sure you want to delete this order? This action cannot be undone.',
        confirmButtonText: 'Delete',
        isDestructive: true,
      },
    ],
    [handleDeleteOrder]
  );

  // Convert OrderData to ItineraryData format for ListView compatibility
  const PAYMENT_METHOD_OPTIONS = [
    'Visa â€¢â€¢â€¢â€¢ 0921',
    'Mastercard â€¢â€¢â€¢â€¢ 4432',
    'Paynow Wallet',
    'Amex â€¢â€¢â€¢â€¢ 3012',
  ] as const;

  const convertOrdersToItineraryFormat = (orders: OrderData[]) => {
    return orders.map((order, index) => {
      // Map order status to ItineraryData status format
      let mappedStatus: 'sent' | 'delivered' | 'read' | 'received';
      switch (order.orderStatus) {
        case 'pending':
          mappedStatus = 'sent';
          break;
        case 'completed':
          mappedStatus = 'delivered';
          break;
        case 'failed':
          mappedStatus = 'received';
          break;
        default:
          mappedStatus = 'sent';
      }

      return {
        id: order.id,
        name: order.name,
        message: `Status: ${order.orderStatus}`, // Remove price from message since it has dedicated row
        time: '', // Don't show time for orders
        actualTime: undefined, // Don't show time for orders, we have date and price instead
        type: 'order' as const, // Keep as 'order' for list display, but pass real type for sheet
        date: order.bookingDate.split('T')[0], // Extract date part
        location: `Order #${order.orderNumber}`,
        isRead: order.isRead,
        unreadCount: order.unreadCount,
        avatar: order.name.charAt(0).toUpperCase(), // Use first letter of order name
        status: mappedStatus,
        // Add any missing ItineraryData properties with defaults
        duration: undefined, // Don't show duration for orders, we have price in dedicated row
        price: order.price || parseFloat(order.amount.replace('$', '')), // Remove $ before parsing
        currency: order.currency || 'USD',
        notes: order.notes || `Status: ${order.orderStatus}`,
        bookingReference: order.orderNumber,
        category: order.category,
        priority: 'medium' as const,
        paymentMethod:
          order.paymentMethod ||
          (order.orderStatus === 'completed'
            ? PAYMENT_METHOD_OPTIONS[index % PAYMENT_METHOD_OPTIONS.length]
            : undefined),
        confirmationCode: order.confirmationCode,
        // Extended booking details (pass the actual type here for OrderSheet to use)
        orderType: order.type, // Store actual type separately for OrderSheet
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        guestsCount: order.guestsCount,
        adultsCount: order.adultsCount,
        childrenCount: order.childrenCount,
        roomsCount: order.roomsCount,
        roomType: order.roomType,
        roomTypeRate: order.roomTypeRate,
        checkInDate: order.checkInDate,
        checkOutDate: order.checkOutDate,
        checkInTime: order.checkInTime,
        checkOutTime: order.checkOutTime,
        providerLogo: order.providerLogo ||
          `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent(order.name)}&size=128&backgroundColor=FF4757`,
      };
    });
  };

  const convertedOrders = useMemo(() => {
    return convertOrdersToItineraryFormat(filteredOrders);
  }, [filteredOrders]);

  // Handle order item press - convert back to OrderData
  const handleItemPress = (item: ItineraryData) => {
    const originalOrder = orders.find(order => order.id === item.id);
    if (originalOrder) {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === item.id ? { ...order, isRead: true, unreadCount: 0 } : order
        )
      );
      sheetInstanceRef.current += 1;
      const instanceId = sheetInstanceRef.current;
      setActiveOrderSheet({ order: { ...item }, instanceId });
      Haptics.selectionAsync();
    }
  };

  const handleSheetClose = useCallback((instanceId?: number) => {
    setActiveOrderSheet(prev => {
      if (!prev) {
        return prev;
      }

      if (instanceId == null || prev.instanceId === instanceId) {
        return null;
      }

      return prev;
    });
  }, []);

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <GestureHandlerRootView style={styles.container}>
          <CustomHeader
            showLogo={true}
            rightAction={{
              icon: 'trash-outline',
              onPress: clearAllOrders,
              color: '#FF3B30',
            }}
          />

          {/* Title under logo, left-aligned */}
          <View style={styles.titleSection}>
            <ThemedText type="title1" style={styles.pageTitle}>
              Bookings
            </ThemedText>
          </View>

          {searchSection}

          <OrderListView
            filteredItinerary={convertedOrders}
            searchQuery={searchQuery}
            activeFilter={activeFilter}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onItemPress={handleItemPress}
            getRightSwipeActions={getRightSwipeActions}
            openSwipeableRefs={openSwipeableRefs}
            getAvatarColor={getOrderAvatarColor}
            onScrollBeginDrag={closeAllSwipeables}
            colorScheme={colorScheme as 'light' | 'dark' | null}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onSwipeOpen={closeOtherSwipeables}
          />
          {/* Native iOS Sheet for Order Details */}
          <Modal
            visible={!!activeOrderSheet}
            animationType="fade"
            presentationStyle="overFullScreen"
            transparent
            statusBarTranslucent
            onRequestClose={() => handleSheetClose(activeOrderSheet?.instanceId)}
          >
            {activeOrderSheet && (
              <OrderSheet
                key={activeOrderSheet.instanceId}
                order={activeOrderSheet.order}
                onClose={() => handleSheetClose(activeOrderSheet.instanceId)}
                instanceId={activeOrderSheet.instanceId}
              />
            )}
          </Modal>
        </GestureHandlerRootView>
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 0,
    paddingBottom: TITLE_BOTTOM_PADDING,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    lineHeight: responsiveLineHeight(24),
    fontFamily: Fonts.bold,
    textAlign: 'left',
  },
  searchFilterContainer: {
    paddingHorizontal: 0,
    paddingTop: SEARCH_TOP_PADDING,
    marginTop: SEARCH_TOP_MARGIN,
    overflow: 'hidden',
  },
});