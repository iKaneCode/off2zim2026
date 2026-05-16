import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Text,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { WallpaperPattern } from '@/components/WallpaperPattern';
import { BusSearchForm } from '@/components/BusSearchForm';
import { useColorScheme } from '@/hooks/useColorScheme';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

export type OperatorItem = { id: string; name: string; route?: string; rating?: number };

export interface TransportSearchProps {
  operatorData: OperatorItem[];
  operatorHeaderTitle?: string; // e.g., 'Operator' | 'Airline'
  operatorAllLabel?: string; // e.g., 'All' | 'All Airlines'
  operatorIconName?: React.ComponentProps<typeof FontAwesome6>['name']; // 'bus' | 'plane'
  searchRoute: '/bus-search' | '/flight-search';
  serviceProviderDefault: string; // 'Bus' | 'Airline'
  destinationsList?: string[];
  fromPlaceholder?: string;
  toPlaceholder?: string;
}

const defaultDestinations = ['Harare', 'Gweru', 'Kwekwe', 'Kadoma', 'Bulawayo'];

const formatDateLabel = (value: string | null, placeholder: string) => {
  if (!value) return placeholder;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return placeholder;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export function TransportSearch({
  operatorData,
  operatorHeaderTitle = 'Operator',
  operatorAllLabel = 'All',
  operatorIconName = 'bus',
  searchRoute,
  serviceProviderDefault,
  destinationsList = defaultDestinations,
  fromPlaceholder = 'Select departure location',
  toPlaceholder = 'Select destination',
}: TransportSearchProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [tripType, setTripType] = useState<'oneWay' | 'return'>('oneWay');
  const [passengers, setPassengers] = useState(1);
  const [selectedOperator, setSelectedOperator] = useState<string | null>('All');
  const [selectedFromLocation, setSelectedFromLocation] = useState<string | null>(null);
  const [selectedToLocation, setSelectedToLocation] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedReturnDate, setSelectedReturnDate] = useState<string | null>(null);
  const [showOperatorPicker, setShowOperatorPicker] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [currentReturnCalendarMonth, setCurrentReturnCalendarMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReturnAnimating, setIsReturnAnimating] = useState(false);

  const calendarOpacity = useRef(new Animated.Value(1)).current;
  const returnCalendarOpacity = useRef(new Animated.Value(1)).current;

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

  const departureLabel = formatDateLabel(selectedDate, 'Select departure date');
  const returnLabel = formatDateLabel(selectedReturnDate, 'Select return date');

  const handleSearch = () => {
    setAttemptedSubmit(true);
    const missingOneWay = !selectedFromLocation || !selectedToLocation || !selectedDate;
    const missingReturn = tripType === 'return' && !selectedReturnDate;
    if (missingOneWay || missingReturn) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: searchRoute,
      params: {
        serviceProvider:
          selectedOperator === 'All' ? serviceProviderDefault : selectedOperator || serviceProviderDefault,
        fromLocation: selectedFromLocation || '',
        toLocation: selectedToLocation || '',
        departureDate: selectedDate || '',
        returnDate: tripType === 'return' ? selectedReturnDate || '' : '',
        tripType,
        passengers: passengers.toString(),
      },
    });
  };

  const handleTripTypeChange = (type: 'oneWay' | 'return') => {
    if (type === tripType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTripType(type);
    if (type === 'oneWay') setSelectedReturnDate(null);
  };

  const openOperatorPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowOperatorPicker(true);
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
    if (passengers <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPassengers(prev => Math.max(1, prev - 1));
  };

  const handleDepartureDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setShowDatePicker(false);
    const [year, month] = dateString.split('-').map(part => Number(part));
    setCurrentReturnCalendarMonth(new Date(year, month - 1, 1));
    setSelectedReturnDate(prev => {
      if (prev && prev < dateString) return null;
      return prev;
    });
  };
  const handleReturnDateSelect = (dateString: string) => {
    setSelectedReturnDate(dateString);
    setShowReturnDatePicker(false);
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
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return next;
      });
      Animated.timing(calendarOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    });
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
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return next;
      });
      Animated.timing(returnCalendarOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsReturnAnimating(false));
    });
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
          if (!isCurrentMonth) navigateMonth('prev');
        } else {
          navigateMonth('next');
        }
      }
    }
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
          if (!isCurrentMonth) navigateReturnMonth('prev');
        } else {
          navigateReturnMonth('next');
        }
      }
    }
  };

  const renderCalendar = (
    month: Date,
    selectedValue: string | null,
    onSelect: (value: string) => void,
    opacityValue: Animated.Value,
    onGesture: (event: any) => void,
    options?: { minimumDate?: string }
  ) => {
    const weeks: Array<
      Array<
        | null
        | {
            day: number;
            date: string;
            isSelected: boolean;
            isPast: boolean;
            isToday: boolean;
            isDisabled: boolean;
          }
      >
    > = [];
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const startDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
      const weekDays: Array<
        | null
        | {
            day: number;
            date: string;
            isSelected: boolean;
            isPast: boolean;
            isToday: boolean;
            isDisabled: boolean;
          }
      > = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const totalDayIndex = weekIndex * 7 + dayIndex;
        const dayNumber = totalDayIndex - startDay + 1;
        const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
        if (!isValidDay) {
          weekDays.push(null);
          continue;
        }
        const currentDate = new Date(month.getFullYear(), month.getMonth(), dayNumber);
        const dateString = `${currentDate.getFullYear()}-${String(
          currentDate.getMonth() + 1
        ).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const isSelected = selectedValue === dateString;
        const isPast = currentDate.getTime() < new Date().setHours(0, 0, 0, 0);
        const isBeforeMinimum = options?.minimumDate ? dateString < options.minimumDate : false;
        const isDisabled = isPast || isBeforeMinimum;
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(today.getDate()).padStart(2, '0')}`;
        weekDays.push({
          day: dayNumber,
          date: dateString,
          isSelected,
          isPast,
          isToday: dateString === todayString,
          isDisabled,
        });
      }
      if (weekDays.every(day => day === null)) continue;
      weeks.push(weekDays);
    }
    return (
      <PanGestureHandler
        onHandlerStateChange={onGesture}
        onGestureEvent={onGesture}
        activeOffsetX={[-20, 20]}
        failOffsetY={[-10, 10]}
        shouldCancelWhenOutside={true}
      >
        <Animated.View style={[styles.itineraryCalendarGrid, { opacity: opacityValue }]}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.itineraryWeekRow}>
              {week.map((day, dayIndex) => (
                <View key={`day-${weekIndex}-${dayIndex}`} style={styles.itineraryCalendarDayContainer}>
                  {day && (
                    <TouchableOpacity
                      onPress={() => {
                        if (!day.isDisabled) onSelect(day.date);
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
                          day.isToday && !day.isSelected && styles.itineraryTodayDay,
                          day.isDisabled && !day.isSelected && !day.isToday && styles.itineraryPastDay,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.itineraryDayText,
                            day.isSelected && [
                              styles.itinerarySelectedDayText,
                              { color: isDark ? '#000000' : '#FFFFFF' },
                            ],
                            day.isToday && !day.isSelected && styles.itineraryTodayDayText,
                            day.isDisabled && !day.isSelected && !day.isToday && styles.itineraryPastDayText,
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
          ))}
        </Animated.View>
      </PanGestureHandler>
    );
  };

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        <WallpaperPattern offsetTop={0} offsetBottom={0} unlimited height={2000} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.bookingSection,
              {
                backgroundColor: cardBackground,
                borderColor: cardBorderColor,
                borderWidth: 1,
                shadowColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(28,28,30,0.12)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 0,
              },
            ]}
          >
            <BusSearchForm
              tripType={tripType}
              onTripTypeChange={handleTripTypeChange}
              isDark={isDark}
              attemptedSubmit={attemptedSubmit}
              selectedOperator={selectedOperator}
              onOperatorPress={openOperatorPicker}
              showOperatorField
              operatorLabel={operatorHeaderTitle}
              operatorIconName={operatorIconName}
              selectedFromLocation={selectedFromLocation}
              selectedToLocation={selectedToLocation}
              onPressFrom={openFromPicker}
              onPressTo={openToPicker}
              fromPlaceholder={fromPlaceholder}
              toPlaceholder={toPlaceholder}
              selectedDate={selectedDate}
              departureLabel={departureLabel}
              onPressDepartureDate={openDepartureDatePicker}
              selectedReturnDate={selectedReturnDate}
              returnLabel={returnLabel}
              onPressReturnDate={openReturnDatePicker}
              showReturnField={tripType === 'return'}
              passengers={passengers}
              onIncrementPassengers={incrementPassengers}
              onDecrementPassengers={decrementPassengers}
              onPressSearch={handleSearch}
            />
          </View>
        </ScrollView>

        {/* Operator Picker */}
        <Modal
          visible={showOperatorPicker}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowOperatorPicker(false)}
        >
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            onPress={() => setShowOperatorPicker(false)}
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
                    <ThemedText style={styles.guestDropdownTitle}>{operatorHeaderTitle}</ThemedText>
                    <TouchableOpacity
                      style={styles.guestDropdownCloseButton}
                      onPress={() => setShowOperatorPicker(false)}
                      activeOpacity={0.8}
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
                      <TouchableOpacity
                        key="operator-any"
                        style={[
                          styles.guestRow,
                          {
                            backgroundColor:
                              selectedOperator === 'All'
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
                          setSelectedOperator('All');
                          setShowOperatorPicker(false);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                              justifyContent: 'center',
                              alignItems: 'center',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.08,
                              shadowRadius: 2,
                              elevation: 0,
                            }}
                          >
                            <FontAwesome6 name={operatorIconName} size={14} color="#8E8E93" />
                          </View>
                          <ThemedText
                            style={[
                              styles.guestSubLabel,
                              selectedOperator === 'All' && { fontFamily: Fonts.bold },
                            ]}
                          >
                            {operatorAllLabel}
                          </ThemedText>
                        </View>
                        <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                          {selectedOperator === 'All' && (
                            <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                          )}
                        </View>
                      </TouchableOpacity>
                      {operatorData.map(operator => (
                        <TouchableOpacity
                          key={`operator-${operator.id}`}
                          style={[
                            styles.guestRow,
                            {
                              backgroundColor:
                                selectedOperator === operator.name
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
                            setSelectedOperator(operator.name);
                            setShowOperatorPicker(false);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                justifyContent: 'center',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.08,
                                shadowRadius: 2,
                                elevation: 0,
                              }}
                            >
                              <FontAwesome6 name={operatorIconName} size={14} color="#8E8E93" />
                            </View>
                            <ThemedText
                              style={[
                                styles.guestSubLabel,
                                selectedOperator === operator.name && { fontFamily: Fonts.bold },
                              ]}
                            >
                              {operator.name}
                            </ThemedText>
                          </View>
                          <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                            {selectedOperator === operator.name && (
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

        {/* From Picker */}
        <Modal
          visible={showFromPicker}
          transparent
          animationType="fade"
          statusBarTranslucent
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
                      activeOpacity={0.8}
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
                      {destinationsList.map(location => (
                        <TouchableOpacity
                          key={`from-${location}`}
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
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                justifyContent: 'center',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.08,
                                shadowRadius: 2,
                                elevation: 0,
                              }}
                            >
                              <Ionicons name="location" size={14} color="#FF3B30" />
                            </View>
                            <ThemedText
                              style={[
                                styles.guestSubLabel,
                                selectedFromLocation === location && { fontFamily: Fonts.bold },
                              ]}
                            >
                              {location}
                            </ThemedText>
                          </View>
                          <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
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

        {/* To Picker */}
        <Modal
          visible={showToPicker}
          transparent
          animationType="fade"
          statusBarTranslucent
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
                      activeOpacity={0.8}
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
                      {destinationsList
                        .filter(location => location !== selectedFromLocation)
                        .map(location => (
                          <TouchableOpacity
                            key={`to-${location}`}
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
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: 0.08,
                                  shadowRadius: 2,
                                  elevation: 0,
                                }}
                              >
                                <Ionicons name="location" size={14} color="#FF3B30" />
                              </View>
                              <ThemedText
                                style={[
                                  styles.guestSubLabel,
                                  selectedToLocation === location && { fontFamily: Fonts.bold },
                                ]}
                              >
                                {location}
                              </ThemedText>
                            </View>
                            <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
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

        {/* Departure Date Picker */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          statusBarTranslucent
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
                      activeOpacity={0.8}
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
                    <View style={styles.itineraryCalendarHeader}>
                      {(() => {
                        const today = new Date();
                        const currentMonth = new Date(
                          currentCalendarMonth.getFullYear(),
                          currentCalendarMonth.getMonth(),
                          1
                        );
                        const isCurrentMonth =
                          currentMonth.getFullYear() === today.getFullYear() &&
                          currentMonth.getMonth() === today.getMonth();

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
                        onPress={() => navigateMonth('next')}
                      >
                        <FontAwesome6 name="chevron-right" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itineraryWeekDaysHeader}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <View key={day} style={styles.itineraryWeekDayItem}>
                          <ThemedText style={styles.itineraryWeekDayText}>{day}</ThemedText>
                        </View>
                      ))}
                    </View>

                    {renderCalendar(
                      currentCalendarMonth,
                      selectedDate,
                      handleDepartureDateSelect,
                      calendarOpacity,
                      onPanGestureEvent
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Return Date Picker */}
        <Modal
          visible={showReturnDatePicker}
          transparent
          animationType="fade"
          statusBarTranslucent
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
                      activeOpacity={0.8}
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
                    <View style={styles.itineraryCalendarHeader}>
                      {(() => {
                        const today = new Date();
                        const currentMonth = new Date(
                          currentReturnCalendarMonth.getFullYear(),
                          currentReturnCalendarMonth.getMonth(),
                          1
                        );
                        const isCurrentMonth =
                          currentMonth.getFullYear() === today.getFullYear() &&
                          currentMonth.getMonth() === today.getMonth();

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
                        onPress={() => navigateReturnMonth('next')}
                      >
                        <FontAwesome6 name="chevron-right" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itineraryWeekDaysHeader}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <View key={day} style={styles.itineraryWeekDayItem}>
                          <ThemedText style={styles.itineraryWeekDayText}>{day}</ThemedText>
                        </View>
                      ))}
                    </View>

                    {renderCalendar(
                      currentReturnCalendarMonth,
                      selectedReturnDate,
                      handleReturnDateSelect,
                      returnCalendarOpacity,
                      onReturnPanGestureEvent,
                      selectedDate
                        ? {
                            minimumDate: selectedDate,
                          }
                        : undefined
                    )}
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
  container: { flex: 1 },
  scrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  bookingSection: {
    padding: 20,
    marginBottom: -37,
    borderRadius: 12,
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
  guestSection: { marginBottom: 20 },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 0,
  },
  guestSubLabel: { fontSize: responsiveFontSize(16), fontWeight: '600' },
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
  itineraryMonthTitle: { fontSize: responsiveFontSize(22), fontWeight: '600' },
  itineraryWeekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  itineraryWeekDayItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  itineraryWeekDayText: { fontSize: responsiveFontSize(12), fontWeight: '600', opacity: 0.5, textTransform: 'uppercase' },
  itineraryCalendarGrid: { paddingHorizontal: 16, paddingBottom: 8 },
  itineraryWeekRow: { flexDirection: 'row' },
  itineraryCalendarDayContainer: { flex: 1, alignItems: 'center', paddingVertical: 2, paddingHorizontal: 2 },
  itineraryCalendarDayTouchable: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 24 },
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
  itinerarySelectedDay: { overflow: 'hidden', width: 36, height: 36, borderRadius: 18, marginBottom: 0 },
  itineraryTodayDay: { backgroundColor: '#FF3B30', overflow: 'hidden', width: 36, height: 36, borderRadius: 18, marginBottom: 0 },
  itineraryPastDay: { opacity: 0.3 },
  itineraryDayText: { fontSize: responsiveFontSize(20), fontWeight: '400' },
  itinerarySelectedDayText: { fontWeight: '600', fontSize: responsiveFontSize(20) },
  itineraryTodayDayText: { fontWeight: '600', fontSize: responsiveFontSize(20), color: '#FFFFFF' },
  itineraryPastDayText: { opacity: 0.3, fontSize: responsiveFontSize(20) },
});

export default TransportSearch;
