import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader } from '@/components/CustomHeader';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import * as Haptics from 'expo-haptics';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { getCardSurfaceColors } from '@/constants/CardStyles';
import { LocationPill } from '@/components/LocationPill';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

interface FlightResult {
  id: string;
  name: string;
  operator: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  seatsAvailable: number;
  flightClass: string;
  amenities: string[];
}

export default function FlightSearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();

  const serviceProvider = Array.isArray(params.serviceProvider)
    ? params.serviceProvider[0]
    : params.serviceProvider || 'Bus Service';
  const fromLocation = Array.isArray(params.fromLocation)
    ? params.fromLocation[0]
    : params.fromLocation;
  const toLocation = Array.isArray(params.toLocation) ? params.toLocation[0] : params.toLocation;
  const departureDate = Array.isArray(params.departureDate)
    ? params.departureDate[0]
    : params.departureDate;
  const returnDate = Array.isArray(params.returnDate) ? params.returnDate[0] : params.returnDate;
  const tripType = Array.isArray(params.tripType) ? params.tripType[0] : params.tripType;
  const passengers = Array.isArray(params.passengers) ? params.passengers[0] : params.passengers;

  const [loading, setLoading] = useState(true);
  const [FlightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showPassengerPicker, setShowPassengerPicker] = useState(false);
  const [selectedFromLocation, setSelectedFromLocation] = useState(fromLocation || '');
  const [selectedToLocation, setSelectedToLocation] = useState(toLocation || '');
  const [selectedDate, setSelectedDate] = useState(departureDate || '');
  const [selectedReturnDate, setSelectedReturnDate] = useState(returnDate || '');
  const [selectedPassengers, setSelectedPassengers] = useState(parseInt(passengers as string) || 1);
  const [selectedTripType, setSelectedTripType] = useState<'oneWay' | 'return'>(
    (tripType as 'oneWay' | 'return') || 'oneWay'
  );
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [currentReturnCalendarMonth, setCurrentReturnCalendarMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReturnAnimating, setIsReturnAnimating] = useState(false);
  const [selectedDepartureFlight, setselectedDepartureFlight] = useState<string | null>(null);
  const [selectedReturnFlight, setselectedReturnFlight] = useState<string | null>(null);
  const [showDepartureError, setShowDepartureError] = useState(false);
  const [showReturnError, setShowReturnError] = useState(false);

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const returnOpacityAnim = useRef(new Animated.Value(1)).current;
  const panGestureRef = useRef<any>(null);
  const returnPanGestureRef = useRef<any>(null);

  const cardColors = getCardSurfaceColors(colorScheme);

  // Available destinations
  const destinations = ['Harare', 'Gweru', 'Kwekwe', 'Kadoma', 'Bulawayo'];

  // Calendar navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
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
      }).start(() => {
        setIsAnimating(false);
      });
    });
  };

  const onPanGestureEvent = (event: any) => {
    if (isAnimating) return;
    const { translationX, state } = event.nativeEvent;
    const threshold = 50;
    if (state === State.END && Math.abs(translationX) > threshold) {
      navigateMonth(translationX > 0 ? 'prev' : 'next');
    }
  };

  const handleDateSelect = (dateString: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDate(dateString);
  };

  const navigateReturnMonth = (direction: 'prev' | 'next') => {
    setIsReturnAnimating(true);
    Animated.timing(returnOpacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentReturnCalendarMonth(prev => {
        const newMonth = new Date(prev);
        newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newMonth;
      });
      Animated.timing(returnOpacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setIsReturnAnimating(false);
      });
    });
  };

  const onReturnPanGestureEvent = (event: any) => {
    if (isReturnAnimating) return;
    const { translationX, state } = event.nativeEvent;
    const threshold = 50;
    if (state === State.END && Math.abs(translationX) > threshold) {
      navigateReturnMonth(translationX > 0 ? 'prev' : 'next');
    }
  };

  const handleReturnDateSelect = (dateString: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedReturnDate(dateString);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if any search criteria has changed from the original params
  const hasSearchChanged = useMemo(() => {
    const fromChanged = selectedFromLocation !== (fromLocation || '');
    const toChanged = selectedToLocation !== (toLocation || '');
    const dateChanged = selectedDate !== (departureDate || '');
    const returnDateChanged = selectedReturnDate !== (returnDate || '');
    const tripTypeChanged = selectedTripType !== ((tripType as 'oneWay' | 'return') || 'oneWay');
    const passengersChanged = selectedPassengers !== (parseInt(passengers as string) || 1);

    // If trip type is "return" and no return date is selected, keep button disabled
    if (selectedTripType === 'return' && !selectedReturnDate) {
      return false;
    }

    return (
      fromChanged ||
      toChanged ||
      dateChanged ||
      returnDateChanged ||
      tripTypeChanged ||
      passengersChanged
    );
  }, [
    selectedFromLocation,
    selectedToLocation,
    selectedDate,
    selectedReturnDate,
    selectedTripType,
    selectedPassengers,
    fromLocation,
    toLocation,
    departureDate,
    returnDate,
    tripType,
    passengers,
  ]);

  // Mock flight search results - all from same airline since we're showing one provider's results
  const mockFlightResults: FlightResult[] = useMemo(
    () => [
      {
        id: '1',
        name: 'Air Zimbabwe',
        operator: 'Air Zimbabwe',
        departureTime: '08:00 AM',
        arrivalTime: '10:30 AM',
        duration: '2 hours 30 minutes',
        price: 250,
        seatsAvailable: 45,
        flightClass: 'Economy',
        amenities: ['WiFi', 'In-flight Meal', 'Entertainment', 'USB Charging'],
      },
      {
        id: '2',
        name: 'Air Zimbabwe',
        operator: 'Air Zimbabwe',
        departureTime: '12:00 PM',
        arrivalTime: '02:30 PM',
        duration: '2 hours 30 minutes',
        price: 280,
        seatsAvailable: 32,
        flightClass: 'Business',
        amenities: ['WiFi', 'Premium Meal', 'Entertainment', 'Priority Boarding'],
      },
      {
        id: '3',
        name: 'Air Zimbabwe',
        operator: 'Air Zimbabwe',
        departureTime: '06:00 PM',
        arrivalTime: '08:30 PM',
        duration: '2 hours 30 minutes',
        price: 320,
        seatsAvailable: 28,
        flightClass: 'First Class',
        amenities: ['WiFi', 'Gourmet Meal', 'Entertainment', 'Lounge Access', 'Extra Legroom'],
      },
    ],
    []
  );

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setFlightResults(mockFlightResults);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [mockFlightResults]);

  // Function to perform search with updated criteria
  const performSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Set loading state
    setLoading(true);

    // Simulate API call with new search criteria
    setTimeout(() => {
      // In a real app, this would fetch new results based on:
      // selectedFromLocation, selectedToLocation, selectedDate,
      // selectedReturnDate, selectedTripType, selectedPassengers
      setFlightResults(mockFlightResults);
      setLoading(false);

      // Show success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };

  const handleSelectFlight = (flight: FlightResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/payment',
      params: {
        type: 'flight',
        flightId: flight.id,
        flightName: flight.name,
        operator: flight.operator,
        route: `${fromLocation} → ${toLocation}`,
        fromLocation: fromLocation || '',
        toLocation: toLocation || '',
        passengers: passengers || '1',
        unitPrice: flight.price.toString(),
        totalAmount: (flight.price * Number(passengers || 1) * 1.05).toFixed(2),
        departureDate: departureDate || '',
        returnDate: returnDate || '',
        tripType: tripType || 'oneWay',
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
      },
    });
  };

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <CustomHeader
          showLogo
          leftAction={{ icon: 'chevron-back', onPress: () => router.back(), color: '#FF3B30' }}
        />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Results
          </ThemedText>
          <View
            style={[
              styles.providerPill,
              { backgroundColor: isDark ? '#1C1C1E' : 'rgba(255,255,255,0.8)' },
            ]}
          >
            <Ionicons name="airplane-outline" size={16} color="#FF3B30" />
            <ThemedText
              style={[styles.providerPillText, { color: isDark ? '#FFFFFF' : '#000000' }]}
              numberOfLines={1}
            >
              {serviceProvider}
            </ThemedText>
          </View>
        </View>

        <View style={styles.contentWrapper}>
          <WallpaperPattern offsetTop={0} offsetBottom={0} unlimited height={2000} />

          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Combined Info Card */}
            <View
              style={[
                styles.searchInfoCard,
                {
                  backgroundColor: cardColors.background,
                },
              ]}
            >
              {/* Journey Type Section */}
              <View style={styles.journeyTypeSection}>
                <ThemedText style={styles.journeyTypeLabel}>Journey Type</ThemedText>
                <View
                  style={[
                    styles.tabContainer,
                    {
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      selectedTripType === 'oneWay' && styles.activeTab,
                      {
                        backgroundColor:
                          selectedTripType === 'oneWay'
                            ? isDark
                              ? '#FFFFFF'
                              : '#000000'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTripType('oneWay');
                    }}
                    disabled={selectedTripType === 'oneWay'}
                  >
                    <ThemedText
                      style={[
                        styles.tabText,
                        {
                          color:
                            selectedTripType === 'oneWay'
                              ? isDark
                                ? '#000000'
                                : '#FFFFFF'
                              : isDark
                                ? '#FFFFFF'
                                : '#000000',
                        },
                        selectedTripType === 'oneWay' && styles.tabTextActive,
                      ]}
                    >
                      One Way
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      selectedTripType === 'return' && styles.activeTab,
                      {
                        backgroundColor:
                          selectedTripType === 'return'
                            ? isDark
                              ? '#FFFFFF'
                              : '#000000'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTripType('return');
                    }}
                    disabled={selectedTripType === 'return'}
                  >
                    <ThemedText
                      style={[
                        styles.tabText,
                        {
                          color:
                            selectedTripType === 'return'
                              ? isDark
                                ? '#000000'
                                : '#FFFFFF'
                              : isDark
                                ? '#FFFFFF'
                                : '#000000',
                        },
                        selectedTripType === 'return' && styles.tabTextActive,
                      ]}
                    >
                      Return
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.summaryRow}>
                  <ThemedText
                    style={[
                      styles.summaryLabel,
                      { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                    ]}
                  >
                    From
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowFromPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.summaryPill,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#FF3B30"
                        style={styles.summaryPillIcon}
                      />
                      <ThemedText
                        style={[styles.summaryPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                      >
                        {selectedFromLocation}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryRow}>
                  <ThemedText
                    style={[
                      styles.summaryLabel,
                      { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                    ]}
                  >
                    To
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowToPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.summaryPill,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#FF3B30"
                        style={styles.summaryPillIcon}
                      />
                      <ThemedText
                        style={[styles.summaryPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                      >
                        {selectedToLocation}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryRow}>
                  <ThemedText
                    style={[
                      styles.summaryLabel,
                      { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                    ]}
                  >
                    Departure date
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowDatePicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.summaryPill,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={isDark ? '#FFFFFF' : '#1C1C1E'}
                        style={styles.summaryPillIcon}
                      />
                      <ThemedText
                        style={[styles.summaryPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                      >
                        {formatDate(selectedDate || '')}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                </View>

                {selectedTripType === 'return' && (
                  <View style={styles.summaryRow}>
                    <ThemedText
                      style={[
                        styles.summaryLabel,
                        { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                      ]}
                    >
                      Return date
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowReturnDatePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.summaryPill,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={isDark ? '#FFFFFF' : '#1C1C1E'}
                          style={styles.summaryPillIcon}
                        />
                        <ThemedText
                          style={[
                            styles.summaryPillText,
                            {
                              color: selectedReturnDate
                                ? isDark
                                  ? '#FFFFFF'
                                  : '#1C1C1E'
                                : '#FF3B30',
                              fontFamily: selectedReturnDate ? undefined : Fonts.bold,
                            },
                          ]}
                        >
                          {selectedReturnDate ? formatDate(selectedReturnDate) : 'Select date'}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <ThemedText
                    style={[
                      styles.summaryLabel,
                      { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                    ]}
                  >
                    Passengers
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowPassengerPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.summaryPill,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                    >
                      <Ionicons
                        name="people-outline"
                        size={14}
                        color={isDark ? '#FFFFFF' : '#1C1C1E'}
                        style={styles.summaryPillIcon}
                      />
                      <ThemedText
                        style={[styles.summaryPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                      >
                        {selectedPassengers}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Button */}
              <TouchableOpacity
                activeOpacity={hasSearchChanged ? 0.9 : 1}
                disabled={!hasSearchChanged}
                onPress={() => {
                  if (hasSearchChanged) {
                    performSearch();
                  }
                }}
                style={[
                  styles.searchButton,
                  {
                    backgroundColor: hasSearchChanged
                      ? isDark
                        ? '#FFFFFF'
                        : '#000000'
                      : isDark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,0,0,0.2)',
                    opacity: hasSearchChanged ? 1 : 0.5,
                  },
                ]}
              >
                <Ionicons name="search" size={22} color={isDark ? '#000000' : '#FFFFFF'} />
                <ThemedText
                  style={[styles.searchButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}
                >
                  SEARCH
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF3B30" />
                <ThemedText style={styles.loadingText}>
                  Finding the best buses for you...
                </ThemedText>
              </View>
            )}

            {/* Bus Results */}
            {!loading && (
              <>
                {/* Departure Trip Container */}
                <View
                  style={[
                    styles.tripContainer,
                    {
                      backgroundColor: cardColors.background,
                    },
                  ]}
                >
                  {/* Departure Trip Section */}
                  <View style={styles.tripSectionHeader}>
                    <Ionicons name="arrow-forward-circle-outline" size={24} color="#FF3B30" />
                    <ThemedText style={styles.tripSectionTitle}>Departure Trip</ThemedText>
                    {showDepartureError && !selectedDepartureFlight && (
                      <ThemedText style={styles.inputRequired}>Selection required</ThemedText>
                    )}
                  </View>

                  {FlightResults.map(bus => (
                    <TouchableOpacity
                      key={`departure-${bus.id}`}
                      style={[
                        styles.busCard,
                        {
                          backgroundColor:
                            selectedDepartureFlight === bus.id
                              ? isDark
                                ? 'rgba(52, 199, 89, 0.15)'
                                : 'rgba(52, 199, 89, 0.1)'
                              : isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.03)',
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setselectedDepartureFlight(
                          selectedDepartureFlight === bus.id ? null : bus.id
                        );
                        if (showDepartureError) setShowDepartureError(false);
                      }}
                      activeOpacity={0.88}
                    >
                      {/* Location Pills */}
                      <View style={styles.locationPillsContainer}>
                        <LocationPill
                          label={selectedFromLocation}
                          backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                          iconName="location-outline"
                          variant="compact"
                          style={{ flex: 1, justifyContent: 'center', borderRadius: 10 }}
                        />
                        <View style={{ width: 60 }} />
                        <LocationPill
                          label={selectedToLocation}
                          backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                          iconName="location-outline"
                          variant="compact"
                          style={{ flex: 1, justifyContent: 'center', borderRadius: 10 }}
                        />
                      </View>

                      {/* Time Info */}
                      <View style={styles.timeInfo}>
                        <View style={styles.timeBlock}>
                          <ThemedText style={styles.time}>{bus.departureTime}</ThemedText>
                          <ThemedText style={styles.timeLabel}>Departure</ThemedText>
                        </View>
                        <View style={styles.durationBlock}>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={isDark ? '#FFFFFF' : '#000000'}
                          />
                          <ThemedText style={styles.duration}>{bus.duration}</ThemedText>
                        </View>
                        <View style={styles.timeBlock}>
                          <ThemedText style={styles.time}>{bus.arrivalTime}</ThemedText>
                          <ThemedText style={styles.timeLabel}>Arrival</ThemedText>
                        </View>
                      </View>

                      {/* Bottom Info */}
                      <View style={styles.bottomInfo}>
                        <View style={styles.seatsInfo}>
                          <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                          <ThemedText style={styles.seatsText}>
                            {bus.seatsAvailable} seats available
                          </ThemedText>
                        </View>
                        <View style={styles.priceContainer}>
                          <ThemedText style={styles.priceLabel}>From</ThemedText>
                          <ThemedText style={styles.price}>${bus.price}</ThemedText>
                          <ThemedText style={styles.priceLabel}>/ person</ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* Continue Button - Only show for one-way trips */}
                  {selectedTripType === 'oneWay' && FlightResults.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        if (!selectedDepartureFlight) {
                          setShowDepartureError(true);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          return;
                        }
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push({
                          pathname: '/passenger-details',
                          params: {
                            type: 'flight',
                            serviceProvider,
                            fromLocation,
                            toLocation,
                            departureDate: selectedDate,
                            passengers: selectedPassengers.toString(),
                            selectedDepartureFlight,
                          },
                        });
                      }}
                      style={[
                        styles.continueButton,
                        {
                          backgroundColor: isDark ? '#FFFFFF' : '#000000',
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.continueButtonText,
                          {
                            color: isDark ? '#000000' : '#FFFFFF',
                          },
                        ]}
                      >
                        CONTINUE
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Return Trip Section - Only show if return trip is selected */}
                {selectedTripType === 'return' && selectedReturnDate && (
                  <View style={[styles.tripContainer, { backgroundColor: cardColors.background }]}>
                    <View style={styles.tripSectionHeader}>
                      <Ionicons name="arrow-back-circle-outline" size={24} color="#FF3B30" />
                      <ThemedText style={styles.tripSectionTitle}>Return Trip</ThemedText>
                      {showReturnError && !selectedReturnFlight && (
                        <ThemedText style={styles.inputRequired}>Selection required</ThemedText>
                      )}
                    </View>

                    {FlightResults.map(bus => (
                      <TouchableOpacity
                        key={`return-${bus.id}`}
                        style={[
                          styles.busCard,
                          {
                            backgroundColor:
                              selectedReturnFlight === bus.id
                                ? isDark
                                  ? 'rgba(52, 199, 89, 0.15)'
                                  : 'rgba(52, 199, 89, 0.1)'
                                : isDark
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.03)',
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setselectedReturnFlight(selectedReturnFlight === bus.id ? null : bus.id);
                          if (showReturnError) setShowReturnError(false);
                        }}
                        activeOpacity={0.88}
                      >
                        {/* Location Pills */}
                        <View style={styles.locationPillsContainer}>
                          <LocationPill
                            label={selectedToLocation}
                            backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                            iconName="location-outline"
                            variant="compact"
                            style={{ flex: 1, justifyContent: 'center', borderRadius: 10 }}
                          />
                          <View style={{ width: 60 }} />
                          <LocationPill
                            label={selectedFromLocation}
                            backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                            iconName="location-outline"
                            variant="compact"
                            style={{ flex: 1, justifyContent: 'center', borderRadius: 10 }}
                          />
                        </View>

                        {/* Time Info */}
                        <View style={styles.timeInfo}>
                          <View style={styles.timeBlock}>
                            <ThemedText style={styles.time}>{bus.departureTime}</ThemedText>
                            <ThemedText style={styles.timeLabel}>Departure</ThemedText>
                          </View>
                          <View style={styles.durationBlock}>
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={isDark ? '#FFFFFF' : '#000000'}
                            />
                            <ThemedText style={styles.duration}>{bus.duration}</ThemedText>
                          </View>
                          <View style={styles.timeBlock}>
                            <ThemedText style={styles.time}>{bus.arrivalTime}</ThemedText>
                            <ThemedText style={styles.timeLabel}>Arrival</ThemedText>
                          </View>
                        </View>

                        {/* Bottom Info */}
                        <View style={styles.bottomInfo}>
                          <View style={styles.seatsInfo}>
                            <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                            <ThemedText style={styles.seatsText}>
                              {bus.seatsAvailable} seats available
                            </ThemedText>
                          </View>
                          <View style={styles.priceContainer}>
                            <ThemedText style={styles.priceLabel}>From</ThemedText>
                            <ThemedText style={styles.price}>${bus.price}</ThemedText>
                            <ThemedText style={styles.priceLabel}>/ person</ThemedText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}

                    {/* Continue Button for Return Trip */}
                    {FlightResults.length > 0 && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          if (!selectedDepartureFlight || !selectedReturnFlight) {
                            if (!selectedDepartureFlight) setShowDepartureError(true);
                            if (!selectedReturnFlight) setShowReturnError(true);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            return;
                          }
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          router.push({
                            pathname: '/passenger-details',
                            params: {
                              type: 'flight',
                              serviceProvider,
                              fromLocation,
                              toLocation,
                              departureDate: selectedDate,
                              returnDate: selectedReturnDate,
                              passengers: selectedPassengers.toString(),
                              selectedDepartureFlight,
                              selectedReturnFlight,
                            },
                          });
                        }}
                        style={[
                          styles.continueButton,
                          {
                            backgroundColor: isDark ? '#FFFFFF' : '#000000',
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.continueButtonText,
                            {
                              color: isDark ? '#000000' : '#FFFFFF',
                            },
                          ]}
                        >
                          CONTINUE
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>

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
                      {destinations
                        .filter(loc => loc !== selectedToLocation)
                        .map(location => (
                          <TouchableOpacity
                            key={location}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor:
                                  selectedFromLocation === location
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
                              setSelectedFromLocation(location);
                              setShowFromPicker(false);
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons name="location-outline" size={16} color="#FF3B30" />
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  selectedFromLocation === location && { fontFamily: Fonts.bold },
                                ]}
                              >
                                {location}
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
                              {selectedFromLocation === location && (
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
                      {destinations
                        .filter(loc => loc !== selectedFromLocation)
                        .map(location => (
                          <TouchableOpacity
                            key={location}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor:
                                  selectedToLocation === location
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
                              setSelectedToLocation(location);
                              setShowToPicker(false);
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons name="location-outline" size={16} color="#FF3B30" />
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  selectedToLocation === location && { fontFamily: Fonts.bold },
                                ]}
                              >
                                {location}
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
                              {selectedToLocation === location && (
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
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowDatePicker(false)}
            activeOpacity={1}
          >
            <View style={styles.calendarModalContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={e => e.stopPropagation()}
                style={[styles.calendarModal, { backgroundColor: cardColors.background }]}
              >
                <View style={styles.calendarModalHeader}>
                  <ThemedText style={styles.calendarModalTitle}>Departure Date</ThemedText>
                  <TouchableOpacity
                    style={styles.calendarModalCloseButton}
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
                      <Ionicons name="close-sharp" size={28} color="#FF3B30" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Calendar Header with Navigation */}
                <View style={styles.calendarHeader}>
                  {(() => {
                    const today = new Date();
                    const isCurrentMonth =
                      currentCalendarMonth.getFullYear() === today.getFullYear() &&
                      currentCalendarMonth.getMonth() === today.getMonth();

                    return (
                      <TouchableOpacity
                        style={[
                          styles.monthNavButton,
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

                  <ThemedText style={styles.monthTitle}>
                    {currentCalendarMonth.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </ThemedText>

                  <TouchableOpacity
                    style={[
                      styles.monthNavButton,
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
                <View style={styles.weekDaysHeader}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <View key={day} style={styles.weekDayItem}>
                      <ThemedText style={styles.weekDayText}>{day}</ThemedText>
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
                  <Animated.View style={[styles.calendarGrid, { opacity: opacityAnim }]}>
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
                        const isPast = currentDate.getTime() < new Date().setHours(0, 0, 0, 0);

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
                        <View key={`week-${weekIndex}`} style={styles.weekRow}>
                          {weekDays.map((day, dayIndex) => (
                            <View key={dayIndex} style={styles.calendarDayContainer}>
                              {day && (
                                <TouchableOpacity
                                  onPress={() => {
                                    if (!day.isPast) {
                                      handleDateSelect(day.date);
                                    }
                                  }}
                                  disabled={day.isPast}
                                  style={[
                                    styles.calendarDay,
                                    day.isSelected && styles.calendarDaySelected,
                                    day.isPast && styles.calendarDayPast,
                                    day.isToday && !day.isSelected && styles.calendarDayToday,
                                    {
                                      backgroundColor: day.isSelected
                                        ? '#FF3B30'
                                        : day.isToday
                                          ? isDark
                                            ? 'rgba(255, 255, 255, 0.1)'
                                            : 'rgba(0, 0, 0, 0.05)'
                                          : 'transparent',
                                    },
                                  ]}
                                  activeOpacity={day.isPast ? 1 : 0.7}
                                >
                                  <ThemedText
                                    style={[
                                      styles.calendarDayText,
                                      day.isSelected && styles.calendarDayTextSelected,
                                      day.isPast && styles.calendarDayTextPast,
                                      day.isToday && !day.isSelected && styles.calendarDayTextToday,
                                    ]}
                                  >
                                    {day.day}
                                  </ThemedText>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </Animated.View>
                </PanGestureHandler>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Return Date Picker Modal */}
        <Modal
          visible={showReturnDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReturnDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowReturnDatePicker(false)}
            activeOpacity={1}
          >
            <View style={styles.calendarModalContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={e => e.stopPropagation()}
                style={[styles.calendarModal, { backgroundColor: cardColors.background }]}
              >
                <View style={styles.calendarModalHeader}>
                  <ThemedText style={styles.calendarModalTitle}>Return Date</ThemedText>
                  <TouchableOpacity
                    style={styles.calendarModalCloseButton}
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
                      <Ionicons name="close-sharp" size={28} color="#FF3B30" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Calendar Header with Navigation */}
                <View style={styles.calendarHeader}>
                  {(() => {
                    const today = new Date();
                    const isCurrentMonth =
                      currentReturnCalendarMonth.getFullYear() === today.getFullYear() &&
                      currentReturnCalendarMonth.getMonth() === today.getMonth();

                    return (
                      <TouchableOpacity
                        style={[
                          styles.monthNavButton,
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

                  <ThemedText style={styles.monthTitle}>
                    {currentReturnCalendarMonth.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </ThemedText>

                  <TouchableOpacity
                    style={[
                      styles.monthNavButton,
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
                <View style={styles.weekDaysHeader}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <View key={day} style={styles.weekDayItem}>
                      <ThemedText style={styles.weekDayText}>{day}</ThemedText>
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
                  <Animated.View style={[styles.calendarGrid, { opacity: returnOpacityAnim }]}>
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

                        // Check if date is before today
                        const isPastToday = currentDate.getTime() < new Date().setHours(0, 0, 0, 0);

                        // Check if date is before departure date
                        const departureDateTime = selectedDate
                          ? new Date(selectedDate).getTime()
                          : 0;
                        const isBeforeDeparture = selectedDate
                          ? currentDate.getTime() < departureDateTime
                          : false;

                        // Date is disabled if it's before today OR before departure date
                        const isPast = isPastToday || isBeforeDeparture;

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
                        <View key={`week-${weekIndex}`} style={styles.weekRow}>
                          {weekDays.map((day, dayIndex) => (
                            <View key={dayIndex} style={styles.calendarDayContainer}>
                              {day && (
                                <TouchableOpacity
                                  onPress={() => {
                                    if (!day.isPast) {
                                      handleReturnDateSelect(day.date);
                                      setTimeout(() => {
                                        setShowReturnDatePicker(false);
                                      }, 300);
                                    }
                                  }}
                                  disabled={day.isPast}
                                  style={[
                                    styles.calendarDay,
                                    day.isSelected && styles.calendarDaySelected,
                                    day.isPast && styles.calendarDayPast,
                                    day.isToday && !day.isSelected && styles.calendarDayToday,
                                    {
                                      backgroundColor: day.isSelected
                                        ? '#FF3B30'
                                        : day.isToday
                                          ? isDark
                                            ? 'rgba(255, 255, 255, 0.1)'
                                            : 'rgba(0, 0, 0, 0.05)'
                                          : 'transparent',
                                    },
                                  ]}
                                  activeOpacity={day.isPast ? 1 : 0.7}
                                >
                                  <ThemedText
                                    style={[
                                      styles.calendarDayText,
                                      day.isSelected && styles.calendarDayTextSelected,
                                      day.isPast && styles.calendarDayTextPast,
                                      day.isToday && !day.isSelected && styles.calendarDayTextToday,
                                    ]}
                                  >
                                    {day.day}
                                  </ThemedText>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </Animated.View>
                </PanGestureHandler>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Passenger Picker Modal */}
        <Modal
          visible={showPassengerPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowPassengerPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowPassengerPicker(false)}
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
                    <ThemedText style={styles.guestDropdownTitle}>Passengers</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowPassengerPicker(false)}
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

                  <View style={styles.guestSection}>
                    <View
                      style={[
                        styles.guestRow,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          marginTop: 0,
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
                            opacity: selectedPassengers <= 1 ? 0.4 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (selectedPassengers > 1) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedPassengers(prev => prev - 1);
                          }
                        }}
                        disabled={selectedPassengers <= 1}
                        activeOpacity={selectedPassengers <= 1 ? 0.4 : 0.8}
                      >
                        <Ionicons
                          name="remove-sharp"
                          size={28}
                          color="#FF3B30"
                          style={{ fontWeight: '900' }}
                        />
                      </TouchableOpacity>

                      <ThemedText style={styles.guestCount}>{selectedPassengers}</ThemedText>

                      <TouchableOpacity
                        style={[
                          styles.counterButton,
                          {
                            backgroundColor: isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)',
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedPassengers(prev => prev + 1);
                        }}
                        activeOpacity={0.8}
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
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </ThemedView>
    </IOSScreenWrapper>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
  },
  providerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: 220,
    minWidth: 100,
  },
  providerPillText: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  searchInfoCard: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  providerTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
  },
  providerSubtitle: {
    fontSize: responsiveFontSize(14),
    lineHeight: 20,
    fontFamily: Fonts.medium,
    opacity: 0.7,
    marginBottom: 12,
  },
  journeyTypeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  journeyTypeLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
    opacity: 0.7,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
  detailsGrid: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  summaryPillIcon: {
    marginRight: 6,
  },
  summaryPillText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  searchButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  searchButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    opacity: 0.6,
  },
  tripContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: -8,
  },
  tripSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tripSectionTitle: {
    fontSize: responsiveFontSize(22),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
    flex: 1,
  },
  tripSectionSubtitle: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
    opacity: 0.6,
    marginLeft: 'auto',
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  errorText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  busCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 0,
    marginBottom: 12,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  locationPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  busInfo: {
    flex: 1,
    gap: 6,
  },
  busName: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  busOperator: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
    opacity: 0.7,
  },
  flightClassContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  flightClass: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
    letterSpacing: 0.3,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  timeBlock: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  time: {
    fontSize: responsiveFontSize(17),
    fontFamily: Fonts.bold,
  },
  timeLabel: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.medium,
    opacity: 0.6,
  },
  durationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
  },
  duration: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  amenityPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  amenityText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
  },
  moreAmenities: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
    opacity: 0.6,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatsText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.medium,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  priceLabel: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.medium,
    opacity: 0.6,
  },
  price: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    color: '#34C759',
    letterSpacing: 0.3,
  },
  continueButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  continueButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
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
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  calendarModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 1002,
    backgroundColor: 'transparent',
  },
  calendarModal: {
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
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  calendarModalTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  calendarModalCloseButton: {},
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: responsiveFontSize(22),
    fontWeight: '600',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  weekDayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  calendarDayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  calendarDay: {
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
  calendarDaySelected: {
    backgroundColor: '#FF3B30',
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 0,
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: '#FF3B30',
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 0,
  },
  calendarDayText: {
    fontSize: responsiveFontSize(20),
    fontWeight: '400',
  },
  calendarDayTextSelected: {
    fontWeight: '600',
    fontSize: responsiveFontSize(20),
    color: '#FFFFFF',
  },
  calendarDayTextPast: {
    opacity: 0.3,
    fontSize: responsiveFontSize(20),
  },
  calendarDayTextToday: {
    fontWeight: '600',
    fontSize: responsiveFontSize(20),
    color: '#FFFFFF',
  },
});
