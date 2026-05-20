import React, { useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Text,
  Image,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/ThemedText';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { renderEventIcon } from '@/components/EventIcon';
import { LocationPill } from '@/components/LocationPill';
import { StatusPill } from '@/components/StatusPill';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import {
  formatDate,
  getSpecificTypeIcon,
  isAccommodationAllDay,
  formatTime,
} from '@/utils/itineraryUtils';
import { getCalendarDaysForMonth, type CalendarDay } from '@/utils/calendarUtils';
import type { ItineraryData } from '@/components';

interface CalendarViewProps {
  currentMonth: Date;
  expandedItinerary: ItineraryData[];
  originalItinerary: ItineraryData[];
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  isWeekFocused: boolean;
  setIsWeekFocused: (focused: boolean) => void;
  focusedWeekIndex: number | null;
  setFocusedWeekIndex: (index: number | null) => void;
  isRefreshing: boolean;
  isAnimating: boolean;
  setIsAnimating: (animating: boolean) => void;
  colorScheme: 'light' | 'dark' | null;
  onRefresh: () => void;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  // Animation refs
  slideAnim: Animated.Value;
  opacityAnim: Animated.Value;
  inlineCardAnim: Animated.Value;
  bottomRowsTranslate: Animated.Value;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentMonth,
  expandedItinerary,
  originalItinerary,
  selectedDate,
  setSelectedDate,
  isWeekFocused,
  setIsWeekFocused,
  focusedWeekIndex,
  setFocusedWeekIndex,
  isRefreshing,
  isAnimating,
  setIsAnimating,
  colorScheme,
  onRefresh,
  onNavigateMonth,
  slideAnim,
  opacityAnim,
  inlineCardAnim,
  bottomRowsTranslate,
}) => {
  const panGestureRef = useRef<PanGestureHandler>(null);

  // Handle pan gesture for month navigation
  const onPanGestureEvent = (event: any) => {
    if (isAnimating || isRefreshing) return;

    const { translationX, translationY, velocityX, state } = event.nativeEvent;

    if (state === State.END) {
      const swipeThreshold = 50;
      const velocityThreshold = 500;
      const horizontalRatio = Math.abs(translationX) / (Math.abs(translationY) + 1);

      if (
        horizontalRatio > 1.5 &&
        (Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > velocityThreshold)
      ) {
        if (translationX > 0 || velocityX > 0) {
          onNavigateMonth('prev');
        } else if (translationX < 0 || velocityX < 0) {
          onNavigateMonth('next');
        }
      }
    }
  };

  // Utility: Is this week the selected week?
  const isSelectedWeek = (
    calendarDays: CalendarDay[],
    selectedDate: string | null,
    weekIndex: number
  ): boolean => {
    if (!selectedDate) return false;
    const index = calendarDays.findIndex(day => day.date === selectedDate);
    const selectedWeekIndex = Math.floor(index / 7);
    return weekIndex === selectedWeekIndex;
  };

  // Utility: Animate week focus
  const animateWeekFocus = (focus: boolean, weekIndex?: number, onComplete?: () => void) => {
    setIsAnimating(true);
    Animated.timing(inlineCardAnim, {
      toValue: focus ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setIsAnimating(false);
      if (onComplete) onComplete();
    });
  };

  // Get events for the selected date
  const selectedDateEvents = selectedDate
    ? expandedItinerary.filter(event => event.date === selectedDate)
    : [];

  // Calendar header component
  const renderCalendarHeader = () => {
    const monthName = currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    return (
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={[
            styles.monthNavButton,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)',
            },
          ]}
          onPress={() => onNavigateMonth('prev')}
        >
          <FontAwesome6 name="chevron-left" size={20} color="#FF3B30" />
        </TouchableOpacity>

        <ThemedText style={styles.monthTitle}>{monthName}</ThemedText>

        <TouchableOpacity
          style={[
            styles.monthNavButton,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)',
            },
          ]}
          onPress={() => onNavigateMonth('next')}
        >
          <FontAwesome6 name="chevron-right" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  // Week days header
  const renderWeekDaysHeader = () => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <View style={styles.weekDaysHeader}>
        {weekDays.map(day => (
          <View key={day} style={styles.weekDayItem}>
            <ThemedText style={styles.weekDayText}>{day}</ThemedText>
          </View>
        ))}
      </View>
    );
  };

  // Render a single week row
  const renderWeekRow = (weekDays: CalendarDay[], weekIndex: number, allDays: CalendarDay[]) => {
    return (
      <View key={`week-${weekIndex}`}>
        <View style={styles.weekRow}>
          {weekDays.map(day => (
            <View key={day.date} style={styles.calendarDayContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (isAnimating) return;
                  if (selectedDate === day.date) {
                    animateWeekFocus(false, undefined, () => {
                      setSelectedDate(null);
                      setIsWeekFocused(false);
                      setFocusedWeekIndex(null);
                    });
                  } else {
                    setSelectedDate(day.date);
                    setFocusedWeekIndex(weekIndex);
                    if (!isWeekFocused) {
                      setIsWeekFocused(true);
                      animateWeekFocus(true, weekIndex);
                    }
                  }
                }}
                disabled={!day.isCurrentMonth}
                activeOpacity={0.7}
                style={styles.calendarDayTouchable}
              >
                <View
                  style={[
                    styles.calendarDay,
                    day.isSelected && [
                      styles.selectedDay,
                      { backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000' },
                    ],
                    day.isToday && !day.isSelected && styles.todayDay,
                    day.events.length > 0 &&
                      !day.isSelected &&
                      !day.isToday && [
                        styles.dayWithEvents,
                        {
                          backgroundColor:
                            colorScheme === 'dark'
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.1)',
                        },
                      ],
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dayText,
                      day.isSelected && [
                        styles.selectedDayText,
                        { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' },
                      ],
                      day.isToday &&
                        !day.isSelected && [
                          styles.todayDayText,
                          { color: colorScheme === 'dark' ? '#000000' : '#FFFFFF' },
                        ],
                      day.events.length > 0 &&
                        !day.isSelected &&
                        !day.isToday &&
                        styles.dayWithEventsText,
                      !day.isCurrentMonth && styles.otherMonthDayText,
                      day.isPast && !day.isSelected && !day.isToday && styles.pastDayText,
                    ]}
                  >
                    {day.day}
                  </ThemedText>
                </View>
                {day.events.length > 0 && day.isCurrentMonth && (
                  <View style={styles.eventIndicators}>
                    {day.events
                      .sort((a, b) => {
                        const isAccommodationAllDay = (
                          event: ItineraryData,
                          dateString: string
                        ) => {
                          if (event.type !== 'accommodation') return false;
                          if (
                            event.date === dateString &&
                            event.actualTime &&
                            event.duration === 'Check-in'
                          ) {
                            return false;
                          }
                          if (
                            event.date === dateString &&
                            event.actualTime &&
                            event.duration === 'Check-out'
                          ) {
                            return false;
                          }
                          if (event.duration === 'Check-in') {
                            const checkOutEntry = originalItinerary.find(
                              checkOut =>
                                checkOut.type === 'accommodation' &&
                                checkOut.duration === 'Check-out' &&
                                checkOut.name === event.name
                            );
                            if (checkOutEntry) {
                              const startDate = new Date(event.date);
                              const endDate = new Date(checkOutEntry.date);
                              const checkDate = new Date(dateString);
                              return checkDate > startDate && checkDate < endDate;
                            }
                          }
                          return false;
                        };
                        const aIsAllDay = isAccommodationAllDay(a, day.date);
                        const bIsAllDay = isAccommodationAllDay(b, day.date);
                        if (aIsAllDay && !bIsAllDay) return -1;
                        if (bIsAllDay && !aIsAllDay) return 1;
                        if (aIsAllDay && bIsAllDay) {
                          if (a.type === 'accommodation' && b.type !== 'accommodation') return -1;
                          if (b.type === 'accommodation' && a.type !== 'accommodation') return 1;
                          return 0;
                        }
                        return (a.actualTime || '').localeCompare(b.actualTime || '');
                      })
                      .slice(0, 3)
                      .map((event, index) => (
                        <View key={event.id}>
                          {renderEventIcon({
                            iconName: getSpecificTypeIcon(event),
                            size: 10,
                            color: '#8E8E93',
                            style: styles.eventIcon,
                          })}
                        </View>
                      ))}
                    {day.events.length > 3 && (
                      <ThemedText style={styles.moreEventsText}>+</ThemedText>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Event item component for selected date
  const renderEventItem = ({
    item,
    index,
    isLast,
  }: {
    item: ItineraryData;
    index: number;
    isLast?: boolean;
  }) => {
    const isDarkMode = colorScheme === 'dark';
    const isAllDay = isAccommodationAllDay(item, selectedDate!, originalItinerary);
    const startTime = isAllDay ? 'All day' : formatTime(item.actualTime);
    const endTime = !isAllDay && item.endTime ? formatTime(item.endTime) : null;
    const timeDisplay = isAllDay ? 'All day' : endTime ? `${startTime} - ${endTime}` : startTime;

    const pillIconBackground = isDarkMode ? '#2C2C2E' : '#FFFFFF';

    return (
      <TouchableOpacity
        style={[
          styles.calendarEventItem,
          {
            backgroundColor: colorScheme === 'dark' ? '#000000' : '#f2f2f7',
            marginBottom: isLast ? 0 : 8,
          },
        ]}
        onPress={() => {
          // Handle event item press - you can pass this as a prop if needed
        }}
        activeOpacity={0.6}
      >
        <View
          style={[
            styles.calendarEventIcon,
            { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' },
          ]}
        >
          {item.providerLogo ? (
            <Image
              source={{ uri: item.providerLogo }}
              style={styles.calendarEventProviderLogo}
              resizeMode="contain"
            />
          ) : (
            renderEventIcon({
              iconName: getSpecificTypeIcon(item),
              size: 20,
              color: '#8E8E93',
            })
          )}
        </View>

        <View style={styles.calendarEventContent}>
          <View style={styles.calendarEventHeader}>
            <Text
              style={[styles.calendarEventTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.calendarEventTime, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
              {timeDisplay}
            </Text>
          </View>

          <View style={styles.calendarEventMeta}>
            {item.location && (
              <LocationPill
                label={item.location}
                backgroundColor={isDarkMode ? '#1C1C1E' : 'rgba(255,255,255,0.9)'}
                iconBackgroundColor={pillIconBackground}
                iconColor="#FF3B30"
                lightTextColor={isDarkMode ? '#FFFFFF' : '#1C1C1E'}
                darkTextColor={isDarkMode ? '#FFFFFF' : '#1C1C1E'}
                variant="compact"
                style={{ flexShrink: 1 }}
              />
            )}
            {item.duration && (
              <StatusPill
                label={item.duration}
                iconName="time"
                backgroundColor={isDarkMode ? '#1C1C1E' : 'rgba(255,255,255,0.9)'}
                iconBackgroundColor={isDarkMode ? '#2C2C2E' : '#FFFFFF'}
                iconColor={(() => {
                  const durationLower = item.duration.toLowerCase();
                  if (durationLower.includes('check-out')) return '#FF3B30';
                  if (durationLower.includes('check-in') || durationLower.includes('all day')) {
                    return '#34C759';
                  }
                  return '#8E8E93';
                })()}
                lightTextColor={isDarkMode ? '#FFFFFF' : '#1C1C1E'}
                darkTextColor={isDarkMode ? '#FFFFFF' : '#1C1C1E'}
                style={{ marginLeft: item.location ? 'auto' : undefined }}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render the calendar grid with inline expansion
  const renderCalendarWithInlineExpansion = (monthDate: Date) => {
    const calendarDays = getCalendarDaysForMonth(monthDate, expandedItinerary, selectedDate);
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < 6; i++) {
      weeks.push(calendarDays.slice(i * 7, (i + 1) * 7));
    }
    const focused = isWeekFocused && focusedWeekIndex !== null;
    let displayWeeks: { week: CalendarDay[]; state: 'focused' | 'below' }[];
    if (focused) {
      displayWeeks = [
        { week: weeks[focusedWeekIndex!], state: 'focused' as const },
        ...weeks.slice(focusedWeekIndex! + 1).map(w => ({ week: w, state: 'below' as const })),
      ];
    } else {
      displayWeeks = weeks.map(w => ({ week: w, state: 'focused' }));
    }

    return (
      <Animated.View
        style={[
          styles.calendarGrid,
          {
            transform: [{ translateX: slideAnim }],
            opacity: opacityAnim,
            position: 'relative',
            zIndex: 1,
          },
        ]}
      >
        {displayWeeks.map((entry, displayIndex) => {
          const { week: weekDays, state } = entry;
          let isDetailRow = false;
          if (focused) {
            isDetailRow = displayIndex === 0;
          } else if (selectedDate) {
            isDetailRow = isSelectedWeek(calendarDays, selectedDate, displayIndex);
          }
          if (focused && state === 'below') {
            return (
              <Animated.View
                key={`week-${displayIndex}`}
                style={{
                  opacity: 0.3,
                  transform: [
                    {
                      translateY: bottomRowsTranslate.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 32],
                      }),
                    },
                  ],
                }}
              >
                {renderWeekRow(weekDays, displayIndex + focusedWeekIndex!, calendarDays)}
              </Animated.View>
            );
          }
          if (focused && focusedWeekIndex! > 0 && displayIndex > 0) {
            return null;
          }
          return (
            <React.Fragment key={`week-${displayIndex}`}>
              {renderWeekRow(weekDays, focused ? focusedWeekIndex! : displayIndex, calendarDays)}
              {selectedDate && isDetailRow && displayIndex === 0 && (
                <Animated.View
                  style={[
                    styles.inlineItineraryCard,
                    {
                      backgroundColor:
                        colorScheme === 'dark' ? '#1C1C1E' : 'rgba(255,255,255,0.95)',
                      opacity: inlineCardAnim,
                      transform: [
                        {
                          scale: inlineCardAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.92, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.closeButton,
                      {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(255, 59, 48, 0.15)'
                            : 'rgba(255, 59, 48, 0.1)',
                      },
                    ]}
                    onPress={() => {
                      if (isAnimating) return;
                      animateWeekFocus(false, undefined, () => {
                        setSelectedDate(null);
                        setIsWeekFocused(false);
                        setFocusedWeekIndex(null);
                      });
                    }}
                  >
                    <FontAwesome6 name="xmark" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                  <ThemedText style={styles.inlineCardTitle}>{formatDate(selectedDate)}</ThemedText>
                  {selectedDateEvents.length > 0 ? (
                    <View style={styles.inlineEventsContainer}>
                      {selectedDateEvents
                        .sort((a: ItineraryData, b: ItineraryData) => {
                          const isAccommodationAllDay = (
                            event: ItineraryData,
                            dateString: string
                          ) => {
                            if (event.type !== 'accommodation') return false;
                            if (
                              event.date === dateString &&
                              event.actualTime &&
                              !event.message.toLowerCase().includes('check-out')
                            )
                              return false;
                            if (
                              event.date === dateString &&
                              event.actualTime &&
                              event.message.toLowerCase().includes('check-out')
                            )
                              return false;
                            if (event.duration && event.duration.includes('night')) {
                              const startDate = new Date(event.date);
                              const checkDate = new Date(dateString);
                              const durationMatch = event.duration.match(/(\d+)\s*night/i);
                              if (durationMatch) {
                                const nights = parseInt(durationMatch[1]);
                                const endDate = new Date(startDate);
                                endDate.setDate(startDate.getDate() + nights);
                                return checkDate > startDate && checkDate < endDate;
                              }
                            }
                            return false;
                          };
                          const aIsAllDay = isAccommodationAllDay(a, selectedDate!);
                          const bIsAllDay = isAccommodationAllDay(b, selectedDate!);
                          if (aIsAllDay && !bIsAllDay) return -1;
                          if (bIsAllDay && !aIsAllDay) return 1;
                          if (aIsAllDay && bIsAllDay) {
                            if (a.type === 'accommodation' && b.type !== 'accommodation') return -1;
                            if (b.type === 'accommodation' && a.type !== 'accommodation') return 1;
                            return 0;
                          }
                          return (a.actualTime || '').localeCompare(b.actualTime || '');
                        })
                        .map((event: ItineraryData, index: number, array: ItineraryData[]) => (
                          <View key={event.id}>
                            {renderEventItem({
                              item: event,
                              index,
                              isLast: index === array.length - 1,
                            })}
                          </View>
                        ))}
                    </View>
                  ) : (
                    <View style={styles.inlineNoEventsContainer}>
                      <View
                        style={[
                          styles.inlineNoEventsIconBubble,
                          {
                            backgroundColor:
                              colorScheme === 'dark'
                                ? 'rgba(175,82,222,0.22)'
                                : 'rgba(175,82,222,0.14)',
                          },
                        ]}
                      >
                        <FontAwesome6 name="calendar-days" size={22} color="#AF52DE" />
                      </View>
                      <ThemedText style={styles.inlineNoEventsText}>No events scheduled</ThemedText>
                    </View>
                  )}
                </Animated.View>
              )}
            </React.Fragment>
          );
        })}
      </Animated.View>
    );
  };

  return (
    <View style={styles.calendarContainer}>
      {renderCalendarHeader()}
      {renderWeekDaysHeader()}

      <PanGestureHandler
        ref={panGestureRef}
        onHandlerStateChange={onPanGestureEvent}
        onGestureEvent={onPanGestureEvent}
        activeOffsetX={[-20, 20]}
        failOffsetY={[-10, 10]}
        shouldCancelWhenOutside={true}
        enabled={!isRefreshing && !isAnimating}
      >
        <ScrollView
          contentContainerStyle={styles.calendarScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          bouncesZoom={false}
          alwaysBounceVertical={true}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {renderCalendarWithInlineExpansion(currentMonth)}
        </ScrollView>
      </PanGestureHandler>
    </View>
  );
};

// Styles extracted from the main component
const styles = {
  calendarContainer: {
    flex: 1,
  },
  calendarScrollContent: {
    flexGrow: 1,
  },
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
    fontFamily: Fonts.medium,
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
    fontFamily: Fonts.medium,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    minHeight: 250,
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  calendarDayTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 64,
    borderRadius: 24,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minWidth: 36,
    maxWidth: 36,
    minHeight: 36,
    maxHeight: 36,
  },
  selectedDay: {
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 16,
  },
  todayDay: {
    backgroundColor: '#FF3B30',
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 16,
  },
  dayWithEvents: {
    overflow: 'hidden',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 16,
  },
  dayText: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.regular,
  },
  selectedDayText: {
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(20),
  },
  todayDayText: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(20),
  },
  dayWithEventsText: {
    color: '#FF3B30',
    fontFamily: Fonts.medium,
    fontSize: responsiveFontSize(20),
  },
  otherMonthDayText: {
    opacity: 0.3,
    fontSize: responsiveFontSize(20),
  },
  pastDayText: {
    opacity: 0.3,
    fontSize: responsiveFontSize(20),
  },
  eventIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 12,
    marginTop: 0,
    position: 'absolute',
    bottom: 4,
    width: '100%',
  },
  eventIcon: {
    marginHorizontal: 1,
  },
  moreEventsText: {
    fontSize: responsiveFontSize(8),
    fontFamily: Fonts.medium,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 12,
  },
  inlineItineraryCard: {
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  inlineCardTitle: {
    fontSize: responsiveFontSize(17),
    fontFamily: Fonts.medium,
    padding: 16,
    paddingBottom: 16,
    paddingRight: 50,
  },
  inlineEventsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  inlineNoEventsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  inlineNoEventsIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineNoEventsText: {
    fontSize: responsiveFontSize(14),
    opacity: 0.6,
    marginTop: 6,
  },
  calendarEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  calendarEventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  calendarEventContent: {
    flex: 1,
  },
  calendarEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calendarEventTitle: {
    fontSize: responsiveFontSize(15),
    fontFamily: Fonts.bold,
    flex: 1,
    marginRight: 8,
  },
  calendarEventTime: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.medium,
  },
  calendarEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flex: 1,
  },
  calendarEventProviderLogo: {
    width: '90%',
    height: '90%',
    borderRadius: 999,
  },
} as const;
