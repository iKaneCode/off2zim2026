import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { DateTimePill } from './DateTimePill';
import { LocationPill } from './LocationPill';
import { RatingPill } from './RatingPill';
import { ThemedText } from './ThemedText';
import { Fonts, responsiveFontSize, responsiveLineHeight } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  formatEventDateTimeLabel,
  getEventDisplayImage,
  type EventCardItem,
} from '@/utils/eventUtils';

const { width: screenWidth } = Dimensions.get('window');
const BASE_SCREEN_WIDTH = 390;
const layoutScale = screenWidth / BASE_SCREEN_WIDTH;
const responsiveSize = (size: number, min = size * 0.86, max = size * 1.18) =>
  Math.round(Math.min(max, Math.max(min, size * layoutScale)));

export const EVENT_CARD_SPACING = responsiveSize(8, 7, 12);
export const EVENT_CARD_WIDTH = screenWidth - responsiveSize(120, 96, 136);

const CARD_HEIGHT = responsiveSize(200, 176, 224);
const CARD_RADIUS = responsiveSize(12, 10, 16);
const CARD_INSET = responsiveSize(10, 8, 12);
const OVERLAY_PADDING = responsiveSize(8, 7, 10);
const HEART_SIZE = responsiveSize(36, 32, 42);

export interface EventCardProps {
  item: EventCardItem;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string, type?: string) => void;
  heartScale?: Animated.Value;
  style?: StyleProp<ViewStyle>;
}

export const EventCard = React.memo(function EventCard({
  item,
  isFavorited = false,
  onToggleFavorite,
  heartScale,
  style,
}: EventCardProps) {
  const colorScheme = useColorScheme();
  const fallbackHeartScale = useRef(new Animated.Value(1)).current;
  const resolvedHeartScale = heartScale ?? fallbackHeartScale;
  const pillBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
  const pillTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const pillIconBackground = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
  const cardBg = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';

  const handleEventPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({
      pathname: '/event-profile',
      params: {
        eventId: item.id,
        eventName: item.name,
        eventLocation: item.location,
        eventVenue: item.venue,
      },
    });
  }, [item]);

  const handleFavoritePress = useCallback(() => {
    onToggleFavorite?.(item.id, 'event');
  }, [item.id, onToggleFavorite]);

  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: cardBg }, style]}
      onPress={handleEventPress}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: getEventDisplayImage(item) }}
        style={styles.destinationImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={[styles.heartContainer, { backgroundColor: pillBg }]}
        onPress={handleFavoritePress}
        hitSlop={{
          top: OVERLAY_PADDING,
          left: OVERLAY_PADDING,
          bottom: OVERLAY_PADDING,
          right: OVERLAY_PADDING,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Favorite ${item.name} ${isFavorited ? 'selected' : 'not selected'}`}
      >
        <Animated.View style={{ transform: [{ scale: resolvedHeartScale }] }}>
          <FontAwesomeIcon
            icon={isFavorited ? solidHeart : regularHeart}
            size={18}
            color="#FF4757"
          />
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.eventInfoContainer}>
        <View style={styles.eventTopRow}>
          <RatingPill
            value={item.rating ?? 'New'}
            backgroundColor={pillBg}
            iconBackgroundColor={pillIconBackground}
            lightTextColor={pillTextColor}
            darkTextColor={pillTextColor}
          />
        </View>
        <View style={styles.eventOverlay}>
          <ThemedText
            style={styles.destinationName}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {item.name}
          </ThemedText>
          <View style={styles.eventMetaRow}>
            <LocationPill
              label={item.location}
              backgroundColor={pillBg}
              iconBackgroundColor={pillIconBackground}
              lightTextColor={pillTextColor}
              darkTextColor={pillTextColor}
              variant="compact"
            />
            <DateTimePill
              label={formatEventDateTimeLabel(item.date, item.time)}
              backgroundColor={pillBg}
              iconBackgroundColor={pillIconBackground}
              lightTextColor={pillTextColor}
              darkTextColor={pillTextColor}
              style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  eventCard: {
    width: EVENT_CARD_WIDTH,
    marginRight: EVENT_CARD_SPACING,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },
  destinationImage: {
    width: '100%',
    height: CARD_HEIGHT,
  },
  heartContainer: {
    position: 'absolute',
    top: CARD_INSET,
    right: CARD_INSET,
    width: HEART_SIZE,
    height: HEART_SIZE,
    borderRadius: HEART_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  eventInfoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: responsiveSize(4, 3, 6),
    paddingRight: CARD_INSET,
  },
  eventOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: OVERLAY_PADDING,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  destinationName: {
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(18),
    fontFamily: Fonts.bold,
    textAlign: 'left',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  eventMetaRow: {
    marginTop: responsiveSize(4, 3, 6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: EVENT_CARD_SPACING,
  },
});
