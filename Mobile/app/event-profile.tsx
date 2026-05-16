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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  isFavorited as isFavoritedUtil,
  toggleFavorite as toggleFavoriteUtil,
} from '@/utils/favoritesUtils';
import {
  ProviderHeroCard,
  PushScreenOptions,
  ViewAllButton,
  WebSlideTransition,
} from '@/components';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 340;

// Gallery constants (matching destination-detail)
const GALLERY_CARD_GAP = 4; // Minimal gap so previews appear nearly edge-to-edge
const SECTION_HORIZONTAL_MARGIN = 16;
const GALLERY_CONTAINER_PADDING = 8; // Trimmed padding to reduce whitespace around images
const AVAILABLE_GALLERY_WIDTH =
  width - SECTION_HORIZONTAL_MARGIN * 2 - GALLERY_CONTAINER_PADDING * 2;
const GALLERY_CARD_WIDTH = (AVAILABLE_GALLERY_WIDTH - GALLERY_CARD_GAP) / 2;

export default function EventProfileScreen() {
  const params = useLocalSearchParams();
  const { eventId, eventName, eventLocation, eventVenue } = params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const rawPriceFrom = Array.isArray(params.priceFrom) ? params.priceFrom[0] : params.priceFrom;
  const baseTicketPrice = useMemo(() => {
    const parsed = rawPriceFrom ? Number(rawPriceFrom) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 10;
  }, [rawPriceFrom]);

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const galleryCardBackground = isDark ? '#2C2C2E' : '#E5E5EA';

  // Event descriptions based on event ID
  const getEventDescription = (id: string) => {
    const descriptions: Record<string, string> = {
      'zim-jazz-fest':
        'Join us for an unforgettable evening of world-class jazz performances featuring local and international artists. Experience the magic of live music under the stars in the beautiful Harare Gardens. This annual festival showcases the best of Zimbabwean and African jazz talent, bringing together legendary performers and emerging artists for a celebration of rhythm, soul, and cultural heritage.',
      'vic-falls-marathon':
        "Challenge yourself in one of the most scenic marathons in Africa! Run alongside the mighty Zambezi River with breathtaking views of Victoria Falls. Whether you're a seasoned marathoner or first-time runner, this event offers routes for all levels. Experience the thrill of crossing the iconic Victoria Falls Bridge while supporting local communities. Join runners from around the world in this unforgettable athletic adventure.",
      'harvest-craft-fair':
        "Celebrate Zimbabwe's rich artisan heritage at the annual Harvest Craft Fair. Discover unique handcrafted treasures from over 100 local artisans showcasing traditional pottery, sculptures, textiles, jewelry, and contemporary art. This family-friendly event features live demonstrations, children's workshops, authentic Zimbabwean cuisine, and cultural performances. Support local craftspeople while finding one-of-a-kind pieces to treasure.",
      'default-event':
        "Join us for an unforgettable event experience in the heart of Zimbabwe. Whether you're looking for entertainment, culture, or community connection, this event brings together the best of what Zimbabwe has to offer.",
    };
    return descriptions[id] || descriptions['default-event'];
  };

  // Mock event data
  const [event] = useState({
    id: eventId || 'default-event',
    name: (eventName as string) || 'Zimbabwe Jazz Festival',
    location: (eventLocation as string) || 'Harare',
    venue: (eventVenue as string) || 'Harare Gardens',
    date: '2025-09-12',
    time: '18:00',
    endTime: '23:00',
    images: [
      'https://picsum.photos/800/600?random=31',
      'https://picsum.photos/800/600?random=32',
      'https://picsum.photos/800/600?random=33',
      'https://picsum.photos/800/600?random=34',
    ],
    description: getEventDescription((eventId as string) || 'default-event'),
    rating: 4.7,
    totalRatings: 342,
    category: 'Music',
    tags: ['Live Music', 'Outdoor', 'Family Friendly', 'Food & Drinks'],
    organizer: {
      name: 'Events Zimbabwe',
      contact: '+263 77 123 4567',
      verified: true,
    },
    capacity: 500,
    ticketsAvailable: 125,
    ageRestriction: 'All Ages',
    accessibility: ['Wheelchair Accessible', 'Parking Available'],
  });

  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedTicketType, setSelectedTicketType] = useState<any>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showTicketPicker, setShowTicketPicker] = useState(false);

  const ticketTypes = useMemo(() => {
    const generalIncrement = Math.max(5, Math.round((baseTicketPrice * 0.3) / 5) * 5);
    const generalPrice = baseTicketPrice + generalIncrement;
    const vipIncrement = Math.max(20, Math.round((baseTicketPrice * 1.2) / 5) * 5);
    const vipPrice = generalPrice + vipIncrement;

    return [
      {
        id: 'early-bird',
        name: 'Early Bird',
        price: Math.round(baseTicketPrice),
        description: 'Limited time offer',
        available: 10,
      },
      {
        id: 'general',
        name: 'General Admission',
        price: Math.round(generalPrice),
        description: 'Standing area access',
        available: 85,
      },
      {
        id: 'vip',
        name: 'VIP',
        price: Math.round(vipPrice),
        description: 'Reserved seating + drink voucher',
        available: 30,
        perks: ['Reserved Seating', 'Free Drink', 'VIP Entrance'],
      },
    ];
  }, [baseTicketPrice]);

  // Gallery images (matching destination-detail pattern)
  const galleryImages = useMemo(() => {
    return event.images || [];
  }, [event.images]);

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (eventId) {
      setIsFavorited(isFavoritedUtil(eventId as string));
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      if (eventId) {
        setIsFavorited(isFavoritedUtil(eventId as string));
      }
      if (!isLoading) {
        opacityAnim.setValue(1);
      }
    }, [eventId, isLoading, opacityAnim])
  );

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
      scrollY.setValue(0);
    }
  }, [scrollViewRef, eventId, scrollY]);

  useEffect(() => {
    if (!selectedTicketType && ticketTypes.length > 0) {
      setSelectedTicketType(ticketTypes[0]);
    }
  }, [ticketTypes, selectedTicketType]);

  const handleGoBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const toggleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (eventId) {
      toggleFavoriteUtil(eventId as string);
      setIsFavorited(isFavoritedUtil(eventId as string));
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Share event');
  };

  const handleDirections = useCallback(() => {
    console.log('Get directions');
  }, []);

  const handleCallOrganizer = useCallback(() => {
    console.log('Call organizer');
  }, []);

  const handleMessageOrganizer = useCallback(() => {
    if (!event?.organizer) {
      return;
    }

    const messageData = {
      id: `organizer-${eventId || 'unknown'}`,
      name: event.name || 'Event',
      message: '',
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isRead: true,
      avatar: event.name.charAt(0).toUpperCase(),
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent(event.name)}&size=128&backgroundColor=FF4757`,
      avatarBgColor: isDark ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 71, 87, 0.08)',
      avatarBorderColor: '#FF4757',
      status: 'received' as const,
      isNewConversation: true,
      organizerName: event.organizer.name,
      eventId,
    };

    router.push({
      pathname: '/message-detail',
      params: {
        message: JSON.stringify(messageData),
      },
    });
  }, [event, eventId, isDark, router]);

  const handleBuyTickets = useCallback(() => {
    if (!selectedTicketType) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // totalPrice already calculated: price * quantity * 1.05 (5% service fee)
    const basePrice = selectedTicketType.price * ticketQuantity;
    const serviceFee = basePrice * 0.05;
    const total = basePrice + serviceFee;

    router.push({
      pathname: '/payment',
      params: {
        type: 'event',
        eventId: event.id,
        eventName: event.name,
        ticketType: selectedTicketType.name,
        quantity: ticketQuantity,
        unitPrice: selectedTicketType.price,
        totalAmount: total.toFixed(2),
        eventDate: event.date,
        eventTime: event.time,
        venue: event.venue,
        subtotal: basePrice.toFixed(2),
        tax: serviceFee.toFixed(2),
      },
    });
  }, [event, selectedTicketType, ticketQuantity]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const getEventDetailIcon = useCallback((label: string): keyof typeof Ionicons.glyphMap => {
    switch (label) {
      case 'Date':
        return 'calendar';
      case 'Time':
        return 'time';
      case 'Venue':
        return 'location';
      case 'Availability':
        return 'ticket';
      case 'Age restriction':
        return 'people';
      default:
        return 'information-circle';
    }
  }, []);

  const getEventDetailIconColor = useCallback((label: string) => {
    switch (label) {
      case 'Venue':
        return '#FF3B30';
      case 'Availability':
        return '#34C759';
      case 'Time':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  }, []);

  const eventDetails = useMemo(
    () => [
      {
        label: 'Date',
        value: formatDate(event.date),
      },
      {
        label: 'Time',
        value: event.endTime ? `${event.time} - ${event.endTime}` : event.time,
      },
      {
        label: 'Venue',
        value: event.venue,
      },
      {
        label: 'Availability',
        value: `${event.ticketsAvailable} / ${event.capacity} tickets`,
      },
      {
        label: 'Age restriction',
        value: event.ageRestriction,
      },
    ],
    [event, formatDate]
  );

  const totalPrice = selectedTicketType ? selectedTicketType.price * ticketQuantity * 1.05 : 0; // Including 5% service fee

  if (isLoading || !event) {
    return (
      <IOSScreenWrapper>
        <PushScreenOptions />
        <WebSlideTransition>
          <ThemedView style={styles.container}>
            <View style={[styles.headerArea, { backgroundColor: isDark ? '#000000' : '#f2f2f7' }]}>
              <CustomHeader
                showLogo={true}
                leftAction={{
                  icon: 'chevron-back',
                  onPress: handleGoBack,
                }}
                style={{ marginBottom: 4 }}
              />
            </View>
            <View style={{ flex: 1 }} />
          </ThemedView>
        </WebSlideTransition>
      </IOSScreenWrapper>
    );
  }

  return (
    <IOSScreenWrapper>
      <PushScreenOptions />
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
                source={{ uri: event.images[0] }}
                style={[
                  styles.galleryImage,
                  {
                    transform: [
                      {
                        translateY: scrollY.interpolate({
                          inputRange: [-200, 0],
                          outputRange: [50, 0],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scale: scrollY.interpolate({
                          inputRange: [-200, 0],
                          outputRange: [1.02, 1],
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
                <View style={[StyleSheet.absoluteFillObject, { height: 2000, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }]}>
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
                    title={event.name}
                    location={event.location}
                    rating={event.rating}
                    reviewsText={`• ${event.totalRatings} reviews`}
                    onFavoritePress={toggleFavorite}
                    onSharePress={handleShare}
                    isFavorited={isFavorited}
                    onDirectionsPress={handleDirections}
                    onCallPress={handleCallOrganizer}
                    onMessagePress={event.organizer ? handleMessageOrganizer : undefined}
                  />
                </View>

                {/* Event Tags Card (equivalent to Amenities) */}
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
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 0,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.titleAmenitiesSection,
                      {
                        backgroundColor: 'transparent',
                        paddingHorizontal: 20,
                        paddingTop: 20,
                        paddingBottom: 20,
                      },
                    ]}
                  >
                    <View style={styles.amenitiesIconRow}>
                      {event.tags.slice(0, 6).map(tag => (
                        <View
                          key={`${event.id}-${tag}`}
                          style={[
                            styles.amenityIconContainer,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,0,0,0.05)',
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={isDark ? '#FFFFFF' : '#333333'}
                            style={styles.amenityIcon}
                          />
                          <ThemedText
                            style={styles.titleAmenityText}
                            darkColor="#ECEDEE"
                            lightColor="#1C1C1E"
                          >
                            {tag}
                          </ThemedText>
                        </View>
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
                        shadowOpacity: 0.1,
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
                              location: event.name,
                              title: 'Event Gallery',
                              images: JSON.stringify(galleryImages),
                              eventId: eventName,
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
                                location: event.name,
                                title: 'Event Gallery',
                                images: JSON.stringify(galleryImages),
                                eventId: eventName,
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
                                location: event.name,
                                title: 'Event Gallery',
                                images: JSON.stringify(galleryImages),
                                eventId: eventName,
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

                {/* Event Description */}
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
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 0,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <View style={styles.descriptionSection}>
                    <ThemedText style={styles.sectionTitle}>About Us</ThemedText>
                    <ThemedText style={styles.description}>{event.description}</ThemedText>
                  </View>
                </View>

                {/* Event Details */}
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
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 0,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <View style={styles.detailsSection}>
                    <ThemedText style={styles.sectionTitle}>Event Details</ThemedText>
                    <View style={styles.detailsGrid}>
                      {eventDetails.map(detail => (
                        <View key={detail.label} style={styles.detailRow}>
                          <ThemedText style={styles.detailLabel}>{detail.label}</ThemedText>
                          <View
                            style={[
                              styles.detailPill,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.1)'
                                  : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.detailIconBubble,
                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                              ]}
                            >
                              <Ionicons
                                name={getEventDetailIcon(detail.label)}
                                size={10}
                                color={getEventDetailIconColor(detail.label)}
                              />
                            </View>
                            <ThemedText
                              style={[
                                styles.detailPillText,
                                { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                              ]}
                            >
                              {detail.value}
                            </ThemedText>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Accessibility */}
                {event.accessibility && event.accessibility.length > 0 && (
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
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 0,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <View style={styles.accessibilitySection}>
                      <ThemedText style={styles.sectionTitle}>Accessibility</ThemedText>
                      <View style={styles.accessibilityPillsContainer}>
                        {event.accessibility.map((item, index) => (
                          <View
                            key={`access-${index}`}
                            style={[
                              styles.accessibilityPill,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.1)'
                                  : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color="#34C759"
                              style={styles.accessibilityPillIcon}
                            />
                            <ThemedText
                              style={[
                                styles.accessibilityPillText,
                                { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                              ]}
                            >
                              {item}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* Booking Section - Inline like stay-profile */}
                {selectedTicketType && (
                  <View
                    style={[
                      styles.bookingSection,
                      {
                        backgroundColor: cardBackground,
                      },
                    ]}
                  >
                    <ThemedText style={styles.sectionTitle}>Buy your tickets</ThemedText>

                    {/* Price Display */}
                    <View style={styles.priceContainer}>
                      <ThemedText style={styles.fromText}>from</ThemedText>
                      <View style={styles.priceRow}>
                        <Ionicons
                          name="ticket-outline"
                          size={18}
                          color="#34C759"
                          style={styles.priceIcon}
                        />
                        <ThemedText style={styles.priceText}>
                          <ThemedText style={styles.priceCurrency}>$</ThemedText>
                          {selectedTicketType.price}
                          <ThemedText style={styles.priceUnit}>/ticket</ThemedText>
                        </ThemedText>
                      </View>
                    </View>

                    {/* Ticket Type Selection */}
                    <View style={styles.roomContainer}>
                      <ThemedText style={styles.dateOutsideLabel}>Ticket Type</ThemedText>
                      <TouchableOpacity
                        style={[
                          styles.guestSelector,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                        onPress={() => setShowTicketPicker(!showTicketPicker)}
                      >
                        <ThemedText style={styles.guestValue}>
                          {selectedTicketType?.name || 'Select Ticket Type'}
                        </ThemedText>
                        <Ionicons
                          name={showTicketPicker ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={isDark ? '#FFFFFF' : '#000000'}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Quantity Selection */}
                    <View style={styles.guestsSection}>
                      <ThemedText style={[styles.dateOutsideLabel, styles.guestsTitle]}>
                        Number of Tickets
                      </ThemedText>

                      <View style={styles.guestContainer}>
                        <View
                          style={[
                            styles.quantitySelector,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(0,0,0,0.03)',
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.counterButton,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255, 59, 48, 0.15)'
                                  : 'rgba(255, 59, 48, 0.1)',
                                opacity: ticketQuantity <= 1 ? 0.4 : 1,
                                ...(isDark
                                  ? {
                                      shadowColor: '#FFF',
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.12,
                                      shadowRadius: 2,
                                    }
                                  : {
                                      shadowColor: '#000',
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.15,
                                      shadowRadius: 2,
                                    }),
                              },
                            ]}
                            onPress={() => {
                              if (ticketQuantity > 1) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTicketQuantity(prev => prev - 1);
                              }
                            }}
                            disabled={ticketQuantity <= 1}
                            activeOpacity={ticketQuantity <= 1 ? 0.4 : 0.8}
                          >
                            <Ionicons
                              name="remove-sharp"
                              size={28}
                              color="#FF3B30"
                              style={{ fontWeight: '900' }}
                            />
                          </TouchableOpacity>
                          <ThemedText style={styles.guestCount}>{ticketQuantity}</ThemedText>
                          <TouchableOpacity
                            style={[
                              styles.counterButton,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(52, 199, 89, 0.15)'
                                  : 'rgba(52, 199, 89, 0.1)',
                                opacity: ticketQuantity >= selectedTicketType.available ? 0.4 : 1,
                                ...(isDark
                                  ? {
                                      shadowColor: '#FFF',
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.12,
                                      shadowRadius: 2,
                                    }
                                  : {
                                      shadowColor: '#000',
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.15,
                                      shadowRadius: 2,
                                    }),
                              },
                            ]}
                            onPress={() => {
                              if (ticketQuantity < selectedTicketType.available) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTicketQuantity(prev => prev + 1);
                              }
                            }}
                            disabled={ticketQuantity >= selectedTicketType.available}
                            activeOpacity={
                              ticketQuantity >= selectedTicketType.available ? 0.4 : 0.8
                            }
                          >
                            <Ionicons
                              name="add-sharp"
                              size={28}
                              color="#34C759"
                              style={{ fontWeight: '900' }}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Availability Status */}
                    <View style={styles.availabilityContainer}>
                      <View style={styles.availabilityIndicator}>
                        <View style={styles.availabilityDot} />
                        <ThemedText style={styles.availabilityText}>
                          Available - only {selectedTicketType.available} tickets left!
                        </ThemedText>
                      </View>
                    </View>

                    {/* Price Breakdown */}
                    <View
                      style={[
                        styles.totalContainer,
                        { borderTopColor: isDark ? 'rgba(90, 90, 90, 0.3)' : '#f0f0f0' },
                      ]}
                    >
                      {/* Base price breakdown */}
                      <View style={styles.priceBreakdownRow}>
                        <ThemedText style={styles.breakdownLabel}>
                          ${selectedTicketType.price} × {ticketQuantity} ticket
                          {ticketQuantity > 1 ? 's' : ''}
                        </ThemedText>
                        <ThemedText style={styles.breakdownAmount}>
                          ${(selectedTicketType.price * ticketQuantity).toFixed(2)}
                        </ThemedText>
                      </View>

                      {/* Service fee */}
                      <View style={styles.priceBreakdownRow}>
                        <ThemedText style={styles.breakdownLabel}>Service fee (5%)</ThemedText>
                        <ThemedText style={styles.breakdownAmount}>
                          ${(selectedTicketType.price * ticketQuantity * 0.05).toFixed(2)}
                        </ThemedText>
                      </View>

                      {/* Divider before total */}
                      <View
                        style={[
                          styles.totalSeparator,
                          { borderTopColor: isDark ? 'rgba(90, 90, 90, 0.3)' : '#f0f0f0' },
                        ]}
                      />

                      {/* Due Today Section Title */}
                      <ThemedText style={[styles.sectionTitle, styles.dueTodayTitle]}>
                        Due Today
                      </ThemedText>

                      {/* Creative Total Section */}
                      <View style={styles.totalRow}>
                        <View
                          style={[
                            styles.creativeTotal,
                            { backgroundColor: isDark ? '#2d5a36' : '#dcf4e0' },
                          ]}
                        >
                          {/* Icon */}
                          <View style={styles.totalIconContainer}>
                            <Ionicons name="card" size={20} color="#FFFFFF" />
                          </View>

                          {/* Total label */}
                          <ThemedText style={styles.totalMainLabel}>Total</ThemedText>

                          {/* Amount */}
                          <View style={styles.totalPriceContainer}>
                            <ThemedText style={styles.totalAmount}>
                              ${totalPrice.toFixed(2)}
                            </ThemedText>
                            <ThemedText
                              style={styles.totalNote}
                              lightColor="rgba(60, 60, 67, 0.6)"
                              darkColor="rgba(235, 235, 245, 0.65)"
                            >
                              Includes service fee
                            </ThemedText>
                          </View>
                        </View>
                      </View>

                      {/* Continue button */}
                      <View style={styles.paymentButtonContainer}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={handleBuyTickets}
                          style={[
                            styles.paymentButton,
                            {
                              backgroundColor: isDark ? '#FFFFFF' : '#000000',
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.paymentButtonText,
                              { color: isDark ? '#000000' : '#FFFFFF' },
                            ]}
                          >
                            Continue
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </ThemedView>
      </WebSlideTransition>

      {/* Ticket Picker Modal - 1:1 with Package Type Dropdown */}
      <Modal
        visible={showTicketPicker}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowTicketPicker(false)}
      >
        {/* Full screen backdrop overlay */}
        <TouchableOpacity
          style={styles.fullScreenBackdrop}
          onPress={() => setShowTicketPicker(false)}
          activeOpacity={1}
        >
          {/* Dropdown content positioned directly under ticket selector */}
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
                {/* Header row with title and close button */}
                <View style={styles.guestDropdownHeader}>
                  <ThemedText style={styles.guestDropdownTitle}>Ticket Type</ThemedText>
                  <TouchableOpacity
                    style={styles.guestDropdownCloseButton}
                    onPress={() => setShowTicketPicker(false)}
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

                {/* Ticket Type Selection */}
                <View style={styles.guestSection}>
                  {ticketTypes.map(ticket => (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[
                        styles.guestRow,
                        {
                          backgroundColor:
                            selectedTicketType?.id === ticket.id
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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedTicketType(ticket);
                        setShowTicketPicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.guestSubLabel, { fontFamily: Fonts.bold }]}>
                          {ticket.name}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.guestSubLabel,
                            { fontSize: responsiveFontSize(14), opacity: 0.7, marginTop: 2 },
                          ]}
                        >
                          {ticket.description}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.guestSubLabel,
                            { fontSize: responsiveFontSize(12), opacity: 0.6, marginTop: 2 },
                          ]}
                        >
                          {ticket.available} available • ${ticket.price}/ticket
                        </ThemedText>
                      </View>
                      {selectedTicketType?.id === ticket.id && (
                        <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    height: HEADER_HEIGHT,
    width: width,
    overflow: 'hidden',
  },
  galleryImage: {
    width: width,
    height: HEADER_HEIGHT,
  },
  contentSheet: {
    ...StyleSheet.absoluteFillObject,
  },
  titleSection: {
    paddingHorizontal: 16,
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
  galleryImageCard: {
    width: '100%',
    aspectRatio: 3 / 2, // Slightly taller previews for better detail
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
  },
  sectionTitle: {
    fontSize: responsiveFontSize(22),
    lineHeight: 28,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  description: {
    fontSize: responsiveFontSize(16),
    lineHeight: 24,
    opacity: 0.8,
  },
  detailsSection: {
    padding: 20,
  },
  detailsGrid: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: responsiveFontSize(16),
    lineHeight: 20,
    fontFamily: Fonts.medium,
    opacity: 0.7,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
    flexShrink: 1,
  },
  detailIconBubble: {
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
  detailPillText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  accessibilitySection: {
    padding: 20,
  },
  accessibilityPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  accessibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  accessibilityPillIcon: {
    marginRight: 6,
  },
  accessibilityPillText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  hostSection: {
    padding: 20,
    borderBottomWidth: 0.5,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  hostInitial: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
  },
  hostInfo: {
    flex: 1,
  },
  hostDetails: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
    marginBottom: 8,
  },
  hostName: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  hostContact: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  bookingSection: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 12,
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
    fontSize: responsiveFontSize(12),
    fontWeight: '400',
    opacity: 0.6,
    marginBottom: 1,
  },
  priceText: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  priceCurrency: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    marginRight: 2,
  },
  priceUnit: {
    fontSize: responsiveFontSize(14),
    fontWeight: '400',
    opacity: 0.7,
    marginLeft: 2,
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateOutsideLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    marginBottom: 6,
    textAlign: 'left',
  },
  guestsSection: {
    marginBottom: 16,
    gap: 12,
  },
  guestsTitle: {
    marginBottom: 0,
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
  guestContainer: {
    marginBottom: 0,
    position: 'relative',
  },
  guestLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    marginBottom: 6,
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
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  availabilityContainer: {
    marginBottom: 16,
  },
  availabilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  availabilityText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    color: '#4CAF50',
  },
  totalContainer: {
    marginBottom: 4,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: responsiveFontSize(16),
    color: '#666',
  },
  breakdownAmount: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
  },
  totalSeparator: {
    borderTopWidth: 1,
    marginVertical: 8,
  },
  dueTodayTitle: {
    marginBottom: 4,
  },
  totalRow: {
    width: '100%',
    marginTop: 8,
    paddingVertical: 6,
  },
  creativeTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 4,
    flex: 1,
  },
  totalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  totalMainLabel: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    flex: 1,
    marginLeft: 12,
    lineHeight: 22,
  },
  totalPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 4,
  },
  totalAmount: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    lineHeight: 30,
  },
  totalNote: {
    marginTop: 4,
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.regular,
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
  // Ticket Selector Styles
  roomContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  guestSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  guestValue: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  // Modal Styles - 1:1 with activity-profile
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 0,
    gap: 12,
    width: '100%',
    maxWidth: 400,
    minHeight: 350,
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
  guestDropdownCloseButton: {
    // No longer absolutely positioned since it's in the header row
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  },
});
