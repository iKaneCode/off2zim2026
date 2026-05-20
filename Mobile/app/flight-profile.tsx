import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader } from '@/components/CustomHeader';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faHeart as solidHeart,
  faShareFromSquare,
  faChair,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';
import * as Haptics from 'expo-haptics';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import {
  isFavorited as isFavoritedUtil,
  toggleFavorite as toggleFavoriteUtil,
} from '@/utils/favoritesUtils';
import {
  ViewAllButton,
  WebSlideTransition,
  LocationPill,
  BusSearchForm,
  ProviderHeroCard,
} from '@/components';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 340;
const SECTION_HORIZONTAL_MARGIN = 16;

// Gallery constants (matching stay-profile)
const GALLERY_CARD_GAP = 4; // Minimal gap so previews appear nearly edge-to-edge
const GALLERY_CONTAINER_PADDING = 8; // Trimmed padding to reduce whitespace around images
const AVAILABLE_GALLERY_WIDTH =
  width - SECTION_HORIZONTAL_MARGIN * 2 - GALLERY_CONTAINER_PADDING * 2;
const GALLERY_CARD_WIDTH = (AVAILABLE_GALLERY_WIDTH - GALLERY_CARD_GAP) / 2;

// Helper function to get appropriate icon for flight features
const getFlightFeatureIcon = (feature: string): keyof typeof Ionicons.glyphMap => {
  const featureLower = feature.toLowerCase();

  if (featureLower.includes('wifi')) return 'wifi';
  if (
    featureLower.includes('entertainment') ||
    featureLower.includes('tv') ||
    featureLower.includes('screen')
  )
    return 'tv-outline';
  if (
    featureLower.includes('meal') ||
    featureLower.includes('food') ||
    featureLower.includes('dining')
  )
    return 'restaurant-outline';
  if (featureLower.includes('baggage') || featureLower.includes('luggage'))
    return 'briefcase-outline';
  if (
    featureLower.includes('seat') ||
    featureLower.includes('reclin') ||
    featureLower.includes('comfort')
  )
    return 'accessibility-outline';
  if (
    featureLower.includes('usb') ||
    featureLower.includes('charging') ||
    featureLower.includes('power')
  )
    return 'battery-charging-outline';
  if (featureLower.includes('priority') || featureLower.includes('boarding')) return 'flag-outline';
  if (featureLower.includes('lounge') || featureLower.includes('access')) return 'business-outline';
  if (featureLower.includes('extra') || featureLower.includes('legroom')) return 'expand-outline';
  if (featureLower.includes('beverage') || featureLower.includes('drink')) return 'cafe-outline';

  // Default fallback
  return 'checkmark-circle-outline';
};

export default function FlightProfile() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();

  const flightName = Array.isArray(params.flightName)
    ? params.flightName[0]
    : params.flightName || 'Air Zimbabwe';
  const normalizedFlightId = flightName.toLowerCase().replace(/\s+/g, '-');

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const galleryCardBackground = isDark ? '#2C2C2E' : '#E5E5EA';

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const calendarOpacity = useRef(new Animated.Value(1)).current;
  const returnCalendarOpacity = useRef(new Animated.Value(1)).current;

  const [isFavorited, setIsFavorited] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState<'oneWay' | 'return'>('oneWay');
  const [selectedFromLocation, setSelectedFromLocation] = useState<string | null>(null);
  const [selectedToLocation, setSelectedToLocation] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedReturnDate, setSelectedReturnDate] = useState<string | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [currentReturnCalendarMonth, setCurrentReturnCalendarMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReturnAnimating, setIsReturnAnimating] = useState(false);
  const panGestureRef = useRef<PanGestureHandler>(null);
  const returnPanGestureRef = useRef<PanGestureHandler>(null);

  const flight = useMemo(
    () => ({
      id: normalizedFlightId,
      name: flightName,
      route: 'Harare → Johannesburg',
      rating: 4.5,
      price: 250,
      images: [
        `https://picsum.photos/800/600?random=${Math.random()}`,
        `https://picsum.photos/800/600?random=${Math.random()}`,
        `https://picsum.photos/800/600?random=${Math.random()}`,
      ],
      description:
        'Experience premium air travel with world-class service and comfort. Our modern aircraft feature state-of-the-art amenities, spacious seating, and exceptional in-flight entertainment to make your journey memorable.',
      destinations: ['Harare', 'Johannesburg', 'Bulawayo', 'Victoria Falls', 'Gweru'],
      features: [
        'WiFi',
        'In-flight Entertainment',
        'Meals Included',
        'Extra Legroom',
        'USB Charging',
        'Priority Boarding',
        'Baggage Allowance',
      ],
      departureTime: '08:00 AM',
      arrivalTime: '10:30 AM',
      duration: '2 hours 30 minutes',
    }),
    [normalizedFlightId, flightName]
  );

  const galleryImages = flight.images;
  const flightDestinations = flight.destinations;

  const handleCallAirline = useCallback(() => {
    console.log('Call airline');
  }, []);

  const handleMessageAirline = useCallback(() => {
    const messageData = {
      id: `flight-${normalizedFlightId || 'unknown'}`,
      name: flight.name || 'Airline',
      message: '',
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isRead: true,
      avatar: flight.name.charAt(0).toUpperCase(),
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent(flight.name)}&size=128&backgroundColor=FF4757`,
      avatarBgColor: isDark ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 71, 87, 0.08)',
      avatarBorderColor: '#FF4757',
      status: 'received' as const,
      isNewConversation: true,
      flightId: normalizedFlightId,
    };

    router.push({
      pathname: '/message-detail',
      params: {
        message: JSON.stringify(messageData),
      },
    });
  }, [flight.name, isDark, normalizedFlightId, router]);

  useEffect(() => {
    if (normalizedFlightId) {
      setIsFavorited(isFavoritedUtil(normalizedFlightId));
    }
  }, [normalizedFlightId]);

  useFocusEffect(
    useCallback(() => {
      if (normalizedFlightId) {
        setIsFavorited(isFavoritedUtil(normalizedFlightId));
      }
    }, [normalizedFlightId])
  );

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const toggleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = toggleFavoriteUtil(normalizedFlightId);
    setIsFavorited(newState);
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Share flight');
  };

  const getDefaultDateDisplay = () => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return 'Select departure date';
  };

  const getDefaultReturnDateDisplay = () => {
    if (selectedReturnDate) {
      const date = new Date(selectedReturnDate);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return 'Select return date';
  };

  const handleTripTypeChange = (type: 'oneWay' | 'return') => {
    if (type === tripType) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTripType(type);

    if (type === 'oneWay') {
      setSelectedReturnDate(null);
    }
  };

  const openFromPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowFromPicker(true);
  };

  const openToPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowToPicker(true);
  };

  const openDepartureDatePicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDatePicker(true);
  };

  const openReturnDatePicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReturnDatePicker(true);
  };

  const incrementPassengers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPassengers(prev => prev + 1);
  };

  const decrementPassengers = () => {
    if (passengers <= 1) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPassengers(prev => Math.max(1, prev - 1));
  };

  const onPanGestureEvent = (event: any) => {
    if (isAnimating) return;

    const { translationX, translationY, velocityX, state } = event.nativeEvent;

    if (state === State.END) {
      const swipeThreshold = 50;
      const velocityThreshold = 500;
      const horizontalRatio = Math.abs(translationX) / (Math.abs(translationY) + 1);

      if (
        horizontalRatio > 1.5 &&
        (Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > velocityThreshold)
      ) {
        const today = new Date();
        const currentMonth = new Date(
          currentCalendarMonth.getFullYear(),
          currentCalendarMonth.getMonth(),
          1
        );
        const isCurrentMonth =
          currentMonth.getFullYear() === today.getFullYear() &&
          currentMonth.getMonth() === today.getMonth();

        if (translationX > 0 || velocityX > 0) {
          if (!isCurrentMonth) {
            navigateMonth('prev');
          }
        } else if (translationX < 0 || velocityX < 0) {
          navigateMonth('next');
        }
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (isAnimating) return;

    setIsAnimating(true);
    Animated.timing(calendarOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentCalendarMonth(prev => {
        const newMonth = new Date(prev);
        newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newMonth;
      });
      Animated.timing(calendarOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    });
  };

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setShowDatePicker(false);

    const [year, month] = dateString.split('-').map(part => Number(part));
    setCurrentReturnCalendarMonth(new Date(year, month - 1, 1));
    setSelectedReturnDate(prev => {
      if (prev && prev < dateString) {
        return null;
      }
      return prev;
    });
  };

  const onReturnPanGestureEvent = (event: any) => {
    if (isReturnAnimating) return;

    const { translationX, translationY, velocityX, state } = event.nativeEvent;

    if (state === State.END) {
      const swipeThreshold = 50;
      const velocityThreshold = 500;
      const horizontalRatio = Math.abs(translationX) / (Math.abs(translationY) + 1);

      if (
        horizontalRatio > 1.5 &&
        (Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > velocityThreshold)
      ) {
        const today = new Date();
        const currentMonth = new Date(
          currentReturnCalendarMonth.getFullYear(),
          currentReturnCalendarMonth.getMonth(),
          1
        );
        const isCurrentMonth =
          currentMonth.getFullYear() === today.getFullYear() &&
          currentMonth.getMonth() === today.getMonth();

        if (translationX > 0 || velocityX > 0) {
          if (!isCurrentMonth) {
            navigateReturnMonth('prev');
          }
        } else if (translationX < 0 || velocityX < 0) {
          navigateReturnMonth('next');
        }
      }
    }
  };

  const navigateReturnMonth = (direction: 'prev' | 'next') => {
    if (isReturnAnimating) return;

    setIsReturnAnimating(true);
    Animated.timing(returnCalendarOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentReturnCalendarMonth(prev => {
        const newMonth = new Date(prev);
        newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newMonth;
      });
      Animated.timing(returnCalendarOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsReturnAnimating(false));
    });
  };

  const handleReturnDateSelect = (dateString: string) => {
    setSelectedReturnDate(dateString);
    setShowReturnDatePicker(false);
  };

  const handleSearchFlights = useCallback(() => {
    setAttemptedSubmit(true);

    if (tripType === 'oneWay') {
      if (!selectedFromLocation || !selectedToLocation || !selectedDate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    } else {
      if (!selectedFromLocation || !selectedToLocation || !selectedDate || !selectedReturnDate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    router.push({
      pathname: '/flight-search',
      params: {
        serviceProvider: flightName,
        fromLocation: selectedFromLocation || '',
        toLocation: selectedToLocation || '',
        departureDate: selectedDate || '',
        returnDate: tripType === 'return' ? selectedReturnDate || '' : '',
        tripType,
        passengers: passengers.toString(),
      },
    });
  }, [
    flightName,
    passengers,
    router,
    selectedDate,
    selectedFromLocation,
    selectedReturnDate,
    selectedToLocation,
    tripType,
  ]);

  return (
    <IOSScreenWrapper>
      <WebSlideTransition>
        <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

          {/* Header section with CustomHeader - exactly like stay-profile - OUTSIDE animation */}
          <View style={[styles.headerArea, { backgroundColor: isDark ? '#000000' : '#f2f2f7' }]}>
            <CustomHeader
              showLogo={true}
              leftAction={{
                icon: 'chevron-back',
                onPress: handleGoBack,
              }}
              style={{ marginBottom: 0 }}
            />
          </View>

          {/* Content with smooth fade-in animation */}
          <Animated.View style={[{ flex: 1 }, { opacity: opacityAnim }]}>
            {/* Single Image (no scrolling) with parallax effect */}
            <View style={[styles.galleryContainer, { backgroundColor: '#000000' }]}>
              <Animated.Image
                source={{ uri: flight.images[0] }}
                style={[
                  styles.galleryImage,
                  {
                    transform: [
                      {
                        translateY: scrollY.interpolate({
                          inputRange: [-200, 0],
                          outputRange: [50, 0], // Reduced movement for less zoom effect
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scale: scrollY.interpolate({
                          inputRange: [-200, 0],
                          outputRange: [1.02, 1], // Minimal scale for very subtle effect
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
                resizeMode="cover"
              />
            </View>

            {/* Content sheet that overlays the image */}
            <ScrollView
              ref={scrollViewRef}
              style={[styles.contentSheet, { backgroundColor: 'transparent' }]}
              contentContainerStyle={{
                paddingTop: HEADER_HEIGHT - 120,
              }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: false,
              })}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  backgroundColor: isDark ? '#000000' : '#f2f2f7',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingTop: 32,
                }}
              >
                {/* Wallpaper Pattern Background */}
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      height: 2000,
                      borderTopLeftRadius: 32,
                      borderTopRightRadius: 32,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <WallpaperPattern offsetTop={0} unlimited={true} height={2000} />
                </View>

                {/* Title and rating - standalone section */}
                <View
                  style={[
                    styles.titleSection,
                    {
                      backgroundColor: 'transparent',
                      marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                      marginBottom: 0,
                      borderRadius: 0,
                      shadowOpacity: 0,
                      elevation: 0,
                      paddingHorizontal: 0,
                      paddingTop: 0,
                      paddingBottom: 20,
                      marginTop: -10,
                    },
                  ]}
                >
                  <ProviderHeroCard
                    title={flight.name}
                    rating={flight.rating}
                    reviewsText="• 287 reviews"
                    onFavoritePress={toggleFavorite}
                    onSharePress={handleShare}
                    isFavorited={isFavorited}
                    onCallPress={handleCallAirline}
                    onMessagePress={handleMessageAirline}
                    ratingAlign="right"
                  />
                </View>

                {/* Destinations Card */}
                <View
                  style={[
                    styles.section,
                    {
                      marginTop: 0,
                      marginBottom: 24,
                      marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                      paddingHorizontal: 0,
                      borderRadius: 16,
                      backgroundColor: cardBackground,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 0,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <View style={styles.accessibilitySection}>
                    <ThemedText style={styles.sectionTitle}>Destinations</ThemedText>
                    <View style={styles.accessibilityPillsContainer}>
                      {flight.destinations.map(destination => (
                        <LocationPill
                          key={`${flight.id}-${destination}`}
                          label={destination}
                          backgroundColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)'}
                          variant="compact"
                        />
                      ))}
                    </View>
                  </View>
                </View>

                {/* Gallery (2 cards: first image + +N overlay) */}
                {galleryImages.length > 0 && (
                  <View
                    style={[
                      styles.section,
                      {
                        marginBottom: 24,
                        marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                        paddingHorizontal: 0,
                        borderRadius: 16,
                        backgroundColor: cardBackground,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        elevation: 0,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <View style={styles.sectionHeader}>
                      <ThemedText style={styles.sectionTitle}>Gallery</ThemedText>
                      <ViewAllButton
                        onPress={() =>
                          router.push({
                            pathname: '/gallery',
                            params: {
                              location: flight.name,
                              title: flight.name,
                              galleryType: 'provider',
                              contextImage: flight.images[0] || galleryImages[0],
                              images: JSON.stringify(galleryImages),
                              flightId: normalizedFlightId,
                            },
                          })
                        }
                      />
                    </View>
                    <View style={styles.gallerySectionContainer}>
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
                                location: flight.name,
                                title: flight.name,
                                galleryType: 'provider',
                                contextImage: flight.images[0] || galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                flightId: normalizedFlightId,
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
                                location: flight.name,
                                title: flight.name,
                                galleryType: 'provider',
                                contextImage: flight.images[0] || galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                flightId: normalizedFlightId,
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

                {/* Features */}
                <View
                  style={[
                    styles.section,
                    {
                      marginBottom: 24,
                      marginHorizontal: SECTION_HORIZONTAL_MARGIN,
                      paddingHorizontal: 0,
                      borderRadius: 16,
                      backgroundColor: cardBackground,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 0,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <View style={styles.accessibilitySection}>
                    <ThemedText style={styles.sectionTitle}>Features</ThemedText>
                    <View style={styles.accessibilityPillsContainer}>
                      {flight.features.map((feature, index) => {
                        const featureLower = feature.toLowerCase();
                        const isSeatFeature =
                          featureLower.includes('seat') || featureLower.includes('reclin');

                        return (
                          <View
                            key={`feature-${index}`}
                            style={[
                              styles.accessibilityPill,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.1)'
                                  : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                          >
                            {isSeatFeature ? (
                              <FontAwesomeIcon
                                icon={faChair}
                                size={14}
                                color={isDark ? '#FFFFFF' : '#333333'}
                                style={styles.accessibilityPillIcon}
                              />
                            ) : (
                              <Ionicons
                                name={getFlightFeatureIcon(feature)}
                                size={14}
                                color={isDark ? '#FFFFFF' : '#333333'}
                                style={styles.accessibilityPillIcon}
                              />
                            )}
                            <ThemedText
                              style={[
                                styles.accessibilityPillText,
                                { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                              ]}
                            >
                              {feature}
                            </ThemedText>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Booking Section */}
                <View
                  style={[
                    styles.bookingSection,
                    {
                      backgroundColor: cardBackground,
                    },
                  ]}
                >
                  <ThemedText style={styles.sectionTitle}>Search</ThemedText>
                  <BusSearchForm
                    tripType={tripType}
                    onTripTypeChange={handleTripTypeChange}
                    isDark={isDark}
                    attemptedSubmit={attemptedSubmit}
                    showOperatorField={false}
                    selectedFromLocation={selectedFromLocation}
                    selectedToLocation={selectedToLocation}
                    onPressFrom={openFromPicker}
                    onPressTo={openToPicker}
                    fromPlaceholder="Select departure location"
                    toPlaceholder="Select destination"
                    selectedDate={selectedDate}
                    departureLabel={getDefaultDateDisplay()}
                    onPressDepartureDate={openDepartureDatePicker}
                    selectedReturnDate={selectedReturnDate}
                    returnLabel={getDefaultReturnDateDisplay()}
                    onPressReturnDate={openReturnDatePicker}
                    showReturnField={tripType === 'return'}
                    passengers={passengers}
                    onIncrementPassengers={incrementPassengers}
                    onDecrementPassengers={decrementPassengers}
                    onPressSearch={handleSearchFlights}
                  />
                </View>
              </View>
            </ScrollView>
          </Animated.View>

          {/* From Location Picker Modal */}
          <Modal
            visible={showFromPicker}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => setShowFromPicker(false)}
          >
            <TouchableOpacity
              style={styles.fullScreenBackdrop}
              onPress={() => setShowFromPicker(false)}
              activeOpacity={1}
            >
              <View style={styles.guestDropdownContainer}>
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                    style={[
                      styles.guestDropdownCard,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        position: 'relative',
                      },
                    ]}
                  >
                    <View style={styles.guestDropdownHeader}>
                      <ThemedText style={styles.guestDropdownTitle}>From</ThemedText>
                      <TouchableOpacity
                        style={styles.guestDropdownCloseButton}
                        onPress={() => setShowFromPicker(false)}
                      >
                        <View
                          style={[
                            styles.closeButtonCircle,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.15)',
                            },
                          ]}
                        >
                          <Ionicons
                            name="close-sharp"
                            size={28}
                            color="#FF3B30"
                            style={{ textAlign: 'center', fontWeight: '900' }}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 400 }}>
                      <View style={styles.guestSection}>
                        {flightDestinations.map(destination => (
                          <TouchableOpacity
                            key={destination}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor:
                                  selectedFromLocation === destination
                                    ? isDark
                                      ? 'rgba(52, 199, 89, 0.15)'
                                      : 'rgba(52, 199, 89, 0.1)'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                              },
                            ]}
                            onPress={e => {
                              e.stopPropagation();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              setSelectedFromLocation(destination);
                              setShowFromPicker(false);
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons name="location-outline" size={16} color="#FF3B30" />
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  selectedFromLocation === destination && {
                                    fontFamily: Fonts.bold,
                                  },
                                ]}
                              >
                                {destination}
                              </ThemedText>
                            </View>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              {selectedFromLocation === destination && (
                                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* To Location Picker Modal */}
          <Modal
            visible={showToPicker}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => setShowToPicker(false)}
          >
            <TouchableOpacity
              style={styles.fullScreenBackdrop}
              onPress={() => setShowToPicker(false)}
              activeOpacity={1}
            >
              <View style={styles.guestDropdownContainer}>
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                    style={[
                      styles.guestDropdownCard,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        position: 'relative',
                      },
                    ]}
                  >
                    <View style={styles.guestDropdownHeader}>
                      <ThemedText style={styles.guestDropdownTitle}>To</ThemedText>
                      <TouchableOpacity
                        style={styles.guestDropdownCloseButton}
                        onPress={() => setShowToPicker(false)}
                      >
                        <View
                          style={[
                            styles.closeButtonCircle,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.15)',
                            },
                          ]}
                        >
                          <Ionicons
                            name="close-sharp"
                            size={28}
                            color="#FF3B30"
                            style={{ textAlign: 'center', fontWeight: '900' }}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 400 }}>
                      <View style={styles.guestSection}>
                        {flightDestinations
                          .filter(destination => destination !== selectedFromLocation)
                          .map(destination => (
                            <TouchableOpacity
                              key={destination}
                              style={[
                                styles.guestRow,
                                {
                                  backgroundColor:
                                    selectedToLocation === destination
                                      ? isDark
                                        ? 'rgba(52, 199, 89, 0.15)'
                                        : 'rgba(52, 199, 89, 0.1)'
                                      : isDark
                                        ? 'rgba(255,255,255,0.05)'
                                        : 'rgba(0,0,0,0.03)',
                                  marginTop: 8,
                                },
                              ]}
                              onPress={e => {
                                e.stopPropagation();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setSelectedToLocation(destination);
                                setShowToPicker(false);
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="location-outline" size={16} color="#FF3B30" />
                                <ThemedText
                                  style={[
                                    styles.guestSubLabel,
                                    selectedToLocation === destination && {
                                      fontFamily: Fonts.bold,
                                    },
                                  ]}
                                >
                                  {destination}
                                </ThemedText>
                              </View>
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                {selectedToLocation === destination && (
                                  <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                      </View>
                    </ScrollView>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Date Picker Modal */}
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.fullScreenBackdrop}
              onPress={() => setShowDatePicker(false)}
              activeOpacity={1}
            >
              <View style={styles.guestDropdownContainer}>
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                    style={[
                      styles.guestDropdownCard,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        position: 'relative',
                      },
                    ]}
                  >
                    <View style={styles.guestDropdownHeader}>
                      <ThemedText style={styles.guestDropdownTitle}>Departure Date</ThemedText>
                      <TouchableOpacity
                        style={styles.guestDropdownCloseButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <View
                          style={[
                            styles.closeButtonCircle,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.15)',
                            },
                          ]}
                        >
                          <Ionicons
                            name="close-sharp"
                            size={28}
                            color="#FF3B30"
                            style={{ textAlign: 'center', fontWeight: '900' }}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Calendar Section */}
                    <View style={styles.guestSection}>
                      {/* Calendar Header with Navigation */}
                      <View style={styles.itineraryCalendarHeader}>
                        {(() => {
                          const today = new Date();
                          const isCurrentMonth =
                            currentCalendarMonth.getFullYear() === today.getFullYear() &&
                            currentCalendarMonth.getMonth() === today.getMonth();

                          return (
                            <TouchableOpacity
                              style={[
                                styles.itineraryMonthNavButton,
                                {
                                  backgroundColor: isCurrentMonth
                                    ? 'rgba(255, 59, 48, 0.05)'
                                    : isDark
                                      ? 'rgba(255, 59, 48, 0.15)'
                                      : 'rgba(255, 59, 48, 0.1)',
                                },
                              ]}
                              onPress={() => {
                                if (!isCurrentMonth) {
                                  navigateMonth('prev');
                                }
                              }}
                              disabled={isCurrentMonth}
                            >
                              <FontAwesome6
                                name="chevron-left"
                                size={20}
                                color={isCurrentMonth ? 'rgba(255, 59, 48, 0.3)' : '#FF3B30'}
                              />
                            </TouchableOpacity>
                          );
                        })()}

                        <ThemedText style={styles.itineraryMonthTitle}>
                          {currentCalendarMonth.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </ThemedText>

                        <TouchableOpacity
                          style={[
                            styles.itineraryMonthNavButton,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.1)',
                            },
                          ]}
                          onPress={() => {
                            navigateMonth('next');
                          }}
                        >
                          <FontAwesome6 name="chevron-right" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>

                      {/* Week Days Header */}
                      <View style={styles.itineraryWeekDaysHeader}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <View key={day} style={styles.itineraryWeekDayItem}>
                            <ThemedText style={styles.itineraryWeekDayText}>{day}</ThemedText>
                          </View>
                        ))}
                      </View>

                      {/* Calendar Grid */}
                      <PanGestureHandler
                        ref={panGestureRef}
                        onHandlerStateChange={onPanGestureEvent}
                        onGestureEvent={onPanGestureEvent}
                        activeOffsetX={[-20, 20]}
                        failOffsetY={[-10, 10]}
                        shouldCancelWhenOutside={true}
                        enabled={!isAnimating}
                      >
                        <Animated.View
                          style={[styles.itineraryCalendarGrid, { opacity: opacityAnim }]}
                        >
                          {Array.from({ length: 6 }, (_, weekIndex) => {
                            const weekDays = [];
                            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                              const totalDayIndex = weekIndex * 7 + dayIndex;
                              const firstDay = new Date(
                                currentCalendarMonth.getFullYear(),
                                currentCalendarMonth.getMonth(),
                                1
                              );
                              const startDay = (firstDay.getDay() + 6) % 7;
                              const daysInMonth = new Date(
                                currentCalendarMonth.getFullYear(),
                                currentCalendarMonth.getMonth() + 1,
                                0
                              ).getDate();

                              const dayNumber = totalDayIndex - startDay + 1;
                              const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

                              if (!isValidDay) {
                                weekDays.push(null);
                                continue;
                              }

                              const currentDate = new Date(
                                currentCalendarMonth.getFullYear(),
                                currentCalendarMonth.getMonth(),
                                dayNumber
                              );
                              const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                              const isSelected = selectedDate === dateString;
                              const isPast =
                                currentDate.getTime() < new Date().setHours(0, 0, 0, 0);

                              const today = new Date();
                              const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                              const isToday = dateString === todayString;

                              weekDays.push({
                                day: dayNumber,
                                date: dateString,
                                isSelected,
                                isPast,
                                isToday,
                                isCurrentMonth: true,
                              });
                            }

                            if (weekDays.every(day => day === null)) return null;

                            return (
                              <View key={`week-${weekIndex}`} style={styles.itineraryWeekRow}>
                                {weekDays.map((day, dayIndex) => (
                                  <View key={dayIndex} style={styles.itineraryCalendarDayContainer}>
                                    {day && (
                                      <TouchableOpacity
                                        onPress={() => {
                                          if (!day.isPast) {
                                            handleDateSelect(day.date);
                                          }
                                        }}
                                        disabled={day.isPast}
                                        activeOpacity={0.7}
                                        style={styles.itineraryCalendarDayTouchable}
                                      >
                                        <View
                                          style={[
                                            styles.itineraryCalendarDay,
                                            day.isSelected && [
                                              styles.itinerarySelectedDay,
                                              { backgroundColor: isDark ? '#FFFFFF' : '#000000' },
                                            ],
                                            day.isToday &&
                                              !day.isSelected &&
                                              styles.itineraryTodayDay,
                                            day.isPast &&
                                              !day.isSelected &&
                                              !day.isToday &&
                                              styles.itineraryPastDay,
                                          ]}
                                        >
                                          <ThemedText
                                            style={[
                                              styles.itineraryDayText,
                                              day.isSelected && [
                                                styles.itinerarySelectedDayText,
                                                { color: isDark ? '#000000' : '#FFFFFF' },
                                              ],
                                              day.isToday &&
                                                !day.isSelected &&
                                                styles.itineraryTodayDayText,
                                              day.isPast &&
                                                !day.isSelected &&
                                                !day.isToday &&
                                                styles.itineraryPastDayText,
                                            ]}
                                          >
                                            {day.day}
                                          </ThemedText>
                                        </View>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ))}
                              </View>
                            );
                          })}
                        </Animated.View>
                      </PanGestureHandler>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Return Date Picker Modal */}
          <Modal
            visible={showReturnDatePicker}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={() => setShowReturnDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.fullScreenBackdrop}
              onPress={() => setShowReturnDatePicker(false)}
              activeOpacity={1}
            >
              <View style={styles.guestDropdownContainer}>
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                    style={[
                      styles.guestDropdownCard,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        position: 'relative',
                      },
                    ]}
                  >
                    <View style={styles.guestDropdownHeader}>
                      <ThemedText style={styles.guestDropdownTitle}>Return Date</ThemedText>
                      <TouchableOpacity
                        style={styles.guestDropdownCloseButton}
                        onPress={() => setShowReturnDatePicker(false)}
                      >
                        <View
                          style={[
                            styles.closeButtonCircle,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.15)',
                            },
                          ]}
                        >
                          <Ionicons
                            name="close-sharp"
                            size={28}
                            color="#FF3B30"
                            style={{ textAlign: 'center', fontWeight: '900' }}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Calendar Section */}
                    <View style={styles.guestSection}>
                      {/* Calendar Header with Navigation */}
                      <View style={styles.itineraryCalendarHeader}>
                        {(() => {
                          const today = new Date();
                          const isCurrentMonth =
                            currentReturnCalendarMonth.getFullYear() === today.getFullYear() &&
                            currentReturnCalendarMonth.getMonth() === today.getMonth();

                          return (
                            <TouchableOpacity
                              style={[
                                styles.itineraryMonthNavButton,
                                {
                                  backgroundColor: isCurrentMonth
                                    ? 'rgba(255, 59, 48, 0.05)'
                                    : isDark
                                      ? 'rgba(255, 59, 48, 0.15)'
                                      : 'rgba(255, 59, 48, 0.1)',
                                },
                              ]}
                              onPress={() => {
                                if (!isCurrentMonth) {
                                  navigateReturnMonth('prev');
                                }
                              }}
                              disabled={isCurrentMonth}
                            >
                              <FontAwesome6
                                name="chevron-left"
                                size={20}
                                color={isCurrentMonth ? 'rgba(255, 59, 48, 0.3)' : '#FF3B30'}
                              />
                            </TouchableOpacity>
                          );
                        })()}

                        <ThemedText style={styles.itineraryMonthTitle}>
                          {currentReturnCalendarMonth.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </ThemedText>

                        <TouchableOpacity
                          style={[
                            styles.itineraryMonthNavButton,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.1)',
                            },
                          ]}
                          onPress={() => {
                            navigateReturnMonth('next');
                          }}
                        >
                          <FontAwesome6 name="chevron-right" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>

                      {/* Week Days Header */}
                      <View style={styles.itineraryWeekDaysHeader}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <View key={day} style={styles.itineraryWeekDayItem}>
                            <ThemedText style={styles.itineraryWeekDayText}>{day}</ThemedText>
                          </View>
                        ))}
                      </View>

                      {/* Calendar Grid */}
                      <PanGestureHandler
                        ref={returnPanGestureRef}
                        onHandlerStateChange={onReturnPanGestureEvent}
                        onGestureEvent={onReturnPanGestureEvent}
                        activeOffsetX={[-20, 20]}
                        failOffsetY={[-10, 10]}
                        shouldCancelWhenOutside={true}
                        enabled={!isReturnAnimating}
                      >
                        <Animated.View
                          style={[styles.itineraryCalendarGrid, { opacity: opacityAnim }]}
                        >
                          {Array.from({ length: 6 }, (_, weekIndex) => {
                            const weekDays = [];
                            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                              const totalDayIndex = weekIndex * 7 + dayIndex;
                              const firstDay = new Date(
                                currentReturnCalendarMonth.getFullYear(),
                                currentReturnCalendarMonth.getMonth(),
                                1
                              );
                              const startDay = (firstDay.getDay() + 6) % 7;
                              const daysInMonth = new Date(
                                currentReturnCalendarMonth.getFullYear(),
                                currentReturnCalendarMonth.getMonth() + 1,
                                0
                              ).getDate();

                              const dayNumber = totalDayIndex - startDay + 1;
                              const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

                              if (!isValidDay) {
                                weekDays.push(null);
                                continue;
                              }

                              const currentDate = new Date(
                                currentReturnCalendarMonth.getFullYear(),
                                currentReturnCalendarMonth.getMonth(),
                                dayNumber
                              );
                              const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                              const isSelected = selectedReturnDate === dateString;
                              const isPast =
                                currentDate.getTime() < new Date().setHours(0, 0, 0, 0);

                              const today = new Date();
                              const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                              const isToday = dateString === todayString;

                              weekDays.push({
                                day: dayNumber,
                                date: dateString,
                                isSelected,
                                isPast,
                                isToday,
                                isCurrentMonth: true,
                              });
                            }

                            if (weekDays.every(day => day === null)) return null;

                            return (
                              <View key={`week-${weekIndex}`} style={styles.itineraryWeekRow}>
                                {weekDays.map((day, dayIndex) => (
                                  <View key={dayIndex} style={styles.itineraryCalendarDayContainer}>
                                    {day && (
                                      <TouchableOpacity
                                        onPress={() => {
                                          if (!day.isPast) {
                                            handleReturnDateSelect(day.date);
                                          }
                                        }}
                                        disabled={day.isPast}
                                        activeOpacity={0.7}
                                        style={styles.itineraryCalendarDayTouchable}
                                      >
                                        <View
                                          style={[
                                            styles.itineraryCalendarDay,
                                            day.isSelected && [
                                              styles.itinerarySelectedDay,
                                              { backgroundColor: isDark ? '#FFFFFF' : '#000000' },
                                            ],
                                            day.isToday &&
                                              !day.isSelected &&
                                              styles.itineraryTodayDay,
                                            day.isPast &&
                                              !day.isSelected &&
                                              !day.isToday &&
                                              styles.itineraryPastDay,
                                          ]}
                                        >
                                          <ThemedText
                                            style={[
                                              styles.itineraryDayText,
                                              day.isSelected && [
                                                styles.itinerarySelectedDayText,
                                                { color: isDark ? '#000000' : '#FFFFFF' },
                                              ],
                                              day.isToday &&
                                                !day.isSelected &&
                                                styles.itineraryTodayDayText,
                                              day.isPast &&
                                                !day.isSelected &&
                                                !day.isToday &&
                                                styles.itineraryPastDayText,
                                            ]}
                                          >
                                            {day.day}
                                          </ThemedText>
                                        </View>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                ))}
                              </View>
                            );
                          })}
                        </Animated.View>
                      </PanGestureHandler>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        </ThemedView>
      </WebSlideTransition>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    position: 'relative',
    width: '100%',
    zIndex: 20,
    marginBottom: 0,
    paddingBottom: 8,
  },
  galleryContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1,
  },
  galleryImage: {
    width,
    height: HEADER_HEIGHT,
  },
  contentSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  titleSection: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
  },
  titleCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 26,
    gap: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 0,
  },
  titleActionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  titleActionCluster: {
    flexDirection: 'row',
    gap: 10,
    flexShrink: 0,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 18,
  },
  profileCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
    borderWidth: 2,
  },
  profileInitial: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  titleTextBlock: {
    flex: 1,
    gap: 8,
  },
  stayTitle: {
    fontSize: responsiveFontSize(22),
    fontFamily: Fonts.bold,
    lineHeight: 28,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: width * 0.6,
    gap: 6,
    flexShrink: 1,
  },
  locationPillText: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  titleRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 0,
  },
  titleAmenitiesSection: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(22),
    lineHeight: 28,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  amenitiesIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    height: 74,
    overflow: 'hidden',
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
  titleAmenityText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gallerySectionContainer: {
    width: '100%',
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
    paddingTop: 0,
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
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E5EA',
    flex: 1,
  },
  galleryImageCard: {
    width: '100%',
    aspectRatio: 3 / 2,
  },
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
  descriptionSection: {
    padding: 20,
    borderBottomWidth: 0.5,
  },
  description: {
    fontSize: responsiveFontSize(16),
    lineHeight: 24,
    opacity: 0.8,
  },
  accessibilitySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  accessibilityPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accessibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  accessibilityPillIcon: {
    marginRight: 2,
  },
  accessibilityPillText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  bookingSection: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 0,
  },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(15),
    letterSpacing: 0.2,
  },
  tabTextActive: {
    fontFamily: Fonts.bold,
  },
  priceContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceIcon: {
    marginRight: 8,
  },
  fromText: {
    fontSize: responsiveFontSize(13),
    opacity: 0.7,
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  priceText: {
    fontSize: responsiveFontSize(28),
    fontFamily: Fonts.bold,
  },
  priceCurrency: {
    fontSize: responsiveFontSize(20),
    opacity: 0.8,
  },
  priceUnit: {
    fontSize: responsiveFontSize(16),
    opacity: 0.7,
  },
  dateContainer: {
    marginBottom: 16,
  },
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateOutsideLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    marginBottom: 0,
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  dateInput: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  dateValue: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
  guestsSection: {
    marginBottom: 20,
  },
  guestsTitle: {
    marginBottom: 12,
  },
  guestContainer: {
    gap: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  guestCount: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    minWidth: 24,
    textAlign: 'center',
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalContainer: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalMainLabel: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    flex: 1,
    lineHeight: 22,
  },
  totalPriceContainer: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  paymentButtonContainer: {
    marginTop: 16,
    gap: 8,
  },
  paymentButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  paymentButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // Modal Styles
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  guestDropdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 1002,
    backgroundColor: 'transparent',
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  guestDropdownCard: {
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  guestDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  guestDropdownTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  guestDropdownCloseButton: {},
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 0,
  },
  guestSection: {
    marginBottom: 20,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 0,
  },
  guestSubLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  // Title Meta Row Styles (from stay-profile)
  titleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  directionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    gap: 6,
    flexShrink: 0,
  },
  directionsPillText: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 140,
    gap: 6,
    marginLeft: 'auto',
  },
  ratingPillText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
  },
  reviewsText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
  },
  pillIcon: {
    marginRight: 4,
  },
  // Title Card Footer Styles (from stay-profile)
  titleCardFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flex: 1,
  },
  contactPillText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(16),
    letterSpacing: 0.3,
  },
  // Calendar styles
  itineraryCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  itineraryMonthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itineraryMonthTitle: {
    fontSize: responsiveFontSize(22),
    fontWeight: '600',
  },
  itineraryWeekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  itineraryWeekDayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  itineraryWeekDayText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  itineraryCalendarGrid: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  itineraryWeekRow: {
    flexDirection: 'row',
  },
  itineraryCalendarDayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  itineraryCalendarDayTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  itineraryCalendarDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    minWidth: 36,
    maxWidth: 36,
    minHeight: 36,
    maxHeight: 36,
  },
  itinerarySelectedDay: {
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 0,
  },
  itineraryTodayDay: {
    backgroundColor: '#FF3B30',
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 0,
  },
  itineraryPastDay: {
    opacity: 0.3,
  },
  itineraryDayText: {
    fontSize: responsiveFontSize(20),
    fontWeight: '400',
  },
  itinerarySelectedDayText: {
    fontWeight: '600',
    fontSize: responsiveFontSize(20),
  },
  itineraryTodayDayText: {
    fontWeight: '600',
    fontSize: responsiveFontSize(20),
    color: '#FFFFFF',
  },
  itineraryPastDayText: {
    opacity: 0.3,
    fontSize: responsiveFontSize(20),
  },
});
