import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { SvgUri } from 'react-native-svg';
import { Fonts, responsiveFontSize, responsiveLineHeight } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from './ThemedText';
import { ViewAllButton } from './ViewAllButton';

const GALLERY_ICON_ASSET = require('@/assets/icons/gallery.svg');

type SvgAssetIconProps = {
  asset: ReturnType<typeof Asset.fromModule>;
  color: string;
  size?: number;
};

function SvgAssetIcon({ asset, color, size = 18 }: SvgAssetIconProps) {
  const [uri, setUri] = useState<string | null>(
    asset.localUri ?? (asset.downloaded ? asset.uri : null)
  );

  useEffect(() => {
    let isMounted = true;

    const prepareAsset = async () => {
      if (!asset.localUri && !asset.downloaded) {
        await asset.downloadAsync();
      }

      if (isMounted) {
        setUri(asset.localUri ?? asset.uri);
      }
    };

    prepareAsset();

    return () => {
      isMounted = false;
    };
  }, [asset]);

  if (!uri) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgUri uri={uri} width={size} height={size} color={color} fill={color} />;
}

function GalleryIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(GALLERY_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

type ProfileGalleryHeaderProps = {
  disabled?: boolean;
  onPress: () => void;
};

export function ProfileGalleryHeader({ disabled, onPress }: ProfileGalleryHeaderProps) {
  const colorScheme = useColorScheme();
  const sectionIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E';

  return (
    <View style={styles.header}>
      <View style={styles.icon}>
        <GalleryIcon size={24} color={sectionIconColor} />
      </View>
      <View style={styles.titleGroup}>
        <ThemedText type="caption" style={[styles.title, { color: sectionIconColor }]}>
          Gallery
        </ThemedText>
      </View>
      <ViewAllButton onPress={onPress} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  icon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: responsiveFontSize(20),
    lineHeight: responsiveLineHeight(21),
    fontFamily: Fonts.bold,
    letterSpacing: 0,
  },
});
