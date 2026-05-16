import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Logo } from '@/components/Logo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontAwesome6 } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts, responsiveFontSize } from '@/constants/Fonts';

const { width: _screenWidth } = Dimensions.get('window');
const _BASE = 390;
const _scale = _screenWidth / _BASE;
const rh = (size: number, min = size * 0.88, max = size * 1.12) =>
  Math.round(Math.min(max, Math.max(min, size * _scale)));

const HEADER_H_PADDING = rh(16, 14, 20);
const ACTION_BTN_SIZE = rh(44, 40, 48);
const ICON_CIRCLE_SIZE = rh(36, 32, 40);
const ICON_SIZE = rh(20, 18, 22);
const TITLE_FONT_SIZE = responsiveFontSize(22);
const TITLE_CONTAINER_HEIGHT = rh(44, 40, 48);
const HEADER_MARGIN_BOTTOM = rh(15, 12, 18);

interface HeaderAction {
  icon: string;
  onPress: () => void;
  color?: string;
}

interface CustomHeaderProps {
  title?: string;
  showLogo?: boolean;
  logoSize?: 'small' | 'medium' | 'large';
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  style?: any;
  titleStyle?: any;
  expandedTitle?: boolean; // New prop to increase header size for title display
}

export function CustomHeader({
  title,
  showLogo = false,
  logoSize = 'large',
  leftAction,
  rightAction,
  style,
  titleStyle,
  expandedTitle = false,
}: CustomHeaderProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const notchHeight = insets.top;
  const topPadding = Platform.OS === 'ios' ? (notchHeight > 20 ? 0 : 4) : 8;

  // Increase header height when expandedTitle is true and title is shown
  const baseHeaderHeight = Platform.OS === 'ios' ? (insets.top > 20 ? 44 : 42) : 56;
  const headerHeight =
    expandedTitle && title && !showLogo ? baseHeaderHeight + 20 : baseHeaderHeight;

  const handleActionPress = (action: HeaderAction) => {
    action.onPress();
  };

  const renderActionButton = (action: HeaderAction, isLeft: boolean) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          alignItems: isLeft ? 'flex-start' : 'flex-end',
          marginTop: Platform.OS === 'ios' ? -6 : 0,
        },
      ]}
      onPress={() => handleActionPress(action)}
    >
      <View
        style={[
          styles.headerIconCircle,
          {
            backgroundColor: isDarkMode ? '#402221' : '#F3E0E3',
          },
        ]}
      >
        {action.icon === 'chevron-back' ? (
          <FontAwesome6 name="chevron-left" size={ICON_SIZE} color={action.color || '#FF3B30'} />
        ) : action.icon === 'chevron-forward' ? (
          <FontAwesome6 name="chevron-right" size={ICON_SIZE} color={action.color || '#FF3B30'} />
        ) : (
          <Ionicons name={action.icon as any} size={ICON_SIZE} color={action.color || '#FF3B30'} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: insets.top + topPadding,
          paddingBottom: 0,
          height: headerHeight + insets.top,
          borderBottomWidth: 0,
          marginBottom: HEADER_MARGIN_BOTTOM,
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      {leftAction ? (
        renderActionButton(leftAction, true)
      ) : (
        <View style={styles.actionButton}>
          <View style={{ width: ICON_CIRCLE_SIZE, height: ICON_CIRCLE_SIZE }} />
        </View>
      )}

      <View
        style={[
          styles.titleContainer,
          Platform.OS === 'ios' ? { marginTop: insets.top > 20 ? -6 : -3 } : { marginTop: 0 },
        ]}
      >
        {showLogo ? (
          <Logo size={logoSize} />
        ) : (
          <ThemedText type="title" style={[styles.title, titleStyle]}>
            {title}
          </ThemedText>
        )}
      </View>

      {rightAction ? (
        renderActionButton(rightAction, false)
      ) : (
        <View style={styles.actionButton}>
          <View style={{ width: ICON_CIRCLE_SIZE, height: ICON_CIRCLE_SIZE }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: HEADER_H_PADDING,
    zIndex: 1000,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      },
    }),
  },
  actionButton: {
    width: ACTION_BTN_SIZE,
    height: ACTION_BTN_SIZE,
    justifyContent: 'center',
    zIndex: 2,
    paddingBottom: 0,
  },
  headerIconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: Math.round(ICON_CIRCLE_SIZE / 2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: TITLE_CONTAINER_HEIGHT,
  },
  title: {
    fontSize: TITLE_FONT_SIZE,
    fontFamily: Fonts.bold,
    marginTop: 0,
  },
});
