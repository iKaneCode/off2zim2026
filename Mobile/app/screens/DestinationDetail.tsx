import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Share,
  FlatList,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  DateTimePill,
  IconActionButton,
  LocationPill,
  ProfileGalleryHeader,
  PushScreenOptions,
  RatingPill,
  StatusPill,
  ViewAllButton,
  WallpaperPattern,
  WebSlideTransition,
} from '@/components';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { CustomHeader } from '@/components/CustomHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { staysData, upcomingEventsData, thingsToDoData } from '@/constants/FeaturedData';
import { cloneStay, getStayById } from '@/constants/StayData';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { getActivityStatus, activityStatusColor } from '@/utils/timeStatus';
import type { Stay } from '@/types/Stay';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { navigateToStayProfile } from '@/utils/navigationUtils';
import { pickBestImageUrl, normalizeStorageImageUrl } from '@/utils/imageUtils';
import {
  isFavorited as isFavoritedUtil,
  toggleFavorite as toggleFavoriteUtil,
} from '@/utils/favoritesUtils';
import { destinationsService } from '@/services/database';
import { weatherService } from '@/services/weather';
import type { BackendDestination } from '@/types/backend';

const { width: screenWidth } = Dimensions.get('window');
// Match Featured card widths
const STAY_CARD_WIDTH = screenWidth - 120;
const EVENT_CARD_WIDTH = screenWidth - 120;
const STAY_CARD_SPACING = 8;
const EVENT_CARD_SPACING = STAY_CARD_SPACING;
const THINGS_CARD_WIDTH = STAY_CARD_WIDTH;
const THINGS_CARD_SPACING = STAY_CARD_SPACING;
// For gallery images in a fixed layout (2 images side by side)
const GALLERY_CARD_GAP = 4; // Minimal gap so previews appear nearly edge-to-edge
const SECTION_HORIZONTAL_MARGIN = 16; // Section's margin from screen edge on each side
const GALLERY_CONTAINER_PADDING = 8; // Trimmed padding to reduce whitespace around images
const SECTION_VERTICAL_GAP = 3; // Unified spacing between stacked sections

// Calculate available width for cards inside the gallery section
// We account for the section's horizontal margins and container padding
const AVAILABLE_GALLERY_WIDTH =
  screenWidth - SECTION_HORIZONTAL_MARGIN * 2 - GALLERY_CONTAINER_PADDING * 2;

// Make the cards slightly smaller to ensure proper spacing
const GALLERY_CARD_WIDTH = (AVAILABLE_GALLERY_WIDTH - GALLERY_CARD_GAP) / 2;

interface RouteParams {
  destinationId: string;
}

interface WeatherDay {
  day: string;
  icon: string;
  high: number;
  low: number;
}

export default function DestinationDetail() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { destinationId } = route.params as RouteParams;
  const shouldUseWebSlideTransition = Platform.OS === 'web' && destinationId === 'harare';

  const galleryCardBackground = colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA';

  const renderWithTransition = useCallback(
    (children: React.ReactNode, keySuffix: string) =>
      shouldUseWebSlideTransition ? (
        <WebSlideTransition key={`${destinationId}-${keySuffix}`}>{children}</WebSlideTransition>
      ) : (
        children
      ),
    [destinationId, shouldUseWebSlideTransition]
  );

  // Dynamic pill colors (slightly translucent on both modes)
  const pillBg = colorScheme === 'dark' ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)';
  const pillTextColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const headerPatternOffset = insets.top + 96;

  // State and animations
  const [isFavorited, setIsFavorited] = useState(false);
  const [heartScale] = useState(new Animated.Value(1));
  const [isLoading, setIsLoading] = useState(false);
  // Local favorites for list cards (match Featured behavior)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const heartScales = useRef<Record<string, Animated.Value>>({}).current;
  const getHeartScale = useCallback(
    (key: string) => {
      if (!heartScales[key]) heartScales[key] = new Animated.Value(1);
      return heartScales[key];
    },
    [heartScales]
  );
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Helper function to get destination image
  const getDestinationImageUri = useCallback((dest: BackendDestination) => {
    return (
      pickBestImageUrl(dest.image_url, Array.isArray(dest.images) ? dest.images : undefined) ||
      `https://picsum.photos/800/500?random=${dest.id.slice(-4)}`
    );
  }, []);

  // State for database destination
  const [destination, setDestination] = useState<BackendDestination | null>(null);
  const [forecast, setForecast] = useState<WeatherDay[] | null>(null);

  // Fetch destination from database
  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const { data, error: fetchError } = await destinationsService.getById(destinationId);

        if (fetchError || !data) {
          console.error('❌ Error fetching destination:', fetchError);
          router.back();
          return;
        }

        console.log('✅ Destination loaded from database:', data.name);
        setDestination(data);

        // Fetch real weather for this destination
        if (data.location) {
          weatherService
            .getCurrentWeather(data.location)
            .then(weather => {
              if (weather) {
                setDestination(prev => (prev ? { ...prev, weather: weather } : null));
              }
            })
            .catch(err => console.log('⚠️ Weather fetch failed:', err));

          // Fetch 5-day forecast
          weatherService
            .getForecast(data.location)
            .then(forecastData => {
              if (forecastData) {
                setForecast(forecastData);
              }
            })
            .catch(err => {
              console.log('⚠️ Forecast fetch failed:', err);
            });
        }
      } catch (err) {
        console.error('❌ Failed to fetch destination:', err);
        router.back();
      }
    };

    fetchDestination();
  }, [destinationId]);

  const handleToggleFavorite = useCallback(() => {
    // Match Featured: selection haptic + quick bump then spring
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    // Toggle local state and persist to DB
    setIsFavorited(prev => {
      const newState = !prev;
      try {
        // Persist using global favorite util for the destination
        // Destination IDs are stable and treated as 'destination' type in DB
        toggleFavoriteUtil(destinationId, 'destination');
      } catch (err) {
        // noop - persistence errors handled inside utility
      }
      return newState;
    });
  }, [heartScale]);

  const handleShare = useCallback(async () => {
    if (!destination) {
      return;
    }

    try {
      await Share.share({
        message: `Check out ${destination.name} in Zimbabwe! ${destination.weather}`,
        title: `Visit ${destination.name}`,
        url: 'https://off2zim.app',
      });
    } catch {
      // noop
    }
  }, [destination]);

  // Toggle favorite for cards (match Featured)
  const toggleFavorite = useCallback(
    (name: string) => {
      setFavorites(prev => ({ ...prev, [name]: !prev[name] }));
      const scale = getHeartScale(name);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();
    },
    [getHeartScale]
  );

  // Handle stay navigation
  const handleStayPress = useCallback(
    (item: (typeof staysData)[0]) => {
      const resolvedStay = item.id ? getStayById(item.id) : undefined;

      let stayPayload: Stay;

      if (resolvedStay) {
        const cloned = cloneStay(resolvedStay);
        stayPayload = {
          ...cloned,
          imageUrl: cloned.imageUrl ?? cloned.images[0],
        };
      } else {
        const fallbackImages = [
          `https://picsum.photos/800/600?random=${item.imageRandom}`,
          `https://picsum.photos/800/600?random=${item.imageRandom + 100}`,
          `https://picsum.photos/800/600?random=${item.imageRandom + 200}`,
          `https://picsum.photos/800/600?random=${item.imageRandom + 300}`,
          `https://picsum.photos/800/600?random=${item.imageRandom + 400}`,
          `https://picsum.photos/800/600?random=${item.imageRandom + 500}`,
        ];

        stayPayload = {
          id: item.id,
          name: item.name,
          location: item.location,
          description: `Experience luxury and comfort at ${item.name}, located in the heart of ${item.location}. This premium accommodation offers world-class amenities and exceptional service to make your stay unforgettable.`,
          price: Math.floor(Math.random() * 200) + 100,
          perNight: true,
          rating: item.rating,
          imageUrl: fallbackImages[0],
          images: fallbackImages,
          amenities: [
            'WiFi',
            'Pool',
            'Gym',
            'Restaurant',
            'Spa',
            'Parking',
            'Concierge',
            'Room Service',
          ],
          host: {
            name: 'Host Manager',
            avatar: `https://picsum.photos/100/100?random=${item.imageRandom + 50}`,
            joinedYear: '2018',
            responseRate: '95%',
            responseTime: '2 hours',
          },
          details: {
            guests: 4,
            bedrooms: 2,
            beds: 2,
            bathrooms: 2,
          },
        };
      }

      navigateToStayProfile(stayPayload, {
        source: 'destination-detail',
        destinationId,
        location: stayPayload.location,
      });
    },
    [destinationId]
  );

  // Derived data: simple gallery + location-linked sections
  const galleryImages = useMemo(() => {
    const resolved: string[] = [];

    if (destination) {
      const primary = pickBestImageUrl(
        destination.image_url,
        Array.isArray(destination.images) ? destination.images : undefined
      );

      if (primary) {
        resolved.push(primary);
      }

      if (Array.isArray(destination.images)) {
        destination.images.forEach(image => {
          const normalized = normalizeStorageImageUrl(image);
          if (normalized && !resolved.includes(normalized)) {
            resolved.push(normalized);
          }
        });
      }
    }

    if (resolved.length === 0) {
      const seed = destination?.id || 'default';
      return Array.from({ length: 8 }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/800/600`);
    }

    if (resolved.length < 8) {
      const seed = destination?.id || 'default';
      let i = 0;
      while (resolved.length < 8) {
        const fallback = `https://picsum.photos/seed/${seed}-${i}/800/600`;
        if (!resolved.includes(fallback)) {
          resolved.push(fallback);
        }
        i += 1;
      }
    }

    return resolved;
  }, [destination]);

  const normalize = (s: string) => s?.toLowerCase().trim() ?? '';
  const locName = normalize(destination?.name || '');

  // Include fuzzy match (e.g., "Harare Gardens" includes "Harare", Mutare within Eastern Highlands)
  const isMatch = (place: string) => {
    const p = normalize(place);
    if (!p || !locName) return false;
    if (p.includes(locName) || locName.includes(p)) return true;
    if (
      locName.includes('eastern highlands') &&
      (p.includes('mutare') || p.includes('nyanga') || p.includes('chimanimani'))
    )
      return true;
    if (locName.includes('great zimbabwe') && p.includes('masvingo')) return true;
    return false;
  };

  const staysForLocation = staysData.filter(s => isMatch(s.location));
  const eventsForLocation = upcomingEventsData.filter(e => isMatch(e.location));
  const thingsForLocation = thingsToDoData.filter(t => isMatch(t.location));

  // Timed animation for soft/slow reveal
  const TITLE_HEIGHT = 56;
  const TITLE_PADDING_BOTTOM = 6;
  const headerReveal = scrollY.interpolate({
    inputRange: [0, 24, 72],
    outputRange: [0, 0.25, 1],
    extrapolate: 'clamp',
  });
  const titleOpacity = headerReveal;
  const titleHeight = headerReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TITLE_HEIGHT],
  });
  const titlePaddingBottom = headerReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TITLE_PADDING_BOTTOM],
  });
  const titleTranslateY = headerReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  // Toggle header expanded state only after scrolling begins
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      setShowHeaderTitle(value > 5);
    });
    return () => {
      scrollY.removeListener(id);
    };
  }, [scrollY]);

  // Header animation is now driven directly by scroll interpolation, so no extra timing effect is required.

  // Reset scroll position when destination changes
  useEffect(() => {
    // Set loading state briefly to prevent flash of old content
    setIsLoading(true);

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100); // Brief delay to prevent content flash

    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
      // Also reset the animated value
      scrollY.setValue(0);
    }

    return () => clearTimeout(timer);
  }, [destinationId, scrollY]);

  // Show nothing until destination loads (no loading text)
  if (!destination) {
    return null;
  }

  const heroPillOpacity = scrollY.interpolate({
    inputRange: [0, 20, 60],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  // Show loading state briefly to prevent old content flash
  if (isLoading) {
    return (
      <>
        <PushScreenOptions />
        <IOSScreenWrapper>
          {renderWithTransition(
            <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
              <View>
                <CustomHeader
                  showLogo={true}
                  leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }}
                />
              </View>
            </ThemedView>,
            'loading'
          )}
        </IOSScreenWrapper>
      </>
    );
  }

  return (
    <>
      <PushScreenOptions />
      <IOSScreenWrapper>
        {renderWithTransition(
          <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
            <WallpaperPattern offsetTop={headerPatternOffset} />
            <View>
              <CustomHeader
                showLogo={true}
                leftAction={{ icon: 'chevron-back', onPress: () => navigation.goBack() }}
              />
              {/* Animated title section below header */}
              <Animated.View
                style={[
                  styles.titleSection,
                  {
                    height: titleHeight,
                    paddingBottom: titlePaddingBottom,
                    opacity: titleOpacity,
                    backgroundColor: colorScheme === 'dark' ? '#000000' : '#f2f2f7',
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.heroTopBar,
                    {
                      opacity: titleOpacity,
                      transform: [{ translateY: titleTranslateY }],
                    },
                  ]}
                >
                  <LocationPill
                    label={destination.name}
                    backgroundColor={pillBg}
                    iconColor="#FF3B30"
                    iconSize={14}
                    iconBackgroundColor={colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF'}
                    lightTextColor={pillTextColor}
                    darkTextColor={pillTextColor}
                    style={styles.heroLocationPill}
                  />

                  <View style={styles.heroActionPills}>
                    <IconActionButton
                      variant="like"
                      isActive={isFavorited}
                      onPress={handleToggleFavorite}
                      accessibilityRole="button"
                      accessibilityLabel={`Favorite ${destination.name} ${isFavorited ? 'selected' : 'not selected'}`}
                      iconContainerStyle={{ transform: [{ scale: heartScale }] }}
                    />
                    <IconActionButton
                      variant="share"
                      style={styles.heroActionSpacing}
                      onPress={handleShare}
                      accessibilityRole="button"
                      accessibilityLabel={`Share ${destination.name}`}
                    />
                  </View>
                </Animated.View>
              </Animated.View>
            </View>

            {/* Content area with scroll controlling parallax */}
            <Animated.ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              bounces={false}
              alwaysBounceVertical={false}
              overScrollMode="never"
              contentContainerStyle={{ paddingTop: 0 }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: false,
              })}
            >
              {/* Hero with parallax stretch (now scrollable) */}
              <View style={styles.imageContainer}>
                <Animated.Image
                  source={{
                    uri: getDestinationImageUri(destination),
                    cache: 'force-cache',
                    headers: {
                      'Cache-Control': 'max-age=86400',
                    },
                  }}
                  style={styles.heroImage}
                  resizeMode="cover"
                  fadeDuration={200}
                />

                {/* Top overlay: destination pill + action buttons */}
                <Animated.View
                  style={[styles.heroTopOverlay, { opacity: heroPillOpacity }]}
                  pointerEvents={showHeaderTitle ? 'none' : 'auto'}
                >
                  <View style={styles.heroTopBar}>
                    <LocationPill
                      label={destination.name}
                      backgroundColor={pillBg}
                      iconColor="#FF3B30"
                      iconSize={14}
                      iconBackgroundColor={colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF'}
                      lightTextColor={pillTextColor}
                      darkTextColor={pillTextColor}
                      style={styles.heroLocationPill}
                    />

                    <View style={styles.heroActionPills}>
                      <IconActionButton
                        variant="like"
                        isActive={isFavorited}
                        onPress={handleToggleFavorite}
                        accessibilityRole="button"
                        accessibilityLabel={`Favorite ${destination.name} ${isFavorited ? 'selected' : 'not selected'}`}
                        iconContainerStyle={{ transform: [{ scale: heartScale }] }}
                      />

                      <IconActionButton
                        variant="share"
                        style={styles.heroActionSpacing}
                        onPress={handleShare}
                        accessibilityRole="button"
                        accessibilityLabel={`Share ${destination.name}`}
                      />
                    </View>
                  </View>
                </Animated.View>

                {/* Minimal overlay: weather forecast */}
                <Animated.View style={[styles.imageOverlayMinimal, { opacity: heroPillOpacity }]}>
                  {/* Real 5-Day Weather Forecast */}
                  {forecast && forecast.length > 0 && (
                    <View
                      style={[
                        styles.weatherCombinedPill,
                        colorScheme === 'dark'
                          ? styles.weatherCombinedPillDark
                          : styles.weatherCombinedPillLight,
                      ]}
                    >
                      <View style={styles.weatherForecastRow}>
                        {forecast.map((day, index) => (
                          <View
                            key={index}
                            style={[
                              styles.weatherPill,
                              colorScheme === 'dark'
                                ? styles.weatherCombinedPillDark
                                : styles.weatherCombinedPillLight,
                            ]}
                          >
                            <ThemedText style={[styles.pillDayText, { color: pillTextColor }]}>
                              {day.day}
                            </ThemedText>
                            <ThemedText style={styles.pillWeatherIcon}>{day.icon}</ThemedText>
                            <View style={styles.pillTempRow}>
                              <ThemedText style={styles.pillHighText}>{day.high}°</ThemedText>
                              <ThemedText style={styles.pillLowText}>{day.low}°</ThemedText>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </Animated.View>
              </View>

              <View style={styles.content}>
                {/* About section removed */}

                {/* Gallery (2 cards: first image + +N overlay) */}
                {galleryImages.length > 0 && (
                  <View
                    style={[
                      styles.section,
                      {
                        marginBottom: SECTION_VERTICAL_GAP,
                        marginHorizontal: SECTION_HORIZONTAL_MARGIN, // Use consistent variable
                        paddingHorizontal: 0, // No additional padding inside
                        borderRadius: 16, // Restored original border radius
                        backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8, // Restored original shadow radius
                        elevation: 0, // Restored original elevation
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <ProfileGalleryHeader
                      onPress={() =>
                        router.push({
                          pathname: '/gallery',
                          params: {
                            location: destination.name,
                            title: destination.name,
                            galleryType: 'location',
                            contextImage: galleryImages[0],
                            images: JSON.stringify(galleryImages),
                            destinationId: destinationId,
                          },
                        })
                      }
                    />
                    <View style={styles.galleryContainer}>
                      <View style={styles.galleryRow}>
                        {/* First Image */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.galleryCardContainer,
                            { backgroundColor: galleryCardBackground },
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: '/gallery',
                              params: {
                                location: destination.name,
                                title: destination.name,
                                galleryType: 'location',
                                contextImage: galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                destinationId: destinationId, // Pass the destinationId for returning back
                              },
                            })
                          }
                        >
                          <Image
                            source={{ uri: galleryImages[0] }}
                            style={styles.galleryImageCard}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>

                        {/* Second Image with Overlay */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.galleryCardContainer,
                            { backgroundColor: galleryCardBackground },
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: '/gallery',
                              params: {
                                location: destination.name,
                                title: destination.name,
                                galleryType: 'location',
                                contextImage: galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                destinationId: destinationId, // Pass the destinationId for returning back
                              },
                            })
                          }
                        >
                          <Image
                            source={{ uri: galleryImages[1] || galleryImages[0] }}
                            style={styles.galleryImageCard}
                            resizeMode="cover"
                          />
                          {galleryImages.length > 1 && (
                            <View style={styles.galleryOverlayMask}>
                              <ThemedText style={styles.galleryOverlayText}>
                                {`+${Math.max(galleryImages.length - 1, 0)}`}
                              </ThemedText>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Stays (match Featured StayCard) */}
                {staysForLocation.length > 0 && (
                  <View
                    style={[
                      styles.section,
                      {
                        marginBottom: SECTION_VERTICAL_GAP,
                        marginHorizontal: SECTION_HORIZONTAL_MARGIN, // Use consistent variable
                        paddingHorizontal: 0,
                        borderRadius: 16,
                        backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 0,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <View style={styles.sectionHeader}>
                      <ThemedText type="sectionTitle" style={styles.sectionTitle}>
                        Stays
                      </ThemedText>
                      <ViewAllButton
                        onPress={() =>
                          router.push({
                            pathname: '/destination-stays',
                            params: {
                              location: destination?.name,
                              destinationId: destination?.id,
                            },
                          })
                        }
                      />
                    </View>
                    <FlatList
                      data={staysForLocation}
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
                      keyExtractor={item => item.id}
                      renderItem={({ item: s }) => {
                        const pillBgLocal =
                          colorScheme === 'dark' ? '#1C1C1E' : 'rgba(255,255,255,0.8)';
                        const pillTextLocal = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
                        const pillIconBackground = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
                        const scale = getHeartScale(s.name);
                        const isFav = isFavoritedUtil(s.id);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={styles.stayCard}
                            onPress={() => handleStayPress(s)}
                          >
                            <Image
                              source={{
                                uri: `https://picsum.photos/600/200?random=${s.imageRandom}`,
                              }}
                              style={styles.destinationImage}
                              resizeMode="cover"
                            />
                            <IconActionButton
                              variant="like"
                              isActive={isFav}
                              style={styles.heartContainer}
                              onPress={() => {
                                // local animation/state
                                toggleFavorite(s.id);
                                // persist to DB
                                toggleFavoriteUtil(s.id, 'stay');
                              }}
                              hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={`Favorite ${s.name} ${isFav ? 'selected' : 'not selected'}`}
                              iconContainerStyle={{ transform: [{ scale }] }}
                            />
                            <View style={styles.stayInfoContainer}>
                              <View style={styles.stayTopRow}>
                                <RatingPill
                                  value={s.rating}
                                  backgroundColor={pillBgLocal}
                                  iconBackgroundColor={pillIconBackground}
                                  lightTextColor={pillTextLocal}
                                  darkTextColor={pillTextLocal}
                                />
                              </View>
                              <View style={styles.stayOverlay}>
                                <ThemedText style={styles.destinationName} numberOfLines={1}>
                                  {s.name}
                                </ThemedText>
                                <View style={styles.stayMetaRow}>
                                  <LocationPill
                                    label={s.location}
                                    backgroundColor={pillBgLocal}
                                    iconBackgroundColor={pillIconBackground}
                                    lightTextColor={pillTextLocal}
                                    darkTextColor={pillTextLocal}
                                    variant="compact"
                                  />
                                  <View
                                    style={[
                                      styles.pillTag,
                                      styles.infoPill,
                                      {
                                        backgroundColor: pillBgLocal,
                                        marginLeft: 'auto',
                                      },
                                    ]}
                                  >
                                    <FontAwesome6
                                      name="wifi"
                                      size={12}
                                      color={pillTextLocal}
                                      style={styles.pillIcon}
                                    />
                                    <FontAwesome6
                                      name="dumbbell"
                                      size={12}
                                      color={pillTextLocal}
                                      style={styles.pillIcon}
                                    />
                                    <FontAwesome6 name="utensils" size={12} color={pillTextLocal} />
                                  </View>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                )}

                {/* Upcoming events (match Featured EventCard) */}
                {eventsForLocation.length > 0 && (
                  <View
                    style={[
                      styles.section,
                      {
                        marginBottom: SECTION_VERTICAL_GAP,
                        marginHorizontal: SECTION_HORIZONTAL_MARGIN, // Use consistent variable
                        paddingHorizontal: 0,
                        borderRadius: 16,
                        backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 0,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <View style={styles.sectionHeader}>
                      <ThemedText type="sectionTitle" style={styles.sectionTitle}>
                        Upcoming Events
                      </ThemedText>
                      <ViewAllButton onPress={() => navigation.navigate('Events' as never)} />
                    </View>
                    <FlatList
                      data={eventsForLocation}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingLeft: EVENT_CARD_SPACING,
                        paddingRight: 0,
                        paddingBottom: EVENT_CARD_SPACING,
                      }}
                      style={styles.destinationsScrollView}
                      decelerationRate="fast"
                      snapToInterval={EVENT_CARD_WIDTH + EVENT_CARD_SPACING}
                      snapToAlignment="start"
                      keyExtractor={item => item.id}
                      renderItem={({ item: e }) => {
                        const pillBgLocal =
                          colorScheme === 'dark' ? '#1C1C1E' : 'rgba(255,255,255,0.8)';
                        const pillTextLocal = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
                        const pillIconBackground = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
                        const scale = getHeartScale(e.name);
                        const isFav = isFavoritedUtil(e.id);
                        const handleEventPress = () => {
                          router.push({
                            pathname: '/event-profile',
                            params: {
                              eventId: e.id,
                              eventName: e.name,
                              eventLocation: e.location,
                              eventVenue: e.venue,
                            },
                          });
                        };
                        return (
                          <TouchableOpacity
                            key={e.id}
                            style={styles.eventCard}
                            onPress={handleEventPress}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{
                                uri: `https://picsum.photos/300/200?random=${e.imageRandom}`,
                              }}
                              style={styles.destinationImage}
                              resizeMode="cover"
                            />
                            <IconActionButton
                              variant="like"
                              isActive={isFav}
                              style={styles.heartContainer}
                              onPress={() => {
                                toggleFavorite(e.id);
                                toggleFavoriteUtil(e.id, 'event');
                              }}
                              hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={`Favorite ${e.name} ${isFav ? 'selected' : 'not selected'}`}
                              iconContainerStyle={{ transform: [{ scale }] }}
                            />
                            <View style={styles.eventInfoContainer}>
                              <View style={styles.eventTopRow}>
                                <RatingPill
                                  value={e.rating ?? 'New'}
                                  backgroundColor={pillBgLocal}
                                  iconBackgroundColor={pillIconBackground}
                                  lightTextColor={pillTextLocal}
                                  darkTextColor={pillTextLocal}
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
                                  {e.name}
                                </ThemedText>
                                <View style={styles.eventMetaRow}>
                                  <LocationPill
                                    label={e.location}
                                    backgroundColor={pillBgLocal}
                                    iconBackgroundColor={pillIconBackground}
                                    lightTextColor={pillTextLocal}
                                    darkTextColor={pillTextLocal}
                                    variant="compact"
                                  />
                                  <DateTimePill
                                    label={`${new Date(e.date)
                                      .toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                      })
                                      .replace(/,/g, '')} · ${e.time}`}
                                    backgroundColor={pillBgLocal}
                                    iconBackgroundColor={pillIconBackground}
                                    lightTextColor={pillTextLocal}
                                    darkTextColor={pillTextLocal}
                                    style={{ marginLeft: 'auto' }}
                                  />
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                )}

                {/* Things to do (match Featured ThingsCard) */}
                {thingsForLocation.length > 0 && (
                  <View
                    style={[
                      styles.section,
                      {
                        marginBottom: SECTION_VERTICAL_GAP,
                        marginHorizontal: SECTION_HORIZONTAL_MARGIN, // Use consistent variable
                        paddingHorizontal: 0,
                        borderRadius: 16,
                        backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 0,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <View style={styles.sectionHeader}>
                      <ThemedText type="sectionTitle" style={styles.sectionTitle}>
                        Things To Do
                      </ThemedText>
                      <ViewAllButton onPress={() => navigation.navigate('ThingsToDo' as never)} />
                    </View>
                    <FlatList
                      data={thingsForLocation}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingLeft: THINGS_CARD_SPACING,
                        paddingRight: 0,
                        paddingBottom: THINGS_CARD_SPACING,
                      }}
                      style={styles.destinationsScrollView}
                      decelerationRate="fast"
                      snapToInterval={THINGS_CARD_WIDTH + THINGS_CARD_SPACING}
                      snapToAlignment="start"
                      keyExtractor={item => item.id}
                      renderItem={({ item: t }) => {
                        const pillBgLocal =
                          colorScheme === 'dark' ? '#1C1C1E' : 'rgba(255,255,255,0.8)';
                        const pillTextLocal = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
                        const pillIconBackground = colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF';
                        const status = getActivityStatus(new Date(), {
                          operatingHours: t.operatingHours,
                          durationHours: t.durationHours,
                        });
                        const statusColor = activityStatusColor(status);
                        const scale = getHeartScale(t.name);
                        const isFav = isFavoritedUtil(t.id);
                        const handleActivityPress = () => {
                          router.push({
                            pathname: '/activity-profile',
                            params: {
                              activityId: t.id,
                              activityName: t.name,
                              activityLocation: t.location,
                            },
                          });
                        };
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.eventCard, styles.thingsCard]}
                            onPress={handleActivityPress}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{
                                uri: `https://picsum.photos/300/200?random=${t.imageRandom}`,
                              }}
                              style={styles.destinationImage}
                              resizeMode="cover"
                            />
                            <IconActionButton
                              variant="like"
                              isActive={isFav}
                              style={styles.heartContainer}
                              onPress={() => {
                                toggleFavorite(t.id);
                                toggleFavoriteUtil(t.id, 'activity');
                              }}
                              hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={`Favorite ${t.name} ${isFav ? 'selected' : 'not selected'}`}
                              iconContainerStyle={{ transform: [{ scale }] }}
                            />
                            <View style={styles.eventInfoContainer}>
                              <View style={styles.eventTopRow}>
                                <RatingPill
                                  value={t.rating ?? 'New'}
                                  backgroundColor={pillBgLocal}
                                  iconBackgroundColor={pillIconBackground}
                                  lightTextColor={pillTextLocal}
                                  darkTextColor={pillTextLocal}
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
                                  {t.name}
                                </ThemedText>
                                <View style={styles.eventMetaRow}>
                                  <LocationPill
                                    label={t.location}
                                    backgroundColor={pillBgLocal}
                                    iconBackgroundColor={pillIconBackground}
                                    lightTextColor={pillTextLocal}
                                    darkTextColor={pillTextLocal}
                                    variant="compact"
                                  />
                                  <StatusPill
                                    label={status}
                                    backgroundColor={pillBgLocal}
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
                      }}
                    />
                  </View>
                )}
              </View>
            </Animated.ScrollView>
          </ThemedView>,
          'content'
        )}
      </IOSScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerTitleOverlay: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    height: 28,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 9,
  },
  headerTitleText: { fontSize: responsiveFontSize(18), fontWeight: '700', textAlign: 'left' },
  titleSection: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  },
  titleSectionText: { fontSize: responsiveFontSize(18), fontWeight: '700', textAlign: 'left' },
  scrollView: { flex: 1 },
  imageContainer: { position: 'relative', height: 320, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heartContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageOverlayMinimal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 8,
  },
  heroTopOverlay: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroLocationPill: {
    flexShrink: 1,
    maxWidth: '65%',
  },
  heroActionPills: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroActionSpacing: {
    marginLeft: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  destinationTitle: {
    fontSize: responsiveFontSize(28),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  pillIcon: { marginRight: 4 },
  weatherContainer: { alignSelf: 'flex-start' },
  weatherText: { fontSize: responsiveFontSize(16), color: '#FFFFFF', opacity: 0.9 },
  weatherPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
  },
  pillDayText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  pillWeatherIcon: {
    fontSize: responsiveFontSize(20),
    marginVertical: 2,
  },
  pillTempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pillHighText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
  },
  pillLowText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    opacity: 0.7,
  },
  // Combined minimal weather pill
  weatherCombinedPill: {
    alignSelf: 'stretch',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  weatherCombinedPillLight: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  weatherCombinedPillDark: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  currentWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  currentWeatherText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  weatherForecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  content: { paddingHorizontal: 0, paddingVertical: 20, gap: 16 },
  // Section header with View All (match Featured)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12, // Adjusted for spacing between header and content
    paddingHorizontal: 16, // Match gallery container padding
    paddingTop: 16,
  },
  destinationsScrollView: { width: '100%', paddingHorizontal: 0 },
  destinationsScrollContent: { paddingBottom: 0 }, // Remove extra bottom padding
  section: { marginBottom: SECTION_VERTICAL_GAP, paddingBottom: 0 }, // Removed paddingBottom to let galleryContainer control the spacing
  sectionTitle: { marginBottom: 0 },
  highlightItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  highlightIcon: { marginRight: 8 },
  highlightText: { fontSize: responsiveFontSize(16), opacity: 0.8 },
  // Horizontal lists and cards (match Featured)
  hList: { paddingRight: 8 },
  stayCard: {
    width: STAY_CARD_WIDTH,
    marginRight: STAY_CARD_SPACING,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
    position: 'relative',
  },
  eventCard: {
    width: EVENT_CARD_WIDTH,
    marginRight: EVENT_CARD_SPACING,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
    position: 'relative',
  },
  thingsCard: {
    width: THINGS_CARD_WIDTH,
    marginRight: THINGS_CARD_SPACING,
  },
  destinationImage: { width: '100%', height: 200 },
  // Gallery specialized cards
  galleryContainer: {
    width: '100%',
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
    paddingTop: 0, // Remove top padding to reduce space between header and content
  },
  galleryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
    gap: GALLERY_CARD_GAP,
  },
  galleryCardContainer: {
    width: GALLERY_CARD_WIDTH,
    borderRadius: 12, // Restored original border radius
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E5EA',
    flex: 1,
  },
  galleryImageCard: { width: '100%', aspectRatio: 3 / 2 }, // Slightly taller previews for better detail
  galleryOverlayMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  galleryOverlayText: {
    fontSize: responsiveFontSize(28),
    lineHeight: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: true,
    textAlignVertical: 'center',
    paddingTop: 2,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  stayOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  stayTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 10,
  },
  destinationName: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    textAlign: 'left',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  destinationWeather: {
    fontSize: responsiveFontSize(12),
    textAlign: 'left',
    color: '#E0E0E0',
    marginTop: 2,
    fontFamily: Fonts.medium,
  },
  stayMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  infoPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  eventOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 10,
  },
});
