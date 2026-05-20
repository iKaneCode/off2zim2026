import React from 'react';
import {
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  Animated,
} from 'react-native';

import { IconActionButton } from './IconActionButton';
import { ThemedText } from './ThemedText';
import { responsiveFontSize, responsiveLineHeight, Fonts } from '@/constants/Fonts';

export interface ListImageCardProps {
  title: string;
  imageUri: string;
  onPress: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
  heartScale: Animated.Value;
  backgroundColor: string;
  heartBackgroundColor: string;
  topRow?: React.ReactNode;
  bottomLeft?: React.ReactNode;
  bottomRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  imageSize?: number;
  activeOpacity?: number;
  testID?: string;
  heartRender?: React.ReactNode;
}

export function ListImageCard({
  title,
  imageUri,
  onPress,
  onToggleFavorite,
  isFavorited,
  heartScale,
  backgroundColor,
  topRow,
  bottomLeft,
  bottomRight,
  style,
  imageSize = 90,
  activeOpacity = 0.85,
  testID,
}: ListImageCardProps) {
  const hasBottomLeft = Boolean(bottomLeft);
  const bottomRightStyle = hasBottomLeft ? styles.bottomRight : styles.bottomRightAligned;

  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.card, { backgroundColor }, style]}
      onPress={onPress}
      activeOpacity={activeOpacity}
    >
      <View style={[styles.imageWrapper, { width: imageSize, height: imageSize }]}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        <IconActionButton
          variant="like"
          isActive={isFavorited}
          size={30}
          iconSize={16}
          style={styles.heartContainer}
          onPress={onToggleFavorite}
          iconContainerStyle={{ transform: [{ scale: heartScale }] }}
        />
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </ThemedText>
        {topRow}
        {(bottomLeft || bottomRight) && (
          <View style={styles.bottomRow}>
            {hasBottomLeft ? <View style={styles.bottomLeft}>{bottomLeft}</View> : null}
            {bottomRight ? <View style={bottomRightStyle}>{bottomRight}</View> : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(18),
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  bottomLeft: {
    flexShrink: 1,
    marginRight: 12,
  },
  bottomRight: {
    marginLeft: 'auto',
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  bottomRightAligned: {
    marginLeft: 'auto',
    flexShrink: 0,
    alignItems: 'flex-end',
  },
});
