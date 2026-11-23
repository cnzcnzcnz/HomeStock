import { HomeDefinition } from './inventory';

export interface HouseholdMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  householdName: string;
  invitedEmail: string; // lowercase
  invitedByUid: string;
  invitedByEmail: string;
  invitedByName: string;
  createdAt: string;
  status: 'pending' | 'accepted';
}

export interface Household {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  memberEmails: string[];
  members: HouseholdMember[];
  homes?: HomeDefinition[];
  createdAt: string;
  inviteCode: string;
}
