import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import type { ComponentProps } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Dimensions,
  StyleSheet,
  ScrollView,
  FlatList,
  View,
  Pressable,
  Animated,
  Modal,
  Image,
  ImageBackground,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Easing,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import {
  CustomHeader,
  EventCard,
  FilterBar,
  ListImageCard,
  LocationPill,
  RatingPill,
  SearchBar,
  ShimmerPlaceholder,
  StatusPill,
  StayCard,
  ViewAllButton,
} from '@/components';
import { EVENT_CARD_SPACING, EVENT_CARD_WIDTH } from '@/components/EventCard';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { weatherService } from '@/services/weather';
import { eventsService, staysService } from '@/services/database';
import { thingsToDoData } from '@/constants/FeaturedData';
import { getActivityStatus, activityStatusColor, type ActivityStatus } from '@/utils/timeStatus';
import type { Stay } from '@/types/Stay';
import { mapEventRecordToEvent, type EventCardItem } from '@/utils/eventUtils';
import {
  isFavorited as isFavoritedUtil,
  subscribeFavorites,
  toggleFavorite as toggleFavoriteUtil,
} from '@/utils/favoritesUtils';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SvgUri } from 'react-native-svg';
import { Asset } from 'expo-asset';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';
import * as Haptics from 'expo-haptics';

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

type AtlasLesson = {
  id: string;
  title: string;
  creator: string;
  duration: string;
};

type WeatherDay = {
  day: string;
  icon: string;
  iconName?: string;
  high: number;
  low: number;
};

type WildlifeIconName =
  | 'lion'
  | 'leopard'
  | 'cheetah'
  | 'wild-dog'
  | 'hippo'
  | 'elephant'
  | 'buffalo'
  | 'giraffe'
  | 'zebra'
  | 'sable'
  | 'hyena'
  | 'brown-hyena'
  | 'wildebeest'
  | 'eland'
  | 'aardvark'
  | 'crocodile'
  | 'rhino';

type WildlifeSightingItem = {
  label: string;
  icon: WildlifeIconName;
  note: string;
};

type WildlifeSightingRule = WildlifeSightingItem & {
  keywords: string[];
};

const SAFARI_DEFAULT_SIGHTINGS: WildlifeSightingItem[] = [
  { label: 'Elephant', icon: 'elephant', note: 'Common' },
  { label: 'Buffalo', icon: 'buffalo', note: 'Common' },
  { label: 'Lion', icon: 'lion', note: 'Possible' },
  { label: 'Leopard', icon: 'leopard', note: 'Rare' },
  { label: 'Wild dog', icon: 'wild-dog', note: 'Rare' },
  { label: 'Spotted Hyena', icon: 'hyena', note: 'Possible' },
  { label: 'Zebra', icon: 'zebra', note: 'Possible' },
  { label: 'Giraffe', icon: 'giraffe', note: 'Possible' },
  { label: 'Sable antelope', icon: 'sable', note: 'Possible' },
  { label: 'Wildebeest', icon: 'wildebeest', note: 'Possible' },
  { label: 'Eland', icon: 'eland', note: 'Possible' },
];

const WATER_DEFAULT_SIGHTINGS: WildlifeSightingItem[] = [
  { label: 'Hippo', icon: 'hippo', note: 'Common' },
  { label: 'Crocodile', icon: 'crocodile', note: 'Common' },
];

const WILDLIFE_SIGHTING_RULES: WildlifeSightingRule[] = [
  {
    label: 'Lion',
    icon: 'lion',
    note: 'Possible',
    keywords: ['lion', 'lions'],
  },
  {
    label: 'Leopard',
    icon: 'leopard',
    note: 'Rare',
    keywords: ['leopard', 'leopards'],
  },
  {
    label: 'Cheetah',
    icon: 'cheetah',
    note: 'Rare',
    keywords: ['cheetah', 'cheetahs'],
  },
  {
    label: 'Wild dog',
    icon: 'wild-dog',
    note: 'Rare',
    keywords: ['wild dog', 'wild dogs', 'painted dog', 'painted dogs'],
  },
  {
    label: 'Elephant',
    icon: 'elephant',
    note: 'Common',
    keywords: ['elephant', 'elephants'],
  },
  {
    label: 'Buffalo',
    icon: 'buffalo',
    note: 'Common',
    keywords: ['buffalo', 'buffalos'],
  },
  {
    label: 'Giraffe',
    icon: 'giraffe',
    note: 'Possible',
    keywords: ['giraffe', 'giraffes'],
  },
  {
    label: 'Zebra',
    icon: 'zebra',
    note: 'Possible',
    keywords: ['zebra', 'zebras'],
  },
  {
    label: 'Rhino',
    icon: 'rhino',
    note: 'Possible',
    keywords: ['rhino', 'rhinos'],
  },
  {
    label: 'Hippo',
    icon: 'hippo',
    note: 'Common',
    keywords: ['hippo', 'hippos'],
  },
  {
    label: 'Crocodile',
    icon: 'crocodile',
    note: 'Common',
    keywords: ['crocodile', 'crocodiles'],
  },
  {
    label: 'Sable antelope',
    icon: 'sable',
    note: 'Possible',
    keywords: ['sable', 'sable antelope'],
  },
  {
    label: 'Spotted Hyena',
    icon: 'hyena',
    note: 'Possible',
    keywords: ['spotted hyena', 'hyena', 'hyenas'],
  },
  {
    label: 'Brown Hyena',
    icon: 'brown-hyena',
    note: 'Rare',
    keywords: ['brown hyena'],
  },
  {
    label: 'Wildebeest',
    icon: 'wildebeest',
    note: 'Possible',
    keywords: ['wildebeest', 'gnu'],
  },
  {
    label: 'Eland',
    icon: 'eland',
    note: 'Possible',
    keywords: ['eland'],
  },
  {
    label: 'Aardvark',
    icon: 'aardvark',
    note: 'Rare',
    keywords: ['aardvark', 'aardvarks'],
  },
];

function wildlifeItems(...labels: string[]): WildlifeSightingItem[] {
  return labels
    .map(label => WILDLIFE_SIGHTING_RULES.find(rule => rule.label === label))
    .filter((item): item is WildlifeSightingRule => Boolean(item))
    .map(({ label, icon, note }) => ({ label, icon, note }));
}

const ALL_ZIMBABWE_SIGHTINGS = wildlifeItems(
  'Elephant',
  'Buffalo',
  'Lion',
  'Leopard',
  'Cheetah',
  'Wild dog',
  'Spotted Hyena',
  'Brown Hyena',
  'Hippo',
  'Crocodile',
  'Rhino',
  'Giraffe',
  'Zebra',
  'Sable antelope',
  'Wildebeest',
  'Eland',
  'Aardvark'
);

const HWANGE_AREA_SIGHTINGS = wildlifeItems(
  'Elephant',
  'Buffalo',
  'Lion',
  'Leopard',
  'Cheetah',
  'Wild dog',
  'Spotted Hyena',
  'Giraffe',
  'Zebra',
  'Sable antelope',
  'Wildebeest',
  'Eland',
  'Aardvark'
);

const ZAMBEZI_VALLEY_SIGHTINGS = wildlifeItems(
  'Elephant',
  'Buffalo',
  'Lion',
  'Leopard',
  'Wild dog',
  'Spotted Hyena',
  'Hippo',
  'Crocodile',
  'Zebra',
  'Sable antelope',
  'Eland'
);

const LOWVELD_SIGHTINGS = wildlifeItems(
  'Elephant',
  'Buffalo',
  'Lion',
  'Leopard',
  'Cheetah',
  'Wild dog',
  'Spotted Hyena',
  'Hippo',
  'Crocodile',
  'Rhino',
  'Giraffe',
  'Zebra',
  'Sable antelope',
  'Wildebeest',
  'Eland'
);

const GONAREZHOU_SIGHTINGS = wildlifeItems(
  'Elephant',
  'Buffalo',
  'Lion',
  'Leopard',
  'Cheetah',
  'Wild dog',
  'Spotted Hyena',
  'Hippo',
  'Crocodile',
  'Giraffe',
  'Zebra',
  'Sable antelope',
  'Wildebeest',
  'Eland'
);

const MATOBO_AREA_SIGHTINGS = wildlifeItems(
  'Rhino',
  'Leopard',
  'Brown Hyena',
  'Giraffe',
  'Zebra',
  'Sable antelope',
  'Wildebeest',
  'Eland'
);

const RECREATIONAL_PARK_SIGHTINGS = wildlifeItems(
  'Rhino',
  'Giraffe',
  'Zebra',
  'Sable antelope',
  'Wildebeest',
  'Eland',
  'Hippo',
  'Crocodile'
);

const URBAN_SANCTUARY_SIGHTINGS = wildlifeItems(
  'Elephant',
  'Rhino',
  'Giraffe',
  'Zebra',
  'Sable antelope',
  'Wildebeest',
  'Eland'
);

const BIG_CAT_SANCTUARY_SIGHTINGS = wildlifeItems(
  'Lion',
  'Cheetah',
  'Leopard',
  'Wild dog',
  'Spotted Hyena'
);

function getAreaSpecificWildlifeSightings(
  searchText: string,
  actualWildlifePlace: boolean,
  majorWildWaterLocation: boolean
): WildlifeSightingItem[] {
  if (!actualWildlifePlace && !majorWildWaterLocation) {
    return [];
  }

  if (/\b(lion and cheetah park|chipangali|orphanage)\b/.test(searchText)) {
    return BIG_CAT_SANCTUARY_SIGHTINGS;
  }

  if (
    /\b(wild is life|mukuvisi|mbizi|gosho|imire|pamuzinda|chengeta|tshabalala)\b/.test(searchText)
  ) {
    return URBAN_SANCTUARY_SIGHTINGS;
  }

  if (
    /\b(hwange|main camp|sinamatella|robins|mandavu|masuma|ngweshla|deteema|shumba|kennedy|jambili|sian simba|insiza|gwango|katshetsheti|tuskers|camp silwane)\b/.test(
      searchText
    )
  ) {
    return HWANGE_AREA_SIGHTINGS;
  }

  if (
    /\b(mana pools|sapi|chewore|chitake|nyamepi|nyakasanga|zambezi national park|chundu|victoria falls national park|zambezi floodplain)\b/.test(
      searchText
    )
  ) {
    return ZAMBEZI_VALLEY_SIGHTINGS;
  }

  if (
    /\b(matusadona|charara|chete|chirisa|hurungwe|dande|doma|phundundu|karinyanga|mbire|makuti|rengwe|sengwa|lake kariba|kariba shoreline)\b/.test(
      searchText
    )
  ) {
    return ZAMBEZI_VALLEY_SIGHTINGS;
  }

  if (
    /\b(gonarezhou|chilojo|chitove|bhenji|malapati|chilo gorge|runde gorge|crooks' corner|crooks corner)\b/.test(
      searchText
    )
  ) {
    return GONAREZHOU_SIGHTINGS;
  }

  if (/\b(save valley|malilangwe|bubye|bubiana|tuli|lowveld|mwenezi|nuanetsi)\b/.test(searchText)) {
    return LOWVELD_SIGHTINGS;
  }

  if (
    /\b(matobo|matopos|maleme|big cave|worlds view|world's view|burkes|shalom)\b/.test(searchText)
  ) {
    return MATOBO_AREA_SIGHTINGS;
  }

  if (
    /\b(lake chivero|lake macilwane|lake mutirikwi|mushandike|ngezi|sebakwe|shebakwe|manjirenji)\b/.test(
      searchText
    )
  ) {
    return RECREATIONAL_PARK_SIGHTINGS;
  }

  if (majorWildWaterLocation) {
    return WATER_DEFAULT_SIGHTINGS;
  }

  return [];
}

function mergeWildlifeSightings(...groups: WildlifeSightingItem[][]): WildlifeSightingItem[] {
  const merged: WildlifeSightingItem[] = [];
  groups.flat().forEach(item => {
    if (!merged.some(candidate => candidate.label === item.label)) {
      merged.push(item);
    }
  });
  return merged;
}

function textHasKeyword(text: string, keyword: string) {
  const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${pattern}\\b`).test(text);
}

function getWildlifeSightings(spot: AtlasSpot): WildlifeSightingItem[] {
  const nameText = spot.name.toLowerCase();
  const searchText =
    `${spot.name} ${spot.region} ${spot.description} ${spot.liveSignal}`.toLowerCase();
  const nonWildlifePlace =
    /\b(botanical garden|gardens|gallery|museum|square|ruins|rocks|hotel|golf|city|town|village|estate|monument|market|cave|church|cathedral|university)\b/.test(
      nameText
    );
  const wildlifePlaceName =
    /\b(national park|safari area|game park|game reserve|wildlife area|wildlife conservancy|wildlife sanctuary|conservancy|sanctuary|orphanage|crocodile farm|recreational park|woodlands|camp|campsite|camping site)\b/.test(
      nameText
    );
  const namedWildlifePlace =
    /\b(mana pools area|antelope park|lion and cheetah park|wild is life|mukuvisi woodlands|save valley|malilangwe|charara|sapi|chewore|phundundu|karinyanga|sengwa)\b/.test(
      nameText
    );
  const majorWildWaterLocation =
    /\b(zambezi river|lake kariba|limpopo river|runde river|save river|mwenezi river|gwayi river|sanyati river|shangani river)\b/.test(
      nameText
    );
  const actualWildlifePlace = !nonWildlifePlace && (wildlifePlaceName || namedWildlifePlace);
  const canShowWildlife = actualWildlifePlace || majorWildWaterLocation;

  if (!canShowWildlife) {
    return [];
  }

  const matches = WILDLIFE_SIGHTING_RULES.filter(rule =>
    rule.keywords.some(keyword => textHasKeyword(searchText, keyword))
  ).map(({ label, icon, note }) => ({ label, icon, note }));

  const areaSpecificSightings = getAreaSpecificWildlifeSightings(
    searchText,
    actualWildlifePlace,
    majorWildWaterLocation
  );
  const safariArea =
    actualWildlifePlace &&
    /\b(hwange|mana pools|gonarezhou|matusadona|chizarira|zambezi national park|save valley|malilangwe|sapi|chewore|charara|hurungwe|dande|doma|phundundu|karinyanga|mbire|sengwa|umfurudzi|tuli|bubye|bubiana|antelope park)\b/.test(
      searchText
    );
  const waterArea =
    majorWildWaterLocation ||
    (actualWildlifePlace &&
      /\b(mana pools|lake kariba|zambezi|matusadona|charara|sapi|chewore|limpopo|floodplain|crocodile farm)\b/.test(
        searchText
      ));
  const rhinoArea = actualWildlifePlace && /\b(matobo|matopos|rhino)\b/.test(searchText);
  const predatorArea =
    actualWildlifePlace &&
    /\b(hwange|mana pools|gonarezhou|matusadona|chizarira|zambezi national park|save valley|malilangwe|sapi|chewore|lion and cheetah park)\b/.test(
      searchText
    );
  const specialistSightings: WildlifeSightingItem[] = [];

  if (rhinoArea) {
    specialistSightings.push({ label: 'Rhino', icon: 'rhino', note: 'Possible' });
  }

  if (predatorArea) {
    specialistSightings.push(
      { label: 'Lion', icon: 'lion', note: 'Possible' },
      { label: 'Leopard', icon: 'leopard', note: 'Rare' },
      { label: 'Wild dog', icon: 'wild-dog', note: 'Rare' }
    );
  }

  const sightings = mergeWildlifeSightings(
    matches,
    areaSpecificSightings,
    specialistSightings,
    safariArea ? SAFARI_DEFAULT_SIGHTINGS : [],
    waterArea ? WATER_DEFAULT_SIGHTINGS : []
  );

  return sightings;
}

const WILDLIFE_ICON_ASSETS: Record<WildlifeIconName, number> = {
  lion: require('@/assets/images/wildlife/lion.svg'),
  leopard: require('@/assets/images/wildlife/leopard.svg'),
  cheetah: require('@/assets/images/wildlife/cheetah.svg'),
  'wild-dog': require('@/assets/images/wildlife/wild-dog.svg'),
  hippo: require('@/assets/images/wildlife/hippo.svg'),
  elephant: require('@/assets/images/wildlife/elephant.svg'),
  buffalo: require('@/assets/images/wildlife/buffalo.svg'),
  giraffe: require('@/assets/images/wildlife/giraffe.svg'),
  zebra: require('@/assets/images/wildlife/zebra.svg'),
  sable: require('@/assets/images/wildlife/sable-antelope.svg'),
  hyena: require('@/assets/images/wildlife/spotted-hyena.svg'),
  'brown-hyena': require('@/assets/images/wildlife/brown-hyena.svg'),
  wildebeest: require('@/assets/images/wildlife/wildebeest.svg'),
  eland: require('@/assets/images/wildlife/eland.svg'),
  aardvark: require('@/assets/images/wildlife/aardvark.svg'),
  crocodile: require('@/assets/images/wildlife/crocodile.svg'),
  rhino: require('@/assets/images/wildlife/rhino.svg'),
};

const ACCOMMODATION_ICON_ASSET = require('@/assets/icons/accommodation.svg');
const GALLERY_ICON_ASSET = require('@/assets/icons/gallery.svg');
const EVENTS_ICON_ASSET = require('@/assets/icons/events.svg');
const THINGS_ICON_ASSET = require('@/assets/icons/things.svg');
const BINOCULARS_ICON_ASSET = require('@/assets/icons/binoculars.svg');
const WEATHER_ICON_ASSET = require('@/assets/icons/weather.svg');

const WILDLIFE_SIGHTING_TILE_WIDTH = 72;
const WILDLIFE_SIGHTING_TILE_GAP = 10;
const WILDLIFE_SIGHTING_ITEM_INTERVAL = WILDLIFE_SIGHTING_TILE_WIDTH + WILDLIFE_SIGHTING_TILE_GAP;

function WildlifeIcon({
  name,
  color,
  size = 44,
}: {
  name: WildlifeIconName;
  color: string;
  size?: number;
}) {
  const iconAsset = useMemo(() => Asset.fromModule(WILDLIFE_ICON_ASSETS[name]), [name]);
  const [uri, setUri] = useState<string | null>(
    iconAsset.localUri ?? (iconAsset.downloaded ? iconAsset.uri : null)
  );

  useEffect(() => {
    let isMounted = true;

    const prepareAsset = async () => {
      if (!iconAsset.localUri && !iconAsset.downloaded) {
        await iconAsset.downloadAsync();
      }

      if (isMounted) {
        setUri(iconAsset.localUri ?? iconAsset.uri);
      }
    };

    prepareAsset();

    return () => {
      isMounted = false;
    };
  }, [iconAsset]);

  if (!uri) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgUri uri={uri} width={size} height={size} color={color} fill={color} />;
}

function SvgAssetIcon({
  asset,
  color,
  size = 18,
}: {
  asset: ReturnType<typeof Asset.fromModule>;
  color: string;
  size?: number;
}) {
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

function AccommodationIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(ACCOMMODATION_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function GalleryIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(GALLERY_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function EventsIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(EVENTS_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function ThingsIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(THINGS_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function BinocularsIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(BINOCULARS_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function WeatherIcon({ color, size = 18 }: { color: string; size?: number }) {
  const asset = useMemo(() => Asset.fromModule(WEATHER_ICON_ASSET), []);
  return <SvgAssetIcon asset={asset} color={color} size={size} />;
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <ThemedText type="caption" style={[styles.sectionTitleText, { color }]}>
      {children}
    </ThemedText>
  );
}

function WildlifeSightingsScrollRow({
  items,
  iconColor,
  noteColor,
  animation,
  itemKeyPrefix,
}: {
  items: WildlifeSightingItem[];
  iconColor: string;
  noteColor: string;
  animation?: Animated.Value;
  itemKeyPrefix: string;
}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(1)).current;
  const scrollActiveAnim = useRef(new Animated.Value(0)).current;
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const canScroll = contentWidth > layoutWidth + 1;
  const maxScrollX = Math.max(0, contentWidth - layoutWidth);
  const trackWidth = Math.max(0, layoutWidth - 8);
  const thumbWidth = canScroll
    ? Math.max(34, (layoutWidth / contentWidth) * trackWidth)
    : trackWidth;
  const translateX = scrollX.interpolate({
    inputRange: [0, Math.max(1, maxScrollX)],
    outputRange: [0, Math.max(0, trackWidth - thumbWidth)],
    extrapolate: 'clamp',
  });
  const trackOpacity = scrollActiveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.58, 0.92],
  });
  const trackScaleY = scrollActiveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const thumbOpacity = scrollActiveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.62, 0.95],
  });
  const thumbScaleY = scrollActiveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  useEffect(() => {
    revealAnim.setValue(0);
    Animated.spring(revealAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 74,
      friction: 9,
    }).start();
  }, [itemKeyPrefix, items.length, revealAnim]);

  const activateScroller = useCallback(() => {
    Animated.spring(scrollActiveAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 90,
      friction: 10,
    }).start();
  }, [scrollActiveAnim]);

  const settleScroller = useCallback(() => {
    Animated.timing(scrollActiveAnim, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scrollActiveAnim]);

  return (
    <View style={styles.wildlifeSightingsScrollWrap}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.wildlifeSightingsScroller}
        contentContainerStyle={styles.wildlifeSightingsGrid}
        scrollEventThrottle={16}
        onLayout={event => setLayoutWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={width => setContentWidth(width)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onScrollBeginDrag={activateScroller}
        onMomentumScrollBegin={activateScroller}
        onScrollEndDrag={settleScroller}
        onMomentumScrollEnd={settleScroller}
      >
        {items.map((item, index) => {
          const focusStep = items.length > 1 ? maxScrollX / (items.length - 1) : 0;
          const itemFocusX = focusStep * index;
          const focusRadius = Math.max(WILDLIFE_SIGHTING_ITEM_INTERVAL * 0.85, focusStep * 1.1);
          const focusInputRange = [itemFocusX - focusRadius, itemFocusX, itemFocusX + focusRadius];
          const focusTranslateY = scrollX.interpolate({
            inputRange: focusInputRange,
            outputRange: [5, 0, 5],
            extrapolate: 'clamp',
          });
          const focusScale = scrollX.interpolate({
            inputRange: focusInputRange,
            outputRange: [0.94, 1.04, 0.94],
            extrapolate: 'clamp',
          });
          const focusOpacity = scrollX.interpolate({
            inputRange: focusInputRange,
            outputRange: [0.74, 1, 0.74],
            extrapolate: 'clamp',
          });
          const entranceAnim = animation ?? revealAnim;
          const entranceTranslateY = entranceAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [8 + index * 2, 0],
          });
          const entranceScale = entranceAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.96, 1],
          });

          return (
            <Animated.View
              key={`${itemKeyPrefix}-${item.label}`}
              style={[
                styles.wildlifeSightingTile,
                {
                  opacity: Animated.multiply(focusOpacity, entranceAnim),
                  transform: [
                    { translateY: focusTranslateY },
                    { translateY: entranceTranslateY },
                    { scale: focusScale },
                    { scale: entranceScale },
                  ],
                },
              ]}
            >
              <View style={styles.wildlifeSightingIcon}>
                <WildlifeIcon name={item.icon} color={iconColor} />
              </View>
              <ThemedText
                type="caption"
                style={[styles.wildlifeSightingName, { color: iconColor }]}
              >
                {item.label}
              </ThemedText>
              <ThemedText
                type="caption"
                style={[styles.wildlifeSightingNote, { color: noteColor }]}
              >
                {item.note}
              </ThemedText>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {canScroll ? (
        <Animated.View
          style={[
            styles.wildlifeScrollTrack,
            {
              opacity: trackOpacity,
              transform: [{ scaleY: trackScaleY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.wildlifeScrollThumb,
              {
                width: thumbWidth,
                backgroundColor: iconColor,
                opacity: thumbOpacity,
                transform: [{ translateX }, { scaleY: thumbScaleY }],
              },
            ]}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

type AtlasSpot = {
  id: string;
  name: string;
  region: string;
  weatherLocation: string;
  eventLocationAliases: string[];
  image: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  creator: string;
  uploads: string;
  liveSignal: string;
  description: string;
  aiPrompt: string;
  language: string;
  phrase: string;
  translation: string;
  lessons: AtlasLesson[];
};

type AtlasSpotSeed = Omit<AtlasSpot, 'image' | 'aiPrompt' | 'lessons' | 'eventLocationAliases'> & {
  image?: string;
  eventLocationAliases?: string[];
};

type LanguagePhrase = {
  language: string;
  phrase: string;
};

type MapOverviewInfo = {
  title: string;
  regionLabel: string;
  description: string;
  footerLabel: string;
  image: string;
  sightings: WildlifeSightingItem[];
};

const DEFAULT_ATLAS_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';

const LANGUAGE_POPULARITY_RANK: Record<string, number> = {
  Shona: 1,
  'Karanga Shona': 2,
  Zezuru: 3,
  'Manyika Shona': 4,
  Ndebele: 5,
  Tonga: 6,
  Kalanga: 7,
  Ndau: 8,
  Shangani: 9,
  Venda: 10,
  Nambya: 11,
};

const REGION_LANGUAGE_PHRASES: Record<string, LanguagePhrase[]> = {
  Bulawayo: [
    { language: 'Ndebele', phrase: 'Kunjani?' },
    { language: 'Kalanga', phrase: 'Dumilani' },
  ],
  Harare: [
    { language: 'Shona', phrase: 'Makadii?' },
    { language: 'Zezuru', phrase: 'Mhoro!' },
  ],
  'Matabeleland North': [
    { language: 'Ndebele', phrase: 'Kunjani?' },
    { language: 'Tonga', phrase: 'Mwapona buti?' },
    { language: 'Nambya', phrase: 'Mwabonwa' },
  ],
  'Mashonaland West': [
    { language: 'Shona', phrase: 'Makadii?' },
    { language: 'Tonga', phrase: 'Mwapona buti?' },
  ],
  Manicaland: [
    { language: 'Manyika Shona', phrase: 'Maswera sei?' },
    { language: 'Ndau', phrase: 'Maswera sei?' },
  ],
  Masvingo: [
    { language: 'Karanga Shona', phrase: 'Makadii?' },
    { language: 'Shangani', phrase: 'Avuxeni' },
  ],
  'Matabeleland South': [
    { language: 'Ndebele', phrase: 'Linjani?' },
    { language: 'Kalanga', phrase: 'Dumilani' },
    { language: 'Venda', phrase: 'Ndaa' },
  ],
  Midlands: [
    { language: 'Shona', phrase: 'Makadii?' },
    { language: 'Ndebele', phrase: 'Kunjani?' },
  ],
  'Mashonaland East': [
    { language: 'Shona', phrase: 'Makadii?' },
    { language: 'Zezuru', phrase: 'Mhoro!' },
  ],
  'Mashonaland Central': [
    { language: 'Shona', phrase: 'Makadii?' },
    { language: 'Zezuru', phrase: 'Mhoro!' },
  ],
};

type MapProviderLocationKind = 'camp' | 'campsite' | 'recreational-park';

type MapProviderLocationSeed = {
  id: string;
  name: string;
  region: string;
  weatherLocation: string;
  aliases?: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  kind: MapProviderLocationKind;
  context: string;
  description?: string;
};

const PHRASE_TRANSLATIONS: Record<string, string> = {
  'Makadii?': 'How are you?',
  'Kunjani?': 'How are you?',
  'Linjani?': 'How are you?',
  'Maswera sei?': 'How has your day been?',
  'Mwapona buti?': 'How are you?',
  Mubotu: 'Good day.',
  Mwabonwa: 'A warm greeting used around Hwange and Victoria Falls.',
  Avuxeni: 'Good morning.',
};

function getPrimaryLanguagePhrase(region: string): LanguagePhrase & { translation: string } {
  const [primaryPhrase] = REGION_LANGUAGE_PHRASES[region] ?? [
    { language: 'Shona', phrase: 'Makadii?' },
  ];

  return {
    ...primaryPhrase,
    translation: PHRASE_TRANSLATIONS[primaryPhrase.phrase] ?? 'How are you?',
  };
}

function getMapProviderDescription(seed: MapProviderLocationSeed) {
  if (seed.description) {
    return seed.description;
  }

  if (seed.kind === 'recreational-park') {
    return `${seed.name} is a recreational park in ${seed.context}, useful for outdoor stops, local road-trip planning, waterside recreation and regional travel planning.`;
  }

  return `${seed.name} is a ${seed.kind} in ${seed.context}, useful for overnight planning, road-trip routing and regional travel planning.`;
}

function createMapProviderSpotSeed(seed: MapProviderLocationSeed): AtlasSpotSeed {
  const phrase = getPrimaryLanguagePhrase(seed.region);

  return {
    id: seed.id,
    name: seed.name,
    region: seed.region,
    weatherLocation: seed.weatherLocation,
    eventLocationAliases: [seed.name, ...(seed.aliases ?? [])],
    coordinates: seed.coordinates,
    creator: 'Map Provider Places',
    uploads: seed.kind === 'recreational-park' ? 'Recreation stop' : 'Campsite stop',
    liveSignal: seed.kind === 'recreational-park' ? 'Recreation clips' : 'Campsite clips',
    description: getMapProviderDescription(seed),
    language: phrase.language,
    phrase: phrase.phrase,
    translation: phrase.translation,
  };
}

const MAP_PROVIDER_LOCATION_SPOTS = [
  createMapProviderSpotSeed({
    id: 'lasting-impressions',
    name: 'Lasting Impressions',
    region: 'Mashonaland West',
    weatherLocation: 'Kadoma, Zimbabwe',
    aliases: [
      'Lasting Impressions Camp',
      'Lasting Impressions Campsite',
      'Claw Dam',
      'John Mack Lake',
    ],
    coordinates: { latitude: -18.4677, longitude: 29.8936 },
    kind: 'camp',
    context: 'the Claw Dam area near Kadoma',
    description:
      'Lasting Impressions is a camp and retreat location near Claw Dam outside Kadoma. It is known for youth camps, leadership retreats, outdoor activities and a quiet lakeside setting in the Mashonaland West countryside.',
  }),
  createMapProviderSpotSeed({
    id: 'lake-macilwane-recreational-park',
    name: 'Lake Macilwane Recreational Park',
    region: 'Mashonaland West',
    weatherLocation: 'Harare, Zimbabwe',
    aliases: ['Lake Macilwane', 'South Bank Game Park', 'Lake Chivero South Bank'],
    coordinates: { latitude: -17.9191, longitude: 30.8191 },
    kind: 'recreational-park',
    context: 'the south bank of the Lake Chivero and Manyame lake system',
    description:
      'Lake Macilwane Recreational Park, also associated with South Bank Game Park, sits on the southern side of the Lake Chivero and Manyame water landscape. It is useful for game viewing, birding, picnics and short nature trips from Harare.',
  }),
  createMapProviderSpotSeed({
    id: 'madrugada-lodge-campsite',
    name: 'Madrugada Lodge Campsite',
    region: 'Manicaland',
    weatherLocation: 'Mutare, Zimbabwe',
    aliases: ['Madrugada Campsite', 'Madrugada Lodge'],
    coordinates: { latitude: -19.0953, longitude: 32.7597 },
    kind: 'campsite',
    context: 'the Bvumba highlands south of Mutare',
  }),
  createMapProviderSpotSeed({
    id: 'hillside-golf-campsite',
    name: 'Campsite Hillside Golf',
    region: 'Manicaland',
    weatherLocation: 'Mutare, Zimbabwe',
    aliases: ['Hillside Golf Campsite'],
    coordinates: { latitude: -18.9565, longitude: 32.6699 },
    kind: 'campsite',
    context: 'Mutare near Jason Moyo Drive',
  }),
  createMapProviderSpotSeed({
    id: 'bushmaid-campsite',
    name: 'Bushmaid Campsite',
    region: 'Masvingo',
    weatherLocation: 'Masvingo, Zimbabwe',
    aliases: ['Bushmaid Camp'],
    coordinates: { latitude: -20.1964, longitude: 30.8765 },
    kind: 'campsite',
    context: 'Masvingo near the Great Zimbabwe route',
  }),
  createMapProviderSpotSeed({
    id: 'chinhoyi-cave-national-park-campsite',
    name: 'Chinhoyi Cave National Park Campsite',
    region: 'Mashonaland West',
    weatherLocation: 'Chinhoyi, Zimbabwe',
    aliases: ['Chinhoyi Caves Campsite', 'Chinhoyi Caves Recreational Park Campsite'],
    coordinates: { latitude: -17.357, longitude: 30.1307 },
    kind: 'campsite',
    context: 'Chinhoyi Caves Recreational Park',
  }),
  createMapProviderSpotSeed({
    id: 'orange-grove-motel-campsite',
    name: 'Orange Grove Motel Campsite',
    region: 'Mashonaland West',
    weatherLocation: 'Chinhoyi, Zimbabwe',
    aliases: ['Orange Grove Campsite'],
    coordinates: { latitude: -17.3579, longitude: 30.1861 },
    kind: 'campsite',
    context: 'Orange Grove outside Chinhoyi',
  }),
  createMapProviderSpotSeed({
    id: 'muzarazi-campsite',
    name: 'Muzarazi Campsite',
    region: 'Manicaland',
    weatherLocation: 'Nyanga, Zimbabwe',
    aliases: ['Mutarazi Campsite', 'Mtarazi Campsite', 'Mutarazi Skywalk Campsite'],
    coordinates: { latitude: -18.4792, longitude: 32.7932 },
    kind: 'campsite',
    context: 'the Mutarazi Falls and Skywalk area in Nyanga',
  }),
  createMapProviderSpotSeed({
    id: 'main-camp-campsite',
    name: 'Main Camp Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Hwange Main Camp Campsite', 'Main Camp'],
    coordinates: { latitude: -18.7324, longitude: 26.9522 },
    kind: 'campsite',
    context: 'Hwange National Park Main Camp',
  }),
  createMapProviderSpotSeed({
    id: 'great-zimbabwe-ruins-campsite',
    name: 'Campsite Great Zimbabwe Ruins',
    region: 'Masvingo',
    weatherLocation: 'Masvingo, Zimbabwe',
    aliases: ['Great Zimbabwe Ruins Campsite', 'Great Zimbabwe Campsite'],
    coordinates: { latitude: -20.2713, longitude: 30.9305 },
    kind: 'campsite',
    context: 'the Great Zimbabwe monument area near Masvingo',
  }),
  createMapProviderSpotSeed({
    id: 'chundu-campsite',
    name: 'Chundu Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Victoria Falls, Zimbabwe',
    aliases: ['Chundu Picnic Sites', 'Chundu Camp'],
    coordinates: { latitude: -17.8144, longitude: 25.6937 },
    kind: 'campsite',
    context: 'the Zambezi National Park corridor upstream of Victoria Falls',
  }),
  createMapProviderSpotSeed({
    id: 'robins-camp-campsite',
    name: 'Robins Camp Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Robins Camp campsite', 'Robins Camp'],
    coordinates: { latitude: -18.6297, longitude: 25.9881 },
    kind: 'campsite',
    context: 'the western Robins sector of Hwange National Park',
  }),
  createMapProviderSpotSeed({
    id: 'spring-lodge-waterfront-campsite',
    name: 'Spring Lodge Waterfront Chalets and Campsite',
    region: 'Mashonaland West',
    weatherLocation: 'Karoi, Zimbabwe',
    aliases: ['Spring Lodge Waterfront Campsite', 'Spring Lodge Chalets and Campsite'],
    coordinates: { latitude: -16.7669, longitude: 29.6718 },
    kind: 'campsite',
    context: 'the Hurungwe and Karoi route',
  }),
  createMapProviderSpotSeed({
    id: 'spring-lodge-campsite',
    name: 'Spring Lodge Campsite',
    region: 'Mashonaland West',
    weatherLocation: 'Karoi, Zimbabwe',
    aliases: ['Spring Lodge campsite'],
    coordinates: { latitude: -16.7918, longitude: 29.6511 },
    kind: 'campsite',
    context: 'the Hurungwe and Karoi route',
  }),
  createMapProviderSpotSeed({
    id: 'mandavu-dam-exclusive-campsite',
    name: 'Mandavu Dam Exclusive Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Mandavu Dam (Exclusive Campsite)', 'Mandavu Dam Campsite'],
    coordinates: { latitude: -18.6426, longitude: 26.2712 },
    kind: 'campsite',
    context: 'Mandavu Dam in northern Hwange National Park',
  }),
  createMapProviderSpotSeed({
    id: 'chitake-springs-campsite',
    name: 'Chitake Springs Campsite',
    region: 'Mashonaland West',
    weatherLocation: 'Kariba, Zimbabwe',
    aliases: ['Campsite Chitake Springs', 'Chitake Springs'],
    coordinates: { latitude: -16.1026, longitude: 29.4878 },
    kind: 'campsite',
    context: 'Mana Pools National Park and the Chitake Springs wilderness area',
  }),
  createMapProviderSpotSeed({
    id: 'maleme-dam-campsite',
    name: 'Maleme Dam Campsite',
    region: 'Matabeleland South',
    weatherLocation: 'Bulawayo, Zimbabwe',
    aliases: ['Maleme Campsite', 'Maleme Dam'],
    coordinates: { latitude: -20.5428, longitude: 28.5019 },
    kind: 'campsite',
    context: 'Matobo National Park near Maleme Dam',
  }),
  createMapProviderSpotSeed({
    id: 'shalom-campsite',
    name: 'Shalom Campsite',
    region: 'Matabeleland South',
    weatherLocation: 'Bulawayo, Zimbabwe',
    aliases: ['Shalom campsite'],
    coordinates: { latitude: -20.6879, longitude: 28.57 },
    kind: 'campsite',
    context: 'the Matobo district south of Bulawayo',
  }),
  createMapProviderSpotSeed({
    id: 'katshetsheti-campsite',
    name: 'Katshetsheti Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Katshetsheti Camp'],
    coordinates: { latitude: -18.2773, longitude: 25.7266 },
    kind: 'campsite',
    context: 'the western Hwange and Victoria Falls safari corridor',
  }),
  createMapProviderSpotSeed({
    id: 'worlds-view-campsite',
    name: 'Worlds View Campsite',
    region: 'Matabeleland South',
    weatherLocation: 'Bulawayo, Zimbabwe',
    aliases: ["World's View Campsite", 'Big Cave Camp Access Campsite'],
    coordinates: { latitude: -20.5023, longitude: 28.4265 },
    kind: 'campsite',
    context: 'the Big Cave and Matobo Hills area',
  }),
  createMapProviderSpotSeed({
    id: 'jambili-campsite',
    name: 'Jambili Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Jambile Picnic Site', 'Jambili Camp'],
    coordinates: { latitude: -18.923, longitude: 26.887 },
    kind: 'campsite',
    context: 'Hwange National Park near the Jambile picnic area',
  }),
  createMapProviderSpotSeed({
    id: 'track-shack-campsite',
    name: 'The Track Shack Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Track Shack Campsite', 'The Track Shack'],
    coordinates: { latitude: -18.6807, longitude: 26.9342 },
    kind: 'campsite',
    context: 'Dete on the Hwange gateway road',
  }),
  createMapProviderSpotSeed({
    id: 'masuma-dam-campsite',
    name: 'Masuma Dam Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Masuma Dam Campsite (exclusive camp)', 'Masuma Dam'],
    coordinates: { latitude: -18.7306, longitude: 26.2809 },
    kind: 'campsite',
    context: 'the Sinamatella sector of Hwange National Park',
  }),
  createMapProviderSpotSeed({
    id: 'insiza-campsite',
    name: 'Insiza Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Insiza Pan Campsite', 'Insiza Pan'],
    coordinates: { latitude: -18.3301, longitude: 25.5212 },
    kind: 'campsite',
    context: 'the western Hwange wilderness',
  }),
  createMapProviderSpotSeed({
    id: 'sian-simba-campsite',
    name: 'Sian Simba Campsite',
    region: 'Matabeleland North',
    weatherLocation: 'Victoria Falls, Zimbabwe',
    aliases: ['Sian Simba Camp'],
    coordinates: { latitude: -17.8437, longitude: 25.6144 },
    kind: 'campsite',
    context: 'the Zambezi National Park and Victoria Falls safari corridor',
  }),
  createMapProviderSpotSeed({
    id: 'gwango-campsite',
    name: 'Campsite Gwango',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Gwango Campsite', 'Gwango'],
    coordinates: { latitude: -18.678, longitude: 26.9391 },
    kind: 'campsite',
    context: 'Dete on the Hwange gateway road',
  }),
  createMapProviderSpotSeed({
    id: 'norma-jeane-campsite',
    name: 'Norma Jeane Campsite',
    region: 'Masvingo',
    weatherLocation: 'Masvingo, Zimbabwe',
    aliases: ['Norma Jeane Camp', 'Norma Jeane Lakeview Resort Campsite'],
    coordinates: { latitude: -20.2514, longitude: 31.0018 },
    kind: 'campsite',
    context: 'the Lake Mutirikwi and Great Zimbabwe area',
  }),
  createMapProviderSpotSeed({
    id: 'chitove-exclusive-campsite',
    name: 'Chitove Exclusive Campsite',
    region: 'Masvingo',
    weatherLocation: 'Chiredzi, Zimbabwe',
    aliases: ['Chitove Campsite', 'Chitove Access'],
    coordinates: { latitude: -21.3085, longitude: 32.2689 },
    kind: 'campsite',
    context: 'Gonarezhou National Park near Chitove',
  }),
  createMapProviderSpotSeed({
    id: 'botanic-garden-campsite-caravan-park',
    name: 'Botanic Garden Campsite and Caravan Park',
    region: 'Manicaland',
    weatherLocation: 'Mutare, Zimbabwe',
    aliases: ['Botanic Garden Campsite & Caravan Park', 'Vumba Botanic Garden Campsite'],
    coordinates: { latitude: -19.1138, longitude: 32.7833 },
    kind: 'campsite',
    context: 'the Bvumba botanical gardens area',
  }),
  createMapProviderSpotSeed({
    id: 'chimanimani-corner-campsite',
    name: 'The Corner Campsite',
    region: 'Manicaland',
    weatherLocation: 'Chimanimani, Zimbabwe',
    aliases: ['Chimanimani National Park, The Corner, campsite', 'Chimanimani Corner Campsite'],
    coordinates: { latitude: -19.7017, longitude: 32.9611 },
    kind: 'campsite',
    context: 'Chimanimani National Park',
  }),
  createMapProviderSpotSeed({
    id: 'bhenji-weir-exclusive-campsite',
    name: 'Bhenji Weir Exclusive Campsite',
    region: 'Masvingo',
    weatherLocation: 'Chiredzi, Zimbabwe',
    aliases: ['Bhenji Weir Exclisuve Campsite', 'Bhenji Weir Campsite'],
    coordinates: { latitude: -21.4415, longitude: 31.9239 },
    kind: 'campsite',
    context: 'Gonarezhou National Park near the Runde River system',
  }),
  createMapProviderSpotSeed({
    id: 'lake-mutirikwi-campsite',
    name: 'Lake Mutirikwi Campsite',
    region: 'Masvingo',
    weatherLocation: 'Masvingo, Zimbabwe',
    aliases: ['Lake Kyle Campsite', 'Mutirikwi Campsite'],
    coordinates: { latitude: -20.2195, longitude: 31.0037 },
    kind: 'campsite',
    context: 'Lake Mutirikwi Recreational Park',
  }),
  createMapProviderSpotSeed({
    id: 'shannah-campsite',
    name: 'Campsite Shannah',
    region: 'Mashonaland West',
    weatherLocation: 'Chinhoyi, Zimbabwe',
    aliases: ['Shannah Campsite', 'Camp Shannah'],
    coordinates: { latitude: -17.1849, longitude: 29.9723 },
    kind: 'campsite',
    context: 'the Makonde and Chinhoyi route',
  }),
  createMapProviderSpotSeed({
    id: 'shebakwe-campsite',
    name: 'Shebakwe Campsite',
    region: 'Midlands',
    weatherLocation: 'Kwekwe, Zimbabwe',
    aliases: ['Sebakwe Campsite', 'Shebakwe Camp Site'],
    coordinates: { latitude: -18.975, longitude: 30.1097 },
    kind: 'campsite',
    context: 'the Kwekwe to Mvuma road corridor',
  }),
  createMapProviderSpotSeed({
    id: 'ngezi-recreational-park-campsites',
    name: 'Ngezi Recreational Park Campsites',
    region: 'Mashonaland West',
    weatherLocation: 'Kadoma, Zimbabwe',
    aliases: [
      'Caravanpark Ngezi Recreational Park',
      'Campsite #3',
      'Campsite #4',
      'Campsite #5',
      'Campsite #6',
      'Campsite #7',
    ],
    coordinates: { latitude: -18.7123, longitude: 30.3892 },
    kind: 'campsite',
    context: 'Ngezi Recreational Park near Kadoma',
  }),
  createMapProviderSpotSeed({
    id: 'rengwe-conservancy-campsite',
    name: 'Rengwe Conservancy Campsite',
    region: 'Mashonaland West',
    weatherLocation: 'Kariba, Zimbabwe',
    aliases: ['Rengwe Campsite', 'Rengwe Conservancy'],
    coordinates: { latitude: -17.1104, longitude: 28.9234 },
    kind: 'campsite',
    context: 'the Hurungwe and Zambezi Valley conservation corridor',
  }),
  createMapProviderSpotSeed({
    id: 'jenje-wilderness-campsite',
    name: 'Jenje Wilderness Campsite',
    region: 'Mashonaland West',
    weatherLocation: 'Kariba, Zimbabwe',
    aliases: ['Jenje Campsite', 'Sanyati West Camp access'],
    coordinates: { latitude: -16.8409, longitude: 28.5829 },
    kind: 'campsite',
    context: 'the Lake Kariba and Sanyati west wilderness route',
  }),
  createMapProviderSpotSeed({
    id: 'afm-national-conference-centre',
    name: 'AFM in Zimbabwe National Conference Centre',
    region: 'Masvingo',
    weatherLocation: 'Gutu, Zimbabwe',
    aliases: ['AFM National Conference Centre', 'Rufaro Mission Camp Site'],
    coordinates: { latitude: -19.5969, longitude: 30.825 },
    kind: 'camp',
    context: 'Rufaro Mission in Gutu',
  }),
  createMapProviderSpotSeed({
    id: 'linos-camp-site',
    name: 'Linos Camp Site',
    region: 'Mashonaland West',
    weatherLocation: 'Kariba, Zimbabwe',
    aliases: ['Linos Campsite', 'Linos Camp'],
    coordinates: { latitude: -16.5329, longitude: 28.7672 },
    kind: 'campsite',
    context: 'Kariba town near Hotel Road',
  }),
  createMapProviderSpotSeed({
    id: 'kennedy-camp-site',
    name: 'Kennedy Camp Site',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Kennedy Campsite', 'Kennedy Camp'],
    coordinates: { latitude: -18.8691, longitude: 27.1412 },
    kind: 'campsite',
    context: 'Hwange National Park',
  }),
  createMapProviderSpotSeed({
    id: 'chilojo-camp-site-2',
    name: 'Chilojo Camp Site 2',
    region: 'Masvingo',
    weatherLocation: 'Chiredzi, Zimbabwe',
    aliases: ['chilojo camp site 2', 'Chilojo Campsite 2'],
    coordinates: { latitude: -21.4368, longitude: 32.0914 },
    kind: 'campsite',
    context: 'Gonarezhou National Park near the Chilojo Cliffs',
  }),
  createMapProviderSpotSeed({
    id: 'big-cave-camp-site-ndebele-village',
    name: 'Big Cave Camp Site and Ndebele Village',
    region: 'Matabeleland South',
    weatherLocation: 'Bulawayo, Zimbabwe',
    aliases: ['Big Cave Camp Site & Ndebele Village', 'Big Cave Campsite', 'Big Cave Camp'],
    coordinates: { latitude: -20.5049, longitude: 28.4415 },
    kind: 'campsite',
    context: 'the Matobo Hills and Big Cave area',
  }),
  createMapProviderSpotSeed({
    id: 'city-of-bulawayo-caravan-park',
    name: 'City of Bulawayo Caravan Park',
    region: 'Bulawayo',
    weatherLocation: 'Bulawayo, Zimbabwe',
    aliases: ['Bulawayo Caravan Park', 'City Caravan Park'],
    coordinates: { latitude: -20.1585, longitude: 28.5938 },
    kind: 'campsite',
    context: 'central Bulawayo',
  }),
  createMapProviderSpotSeed({
    id: 'nyamepi-camping-site',
    name: 'Nyamepi Camping Site',
    region: 'Mashonaland West',
    weatherLocation: 'Kariba, Zimbabwe',
    aliases: ['Nyamepi Camp Site', 'Nyamepi Camp', 'Mana Pools Nyamepi'],
    coordinates: { latitude: -15.7201, longitude: 29.3664 },
    kind: 'campsite',
    context: 'Mana Pools National Park on the Zambezi floodplain',
  }),
  createMapProviderSpotSeed({
    id: 'nyakasanga-fishing-camp',
    name: 'Nyakasanga Fishing Camp',
    region: 'Mashonaland West',
    weatherLocation: 'Kariba, Zimbabwe',
    aliases: ['Nyakasanga Fishing camp', 'Nyakasanga Camp'],
    coordinates: { latitude: -15.8684, longitude: 29.1009 },
    kind: 'camp',
    context: 'the Nyakasanga and Mana Pools fishing corridor',
  }),
  createMapProviderSpotSeed({
    id: 'ngweshla-camp',
    name: 'Ngweshla Camp',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Ngweshla Camp (Exclusive Camp)', 'Ngweshla'],
    coordinates: { latitude: -19.0257, longitude: 27.1066 },
    kind: 'camp',
    context: 'Hwange National Park near Ngweshla Pan',
  }),
  createMapProviderSpotSeed({
    id: 'deteema-dam-camp',
    name: 'Deteema Dam Camp',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Deteema Dam Camp (exclusiv Camp)', 'Deteema Dam Exclusive Camp'],
    coordinates: { latitude: -18.6737, longitude: 26.1466 },
    kind: 'camp',
    context: 'the Sinamatella and western Hwange dam network',
  }),
  createMapProviderSpotSeed({
    id: 'shumba-camp',
    name: 'Shumba Camp',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Shumba Camp (exclusive camp)', 'Shumba'],
    coordinates: { latitude: -18.8093, longitude: 26.3473 },
    kind: 'camp',
    context: 'Hwange National Park',
  }),
  createMapProviderSpotSeed({
    id: 'tuskers-camp',
    name: 'Tuskers Camp',
    region: 'Matabeleland North',
    weatherLocation: 'Hwange, Zimbabwe',
    aliases: ['Tuskers Camp Ivory Lodge', 'Ivory Lodge Tuskers Camp'],
    coordinates: { latitude: -18.6172, longitude: 27.0582 },
    kind: 'camp',
    context: 'the Dete and Hwange gateway area',
  }),
  createMapProviderSpotSeed({
    id: 'warthogs-bush-camp',
    name: 'Warthogs Bush Camp',
    region: 'Mashonaland West',
    weatherLocation: 'Kariba, Zimbabwe',
    aliases: ['Warthogs Bush Camp Kariba', 'Warthogs Camp'],
    coordinates: { latitude: -16.529, longitude: 28.8305 },
    kind: 'camp',
    context: 'Kariba town and the Lake Kariba shoreline',
  }),
  createMapProviderSpotSeed({
    id: 'burkes-paradise',
    name: "Burkes' Paradise",
    region: 'Matabeleland South',
    weatherLocation: 'Bulawayo, Zimbabwe',
    aliases: ["Burkes' Paradise Campsite", 'Burkes Paradise'],
    coordinates: { latitude: -20.2143, longitude: 28.6012 },
    kind: 'campsite',
    context: 'the Matobo and Bulawayo southern approaches',
  }),
];

const ZIMBABWE_PROVINCES = [
  'Bulawayo',
  'Harare',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
] as const;

const ATLAS_TOWN_CITY_NAMES = new Set([
  'Beitbridge',
  'Binga',
  'Bindura',
  'Bulawayo',
  'Chegutu',
  'Chimanimani',
  'Chinhoyi',
  'Chipinge',
  'Chiredzi',
  'Gokwe',
  'Guruve',
  'Gutu',
  'Gwanda',
  'Gweru',
  'Harare',
  'Hwange',
  'Kadoma',
  'Kariba',
  'Karoi',
  'Kwekwe',
  'Marondera',
  'Masvingo',
  'Mutare',
  'Nyanga',
  'Plumtree',
  'Rusape',
  'Victoria Falls',
  'Zvishavane',
]);

const ZIMBABWE_OVERVIEW_SIGHTINGS: WildlifeSightingItem[] = ALL_ZIMBABWE_SIGHTINGS;

const ZIMBABWE_MAP_OVERVIEW: MapOverviewInfo = {
  title: 'Zimbabwe',
  regionLabel: 'All provinces',
  image: DEFAULT_ATLAS_IMAGE,
  footerLabel: 'Country guide',
  description:
    "Zimbabwe is a landlocked country in southern Africa shaped by the Zambezi River to the north and the Limpopo to the south. It holds some of the continent's most remarkable landscapes — Victoria Falls, the Mana Pools floodplains, Hwange's elephant herds, Matobo's ancient rock art, the ruins of Great Zimbabwe and the mist-covered peaks of the Eastern Highlands. From vast safari wilderness to granite hill country, sugar lowveld and warm mid-sized cities, Zimbabwe packs exceptional variety into a single journey.",
  sightings: ZIMBABWE_OVERVIEW_SIGHTINGS,
};

const PROVINCE_MAP_OVERVIEWS: Record<(typeof ZIMBABWE_PROVINCES)[number], MapOverviewInfo> = {
  Bulawayo: {
    title: 'Bulawayo',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Urban heritage and nearby wildlife',
    description:
      "Bulawayo is Zimbabwe's second city and a strong base for museums, galleries, Khami Ruins, railway heritage and day trips toward Matobo country. The city mixes Ndebele history, wide avenues and accessible wildlife stops on the southern edge of town.",
    sightings: wildlifeItems('Giraffe', 'Zebra', 'Sable antelope', 'Wildebeest', 'Eland'),
  },
  Harare: {
    title: 'Harare',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Capital green spaces',
    description:
      'Harare is the capital and a natural starting point for galleries, markets, gardens, city walks and nearby nature reserves. Its green spaces, wetlands and wildlife sanctuaries give visitors a softer introduction before longer road trips across Zimbabwe.',
    sightings: wildlifeItems(
      'Elephant',
      'Rhino',
      'Giraffe',
      'Zebra',
      'Sable antelope',
      'Wildebeest',
      'Eland',
      'Crocodile'
    ),
  },
  Manicaland: {
    title: 'Manicaland',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Highlands, forests and rivers',
    description:
      "Manicaland is Zimbabwe's mountain province, covering Nyanga, Vumba, Chimanimani, Mutare, waterfalls, forests, tea estates and eastern river valleys. It is best known for hiking, cool weather, scenic drives and dramatic borderland landscapes.",
    sightings: wildlifeItems(
      'Elephant',
      'Buffalo',
      'Leopard',
      'Sable antelope',
      'Eland',
      'Hippo',
      'Crocodile'
    ),
  },
  'Mashonaland Central': {
    title: 'Mashonaland Central',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Escarpment and northern safari routes',
    description:
      'Mashonaland Central stretches from Bindura and Mazowe into Mavuradonha, Guruve, Mbire and the Zambezi escarpment. It is a strong province for wilderness routes, safari areas, dams and rugged northern landscapes.',
    sightings: wildlifeItems(
      'Elephant',
      'Buffalo',
      'Lion',
      'Leopard',
      'Wild dog',
      'Sable antelope',
      'Eland',
      'Hippo',
      'Crocodile'
    ),
  },
  'Mashonaland East': {
    title: 'Mashonaland East',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Granite hills and conservation stops',
    description:
      'Mashonaland East links Marondera, Goromonzi, Domboshava, Murehwa and Mutoko with granite hills, rural markets, botanical gardens and conservation estates. It works well for short trips from Harare and quieter heritage stops.',
    sightings: wildlifeItems('Rhino', 'Giraffe', 'Zebra', 'Sable antelope', 'Wildebeest', 'Eland'),
  },
  'Mashonaland West': {
    title: 'Mashonaland West',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Kariba, Mana Pools and the Zambezi Valley',
    description:
      "Mashonaland West carries some of Zimbabwe's biggest water and safari landscapes, from Lake Kariba and Matusadona to Mana Pools, Sapi, Chewore, Chinhoyi and the Zambezi escarpment. It is one of the country's richest wildlife and lake-travel corridors.",
    sightings: wildlifeItems(
      'Elephant',
      'Buffalo',
      'Lion',
      'Leopard',
      'Wild dog',
      'Spotted Hyena',
      'Hippo',
      'Crocodile',
      'Zebra',
      'Sable antelope',
      'Eland'
    ),
  },
  Masvingo: {
    title: 'Masvingo',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Heritage, lowveld and Gonarezhou',
    description:
      'Masvingo combines Great Zimbabwe, Lake Mutirikwi, Tokwe-Mukorsi, Chiredzi, Save Valley, Malilangwe and Gonarezhou. It is one of the best province filters for mixing ancient stone heritage with serious lowveld wildlife.',
    sightings: wildlifeItems(
      'Elephant',
      'Buffalo',
      'Lion',
      'Leopard',
      'Cheetah',
      'Wild dog',
      'Spotted Hyena',
      'Hippo',
      'Crocodile',
      'Rhino',
      'Giraffe',
      'Zebra',
      'Sable antelope',
      'Wildebeest',
      'Eland'
    ),
  },
  'Matabeleland North': {
    title: 'Matabeleland North',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Falls, Hwange and western wilderness',
    description:
      "Matabeleland North covers Victoria Falls, Hwange, Binga, Chizarira, Matetsi, Zambezi National Park and the western Lake Kariba shoreline. It is Zimbabwe's classic big-safari and adventure province.",
    sightings: wildlifeItems(
      'Elephant',
      'Buffalo',
      'Lion',
      'Leopard',
      'Cheetah',
      'Wild dog',
      'Spotted Hyena',
      'Hippo',
      'Crocodile',
      'Giraffe',
      'Zebra',
      'Sable antelope',
      'Wildebeest',
      'Eland',
      'Aardvark'
    ),
  },
  'Matabeleland South': {
    title: 'Matabeleland South',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Matobo, Tuli and southern lowveld',
    description:
      'Matabeleland South brings together Matobo, Gwanda, Plumtree, Beitbridge, Tuli and the Limpopo corridor. The province is known for rock art, rhino country, dry savanna and borderland safari landscapes.',
    sightings: wildlifeItems(
      'Elephant',
      'Buffalo',
      'Lion',
      'Leopard',
      'Cheetah',
      'Wild dog',
      'Spotted Hyena',
      'Brown Hyena',
      'Rhino',
      'Giraffe',
      'Zebra',
      'Sable antelope',
      'Wildebeest',
      'Eland',
      'Crocodile'
    ),
  },
  Midlands: {
    title: 'Midlands',
    regionLabel: 'Province guide',
    image: DEFAULT_ATLAS_IMAGE,
    footerLabel: 'Central towns and wildlife stops',
    description:
      'Midlands sits at the centre of Zimbabwe, linking Gweru, Kwekwe, Shurugwi, Zvishavane, Gokwe and the Sebakwe and Munyati catchments. It is useful for road-trip stopovers, museums, ruins, dams and accessible wildlife activities.',
    sightings: wildlifeItems(
      'Elephant',
      'Buffalo',
      'Lion',
      'Leopard',
      'Wild dog',
      'Spotted Hyena',
      'Giraffe',
      'Zebra',
      'Sable antelope',
      'Wildebeest',
      'Eland',
      'Hippo',
      'Crocodile'
    ),
  },
};

const PROVINCE_ALIASES: Record<string, (typeof ZIMBABWE_PROVINCES)[number]> = {
  'Bulawayo Metropolitan': 'Bulawayo',
  'Harare Metropolitan': 'Harare',
};

function isZimbabweProvince(value: string): value is (typeof ZIMBABWE_PROVINCES)[number] {
  return (ZIMBABWE_PROVINCES as readonly string[]).includes(value);
}

function normalizeProvince(region: string): string {
  return PROVINCE_ALIASES[region] ?? region;
}

function normalizePhraseValue(value: string) {
  return value.trim().toLowerCase();
}

function getLanguagePopularityRank(language: string) {
  return LANGUAGE_POPULARITY_RANK[language] ?? Number.MAX_SAFE_INTEGER;
}

function getLanguagePhraseOptions(spot: AtlasSpot): LanguagePhrase[] {
  const phrases = REGION_LANGUAGE_PHRASES[spot.region] ?? [];
  const seenLanguages = new Set([normalizePhraseValue(spot.language)]);
  const seenPhrases = new Set([normalizePhraseValue(spot.phrase)]);

  return [...phrases]
    .sort(
      (a, b) =>
        getLanguagePopularityRank(a.language) - getLanguagePopularityRank(b.language) ||
        a.language.localeCompare(b.language)
    )
    .filter(item => {
      const languageKey = normalizePhraseValue(item.language);
      const phraseKey = normalizePhraseValue(item.phrase);

      if (seenLanguages.has(languageKey) || seenPhrases.has(phraseKey)) {
        return false;
      }

      seenLanguages.add(languageKey);
      seenPhrases.add(phraseKey);
      return true;
    });
}

function createAtlasSpot(seed: AtlasSpotSeed): AtlasSpot {
  const region = normalizeProvince(seed.region);

  return {
    ...seed,
    region,
    image: seed.image ?? DEFAULT_ATLAS_IMAGE,
    eventLocationAliases: seed.eventLocationAliases ?? [seed.name],
    aiPrompt: `AI turns creator clips around ${seed.name} into a virtual preview with map context, best timing, local tips, and trip ideas.`,
    lessons: [
      {
        id: `${seed.id}-lesson-1`,
        title: `${seed.language} greetings for ${seed.name}`,
        creator: `${seed.creator} language desk`,
        duration: '02:45',
      },
      {
        id: `${seed.id}-lesson-2`,
        title: 'Visitor phrases for first arrivals',
        creator: seed.creator,
        duration: '03:30',
      },
    ],
  };
}

function getForecastIconName(iconName?: string): ComponentProps<typeof Ionicons>['name'] {
  switch (iconName) {
    case 'sunny-outline':
    case 'moon-outline':
    case 'partly-sunny-outline':
    case 'cloudy-outline':
    case 'cloud-outline':
    case 'thunderstorm-outline':
    case 'snow-outline':
    case 'rainy-outline':
      return iconName;
    default:
      return 'partly-sunny-outline';
  }
}

function normalizeLocationSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/,\s*zimbabwe\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function spotMatchesLocationSearch(spot: AtlasSpot, searchTerms: string[]) {
  if (searchTerms.length === 0) {
    return true;
  }

  const searchableValues = [
    spot.name,
    spot.region,
    spot.weatherLocation,
    ...spot.eventLocationAliases,
  ].map(normalizeLocationSearchValue);

  return searchTerms.every(term => searchableValues.some(value => value.includes(term)));
}

function buildLocationScope(spots: AtlasSpot[], includeAliases = true) {
  const values = spots.flatMap(spot =>
    includeAliases ? [spot.name, ...spot.eventLocationAliases] : [spot.name]
  );

  return Array.from(new Set(values.map(normalizeLocationSearchValue).filter(Boolean)));
}

function getWeatherLocationForSpot(spot: AtlasSpot) {
  if (ATLAS_TOWN_CITY_NAMES.has(spot.name)) {
    return `${spot.name}, Zimbabwe`;
  }

  return spot.weatherLocation;
}

function buildGalleryImagesForScope(spots: AtlasSpot[], fallbackImage: string) {
  const images = spots.map(spot => spot.image).filter((image): image is string => Boolean(image));
  const uniqueImages = Array.from(new Set(images));

  return (uniqueImages.length > 0 ? uniqueImages : [fallbackImage]).slice(0, 24);
}

function itemMatchesLocationScope(itemLocation: string, scopeLocations: string[]) {
  const location = normalizeLocationSearchValue(itemLocation);

  return scopeLocations.some(scope => scope.includes(location) || location.includes(scope));
}

function buildZimbabweMapHtml(spots: AtlasSpot[], activeSpotId: string, isDark: boolean) {
  const markerPayload = spots.map(spot => ({
    id: spot.id,
    name: spot.name,
    region: spot.region,
    uploads: spot.uploads,
    liveSignal: spot.liveSignal,
    latitude: spot.coordinates.latitude,
    longitude: spot.coordinates.longitude,
    initial: spot.name.charAt(0),
  }));
  const encodedSpots = JSON.stringify(markerPayload).replace(/</g, '\\u003c');
  const encodedActiveSpotId = JSON.stringify(activeSpotId).replace(/</g, '\\u003c');
  const tileFilter = isDark
    ? 'saturate(0.75) brightness(0.72) contrast(1.18)'
    : 'saturate(0.98) contrast(1.03)';
  const mapBackground = isDark ? '#101820' : '#eef3ea';
  const panelBackground = isDark ? 'rgba(8, 17, 16, 0.82)' : 'rgba(255, 255, 255, 0.88)';
  const panelText = isDark ? '#f5f5f7' : '#1f1f1f';
  const inactiveMarker = isDark ? '#101820' : '#ffffff';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: ${mapBackground};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .leaflet-container {
        background: ${mapBackground};
      }
      .leaflet-tile {
        filter: ${tileFilter};
      }
      .leaflet-control-zoom {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        padding: 0 !important;
      }
      .leaflet-control-zoom-in,
      .leaflet-control-zoom-out {
        width: 40px !important;
        height: 40px !important;
        min-height: 40px !important;
        line-height: 40px !important;
        border: none !important;
        border-bottom: none !important;
        border-radius: 50% !important;
        margin: 0 !important;
        padding: 0 !important;
        color: ${panelText} !important;
        background: ${panelBackground} !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.28) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        font-size: 20px !important;
        font-weight: 400 !important;
        text-decoration: none !important;
      }
      .leaflet-control-zoom-in:hover,
      .leaflet-control-zoom-out:hover {
        background: ${panelBackground} !important;
        border-bottom: none !important;
      }
      .off2zim-marker {
        background: transparent;
        border: 0;
        overflow: visible !important;
      }
      .map-marker {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        width: 28px;
      }
      .pin-svg {
        width: 28px;
        height: 36px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
        transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), filter 0.2s ease;
      }
      .map-marker.is-active .pin-svg {
        transform: scale(1.25);
        filter: drop-shadow(0 4px 10px rgba(255,59,48,0.45));
      }
      .pin-label {
        position: absolute;
        top: 40px;
        left: 50%;
        transform: translateX(-50%) scale(0.75);
        white-space: nowrap;
        padding: 4px 10px;
        border-radius: 999px;
        color: ${panelText};
        background: ${panelBackground};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 11px;
        font-weight: 700;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
      }
      .pin-label.visible {
        opacity: 1;
        transform: translateX(-50%) scale(1);
        background: #FFFFFF;
        color: #ff3b30;
        animation: pill-pulse 1.5s ease-out infinite;
      }
      @keyframes pill-pulse {
        0%   { box-shadow: 0 0 0 0px rgba(255,59,48,0.75); }
        100% { box-shadow: 0 0 0 10px rgba(255,59,48,0); }
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        if (!window.L) {
          return;
        }

        var spots = ${encodedSpots};
        var activeSpotId = ${encodedActiveSpotId};
        var zimbabweBounds = L.latLngBounds([[-22.45, 25.12], [-15.55, 33.15]]);
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          maxBounds: zimbabweBounds.pad(0.08),
          maxBoundsViscosity: 1,
          minZoom: 6,
          maxZoom: 13
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          detectRetina: true,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        window._leafletMap = map;
        window._markers = {};
        window._zimbabweBounds = zimbabweBounds;
        map.fitBounds(zimbabweBounds, { padding: [14, 14], animate: false });
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        var openLabel = null;

        spots.forEach(function (spot) {
          var isActive = spot.id === activeSpotId;
          var pinColor = isActive ? '#ff3b30' : '#8E8E93';
          var markerHtml =
            '<div class="map-marker' + (isActive ? ' is-active' : '') + '" id="mpin-' + spot.id + '">' +
              '<svg class="pin-svg" viewBox="0 0 24 24" fill="' + pinColor + '" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' +
              '</svg>' +
              '<div class="pin-label' + (isActive ? ' visible' : '') + '">' + spot.name + '</div>' +
            '</div>';

          var marker = L.marker([spot.latitude, spot.longitude], {
            icon: L.divIcon({
              className: 'off2zim-marker',
              html: markerHtml,
              iconSize: [28, 36],
              iconAnchor: [14, 36]
            }),
            riseOnHover: true
          }).addTo(map);
          window._markers[spot.id] = { marker: marker, region: spot.region };

          marker.on('click', function () {
            var el = document.getElementById('mpin-' + spot.id);
            var label = el ? el.querySelector('.pin-label') : null;
            if (openLabel && openLabel !== label) {
              openLabel.classList.remove('visible');
            }
            if (label) {
              label.classList.add('visible');
              openLabel = label;
            }
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'selectSpot',
                id: spot.id
              }));
            }
          });

          if (isActive) {
            marker.setZIndexOffset(1000);
          }
        });

        map.on('drag', function () {
          map.panInsideBounds(zimbabweBounds, { animate: false });
        });

        map.whenReady(function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
          }
        });

      })();
    </script>
  </body>
</html>`;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);
const STORY_SLIDE_DURATION = 4500;
const { width: screenWidth } = Dimensions.get('window');
const SCREEN_HORIZONTAL_PADDING = responsiveSize(16, 14, 20);
const TITLE_BOTTOM_PADDING = responsiveSize(8, 6, 10);
const GALLERY_CARD_GAP = 4;
const GALLERY_CONTAINER_PADDING = 8;
const FEATURED_DESTINATION_HORIZONTAL_PADDING = responsiveSize(16);
const FEATURED_DESTINATION_CARD_SPACING = responsiveSize(16);
const FEATURED_DESTINATION_CARD_WIDTH =
  (screenWidth - FEATURED_DESTINATION_HORIZONTAL_PADDING * 2 - FEATURED_DESTINATION_CARD_SPACING) /
  2;
const FEATURED_DESTINATION_CARD_HEIGHT = responsiveSize(200, 176, 224);
const FEATURED_DESTINATION_CARD_RADIUS = responsiveSize(12, 10, 16);
const FEATURED_DESTINATION_CARD_INSET = responsiveSize(10, 8, 12);
const FEATURED_DESTINATION_OVERLAY_PADDING = responsiveSize(8, 7, 10);
const FEATURED_DESTINATION_ACTION_SIZE = responsiveSize(36, 32, 42);
const EXPLORE_SECTION_GAP = responsiveSize(16, 14, 18);

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

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

  const atlasSpots = useMemo<AtlasSpot[]>(
    () => [
      createAtlasSpot({
        id: 'binga',
        name: 'Binga',
        region: 'Matabeleland North',
        weatherLocation: 'Binga, Zimbabwe',
        coordinates: { latitude: -17.6203, longitude: 27.3414 },
        creator: 'Kariba Voyager',
        uploads: '104 tagged clips',
        liveSignal: 'Lake shore clips',
        description:
          'Binga sits on Lake Kariba and is known for Tonga culture, fishing, hot springs and wide lake sunsets. The area is an important centre of Tonga heritage, with craft, music and lakeside storytelling shaping many visits.',
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bulawayo',
        name: 'Bulawayo',
        region: 'Bulawayo',
        weatherLocation: 'Bulawayo, Zimbabwe',
        coordinates: { latitude: -20.1561, longitude: 28.5887 },
        creator: 'City of Kings Creators',
        uploads: '286 tagged clips',
        liveSignal: 'City walk active',
        description:
          "Bulawayo is Zimbabwe's second-largest city, popular for wide heritage avenues, museums, galleries and easy Matobo day trips. Its City of Kings identity connects visitors with Ndebele history, architecture and nearby heritage routes.",
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'chinhoyi-caves',
        name: 'Chinhoyi Caves',
        region: 'Mashonaland West',
        weatherLocation: 'Chinhoyi, Zimbabwe',
        eventLocationAliases: [
          'Chinhoyi Caves',
          'Chinhoyi Caves Recreational Park',
          'Chinhoyi Cave National Park Campsite',
          'Camp site accomodation',
          'Chinhoyi',
        ],
        coordinates: { latitude: -17.3571, longitude: 30.129 },
        creator: 'Caves & Karst Collective',
        uploads: '132 tagged clips',
        liveSignal: 'Pool depth clips',
        description:
          'Chinhoyi Caves are famous for the Sleeping Pool, a deep cobalt-blue limestone cavern loved by divers and photographers. The site is also known as Chirorodziva in local history.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chimanimani',
        name: 'Chimanimani',
        region: 'Manicaland',
        weatherLocation: 'Chimanimani, Zimbabwe',
        coordinates: { latitude: -19.8, longitude: 32.8667 },
        creator: 'Highlands Collective',
        uploads: '189 tagged clips',
        liveSignal: 'Trail clips active',
        description:
          'Chimanimani is a rugged mountain escape known for quartzite peaks, waterfalls, caves and serious hiking. The range forms part of the Zimbabwe-Mozambique border and supports old cross-border communities.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'eastern-highlands',
        name: 'Eastern Highlands',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Eastern Highlands', 'Mutare', 'Nyanga', 'Vumba'],
        coordinates: { latitude: -18.1783, longitude: 32.7459 },
        creator: 'Eastern Highlands Collective',
        uploads: '207 tagged clips',
        liveSignal: 'Mist trail active',
        description:
          "The Eastern Highlands are a cool chain of mountains known for tea estates, waterfalls, forests and scenic viewpoints. They bring together Nyanga, Vumba and Chimanimani into Zimbabwe's misty upland route.",
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'gonarezhou',
        name: 'Gonarezhou',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Gonarezhou', 'Chiredzi'],
        coordinates: { latitude: -21.6815, longitude: 31.8347 },
        creator: 'Lowveld Wild Guides',
        uploads: '218 tagged clips',
        liveSignal: 'Chilojo Cliffs watch',
        description:
          "Gonarezhou is famous for elephants, baobabs and the red Chilojo Cliffs above the Runde River. Its name is commonly translated as 'place of many elephants,' which still fits the wild Lowveld setting.",
        language: 'Shangani',
        phrase: 'Avuxeni',
        translation: 'Good morning.',
      }),
      createAtlasSpot({
        id: 'great-zimbabwe',
        name: 'Great Zimbabwe',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Great Zimbabwe', 'Masvingo'],
        coordinates: { latitude: -20.2675, longitude: 30.9338 },
        creator: 'Heritage Guides',
        uploads: '143 tagged clips',
        liveSignal: 'Heritage route',
        description:
          'Great Zimbabwe is the stone-built capital of a medieval Shona kingdom and a UNESCO World Heritage Site. The Great Enclosure and Hill Complex show the trading power that gave Zimbabwe its name.',
        language: 'Karanga Shona',
        phrase: 'Tatenda',
        translation: 'Thank you.',
      }),
      createAtlasSpot({
        id: 'harare',
        name: 'Harare',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        coordinates: { latitude: -17.8252, longitude: 31.0335 },
        creator: 'Urban Pulse Tours',
        uploads: '322 tagged clips',
        liveSignal: 'Creator walk live',
        description:
          "Harare is Zimbabwe's capital, known for galleries, jacaranda-lined avenues, markets, cafes and nightlife. The city is a strong first stop for orientation, contemporary Zimbabwean culture and creative urban life.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'hwange-national-park',
        name: 'Hwange National Park',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: ['Hwange National Park', 'Hwange'],
        coordinates: { latitude: -19.189, longitude: 26.7401 },
        creator: 'Savanna Trails',
        uploads: '391 tagged clips',
        liveSignal: 'Waterhole watch',
        description:
          "Hwange is Zimbabwe's largest national park, famous for huge elephant herds, waterhole game viewing and classic safari camps. It is one of Southern Africa's major wildlife areas, with diverse habitats across woodland, pans and grassland.",
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'kariba',
        name: 'Kariba',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        coordinates: { latitude: -16.5273, longitude: 28.7755 },
        creator: 'Kariba Voyager',
        uploads: '176 tagged clips',
        liveSignal: 'Sunset deck live',
        description:
          "Kariba is known for houseboats, tiger fishing, lake sunsets and wildlife along Lake Kariba's shoreline. The lake was created by the Kariba Dam in the late 1950s and remains one of Africa's major reservoirs.",
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'khami-ruins',
        name: 'Khami Ruins',
        region: 'Bulawayo',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Khami Ruins', 'Bulawayo'],
        coordinates: { latitude: -20.1442, longitude: 28.4233 },
        creator: 'Heritage Guides',
        uploads: '98 tagged clips',
        liveSignal: 'Stone terraces route',
        description:
          "Khami Ruins is a UNESCO site near Bulawayo, known for terraced stone walls and decorated platforms. It rose after Great Zimbabwe's decline as an important Torwa-state capital.",
        language: 'Ndebele',
        phrase: 'Ngiyabonga',
        translation: 'Thank you.',
      }),
      createAtlasSpot({
        id: 'mana-pools',
        name: 'Mana Pools Area',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: [
          'Mana Pools Area',
          'Mana Pools',
          'Mana Pools floodplain',
          'Mana Pools World Heritage Area',
        ],
        coordinates: { latitude: -15.722, longitude: 29.3637 },
        creator: 'Zambezi Wild Stories',
        uploads: '263 tagged clips',
        liveSignal: 'Canoe route clips',
        description:
          'The Mana Pools Area is the wider Zambezi floodplain and World Heritage landscape around the pools, river channels and safari camps. It is known for canoe safaris, walking safaris, elephants, wild dogs and seasonal water that draws wildlife to the valley floor.',
        language: 'Shona',
        phrase: 'Mauya',
        translation: 'Welcome.',
      }),
      createAtlasSpot({
        id: 'masvingo',
        name: 'Masvingo',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        coordinates: { latitude: -20.0744, longitude: 30.8328 },
        creator: 'Masvingo Makers',
        uploads: '121 tagged clips',
        liveSignal: 'City base clips',
        description:
          'Masvingo is the gateway city for Great Zimbabwe and Lake Mutirikwi, popular for heritage tours, local food and craft markets. It is a useful base for exploring ancient stone heritage, lake scenery and nearby nature routes.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'matobo-hills',
        name: 'Matobo Hills',
        region: 'Matabeleland South',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Matobo Hills', 'Matobo', 'Bulawayo'],
        coordinates: { latitude: -20.5, longitude: 28.5 },
        creator: 'Matobo Heritage Walks',
        uploads: '241 tagged clips',
        liveSignal: 'Rock art route',
        description:
          'Matobo Hills is known for balancing granite kopjes, rock art, rhino tracking and sacred cultural sites. The UNESCO landscape is deeply valued for spiritual heritage, ancient paintings and dramatic sunset viewpoints.',
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mutare',
        name: 'Mutare',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        coordinates: { latitude: -18.9707, longitude: 32.6709 },
        creator: 'Eastern City Walks',
        uploads: '178 tagged clips',
        liveSignal: 'Border city clips',
        description:
          'Mutare is a mountain-framed city near the Mozambique border, popular for markets, viewpoints and access to Vumba and Nyanga. Its history is tied to gold routes, rail links and the Beira corridor.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'nyanga',
        name: 'Nyanga',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        coordinates: { latitude: -18.2327, longitude: 32.7376 },
        creator: 'Nyanga Trail Notes',
        uploads: '203 tagged clips',
        liveSignal: 'Skyline trail clips',
        description:
          "Nyanga is known for cool mountain air, waterfalls, trout fishing and Mount Nyangani, Zimbabwe's highest peak. The area also has ancient terraces and pit structures linked to early farming communities.",
        language: 'Manyika Shona',
        phrase: 'Tinotenda',
        translation: 'We thank you.',
      }),
      createAtlasSpot({
        id: 'victoria-falls',
        name: 'Victoria Falls',
        region: 'Matabeleland North',
        weatherLocation: 'Victoria Falls, Zimbabwe',
        coordinates: { latitude: -17.9243, longitude: 25.8572 },
        creator: 'Zambezi Creators Guild',
        uploads: '248 tagged clips',
        liveSignal: 'Spray view active',
        description:
          "Victoria Falls is one of the world's great waterfalls, known locally as Mosi-oa-Tunya, the Smoke That Thunders. Visitors come for rainforest viewpoints, Zambezi sunsets, gorge activities and river adventures.",
        language: 'Nambya',
        phrase: 'Mwabonwa',
        translation: 'A warm greeting used around Hwange and Victoria Falls.',
      }),
      createAtlasSpot({
        id: 'vumba',
        name: 'Vumba',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Vumba', 'Mutare'],
        coordinates: { latitude: -19.1151, longitude: 32.7814 },
        creator: 'Vumba Viewfinders',
        uploads: '156 tagged clips',
        liveSignal: 'Mist garden clips',
        description:
          "Vumba is famous for misty forests, botanical gardens, birding and mountain views over the Burma Valley. Its name means 'mist' in Shona, matching the cool cloud forest atmosphere.",
        language: 'Manyika Shona',
        phrase: 'Mangwanani',
        translation: 'Good morning.',
      }),
      createAtlasSpot({
        id: 'zvishavane',
        name: 'Zvishavane',
        region: 'Midlands',
        weatherLocation: 'Zvishavane, Zimbabwe',
        coordinates: { latitude: -20.3267, longitude: 30.0665 },
        creator: 'Midlands Roadtrippers',
        uploads: '87 tagged clips',
        liveSignal: 'Road-trip stop clips',
        description:
          'Zvishavane is a Midlands mining town and road-trip stop known for nearby hills, local food and routes between Masvingo and Bulawayo. Its name is linked to Shona words for reddish hills.',
        language: 'Shona',
        phrase: 'Masikati',
        translation: 'Good afternoon.',
      }),
      createAtlasSpot({
        id: 'chizarira',
        name: 'Chizarira National Park',
        region: 'Matabeleland North',
        weatherLocation: 'Binga, Zimbabwe',
        eventLocationAliases: ['Chizarira', 'Chizarira National Park'],
        coordinates: { latitude: -17.7714, longitude: 27.846 },
        creator: 'Escarpment Wild Guides',
        uploads: '89 tagged clips',
        liveSignal: 'Gorge trail clips',
        description:
          "Chizarira is one of Zimbabwe's most remote national parks, set on the Zambezi escarpment above Binga. Known for rugged gorges, buffalo herds, lion and leopard, its isolation makes it a true off-the-beaten-track wilderness.",
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'zambezi-national-park',
        name: 'Zambezi National Park',
        region: 'Matabeleland North',
        weatherLocation: 'Victoria Falls, Zimbabwe',
        eventLocationAliases: ['Zambezi National Park', 'Victoria Falls'],
        coordinates: { latitude: -17.9267, longitude: 25.6683 },
        creator: 'Zambezi Creators Guild',
        uploads: '154 tagged clips',
        liveSignal: 'River drive clips',
        description:
          "Zambezi National Park borders the Zambezi River directly adjacent to Victoria Falls town, offering game drives and river safaris through elephant corridors, lion territory and prolific birdlife along the river's edge.",
        language: 'Nambya',
        phrase: 'Mwabonwa',
        translation: 'A warm greeting used around Victoria Falls.',
      }),
      createAtlasSpot({
        id: 'kazuma-pan',
        name: 'Kazuma Pan National Park',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: ['Kazuma Pan', 'Kazuma Pan National Park'],
        coordinates: { latitude: -18.2956, longitude: 25.5994 },
        creator: 'Pan Country Wild',
        uploads: '67 tagged clips',
        liveSignal: 'Pan elephant watch',
        description:
          "Kazuma Pan is a quiet national park on the Botswana border known for vast seasonal pans that attract elephant, roan antelope and migratory birds. One of Zimbabwe's most peaceful and least-visited wilderness areas.",
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'save-valley',
        name: 'Save Valley Conservancy',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Save Valley', 'Save Valley Conservancy'],
        coordinates: { latitude: -20.4528, longitude: 32.1037 },
        creator: 'Lowveld Wild Guides',
        uploads: '112 tagged clips',
        liveSignal: 'Big five alert',
        description:
          "Save Valley Conservancy is one of Africa's largest private wildlife conservancies, stretching across the Lowveld. Known for black and white rhino, wild dog, elephant and some of Zimbabwe's most remote luxury tented camps.",
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'malilangwe',
        name: 'Malilangwe Wildlife Reserve',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Malilangwe', 'Malilangwe Wildlife Reserve'],
        coordinates: { latitude: -21.1034, longitude: 31.8957 },
        creator: 'Lowveld Wild Guides',
        uploads: '98 tagged clips',
        liveSignal: 'Reserve sunset clips',
        description:
          'Malilangwe Wildlife Reserve borders Gonarezhou and is known for the big five, prolific birdlife and exclusive camps. The reserve supports significant rhino conservation and protects pristine Lowveld bush and ancient rock art sites.',
        language: 'Shangani',
        phrase: 'Avuxeni',
        translation: 'Good morning.',
      }),
      createAtlasSpot({
        id: 'bubye-valley',
        name: 'Bubye Valley Conservancy',
        region: 'Matabeleland South',
        weatherLocation: 'Beitbridge, Zimbabwe',
        eventLocationAliases: ['Bubye Valley', 'Bubye Valley Conservancy'],
        coordinates: { latitude: -21.5403, longitude: 30.0612 },
        creator: 'Southern Wild Trails',
        uploads: '78 tagged clips',
        liveSignal: 'Lion territory watch',
        description:
          "Bubye Valley Conservancy is a vast private reserve in southern Zimbabwe that holds one of the world's largest privately managed lion populations alongside the full big five. Remote bushveld and authentic wilderness characterise every stay.",
        language: 'Venda',
        phrase: 'Ndaa',
        translation: 'Respectful greeting.',
      }),
      createAtlasSpot({
        id: 'imire',
        name: 'Imire Rhino & Wildlife Conservation',
        region: 'Mashonaland East',
        weatherLocation: 'Marondera, Zimbabwe',
        eventLocationAliases: ['Imire', 'Imire Rhino & Wildlife Conservation'],
        coordinates: { latitude: -18.4759, longitude: 31.5033 },
        creator: 'Conservation Connect',
        uploads: '93 tagged clips',
        liveSignal: 'Rhino tracking clips',
        description:
          'Imire is a private wildlife sanctuary near Harare known for its rhino breeding programme and elephant orphan care. It offers intimate conservation experiences, guided bush walks and close wildlife encounters with a strong community mission.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'antelope-park',
        name: 'Antelope Park',
        region: 'Midlands',
        weatherLocation: 'Gweru, Zimbabwe',
        eventLocationAliases: ['Antelope Park', 'Gweru'],
        coordinates: { latitude: -19.5024, longitude: 29.7111 },
        creator: 'Lion Encounter Guides',
        uploads: '85 tagged clips',
        liveSignal: 'Lion walk clips',
        description:
          'Antelope Park near Gweru is known for lion rehabilitation walks, game drives and conservation education. The park runs reintroduction programmes returning lions to wild habitats and offers some of the most memorable predator encounters in Zimbabwe.',
        language: 'Shona',
        phrase: 'Masikati',
        translation: 'Good afternoon.',
      }),
      createAtlasSpot({
        id: 'charara',
        name: 'Charara Safari Area',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Charara Safari Area', 'Charara'],
        coordinates: { latitude: -16.5494, longitude: 29.1571 },
        creator: 'Kariba Voyager',
        uploads: '74 tagged clips',
        liveSignal: 'Shoreline game watch',
        description:
          "Charara Safari Area lies along Lake Kariba's eastern shore and is known for elephant, hippo, buffalo and crocodile. Its combination of lake frontage and woodland supports prolific wildlife close to Kariba town.",
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chete',
        name: 'Chete Safari Area',
        region: 'Matabeleland North',
        weatherLocation: 'Binga, Zimbabwe',
        eventLocationAliases: ['Chete Safari Area', 'Chete Island'],
        coordinates: { latitude: -17.3836, longitude: 27.7307 },
        creator: 'Kariba Voyager',
        uploads: '61 tagged clips',
        liveSignal: 'Island shore clips',
        description:
          "Chete Safari Area encompasses Chete Island and mainland shores on the western arm of Lake Kariba. Known for dramatic lake scenery, elephant, buffalo, lion and excellent tiger fishing in one of Zimbabwe's most remote settings.",
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chewore',
        name: 'Chewore Safari Area',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Chewore Safari Area', 'Chewore'],
        coordinates: { latitude: -16.0094, longitude: 29.9182 },
        creator: 'Zambezi Wild Stories',
        uploads: '83 tagged clips',
        liveSignal: 'Valley walk clips',
        description:
          'Chewore Safari Area is a vast and remote wilderness in the northern Zambezi Valley, forming part of the UNESCO Middle Zambezi Biosphere Reserve. It is known for large buffalo herds, elephant, lion and some of the best walking safari territory in Africa.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chipinge-safari',
        name: 'Chipinge Safari Area',
        region: 'Manicaland',
        weatherLocation: 'Chipinge, Zimbabwe',
        eventLocationAliases: ['Chipinge Safari Area', 'Chipinge'],
        coordinates: { latitude: -20.2, longitude: 32.65 },
        creator: 'Eastern Highlands Collective',
        uploads: '55 tagged clips',
        liveSignal: 'Forest edge clips',
        description:
          'Chipinge Safari Area covers dense forest and escarpment terrain in southeastern Manicaland near the Mozambique border. It supports sable antelope, elephant and a rich variety of forest birds in seldom-visited wilderness.',
        language: 'Ndau',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'chirisa',
        name: 'Chirisa Safari Area',
        region: 'Midlands',
        weatherLocation: 'Gokwe, Zimbabwe',
        eventLocationAliases: ['Chirisa Safari Area', 'Chirisa'],
        coordinates: { latitude: -17.935, longitude: 28.2422 },
        creator: 'Midlands Roadtrippers',
        uploads: '49 tagged clips',
        liveSignal: 'Bush trail clips',
        description:
          'Chirisa Safari Area is a remote and rarely visited wilderness north of Gokwe, between the Bumi and Sengwa rivers. It supports sable antelope, elephant, buffalo and lion in undisturbed mopane and jesse bush.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'dande',
        name: 'Dande Safari Area',
        region: 'Mashonaland Central',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Dande Safari Area', 'Dande'],
        coordinates: { latitude: -15.9418, longitude: 30.2507 },
        creator: 'Zambezi Wild Stories',
        uploads: '71 tagged clips',
        liveSignal: 'Escarpment walk clips',
        description:
          'Dande Safari Area occupies rugged Zambezi escarpment terrain east of Mana Pools. It is known for walking safaris, buffalo, elephant and lion in a wild and challenging landscape that rewards adventurous visitors.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'deka',
        name: 'Deka Safari Area',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: ['Deka Safari Area', 'Deka'],
        coordinates: { latitude: -18.5044, longitude: 26.4168 },
        creator: 'Savanna Trails',
        uploads: '58 tagged clips',
        liveSignal: 'Elephant corridor watch',
        description:
          'Deka Safari Area links Hwange National Park and Chizarira across a remote wildlife corridor. Elephant, sable antelope and lion pass through its teak and mopane woodland, making it an important buffer between two major protected areas.',
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'doma',
        name: 'Doma Safari Area',
        region: 'Mashonaland Central',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Doma Safari Area', 'Doma'],
        coordinates: { latitude: -16.4965, longitude: 30.2045 },
        creator: 'Zambezi Wild Stories',
        uploads: '44 tagged clips',
        liveSignal: 'Buffalo herd clips',
        description:
          'Doma Safari Area is a remote and largely undisturbed wilderness in the Zambezi Valley, east of Mana Pools. Known for large buffalo herds, elephant and lion, it sees very few visitors and offers a truly wild off-grid experience.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'hurungwe',
        name: 'Hurungwe Safari Area',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Hurungwe Safari Area', 'Hurungwe'],
        coordinates: { latitude: -16.1832, longitude: 29.0945 },
        creator: 'Zambezi Wild Stories',
        uploads: '92 tagged clips',
        liveSignal: 'Wild dog sighting clips',
        description:
          "Hurungwe Safari Area is one of Zimbabwe's largest wildlife areas, stretching north of Kariba into the Zambezi Valley. It supports elephant, lion, wild dog and buffalo across extensive jesse bush, mopane and riverine forest.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'malapati',
        name: 'Malapati Safari Area',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Malapati Safari Area', 'Malapati'],
        coordinates: { latitude: -22.064, longitude: 31.4363 },
        creator: 'Lowveld Wild Guides',
        uploads: '52 tagged clips',
        liveSignal: 'Limpopo border clips',
        description:
          'Malapati Safari Area forms the southern fringe of the Gonarezhou ecosystem and connects to the Great Limpopo Transfrontier Park with Mozambique and South Africa. It supports elephant, lion, leopard and diverse Lowveld birdlife.',
        language: 'Shangani',
        phrase: 'Avuxeni',
        translation: 'Good morning.',
      }),
      createAtlasSpot({
        id: 'matetsi',
        name: 'Matetsi Safari Area',
        region: 'Matabeleland North',
        weatherLocation: 'Victoria Falls, Zimbabwe',
        eventLocationAliases: ['Matetsi Safari Area', 'Matetsi'],
        coordinates: { latitude: -18.3843, longitude: 26.0166 },
        creator: 'Zambezi Creators Guild',
        uploads: '118 tagged clips',
        liveSignal: 'Game drive clips',
        description:
          'Matetsi Safari Area lies between Victoria Falls and Hwange, hosting exclusive private lodges and some of the finest game viewing in Zimbabwe. Elephant, lion, wild dog and sable antelope move freely through its diverse habitats.',
        language: 'Nambya',
        phrase: 'Mwabonwa',
        translation: 'A warm greeting used around Victoria Falls.',
      }),
      createAtlasSpot({
        id: 'mbona',
        name: 'Mbona Safari Area',
        region: 'Manicaland',
        weatherLocation: 'Chipinge, Zimbabwe',
        eventLocationAliases: ['Mbona Safari Area', 'Mbona'],
        coordinates: { latitude: -20.55, longitude: 32.55 },
        creator: 'Eastern Highlands Collective',
        uploads: '38 tagged clips',
        liveSignal: 'Escarpment edge clips',
        description:
          "Mbona Safari Area occupies rugged eastern escarpment terrain south of Chipinge, bordering Mozambique. It is one of Zimbabwe's least-visited wildlife areas, known for sable antelope, buffalo and exceptional forest birdlife.",
        language: 'Ndau',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'sapi',
        name: 'Sapi Safari Area',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Sapi Safari Area', 'Sapi'],
        coordinates: { latitude: -15.8372, longitude: 29.697 },
        creator: 'Zambezi Wild Stories',
        uploads: '107 tagged clips',
        liveSignal: 'Canoe trail clips',
        description:
          'Sapi Safari Area lies between Mana Pools and Chewore along the Zambezi River. Famous for walking and canoe safaris, it draws visitors for its classic Zambezi scenery, wild dog encounters, elephant and exceptional predator-prey action.',
        language: 'Shona',
        phrase: 'Mauya',
        translation: 'Welcome.',
      }),
      createAtlasSpot({
        id: 'tuli',
        name: 'Tuli Safari Area',
        region: 'Matabeleland South',
        weatherLocation: 'Beitbridge, Zimbabwe',
        eventLocationAliases: ['Tuli Safari Area', 'Tuli'],
        coordinates: { latitude: -21.9463, longitude: 29.1007 },
        creator: 'Southern Wild Trails',
        uploads: '63 tagged clips',
        liveSignal: 'Baobab plains clips',
        description:
          'Tuli Safari Area sits at the confluence of the Shashe and Limpopo rivers on the Botswana and South Africa borders. It is known for ancient baobab landscapes, elephant, leopard and connections to the wider Northern Tuli Game Reserve ecosystem.',
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'umfurudzi',
        name: 'Umfurudzi Safari Area',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Umfurudzi Safari Area', 'Umfurudzi'],
        coordinates: { latitude: -17.0165, longitude: 31.806 },
        creator: 'Conservation Connect',
        uploads: '67 tagged clips',
        liveSignal: 'Sable sighting clips',
        description:
          'Umfurudzi Safari Area is a scenic wildlife area north of Bindura, accessible from Harare and known for sable antelope, elephant, fishing on the Mazowe River and mountain bushveld scenery. It is a popular weekend wilderness destination for city visitors.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'matusadona',
        name: 'Matusadona National Park',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Matusadona National Park', 'Matusadona'],
        coordinates: { latitude: -16.9685, longitude: 28.6296 },
        creator: 'Kariba Voyager',
        uploads: '138 tagged clips',
        liveSignal: 'Shoreline game watch',
        description:
          "Matusadona National Park lines the southern shore of Lake Kariba and is one of Zimbabwe's most scenic national parks. Known for large elephant herds, lion, buffalo, Nile crocodile and tiger fishing, it is best explored by houseboat or walking safari along the lake shore.",
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'nyanga-national-park',
        name: 'Nyanga National Park',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Nyanga National Park', 'Nyanga'],
        coordinates: { latitude: -18.307, longitude: 32.7774 },
        creator: 'Nyanga Trail Notes',
        uploads: '171 tagged clips',
        liveSignal: 'Summit trail clips',
        description:
          'Nyanga National Park encompasses the highest terrain in Zimbabwe, including Mount Nyangani at 2592 m, dramatic waterfalls, trout streams and ancient terracing. It is a premier hiking and nature destination in the Eastern Highlands.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'karinyanga-wildlife-conservancy',
        name: 'Karinyanga Wildlife Conservancy',
        region: 'Mashonaland Central',
        weatherLocation: 'Guruve, Zimbabwe',
        eventLocationAliases: ['Karinyanga Wildlife Conservancy', 'Karinyanga'],
        coordinates: { latitude: -16.1264, longitude: 30.7407 },
        creator: 'Zambezi Valley Conservancies',
        uploads: '53 tagged clips',
        liveSignal: 'Community wildlife clips',
        description:
          'Karinyanga Wildlife Conservancy is a protected wildlife landscape in the Guruve area of the Zambezi Valley. It helps buffer remote northern habitats and supports community-based conservation around elephant, antelope and predator country.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mbire',
        name: 'Mbire Wildlife Area',
        region: 'Mashonaland Central',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Mbire Wildlife Area', 'Mbire'],
        coordinates: { latitude: -16.062, longitude: 30.2237 },
        creator: 'Zambezi Wild Stories',
        uploads: '46 tagged clips',
        liveSignal: 'Valley plains clips',
        description:
          'Mbire District covers a vast stretch of Zambezi Valley wilderness in Mashonaland Central, hosting community wildlife areas and communal conservancies with elephant, buffalo, lion and prolific birdlife. It links the Dande, Doma and Sapi wildlife ecosystems.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'lake-chivero',
        name: 'Lake Chivero Recreational Park',
        region: 'Mashonaland West',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Lake Chivero Recreational Park', 'Lake Chivero', 'Harare'],
        coordinates: { latitude: -17.9024, longitude: 30.7941 },
        creator: 'Urban Pulse Tours',
        uploads: '91 tagged clips',
        liveSignal: 'Weekend wildlife clips',
        description:
          'Lake Chivero Recreational Park is the closest wildlife and recreation area to Harare, offering game drives, white rhino sightings, birding and water sports on the reservoir. It is a popular weekend retreat for city residents and families.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'lake-mutirikwi',
        name: 'Lake Mutirikwi Recreational Park',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Lake Mutirikwi Recreational Park', 'Lake Mutirikwi', 'Lake Kyle'],
        coordinates: { latitude: -20.1904, longitude: 31.032 },
        creator: 'Masvingo Makers',
        uploads: '84 tagged clips',
        liveSignal: 'Lakeside game clips',
        description:
          'Lake Mutirikwi Recreational Park surrounds the reservoir near Masvingo and is home to white rhino, giraffe, zebra and impala on its game reserve peninsula. The lake views paired with proximity to Great Zimbabwe make it a memorable stop on the heritage circuit.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'ngezi',
        name: 'Ngezi Recreational Park',
        region: 'Mashonaland West',
        weatherLocation: 'Kadoma, Zimbabwe',
        eventLocationAliases: ['Ngezi Recreational Park', 'Ngezi'],
        coordinates: { latitude: -18.6839, longitude: 30.3996 },
        creator: 'Midlands Roadtrippers',
        uploads: '48 tagged clips',
        liveSignal: 'Dam birding clips',
        description:
          'Ngezi Recreational Park protects the Ngezi dam catchment near Kadoma, known for excellent birding, fishing, forest walks and quiet bush picnics. Its indigenous forest and wetland habitats support a wide range of wildlife and migratory bird species.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'sebakwe',
        name: 'Sebakwe Dam Recreational Park',
        region: 'Midlands',
        weatherLocation: 'Kwekwe, Zimbabwe',
        eventLocationAliases: [
          'Sebakwe Dam Recreational Park',
          'Sebakwe Recreational Park',
          'Sebakwe Dam',
          'Sebakwe',
        ],
        coordinates: { latitude: -19.0318, longitude: 30.2683 },
        creator: 'Midlands Roadtrippers',
        uploads: '41 tagged clips',
        liveSignal: 'Lakeside clips',
        description:
          'Sebakwe Dam Recreational Park protects the Sebakwe dam near Kwekwe, offering fishing, birding, game viewing and camping in a quiet bushveld setting. It is a valued green space for the Midlands region and a peaceful escape from nearby mining towns.',
        language: 'Shona',
        phrase: 'Masikati',
        translation: 'Good afternoon.',
      }),
      createAtlasSpot({
        id: 'mukuvisi-woodlands',
        name: 'Mukuvisi Woodlands',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Mukuvisi Woodlands', 'Harare'],
        coordinates: { latitude: -17.8438, longitude: 31.0883 },
        creator: 'Harare Wildlife Trails',
        uploads: '89 tagged clips',
        liveSignal: 'Woodland walk live',
        description:
          'Mukuvisi Woodlands is a 265-hectare urban wildlife sanctuary in Harare, home to giraffe, zebra, impala, white rhino and over 200 bird species. It offers guided walks, horseback trails and educational visits in the heart of the capital.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chipangali',
        name: 'Chipangali Wildlife Orphanage',
        region: 'Matabeleland South',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Chipangali', 'Chipangali Wildlife Orphanage'],
        coordinates: { latitude: -20.2525, longitude: 28.7809 },
        creator: 'Bulawayo Wild Lens',
        uploads: '67 tagged clips',
        liveSignal: 'Rescue animal clips',
        description:
          "Chipangali Wildlife Orphanage is a rescue and rehabilitation centre near Bulawayo, housing lions, leopards, cheetahs, wild dogs and hundreds of other animals. Founded in 1973, it remains one of Zimbabwe's most visited wildlife centres.",
        language: 'Ndebele',
        phrase: 'Kunjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mbizi-game-park',
        name: 'Mbizi Game Park',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Mbizi Game Park', 'Harare', 'Chitungwiza'],
        coordinates: { latitude: -17.9116, longitude: 31.0967 },
        creator: 'Harare Wildlife Trails',
        uploads: '54 tagged clips',
        liveSignal: 'Game viewing clips',
        description:
          'Mbizi Game Park near Harare is an accessible private wildlife estate for day visits, team outings, game drives, picnics and overnight stays. The park is known for relaxed family-friendly encounters with plains game close to the capital.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'lion-cheetah-park',
        name: 'Lion and Cheetah Park',
        region: 'Mashonaland West',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Lion and Cheetah Park', 'Harare'],
        coordinates: { latitude: -17.8396, longitude: 30.8131 },
        creator: 'Harare Wildlife Trails',
        uploads: '73 tagged clips',
        liveSignal: 'Big cat clips',
        description:
          'The Lion and Cheetah Park on the Bulawayo road outside Harare offers visitors the chance to photograph and observe lions, cheetahs, white lions and other predators at close range. A popular day trip from the capital.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'harare-botanical-garden',
        name: 'National Botanical Garden',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['National Botanical Garden', 'Harare Botanical Garden'],
        coordinates: { latitude: -17.8009, longitude: 31.0519 },
        creator: 'Harare Green Spaces',
        uploads: '58 tagged clips',
        liveSignal: 'Garden walks',
        description:
          'The National Botanical Garden in Harare showcases over 900 indigenous Zimbabwean plant species across 67 hectares of landscaped grounds. It is a peaceful retreat for nature lovers and a major centre for botanical research and conservation.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'ewanrigg',
        name: 'Ewanrigg Botanical Garden',
        region: 'Mashonaland East',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Ewanrigg Botanical Garden', 'Ewanrigg'],
        coordinates: { latitude: -17.6948, longitude: 31.3342 },
        creator: 'Mashonaland Botanicals',
        uploads: '44 tagged clips',
        liveSignal: 'Aloe garden clips',
        description:
          'Ewanrigg Botanical Garden northeast of Harare is renowned for its spectacular aloe and cycad collection, with over 150 aloe species in full bloom during winter. The garden sits on a kopje hillside with scenic views across Mashonaland East.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'naletale-ruins',
        name: 'Naletale Ruins',
        region: 'Midlands',
        weatherLocation: 'Gweru, Zimbabwe',
        eventLocationAliases: ['Naletale Ruins', 'Danangombe', 'Dhlo-Dhlo'],
        coordinates: { latitude: -19.8877, longitude: 29.5327 },
        creator: 'Midlands Heritage Routes',
        uploads: '38 tagged clips',
        liveSignal: 'Historic site clips',
        description:
          'Naletale (also known as Danangombe or Dhlo-Dhlo) is a late Iron Age stone enclosure near Gweru, featuring the most ornate dry-stone walling in Zimbabwe after Great Zimbabwe. It was a Rozvi Empire capital with elaborate decorative panels and chevron work.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'domboshava',
        name: 'Domboshava',
        region: 'Mashonaland East',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Domboshava', 'Domboshava Cave', 'Domboshava Rock Art'],
        coordinates: { latitude: -17.61, longitude: 31.1747 },
        creator: 'Mashonaland Heritage',
        uploads: '62 tagged clips',
        liveSignal: 'Cave art clips',
        description:
          'Domboshava is a large granite dome north of Harare with ancient San (Bushman) rock paintings deep inside its cave. The site also features impressive balancing rocks and is a major heritage destination combining archaeology with dramatic granite scenery.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'epworth-balancing-rocks',
        name: 'Epworth Balancing Rocks',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Epworth Balancing Rocks', 'Balancing Rocks'],
        coordinates: { latitude: -17.8851, longitude: 31.1277 },
        creator: 'Harare Geological Trails',
        uploads: '47 tagged clips',
        liveSignal: 'Rock formation clips',
        description:
          "The Epworth Balancing Rocks near Harare are iconic granite formations delicately stacked on top of each other, shaped over millions of years of weathering. Zimbabwe's most photographed natural monuments, they once featured on the country's banknotes.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mtarazi-falls',
        name: 'Mtarazi Falls',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Mtarazi Falls', 'Mtarazi'],
        coordinates: { latitude: -18.4841, longitude: 32.7924 },
        creator: 'Eastern Highlands Explorers',
        uploads: '91 tagged clips',
        liveSignal: 'Waterfall clips',
        description:
          'Mtarazi Falls in Nyanga National Park is the highest waterfall in Zimbabwe and one of the highest in Africa, plunging 762 metres off the Honde Valley escarpment. The gorge viewpoint offers breathtaking panoramic views over Mozambique.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bridal-veil-falls',
        name: 'Bridal Veil Falls',
        region: 'Manicaland',
        weatherLocation: 'Chimanimani, Zimbabwe',
        eventLocationAliases: ['Bridal Veil Falls', 'Chimanimani Falls'],
        coordinates: { latitude: -19.7921, longitude: 32.8481 },
        creator: 'Eastern Highlands Explorers',
        uploads: '76 tagged clips',
        liveSignal: 'Waterfall clips',
        description:
          'Bridal Veil Falls cascades 50 metres into a natural pool in the Chimanimani area, surrounded by lush fern-lined rock walls and mist. A short walk from Chimanimani town, it is one of the most beautiful and accessible waterfalls in Zimbabwe.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mount-nyangani',
        name: 'Mount Nyangani',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Mount Nyangani', 'Nyangani Peak', 'Inyangani'],
        coordinates: { latitude: -18.3014, longitude: 32.8419 },
        creator: 'Eastern Highlands Explorers',
        uploads: '83 tagged clips',
        liveSignal: 'Summit clips',
        description:
          'Mount Nyangani (also known as Inyangani) is the highest point in Zimbabwe at 2,592 metres above sea level. Located within Nyanga National Park, it offers a challenging day hike through montane grassland with spectacular views over the Eastern Highlands.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chirinda-forest',
        name: 'Chirinda Forest',
        region: 'Manicaland',
        weatherLocation: 'Chipinge, Zimbabwe',
        eventLocationAliases: ['Chirinda Forest', 'Chirinda Forest Reserve'],
        coordinates: { latitude: -20.4153, longitude: 32.7108 },
        creator: 'Chipinge Conservation',
        uploads: '55 tagged clips',
        liveSignal: 'Forest canopy clips',
        description:
          "Chirinda Forest near Chipinge is one of Zimbabwe's finest subtropical rainforests, home to giant red mahogany trees including the Big Tree — one of the largest in Southern Africa. The forest shelters Samango monkeys, rare forest birds and endemic plant species.",
        language: 'Ndau',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'manjirenji',
        name: 'Manjirenji Recreational Park',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Manjirenji Recreational Park', 'Manjirenji'],
        coordinates: { latitude: -20.6262, longitude: 31.6093 },
        creator: 'Lowveld Outdoor',
        uploads: '33 tagged clips',
        liveSignal: 'Lakeside clips',
        description:
          'Manjirenji Recreational Park in Masvingo province protects Manjirenji Dam and its surrounds, offering boating, fishing, birdwatching and camping in the hot lowveld. Hippos and crocodiles are frequently spotted along the shoreline.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'cleveland-dam',
        name: 'Cleveland Dam',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Cleveland Dam', 'Cleveland Dam Recreational Park'],
        coordinates: { latitude: -17.8401, longitude: 31.151 },
        creator: 'Harare Outdoors',
        uploads: '28 tagged clips',
        liveSignal: 'Waterside clips',
        description:
          'Cleveland Dam is a popular outdoor recreational area in northern Harare, offering sailing, birdwatching and walking trails around the reservoir. The surrounding miombo woodland supports a rich variety of resident and migrant birds.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bangala-dam',
        name: 'Bangala Dam',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Bangala Dam', 'Bangala Recreational Park'],
        coordinates: { latitude: -20.6748, longitude: 31.1733 },
        creator: 'Masvingo Outdoors',
        uploads: '29 tagged clips',
        liveSignal: 'Dam clips',
        description:
          'Bangala Dam in southern Masvingo province is a quiet recreational destination for fishing, birdwatching and picnics. The dam supports diverse waterbird populations and its surrounding thornveld is habitat for smaller mammals and raptors.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mazowe-dam',
        name: 'Mazowe Dam',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Mazowe Dam', 'Mazowe Valley'],
        coordinates: { latitude: -17.5326, longitude: 30.9982 },
        creator: 'Mazowe Valley Tours',
        uploads: '36 tagged clips',
        liveSignal: 'Valley clips',
        description:
          'Mazowe Dam sits in the scenic Mazowe Valley north of Harare, surrounded by citrus orchards and miombo woodland. The dam is popular for fishing, picnics and birdwatching, and the valley is known for the historic Mazowe Orange Estates.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'lake-manyame',
        name: 'Lake Manyame',
        region: 'Mashonaland West',
        weatherLocation: 'Chegutu, Zimbabwe',
        eventLocationAliases: ['Lake Manyame', 'Manyame Recreational Park'],
        coordinates: { latitude: -17.8046, longitude: 30.5331 },
        creator: 'Mashonaland West Outdoors',
        uploads: '42 tagged clips',
        liveSignal: 'Lake clips',
        description:
          'Lake Manyame Recreational Park covers a large reservoir west of Harare, popular for fishing, boating, birdwatching and lakeside camping. The lake supports rich waterbird populations including herons, storks, fish eagles and kingfishers.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'gweru',
        name: 'Gweru',
        region: 'Midlands',
        weatherLocation: 'Gweru, Zimbabwe',
        coordinates: { latitude: -19.4514, longitude: 29.8176 },
        creator: 'Midlands Road Crew',
        uploads: '82 tagged clips',
        liveSignal: 'City live',
        description:
          'Gweru is the capital of the Midlands province and a central hub for industry and heritage. The city is home to the Zimbabwe Military Museum, Antelope Park and the historic Naletale Ruins, and is positioned at the geographical heart of Zimbabwe.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'kwekwe',
        name: 'Kwekwe',
        region: 'Midlands',
        weatherLocation: 'Kwekwe, Zimbabwe',
        coordinates: { latitude: -18.9295, longitude: 29.8166 },
        creator: 'Steeltown Visuals',
        uploads: '71 tagged clips',
        liveSignal: 'City live',
        description:
          "Kwekwe is Zimbabwe's steelmaking capital, home to ZISCO steel works and the National Gold Mining Museum. The surrounding area includes Sebakwe Dam Recreational Park and several gold-panning sites with longstanding historical significance.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bindura',
        name: 'Bindura',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        coordinates: { latitude: -17.2983, longitude: 31.3317 },
        creator: 'Mashonaland Lens',
        uploads: '53 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Bindura is the capital of Mashonaland Central province, surrounded by nickel mining and agricultural land. It is a gateway to Umfurudzi Safari Area and is close to the Mazowe Valley, Domboshava and Ewanrigg Botanical Garden.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'gwanda',
        name: 'Gwanda',
        region: 'Matabeleland South',
        weatherLocation: 'Gwanda, Zimbabwe',
        coordinates: { latitude: -20.9414, longitude: 29.0037 },
        creator: 'Matabeleland South Crew',
        uploads: '39 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Gwanda is the capital of Matabeleland South province, a market town surrounded by semi-arid thornveld and gold-mining areas. It is a base for exploring the Tuli Safari Area and the remote southern reaches of Zimbabwe.',
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'beitbridge',
        name: 'Beitbridge',
        region: 'Matabeleland South',
        weatherLocation: 'Beitbridge, Zimbabwe',
        coordinates: { latitude: -22.1986, longitude: 29.9918 },
        creator: 'Border Town Lens',
        uploads: '48 tagged clips',
        liveSignal: 'Border crossing live',
        description:
          "Beitbridge is Zimbabwe's southernmost town on the Limpopo River, hosting the busiest land border crossing in Southern Africa. The surrounding Limpopo Valley is prime wildlife territory with baobab trees, elephant corridors and savanna.",
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'marondera',
        name: 'Marondera',
        region: 'Mashonaland East',
        weatherLocation: 'Marondera, Zimbabwe',
        coordinates: { latitude: -18.1885, longitude: 31.554 },
        creator: 'Mashonaland East Trails',
        uploads: '44 tagged clips',
        liveSignal: 'Town clips',
        description:
          "Marondera is a prosperous farming town east of Harare in Zimbabwe's top wine and horse-racing country. The area is known for Imire Rhino Conservation, polo clubs, tobacco farming and the scenic Ruzawi River valley.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chiredzi',
        name: 'Chiredzi',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        coordinates: { latitude: -21.0453, longitude: 31.6689 },
        creator: 'Lowveld Safari Crew',
        uploads: '61 tagged clips',
        liveSignal: 'Lowveld live',
        description:
          "Chiredzi is the main town in Zimbabwe's hot lowveld, surrounded by sugarcane plantations and close to Gonarezhou National Park, Save Valley Conservancy and Malilangwe Wildlife Reserve. It is the gateway to the south-east wildlife corridor.",
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'kadoma',
        name: 'Kadoma',
        region: 'Mashonaland West',
        weatherLocation: 'Kadoma, Zimbabwe',
        coordinates: { latitude: -18.34, longitude: 29.915 },
        creator: 'Cotton Country Lens',
        uploads: '38 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Kadoma is a mid-sized town in Mashonaland West, historically important for gold mining and today a centre of the cotton industry. It is close to Ngezi Recreational Park and lies along the main highway connecting Harare and Bulawayo.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chegutu',
        name: 'Chegutu',
        region: 'Mashonaland West',
        weatherLocation: 'Chegutu, Zimbabwe',
        coordinates: { latitude: -18.1333, longitude: 30.1333 },
        creator: 'Mashonaland West Roads',
        uploads: '32 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Chegutu is a farming and industrial town west of Harare on the Bulawayo highway, known for tobacco, citrus and cotton production. It borders the Lake Manyame catchment and lies between the capital and the Midlands.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'plumtree',
        name: 'Plumtree',
        region: 'Matabeleland South',
        weatherLocation: 'Plumtree, Zimbabwe',
        coordinates: { latitude: -20.4811, longitude: 27.8008 },
        creator: 'Matabeleland Border Lens',
        uploads: '27 tagged clips',
        liveSignal: 'Border town clips',
        description:
          'Plumtree is a quiet border town in Matabeleland South near the Botswana frontier, known for railway heritage, cross-border travel and surrounding communal areas. The town lies on the old railway route and is surrounded by dry savanna and mopane woodland.',
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'hwange-town',
        name: 'Hwange Town',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: ['Hwange Town', 'Hwange Colliery'],
        coordinates: { latitude: -18.3649, longitude: 26.4992 },
        creator: 'Hwange Town Collective',
        uploads: '45 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Hwange Town is a coal-mining centre built around the Hwange Colliery, which has powered Zimbabwe for over a century. The town is the main services gateway for Hwange National Park visitors arriving from Bulawayo.',
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'rusape',
        name: 'Rusape',
        region: 'Manicaland',
        weatherLocation: 'Rusape, Zimbabwe',
        coordinates: { latitude: -18.5333, longitude: 32.1333 },
        creator: 'Manicaland Roads Crew',
        uploads: '36 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Rusape is a transit town in Manicaland province on the Harare-Mutare highway, surrounded by granite hills, tobacco farms and timber plantations. It is close to Tsatse River recreation areas and community wildlife projects.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'national-heroes-acre',
        name: 'National Heroes Acre',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['National Heroes Acre', 'Heroes Acre'],
        coordinates: { latitude: -17.8345, longitude: 30.9874 },
        creator: 'Harare Heritage Walks',
        uploads: '52 tagged clips',
        liveSignal: 'Monument clips',
        description:
          "National Heroes Acre is a state burial ground and national monument on a hill west of Harare, honouring those who died in Zimbabwe's liberation struggle. The site features bold monumental sculptures, an eternal flame and panoramic views of the capital.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'museum-human-sciences',
        name: 'Museum of Human Sciences',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: [
          'Museum of Human Sciences',
          'Zimbabwe Museum',
          'Queen Victoria Museum',
        ],
        coordinates: { latitude: -17.8289, longitude: 31.0439 },
        creator: 'Harare Cultural Routes',
        uploads: '41 tagged clips',
        liveSignal: 'Museum clips',
        description:
          "The Museum of Human Sciences in Harare (formerly the Queen Victoria Museum) houses extensive collections on Zimbabwe's archaeology, ethnography, natural history and rock art. It is the country's national museum of history and culture.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'natural-history-museum',
        name: 'Natural History Museum of Zimbabwe',
        region: 'Bulawayo',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Natural History Museum', 'Natural History Museum of Zimbabwe'],
        coordinates: { latitude: -20.1558, longitude: 28.5964 },
        creator: 'Bulawayo Museums',
        uploads: '49 tagged clips',
        liveSignal: 'Museum clips',
        description:
          'The Natural History Museum of Zimbabwe in Bulawayo is one of the largest natural history museums in Africa, displaying geological, zoological and botanical collections from across Southern Africa. The iconic elephant skeleton and full mammal hall are major highlights.',
        language: 'Ndebele',
        phrase: 'Kunjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'leopard-rock',
        name: 'Leopard Rock',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Leopard Rock', 'Leopard Rock Hotel', 'Bvumba'],
        coordinates: { latitude: -19.1321, longitude: 32.7826 },
        creator: 'Vumba Highlands',
        uploads: '68 tagged clips',
        liveSignal: 'Highlands live',
        description:
          'Leopard Rock is an iconic luxury hotel and golf course set in the Bvumba highlands south of Mutare, surrounded by ancient forest, flower gardens and mountain mist. The castle-style hotel and its 18-hole course rank among the most scenic destinations in Zimbabwe.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'gosho-game-park',
        name: 'Gosho Game Park',
        region: 'Mashonaland East',
        weatherLocation: 'Marondera, Zimbabwe',
        eventLocationAliases: ['Gosho Game Park', 'Gosho Park'],
        coordinates: { latitude: -18.1804, longitude: 31.6236 },
        creator: 'Mazowe Valley Safaris',
        uploads: '61 tagged clips',
        liveSignal: 'Game viewing clips',
        description:
          'Gosho Game Park is a private wildlife sanctuary in the scenic Mazowe Valley north of Harare, home to giraffe, zebra, wildebeest, impala and diverse birdlife. A popular day-trip destination from the capital with self-drive and guided options.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'pamuzinda',
        name: 'Pamuzinda Safari Lodge',
        region: 'Mashonaland West',
        weatherLocation: 'Chegutu, Zimbabwe',
        eventLocationAliases: ['Pamuzinda', 'Pamuzinda Safari Lodge'],
        coordinates: { latitude: -18.1471, longitude: 30.3474 },
        creator: 'Mashonaland Wild',
        uploads: '74 tagged clips',
        liveSignal: 'Lodge safari clips',
        description:
          "Pamuzinda Safari Lodge is a private game reserve approximately 90km from Harare, offering Big Five game drives on a 5,000-hectare property. It is one of Zimbabwe's premier private safari escapes within easy reach of the capital, known for white rhino and sable antelope.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chengeta',
        name: 'Chengeta Game Reserve',
        region: 'Mashonaland West',
        weatherLocation: 'Chinhoyi, Zimbabwe',
        eventLocationAliases: ['Chengeta', 'Chengeta Game Reserve', 'Chengeta Safari'],
        coordinates: { latitude: -18.1518, longitude: 30.4383 },
        creator: 'Mashonaland Wild',
        uploads: '58 tagged clips',
        liveSignal: 'Bush camp clips',
        description:
          'Chengeta Game Reserve is a private wilderness area west of Harare on the Chinhoyi road, offering walking safaris, guided game drives and overnight bush experiences. The reserve is known for its quiet, intimate atmosphere and diverse wildlife.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'wild-is-life',
        name: 'Wild Is Life Sanctuary',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: [
          'Wild Is Life',
          'Zimbabwe Elephant Nursery',
          'Wild Is Life Sanctuary',
        ],
        coordinates: { latitude: -17.941, longitude: 31.1103 },
        creator: 'Harare Wildlife Trails',
        uploads: '88 tagged clips',
        liveSignal: 'Elephant nursery live',
        description:
          'Wild Is Life is a sanctuary and elephant nursery near Harare that rescues and rehabilitates orphaned and injured wildlife including baby elephants, rhino and pangolin. Founded by Roxy Danckwerts, it is one of the most moving wildlife experiences in Zimbabwe.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'tshabalala',
        name: 'Tshabalala Wildlife Sanctuary',
        region: 'Bulawayo',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Tshabalala', 'Tshabalala Wildlife Sanctuary'],
        coordinates: { latitude: -20.2451, longitude: 28.5597 },
        creator: 'Bulawayo Wild Lens',
        uploads: '49 tagged clips',
        liveSignal: 'Sanctuary walk clips',
        description:
          "Tshabalala Wildlife Sanctuary on the southern edge of Bulawayo is a small but well-loved urban game sanctuary for walking among giraffe, zebra, impala, wildebeest and eland. It is Bulawayo's own walkable wildlife area and a popular family destination.",
        language: 'Ndebele',
        phrase: 'Kunjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'worlds-view-matobo',
        name: "World's View",
        region: 'Matabeleland South',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ["World's View", 'Rhodes Grave', 'Malindidzimu'],
        coordinates: { latitude: -20.4903, longitude: 28.5148 },
        creator: 'Matobo Heritage Walks',
        uploads: '93 tagged clips',
        liveSignal: 'Kopje summit clips',
        description:
          "World's View (Malindidzimu — Dwelling Place of Spirits) in Matobo Hills is the burial site of Cecil John Rhodes and one of the most dramatic granite viewpoints in Zimbabwe. The sweeping panorama of ancient kopjes and balancing rocks is considered among Africa's finest landscapes.",
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'larvon-bird-gardens',
        name: 'Larvon Bird Gardens',
        region: 'Mashonaland West',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Larvon Bird Gardens', 'Larvon'],
        coordinates: { latitude: -17.8689, longitude: 30.8002 },
        creator: 'Harare Bird Watchers',
        uploads: '52 tagged clips',
        liveSignal: 'Aviary clips',
        description:
          'Larvon Bird Gardens near Harare is a private bird sanctuary housing over 400 bird species from across Africa. The landscaped gardens and well-maintained aviaries make it a favourite for birders and families, and it claims to be the largest private bird collection in Africa.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'sinamatella',
        name: 'Sinamatella',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: [
          'Sinamatella',
          'Sinamatella Camp',
          'Sinamatella Campsite',
          'Hwange Sinamatella',
        ],
        coordinates: { latitude: -18.5854, longitude: 26.318 },
        creator: 'Hwange Wilderness',
        uploads: '66 tagged clips',
        liveSignal: 'Waterhole watch',
        description:
          "Sinamatella is a remote camp in the northern sector of Hwange National Park, accessible via the Binga road and offering spectacular escarpment views over the park's vast teak forests. Less visited than Main Camp, it gives an especially wild and unspoilt safari experience.",
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'chilo-gorge',
        name: 'Chilo Gorge',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Chilo Gorge', 'Chilo Gorge Safari Lodge'],
        coordinates: { latitude: -21.2488, longitude: 32.3485 },
        creator: 'Gonarezhou Wilderness',
        uploads: '71 tagged clips',
        liveSignal: 'Gorge safari clips',
        description:
          "Chilo Gorge Safari Lodge sits on the edge of Gonarezhou National Park overlooking the Save-Runde confluence, with panoramic views into one of Africa's wildest landscapes. The surrounding wilderness is home to huge elephant herds and the rare Lichtenstein's hartebeest.",
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'pungwe-falls',
        name: 'Pungwe Falls',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Pungwe Falls', 'Pungwe Gorge'],
        coordinates: { latitude: -18.4215, longitude: 32.7808 },
        creator: 'Eastern Highlands Explorers',
        uploads: '67 tagged clips',
        liveSignal: 'Waterfall clips',
        description:
          "Pungwe Falls in Nyanga National Park plunges into the spectacular Pungwe Gorge, with hiking trails leading through montane grassland and protea forest to dramatic viewpoints. The Pungwe River originates on the Nyangani slopes and carves one of the Eastern Highlands' finest gorges.",
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mavuradonha',
        name: 'Mavuradonha Wilderness',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Mavuradonha', 'Mavuradonha Wilderness Area'],
        coordinates: { latitude: -16.5, longitude: 31.1667 },
        creator: 'Zimbabwe Wilderness Trails',
        uploads: '43 tagged clips',
        liveSignal: 'Wilderness hike clips',
        description:
          "Mavuradonha Wilderness Area in northern Mashonaland Central is a remote and pristine highland wilderness known for rugged escarpment walks, natural pools and untouched miombo woodland. It is one of Zimbabwe's best kept secrets for hiking and adventure camping.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'ziwa-ruins',
        name: 'Ziwa Ruins',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Ziwa Ruins', 'Ziwa National Monument'],
        coordinates: { latitude: -18.1352, longitude: 32.6372 },
        creator: 'Eastern Highlands Heritage',
        uploads: '34 tagged clips',
        liveSignal: 'Ruins site clips',
        description:
          'Ziwa Ruins near Nyanga are a complex of Iron Age stone enclosures, terraced fields and pit structures built by early Shona farmers between the 14th and 19th centuries. The site offers a fascinating window into ancient highland agricultural civilisation.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bubiana',
        name: 'Bubiana Conservancy',
        region: 'Matabeleland South',
        weatherLocation: 'Gwanda, Zimbabwe',
        eventLocationAliases: ['Bubiana', 'Bubiana Conservancy'],
        coordinates: { latitude: -21.1061, longitude: 29.8288 },
        creator: 'Matabeleland South Wild',
        uploads: '39 tagged clips',
        liveSignal: 'Conservancy clips',
        description:
          "Bubiana Conservancy in Matabeleland South is a private wildlife conservancy renowned for one of Zimbabwe's largest sable antelope populations. The remote bushveld landscape also supports lion, leopard, painted wolf and abundant plains game.",
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'kariba-croc-farm',
        name: 'Kariba Crocodile Farm',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Kariba Crocodile Farm', 'Kariba Croc Farm'],
        coordinates: { latitude: -16.5407, longitude: 28.8737 },
        creator: 'Kariba Voyager',
        uploads: '38 tagged clips',
        liveSignal: 'Croc farm clips',
        description:
          "The Kariba Crocodile Farm in Kariba town breeds Nile crocodiles from egg through to adulthood, offering guided tours that give visitors close-up views of hundreds of crocodiles at different life stages. It is one of the top town attractions at Zimbabwe's famous inland sea.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'guruve',
        name: 'Guruve',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Guruve'],
        coordinates: { latitude: -16.6594, longitude: 30.7034 },
        creator: 'Mashonaland Central Trails',
        uploads: '31 tagged clips',
        liveSignal: 'Town clips',
        description:
          "Guruve is a small town in Mashonaland Central that serves as the northern overland gateway to Mana Pools National Park. The surrounding communal areas and escarpment roads offer dramatic views and access to Zimbabwe's remote Zambezi Valley wilderness.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mount-darwin',
        name: 'Mount Darwin',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Mount Darwin'],
        coordinates: { latitude: -16.7833, longitude: 31.5833 },
        creator: 'Mashonaland Central Trails',
        uploads: '28 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Mount Darwin is a remote market town in northern Mashonaland Central, named after the mountain that rises above the town. It is a departure point for the Mavuradonha Wilderness, Muzarabani Valley and the remote northern borderlands near the Mozambique frontier.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'umzingwane-dam',
        name: 'Umzingwane Dam',
        region: 'Matabeleland South',
        weatherLocation: 'Gwanda, Zimbabwe',
        eventLocationAliases: ['Umzingwane Dam', 'Umzingwane Recreational Park'],
        coordinates: { latitude: -20.0667, longitude: 29.1667 },
        creator: 'Matabeleland South Wild',
        uploads: '27 tagged clips',
        liveSignal: 'Dam clips',
        description:
          'Umzingwane Dam Recreational Park in Matabeleland South offers fishing, birdwatching and picnicking in a quiet bushveld setting south of Bulawayo. The dam and its surrounds attract waterbirds and provide a peaceful retreat from the city.',
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'makuti',
        name: 'Makuti',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Makuti', 'Makuti Village'],
        coordinates: { latitude: -16.3169, longitude: 29.2518 },
        creator: 'Zambezi Valley Routes',
        uploads: '33 tagged clips',
        liveSignal: 'Escarpment clips',
        description:
          'Makuti is a small village perched on the Zambezi Escarpment en route from Harare to Kariba, serving as the last fuel and supplies point before the descent into the Zambezi Valley. The roadside viewpoints here offer sweeping vistas over the Mana Pools wilderness below.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'nyaminyami',
        name: 'Nyaminyami Cultural Area',
        region: 'Matabeleland North',
        weatherLocation: 'Binga, Zimbabwe',
        eventLocationAliases: ['Nyaminyami', 'Nyamaneche', 'Binga Cultural Village'],
        coordinates: { latitude: -17.627, longitude: 27.344 },
        creator: 'Tonga Cultural Routes',
        uploads: '44 tagged clips',
        liveSignal: 'Tonga ceremony clips',
        description:
          'The Nyaminyami is the legendary river spirit of the Tonga people, revered as the guardian of the Zambezi and Lake Kariba. The Binga area is the heartland of Tonga culture where you can experience traditional ceremonies, basket weaving, and oral history tied to the displacement caused by the Kariba Dam.',
        language: 'Tonga',
        phrase: 'Mubotu',
        translation: 'Good day.',
      }),
      createAtlasSpot({
        id: 'honde-valley',
        name: 'Honde Valley',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Honde Valley', 'Aberfoyle Tea Estate', 'Honde'],
        coordinates: { latitude: -18.4968, longitude: 32.8532 },
        creator: 'Eastern Highlands Journeys',
        uploads: '58 tagged clips',
        liveSignal: 'Tea estate clips',
        description:
          'The Honde Valley drops dramatically from the Nyanga highlands into a lush tropical basin straddling the Mozambique border. It is known for Aberfoyle Tea Estate, coffee plantations, the Mutarazi Falls access route, and a dense network of waterfalls fed by the highest rainfall in Zimbabwe.',
        language: 'Manyika Shona',
        phrase: 'Mhoro',
        translation: 'Hello.',
      }),
      createAtlasSpot({
        id: 'troutbeck',
        name: 'Troutbeck',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Troutbeck', 'Troutbeck Resort', 'Troutbeck Inn'],
        coordinates: { latitude: -18.1844, longitude: 32.8108 },
        creator: 'Nyanga Highlands Guides',
        uploads: '52 tagged clips',
        liveSignal: 'Highland resort clips',
        description:
          'Troutbeck is a classic highland resort village near the summit of the Nyanga plateau, surrounded by pine forests, trout streams and moorland. The historic Troutbeck Inn with its English country-house atmosphere has been a retreat for Zimbabweans since the colonial era.',
        language: 'Manyika Shona',
        phrase: 'Mhoro',
        translation: 'Hello.',
      }),
      createAtlasSpot({
        id: 'birchenough-bridge',
        name: 'Birchenough Bridge',
        region: 'Manicaland',
        weatherLocation: 'Chipinge, Zimbabwe',
        eventLocationAliases: ['Birchenough Bridge', 'Save River Bridge'],
        coordinates: { latitude: -19.962, longitude: 32.3443 },
        creator: 'Save Valley Trails',
        uploads: '39 tagged clips',
        liveSignal: 'Bridge & river clips',
        description:
          'The Birchenough Bridge is a single-span steel arch bridge over the Save River, once the third-largest arch bridge in the world when completed in 1935. Designed by Ralph Freeman — the same engineer behind the Sydney Harbour Bridge — it remains an iconic landmark on the road from Mutare to Chiredzi.',
        language: 'Manyika Shona',
        phrase: 'Mhoro',
        translation: 'Hello.',
      }),
      createAtlasSpot({
        id: 'chilojo-cliffs',
        name: 'Chilojo Cliffs',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Chilojo Cliffs', 'Chilojo', 'Gonarezhou Cliffs'],
        coordinates: { latitude: -21.4494, longitude: 32.0821 },
        creator: 'Gonarezhou Bush Stories',
        uploads: '63 tagged clips',
        liveSignal: 'Runde River cliffs',
        description:
          "Gonarezhou's most iconic feature — towering red sandstone bluffs that glow crimson at sunrise and sunset above the Runde River. Massive elephant herds gather at the base of the cliffs during the dry season, making this one of Zimbabwe's most dramatic wildlife spectacles.",
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'crooks-corner',
        name: "Crooks' Corner",
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ["Crooks' Corner", 'Crooks Corner', 'Pafuri Junction'],
        coordinates: { latitude: -22.4261, longitude: 31.3072 },
        creator: 'Southern Lowveld Journeys',
        uploads: '28 tagged clips',
        liveSignal: 'Tri-border confluence clips',
        description:
          'The remote tri-border point where Zimbabwe, Mozambique and South Africa meet at the confluence of the Limpopo and Luvuvhu rivers. Historically a refuge for ivory poachers who could slip between jurisdictions, it now sits within Gonarezhou NP and is reached by 4WD through pristine bushveld.',
        language: 'Shangani',
        phrase: 'Avuxeni',
        translation: 'Good morning.',
      }),
      createAtlasSpot({
        id: 'hippo-valley',
        name: 'Hippo Valley',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Hippo Valley', 'Hippo Valley Estate', 'Triangle Estate'],
        coordinates: { latitude: -21.071, longitude: 31.6457 },
        creator: 'Lowveld Sugar Routes',
        uploads: '35 tagged clips',
        liveSignal: 'Sugar estate clips',
        description:
          "Hippo Valley Estate and the nearby Triangle are the heartland of Zimbabwe's sugar industry, producing the majority of the country's sugar from vast irrigated cane fields fed by the Runde River. The surrounding lowveld supports abundant birdlife and the estate offers guided farm tours.",
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mlibizi',
        name: 'Mlibizi',
        region: 'Matabeleland North',
        weatherLocation: 'Binga, Zimbabwe',
        eventLocationAliases: ['Mlibizi', 'Mlibizi Ferry', 'Lake Kariba West'],
        coordinates: { latitude: -18.0287, longitude: 27.1111 },
        creator: 'Kariba Western Routes',
        uploads: '41 tagged clips',
        liveSignal: 'Lake ferry clips',
        description:
          'Mlibizi is the western terminus of the Kariba Houseboat Ferry, a popular two-day lake crossing to Kariba town. The village on the Gwaai River mouth offers excellent tiger fishing, a tranquil lakeside camp, and proximity to Binga and Chizarira National Park.',
        language: 'Tonga',
        phrase: 'Mubotu',
        translation: 'Good day.',
      }),
      createAtlasSpot({
        id: 'tiger-bay',
        name: 'Tiger Bay',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Tiger Bay', 'Tiger Bay Resort'],
        coordinates: { latitude: -16.9112, longitude: 28.4262 },
        creator: 'Kariba Fishing Routes',
        uploads: '47 tagged clips',
        liveSignal: 'Tiger fish clips',
        description:
          "Tiger Bay is one of Lake Kariba's most celebrated tiger fishing destinations, offering world-class angling for tigerfish, bream and vundu catfish. The resort camp provides self-catering chalets on the Ume River bay, with spectacular sunsets and a backdrop of flooded mopane woodland.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bumi-hills',
        name: 'Bumi Hills',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Bumi Hills', 'Bumi Hills Safari Lodge'],
        coordinates: { latitude: -16.8057, longitude: 28.3485 },
        creator: 'Kariba Safari Routes',
        uploads: '55 tagged clips',
        liveSignal: 'Lake Kariba safari clips',
        description:
          'Bumi Hills sits on a dramatic escarpment overlooking Lake Kariba, the gateway to Matusadona National Park. The safari lodge perches atop red rock cliffs with sweeping lake views, offering game drives, boat safaris, fishing, and visits to the flooded shoreline teeming with crocodile and hippo.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'kariba-dam-wall',
        name: 'Kariba Dam Wall',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Kariba Dam Wall', 'Kariba Wall', 'Kariba Dam Viewpoint'],
        coordinates: { latitude: -16.52, longitude: 28.77 },
        creator: 'Zambezi Engineering Tours',
        uploads: '68 tagged clips',
        liveSignal: 'Dam wall viewpoint clips',
        description:
          "The Kariba Dam Wall is one of Africa's greatest engineering achievements, impounding the world's largest man-made reservoir by volume. Built 1956–1959 across the Zambezi Gorge, it straddles the Zimbabwe-Zambia border and a viewing platform gives breathtaking perspectives of the gorge.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'dete',
        name: 'Dete',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: ['Dete', 'Dete Village', 'Hwange Gateway'],
        coordinates: { latitude: -18.6166, longitude: 26.8612 },
        creator: 'Hwange Safari Routes',
        uploads: '37 tagged clips',
        liveSignal: 'Safari gateway clips',
        description:
          'Dete is the small railway village and safari hub on the doorstep of Hwange National Park, serving the major camps at Ngamo, Linkwasha and Main Camp. The town has a station, curio stalls and a wildlife art gallery, and the bush begins immediately at the village edge.',
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'tsholotsho',
        name: 'Tsholotsho',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: ['Tsholotsho', 'Tsholo', 'Tsholotsho District'],
        coordinates: { latitude: -19.7663, longitude: 27.7571 },
        creator: 'Matabeleland Cultural Routes',
        uploads: '43 tagged clips',
        liveSignal: 'Cultural village clips',
        description:
          'Tsholotsho is a remote district in the dry Gwaai River basin between Bulawayo and Hwange, inhabited predominantly by Ndebele communities with rich traditional culture. The communal lands buffer the southern edge of Hwange National Park and host significant seasonal elephant populations.',
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'lupane',
        name: 'Lupane',
        region: 'Matabeleland North',
        weatherLocation: 'Hwange, Zimbabwe',
        eventLocationAliases: ['Lupane', 'Lupane District'],
        coordinates: { latitude: -18.9347, longitude: 27.7728 },
        creator: 'Matabeleland North Routes',
        uploads: '31 tagged clips',
        liveSignal: 'Matabeleland North clips',
        description:
          'Lupane is the capital of Matabeleland North Province, a quiet town on the road between Bulawayo and Hwange. It serves as the administrative and service centre for the rural communities of the Gwaai and Shangani River valleys and is surrounded by communal conservancies.',
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'chipinge',
        name: 'Chipinge',
        region: 'Manicaland',
        weatherLocation: 'Chipinge, Zimbabwe',
        eventLocationAliases: ['Chipinge', 'Chipinge Town', 'Mount Selinda'],
        coordinates: { latitude: -20.1889, longitude: 32.6194 },
        creator: 'Eastern Highlands Coffee Routes',
        uploads: '46 tagged clips',
        liveSignal: 'Coffee estate clips',
        description:
          "Chipinge is the gateway to Zimbabwe's coffee and macadamia farming industry, set among rolling hills in the Eastern Highlands. It accesses Chirinda Forest (Africa's tallest indigenous trees), the Haroni-Rusitu confluence, and private coffee and tea estates open to visitors.",
        language: 'Manyika Shona',
        phrase: 'Mhoro',
        translation: 'Hello.',
      }),
      createAtlasSpot({
        id: 'mushandike',
        name: 'Mushandike Sanctuary',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Mushandike Sanctuary', 'Mushandike Dam'],
        coordinates: { latitude: -20.1031, longitude: 30.6484 },
        creator: 'Masvingo Lowveld Routes',
        uploads: '29 tagged clips',
        liveSignal: 'Lowveld sanctuary clips',
        description:
          'Mushandike Sanctuary is a small wildlife reserve and recreational area near Masvingo, centred on Mushandike Dam with giraffe, zebra, waterbuck and antelope. Popular with locals for picnicking, fishing, boating and birdwatching on the reed-fringed lake.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'ruwa',
        name: 'Ruwa',
        region: 'Mashonaland East',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Ruwa', 'Ruwa Town'],
        coordinates: { latitude: -17.883, longitude: 31.248 },
        creator: 'Harare Outskirts Routes',
        uploads: '36 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Ruwa is a fast-growing satellite town east of Harare known for its equestrian culture, pony clubs, and upmarket residential estates. Riding schools and small game farms make it a popular weekend retreat from the capital.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'norton',
        name: 'Norton',
        region: 'Mashonaland West',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Norton', 'Norton Town'],
        coordinates: { latitude: -17.8834, longitude: 30.7019 },
        creator: 'Mashonaland West Routes',
        uploads: '27 tagged clips',
        liveSignal: 'Agricultural town clips',
        description:
          'Norton is an industrial and agricultural town 40km west of Harare on the road to Chegutu, known for horticulture, tobacco and small-scale manufacturing. The surrounding areas include coffee estates, small game farms and proximity to Lake Manyame.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'africa-unity-square',
        name: 'Africa Unity Square',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Africa Unity Square', 'Cecil Square', 'Harare City Park'],
        coordinates: { latitude: -17.8286, longitude: 31.049 },
        creator: 'Harare City Walks',
        uploads: '72 tagged clips',
        liveSignal: 'City square clips',
        description:
          "Africa Unity Square is the green heart of Harare's CBD, flanked by Parliament, the Reserve Bank and the Anglican Cathedral. Originally Cecil Square, it was renamed to celebrate continental unity. The square features a flower market, benches, fountains and is a focal point for city life.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'military-museum-gweru',
        name: 'Zimbabwe Military Museum',
        region: 'Midlands',
        weatherLocation: 'Gweru, Zimbabwe',
        eventLocationAliases: ['Zimbabwe Military Museum', 'Gweru Military Museum'],
        coordinates: { latitude: -19.45, longitude: 29.8167 },
        creator: 'Gweru Heritage Routes',
        uploads: '33 tagged clips',
        liveSignal: 'Museum clips',
        description:
          'The Zimbabwe Military Museum in Gweru displays an extensive outdoor and indoor collection of aircraft, armoured vehicles, artillery and small arms spanning the colonial era through the Liberation War and post-independence period. One of the finest military museums in southern Africa.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'batoka-gorge',
        name: 'Batoka Gorge',
        region: 'Matabeleland North',
        weatherLocation: 'Victoria Falls, Zimbabwe',
        eventLocationAliases: ['Batoka Gorge', 'Zambezi Gorge', 'Victoria Falls Gorge'],
        coordinates: { latitude: -17.9982, longitude: 25.9236 },
        creator: 'Zambezi Adventures',
        uploads: '89 tagged clips',
        liveSignal: 'Gorge action clips',
        description:
          "The Batoka Gorge stretches 120km downstream from Victoria Falls, carved deep into the basalt plateau by the Zambezi. Home to Grade 5 whitewater rafting — some of the world's most thrilling rapids — plus bungee jumping from the Falls Bridge, abseiling, gorge-swing and helicopter flips.",
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'mutoko',
        name: 'Mutoko',
        region: 'Mashonaland East',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Mutoko', 'Mutoko District'],
        coordinates: { latitude: -17.4046, longitude: 32.2256 },
        creator: 'Mashonaland East Routes',
        uploads: '28 tagged clips',
        liveSignal: 'Town clips',
        description:
          'Mutoko is a granite-country town in Mashonaland East famous for its lime deposits, black granite quarrying and communal lands rich in rock art and sacred ancestral sites. It lies on the main road to the Nyamapanda border post with Mozambique.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'gokwe',
        name: 'Gokwe',
        region: 'Midlands',
        weatherLocation: 'Kwekwe, Zimbabwe',
        eventLocationAliases: ['Gokwe', 'Gokwe Town', 'Gokwe North'],
        coordinates: { latitude: -18.225, longitude: 28.9539 },
        creator: 'Midlands Cotton Routes',
        uploads: '32 tagged clips',
        liveSignal: 'Cotton country clips',
        description:
          "Gokwe is the commercial centre of Zimbabwe's premier cotton-growing region in the Midlands, a vast semi-arid plateau bordering the Zambezi Valley. The surrounding communal lands contain community wildlife areas and significant baobab forests.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'nkayi',
        name: 'Nkayi',
        region: 'Matabeleland North',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Nkayi', 'Nkayi District', 'Nkai'],
        coordinates: { latitude: -19.01, longitude: 28.8969 },
        creator: 'Matabeleland North Routes',
        uploads: '26 tagged clips',
        liveSignal: 'Rural district clips',
        description:
          'Nkayi is the administrative centre of the Nkayi District in Matabeleland North, a remote rural area on the Shangani River plains. Known for traditional cattle ranching, Ndebele cultural ceremonies and the Shangani River which supports hippo and crocodile populations.',
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'redcliff',
        name: 'Redcliff',
        region: 'Midlands',
        weatherLocation: 'Kwekwe, Zimbabwe',
        eventLocationAliases: ['Redcliff', 'Red Cliff', 'Zimbabwe Iron & Steel'],
        coordinates: { latitude: -19.0333, longitude: 29.7833 },
        creator: 'Midlands Steel Routes',
        uploads: '24 tagged clips',
        liveSignal: 'Steel town clips',
        description:
          "Redcliff is an industrial town adjacent to Kwekwe, home to the Zimbabwe Iron and Steel Company (ZISCO), once one of Africa's largest integrated steel mills. The red kopje hills gave it its name and the area offers industrial heritage tourism and proximity to Sebakwe Dam Recreational Park.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mvuma',
        name: 'Mvuma',
        region: 'Midlands',
        weatherLocation: 'Gweru, Zimbabwe',
        eventLocationAliases: ['Mvuma', 'Mvuma Town'],
        coordinates: { latitude: -19.2833, longitude: 30.5333 },
        creator: 'Midlands Crossroads Routes',
        uploads: '22 tagged clips',
        liveSignal: 'Crossroads town clips',
        description:
          'Mvuma is a small town at the geographical crossroads of Zimbabwe, roughly equidistant from Harare, Bulawayo, Mutare and Masvingo. The area has gold mining history and is a popular rest stop on the main transit routes through the Midlands.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mwenezi',
        name: 'Mwenezi',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Mwenezi', 'Mwenezi District', 'Nuanetsi'],
        coordinates: { latitude: -21.4231, longitude: 30.7275 },
        creator: 'Southern Lowveld Routes',
        uploads: '28 tagged clips',
        liveSignal: 'Lowveld plains clips',
        description:
          'Mwenezi District in southern Masvingo Province covers vast lowveld plains bordering South Africa and Mozambique. The Nuanetsi Ranch area hosts one of the largest remaining privately managed wildlife populations in Zimbabwe, and the Mwenezi River runs en route to Beitbridge.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'centenary',
        name: 'Centenary',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Centenary', 'Centenary Town', 'Muzarabani'],
        coordinates: { latitude: -16.7305, longitude: 31.1211 },
        creator: 'Mashonaland Central Routes',
        uploads: '27 tagged clips',
        liveSignal: 'Tobacco farming clips',
        description:
          'Centenary is a tobacco farming town in Mashonaland Central on fertile soils north of Bindura. The area transitions from highveld farmland into the Zambezi Valley escarpment and is close to Mavuradonha Wilderness and the Muzarabani lowlands where the Mazowe River enters the valley.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'harare-gardens',
        name: 'Harare Gardens',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Harare Gardens', 'Harare City Gardens'],
        coordinates: { latitude: -17.8248, longitude: 31.0453 },
        creator: 'Harare City Walks',
        uploads: '61 tagged clips',
        liveSignal: 'City garden clips',
        description:
          "Harare Gardens is the city's main recreational park, a large green space near the city centre with manicured lawns, an outdoor theatre, children's play areas and colourful flower beds. It hosts outdoor concerts, arts events and the city's social calendar throughout the year.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bulawayo-art-gallery',
        name: 'Bulawayo Art Gallery',
        region: 'Bulawayo',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Bulawayo Art Gallery', 'National Gallery Bulawayo'],
        coordinates: { latitude: -20.1503, longitude: 28.5833 },
        creator: 'Bulawayo Heritage Walks',
        uploads: '44 tagged clips',
        liveSignal: 'Gallery clips',
        description:
          "The Bulawayo Art Gallery (National Gallery of Zimbabwe Bulawayo) is housed in a colonial-era building in the city's cultural precinct, showcasing Zimbabwean stone sculpture, painting and contemporary art. It sits alongside the Natural History Museum and Bulawayo's civic institutions.",
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'penhalonga',
        name: 'Penhalonga',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Penhalonga', 'Penhalonga Valley'],
        coordinates: { latitude: -18.8819, longitude: 32.6745 },
        creator: 'Mutare Valley Routes',
        uploads: '38 tagged clips',
        liveSignal: 'Valley mining clips',
        description:
          'Penhalonga is a narrow valley north of Mutare with a history of alluvial and hard-rock gold mining stretching back to pre-colonial times. The Mutare River runs through the valley past small mining operations, verdant smallholdings and a scenic route connecting to the Nyanga highlands via the Honde Valley road.',
        language: 'Manyika Shona',
        phrase: 'Mhoro',
        translation: 'Hello.',
      }),
      createAtlasSpot({
        id: 'mana-pools-national-park',
        name: 'Mana Pools National Park',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Mana Pools National Park', 'Mana Pools NP', 'Mana Pools'],
        coordinates: { latitude: -15.966, longitude: 29.4312 },
        creator: 'Zambezi Wild Stories',
        uploads: '148 tagged clips',
        liveSignal: 'Floodplain safari clips',
        description:
          'Mana Pools National Park is the protected national park within the wider Mana Pools landscape. It follows the lower Zambezi floodplain and is famous for walking safaris, canoeing, elephants standing under albida trees and wild dogs.',
        language: 'Shona',
        phrase: 'Mauya',
        translation: 'Welcome.',
      }),
      createAtlasSpot({
        id: 'phundundu-wildlife-area',
        name: 'Phundundu Wildlife Area',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Phundundu Wildlife Area', 'Phundundu', 'Phundundu Safari Area'],
        coordinates: { latitude: -16.3144, longitude: 29.4631 },
        creator: 'Zambezi Valley Conservancies',
        uploads: '34 tagged clips',
        liveSignal: 'Escarpment wildlife clips',
        description:
          'Phundundu Wildlife Area sits in the Hurungwe/Zambezi Valley conservation belt between Kariba, Makuti and Mana Pools routes. It adds another remote wildlife landscape for elephant, antelope and dry woodland habitats.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chimanimani-national-park',
        name: 'Chimanimani National Park',
        region: 'Manicaland',
        weatherLocation: 'Chimanimani, Zimbabwe',
        eventLocationAliases: ['Chimanimani National Park', 'Chimanimani Mountains'],
        coordinates: { latitude: -19.8362, longitude: 33.0122 },
        creator: 'Highlands Collective',
        uploads: '77 tagged clips',
        liveSignal: 'Mountain park clips',
        description:
          "Chimanimani National Park protects quartzite peaks, montane grassland, caves, streams and cross-border mountain wilderness on the Mozambique frontier. It is one of Zimbabwe's strongest hiking and wilderness parks.",
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'matobo-national-park',
        name: 'Matobo National Park',
        region: 'Matabeleland South',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Matobo National Park', 'Matopos National Park', 'Matobo'],
        coordinates: { latitude: -20.4892, longitude: 28.5326 },
        creator: 'Matobo Heritage Walks',
        uploads: '119 tagged clips',
        liveSignal: 'Rhino tracking clips',
        description:
          "Matobo National Park protects granite kopjes, balancing rocks, rock art sites and one of Zimbabwe's best rhino tracking landscapes. It sits within the wider Matobo Hills cultural landscape south of Bulawayo.",
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'victoria-falls-national-park',
        name: 'Victoria Falls National Park',
        region: 'Matabeleland North',
        weatherLocation: 'Victoria Falls, Zimbabwe',
        eventLocationAliases: [
          'Victoria Falls National Park',
          'Victoria Falls Rainforest',
          'Mosi-oa-Tunya',
        ],
        coordinates: { latitude: -17.9471, longitude: 25.8449 },
        creator: 'Zambezi Creators Guild',
        uploads: '154 tagged clips',
        liveSignal: 'Rainforest viewpoints',
        description:
          'Victoria Falls National Park protects the Zimbabwean rainforest viewpoints and gorge-edge walks beside Mosi-oa-Tunya. It is the formal protected area around the falls, spray forest and Zambezi edge.',
        language: 'Nambya',
        phrase: 'Mwabonwa',
        translation: 'A warm greeting used around Hwange and Victoria Falls.',
      }),
      createAtlasSpot({
        id: 'sengwa-wildlife-research-area',
        name: 'Sengwa Wildlife Research Area',
        region: 'Midlands',
        weatherLocation: 'Gokwe, Zimbabwe',
        eventLocationAliases: [
          'Sengwa Wildlife Research Area',
          'Sengwa Wildlife Area',
          'Sengwa Research Area',
        ],
        coordinates: { latitude: -18.0778, longitude: 28.1948 },
        creator: 'Sebungwe Wildlife Routes',
        uploads: '24 tagged clips',
        liveSignal: 'Research area clips',
        description:
          'Sengwa Wildlife Research Area is a remote north-western Zimbabwe conservation and research landscape in the Gokwe/Sebungwe region. It is known for dry woodland, riverine habitat and long-running wildlife ecology work.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chitungwiza',
        name: 'Chitungwiza',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Chitungwiza', 'Chitungwiza City'],
        coordinates: { latitude: -18.0143, longitude: 31.0727 },
        creator: 'Urban Pulse Tours',
        uploads: '83 tagged clips',
        liveSignal: 'Township culture clips',
        description:
          "Chitungwiza is one of Zimbabwe's largest urban centres, south of Harare. It is known for township culture, music, markets, dense neighbourhood life and commuter routes into the capital.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'epworth',
        name: 'Epworth',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Epworth', 'Epworth Town'],
        coordinates: { latitude: -17.8877, longitude: 31.1568 },
        creator: 'Harare City Walks',
        uploads: '55 tagged clips',
        liveSignal: 'Granite township clips',
        description:
          'Epworth is a large settlement south-east of Harare, closely associated with granite outcrops, balancing rocks and fast-growing urban communities. It gives context to the nearby Epworth Balancing Rocks monument.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'chinhoyi',
        name: 'Chinhoyi',
        region: 'Mashonaland West',
        weatherLocation: 'Chinhoyi, Zimbabwe',
        eventLocationAliases: ['Chinhoyi', 'Chinhoyi Town'],
        coordinates: { latitude: -17.3615, longitude: 30.1929 },
        creator: 'Mashonaland West Routes',
        uploads: '61 tagged clips',
        liveSignal: 'Provincial town clips',
        description:
          'Chinhoyi is the Mashonaland West provincial capital and a gateway to Chinhoyi Caves, Karoi, Kariba and the Zambezi Valley. It is an important farming, university and road-trip stop on the Harare-Kariba route.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'karoi',
        name: 'Karoi',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Karoi', 'Karoi Town'],
        coordinates: { latitude: -16.819, longitude: 29.6837 },
        creator: 'Zambezi Valley Routes',
        uploads: '39 tagged clips',
        liveSignal: 'Kariba road clips',
        description:
          'Karoi is a major farming and service town on the road from Harare to Kariba and the Zambezi Valley. It is a practical stop for supplies before Makuti, Mana Pools and Kariba routes.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'shurugwi',
        name: 'Shurugwi',
        region: 'Midlands',
        weatherLocation: 'Gweru, Zimbabwe',
        eventLocationAliases: ['Shurugwi', 'Selukwe'],
        coordinates: { latitude: -19.6682, longitude: 30.0004 },
        creator: 'Midlands Roadtrippers',
        uploads: '35 tagged clips',
        liveSignal: 'Mining town clips',
        description:
          'Shurugwi is a Midlands mining town known historically as Selukwe, set among hills south-east of Gweru. The town connects mining heritage, chrome country and scenic Midlands road routes.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'murehwa',
        name: 'Murehwa',
        region: 'Mashonaland East',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Murehwa', 'Mrehwa'],
        coordinates: { latitude: -17.8044, longitude: 31.8388 },
        creator: 'Mashonaland East Routes',
        uploads: '31 tagged clips',
        liveSignal: 'Growth point clips',
        description:
          'Murehwa is a major service centre in Mashonaland East, known for rural markets, granite hills and routes toward Mutoko and Nyamapanda. It gives the atlas stronger coverage east of Harare.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'shamva',
        name: 'Shamva',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Shamva', 'Shamva Town'],
        coordinates: { latitude: -17.3125, longitude: 31.5785 },
        creator: 'Mashonaland Central Routes',
        uploads: '29 tagged clips',
        liveSignal: 'Mining town clips',
        description:
          'Shamva is a mining and farming town in Mashonaland Central, north-east of Harare. It helps cover the Bindura-Shamva-Mazowe corridor and the rural routes toward the northern escarpment.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'lake-kariba',
        name: 'Lake Kariba',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Lake Kariba', 'Kariba Reservoir', 'Kariba Recreational Park'],
        coordinates: { latitude: -16.9167, longitude: 28.0 },
        creator: 'Kariba Voyager',
        uploads: '221 tagged clips',
        liveSignal: 'Houseboat lake clips',
        description:
          'Lake Kariba is the enormous Zambezi reservoir shared by Zimbabwe and Zambia, stretching from the dam wall toward Binga and Mlibizi. It is central to houseboats, fishing, sunsets, lakeshore wildlife and Matusadona scenery.',
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'tokwe-mukorsi-dam',
        name: 'Tokwe-Mukorsi Dam',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Tokwe-Mukorsi Dam', 'Tugwi-Mukosi Dam', 'Tugwi Mukosi'],
        coordinates: { latitude: -20.6879, longitude: 30.8231 },
        creator: 'Masvingo Water Routes',
        uploads: '42 tagged clips',
        liveSignal: 'Reservoir clips',
        description:
          "Tokwe-Mukorsi Dam is one of Zimbabwe's largest inland reservoirs, south of Masvingo. It supports irrigation, fishing, boating prospects and new lakeside tourism routes in the Lowveld gateway.",
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mazvikadei-dam',
        name: 'Mazvikadei Dam',
        region: 'Mashonaland West',
        weatherLocation: 'Chinhoyi, Zimbabwe',
        eventLocationAliases: ['Mazvikadei Dam', 'Mazvikadei'],
        coordinates: { latitude: -17.2204, longitude: 30.3874 },
        creator: 'Mashonaland West Outdoors',
        uploads: '36 tagged clips',
        liveSignal: 'Dam wall clips',
        description:
          'Mazvikadei Dam is a major reservoir in Mashonaland West, popular for fishing, boating, lodges and weekend escapes from Harare and Chinhoyi. It fills an important gap in the atlas west of the capital.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'manyuchi-dam',
        name: 'Manyuchi Dam',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Manyuchi Dam', 'Manyuchi'],
        coordinates: { latitude: -21.0728, longitude: 30.3807 },
        creator: 'Southern Lowveld Routes',
        uploads: '27 tagged clips',
        liveSignal: 'Mwenezi dam clips',
        description:
          'Manyuchi Dam sits on the Mwenezi River in southern Masvingo Province. It is a major irrigation and fishing reservoir for the dry Lowveld between Mwenezi, Mberengwa and Beitbridge routes.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'osborne-dam',
        name: 'Osborne Dam',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Osborne Dam', 'Osborne Dam Recreational Park'],
        coordinates: { latitude: -18.7664, longitude: 32.4856 },
        creator: 'Manicaland Water Routes',
        uploads: '33 tagged clips',
        liveSignal: 'Odzi reservoir clips',
        description:
          'Osborne Dam is a large reservoir on the Odzi River north-west of Mutare. It supports irrigation, fishing, boating and Manicaland recreational routes around a broad inland lake landscape.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'mtshabezi-dam',
        name: 'Mtshabezi Dam',
        region: 'Matabeleland South',
        weatherLocation: 'Gwanda, Zimbabwe',
        eventLocationAliases: ['Mtshabezi Dam', 'Mtsabezi Dam'],
        coordinates: { latitude: -20.7289, longitude: 28.894 },
        creator: 'Matabeleland South Routes',
        uploads: '26 tagged clips',
        liveSignal: 'Dam country clips',
        description:
          'Mtshabezi Dam is a major Matabeleland South reservoir near Gwanda, important for water supply and rural landscapes. It adds coverage for the dry southern dam network beyond Umzingwane.',
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'zambezi-river',
        name: 'Zambezi River',
        region: 'Matabeleland North',
        weatherLocation: 'Victoria Falls, Zimbabwe',
        eventLocationAliases: ['Zambezi River', 'Zambezi'],
        coordinates: { latitude: -16.9503, longitude: 27.8677 },
        creator: 'Zambezi Creators Guild',
        uploads: '233 tagged clips',
        liveSignal: 'River corridor clips',
        description:
          "The Zambezi River forms Zimbabwe's northern frontier and anchors Victoria Falls, Lake Kariba, Matusadona, Mana Pools and the great canoe safari corridor. It is the country's defining river landscape.",
        language: 'Tonga',
        phrase: 'Mwapona buti',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'limpopo-river',
        name: 'Limpopo River',
        region: 'Matabeleland South',
        weatherLocation: 'Beitbridge, Zimbabwe',
        eventLocationAliases: ['Limpopo River', 'Vhembe'],
        coordinates: { latitude: -22.25, longitude: 31.1667 },
        creator: 'Southern Border Routes',
        uploads: '44 tagged clips',
        liveSignal: 'Border river clips',
        description:
          "The Limpopo River forms Zimbabwe's southern border with South Africa through dry Lowveld country. It is tied to Beitbridge, Crooks Corner, floodplain pans and the southern transfrontier conservation corridor.",
        language: 'Venda',
        phrase: 'Ndaa',
        translation: 'Hello.',
      }),
      createAtlasSpot({
        id: 'save-river',
        name: 'Save River',
        region: 'Manicaland',
        weatherLocation: 'Chipinge, Zimbabwe',
        eventLocationAliases: ['Save River', 'Sabi River'],
        coordinates: { latitude: -20.5311, longitude: 32.2914 },
        creator: 'Save Valley Routes',
        uploads: '51 tagged clips',
        liveSignal: 'River crossing clips',
        description:
          "The Save River drains south-eastern Zimbabwe and shapes the Lowveld around Birchenough Bridge, Save Valley and Chipinge. It is one of the country's most important river corridors.",
        language: 'Ndau',
        phrase: 'Mhoroi',
        translation: 'Hello.',
      }),
      createAtlasSpot({
        id: 'runde-river',
        name: 'Runde River',
        region: 'Masvingo',
        weatherLocation: 'Chiredzi, Zimbabwe',
        eventLocationAliases: ['Runde River', 'Lundi River'],
        coordinates: { latitude: -20.9585, longitude: 30.9069 },
        creator: 'Lowveld Wild Guides',
        uploads: '48 tagged clips',
        liveSignal: 'Gonarezhou river clips',
        description:
          'The Runde River cuts across the southern Lowveld and through Gonarezhou, carving scenery around Chilojo Cliffs before joining the Save system. It is one of the key wildlife rivers in south-eastern Zimbabwe.',
        language: 'Shangani',
        phrase: 'Avuxeni',
        translation: 'Good morning.',
      }),
      createAtlasSpot({
        id: 'pungwe-river',
        name: 'Pungwe River',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Pungwe River', 'Pungwe', 'Pungwe Gorge'],
        coordinates: { latitude: -18.4215, longitude: 32.7808 },
        creator: 'Eastern Highlands Explorers',
        uploads: '39 tagged clips',
        liveSignal: 'Highland river clips',
        description:
          'The Pungwe River rises in the Eastern Highlands below Mount Nyangani before flowing toward Mozambique. Around Nyanga it forms dramatic gorge scenery, waterfalls and highland hiking routes.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'mazowe-river',
        name: 'Mazowe River',
        region: 'Mashonaland Central',
        weatherLocation: 'Bindura, Zimbabwe',
        eventLocationAliases: ['Mazowe River', 'Mazoe River'],
        coordinates: { latitude: -17.543, longitude: 30.994 },
        creator: 'Mazowe Valley Tours',
        uploads: '41 tagged clips',
        liveSignal: 'Valley river clips',
        description:
          'The Mazowe River flows through the Mazowe Valley north of Harare and continues toward the Zambezi system. It connects Mazowe Dam, citrus estates, Bindura country and northern valley routes.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'manyame-river',
        name: 'Manyame River',
        region: 'Harare',
        weatherLocation: 'Harare, Zimbabwe',
        eventLocationAliases: ['Manyame River', 'Hunyani River'],
        coordinates: { latitude: -17.9803, longitude: 31.0469 },
        creator: 'Urban Pulse Tours',
        uploads: '37 tagged clips',
        liveSignal: 'River corridor clips',
        description:
          "The Manyame River drains the Harare plateau through Chitungwiza and westward toward Lake Chivero and Lake Manyame. It is one of the capital region's most important watercourses.",
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'sanyati-river',
        name: 'Sanyati River',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Sanyati River', 'Sanyati'],
        coordinates: { latitude: -17.1131, longitude: 28.9211 },
        creator: 'Zambezi Valley Routes',
        uploads: '35 tagged clips',
        liveSignal: 'Zambezi tributary clips',
        description:
          'The Sanyati River is a major Zambezi tributary draining parts of the Midlands and Mashonaland West into Lake Kariba. It shapes remote valley landscapes, fishing spots and wildlife corridors.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'gwayi-river',
        name: 'Gwayi River',
        region: 'Matabeleland North',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Gwayi River', 'Gwai River'],
        coordinates: { latitude: -19.1048, longitude: 27.681 },
        creator: 'Matabeleland North Routes',
        uploads: '34 tagged clips',
        liveSignal: 'River plains clips',
        description:
          "The Gwayi River is one of Matabeleland North's major rivers, draining cattle country, rural settlements and wildlife areas toward the Zambezi basin. It is an important landmark between Lupane, Nkayi and Hwange routes.",
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'shangani-river',
        name: 'Shangani River',
        region: 'Matabeleland North',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Shangani River', 'Shangani'],
        coordinates: { latitude: -18.8155, longitude: 28.2647 },
        creator: 'Matabeleland North Routes',
        uploads: '32 tagged clips',
        liveSignal: 'Historic river clips',
        description:
          'The Shangani River is a major watercourse of western Zimbabwe, associated with Matabeleland history, cattle country and seasonal river landscapes. It gives the Explore map a stronger western river layer.',
        language: 'Ndebele',
        phrase: 'Salibonani',
        translation: 'Hello to more than one person.',
      }),
      createAtlasSpot({
        id: 'mzingwane-river',
        name: 'Mzingwane River',
        region: 'Matabeleland South',
        weatherLocation: 'Gwanda, Zimbabwe',
        eventLocationAliases: ['Mzingwane River', 'Umzingwane River'],
        coordinates: { latitude: -21.1818, longitude: 29.361 },
        creator: 'Matabeleland South Routes',
        uploads: '31 tagged clips',
        liveSignal: 'Southern river clips',
        description:
          "The Mzingwane River drains Matabeleland South toward the Limpopo basin, linking Gwanda, Umzingwane Dam country and dry southern cattle landscapes. It is one of the region's defining rivers.",
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'munyati-river',
        name: 'Munyati River',
        region: 'Midlands',
        weatherLocation: 'Kwekwe, Zimbabwe',
        eventLocationAliases: ['Munyati River', 'Munyati'],
        coordinates: { latitude: -18.3056, longitude: 29.4852 },
        creator: 'Midlands Water Routes',
        uploads: '30 tagged clips',
        liveSignal: 'Midlands river clips',
        description:
          'The Munyati River drains central Zimbabwe through the Midlands and Mashonaland West, feeding reservoirs and agricultural landscapes. It is an important hydrological link between Kwekwe, Kadoma and the Sanyati system.',
        language: 'Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'mwenezi-river',
        name: 'Mwenezi River',
        region: 'Masvingo',
        weatherLocation: 'Masvingo, Zimbabwe',
        eventLocationAliases: ['Mwenezi River', 'Nuanetsi River'],
        coordinates: { latitude: -21.4188, longitude: 30.7073 },
        creator: 'Southern Lowveld Routes',
        uploads: '28 tagged clips',
        liveSignal: 'Lowveld river clips',
        description:
          'The Mwenezi River is a major southern Zimbabwe river flowing through dry Lowveld country toward the Limpopo system. It links Manyuchi Dam, Mwenezi District and the wildlife landscapes around Malapati and Gonarezhou approaches.',
        language: 'Karanga Shona',
        phrase: 'Makadii?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'bubi-river',
        name: 'Bubi River',
        region: 'Matabeleland South',
        weatherLocation: 'Beitbridge, Zimbabwe',
        eventLocationAliases: ['Bubi River', 'Bubi'],
        coordinates: { latitude: -22.2199, longitude: 31.0179 },
        creator: 'Southern Border Routes',
        uploads: '24 tagged clips',
        liveSignal: 'Limpopo tributary clips',
        description:
          'The Bubi River drains Matabeleland South toward the Limpopo basin, passing through dry southern landscapes around Gwanda, Mwenezi and Beitbridge routes. It is one of the key tributaries in the south-west.',
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'odzi-river',
        name: 'Odzi River',
        region: 'Manicaland',
        weatherLocation: 'Mutare, Zimbabwe',
        eventLocationAliases: ['Odzi River', 'Odzi'],
        coordinates: { latitude: -19.4723, longitude: 32.5172 },
        creator: 'Manicaland Water Routes',
        uploads: '25 tagged clips',
        liveSignal: 'Save tributary clips',
        description:
          "The Odzi River is a major Manicaland tributary of the Save system, feeding Osborne Dam and farming landscapes west of Mutare. It anchors a large part of Manicaland's inland water story.",
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      createAtlasSpot({
        id: 'upper-ncema-dam',
        name: 'Upper Ncema Dam',
        region: 'Matabeleland South',
        weatherLocation: 'Bulawayo, Zimbabwe',
        eventLocationAliases: ['Upper Ncema Dam', 'Upper Ncema'],
        coordinates: { latitude: -20.3023, longitude: 28.987 },
        creator: 'Bulawayo Water Routes',
        uploads: '21 tagged clips',
        liveSignal: 'Bulawayo supply dam clips',
        description:
          "Upper Ncema Dam is part of the Matabeleland South dam network that supports Bulawayo's water supply. It sits in dry granite country south-east of the city, close to other Ncema and Umzingwane catchments.",
        language: 'Ndebele',
        phrase: 'Linjani?',
        translation: 'How are you?',
      }),
      createAtlasSpot({
        id: 'nyangombe-falls',
        name: 'Nyangombe Falls',
        region: 'Manicaland',
        weatherLocation: 'Nyanga, Zimbabwe',
        eventLocationAliases: ['Nyangombe Falls', 'Nyanga Falls'],
        coordinates: { latitude: -18.285, longitude: 32.6788 },
        creator: 'Nyanga Trail Notes',
        uploads: '47 tagged clips',
        liveSignal: 'Waterfall route clips',
        description:
          'Nyangombe Falls is a major waterfall stop inside the Nyanga highlands, close to the park roads and trout-country routes. Its cascades and pools are among the most accessible waterfall experiences in Nyanga.',
        language: 'Manyika Shona',
        phrase: 'Maswera sei?',
        translation: 'How has your day been?',
      }),
      ...MAP_PROVIDER_LOCATION_SPOTS.map(createAtlasSpot),
    ],
    []
  );

  const [searchQuery, setSearchQuery] = useState('');
  const locationSearchTerms = useMemo(
    () => normalizeLocationSearchValue(searchQuery).split(' ').filter(Boolean),
    [searchQuery]
  );
  const searchedSpots = useMemo(
    () =>
      locationSearchTerms.length
        ? atlasSpots.filter(spot => spotMatchesLocationSearch(spot, locationSearchTerms))
        : atlasSpots,
    [atlasSpots, locationSearchTerms]
  );
  const locationFilterOptions = useMemo(
    () => [
      { key: 'All', label: 'All' },
      ...ZIMBABWE_PROVINCES.map(province => ({ key: province, label: province })),
    ],
    []
  );

  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSpotId, setActiveSpotId] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [detailCardVisible, setDetailCardVisible] = useState(false);
  const detailCardAnim = useRef(new Animated.Value(0)).current;
  const lastDetailSpot = useRef<AtlasSpot | null>(null);
  const [forecastByLocation, setForecastByLocation] = useState<Record<string, WeatherDay[]>>({});
  const [events, setEvents] = useState<EventCardItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [favoriteEventsVersion, setFavoriteEventsVersion] = useState(0);
  const eventHeartScalesRef = useRef<Record<string, Animated.Value>>({});
  const activityHeartScalesRef = useRef<Record<string, Animated.Value>>({});
  const atlasHeartScalesRef = useRef<Record<string, Animated.Value>>({});
  const [favoriteLocationsVersion, setFavoriteLocationsVersion] = useState(0);
  const [allStays, setAllStays] = useState<Stay[]>([]);
  const [nowTick, setNowTick] = useState(Date.now());

  const handleLocationSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setActiveCategory('All');
    setActiveSpotId('');
  }, []);

  const visibleMapSpots = useMemo(() => {
    if (activeCategory === 'All') {
      return searchedSpots;
    }
    return searchedSpots.filter(spot => spot.region === activeCategory);
  }, [activeCategory, searchedSpots]);
  const mapOverview = useMemo(() => {
    const overview = isZimbabweProvince(activeCategory)
      ? PROVINCE_MAP_OVERVIEWS[activeCategory]
      : ZIMBABWE_MAP_OVERVIEW;
    const mappedCount = activeCategory === 'All' ? searchedSpots.length : visibleMapSpots.length;

    return {
      ...overview,
      mappedCount,
    };
  }, [activeCategory, searchedSpots.length, visibleMapSpots.length]);

  const selectedSpot = activeSpotId
    ? (atlasSpots.find(spot => spot.id === activeSpotId) ?? null)
    : null;
  const selectedWeatherLocation = selectedSpot
    ? getWeatherLocationForSpot(selectedSpot)
    : undefined;
  const selectedWeatherKey = selectedWeatherLocation
    ? normalizeLocationSearchValue(selectedWeatherLocation)
    : '';
  const selectedForecast = selectedWeatherKey ? forecastByLocation[selectedWeatherKey] : undefined;
  const detailSpot = detailCardVisible ? (selectedSpot ?? lastDetailSpot.current) : null;
  const detailWildlifeSightings = useMemo(
    () => (detailSpot ? getWildlifeSightings(detailSpot) : []),
    [detailSpot]
  );
  const hasDetailWildlifeSightings = detailWildlifeSightings.length > 0;
  const galleryScopeSpots = useMemo(() => {
    if (selectedSpot) {
      return [selectedSpot];
    }

    if (activeCategory !== 'All' || locationSearchTerms.length > 0) {
      return visibleMapSpots;
    }

    return searchedSpots;
  }, [activeCategory, locationSearchTerms.length, searchedSpots, selectedSpot, visibleMapSpots]);
  const galleryImages = useMemo(
    () => buildGalleryImagesForScope(galleryScopeSpots, mapOverview.image),
    [galleryScopeSpots, mapOverview.image]
  );
  const galleryLocationLabel =
    selectedSpot?.name ??
    (activeCategory !== 'All'
      ? activeCategory
      : locationSearchTerms.length > 0
        ? searchQuery.trim()
        : 'Zimbabwe');
  const galleryRouteParams = useMemo(
    () => ({
      location: galleryLocationLabel,
      title: galleryLocationLabel,
      galleryType: 'location',
      contextImage: selectedSpot?.image ?? mapOverview.image,
      images: JSON.stringify(galleryImages),
    }),
    [galleryImages, galleryLocationLabel, mapOverview.image, selectedSpot]
  );
  const languagePhraseOptions = useMemo(
    () => (selectedSpot ? getLanguagePhraseOptions(selectedSpot) : []),
    [selectedSpot]
  );
  const galleryCardBackground = colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA';
  const scopedMapSpots = useMemo(() => {
    if (selectedSpot) {
      return [selectedSpot];
    }

    if (activeCategory !== 'All' || locationSearchTerms.length > 0) {
      return visibleMapSpots;
    }

    return [];
  }, [activeCategory, locationSearchTerms.length, selectedSpot, visibleMapSpots]);
  const listScopeLocations = useMemo(
    () => buildLocationScope(scopedMapSpots, !!selectedSpot),
    [scopedMapSpots, selectedSpot]
  );
  const listScopeLabel =
    selectedSpot?.name ??
    (activeCategory !== 'All'
      ? activeCategory
      : locationSearchTerms.length > 0
        ? searchQuery.trim()
        : '');
  const listScopeRouteParams = useMemo(
    () => ({
      ...(listScopeLabel ? { location: listScopeLabel } : {}),
      ...(listScopeLocations.length > 0 ? { locations: listScopeLocations.join('|') } : {}),
    }),
    [listScopeLabel, listScopeLocations]
  );
  const selectedEvents = useMemo(
    () =>
      listScopeLocations.length > 0
        ? events.filter(event => itemMatchesLocationScope(event.location, listScopeLocations))
        : events,
    [events, listScopeLocations]
  );
  const upcomingEvents = useMemo(
    () =>
      [...selectedEvents]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3),
    [selectedEvents]
  );
  React.useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedStays = useMemo(() => {
    if (listScopeLocations.length === 0) return allStays;
    return allStays.filter(stay =>
      itemMatchesLocationScope(stay.location ?? '', listScopeLocations)
    );
  }, [allStays, listScopeLocations]);
  const featuredStays = useMemo(() => selectedStays.slice(0, 3), [selectedStays]);
  const selectedActivities = useMemo(() => {
    return thingsToDoData.filter(
      a =>
        listScopeLocations.length === 0 || itemMatchesLocationScope(a.location, listScopeLocations)
    );
  }, [listScopeLocations]);
  const featuredActivities = useMemo(() => selectedActivities.slice(0, 3), [selectedActivities]);
  const getAtlasHeartScale = useCallback((id: string) => {
    if (!atlasHeartScalesRef.current[id]) {
      atlasHeartScalesRef.current[id] = new Animated.Value(1);
    }
    return atlasHeartScalesRef.current[id];
  }, []);
  const getActivityHeartScale = useCallback((id: string) => {
    if (!activityHeartScalesRef.current[id]) {
      activityHeartScalesRef.current[id] = new Animated.Value(1);
    }
    return activityHeartScalesRef.current[id];
  }, []);
  const mapHtml = useMemo(
    () => buildZimbabweMapHtml(searchedSpots, '', colorScheme === 'dark'),
    [colorScheme, searchedSpots] // activeSpotId intentionally omitted — active state is updated via injectJavaScript; category filtering via injectCategoryFilter
  );

  // Reset shimmer whenever the map HTML rebuilds (e.g. theme switch or search change)
  useEffect(() => {
    setMapLoaded(false);
  }, [mapHtml]);

  useEffect(
    () => subscribeFavorites(() => setFavoriteLocationsVersion(version => version + 1)),
    []
  );

  useEffect(() => {
    if (activeCategory !== 'All' && !searchedSpots.some(spot => spot.region === activeCategory)) {
      setActiveCategory('All');
    }

    if (activeSpotId && !searchedSpots.some(spot => spot.id === activeSpotId)) {
      setActiveSpotId('');
    }
  }, [activeCategory, activeSpotId, searchedSpots]);

  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 260,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, [hasDetailWildlifeSightings]);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Animate detail card in/out when selected spot changes
  useEffect(() => {
    if (selectedSpot) {
      lastDetailSpot.current = selectedSpot;
      if (!detailCardVisible) {
        LayoutAnimation.configureNext({
          duration: 350,
          create: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
            duration: 350,
          },
          update: { type: LayoutAnimation.Types.spring, springDamping: 0.82 },
        });
        setDetailCardVisible(true);
        detailCardAnim.setValue(0);
        Animated.spring(detailCardAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 72,
          friction: 9,
        }).start();
      }
    } else if (detailCardVisible) {
      Animated.timing(detailCardAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start(() => {
        LayoutAnimation.configureNext({
          duration: 300,
          update: { type: LayoutAnimation.Types.spring, springDamping: 0.85 },
        });
        setDetailCardVisible(false);
      });
    }
  }, [selectedSpot]);

  const webViewRef = useRef<InstanceType<typeof WebView>>(null);
  const lastCategoryFilterInjectionRef = useRef('');

  const injectActiveMarker = useCallback((id: string, lat?: number, lng?: number) => {
    const panJs =
      id && lat != null && lng != null
        ? `if(window._leafletMap){
          var focusZoom = Math.max(window._leafletMap.getZoom(), 8);
          window._leafletMap.flyTo([${lat},${lng}], focusZoom, {animate:true,duration:0.5,easeLinearity:0.25});
        }`
        : '';
    const js = `(function(){
      document.querySelectorAll('.map-marker').forEach(function(el){
        el.classList.remove('is-active');
        var svg = el.querySelector('svg');
        if(svg) svg.setAttribute('fill','#8E8E93');
        var lbl = el.querySelector('.pin-label');
        if(lbl) lbl.classList.remove('visible');
        var icon = el.parentElement;
        if(icon) icon.style.zIndex = '';
      });
      var el = document.getElementById('mpin-${id}');
      if(el){
        el.classList.add('is-active');
        var svg = el.querySelector('svg');
        if(svg) svg.setAttribute('fill','#ff3b30');
        var lbl = el.querySelector('.pin-label');
        if(lbl) lbl.classList.add('visible');
        var icon = el.parentElement;
        if(icon) icon.style.zIndex = '9999';
      }
      ${panJs}
      true;
    })();`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  useEffect(() => {
    injectActiveMarker(
      selectedSpot?.id ?? '',
      selectedSpot?.coordinates.latitude,
      selectedSpot?.coordinates.longitude
    );
  }, [selectedSpot?.id, injectActiveMarker]);

  const injectCategoryFilter = useCallback((category: string, animated = true) => {
    const catJson = JSON.stringify(category);
    const animatedJson = JSON.stringify(animated);
    const js = `(function(){
      var cat = ${catJson};
      var animated = ${animatedJson};
      var markers = window._markers || {};
      var markerIds = Object.keys(markers);
      var filterRunId = (window._categoryFilterRunId || 0) + 1;
      window._categoryFilterRunId = filterRunId;
      function setMarkerVisible(id, visible) {
        var m = markers[id];
        var el = m && m.marker && m.marker.getElement ? m.marker.getElement() : null;
        if (!el) return;
        if (m.hideTimer) {
          window.clearTimeout(m.hideTimer);
          m.hideTimer = null;
        }
        if (visible) {
          el.style.display = '';
          el.style.pointerEvents = '';
          requestAnimationFrame(function() { el.style.opacity = '1'; });
        } else {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          m.hideTimer = window.setTimeout(function() {
            if (filterRunId !== window._categoryFilterRunId) {
              m.hideTimer = null;
              return;
            }
            if (cat !== 'All' && markers[id] && markers[id].region !== cat) {
              el.style.display = 'none';
            }
            m.hideTimer = null;
          }, animated ? 160 : 0);
        }
      }
      function easeToBounds(bounds, padding, duration) {
        if (!window._leafletMap || !bounds) return;
        var map = window._leafletMap;
        var pad = L.point(padding[0], padding[1]);
        var zoom = map.getBoundsZoom(bounds, false, pad);
        map.stop();
        if (animated) {
          map.flyTo(bounds.getCenter(), zoom, {
            animate: true,
            duration: duration,
            easeLinearity: 0.18,
            noMoveStart: true
          });
        } else {
          map.fitBounds(bounds, { padding: padding, animate: false });
        }
      }

      markerIds.forEach(function(id) {
        var m = markers[id];
        if (cat === 'All') {
          setMarkerVisible(id, true);
        } else {
          setMarkerVisible(id, m.region === cat);
        }
      });

      if (window._leafletMap) {
        if (cat !== 'All') {
          var pts = [];
          markerIds.forEach(function(id) {
            if (markers[id].region === cat) pts.push(markers[id].marker.getLatLng());
          });
          if (pts.length > 0) easeToBounds(L.latLngBounds(pts), [30, 30], 0.55);
        } else if (window._zimbabweBounds) {
          easeToBounds(window._zimbabweBounds, [18, 18], 0.5);
        }
      }
      true;
    })();`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const runCategoryFilter = useCallback(
    (category: string, animated = true, force = false) => {
      const key = `${category}:${animated ? 'animated' : 'static'}`;
      if (!force && lastCategoryFilterInjectionRef.current === key) {
        return;
      }

      lastCategoryFilterInjectionRef.current = key;
      injectCategoryFilter(category, animated);
    },
    [injectCategoryFilter]
  );

  useEffect(() => {
    runCategoryFilter(activeCategory);
  }, [activeCategory, runCategoryFilter]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    injectActiveMarker(selectedSpot?.id ?? '');
    runCategoryFilter(activeCategory, false, true);
  }, [injectActiveMarker, runCategoryFilter, selectedSpot?.id, activeCategory]);

  const cardBackground = useMemo(
    () => ({
      backgroundColor:
        colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.9)',
    }),
    [colorScheme]
  );
  const listCardBorderStyle = useMemo(
    () => ({
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    }),
    [colorScheme]
  );

  const mutedTextColor = colorScheme === 'dark' ? 'rgba(242,242,247,0.72)' : 'rgba(60,60,67,0.72)';
  const subtleTextColor = colorScheme === 'dark' ? 'rgba(242,242,247,0.58)' : 'rgba(60,60,67,0.58)';
  const sectionIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E';
  const sectionSubheadingColor = subtleTextColor;
  const wildlifeIconColor = colorScheme === 'dark' ? '#FFFFFF' : '#111111';
  const weatherPillStyle =
    colorScheme === 'dark' ? styles.weatherDayPillDark : styles.weatherDayPillLight;
  const weatherTextColor = theme.tint;

  React.useEffect(() => {
    if (!selectedWeatherLocation || !selectedWeatherKey || selectedForecast !== undefined) {
      return;
    }

    let isActive = true;

    weatherService
      .getForecast(selectedWeatherLocation)
      .then(forecastData => {
        if (!isActive) {
          return;
        }

        setForecastByLocation(prev => ({
          ...prev,
          [selectedWeatherKey]: forecastData?.slice(0, 5) ?? [],
        }));
      })
      .catch(error => {
        console.warn(`Failed to load explore forecast for ${selectedWeatherLocation}:`, error);
        if (isActive) {
          setForecastByLocation(prev => ({
            ...prev,
            [selectedWeatherKey]: [],
          }));
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedForecast, selectedWeatherKey, selectedWeatherLocation]);

  React.useEffect(() => {
    let isActive = true;

    eventsService
      .getAll()
      .then(({ data, error }) => {
        if (!isActive) {
          return;
        }

        if (error || !data) {
          setEvents([]);
          return;
        }

        setEvents(data.map(mapEventRecordToEvent));
      })
      .catch(error => {
        console.warn('Failed to load explore events:', error);
        if (isActive) {
          setEvents([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setEventsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    let isActive = true;
    staysService
      .getAll()
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error || !data) {
          setAllStays([]);
          return;
        }
        setAllStays(data);
      })
      .catch(() => {
        if (isActive) setAllStays([]);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const getEventHeartScale = useCallback((id: string) => {
    if (!eventHeartScalesRef.current[id]) {
      eventHeartScalesRef.current[id] = new Animated.Value(1);
    }

    return eventHeartScalesRef.current[id];
  }, []);

  const handleToggleAtlasFavorite = useCallback(
    (id: string) => {
      const scale = getAtlasHeartScale(id);
      Haptics.selectionAsync().catch(() => {});
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      toggleFavoriteUtil(id, 'destination');
      setFavoriteLocationsVersion(version => version + 1);
    },
    [getAtlasHeartScale]
  );

  const handleToggleEventFavorite = useCallback(
    (id: string) => {
      const scale = getEventHeartScale(id);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();

      toggleFavoriteUtil(id, 'event');
      setFavoriteEventsVersion(version => version + 1);
    },
    [getEventHeartScale]
  );

  const handleCategoryPress = useCallback(
    (category: string) => {
      runCategoryFilter(category);
      setActiveCategory(category);
      setActiveSpotId('');
    },
    [runCategoryFilter]
  );

  const handleMapMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
        if (payload.type === 'mapReady') {
          setMapLoaded(true);
          injectActiveMarker(selectedSpot?.id ?? '');
          runCategoryFilter(activeCategory, false, true);
        } else if (payload.type === 'selectSpot' && typeof payload.id === 'string') {
          const spot = atlasSpots.find(s => s.id === payload.id);
          if (spot) {
            runCategoryFilter(spot.region);
            setActiveSpotId(spot.id);
            setActiveCategory(spot.region);
          }
        }
      } catch {
        // Ignore non-JSON WebView messages.
      }
    },
    [atlasSpots, injectActiveMarker, runCategoryFilter, selectedSpot?.id, activeCategory]
  );

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
          <View style={styles.searchFilterSection}>
            <SearchBar
              value={searchQuery}
              onChangeText={handleLocationSearchChange}
              placeholder="Search"
            />

            <FilterBar
              options={locationFilterOptions}
              activeFilter={activeCategory}
              onFilterChange={handleCategoryPress}
            />
          </View>

          {atlasSpots.length > 0 ? (
            <View style={styles.atlasSection}>
              {/* Map Card */}
              <View style={[styles.atlasCard, cardBackground]}>
                <View style={styles.mapStage}>
                  <View style={styles.mapBackdrop} />
                  <View style={styles.mapCanvas}>
                    <WebView
                      ref={webViewRef}
                      source={{ html: mapHtml }}
                      style={styles.mapWebView}
                      originWhitelist={['*']}
                      javaScriptEnabled
                      domStorageEnabled
                      scrollEnabled={false}
                      bounces={false}
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                      onMessage={handleMapMessage}
                      onLoadEnd={handleMapLoad}
                    />
                    {!mapLoaded && (
                      <View style={styles.mapShimmerOverlay} pointerEvents="none">
                        <ShimmerPlaceholder width="100%" height="100%" borderRadius={0} />
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {!selectedSpot && !detailCardVisible && (
                <View style={[styles.atlasCard, cardBackground]}>
                  <ImageBackground
                    source={{ uri: mapOverview.image }}
                    style={styles.atlasDetailHero}
                    imageStyle={styles.atlasDetailImage}
                    resizeMode="cover"
                  >
                    <View style={styles.atlasDetailScrim} />
                    <View style={styles.atlasDetailHeroContent}>
                      <ThemedText
                        style={styles.atlasHeroTitle}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {mapOverview.title}
                      </ThemedText>
                      <View style={styles.atlasHeroMetaRow}>
                        <View style={styles.atlasHeroMetaItem}>
                          <Ionicons name="map-outline" size={13} color="#FFFFFF" />
                          <ThemedText style={styles.atlasHeroMetaText}>
                            {mapOverview.mappedCount}{' '}
                            {mapOverview.mappedCount === 1 ? 'place' : 'places'} mapped
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>

                  <View style={styles.atlasDetailPanel}>
                    {mapOverview.sightings.length > 0 && (
                      <View style={styles.wildlifeSightingsSection}>
                        <View style={styles.wildlifeSightingsHeader}>
                          <View style={styles.staysHeaderIcon}>
                            <BinocularsIcon size={24} color={sectionIconColor} />
                          </View>
                          <View>
                            <SectionTitle color={sectionIconColor}>Wildlife Sightings</SectionTitle>
                            <ThemedText
                              type="bodyBold"
                              style={[
                                styles.wildlifeSightingsTitle,
                                { color: sectionSubheadingColor },
                              ]}
                            >
                              Animals you might see
                            </ThemedText>
                          </View>
                        </View>

                        <WildlifeSightingsScrollRow
                          items={mapOverview.sightings}
                          iconColor={wildlifeIconColor}
                          noteColor={subtleTextColor}
                          itemKeyPrefix={`overview-${mapOverview.title}`}
                        />
                      </View>
                    )}

                    <ThemedText
                      type="default"
                      style={[
                        styles.atlasDescription,
                        {
                          color:
                            colorScheme === 'dark'
                              ? 'rgba(242,242,247,0.84)'
                              : 'rgba(28,28,30,0.78)',
                        },
                      ]}
                    >
                      {mapOverview.description}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Image/Details Card — slides in when a location is selected */}
              {detailCardVisible && (
                <Animated.View
                  style={{
                    opacity: detailCardAnim,
                    transform: [
                      {
                        scale: detailCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.96, 1],
                        }),
                      },
                      {
                        translateY: detailCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [18, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <View style={[styles.atlasCard, cardBackground]}>
                    {detailSpot && (
                      <>
                        <ImageBackground
                          source={{ uri: detailSpot.image }}
                          style={styles.atlasDetailHero}
                          imageStyle={styles.atlasDetailImage}
                          resizeMode="cover"
                        >
                          <View style={styles.atlasDetailScrim} />
                          <TouchableOpacity
                            style={[
                              styles.atlasHeroHeartButton,
                              {
                                backgroundColor:
                                  colorScheme === 'dark'
                                    ? 'rgba(0,0,0,0.7)'
                                    : 'rgba(255,255,255,0.8)',
                              },
                            ]}
                            onPress={() => handleToggleAtlasFavorite(detailSpot.id)}
                            hitSlop={{
                              top: FEATURED_DESTINATION_OVERLAY_PADDING,
                              left: FEATURED_DESTINATION_OVERLAY_PADDING,
                              bottom: FEATURED_DESTINATION_OVERLAY_PADDING,
                              right: FEATURED_DESTINATION_OVERLAY_PADDING,
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Favorite ${detailSpot.name} ${isFavoritedUtil(detailSpot.id) ? 'selected' : 'not selected'}`}
                          >
                            <Animated.View
                              style={{ transform: [{ scale: getAtlasHeartScale(detailSpot.id) }] }}
                            >
                              <FontAwesomeIcon
                                icon={isFavoritedUtil(detailSpot.id) ? solidHeart : regularHeart}
                                size={18}
                                color="#FF4757"
                              />
                            </Animated.View>
                          </TouchableOpacity>
                          <View style={styles.atlasDetailHeroContent}>
                            <ThemedText
                              style={styles.atlasHeroTitle}
                              numberOfLines={2}
                              adjustsFontSizeToFit
                              minimumFontScale={0.78}
                            >
                              {detailSpot.name}
                            </ThemedText>
                            <View style={styles.atlasHeroMetaRow}>
                              <View style={styles.atlasHeroMetaItem}>
                                <Ionicons name="location-outline" size={14} color="#FFFFFF" />
                                <ThemedText style={styles.atlasHeroMetaText}>
                                  {detailSpot.region}
                                </ThemedText>
                              </View>
                              <View style={styles.atlasHeroMetaItem}>
                                <Ionicons name="navigate-outline" size={13} color="#FFFFFF" />
                                <ThemedText style={styles.atlasHeroMetaText}>
                                  {Math.abs(detailSpot.coordinates.latitude).toFixed(2)}°S ·{' '}
                                  {detailSpot.coordinates.longitude.toFixed(2)}°E
                                </ThemedText>
                              </View>
                            </View>
                          </View>
                        </ImageBackground>

                        <View style={styles.atlasDetailPanel}>
                          {hasDetailWildlifeSightings && (
                            <Animated.View
                              style={[
                                styles.wildlifeSightingsSection,
                                {
                                  opacity: detailCardAnim,
                                  transform: [
                                    {
                                      translateY: detailCardAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [10, 0],
                                      }),
                                    },
                                  ],
                                },
                              ]}
                            >
                              <View style={styles.wildlifeSightingsHeader}>
                                <View style={styles.staysHeaderIcon}>
                                  <BinocularsIcon size={24} color={sectionIconColor} />
                                </View>
                                <View>
                                  <SectionTitle color={sectionIconColor}>
                                    Wildlife Sightings
                                  </SectionTitle>
                                  <ThemedText
                                    type="bodyBold"
                                    style={[
                                      styles.wildlifeSightingsTitle,
                                      { color: sectionSubheadingColor },
                                    ]}
                                  >
                                    Animals you might see
                                  </ThemedText>
                                </View>
                              </View>

                              <WildlifeSightingsScrollRow
                                items={detailWildlifeSightings}
                                iconColor={wildlifeIconColor}
                                noteColor={subtleTextColor}
                                animation={detailCardAnim}
                                itemKeyPrefix={`detail-${detailSpot.id}`}
                              />
                            </Animated.View>
                          )}

                          <ThemedText
                            type="default"
                            style={[
                              styles.atlasDescription,
                              {
                                color:
                                  colorScheme === 'dark'
                                    ? 'rgba(242,242,247,0.84)'
                                    : 'rgba(28,28,30,0.78)',
                              },
                            ]}
                          >
                            {detailSpot.description}
                          </ThemedText>

                          <View style={styles.atlasDetailFooterRow}>
                            <View style={styles.atlasDetailMiniStat}>
                              <Ionicons name="language-outline" size={15} color={mutedTextColor} />
                              <ThemedText
                                type="caption"
                                style={[styles.atlasDetailMiniStatText, { color: mutedTextColor }]}
                              >
                                {detailSpot.language}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </Animated.View>
              )}

              {selectedSpot && selectedWeatherLocation && (
                <View style={[styles.weatherCard, cardBackground]}>
                  <View style={styles.featureHeaderRow}>
                    <View style={styles.staysHeaderIcon}>
                      <WeatherIcon size={24} color={sectionIconColor} />
                    </View>
                    <View>
                      <SectionTitle color={sectionIconColor}>Weather Forecast</SectionTitle>
                    </View>
                  </View>

                  {selectedForecast === undefined ? (
                    <View style={[styles.weatherStatusPanel, weatherPillStyle]}>
                      <ThemedText style={[styles.weatherStatusText, { color: weatherTextColor }]}>
                        Loading forecast...
                      </ThemedText>
                    </View>
                  ) : selectedForecast.length > 0 ? (
                    <View style={styles.weatherForecastRow}>
                      {selectedForecast.map((day, index) => (
                        <View
                          key={`${day.day}-${index}`}
                          style={[styles.weatherPill, weatherPillStyle]}
                        >
                          <ThemedText style={[styles.pillDayText, { color: weatherTextColor }]}>
                            {day.day}
                          </ThemedText>
                          <Ionicons
                            name={getForecastIconName(day.iconName)}
                            size={22}
                            color={weatherTextColor}
                            style={styles.pillWeatherIcon}
                          />
                          <View style={styles.pillTempRow}>
                            <ThemedText style={[styles.pillHighText, { color: weatherTextColor }]}>
                              {day.high}°
                            </ThemedText>
                            <ThemedText style={[styles.pillLowText, { color: weatherTextColor }]}>
                              {day.low}°
                            </ThemedText>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.weatherStatusPanel, weatherPillStyle]}>
                      <ThemedText style={[styles.weatherStatusText, { color: weatherTextColor }]}>
                        Forecast unavailable for this location.
                      </ThemedText>
                    </View>
                  )}
                </View>
              )}

              {galleryImages.length > 0 && (
                <View
                  style={[
                    styles.gallerySection,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                    },
                  ]}
                >
                  <View style={styles.gallerySectionHeader}>
                    <View style={styles.staysHeaderIcon}>
                      <GalleryIcon size={24} color={sectionIconColor} />
                    </View>
                    <View style={styles.featureTitleGroup}>
                      <SectionTitle color={sectionIconColor}>Gallery</SectionTitle>
                    </View>
                    <ViewAllButton
                      onPress={() =>
                        router.push({
                          pathname: '/gallery',
                          params: galleryRouteParams,
                        })
                      }
                    />
                  </View>
                  <View style={styles.galleryContainer}>
                    <View style={styles.galleryRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          styles.galleryCardContainer,
                          { backgroundColor: galleryCardBackground },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: '/gallery',
                            params: galleryRouteParams,
                          })
                        }
                      >
                        <Image
                          source={{ uri: galleryImages[0] }}
                          style={styles.galleryImageCard}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          styles.galleryCardContainer,
                          { backgroundColor: galleryCardBackground },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: '/gallery',
                            params: galleryRouteParams,
                          })
                        }
                      >
                        <Image
                          source={{ uri: galleryImages[1] || galleryImages[0] }}
                          style={styles.galleryImageCard}
                          resizeMode="cover"
                        />
                        {galleryImages.length > 1 && (
                          <View style={styles.galleryOverlayMask}>
                            <ThemedText style={styles.galleryOverlayText}>
                              {`+${Math.max(galleryImages.length - 1, 0)}`}
                            </ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.gallerySection,
                  { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <View style={styles.gallerySectionHeader}>
                  <View style={styles.staysHeaderIcon}>
                    <AccommodationIcon size={24} color={sectionIconColor} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <SectionTitle color={sectionIconColor}>Stays</SectionTitle>
                  </View>
                  <ViewAllButton
                    disabled={featuredStays.length === 0}
                    onPress={() =>
                      router.push({
                        pathname: '/destination-stays',
                        params: listScopeRouteParams,
                      })
                    }
                  />
                </View>
                {featuredStays.length > 0 ? (
                  <View style={styles.staysListContainer}>
                    {featuredStays.map(stay => (
                      <StayCard
                        key={stay.id}
                        stay={stay}
                        isDark={colorScheme === 'dark'}
                        onPress={s =>
                          router.push({ pathname: '/stay-profile', params: { id: s.id } })
                        }
                        onShare={() => {}}
                        style={[
                          styles.staysListCard,
                          listCardBorderStyle,
                          {
                            shadowOpacity: 0,
                            elevation: 0,
                          },
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.eventsEmptyState}>
                    <AccommodationIcon size={60} color={colorScheme === 'dark' ? '#555' : '#ccc'} />
                    <ThemedText type="defaultSemiBold" style={styles.eventsEmptyTitle}>
                      No stays listed yet
                    </ThemedText>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.gallerySection,
                  { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <View style={styles.gallerySectionHeader}>
                  <View style={styles.staysHeaderIcon}>
                    <EventsIcon size={24} color={sectionIconColor} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <SectionTitle color={sectionIconColor}>Upcoming Events</SectionTitle>
                  </View>
                  <ViewAllButton
                    disabled={upcomingEvents.length === 0}
                    onPress={() =>
                      router.push({ pathname: '/screens/Events', params: listScopeRouteParams })
                    }
                  />
                </View>
                {upcomingEvents.length > 0 ? (
                  <View style={styles.eventsListContainer}>
                    {upcomingEvents.map(item => (
                      <EventCard
                        key={item.id}
                        item={item}
                        isFavorited={isFavoritedUtil(item.id)}
                        onToggleFavorite={handleToggleEventFavorite}
                        heartScale={getEventHeartScale(item.id)}
                        style={[styles.eventsListCard, listCardBorderStyle]}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.eventsEmptyState}>
                    <EventsIcon size={60} color={colorScheme === 'dark' ? '#555' : '#ccc'} />
                    <ThemedText type="defaultSemiBold" style={styles.eventsEmptyTitle}>
                      No events listed yet
                    </ThemedText>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.gallerySection,
                  { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <View style={styles.gallerySectionHeader}>
                  <View style={styles.staysHeaderIcon}>
                    <ThingsIcon size={24} color={sectionIconColor} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <SectionTitle color={sectionIconColor}>Things To Do</SectionTitle>
                  </View>
                  <ViewAllButton
                    disabled={featuredActivities.length === 0}
                    onPress={() =>
                      router.push({
                        pathname: '/screens/ThingsToDoScreen',
                        params: listScopeRouteParams,
                      })
                    }
                  />
                </View>
                {featuredActivities.length > 0 ? (
                  <View style={styles.activitiesListContainer}>
                    {featuredActivities.map(item => {
                      const isDark = colorScheme === 'dark';
                      const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
                      const heartBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
                      const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
                      const pillText = isDark ? '#FFFFFF' : '#000000';
                      const pillIconBg = isDark ? '#1C1C1E' : '#FFFFFF';
                      const status: ActivityStatus = getActivityStatus(new Date(nowTick), {
                        operatingHours: item.operatingHours,
                        durationHours: item.durationHours,
                      });
                      const statusColor = activityStatusColor(status);
                      const basePrice =
                        typeof item.priceFrom === 'number' && item.priceFrom > 0
                          ? Math.max(5, Math.round(item.priceFrom / 5) * 5)
                          : 25;
                      return (
                        <ListImageCard
                          key={item.id}
                          title={item.name}
                          imageUri={`https://picsum.photos/300/200?random=${item.imageRandom}`}
                          onPress={() =>
                            router.push({
                              pathname: '/activity-profile',
                              params: {
                                activityId: item.id,
                                activityName: item.name,
                                activityLocation: item.location,
                                priceFrom: String(basePrice),
                              },
                            })
                          }
                          onToggleFavorite={() => toggleFavoriteUtil(item.id, 'activity')}
                          isFavorited={isFavoritedUtil(item.id)}
                          heartScale={getActivityHeartScale(item.id)}
                          backgroundColor={cardBg}
                          heartBackgroundColor={heartBg}
                          style={[
                            styles.activitiesListCard,
                            listCardBorderStyle,
                            {
                              shadowOpacity: 0,
                              elevation: 0,
                            },
                          ]}
                          topRow={
                            <View style={styles.activityMetaRow}>
                              <LocationPill
                                label={item.location}
                                variant="compact"
                              />
                              <RatingPill
                                value={item.rating}
                                backgroundColor={pillBg}
                                iconBackgroundColor={pillIconBg}
                                lightTextColor={pillText}
                                darkTextColor={pillText}
                              />
                            </View>
                          }
                          bottomLeft={
                            <StatusPill
                              label={status}
                              backgroundColor={pillBg}
                              iconBackgroundColor={pillIconBg}
                              iconColor={statusColor}
                              lightTextColor={statusColor}
                              darkTextColor={statusColor}
                            />
                          }
                          bottomRight={
                            <View style={styles.activityPriceStack}>
                              <ThemedText
                                style={styles.activityPriceLabel}
                                lightColor="#8E8E93"
                                darkColor="#8E8E93"
                              >
                                from
                              </ThemedText>
                              <View style={styles.activityPriceRow}>
                                <Ionicons
                                  name="pricetag-outline"
                                  size={14}
                                  color="#34C759"
                                  style={styles.activityPriceIcon}
                                />
                                <ThemedText
                                  style={styles.activityPriceCurrency}
                                  lightColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                                  darkColor="#FFFFFF"
                                >
                                  $
                                </ThemedText>
                                <ThemedText
                                  style={styles.activityPriceValue}
                                  lightColor={isDark ? '#FFFFFF' : '#1C1C1E'}
                                  darkColor="#FFFFFF"
                                >
                                  {basePrice}
                                </ThemedText>
                                <ThemedText
                                  style={styles.activityPriceUnit}
                                  lightColor="#8E8E93"
                                  darkColor="#8E8E93"
                                >
                                  /person
                                </ThemedText>
                              </View>
                            </View>
                          }
                        />
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.eventsEmptyState}>
                    <ThingsIcon size={60} color={colorScheme === 'dark' ? '#555' : '#ccc'} />
                    <ThemedText type="defaultSemiBold" style={styles.eventsEmptyTitle}>
                      No activities listed yet
                    </ThemedText>
                  </View>
                )}
              </View>

              {selectedSpot && (
                <View style={[styles.languageCard, cardBackground]}>
                  <View style={styles.featureHeaderRow}>
                    <View style={[styles.featureIcon, styles.languageIcon]}>
                      <Ionicons name="language-outline" size={18} color="#1F1F1F" />
                    </View>
                    <View style={styles.featureTitleGroup}>
                      <SectionTitle color={sectionIconColor}>Phrase of the Day</SectionTitle>
                    </View>
                  </View>

                  <View style={styles.phraseRow}>
                    <View style={styles.phraseBubble}>
                      <ThemedText type="title3" style={styles.phraseText}>
                        {selectedSpot.translation}
                      </ThemedText>
                    </View>
                    <View style={styles.phraseDetailStack}>
                      <ThemedText type="defaultSemiBold" style={styles.localPhraseText}>
                        {selectedSpot.phrase}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={[styles.phraseLanguageText, { color: mutedTextColor }]}
                      >
                        {selectedSpot.language}
                      </ThemedText>
                    </View>
                  </View>

                  {languagePhraseOptions.length > 0 && (
                    <View style={styles.lessonList}>
                      {languagePhraseOptions.map(item => (
                        <View key={item.language} style={styles.languageRow}>
                          <ThemedText type="defaultSemiBold" style={styles.languageRowTranslation}>
                            {item.phrase}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            style={[styles.languageRowPhrase, { color: mutedTextColor }]}
                          >
                            {item.language}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {selectedSpot && (
                <View style={styles.languageLearningGrid}>
                  {['Learn Ndebele', 'Learn Shona'].map((title, index) => (
                    <TouchableOpacity
                      key={title}
                      activeOpacity={0.85}
                      style={[
                        styles.languageLearningTile,
                        index === 0 && styles.languageLearningTileSpacing,
                      ]}
                      onPress={() => router.push('/translate')}
                    >
                      <Image
                        source={{ uri: selectedSpot.image }}
                        style={styles.languageLearningTileImage}
                        resizeMode="cover"
                      />
                      <View style={styles.languageLearningAction}>
                        <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                      </View>
                      <View style={styles.languageLearningTileInfo}>
                        <ThemedText
                          style={styles.languageLearningTileTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          adjustsFontSizeToFit
                          minimumFontScale={0.82}
                        >
                          {title}
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.placeholderCard, cardBackground]}>
              <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
                Atlas locations are being curated
              </ThemedText>
              <ThemedText
                type="default"
                style={[styles.placeholderCopy, { color: mutedTextColor }]}
              >
                New creator map locations for {activeCategory.toLowerCase()} will appear here.
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
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 80,
  },
  storiesSection: {
    marginBottom: 16,
    marginHorizontal: -SCREEN_HORIZONTAL_PADDING,
  },
  storiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    paddingLeft: SCREEN_HORIZONTAL_PADDING,
    paddingRight: SCREEN_HORIZONTAL_PADDING,
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
  searchFilterSection: {
    marginHorizontal: -SCREEN_HORIZONTAL_PADDING,
    paddingHorizontal: 0,
    paddingTop: 8,
    marginTop: 4,
    marginBottom: EXPLORE_SECTION_GAP,
    overflow: 'hidden',
  },
  atlasSection: {
    gap: EXPLORE_SECTION_GAP,
    paddingBottom: 8,
  },
  atlasCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  mapStage: {
    height: 390,
    overflow: 'hidden',
    backgroundColor: '#102B2A',
  },
  mapBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#163633',
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  mapShimmerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  atlasDetailHero: {
    minHeight: 230,
    padding: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  atlasDetailImage: {
    transform: [{ scale: 1.02 }],
    borderRadius: 20,
  },
  atlasDetailScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  atlasHeroHeartButton: {
    position: 'absolute',
    top: FEATURED_DESTINATION_CARD_INSET,
    right: FEATURED_DESTINATION_CARD_INSET,
    width: FEATURED_DESTINATION_ACTION_SIZE,
    height: FEATURED_DESTINATION_ACTION_SIZE,
    borderRadius: FEATURED_DESTINATION_ACTION_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  atlasDetailHeroContent: {
    gap: 9,
  },
  atlasHeroTitle: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(30),
    lineHeight: responsiveLineHeight(32),
    fontFamily: Fonts.bold,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  atlasHeroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  atlasHeroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 22,
  },
  atlasHeroMetaText: {
    color: '#FFFFFF',
    fontSize: responsiveFontSize(10),
    lineHeight: responsiveLineHeight(10),
    fontFamily: Fonts.bold,
  },
  atlasDetailPanel: {
    padding: 16,
    gap: 15,
  },
  wildlifeSightingsSection: {
    gap: 15,
  },
  wildlifeSightingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitleText: {
    fontSize: responsiveFontSize(20),
    lineHeight: responsiveLineHeight(21),
    fontFamily: Fonts.bold,
    letterSpacing: 0,
  },
  wildlifeSightingsTitle: {
    marginTop: 2,
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(20),
  },
  wildlifeSightingsScrollWrap: {
    gap: 8,
  },
  wildlifeSightingsScroller: {
    marginHorizontal: -4,
  },
  wildlifeSightingsGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    columnGap: WILDLIFE_SIGHTING_TILE_GAP,
    paddingHorizontal: 4,
    paddingRight: 14,
  },
  wildlifeScrollTrack: {
    height: 3,
    marginHorizontal: 4,
    borderRadius: 999,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: 'rgba(142,142,147,0.22)',
    overflow: 'visible',
  },
  wildlifeScrollThumb: {
    height: 3,
    borderRadius: 999,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    opacity: 0.62,
  },
  wildlifeSightingTile: {
    width: WILDLIFE_SIGHTING_TILE_WIDTH,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
  },
  wildlifeSightingIcon: {
    width: 50,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wildlifeSightingName: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(10),
    lineHeight: responsiveLineHeight(11),
    textAlign: 'center',
  },
  wildlifeSightingNote: {
    fontFamily: Fonts.bold,
    fontSize: responsiveFontSize(9),
    lineHeight: responsiveLineHeight(10),
    textAlign: 'center',
  },
  atlasDescription: {
    fontFamily: Fonts.bold,
    lineHeight: responsiveLineHeight(18),
  },
  atlasDetailFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 2,
  },
  atlasDetailMiniStat: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(142,142,147,0.12)',
  },
  atlasDetailMiniStatText: {
    fontFamily: Fonts.bold,
    lineHeight: responsiveLineHeight(11),
  },
  aiVisitCard: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  weatherCard: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  eventsListContainer: {
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
    gap: 12,
  },
  eventsListCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 0,
  },
  staysListContainer: {
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
    gap: 12,
  },
  staysListCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 0,
  },
  activitiesListContainer: {
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
    gap: 12,
  },
  activitiesListCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 0,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityPriceStack: {
    alignItems: 'flex-end',
  },
  activityPriceLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  activityPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityPriceIcon: {
    marginRight: 4,
  },
  activityPriceValue: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  activityPriceCurrency: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  activityPriceUnit: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginLeft: 2,
  },
  eventsCard: {
    borderRadius: 20,
    borderWidth: 0,
    paddingVertical: 16,
    gap: 14,
    overflow: 'hidden',
  },
  eventsTitle: {
    textAlign: 'left',
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveLineHeight(15),
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
  },
  eventsList: {
    width: '100%',
  },
  eventsListContent: {
    paddingRight: 0,
    paddingBottom: EVENT_CARD_SPACING,
  },
  eventsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  eventsEmptyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventsEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsEmptyIconSecondary: {
    marginLeft: -8,
    backgroundColor: 'rgba(142,142,147,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  eventsEmptyTitle: {
    textAlign: 'center',
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveLineHeight(15),
  },
  eventsEmptyCopy: {
    marginTop: 6,
    textAlign: 'center',
    lineHeight: responsiveLineHeight(13),
  },
  gallerySection: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  gallerySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,

  },
  staysHeaderIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryContainer: {
    width: '100%',
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
    paddingTop: 0,
  },
  galleryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
    gap: GALLERY_CARD_GAP,
  },
  galleryCardContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImageCard: { width: '100%', aspectRatio: 3 / 2 },
  galleryOverlayMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  galleryOverlayText: {
    fontSize: responsiveFontSize(28),
    lineHeight: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  languageCard: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageIcon: {
    backgroundColor: '#FFC247',
  },
  languageLearningGrid: {
    flexDirection: 'row',
    marginHorizontal: -SCREEN_HORIZONTAL_PADDING,
    paddingHorizontal: FEATURED_DESTINATION_HORIZONTAL_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
  },
  languageLearningTile: {
    width: FEATURED_DESTINATION_CARD_WIDTH,
    borderRadius: FEATURED_DESTINATION_CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#242021',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    position: 'relative',
  },
  languageLearningTileSpacing: {
    marginRight: FEATURED_DESTINATION_CARD_SPACING,
  },
  languageLearningTileImage: {
    width: '100%',
    height: FEATURED_DESTINATION_CARD_HEIGHT,
  },
  languageLearningAction: {
    position: 'absolute',
    top: FEATURED_DESTINATION_CARD_INSET,
    right: FEATURED_DESTINATION_CARD_INSET,
    width: FEATURED_DESTINATION_ACTION_SIZE,
    height: FEATURED_DESTINATION_ACTION_SIZE,
    borderRadius: FEATURED_DESTINATION_ACTION_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  languageLearningTileInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: FEATURED_DESTINATION_OVERLAY_PADDING,
    borderBottomLeftRadius: FEATURED_DESTINATION_CARD_RADIUS,
    borderBottomRightRadius: FEATURED_DESTINATION_CARD_RADIUS,
  },
  languageLearningTileTitle: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(18),
    fontFamily: Fonts.bold,
    textAlign: 'left',
    letterSpacing: 0.3,
  },
  featureTitleGroup: {
    flex: 1,
  },
  weatherForecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  weatherPill: {
    flex: 1,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  weatherDayPillLight: {
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  weatherDayPillDark: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pillDayText: {
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveLineHeight(12),
    fontFamily: Fonts.bold,
    opacity: 0.9,
  },
  pillWeatherIcon: {
    marginVertical: 2,
  },
  pillTempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pillHighText: {
    fontSize: responsiveFontSize(15),
    lineHeight: responsiveLineHeight(15),
    fontFamily: Fonts.bold,
  },
  pillLowText: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(13),
    fontFamily: Fonts.medium,
    opacity: 0.7,
  },
  weatherStatusText: {
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(13),
    fontFamily: Fonts.medium,
  },
  weatherStatusPanel: {
    alignSelf: 'stretch',
    borderRadius: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionText: {
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveLineHeight(13),
    flexShrink: 1,
  },
  phraseRow: {
    gap: 10,
  },
  phraseBubble: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    backgroundColor: 'rgba(255,194,71,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  phraseText: {
    color: '#B05A00',
  },
  phraseDetailStack: {
    gap: 3,
  },
  localPhraseText: {
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveLineHeight(16),
  },
  phraseLanguageText: {
    lineHeight: responsiveLineHeight(15),
  },
  lessonList: {
    gap: 10,
  },
  lessonItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lessonPlayButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonCopy: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: responsiveFontSize(14),
    lineHeight: responsiveLineHeight(14),
  },
  lessonMeta: {
    marginTop: 2,
  },
  languageRow: {
    paddingVertical: 10,
  },
  languageRowTranslation: {
    fontSize: responsiveFontSize(16),
    lineHeight: responsiveLineHeight(16),
  },
  languageRowPhrase: {
    marginTop: 3,
    fontSize: responsiveFontSize(13),
  },
  placeholderCard: {
    padding: 20,
    borderRadius: 16,
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
