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
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart, faShareFromSquare } from '@fortawesome/free-regular-svg-icons';
import * as Haptics from 'expo-haptics';
import { isFavorited as isFavoritedUtil } from '@/utils/favoritesUtils';
import {
  PushScreenOptions,
  TitleWithLocation,
  WallpaperPattern,
  WebSlideTransition,
} from '@/components';

// Dimensions for layout calculations
const { width } = Dimensions.get('window');
const SPACING = 2;
const CONTAINER_PADDING = 16; // Consistent padding for the container
const THUMBNAIL_WIDTH = (width - CONTAINER_PADDING * 2 - SPACING * 6) / 3; // 3 images per row with even spacing
const THUMBNAIL_HEIGHT = (THUMBNAIL_WIDTH * 3) / 4; // 4:3 aspect ratio

export default function GalleryScreen() {
  const params = useLocalSearchParams();
  const { location } = params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const resolvedLocation =
    typeof location === 'string' && location.trim().length > 0 ? location : 'All locations';

  // State for gallery
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for favorites
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [heartScale] = useState(new Animated.Value(1));
  const heartScales = useRef<Record<string, Animated.Value>>({}).current;

  // Get heart scale for specific image
  const getHeartScale = useCallback(
    (imageUrl: string) => {
      if (!heartScales[imageUrl]) heartScales[imageUrl] = new Animated.Value(1);
      return heartScales[imageUrl];
    },
    [heartScales]
  );

  // Create state for swipe gesture handling
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

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

  const openImage = (imageUrl: string) => {
    const index = images.indexOf(imageUrl);
    setCurrentImageIndex(index);
    setSelectedImage(imageUrl);
  };

  const closeImage = () => {
    setSelectedImage(null);
  };

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
        message: `Check out this amazing photo from ${location || 'my trip'}!`,
        title: `Photo from ${location || 'my trip'}`,
        url: selectedImage || '',
      });
    } catch {
      // ignore errors
    }
  }, [selectedImage, location]);

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

  // Dynamic pill colors (slightly translucent on both modes) - matching DestinationDetail
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

            {/* Full Screen Image Modal with touch handlers for iOS-like swipe */}
            <Modal
              visible={!!selectedImage}
              transparent={true}
              animationType="fade"
              onRequestClose={closeImage}
            >
              <View
                style={[
                  styles.modalContainer,
                  {
                    backgroundColor:
                      colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.85)',
                  },
                ]}
              >
                {/* Close button (top right) */}
                <TouchableOpacity style={styles.closeButton} onPress={closeImage}>
                  <Ionicons name="close" size={24} color="#FF3B30" />
                </TouchableOpacity>

                {/* Top left action buttons */}
                <View style={styles.topLeftButtons}>
                  {/* Heart/Favorite button */}
                  <TouchableOpacity style={styles.topActionButton} onPress={handleToggleFavorite}>
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                      <FontAwesomeIcon
                        icon={selectedImage && (!!favorites[selectedImage] || isFavoritedUtil(selectedImage)) ? solidHeart : regularHeart}
                        size={24}
                        color={selectedImage && (!!favorites[selectedImage] || isFavoritedUtil(selectedImage)) ? '#FF4757' : '#FF3B30'}
                      />
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Share button */}
                  <TouchableOpacity style={styles.topActionButton} onPress={handleShare}>
                    <FontAwesomeIcon icon={faShareFromSquare} size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                {selectedImage && (
                  <View
                    style={styles.imageViewerContainer}
                    onTouchStart={e => {
                      // Record the starting touch position
                      setStartX(e.nativeEvent.pageX);
                      setStartY(e.nativeEvent.pageY);
                    }}
                    onTouchEnd={e => {
                      // Calculate the distance moved
                      const endX = e.nativeEvent.pageX;
                      const endY = e.nativeEvent.pageY;

                      const deltaX = endX - startX;
                      const deltaY = endY - startY;

                      // Minimum distance to be considered a swipe
                      const minDistance = 40; // Reduced for better responsiveness

                      // Check if we have a significant swipe
                      if (Math.abs(deltaX) > minDistance || Math.abs(deltaY) > minDistance) {
                        // If horizontal swipe is more significant than vertical swipe
                        if (Math.abs(deltaX) > Math.abs(deltaY)) {
                          if (deltaX > 0) {
                            // Right swipe - go to previous image (like iOS Photos)
                            if (currentImageIndex > 0) {
                              setCurrentImageIndex(currentImageIndex - 1);
                              setSelectedImage(images[currentImageIndex - 1]);
                            }
                          } else {
                            // Left swipe - go to next image (like iOS Photos)
                            if (currentImageIndex < images.length - 1) {
                              setCurrentImageIndex(currentImageIndex + 1);
                              setSelectedImage(images[currentImageIndex + 1]);
                            }
                          }
                        } else {
                          // If vertical swipe is more significant
                          if (deltaY > 0) {
                            // Down swipe - dismiss modal (like iOS Photos)
                            closeImage();
                          }
                        }
                      }
                    }}
                  >
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.fullImage}
                      resizeMode="contain"
                    />

                    {/* Navigation buttons for better UX - in addition to swipe */}
                    <TouchableOpacity
                      style={[styles.navButton, styles.prevButton]}
                      onPress={() => {
                        if (currentImageIndex > 0) {
                          setCurrentImageIndex(currentImageIndex - 1);
                          setSelectedImage(images[currentImageIndex - 1]);
                        }
                      }}
                      disabled={currentImageIndex <= 0}
                    >
                      <FontAwesome6
                        name="chevron-left"
                        size={20}
                        color={currentImageIndex > 0 ? '#FF3B30' : '#555555'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.navButton, styles.nextButton]}
                      onPress={() => {
                        if (currentImageIndex < images.length - 1) {
                          setCurrentImageIndex(currentImageIndex + 1);
                          setSelectedImage(images[currentImageIndex + 1]);
                        }
                      }}
                      disabled={currentImageIndex >= images.length - 1}
                    >
                      <FontAwesome6
                        name="chevron-right"
                        size={20}
                        color={currentImageIndex < images.length - 1 ? '#FF3B30' : '#555555'}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalFooter}>
                  <View style={styles.imageCounter}>
                    <ThemedText style={styles.imageCounterText}>
                      {currentImageIndex + 1} / {images.length}
                    </ThemedText>
                  </View>
                </View>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  },
  prevButton: {
    position: 'absolute',
    left: 15,
    top: '50%',
    marginTop: -25,
  },
  nextButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -25,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between', // Space between counter and buttons
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  imageCounter: {
    padding: 8,
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    borderRadius: 12,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(16),
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    marginLeft: 10,
  },
  topLeftButtons: {
    position: 'absolute',
    top: 40,
    left: 20, // Position at left edge
    flexDirection: 'row',
    zIndex: 10,
  },
  topActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
