import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ShimmerPlaceholder } from './ShimmerPlaceholder';

const { width: screenWidth } = Dimensions.get('window');

export const CarouselShimmer: React.FC = () => {
  return (
    <View style={[styles.container, { width: screenWidth }]}>
      <View style={styles.card}>
        <ShimmerPlaceholder width="100%" height="100%" borderRadius={16} />

        <View style={styles.heartPlaceholder}>
          <ShimmerPlaceholder width={18} height={18} borderRadius={9} />
        </View>

        <View style={styles.overlay}>
          <ShimmerPlaceholder width={92} height={24} borderRadius={999} style={styles.pill} />
          <ShimmerPlaceholder width="62%" height={20} borderRadius={10} style={styles.title} />
          <ShimmerPlaceholder width="44%" height={14} borderRadius={7} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EEF1F4',
  },
  heartPlaceholder: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  pill: {
    marginBottom: 9,
  },
  title: {
    marginBottom: 7,
  },
});
