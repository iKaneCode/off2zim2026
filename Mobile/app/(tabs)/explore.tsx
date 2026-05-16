import React, { useCallback, useMemo, useRef, useState } from 'react';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import type { ComponentProps } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  ScrollView,
  View,
  ImageBackground,
  Pressable,
  Animated,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Easing,
  RefreshControl,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader, LocationPill, StatusPill } from '@/components';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import Ionicons from '@expo/vector-icons/Ionicons';

type StorySlide = {
  id: string;
  image: string;
  caption?: string;
  duration?: number;
};

type StoryItem = {
  id: string;
  label: string;
  accent: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  slides: StorySlide[];
};

const AnimatedImage = Animated.createAnimatedComponent(Image);
const STORY_SLIDE_DURATION = 4500;
const SCREEN_HORIZONTAL_PADDING = responsiveSize(16, 14, 20);
const TITLE_BOTTOM_PADDING = responsiveSize(8, 6, 10);

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const categories = useMemo(
    () => ['All', 'Adventure', 'Wildlife', 'Culture', 'Relaxation', 'Urban Escapes', 'Family'],
    []
  );

  const stories = useMemo<StoryItem[]>(
    () => [
      {
        id: 'harare',
        label: 'Harare',
        accent: '#FF3B30',
        slides: [
          {
            id: 'harare-1',
            image:
              'https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=1200&q=80',
            caption: 'Golden hour over Harare CBD.',
          },
          {
            id: 'harare-2',
            image:
              'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80',
            caption: 'Mbare market buzzing with morning energy.',
          },
        ],
      },
      {
        id: 'bulawayo',
        label: 'Bulawayo',
        accent: '#FF3B30',
        slides: [
          {
            id: 'bulawayo-1',
            image:
              'https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=1200&q=80',
            caption: 'Art deco facades in Bulawayo city centre.',
          },
          {
            id: 'bulawayo-2',
            image:
              'https://images.unsplash.com/photo-1455906876003-298dd8c44dc9?auto=format&fit=crop&w=1200&q=80',
            caption: 'Khami Ruins sunset walkabout.',
          },
        ],
      },
      {
        id: 'victoria-falls',
        label: 'Victoria Falls',
        accent: '#FF3B30',
        slides: [
          {
            id: 'vicfalls-1',
            image:
              'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
            caption: 'Spray rising from the Smoke That Thunders.',
          },
          {
            id: 'vicfalls-2',
            image:
              'https://images.unsplash.com/photo-1541937364-695c7b6fd386?auto=format&fit=crop&w=1200&q=80',
            caption: 'Helicopter flips above the Zambezi Gorge.',
          },
        ],
      },
      {
        id: 'mana-pools',
        label: 'Mana Pools',
        accent: '#FF3B30',
        slides: [
          {
            id: 'mana-1',
            image:
              'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
            caption: 'Elephants browsing along the Zambezi.',
          },
          {
            id: 'mana-2',
            image:
              'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1200&q=80',
            caption: 'Canoe safari at dusk.',
          },
        ],
      },
      {
        id: 'kariba',
        label: 'Kariba',
        accent: '#FF3B30',
        slides: [
          {
            id: 'kariba-1',
            image:
              'https://images.unsplash.com/photo-1494475673543-6a6a27143b10?auto=format&fit=crop&w=1200&q=80',
            caption: 'Houseboat mornings on Lake Kariba.',
          },
          {
            id: 'kariba-2',
            image:
              'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=80',
            caption: 'Tiger fishing hotspots near Binga.',
          },
        ],
      },
      {
        id: 'hwange',
        label: 'Hwange',
        accent: '#FF3B30',
        slides: [
          {
            id: 'hwange-1',
            image:
              'https://images.unsplash.com/photo-1470165525439-3cf9e6dccbad?auto=format&fit=crop&w=1200&q=80',
            caption: 'Lion pride tracking near waterholes.',
          },
          {
            id: 'hwange-2',
            image:
              'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80',
            caption: 'Sunset hides and wildlife photography tips.',
          },
        ],
      },
      {
        id: 'great-zimbabwe',
        label: 'Great Zimbabwe',
        accent: '#FF3B30',
        slides: [
          {
            id: 'gz-1',
            image:
              'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
            caption: 'Stone walls telling ancient stories.',
          },
          {
            id: 'gz-2',
            image:
              'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1200&q=80',
            caption: 'Aerial views of the Great Enclosure.',
          },
        ],
      },
      {
        id: 'eastern-highlands',
        label: 'Eastern Highlands',
        accent: '#FF3B30',
        slides: [
          {
            id: 'highlands-1',
            image:
              'https://images.unsplash.com/photo-1529518165346-3f1ee0a6c3d0?auto=format&fit=crop&w=1200&q=80',
            caption: 'Mist rolling through the Bvumba ranges.',
          },
          {
            id: 'highlands-2',
            image:
              'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
            caption: 'Skyline viewpoints across Nyanga.',
          },
        ],
      },
    ],
    []
  );

  const [isStoryVisible, setStoryVisible] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const [storyProgressMap, setStoryProgressMap] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  const currentStory = stories[activeStoryIndex];
  const currentSlide = currentStory?.slides?.[activeSlideIndex];
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);

  const markStoryAsViewed = useCallback((story: StoryItem) => {
    setViewedStoryIds(prev => (prev.includes(story.id) ? prev : [...prev, story.id]));
    setStoryProgressMap(prev => {
      const previousValue = prev[story.id];
      if (previousValue !== undefined && previousValue >= story.slides.length) {
        return prev;
      }
      return { ...prev, [story.id]: story.slides.length };
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 750));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const videoLibrary = useMemo(
    () => [
      {
        id: 'victoria-falls-flight',
        title: 'Victoria Falls from Above',
        location: 'Victoria Falls',
        operator: 'Zambezi Air Safaris',
        duration: '04:32',
        thumbnail:
          'https://images.unsplash.com/photo-1541937364-695c7b6fd386?auto=format&fit=crop&w=1200&q=80',
        categories: ['Adventure', 'Wildlife'],
        views: '5.4K views',
        published: '2 days ago',
      },
      {
        id: 'hwange-elephant-sunset',
        title: 'Elephants at Sunset',
        location: 'Hwange National Park',
        operator: 'Savanna Trails',
        duration: '06:18',
        thumbnail:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
        categories: ['Wildlife'],
        views: '9.2K views',
        published: '1 week ago',
      },
      {
        id: 'matobo-rock-art',
        title: 'Matobo Hills Rock Art Walkthrough',
        location: 'Matobo Hills',
        operator: 'Heritage Guides',
        duration: '08:41',
        thumbnail:
          'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
        categories: ['Culture', 'Adventure'],
        views: '3.8K views',
        published: '5 days ago',
      },
      {
        id: 'nyanga-mountain-escape',
        title: 'Skyline Trail: Nyanga Escape',
        location: 'Nyanga National Park',
        operator: 'Eastern Highlands Collective',
        duration: '05:57',
        thumbnail:
          'https://images.unsplash.com/photo-1529518165346-3f1ee0a6c3d0?auto=format&fit=crop&w=1200&q=80',
        categories: ['Adventure', 'Relaxation'],
        views: '2.6K views',
        published: '3 days ago',
      },
      {
        id: 'harare-city-nightlife',
        title: 'Harare After Dark',
        location: 'Harare CBD',
        operator: 'Urban Pulse Tours',
        duration: '03:48',
        thumbnail:
          'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
        categories: ['Urban Escapes', 'Culture'],
        views: '4.1K views',
        published: '4 days ago',
      },
      {
        id: 'binga-lake-kariba',
        title: 'Sunrise on Lake Kariba',
        location: 'Lake Kariba',
        operator: 'Kariba Voyager',
        duration: '07:15',
        thumbnail:
          'https://images.unsplash.com/photo-1494475673543-6a6a27143b10?auto=format&fit=crop&w=1200&q=80',
        categories: ['Relaxation', 'Family'],
        views: '6.7K views',
        published: '11 days ago',
      },
    ],
    []
  );

  const [activeCategory, setActiveCategory] = useState('All');

  const filteredVideos = useMemo(() => {
    if (activeCategory === 'All') {
      return videoLibrary;
    }
    return videoLibrary.filter(video => video.categories.includes(activeCategory));
  }, [activeCategory, videoLibrary]);

  const heroVideo = filteredVideos[0];
  const supportingVideos = heroVideo ? filteredVideos.slice(1) : filteredVideos;

  const cardBackground = useMemo(
    () => ({
      backgroundColor:
        colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.9)',
    }),
    [colorScheme]
  );

  const heroPillBackground = colorScheme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)';
  const heroPillIconBackground = colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : '#FFFFFF';
  const durationAccent = '#34C759';
  const overlayPillBackground = 'rgba(0,0,0,0.55)';
  const overlayIconBackground = 'rgba(0,0,0,0.32)';

  const handleCategoryPress = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const handleCloseStory = useCallback(() => {
    if (currentStory) {
      setStoryProgressMap(prev => {
        const previousValue = prev[currentStory.id] ?? 0;
        const maxIndex = Math.max(0, currentStory.slides.length - 1);
        const cappedIndex = Math.min(activeSlideIndex, maxIndex);
        const nextValue =
          previousValue >= currentStory.slides.length
            ? previousValue
            : Math.max(previousValue, cappedIndex);
        if (nextValue === previousValue) {
          return prev;
        }
        return { ...prev, [currentStory.id]: nextValue };
      });
    }
    progress.stopAnimation(() => {
      progress.setValue(0);
    });
    setStoryVisible(false);
    setActiveSlideIndex(0);
    slideOpacity.setValue(1);
  }, [activeSlideIndex, currentStory, progress, slideOpacity]);

  const handleAdvance = useCallback(() => {
    const story = stories[activeStoryIndex];
    if (!story) {
      return;
    }

    const isLastSlide = activeSlideIndex >= story.slides.length - 1;
    if (isLastSlide) {
      markStoryAsViewed(story);
      const isLastStory = activeStoryIndex >= stories.length - 1;
      if (isLastStory) {
        handleCloseStory();
      } else {
        setActiveStoryIndex(prev => prev + 1);
        setActiveSlideIndex(0);
      }
    } else {
      const nextIndex = activeSlideIndex + 1;
      setStoryProgressMap(prev => {
        const previousValue = prev[story.id] ?? 0;
        if (previousValue >= story.slides.length || previousValue === nextIndex) {
          return prev;
        }
        return { ...prev, [story.id]: nextIndex };
      });
      setActiveSlideIndex(nextIndex);
    }
  }, [
    activeSlideIndex,
    activeStoryIndex,
    handleCloseStory,
    setStoryProgressMap,
    markStoryAsViewed,
    stories,
  ]);

  const handleReverse = useCallback(() => {
    if (activeSlideIndex > 0) {
      setActiveSlideIndex(prev => Math.max(prev - 1, 0));
      return;
    }

    if (activeStoryIndex > 0) {
      const previousStoryIndex = activeStoryIndex - 1;
      const previousStory = stories[previousStoryIndex];
      if (previousStory) {
        setActiveStoryIndex(previousStoryIndex);
        setActiveSlideIndex(previousStory.slides.length - 1);
      }
    } else {
      handleCloseStory();
    }
  }, [activeSlideIndex, activeStoryIndex, handleCloseStory, stories]);

  const handleStoryPress = useCallback(
    (index: number) => {
      const story = stories[index];
      if (!story) {
        return;
      }

      const storedIndex = storyProgressMap[story.id];
      const resumeIndex =
        storedIndex === undefined ? 0 : Math.min(storedIndex, Math.max(0, story.slides.length - 1));

      progress.stopAnimation(() => {
        progress.setValue(0);
      });
      slideOpacity.setValue(1);
      setActiveStoryIndex(index);
      setActiveSlideIndex(resumeIndex);
      setStoryVisible(true);
    },
    [progress, slideOpacity, stories, storyProgressMap]
  );

  const handleTapForward = useCallback(() => {
    progress.stopAnimation();
    handleAdvance();
  }, [handleAdvance, progress]);

  const handleTapBack = useCallback(() => {
    progress.stopAnimation();
    handleReverse();
  }, [handleReverse, progress]);

  React.useEffect(() => {
    if (!isStoryVisible || !currentStory || !currentSlide) {
      progress.stopAnimation();
      return;
    }

    slideOpacity.setValue(0);
    Animated.timing(slideOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: currentSlide.duration ?? STORY_SLIDE_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        handleAdvance();
      }
    });

    return () => {
      animation.stop();
    };
  }, [isStoryVisible, currentStory, currentSlide, handleAdvance, progress, slideOpacity]);

  return (
    <IOSScreenWrapper>
      <ThemedView
        style={styles.container}
        lightColor={Colors.light.appBackground}
        darkColor={Colors.dark.appBackground}
      >
        <CustomHeader showLogo />

        <View style={styles.titleSection}>
          <ThemedText type="title1" style={styles.pageTitle}>
            Explore
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.appBackground }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            />
          }
        >
          <View style={styles.storiesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesRow}
            >
              {stories.map((story, index) => {
                const iconName = story.icon ?? 'play';
                const hasViewed = viewedStoryIds.includes(story.id);
                const ringColor = hasViewed
                  ? colorScheme === 'dark'
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(31,31,31,0.18)'
                  : story.accent;
                const innerFill = hasViewed
                  ? colorScheme === 'dark'
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(31,31,31,0.15)'
                  : colorScheme === 'dark'
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(31,31,31,0.82)';
                const iconColor = hasViewed ? 'rgba(255,255,255,0.65)' : '#fff';
                const labelColor =
                  colorScheme === 'dark' ? 'rgba(242,242,247,0.9)' : 'rgba(60,60,67,0.85)';

                return (
                  <Pressable
                    key={story.id}
                    style={styles.storyItem}
                    onPress={() => handleStoryPress(index)}
                  >
                    <View
                      style={[
                        styles.storyRing,
                        colorScheme === 'dark' ? styles.storyRingDark : styles.storyRingLight,
                        { borderColor: ringColor },
                      ]}
                    >
                      <View style={[styles.storyInner, { backgroundColor: innerFill }]}>
                        <Ionicons name={iconName} size={24} color={iconColor} />
                      </View>
                    </View>
                    <ThemedText type="bodyBold" style={[styles.storyLabel, { color: labelColor }]}>
                      {story.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map(category => {
              const isActive = activeCategory === category;
              const chipBackground = isActive
                ? theme.tint
                : colorScheme === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.06)';
              const chipLabelColor = isActive
                ? theme.background
                : colorScheme === 'dark'
                  ? 'rgba(242,242,247,0.9)'
                  : '#1F1F1F';
              return (
                <Pressable
                  key={category}
                  style={[styles.categoryChip, { backgroundColor: chipBackground }]}
                  onPress={() => handleCategoryPress(category)}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.categoryLabel, { color: chipLabelColor }]}
                  >
                    {category}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {heroVideo ? (
            <>
              <Pressable style={styles.heroBlock} onPress={() => {}}>
                <ImageBackground
                  source={{ uri: heroVideo.thumbnail }}
                  style={styles.heroImage}
                  imageStyle={styles.heroImageBorder}
                >
                  <View style={styles.overlayDim} />
                  <View style={styles.heroContent}>
                    <View style={styles.heroMetaRow}>
                      <LocationPill
                        label={heroVideo.location}
                        backgroundColor={heroPillBackground}
                        variant="compact"
                      />
                      <StatusPill
                        label={heroVideo.duration}
                        backgroundColor={heroPillBackground}
                        iconBackgroundColor={heroPillIconBackground}
                        iconColor={durationAccent}
                        lightTextColor={durationAccent}
                        darkTextColor={durationAccent}
                      />
                    </View>

                    <View>
                      <ThemedText type="title1" style={styles.heroTitle}>
                        {heroVideo.title}
                      </ThemedText>
                      <ThemedText type="default" style={styles.heroSubtitle}>
                        {heroVideo.operator} â€¢ {heroVideo.views}
                      </ThemedText>

                      <Pressable style={styles.playButton} onPress={() => {}}>
                        <Ionicons name="play" size={18} color={theme.background} />
                        <ThemedText type="defaultSemiBold" style={styles.playLabel}>
                          Watch now
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>

              <View style={styles.sectionHeader}>
                <ThemedText type="title2" style={styles.sectionTitle}>
                  More videos from Zimbabwe
                </ThemedText>
                <ThemedText type="default" style={styles.sectionSubtitle}>
                  Handpicked clips from trusted tour operators and storytellers.
                </ThemedText>
              </View>

              <View style={styles.videoList}>
                {supportingVideos.map(video => (
                  <Pressable
                    key={video.id}
                    style={[styles.videoCard, cardBackground]}
                    onPress={() => {}}
                  >
                    <ImageBackground
                      source={{ uri: video.thumbnail }}
                      style={styles.videoThumbnail}
                      imageStyle={styles.videoImageBorder}
                    >
                      <View style={styles.videoShade} />
                      <View style={styles.videoDurationWrapper}>
                        <LocationPill
                          label={video.location}
                          backgroundColor={heroPillBackground}
                          iconBackgroundColor={heroPillIconBackground}
                          variant="compact"
                          style={styles.overlayLocationPill}
                        />
                        <StatusPill
                          label={video.duration}
                          backgroundColor={overlayPillBackground}
                          iconBackgroundColor={overlayIconBackground}
                          iconColor={durationAccent}
                          lightTextColor="#FFFFFF"
                          darkTextColor="#FFFFFF"
                          style={styles.durationPill}
                        />
                      </View>
                    </ImageBackground>

                    <View style={styles.cardBody}>
                      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                        {video.title}
                      </ThemedText>
                      <ThemedText type="default" style={styles.cardOperator}>
                        {video.operator}
                      </ThemedText>
                      <View style={styles.cardFooterRow}>
                        <ThemedText type="default" style={styles.cardFooterText}>
                          {video.views}
                        </ThemedText>
                        <ThemedText type="default" style={styles.cardFooterText}>
                          {video.published}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={[styles.placeholderCard, cardBackground]}>
              <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
                No videos yet
              </ThemedText>
              <ThemedText type="default" style={styles.placeholderCopy}>
                We are sourcing content for {activeCategory.toLowerCase()} experiences. Try another
                category or check back soon.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </ThemedView>
      {isStoryVisible && currentStory && currentSlide ? (
        <Modal
          visible={isStoryVisible}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={handleCloseStory}
        >
          <View style={styles.storyModal}>
            <StatusBar style="light" />
            <AnimatedImage
              source={{ uri: currentSlide.image }}
              style={[styles.storyImage, { opacity: slideOpacity }]}
              resizeMode="cover"
            />
            <View style={styles.storyOverlay} />
            <View style={[styles.storyHeader, { paddingTop: insets.top + 8 }]}>
              <View style={styles.storyProgressRow}>
                {currentStory.slides.map((slide, index) => {
                  const width =
                    index < activeSlideIndex
                      ? '100%'
                      : index === activeSlideIndex
                        ? progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                            extrapolate: 'clamp',
                          })
                        : '0%';

                  return (
                    <View key={slide.id} style={styles.storyProgressSegment}>
                      <Animated.View
                        style={[
                          styles.storyProgressFill,
                          { backgroundColor: currentStory.accent, width },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>

              <View style={styles.storyTitleRow}>
                <View style={styles.storyTitleGroup}>
                  <ThemedText type="bodyBold" style={styles.storyTitle}>
                    {currentStory.label}
                  </ThemedText>
                  <ThemedText type="default" style={styles.storyCounter}>
                    {activeSlideIndex + 1}/{currentStory.slides.length}
                  </ThemedText>
                </View>

                <Pressable onPress={handleCloseStory} style={styles.storyCloseButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
            </View>

            {currentSlide.caption ? (
              <View style={styles.storyCaptionContainer}>
                <ThemedText type="default" style={styles.storyCaption}>
                  {currentSlide.caption}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.storyTouchLayer}>
              <TouchableWithoutFeedback onPress={handleTapBack}>
                <View style={styles.storyTouchZone} />
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={handleTapForward}>
                <View style={styles.storyTouchZone} />
              </TouchableWithoutFeedback>
            </View>
          </View>
        </Modal>
      ) : null}
    </IOSScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 0,
    paddingBottom: TITLE_BOTTOM_PADDING,
  },
  pageTitle: {
    fontSize: responsiveFontSize(24),
    lineHeight: responsiveLineHeight(24),
    fontFamily: Fonts.bold,
    textAlign: 'left',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  storiesSection: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  storiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 76,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  storyRingLight: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  storyRingDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  storyInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLabel: {
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveLineHeight(12),
    textAlign: 'center',
  },
  categoryRow: {
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryLabel: {
    color: '#1F1F1F',
  },
  heroBlock: {
    marginBottom: 24,
  },
  heroImage: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroImageBorder: {
    borderRadius: 20,
  },
  overlayDim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    gap: 16,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  metaText: {
    color: '#fff',
  },
  heroTitle: {
    color: '#fff',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  playLabel: {
    color: '#1F1F1F',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: 'rgba(60,60,67,0.7)',
  },
  videoList: {
    gap: 16,
  },
  videoCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  videoThumbnail: {
    height: 180,
  },
  videoImageBorder: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  videoShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoDurationWrapper: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationPill: {
    marginLeft: 'auto',
  },
  overlayLocationPill: {
    maxWidth: '70%',
  },
  cardBody: {
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(18),
  },
  cardOperator: {
    color: 'rgba(60,60,67,0.75)',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardFooterText: {
    color: 'rgba(60,60,67,0.65)',
  },
  placeholderCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  placeholderCopy: {
    marginTop: 8,
    lineHeight: responsiveLineHeight(15),
  },
  emptyTitle: {
    fontSize: responsiveFontSize(18),
    marginBottom: 4,
  },
  storyModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  storyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  storyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  storyProgressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  storyProgressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  storyProgressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  storyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storyTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storyTitle: {
    color: '#fff',
    fontSize: responsiveFontSize(16),
  },
  storyCounter: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: responsiveFontSize(14),
  },
  storyCloseButton: {
    padding: 8,
  },
  storyCaptionContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
    zIndex: 2,
  },
  storyCaption: {
    color: '#fff',
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveLineHeight(16),
  },
  storyTouchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  storyTouchZone: {
    flex: 1,
  },
});