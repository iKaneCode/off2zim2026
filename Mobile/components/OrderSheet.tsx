import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { getCardSurfaceColors } from '@/constants/CardStyles';
import type { ItineraryData } from '@/components/ItineraryItem';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DateTimePill, type IoniconName } from '@/components/DateTimePill';

interface OrderSheetProps {
  order: ItineraryData;
  onClose: () => void;
  instanceId: number;
  title?: string;
  showStatus?: boolean;
  showActions?: boolean;
  summaryContentMode?: 'details' | 'message';
}

type StatusConfig = {
  label: string;
  backgroundColor: string;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: IoniconName;
  textColor: string;
};

interface SummaryItem {
  label: string;
  value: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  accommodation: 'Accommodation',
  activity: 'Activity',
  dining: 'Dining',
  default: 'Other',
};

const OVERLAY_DURATION = 180;
const CARD_SPRING_DAMPING = 18;
const CARD_SPRING_STIFFNESS = 220;
const CARD_SPRING_MASS = 0.6;

const getSummaryIconName = (label: string): keyof typeof Ionicons.glyphMap => {
  switch (label) {
    case 'Transaction':
      return 'receipt';
    case 'Customer name':
      return 'person';
    case 'Contact email':
      return 'mail';
    case 'Phone number':
    case 'Contact number':
      return 'call';
    case 'Check-in':
    case 'Check-out':
      return 'calendar';
    case 'Guests & rooms':
      return 'bed';
    case 'Room type':
      return 'home';
    case 'Payment method':
      return 'card';
    case 'Order number':
      return 'ticket-outline';
    case 'Booked on':
      return 'calendar-outline';
    case 'Reference':
      return 'receipt-outline';
    case 'Category':
      return 'apps-outline';
    case 'Total paid':
      return 'card-outline';
    case 'Route':
      return 'navigate-outline';
    case 'Passengers':
      return 'people-outline';
    default:
      return 'information-circle-outline';
  }
};

const getSummaryIconColor = (label: string): string => {
  switch (label) {
    case 'Total paid':
      return '#34C759';
    case 'Payment method':
      return '#007AFF';
    case 'Category':
      return '#FF9500';
    default:
      return '#8E8E93';
  }
};

export function OrderSheet({ order, onClose, instanceId, title, showStatus = true, showActions = true, summaryContentMode = 'details' }: OrderSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const cardColors = getCardSurfaceColors(colorScheme as 'light' | 'dark' | undefined);
  const isDark = colorScheme === 'dark';

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const statusConfig = useMemo<StatusConfig | null>(() => {
    if (!order.notes || !order.notes.trim()) {
      return null;
    }

    const notes = order.notes.trim().toLowerCase();

    if (notes.includes('confirmed')) {
      return {
        label: 'Confirmed',
        backgroundColor: isDark ? 'rgba(52,199,89,0.22)' : 'rgba(52,199,89,0.16)',
        iconBackgroundColor: isDark ? 'rgba(52,199,89,0.28)' : 'rgba(52,199,89,0.2)',
        iconColor: '#34C759',
        iconName: 'checkmark',
        textColor: '#34C759',
      };
    }

    if (notes.includes('completed')) {
      return {
        label: 'Completed',
        backgroundColor: isDark ? 'rgba(52,199,89,0.22)' : 'rgba(52,199,89,0.16)',
        iconBackgroundColor: isDark ? 'rgba(52,199,89,0.28)' : 'rgba(52,199,89,0.2)',
        iconColor: '#34C759',
        iconName: 'checkmark',
        textColor: '#34C759',
      };
    }

    if (notes.includes('pending') || notes.includes('processing')) {
      return {
        label: 'Pending',
        backgroundColor: isDark ? 'rgba(255,149,0,0.24)' : 'rgba(255,149,0,0.18)',
        iconBackgroundColor: isDark ? 'rgba(255,149,0,0.3)' : 'rgba(255,149,0,0.22)',
        iconColor: '#FF9500',
        iconName: 'hourglass-outline',
        textColor: '#FF9500',
      };
    }

    if (
      notes.includes('failed') ||
      notes.includes('cancelled') ||
      notes.includes('canceled') ||
      notes.includes('refunded') ||
      notes.includes('rejected')
    ) {
      return {
        label: 'Failed',
        backgroundColor: isDark ? 'rgba(255,59,48,0.24)' : 'rgba(255,59,48,0.18)',
        iconBackgroundColor: isDark ? 'rgba(255,59,48,0.3)' : 'rgba(255,59,48,0.22)',
        iconColor: '#FF3B30',
        iconName: 'close',
        textColor: '#FF3B30',
      };
    }

    return {
      label: 'Status',
      backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
      iconBackgroundColor: isDark ? 'rgba(255,255,255,0.22)' : '#FFFFFF',
      iconColor: '#8E8E93',
      iconName: 'help-circle-outline',
      textColor: '#8E8E93',
    };
  }, [order.notes, isDark]);

  useEffect(() => {
    overlayOpacity.stopAnimation();
    cardScale.stopAnimation();
    cardOpacity.stopAnimation();

    isClosingRef.current = false;
    overlayOpacity.setValue(0);
    cardScale.setValue(0.94);
    cardOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: OVERLAY_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        damping: CARD_SPRING_DAMPING,
        stiffness: CARD_SPRING_STIFFNESS,
        mass: CARD_SPRING_MASS,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardScale, overlayOpacity, order.id, instanceId]);

  const handleDismiss = useCallback(() => {
    if (isClosingRef.current) {
      return;
    }
    isClosingRef.current = true;
    onClose();
  }, [onClose]);

  const orderNumber = useMemo(() => {
    const locationNumber = order.location?.replace(/order\s*#/i, '').trim();
    if (locationNumber) {
      return locationNumber;
    }
    if (order.bookingReference && order.bookingReference.trim().length > 0) {
      return order.bookingReference.trim();
    }
    return 'Pending assignment';
  }, [order.location, order.bookingReference]);

  const formattedDate = useMemo(() => {
    if (!order.date) {
      return 'TBD';
    }
    const parsed = new Date(order.date);
    if (Number.isNaN(parsed.getTime())) {
      return order.date;
    }
    return parsed.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [order.date]);

  const totalPaidDisplay = useMemo(() => {
    if (typeof order.price === 'number' && !Number.isNaN(order.price)) {
      const currency = order.currency ?? 'USD';
      return `${currency} ${order.price.toFixed(2)}`;
    }
    return 'Pending';
  }, [order.currency, order.price]);

  const categoryLabel = useMemo(() => {
    if (!order.category) {
      return CATEGORY_LABELS.default;
    }
    return CATEGORY_LABELS[order.category] ?? CATEGORY_LABELS.default;
  }, [order.category]);

  const bookingReference = useMemo(() => {
    if (order.bookingReference && order.bookingReference.trim().length > 0) {
      return order.bookingReference.trim();
    }
    return orderNumber;
  }, [order.bookingReference, orderNumber]);

  const paymentMethodLabel = useMemo(() => {
    const trimmed = order.paymentMethod?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }

    if (statusConfig?.label === 'Completed') {
      return 'Visa •••• 0921';
    }

    return undefined;
  }, [order.paymentMethod, statusConfig?.label]);

  const summaryDetails = useMemo<SummaryItem[]>(() => {
    // Format date helper
    const formatDate = (value?: string) => {
      if (!value) return 'TBD';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    const baseDetails: SummaryItem[] = [
      { label: 'Transaction', value: order.confirmationCode || orderNumber },
      { label: 'Customer name', value: order.customerName || 'N/A' },
      { label: 'Contact email', value: order.customerEmail || 'N/A' },
    ];

    // Add accommodation-specific details (matching payment.tsx stay details exactly)
    // Check if this is an accommodation/stay booking by orderType or if it has checkInDate
    if (order.orderType === 'accommodation' || order.type === 'accommodation' || order.checkInDate || order.category === 'stay') {
      return [
        ...baseDetails,
        { label: 'Check-in', value: formatDate(order.checkInDate) },
        { label: 'Check-out', value: formatDate(order.checkOutDate) },
        {
          label: 'Guests & rooms',
          value: `${(order.adultsCount || 0) + (order.childrenCount || 0)} guest${
            (order.adultsCount || 0) + (order.childrenCount || 0) === 1 ? '' : 's'
          } · ${order.roomsCount || 0} room${order.roomsCount === 1 ? '' : 's'}`,
        },
        {
          label: 'Room type',
          value: order.roomType
            ? order.roomTypeRate
              ? `${order.roomType} · $${order.roomTypeRate}/night`
              : order.roomType
            : 'Not specified',
        },
        { label: 'Contact number', value: order.customerPhone || 'Not provided' },
      ];
    }

    // For other types, just return base details for now
    // TODO: Add bus, flight, event, activity types when implemented
    return baseDetails;
  }, [
    order.confirmationCode,
    order.customerName,
    order.customerEmail,
    order.type,
    order.checkInDate,
    order.checkOutDate,
    order.adultsCount,
    order.childrenCount,
    order.roomsCount,
    order.roomType,
    order.roomTypeRate,
    order.customerPhone,
    orderNumber,
  ]);

  const hasMeaningfulNotes = useMemo(() => {
    if (!order.notes) {
      return false;
    }

    const trimmed = order.notes.trim();
    if (trimmed.length === 0) {
      return false;
    }

    if (trimmed.toLowerCase().startsWith('status:')) {
      return false;
    }

    if (order.message && trimmed.toLowerCase() === order.message.trim().toLowerCase()) {
      return false;
    }

    return true;
  }, [order.message, order.notes]);

  const compactSpacing = useMemo(() => {
    return summaryContentMode === 'message' && !showActions && !hasMeaningfulNotes;
  }, [summaryContentMode, showActions, hasMeaningfulNotes]);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}> 
      <Pressable style={styles.backdrop} onPress={handleDismiss} />
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardColors.background,
              borderColor: cardColors.border,
              paddingBottom: Math.max(insets.bottom, compactSpacing ? 12 : 24),
            },
          ]}
        >
          <View style={styles.header}>
            {title !== '' ? (
              <ThemedText style={styles.title}>{title ?? 'Booking Details'}</ThemedText>
            ) : (
              <View style={{ width: 1 }} />
            )}
            <TouchableOpacity
              onPress={handleDismiss}
              activeOpacity={0.75}
              accessibilityLabel="Close order"
            >
              <View style={styles.closeButtonCircle}>
                <Ionicons
                  name="close-sharp"
                  size={28}
                  color="#FF3B30"
                  style={{ textAlign: 'center', fontWeight: '900' }}
                />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              compactSpacing ? { gap: 12, paddingBottom: 0 } : null,
            ]}
          >
            <View style={[
              styles.summaryCard,
              summaryContentMode === 'message' && { gap: 10 }
            ]}>
              <View style={[
                styles.summaryStayRow,
                summaryContentMode === 'message' && { marginBottom: 8 }
              ]}>
                <View style={[styles.providerLogo, { backgroundColor: order.providerLogo ? 'transparent' : order.avatar }]}>
                  {order.providerLogo ? (
                    <Image
                      source={{ uri: order.providerLogo }}
                      style={styles.providerLogoImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <ThemedText style={styles.providerLogoText}>
                      {order.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  )}
                </View>
                <ThemedText style={styles.summaryStayName}>{order.name}</ThemedText>
              </View>

              {showStatus && statusConfig && (
                <View style={{ marginBottom: 8 }}>
                  <DateTimePill
                    label={statusConfig.label}
                    backgroundColor={statusConfig.backgroundColor}
                    iconBackgroundColor={statusConfig.iconBackgroundColor}
                    iconColor={statusConfig.iconColor}
                    iconName={statusConfig.iconName}
                    lightTextColor={statusConfig.textColor}
                    darkTextColor={statusConfig.textColor}
                  />
                </View>
              )}

              {summaryContentMode === 'details' ? (
                <View style={styles.detailsGrid}>
                  {summaryDetails.map(detail => (
                    <View key={detail.label} style={styles.summaryRow}>
                      <ThemedText
                        style={[
                          styles.summaryLabel,
                          { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                        ]}
                      >
                        {detail.label}
                      </ThemedText>
                      <View
                        style={[
                          styles.summaryPill,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 0,
                            marginRight: 6,
                          }}
                        >
                          {detail.label === 'Bus operator' || detail.label === 'Flight operator' ? (
                            <FontAwesome6 name="bus" size={10} color="#8E8E93" />
                          ) : (
                            <Ionicons
                              name={getSummaryIconName(detail.label)}
                              size={10}
                              color={getSummaryIconColor(detail.label)}
                            />
                          )}
                        </View>
                        <ThemedText
                          style={[
                            styles.summaryPillText,
                            { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                          ]}
                        >
                          {detail.value}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    styles.messageContainer,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.messageCopy,
                      { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                    ]}
                  >
                    {order.message}
                  </ThemedText>
                </View>
              )}
            </View>

            {hasMeaningfulNotes ? (
              <View style={styles.sectionCard}>
                <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
                <ThemedText style={styles.noteCopy}>{order.notes}</ThemedText>
              </View>
            ) : null}

            {showActions ? (
            <View style={styles.actionSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { 
                    backgroundColor: statusConfig?.label === 'Pending' 
                      ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')
                      : (isDark ? '#FFFFFF' : '#000000')
                  },
                  pressed && statusConfig?.label !== 'Pending' && { opacity: 0.85 },
                ]}
                onPress={() => {}}
                disabled={statusConfig?.label === 'Pending'}
              >
                <Ionicons 
                  name="receipt-outline" 
                  size={20} 
                  color={statusConfig?.label === 'Pending' 
                    ? (isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')
                    : (isDark ? '#000000' : '#FFFFFF')
                  } 
                />
                <ThemedText style={[
                  styles.primaryButtonText, 
                  { 
                    color: statusConfig?.label === 'Pending' 
                      ? (isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)')
                      : (isDark ? '#000000' : '#FFFFFF')
                  }
                ]}>
                  VIEW INVOICE
                </ThemedText>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: '#FF3B30',
                  },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {}}
              >
                <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
                <ThemedText style={[styles.secondaryButtonText, { color: '#FFFFFF' }]}>
                  REPORT AN ISSUE
                </ThemedText>
              </Pressable>
            </View>
            ) : null}
          </ScrollView>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 520,
  },
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: responsiveFontSize(22),
    fontFamily: Fonts.bold,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 8,
  },
  summaryCard: {
    gap: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  summaryStayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  providerLogoText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  summaryStayName: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
    flex: 1,
    flexWrap: 'wrap',
  },
  summarySubtitle: {
    fontSize: responsiveFontSize(14),
    color: '#8E8E93',
  },
  detailsGrid: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontSize: responsiveFontSize(16),
    lineHeight: 20,
    fontFamily: Fonts.medium,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 8,
  },
  summaryPillIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  summaryPillText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: 'rgba(142,142,147,0.08)',
  },
  sectionTitle: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
    marginBottom: 8,
  },
  noteCopy: {
    fontSize: responsiveFontSize(15),
    lineHeight: 22,
    color: '#8E8E93',
  },
  messageCopy: {
    fontSize: responsiveFontSize(17),
    lineHeight: 22,
    fontFamily: Fonts.bold,
  },
  messageContainer: {
    borderRadius: 16,
    padding: 16,
  },
  actionSection: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
});