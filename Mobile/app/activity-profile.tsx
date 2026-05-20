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
import * as Haptics from 'expo-haptics';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import {
  isFavorited as isFavoritedUtil,
  toggleFavorite as toggleFavoriteUtil,
} from '@/utils/favoritesUtils';
import { getActivityStatus, activityStatusColor } from '@/utils/timeStatus';
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

export default function ActivityProfileScreen() {
  const params = useLocalSearchParams();
  const { activityId, activityName, activityLocation } = params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const rawPriceFrom = Array.isArray(params.priceFrom) ? params.priceFrom[0] : params.priceFrom;
  const basePackagePrice = useMemo(() => {
    const parsed = rawPriceFrom ? Number(rawPriceFrom) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 25;
  }, [rawPriceFrom]);

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const galleryCardBackground = isDark ? '#2C2C2E' : '#E5E5EA';

  const getActivityDescription = (id: string) => {
    const descriptions: Record<string, string> = {
      'paintball-arena':
        "Experience the ultimate adrenaline rush at Harare's premier paintball facility! Our state-of-the-art arena features multiple themed battlefields perfect for team building, birthday parties, or just an exciting day out with friends. With professional equipment, safety briefings, and experienced marshals, we ensure an action-packed yet safe experience for players of all skill levels.",
      'quadbike-safari':
        'Explore the stunning wilderness around Victoria Falls on an exhilarating quad bike adventure! Navigate through rugged terrain, spot wildlife, and experience the African bush like never before. Our guided tours cater to both beginners and experienced riders, with top-quality ATVs and all safety gear provided. Perfect for thrill-seekers looking to add adventure to their Victoria Falls visit.',
      'helicopter-ride':
        "Soar above one of the Seven Natural Wonders of the World on an unforgettable helicopter flight! Witness the majestic Victoria Falls from a bird's-eye view, capturing breathtaking aerial perspectives of the cascading waters, rainbow mist, and the Zambezi River gorge. Our experienced pilots provide insightful commentary while ensuring a smooth, safe, and spectacular journey. Available in 12-minute and 25-minute flight options.",
      'zipline-adventure':
        "Feel the rush of flying through the air on Mutare's longest and highest zipline course! Set in the scenic Eastern Highlands, our zipline adventure offers stunning mountain views as you glide between platforms at thrilling speeds. Perfect for adventure enthusiasts and nature lovers alike. Professional guides, full safety equipment, and training provided. Suitable for ages 10 and up.",
      'kayak-rentals':
        'Discover the tranquil beauty of Lake Kariba at your own pace with our premium kayak rentals. Paddle along the pristine shoreline, explore hidden coves, and enjoy incredible wildlife viewing opportunities including hippos, crocodiles, and diverse birdlife. We provide stable single and tandem kayaks, life jackets, paddles, and waterproof bags. Guided tours and sunset paddles also available.',
      'default-activity':
        "Embark on an unforgettable adventure experience in the heart of Zimbabwe. Whether you're seeking thrills, nature, or relaxation, this activity offers the perfect way to explore and enjoy Zimbabwe's stunning landscapes and vibrant culture.",
    };
    return descriptions[id] || descriptions['default-activity'];
  };

  const [activity] = useState({
    id: activityId || 'default-activity',
    name: (activityName as string) || 'Paintball Arena',
    location: (activityLocation as string) || 'Harare',
    operatingHours: '09:00 - 18:00',
    duration: '2 hours',
    durationHours: 2,
    images: [
      'https://picsum.photos/800/600?random=41',
      'https://picsum.photos/800/600?random=42',
      'https://picsum.photos/800/600?random=43',
      'https://picsum.photos/800/600?random=44',
    ],
    description: getActivityDescription((activityId as string) || 'default-activity'),
    rating: 4.6,
    totalRatings: 189,
    category: 'Adventure',
    tags: ['Outdoor', 'Group Activity', 'Adrenaline', 'All Ages'],
    provider: {
      name: 'Zimbabwe Adventures',
      contact: '+263 77 987 6543',
      verified: true,
    },
    groupSize: 'Up to 20 people',
    minAge: 12,
    accessibility: ['Parking Available', 'Refreshments'],
    included: ['Equipment', 'Safety Gear', 'Professional Guide', 'Briefing'],
  });

  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const panGestureRef = useRef<PanGestureHandler>(null);

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [showTimeSlotPicker, setShowTimeSlotPicker] = useState(false);

  const [showPackagePicker, setShowPackagePicker] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const packages = useMemo(() => {
    const roundToFive = (value: number) => Math.max(5, Math.round(value / 5) * 5);
    const basePrice = roundToFive(basePackagePrice);
    const standardPrice = roundToFive(Math.max(basePrice * 1.4, basePrice + 15));
    const premiumPrice = roundToFive(Math.max(basePrice * 1.9, standardPrice + 25));

    return [
      {
        id: 'basic',
        name: 'Basic Package',
        price: basePrice,
        description: 'Standard experience',
        available: 15,
      },
      {
        id: 'standard',
        name: 'Standard Package',
        price: standardPrice,
        description: 'Enhanced experience with extras',
        available: 12,
      },
      {
        id: 'premium',
        name: 'Premium Package',
        price: premiumPrice,
        description: 'Full experience with exclusive perks',
        available: 8,
        perks: ['Priority Access', 'Refreshments', 'Souvenir Photo', 'Extended Duration'],
      },
    ];
  }, [basePackagePrice]);

  const galleryImages = useMemo(() => {
    return activity.images || [];
  }, [activity.images]);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activityId) {
      setIsFavorited(isFavoritedUtil(activityId as string));
    }
  }, [activityId]);

  useFocusEffect(
    useCallback(() => {
      if (activityId) {
        setIsFavorited(isFavoritedUtil(activityId as string));
      }
      if (!isLoading) {
        opacityAnim.setValue(1);
      }
    }, [activityId, isLoading, opacityAnim])
  );

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
      scrollY.setValue(0);
    }
  }, [scrollViewRef, activityId, scrollY]);

  useEffect(() => {
    if (!selectedPackage && packages.length > 0) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  const handleGoBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const toggleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activityId) {
      toggleFavoriteUtil(activityId as string);
      setIsFavorited(isFavoritedUtil(activityId as string));
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Share activity');
  };

  const activityStatus = useMemo(() => {
    const status = getActivityStatus(new Date(), {
      operatingHours: activity.operatingHours,
      durationHours: activity.durationHours,
    });
    return {
      status,
      color: activityStatusColor(status),
    };
  }, [activity.operatingHours, activity.durationHours]);

  const activityDetails = useMemo(() => {
    const details: Array<{
      label: string;
      value: string;
      icon: keyof typeof Ionicons.glyphMap;
      iconColor?: string;
      valueColor?: string;
    }> = [
      {
        label: 'Operating Hours',
        value: activity.operatingHours,
        icon: 'time-outline',
        iconColor: '#5856D6',
      },
      {
        label: 'Duration',
        value: activity.duration,
        icon: 'hourglass-outline',
        iconColor: '#FF9500',
      },
      {
        label: 'Group Size',
        value: activity.groupSize,
        icon: 'people-outline',
        iconColor: '#0A84FF',
      },
      {
        label: 'Minimum Age',
        value: `${activity.minAge}+ years`,
        icon: 'person-outline',
        iconColor: '#FF2D55',
      },
    ];

    return details;
  }, [activity.duration, activity.groupSize, activity.minAge, activity.operatingHours]);

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
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentCalendarMonth(prev => {
        const newMonth = new Date(prev);
        newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newMonth;
      });
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    });
  };

  const handleDirections = useCallback(() => {
    console.log('Get directions');
  }, []);

  const handleCallProvider = useCallback(() => {
    console.log('Call provider');
  }, []);

  const handleMessageProvider = useCallback(() => {
    if (!activity?.provider) {
      return;
    }

    const messageData = {
      id: `provider-${activityId || 'unknown'}`,
      name: activity.name || 'Activity',
      message: '',
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isRead: true,
      avatar: activity.name.charAt(0).toUpperCase(),
      avatarImage: `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent(activity.name)}&size=128&backgroundColor=FF4757`,
      avatarBgColor: isDark ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 71, 87, 0.08)',
      avatarBorderColor: '#FF4757',
      status: 'received' as const,
      isNewConversation: true,
      providerName: activity.provider.name,
      activityId,
    };

    router.push({
      pathname: '/message-detail',
      params: {
        message: JSON.stringify(messageData),
      },
    });
  }, [activity, activityId, isDark, router]);

  // Date picker functions
  const handleDatePress = () => {
    setShowDatePicker(true);
  };

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    // Don't close modal - let user close via backdrop or close button
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
    return 'Select date';
  };

  // Generate time slots based on operating hours and duration
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const [startTime, endTime] = activity.operatingHours.split(' - ');
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Calculate last booking time (closing time minus duration)
    const durationHours = activity.durationHours || 1;
    const closingTimeInMinutes = endHour * 60 + endMinute;
    const lastBookingTimeInMinutes = closingTimeInMinutes - durationHours * 60;
    const lastBookingHour = Math.floor(lastBookingTimeInMinutes / 60);
    const lastBookingMinute = lastBookingTimeInMinutes % 60;

    // Generate slots from opening to last booking time
    for (let hour = startHour; hour <= lastBookingHour; hour++) {
      // Add on-the-hour slot
      if (hour < lastBookingHour || (hour === lastBookingHour && lastBookingMinute >= 0)) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        slots.push(time);
      }

      // Add half-hour slot
      if (hour < lastBookingHour || (hour === lastBookingHour && lastBookingMinute >= 30)) {
        const halfTime = `${hour.toString().padStart(2, '0')}:30`;
        slots.push(halfTime);
      }
    }

    return slots;
  }, [activity.operatingHours, activity.durationHours]);

  // Check if a time slot is in the past (only for today's date)
  const isTimeSlotPast = useCallback(
    (timeSlot: string) => {
      if (!selectedDate) return false;

      const selectedDateObj = new Date(selectedDate);
      const today = new Date();

      // Only disable past slots if selected date is today
      const isToday = selectedDateObj.toDateString() === today.toDateString();
      if (!isToday) return false;

      // Parse the time slot
      const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;

      // Get current time
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      // Slot is past if it's before or equal to current time
      return slotTimeInMinutes <= currentTimeInMinutes;
    },
    [selectedDate]
  );

  const handleTimeSlotSelect = (timeSlot: string) => {
    // Don't allow selecting past time slots
    if (isTimeSlotPast(timeSlot)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSelectedTimeSlot(timeSlot);
    // Don't close modal - let user close via backdrop or close button
  };

  const getDefaultTimeSlotDisplay = () => {
    if (selectedTimeSlot) {
      return selectedTimeSlot;
    }
    return 'Select time';
  };

  const handleBookActivity = useCallback(() => {
    if (!selectedPackage) return;

    // Set attempted submit to show validation errors
    setAttemptedSubmit(true);

    // Validate required fields
    if (!selectedDate || !selectedTimeSlot) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // totalPrice already calculated: price * participants * 1.05 (5% service fee)
    const basePrice = selectedPackage.price * participantCount;
    const serviceFee = basePrice * 0.05;
    const total = basePrice + serviceFee;

    router.push({
      pathname: '/payment',
      params: {
        type: 'activity',
        activityId: activity.id,
        activityName: activity.name,
        activityLocation: activity.location,
        packageType: selectedPackage.name,
        participants: participantCount,
        unitPrice: selectedPackage.price,
        totalAmount: total.toFixed(2),
        duration: activity.duration,
        activityDate: selectedDate || '',
        activityTime: selectedTimeSlot || '',
        subtotal: basePrice.toFixed(2),
        tax: serviceFee.toFixed(2),
      },
    });
  }, [activity, selectedPackage, participantCount, selectedDate, selectedTimeSlot]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalPrice = selectedPackage ? selectedPackage.price * participantCount * 1.05 : 0; // Including 5% service fee

  if (isLoading || !activity) {
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
                source={{ uri: activity.images[0] }}
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
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      height: 4000,
                      borderTopLeftRadius: 32,
                      borderTopRightRadius: 32,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <WallpaperPattern offsetTop={0} unlimited={true} height={4000} />
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
                    title={activity.name}
                    location={activity.location}
                    rating={activity.rating}
                    reviewsText={`• ${activity.totalRatings} reviews`}
                    onFavoritePress={toggleFavorite}
                    onSharePress={handleShare}
                    isFavorited={isFavorited}
                    onDirectionsPress={handleDirections}
                    onCallPress={handleCallProvider}
                    onMessagePress={activity.provider ? handleMessageProvider : undefined}
                    statusPillProps={{
                      label: activityStatus.status,
                      iconName: 'time',
                      iconColor: activityStatus.color,
                      lightTextColor: activityStatus.color,
                      darkTextColor: activityStatus.color,
                    }}
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
                      {activity.tags.slice(0, 6).map(tag => (
                        <View
                          key={`${activity.id}-${tag}`}
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
                              location: activity.location,
                              title: activity.name,
                              galleryType: 'provider',
                              contextImage: activity.images[0] || galleryImages[0],
                              images: JSON.stringify(galleryImages),
                              activityId: activityName,
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
                                location: activity.location,
                                title: activity.name,
                                galleryType: 'provider',
                                contextImage: activity.images[0] || galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                activityId: activityName,
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
                                location: activity.location,
                                title: activity.name,
                                galleryType: 'provider',
                                contextImage: activity.images[0] || galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                activityId: activityName,
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
                    <ThemedText style={styles.description}>{activity.description}</ThemedText>
                  </View>
                </View>

                {/* Activity Details */}
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
                    <ThemedText style={styles.sectionTitle}>Activity Details</ThemedText>
                    <View style={styles.detailsGrid}>
                      {activityDetails.map(detail => (
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
                                name={detail.icon}
                                size={12}
                                color={detail.iconColor ?? (isDark ? '#FFFFFF' : '#1C1C1E')}
                              />
                            </View>
                            <ThemedText
                              style={[
                                styles.detailPillText,
                                { color: detail.valueColor ?? (isDark ? '#FFFFFF' : '#1C1C1E') },
                              ]}
                              numberOfLines={1}
                            >
                              {detail.value}
                            </ThemedText>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* What is Included */}
                {activity.included && activity.included.length > 0 && (
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
                      <ThemedText style={styles.sectionTitle}>What is Included</ThemedText>
                      <View style={styles.accessibilityPillsContainer}>
                        {activity.included.map((item, index) => (
                          <View
                            key={`included-${index}`}
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
                {selectedPackage && (
                  <View
                    style={[
                      styles.bookingSection,
                      {
                        backgroundColor: cardBackground,
                      },
                    ]}
                  >
                    <ThemedText style={styles.sectionTitle}>Book your activity</ThemedText>

                    {/* Price Display */}
                    <View style={styles.priceContainer}>
                      <ThemedText style={styles.fromText}>from</ThemedText>
                      <View style={styles.priceRow}>
                        <Ionicons
                          name="pricetag-outline"
                          size={18}
                          color="#34C759"
                          style={styles.priceIcon}
                        />
                        <ThemedText style={styles.priceText}>
                          <ThemedText style={styles.priceCurrency}>$</ThemedText>
                          {selectedPackage.price}
                          <ThemedText style={styles.priceUnit}>/person</ThemedText>
                        </ThemedText>
                      </View>
                    </View>

                    {/* Date Selection */}
                    <View style={styles.dateContainer}>
                      <View style={styles.labelErrorContainer}>
                        <ThemedText style={styles.dateOutsideLabel}>Activity Date</ThemedText>
                        {attemptedSubmit && !selectedDate && (
                          <ThemedText style={styles.inputRequired}>
                            This field is required
                          </ThemedText>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.dateInput,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                        onPress={handleDatePress}
                      >
                        <ThemedText style={styles.dateValue}>{getDefaultDateDisplay()}</ThemedText>
                      </TouchableOpacity>
                    </View>

                    {/* Time Slot Selection */}
                    <View style={styles.dateContainer}>
                      <View style={styles.labelErrorContainer}>
                        <ThemedText style={styles.dateOutsideLabel}>Time Slot</ThemedText>
                        {attemptedSubmit && !selectedTimeSlot && (
                          <ThemedText style={styles.inputRequired}>
                            This field is required
                          </ThemedText>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.dateInput,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                        onPress={() => setShowTimeSlotPicker(true)}
                      >
                        <ThemedText style={styles.dateValue}>
                          {getDefaultTimeSlotDisplay()}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    {/* Package Selection */}
                    <View style={styles.roomContainer}>
                      <ThemedText style={styles.dateOutsideLabel}>Package Type</ThemedText>
                      <TouchableOpacity
                        style={[
                          styles.guestSelector,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                        onPress={() => setShowPackagePicker(!showPackagePicker)}
                      >
                        <ThemedText style={styles.guestValue}>
                          {selectedPackage?.name || 'Select Package'}
                        </ThemedText>
                        <Ionicons
                          name={showPackagePicker ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={isDark ? '#FFFFFF' : '#000000'}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Participants Selection */}
                    <View style={styles.guestsSection}>
                      <ThemedText style={[styles.dateOutsideLabel, styles.guestsTitle]}>
                        Number of Participants
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
                                opacity: participantCount <= 1 ? 0.4 : 1,
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
                              if (participantCount > 1) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setParticipantCount(prev => prev - 1);
                              }
                            }}
                            disabled={participantCount <= 1}
                            activeOpacity={participantCount <= 1 ? 0.4 : 0.8}
                          >
                            <Ionicons
                              name="remove-sharp"
                              size={28}
                              color="#FF3B30"
                              style={{ fontWeight: '900' }}
                            />
                          </TouchableOpacity>
                          <ThemedText style={styles.guestCount}>{participantCount}</ThemedText>
                          <TouchableOpacity
                            style={[
                              styles.counterButton,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(52, 199, 89, 0.15)'
                                  : 'rgba(52, 199, 89, 0.1)',
                                opacity: participantCount >= selectedPackage.available ? 0.4 : 1,
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
                              if (participantCount < selectedPackage.available) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setParticipantCount(prev => prev + 1);
                              }
                            }}
                            disabled={participantCount >= selectedPackage.available}
                            activeOpacity={
                              participantCount >= selectedPackage.available ? 0.4 : 0.8
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
                          Available - only {selectedPackage.available} spots left!
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
                          ${selectedPackage.price} × {participantCount} participant
                          {participantCount > 1 ? 's' : ''}
                        </ThemedText>
                        <ThemedText style={styles.breakdownAmount}>
                          ${(selectedPackage.price * participantCount).toFixed(2)}
                        </ThemedText>
                      </View>

                      {/* Service fee */}
                      <View style={styles.priceBreakdownRow}>
                        <ThemedText style={styles.breakdownLabel}>Service fee (5%)</ThemedText>
                        <ThemedText style={styles.breakdownAmount}>
                          ${(selectedPackage.price * participantCount * 0.05).toFixed(2)}
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
                          onPress={handleBookActivity}
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

            {/* Date Picker Modal */}
            <Modal
              visible={showDatePicker}
              transparent={true}
              animationType="fade"
              statusBarTranslucent={true}
              onRequestClose={() => setShowDatePicker(false)}
            >
              {/* Full screen backdrop overlay */}
              <TouchableOpacity
                style={styles.fullScreenBackdrop}
                onPress={() => setShowDatePicker(false)}
                activeOpacity={1}
              >
                {/* Dropdown content positioned directly under date selector */}
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
                        <ThemedText style={styles.guestDropdownTitle}>Date</ThemedText>
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
                                const startDay = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
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
                                // Use local timezone for consistent date string formatting
                                const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateString;
                                const isPast =
                                  currentDate.getTime() < new Date().setHours(0, 0, 0, 0);

                                // Get today's date in local timezone to avoid timezone issues
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

                              // Only render week if it has at least one valid day
                              if (weekDays.every(day => day === null)) return null;

                              return (
                                <View key={`week-${weekIndex}`} style={styles.itineraryWeekRow}>
                                  {weekDays.map((day, dayIndex) => (
                                    <View
                                      key={dayIndex}
                                      style={styles.itineraryCalendarDayContainer}
                                    >
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

            {/* Time Slot Picker Modal - Similar to Room Dropdown */}
            <Modal
              visible={showTimeSlotPicker}
              transparent={true}
              animationType="fade"
              statusBarTranslucent={true}
              onRequestClose={() => setShowTimeSlotPicker(false)}
            >
              {/* Full screen backdrop overlay */}
              <TouchableOpacity
                style={styles.fullScreenBackdrop}
                onPress={() => setShowTimeSlotPicker(false)}
                activeOpacity={1}
              >
                {/* Dropdown content positioned directly under time slot selector */}
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
                        <ThemedText style={styles.guestDropdownTitle}>Time Slot</ThemedText>
                        <TouchableOpacity
                          style={styles.guestDropdownCloseButton}
                          onPress={() => setShowTimeSlotPicker(false)}
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

                      {/* Time Slot Selection Grid */}
                      <View style={styles.guestSection}>
                        <View style={styles.timeSlotGrid}>
                          {timeSlots.map(slot => {
                            const isPast = isTimeSlotPast(slot);
                            return (
                              <TouchableOpacity
                                key={slot}
                                style={[
                                  styles.timeSlotButton,
                                  selectedTimeSlot === slot &&
                                    !isPast && [
                                      styles.timeSlotButtonSelected,
                                      { backgroundColor: isDark ? '#FFFFFF' : '#000000' },
                                    ],
                                  selectedTimeSlot !== slot &&
                                    !isPast && {
                                      backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(0,0,0,0.05)',
                                    },
                                  isPast && {
                                    backgroundColor: isDark
                                      ? 'rgba(255,255,255,0.03)'
                                      : 'rgba(0,0,0,0.02)',
                                    opacity: 0.4,
                                  },
                                ]}
                                onPress={e => {
                                  e.stopPropagation();
                                  handleTimeSlotSelect(slot);
                                }}
                                disabled={isPast}
                                activeOpacity={isPast ? 1 : 0.7}
                              >
                                <ThemedText
                                  style={[
                                    styles.timeSlotText,
                                    selectedTimeSlot === slot &&
                                      !isPast && [
                                        styles.timeSlotTextSelected,
                                        { color: isDark ? '#000000' : '#FFFFFF' },
                                      ],
                                    isPast && {
                                      opacity: 0.5,
                                    },
                                  ]}
                                >
                                  {slot}
                                </ThemedText>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Package Picker Modal - 1:1 with Room Type Dropdown */}
            <Modal
              visible={showPackagePicker}
              transparent={true}
              animationType="fade"
              statusBarTranslucent={true}
              onRequestClose={() => setShowPackagePicker(false)}
            >
              {/* Full screen backdrop overlay */}
              <TouchableOpacity
                style={styles.fullScreenBackdrop}
                onPress={() => setShowPackagePicker(false)}
                activeOpacity={1}
              >
                {/* Dropdown content positioned directly under package selector */}
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
                        <ThemedText style={styles.guestDropdownTitle}>Package Type</ThemedText>
                        <TouchableOpacity
                          style={styles.guestDropdownCloseButton}
                          onPress={() => setShowPackagePicker(false)}
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

                      {/* Package Type Selection */}
                      <View style={styles.guestSection}>
                        {packages.map(pkg => (
                          <TouchableOpacity
                            key={pkg.id}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor:
                                  selectedPackage?.id === pkg.id
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
                              setSelectedPackage(pkg);
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <ThemedText
                                style={[styles.guestSubLabel, { fontFamily: Fonts.bold }]}
                              >
                                {pkg.name}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  { fontSize: responsiveFontSize(14), opacity: 0.7, marginTop: 2 },
                                ]}
                              >
                                {pkg.description}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  { fontSize: responsiveFontSize(12), opacity: 0.6, marginTop: 2 },
                                ]}
                              >
                                {pkg.available} available • ${pkg.price}/person
                              </ThemedText>
                            </View>
                            {selectedPackage?.id === pkg.id && (
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
          </Animated.View>
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
  titleCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 26,
    gap: 18,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 0,
  },
  titleActionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  pillIcon: {
    marginRight: 4,
  },
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
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
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
    textAlign: 'left',
  },
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  guestsSection: {
    marginBottom: 16,
    gap: 12,
  },
  guestsTitle: {
    marginBottom: 0,
  },
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
  dateInput: {
    padding: 12, // Reduced from 16 to make smaller
    borderRadius: 8,
  },
  dateValue: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 0,
  },
  timeSlotButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotButtonSelected: {
    overflow: 'hidden',
  },
  timeSlotText: {
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  guestDropdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40, // Add vertical padding to ensure the close button has space
    zIndex: 1002,
    backgroundColor: 'transparent',
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 400, // Match the card width
    alignSelf: 'center',
  },
  guestDropdownCard: {
    borderRadius: 12,
    paddingTop: 20, // Reduced padding since we have proper header structure
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 0,
    gap: 12,
    width: '100%',
    maxWidth: 400,
    minHeight: 350, // Adjusted for more compact calendar
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
    // Removed padding that was causing centering issues
  },
  // Itinerary Calendar Styles (matching stay-profile exactly)
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
