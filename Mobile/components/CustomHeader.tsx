import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Logo } from '@/components/Logo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts, responsiveFontSize } from '@/constants/Fonts';
import { IconActionButton, ICON_ACTION_BUTTON_SIZE } from './IconActionButton';

const { width: _screenWidth } = Dimensions.get('window');
const _BASE = 390;
const _scale = _screenWidth / _BASE;
const rh = (size: number, min = size * 0.88, max = size * 1.12) =>
  Math.round(Math.min(max, Math.max(min, size * _scale)));

const HEADER_H_PADDING = rh(16, 14, 20);
const ACTION_BTN_SIZE = rh(44, 40, 48);
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
    <View
      style={[
        styles.actionButton,
        {
          alignItems: isLeft ? 'flex-start' : 'flex-end',
          marginTop: Platform.OS === 'ios' ? -6 : 0,
        },
      ]}
    >
      <IconActionButton
        variant={
          action.icon === 'chevron-back'
            ? 'back'
            : action.icon === 'chevron-forward'
              ? 'forward'
              : 'custom'
        }
        iconName={action.icon as keyof typeof Ionicons.glyphMap}
        onPress={() => handleActionPress(action)}
      />
    </View>
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
          <View style={{ width: ICON_ACTION_BUTTON_SIZE, height: ICON_ACTION_BUTTON_SIZE }} />
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
          <View style={{ width: ICON_ACTION_BUTTON_SIZE, height: ICON_ACTION_BUTTON_SIZE }} />
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
