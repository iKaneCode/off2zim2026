import React, { useCallback, useMemo, useRef, useState } from 'react';
import { responsiveFontSize, responsiveLineHeight, responsiveSize, Fonts } from '@/constants/Fonts';
import type { ComponentProps } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
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
} from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CustomHeader, EventCard, FilterBar, ListImageCard, LocationPill, ProfileLocationPill, RatingPill, StatusPill, StayCard, ViewAllButton } from '@/components';
import { EVENT_CARD_SPACING, EVENT_CARD_WIDTH } from '@/components/EventCard';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IOSScreenWrapper } from '@/components/IOSScreenWrapper';
import { getProfileLocationPillColors } from '@/utils/profileLocationPillStyles';
import { weatherService } from '@/services/weather';
import { eventsService, staysService } from '@/services/database';
import { thingsToDoData } from '@/constants/FeaturedData';
import { getActivityStatus, activityStatusColor, type ActivityStatus } from '@/utils/timeStatus';
import type { Stay } from '@/types/Stay';
import {
  eventMatchesLocation,
  mapEventRecordToEvent,
  type EventCardItem,
} from '@/utils/eventUtils';
import {
  isFavorited as isFavoritedUtil,
  toggleFavorite as toggleFavoriteUtil,
} from '@/utils/favoritesUtils';
import { router } from 'expo-router';
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

const DEFAULT_ATLAS_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';

function createAtlasSpot(seed: AtlasSpotSeed): AtlasSpot {
  return {
    ...seed,
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

function buildZimbabweMapHtml(spots: AtlasSpot[], activeSpotId: string, isDark: boolean) {
  const markerPayload = spots.map(spot => ({
    id: spot.id,
    name: spot.name,
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
      .leaflet-control-attribution {
        border-radius: 10px 0 0 0;
        font-size: 9px;
        background: ${panelBackground};
        color: ${panelText};
      }
      .leaflet-control-zoom {
        border: 0;
        box-shadow: 0 10px 24px rgba(0,0,0,0.22);
      }
      .leaflet-control-zoom a {
        border: 0;
        color: ${panelText};
        background: ${panelBackground};
      }
      .off2zim-marker {
        background: transparent;
        border: 0;
      }
      .marker-wrap {
        position: relative;
        width: 104px;
        height: 66px;
        transform: translateX(-26px);
        pointer-events: auto;
      }
      .creator-marker {
        position: absolute;
        left: 34px;
        top: 0;
        width: 42px;
        height: 42px;
        border-radius: 21px;
        display: grid;
        place-items: center;
        color: #ff3b30;
        background: ${inactiveMarker};
        border: 3px solid rgba(255,255,255,0.92);
        box-shadow: 0 8px 20px rgba(0,0,0,0.28);
        font-weight: 800;
        font-size: 16px;
      }
      .creator-marker::after {
        content: "";
        position: absolute;
        left: 15px;
        bottom: -8px;
        width: 12px;
        height: 12px;
        background: inherit;
        border-right: 3px solid rgba(255,255,255,0.92);
        border-bottom: 3px solid rgba(255,255,255,0.92);
        transform: rotate(45deg);
      }
      .creator-marker.is-active {
        color: #ffffff;
        background: #ff3b30;
      }
      .creator-marker.is-active::before {
        content: "";
        position: absolute;
        inset: -10px;
        border-radius: 999px;
        border: 2px solid rgba(255,59,48,0.42);
        animation: pulse 1.7s ease-out infinite;
      }
      .marker-label {
        position: absolute;
        left: 0;
        right: 0;
        top: 47px;
        margin: 0 auto;
        max-width: 104px;
        padding: 4px 8px;
        border-radius: 999px;
        color: ${panelText};
        background: ${panelBackground};
        box-shadow: 0 6px 14px rgba(0,0,0,0.18);
        font-size: 10px;
        font-weight: 800;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .marker-label.is-active-label {
        color: #ffffff;
        background: rgba(255,59,48,0.92);
      }
      .map-loading {
        position: absolute;
        inset: 0;
        z-index: 900;
        display: grid;
        place-items: center;
        color: ${panelText};
        background: ${mapBackground};
        font-size: 13px;
        font-weight: 800;
      }
      @keyframes pulse {
        from {
          opacity: 0.8;
          transform: scale(0.8);
        }
        to {
          opacity: 0;
          transform: scale(1.45);
        }
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="map-loading" id="map-loading">Loading Zimbabwe map...</div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        var loading = document.getElementById('map-loading');
        if (!window.L) {
          if (loading) {
            loading.textContent = 'Map needs an internet connection';
          }
          return;
        }

        var spots = ${encodedSpots};
        var activeSpotId = ${encodedActiveSpotId};
        var zimbabweBounds = L.latLngBounds([[-22.45, 25.12], [-15.55, 33.15]]);
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: true,
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

        map.fitBounds(zimbabweBounds, { padding: [14, 14], animate: false });
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        spots.forEach(function (spot) {
          var isActive = spot.id === activeSpotId;
          var markerHtml =
            '<div class="marker-wrap">' +
              '<div class="creator-marker ' + (isActive ? 'is-active' : '') + '">' +
                '<span>' + spot.initial + '</span>' +
              '</div>' +
              '<div class="marker-label ' + (isActive ? 'is-active-label' : '') + '">' +
                spot.name +
              '</div>' +
            '</div>';

          var marker = L.marker([spot.latitude, spot.longitude], {
            icon: L.divIcon({
              className: 'off2zim-marker',
              html: markerHtml,
              iconSize: [104, 66],
              iconAnchor: [52, 42]
            }),
            riseOnHover: true
          }).addTo(map);

          marker.on('click', function () {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'selectSpot',
                id: spot.id
              }));
            }
          });

          if (isActive) {
            marker.setZIndexOffset(1000);
            L.circle([spot.latitude, spot.longitude], {
              radius: 38000,
              color: '#ff3b30',
              weight: 2,
              fillColor: '#ff3b30',
              fillOpacity: 0.12,
              opacity: 0.55
            }).addTo(map);
          }
        });

        map.on('drag', function () {
          map.panInsideBounds(zimbabweBounds, { animate: false });
        });

        setTimeout(function () {
          if (loading) {
            loading.remove();
          }
        }, 650);
      })();
    </script>
  </body>
</html>`;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);
const STORY_SLIDE_DURATION = 4500;
const SCREEN_HORIZONTAL_PADDING = responsiveSize(16, 14, 20);
const TITLE_BOTTOM_PADDING = responsiveSize(8, 6, 10);
const GALLERY_CARD_GAP = 4;
const GALLERY_CONTAINER_PADDING = 8;

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const categories = useMemo(
    () => [
      'All',
      'Binga',
      'Bulawayo',
      'Chinhoyi Caves',
      'Chimanimani',
      'Eastern Highlands',
      'Gonarezhou',
      'Great Zimbabwe',
      'Harare',
      'Hwange National Park',
      'Kariba',
      'Khami Ruins',
      'Mana Pools',
      'Masvingo',
      'Matobo Hills',
      'Mutare',
      'Nyanga',
      'Victoria Falls',
      'Vumba',
      'Zvishavane',
    ],
    []
  );
  const locationFilterOptions = useMemo(
    () => categories.map(category => ({ key: category, label: category })),
    [categories]
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

  const atlasSpots = useMemo<AtlasSpot[]>(
    () => [
      createAtlasSpot({
        id: 'binga',
        name: 'Binga',
        region: 'Matabeleland North',
        weatherLocation: 'Binga, Zimbabwe',
        coordinates: { latitude: -17.6167, longitude: 27.3333 },
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
        region: 'Bulawayo Metropolitan',
        weatherLocation: 'Bulawayo, Zimbabwe',
        coordinates: { latitude: -20.1325, longitude: 28.6265 },
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
        eventLocationAliases: ['Chinhoyi Caves', 'Chinhoyi'],
        coordinates: { latitude: -17.3568, longitude: 30.1282 },
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
        coordinates: { latitude: -18.9707, longitude: 32.6709 },
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
        coordinates: { latitude: -21.6667, longitude: 31.6667 },
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
        region: 'Harare Metropolitan',
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
        coordinates: { latitude: -18.6299, longitude: 26.5 },
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
        coordinates: { latitude: -16.5167, longitude: 28.8 },
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
        coordinates: { latitude: -20.1589, longitude: 28.3764 },
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
        name: 'Mana Pools',
        region: 'Mashonaland West',
        weatherLocation: 'Kariba, Zimbabwe',
        eventLocationAliases: ['Mana Pools', 'Kariba'],
        coordinates: { latitude: -15.8192, longitude: 29.4017 },
        creator: 'Zambezi Wild Stories',
        uploads: '263 tagged clips',
        liveSignal: 'Canoe route clips',
        description:
          'Mana Pools is a UNESCO-listed Zambezi floodplain known for canoe safaris, walking safaris, elephants and wild dogs. Mana means four in Shona, referring to the seasonal pools that draw wildlife.',
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
        coordinates: { latitude: -18.2167, longitude: 32.75 },
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
        coordinates: { latitude: -19.1, longitude: 32.75 },
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
    ],
    []
  );

  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSpotId, setActiveSpotId] = useState('binga');
  const [forecastBySpotId, setForecastBySpotId] = useState<Record<string, WeatherDay[]>>({});
  const [events, setEvents] = useState<EventCardItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [favoriteEventsVersion, setFavoriteEventsVersion] = useState(0);
  const eventHeartScalesRef = useRef<Record<string, Animated.Value>>({});
  const activityHeartScalesRef = useRef<Record<string, Animated.Value>>({});
  const [allStays, setAllStays] = useState<Stay[]>([]);
  const [nowTick, setNowTick] = useState(Date.now());

  const filteredSpots = useMemo(() => {
    if (activeCategory === 'All') {
      return atlasSpots;
    }
    return atlasSpots.filter(spot => spot.name === activeCategory);
  }, [activeCategory, atlasSpots]);

  const selectedSpot = filteredSpots.find(spot => spot.id === activeSpotId) ?? filteredSpots[0];
  const selectedSpotId = selectedSpot?.id;
  const selectedWeatherLocation = selectedSpot?.weatherLocation;
  const selectedForecast = selectedSpotId ? forecastBySpotId[selectedSpotId] : undefined;
  const galleryImages = selectedSpot ? [selectedSpot.image] : [];
  const galleryCardBackground = colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA';
  const selectedEvents = useMemo(
    () =>
      selectedSpot
        ? events.filter(event => eventMatchesLocation(event, selectedSpot.eventLocationAliases))
        : [],
    [events, selectedSpot]
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
    if (!selectedSpot) return [];
    const aliases = [
      selectedSpot.name,
      ...(selectedSpot.eventLocationAliases ?? []),
    ].map(a => a.toLowerCase());
    return allStays.filter(stay =>
      aliases.some(alias =>
        stay.location?.toLowerCase().includes(alias) ||
        alias.includes(stay.location?.toLowerCase() ?? '')
      )
    );
  }, [allStays, selectedSpot]);
  const featuredStays = useMemo(() => selectedStays.slice(0, 3), [selectedStays]);
  const selectedActivities = useMemo(() => {
    if (!selectedSpot) return [];
    const aliases = [
      selectedSpot.name,
      ...(selectedSpot.eventLocationAliases ?? []),
    ].map(a => a.toLowerCase());
    return thingsToDoData.filter(a =>
      aliases.some(alias =>
        a.location.toLowerCase().includes(alias) ||
        alias.includes(a.location.toLowerCase())
      )
    );
  }, [selectedSpot]);
  const featuredActivities = useMemo(() => selectedActivities.slice(0, 3), [selectedActivities]);
  const getActivityHeartScale = useCallback((id: string) => {
    if (!activityHeartScalesRef.current[id]) {
      activityHeartScalesRef.current[id] = new Animated.Value(1);
    }
    return activityHeartScalesRef.current[id];
  }, []);
  const mapHtml = useMemo(
    () =>
      buildZimbabweMapHtml(filteredSpots, selectedSpot?.id ?? activeSpotId, colorScheme === 'dark'),
    [activeSpotId, colorScheme, filteredSpots, selectedSpot?.id]
  );

  const cardBackground = useMemo(
    () => ({
      backgroundColor:
        colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.9)',
    }),
    [colorScheme]
  );

  const mutedTextColor = colorScheme === 'dark' ? 'rgba(242,242,247,0.72)' : 'rgba(60,60,67,0.72)';
  const subtleTextColor = colorScheme === 'dark' ? 'rgba(242,242,247,0.58)' : 'rgba(60,60,67,0.58)';
  const atlasBorderColor =
    colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(31,31,31,0.08)';
  const atlasLocationPillColors = getProfileLocationPillColors(colorScheme, 'overlay');
  const weatherPillStyle =
    colorScheme === 'dark' ? styles.weatherDayPillDark : styles.weatherDayPillLight;
  const weatherTextColor = theme.tint;

  React.useEffect(() => {
    if (!selectedSpotId || !selectedWeatherLocation || selectedForecast !== undefined) {
      return;
    }

    let isActive = true;

    weatherService
      .getForecast(selectedWeatherLocation)
      .then(forecastData => {
        if (!isActive) {
          return;
        }

        setForecastBySpotId(prev => ({
          ...prev,
          [selectedSpotId]: forecastData?.slice(0, 5) ?? [],
        }));
      })
      .catch(error => {
        console.warn(`Failed to load explore forecast for ${selectedWeatherLocation}:`, error);
        if (isActive) {
          setForecastBySpotId(prev => ({
            ...prev,
            [selectedSpotId]: [],
          }));
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedForecast, selectedSpotId, selectedWeatherLocation]);

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
        if (error || !data) { setAllStays([]); return; }
        setAllStays(data);
      })
      .catch(() => { if (isActive) setAllStays([]); });
    return () => { isActive = false; };
  }, []);

  const getEventHeartScale = useCallback((id: string) => {
    if (!eventHeartScalesRef.current[id]) {
      eventHeartScalesRef.current[id] = new Animated.Value(1);
    }

    return eventHeartScalesRef.current[id];
  }, []);

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
      setActiveCategory(category);
      const nextSpot =
        category === 'All' ? atlasSpots[0] : atlasSpots.find(spot => spot.name === category);
      if (nextSpot) {
        setActiveSpotId(nextSpot.id);
      }
    },
    [atlasSpots]
  );

  const handleMapMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
        if (
          payload.type === 'selectSpot' &&
          typeof payload.id === 'string' &&
          atlasSpots.some(spot => spot.id === payload.id)
        ) {
          setActiveSpotId(payload.id);
        }
      } catch {
        // Ignore non-JSON WebView messages.
      }
    },
    [atlasSpots]
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

          <FilterBar
            options={locationFilterOptions}
            activeFilter={activeCategory}
            onFilterChange={handleCategoryPress}
            containerStyle={styles.locationFilterContainer}
          />

          {selectedSpot ? (
            <View style={styles.atlasSection}>
              <View style={[styles.atlasCard, cardBackground, { borderColor: atlasBorderColor }]}>
                <View style={styles.mapStage}>
                  <View style={styles.mapBackdrop} />
                  <View style={styles.mapCanvas}>
                    <WebView
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
                    />
                  </View>
                </View>

                <ImageBackground
                  source={{ uri: selectedSpot.image }}
                  style={styles.atlasDetailBackground}
                  imageStyle={styles.atlasDetailImage}
                  resizeMode="cover"
                >
                  <View style={styles.atlasDetailScrim} />
                  <View style={styles.atlasDetail}>
                    <View style={styles.atlasHeaderRow}>
                      <View
                        style={[
                          styles.atlasTitlePill,
                          {
                            backgroundColor: atlasLocationPillColors.background,
                            borderColor: atlasLocationPillColors.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.atlasTitlePillText,
                            { color: atlasLocationPillColors.text },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {selectedSpot.name}
                        </ThemedText>
                      </View>
                      <View style={styles.atlasMetaRow}>
                        <ProfileLocationPill
                          label={selectedSpot.region}
                          backgroundColor={atlasLocationPillColors.background}
                          iconBackgroundColor={atlasLocationPillColors.iconBackground}
                          iconColor={atlasLocationPillColors.icon}
                          textColor={atlasLocationPillColors.text}
                          style={styles.atlasRegionPill}
                        />
                      </View>
                    </View>

                    <ThemedText type="default" style={styles.atlasDescription}>
                      {selectedSpot.description}
                    </ThemedText>
                  </View>
                </ImageBackground>
              </View>

              <View style={[styles.weatherCard, cardBackground, { borderColor: atlasBorderColor }]}>
                <View style={styles.featureHeaderRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E' }]}>
                    <Ionicons name="partly-sunny-outline" size={18} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <ThemedText type="sectionTitle" style={styles.featureTitle}>
                      Weather Forecast
                    </ThemedText>
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
                    <View style={[styles.featureIcon, { backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E' }]}>
                      <Ionicons name="images-outline" size={18} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
                    </View>
                    <View style={styles.featureTitleGroup}>
                      <ThemedText type="sectionTitle" style={styles.featureTitle}>
                        Gallery
                      </ThemedText>
                    </View>
                    <ViewAllButton
                      onPress={() =>
                        router.push({
                          pathname: '/gallery',
                          params: {
                            location: selectedSpot?.name ?? '',
                            title: 'Photo Gallery',
                            images: JSON.stringify(galleryImages),
                          },
                        })
                      }
                    />
                  </View>
                  <View style={styles.galleryContainer}>
                    <View style={styles.galleryRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.galleryCardContainer, { backgroundColor: galleryCardBackground }]}
                        onPress={() =>
                          router.push({
                            pathname: '/gallery',
                            params: {
                              location: selectedSpot?.name ?? '',
                              title: 'Photo Gallery',
                              images: JSON.stringify(galleryImages),
                            },
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
                        style={[styles.galleryCardContainer, { backgroundColor: galleryCardBackground }]}
                        onPress={() =>
                          router.push({
                            pathname: '/gallery',
                            params: {
                              location: selectedSpot?.name ?? '',
                              title: 'Photo Gallery',
                              images: JSON.stringify(galleryImages),
                            },
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
                  <View style={[styles.featureIcon, { backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E' }]}>
                    <Ionicons name="bed-outline" size={18} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <ThemedText type="sectionTitle" style={styles.featureTitle}>
                      Stays
                    </ThemedText>
                  </View>
                  <ViewAllButton
                    disabled={featuredStays.length === 0}
                    onPress={() =>
                      router.push({
                        pathname: '/destination-stays',
                        params: { location: selectedSpot?.name },
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
                        onPress={s => router.push({ pathname: '/stay-profile', params: { id: s.id } })}
                        onShare={() => {}}
                        style={[styles.staysListCard, {
                          borderWidth: 1,
                          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                          shadowOpacity: 0,
                          elevation: 0,
                        }]}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.eventsEmptyState}>
                    <Ionicons
                      name="bed-outline"
                      size={60}
                      color={colorScheme === 'dark' ? '#555' : '#ccc'}
                    />
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
                  <View style={[styles.featureIcon, { backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E' }]}>
                    <Ionicons name="calendar-outline" size={18} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <ThemedText type="sectionTitle" style={styles.featureTitle}>
                      Events
                    </ThemedText>
                  </View>
                  <ViewAllButton
                    disabled={upcomingEvents.length === 0}
                    onPress={() => router.push({ pathname: '/screens/Events', params: { location: selectedSpot?.name ?? '' } })}
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
                        style={[styles.eventsListCard, {
                          borderWidth: 1,
                          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        }]}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.eventsEmptyState}>
                    <Ionicons
                      name="calendar-outline"
                      size={60}
                      color={colorScheme === 'dark' ? '#555' : '#ccc'}
                    />
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
                  <View style={[styles.featureIcon, { backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E' }]}>
                    <Ionicons name="ticket-outline" size={18} color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <ThemedText type="sectionTitle" style={styles.featureTitle}>
                      Things To Do
                    </ThemedText>
                  </View>
                  <ViewAllButton
                    disabled={featuredActivities.length === 0}
                    onPress={() => router.push({ pathname: '/screens/ThingsToDoScreen', params: { location: selectedSpot?.name ?? '' } })}
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
                      const basePrice = typeof item.priceFrom === 'number' && item.priceFrom > 0
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
                          style={[styles.activitiesListCard, {
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                            shadowOpacity: 0,
                            elevation: 0,
                          }]}
                          topRow={
                            <View style={styles.activityMetaRow}>
                              <LocationPill
                                label={item.location}
                                backgroundColor={pillBg}
                                iconBackgroundColor={pillIconBg}
                                lightTextColor={pillText}
                                darkTextColor={pillText}
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
                              <ThemedText style={styles.activityPriceLabel} lightColor="#8E8E93" darkColor="#8E8E93">
                                from
                              </ThemedText>
                              <View style={styles.activityPriceRow}>
                                <Ionicons name="pricetag-outline" size={14} color="#34C759" style={styles.activityPriceIcon} />
                                <ThemedText style={styles.activityPriceCurrency} lightColor={isDark ? '#FFFFFF' : '#1C1C1E'} darkColor="#FFFFFF">$</ThemedText>
                                <ThemedText style={styles.activityPriceValue} lightColor={isDark ? '#FFFFFF' : '#1C1C1E'} darkColor="#FFFFFF">{basePrice}</ThemedText>
                                <ThemedText style={styles.activityPriceUnit} lightColor="#8E8E93" darkColor="#8E8E93">/person</ThemedText>
                              </View>
                            </View>
                          }
                        />
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.eventsEmptyState}>
                    <Ionicons
                      name="ticket-outline"
                      size={60}
                      color={colorScheme === 'dark' ? '#555' : '#ccc'}
                    />
                    <ThemedText type="defaultSemiBold" style={styles.eventsEmptyTitle}>
                      No activities listed yet
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={[styles.aiVisitCard, cardBackground, { borderColor: atlasBorderColor }]}>
                <View style={styles.featureHeaderRow}>
                  <View style={[styles.featureIcon, { backgroundColor: theme.tint }]}>
                    <Ionicons name="sparkles" size={18} color={theme.background} />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <ThemedText type="title3" style={styles.featureTitle}>
                      AI Virtual Visit
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={[styles.featureCaption, { color: subtleTextColor }]}
                    >
                      Preview the feel of a place before planning the trip.
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="default" style={[styles.aiCopy, { color: mutedTextColor }]}>
                  {selectedSpot.aiPrompt}
                </ThemedText>
                <View style={styles.actionRow}>
                  <Pressable style={[styles.actionButton, { borderColor: atlasBorderColor }]}>
                    <Ionicons name="scan-outline" size={17} color={theme.tint} />
                    <ThemedText type="defaultSemiBold" style={styles.actionText}>
                      Build preview
                    </ThemedText>
                  </Pressable>
                  <Pressable style={[styles.actionButton, { borderColor: atlasBorderColor }]}>
                    <Ionicons name="cloud-upload-outline" size={17} color={theme.tint} />
                    <ThemedText type="defaultSemiBold" style={styles.actionText}>
                      Upload clip
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              <View
                style={[styles.languageCard, cardBackground, { borderColor: atlasBorderColor }]}
              >
                <View style={styles.featureHeaderRow}>
                  <View style={[styles.featureIcon, styles.languageIcon]}>
                    <Ionicons name="language-outline" size={18} color="#1F1F1F" />
                  </View>
                  <View style={styles.featureTitleGroup}>
                    <ThemedText type="title3" style={styles.featureTitle}>
                      {selectedSpot.language} Creator Lessons
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={[styles.featureCaption, { color: subtleTextColor }]}
                    >
                      Short clips from locals for everyday visitor moments.
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.phraseRow}>
                  <View style={styles.phraseBubble}>
                    <ThemedText type="title3" style={styles.phraseText}>
                      {selectedSpot.phrase}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="default"
                    style={[styles.translationText, { color: mutedTextColor }]}
                  >
                    {selectedSpot.translation}
                  </ThemedText>
                </View>

                <View style={styles.lessonList}>
                  {selectedSpot.lessons.map(lesson => (
                    <Pressable key={lesson.id} style={styles.lessonItem}>
                      <View style={styles.lessonPlayButton}>
                        <Ionicons name="play" size={14} color="#FFFFFF" />
                      </View>
                      <View style={styles.lessonCopy}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.lessonTitle}
                          numberOfLines={1}
                        >
                          {lesson.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={[styles.lessonMeta, { color: subtleTextColor }]}
                        >
                          {lesson.creator} - {lesson.duration}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color={subtleTextColor} />
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View
              style={[styles.placeholderCard, cardBackground, { borderColor: atlasBorderColor }]}
            >
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
  locationFilterContainer: {
    marginHorizontal: -SCREEN_HORIZONTAL_PADDING,
  },
  atlasSection: {
    gap: 16,
    paddingBottom: 8,
  },
  atlasCard: {
    borderRadius: 20,
    borderWidth: 1,
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
  mapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  atlasDetailBackground: {
    overflow: 'hidden',
  },
  atlasDetailImage: {
    transform: [{ scale: 1.02 }],
  },
  atlasDetailScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  atlasDetail: {
    padding: 16,
    gap: 12,
  },
  atlasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  atlasMetaRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  atlasRegionPill: {
    alignSelf: 'flex-end',
    flexShrink: 1,
  },
  atlasTitlePill: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  atlasTitlePillText: {
    fontSize: responsiveFontSize(12),
    lineHeight: responsiveLineHeight(12),
    fontFamily: Fonts.bold,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  atlasDescription: {
    color: '#FFFFFF',
    lineHeight: responsiveLineHeight(15),
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  aiVisitCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  weatherCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  eventsListContainer: {
    paddingHorizontal: GALLERY_CONTAINER_PADDING,
    paddingBottom: GALLERY_CONTAINER_PADDING,
    gap: 8,
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
    marginBottom: 12,
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
  gallerySectionTitle: { marginBottom: 0 },
  galleryIcon: {},
  eventsIcon: {},
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
    borderWidth: 1,
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
  weatherIcon: {},
  featureTitleGroup: {
    flex: 1,
  },
  featureTitle: {
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveLineHeight(18),
  },
  featureCaption: {
    marginTop: 2,
  },
  aiCopy: {
    lineHeight: responsiveLineHeight(15),
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  weatherDayPillDark: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    borderWidth: 1,
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
  translationText: {
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
  placeholderCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
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
