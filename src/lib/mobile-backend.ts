import { prisma } from '@/lib/prisma';
import {
  mergeWithCuratedDestinations,
  type ExplorerDestinationSummary,
} from '@/lib/destination-explorer';
import { inferServiceGroup } from '@/lib/taxonomy';
import { getDemoPublicListings } from '@/lib/demo-taxonomy-listings';

type FavoriteRecord = {
  itemId: string;
  itemType: string;
};

type UserPreferencesShape = {
  favorites?: FavoriteRecord[];
  mobileProfile?: Record<string, unknown>;
};

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseUserPreferences(preferences: string | null | undefined) {
  return safeJsonParse<UserPreferencesShape>(preferences, {});
}

export function serializeUserPreferences(preferences: UserPreferencesShape) {
  return JSON.stringify(preferences);
}

function getProfileExtras(preferences: UserPreferencesShape) {
  const profile = preferences.mobileProfile;
  return typeof profile === 'object' && profile ? profile : {};
}

export function buildMobileProfile(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  phone: string | null;
  nationality: string | null;
  image: string | null;
  role: string;
  explorerScore: string | null;
  preferences: string | null;
}) {
  const preferences = parseUserPreferences(user.preferences);
  const extras = getProfileExtras(preferences) as Record<string, unknown>;
  const fullName =
    (typeof extras.full_name === 'string' && extras.full_name.trim()) ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.name ||
    '';

  return {
    id: user.id,
    full_name: fullName,
    business_name:
      typeof extras.business_name === 'string' ? extras.business_name : null,
    phone: user.phone || (typeof extras.phone === 'string' ? extras.phone : null),
    email: user.email,
    user_type: user.role === 'provider' ? 'business' : 'individual',
    title: typeof extras.title === 'string' ? extras.title : null,
    gender: typeof extras.gender === 'string' ? extras.gender : null,
    id_type: typeof extras.id_type === 'string' ? extras.id_type : null,
    identity_number:
      typeof extras.identity_number === 'string' ? extras.identity_number : null,
    date_of_birth:
      typeof extras.date_of_birth === 'string' ? extras.date_of_birth : null,
    nationality:
      user.nationality ||
      (typeof extras.nationality === 'string' ? extras.nationality : null),
    avatar_url: user.image,
    rating: safeJsonParse(user.explorerScore, { rating: 0 }).rating ?? 0,
  };
}

const DESTINATION_IMAGE_MAP: Record<string, string> = {
  'Victoria Falls': '/images/destinations/victoria-falls.jpg',
  Hwange: '/images/destinations/hwange.jpg',
  'Great Zimbabwe': '/images/destinations/great-zimbabwe.jpg',
  Kariba: '/images/destinations/lake-kariba.jpg',
  Nyanga: '/images/destinations/eastern-highlands.jpg',
  Harare: '/images/jacaranda.JPG',
  Bulawayo: '/images/destinations/matobo.jpg',
};

function publicImage(path: string | null | undefined) {
  return path || null;
}

function mergeImages(...groups: Array<Array<string | null | undefined>>) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const group of groups) {
    for (const value of group) {
      if (typeof value !== 'string') {
        continue;
      }

      const trimmed = value.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }

      seen.add(trimmed);
      merged.push(trimmed);
    }
  }

  return merged;
}

function isPrismaBuildConfigError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'PrismaClientInitializationError' ||
    error.message.includes('Error validating datasource `db`') ||
    error.message.includes('the URL must start with the protocol `file:`')
  );
}

function handleMobileDataFallback<T>(dataset: string, error: unknown, fallback: T): T {
  if (isPrismaBuildConfigError(error)) {
    console.warn(
      `[mobile-backend] Falling back to ${dataset} defaults because Prisma is unavailable during build.`
    );
    return fallback;
  }

  throw error;
}

export async function getMobileDestinations() {
  try {
    const [storedDestinations, providerListings] = await Promise.all([
      prisma.destination.findMany({
      orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        hotels: { select: { id: true } },
        activities: { select: { id: true } },
        restaurants: { select: { id: true } },
        events: { select: { id: true } },
      },
      }),
      prisma.providerListing.findMany({
        where: {
          visibility: 'public',
          status: { in: ['active', 'approved'] },
        },
        select: {
          title: true,
          category: true,
          listingType: true,
          location: true,
          metadata: true,
        },
      }),
    ]);
    const providerCounts = buildProviderDestinationCounts(providerListings);

    if (storedDestinations.length > 0) {
      return mergeWithCuratedDestinations(storedDestinations.map(destination => {
        const images = safeJsonParse<string[]>(destination.images, []);
        const counts = getProviderCountsForDestination(providerCounts, {
          id: destination.slug || destination.id,
          name: destination.name,
          location: destination.location,
        });
        return {
          id: destination.slug || destination.id,
          name: destination.name,
          description: destination.description,
          location: destination.location,
          image_url: publicImage(destination.imageUrl || images[0] || null),
          images,
          latitude: null,
          longitude: null,
          created_at: destination.createdAt.toISOString(),
          stays_count: destination.hotels.length + counts.stays,
          activities_count: destination.activities.length + counts.activities,
          transport_count: counts.transport,
          dining_count: destination.restaurants.length + counts.dining,
          events_count: destination.events.length + counts.events,
          featured: destination.featured,
          category: destination.category,
          price_range: destination.priceRange,
          rating: destination.rating,
          weather: destination.weather,
        };
      }));
    }

    const [hotels, activities, restaurants, events] = await Promise.all([
      prisma.hotel.findMany({ select: { city: true, description: true, images: true } }),
      prisma.activity.findMany({ select: { location: true, description: true, images: true } }),
      prisma.restaurant.findMany({ select: { location: true, description: true, images: true } }),
      prisma.event.findMany({ select: { location: true, description: true, images: true } }),
    ]);

    const locations = new Map<
      string,
      { description: string | null; images: string[]; stays: number; activities: number; transport: number; dining: number; events: number }
    >();

    const addLocation = (
      name: string,
      description: string | null,
      images: string[],
      type: 'stay' | 'activity'
    ) => {
      const key = name.trim();
      const existing = locations.get(key) || {
        description: null,
        images: [],
        stays: 0,
        activities: 0,
        transport: 0,
        dining: 0,
        events: 0,
      };

      if (!existing.description && description) {
        existing.description = description;
      }
      if (images.length > 0) {
        existing.images = [...existing.images, ...images];
      }
      if (type === 'stay') {
        existing.stays += 1;
      } else {
        existing.activities += 1;
      }
      locations.set(key, existing);
    };

    hotels.forEach(hotel =>
      addLocation(hotel.city, hotel.description, safeJsonParse(hotel.images, []), 'stay')
    );
    activities.forEach(activity =>
      addLocation(
        activity.location,
        activity.description,
        safeJsonParse(activity.images, []),
        'activity'
      )
    );
    restaurants.forEach(restaurant =>
      addLocation(
        restaurant.location,
        restaurant.description,
        safeJsonParse(restaurant.images, []),
        'activity'
      )
    );
    events.forEach(event =>
      addLocation(event.location, event.description, safeJsonParse(event.images, []), 'activity')
    );
    for (const listing of providerListings) {
      const metadata = safeJsonParse<Record<string, unknown>>(listing.metadata, {});
      const name =
        (typeof metadata.destinationName === 'string' && metadata.destinationName) ||
        listing.location;
      const key = name.trim();
      const existing = locations.get(key) || {
        description: null,
        images: [],
        stays: 0,
        activities: 0,
        transport: 0,
        dining: 0,
        events: 0,
      };
      const group = inferServiceGroup({ ...listing, metadata });

      existing[group.id] += 1;
      locations.set(key, existing);
    }

    return mergeWithCuratedDestinations(Array.from(locations.entries()).map(([name, data]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: data.description,
      location: name,
      image_url: publicImage(data.images[0] || DESTINATION_IMAGE_MAP[name] || null),
      images: data.images.length > 0 ? data.images : [DESTINATION_IMAGE_MAP[name]].filter(Boolean),
      latitude: null,
      longitude: null,
      created_at: new Date().toISOString(),
      stays_count: data.stays,
      activities_count: data.activities,
      transport_count: data.transport,
      dining_count: data.dining,
      events_count: data.events,
    })));
  } catch (error) {
    const fallbackDestinations = mergeWithCuratedDestinations(
      [] as ExplorerDestinationSummary[]
    );
    const fallbackCounts = buildDemoDestinationCounts();

    return handleMobileDataFallback(
      'destinations',
      error,
      fallbackDestinations.map(destination => {
        const counts = getProviderCountsForDestination(fallbackCounts, {
          id: destination.id,
          name: destination.name,
          location: destination.location || null,
        });

        return {
          ...destination,
          stays_count: counts.stays,
          activities_count: counts.activities,
          transport_count: counts.transport,
          dining_count: counts.dining,
          events_count: counts.events,
        };
      })
    );
  }
}

type ProviderDestinationCount = {
  stays: number;
  transport: number;
  dining: number;
  activities: number;
  events: number;
};

function emptyProviderDestinationCount(): ProviderDestinationCount {
  return {
    stays: 0,
    transport: 0,
    dining: 0,
    activities: 0,
    events: 0,
  };
}

function buildProviderDestinationCounts(
  listings: Array<{
    title: string;
    category: string;
    listingType: string;
    location: string;
    metadata: string | null;
  }>
) {
  const counts = new Map<string, ProviderDestinationCount>();

  for (const listing of listings) {
    const metadata = safeJsonParse<Record<string, unknown>>(listing.metadata, {});
    const group = inferServiceGroup({ ...listing, metadata });
    const key = [
      typeof metadata.destinationId === 'string' ? metadata.destinationId : null,
      typeof metadata.destinationName === 'string' ? metadata.destinationName : null,
      typeof metadata.destinationLocation === 'string' ? metadata.destinationLocation : null,
      listing.location,
    ]
      .map(normalizeCountKey)
      .find(Boolean);

    if (!key) continue;
    const current = counts.get(key) || emptyProviderDestinationCount();
    current[group.id] += 1;
    counts.set(key, current);
  }

  return counts;
}

function getProviderCountsForDestination(
  counts: Map<string, ProviderDestinationCount>,
  destination: { id: string; name: string; location: string | null }
) {
  const merged = emptyProviderDestinationCount();

  for (const key of [
    destination.id,
    destination.name,
    destination.location,
  ].map(normalizeCountKey).filter(Boolean)) {
    const count = counts.get(key);
    if (!count) continue;
    merged.stays += count.stays;
    merged.transport += count.transport;
    merged.dining += count.dining;
    merged.activities += count.activities;
    merged.events += count.events;
  }

  return merged;
}

function normalizeCountKey(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function buildDemoDestinationCounts() {
  const counts = new Map<string, ProviderDestinationCount>();

  for (const listing of getDemoPublicListings()) {
    const key = normalizeCountKey(
      listing.destinationId || listing.destinationName || listing.location
    );
    if (!key) continue;
    const current = counts.get(key) || emptyProviderDestinationCount();
    current[inferServiceGroup(listing).id] += 1;
    counts.set(key, current);
  }

  return counts;
}

export async function getMobileStays() {
  try {
    const hotels = await prisma.hotel.findMany({
      include: {
        rooms: true,
        destination: true,
        gallery: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return hotels.map(hotel => {
      const storedImages = safeJsonParse<string[]>(hotel.images, []);
      const gallery = hotel.gallery.map(image => ({
        id: image.id,
        image_url: image.imageUrl,
        thumbnail_url: image.thumbnailUrl,
        caption: image.caption,
        alt_text: image.altText,
        category: image.category,
        is_featured: image.isFeatured,
        sort_order: image.sortOrder,
        uploaded_by: image.uploadedById ?? null,
      }));
      const galleryImages = gallery.map(image => image.image_url);
      const images = mergeImages(galleryImages, storedImages);
      const amenities = safeJsonParse<string[]>(hotel.amenities, []);
      const destinationName = hotel.destination?.name || hotel.city;
      const destinationLocation = hotel.destination?.location || hotel.city;

      return {
        id: hotel.id,
        name: hotel.name,
        description: hotel.description,
        location: hotel.city,
        image_url: publicImage(images[0] || hotel.destination?.imageUrl),
        images,
        featured: hotel.rating ? hotel.rating >= 4.8 : false,
        rating: hotel.rating,
        price: hotel.rooms[0]?.price ?? null,
        phone: null,
        full_location: hotel.address,
        total_reviews: 0,
        check_in_time: '14:00',
        check_out_time: '10:00',
        amenities,
        created_at: hotel.createdAt.toISOString(),
        destinations: {
          id: hotel.destination?.id ?? null,
          name: destinationName,
          location: destinationLocation,
        },
        service_providers: null,
        stay_rooms: hotel.rooms.map(room => ({
          id: room.id,
          room_type: room.name,
          name: room.name,
          base_price: room.price,
          max_guests: room.capacity,
          description: room.description,
          amenities: safeJsonParse<string[]>(room.amenities, []),
          is_active: room.isAvailable,
          total_rooms: null,
          available_rooms: null,
          stay_name: hotel.name,
        })),
        stay_gallery:
          gallery.length > 0
            ? gallery
            : images.map((image, index) => ({
                id: `${hotel.id}-${index}`,
                image_url: image,
                thumbnail_url: image,
                caption: hotel.name,
                alt_text: hotel.name,
                category: 'general',
                is_featured: index === 0,
                sort_order: index,
                uploaded_by: null,
              })),
      };
    });
  } catch (error) {
    return handleMobileDataFallback('stays', error, []);
  }
}

export async function getMobileEvents() {
  try {
    const events = await prisma.event.findMany({
      include: {
        destination: true,
        tickets: {
          orderBy: [{ basePrice: 'asc' }, { createdAt: 'asc' }],
        },
        gallery: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return events.map(event => {
      const storedImages = safeJsonParse<string[]>(event.images, []);
      const gallery = event.gallery.map(image => ({
        id: image.id,
        image_url: image.imageUrl,
        thumbnail_url: image.thumbnailUrl || image.imageUrl,
        caption: image.caption,
        alt_text: image.altText,
        category: image.category || 'general',
        is_featured: image.isFeatured,
        sort_order: image.sortOrder,
        uploaded_by: image.uploadedById ?? null,
      }));
      const galleryImages = gallery.map(image => image.image_url);
      const images = mergeImages(galleryImages, storedImages);
      const now = new Date();
      const isUpcoming = event.startDate >= now;
      const tickets =
        event.tickets.length > 0
          ? event.tickets.map(ticket => ({
              id: ticket.id,
              ticket_type: ticket.ticketType,
              name: ticket.name,
              description: ticket.description,
              base_price: ticket.basePrice,
              original_price: ticket.originalPrice,
              currency: ticket.currency,
              total_tickets: ticket.totalTickets,
              tickets_sold: ticket.ticketsSold,
              tickets_available: ticket.ticketsAvailable,
              perks: safeJsonParse<string[]>(ticket.perks, []),
              min_purchase: ticket.minPurchase,
              max_purchase: ticket.maxPurchase,
              sale_start_date: ticket.saleStartDate?.toISOString() ?? null,
              sale_end_date: ticket.saleEndDate?.toISOString() ?? null,
              is_active: ticket.isActive,
            }))
          : [
              {
                id: `${event.id}-standard`,
                ticket_type: 'standard',
                name: 'Standard Ticket',
                description: 'General admission',
                base_price: event.price,
                original_price: null,
                currency: event.currency,
                total_tickets: event.capacity,
                tickets_sold: 0,
                tickets_available: event.capacity,
                perks: [],
                min_purchase: 1,
                max_purchase: 10,
                sale_start_date: null,
                sale_end_date: null,
                is_active: true,
              },
            ];
      const destinationName = event.destination?.name || event.location;
      const destinationLocation = event.destination?.location || event.location;

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        venue: event.location,
        category: event.category,
        featured: isUpcoming,
        rating: 4.6,
        total_ratings: 0,
        currency: event.currency,
        capacity: event.capacity,
        tickets_available: event.capacity,
        image_url: publicImage(images[0] || event.destination?.imageUrl),
        images,
        start_date: event.startDate.toISOString(),
        start_time: event.startDate.toISOString().slice(11, 16),
        end_time: event.endDate?.toISOString().slice(11, 16) ?? null,
        created_at: event.createdAt.toISOString(),
        destinations: {
          id: event.destination?.id ?? null,
          name: destinationName,
          location: destinationLocation,
        },
        service_providers: null,
        event_tickets: tickets,
        event_gallery:
          gallery.length > 0
            ? gallery
            : images.map((image, index) => ({
                id: `${event.id}-${index}`,
                image_url: image,
                thumbnail_url: image,
                caption: event.name,
                alt_text: event.name,
                category: 'general',
                is_featured: index === 0,
                sort_order: index,
                uploaded_by: null,
              })),
      };
    });
  } catch (error) {
    return handleMobileDataFallback('events', error, []);
  }
}

export async function getUserFavorites(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const preferences = parseUserPreferences(user?.preferences);
  return preferences.favorites || [];
}

export async function saveUserFavorites(userId: string, favorites: FavoriteRecord[]) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const preferences = parseUserPreferences(user?.preferences);
  preferences.favorites = favorites;

  await prisma.user.update({
    where: { id: userId },
    data: {
      preferences: serializeUserPreferences(preferences),
    },
  });
}

export function buildMobileAuthMetadata(user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  nationality?: string | null;
  role: string;
  image?: string | null;
  preferences?: string | null;
  explorerScore?: string | null;
}) {
  const profile = buildMobileProfile({
    id: '',
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    name: user.name ?? null,
    phone: user.phone ?? null,
    nationality: user.nationality ?? null,
    image: user.image ?? null,
    role: user.role,
    explorerScore: user.explorerScore ?? null,
    preferences: user.preferences ?? null,
  });

  return {
    full_name: profile.full_name,
    first_name: user.firstName ?? undefined,
    last_name: user.lastName ?? undefined,
    phone: profile.phone ?? undefined,
    nationality: profile.nationality ?? undefined,
    business_name: profile.business_name ?? undefined,
    user_type: profile.user_type,
    avatar_url: profile.avatar_url ?? undefined,
    title: profile.title ?? undefined,
    gender: profile.gender ?? undefined,
    id_type: profile.id_type ?? undefined,
    identity_number: profile.identity_number ?? undefined,
    date_of_birth: profile.date_of_birth ?? undefined,
    rating: profile.rating ?? 0,
  };
}
