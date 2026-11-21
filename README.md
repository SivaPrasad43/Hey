# Hey

A small real-time chat where every message carries a **mood** (Happy, Angry, Sad, Lovely), shown as a small colored dot.

Built with Angular 21 (standalone components, signals, built-in control flow), Firebase Auth + Firestore (modular `@angular/fire` 21) and Tailwind CSS 4 with [spartan-ng](https://spartan.ng) — the shadcn/ui component set for Angular (zinc theme, Geist font). Components live in `libs/ui` and are owned by this repo; add more with `npx ng g @spartan-ng/cli:ui <name>`.

## Features

- Email/password sign-up and sign-in with validation, friendly errors and password reset
- A shared **General** room that everyone joins on first sign-in
- **Group chats** and **direct messages**, with unread dots and last-message previews
- **Moods**: picker (click or keyboard), `Alt+H / A / S / L` shortcuts, and `?` for a shortcuts panel
- **Presence** (online dot, "last seen") and **typing indicators**
- Day separators, grouping of consecutive messages, infinite scroll for older history, a jump-to-latest button with a new-message count, and optimistic sending
- Dark mode, reduced-motion support, keyboard and screen-reader friendly controls, and a mobile layout (list → room)

## Project layout

```
src/app/
  app.config.ts / app.routes.ts   providers, lazy routes, auth guards
  core/                           models, moods, services (auth, user/presence, rooms, messages, typing, toast, theme)
  shared/ui/                      icon, avatar, spinner, toast host
  features/auth/                  login + register pages
  features/chat/                  shell (sidebar), room page, message list/bubble, composer, mood picker, dialogs
firestore.rules                   security rules (members-only rooms, no impersonation)
```

## Development

```bash
npm install
npm start            # http://localhost:4200
npm test             # unit tests (Karma, ChromeHeadless: set CHROME_BIN if needed)
npm run build        # production build to dist/hey-app/browser
```

### Using the Firebase emulators (recommended for local work)

1. Install the CLI: `npm i -g firebase-tools` (the Firestore emulator needs Java 11+).
2. Set `useEmulators: true` in `src/environment/environment.ts`.
3. Run `firebase emulators:start` and `npm start` in separate terminals.

## Deploying

```bash
firebase deploy --only firestore:rules   # required: the app relies on these rules
npm run build && firebase deploy --only hosting
```

## Data model

| Path | Contents |
| --- | --- |
| `users/{uid}` | `displayName`, `email`, `avatarColor`, `online`, `lastSeen`, `lastRead.{roomId}` |
| `rooms/{roomId}` | `name`, `type` (`group`/`dm`), `members[]`, `memberNames{}`, `lastMessage`, `updatedAt` (DM ids are the two uids, sorted and joined with `_`) |
| `rooms/{roomId}/messages/{id}` | `type` (`text`/`system`), `text`, `senderId`, `senderName`, `mood`, `createdAt` |
| `rooms/{roomId}/typing/{uid}` | `name`, `at`. Entries older than 6 s are ignored |

Presence uses a 60-second heartbeat on `users/{uid}`, so a user shows as online when their last heartbeat is less than 2.5 minutes old. Messages in the old top-level `messages` collection (from before the rooms refactor) are not shown.
