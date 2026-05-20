import React, { useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader } from '@/components/CustomHeader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import * as Haptics from 'expo-haptics';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { useAuth } from '@/context/AuthContext';
import { getCardSurfaceColors } from '@/constants/CardStyles';
import { staysBookingsService } from '@/services/database';

type GatewayIcon =
  | { type: 'ion'; name: keyof typeof Ionicons.glyphMap }
  | { type: 'fa'; name: ComponentProps<typeof FontAwesome>['name'] }
  | { type: 'badge'; label: string }
  | { type: 'image'; light: any; dark: any }
  | { type: 'uri'; uri: string };

type PaymentGateway = {
  id: string;
  name: string;
  description: string;
  accent: string;
  icon: GatewayIcon;
  iconBackground?: string;
};

const getParamValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

type PaymentParams = {
  type?: string;
  stayId?: string;
  stayName?: string;
  eventId?: string;
  eventName?: string;
  activityId?: string;
  activityName?: string;
  activityLocation?: string;
  total?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: string;
  rooms?: string;
  adults?: string;
  children?: string;
  ticketType?: string;
  quantity?: string;
  packageType?: string;
  participants?: string;
  duration?: string;
  activityDate?: string;
  activityTime?: string;
  unitPrice?: string;
  totalAmount?: string;
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  sameAsAccountHolder?: string;
  guestFullName?: string;
  guestEmail?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  roomTypeRate?: string;
  guestPhone?: string;
  guestTitle?: string;
  guestGender?: string;
  guestIdType?: string;
  guestIdNumber?: string;
  guestDateOfBirth?: string;
  guestNationality?: string;
  travelingWithInfant?: string;
  // Bus-specific params
  busOperator?: string;
  fromLocation?: string;
  toLocation?: string;
  departureDate?: string;
  passengers?: string;
  selectedBus?: string;
  passengerFullName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
  pricePerSeat?: string;
  subtotal?: string;
  tax?: string;
};

const PaymentScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<PaymentParams>();
  const { user, isGuest } = useAuth();
  const { showAlert } = useAppAlert();
  const cardColors = getCardSurfaceColors(colorScheme);

  const totalAmount = getParamValue(params.total) ?? getParamValue(params.totalAmount) ?? '0.00';
  const serviceType = getParamValue(params.type) ?? 'stay';
  const serviceName =
    getParamValue(params.stayName) ??
    getParamValue(params.eventName) ??
    getParamValue(params.activityName) ??
    getParamValue(params.busOperator) ??
    'Selected service';
  const stayId = getParamValue(params.stayId);

  // Stay-related params
  const checkIn = getParamValue(params.checkIn);
  const checkOut = getParamValue(params.checkOut);
  const rooms = getParamValue(params.rooms);
  const nights = getParamValue(params.nights);
  const adults = getParamValue(params.adults);
  const children = getParamValue(params.children);
  const roomTypeName = getParamValue(params.roomTypeName);
  const roomTypeRate = getParamValue(params.roomTypeRate);
  const roomsCount = rooms ? Number(rooms) || 1 : 1;
  const adultsCount = adults ? Number(adults) || 1 : 1;
  const childrenCount = children ? Number(children) || 0 : 0;

  // Event-related params
  const ticketType = getParamValue(params.ticketType);
  const quantity = getParamValue(params.quantity);
  const eventDate = getParamValue(params.eventDate);
  const eventTime = getParamValue(params.eventTime);
  const venue = getParamValue(params.venue);

  // Activity-related params
  const packageType = getParamValue(params.packageType);
  const participants = getParamValue(params.participants);
  const duration = getParamValue(params.duration);
  const activityLocation = getParamValue(params.activityLocation);
  const activityDate = getParamValue(params.activityDate);
  const activityTime = getParamValue(params.activityTime);

  // Bus-specific params
  const busOperator = getParamValue(params.busOperator);
  const fromLocation = getParamValue(params.fromLocation);
  const toLocation = getParamValue(params.toLocation);
  const departureDate = getParamValue(params.departureDate);
  const passengersParam = getParamValue(params.passengers);
  const pricePerSeat = getParamValue(params.pricePerSeat);
  const subtotal = getParamValue(params.subtotal);
  const tax = getParamValue(params.tax);
  const passengerFullName = getParamValue(params.passengerFullName);
  const passengerEmailParam = getParamValue(params.passengerEmail);
  const passengerPhone = getParamValue(params.passengerPhone);
  const passengersCount = passengersParam ? Number(passengersParam) || 1 : 1;

  // Guest details from stay-profile
  const sameAsAccountHolder = getParamValue(params.sameAsAccountHolder);
  const guestFullName = getParamValue(params.guestFullName);
  const paramGuestEmail = getParamValue(params.guestEmail);
  const guestPhone = getParamValue(params.guestPhone);
  const guestIdType = getParamValue(params.guestIdType);
  const guestIdNumber = getParamValue(params.guestIdNumber);
  const guestDateOfBirth = getParamValue(params.guestDateOfBirth);
  const guestNationality = getParamValue(params.guestNationality);
  const travelingWithInfant = getParamValue(params.travelingWithInfant);

  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDate = useCallback((value?: string) => {
    if (!value) return 'TBD';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const leadGuestName = useMemo(() => {
    // For bus/flight bookings, use passenger name
    if (
      (serviceType === 'bus' || serviceType === 'flight') &&
      passengerFullName &&
      passengerFullName.trim().length > 0
    ) {
      return passengerFullName.trim();
    }

    // Check if guest details were passed (sameAsAccountHolder === 'false')
    if (sameAsAccountHolder === 'false' && guestFullName && guestFullName.trim().length > 0) {
      return guestFullName.trim();
    }

    // Otherwise, use account holder details
    const metadataName =
      typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined;
    if (metadataName && metadataName.trim().length > 0) {
      return metadataName.trim();
    }
    if (user?.user_metadata?.first_name || user?.user_metadata?.last_name) {
      const first =
        typeof user?.user_metadata?.first_name === 'string'
          ? user.user_metadata.first_name.trim()
          : '';
      const last =
        typeof user?.user_metadata?.last_name === 'string'
          ? user.user_metadata.last_name.trim()
          : '';
      const combined = `${first} ${last}`.trim();
      if (combined.length > 0) {
        return combined;
      }
    }
    return isGuest ? 'Guest traveller' : 'Account holder';
  }, [
    isGuest,
    user?.user_metadata,
    sameAsAccountHolder,
    guestFullName,
    serviceType,
    passengerFullName,
  ]);

  const guestEmail = useMemo(() => {
    // For bus/flight bookings, use passenger email
    if (
      (serviceType === 'bus' || serviceType === 'flight') &&
      passengerEmailParam &&
      passengerEmailParam.trim().length > 0
    ) {
      return passengerEmailParam.trim();
    }

    // Check if guest email was passed (sameAsAccountHolder === 'false')
    if (sameAsAccountHolder === 'false' && paramGuestEmail && paramGuestEmail.trim().length > 0) {
      return paramGuestEmail.trim();
    }

    // Otherwise, use account holder email
    if (typeof user?.email === 'string' && user.email.length > 0) {
      return user.email;
    }
    return 'you@off2zim.com';
  }, [user?.email, sameAsAccountHolder, paramGuestEmail, serviceType, passengerEmailParam]);

  // Generate a transaction number
  const transactionNumber = useMemo(() => {
    const timestamp = Date.now().toString().slice(-4);
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `TXN${timestamp}${randomSuffix}`;
  }, []);

  // Function to get icon for each detail label
  const getDetailIcon = (label: string): keyof typeof Ionicons.glyphMap => {
    switch (label) {
      case 'Transaction':
        return 'receipt';
      case 'Customer name':
        return 'person';
      case 'Contact email':
        return 'mail';
      case 'Phone number':
        return 'call';
      case 'Event date':
      case 'Activity date':
      case 'Check-in':
      case 'Check-out':
      case 'Departure date':
        return 'calendar';
      case 'Event time':
      case 'Time slot':
        return 'time';
      case 'Venue':
      case 'Location':
        return 'location';
      case 'Ticket type':
        return 'ticket';
      case 'Package type':
        return 'pricetag';
      case 'Quantity':
      case 'Participants':
      case 'Passengers':
        return 'people';
      case 'Duration':
        return 'time';
      case 'Guests & rooms':
        return 'bed';
      case 'Route':
        return 'location';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = (label: string, isDark: boolean): string => {
    const grayColor = '#8E8E93';
    switch (label) {
      case 'Route':
      case 'Location':
      case 'Venue':
        return '#FF3B30';
      default:
        return grayColor;
    }
  };

  const bookingDetails = useMemo(() => {
    const baseDetails = [
      { label: 'Transaction', value: transactionNumber },
      { label: 'Customer name', value: leadGuestName },
      { label: 'Contact email', value: guestEmail },
    ];

    if (serviceType === 'bus') {
      return [
        ...baseDetails,
        { label: 'Phone number', value: passengerPhone || 'N/A' },
        { label: 'Bus operator', value: busOperator || 'N/A' },
        { label: 'Route', value: `${fromLocation} → ${toLocation}` },
        { label: 'Departure date', value: formatDate(departureDate) },
        { label: 'Passengers', value: passengersCount.toString() },
      ];
    }

    if (serviceType === 'flight') {
      return [
        ...baseDetails,
        { label: 'Phone number', value: passengerPhone || 'N/A' },
        { label: 'Flight operator', value: busOperator || 'N/A' }, // Using busOperator param name for consistency
        { label: 'Route', value: `${fromLocation} → ${toLocation}` },
        { label: 'Departure date', value: formatDate(departureDate) },
        { label: 'Passengers', value: passengersCount.toString() },
      ];
    }

    if (serviceType === 'event') {
      return [
        ...baseDetails,
        { label: 'Event date', value: formatDate(eventDate) },
        { label: 'Event time', value: eventTime || 'TBD' },
        { label: 'Venue', value: venue || 'TBD' },
        { label: 'Ticket type', value: ticketType || 'Standard' },
        { label: 'Quantity', value: quantity || '1' },
      ];
    }

    if (serviceType === 'activity') {
      return [
        ...baseDetails,
        { label: 'Activity date', value: formatDate(activityDate) },
        { label: 'Time slot', value: activityTime || 'TBD' },
        { label: 'Location', value: activityLocation || 'TBD' },
        { label: 'Package type', value: packageType || 'Standard' },
        { label: 'Participants', value: participants || '1' },
        { label: 'Duration', value: duration || 'TBD' },
      ];
    }

    // Default to stay details
    return [
      ...baseDetails,
      { label: 'Check-in', value: formatDate(checkIn) },
      { label: 'Check-out', value: formatDate(checkOut) },
      {
        label: 'Guests & rooms',
        value: `${adultsCount + childrenCount} guest${
          adultsCount + childrenCount === 1 ? '' : 's'
        } · ${roomsCount} room${roomsCount === 1 ? '' : 's'}`,
      },
      {
        label: 'Room type',
        value: roomTypeName
          ? roomTypeRate
            ? `${roomTypeName} · $${roomTypeRate}/night`
            : roomTypeName
          : 'Not specified',
      },
      { label: 'Contact number', value: guestPhone || 'Not provided' },
    ];
  }, [
    serviceType,
    transactionNumber,
    leadGuestName,
    guestEmail,
    formatDate,
    eventDate,
    eventTime,
    venue,
    activityLocation,
    activityDate,
    activityTime,
    packageType,
    participants,
    duration,
    ticketType,
    quantity,
    checkIn,
    checkOut,
    roomsCount,
    adultsCount,
    childrenCount,
    busOperator,
    fromLocation,
    toLocation,
    departureDate,
    passengersCount,
    passengerPhone,
    roomTypeName,
    roomTypeRate,
    guestPhone,
  ]);

  const paymentGateways = useMemo<PaymentGateway[]>(
    () => [
      {
        id: 'paynow',
        name: 'Paynow',
        description: 'Instant local payments via Paynow wallet or banking apps.',
        icon: {
          type: 'image',
          light: require('@/assets/images/payments/paynow_light.png'),
          dark: require('@/assets/images/payments/paynow_dark.png'),
        },
        accent: '#F5A623',
        iconBackground: 'rgba(245, 166, 35, 0.18)',
      },
      {
        id: 'dpo',
        name: 'DPO',
        description: 'Multi-currency gateway supporting cards, EFT and mobile wallets.',
        icon: {
          type: 'image',
          light: require('@/assets/images/payments/dpo_light.png'),
          dark: require('@/assets/images/payments/dpo_dark.png'),
        },
        accent: '#0B76B7',
        iconBackground: 'rgba(11, 118, 183, 0.18)',
      },
    ],
    []
  );

  const selectedGatewayDetails = useMemo(
    () => paymentGateways.find(item => item.id === selectedGateway) ?? null,
    [paymentGateways, selectedGateway]
  );

  const renderGatewayIcon = useCallback(
    (gateway: PaymentGateway, isSelected: boolean) => {
      switch (gateway.icon.type) {
        case 'ion':
          return <Ionicons name={gateway.icon.name} size={18} color="#FFFFFF" />;
        case 'fa':
          return <FontAwesome name={gateway.icon.name} size={18} color="#FFFFFF" />;
        case 'badge':
          return (
            <ThemedText style={styles.gatewayBadgeLabel} lightColor="#1C1C1E" darkColor="#FFFFFF">
              {gateway.icon.label}
            </ThemedText>
          );
        case 'image':
          const imageStyle =
            gateway.id === 'dpo' || gateway.id === 'paypal' || gateway.id === 'stripe'
              ? styles.gatewayLogoImageSmall
              : styles.gatewayLogoImage;
          const imageStyleArray = !isSelected ? [imageStyle, styles.grayscaleImage] : imageStyle;
          const imageProps: any = {
            source: isDark ? gateway.icon.dark : gateway.icon.light,
            style: imageStyleArray,
            resizeMode: 'contain' as const,
          };
          // Add CSS filter for web
          if (Platform.OS === 'web' && !isSelected) {
            imageProps.style = [imageStyleArray, { filter: 'grayscale(100%)' }];
          }
          return <Image {...imageProps} />;
        case 'uri':
          const uriStyleArray = !isSelected
            ? [styles.gatewayLogoImageSmall, styles.grayscaleImage]
            : styles.gatewayLogoImageSmall;
          const uriProps: any = {
            source: { uri: gateway.icon.uri },
            style: uriStyleArray,
            resizeMode: 'contain' as const,
          };
          // Add CSS filter for web
          if (Platform.OS === 'web' && !isSelected) {
            uriProps.style = [uriStyleArray, { filter: 'grayscale(100%)' }];
          }
          return <Image {...uriProps} />;
        default:
          return null;
      }
    },
    [isDark]
  );

  const handleSelectGateway = useCallback((gatewayId: string) => {
    setSelectedGateway(current => (current === gatewayId ? null : gatewayId));
  }, []);

  const handleCompletePayment = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    if (!selectedGatewayDetails) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showAlert({
        title: 'Select a payment partner',
        message: 'Choose your preferred payment gateway to proceed.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    if (serviceType === 'stay') {
      if (!user?.id || isGuest) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        showAlert({
          title: 'Sign in required',
          message: 'Please sign in to save your stay booking.',
          buttons: [{ text: 'OK' }],
        });
        return;
      }

      const parsedTotal = Number(totalAmount) || 0;
      const parsedSubtotal = subtotal ? Number(subtotal) || 0 : 0;
      const parsedTax = tax ? Number(tax) || 0 : 0;
      const checkInDate = checkIn && checkIn.trim().length > 0 ? checkIn : null;
      const checkOutDate = checkOut && checkOut.trim().length > 0 ? checkOut : null;
      const guestCount = adultsCount + childrenCount;
      const nightlyRate = roomTypeRate ? Number(roomTypeRate) || null : null;

      if (!checkInDate || !checkOutDate) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        showAlert({
          title: 'Dates required',
          message: 'Please select valid check-in and check-out dates.',
          buttons: [{ text: 'OK' }],
        });
        return;
      }

      try {
        setIsProcessing(true);
        const { error } = await staysBookingsService.create({
          userId: user.id,
          stayId,
          stayName: serviceName,
          transactionNumber,
          customerName:
            guestFullName && guestFullName.trim().length > 0 ? guestFullName.trim() : leadGuestName,
          customerEmail: guestEmail,
          customerPhone: guestPhone ?? passengerPhone ?? null,
          checkInDate,
          checkOutDate,
          guestsCount: guestCount,
          adultsCount,
          childrenCount,
          roomsCount,
          roomType: roomTypeName ?? null,
          roomTypeRate: nightlyRate,
          subtotal: parsedSubtotal,
          tax: parsedTax,
          totalAmount: parsedTotal,
          paymentMethod: selectedGatewayDetails.name,
          paymentGateway: {
            id: selectedGatewayDetails.id,
            name: selectedGatewayDetails.name,
          },
          status: 'pending',
          sameAsAccountHolder: sameAsAccountHolder === 'true',
          idType: guestIdType ?? null,
          identityNumber: guestIdNumber ?? null,
          dateOfBirth: guestDateOfBirth ?? null,
          nationality: guestNationality ?? null,
          travelingWithInfant: travelingWithInfant === 'true',
        });

        if (error) {
          throw error;
        }

        showAlert({
          title: 'Booking saved',
          message:
            'Your stay booking details have been saved. Payment gateway integration is coming soon.',
          buttons: [
            {
              text: 'Orders',
              onPress: () => {
                router.dismissAll();
                router.replace('/(tabs)/orders');
              },
            },
            {
              text: 'Done',
              style: 'default',
              onPress: () => {
                router.dismissAll();
                router.replace('/(tabs)');
              },
            },
          ],
        });
      } catch (error) {
        console.error('Failed to save stay booking', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        showAlert({
          title: 'Unable to save booking',
          message: 'Something went wrong while saving your stay booking. Please try again.',
          buttons: [{ text: 'OK' }],
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    showAlert({
      title: `${selectedGatewayDetails.name} coming soon`,
      message: 'We will redirect you to a secure checkout in the next release.',
      buttons: [{ text: 'OK' }],
    });
  }, [
    isProcessing,
    selectedGatewayDetails,
    serviceType,
    user?.id,
    isGuest,
    totalAmount,
    subtotal,
    tax,
    checkIn,
    checkOut,
    adultsCount,
    childrenCount,
    roomTypeRate,
    stayId,
    serviceName,
    roomTypeName,
    roomsCount,
    guestFullName,
    leadGuestName,
    guestEmail,
    guestPhone,
    passengerPhone,
    guestIdType,
    guestIdNumber,
    guestDateOfBirth,
    guestNationality,
    sameAsAccountHolder,
    transactionNumber,
    router,
  ]);

  const handleContactSupport = useCallback(() => {
    // Navigate to message-detail with Off2Zim as the service provider
    const messageData = {
      id: 'off2zim-support',
      name: 'Off2Zim Support', // Service provider name
      message: '', // Start with empty conversation
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isRead: true,
      avatar: 'O', // First character of Off2Zim
      avatarBgColor: colorScheme === 'dark' ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.12)', // Blue color for Off2Zim
      avatarBorderColor: '#007AFF', // iOS blue
      status: 'received' as const,
      isNewConversation: true, // Flag to indicate this is a new conversation
      hostName: 'Off2Zim Support Team',
      stayId: 'support',
      prefilledMessage: `Hi, I need help with my booking.\n\nTransaction: ${transactionNumber}`, // Pre-fill with transaction details
    };

    router.push({
      pathname: '/message-detail',
      params: {
        message: JSON.stringify(messageData),
      },
    });
  }, [colorScheme, transactionNumber]);

  const isPayDisabled = !selectedGatewayDetails || isProcessing;

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <CustomHeader
          showLogo
          leftAction={{ icon: 'chevron-back', onPress: () => router.back(), color: '#FF3B30' }}
        />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Payment
          </ThemedText>
        </View>

        <View style={styles.contentWrapper}>
          <WallpaperPattern offsetTop={0} offsetBottom={0} unlimited height={2000} />
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: cardColors.background,
                },
              ]}
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="card-outline" size={22} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                <ThemedText style={styles.summaryTitle}>Payment Summary</ThemedText>
              </View>

              <ThemedText style={styles.summaryStayName}>{serviceName}</ThemedText>

              <View style={styles.detailsGrid}>
                {bookingDetails.map(detail => (
                  <View key={detail.label} style={styles.summaryRow}>
                    <ThemedText
                      style={[
                        styles.summaryLabel,
                        { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                      ]}
                    >
                      {detail.label}
                    </ThemedText>
                    <View
                      style={[
                        styles.summaryPill,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                      ]}
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
                          marginRight: 6,
                        }}
                      >
                        {detail.label === 'Bus operator' || detail.label === 'Flight operator' ? (
                          <FontAwesome6 name="bus" size={10} color="#8E8E93" />
                        ) : (
                          <Ionicons
                            name={getDetailIcon(detail.label)}
                            size={10}
                            color={getIconColor(detail.label, isDark)}
                          />
                        )}
                      </View>
                      <ThemedText
                        style={[styles.summaryPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                      >
                        {detail.value}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Universal Price Breakdown */}
            {subtotal && tax && (
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: cardColors.background,
                    borderColor: cardColors.border,
                  },
                ]}
              >
                <View style={styles.summaryHeader}>
                  <Ionicons name="calculator" size={22} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                  <ThemedText style={styles.summaryTitle}>Price Breakdown</ThemedText>
                </View>

                <View style={styles.priceBreakdownGrid}>
                  <View style={styles.priceBreakdownRow}>
                    <ThemedText
                      style={[
                        styles.priceBreakdownLabel,
                        { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                      ]}
                    >
                      Subtotal
                    </ThemedText>
                    <ThemedText style={styles.priceBreakdownValue}>${subtotal}</ThemedText>
                  </View>

                  <View style={styles.priceBreakdownRow}>
                    <ThemedText
                      style={[
                        styles.priceBreakdownLabel,
                        { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
                      ]}
                    >
                      Service fee
                    </ThemedText>
                    <ThemedText style={styles.priceBreakdownValue}>${tax}</ThemedText>
                  </View>

                  <View
                    style={[
                      styles.priceBreakdownDivider,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                  />

                  <View style={styles.priceBreakdownRow}>
                    <ThemedText style={styles.priceBreakdownLabelBold}>Total</ThemedText>
                    <ThemedText style={styles.priceBreakdownValueBold}>${totalAmount}</ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Total Section */}
            <View style={styles.totalRow}>
              <View
                style={[styles.creativeTotal, { backgroundColor: isDark ? '#2d5a36' : '#dcf4e0' }]}
              >
                {/* Icon */}
                <View style={styles.totalIconContainer}>
                  <Ionicons name="card" size={20} color="#FFFFFF" />
                </View>

                {/* Total label */}
                <ThemedText style={styles.totalMainLabel}>Total</ThemedText>

                {/* Amount */}
                <View style={styles.totalPriceContainer}>
                  <ThemedText style={styles.totalAmount}>${totalAmount}</ThemedText>
                  <ThemedText
                    style={[
                      styles.totalNote,
                      { color: isDark ? 'rgba(255,255,255,0.7)' : '#3c3c43' },
                    ]}
                  >
                    Includes taxes and fees
                  </ThemedText>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.gatewayCard,
                {
                  backgroundColor: cardColors.background,
                },
              ]}
            >
              <View style={styles.gatewayHeader}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={isDark ? '#FFFFFF' : '#1C1C1E'}
                />
                <View style={styles.gatewayHeaderText}>
                  <ThemedText style={styles.gatewayTitle}>Payment Method</ThemedText>
                </View>
              </View>

              <View style={styles.gatewayList}>
                {paymentGateways.map(gateway => {
                  const isSelected = gateway.id === selectedGateway;
                  return (
                    <TouchableOpacity
                      key={gateway.id}
                      activeOpacity={0.88}
                      onPress={() => handleSelectGateway(gateway.id)}
                      style={[
                        styles.gatewayOption,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(52, 199, 89, 0.15)'
                              : 'rgba(52, 199, 89, 0.1)'
                            : isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.03)',
                        },
                        isSelected && styles.selectedGatewayOption,
                      ]}
                    >
                      {gateway.icon.type === 'image' ? (
                        <View
                          style={
                            gateway.id === 'stripe'
                              ? styles.gatewayLogoContainerStripe
                              : gateway.id === 'dpo'
                                ? styles.gatewayLogoContainerDpo
                                : gateway.id === 'paypal'
                                  ? styles.gatewayLogoContainerSmall
                                  : styles.gatewayLogoContainer
                          }
                        >
                          {renderGatewayIcon(gateway, isSelected)}
                        </View>
                      ) : gateway.icon.type === 'uri' ? (
                        <View style={styles.gatewayLogoContainerSmall}>
                          {renderGatewayIcon(gateway, isSelected)}
                        </View>
                      ) : (
                        <>
                          <View
                            style={[
                              styles.gatewayIconBadge,
                              {
                                backgroundColor: gateway.iconBackground ?? gateway.accent,
                              },
                            ]}
                          >
                            {renderGatewayIcon(gateway, isSelected)}
                          </View>
                          <View style={styles.gatewayContent}>
                            <ThemedText style={styles.gatewayName}>{gateway.name}</ThemedText>
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.paymentSection,
                {
                  backgroundColor: cardColors.background,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={handleCompletePayment}
                style={[
                  styles.payButton,
                  isPayDisabled ? styles.payButtonDisabled : styles.payButtonEnabled,
                ]}
                disabled={isPayDisabled}
              >
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                <ThemedText style={styles.payButtonText}>
                  {isProcessing
                    ? 'Saving booking...'
                    : selectedGatewayDetails
                      ? `Pay with ${selectedGatewayDetails.name}`
                      : 'Select Payment Method'}
                </ThemedText>
              </TouchableOpacity>

              <ThemedText style={[styles.payDisclaimer, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                By completing the payment you agree to Off2Zim&apos;s booking policies and terms.
              </ThemedText>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleContactSupport}
              style={[
                styles.supportCard,
                {
                  backgroundColor: cardColors.background,
                },
              ]}
            >
              <View style={styles.supportIconBadge}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#007AFF" />
              </View>
              <View style={styles.supportContent}>
                <ThemedText style={styles.supportTitle}>Need help with your booking?</ThemedText>
                <ThemedText
                  style={[
                    styles.supportDescription,
                    { color: isDark ? 'rgba(255,255,255,0.65)' : '#4A4A4A' },
                  ]}
                >
                  Chat with the Off2Zim team
                </ThemedText>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ThemedView>
    </IOSScreenWrapper>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  wallpaperOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    textAlign: 'left',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
  },
  summaryStayName: {
    fontSize: responsiveFontSize(20),
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
  summaryValue: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  summaryPillText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  totalCard: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  totalAmount: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    lineHeight: 30,
  },
  gatewayCard: {
    borderRadius: 16,
    padding: 20,
    gap: 18,
  },
  paymentSection: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  gatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gatewayHeaderText: {
    flex: 1,
    gap: 4,
  },
  gatewayTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(18),
  },
  gatewaySubtitle: {
    fontSize: responsiveFontSize(13),
  },
  gatewayList: {
    gap: 12,
  },
  gatewayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 16,
    marginVertical: 6,
  },
  selectedGatewayOption: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 0,
  },
  gatewayIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gatewayLogoContainer: {
    height: 48,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingVertical: 20,
  },
  gatewayLogoContainerSmall: {
    height: 64,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  gatewayLogoContainerDpo: {
    height: 48,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
    marginLeft: -8,
    paddingVertical: 20,
    paddingTop: 24,
  },
  gatewayLogoContainerStripe: {
    height: 64,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
    marginLeft: -16,
  },
  gatewayLogoImage: {
    height: 64,
    maxWidth: 228,
  },
  gatewayLogoImageSmall: {
    height: 28,
    maxWidth: 130,
  },
  grayscaleImage: {
    opacity: 0.6,
  },
  gatewayBadgeLabel: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(13),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  gatewayContent: {
    flex: 1,
    gap: 4,
  },
  gatewayPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 36,
    paddingRight: 36,
  },
  gatewayName: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(16),
  },
  gatewayDescription: {
    fontSize: responsiveFontSize(13),
    lineHeight: 18,
  },
  gatewayHint: {
    fontSize: responsiveFontSize(13),
    lineHeight: 18,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 16,
  },
  supportIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportContent: {
    flex: 1,
    gap: 2,
  },
  supportTitle: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(15),
  },
  supportDescription: {
    fontSize: responsiveFontSize(13),
    lineHeight: 18,
  },
  payButtonEnabled: {
    backgroundColor: '#0A7D42',
  },
  payButtonDisabled: {
    backgroundColor: '#A8A8A8',
  },
  payButton: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
  },
  payDisclaimer: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  dueTodayTitle: {
    fontSize: responsiveFontSize(22),
    lineHeight: 28,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 0,
    marginBottom: 8,
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
  totalNote: {
    marginTop: 4,
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.regular,
  },
  priceBreakdownGrid: {
    gap: 12,
    marginTop: 4,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceBreakdownLabel: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.regular,
  },
  priceBreakdownValue: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.medium,
  },
  priceBreakdownLabelBold: {
    fontSize: responsiveFontSize(17),
    fontFamily: Fonts.bold,
  },
  priceBreakdownValueBold: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  priceBreakdownDivider: {
    height: 1,
    marginVertical: 8,
  },
});
