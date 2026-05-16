import { Dimensions, PixelRatio, Platform } from 'react-native';

/**
 * Font styling for the entire application
 * This file defines the font family and weights to be used across the app
 */

export const Fonts = {
  light: 'BrandonGrotesque-Light',
  regular: 'BrandonGrotesque-Regular',
  medium: 'BrandonGrotesque-Medium',
  bold: 'BrandonGrotesque-Bold',
};

const { width: screenWidth } = Dimensions.get('window');
const BASE_SCREEN_WIDTH = 390;
const MIN_FONT_SCALE = 0.82;
const MAX_FONT_SCALE = 1.08;
const PLATFORM_FONT_ADJUSTMENT = Platform.OS === 'android' ? 0.94 : 1;
const screenScale = Math.min(
  MAX_FONT_SCALE,
  Math.max(MIN_FONT_SCALE, screenWidth / BASE_SCREEN_WIDTH)
);

export const responsiveFontSize = (size: number) =>
  PixelRatio.roundToNearestPixel(size * screenScale * PLATFORM_FONT_ADJUSTMENT);

export const responsiveLineHeight = (size: number) =>
  PixelRatio.roundToNearestPixel(responsiveFontSize(size) * 1.35);

/**
 * Scale a layout dimension proportionally to screen width.
 * Clamps between `min` and `max` (defaults to ±14 % of `size`).
 */
export const responsiveSize = (size: number, min = size * 0.86, max = size * 1.18) =>
  Math.round(Math.min(max, Math.max(min, size * (screenWidth / BASE_SCREEN_WIDTH))));

// Font sizes for different text styles
export const FontSizes = {
  xs: responsiveFontSize(12),
  sm: responsiveFontSize(14),
  md: responsiveFontSize(16),
  lg: responsiveFontSize(18),
  xl: responsiveFontSize(22),
  xxl: responsiveFontSize(28),
  display: responsiveFontSize(34),
};

// Line heights for different text styles
export const LineHeights = {
  xs: responsiveLineHeight(12),
  sm: responsiveLineHeight(14),
  md: responsiveLineHeight(16),
  lg: responsiveLineHeight(18),
  xl: responsiveLineHeight(22),
  xxl: responsiveLineHeight(28),
  display: responsiveLineHeight(34),
};

export const TabFontSizes = {
  label: responsiveFontSize(11),
  labelFocused: responsiveFontSize(11.5),
  compactLabel: responsiveFontSize(10.5),
};

export const TopTabFontSizes = {
  label: responsiveFontSize(17),
  labelFocused: responsiveFontSize(18),
};
