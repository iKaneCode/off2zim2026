import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  ActivityIndicator,
  Share,
  Animated,
  GestureResponderEvent,
  RefreshControl,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader } from '@/components/CustomHeader';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { responsiveFontSize, Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart, faShareFromSquare } from '@fortawesome/free-regular-svg-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import { isFavorited as isFavoritedUtil } from '@/utils/favoritesUtils';
import {
  PushScreenOptions,
  TitleWithLocation,
  WallpaperPattern,
  WebSlideTransition,
} from '@/components';

// Dimensions for layout calculations
const { width, height } = Dimensions.get('window');
const SPACING = 2;
const CONTAINER_PADDING = 16; // Consistent padding for the container
const THUMBNAIL_WIDTH = (width - CONTAINER_PADDING * 2 - SPACING * 6) / 3; // 3 images per row with even spacing
const THUMBNAIL_HEIGHT = (THUMBNAIL_WIDTH * 3) / 4; // 4:3 aspect ratio
const FILMSTRIP_HOLES = Array.from({ length: 6 }, (_, index) => index);
const FILMSTRIP_FRAME_WIDTH = 78;
const MIN_FILMSTRIP_FRAMES = 4;
const MIN_VISIBLE_FILMSTRIP_FRAMES = Math.max(
  MIN_FILMSTRIP_FRAMES,
  Math.ceil((width - 28) / FILMSTRIP_FRAME_WIDTH)
);
const POLAROID_IMAGE = require('@/assets/images/polaroid.png');
const POLAROID_ASSET_SIZE = Math.min(width * 1.15, 640);
const POLAROID_ASSET_SCALE = POLAROID_ASSET_SIZE / 1024;
const POLAROID_PHOTO_LEFT = 266 * POLAROID_ASSET_SCALE;
const POLAROID_PHOTO_TOP = 206 * POLAROID_ASSET_SCALE;
const POLAROID_PHOTO_WIDTH = 538 * POLAROID_ASSET_SCALE;
const POLAROID_PHOTO_HEIGHT = 480 * POLAROID_ASSET_SCALE;
// Slot is slightly larger than the opening bounding box so that when rotated by -4.7deg it still covers all 4 corners of the opening
const POLAROID_SLOT_WIDTH = 600 * POLAROID_ASSET_SCALE;
const POLAROID_SLOT_HEIGHT = 540 * POLAROID_ASSET_SCALE;
const POLAROID_SLOT_LEFT = 235 * POLAROID_ASSET_SCALE;  // opening center (535) minus half slot width (300)
const POLAROID_SLOT_TOP = 176 * POLAROID_ASSET_SCALE;   // opening center (446) minus half slot height (270)

const clampOffset = (value: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, -max), max);
};

const getParamString = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
};

export default function GalleryScreen() {
  const params = useLocalSearchParams();
  const { location } = params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const resolvedLocation =
    typeof location === 'string' && location.trim().length > 0 ? location : 'All locations';
  const routeTitle = getParamString(params.title)?.trim();
  const routeContextImage = (
    getParamString(params.contextImage) ||
    getParamString(params.profileImage) ||
    getParamString(params.heroImage)
  )?.trim();
  const galleryType = getParamString(params.galleryType);
  const isLocationGallery = galleryType === 'location';
  const viewerContextTitle =
    routeTitle && !/^(photo|stay|activity|event|flight|bus)?\s*gallery$/i.test(routeTitle)
      ? routeTitle
      : resolvedLocation;

  // State for gallery
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const filmstripFillerCells = Array.from(
    { length: Math.max(0, MIN_VISIBLE_FILMSTRIP_FRAMES - images.length) },
    (_, index) => index
  );

  // State for favorites
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [heartScale] = useState(new Animated.Value(1));
  const heartScales = useRef<Record<string, Animated.Value>>({}).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const imageAnim = useRef(new Animated.Value(1)).current;
  const filmstripRef = useRef<FlatList<string> | null>(null);
  const viewerTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastSwipeActionAtRef = useRef(0);
  const zoomScale = useSharedValue(1);
  const savedZoomScale = useSharedValue(1);
  const zoomTranslateX = useSharedValue(0);
  const zoomTranslateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Get heart scale for specific image
  const getHeartScale = useCallback(
    (imageUrl: string) => {
      if (!heartScales[imageUrl]) heartScales[imageUrl] = new Animated.Value(1);
      return heartScales[imageUrl];
    },
    [heartScales]
  );

  // Preload polaroid PNG so it is decoded before the first photo opens
  useEffect(() => {
    Asset.fromModule(POLAROID_IMAGE).downloadAsync().catch(() => {});
  }, []);

  // Get images from navigation params or generate samples if not provided
  useEffect(() => {
    const loadImages = () => {
      try {
        // Try to parse images from params
        if (params.images) {
          const parsedImages = JSON.parse(params.images as string);
          if (Array.isArray(parsedImages) && parsedImages.length > 0) {
            setImages(parsedImages);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing gallery images:', error);
      }

      // Fallback to sample images if params doesn't have images or parsing fails
      const locationSeed = (params.location as string) || 'location';
      const count = 20;
      const generatedImages = Array.from({ length: count }, (_, i) => {
        return `https://picsum.photos/800/800?random=${locationSeed}-${i + 100}`;
      });
      setImages(generatedImages);
      setLoading(false);
    };

    loadImages();
  }, [params.images, params.location]);

  const handleGoBack = () => {
    const destinationId = params.destinationId as string | undefined;
    const eventId = params.eventId as string | undefined;

    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }

    if (destinationId) {
      router.replace({
        pathname: '/screens/DestinationDetail',
        params: { destinationId },
      });
    } else if (eventId) {
      router.replace({
        pathname: '/event-profile',
        params: { eventName: eventId },
      });
    } else {
      router.replace('/');
    }
  };

  const focusFilmstripItem = useCallback((index: number, animated = true) => {
    requestAnimationFrame(() => {
      try {
        filmstripRef.current?.scrollToIndex({
          index,
          animated,
          viewPosition: 0.5,
        });
      } catch {
        // The filmstrip is decorative; ignore scroll misses while it measures.
      }
    });
  }, []);

  const resetZoom = useCallback(() => {
    zoomScale.value = withTiming(1, { duration: 160 });
    savedZoomScale.value = 1;
    zoomTranslateX.value = withTiming(0, { duration: 160 });
    zoomTranslateY.value = withTiming(0, { duration: 160 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [savedTranslateX, savedTranslateY, savedZoomScale, zoomScale, zoomTranslateX, zoomTranslateY]);

  const openImage = (imageUrl: string) => {
    const index = Math.max(0, images.indexOf(imageUrl));
    setCurrentImageIndex(index);
    setSelectedImage(imageUrl);
    resetZoom();
    modalAnim.setValue(0);
    imageAnim.setValue(0);
    setModalVisible(true);
    focusFilmstripItem(index, false);
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(imageAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 72,
        friction: 9,
      }),
    ]).start();
  };

  const closeImage = useCallback(() => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setSelectedImage(null);
      setModalVisible(false);
    });
  }, [modalAnim]);

  const showImageAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= images.length || index === currentImageIndex) {
        return;
      }

      Haptics.selectionAsync().catch(() => {});
      imageAnim.setValue(0);
      resetZoom();
      setCurrentImageIndex(index);
      setSelectedImage(images[index]);
      focusFilmstripItem(index);
      Animated.spring(imageAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 82,
        friction: 10,
      }).start();
    },
    [currentImageIndex, focusFilmstripItem, imageAnim, images, resetZoom]
  );

  const handleSwipeDismiss = useCallback(() => {
    const now = Date.now();
    if (now - lastSwipeActionAtRef.current < 220) {
      return;
    }

    lastSwipeActionAtRef.current = now;
    closeImage();
  }, [closeImage]);

  const handleSwipeNavigate = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= images.length) {
        return;
      }

      const now = Date.now();
      if (now - lastSwipeActionAtRef.current < 220) {
        return;
      }

      lastSwipeActionAtRef.current = now;
      showImageAt(targetIndex);
    },
    [images.length, showImageAt]
  );

  const handleViewerTouchStart = useCallback((event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length !== 1) {
      viewerTouchStartRef.current = null;
      return;
    }

    viewerTouchStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
  }, []);

  const handleViewerTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      const start = viewerTouchStartRef.current;
      viewerTouchStartRef.current = null;

      if (!start || event.nativeEvent.touches.length > 0 || zoomScale.value > 1.01) {
        return;
      }

      const deltaX = event.nativeEvent.pageX - start.x;
      const deltaY = event.nativeEvent.pageY - start.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (deltaY > 90 && absY > absX) {
        handleSwipeDismiss();
        return;
      }

      if (absX > 64 && absX > absY) {
        handleSwipeNavigate(deltaX < 0 ? currentImageIndex + 1 : currentImageIndex - 1);
      }
    },
    [currentImageIndex, handleSwipeDismiss, handleSwipeNavigate, zoomScale]
  );

  // Handle toggling favorite status for current image
  const handleToggleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Animate the heart
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();

    // Toggle favorite status
    setFavorites(prev => {
      const currentImageId = selectedImage || '';
      return {
        ...prev,
        [currentImageId]: !prev[currentImageId],
      };
    });
  }, [selectedImage, heartScale]);

  // Handle sharing the current image
  const handleShare = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      await Share.share({
        message: `Check out this amazing photo from ${viewerContextTitle}!`,
        title: `Photo from ${viewerContextTitle}`,
        url: selectedImage || '',
      });
    } catch {
      // ignore errors
    }
  }, [selectedImage, viewerContextTitle]);

  // Toggle favorite for thumbnail images
  const toggleImageFavorite = useCallback(
    (imageUrl: string, event?: GestureResponderEvent) => {
      // Prevent the parent onPress from triggering if we're tapping the heart
      event?.stopPropagation();

      // Haptic feedback
      Haptics.selectionAsync().catch(() => {});

      // Animate heart
      const scale = getHeartScale(imageUrl);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();

      // Toggle favorite status
      setFavorites(prev => ({ ...prev, [imageUrl]: !prev[imageUrl] }));
    },
    [getHeartScale]
  );

  // Handle refresh with haptic feedback
  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // Reload images from params
    setTimeout(() => {
      try {
        if (params.images) {
          const parsedImages = JSON.parse(params.images as string);
          if (Array.isArray(parsedImages) && parsedImages.length > 0) {
            setImages(parsedImages);
          }
        }
      } catch (error) {
        console.error('Error refreshing gallery images:', error);
      }

      setRefreshing(false);

      // Add haptic feedback after refresh completes
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 500);
  }, [params.images]);

  // Render each gallery item
  const renderGalleryItem = ({ item }: { item: string }) => {
    const isFavorited = !!favorites[item] || isFavoritedUtil(item);
    const scale = getHeartScale(item);

    return (
      <View style={styles.imageContainer}>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={() => openImage(item)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item }} style={styles.thumbnail} resizeMode="cover" />
        </TouchableOpacity>

        {/* Like button */}
        <TouchableOpacity
          style={styles.thumbnailHeartButton}
          onPress={e => toggleImageFavorite(item, e)}
          hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <FontAwesomeIcon
              icon={isFavorited ? solidHeart : regularHeart}
              size={12}
              color="#FF4757"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const selectedImageIsFavorited =
    !!selectedImage && (!!favorites[selectedImage] || isFavoritedUtil(selectedImage));
  const viewerBackground = isDark ? '#050505' : '#F2F2F7';
  const viewerSurface = isDark ? 'rgba(28,28,30,0.82)' : 'rgba(255,255,255,0.88)';
  const viewerButtonBackground = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(28,28,30,0.06)';
  const viewerTextColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const viewerMutedColor = isDark ? 'rgba(242,242,247,0.62)' : 'rgba(60,60,67,0.62)';
  const viewerDisabledColor = isDark ? 'rgba(242,242,247,0.28)' : 'rgba(60,60,67,0.26)';
  const viewerImageBackground = isDark ? '#050505' : '#E5E5EA';
  const filmstripBackground = '#171719';
  const filmstripHoleColor = '#F2F2F7';
  const viewerContextImage = routeContextImage || images[0] || selectedImage;
  const controlsTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });
  const footerTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const imageScale = imageAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.965, 1],
  });
  const imageTranslateY = imageAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      const nextScale = Math.min(Math.max(savedZoomScale.value * event.scale, 1), 4);
      const scaleChange = nextScale / savedZoomScale.value;
      const originX = event.focalX - POLAROID_PHOTO_WIDTH / 2;
      const originY = event.focalY - POLAROID_PHOTO_HEIGHT / 2;
      const maxX = (POLAROID_PHOTO_WIDTH * (nextScale - 1)) / 2;
      const maxY = (POLAROID_PHOTO_HEIGHT * (nextScale - 1)) / 2;

      zoomScale.value = nextScale;
      zoomTranslateX.value = clampOffset(
        originX - (originX - savedTranslateX.value) * scaleChange,
        maxX
      );
      zoomTranslateY.value = clampOffset(
        originY - (originY - savedTranslateY.value) * scaleChange,
        maxY
      );
    })
    .onEnd(() => {
      if (zoomScale.value <= 1.01) {
        zoomScale.value = withTiming(1, { duration: 140 });
        savedZoomScale.value = 1;
        zoomTranslateX.value = withTiming(0, { duration: 140 });
        zoomTranslateY.value = withTiming(0, { duration: 140 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      savedZoomScale.value = zoomScale.value;
      savedTranslateX.value = zoomTranslateX.value;
      savedTranslateY.value = zoomTranslateY.value;
    });
  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      if (zoomScale.value <= 1.01) {
        zoomTranslateX.value = event.translationX * 0.72;
        zoomTranslateY.value =
          event.translationY > 0 ? event.translationY : event.translationY * 0.22;
        return;
      }

      const maxX = (POLAROID_PHOTO_WIDTH * (zoomScale.value - 1)) / 2;
      const maxY = (POLAROID_PHOTO_HEIGHT * (zoomScale.value - 1)) / 2;
      zoomTranslateX.value = clampOffset(savedTranslateX.value + event.translationX, maxX);
      zoomTranslateY.value = clampOffset(savedTranslateY.value + event.translationY, maxY);
    })
    .onEnd(event => {
      if (zoomScale.value <= 1.01) {
        const absX = Math.abs(event.translationX);
        const absY = Math.abs(event.translationY);

        if (event.translationY > 90 && absY > absX) {
          runOnJS(handleSwipeDismiss)();
          return;
        }

        if (absX > 72 && absX > absY) {
          const targetIndex =
            event.translationX < 0 ? currentImageIndex + 1 : currentImageIndex - 1;

          if (targetIndex >= 0 && targetIndex < images.length) {
            runOnJS(handleSwipeNavigate)(targetIndex);
            return;
          }
        }

        zoomTranslateX.value = withTiming(0, { duration: 160 });
        zoomTranslateY.value = withTiming(0, { duration: 160 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      savedTranslateX.value = zoomTranslateX.value;
      savedTranslateY.value = zoomTranslateY.value;
    });
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_event, success) => {
      if (!success) {
        return;
      }

      const nextScale = zoomScale.value > 1 ? 1 : 2;
      zoomScale.value = withTiming(nextScale, { duration: 180 });
      savedZoomScale.value = nextScale;
      zoomTranslateX.value = withTiming(0, { duration: 180 });
      zoomTranslateY.value = withTiming(0, { duration: 180 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });
  const imageGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);
  const zoomedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: zoomTranslateX.value },
      { translateY: zoomTranslateY.value },
      { scale: zoomScale.value },
    ],
  }));

  return (
    <>
      <PushScreenOptions />
      <IOSScreenWrapper>
        <WebSlideTransition>
          <ThemedView style={styles.container} lightColor="#f2f2f7" darkColor="#000000">
            <WallpaperPattern />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header section with CustomHeader */}
            <View style={styles.headerArea}>
              {/* CustomHeader with logo and back button - with reduced bottom margin */}
              <CustomHeader
                showLogo={true}
                leftAction={{
                  icon: 'chevron-back',
                  onPress: handleGoBack,
                }}
                style={{ marginBottom: 4 }} // Override the default marginBottom of 15
              />
            </View>

            {/* Title section with gallery title left-aligned and location pill right-aligned */}
            <View style={styles.titleSection}>
              <TitleWithLocation
                title="Gallery"
                location={resolvedLocation}
                iconName="bed"
                iconSize={16}
                iconColor="#8E8E93"
                style={styles.titleRowContainer}
                titleStyle={[
                  styles.galleryTitle,
                  {
                    color: isDark ? '#FFFFFF' : '#1C1C1E',
                    textShadowColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)',
                  },
                ]}
                titleProps={{
                  adjustsFontSizeToFit: true,
                  minimumFontScale: 0.9,
                }}
                pillStyle={styles.pillTagOverlay}
                pillTextStyle={styles.pillTextOverlay}
                pillBackgroundLight="rgba(255,255,255,0.8)"
                pillBackgroundDark="#1C1C1E"
                pillTextLight="#000000"
                pillTextDark="#FFFFFF"
                pillTextProps={{ numberOfLines: 1 }}
              />
            </View>

            {/* Photos count below the title - compact spacing */}
            <View style={styles.galleryCountWrapper}>
              <Ionicons
                name="images"
                size={14} // Slightly smaller icon
                color={isDark ? '#FFFFFF' : '#000000'}
                style={styles.galleryIcon}
              />
              <ThemedText style={styles.galleryCount}>{images.length} photos</ThemedText>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
              </View>
            ) : (
              <FlatList
                data={images}
                renderItem={renderGalleryItem}
                keyExtractor={(item, index) => index.toString()}
                numColumns={3}
                style={styles.galleryList}
                contentContainerStyle={styles.galleryContent}
                columnWrapperStyle={styles.galleryRow} // Ensure rows are evenly spaced
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={isDark ? '#FFFFFF' : '#000000'}
                  />
                }
              />
            )}

            {/* Full Screen Image Modal */}
            <Modal
              visible={modalVisible}
              transparent={true}
              animationType="none"
              onRequestClose={closeImage}
              statusBarTranslucent
            >
              <Animated.View
                style={[
                  styles.modalContainer,
                  { backgroundColor: viewerBackground, opacity: modalAnim },
                ]}
              >
                <Animated.View
                  style={[
                    styles.viewerTopBar,
                    {
                      backgroundColor: viewerSurface,
                      opacity: modalAnim,
                      transform: [{ translateY: controlsTranslateY }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.viewerIconButton, { backgroundColor: viewerButtonBackground }]}
                    onPress={closeImage}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={22} color={viewerTextColor} />
                  </TouchableOpacity>

                  {viewerContextImage && (
                    <Image
                      source={{ uri: viewerContextImage }}
                      style={styles.viewerContextImage}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.viewerTitleStack}>
                    {isLocationGallery ? (
                      <View
                        style={[
                          styles.viewerLocationPill,
                          { backgroundColor: viewerButtonBackground },
                        ]}
                      >
                        <Ionicons name="location" size={13} color={viewerTextColor} />
                        <ThemedText
                          style={[styles.viewerLocationPillText, { color: viewerTextColor }]}
                          numberOfLines={1}
                        >
                          {resolvedLocation}
                        </ThemedText>
                      </View>
                    ) : (
                      <>
                        <ThemedText
                          style={[styles.viewerTitle, { color: viewerTextColor }]}
                          numberOfLines={1}
                        >
                          {viewerContextTitle}
                        </ThemedText>
                        {resolvedLocation !== viewerContextTitle && (
                          <ThemedText
                            style={[styles.viewerLocation, { color: viewerMutedColor }]}
                            numberOfLines={1}
                          >
                            {resolvedLocation}
                          </ThemedText>
                        )}
                      </>
                    )}
                  </View>
                </Animated.View>

                <View
                  style={styles.imageViewerContainer}
                  onTouchStart={handleViewerTouchStart}
                  onTouchEnd={handleViewerTouchEnd}
                >
                  <View style={styles.fullImageFrame}>
                    {selectedImage && (
                      <View style={[styles.polaroidAssetFrame, { backgroundColor: viewerBackground }]}>
                        <View style={styles.polaroidAssetPhotoSlot}>
                          <GestureDetector gesture={imageGesture}>
                            <Animated.View
                              style={[
                                styles.polaroidAssetPhotoSurface,
                                {
                                  opacity: imageAnim,
                                  transform: [{ translateY: imageTranslateY }, { scale: imageScale }],
                                },
                              ]}
                            >
                              <Reanimated.Image
                                key={selectedImage}
                                source={{ uri: selectedImage }}
                                style={[styles.polaroidAssetPhoto, zoomedImageStyle]}
                                resizeMode="cover"
                              />
                            </Animated.View>
                          </GestureDetector>
                        </View>
                        <View pointerEvents="none" style={styles.polaroidAssetOverlay}>
                          <Image
                            source={POLAROID_IMAGE}
                            style={styles.polaroidAssetImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      styles.prevButton,
                      { backgroundColor: viewerSurface },
                    ]}
                    onPressIn={handleViewerTouchStart}
                    onPressOut={handleViewerTouchEnd}
                    onPress={() => showImageAt(currentImageIndex - 1)}
                    disabled={currentImageIndex <= 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={22}
                      color={currentImageIndex > 0 ? viewerTextColor : viewerDisabledColor}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      styles.nextButton,
                      { backgroundColor: viewerSurface },
                    ]}
                    onPressIn={handleViewerTouchStart}
                    onPressOut={handleViewerTouchEnd}
                    onPress={() => showImageAt(currentImageIndex + 1)}
                    disabled={currentImageIndex >= images.length - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={
                        currentImageIndex < images.length - 1
                          ? viewerTextColor
                          : viewerDisabledColor
                      }
                    />
                  </TouchableOpacity>
                </View>

                <Animated.View
                  style={[
                    styles.viewerFloatingCounter,
                    {
                      backgroundColor: viewerSurface,
                      opacity: modalAnim,
                      transform: [{ translateY: footerTranslateY }],
                    },
                  ]}
                >
                  <ThemedText style={[styles.viewerCounterText, { color: viewerTextColor }]}>
                    {currentImageIndex + 1} / {images.length}
                  </ThemedText>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.viewerFloatingActions,
                    {
                      opacity: modalAnim,
                      transform: [{ translateY: footerTranslateY }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.viewerIconButton, { backgroundColor: viewerSurface }]}
                    onPress={handleToggleFavorite}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                      <FontAwesomeIcon
                        icon={selectedImageIsFavorited ? solidHeart : regularHeart}
                        size={20}
                        color={selectedImageIsFavorited ? '#FF4757' : viewerTextColor}
                      />
                    </Animated.View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.viewerIconButton, { backgroundColor: viewerSurface }]}
                    onPress={handleShare}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <FontAwesomeIcon icon={faShareFromSquare} size={19} color={viewerTextColor} />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.viewerBottomPanel,
                    {
                      opacity: modalAnim,
                      transform: [{ translateY: footerTranslateY }],
                    },
                  ]}
                >
                  {images.length > 0 && (
                    <View
                      style={[
                        styles.viewerFilmstripFrame,
                        { backgroundColor: filmstripBackground },
                      ]}
                    >
                      <FlatList
                        ref={filmstripRef}
                        data={images}
                        horizontal
                        keyExtractor={(item, index) => `${item}-${index}`}
                        showsHorizontalScrollIndicator={false}
                        style={styles.viewerFilmstrip}
                        contentContainerStyle={[
                          styles.viewerFilmstripContent,
                          { backgroundColor: filmstripBackground },
                        ]}
                        onScrollToIndexFailed={() => {}}
                        ListFooterComponent={
                          filmstripFillerCells.length > 0 ? (
                            <View style={styles.filmstripFillerRow}>
                              {filmstripFillerCells.map(fillerIndex => (
                                <View
                                  key={`filler-${fillerIndex}`}
                                  style={styles.filmstripFillerCell}
                                >
                                  <View style={styles.filmstripHoleRow} pointerEvents="none">
                                    {FILMSTRIP_HOLES.map(holeIndex => (
                                      <View
                                        key={`top-filler-${fillerIndex}-${holeIndex}`}
                                        style={[
                                          styles.filmstripHole,
                                          { backgroundColor: filmstripHoleColor },
                                        ]}
                                      />
                                    ))}
                                  </View>
                                  <View style={styles.filmstripBlankFrame} />
                                  <View style={styles.filmstripHoleRow} pointerEvents="none">
                                    {FILMSTRIP_HOLES.map(holeIndex => (
                                      <View
                                        key={`bottom-filler-${fillerIndex}-${holeIndex}`}
                                        style={[
                                          styles.filmstripHole,
                                          { backgroundColor: filmstripHoleColor },
                                        ]}
                                      />
                                    ))}
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : null
                        }
                        renderItem={({ item, index }) => {
                          const isActive = index === currentImageIndex;

                          return (
                            <TouchableOpacity
                              activeOpacity={0.82}
                              onPress={() => showImageAt(index)}
                              style={styles.viewerThumbButton}
                            >
                              <View style={styles.filmstripHoleRow} pointerEvents="none">
                                {FILMSTRIP_HOLES.map(holeIndex => (
                                  <View
                                    key={`top-${index}-${holeIndex}`}
                                    style={[
                                      styles.filmstripHole,
                                      { backgroundColor: filmstripHoleColor },
                                    ]}
                                  />
                                ))}
                              </View>
                              <View style={styles.viewerThumbImageFrame}>
                                <Image
                                  source={{ uri: item }}
                                  style={[
                                    styles.viewerThumbImage,
                                    { opacity: isActive ? 1 : 0.62 },
                                  ]}
                                  resizeMode="cover"
                                />
                              </View>
                              <View style={styles.filmstripHoleRow} pointerEvents="none">
                                {FILMSTRIP_HOLES.map(holeIndex => (
                                  <View
                                    key={`bottom-${index}-${holeIndex}`}
                                    style={[
                                      styles.filmstripHole,
                                      { backgroundColor: filmstripHoleColor },
                                    ]}
                                  />
                                ))}
                              </View>
                            </TouchableOpacity>
                          );
                        }}
                      />
                    </View>
                  )}
                </Animated.View>
              </Animated.View>
            </Modal>
          </ThemedView>
        </WebSlideTransition>
      </IOSScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: responsiveFontSize(17),
    fontFamily: Fonts.medium,
  },
  // Header container styles
  headerArea: {
    position: 'relative',
    width: '100%',
    zIndex: 10,
    marginBottom: 2, // Further reduced margin between header and title/location
  },
  headerPillWrapper: {
    // No longer absolutely positioned
    zIndex: 20,
    minWidth: 100, // Ensure a decent minimum width to match details view
  },
  titleSection: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'stretch',
    position: 'relative',
    paddingTop: 4,
    marginBottom: 2, // Reduced from 16 to bring photo count closer
  },
  titleRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'nowrap', // Ensure elements stay on one line
  },
  pillTagOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: 220, // Maximum width to prevent overflow but allow dynamic sizing
    minWidth: 100, // Minimum width for very short location names
  },
  pillTextOverlay: {
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
    fontFamily: Fonts.bold,
    marginLeft: 6,
    flexShrink: 1, // Allow text to shrink if needed
  },
  pillIcon: {
    marginRight: 4, // Match details view
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    height: 50,
  },
  galleryTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.bold,
    flex: 1, // Take available space on the left side
    textAlign: 'left',
    marginRight: 16, // Add space between title and pill
    lineHeight: 28,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  galleryCountWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 2, // Reduced from 4
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: -6, // Slight lift to sit closer to the title without shifting it
  },
  galleryIcon: {
    marginRight: 4,
  },
  galleryCount: {
    fontSize: responsiveFontSize(14),
    opacity: 0.7,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnailHeartButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  galleryList: {
    flex: 1,
    paddingHorizontal: 0, // Remove default padding to control it with contentContainerStyle
  },
  galleryContent: {
    paddingHorizontal: CONTAINER_PADDING, // Use the consistent padding value
    paddingVertical: 8,
    paddingBottom: 100, // Increased padding for better visibility of last row
  },
  galleryRow: {
    justifyContent: 'flex-start', // Align images to the start of each row
  },
  imageContainer: {
    marginVertical: SPACING,
    marginHorizontal: SPACING,
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    aspectRatio: 4 / 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  viewerTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 28,
    left: 16,
    right: 16,
    zIndex: 20,
    minHeight: 64,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContextImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  viewerTitleStack: {
    flex: 1,
    minWidth: 0,
  },
  viewerTitle: {
    fontSize: responsiveFontSize(20),
    lineHeight: 23,
    fontFamily: Fonts.bold,
  },
  viewerLocation: {
    marginTop: 2,
    fontSize: responsiveFontSize(12),
    lineHeight: 14,
    fontFamily: Fonts.medium,
  },
  viewerLocationPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  viewerLocationPillText: {
    flexShrink: 1,
    fontSize: responsiveFontSize(14),
    lineHeight: 16,
    fontFamily: Fonts.bold,
  },
  imageViewerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fullImageFrame: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  polaroidAssetFrame: {
    width: POLAROID_ASSET_SIZE,
    height: POLAROID_ASSET_SIZE,
    position: 'relative',
  },
  polaroidAssetPhotoSlot: {
    position: 'absolute',
    left: POLAROID_SLOT_LEFT,
    top: POLAROID_SLOT_TOP,
    width: POLAROID_SLOT_WIDTH,
    height: POLAROID_SLOT_HEIGHT,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    zIndex: 1,
    transform: [{ rotate: '-4.7deg' }],
  },
  polaroidAssetPhotoSurface: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  polaroidAssetPhoto: {
    width: '100%',
    height: '100%',
  },
  polaroidAssetOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  polaroidAssetImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    marginTop: -22,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 0,
  },
  prevButton: {
    left: 14,
  },
  nextButton: {
    right: 14,
  },
  viewerFloatingCounter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 116 : 110,
    alignSelf: 'center',
    zIndex: 20,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewerFloatingActions: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 106 : 100,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerBottomPanel: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: Platform.OS === 'ios' ? 24 : 18,
    zIndex: 20,
  },
  viewerCounterText: {
    fontSize: responsiveFontSize(13),
    lineHeight: 15,
    fontFamily: Fonts.bold,
  },
  viewerFilmstrip: {
    maxHeight: 86,
  },
  viewerFilmstripContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  viewerFilmstripFrame: {
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 0,
  },
  filmstripHoleRow: {
    height: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingHorizontal: 3,
  },
  filmstripHole: {
    width: 7,
    height: 5,
    borderRadius: 1.5,
  },
  filmstripFillerRow: {
    flexDirection: 'row',
  },
  filmstripFillerCell: {
    width: 78,
    height: 78,
    overflow: 'hidden',
  },
  filmstripBlankFrame: {
    height: 52,
  },
  viewerThumbButton: {
    width: 78,
    height: 78,
    overflow: 'hidden',
  },
  viewerThumbImageFrame: {
    height: 52,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  viewerThumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 1.5,
  },
});
