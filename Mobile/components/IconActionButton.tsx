import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart, faShareFromSquare } from '@fortawesome/free-regular-svg-icons';
import { useColorScheme } from '@/hooks/useColorScheme';

export const ICON_ACTION_BUTTON_SIZE = 42;
export const ICON_ACTION_BUTTON_ACTIVE_COLOR = '#FF4757';

export type IconActionButtonVariant = 'back' | 'forward' | 'close' | 'like' | 'share' | 'custom';

export type IconActionButtonProps = Omit<TouchableOpacityProps, 'style'> & {
  variant: IconActionButtonVariant;
  iconName?: keyof typeof Ionicons.glyphMap;
  isActive?: boolean;
  size?: number;
  iconSize?: number;
  iconColor?: string;
  surfaceColor?: string;
  disabledIconColor?: string;
  style?: StyleProp<ViewStyle>;
  iconContainerStyle?: StyleProp<any>;
};

export function getIconActionButtonColors(isDark: boolean) {
  return {
    surface: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,28,30,0.06)',
    icon: isDark ? '#FFFFFF' : '#1C1C1E',
    disabledIcon: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(28,28,30,0.26)',
    activeIcon: ICON_ACTION_BUTTON_ACTIVE_COLOR,
  };
}

export function IconActionButton({
  variant,
  iconName,
  isActive = false,
  size = ICON_ACTION_BUTTON_SIZE,
  iconSize,
  iconColor,
  surfaceColor,
  disabledIconColor,
  style,
  iconContainerStyle,
  disabled,
  activeOpacity = 0.85,
  hitSlop = { top: 8, right: 8, bottom: 8, left: 8 },
  ...touchableProps
}: IconActionButtonProps) {
  const isDark = useColorScheme() === 'dark';
  const heartScale = useRef(new Animated.Value(1)).current;
  const hasMountedRef = useRef(false);
  const colors = getIconActionButtonColors(isDark);
  const resolvedIconColor = disabled
    ? (disabledIconColor ?? colors.disabledIcon)
    : variant === 'like'
      ? colors.activeIcon
      : isActive
        ? colors.activeIcon
        : (iconColor ?? colors.icon);
  const resolvedSurfaceColor = surfaceColor ?? colors.surface;
  const resolvedIconSize =
    iconSize ??
    (variant === 'share' ? 19 : variant === 'like' ? 20 : variant === 'custom' ? 20 : 22);

  useEffect(() => {
    if (variant !== 'like') return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    heartScale.stopAnimation();

    if (isActive) {
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 0.82,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.spring(heartScale, {
          toValue: 1.24,
          friction: 4,
          tension: 260,
          useNativeDriver: true,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          friction: 7,
          tension: 220,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 0.86,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 8,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartScale, isActive, variant]);

  const renderIcon = () => {
    if (variant === 'like') {
      return (
        <FontAwesomeIcon
          icon={isActive ? solidHeart : regularHeart}
          size={resolvedIconSize}
          color={resolvedIconColor}
        />
      );
    }

    if (variant === 'share') {
      return (
        <FontAwesomeIcon
          icon={faShareFromSquare}
          size={resolvedIconSize}
          color={resolvedIconColor}
        />
      );
    }

    const resolvedIonIcon =
      variant === 'back'
        ? 'chevron-back'
        : variant === 'forward'
          ? 'chevron-forward'
          : variant === 'close'
            ? 'close'
            : iconName;

    if (!resolvedIonIcon) return null;

    return <Ionicons name={resolvedIonIcon} size={resolvedIconSize} color={resolvedIconColor} />;
  };

  return (
    <TouchableOpacity
      {...touchableProps}
      disabled={disabled}
      activeOpacity={activeOpacity}
      hitSlop={hitSlop}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: resolvedSurfaceColor,
          opacity: disabled ? 0.72 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={variant === 'like' ? { transform: [{ scale: heartScale }] } : undefined}
      >
        <Animated.View style={iconContainerStyle}>{renderIcon()}</Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
