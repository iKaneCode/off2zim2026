import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform, Dimensions, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/ThemedText';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SwipeActions, SwipeAction } from './SwipeActions';
import * as Haptics from 'expo-haptics';
import { Fonts, responsiveFontSize, responsiveLineHeight } from '@/constants/Fonts';

const { width: screenWidth } = Dimensions.get('window');
const BASE_SCREEN_WIDTH = 390;
const layoutScale = screenWidth / BASE_SCREEN_WIDTH;
const responsiveSize = (size: number, min = size * 0.86, max = size * 1.18) =>
  Math.round(Math.min(max, Math.max(min, size * layoutScale)));

const MESSAGE_VERTICAL_PADDING = responsiveSize(12, 10, 15);
const MESSAGE_HORIZONTAL_PADDING = responsiveSize(16, 14, 20);
const MESSAGE_BOTTOM_GAP = responsiveSize(2, 1, 4);
const AVATAR_SIZE = responsiveSize(54, 48, 62);
const AVATAR_MARGIN = responsiveSize(12, 10, 16);
const ROW_GAP = responsiveSize(4, 3, 6);
const PREVIEW_RIGHT_GAP = responsiveSize(8, 6, 10);
const BADGE_SIZE = responsiveSize(22, 20, 26);
const BADGE_HORIZONTAL_PADDING = responsiveSize(5, 4, 7);
const STATUS_ICON_SIZE = responsiveSize(16, 14, 18);
const SWIPE_ACTION_WIDTH = responsiveSize(120, 104, 142);
const SWIPE_OPEN_THRESHOLD = responsiveSize(40, 34, 48);

export interface MessageData {
  id: string;
  name: string;
  message: string;
  time: string;
  timestamp?: number; // epoch ms — used for sorting most-recent-first
  isRead: boolean;
  unreadCount?: number;
  avatar: string;
  avatarImage?: string;
  status: 'sent' | 'delivered' | 'read' | 'received';
}

interface MessageItemProps {
  item: MessageData;
  onPress: () => void;
  onLongPress?: () => void;
  swipeActions?: SwipeAction[];
  swipeableRef?: (ref: Swipeable | null) => void;
  onSwipeStart?: () => void;
  onSwipeOpen?: () => void;
  getAvatarColor?: (avatar: string) => string;
  style?: any;
  hideTimeAndBadge?: boolean; // Hide time and unread badge (for itinerary items)
}

export function MessageItem({
  item,
  onPress,
  onLongPress,
  swipeActions = [],
  swipeableRef,
  onSwipeStart,
  onSwipeOpen,
  getAvatarColor,
  style,
}: MessageItemProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const defaultAvatarColor = (avatar: string) => {
    const colors = {
      VH: '#003366',
      TB: '#8B4513',
      SA: '#228B22',
      EH: '#CD853F',
      ZH: '#4682B4',
      default: '#25D366',
    };
    return colors[avatar as keyof typeof colors] || colors.default;
  };

  const avatarColorFunction = getAvatarColor || defaultAvatarColor;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Ionicons name="checkmark" size={STATUS_ICON_SIZE} color="#8E8E93" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={STATUS_ICON_SIZE} color="#8E8E93" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={STATUS_ICON_SIZE} color="#34B7F1" />;
      case 'received':
        return <Ionicons name="arrow-down" size={STATUS_ICON_SIZE} color="#FF9500" />;
      default:
        return null;
    }
  };

  const handleSwipeStart = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSwipeStart?.();
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<string | number>) => {
    if (swipeActions.length === 0) return null;
    return (
      <SwipeActions
        actions={swipeActions}
        progress={progress}
        containerWidth={SWIPE_ACTION_WIDTH}
      />
    );
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Swipeable
        ref={swipeableRef}
        friction={1.2}
        rightThreshold={SWIPE_OPEN_THRESHOLD}
        overshootRight={false}
        onSwipeableWillOpen={handleSwipeStart}
        onSwipeableOpen={onSwipeOpen}
        renderRightActions={renderRightActions}
        useNativeAnimations={true}
      >
        <TouchableOpacity
          style={[styles.messageItem, style]}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={500}
        >
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: item.avatarImage ? 'transparent' : avatarColorFunction(item.avatar) },
            ]}
          >
            {item.avatarImage ? (
              <Image
                source={{ uri: item.avatarImage }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <ThemedText type="bodyBold" style={styles.avatarText}>
                {item.avatar}
              </ThemedText>
            )}
          </View>

          <View style={styles.messageContentContainer}>
            <View style={styles.messageTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText type="title2" style={styles.messageName}>
                  {item.name}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={styles.messageTime}>
                {item.time}
              </ThemedText>
            </View>

            <View style={styles.messageBottomRow}>
              <View style={styles.messagePreviewContainer}>
                {item.status !== 'received' && (
                  <View style={styles.statusIconContainer}>{getStatusIcon(item.status)}</View>
                )}
                <ThemedText
                  type="body"
                  style={[
                    styles.messagePreview,
                    item.isRead ? styles.readPreview : styles.unreadPreview,
                  ]}
                  numberOfLines={1}
                >
                  {item.message}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!item.isRead && (
                  <View style={styles.unreadIndicator}>
                    <ThemedText type="label" style={styles.unreadCountText}>
                      {item.unreadCount || 1}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageItem: {
    flexDirection: 'row',
    paddingVertical: MESSAGE_VERTICAL_PADDING,
    paddingHorizontal: MESSAGE_HORIZONTAL_PADDING,
    alignItems: 'center',
    marginBottom: MESSAGE_BOTTOM_GAP,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AVATAR_MARGIN,
    overflow: 'hidden',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveLineHeight(16),
  },
  messageContentContainer: {
    flex: 1,
    marginRight: 0,
  },
  messageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ROW_GAP,
  },
  messageBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: PREVIEW_RIGHT_GAP,
    alignItems: 'center',
  },
  statusIconContainer: {
    marginRight: ROW_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageName: {
    flexShrink: 1,
    fontSize: responsiveFontSize(20),
    lineHeight: responsiveLineHeight(20),
  },
  messagePreview: {
    flex: 1,
    fontSize: responsiveFontSize(17),
    lineHeight: responsiveLineHeight(17),
  },
  readPreview: {
    fontFamily: Fonts.regular,
    opacity: 0.65,
  },
  unreadPreview: {
    fontFamily: Fonts.medium,
    opacity: 0.9,
  },
  messageTime: {
    color: '#8E8E93',
    marginLeft: ROW_GAP,
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveLineHeight(12),
  },
  unreadIndicator: {
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BADGE_HORIZONTAL_PADDING,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveLineHeight(12),
  },
});
