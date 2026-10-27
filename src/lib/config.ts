/**
 * Safe Firebase Configuration Resolver
 *
 * Reads from environment variables (e.g. VITE_FIREBASE_*) first,
 * and falls back to local firebase-applet-config.json if present on disk.
 *
 * This allows pushing the codebase to GitHub without exposing API keys or secrets,
 * as firebase-applet-config.json and .env files are excluded in .gitignore.
 */

// Dynamically check for local config file without breaking build if gitignored
const localConfigs = import.meta.glob<Record<string, any>>('/firebase-applet-config.json', {
  eager: true,
  import: 'default'
});

const fileConfig = localConfigs['/firebase-applet-config.json'] || {};

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fileConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fileConfig.appId || '',
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || fileConfig.firestoreDatabaseId || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || fileConfig.measurementId || '',
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || fileConfig.oAuthClientId || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);
