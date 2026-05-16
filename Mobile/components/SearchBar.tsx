import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  containerStyle?: any;
  title?: string; // Optional title to display above search bar
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  containerStyle,
  title,
}: SearchBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDarkMode = colorScheme === 'dark';

  return (
    <View style={[styles.searchContainer, containerStyle]}>
      {title && <ThemedText style={styles.titleText}>{title}</ThemedText>}
      <View
        style={[
          styles.searchInputWrapper,
          {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          },
          style,
        ]}
      >
        <Ionicons name="search" size={18} color={colors.icon} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}
          placeholder={placeholder}
          placeholderTextColor={isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'}
          value={value}
          onChangeText={onChangeText}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} style={styles.clearIcon} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 2, // Further reduced vertical padding
    marginBottom: 4,
  },
  titleText: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    height: 40,
  },
});
