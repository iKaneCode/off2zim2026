import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
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
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { getCardSurfaceColors } from '@/constants/CardStyles';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { countries } from '@/countries-fixed';
import { useAuth, getProfile } from '@/context/AuthContext';

const formatDateOfBirthForDisplay = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}/${month}/${year}`;
  }

  return trimmed;
};

const trimOrEmpty = (value?: string | null): string =>
  typeof value === 'string' ? value.trim() : '';

export default function PassengerDetails() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cardColors = getCardSurfaceColors(colorScheme);
  const {
    type = 'bus', // 'bus' or 'flight' or 'stay'
    serviceProvider = '',
    fromLocation = '',
    toLocation = '',
    departureDate = '',
    passengers = '1',
    selectedDepartureBus = '',
    selectedDepartureFlight = '',
    // Stay-specific params
    stayId = '',
    stayName = '',
    checkIn = '',
    checkOut = '',
    nights = '',
    rooms = '',
    adults = '',
    children = '',
    subtotal = '',
    tax = '',
    total = '',
    roomTypeId = '',
    roomTypeName = '',
    roomTypeRate = '',
  } = useLocalSearchParams();

  const normalizedType = Array.isArray(type) ? type[0] || 'bus' : type;
  const normalizedServiceProvider = Array.isArray(serviceProvider)
    ? serviceProvider[0] || ''
    : serviceProvider;
  const normalizedFromLocation = Array.isArray(fromLocation) ? fromLocation[0] || '' : fromLocation;
  const normalizedToLocation = Array.isArray(toLocation) ? toLocation[0] || '' : toLocation;
  const normalizedDepartureDate = Array.isArray(departureDate)
    ? departureDate[0] || ''
    : departureDate;
  const normalizedPassengers = Array.isArray(passengers) ? passengers[0] || '1' : passengers;
  const normalizedSelectedDepartureBus = Array.isArray(selectedDepartureBus)
    ? selectedDepartureBus[0] || ''
    : selectedDepartureBus;
  const normalizedSelectedDepartureFlight = Array.isArray(selectedDepartureFlight)
    ? selectedDepartureFlight[0] || ''
    : selectedDepartureFlight;

  // Normalize stay params
  const normalizedStayId = Array.isArray(stayId) ? stayId[0] || '' : stayId;
  const normalizedStayName = Array.isArray(stayName) ? stayName[0] || '' : stayName;
  const normalizedCheckIn = Array.isArray(checkIn) ? checkIn[0] || '' : checkIn;
  const normalizedCheckOut = Array.isArray(checkOut) ? checkOut[0] || '' : checkOut;
  const normalizedNights = Array.isArray(nights) ? nights[0] || '' : nights;
  const normalizedRooms = Array.isArray(rooms) ? rooms[0] || '' : rooms;
  const normalizedAdults = Array.isArray(adults) ? adults[0] || '' : adults;
  const normalizedChildren = Array.isArray(children) ? children[0] || '' : children;
  const normalizedSubtotal = Array.isArray(subtotal) ? subtotal[0] || '' : subtotal;
  const normalizedTax = Array.isArray(tax) ? tax[0] || '' : tax;
  const normalizedTotal = Array.isArray(total) ? total[0] || '' : total;
  const normalizedRoomTypeId = Array.isArray(roomTypeId) ? roomTypeId[0] || '' : roomTypeId;
  const normalizedRoomTypeName = Array.isArray(roomTypeName) ? roomTypeName[0] || '' : roomTypeName;
  const normalizedRoomTypeRate = Array.isArray(roomTypeRate) ? roomTypeRate[0] || '' : roomTypeRate;

  const operatorDisplayName =
    normalizedServiceProvider && normalizedServiceProvider.toLowerCase() !== 'all operators'
      ? normalizedServiceProvider
      : normalizedType === 'flight'
        ? 'Flight'
        : normalizedType === 'stay'
          ? 'Stay'
          : 'Bus';

  // Primary form state
  const [sameAsAccountHolder, setSameAsAccountHolder] = useState(false);
  const [travelingWithInfant, setTravelingWithInfant] = useState(false);
  const [title, setTitle] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [idType, setIdType] = useState<string>('');
  const [passengerFullName, setPassengerFullName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [cellPhoneNumber, setCellPhoneNumber] = useState('');
  const [nationality, setNationality] = useState<string>('');
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Pickers visibility
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);
  const [showNationalityPicker, setShowNationalityPicker] = useState(false);

  // Account holder (prefill)
  const [accountHolderFullName, setAccountHolderFullName] = useState('');
  const [accountHolderEmail, setAccountHolderEmail] = useState('');
  const [accountHolderTitle, setAccountHolderTitle] = useState('');
  const [accountHolderGender, setAccountHolderGender] = useState('');
  const [accountHolderIdType, setAccountHolderIdType] = useState('');
  const [accountHolderIdentityNumber, setAccountHolderIdentityNumber] = useState('');
  const [accountHolderDateOfBirth, setAccountHolderDateOfBirth] = useState('');
  const [accountHolderNationality, setAccountHolderNationality] = useState('');
  const [accountHolderPhone, setAccountHolderPhone] = useState('');

  // Options
  const titles = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'];
  const genders = ['Male', 'Female', 'Other'];
  const idTypes = ['National ID', 'Passport'];

  // Date of Birth picker modal state
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [currentDobCalendarMonth, setCurrentDobCalendarMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const panGestureRef = useRef(null);

  // Refs for auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{ [key: string]: View | null }>({});

  // Load account holder info from profile/metadata
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const { data } = await getProfile(user.id);
        const fullName = trimOrEmpty(data?.full_name) || trimOrEmpty(user.user_metadata?.full_name);
        const email = trimOrEmpty(data?.email) || trimOrEmpty(user.email);
        const phoneNumber = trimOrEmpty(data?.phone) || trimOrEmpty(user.user_metadata?.phone);
        const accountTitle = trimOrEmpty(data?.title);
        const accountGender = trimOrEmpty(data?.gender);
        const accountIdType = trimOrEmpty(data?.id_type);
        const accountIdentityNumber = trimOrEmpty(data?.identity_number);
        const accountDob = formatDateOfBirthForDisplay(data?.date_of_birth);
        const accountNationality = trimOrEmpty(data?.nationality);
        if (!isMounted) return;
        setAccountHolderFullName(fullName);
        setAccountHolderEmail(email);
        setAccountHolderPhone(phoneNumber);
        setAccountHolderTitle(accountTitle);
        setAccountHolderGender(accountGender);
        setAccountHolderIdType(accountIdType);
        setAccountHolderIdentityNumber(accountIdentityNumber);
        setAccountHolderDateOfBirth(accountDob);
        setAccountHolderNationality(accountNationality);
      } catch (e) {
        // Fallback to auth metadata if profile fetch fails
        const fallbackName = trimOrEmpty(user?.user_metadata?.full_name);
        const email = trimOrEmpty(user?.email);
        if (!isMounted) return;
        setAccountHolderFullName(fallbackName);
        setAccountHolderEmail(email);
        setAccountHolderPhone(trimOrEmpty(user?.user_metadata?.phone));
        setAccountHolderTitle('');
        setAccountHolderGender('');
        setAccountHolderIdType('');
        setAccountHolderIdentityNumber('');
        setAccountHolderDateOfBirth('');
        setAccountHolderNationality('');
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // When toggle is ON, keep passenger fields in sync with account holder values
  useEffect(() => {
    if (sameAsAccountHolder) {
      setPassengerFullName(accountHolderFullName);
      setPassengerEmail(accountHolderEmail);
      setTitle(accountHolderTitle);
      setGender(accountHolderGender);
      setIdType(accountHolderIdType);
      setIdentityNumber(accountHolderIdentityNumber);
      setDateOfBirth(accountHolderDateOfBirth);
      setNationality(accountHolderNationality);
      setCellPhoneNumber(accountHolderPhone);
    }
  }, [
    sameAsAccountHolder,
    accountHolderFullName,
    accountHolderEmail,
    accountHolderTitle,
    accountHolderGender,
    accountHolderIdType,
    accountHolderIdentityNumber,
    accountHolderDateOfBirth,
    accountHolderNationality,
    accountHolderPhone,
  ]);

  // Helper to scroll to input
  const scrollToInput = (key: string) => {
    const inputRef = inputRefs.current[key];
    if (inputRef && scrollViewRef.current) {
      setTimeout(() => {
        inputRef.measureLayout(
          scrollViewRef.current as any,
          (x, y, width, height) => {
            scrollViewRef.current?.scrollTo({
              y: y - 100, // Offset to show field comfortably above keyboard
              animated: true,
            });
          },
          () => {}
        );
      }, 100);
    }
  };

  // Month and Year picker state
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Generate years from 1920 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i);

  // Validation state
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Calendar navigation for DOB
  const navigateDobMonth = (direction: 'prev' | 'next') => {
    setIsAnimating(true);
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentDobCalendarMonth(prev => {
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

  const onDobPanGestureEvent = (event: any) => {
    if (isAnimating) return;
    const { translationX, state } = event.nativeEvent;
    const threshold = 50;
    if (state === State.END && Math.abs(translationX) > threshold) {
      navigateDobMonth(translationX > 0 ? 'prev' : 'next');
    }
  };

  const handleDobSelect = (dateString: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Format to DD/MM/YYYY for display
    const [year, month, day] = dateString.split('-');
    setDateOfBirth(`${day}/${month}/${year}`);
    setShowDobPicker(false);
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Validation and navigation
  const handleContinue = () => {
    setAttemptedSubmit(true);

    // Validate all required fields
    if (
      !title ||
      !passengerFullName ||
      !gender ||
      !idType ||
      !identityNumber ||
      !dateOfBirth ||
      !nationality ||
      !passengerEmail ||
      !cellPhoneNumber
    ) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // All fields valid - proceed to payment
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (normalizedType === 'stay') {
      // For stays, pass the pricing and details received from stay-profile
      router.push({
        pathname: '/payment',
        params: {
          type: 'stay',
          stayId: normalizedStayId,
          stayName: normalizedStayName,
          checkIn: normalizedCheckIn,
          checkOut: normalizedCheckOut,
          nights: normalizedNights,
          rooms: normalizedRooms,
          adults: normalizedAdults,
          children: normalizedChildren,
          roomTypeId: normalizedRoomTypeId,
          roomTypeName: normalizedRoomTypeName,
          roomTypeRate: normalizedRoomTypeRate,
          guestFullName: passengerFullName,
          guestEmail: passengerEmail,
          guestPhone: cellPhoneNumber,
          guestTitle: title,
          guestGender: gender,
          guestIdType: idType,
          guestIdNumber: identityNumber,
          guestDateOfBirth: dateOfBirth,
          guestNationality: nationality,
          sameAsAccountHolder: sameAsAccountHolder.toString(),
          travelingWithInfant: travelingWithInfant.toString(),
          subtotal: normalizedSubtotal,
          tax: normalizedTax,
          total: normalizedTotal,
        },
      });
    } else {
      // For bus/flight - calculate pricing
      const passengersCount = parseInt(normalizedPassengers, 10) || 1;
      const pricePerSeat = 15; // This should come from the selected bus data
      const subtotal = pricePerSeat * passengersCount;
      const tax = subtotal * 0.15; // 15% tax
      const total = subtotal + tax;

      const selectedVehicle =
        normalizedType === 'flight'
          ? normalizedSelectedDepartureFlight
          : normalizedSelectedDepartureBus;

      router.push({
        pathname: '/payment',
        params: {
          type: normalizedType,
          busOperator: operatorDisplayName,
          fromLocation: normalizedFromLocation,
          toLocation: normalizedToLocation,
          departureDate: normalizedDepartureDate,
          passengers: normalizedPassengers,
          selectedBus: selectedVehicle,
          passengerTitle: title,
          passengerFullName,
          passengerGender: gender,
          passengerIdType: idType,
          passengerIdNumber: identityNumber,
          passengerDateOfBirth: dateOfBirth,
          passengerNationality: nationality,
          passengerEmail,
          passengerPhone: cellPhoneNumber,
          travelingWithInfant: travelingWithInfant.toString(),
          pricePerSeat: pricePerSeat.toFixed(2),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
        },
      });
    }
  };

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <CustomHeader
          showLogo={true}
          logoSize="large"
          leftAction={{ icon: 'chevron-back', onPress: handleGoBack, color: '#FF3B30' }}
        />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            {normalizedType === 'stay' ? 'Guest Details' : 'Passenger Details'}
          </ThemedText>
          <View
            style={[
              styles.providerPill,
              { backgroundColor: isDark ? '#1C1C1E' : 'rgba(255,255,255,0.8)' },
            ]}
          >
            {normalizedType === 'stay' ? (
              <Ionicons name="bed" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
            ) : normalizedType === 'flight' ? (
              <Ionicons name="airplane" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
            ) : normalizedType === 'bus' ? (
              <FontAwesome6 name="bus" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
            ) : null}
            <ThemedText
              style={[styles.providerPillText, { color: isDark ? '#FFFFFF' : '#000000' }]}
              numberOfLines={1}
            >
              {operatorDisplayName}
            </ThemedText>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          <WallpaperPattern offsetTop={0} offsetBottom={0} unlimited height={2000} />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              scrollEventThrottle={16}
            >
              {/* Main Passenger Form */}
              <View
                style={[
                  styles.formContainer,
                  {
                    backgroundColor: cardColors.background,
                  },
                ]}
              >
                <ThemedText style={styles.sectionTitle}>
                  {normalizedType === 'stay' ? 'Lead Guest' : 'Main Passenger'}
                </ThemedText>

                <View style={styles.sameAsToggleRow}>
                  <Switch
                    value={sameAsAccountHolder}
                    onValueChange={value => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSameAsAccountHolder(value);
                      if (value) {
                        setPassengerFullName(accountHolderFullName);
                        setPassengerEmail(accountHolderEmail);
                        setTitle(accountHolderTitle);
                        setGender(accountHolderGender);
                        setIdType(accountHolderIdType);
                        setIdentityNumber(accountHolderIdentityNumber);
                        setDateOfBirth(accountHolderDateOfBirth);
                        setNationality(accountHolderNationality);
                        setCellPhoneNumber(accountHolderPhone);
                      } else {
                        setPassengerFullName('');
                        setPassengerEmail('');
                        setTitle('');
                        setGender('');
                        setIdType('');
                        setIdentityNumber('');
                        setDateOfBirth('');
                        setNationality('');
                        setCellPhoneNumber('');
                      }
                    }}
                    trackColor={{ false: 'rgba(120,120,128,0.3)', true: '#34C759' }}
                    thumbColor={sameAsAccountHolder ? '#FFFFFF' : '#f4f3f4'}
                    ios_backgroundColor="rgba(120,120,128,0.3)"
                  />
                  <ThemedText
                    style={[styles.sameAsLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                  >
                    Same as account holder
                  </ThemedText>
                </View>

                {/* All passenger fields - always visible */}
                <View style={styles.passengerDetailsForm}>
                  {/* Passenger Type */}
                  <View style={styles.inputColumn}>
                    <ThemedText style={styles.inputLabel}>
                      {normalizedType === 'stay' ? 'Guest Type' : 'Passenger Type'}
                    </ThemedText>
                    <TextInput
                      value="Adult"
                      editable={false}
                      style={[
                        styles.passengerInput,
                        styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.5)',
                        },
                      ]}
                    />
                  </View>

                  {/* Title - Picker */}
                  <View style={styles.inputColumn}>
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Title</ThemedText>
                      {attemptedSubmit && !title && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      disabled={sameAsAccountHolder}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowTitlePicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !title && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : title
                              ? isDark
                                ? '#FFFFFF'
                                : '#1C1C1E'
                              : isDark
                                ? 'rgba(235,235,245,0.5)'
                                : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {title || 'Select title'}
                      </ThemedText>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={
                          sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.3)'
                              : 'rgba(60,60,67,0.3)'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)'
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Full Name - grayed when toggle is ON */}
                  <View
                    style={styles.inputColumn}
                    ref={ref => {
                      inputRefs.current['fullName'] = ref;
                    }}
                  >
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
                      {attemptedSubmit && !passengerFullName && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TextInput
                      placeholder="Enter full name"
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !passengerFullName && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : isDark
                              ? '#FFFFFF'
                              : '#1C1C1E',
                        },
                      ]}
                      value={sameAsAccountHolder ? accountHolderFullName : passengerFullName}
                      onChangeText={setPassengerFullName}
                      onFocus={() => scrollToInput('fullName')}
                      editable={!sameAsAccountHolder}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Traveling with Infant Toggle */}
                  <View style={styles.inputColumn}>
                    <View style={styles.toggleRow}>
                      <ThemedText style={styles.inputLabel}>Traveling with Infant</ThemedText>
                      <Switch
                        value={travelingWithInfant}
                        onValueChange={setTravelingWithInfant}
                        trackColor={{ false: 'rgba(120,120,128,0.3)', true: '#34C759' }}
                        thumbColor={travelingWithInfant ? '#FFFFFF' : '#f4f3f4'}
                        ios_backgroundColor="rgba(120,120,128,0.3)"
                      />
                    </View>
                  </View>

                  {/* Gender - Picker */}
                  <View style={styles.inputColumn}>
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Gender</ThemedText>
                      {attemptedSubmit && !gender && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      disabled={sameAsAccountHolder}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowGenderPicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !gender && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : gender
                              ? isDark
                                ? '#FFFFFF'
                                : '#1C1C1E'
                              : isDark
                                ? 'rgba(235,235,245,0.5)'
                                : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {gender || 'Select gender'}
                      </ThemedText>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={
                          sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.3)'
                              : 'rgba(60,60,67,0.3)'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)'
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* ID Type - Picker */}
                  <View style={styles.inputColumn}>
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>ID Type</ThemedText>
                      {attemptedSubmit && !idType && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      disabled={sameAsAccountHolder}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowIdTypePicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !idType && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : idType
                              ? isDark
                                ? '#FFFFFF'
                                : '#1C1C1E'
                              : isDark
                                ? 'rgba(235,235,245,0.5)'
                                : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {idType || 'Select ID type'}
                      </ThemedText>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={
                          sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.3)'
                              : 'rgba(60,60,67,0.3)'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)'
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Identity Number */}
                  <View
                    style={styles.inputColumn}
                    ref={ref => {
                      inputRefs.current['identityNumber'] = ref;
                    }}
                  >
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Identity Number</ThemedText>
                      {attemptedSubmit && !identityNumber && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TextInput
                      placeholder="Enter ID number"
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !identityNumber && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : isDark
                              ? '#FFFFFF'
                              : '#1C1C1E',
                        },
                      ]}
                      value={identityNumber}
                      onChangeText={setIdentityNumber}
                      onFocus={() => scrollToInput('identityNumber')}
                      editable={!sameAsAccountHolder}
                      autoCapitalize="characters"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Date of Birth - Picker */}
                  <View style={styles.inputColumn}>
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Date of Birth</ThemedText>
                      {attemptedSubmit && !dateOfBirth && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      disabled={sameAsAccountHolder}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDobPicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !dateOfBirth && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : dateOfBirth
                              ? isDark
                                ? '#FFFFFF'
                                : '#1C1C1E'
                              : isDark
                                ? 'rgba(235,235,245,0.5)'
                                : 'rgba(60,60,67,0.6)',
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                        }}
                      >
                        {dateOfBirth || 'DD/MM/YYYY'}
                      </ThemedText>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={
                          sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.3)'
                              : 'rgba(60,60,67,0.3)'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)'
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Nationality */}
                  <View style={styles.inputColumn}>
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Nationality</ThemedText>
                      {attemptedSubmit && !nationality && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      disabled={sameAsAccountHolder}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowNationalityPicker(true);
                      }}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !nationality && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {nationality && countries.find(c => c.name === nationality) && (
                          <View style={{ height: 24, justifyContent: 'center' }}>
                            <ThemedText
                              style={{
                                fontSize: responsiveFontSize(20),
                                lineHeight: 24,
                                includeFontPadding: false,
                              }}
                            >
                              {countries.find(c => c.name === nationality)?.flag}
                            </ThemedText>
                          </View>
                        )}
                        <ThemedText
                          style={{
                            color: sameAsAccountHolder
                              ? isDark
                                ? 'rgba(235,235,245,0.5)'
                                : 'rgba(60,60,67,0.5)'
                              : nationality
                                ? isDark
                                  ? '#FFFFFF'
                                  : '#1C1C1E'
                                : isDark
                                  ? 'rgba(235,235,245,0.5)'
                                  : 'rgba(60,60,67,0.6)',
                            fontSize: responsiveFontSize(16),
                            fontFamily: Fonts.regular,
                          }}
                        >
                          {nationality || 'Select nationality'}
                        </ThemedText>
                      </View>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={
                          sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.3)'
                              : 'rgba(60,60,67,0.3)'
                            : isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.6)'
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Email Address - grayed when toggle is ON */}
                  <View
                    style={styles.inputColumn}
                    ref={ref => {
                      inputRefs.current['email'] = ref;
                    }}
                  >
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Email Address</ThemedText>
                      {attemptedSubmit && !passengerEmail && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TextInput
                      placeholder="Enter email address"
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !passengerEmail && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : isDark
                              ? '#FFFFFF'
                              : '#1C1C1E',
                        },
                      ]}
                      value={sameAsAccountHolder ? accountHolderEmail : passengerEmail}
                      onChangeText={setPassengerEmail}
                      onFocus={() => scrollToInput('email')}
                      editable={!sameAsAccountHolder}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Cell Phone Number */}
                  <View
                    style={styles.inputColumn}
                    ref={ref => {
                      inputRefs.current['phone'] = ref;
                    }}
                  >
                    <View style={styles.labelErrorContainer}>
                      <ThemedText style={styles.inputLabel}>Cell Phone Number</ThemedText>
                      {attemptedSubmit && !cellPhoneNumber && (
                        <ThemedText style={styles.inputRequired}>This field is required</ThemedText>
                      )}
                    </View>
                    <TextInput
                      placeholder="Enter phone number"
                      placeholderTextColor={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      style={[
                        styles.passengerInput,
                        attemptedSubmit && !cellPhoneNumber && styles.errorBorder,
                        sameAsAccountHolder && styles.disabledInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          color: sameAsAccountHolder
                            ? isDark
                              ? 'rgba(235,235,245,0.5)'
                              : 'rgba(60,60,67,0.5)'
                            : isDark
                              ? '#FFFFFF'
                              : '#1C1C1E',
                        },
                      ]}
                      value={cellPhoneNumber}
                      onChangeText={setCellPhoneNumber}
                      onFocus={() => scrollToInput('phone')}
                      editable={!sameAsAccountHolder}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleContinue}
                  style={[
                    styles.continueButton,
                    {
                      backgroundColor: isDark ? '#FFFFFF' : '#000000',
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.continueButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}
                  >
                    CONTINUE
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>

        {/* Title Picker Modal */}
        <Modal
          visible={showTitlePicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowTitlePicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowTitlePicker(false)}
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
                    <ThemedText style={styles.guestDropdownTitle}>Select Title</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowTitlePicker(false)}
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
                      {titles.map(titleOption => (
                        <TouchableOpacity
                          key={titleOption}
                          style={[
                            styles.guestRow,
                            {
                              backgroundColor:
                                title === titleOption
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
                            setTitle(titleOption);
                            setShowTitlePicker(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.guestSubLabel,
                              title === titleOption && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {titleOption}
                          </ThemedText>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {title === titleOption && (
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

        {/* Gender Picker Modal */}
        <Modal
          visible={showGenderPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowGenderPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowGenderPicker(false)}
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
                    <ThemedText style={styles.guestDropdownTitle}>Select Gender</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowGenderPicker(false)}
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
                      {genders.map(genderOption => (
                        <TouchableOpacity
                          key={genderOption}
                          style={[
                            styles.guestRow,
                            {
                              backgroundColor:
                                gender === genderOption
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
                            setGender(genderOption);
                            setShowGenderPicker(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.guestSubLabel,
                              gender === genderOption && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {genderOption}
                          </ThemedText>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {gender === genderOption && (
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

        {/* ID Type Picker Modal */}
        <Modal
          visible={showIdTypePicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowIdTypePicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowIdTypePicker(false)}
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
                    <ThemedText style={styles.guestDropdownTitle}>Select ID Type</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowIdTypePicker(false)}
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
                      {idTypes.map(idTypeOption => (
                        <TouchableOpacity
                          key={idTypeOption}
                          style={[
                            styles.guestRow,
                            {
                              backgroundColor:
                                idType === idTypeOption
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
                            setIdType(idTypeOption);
                            setShowIdTypePicker(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.guestSubLabel,
                              idType === idTypeOption && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {idTypeOption}
                          </ThemedText>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            {idType === idTypeOption && (
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

        {/* Nationality Picker Modal */}
        <Modal
          visible={showNationalityPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowNationalityPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => {
              setShowNationalityPicker(false);
              setNationalitySearch('');
            }}
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
                    <ThemedText style={styles.guestDropdownTitle}>Select Nationality</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => {
                        setShowNationalityPicker(false);
                        setNationalitySearch('');
                      }}
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

                  {/* Search Bar */}
                  <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                    <View
                      style={[
                        styles.passengerInput,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        },
                      ]}
                    >
                      <Ionicons
                        name="search"
                        size={20}
                        color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                      />
                      <TextInput
                        placeholder="Search"
                        placeholderTextColor={
                          isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'
                        }
                        style={{
                          flex: 1,
                          fontSize: responsiveFontSize(16),
                          fontFamily: Fonts.regular,
                          color: isDark ? '#FFFFFF' : '#1C1C1E',
                          padding: 0,
                        }}
                        value={nationalitySearch}
                        onChangeText={setNationalitySearch}
                        autoCapitalize="none"
                      />
                      {nationalitySearch.length > 0 && (
                        <TouchableOpacity onPress={() => setNationalitySearch('')}>
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.6)'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <ScrollView style={{ height: 400 }}>
                    <View style={styles.guestSection}>
                      {/* Zimbabwe First */}
                      {(() => {
                        const zimbabwe = countries.find(c => c.name === 'Zimbabwe');
                        if (
                          !zimbabwe ||
                          !zimbabwe.name.toLowerCase().includes(nationalitySearch.toLowerCase())
                        ) {
                          return null;
                        }
                        const isSelected = nationality === zimbabwe.name;
                        return (
                          <TouchableOpacity
                            key="zimbabwe-top"
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor: isSelected
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
                              setNationality(zimbabwe.name);
                              setShowNationalityPicker(false);
                              setNationalitySearch('');
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <ThemedText
                                style={{ fontSize: responsiveFontSize(28), lineHeight: 34, includeFontPadding: false }}
                              >
                                {zimbabwe.flag}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  isSelected && { fontFamily: Fonts.bold },
                                ]}
                              >
                                {zimbabwe.name}
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
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })()}

                      {/* Divider */}
                      {nationalitySearch === '' && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            marginVertical: 12,
                          }}
                        />
                      )}

                      {/* Other Countries */}
                      {countries
                        .filter(
                          country =>
                            country.name !== 'Zimbabwe' &&
                            country.name.toLowerCase().includes(nationalitySearch.toLowerCase())
                        )
                        .map(country => {
                          const isSelected = nationality === country.name;
                          return (
                            <TouchableOpacity
                              key={country.name}
                              style={[
                                styles.guestRow,
                                {
                                  backgroundColor: isSelected
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
                                setNationality(country.name);
                                setShowNationalityPicker(false);
                                setNationalitySearch('');
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <ThemedText
                                  style={{
                                    fontSize: responsiveFontSize(28),
                                    lineHeight: 34,
                                    includeFontPadding: false,
                                  }}
                                >
                                  {country.flag}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.guestSubLabel,
                                    isSelected && { fontFamily: Fonts.bold },
                                  ]}
                                >
                                  {country.name}
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
                                {isSelected && (
                                  <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date of Birth Picker Modal */}
        <Modal
          visible={showDobPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDobPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowDobPicker(false)}
            activeOpacity={1}
          >
            <View style={styles.calendarModalContainer}>
              <View style={[styles.calendarModal, { backgroundColor: cardColors.background }]}>
                <View style={styles.calendarModalHeader}>
                  <ThemedText style={styles.calendarModalTitle}>Date of Birth</ThemedText>
                  <TouchableOpacity
                    style={styles.calendarModalCloseButton}
                    onPress={() => setShowDobPicker(false)}
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
                  <TouchableOpacity
                    style={[
                      styles.monthNavButton,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 59, 48, 0.15)'
                          : 'rgba(255, 59, 48, 0.1)',
                      },
                    ]}
                    onPress={() => navigateDobMonth('prev')}
                  >
                    <FontAwesome6 name="chevron-left" size={20} color="#FF3B30" />
                  </TouchableOpacity>

                  <View style={styles.monthYearContainer}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={e => {
                        e?.stopPropagation?.();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDobPicker(false);
                        setTimeout(() => setShowMonthPicker(true), 100);
                      }}
                    >
                      <ThemedText style={styles.monthTitle}>
                        {currentDobCalendarMonth.toLocaleDateString('en-US', {
                          month: 'long',
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={e => {
                        e?.stopPropagation?.();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDobPicker(false);
                        setTimeout(() => setShowYearPicker(true), 100);
                      }}
                    >
                      <ThemedText style={styles.monthTitle}>
                        {currentDobCalendarMonth.getFullYear()}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {(() => {
                    const today = new Date();
                    const isCurrentMonth =
                      currentDobCalendarMonth.getMonth() === today.getMonth() &&
                      currentDobCalendarMonth.getFullYear() === today.getFullYear();

                    return (
                      <TouchableOpacity
                        style={[
                          styles.monthNavButton,
                          {
                            backgroundColor: isCurrentMonth
                              ? isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.05)'
                              : isDark
                                ? 'rgba(255, 59, 48, 0.15)'
                                : 'rgba(255, 59, 48, 0.1)',
                            opacity: isCurrentMonth ? 0.3 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (!isCurrentMonth) {
                            navigateDobMonth('next');
                          }
                        }}
                        disabled={isCurrentMonth}
                      >
                        <FontAwesome6
                          name="chevron-right"
                          size={20}
                          color={isCurrentMonth ? (isDark ? '#666' : '#999') : '#FF3B30'}
                        />
                      </TouchableOpacity>
                    );
                  })()}
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
                  onHandlerStateChange={onDobPanGestureEvent}
                  onGestureEvent={onDobPanGestureEvent}
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
                          currentDobCalendarMonth.getFullYear(),
                          currentDobCalendarMonth.getMonth(),
                          1
                        );
                        const startDay = (firstDay.getDay() + 6) % 7;
                        const daysInMonth = new Date(
                          currentDobCalendarMonth.getFullYear(),
                          currentDobCalendarMonth.getMonth() + 1,
                          0
                        ).getDate();

                        const dayNumber = totalDayIndex - startDay + 1;
                        const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

                        if (!isValidDay) {
                          weekDays.push(null);
                          continue;
                        }

                        const currentDate = new Date(
                          currentDobCalendarMonth.getFullYear(),
                          currentDobCalendarMonth.getMonth(),
                          dayNumber
                        );
                        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        const displayedDob = dateOfBirth
                          ? dateOfBirth.split('/').reverse().join('-')
                          : '';
                        const isSelected = displayedDob === dateString;

                        // Check if date is in the future
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isFutureDate = currentDate > today;

                        weekDays.push({
                          day: dayNumber,
                          date: dateString,
                          isSelected,
                          isCurrentMonth: true,
                          isFutureDate,
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
                                    if (!day.isFutureDate) {
                                      handleDobSelect(day.date);
                                    }
                                  }}
                                  disabled={day.isFutureDate}
                                  style={[
                                    styles.calendarDay,
                                    day.isSelected && styles.calendarDaySelected,
                                    {
                                      backgroundColor: day.isSelected
                                        ? '#FF3B30'
                                        : day.isFutureDate
                                          ? 'transparent'
                                          : isDark
                                            ? 'rgba(255,255,255,0.05)'
                                            : 'rgba(0,0,0,0.03)',
                                      opacity: day.isFutureDate ? 0.3 : 1,
                                    },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.calendarDayText,
                                      day.isSelected && styles.calendarDayTextSelected,
                                      day.isFutureDate && {
                                        color: isDark ? '#666' : '#999',
                                      },
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
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Month Picker Modal */}
        <Modal
          visible={showMonthPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => {
              setShowMonthPicker(false);
              setTimeout(() => setShowDobPicker(true), 100);
            }}
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
                    <ThemedText style={styles.guestDropdownTitle}>Select Month</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => {
                        setShowMonthPicker(false);
                        setTimeout(() => setShowDobPicker(true), 100);
                      }}
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
                      {months.map((month, index) => {
                        const isSelected = currentDobCalendarMonth.getMonth() === index;
                        const today = new Date();
                        const currentYear = currentDobCalendarMonth.getFullYear();
                        const isFutureMonth =
                          currentYear === today.getFullYear() && index > today.getMonth();

                        return (
                          <TouchableOpacity
                            key={month}
                            disabled={isFutureMonth}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isFutureMonth
                                    ? 'transparent'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                                opacity: isFutureMonth ? 0.3 : 1,
                              },
                            ]}
                            onPress={e => {
                              if (!isFutureMonth) {
                                e.stopPropagation();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const newDate = new Date(currentDobCalendarMonth);
                                newDate.setMonth(index);
                                setCurrentDobCalendarMonth(newDate);
                                setShowMonthPicker(false);
                                setTimeout(() => setShowDobPicker(true), 100);
                              }
                            }}
                          >
                            <ThemedText
                              style={[
                                styles.guestSubLabel,
                                isSelected && { fontFamily: Fonts.bold },
                                isFutureMonth && {
                                  color: isDark ? '#666' : '#999',
                                },
                              ]}
                            >
                              {month}
                            </ThemedText>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Year Picker Modal */}
        <Modal
          visible={showYearPicker}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowYearPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => {
              setShowYearPicker(false);
              setTimeout(() => setShowDobPicker(true), 100);
            }}
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
                    <ThemedText style={styles.guestDropdownTitle}>Select Year</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => {
                        setShowYearPicker(false);
                        setTimeout(() => setShowDobPicker(true), 100);
                      }}
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
                      {years.map(year => {
                        const isSelected = currentDobCalendarMonth.getFullYear() === year;
                        const today = new Date();
                        const isFutureYear = year > today.getFullYear();

                        return (
                          <TouchableOpacity
                            key={year}
                            disabled={isFutureYear}
                            style={[
                              styles.guestRow,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.1)'
                                  : isFutureYear
                                    ? 'transparent'
                                    : isDark
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.03)',
                                marginTop: 8,
                                opacity: isFutureYear ? 0.3 : 1,
                              },
                            ]}
                            onPress={e => {
                              if (!isFutureYear) {
                                e.stopPropagation();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const newDate = new Date(currentDobCalendarMonth);
                                newDate.setFullYear(year);
                                setCurrentDobCalendarMonth(newDate);
                                setShowYearPicker(false);
                                setTimeout(() => setShowDobPicker(true), 100);
                              }
                            }}
                          >
                            <ThemedText
                              style={[
                                styles.guestSubLabel,
                                isSelected && { fontFamily: Fonts.bold },
                                isFutureYear && {
                                  color: isDark ? '#666' : '#999',
                                },
                              ]}
                            >
                              {year}
                            </ThemedText>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
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
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 20,
  },
  formContainer: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(22),
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  sameAsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sameAsLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  passengerDetailsForm: {
    gap: 12,
    marginTop: 16,
  },
  inputColumn: {
    flex: 1,
  },
  labelErrorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
  },
  inputRequired: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  passengerInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.regular,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  errorBorder: {
    borderColor: '#FF3B30',
  },
  disabledInput: {
    opacity: 0.6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    shadowOpacity: 0.2,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 0,
  },
  guestSubLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  calendarDayText: {
    fontSize: responsiveFontSize(20),
    fontWeight: '400',
  },
  calendarDayTextSelected: {
    fontWeight: '600',
    fontSize: responsiveFontSize(20),
    color: '#FFFFFF',
  },
  placeholderText: {
    fontSize: responsiveFontSize(16),
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: 40,
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
});
