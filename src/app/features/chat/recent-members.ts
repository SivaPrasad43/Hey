import { AppUser, Message } from '../../core/models';

/**
 * The room members to show in the header stack: whoever spoke most recently first,
 * then the rest by when they were last seen.
 */
export function recentMembers(
  members: readonly string[],
  messages: readonly Pick<Message, 'senderId' | 'type'>[],
  users: ReadonlyMap<string, Pick<AppUser, 'lastSeen'>>,
  limit = 4,
): string[] {
  const inRoom = new Set(members);
  const out: string[] = [];
  for (let i = messages.length - 1; i >= 0 && out.length < limit; i--) {
    const { senderId, type } = messages[i];
    if (type === 'system' || !senderId || !inRoom.has(senderId) || out.includes(senderId)) continue;
    out.push(senderId);
  }
  if (out.length < limit) {
    const seen = (uid: string) => users.get(uid)?.lastSeen?.toMillis() ?? 0;
    const rest = members.filter((m) => !out.includes(m)).sort((a, b) => seen(b) - seen(a));
    out.push(...rest.slice(0, limit - out.length));
  }
  return out;
}
