import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ShimmerPlaceholder } from './ShimmerPlaceholder';

const { width: screenWidth } = Dimensions.get('window');
const STAY_CARD_WIDTH = screenWidth - 120; // Match the actual stay card width
const STAY_CARD_SPACING = 16;

interface StayCardShimmerProps {
  count?: number;
}

const StayCardShimmer: React.FC<StayCardShimmerProps> = ({ count = 3 }) => {
  const colorScheme = useColorScheme();

  const renderShimmerCard = (index: number) => (
    <View
      key={index}
      style={[
        styles.shimmerCard,
        {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
          marginRight: index === count - 1 ? 0 : STAY_CARD_SPACING,
        },
      ]}
    >
      {/* Image shimmer */}
      <ShimmerPlaceholder
        width={STAY_CARD_WIDTH}
        height={200}
        borderRadius={0}
        style={styles.imageShimmer}
      />

      {/* Heart button shimmer */}
      <ShimmerPlaceholder width={36} height={36} borderRadius={18} style={styles.heartShimmer} />

      {/* Content area */}
      <View style={styles.stayInfoContainer}>
        {/* Rating pill shimmer - top right */}
        <View style={styles.stayTopRow}>
          <ShimmerPlaceholder width={60} height={24} borderRadius={12} />
        </View>

        {/* Bottom overlay content */}
        <View style={styles.stayOverlay}>
          {/* Stay name shimmer */}
          <ShimmerPlaceholder
            width={180}
            height={20}
            borderRadius={4}
            style={{ marginBottom: 8 }}
          />

          {/* Meta row with location and amenities pills */}
          <View style={styles.stayMetaRow}>
            {/* Location pill shimmer */}
            <ShimmerPlaceholder width={100} height={24} borderRadius={12} />

            {/* Amenities pill shimmer */}
            <ShimmerPlaceholder
              width={80}
              height={24}
              borderRadius={12}
              style={{ marginLeft: 'auto' }}
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => renderShimmerCard(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingLeft: STAY_CARD_SPACING,
    paddingRight: 0,
    paddingBottom: STAY_CARD_SPACING,
  },
  shimmerCard: {
    width: STAY_CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heartShimmer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  stayInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  stayTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  stayOverlay: {
    paddingTop: 8,
  },
  stayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default StayCardShimmer;
