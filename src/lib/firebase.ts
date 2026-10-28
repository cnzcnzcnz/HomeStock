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
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './config';
import { Item } from '../types/inventory';
import { Household, HouseholdInvite, HouseholdMember } from '../types/household';

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
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          uid: result.user.uid,
          email: result.user.email ? result.user.email.toLowerCase() : '',
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
 * Generate a short, readable 6-character household share code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get or initialize user's Household
 */
export async function getOrCreateHousehold(user: User): Promise<Household> {
  const userEmail = (user.email || '').toLowerCase();
  const userRef = doc(db, 'users', user.uid);
  let userData: any = null;

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      userData = userSnap.data();
    }
  } catch (err) {
    console.warn('User doc check warning:', err);
  }

  // If user already has a household assigned, fetch it
  if (userData?.householdId) {
    try {
      const householdRef = doc(db, 'households', userData.householdId);
      const householdSnap = await getDoc(householdRef);
      if (householdSnap.exists()) {
        const hData = householdSnap.data() as Household;
        return {
          ...hData,
          id: householdSnap.id
        };
      }
    } catch (err) {
      console.warn('Household doc check warning:', err);
    }
  }

  // Create a default deterministic household for this user
  const householdId = `household-${user.uid.slice(0, 12)}`;
  const householdRef = doc(db, 'households', householdId);

  // Check if this default household already exists
  try {
    const defaultSnap = await getDoc(householdRef);
    if (defaultSnap.exists()) {
      const existingData = defaultSnap.data() as Household;
      return {
        ...existingData,
        id: defaultSnap.id
      };
    }
  } catch (err) {
    console.warn('Default household check warning:', err);
  }

  const initialMember: HouseholdMember = {
    uid: user.uid,
    email: userEmail,
    displayName: user.displayName || user.email?.split('@')[0] || 'Family Member',
    photoURL: user.photoURL || undefined,
    role: 'owner',
    joinedAt: new Date().toISOString()
  };

  const newHousehold: Household = {
    id: householdId,
    name: `${initialMember.displayName}'s Family Pantry`,
    ownerUid: user.uid,
    memberUids: [user.uid],
    memberEmails: userEmail ? [userEmail] : [],
    members: [initialMember],
    createdAt: new Date().toISOString(),
    inviteCode: generateInviteCode()
  };

  try {
    await setDoc(householdRef, newHousehold, { merge: true });

    // Update user pointer
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: userEmail,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        householdId: householdId,
        hasInitialized: true,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to write household or user pointer to Firestore', err);
  }

  return newHousehold;
}

/**
 * Subscribe to household document changes (e.g. new members joining)
 */
export function subscribeToHousehold(
  householdId: string,
  onUpdate: (household: Household) => void
): Unsubscribe {
  const householdRef = doc(db, 'households', householdId);
  return onSnapshot(householdRef, (snap) => {
    if (snap.exists()) {
      onUpdate({ ...(snap.data() as Household), id: snap.id });
    }
  });
}

/**
 * Subscribe to household shared inventory items
 */
export function subscribeToHouseholdItems(
  householdId: string,
  onUpdate: (items: Item[]) => void,
  onError: (error: unknown) => void
): Unsubscribe {
  const itemsPath = `households/${householdId}/items`;
  const itemsCol = collection(db, 'households', householdId, 'items');

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
 * Save / Update an item in Household inventory
 */
export async function saveHouseholdItem(
  householdId: string,
  item: Item,
  user?: User | null
): Promise<void> {
  const itemPath = `households/${householdId}/items/${item.id}`;
  try {
    const itemRef = doc(db, 'households', householdId, 'items', item.id);
    await setDoc(
      itemRef,
      {
        id: item.id,
        itemName: item.itemName,
        category: item.category,
        photo: item.photo,
        targetMonthlyStock: item.targetMonthlyStock,
        currentStock: item.currentStock,
        unit: item.unit || 'units',
        location: item.location || '',
        notes: item.notes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || user?.email || 'Family Member'
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, itemPath);
  }
}

/**
 * Batch seed items to household inventory
 */
export async function seedHouseholdItems(
  householdId: string,
  items: Item[],
  user?: User | null
): Promise<void> {
  for (const item of items) {
    await saveHouseholdItem(householdId, item, user);
  }
}

/**
 * Delete item from household inventory
 */
export async function deleteHouseholdItem(householdId: string, itemId: string): Promise<void> {
  const itemPath = `households/${householdId}/items/${itemId}`;
  try {
    const itemRef = doc(db, 'households', householdId, 'items', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, itemPath);
  }
}

/**
 * Invite a family member by Google email address
 */
export async function inviteFamilyMemberByEmail(
  household: Household,
  invitedEmail: string,
  currentUser: User
): Promise<HouseholdInvite> {
  const cleanEmail = invitedEmail.toLowerCase().trim();
  const inviteId = `invite-${household.id}-${Date.now()}`;
  const inviteRef = doc(db, 'invites', inviteId);

  const invite: HouseholdInvite = {
    id: inviteId,
    householdId: household.id,
    householdName: household.name,
    invitedEmail: cleanEmail,
    invitedByUid: currentUser.uid,
    invitedByEmail: currentUser.email || '',
    invitedByName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Family Member',
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  await setDoc(inviteRef, invite);

  // Add email to household's memberEmails array so security rules pre-authorize the invited user
  const householdRef = doc(db, 'households', household.id);
  const updatedEmails = Array.from(new Set([...household.memberEmails, cleanEmail]));
  await updateDoc(householdRef, {
    memberEmails: updatedEmails
  });

  return invite;
}

/**
 * Check if the currently signed-in user has any pending family household invites
 */
export async function checkPendingInvites(userEmail: string): Promise<HouseholdInvite[]> {
  try {
    const cleanEmail = userEmail.toLowerCase().trim();
    const invitesQuery = query(
      collection(db, 'invites'),
      where('invitedEmail', '==', cleanEmail),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(invitesQuery);
    const list: HouseholdInvite[] = [];
    snap.forEach(docSnap => {
      list.push({ ...(docSnap.data() as HouseholdInvite), id: docSnap.id });
    });
    return list;
  } catch (e) {
    console.warn('Could not query invites', e);
    return [];
  }
}

/**
 * Accept a family household invite
 */
export async function acceptHouseholdInvite(
  invite: HouseholdInvite,
  user: User
): Promise<Household> {
  const householdRef = doc(db, 'households', invite.householdId);
  const householdSnap = await getDoc(householdRef);

  if (!householdSnap.exists()) {
    throw new Error('Household no longer exists');
  }

  const householdData = householdSnap.data() as Household;
  const userEmail = (user.email || '').toLowerCase();

  const newMember: HouseholdMember = {
    uid: user.uid,
    email: userEmail,
    displayName: user.displayName || user.email?.split('@')[0] || 'Family Member',
    photoURL: user.photoURL || undefined,
    role: 'member',
    joinedAt: new Date().toISOString()
  };

  const updatedMembers = [
    ...householdData.members.filter(m => m.uid !== user.uid),
    newMember
  ];
  const updatedUids = Array.from(new Set([...householdData.memberUids, user.uid]));
  const updatedEmails = Array.from(new Set([...householdData.memberEmails, userEmail]));

  // Update household document
  await updateDoc(householdRef, {
    members: updatedMembers,
    memberUids: updatedUids,
    memberEmails: updatedEmails
  });

  // Update user profile document to point to this household
  const userRef = doc(db, 'users', user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: userEmail,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      householdId: invite.householdId,
      hasInitialized: true,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  // Mark invite as accepted
  const inviteRef = doc(db, 'invites', invite.id);
  await updateDoc(inviteRef, {
    status: 'accepted'
  });

  return {
    ...householdData,
    members: updatedMembers,
    memberUids: updatedUids,
    memberEmails: updatedEmails
  };
}

/**
 * Check if the user's cloud inventory has already been initialized (backward compatibility)
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
 * Mark user cloud inventory as initialized (backward compatibility)
 */
export async function markUserCloudInitialized(userId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId), { hasInitialized: true }, { merge: true });
  } catch (e) {
    console.warn('Could not mark user profile as initialized', e);
  }
}
