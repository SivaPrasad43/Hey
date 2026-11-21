export type Section = 'chats' | 'favorites' | 'archive';

/** Chats = everything not archived; Favorites = starred and not archived; Archive = archived. */
export function filterRooms<T extends { id: string }>(
  rooms: T[],
  section: Section,
  favorites: readonly string[] = [],
  archived: readonly string[] = [],
): T[] {
  const fav = new Set(favorites);
  const arch = new Set(archived);
  switch (section) {
    case 'chats':
      return rooms.filter((r) => !arch.has(r.id));
    case 'favorites':
      return rooms.filter((r) => fav.has(r.id) && !arch.has(r.id));
    case 'archive':
      return rooms.filter((r) => arch.has(r.id));
  }
}
