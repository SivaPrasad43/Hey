import { Timestamp } from '@angular/fire/firestore';
import { MoodId } from './moods';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  avatarColor: string;
  lastSeen?: Timestamp | null;
  /** roomId -> last time the user had that room open */
  lastRead?: Record<string, Timestamp>;
  favorites?: string[];
  archived?: string[];
  defaultMood?: MoodId;
}

export type RoomType = 'group' | 'dm';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  members: string[];
  /** uid -> display name, so the list can render without extra reads */
  memberNames: Record<string, string>;
  createdBy: string;
  updatedAt: Timestamp | null;
  lastMessage?: {
    messageId?: string;
    text: string;
    deleted?: boolean;
    mood: MoodId;
    senderId: string;
    senderName: string;
  } | null;
}

export type MessageType = 'text' | 'system';

export interface Message {
  id: string;
  type: MessageType;
  text: string;
  senderId: string;
  senderName: string;
  mood: MoodId;
  createdAt: Timestamp | null;
  /** uid -> mood reaction (one per user) */
  reactions?: Record<string, MoodId>;
  editedAt?: Timestamp | null;
  deleted?: boolean;
  clientId?: string;
}

export const GENERAL_ROOM_ID = 'general';
