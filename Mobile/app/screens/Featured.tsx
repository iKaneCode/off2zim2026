import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Fonts, responsiveFontSize, responsiveLineHeight } from '@/constants/Fonts';
import {
  staysData,
  thingsToDoData,
  busOperatorsData,
  flightOperatorsData,
} from '@/constants/FeaturedData';
import { cloneStay, getStayById } from '@/constants/StayData';
import { getActivityStatus, activityStatusColor } from '@/utils/timeStatus';
import { staysService, eventsService } from '@/services/database';
import { registerFeaturedScrollAndRefresh } from '../../components/HomeTabButton';
import type { Stay } from '@/types/Stay';
import type { Event } from '@/types/Event';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useFeaturedData } from '@/context/FeaturedDataContext';
import {
  CarouselIndicators,
  IconActionButton,
  ViewAllButton,
  WallpaperPattern,
  DestinationCardShimmer,
  CarouselShimmer,
  ShimmerPlaceholder,
  LocationPill,
  RatingPill,
  StatusPill,
  EventCard,
} from '@/components';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { SvgUri } from 'react-native-svg';
import { Asset } from 'expo-asset';
import {
  subscribeFavorites,
  getFavoritedIds,
  toggleFavorite as toggleFavoriteUtil,
  isFavorited as isFavoritedUtil,
} from '@/utils/favoritesUtils';
import { carouselService, destinationsService } from '@/services/database';
import { weatherService, locationMappings } from '@/services/weather';
import { getAmenityIcon } from '@/utils/amenityUtils';
import { pickBestImageUrl, normalizeStorageImageUrl } from '@/utils/imageUtils';
import { mapEventRecordToEvent } from '@/utils/eventUtils';
import { useDestinations } from '@/context/DestinationsContext';
import { navigateToStayProfile } from '@/utils/navigationUtils';
import { router } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');
const BASE_SCREEN_WIDTH = 390;
const layoutScale = screenWidth / BASE_SCREEN_WIDTH;
const responsiveSize = (size: number, min = size * 0.86, max = size * 1.18) =>
  Math.round(Math.min(max, Math.max(min, size * layoutScale)));

const SECTION_HORIZONTAL_MARGIN = responsiveSize(16);
const GALLERY_CONTAINER_PADDING = SECTION_HORIZONTAL_MARGIN;
const DESTINATION_CARD_SPACING = responsiveSize(16);
const CARD_WIDTH = (screenWidth - GALLERY_CONTAINER_PADDING * 2 - DESTINATION_CARD_SPACING) / 2;
const STAY_CARD_SPACING = responsiveSize(8, 7, 12);
const STAY_CARD_WIDTH = screenWidth - responsiveSize(120, 96, 136);
const THINGS_CARD_WIDTH = STAY_CARD_WIDTH;
const THINGS_CARD_SPACING = STAY_CARD_SPACING;
const EVENT_CARD_WIDTH = STAY_CARD_WIDTH;
const EVENT_CARD_SPACING = STAY_CARD_SPACING;
const CARD_HEIGHT = responsiveSize(200, 176, 224);
const CAROUSEL_HEIGHT = responsiveSize(240, 216, 276);
const CAROUSEL_ITEM_HEIGHT = responsiveSize(200, 180, 236);
const CARD_RADIUS = responsiveSize(12, 10, 16);
const SECTION_RADIUS = responsiveSize(16, 14, 20);
const SECTION_GAP = responsiveSize(24, 18, 30);
const CARD_INSET = responsiveSize(10, 8, 12);
const OVERLAY_PADDING = responsiveSize(8, 7, 10);
const HEART_SIZE = responsiveSize(36, 32, 42);
const HEART_ICON_SIZE = responsiveSize(18, 16, 20);
const FEATURED_BOTTOM_NAV_GAP = responsiveSize(16, 12, 22);
const ACCOMMODATION_ICON_ASSET = require('@/assets/icons/accommodation.svg');
const EVENTS_ICON_ASSET = require('@/assets/icons/events.svg');
const THINGS_ICON_ASSET = require('@/assets/icons/things.svg');

// Types for carousel data
interface CarouselItem {
  id: string;
  image: { uri: string };
  title: string;
  location: string;
}

// Default fallback carousel data
const defaultCarouselData: CarouselItem[] = [
  {
    id: '1',
    image: { uri: 'https://picsum.photos/400/300?random=1' },
    title: 'Victoria Falls',
    location: 'Victoria Falls',
  },
  {
    id: '2',
    image: { uri: 'https://picsum.photos/400/300?random=2' },
    title: 'Safari Adventures',
    location: 'Hwange National Park',
  },
  {
    id: '3',
    image: { uri: 'https://picsum.photos/400/300?random=3' },
    title: 'Mountain Escapes',
    location: 'Eastern Highlands',
  },
  {
    id: '4',
    image: { uri: 'https://picsum.photos/400/300?random=4' },
    title: 'Cultural Heritage',
    location: 'Great Zimbabwe',
  },
];

type FeaturedSkeletonVariant = 'stay' | 'event' | 'simple';

const FEATURED_SKELETON_ITEMS = [
  { id: 'featured-skeleton-1' },
  { id: 'featured-skeleton-2' },
  { id: 'featured-skeleton-3' },
];

const FeaturedSectionCardShimmer = React.memo(
  ({ variant = 'event' }: { variant?: FeaturedSkeletonVariant }) => {
    const cardWidth = variant === 'stay' ? STAY_CARD_WIDTH : EVENT_CARD_WIDTH;
    const cardSpacing = variant === 'stay' ? STAY_CARD_SPACING : EVENT_CARD_SPACING;

    return (
      <View
        style={[
          styles.featuredSkeletonCard,
          {
            width: cardWidth,
            marginRight: cardSpacing,
          },
        ]}
      >
        <ShimmerPlaceholder width="100%" height="100%" borderRadius={CARD_RADIUS} />

        <View style={styles.featuredSkeletonHeart}>
          <ShimmerPlaceholder
            width={HEART_ICON_SIZE}
            height={HEART_ICON_SIZE}
            borderRadius={HEART_ICON_SIZE / 2}
          />
        </View>

        {variant !== 'simple' && (
          <View style={styles.featuredSkeletonRating}>
            <ShimmerPlaceholder
              width={responsiveSize(52, 46, 60)}
              height={responsiveSize(24, 22, 28)}
              borderRadius={999}
            />
          </View>
        )}

        <View style={styles.featuredSkeletonOverlay}>
          <ShimmerPlaceholder
            width={cardWidth * 0.58}
            height={responsiveSize(18, 16, 22)}
            borderRadius={responsiveSize(9, 8, 11)}
          />
          <View style={styles.featuredSkeletonMetaRow}>
            <ShimmerPlaceholder
              width={cardWidth * 0.34}
              height={responsiveSize(22, 20, 26)}
              borderRadius={999}
            />
            {variant !== 'simple' && (
              <ShimmerPlaceholder
                width={cardWidth * 0.3}
                height={responsiveSize(22, 20, 26)}
                borderRadius={999}
              />
            )}
          </View>
        </View>
      </View>
    );
  }
);

FeaturedSectionCardShimmer.displayName = 'FeaturedSectionCardShimmer';

function SvgAssetIcon({
  asset,
  color,
  size = 18,
}: {
  asset: ReturnType<typeof Asset.fromModule>;
  color: string;
  size?: number;
}) {
  const [uri, setUri] = useState<string | null>(
    asset.localUri ?? (asset.downloaded ? asset.uri : null)
  );

  useEffect(() => {
    let isMounted = true;

    const prepareAsset = async () => {
      if (!asset.localUri && !asset.downloaded) {
        await asset.downloadAsync();
      }

      if (isMounted) {
        setUri(asset.localUri ?? asset.uri);
      }
    };

    prepareAsset();

    return () => {
      isMounted = false;
    };
  }, [asset]);

  if (!uri) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgUri uri={uri} width={size} height={size} color={color} fill={color} />;
}

function AccommodationIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(ACCOMMODATION_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function EventsIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(EVENTS_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function ThingsIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(THINGS_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function FeaturedSectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <ThemedText type="caption" style={[styles.featuredSectionTitleText, { color }]}>
      {children}
    </ThemedText>
  );
}

// Database destination type
type DatabaseDestination = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  weather?: string | null;
};

// Memoized DestinationCard component
interface DestinationCardProps {
  item: DatabaseDestination;
  isFavorited: boolean;
  onToggleFavorite: (id: string, type?: string) => void;
  heartScale: Animated.Value;
  onPress?: () => void;
  onImageLoad?: (id: string) => void;
  onImageError?: (id: string) => void;
  isLastItem?: boolean;
}

const DestinationCard = React.memo(
  ({
    item,
    isFavorited,
    onToggleFavorite,
    heartScale,
    onPress,
    onImageLoad,
    onImageError,
    isLastItem,
  }: DestinationCardProps) => {
    const colorScheme = useColorScheme();
    const cardBg = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const pillBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';

    const handleFavoritePress = useCallback(() => {
      onToggleFavorite(item.id, 'destination');
    }, [onToggleFavorite, item.id]);

    const handleImageLoadComplete = useCallback(() => {
      onImageLoad?.(item.id);
    }, [onImageLoad, item.id]);

    const handleImageErrorComplete = useCallback(() => {
      onImageError?.(item.id);
    }, [onImageError, item.id]);

    const resolvedImage = pickBestImageUrl(
      item.image_url,
      Array.isArray(item.images) ? item.images : undefined
    );

    const imageUri = resolvedImage || `https://picsum.photos/300/200?random=${item.id.slice(-4)}`;

    return (
      <TouchableOpacity
        style={[
          styles.destinationCard,
          { backgroundColor: cardBg },
          isLastItem && { marginRight: responsiveSize(2, 1, 3) },
        ]}
        onPress={onPress}
      >
        <Image
          source={{
            uri: imageUri,
            cache: 'force-cache', // Force caching for faster subsequent loads
            headers: {
              'Cache-Control': 'max-age=86400', // Cache for 24 hours
            },
          }}
          style={styles.destinationImage}
          resizeMode="cover"
          fadeDuration={200} // Faster fade-in
          onLoad={handleImageLoadComplete}
          onError={handleImageErrorComplete}
        />
        <IconActionButton
          variant="like"
          isActive={isFavorited}
          size={HEART_SIZE}
          style={styles.heartContainer}
          onPress={handleFavoritePress}
          hitSlop={{
            top: OVERLAY_PADDING,
            left: OVERLAY_PADDING,
            bottom: OVERLAY_PADDING,
            right: OVERLAY_PADDING,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Favorite ${item.name} ${isFavorited ? 'selected' : 'not selected'}`}
          iconContainerStyle={{ transform: [{ scale: heartScale }] }}
        />
        <View style={styles.destinationInfo}>
          <ThemedText
            style={styles.destinationName}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {item.name}
          </ThemedText>
          {item.weather && (
            <ThemedText style={styles.destinationWeather} numberOfLines={1}>
              {item.weather}
            </ThemedText>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

DestinationCard.displayName = 'FeaturedDestinationCard';

// Memoized StayCard component (wider card, same height)
interface StayCardProps {
  item: Stay;
  isFavorited: boolean;
  onToggleFavorite: (id: string, type?: string) => void;
  heartScale: Animated.Value;
}

const StayCard = React.memo(
  ({ item, isFavorited, onToggleFavorite, heartScale }: StayCardProps) => {
    const colorScheme = useColorScheme();
    const pillBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
    const pillTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const pillIconBackground = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const cardBg = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';

    const handleFavoritePress = useCallback(() => {
      onToggleFavorite(item.id, 'stay');
    }, [onToggleFavorite, item.id]);

    // Get first 3 amenities from the database item
    const displayAmenities = useMemo(() => {
      if (item.amenities && item.amenities.length > 0) {
        return item.amenities.slice(0, 3);
      }
      return ['WiFi', 'Pool', 'Restaurant']; // Fallback
    }, [item.amenities]);

    const handleStayPress = useCallback(() => {
      navigateToStayProfile(item, {
        source: 'featured',
        location: item.location,
      });
    }, [item]);

    // Use first image from the database item
    const displayImage = item.images && item.images.length > 0 ? item.images[0] : item.imageUrl;

    return (
      <TouchableOpacity
        style={[styles.stayCard, { backgroundColor: cardBg }]}
        onPress={handleStayPress}
      >
        <Image source={{ uri: displayImage }} style={styles.destinationImage} resizeMode="cover" />
        <IconActionButton
          variant="like"
          isActive={isFavorited}
          size={HEART_SIZE}
          style={styles.heartContainer}
          onPress={handleFavoritePress}
          hitSlop={{
            top: OVERLAY_PADDING,
            left: OVERLAY_PADDING,
            bottom: OVERLAY_PADDING,
            right: OVERLAY_PADDING,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Favorite ${item.name} ${isFavorited ? 'selected' : 'not selected'}`}
          iconContainerStyle={{ transform: [{ scale: heartScale }] }}
        />
        <View style={styles.stayInfoContainer}>
          {/* Rating above overlay, right-aligned */}
          <View style={styles.stayTopRow}>
            <RatingPill
              value={item.rating}
              backgroundColor={pillBg}
              iconBackgroundColor={pillIconBackground}
              lightTextColor={pillTextColor}
              darkTextColor={pillTextColor}
            />
          </View>
          <View style={styles.stayOverlay}>
            <ThemedText
              style={styles.destinationName}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {item.name}
            </ThemedText>
            <View style={styles.stayMetaRow}>
              <LocationPill
                label={item.location}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                lightTextColor={pillTextColor}
                darkTextColor={pillTextColor}
                variant="compact"
              />
              {/* Amenities pill, right-aligned like Events date/time */}
              <View
                style={[
                  styles.pillTag,
                  { backgroundColor: pillBg, marginLeft: 'auto', paddingVertical: OVERLAY_PADDING },
                ]}
              >
                {displayAmenities.map((amenity, index) => (
                  <Ionicons
                    key={`${item.id}-amenity-${index}`}
                    name={getAmenityIcon(amenity)}
                    size={12}
                    color={pillTextColor}
                    style={index < displayAmenities.length - 1 ? styles.pillIcon : undefined}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

StayCard.displayName = 'FeaturedStayCard';

// Helper to compute open/closing status for daily activities
// activity status is imported from utils/timeStatus

// Things To Do card (uses event styles for consistency)
interface ThingsCardProps {
  item: (typeof thingsToDoData)[0];
  isFavorited: boolean;
  onToggleFavorite: (id: string, type?: string) => void;
  heartScale: Animated.Value;
  status: 'Open' | 'Closing' | 'Closed';
}

const ThingsCard = React.memo(
  ({ item, isFavorited, onToggleFavorite, heartScale, status }: ThingsCardProps) => {
    const colorScheme = useColorScheme();
    const pillBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
    const pillTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const statusColor = activityStatusColor(status);
    const pillIconBackground = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
    const cardBg = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';

    const handleActivityPress = () => {
      router.push({
        pathname: '/activity-profile',
        params: {
          activityId: item.id,
          activityName: item.name,
          activityLocation: item.location,
        },
      });
    };

    return (
      <TouchableOpacity
        style={[styles.eventCard, styles.thingsCard, { backgroundColor: cardBg }]}
        onPress={handleActivityPress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: `https://picsum.photos/300/200?random=${item.imageRandom}` }}
          style={styles.destinationImage}
          resizeMode="cover"
        />
        <IconActionButton
          variant="like"
          isActive={isFavorited}
          size={HEART_SIZE}
          style={styles.heartContainer}
          onPress={() => onToggleFavorite(item.id, 'activity')}
          hitSlop={{
            top: OVERLAY_PADDING,
            left: OVERLAY_PADDING,
            bottom: OVERLAY_PADDING,
            right: OVERLAY_PADDING,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Favorite ${item.name} ${isFavorited ? 'selected' : 'not selected'}`}
          iconContainerStyle={{ transform: [{ scale: heartScale }] }}
        />
        <View style={styles.eventInfoContainer}>
          {/* Rating above overlay, right-aligned */}
          <View style={styles.eventTopRow}>
            <RatingPill
              value={item.rating ?? 'N/A'}
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
              {/* Status right-aligned where date/time would go */}
              <StatusPill
                label={status}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                iconColor={statusColor}
                lightTextColor={statusColor}
                darkTextColor={statusColor}
                style={{ marginLeft: 'auto' }}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

ThingsCard.displayName = 'FeaturedThingsCard';

// Bus Card (mirrors ThingsCard structure with route + status)
interface BusCardProps {
  item: (typeof busOperatorsData)[0];
  isFavorited: boolean;
  onToggleFavorite: (id: string, type?: string) => void;
  heartScale: Animated.Value;
  status: 'Open' | 'Closing' | 'Closed';
}

const BusCard = React.memo(
  ({ item, isFavorited, onToggleFavorite, heartScale, status }: BusCardProps) => {
    const colorScheme = useColorScheme();
    const pillBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
    const pillTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

    const handleBusPress = useCallback(() => {
      router.push({
        pathname: '/bus-profile',
        params: {
          busId: item.id,
          busName: item.name,
          route: item.route,
        },
      });
    }, [item]);

    return (
      <TouchableOpacity style={styles.eventCard} onPress={handleBusPress}>
        <Image
          source={{ uri: `https://picsum.photos/300/200?random=${item.imageRandom}` }}
          style={styles.destinationImage}
          resizeMode="cover"
        />
        <IconActionButton
          variant="like"
          isActive={isFavorited}
          size={HEART_SIZE}
          style={styles.heartContainer}
          onPress={() => onToggleFavorite(item.id, 'bus')}
          hitSlop={{
            top: OVERLAY_PADDING,
            left: OVERLAY_PADDING,
            bottom: OVERLAY_PADDING,
            right: OVERLAY_PADDING,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Favorite ${item.name} ${isFavorited ? 'selected' : 'not selected'}`}
          iconContainerStyle={{ transform: [{ scale: heartScale }] }}
        />
        <View style={styles.eventInfoContainer}>
          {/* Rating above overlay, right-aligned */}
          <View style={styles.eventTopRow}>
            <RatingPill
              value={item.rating ?? 'N/A'}
              backgroundColor={pillBg}
              iconBackgroundColor={colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF'}
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
            {/* Both location and status pills removed as requested */}
            <View style={styles.eventMetaRow}>{/* No pills shown here */}</View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

BusCard.displayName = 'FeaturedBusCard';

// Flight Card (mirrors BusCard structure with route + status)
interface FlightCardProps {
  item: (typeof flightOperatorsData)[0];
  isFavorited: boolean;
  onToggleFavorite: (id: string, type?: string) => void;
  heartScale: Animated.Value;
  status: 'Open' | 'Closing' | 'Closed';
}

const FlightCard = React.memo(
  ({ item, isFavorited, onToggleFavorite, heartScale, status }: FlightCardProps) => {
    const colorScheme = useColorScheme();
    const pillBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
    const pillTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

    const handleFlightPress = useCallback(() => {
      router.push({
        pathname: '/flight-profile',
        params: {
          flightId: item.id,
          flightName: item.name,
          route: item.route,
        },
      });
    }, [item]);

    return (
      <TouchableOpacity style={styles.eventCard} onPress={handleFlightPress}>
        <Image
          source={{ uri: `https://picsum.photos/300/200?random=${item.imageRandom}` }}
          style={styles.destinationImage}
          resizeMode="cover"
        />
        <IconActionButton
          variant="like"
          isActive={isFavorited}
          size={HEART_SIZE}
          style={styles.heartContainer}
          onPress={() => onToggleFavorite(item.id, 'flight')}
          hitSlop={{
            top: OVERLAY_PADDING,
            left: OVERLAY_PADDING,
            bottom: OVERLAY_PADDING,
            right: OVERLAY_PADDING,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Favorite ${item.name} ${isFavorited ? 'selected' : 'not selected'}`}
          iconContainerStyle={{ transform: [{ scale: heartScale }] }}
        />
        <View style={styles.eventInfoContainer}>
          {/* Rating above overlay, right-aligned */}
          <View style={styles.eventTopRow}>
            <RatingPill
              value={item.rating ?? 'N/A'}
              backgroundColor={pillBg}
              iconBackgroundColor={colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF'}
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
            {/* Both location and status pills removed to match bus card */}
            <View style={styles.eventMetaRow}>{/* No pills shown here */}</View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

FlightCard.displayName = 'FeaturedFlightCard';

export default function Featured() {
  const colorScheme = useColorScheme();
  const sectionIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E';
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const scrollViewRef = useRef<ScrollView>(null); // Carousel horizontal scroll
  const mainScrollViewRef = useRef<ScrollView>(null); // Main vertical scroll
  const currentIndexRef = useRef(0);

  // Use shared destinations context
  const { destinations: sharedDestinations, setDestinations: setSharedDestinations } =
    useDestinations();

  // Use shared featured data context for persistent caching
  const { carouselData, destinationsData, setCarouselData, setDestinationsData } =
    useFeaturedData();

  // Loading states (local to component)
  const [carouselLoading, setCarouselLoading] = useState(carouselData.length === 0);
  const [destinationsLoading, setDestinationsLoading] = useState(destinationsData.length === 0);

  // Stays loading state
  const [staysLoading, setStaysLoading] = useState(true);
  const [stays, setStays] = useState<Stay[]>([]);

  // Events loading state
  const [eventsLoading, setEventsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [localSectionsLoading, setLocalSectionsLoading] = useState(true);

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);
  // Track favorites to force rerender when global favorites change
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const featuredBottomPadding = useMemo(
    () =>
      Platform.OS === 'ios'
        ? bottomTabBarHeight + FEATURED_BOTTOM_NAV_GAP
        : Math.max(insets.bottom + FEATURED_BOTTOM_NAV_GAP, FEATURED_BOTTOM_NAV_GAP),
    [bottomTabBarHeight, insets.bottom]
  );
  useEffect(() => {
    const unsub = subscribeFavorites(() => {
      // sync local favorites mapping from global store
      const ids = new Set(getFavoritedIds());
      const map: Record<string, boolean> = {};
      ids.forEach(id => (map[id] = true));
      setFavorites(map);
      setFavoritesVersion(v => v + 1);
    });
    // initialize
    setFavorites(
      Object.fromEntries(getFavoritedIds().map(id => [id, true])) as Record<string, boolean>
    );
    return unsub;
  }, []);

  const baseCarouselLength = carouselData.length;
  const extendedCarouselData = useMemo(
    () => (baseCarouselLength > 1 ? [...carouselData, carouselData[0]] : carouselData),
    [carouselData, baseCarouselLength]
  );
  const extendedCarouselLength = extendedCarouselData.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Fetch carousel data from Supabase
  const fetchCarouselData = useCallback(async () => {
    setCarouselLoading(true);
    try {
      const { data, error } = await carouselService.getAll(); // Get carousel items

      if (error) {
        console.error('Error fetching carousel data:', error);
        return;
      }

      if (data && data.length > 0) {
        const carouselItems: CarouselItem[] = data.map(carouselItem => {
          const carouselSubtitle = 'subtitle' in carouselItem ? carouselItem.subtitle : '';
          const resolvedImage = normalizeStorageImageUrl(carouselItem.image_url);
          const fallbackUri = `https://picsum.photos/800/600?random=${carouselItem.id.slice(-6)}`;
          const imageUri = resolvedImage ?? fallbackUri;

          if (!resolvedImage) {
            console.log(
              '⚠️ Carousel item missing resolvable image URL. Falling back to placeholder.',
              {
                id: carouselItem.id,
                image_url: carouselItem.image_url,
              }
            );
          }

          return {
            id: carouselItem.id,
            image: { uri: imageUri },
            title: carouselItem.title,
            location: carouselItem.location || carouselSubtitle || '',
          };
        });

        if (carouselItems.length === 0) {
          console.log('⚠️ Carousel data returned without usable images; reverting to defaults.');
          setCarouselData(defaultCarouselData);
        } else {
          setCarouselData(carouselItems);
        }

        // Aggressive prefetch with parallel loading and priority
        console.log('🚀 Starting aggressive image prefetch for carousel...');
        const prefetchPromises = carouselItems.map(async (item, index) => {
          try {
            // Priority loading - prefetch first 3 images immediately
            if (index < 3) {
              await Image.prefetch(item.image.uri);
              console.log(`✅ Priority carousel image ${index + 1} prefetched:`, item.title);
            } else {
              // Background prefetch for remaining images
              Image.prefetch(item.image.uri).then(() => {
                console.log(`✅ Background carousel image ${index + 1} prefetched:`, item.title);
              });
            }
          } catch (error) {
            console.log(`❌ Failed to prefetch carousel image ${index + 1}:`, error);
          }
        });

        // Wait for priority images (first 3) to load
        await Promise.allSettled(prefetchPromises.slice(0, 3));

        console.log('✅ Carousel data loaded from database:', carouselItems.length, 'items');
      }
    } catch (err) {
      console.error('Failed to fetch carousel data:', err);
      setCarouselLoading(false); // Only set false on error
    }
    // Note: Don't set carouselLoading to false here - wait for images to load
  }, []);

  // Fetch featured destinations data from Supabase
  const fetchDestinationsData = useCallback(async () => {
    setDestinationsLoading(true);
    try {
      const { data, error } = await destinationsService.getAll(true); // Get featured destinations

      if (error) {
        console.error('Error fetching destinations data:', error);
        return;
      }

      if (data && data.length > 0) {
        // First set the destinations data
        setDestinationsData(data);

        // Aggressive prefetch with parallel loading and priority
        console.log('🚀 Starting aggressive image prefetch for destinations...');
        const prefetchPromises = data.map(async (destination, index) => {
          const primaryImage = pickBestImageUrl(
            destination.image_url,
            Array.isArray(destination.images) ? destination.images : undefined
          );

          if (!primaryImage) {
            console.log(
              `⚠️ No image available for destination ${destination.name} (${destination.id})`
            );
            return;
          }

          try {
            // Priority loading - prefetch first 4 images immediately (visible on screen)
            if (index < 4) {
              await Image.prefetch(primaryImage);
              console.log(
                `✅ Priority destination image ${index + 1} prefetched:`,
                destination.name
              );
            } else {
              // Background prefetch for remaining images
              Image.prefetch(primaryImage).then(() => {
                console.log(
                  `✅ Background destination image ${index + 1} prefetched:`,
                  destination.name
                );
              });
            }
          } catch (error) {
            console.log(`❌ Failed to prefetch destination image ${index + 1}:`, error);
          }
        });

        // Wait for priority images (first 4) to load
        await Promise.allSettled(prefetchPromises.slice(0, 4));

        console.log('✅ Destinations data loaded from database:', data.length, 'items');

        // Fetch real weather data for all destinations
        console.log('🌤️ Fetching real weather data...');
        const locationsForWeather = data.map(dest => ({
          id: dest.id,
          name: dest.name,
          location: locationMappings[dest.name] || dest.location || dest.name,
        }));

        const weatherData = await weatherService.getWeatherForDestinations(locationsForWeather);

        // Update destinations with real weather data
        const destinationsWithWeather = data.map(dest => ({
          ...dest,
          weather: weatherData[dest.id] || undefined, // No fallback to fake weather
        }));

        setDestinationsData(destinationsWithWeather);
        setSharedDestinations(destinationsWithWeather); // Also update shared context
        console.log('✅ Real weather data updated for destinations');
      }
    } catch (err) {
      console.error('Failed to fetch destinations data:', err);
      setDestinationsLoading(false); // Only set false on error
    }
    // Note: Don't set destinationsLoading to false here - wait for images to load
  }, []);

  // Fetch stays from database
  const fetchStays = useCallback(async () => {
    setStaysLoading(true);
    try {
      const { data, error } = await staysService.getAll(undefined, true); // Get only featured stays

      if (error) {
        console.error('Error fetching stays:', error);
        setStays([]);
        return;
      }

      if (data) {
        const mappedStays: Stay[] = data.map((stay: any) => {
          const galleryImages =
            stay.stay_gallery
              ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((img: any) => img.image_url) || [];

          const roomTypes =
            stay.stay_rooms?.map((room: any) => ({
              id: room.id,
              name: room.name || room.room_type,
              price: room.base_price,
              maxGuests: room.max_guests,
              description: room.description,
              amenities: room.amenities || [],
              available: room.is_active,
              totalRooms: room.total_rooms || 0,
              availableRooms: room.available_rooms || 0,
              stayName: room.stay_name || stay.name,
            })) || [];

          const basePrice =
            roomTypes.length > 0
              ? Math.min(...roomTypes.map((room: { price: number }) => room.price))
              : stay.price_per_night || 0;

          const stayAmenities = Array.isArray(stay.amenities) ? stay.amenities : [];

          return {
            id: stay.id,
            name: stay.name,
            location: stay.location || stay.destinations?.location || '',
            description: stay.description || '',
            price: basePrice,
            rating: stay.rating || 0,
            imageUrl: stay.image_url || galleryImages[0] || '',
            images: galleryImages.length > 0 ? galleryImages : stay.images || [],
            amenities: stayAmenities,
            host: stay.host || { name: 'Host', avatar: '', rating: 0 },
            reviews: stay.reviews || [],
            featured: stay.featured || false,
            destination_id: stay.destination_id,
            roomTypes: roomTypes.length > 0 ? roomTypes : undefined,
            providerLogo: stay.service_providers?.logo_url,
            providerName: stay.service_providers?.business_name,
            providerId: stay.provider_id,
            phone: stay.phone,
            fullLocation: stay.full_location,
            totalReviews: stay.total_reviews || 0,
            checkInTime: stay.check_in_time,
            checkOutTime: stay.check_out_time,
          };
        });

        setStays(mappedStays);
        console.log('✅ Stays loaded from database:', mappedStays.length, 'featured stays');
      } else {
        setStays([]);
      }
    } catch (err) {
      console.error('Failed to fetch stays:', err);
      setStays([]);
    } finally {
      setStaysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  // Fetch featured events from database
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data, error } = await eventsService.getAll(undefined, true); // Get featured events

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      if (data) {
        const mappedEvents: Event[] = data.map(mapEventRecordToEvent);

        setEvents(mappedEvents);
        console.log('✅ Events loaded from database:', mappedEvents.length, 'featured events');
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLocalSectionsLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  // Heart animation scales per destination
  const heartScalesRef = useRef<Record<string, Animated.Value>>({});
  const getHeartScale = useCallback((key: string) => {
    if (!heartScalesRef.current[key]) {
      heartScalesRef.current[key] = new Animated.Value(1);
    }
    return heartScalesRef.current[key];
  }, []);

  const handleImageLoad = useCallback((imageId: string) => {
    console.log('🖼️ Image loaded:', imageId);
    setImageLoadStates(prev => ({ ...prev, [imageId]: true }));
  }, []);

  const handleImageError = useCallback((imageId: string) => {
    console.log('❌ Image failed to load:', imageId);
    // Still mark as "loaded" so we don't wait forever
    setImageLoadStates(prev => ({ ...prev, [imageId]: true }));
  }, []);

  // Monitor when enough carousel images are loaded (very fast strategy)
  useEffect(() => {
    if (carouselData.length > 0 && carouselLoading) {
      const loadedCount = Object.keys(imageLoadStates).filter(
        id => imageLoadStates[id] && carouselData.some(item => item.id === id)
      ).length;

      // Show content immediately when first image loads
      const shouldShow = loadedCount >= 1;

      console.log('🎠 Carousel loading check:', {
        totalItems: carouselData.length,
        loadedImages: loadedCount,
        shouldShow,
        itemIds: carouselData.map(item => item.id),
        loadedIds: Object.keys(imageLoadStates).filter(id => imageLoadStates[id]),
      });

      if (shouldShow) {
        console.log('🎠 First carousel image loaded, hiding shimmer immediately');
        setCarouselLoading(false);
      }
    }
  }, [carouselData, imageLoadStates, carouselLoading]);

  // Monitor when enough destination images are loaded (very fast strategy)
  useEffect(() => {
    if (destinationsData.length > 0 && destinationsLoading) {
      const loadedCount = Object.keys(imageLoadStates).filter(
        id => imageLoadStates[id] && destinationsData.some(item => item.id === id)
      ).length;

      // Show content when just 2 images load (very aggressive)
      const minToShow = Math.min(2, destinationsData.length);
      const shouldShow = loadedCount >= minToShow;

      console.log('🏞️ Destinations loading check:', {
        totalItems: destinationsData.length,
        loadedImages: loadedCount,
        minToShow,
        shouldShow,
        itemIds: destinationsData.map(item => item.id),
        loadedIds: Object.keys(imageLoadStates).filter(id => imageLoadStates[id]),
      });

      if (shouldShow) {
        console.log('🏞️ Minimum destination images loaded, hiding shimmer immediately');
        setDestinationsLoading(false);
      }
    }
  }, [destinationsData, imageLoadStates, destinationsLoading]);

  // Fallback timeouts to ensure shimmer doesn't stay forever (very fast)
  useEffect(() => {
    if (carouselLoading && carouselData.length > 0) {
      const timeout = setTimeout(() => {
        console.log('⏰ Carousel loading timeout - forcing hide shimmer');
        setCarouselLoading(false);
      }, 1500); // 1.5 second timeout for ultra-fast experience

      return () => clearTimeout(timeout);
    }
  }, [carouselLoading, carouselData.length]);

  useEffect(() => {
    if (destinationsLoading && destinationsData.length > 0) {
      const timeout = setTimeout(() => {
        console.log('⏰ Destinations loading timeout - forcing hide shimmer');
        setDestinationsLoading(false);
      }, 2000); // 2 second timeout for ultra-fast experience

      return () => clearTimeout(timeout);
    }
  }, [destinationsLoading, destinationsData.length]);

  // Toggle by id (persist to DB via global util) and animate
  const toggleFavorite = useCallback(
    (id: string, type?: string) => {
      // immediate UI update
      setFavorites(prev => ({ ...prev, [id]: !prev[id] }));

      // Haptics + bounce animation using id as key
      const scale = getHeartScale(id);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();

      try {
        toggleFavoriteUtil(id, type);
      } catch (err) {
        // Persistence errors handled in util; fall back to syncing local state on change subscription
      }
    },
    [getHeartScale]
  );

  const renderDestinationCard = useCallback(
    ({ item, index }: { item: DatabaseDestination; index: number }) => {
      const isLastItem = index === destinationsData.length - 1;
      return (
        <DestinationCard
          item={item}
          isFavorited={!!favorites[item.id] || isFavoritedUtil(item.id)}
          onToggleFavorite={toggleFavorite}
          heartScale={getHeartScale(item.id)}
          onImageLoad={handleImageLoad}
          onImageError={handleImageError}
          isLastItem={isLastItem}
          onPress={() => {
            console.log('🎯 Navigating to destination:', item.id, item.name);
            router.push({
              pathname: '/screens/DestinationDetail',
              params: { destinationId: item.id },
            });
          }}
        />
      );
    },
    [
      favorites,
      getHeartScale,
      toggleFavorite,
      handleImageLoad,
      handleImageError,
      destinationsData.length,
    ]
  );

  const keyExtractor = useCallback((item: DatabaseDestination) => item.id, []);

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: CARD_WIDTH + DESTINATION_CARD_SPACING,
      offset: (CARD_WIDTH + DESTINATION_CARD_SPACING) * index,
      index,
    }),
    []
  );

  // Render stay card for FlatList
  const renderStayCard = useCallback(
    ({ item }: { item: Stay }) => {
      const isFavorited = !!favorites[item.id] || isFavoritedUtil(item.id);
      const heartScale = getHeartScale(item.name);
      return (
        <StayCard
          item={item}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          heartScale={heartScale}
        />
      );
    },
    [favorites, getHeartScale, toggleFavorite]
  );

  // Render shimmer stay card for loading state
  const renderShimmerStayCard = useCallback(
    () => <FeaturedSectionCardShimmer variant="stay" />,
    []
  );

  const renderEventShimmerCard = useCallback(
    () => <FeaturedSectionCardShimmer variant="event" />,
    []
  );

  const renderSimpleShimmerCard = useCallback(
    () => <FeaturedSectionCardShimmer variant="simple" />,
    []
  );

  const getStayItemLayout = useCallback(
    (data: any, index: number) => ({
      length: STAY_CARD_WIDTH + STAY_CARD_SPACING,
      offset: (STAY_CARD_WIDTH + STAY_CARD_SPACING) * index,
      index,
    }),
    []
  );

  // Render event card for FlatList
  const renderEventCard = useCallback(
    ({ item }: { item: Event }) => {
      const isFavorited = !!favorites[item.id] || isFavoritedUtil(item.id);
      const heartScale = getHeartScale(item.name);
      return (
        <EventCard
          item={item}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          heartScale={heartScale}
        />
      );
    },
    [favorites, getHeartScale, toggleFavorite]
  );

  const getEventItemLayout = useCallback(
    (data: any, index: number) => ({
      length: EVENT_CARD_WIDTH + EVENT_CARD_SPACING,
      offset: (EVENT_CARD_WIDTH + EVENT_CARD_SPACING) * index,
      index,
    }),
    []
  );

  // Render things-to-do card
  const renderThingsCard = useCallback(
    ({ item }: { item: (typeof thingsToDoData)[0] }) => {
      const isFavorited = !!favorites[item.id] || isFavoritedUtil(item.id);
      const heartScale = getHeartScale(item.name);
      const status = getActivityStatus(new Date(nowTick), {
        operatingHours: item.operatingHours,
        durationHours: item.durationHours,
      });
      return (
        <ThingsCard
          item={item}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          heartScale={heartScale}
          status={status}
        />
      );
    },
    [favorites, getHeartScale, toggleFavorite, nowTick]
  );

  const getThingsItemLayout = useCallback(
    (data: any, index: number) => ({
      length: THINGS_CARD_WIDTH + THINGS_CARD_SPACING,
      offset: (THINGS_CARD_WIDTH + THINGS_CARD_SPACING) * index,
      index,
    }),
    []
  );

  // Render bus operator card
  const renderBusCard = useCallback(
    ({ item }: { item: (typeof busOperatorsData)[0] }) => {
      const isFavorited = !!favorites[item.id] || isFavoritedUtil(item.id);
      const heartScale = getHeartScale(item.name);
      const status = getActivityStatus(new Date(nowTick));
      return (
        <BusCard
          item={item}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          heartScale={heartScale}
          status={status}
        />
      );
    },
    [favorites, getHeartScale, toggleFavorite, nowTick]
  );

  // Render flight operator card
  const renderFlightCard = useCallback(
    ({ item }: { item: (typeof flightOperatorsData)[0] }) => {
      const isFavorited = !!favorites[item.id] || isFavoritedUtil(item.id);
      const heartScale = getHeartScale(item.name);
      const status = getActivityStatus(new Date(nowTick));
      return (
        <FlightCard
          item={item}
          isFavorited={isFavorited}
          onToggleFavorite={toggleFavorite}
          heartScale={heartScale}
          status={status}
        />
      );
    },
    [favorites, getHeartScale, toggleFavorite, nowTick]
  );

  const advanceSlide = useCallback(() => {
    if (baseCarouselLength <= 1) {
      return;
    }

    const isWrapping = currentIndexRef.current === baseCarouselLength - 1;
    const targetRawIndex = isWrapping ? baseCarouselLength : currentIndexRef.current + 1;
    const nextBaseIndex = isWrapping ? 0 : currentIndexRef.current + 1;

    scrollViewRef.current?.scrollTo({
      x: targetRawIndex * screenWidth,
      animated: true,
    });

    currentIndexRef.current = nextBaseIndex;
    setCurrentIndex(nextBaseIndex);
  }, [baseCarouselLength]);

  // Auto-scroll functionality
  useEffect(() => {
    if (baseCarouselLength <= 1) {
      return;
    }

    const interval = setInterval(() => {
      if (!isUserScrolling) {
        advanceSlide();
      }
    }, 5000); // Change slide every 5 seconds (slower for better viewing)

    return () => clearInterval(interval);
  }, [advanceSlide, baseCarouselLength, isUserScrolling]);

  // Tick every 30s to update open/closed status in Things To Do
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch carousel data on component mount
  // Fetch carousel data on component mount - only if empty
  useEffect(() => {
    if (carouselData.length === 0) {
      setCarouselLoading(true);
      fetchCarouselData();
    } else {
      // Data already loaded from context, no need to show loading
      setCarouselLoading(false);
    }
  }, [fetchCarouselData, carouselData.length]);

  // Fetch destinations data on component mount - only if empty
  useEffect(() => {
    if (destinationsData.length === 0) {
      setDestinationsLoading(true);
      fetchDestinationsData();
    } else {
      // Data already loaded from context, no need to show loading
      setDestinationsLoading(false);
    }
  }, [fetchDestinationsData, destinationsData.length]);

  // Scroll to top and refresh function
  const scrollToTopAndRefresh = useCallback(async () => {
    console.log('🔄 Scrolling to top and refreshing Featured page...');

    // Set refreshing state
    setRefreshing(true);

    // Scroll to top with animation using the MAIN scroll view
    mainScrollViewRef.current?.scrollTo({ y: 0, animated: true });

    // Refresh data
    try {
      await Promise.all([
        fetchCarouselData(),
        fetchDestinationsData(),
        fetchStays(),
        fetchEvents(),
      ]);
      console.log('✅ Featured page refreshed');
    } catch (error) {
      console.error('❌ Error refreshing Featured page:', error);
    } finally {
      // Add a small delay to show the refresh animation
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  }, [fetchCarouselData, fetchDestinationsData, fetchStays, fetchEvents]);

  // Register scroll and refresh function
  useEffect(() => {
    console.log('📱 Registering Featured scroll and refresh');
    registerFeaturedScrollAndRefresh(scrollToTopAndRefresh);
  }, [scrollToTopAndRefresh]);

  const handleScroll = useCallback(
    (event: any) => {
      if (baseCarouselLength === 0) {
        return;
      }

      const contentOffset = event.nativeEvent.contentOffset.x;
      const rawIndex = Math.round(contentOffset / screenWidth);
      const normalizedIndex =
        ((rawIndex % baseCarouselLength) + baseCarouselLength) % baseCarouselLength;

      setCurrentIndex(prev => (prev === normalizedIndex ? prev : normalizedIndex));
    },
    [baseCarouselLength]
  );

  const handleScrollBeginDrag = () => {
    setIsUserScrolling(true);
  };

  const handleScrollEndDrag = () => {
    setTimeout(() => setIsUserScrolling(false), 4000); // Resume auto-scroll after 4 seconds (longer pause)
  };

  const handleMomentumScrollEnd = useCallback(
    (event: any) => {
      if (baseCarouselLength === 0) {
        return;
      }

      const contentOffset = event.nativeEvent.contentOffset.x;
      let rawIndex = Math.round(contentOffset / screenWidth);

      if (extendedCarouselLength > baseCarouselLength && rawIndex === extendedCarouselLength - 1) {
        scrollViewRef.current?.scrollTo({ x: 0, animated: false });
        rawIndex = 0;
      }

      const normalizedIndex =
        ((rawIndex % baseCarouselLength) + baseCarouselLength) % baseCarouselLength;

      currentIndexRef.current = normalizedIndex;
      setCurrentIndex(normalizedIndex);
    },
    [baseCarouselLength, extendedCarouselLength]
  );

  const renderCarouselItem = (item: CarouselItem, index: number) => {
    const pillBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
    const pillTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const pillIconBackground = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';

    return (
      <View key={`${item.id}-${index}`} style={[styles.carouselItem, { width: screenWidth }]}>
        <View
          style={[
            styles.imageContainer,
            {
              backgroundColor: !imageLoadStates[item.id]
                ? colorScheme === 'dark'
                  ? '#2C2C2E'
                  : '#F2F2F7'
                : 'transparent',
            },
          ]}
        >
          {!imageLoadStates[item.id] && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={colorScheme === 'dark' ? '#FFFFFF' : '#FF3B30'}
              />
            </View>
          )}
          <Image
            source={{
              uri: item.image.uri,
              cache: 'force-cache', // Force caching for faster subsequent loads
              headers: {
                'Cache-Control': 'max-age=86400', // Cache for 24 hours
              },
            }}
            style={[styles.carouselImage, { opacity: imageLoadStates[item.id] ? 1 : 0 }]}
            resizeMode="cover"
            fadeDuration={200} // Faster fade-in
            onLoad={() => handleImageLoad(item.id)}
            onError={() => handleImageError(item.id)}
          />
        </View>
        <View style={styles.textContainer}>
          <LocationPill
            label={item.location ?? item.title}
            backgroundColor={pillBg}
            iconBackgroundColor={pillIconBackground}
            lightTextColor={pillTextColor}
            darkTextColor={pillTextColor}
            iconSize={14}
            style={styles.carouselLocationPill}
          />
        </View>
      </View>
    );
  };

  return (
    <IOSScreenWrapper>
      <ThemedView
        style={styles.container}
        lightColor={Colors.light.appBackground}
        darkColor={Colors.dark.appBackground}
      >
        <WallpaperPattern offsetTop={0} />
        <ScrollView
          ref={mainScrollViewRef}
          style={styles.mainScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={scrollToTopAndRefresh}
              tintColor={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            />
          }
        >
          {/* Carousel */}
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              scrollEventThrottle={16}
              style={styles.carousel}
            >
              {carouselLoading || extendedCarouselData.length === 0 ? (
                <CarouselShimmer />
              ) : (
                extendedCarouselData.map((item, index) => renderCarouselItem(item, index))
              )}
            </ScrollView>

            {/* Indicators */}
            <View style={styles.indicatorContainer} pointerEvents="none">
              <CarouselIndicators
                count={carouselLoading ? 1 : baseCarouselLength}
                activeIndex={currentIndex}
                variant="overlay"
                keyPrefix="featured-carousel"
              />
            </View>
          </View>

          {/* Content Below Carousel */}
          <View style={[styles.contentContainer, { paddingBottom: featuredBottomPadding }]}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <ThemedText type="sectionTitle" style={styles.sectionTitle}>
                Popular Destinations
              </ThemedText>
              <ViewAllButton onPress={() => router.navigate('/(tabs)/explore')} />
            </View>

            {/* Destinations Grid with Shimmer Loading */}
            {destinationsLoading || destinationsData.length === 0 ? (
              <DestinationCardShimmer count={4} />
            ) : (
              <FlatList
                data={destinationsData as any}
                renderItem={renderDestinationCard}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: GALLERY_CONTAINER_PADDING,
                  paddingBottom: GALLERY_CONTAINER_PADDING,
                }}
                style={{ width: '100%', paddingHorizontal: 0 }}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + DESTINATION_CARD_SPACING}
                snapToAlignment="start"
                getItemLayout={getItemLayout}
              />
            )}

            {/* Section divider */}
            <View style={{ marginBottom: SECTION_GAP }} />

            {/* Stays Section */}
            <View
              style={[
                {
                  marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                  borderRadius: SECTION_RADIUS,
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  overflow: 'hidden',
                  marginBottom: SECTION_GAP,
                },
              ]}
            >
              <View style={styles.featuredSectionHeader}>
                <View style={styles.featuredHeaderIcon}>
                  <AccommodationIcon size={24} color={sectionIconColor} />
                </View>
                <View style={styles.featuredHeaderTitleGroup}>
                  <FeaturedSectionTitle color={sectionIconColor}>Stays</FeaturedSectionTitle>
                </View>
                <ViewAllButton onPress={() => navigation.navigate('Stays' as never)} />
              </View>

              {/* Stays List */}
              <FlatList
                data={
                  (staysLoading || stays.length === 0
                    ? FEATURED_SKELETON_ITEMS
                    : stays.slice(0, 5)) as any
                }
                renderItem={
                  staysLoading || stays.length === 0 ? renderShimmerStayCard : renderStayCard
                }
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: STAY_CARD_SPACING,
                  paddingRight: 0,
                  paddingBottom: STAY_CARD_SPACING,
                }}
                style={{ width: '100%', paddingHorizontal: 0 }}
                decelerationRate="fast"
                snapToInterval={STAY_CARD_WIDTH + STAY_CARD_SPACING}
                snapToAlignment="start"
                getItemLayout={getStayItemLayout}
              />
            </View>

            {/* Upcoming Events Section */}
            <View
              style={[
                {
                  marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                  borderRadius: SECTION_RADIUS,
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  overflow: 'hidden',
                  marginBottom: SECTION_GAP,
                },
              ]}
            >
              <View style={styles.featuredSectionHeader}>
                <View style={styles.featuredHeaderIcon}>
                  <EventsIcon size={24} color={sectionIconColor} />
                </View>
                <View style={styles.featuredHeaderTitleGroup}>
                  <FeaturedSectionTitle color={sectionIconColor}>
                    Upcoming Events
                  </FeaturedSectionTitle>
                </View>
                <ViewAllButton onPress={() => navigation.navigate('Events' as never)} />
              </View>

              <FlatList
                data={
                  (eventsLoading || events.length === 0
                    ? FEATURED_SKELETON_ITEMS
                    : events.slice(0, 5)) as any
                }
                renderItem={
                  eventsLoading || events.length === 0 ? renderEventShimmerCard : renderEventCard
                }
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: EVENT_CARD_SPACING,
                  paddingRight: 0,
                  paddingBottom: EVENT_CARD_SPACING,
                }}
                style={{ width: '100%', paddingHorizontal: 0 }}
                decelerationRate="fast"
                snapToInterval={EVENT_CARD_WIDTH + EVENT_CARD_SPACING}
                snapToAlignment="start"
                getItemLayout={getEventItemLayout}
              />
            </View>

            {/* Things To Do Section */}
            <View
              style={[
                {
                  marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                  borderRadius: SECTION_RADIUS,
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  overflow: 'hidden',
                  marginBottom: SECTION_GAP,
                },
              ]}
            >
              <View style={styles.featuredSectionHeader}>
                <View style={styles.featuredHeaderIcon}>
                  <ThingsIcon size={24} color={sectionIconColor} />
                </View>
                <View style={styles.featuredHeaderTitleGroup}>
                  <FeaturedSectionTitle color={sectionIconColor}>Things To Do</FeaturedSectionTitle>
                </View>
                <ViewAllButton onPress={() => navigation.navigate('ThingsToDo' as never)} />
              </View>

              <FlatList
                data={(localSectionsLoading ? FEATURED_SKELETON_ITEMS : thingsToDoData) as any}
                renderItem={localSectionsLoading ? renderEventShimmerCard : renderThingsCard}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: THINGS_CARD_SPACING,
                  paddingRight: 0,
                  paddingBottom: THINGS_CARD_SPACING,
                }}
                style={{ width: '100%', paddingHorizontal: 0 }}
                decelerationRate="fast"
                snapToInterval={THINGS_CARD_WIDTH + THINGS_CARD_SPACING}
                snapToAlignment="start"
                getItemLayout={getThingsItemLayout}
              />
            </View>

            {/* Bus Section */}
            <View
              style={[
                {
                  marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                  borderRadius: SECTION_RADIUS,
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  overflow: 'hidden',
                  marginBottom: SECTION_GAP,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="sectionTitle" style={styles.sectionTitle}>
                  Bus
                </ThemedText>
                <ViewAllButton onPress={() => navigation.navigate('Bus' as never)} />
              </View>

              <FlatList
                data={(localSectionsLoading ? FEATURED_SKELETON_ITEMS : busOperatorsData) as any}
                renderItem={localSectionsLoading ? renderSimpleShimmerCard : renderBusCard}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: EVENT_CARD_SPACING,
                  paddingRight: 0,
                  paddingBottom: EVENT_CARD_SPACING,
                }}
                style={{ width: '100%', paddingHorizontal: 0 }}
                decelerationRate="fast"
                snapToInterval={EVENT_CARD_WIDTH + EVENT_CARD_SPACING}
                snapToAlignment="start"
                getItemLayout={getEventItemLayout}
              />
            </View>

            {/* Flights Section */}
            <View
              style={[
                {
                  marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                  borderRadius: SECTION_RADIUS,
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  overflow: 'hidden',
                  marginBottom: SECTION_GAP,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="sectionTitle" style={styles.sectionTitle}>
                  Flights
                </ThemedText>
                <ViewAllButton onPress={() => navigation.navigate('Flights' as never)} />
              </View>

              <FlatList
                data={(localSectionsLoading ? FEATURED_SKELETON_ITEMS : flightOperatorsData) as any}
                renderItem={localSectionsLoading ? renderSimpleShimmerCard : renderFlightCard}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: EVENT_CARD_SPACING,
                  paddingRight: 0,
                  paddingBottom: EVENT_CARD_SPACING,
                }}
                style={{ width: '100%', paddingHorizontal: 0 }}
                decelerationRate="fast"
                snapToInterval={EVENT_CARD_WIDTH + EVENT_CARD_SPACING}
                snapToAlignment="start"
                getItemLayout={getEventItemLayout}
              />
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  carouselContainer: {
    height: CAROUSEL_HEIGHT,
    marginTop: SECTION_HORIZONTAL_MARGIN,
    paddingTop: SECTION_HORIZONTAL_MARGIN,
  },
  carousel: {
    flex: 1,
  },
  carouselItem: {
    height: CAROUSEL_ITEM_HEIGHT,
    position: 'relative',
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F2F2F7',
    borderRadius: SECTION_RADIUS,
    overflow: 'hidden',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: SECTION_RADIUS,
    zIndex: 1,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: SECTION_RADIUS,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SECTION_RADIUS,
    overflow: 'hidden',
  },
  gradientTop: {
    flex: 2,
  },
  gradientBottom: {
    flex: 2,
  },
  textContainer: {
    position: 'absolute',
    bottom: responsiveSize(12, 10, 16),
    left: responsiveSize(20, 16, 24),
    right: responsiveSize(20, 16, 24),
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: screenWidth - responsiveSize(40, 32, 48),
  },
  carouselLocationPill: {
    marginLeft: responsiveSize(6, 4, 8),
  },
  carouselTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: OVERLAY_PADDING,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: responsiveSize(1, 1, 2) },
    textShadowRadius: responsiveSize(3, 2, 4),
    alignSelf: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: -responsiveSize(2, 1, 3),
    left: 0,
    right: 0,
    paddingHorizontal: responsiveSize(20, 16, 24),
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 0,
    paddingTop: SECTION_GAP,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: responsiveSize(12, 10, 16),
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingTop: SECTION_HORIZONTAL_MARGIN,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  featuredSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: responsiveSize(12, 10, 16),
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingTop: SECTION_HORIZONTAL_MARGIN,
  },
  featuredHeaderIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredHeaderTitleGroup: {
    flex: 1,
  },
  featuredSectionTitleText: {
    fontSize: responsiveFontSize(20),
    lineHeight: responsiveLineHeight(21),
    fontFamily: Fonts.bold,
    letterSpacing: 0,
  },
  destinationsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: responsiveSize(30, 24, 36),
  },
  destinationsScrollView: {
    width: '100%',
    paddingHorizontal: 0,
  },
  destinationsScrollContent: {
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
  },
  destinationCard: {
    width: CARD_WIDTH,
    marginRight: DESTINATION_CARD_SPACING,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // Will be overridden dynamically
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    position: 'relative',
  },
  stayCard: {
    width: STAY_CARD_WIDTH,
    marginRight: STAY_CARD_SPACING,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // Will be overridden dynamically
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
  stayInfoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  destinationInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: OVERLAY_PADDING,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  stayOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: OVERLAY_PADDING,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  stayTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: responsiveSize(4, 3, 6),
    paddingRight: CARD_INSET,
  },
  destinationName: {
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(18),
    fontFamily: Fonts.bold,
    textAlign: 'left',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  destinationWeather: {
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(18),
    textAlign: 'left',
    color: '#FFFFFF',
    marginTop: 2,
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  stayMetaRow: {
    marginTop: responsiveSize(4, 3, 6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: STAY_CARD_SPACING,
  },
  eventMetaRow: {
    marginTop: responsiveSize(4, 3, 6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: EVENT_CARD_SPACING,
  },
  eventCard: {
    width: EVENT_CARD_WIDTH,
    marginRight: EVENT_CARD_SPACING,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // Will be overridden dynamically
    position: 'relative',
  },
  thingsCard: {
    width: THINGS_CARD_WIDTH,
    marginRight: THINGS_CARD_SPACING,
    backgroundColor: '#FFFFFF', // Will be overridden dynamically
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },
  eventInfoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  pillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: OVERLAY_PADDING,
    paddingVertical: responsiveSize(3, 3, 5),
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  infoPill: {
    paddingHorizontal: responsiveSize(12, 10, 14),
    paddingVertical: responsiveSize(5, 4, 7),
  },
  eventOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: OVERLAY_PADDING,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: responsiveSize(4, 3, 6),
    paddingRight: CARD_INSET,
  },
  pillIcon: {
    marginRight: responsiveSize(4, 3, 6),
  },
  pillText: {
    fontSize: responsiveFontSize(11),
    lineHeight: responsiveLineHeight(11),
    fontFamily: Fonts.bold,
    color: '#1C1C1E',
  },
  infoPillText: {
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveLineHeight(14),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  sectionContainer: {
    width: '100%',
  },
  featuredSkeletonCard: {
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EEF1F4',
  },
  featuredSkeletonHeart: {
    position: 'absolute',
    top: CARD_INSET,
    right: CARD_INSET,
    width: HEART_SIZE,
    height: HEART_SIZE,
    borderRadius: HEART_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredSkeletonRating: {
    position: 'absolute',
    right: CARD_INSET,
    bottom: responsiveSize(70, 60, 82),
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  featuredSkeletonOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.58)',
    padding: CARD_INSET,
  },
  featuredSkeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: STAY_CARD_SPACING,
    marginTop: responsiveSize(7, 6, 9),
  },
  destinationsEmptyContainer: {
    paddingVertical: responsiveSize(40, 32, 52),
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationsEmptyText: {
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveLineHeight(16),
    opacity: 0.5,
  },
  staysEmptyContainer: {
    paddingVertical: responsiveSize(40, 32, 52),
    alignItems: 'center',
    justifyContent: 'center',
  },
  staysEmptyText: {
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveLineHeight(16),
    opacity: 0.5,
  },
});
