import { favoritesService } from '@/services/database';
import { buildSession } from '@/lib/api';

// In-memory favorites store (IDs)
let favorites = new Set<string>();
let favoriteTypes = new Map<string, string>();

// Subscribers to notify on changes (simple pub/sub for React reactivity)
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

const notifySubscribers = () => {
  subscribers.forEach(cb => {
    try {
      cb();
    } catch (err) {
      // ignore subscriber errors
    }
  });
};

export const subscribeFavorites = (cb: Subscriber) => {
  subscribers.add(cb);
  // Return a cleanup function that returns void (React useEffect expects a void-returning cleanup)
  return () => {
    subscribers.delete(cb);
  };
};

/**
 * Initialize favorites for the given user by loading them from the database.
 */
export const initFavorites = async (userId?: string) => {
  favorites.clear();
  favoriteTypes.clear();
  if (!userId) return;

  try {
    const { data, error } = await favoritesService.getUserFavorites(userId);
    if (error) {
      console.error('Failed to load user favorites:', error);
      return;
    }

    (data || []).forEach((row: any) => {
      if (row && row.item_id) {
        favorites.add(row.item_id);
        if (row.item_type) {
          favoriteTypes.set(row.item_id, row.item_type);
        }
      }
    });

    console.debug(`initFavorites: loaded ${favorites.size} favorites for user ${userId}`);
    // Notify listeners that favorites changed
    notifySubscribers();
  } catch (err) {
    console.error('Error initializing favorites:', err);
  }
};

/**
 * Check if an item is favorited (by id)
 */
export const isFavorited = (itemId: string): boolean => {
  return favorites.has(itemId);
};

/**
 * Toggle the favorite status of an item (immediate in-memory update, persistent to DB async)
 * itemType is optional; if not provided, database calls will remove/add by item_id regardless of type
 */
export const toggleFavorite = (itemId: string, itemType?: string): boolean => {
  const nowFavorited = !favorites.has(itemId);
  const previousType = itemType ?? favoriteTypes.get(itemId);
  if (nowFavorited) {
    favorites.add(itemId);
    if (itemType) favoriteTypes.set(itemId, itemType);
  } else {
    favorites.delete(itemId);
    favoriteTypes.delete(itemId);
  }

  // Notify subscribers immediately so UI can update
  notifySubscribers();

  // Persist asynchronously
  (async () => {
    try {
      const user = (await buildSession())?.user;
      if (!user) return;

      if (nowFavorited) {
        await favoritesService.add(user.id, itemType ?? 'unknown', itemId);
      } else {
        const resolvedType = previousType;
        if (resolvedType) {
          await favoritesService.remove(user.id, resolvedType, itemId);
        } else {
          await favoritesService.remove(user.id, 'unknown', itemId);
        }
      }
    } catch (err) {
      console.error('Failed to persist favorite change:', err);
    }
  })().catch(() => {});

  return nowFavorited;
};

export const addToFavorites = (itemId: string, itemType?: string) => {
  favorites.add(itemId);
  if (itemType) favoriteTypes.set(itemId, itemType);
  notifySubscribers();
  (async () => {
    try {
      const user = (await buildSession())?.user;
      if (!user) return;
      await favoritesService.add(user.id, itemType ?? 'unknown', itemId);
    } catch (err) {
      console.error('Failed to add favorite:', err);
    }
  })().catch(() => {});
};

export const removeFromFavorites = (itemId: string, itemType?: string) => {
  favorites.delete(itemId);
  favoriteTypes.delete(itemId);
  notifySubscribers();
  (async () => {
    try {
      const user = (await buildSession())?.user;
      if (!user) return;
      if (itemType) {
        await favoritesService.remove(user.id, itemType, itemId);
      } else {
        await favoritesService.remove(user.id, 'unknown', itemId);
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  })().catch(() => {});
};

export const getAllFavorites = (): Record<string, boolean> => {
  const record: Record<string, boolean> = {};
  favorites.forEach(id => (record[id] = true));
  return record;
};

export const clearAllFavorites = (): void => {
  favorites.clear();
  favoriteTypes.clear();
  notifySubscribers();
};

export const getFavoritedIds = (): string[] => {
  return Array.from(favorites);
};

export const getFavoriteType = (itemId: string): string | undefined => {
  return favoriteTypes.get(itemId);
};

export const getFavoritesByType = (): Record<string, string[]> => {
  const grouped: Record<string, string[]> = {};
  favorites.forEach(id => {
    const type = favoriteTypes.get(id) ?? 'unknown';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(id);
  });
  return grouped;
};
