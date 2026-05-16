import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart, faShareFromSquare } from '@fortawesome/free-regular-svg-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from './ThemedText';
import { CarouselIndicators } from './CarouselIndicators';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { Stay } from '@/types/Stay';
import { isFavorited, toggleFavorite, subscribeFavorites } from '@/utils/favoritesUtils';
import { getAmenityIcon as defaultGetAmenityIcon, type IoniconName } from '@/utils/amenityUtils';
import { LocationPill } from './LocationPill';
import { RatingPill } from './RatingPill';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export interface StayCardProps {
  stay: Stay;
  isDark: boolean;
  onPress: (stay: Stay) => void;
  onShare: (stay: Stay) => void;
  style?: StyleProp<ViewStyle>;
  onFavoriteToggle?: (stay: Stay, isFavorite: boolean) => void;
  onBook?: (stay: Stay) => void;
  getAmenityIcon?: (amenity: string) => IoniconName;
  showLocation?: boolean;
}

export function StayCard({
  stay,
  isDark,
  onPress,
  onShare,
  style,
  onFavoriteToggle,
  onBook,
  getAmenityIcon = defaultGetAmenityIcon,
  showLocation = false,
}: StayCardProps) {
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const accentBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  const [isBookingPressed, setIsBookingPressed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => isFavorited(stay.id));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const bookBtnScale = useRef(new Animated.Value(1)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const shinePosition = useRef(new Animated.Value(-100)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.spring(bookBtnScale, {
      toValue: isBookingPressed ? 0.98 : 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();

    if (isBookingPressed) {
      btnOpacity.setValue(1);
      Animated.timing(btnOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();

      shinePosition.setValue(-100);
      Animated.timing(shinePosition, {
        toValue: 250,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isBookingPressed, bookBtnScale, btnOpacity, shinePosition]);

  // Subscribe to global favorites changes so the card updates if favorite toggled elsewhere
  useEffect(() => {
    const unsub = subscribeFavorites(() => setIsFavorite(isFavorited(stay.id)));
    return unsub;
  }, [stay.id]);

  const handleCarouselScroll = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;
      if (layoutWidth > 0) {
        const newIndex = Math.round(offsetX / layoutWidth);
        if (newIndex !== currentImageIndex) {
          setCurrentImageIndex(newIndex);
        }
      }
    },
    [currentImageIndex]
  );

  const handleToggleFavorite = useCallback(() => {
    const newFavoriteState = toggleFavorite(stay.id, 'stay');
    setIsFavorite(newFavoriteState);
    onFavoriteToggle?.(stay, newFavoriteState);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartScale, stay, onFavoriteToggle]);

  const amenityIcons = useMemo(() => stay.amenities, [stay.amenities]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.imageContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
          >
            {stay.images.slice(0, 5).map((imageUrl, index) => (
              <View key={`${stay.id}-image-${index}`} style={{ width: CARD_WIDTH, height: 220 }}>
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: CARD_WIDTH, height: 220 }}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.paginationContainer} pointerEvents="none">
          <CarouselIndicators
            count={Math.min(stay.images.length, 5)}
            activeIndex={currentImageIndex}
            variant="overlay"
            keyPrefix={stay.id}
          />
        </View>

        <View style={styles.topActionsRow}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)' },
              ]}
              onPress={handleToggleFavorite}
              hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <FontAwesomeIcon
                  icon={isFavorite ? solidHeart : regularHeart}
                  size={18}
                  color="#FF4757"
                />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)' },
              ]}
              onPress={() => onShare(stay)}
              hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
            >
              <FontAwesomeIcon icon={faShareFromSquare} size={18} color="#FF4757" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(stay)}
        style={[styles.content, { backgroundColor: cardBg }]}
      >
        <View style={styles.nameRatingRow}>
          <ThemedText style={styles.stayName} numberOfLines={1} ellipsizeMode="tail">
            {stay.name}
          </ThemedText>
          <RatingPill
            value={stay.rating}
            backgroundColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
            iconBackgroundColor={isDark ? '#1C1C1E' : '#FFFFFF'}
          />
        </View>

        {showLocation && (
          <View style={styles.locationRow}>
            <LocationPill
              label={stay.location}
              backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
            />
            <View style={styles.locationPriceContainer}>
              <ThemedText style={styles.fromText}>from</ThemedText>
              <View style={styles.priceRow2}>
                <Ionicons name="card-outline" size={18} color="#34C759" style={styles.priceIcon} />
                <ThemedText style={styles.priceText}>
                  <ThemedText style={styles.priceCurrency}>$</ThemedText>
                  {stay.price}
                  <ThemedText style={styles.priceUnit}>{stay.perNight ? '/night' : ''}</ThemedText>
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {showLocation && (
          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? 'rgba(90, 90, 90, 0.3)' : '#f0f0f0' },
            ]}
          />
        )}

        <View style={styles.amenitiesIconRow}>
          {amenityIcons.map(amenity => (
            <View
              key={`${stay.id}-${amenity}`}
              style={[styles.amenityIconContainer, { backgroundColor: accentBg }]}
            >
              <Ionicons
                name={getAmenityIcon(amenity)}
                size={14}
                color={isDark ? '#FFFFFF' : '#333333'}
                style={styles.amenityIcon}
              />
              <ThemedText style={styles.amenityText} darkColor="#ECEDEE" lightColor="#1C1C1E">
                {amenity}
              </ThemedText>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
  },
  card: {
    width: CARD_WIDTH,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 0,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    overflow: 'hidden',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  topActionsRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginLeft: 8,
  },
  content: {
    padding: 16,
    paddingTop: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  nameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  stayName: {
    fontSize: responsiveFontSize(19),
    fontFamily: Fonts.bold,
    flex: 1,
    marginBottom: 0,
  },
  locationRow: {
    marginBottom: 0,
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPriceContainer: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    width: '100%',
    marginTop: 12,
    marginBottom: 12,
  },
  amenitiesIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 0,
    gap: 6,
    height: 74,
    overflow: 'hidden',
    marginTop: 2,
  },
  amenityIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    height: 28,
    marginBottom: 8,
  },
  amenityIcon: {
    marginRight: 4,
  },
  amenityText: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.medium,
  },
  priceRow2: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceIcon: {
    marginRight: 8,
  },
  fromText: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.regular,
    opacity: 0.6,
    marginBottom: -2,
  },
  priceText: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  priceCurrency: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
    marginRight: 2,
  },
  priceUnit: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.regular,
    opacity: 0.7,
    marginLeft: 2,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 0,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(15),
    letterSpacing: 0.5,
  },
});
