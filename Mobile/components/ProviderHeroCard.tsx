import React, { memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as solidHeart, faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';

import { ThemedText } from './ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import { StatusPill, type StatusPillProps } from './StatusPill';
import { ProfileLocationPill } from './ProfileLocationPill';

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
  const controlBackground = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)';
  const subtleBackground = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const accentSurface = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const directionsBackground = isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.08)';
  const callBackground = isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.1)';
  const messageBackground = isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)';

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
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: controlBackground }]}
                  onPress={onFavoritePress}
                  activeOpacity={0.85}
                >
                  <FontAwesomeIcon
                    icon={isFavorited ? solidHeart : regularHeart}
                    size={18}
                    color="#FF4757"
                  />
                </TouchableOpacity>
              ) : null}

              {onSharePress ? (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: controlBackground }]}
                  onPress={onSharePress}
                  activeOpacity={0.85}
                >
                  <FontAwesomeIcon icon={faShareFromSquare} size={18} color="#FF4757" />
                </TouchableOpacity>
              ) : null}
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
              <ProfileLocationPill
                label={location}
                backgroundColor={subtleBackground}
                iconBackgroundColor={accentSurface}
                iconName={locationIconName}
                iconColor={locationIconColor}
                textColor={textColor}
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
            <TouchableOpacity
              style={[
                styles.contactPill,
                { backgroundColor: callBackground, opacity: callDisabled ? 0.5 : 1 },
              ]}
              onPress={onCallPress}
              disabled={callDisabled}
              activeOpacity={0.85}
            >
              <View style={[styles.footerIconBubble, { backgroundColor: accentSurface }]}>
                <Ionicons name={callIconName} size={12} color={callIconColor} />
              </View>
              <ThemedText style={[styles.contactText, { color: textColor }]}>
                {callLabel}
              </ThemedText>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.contactPill,
              { backgroundColor: directionsBackground, opacity: onDirectionsPress ? 1 : 0.4 },
            ]}
            onPress={onDirectionsPress}
            disabled={!onDirectionsPress}
            activeOpacity={0.85}
          >
            <View style={[styles.footerIconBubble, { backgroundColor: accentSurface }]}>
              <Ionicons name="navigate" size={12} color="#0A84FF" />
            </View>
            <ThemedText
              style={[styles.directionsText, { color: isDark ? '#FFFFFF' : '#0A84FF' }]}
              numberOfLines={1}
            >
              {directionsLabel}
            </ThemedText>
          </TouchableOpacity>

          {onMessagePress ? (
            <TouchableOpacity
              style={[
                styles.contactPill,
                { backgroundColor: messageBackground, opacity: messageDisabled ? 0.5 : 1 },
              ]}
              onPress={onMessagePress}
              disabled={messageDisabled}
              activeOpacity={0.85}
            >
              <View style={[styles.footerIconBubble, { backgroundColor: accentSurface }]}>
                <Ionicons name={messageIconName} size={12} color={messageIconColor} />
              </View>
              <ThemedText style={[styles.contactText, { color: textColor }]}>
                {messageLabel}
              </ThemedText>
            </TouchableOpacity>
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
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  footerIconBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    elevation: 0,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  directionsText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
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
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveSize(12, 10, 14),
    paddingVertical: responsiveSize(7, 5, 9),
    borderRadius: 999,
    flex: 1,
  },
  contactText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
});
