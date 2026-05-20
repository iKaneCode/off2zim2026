import React, { useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { DateTimePill, type IoniconName } from '@/components/DateTimePill';
import { StatusPill } from '@/components/StatusPill';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { SwipeActions, type SwipeAction } from './SwipeActions';
import { formatTime } from '@/utils/itineraryUtils';

export interface ItineraryData {
  id: string;
  name: string;
  message: string;
  type: string;
  date: string;
  endDate?: string;
  time: string;
  actualTime?: string;
  endTime?: string;
  location?: string;
  duration?: string;
  price?: number;
  currency?: string;
  confirmationCode?: string;
  notes?: string;
  bookingReference?: string;
  paymentMethod?: string;
  isRead: boolean;
  unreadCount?: number;
  avatar: string;
  providerLogo?: string;
  status: 'sent' | 'delivered' | 'read' | 'received';
  category?: string;
  // Extended booking details for OrderSheet
  orderType?: string; // Actual booking type (accommodation/bus/flight) for OrderSheet
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  guestsCount?: number;
  adultsCount?: number;
  childrenCount?: number;
  roomsCount?: number;
  roomType?: string;
  roomTypeRate?: number;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

type StatusConfig = {
  label: string;
  backgroundColor: string;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: IoniconName;
  textColor: string;
};

interface ItineraryItemProps {
  item: ItineraryData;
  onPress: () => void;
  onLongPress?: () => void;
  swipeActions?: SwipeAction[];
  leftSwipeActions?: SwipeAction[];
  swipeableRef?: (ref: Swipeable | null) => void;
  onSwipeStart?: () => void;
  onSwipeOpen?: () => void;
  getAvatarColor?: (type: string) => string;
  style?: StyleProp<ViewStyle>;
  leftActionsWidth?: number;
  rightActionsWidth?: number;
  leftActionsEndOffset?: number;
  rightActionsEndOffset?: number;
  tappable?: boolean;
}

const shadowStyle: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    default: {
      elevation: 0,
    },
  }) ?? {};

function ItineraryItem({
  item,
  onPress,
  onLongPress,
  swipeActions = [],
  leftSwipeActions = [],
  swipeableRef,
  onSwipeStart,
  onSwipeOpen,
  getAvatarColor,
  style,
  leftActionsWidth = 96,
  rightActionsWidth = 120,
  leftActionsEndOffset = 16,
  rightActionsEndOffset = 16,
  tappable = false,
}: ItineraryItemProps): React.ReactElement {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';

  const defaultAvatarColor = (type: string) => {
    const colors = {
      transport: '#007AFF',
      accommodation: '#FF6B6B',
      activity: '#34C759',
      dining: '#FF9500',
      default: '#8E8E93',
    } as const;

    return colors[type as keyof typeof colors] || colors.default;
  };

  const avatarColorFn = getAvatarColor || defaultAvatarColor;
  const iconColor = avatarColorFn(item.type);

  const iconBackground = useMemo(() => {
    if (iconColor.startsWith('#') && iconColor.length === 7) {
      return `${iconColor}1A`;
    }

    return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  }, [iconColor, isDark]);

  const datePillBackground = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
    [isDark]
  );
  const datePillIconBackground = useMemo(() => (isDark ? '#1C1C1E' : '#FFFFFF'), [isDark]);
  const datePillTextColor = useMemo(() => (isDark ? '#FFFFFF' : '#000000'), [isDark]);

  const infoPillBackground = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
    [isDark]
  );
  const infoPillIconBackground = useMemo(() => (isDark ? '#1C1C1E' : '#FFFFFF'), [isDark]);
  const infoPillTextColor = useMemo(() => (isDark ? '#FFFFFF' : '#1C1C1E'), [isDark]);

  const dateLabel = useMemo(() => {
    if (!item.date) {
      return 'Date TBD';
    }

    const parsed = new Date(item.date);
    const hasValidDate = !Number.isNaN(parsed.getTime());
    const datePart = hasValidDate
      ? parsed
          .toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
          .replace(/,/g, '')
      : item.date;

    // For check-in/check-out/all day, don't show time in the date pill
    const durationLower = item.duration?.toLowerCase() || '';
    if (
      durationLower.includes('check-in') ||
      durationLower.includes('check-out') ||
      durationLower.includes('all day')
    ) {
      return datePart;
    }

    const rawTime = (item.actualTime && item.actualTime.trim()) || (item.time && item.time.trim());
    if (rawTime) {
      const formattedTime = formatTime(rawTime) || rawTime;
      return `${datePart} · ${formattedTime}`;
    }

    return datePart;
  }, [item.actualTime, item.date, item.time, item.duration]);

  const statusConfig = useMemo<StatusConfig | null>(() => {
    if (!item.notes || !item.notes.trim()) {
      return null;
    }

    const notes = item.notes.trim().toLowerCase();

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
  }, [item.notes, isDark]);

  const baseTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      transport: 'plane',
      accommodation: 'bed',
      activity: 'sailboat',
      dining: 'utensils',
      default: 'calendar-days',
    };

    return icons[type] || icons.default;
  };

  const getSpecificTypeIcon = (currentItem: ItineraryData): string => {
    const name = currentItem.name.toLowerCase();

    if (name.includes('flight of angels') || name.includes('helicopter')) {
      return 'helicopter';
    }
    if (name.includes('flight')) {
      return 'plane';
    }
    if (name.includes('bus') || name.includes('coach') || name.includes('intercape')) {
      return 'bus';
    }
    if (name.includes('rafting') || name.includes('cruise') || name.includes('boat')) {
      return 'sailboat';
    }
    if (name.includes('safari') || name.includes('game drive') || name.includes('tour')) {
      return 'binoculars';
    }

    return baseTypeIcon(currentItem.type);
  };

  // Map icon requests to the right icon set so the glyph matches the itinerary type.
  const renderEventIcon = (iconName: string, size: number, color: string) => {
    if (
      ['sailboat', 'plane', 'bed', 'utensils', 'calendar-days', 'bus', 'helicopter'].includes(
        iconName
      )
    ) {
      return <FontAwesome6 name={iconName as never} size={size} color={color} />;
    }

    if (iconName === 'binoculars') {
      return <FontAwesome name="binoculars" size={size} color={color} />;
    }

    return <Ionicons name={iconName as IoniconName} size={size} color={color} />;
  };

  const handleSwipeStart = () => {
    if (Platform.OS === 'ios') {
    }

    onSwipeStart?.();
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<string | number>) => {
    if (swipeActions.length === 0) {
      return null;
    }

    return (
      <SwipeActions
        actions={swipeActions}
        progress={progress}
        containerWidth={rightActionsWidth}
        endOffset={rightActionsEndOffset}
        direction="right"
      />
    );
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<string | number>) => {
    if (leftSwipeActions.length === 0) {
      return null;
    }

    return (
      <SwipeActions
        actions={leftSwipeActions}
        progress={progress}
        containerWidth={leftActionsWidth}
        endOffset={leftActionsEndOffset}
        direction="left"
      />
    );
  };

  const pricePillLabel = useMemo(() => {
    if (item.type !== 'order' || typeof item.price !== 'number') {
      return null;
    }

    return `$${item.price.toFixed(2)}`;
  }, [item.price, item.type]);

  const referencePillLabel = useMemo(() => {
    if (item.type !== 'order') {
      return null;
    }

    const formatReference = (value?: string | null) => {
      if (!value) {
        return null;
      }

      const cleaned = value
        .trim()
        .replace(/^(ref|reference|order)\s*/i, '')
        .replace(/^#/, '')
        .trim();

      if (cleaned.length === 0) {
        return null;
      }

      return cleaned;
    };

    const formattedReference = formatReference(item.bookingReference);
    if (formattedReference) {
      return formattedReference;
    }

    const derivedReference = formatReference(item.location);
    if (derivedReference) {
      return derivedReference;
    }

    return null;
  }, [item.bookingReference, item.location, item.type]);

  const containerStyles = useMemo(() => {
    return [styles.cardContainer, shadowStyle, { backgroundColor: cardBackground }, style];
  }, [cardBackground, style]);

  const CardWrapper = tappable ? TouchableOpacity : View;

  const cardContent = (
    <CardWrapper
      style={[styles.itineraryItem, { backgroundColor: cardBackground }]}
      {...(tappable ? { onPress, onLongPress, activeOpacity: 0.7 } : {})}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
        {item.providerLogo ? (
          <Image
            source={{ uri: item.providerLogo }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        ) : (
          renderEventIcon(getSpecificTypeIcon(item), 24, iconColor)
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <ThemedText numberOfLines={1} type="title2" style={styles.title}>
            {item.name}
          </ThemedText>
        </View>

        {item.location && item.type !== 'order' && (
          <View style={styles.locationRow}>
            <View style={[styles.infoPill, { backgroundColor: infoPillBackground }]}>
              <View
                style={[styles.infoPillIconWrapper, { backgroundColor: infoPillIconBackground }]}
              >
                <Ionicons name="location" size={12} color="#FF3B30" />
              </View>
              <ThemedText
                style={[styles.infoPillText, { color: infoPillTextColor }]}
                numberOfLines={1}
              >
                {item.location}
              </ThemedText>
            </View>
            {item.duration &&
              (() => {
                const durationLower = item.duration.toLowerCase();
                if (
                  (durationLower.includes('check-in') || durationLower.includes('check-out')) &&
                  item.message
                ) {
                  const match = item.message.match(/Check-(in|out):\s*(.+?)(?:\s*-|$)/i);
                  const timeStr = match ? match[2].trim() : '';
                  if (timeStr) {
                    // Extract just the time (e.g., "12:00 PM" from any longer string)
                    const timeMatch = timeStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
                    const displayTime = timeMatch ? timeMatch[1] : timeStr;
                    return <ThemedText style={styles.timeOnlyText}>{displayTime}</ThemedText>;
                  }
                }
                return null;
              })()}
          </View>
        )}

        <View style={styles.subheaderRow}>
          <DateTimePill
            label={dateLabel}
            backgroundColor={datePillBackground}
            iconBackgroundColor={datePillIconBackground}
            lightTextColor={datePillTextColor}
            darkTextColor={datePillTextColor}
            style={styles.datePillInline}
          />

          {item.type === 'order' && pricePillLabel && (
            <View style={[styles.infoPill, { backgroundColor: infoPillBackground }]}>
              <View
                style={[styles.infoPillIconWrapper, { backgroundColor: infoPillIconBackground }]}
              >
                <Ionicons name="card-outline" size={12} color="#34C759" />
              </View>
              <ThemedText
                style={[styles.infoPillText, { color: infoPillTextColor }]}
                numberOfLines={1}
              >
                {pricePillLabel}
              </ThemedText>
            </View>
          )}

          {item.duration && item.type !== 'order' && (
            <StatusPill
              label={(() => {
                const durationLower = item.duration.toLowerCase();
                if (durationLower.includes('check-in')) return 'Check-in';
                if (durationLower.includes('check-out')) return 'Check-out';
                return item.duration;
              })()}
              iconName="time"
              backgroundColor={infoPillBackground}
              iconBackgroundColor={infoPillIconBackground}
              iconColor={(() => {
                const durationLower = item.duration.toLowerCase();
                if (durationLower.includes('check-out')) return '#FF3B30';
                if (durationLower.includes('check-in') || durationLower.includes('all day')) {
                  return '#34C759';
                }
                return '#8E8E93';
              })()}
              lightTextColor={infoPillTextColor}
              darkTextColor={infoPillTextColor}
            />
          )}
        </View>

        {item.type === 'order' && (
          <View style={styles.metaRow}>
            {item.type === 'order' && referencePillLabel && (
              <View style={styles.metaItem}>
                <View style={[styles.infoPill, { backgroundColor: infoPillBackground }]}>
                  <View
                    style={[
                      styles.infoPillIconWrapper,
                      { backgroundColor: infoPillIconBackground },
                    ]}
                  >
                    <Ionicons name="receipt" size={12} color={iconColor} />
                  </View>
                  <ThemedText
                    style={[styles.infoPillText, { color: infoPillTextColor }]}
                    numberOfLines={1}
                  >
                    {referencePillLabel}
                  </ThemedText>
                </View>
              </View>
            )}

            {item.type === 'order' && statusConfig && (
              <View style={styles.metaItem}>
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
          </View>
        )}
      </View>
    </CardWrapper>
  );

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Swipeable
        ref={swipeableRef}
        friction={1.2}
        rightThreshold={40}
        leftThreshold={40}
        overshootRight={false}
        overshootLeft={false}
        onSwipeableWillOpen={handleSwipeStart}
        onSwipeableOpen={onSwipeOpen}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        useNativeAnimations
      >
        <View style={containerStyles}>{cardContent}</View>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  itineraryItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  contentContainer: {
    flex: 1,
    marginRight: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  subheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  datePillInline: {
    flexShrink: 1,
    marginRight: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 0,
    minHeight: 16,
  },
  durationMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 0,
    marginLeft: 'auto',
    minHeight: 16,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontSize: responsiveFontSize(20),
    lineHeight: 26,
    fontFamily: Fonts.bold,
  },
  timeText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
    color: '#8E8E93',
    flexShrink: 0,
  },
  timeOnlyText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
    color: '#8E8E93',
    marginLeft: 'auto',
  },
  metaText: {
    fontSize: responsiveFontSize(12),
    color: '#8E8E93',
    flexShrink: 1,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 8,
    flexShrink: 1,
  },
  infoPillIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 0,
  },
  infoPillText: {
    fontSize: responsiveFontSize(13),
    lineHeight: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
});

export default ItineraryItem;
