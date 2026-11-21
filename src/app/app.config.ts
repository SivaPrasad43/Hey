import { ApplicationConfig } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { APP_ICONS } from './core/icons';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  provideFirestore,
} from '@angular/fire/firestore';
import { environment } from '../environment/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideIcons(APP_ICONS),
    provideRouter(routes, withComponentInputBinding()),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      return auth;
    }),
    provideFirestore(() => {
      const db = initializeFirestore(
        getApp(),
        // Offline cache shared across tabs; emulator runs use memory so data resets cleanly.
        environment.useEmulators ? {} : { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
      );
      if (environment.useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
      return db;
    }),
  ],
};
