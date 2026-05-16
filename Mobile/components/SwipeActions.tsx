import React from 'react';
import { Animated, Platform } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppAlert } from '@/context/AppAlertContext';
import * as Haptics from 'expo-haptics';

export interface SwipeAction {
  icon: string;
  color?: string;
  backgroundColor?: string;
  onPress: () => void;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmButtonText?: string;
  isDestructive?: boolean;
}

interface SwipeActionsProps {
  actions: SwipeAction[];
  progress: Animated.AnimatedInterpolation<string | number>;
  containerWidth?: number;
  endOffset?: number;
  direction?: 'left' | 'right';
}

export function SwipeActions({
  actions,
  progress,
  containerWidth = 120,
  endOffset = 0,
  direction = 'right',
}: SwipeActionsProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { showAlert } = useAppAlert();

  const translateBase = [
    containerWidth + 10,
    containerWidth * 0.8,
    containerWidth * 0.6,
    containerWidth * 0.3,
    containerWidth * 0.15,
    0,
  ];

  const translateMultiplier = direction === 'right' ? 1 : -1;

  const translateX = progress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: translateBase.map(value => value * translateMultiplier),
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, 0.2, 0.4, 0.7, 0.9, 1],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.3, 0.5, 0.7, 0.8, 0.9, 1],
    outputRange: [0.8, 0.85, 0.9, 0.95, 0.98, 0.99, 1],
    extrapolate: 'clamp',
  });

  const rotate = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['2deg', '1deg', '0deg'],
    extrapolate: 'clamp',
  });

  const handleActionPress = (action: SwipeAction) => {
    if (action.confirmTitle && action.confirmMessage) {
      showAlert({
        title: action.confirmTitle,
        message: action.confirmMessage,
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action.confirmButtonText || 'Confirm',
            style: action.isDestructive ? 'destructive' : 'default',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(
                  action.isDestructive
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light
                );
              }
              action.onPress();
            },
          },
        ],
      });
    } else {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      action.onPress();
    }
  };

  const buttonWidth = containerWidth / actions.length;
  const marginAdjustment = actions.length > 1 ? -8 : 0;

  return (
    <Animated.View
      style={[
        {
          backgroundColor: 'transparent',
          transform: [{ translateX }, { scale }, { rotate }],
          opacity,
          flexDirection: 'row',
          justifyContent: direction === 'right' ? 'flex-end' : 'flex-start',
          paddingHorizontal: 0,
          width: containerWidth,
          height: '100%',
          marginRight: direction === 'right' && endOffset > 0 ? -endOffset : 0,
          marginLeft: direction === 'left' && endOffset > 0 ? -endOffset : 0,
        },
      ]}
    >
      {actions.map((action, index) => {
        const actionBackgroundColor =
          action.backgroundColor ??
          (action.isDestructive
            ? isDarkMode
              ? 'rgba(255, 59, 48, 0.85)'
              : '#FF3B30'
            : isDarkMode
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.8)');

        const iconColor =
          action.color ?? (action.isDestructive ? '#FFFFFF' : isDarkMode ? '#FF453A' : '#FF3B30');

        const actionShadowStyle = action.isDestructive
          ? {
              shadowColor: 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
              elevation: 0,
            }
          : isDarkMode
            ? {
                shadowColor: '#FFF',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 1,
              }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 1,
                elevation: 0,
              };

        return (
          <RectButton
            key={index}
            style={[
              {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                width: buttonWidth,
                height: '100%',
                backgroundColor: 'transparent',
              },
              index === 0 && actions.length > 1 && { marginRight: marginAdjustment },
              index === actions.length - 1 &&
                actions.length > 1 && { marginLeft: marginAdjustment },
            ]}
            onPress={() => handleActionPress(action)}
          >
            <Animated.View
              style={[
                {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: actionBackgroundColor,
                  overflow: 'visible',
                  transform: [
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.9, 0.95, 1],
                      }),
                    },
                  ],
                },
                actionShadowStyle,
              ]}
            >
              <Ionicons name={action.icon as any} size={22} color={iconColor} />
            </Animated.View>
          </RectButton>
        );
      })}
    </Animated.View>
  );
}
