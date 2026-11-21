// Firebase web config is public by design; access is enforced by firestore.rules.
export const environment = {
  production: false,
  /** Point the app at the local Firebase emulators (`firebase emulators:start`). */
  useEmulators: false,
  firebase: {
    apiKey: 'AIzaSyA4daZlf_gMz60b_3JAmvbfTXwgQOT0rA0',
    authDomain: 'hey-chat-7ea1b.firebaseapp.com',
    projectId: 'hey-chat-7ea1b',
    storageBucket: 'hey-chat-7ea1b.appspot.com',
    messagingSenderId: '215154946435',
    appId: '1:215154946435:web:846f8a0d3097347e9646b6',
    measurementId: 'G-VQ7HY4NW68',
  },
};
