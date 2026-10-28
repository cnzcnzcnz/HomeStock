import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './config';
import { Item } from '../types/inventory';

// Initialize Firebase with resolved configuration
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId to getFirestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Setup prompt to select account each time
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test connection on boot per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or initializing.');
    }
  }
}
testConnection();

// Standard Firestore Error Handling per Firebase Skill specifications
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sign in with Google using popup
 */
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Ensure user profile document exists
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
    return result.user;
  } catch (error) {
    console.error('Google Sign-in failed', error);
    throw error;
  }
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to cloud items for the current user
 */
export function subscribeToUserItems(
  userId: string,
  onUpdate: (items: Item[]) => void,
  onError: (error: unknown) => void
): Unsubscribe {
  const itemsPath = `users/${userId}/items`;
  const itemsCol = collection(db, 'users', userId, 'items');

  return onSnapshot(
    itemsCol,
    (snapshot) => {
      const items: Item[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          itemName: data.itemName || '',
          category: data.category || 'General Supplies',
          photo: data.photo || '',
          targetMonthlyStock: Number(data.targetMonthlyStock) || 0,
          currentStock: Number(data.currentStock) || 0,
          unit: data.unit || 'units',
          location: data.location || '',
          notes: data.notes || '',
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      });
      onUpdate(items);
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.GET, itemsPath);
    }
  );
}

/**
 * Save / Update an item in Firestore
 */
export async function saveCloudItem(userId: string, item: Item): Promise<void> {
  const itemPath = `users/${userId}/items/${item.id}`;
  try {
    const itemRef = doc(db, 'users', userId, 'items', item.id);
    await setDoc(
      itemRef,
      {
        id: item.id,
        userId,
        itemName: item.itemName,
        category: item.category,
        photo: item.photo,
        targetMonthlyStock: item.targetMonthlyStock,
        currentStock: item.currentStock,
        unit: item.unit || 'units',
        location: item.location || '',
        notes: item.notes || '',
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, itemPath);
  }
}

/**
 * Batch seed / upload items to Firestore
 */
export async function seedCloudItems(userId: string, items: Item[]): Promise<void> {
  for (const item of items) {
    await saveCloudItem(userId, item);
  }
}

/**
 * Delete item from Firestore
 */
export async function deleteCloudItem(userId: string, itemId: string): Promise<void> {
  const itemPath = `users/${userId}/items/${itemId}`;
  try {
    const itemRef = doc(db, 'users', userId, 'items', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, itemPath);
  }
}

/**
 * Check if the user's cloud inventory has already been initialized
 */
export async function isUserCloudInitialized(userId: string): Promise<boolean> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() && userSnap.data()?.hasInitialized === true;
  } catch (e) {
    console.warn('Could not read user profile initialization state', e);
    return false;
  }
}

/**
 * Mark user cloud inventory as initialized
 */
export async function markUserCloudInitialized(userId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId), { hasInitialized: true }, { merge: true });
  } catch (e) {
    console.warn('Could not mark user profile as initialized', e);
  }
}

