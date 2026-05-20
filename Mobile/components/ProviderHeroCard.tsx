import React, { memo } from 'react';
import { View, StyleSheet, Image, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ActionPillButton } from './ActionPillButton';
import { IconActionButton } from './IconActionButton';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import { StatusPill, type StatusPillProps } from './StatusPill';
import { LocationPill } from './LocationPill';

const AVATAR_SIZE = responsiveSize(96, 86, 108);

export interface ProviderHeroCardProps {
  title: string;
  location?: string;
  rating?: number | string;
  reviewsText?: string;
  onFavoritePress?: () => void;
  onSharePress?: () => void;
  isFavorited?: boolean;
  onDirectionsPress?: () => void;
  directionsLabel?: string;
  onCallPress?: () => void;
  callLabel?: string;
  callDisabled?: boolean;
  onMessagePress?: () => void;
  messageLabel?: string;
  messageDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
  avatarInitial?: string;
  logoUrl?: string;
  locationIconName?: keyof typeof Ionicons.glyphMap;
  ratingIconName?: keyof typeof Ionicons.glyphMap;
  callIconName?: keyof typeof Ionicons.glyphMap;
  messageIconName?: keyof typeof Ionicons.glyphMap;
  locationIconColor?: string;
  ratingIconColor?: string;
  callIconColor?: string;
  messageIconColor?: string;
  statusPillProps?: StatusPillProps;
  ratingAlign?: 'left' | 'right';
}

function ProviderHeroCardComponent({
  title,
  location,
  rating,
  reviewsText,
  onFavoritePress,
  onSharePress,
  isFavorited,
  onDirectionsPress,
  directionsLabel = 'Directions',
  onCallPress,
  callLabel = 'Call',
  callDisabled = false,
  onMessagePress,
  messageLabel = 'Message',
  messageDisabled = false,
  style,
  avatarInitial,
  logoUrl,
  locationIconName = 'location',
  ratingIconName = 'star',
  callIconName = 'call',
  messageIconName = 'chatbubble-ellipses',
  locationIconColor = '#FF3B30',
  ratingIconColor = '#DAA520',
  callIconColor = '#34C759',
  messageIconColor = '#007AFF',
  statusPillProps,
  ratingAlign,
}: ProviderHeroCardProps) {
  const isDark = useColorScheme() === 'dark';

  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBorderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const subtleBackground = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const accentSurface = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';

  const initial = (avatarInitial ?? title.charAt(0) ?? '').toUpperCase();
  const fallbackLogoUrl = `https://api.dicebear.com/8.x/shapes/png?seed=${encodeURIComponent(title)}&size=128&backgroundColor=FF4757`;
  const effectiveLogoUrl = logoUrl || fallbackLogoUrl;
  const ratingDisplay =
    rating === undefined
      ? ''
      : typeof rating === 'number'
        ? (Math.round(rating * 10) / 10).toString()
        : rating;
  const hasTopActions = Boolean(onFavoritePress || onSharePress);
  const hasFooter = Boolean(onCallPress || onMessagePress || onDirectionsPress);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor: cardBorderColor,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(28,28,30,0.12)',
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {hasTopActions ? (
            <View style={styles.actionCluster}>
              {onFavoritePress ? (
                <IconActionButton variant="like" isActive={isFavorited} onPress={onFavoritePress} />
              ) : null}

              {onSharePress ? <IconActionButton variant="share" onPress={onSharePress} /> : null}
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.profileCircle,
            {
              backgroundColor: cardBackground,
              borderColor: cardBackground,
              borderWidth: 3,
            },
          ]}
        >
          <Image source={{ uri: effectiveLogoUrl }} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.headerRight}>
          {rating !== undefined ? (
            <View style={[styles.ratingPill, { backgroundColor: subtleBackground }]}>
              <View style={[styles.iconBubble, { backgroundColor: accentSurface }]}>
                <Ionicons name={ratingIconName} size={12} color={ratingIconColor} />
              </View>
              <ThemedText style={[styles.ratingText, { color: textColor }]}>
                {ratingDisplay}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.identitySection}>
        <ThemedText
          style={[styles.titleText, { color: textColor }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {title}
        </ThemedText>

        {location || statusPillProps ? (
          <View style={styles.locationStatusRow}>
            {location ? (
              <LocationPill
                label={location}
                iconName={locationIconName}
                iconColor={locationIconColor}
                variant="compact"
              />
            ) : null}

            {statusPillProps
              ? (() => {
                  const { style: statusStyle, ...restStatusProps } = statusPillProps;
                  return (
                    <StatusPill {...restStatusProps} style={[styles.statusInline, statusStyle]} />
                  );
                })()
              : null}
          </View>
        ) : null}
      </View>

      {hasFooter ? (
        <View style={styles.footer}>
          {onCallPress ? (
            <ActionPillButton
              label={callLabel}
              iconName={callIconName}
              onPress={onCallPress}
              disabled={callDisabled}
              isDark={isDark}
              tone="call"
              iconColor={callIconColor}
            />
          ) : null}

          <ActionPillButton
            label={directionsLabel}
            iconName="navigate"
            onPress={onDirectionsPress}
            disabled={!onDirectionsPress}
            isDark={isDark}
            tone="directions"
            iconColor="#0A84FF"
          />

          {onMessagePress ? (
            <ActionPillButton
              label={messageLabel}
              iconName={messageIconName}
              onPress={onMessagePress}
              disabled={messageDisabled}
              isDark={isDark}
              tone="message"
              iconColor={messageIconColor}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const ProviderHeroCard = memo(ProviderHeroCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 14,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -(AVATAR_SIZE / 2),
    marginHorizontal: -24,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 16,
    paddingTop: 36,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingRight: 16,
    paddingTop: 36,
  },
  actionCluster: {
    flexDirection: 'row',
    gap: 10,
  },
  profileCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileInitial: {
    fontSize: responsiveFontSize(38),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  identitySection: {
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: responsiveFontSize(22),
    lineHeight: responsiveLineHeight(22),
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 0,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveSize(10, 8, 12),
    paddingVertical: responsiveSize(6, 5, 8),
    borderRadius: 999,
  },
  ratingText: {
    fontSize: responsiveFontSize(15),
    lineHeight: 20,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  statusInline: {
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: responsiveSize(12, 10, 16),
    marginHorizontal: -10,
  },
});
