import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useCollapsibleSearchSection } from '@/components/CollapsibleSearchSection';
import { responsiveFontSize, responsiveLineHeight, Fonts } from '@/constants/Fonts';
import { thingsToDoData } from '@/constants/FeaturedData';
import { getActivityStatus, activityStatusColor, ActivityStatus } from '@/utils/timeStatus';
import { LocationPill } from '@/components/LocationPill';
import { RatingPill } from '@/components/RatingPill';
import { ListImageCard } from '@/components/ListImageCard';
import { isFavorited as isFavoritedUtil, toggleFavorite as toggleFavoriteUtil, subscribeFavorites, getFavoritedIds } from '@/utils/favoritesUtils';
import { StatusPill } from '@/components/StatusPill';

interface ActivityItem {
  id: string;
  name: string;
  location: string;
  rating: number;
  imageRandom: number;
  priceFrom?: number;
  operatingHours?: string;
  durationHours?: number;
}

export default function ThingsToDoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [heartScales] = useState<Record<string, Animated.Value>>({});
  const [nowTick, setNowTick] = useState(Date.now());

  // Update time every minute for status
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  // Load activities
  const loadActivities = useCallback(async () => {
    // Simulate loading from API
    await new Promise(resolve => setTimeout(resolve, 800));
    setActivities(thingsToDoData);
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadActivities();
    setIsRefreshing(false);
  };

  // Filter activities based on search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(
      activity =>
        activity.name.toLowerCase().includes(query) ||
        activity.location.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  // Collapsible search section
  const { searchSection, handleScroll, handleMomentumScrollEnd } = useCollapsibleSearchSection({
    searchQuery,
    setSearchQuery,
    filterOptions: [
      { key: 'All', label: 'All' },
      { key: 'Harare', label: 'Harare' },
      { key: 'Victoria Falls', label: 'Victoria Falls' },
      { key: 'Mutare', label: 'Mutare' },
      { key: 'Kariba', label: 'Kariba' },
    ],
    activeFilter,
    onFilterChange: setActiveFilter,
    searchBarOverrides: {
      placeholder: 'Search',
    },
    disableAutoReveal: true,
  });

  // Get or create heart scale animation
  const getHeartScale = useCallback(
    (name: string): Animated.Value => {
      if (!heartScales[name]) {
        heartScales[name] = new Animated.Value(1);
      }
      return heartScales[name];
    },
    [heartScales]
  );

  // Toggle favorite with animation
  const toggleFavorite = useCallback(
    (name: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFavorites(prev => {
        const newFavorites = { ...prev, [name]: !prev[name] };
        const scale = getHeartScale(name);
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        return newFavorites;
      });
    },
    [getHeartScale]
  );

  const renderActivityCard = useCallback(
    ({ item }: { item: ActivityItem }) => {
      const isFavorited = !!favorites[item.id] || isFavoritedUtil(item.id);
      const heartScale = getHeartScale(item.name);
      const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
      const heartContainerBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
      const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
      const pillTextColor = isDark ? '#FFFFFF' : '#000000';
      const pillIconBackground = isDark ? '#1C1C1E' : '#FFFFFF';
      const status: ActivityStatus = getActivityStatus(new Date(nowTick), {
        operatingHours: item.operatingHours,
        durationHours: item.durationHours,
      });
      const statusColor = activityStatusColor(status);
      const roundToFive = (value: number) => Math.max(5, Math.round(value / 5) * 5);
      const basePackagePrice =
        typeof item.priceFrom === 'number' && Number.isFinite(item.priceFrom) && item.priceFrom > 0
          ? roundToFive(item.priceFrom)
          : 25;

      const handleActivityPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: '/activity-profile',
          params: {
            activityId: item.id,
            activityName: item.name,
            activityLocation: item.location,
            priceFrom: String(basePackagePrice),
          },
        });
      };

      return (
        <ListImageCard
          title={item.name}
          imageUri={`https://picsum.photos/300/200?random=${item.imageRandom}`}
          onPress={handleActivityPress}
          onToggleFavorite={() => toggleFavoriteUtil(item.id, 'activity')}
          isFavorited={isFavorited}
          heartScale={heartScale}
          backgroundColor={cardBg}
          heartBackgroundColor={heartContainerBg}
          topRow={
            <View style={styles.metaRow}>
              <LocationPill
                label={item.location}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                lightTextColor={pillTextColor}
                darkTextColor={pillTextColor}
                variant="compact"
              />

              <RatingPill
                value={item.rating}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                lightTextColor={pillTextColor}
                darkTextColor={pillTextColor}
                style={styles.ratingPillRight}
              />
            </View>
          }
          bottomLeft={
            <View style={styles.infoRow}>
              <StatusPill
                label={status}
                backgroundColor={pillBg}
                iconBackgroundColor={pillIconBackground}
                iconColor={statusColor}
                lightTextColor={statusColor}
                darkTextColor={statusColor}
              />
            </View>
          }
          bottomRight={
            item.priceFrom !== undefined ? (
              <View style={styles.priceStack}>
                <ThemedText style={styles.priceLabel} lightColor="#8E8E93" darkColor="#8E8E93">
                  from
                </ThemedText>
                <View style={styles.priceRow}>
                  <Ionicons
                    name="pricetag-outline"
                    size={14}
                    color="#34C759"
                    style={styles.priceIcon}
                  />
                  <ThemedText
                    style={styles.priceCurrency}
                    lightColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                    darkColor="#FFFFFF"
                  >
                    $
                  </ThemedText>
                  <ThemedText
                    style={styles.priceValue}
                    lightColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                    darkColor="#FFFFFF"
                  >
                    {basePackagePrice}
                  </ThemedText>
                  <ThemedText style={styles.priceUnit} lightColor="#8E8E93" darkColor="#8E8E93">
                    /person
                  </ThemedText>
                </View>
              </View>
            ) : null
          }
        />
      );
    },
    [favorites, getHeartScale, toggleFavorite, isDark, nowTick]
  );

  return (
    <IOSScreenWrapper>
      <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
        {searchSection}

        {filteredActivities.length > 0 ? (
          <FlatList
            data={filteredActivities}
            renderItem={renderActivityCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons
              name="search-outline"
              size={64}
              color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
            />
            <ThemedText style={styles.emptyStateText}>
              No activities matching your search
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Increased padding for better visibility of last card
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingPillRight: {
    marginLeft: 'auto',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: responsiveFontSize(16),
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.7,
    fontFamily: Fonts.regular,
  },
  priceStack: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: responsiveFontSize(11),
    lineHeight: responsiveLineHeight(11),
    letterSpacing: 0.2,
    fontFamily: Fonts.medium,
    textTransform: 'lowercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceIcon: {
    marginRight: 4,
  },
  priceValue: {
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveLineHeight(16),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  priceCurrency: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(16),
    fontFamily: Fonts.medium,
  },
  priceUnit: {
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveLineHeight(16),
    fontFamily: Fonts.medium,
    marginLeft: 2,
  },
});
