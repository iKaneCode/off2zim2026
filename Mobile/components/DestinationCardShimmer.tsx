import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ShimmerPlaceholder } from './ShimmerPlaceholder';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 80) / 2;

interface DestinationCardShimmerProps {
  count?: number;
}

export const DestinationCardShimmer: React.FC<DestinationCardShimmerProps> = ({ count = 4 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.card}>
          <ShimmerPlaceholder width="100%" height="100%" borderRadius={12} />

          <View style={styles.heartPlaceholder}>
            <ShimmerPlaceholder width={18} height={18} borderRadius={9} />
          </View>

          <View style={styles.overlay}>
            <ShimmerPlaceholder width={CARD_WIDTH * 0.58} height={18} borderRadius={9} />
            <View style={styles.metaRow}>
              <ShimmerPlaceholder width={CARD_WIDTH * 0.45} height={18} borderRadius={999} />
              <ShimmerPlaceholder width={42} height={18} borderRadius={999} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: 200,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EEF1F4',
  },
  heartPlaceholder: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.58)',
    padding: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 6,
  },
});
