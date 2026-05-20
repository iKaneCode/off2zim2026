import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

type TripType = 'oneWay' | 'return';

export interface BusSearchFormProps {
  style?: StyleProp<ViewStyle>;
  tripType: TripType;
  onTripTypeChange: (type: TripType) => void;
  isDark: boolean;
  attemptedSubmit: boolean;
  selectedOperator?: string | null;
  onOperatorPress?: () => void;
  showOperatorField?: boolean;
  operatorLabel?: string;
  operatorIconName?: React.ComponentProps<typeof FontAwesome6>['name'];
  selectedFromLocation: string | null;
  selectedToLocation: string | null;
  onPressFrom: () => void;
  onPressTo: () => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  selectedDate: string | null;
  departureLabel: string;
  onPressDepartureDate: () => void;
  selectedReturnDate: string | null;
  returnLabel: string;
  onPressReturnDate: () => void;
  showReturnField: boolean;
  passengers: number;
  onIncrementPassengers: () => void;
  onDecrementPassengers: () => void;
  onPressSearch: () => void;
  searchButtonLabel?: string;
}

export function BusSearchForm({
  style,
  tripType,
  onTripTypeChange,
  isDark,
  attemptedSubmit,
  selectedOperator,
  onOperatorPress,
  showOperatorField = true,
  operatorLabel = 'Operator',
  operatorIconName = 'bus',
  selectedFromLocation,
  selectedToLocation,
  onPressFrom,
  onPressTo,
  fromPlaceholder = 'Select departure location',
  toPlaceholder = 'Select destination',
  selectedDate,
  departureLabel,
  onPressDepartureDate,
  selectedReturnDate,
  returnLabel,
  onPressReturnDate,
  showReturnField,
  passengers,
  onIncrementPassengers,
  onDecrementPassengers,
  onPressSearch,
  searchButtonLabel = 'Search',
}: BusSearchFormProps) {
  const operatorBackground = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const inputBackground = operatorBackground;
  const bubbleBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const locationIconColor = '#FF3B30';
  const calendarIconColor = '#8E8E93';
  const searchButtonBackground = isDark ? '#FFFFFF' : '#000000';
  const searchButtonText = isDark ? '#000000' : '#FFFFFF';

  return (
    <View style={[styles.container, style]}>
      {showOperatorField && onOperatorPress ? (
        <View style={styles.fieldBlock}>
          <View style={styles.labelRow}>
            <ThemedText style={styles.label}>{operatorLabel}</ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: operatorBackground }]}
            onPress={onOperatorPress}
            activeOpacity={0.8}
          >
            <View style={styles.selectionRow}>
              <View style={[styles.iconBubble, { backgroundColor: bubbleBackground }]}>
                <FontAwesome6 name={operatorIconName} size={14} color="#8E8E93" />
              </View>
              <ThemedText style={[styles.valueText, !selectedOperator && styles.placeholderText]}>
                {selectedOperator || 'Select operator'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.fieldBlock}>
        <ThemedText style={[styles.label, styles.sectionHeaderLabel]}>Journey Type</ThemedText>
        <View
          style={[
            styles.tabContainer,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              tripType === 'oneWay' && styles.activeTab,
              {
                backgroundColor:
                  tripType === 'oneWay' ? (isDark ? '#FFFFFF' : '#000000') : 'transparent',
              },
            ]}
            onPress={() => onTripTypeChange('oneWay')}
            disabled={tripType === 'oneWay'}
            activeOpacity={tripType === 'oneWay' ? 1 : 0.9}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    tripType === 'oneWay'
                      ? isDark
                        ? '#000000'
                        : '#FFFFFF'
                      : isDark
                        ? '#FFFFFF'
                        : '#000000',
                },
                tripType === 'oneWay' && styles.tabTextActive,
              ]}
            >
              One Way
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              tripType === 'return' && styles.activeTab,
              {
                backgroundColor:
                  tripType === 'return' ? (isDark ? '#FFFFFF' : '#000000') : 'transparent',
              },
            ]}
            onPress={() => onTripTypeChange('return')}
            disabled={tripType === 'return'}
            activeOpacity={tripType === 'return' ? 1 : 0.9}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    tripType === 'return'
                      ? isDark
                        ? '#000000'
                        : '#FFFFFF'
                      : isDark
                        ? '#FFFFFF'
                        : '#000000',
                },
                tripType === 'return' && styles.tabTextActive,
              ]}
            >
              Return
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.label}>From</ThemedText>
          {attemptedSubmit && !selectedFromLocation ? (
            <ThemedText style={styles.errorText}>This field is required</ThemedText>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.input,
            { backgroundColor: inputBackground },
            attemptedSubmit && !selectedFromLocation && styles.errorBorder,
          ]}
          onPress={onPressFrom}
          activeOpacity={0.8}
        >
          <View style={styles.selectionRow}>
            <View style={[styles.iconBubble, { backgroundColor: bubbleBackground }]}>
              <Ionicons name="location" size={14} color={locationIconColor} />
            </View>
            <ThemedText style={[styles.valueText, !selectedFromLocation && styles.placeholderText]}>
              {selectedFromLocation || fromPlaceholder}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.label}>To</ThemedText>
          {attemptedSubmit && !selectedToLocation ? (
            <ThemedText style={styles.errorText}>This field is required</ThemedText>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.input,
            { backgroundColor: inputBackground },
            attemptedSubmit && !selectedToLocation && styles.errorBorder,
          ]}
          onPress={onPressTo}
          activeOpacity={0.8}
        >
          <View style={styles.selectionRow}>
            <View style={[styles.iconBubble, { backgroundColor: bubbleBackground }]}>
              <Ionicons name="location" size={14} color={locationIconColor} />
            </View>
            <ThemedText style={[styles.valueText, !selectedToLocation && styles.placeholderText]}>
              {selectedToLocation || toPlaceholder}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.label}>Departure Date</ThemedText>
          {attemptedSubmit && !selectedDate ? (
            <ThemedText style={styles.errorText}>This field is required</ThemedText>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.input,
            { backgroundColor: inputBackground },
            attemptedSubmit && !selectedDate && styles.errorBorder,
          ]}
          onPress={onPressDepartureDate}
          activeOpacity={0.8}
        >
          <View style={styles.selectionRow}>
            <View style={[styles.iconBubble, { backgroundColor: bubbleBackground }]}>
              <Ionicons name="calendar" size={14} color={calendarIconColor} />
            </View>
            <ThemedText style={[styles.valueText, !selectedDate && styles.placeholderText]}>
              {departureLabel}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      {showReturnField ? (
        <View style={styles.fieldBlock}>
          <View style={styles.labelRow}>
            <ThemedText style={styles.label}>Return Date</ThemedText>
            {attemptedSubmit && !selectedReturnDate ? (
              <ThemedText style={styles.errorText}>This field is required</ThemedText>
            ) : null}
          </View>
          <TouchableOpacity
            style={[
              styles.input,
              { backgroundColor: inputBackground },
              attemptedSubmit && !selectedReturnDate && styles.errorBorder,
            ]}
            onPress={onPressReturnDate}
            activeOpacity={0.8}
          >
            <View style={styles.selectionRow}>
              <View style={[styles.iconBubble, { backgroundColor: bubbleBackground }]}>
                <Ionicons name="calendar" size={14} color={calendarIconColor} />
              </View>
              <ThemedText style={[styles.valueText, !selectedReturnDate && styles.placeholderText]}>
                {returnLabel}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.passengerBlock}>
        <ThemedText style={[styles.label, styles.passengerLabel]}>Number of Passengers</ThemedText>
        <View
          style={[
            styles.quantitySelector,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.counterButton,
              {
                backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)',
                opacity: passengers <= 1 ? 0.4 : 1,
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
            onPress={onDecrementPassengers}
            disabled={passengers <= 1}
            activeOpacity={passengers <= 1 ? 0.4 : 0.8}
          >
            <Ionicons name="remove-sharp" size={28} color="#FF3B30" style={{ fontWeight: '900' }} />
          </TouchableOpacity>

          <ThemedText style={styles.guestCount}>{passengers}</ThemedText>

          <TouchableOpacity
            style={[
              styles.counterButton,
              {
                backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)',
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
            onPress={onIncrementPassengers}
            activeOpacity={0.8}
          >
            <Ionicons name="add-sharp" size={28} color="#34C759" style={{ fontWeight: '900' }} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.searchButton, { backgroundColor: searchButtonBackground }]}
        activeOpacity={0.9}
        onPress={onPressSearch}
      >
        <Ionicons name="search" size={22} color={searchButtonText} />
        <ThemedText style={[styles.searchButtonText, { color: searchButtonText }]}>
          {searchButtonLabel}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldBlock: {
    marginBottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
  },
  errorText: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.bold,
    color: '#FF3B30',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    minHeight: 56,
    justifyContent: 'center',
  },
  errorBorder: {
    borderColor: '#FF3B30',
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  valueText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.medium,
    flexShrink: 1,
  },
  placeholderText: {
    opacity: 0.58,
  },
  sectionHeaderLabel: {
    marginBottom: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
    marginBottom: 0,
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
    shadowOpacity: 0.18,
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
  passengerBlock: {
    marginTop: 0,
  },
  passengerLabel: {
    marginBottom: 12,
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
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestCount: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    minWidth: 24,
    textAlign: 'center',
  },
  searchButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  searchButtonText: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
