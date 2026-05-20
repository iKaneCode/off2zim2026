import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

const MONTHS = [
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

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CalendarDay = {
  key: string;
  date: string | null;
  dayNumber: number | null;
  isSelected: boolean;
  isDisabled: boolean;
};

type CalendarDatePickerModalProps = {
  visible: boolean;
  title?: string;
  selectedDate?: string | null;
  colorScheme: 'light' | 'dark' | null | undefined;
  minimumDate?: Date;
  maximumDate?: Date;
  onSelectDate: (isoDate: string) => void;
  onClose: () => void;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function CalendarDatePickerModal({
  visible,
  title = 'Select Date',
  selectedDate,
  colorScheme,
  minimumDate,
  maximumDate,
  onSelectDate,
  onClose,
}: CalendarDatePickerModalProps) {
  const selected = parseIsoDate(selectedDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => selected ?? maximumDate ?? new Date()
  );
  const [showYearPicker, setShowYearPicker] = useState(false);
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const rowBackground = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const selectedBackground = '#FF3B30';
  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const maxDay = maximumDate ? startOfDay(maximumDate) : null;
  const selectedIso = selected ? toIsoDate(selected) : null;

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = maximumDate?.getFullYear() ?? currentYear + 5;
    const minYear = minimumDate?.getFullYear() ?? currentYear - 120;
    return Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
  }, [maximumDate, minimumDate]);

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: CalendarDay[] = [];

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      days.push({
        key: `empty-start-${index}`,
        date: null,
        dayNumber: null,
        isSelected: false,
        isDisabled: true,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const dayStart = startOfDay(date);
      const iso = toIsoDate(date);
      days.push({
        key: iso,
        date: iso,
        dayNumber: day,
        isSelected: iso === selectedIso,
        isDisabled: Boolean((minDay && dayStart < minDay) || (maxDay && dayStart > maxDay)),
      });
    }

    while (days.length % 7 !== 0) {
      days.push({
        key: `empty-end-${days.length}`,
        date: null,
        dayNumber: null,
        isSelected: false,
        isDisabled: true,
      });
    }

    return days;
  }, [currentMonth, maxDay, minDay, selectedIso]);

  const navigateMonth = (direction: 'previous' | 'next') => {
    setCurrentMonth(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1}>
        <View style={styles.container}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={event => event.stopPropagation()}
            style={[styles.card, { backgroundColor: cardBackground }]}
          >
            <View style={styles.header}>
              <ThemedText style={[styles.title, { color: textColor }]}>{title}</ThemedText>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            {showYearPicker ? (
              <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
                {years.map(year => {
                  const isSelected = currentMonth.getFullYear() === year;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearOption,
                        { backgroundColor: isSelected ? 'rgba(255,59,48,0.16)' : rowBackground },
                      ]}
                      onPress={() => {
                        setCurrentMonth(prev => new Date(year, prev.getMonth(), 1));
                        setShowYearPicker(false);
                      }}
                    >
                      <Text style={[styles.yearText, { color: textColor }]}>{year}</Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color="#FF3B30" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <>
                <View style={styles.monthHeader}>
                  <TouchableOpacity
                    style={[styles.monthButton, { backgroundColor: rowBackground }]}
                    onPress={() => navigateMonth('previous')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chevron-back" size={22} color={textColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.monthTitleButton}
                    onPress={() => setShowYearPicker(true)}
                    activeOpacity={0.75}
                  >
                    <ThemedText style={[styles.monthTitle, { color: textColor }]}>
                      {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={18} color={textColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.monthButton, { backgroundColor: rowBackground }]}
                    onPress={() => navigateMonth('next')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chevron-forward" size={22} color={textColor} />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekRow}>
                  {WEEK_DAYS.map(day => (
                    <Text key={day} style={[styles.weekText, { color: textColor }]}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {calendarDays.map(day => (
                    <View key={day.key} style={styles.dayCell}>
                      {day.date ? (
                        <TouchableOpacity
                          style={[
                            styles.dayButton,
                            day.isSelected && { backgroundColor: selectedBackground },
                          ]}
                          disabled={day.isDisabled}
                          onPress={() => {
                            if (day.date) {
                              onSelectDate(day.date);
                            }
                          }}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              { color: day.isSelected ? '#FFFFFF' : textColor },
                              day.isDisabled && styles.disabledText,
                            ]}
                          >
                            {day.dayNumber}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.bold,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.14)',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.bold,
    opacity: 0.55,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
  },
  disabledText: {
    opacity: 0.25,
  },
  yearList: {
    maxHeight: 360,
  },
  yearOption: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.bold,
  },
});
