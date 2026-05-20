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
  TextInput,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader } from '@/components/CustomHeader';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import {
  isFavorited as isFavoritedUtil,
  toggleFavorite as toggleFavoriteUtil,
} from '@/utils/favoritesUtils';
import { getStayById, cloneStay } from '@/constants/StayData';
import type { Stay, RoomType } from '@/types/Stay';
import { goBackToDestination } from '@/utils/navigationUtils';
import {
  ProfileGalleryHeader,
  ProviderHeroCard,
  PushScreenOptions,
  WebSlideTransition,
} from '@/components';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { getAmenityIcon } from '@/utils/amenityUtils';
import { staysService } from '@/services/database';
import { useAuth } from '@/context/AuthContext';
import { buildProviderMessage, openProviderMessagesTab } from '@/utils/messageNavigation';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 340;
const FALLBACK_STAY_IMAGE = 'https://picsum.photos/800/800?random=404';

// Gallery constants (matching event-profile)
const GALLERY_CARD_GAP = 4; // Minimal gap so previews appear nearly edge-to-edge
const SECTION_HORIZONTAL_MARGIN = 16;
const GALLERY_CONTAINER_PADDING = 8; // Trimmed padding to reduce whitespace around images
const AVAILABLE_GALLERY_WIDTH =
  width - SECTION_HORIZONTAL_MARGIN * 2 - GALLERY_CONTAINER_PADDING * 2;
const GALLERY_CARD_WIDTH = (AVAILABLE_GALLERY_WIDTH - GALLERY_CARD_GAP) / 2;

const ensureStayShape = (raw: Stay): Stay => {
  const normalizedImages =
    Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images
      : raw.imageUrl
        ? [raw.imageUrl]
        : [FALLBACK_STAY_IMAGE];

  const normalizedAmenities = Array.isArray(raw.amenities) ? raw.amenities : [];

  return {
    ...raw,
    perNight: raw.perNight ?? true,
    imageUrl: raw.imageUrl ?? normalizedImages[0],
    images: [...normalizedImages],
    amenities: [...normalizedAmenities],
    host: raw.host ? { ...raw.host } : undefined,
    details: raw.details ? { ...raw.details } : undefined,
  };
};
export default function StayProfileScreen() {
  const params = useLocalSearchParams();
  const { stayId, destinationId, stayData, source } = params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isGuest } = useAuth();
  const { showAlert } = useAppAlert();

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const galleryCardBackground = isDark ? '#2C2C2E' : '#E5E5EA';

  const [stay, setStay] = useState<Stay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const stayName = stay?.name ?? 'Your stay';

  const normalizedStayId = useMemo(() => {
    if (typeof stayId === 'string') return stayId;
    if (Array.isArray(stayId)) return stayId[0];
    return undefined;
  }, [stayId]);

  // Room types from database or fallback to defaults
  const roomTypes = useMemo(() => {
    if (stay?.roomTypes && stay.roomTypes.length > 0) {
      return stay.roomTypes;
    }
    // Fallback to default room types if not available from database
    return [
      {
        id: 'standard',
        name: 'Standard Room',
        price: 89,
        maxGuests: 2,
        description: '1 Queen bed',
        amenities: [],
        available: true,
        totalRooms: 10,
        availableRooms: 10,
        stayName: stay?.name,
      },
      {
        id: 'deluxe',
        name: 'Deluxe Room',
        price: 129,
        maxGuests: 2,
        description: '1 King bed',
        amenities: [],
        available: true,
        totalRooms: 8,
        availableRooms: 8,
        stayName: stay?.name,
      },
      {
        id: 'suite',
        name: 'Executive Suite',
        price: 199,
        maxGuests: 4,
        description: '1 King bed + sofa bed',
        amenities: [],
        available: true,
        totalRooms: 5,
        availableRooms: 5,
        stayName: stay?.name,
      },
      {
        id: 'family',
        name: 'Family Room',
        price: 159,
        maxGuests: 4,
        description: '2 Queen beds',
        amenities: [],
        available: true,
        totalRooms: 6,
        availableRooms: 6,
        stayName: stay?.name,
      },
    ];
  }, [stay?.roomTypes]);

  // Booking states
  const [checkInDate, setCheckInDate] = useState<string>(() => getTodayDateString());
  const [checkOutDate, setCheckOutDate] = useState<string>(() => getTomorrowDateString());
  const [checkOutDateDisplay, setCheckOutDateDisplay] = useState<string>(() =>
    getTomorrowDateString()
  ); // Display next day but don't mark it yet
  const [adults, setAdults] = useState(1); // Default to 1 adult, minimum required
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [selectedRoomType, setSelectedRoomType] = useState(roomTypes[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [sameAsAccountHolder, setSameAsAccountHolder] = useState(true);
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(false); // Track if selecting check-out

  // Animation refs for smooth transitions
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const calendarOpacityAnim = useRef(new Animated.Value(1)).current;
  const panGestureRef = useRef<PanGestureHandler>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Update favorite state whenever stayId changes or component mounts
  useEffect(() => {
    if (normalizedStayId) {
      setIsFavorited(isFavoritedUtil(normalizedStayId));
    }
  }, [normalizedStayId]);

  // Refresh favorite state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (normalizedStayId) {
        setIsFavorited(isFavoritedUtil(normalizedStayId));
      }
      // Only set opacity to 1 on first load if not currently loading
      if (!isLoading) {
        opacityAnim.setValue(1);
      }
    }, [normalizedStayId, isLoading, opacityAnim])
  );

  // Reset scroll position when stay changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
      // Also reset the animated value
      scrollY.setValue(0);
    }
  }, [scrollViewRef, stayData, stayId, scrollY]);

  // Handle back navigation
  const handleGoBack = () => {
    console.log('Navigation params:', { source, destinationId, stayId });

    if (source === 'destination-detail') {
      goBackToDestination(destinationId);
      return;
    }

    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  // Load stay data
  useEffect(() => {
    // Set loading state immediately when stayId changes
    setIsLoading(true);
    setStay(null); // Clear previous data immediately

    // Start with invisible content
    opacityAnim.setValue(0);

    // Small delay to prevent flash of old content
    const loadData = async () => {
      // If stayData is provided via params (from the navigation helper), prefer it
      if (stayData) {
        try {
          const parsedStayData: Stay = JSON.parse(stayData as string);
          setStay(ensureStayShape(parsedStayData));
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Error parsing stayData:', error);
        }
      }

      // Try to load from database first
      if (normalizedStayId) {
        try {
          console.log('Fetching stay from database with ID:', normalizedStayId);
          const { data: dbStay, error } = await staysService.getById(normalizedStayId);

          console.log('Database response:', { hasData: !!dbStay, error, stayName: dbStay?.name });

          if (!error && dbStay) {
            // Map database stay to Stay type format (similar to Stays.tsx)
            const galleryImages =
              dbStay.stay_gallery
                ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
                .map((img: any) => img.image_url) || [];

            const roomTypes =
              dbStay.stay_rooms?.map((room: any) => ({
                id: room.id,
                name: room.name || room.room_type,
                price: room.base_price,
                maxGuests: room.max_guests,
                description: room.description,
                amenities: room.amenities || [],
                available: room.is_active,
                totalRooms: room.total_rooms || 0,
                availableRooms: room.available_rooms || 0,
                stayName: room.stay_name || dbStay.name,
              })) || [];

            console.log('Room types found:', roomTypes.length, 'rooms');

            const basePrice =
              roomTypes.length > 0
                ? Math.min(...roomTypes.map((room: { price: number }) => room.price))
                : dbStay.price || 0;

            // Use amenities from stays table only
            const stayAmenities = Array.isArray(dbStay.amenities) ? dbStay.amenities : [];

            console.log('Stay amenities from stays table:', stayAmenities);

            const mappedStay: Stay = {
              id: dbStay.id,
              name: dbStay.name,
              location: dbStay.location || dbStay.destinations?.location || '',
              description: dbStay.description || '',
              price: basePrice,
              rating: dbStay.rating || 0,
              imageUrl: dbStay.image_url || galleryImages[0] || '',
              images: galleryImages.length > 0 ? galleryImages : dbStay.images || [],
              amenities: stayAmenities,
              host: dbStay.host,
              details: dbStay.details,
              perNight: true,
            };

            console.log(
              'Mapped stay amenities count:',
              mappedStay.amenities.length,
              mappedStay.amenities
            );
            setStay(ensureStayShape(mappedStay));
            setIsLoading(false);
            return;
          } else {
            console.log('No database data or error:', error);
          }
        } catch (error) {
          console.error('Error fetching stay from database:', error);
        }
      }

      // Fallback: Attempt to resolve the stay from shared dataset using stayId
      const resolvedStay = normalizedStayId ? getStayById(normalizedStayId) : undefined;

      if (resolvedStay) {
        setStay(ensureStayShape(cloneStay(resolvedStay)));
        setIsLoading(false);
        return;
      }

      console.warn(`StayProfileScreen: Unable to resolve stay for id ${normalizedStayId}`);
      setStay(null);
      setIsLoading(false);

      // Smooth, slow fade-in of new content
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400, // Slower fade-in (400ms)
        useNativeDriver: true,
      }).start();
    };

    // Execute data loading with a small delay to prevent content flash
    const timer = setTimeout(() => {
      loadData();
    }, 50); // Brief delay to prevent flash of old content

    return () => clearTimeout(timer);
  }, [opacityAnim, stayData, normalizedStayId]);

  // Update selected room type when roomTypes change (e.g., when stay data loads)
  useEffect(() => {
    if (roomTypes.length > 0) {
      // Select the cheapest room by default
      const cheapestRoom = roomTypes.reduce(
        (min, room) => (room.price < min.price ? room : min),
        roomTypes[0]
      );
      setSelectedRoomType(cheapestRoom);
    }
  }, [roomTypes]);

  // Helper function to get available room types that can accommodate guests
  const getAvailableRoomTypes = useCallback(() => {
    const totalGuests = adults + children;

    return roomTypes
      .map((roomType: RoomType) => {
        const availableRooms = roomType.availableRooms ?? roomType.totalRooms ?? 0;
        const maxGuestsThisRoomType = roomType.maxGuests * availableRooms;
        const minRoomsNeeded = Math.ceil(totalGuests / roomType.maxGuests);

        return {
          ...roomType,
          minRoomsNeeded,
          canAccommodate: maxGuestsThisRoomType >= totalGuests && availableRooms >= minRoomsNeeded,
        };
      })
      .filter(roomType => roomType.canAccommodate) // Only show rooms that can accommodate all guests
      .sort((a, b) => a.price - b.price); // Sort by price, cheapest first
  }, [adults, children, roomTypes]);

  // Check if selected room type can still accommodate guests when guest count changes
  useEffect(() => {
    const totalGuests = adults + children;
    const availableRooms = selectedRoomType.availableRooms ?? selectedRoomType.totalRooms ?? 0;
    const maxGuestsThisRoomType = selectedRoomType.maxGuests * availableRooms;
    const minRoomsNeeded = Math.ceil(totalGuests / selectedRoomType.maxGuests);

    // If current room type can't accommodate guests, switch to one that can
    if (maxGuestsThisRoomType < totalGuests || availableRooms < minRoomsNeeded) {
      const availableRoomTypes = getAvailableRoomTypes();
      if (availableRoomTypes.length > 0) {
        // Switch to the cheapest available room type
        setSelectedRoomType(availableRoomTypes[0]);
      }
    }
  }, [adults, children, selectedRoomType, getAvailableRoomTypes]);

  // Gallery images (matching event-profile pattern)
  const galleryImages = useMemo(() => {
    return stay?.images || [];
  }, [stay?.images]);

  const toggleFavorite = () => {
    if (normalizedStayId) {
      toggleFavoriteUtil(normalizedStayId, 'stay');
      setIsFavorited(isFavoritedUtil(normalizedStayId));
    }
  };

  const handleCallStay = useCallback(() => {
    if (!stay?.phone) {
      showAlert({
        title: 'No Phone Number',
        message: 'Phone number is not available for this property.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }
    const phoneNumber = Platform.OS === 'ios' ? `telprompt:${stay.phone}` : `tel:${stay.phone}`;
    Linking.openURL(phoneNumber).catch(() => {
      showAlert({
        title: 'Error',
        message: 'Unable to make phone call',
        buttons: [{ text: 'OK' }],
      });
    });
  }, [stay?.phone]);

  const handleDirections = useCallback(() => {
    if (!stay?.fullLocation) {
      showAlert({
        title: 'No Location',
        message: 'Location details are not available for this property.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }
    const address = encodeURIComponent(stay.fullLocation);
    const url = Platform.OS === 'ios' ? `maps://app?daddr=${address}` : `geo:0,0?q=${address}`;
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    });
  }, [stay?.fullLocation]);

  const handleMessageHost = useCallback(() => {
    if (!stay) {
      return;
    }

    // Use service provider name if available, otherwise fall back to stay name
    const providerName = stay.providerName || stay.name || 'Property';
    const messageData = buildProviderMessage({
      id: `provider-${stay.providerId || normalizedStayId || 'unknown'}`,
      name: providerName,
      avatarImage:
        stay.providerLogo ||
        `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent(stay.name || 'Property')}&size=128&backgroundColor=FF4757`,
      sourceType: 'stay',
      providerId: stay.providerId,
    });

    openProviderMessagesTab(messageData);
  }, [stay, normalizedStayId]);

  // Booking helper functions
  const calculateNights = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateTotalPrice = useCallback(() => {
    const resolvedCheckIn = checkInDate ?? getTodayDateString();
    const resolvedCheckOut = checkOutDate ?? checkOutDateDisplay ?? getTomorrowDateString();
    const nights = calculateNights(resolvedCheckIn, resolvedCheckOut);
    const basePrice = nights * selectedRoomType.price * rooms;
    const serviceFee = basePrice * 0.05; // 5% service fee
    const total = basePrice + serviceFee;
    return total.toFixed(2);
  }, [checkInDate, checkOutDate, checkOutDateDisplay, selectedRoomType.price, rooms]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  function getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  function getTomorrowDateString(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  }

  const getDefaultCheckInDisplay = () => {
    return checkInDate ? formatDate(checkInDate) : formatDate(getTodayDateString());
  };

  const getDefaultCheckOutDisplay = () => {
    return checkOutDateDisplay
      ? formatDate(checkOutDateDisplay)
      : formatDate(getTomorrowDateString());
  };

  const formatGuestText = () => {
    let text = '';
    if (adults > 0) {
      text += `${adults} adult${adults > 1 ? 's' : ''}`;
    }
    if (children > 0) {
      text +=
        adults > 0
          ? ` · ${children} child${children > 1 ? 'ren' : ''}`
          : `${children} child${children > 1 ? 'ren' : ''}`;
    }
    return text;
  };

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const getEmailError = () => {
    if (!attemptedSubmit) return null;
    if (!guestEmail.trim()) return 'This field is required';
    if (!isValidEmail(guestEmail)) return 'Invalid email format';
    return null;
  };

  const handleProceedToPayment = useCallback(() => {
    const resolvedCheckIn = checkInDate ?? getTodayDateString();
    const resolvedCheckOut = checkOutDate ?? getTomorrowDateString();

    // Calculate nights using the helper function
    const nights = calculateNights(resolvedCheckIn, resolvedCheckOut);

    // Use existing calculation: base + 5% service fee
    const basePrice = nights * selectedRoomType.price * rooms;
    const serviceFee = basePrice * 0.05;

    router.push({
      pathname: '/passenger-details',
      params: {
        type: 'stay',
        stayId: normalizedStayId ?? '',
        stayName,
        serviceProvider: stayName,
        total: (basePrice + serviceFee).toFixed(2),
        checkIn: resolvedCheckIn,
        checkOut: resolvedCheckOut,
        checkInTime: stay?.checkInTime || '14:00:00',
        checkOutTime: stay?.checkOutTime || '11:00:00',
        nights: String(nights),
        rooms: String(rooms),
        adults: String(adults),
        children: String(children),
        roomTypeId: selectedRoomType.id,
        roomTypeName: selectedRoomType.name,
        roomTypeRate: String(selectedRoomType.price),
        subtotal: basePrice.toFixed(2),
        tax: serviceFee.toFixed(2),
      },
    });
  }, [
    checkInDate,
    checkOutDate,
    normalizedStayId,
    rooms,
    adults,
    children,
    stayName,
    selectedRoomType.price,
    stay?.checkInTime,
    stay?.checkOutTime,
  ]);

  // Validation logic
  const validateGuestRoomConfiguration = useCallback(() => {
    const totalGuests = adults + children;

    // Can't have children without adults
    if (children > 0 && adults === 0) {
      setAdults(1);
      return; // Exit early, this will trigger another validation
    }

    // Calculate minimum rooms needed based on selected room type
    const maxGuestsPerRoom = selectedRoomType.maxGuests;
    const minRoomsNeeded = Math.ceil(totalGuests / maxGuestsPerRoom);
    const availableRooms = selectedRoomType.availableRooms ?? selectedRoomType.totalRooms ?? 0;

    // Auto-adjust room count: use minimum needed, but cap at available
    const targetRooms = Math.min(minRoomsNeeded, availableRooms);
    if (rooms !== targetRooms) {
      setRooms(targetRooms);
    }
  }, [
    adults,
    children,
    rooms,
    selectedRoomType.maxGuests,
    selectedRoomType.availableRooms,
    selectedRoomType.totalRooms,
  ]);

  // Run validation whenever guests or room type changes
  useEffect(() => {
    validateGuestRoomConfiguration();
  }, [validateGuestRoomConfiguration, adults, children]);

  // Handle pan gesture for month navigation (same as itinerary)
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
          // Swipe right - go to previous month (only if not current month)
          if (!isCurrentMonth) {
            navigateMonth('prev');
          }
        } else if (translationX < 0 || velocityX < 0) {
          // Swipe left - go to next month
          navigateMonth('next');
        }
      }
    }
  };

  // Navigate month with animation (same as itinerary)
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (isAnimating) return;

    setIsAnimating(true);
    Animated.timing(calendarOpacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentCalendarMonth(prev => {
        const newMonth = new Date(prev);
        newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newMonth;
      });
      Animated.timing(calendarOpacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    });
  };

  const formatRoomText = () => {
    return `${rooms} room${rooms > 1 ? 's' : ''} · ${selectedRoomType.name}`;
  };

  const handleCheckInDatePress = () => {
    setIsSelectingCheckOut(false);
    setShowDatePicker(true);
  };

  const handleCheckOutDatePress = () => {
    setIsSelectingCheckOut(true);
    setShowDatePicker(true);
  };

  const handleDateSelect = (dateString: string) => {
    if (isSelectingCheckOut) {
      // User is selecting check-out date. Use current check-in or default to today.
      const effectiveCheckIn = checkInDate || getTodayDateString();

      if (dateString > effectiveCheckIn) {
        setCheckOutDate(dateString);
        setCheckOutDateDisplay(dateString);
        setShowDatePicker(false);
        setIsSelectingCheckOut(false);
      }
    } else {
      // User is selecting check-in date
      setCheckInDate(dateString);

      // Calculate next day for display only
      const selectedDate = new Date(dateString);
      selectedDate.setDate(selectedDate.getDate() + 1);
      const nextDay = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      setCheckOutDateDisplay(nextDay);
      setCheckOutDate(nextDay); // Set it for calculations but won't be marked in calendar

      // Dismiss calendar after selecting check-in
      setShowDatePicker(false);
    }
  };

  const handleShare = async () => {
    // Implement share functionality
  };

  if (isLoading || !stay) {
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
                style={{ marginBottom: 4 }} // Override the default marginBottom of 15
              />
            </View>
            {/* Empty space instead of "Loading..." text */}
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

          {/* Header section with CustomHeader - exactly like destination-stays - OUTSIDE animation */}
          <View style={[styles.headerArea, { backgroundColor: isDark ? '#000000' : '#f2f2f7' }]}>
            <CustomHeader
              showLogo={true}
              leftAction={{
                icon: 'chevron-back',
                onPress: handleGoBack,
              }}
              style={{ marginBottom: 0 }} // Remove any bottom margin
            />
          </View>

          {/* Content with smooth fade-in animation */}
          <Animated.View style={[{ flex: 1 }, { opacity: opacityAnim }]}>
            {/* Single Image (no scrolling) with parallax effect */}
            <View style={[styles.galleryContainer, { backgroundColor: '#000000' }]}>
              <Animated.Image
                source={{ uri: stay.images[0] }}
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
                    title={stay.name}
                    location={stay.location}
                    rating={stay.rating}
                    reviewsText={stay.totalReviews ? `• ${stay.totalReviews} reviews` : undefined}
                    logoUrl={stay.providerLogo}
                    onFavoritePress={toggleFavorite}
                    onSharePress={handleShare}
                    isFavorited={isFavorited}
                    onDirectionsPress={handleDirections}
                    onCallPress={handleCallStay}
                    callDisabled={isGuest}
                    onMessagePress={handleMessageHost}
                    messageDisabled={isGuest}
                  />
                </View>

                {/* Amenities Card */}
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
                  {/* Amenities */}
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
                      {stay.amenities.slice(0, 6).map(amenity => (
                        <View
                          key={`${stay.id}-${amenity}`}
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
                            name={getAmenityIcon(amenity)}
                            size={14}
                            color={isDark ? '#FFFFFF' : '#333333'}
                            style={styles.amenityIcon}
                          />
                          <ThemedText
                            style={styles.titleAmenityText}
                            darkColor="#ECEDEE"
                            lightColor="#1C1C1E"
                          >
                            {amenity}
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
                    <ProfileGalleryHeader
                      onPress={() =>
                        !isGuest &&
                        router.push({
                          pathname: '/gallery',
                          params: {
                            location: stay.location || stay.name,
                            title: stay.name,
                            galleryType: 'provider',
                            contextImage: stay.imageUrl || galleryImages[0],
                            images: JSON.stringify(galleryImages),
                            stayId: stayName,
                          },
                        })
                      }
                      disabled={isGuest}
                    />
                    <View style={styles.gallerySectionContainer}>
                      <View style={styles.galleryRow}>
                        {/* First Image */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.galleryCardContainer,
                            { backgroundColor: galleryCardBackground, opacity: isGuest ? 0.5 : 1 },
                          ]}
                          disabled={isGuest}
                          onPress={() =>
                            router.push({
                              pathname: '/gallery',
                              params: {
                                location: stay.location || stay.name,
                                title: stay.name,
                                galleryType: 'provider',
                                contextImage: stay.imageUrl || galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                stayId: stayName,
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
                            { backgroundColor: galleryCardBackground, opacity: isGuest ? 0.5 : 1 },
                          ]}
                          disabled={isGuest}
                          onPress={() =>
                            router.push({
                              pathname: '/gallery',
                              params: {
                                location: stay.location || stay.name,
                                title: stay.name,
                                galleryType: 'provider',
                                contextImage: stay.imageUrl || galleryImages[0],
                                images: JSON.stringify(galleryImages),
                                stayId: stayName,
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

                {/* Booking Section */}
                <View
                  style={[
                    styles.bookingSection,
                    {
                      backgroundColor: cardBackground,
                    },
                  ]}
                >
                  <ThemedText style={styles.sectionTitle}>Book your stay</ThemedText>

                  {/* Price Display - Updated to match DestinationDetail style */}
                  <View style={styles.priceContainer}>
                    <ThemedText style={styles.fromText}>from</ThemedText>
                    <View style={styles.priceRow}>
                      <Ionicons
                        name="card-outline"
                        size={18}
                        color="#34C759"
                        style={styles.priceIcon}
                      />
                      <ThemedText style={styles.priceText}>
                        <ThemedText style={styles.priceCurrency}>$</ThemedText>
                        {Math.min(...roomTypes.map(rt => rt.price))}
                        <ThemedText style={styles.priceUnit}>/night</ThemedText>
                      </ThemedText>
                    </View>
                  </View>

                  {/* Date Selection */}
                  <View style={styles.dateContainer}>
                    <View style={styles.dateRow}>
                      <View style={styles.dateColumn}>
                        <ThemedText style={styles.dateOutsideLabel}>Check-in</ThemedText>
                        <TouchableOpacity
                          style={[
                            styles.dateInput,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,0,0,0.05)',
                              opacity: isGuest ? 0.5 : 1,
                            },
                          ]}
                          onPress={handleCheckInDatePress}
                          disabled={isGuest}
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
                              marginRight: 8,
                            }}
                          >
                            <Ionicons name="calendar" size={10} color="#8E8E93" />
                          </View>
                          <ThemedText style={styles.dateValue}>
                            {getDefaultCheckInDisplay()}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.dateColumn}>
                        <ThemedText style={styles.dateOutsideLabel}>Check-out</ThemedText>
                        <TouchableOpacity
                          style={[
                            styles.dateInput,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,0,0,0.05)',
                              opacity: isGuest ? 0.5 : 1,
                            },
                          ]}
                          onPress={handleCheckOutDatePress}
                          disabled={isGuest}
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
                              marginRight: 8,
                            }}
                          >
                            <Ionicons name="calendar" size={10} color="#8E8E93" />
                          </View>
                          <ThemedText style={styles.dateValue}>
                            {getDefaultCheckOutDisplay()}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Guests */}
                  <View style={styles.guestsSection}>
                    <ThemedText style={[styles.dateOutsideLabel, styles.guestsTitle]}>
                      Guests
                    </ThemedText>

                    <View style={styles.guestContainer}>
                      <TouchableOpacity
                        style={[
                          styles.guestSelector,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            opacity: isGuest ? 0.5 : 1,
                          },
                        ]}
                        onPress={() => setShowGuestDropdown(!showGuestDropdown)}
                        disabled={isGuest}
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
                            marginRight: 8,
                          }}
                        >
                          <Ionicons name="people" size={10} color="#8E8E93" />
                        </View>
                        <ThemedText style={styles.guestValue}>{formatGuestText()}</ThemedText>
                        <Ionicons
                          name={showGuestDropdown ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={isDark ? '#FFFFFF' : '#000000'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Guest Dropdown Modal - Full screen overlay including header */}
                  <Modal
                    visible={showGuestDropdown}
                    transparent={true}
                    animationType="fade"
                    statusBarTranslucent={true}
                    onRequestClose={() => setShowGuestDropdown(false)}
                  >
                    {/* Full screen backdrop overlay */}
                    <TouchableOpacity
                      style={styles.fullScreenBackdrop}
                      onPress={() => setShowGuestDropdown(false)}
                      activeOpacity={1}
                    >
                      {/* Dropdown content positioned directly under guest selector */}
                      <View style={styles.guestDropdownContainer}>
                        <View style={styles.cardWrapper}>
                          <TouchableOpacity
                            activeOpacity={1}
                            onPress={e => e.stopPropagation()}
                            style={[
                              styles.guestDropdownCard,
                              {
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                position: 'relative', // Ensure it can contain absolute positioned elements
                              },
                            ]}
                          >
                            {/* Header row with title and close button */}
                            <View style={styles.guestDropdownHeader}>
                              <ThemedText style={styles.guestDropdownTitle}>Guests</ThemedText>
                              <TouchableOpacity
                                style={styles.guestDropdownCloseButton}
                                onPress={() => setShowGuestDropdown(false)}
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

                            {/* Adults */}
                            <View style={styles.guestSection}>
                              <ThemedText style={styles.dateOutsideLabel}>Adults</ThemedText>
                              <View
                                style={[
                                  styles.guestRow,
                                  {
                                    backgroundColor: isDark
                                      ? 'rgba(255,255,255,0.1)'
                                      : 'rgba(0,0,0,0.05)',
                                  },
                                ]}
                              >
                                <View>
                                  <ThemedText style={styles.guestSubLabel}>Ages 13+</ThemedText>
                                </View>
                                <View style={styles.guestCounter}>
                                  <TouchableOpacity
                                    onPress={e => {
                                      e.stopPropagation();
                                      if (adults > 1) {
                                        setAdults(adults - 1);
                                      }
                                    }}
                                    style={[
                                      styles.counterButton,
                                      {
                                        backgroundColor: isDark
                                          ? 'rgba(255, 59, 48, 0.15)'
                                          : 'rgba(255, 59, 48, 0.1)',
                                        opacity: adults <= 1 ? 0.4 : 1,
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
                                    disabled={adults <= 1}
                                    activeOpacity={adults <= 1 ? 0.4 : 0.8}
                                  >
                                    <Ionicons
                                      name="remove-sharp"
                                      size={28}
                                      color="#FF3B30"
                                      style={{ fontWeight: '900' }}
                                    />
                                  </TouchableOpacity>
                                  <ThemedText style={styles.guestCount}>{adults}</ThemedText>
                                  <TouchableOpacity
                                    onPress={e => {
                                      e.stopPropagation();
                                      setAdults(adults + 1);
                                    }}
                                    style={[
                                      styles.counterButton,
                                      {
                                        backgroundColor: isDark
                                          ? 'rgba(52, 199, 89, 0.15)'
                                          : 'rgba(52, 199, 89, 0.1)',
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

                            {/* Children */}
                            <View style={styles.guestSection}>
                              <ThemedText style={styles.dateOutsideLabel}>Children</ThemedText>
                              <View
                                style={[
                                  styles.guestRow,
                                  {
                                    backgroundColor: isDark
                                      ? 'rgba(255,255,255,0.1)'
                                      : 'rgba(0,0,0,0.05)',
                                  },
                                ]}
                              >
                                <View>
                                  <ThemedText style={styles.guestSubLabel}>Ages 2-12</ThemedText>
                                </View>
                                <View style={styles.guestCounter}>
                                  <TouchableOpacity
                                    onPress={e => {
                                      e.stopPropagation();
                                      if (children > 0) {
                                        setChildren(children - 1);
                                      }
                                    }}
                                    style={[
                                      styles.counterButton,
                                      {
                                        backgroundColor: isDark
                                          ? 'rgba(255, 59, 48, 0.15)'
                                          : 'rgba(255, 59, 48, 0.1)',
                                        opacity: children === 0 ? 0.4 : 1,
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
                                    disabled={children === 0}
                                    activeOpacity={children === 0 ? 0.4 : 0.8}
                                  >
                                    <Ionicons
                                      name="remove-sharp"
                                      size={28}
                                      color="#FF3B30"
                                      style={{ fontWeight: '900' }}
                                    />
                                  </TouchableOpacity>
                                  <ThemedText style={styles.guestCount}>{children}</ThemedText>
                                  <TouchableOpacity
                                    onPress={e => {
                                      e.stopPropagation();
                                      setChildren(children + 1);
                                    }}
                                    style={[
                                      styles.counterButton,
                                      {
                                        backgroundColor: isDark
                                          ? 'rgba(52, 199, 89, 0.15)'
                                          : 'rgba(52, 199, 89, 0.1)',
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
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Modal>

                  {/* Room Selection */}
                  <View style={styles.roomContainer}>
                    <ThemedText style={styles.dateOutsideLabel}>Room type</ThemedText>
                    <TouchableOpacity
                      style={[
                        styles.guestSelector,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          opacity: isGuest ? 0.5 : 1,
                        },
                      ]}
                      onPress={() => setShowRoomDropdown(!showRoomDropdown)}
                      disabled={isGuest}
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
                          marginRight: 8,
                        }}
                      >
                        <Ionicons name="bed" size={10} color="#8E8E93" />
                      </View>
                      <ThemedText style={styles.guestValue}>{formatRoomText()}</ThemedText>
                      <Ionicons
                        name={showRoomDropdown ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={isDark ? '#FFFFFF' : '#000000'}
                      />
                    </TouchableOpacity>

                    {/* Room Dropdown Modal - Similar to Guest Dropdown */}
                    <Modal
                      visible={showRoomDropdown}
                      transparent={true}
                      animationType="fade"
                      statusBarTranslucent={true}
                      onRequestClose={() => setShowRoomDropdown(false)}
                    >
                      {/* Full screen backdrop overlay */}
                      <TouchableOpacity
                        style={styles.fullScreenBackdrop}
                        onPress={() => setShowRoomDropdown(false)}
                        activeOpacity={1}
                      >
                        {/* Dropdown content positioned directly under room selector */}
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
                                <ThemedText style={styles.guestDropdownTitle}>Room Type</ThemedText>
                                <TouchableOpacity
                                  style={styles.guestDropdownCloseButton}
                                  onPress={() => setShowRoomDropdown(false)}
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

                              {/* Room Type Selection */}
                              <ScrollView
                                style={{ maxHeight: 500 }}
                                showsVerticalScrollIndicator={false}
                              >
                                <View style={styles.guestSection}>
                                  {getAvailableRoomTypes().map(
                                    (roomType: RoomType & { minRoomsNeeded: number }) => (
                                      <TouchableOpacity
                                        key={roomType.id}
                                        style={[
                                          styles.roomTypeItem,
                                          {
                                            backgroundColor:
                                              selectedRoomType.id === roomType.id
                                                ? isDark
                                                  ? 'rgba(52, 199, 89, 0.15)'
                                                  : 'rgba(52, 199, 89, 0.1)'
                                                : isDark
                                                  ? 'rgba(255,255,255,0.05)'
                                                  : 'rgba(0,0,0,0.03)',
                                          },
                                        ]}
                                        onPress={e => {
                                          e.stopPropagation();
                                          setSelectedRoomType(roomType);
                                          setShowRoomDropdown(false);
                                        }}
                                      >
                                        <View style={styles.roomTypeHeader}>
                                          <ThemedText
                                            style={[
                                              styles.guestSubLabel,
                                              { fontFamily: Fonts.bold, flex: 1 },
                                            ]}
                                          >
                                            {roomType.name}
                                          </ThemedText>
                                          {selectedRoomType.id === roomType.id && (
                                            <Ionicons
                                              name="checkmark-circle"
                                              size={24}
                                              color="#34C759"
                                            />
                                          )}
                                        </View>
                                        <ThemedText
                                          style={[
                                            styles.guestSubLabel,
                                            {
                                              fontSize: responsiveFontSize(14),
                                              opacity: 0.7,
                                              marginBottom: 8,
                                            },
                                          ]}
                                        >
                                          {roomType.description}
                                        </ThemedText>
                                        <View style={styles.roomTypePills}>
                                          {/* Max Guests Pill */}
                                          <View
                                            style={[
                                              styles.infoPill,
                                              {
                                                backgroundColor: isDark
                                                  ? 'rgba(255,255,255,0.1)'
                                                  : 'rgba(0,0,0,0.05)',
                                              },
                                            ]}
                                          >
                                            <View
                                              style={[
                                                styles.infoPillIconWrapper,
                                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                              ]}
                                            >
                                              <Ionicons name="people" size={12} color="#8E8E93" />
                                            </View>
                                            <ThemedText
                                              style={[
                                                styles.infoPillText,
                                                { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                                              ]}
                                            >
                                              Max {roomType.maxGuests}
                                            </ThemedText>
                                          </View>
                                          {/* Price Pill */}
                                          <View
                                            style={[
                                              styles.infoPill,
                                              {
                                                backgroundColor: isDark
                                                  ? 'rgba(255,255,255,0.1)'
                                                  : 'rgba(0,0,0,0.05)',
                                              },
                                            ]}
                                          >
                                            <View
                                              style={[
                                                styles.infoPillIconWrapper,
                                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                              ]}
                                            >
                                              <Ionicons
                                                name="card-outline"
                                                size={12}
                                                color="#34C759"
                                              />
                                            </View>
                                            <ThemedText
                                              style={[
                                                styles.infoPillText,
                                                { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                                              ]}
                                            >
                                              ${roomType.price}/night
                                            </ThemedText>
                                          </View>
                                        </View>
                                      </TouchableOpacity>
                                    )
                                  )}
                                </View>
                              </ScrollView>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  </View>

                  {/* Availability Status */}
                  {(() => {
                    const totalRooms = selectedRoomType.totalRooms ?? 0;
                    const availableRooms = selectedRoomType.availableRooms ?? totalRooms;
                    const availabilityPercentage =
                      totalRooms > 0 ? (availableRooms / totalRooms) * 100 : 0;

                    // Color coding based on percentage of available rooms
                    // Red: <= 33% available (low stock)
                    // Orange: 34-66% available (medium stock)
                    // Green: > 66% available (good stock)
                    const isLowStock = availabilityPercentage > 0 && availabilityPercentage <= 33;
                    const isMediumStock =
                      availabilityPercentage > 33 && availabilityPercentage <= 66;
                    const dotColor =
                      availableRooms === 0
                        ? '#FF3B30'
                        : isLowStock
                          ? '#FF3B30'
                          : isMediumStock
                            ? '#FF9500'
                            : '#34C759';

                    return availableRooms > 0 ? (
                      <View style={styles.availabilityContainer}>
                        <View style={styles.availabilityIndicator}>
                          <View style={[styles.availabilityDot, { backgroundColor: dotColor }]} />
                          <ThemedText
                            style={[
                              styles.availabilityText,
                              { color: dotColor, fontWeight: '700' },
                            ]}
                          >
                            {isLowStock
                              ? `Only ${availableRooms} room${availableRooms === 1 ? '' : 's'} left!`
                              : `${availableRooms} room${availableRooms === 1 ? '' : 's'} available`}
                          </ThemedText>
                        </View>
                      </View>
                    ) : totalRooms > 0 ? (
                      <View style={styles.availabilityContainer}>
                        <View style={styles.availabilityIndicator}>
                          <View style={[styles.availabilityDot, { backgroundColor: '#FF3B30' }]} />
                          <ThemedText
                            style={[
                              styles.availabilityText,
                              { color: '#FF3B30', fontWeight: '700' },
                            ]}
                          >
                            Sold out
                          </ThemedText>
                        </View>
                      </View>
                    ) : null;
                  })()}

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
                        ${selectedRoomType.price} ×{' '}
                        {checkInDate && checkOutDate
                          ? calculateNights(checkInDate, checkOutDate)
                          : 1}{' '}
                        night
                        {(checkInDate && checkOutDate
                          ? calculateNights(checkInDate, checkOutDate)
                          : 1) > 1
                          ? 's'
                          : ''}{' '}
                        × {rooms} room{rooms > 1 ? 's' : ''}
                      </ThemedText>
                      <ThemedText style={styles.breakdownAmount}>
                        $
                        {(
                          selectedRoomType.price *
                          (checkInDate && checkOutDate
                            ? calculateNights(checkInDate, checkOutDate)
                            : 1) *
                          rooms
                        ).toFixed(2)}
                      </ThemedText>
                    </View>

                    {/* Service fee */}
                    <View style={styles.priceBreakdownRow}>
                      <ThemedText style={styles.breakdownLabel}>Service fee (5%)</ThemedText>
                      <ThemedText style={styles.breakdownAmount}>
                        $
                        {(
                          selectedRoomType.price *
                          (checkInDate && checkOutDate
                            ? calculateNights(checkInDate, checkOutDate)
                            : 1) *
                          rooms *
                          0.05
                        ).toFixed(2)}
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
                            ${calculateTotalPrice()}
                          </ThemedText>
                          <ThemedText
                            style={styles.totalNote}
                            lightColor="rgba(60, 60, 67, 0.6)"
                            darkColor="rgba(235, 235, 245, 0.65)"
                          >
                            Includes taxes and fees
                          </ThemedText>
                        </View>
                      </View>
                    </View>

                    {/* Continue button */}
                    <View style={styles.paymentButtonContainer}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleProceedToPayment}
                        disabled={
                          isGuest ||
                          (selectedRoomType.availableRooms ?? selectedRoomType.totalRooms ?? 0) ===
                            0
                        }
                        style={[
                          styles.paymentButton,
                          {
                            backgroundColor: isDark ? '#FFFFFF' : '#000000',
                            opacity:
                              isGuest ||
                              (selectedRoomType.availableRooms ??
                                selectedRoomType.totalRooms ??
                                0) === 0
                                ? 0.5
                                : 1,
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
                        <ThemedText style={styles.guestDropdownTitle}>Dates</ThemedText>
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
                            style={[styles.itineraryCalendarGrid, { opacity: calendarOpacityAnim }]}
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

                                // Only mark dates as selected based on context
                                const isSelected = isSelectingCheckOut
                                  ? checkInDate === dateString || checkOutDate === dateString
                                  : checkInDate === dateString;

                                const isPast =
                                  currentDate.getTime() < new Date().setHours(0, 0, 0, 0);

                                // If selecting check-out, disable dates before/equal the effective check-in
                                const effectiveCheckIn = checkInDate ?? getTodayDateString();
                                const isBeforeCheckIn =
                                  isSelectingCheckOut && dateString <= effectiveCheckIn;

                                const isDisabled = isPast || !!isBeforeCheckIn;

                                // Check if this date is between check-in and check-out (exclusive)
                                const isBetween =
                                  isSelectingCheckOut &&
                                  checkInDate &&
                                  checkOutDate &&
                                  dateString > checkInDate &&
                                  dateString < checkOutDate;

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
                                  isBetween,
                                  isDisabled,
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
                                            if (!day.isDisabled) {
                                              handleDateSelect(day.date);
                                            }
                                          }}
                                          disabled={day.isDisabled}
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
                                              day.isBetween &&
                                                !day.isSelected && [
                                                  styles.itineraryBetweenDay,
                                                  { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
                                                ],
                                              day.isToday &&
                                                !day.isSelected &&
                                                !day.isBetween &&
                                                !day.isDisabled &&
                                                styles.itineraryTodayDay,
                                              day.isDisabled &&
                                                !day.isSelected &&
                                                !day.isToday &&
                                                !day.isBetween &&
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
                                                day.isBetween &&
                                                  !day.isSelected && [
                                                    styles.itineraryBetweenDayText,
                                                    { color: isDark ? '#FFFFFF' : '#000000' },
                                                  ],
                                                day.isToday &&
                                                  !day.isSelected &&
                                                  !day.isBetween &&
                                                  !day.isDisabled &&
                                                  styles.itineraryTodayDayText,
                                                day.isDisabled &&
                                                  !day.isSelected &&
                                                  !day.isToday &&
                                                  !day.isBetween &&
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

            {/* Room Picker Modal */}
            <Modal
              visible={showRoomPicker}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setShowRoomPicker(false)}
            >
              <View
                style={[styles.modalContainer, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
              >
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowRoomPicker(false)}>
                    <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.modalTitle}>Select Room Type</ThemedText>
                  <TouchableOpacity onPress={() => setShowRoomPicker(false)}>
                    <ThemedText style={styles.modalDoneText}>Done</ThemedText>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.guestPickerContent}>
                  {getAvailableRoomTypes().map(
                    (roomType: RoomType & { minRoomsNeeded: number }) => (
                      <TouchableOpacity
                        key={roomType.id}
                        style={[
                          styles.roomOption,
                          {
                            backgroundColor:
                              selectedRoomType.id === roomType.id
                                ? isDark
                                  ? 'rgba(52, 199, 89, 0.15)'
                                  : 'rgba(52, 199, 89, 0.1)'
                                : isDark
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'rgba(0,0,0,0.03)',
                          },
                          selectedRoomType.id === roomType.id && styles.selectedRoomOption,
                        ]}
                        onPress={() => {
                          setSelectedRoomType(roomType);
                          setShowRoomPicker(false);
                        }}
                      >
                        <View style={styles.roomInfo}>
                          <View style={styles.roomHeaderRow}>
                            <ThemedText style={styles.roomName}>{roomType.name}</ThemedText>
                            {selectedRoomType.id === roomType.id && (
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                            )}
                          </View>
                          <ThemedText style={styles.roomDescription}>
                            {roomType.description}
                          </ThemedText>

                          <View style={styles.roomPillsRow}>
                            {/* Max Guests Pill */}
                            <View
                              style={[
                                styles.infoPill,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'rgba(0,0,0,0.05)',
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.infoPillIconWrapper,
                                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                ]}
                              >
                                <Ionicons name="people" size={12} color="#8E8E93" />
                              </View>
                              <ThemedText
                                style={[
                                  styles.infoPillText,
                                  { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                                ]}
                              >
                                Max {roomType.maxGuests} guests
                              </ThemedText>
                            </View>

                            {/* Price Pill */}
                            <View
                              style={[
                                styles.infoPill,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'rgba(0,0,0,0.05)',
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.infoPillIconWrapper,
                                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                ]}
                              >
                                <Ionicons name="card-outline" size={12} color="#34C759" />
                              </View>
                              <ThemedText
                                style={[
                                  styles.infoPillText,
                                  { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                                ]}
                              >
                                ${roomType.price}/night
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>
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
  headerContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  galleryContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1,
  },
  headerImage: {
    width,
    height: HEADER_HEIGHT,
  },
  galleryImage: {
    width,
    height: HEADER_HEIGHT,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
  },
  heroOverlayTopShade: {
    flex: 1,
    backgroundColor: '#000000',
  },
  heroOverlayBottomShade: {
    flex: 1.1,
    backgroundColor: '#000000',
  },
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 44,
    paddingHorizontal: 16,
  },
  headerArea: {
    position: 'relative',
    width: '100%',
    zIndex: 20,
    marginBottom: 0,
    paddingBottom: 8,
  },
  transparentHeader: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  contactActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  contactActionText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  heroActionButtons: {
    position: 'absolute',
    top: 120,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
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
  titleIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 18,
  },
  stayTitle: {
    fontSize: responsiveFontSize(22),
    fontFamily: Fonts.bold,
    lineHeight: 28,
  },
  titleTextBlock: {
    flex: 1,
    gap: 8,
  },
  titleSubtitle: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
    letterSpacing: 0.3,
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
  titleActionCluster: {
    flexDirection: 'row',
    gap: 10,
    flexShrink: 0,
  },
  titleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  titleCardFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flex: 1,
  },
  contactPillText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(15),
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  directionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  directionsPillText: {
    fontSize: responsiveFontSize(15),
    lineHeight: 20,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 140,
    marginLeft: 'auto',
  },
  ratingPillText: {
    fontSize: responsiveFontSize(15),
    lineHeight: 20,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  pillIcon: {
    marginRight: 4,
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
  divider: {
    borderTopWidth: 0.5,
    width: '100%',
    marginTop: 8,
  },
  gallerySection: {
    marginBottom: 24,
    paddingBottom: 0,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 0,
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
  gallerySectionHeader: {
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
  locationText: {
    fontSize: responsiveFontSize(16),
    opacity: 0.7,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  detailsSection: {
    padding: 20,
    borderBottomWidth: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
  },
  descriptionSection: {
    padding: 20,
    borderBottomWidth: 0.5,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(22),
    lineHeight: 28,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  dueTodayTitle: {
    marginBottom: 4,
  },
  description: {
    fontSize: responsiveFontSize(16),
    lineHeight: 24,
    opacity: 0.8,
  },
  showMoreText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    color: '#007AFF',
    marginTop: 8,
  },
  amenitiesSection: {
    padding: 20,
    borderBottomWidth: 0.5,
  },
  amenitiesGrid: {
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amenityText: {
    fontSize: responsiveFontSize(16),
    flex: 1,
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
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  hostDetails: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
    marginBottom: 8,
  },
  hostStats: {
    gap: 4,
  },
  hostStat: {
    fontSize: responsiveFontSize(14),
    opacity: 0.8,
  },
  bottomSpacing: {
    height: 100,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Booking Section Styles
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
  guestsSection: {
    marginBottom: 16,
  },
  guestsTitle: {
    marginBottom: 6,
  },
  guestNameSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 0,
    gap: 12,
  },
  guestNameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  sameAsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sameAsLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  sameAsHelperText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
  guestDetailsForm: {
    gap: 12,
  },
  guestNameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputColumn: {
    flex: 1,
  },
  guestInput: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
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
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateColumn: {
    flex: 1,
  },
  dateOutsideLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    marginBottom: 6,
    textAlign: 'left',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, // Reduced from 16 to make smaller
    borderRadius: 8,
  },
  dateLabel: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  guestContainer: {
    marginBottom: 0,
    position: 'relative',
  },
  guestSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12, // Reduced from 16 to match dateInput
    borderRadius: 8,
  },
  guestInfo: {
    flex: 1,
  },
  guestLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  guestValue: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  guestDropdown: {
    position: 'absolute',
    top: 60, // Position it directly below the guest selector button
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  simpleBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  fullScreenBackdropAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  },
  fullScreenBackdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
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
  guestDropdownModal: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 12,
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
  dropdownItemCard: {
    borderRadius: 8,
    padding: 16,
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  dropdownLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  dropdownSubLabel: {
    fontSize: responsiveFontSize(14),
    opacity: 0.6,
    marginTop: 2,
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
    fontWeight: '700',
    color: '#4CAF50',
  },
  benefitsContainer: {
    marginBottom: 20,
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: responsiveFontSize(14),
    flex: 1,
  },
  totalContainer: {
    marginBottom: 4,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    paddingVertical: 6,
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
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalIcon: {
    marginRight: 4,
  },
  totalLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
  },
  totalAmount: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    lineHeight: 30,
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
  // Creative Total Section Styles
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
  totalLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
  totalTextContainer: {
    flex: 1,
  },
  totalMainLabel: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    flex: 1,
    marginLeft: 12,
    lineHeight: 22,
  },
  totalSubLabel: {
    fontSize: responsiveFontSize(13),
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  totalPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 4,
  },
  totalNote: {
    marginTop: 4,
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.regular,
  },
  totalCurrency: {
    fontSize: responsiveFontSize(12),
    color: '#666666',
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  modalCancelText: {
    fontSize: responsiveFontSize(16),
    color: '#FF3B30',
  },
  modalDoneText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#FF3B30',
  },
  datePickerContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthContainer: {
    marginTop: 20,
  },
  monthTitle: {
    fontSize: responsiveFontSize(26),
    fontFamily: Fonts.bold,
    marginBottom: 20,
    lineHeight: 32,
    textAlign: 'center',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateButton: {
    width: (width - 40 - 56) / 7, // 7 days per week, minus padding and gaps
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDateButton: {
    backgroundColor: '#FF3B30',
  },
  dateButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
  },
  selectedDateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  guestPickerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  roomTypeItem: {
    flexDirection: 'column',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  roomTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTypePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guestSection: {
    marginBottom: 20,
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 400, // Match the card width
    alignSelf: 'center',
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
  guestControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  guestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
  },
  guestCount: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  guestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  guestSubLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  // Additional calendar styles
  calendarContainer: {
    marginTop: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 10,
  },
  weekHeaderText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    width: (width - 40) / 7,
    textAlign: 'center',
  },
  selectedDatesContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    borderRadius: 12,
  },
  selectedDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectedDateLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
  },
  selectedDateValue: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  // Room Picker Styles
  roomOption: {
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedRoomOption: {
    borderColor: '#34C759',
  },
  roomInfo: {
    flex: 1,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    flex: 1,
  },
  roomDescription: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
    marginBottom: 12,
  },
  roomPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  roomCapacity: {
    fontSize: responsiveFontSize(12),
    opacity: 0.6,
  },
  roomPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomPrice: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  roomsNeeded: {
    fontSize: responsiveFontSize(12),
    fontWeight: '400',
    opacity: 0.8,
  },
  roomsNeededText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    opacity: 0.7,
    marginTop: 8,
  },
  totalRoomPrice: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 2,
  },
  noRoomsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noRoomsText: {
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
  },
  // Itinerary Calendar Styles (matching CalendarView.tsx exactly)
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
  itineraryBetweenDay: {
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
  itineraryBetweenDayText: {
    fontWeight: '500',
    fontSize: responsiveFontSize(20),
  },
  itineraryPastDayText: {
    opacity: 0.3,
    fontSize: responsiveFontSize(20),
  },
});
