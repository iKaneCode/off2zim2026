import type { Event, TicketType } from '@/types/Event';

export type RawEventRecord = Record<string, any>;

export type EventCardItem = Pick<Event, 'id' | 'name' | 'location' | 'venue' | 'date' | 'time'> &
  Partial<Omit<Event, 'id' | 'name' | 'location' | 'venue' | 'date' | 'time'>> & {
    imageRandom?: number;
  };

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80';

export function mapEventRecordToEvent(event: RawEventRecord): Event {
  const galleryImages =
    event.event_gallery
      ?.sort((a: RawEventRecord, b: RawEventRecord) => a.sort_order - b.sort_order)
      .map((img: RawEventRecord) => img.image_url) || [];
  const allImages = [...(event.images || []), ...galleryImages];

  const ticketTypes: TicketType[] =
    event.event_tickets
      ?.filter((ticket: RawEventRecord) => ticket.is_active)
      .map((ticket: RawEventRecord) => ({
        id: ticket.id,
        name: ticket.name,
        price: ticket.base_price,
        description: ticket.description,
        available: ticket.tickets_available || 0,
        perks: ticket.perks || [],
      })) || [];

  const minTicketPrice =
    ticketTypes.length > 0
      ? Math.min(...ticketTypes.map((ticket: TicketType) => ticket.price))
      : event.ticket_price || 0;

  return {
    id: event.id,
    name: event.name,
    location: event.destinations?.location || event.location || '',
    venue: event.venue || '',
    date: event.start_date || event.date,
    time: event.start_time || event.time || '',
    endTime: event.end_time,
    images: allImages,
    description: event.description || '',
    rating: event.rating || 0,
    totalRatings: event.total_ratings || 0,
    ticketPrice: minTicketPrice,
    currency: event.currency || 'USD',
    ticketTypes,
    category: event.category || 'General',
    tags: event.tags || [],
    organizer: event.organizer || { name: '', contact: '', verified: false },
    capacity: event.capacity,
    ticketsAvailable: event.tickets_available,
    featured: event.featured,
    ageRestriction: event.age_restriction,
    accessibility: event.accessibility || [],
    providerId: event.provider_id,
    providerName: event.service_providers?.business_name,
    providerLogo: event.service_providers?.logo_url,
  };
}

export function getEventDisplayImage(item: EventCardItem) {
  if (item.images && item.images.length > 0 && item.images[0]) {
    return item.images[0];
  }

  if (item.imageRandom) {
    return `https://picsum.photos/300/200?random=${item.imageRandom}`;
  }

  return DEFAULT_EVENT_IMAGE;
}

export function formatEventDateTimeLabel(date: string, time: string) {
  const dateLabel = new Date(date)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .replace(/,/g, '');

  return time ? `${dateLabel} - ${time}` : dateLabel;
}

function normalizeLocation(value: string) {
  return value.trim().toLowerCase();
}

export function eventMatchesLocation(item: EventCardItem, aliases: string[]) {
  const normalizedEventLocation = normalizeLocation(item.location);
  const normalizedAliases = aliases.map(normalizeLocation);

  return normalizedAliases.some(
    alias => normalizedEventLocation === alias || normalizedEventLocation.includes(alias)
  );
}
