import { filterRooms } from './room-sections';

describe('filterRooms', () => {
  const rooms = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const fav = ['a', 'c'];
  const arch = ['c'];

  it('Chats excludes archived', () => {
    expect(filterRooms(rooms, 'chats', fav, arch).map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('Favorites excludes archived favorites', () => {
    expect(filterRooms(rooms, 'favorites', fav, arch).map((r) => r.id)).toEqual(['a']);
  });
  it('Archive lists archived only', () => {
    expect(filterRooms(rooms, 'archive', fav, arch).map((r) => r.id)).toEqual(['c']);
  });
  it('handles missing lists', () => {
    expect(filterRooms(rooms, 'chats').length).toBe(3);
  });
});
