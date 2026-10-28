# Shared Household Inventory & Family Member Access

Enable multiple family members to log in with their own Google accounts and access, update, and manage the exact same real-time household inventory and shopping list.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices:**
> - **Invitation Method**: Invite by Google email address. The owner enters their family member's email (e.g., `partner@gmail.com`), and when they log in, an invitation banner allows them to accept and join.
> - **Access Level**: Full edit and restock access for accepted family members (not just view-only). Both accounts can increment, decrement, add, edit, and restock items in real time.
> - **Real-Time Synchronization**: Any stock change or shopping list restock made by any family member updates instantly on all connected devices via Firestore.

---

## 1. Overview & Core Concept

Currently, inventory items are scoped to an individual user's account (`/users/{userId}/items`). To allow family members to collaborate without sharing passwords or accounts:

- We transition to a **Household-Centric Model**: items are stored under a shared Household container (`/households/{householdId}/items`).
- Users are mapped to their household (`/users/{userId} -> householdId`).
- An owner can invite family members by entering their Google email address.
- When the invited family member signs in with their Google account, HomeStock recognizes their pending invite and prompts: *"You have been invited to join the Household Pantry by [Owner Name]"*.
- Upon accepting, both accounts synchronize to the same pantry inventory and live shopping list.

```
┌────────────────────────────────────────────────────────┐
│                   Shared Household                     │
│                ID: household-xyz-123                   │
│                                                        │
│   Members: [ You (Owner), Family Member (Full Access) ]│
│                                                        │
│  ┌───────────────────────┐   ┌───────────────────────┐ │
│  │   Inventory Items     │   │     Shopping List     │ │
│  │   • Coffee Beans (2)  │   │   • Olive Oil (+1)    │ │
│  │   • Milk (4)          │   │   • Toothpaste (+2)   │ │
│  └───────────────────────┘   └───────────────────────┘ │
└───────────────────────────┬────────────────────────────┘
                            │
               Live Real-Time Sync (Firestore)
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
    ┌───────────────┐               ┌───────────────┐
    │  Your Account │               │ Family Member │
    │ cnzrvz@gmail  │               │   Account     │
    │  (Phone / PC) │               │ (Her Device)  │
    └───────────────┘               └───────────────┘
```

---

## 2. User Experience & Visual Design

### 1. Family Sharing Modal ("Manage Household")
- Accessible via a new **"Family"** or **"Household"** button in the header navigation (next to the Google account avatar).
- **Current Members List**: Displays avatars, names, and Google emails of everyone currently in the household, tagged with status chips (`Owner`, `Member`).
- **Invite Family Member Input**: Clean input field: `family.member@gmail.com` with a clear **"Send Invite"** button.
- **Shareable Code / Link**: A quick 6-character join code is also provided as a convenient alternative if you prefer sending a direct link via WhatsApp or SMS.

### 2. Invited Member Experience (First Sign-In)
- When your family member visits HomeStock and clicks **Google Login**:
  - The app detects that an invitation exists for her email address.
  - A warm, friendly welcome card appears:
    > **Join Household Pantry**  
    > *`cnzrvz@gmail.com` has invited you to manage your home inventory together.*  
    > `[ Accept Invitation ]` `[ Decline / Start Own Pantry ]`
- Tapping **"Accept"** immediately loads the shared household inventory, stock targets, and shopping list.
- A toast confirms: *"Connected to Shared Household Pantry"*.

### 3. Active Household Indicators
- Header displays a warm household badge: `🏡 Ramos Household • 2 Members`.
- Any changes made by family members show live visual updates across all screens.

---

## 3. Key Product Decisions & Trade-Offs

1. **Email-Based Matching vs. Manual Codes**:
   - *Chosen Approach*: Automatic email invitation lookup with a 6-character backup code.
   - *Why*: Entering an email is the most intuitive and secure approach. When she signs in with that Google account, she doesn't need to hunt for a code; the app immediately detects the invitation.
2. **Full Collaborative Permissions**:
   - *Chosen Approach*: Equal collaborative permissions (both members can add, adjust stock with `+`/`-`, edit items, and restock).
   - *Why*: Household inventories work best when anyone who goes to the store or pantry can immediately update stock counts without permission roadblocks.
3. **Data Migration**:
   - *Chosen Approach*: The owner's existing inventory items automatically become the household's initial inventory, so no existing data is lost.

---

## 4. Technical Architecture & Data Strategy

### Firestore Schema Changes

```
/households/{householdId}
  ├── name: string ("Family Pantry")
  ├── ownerUid: string
  ├── memberUids: string[]
  ├── memberEmails: string[]
  ├── members: [ { uid, email, displayName, photoURL, role } ]
  ├── createdAt: timestamp
  │
  ├── /items/{itemId}  (Shared inventory items)
  │     ├── itemName, category, photo
  │     ├── targetMonthlyStock, currentStock
  │     └── updatedAt, updatedBy
  │
  └── /invites/{inviteId}
        ├── email: string (lowercase)
        ├── invitedBy: string
        └── status: "pending" | "accepted"

/users/{userId}
  ├── uid: string
  ├── email: string (lowercase)
  ├── displayName: string
  └── householdId: string
```

### Security Rules (`firestore.rules`)
- Read & Write permissions on `/households/{householdId}/items/{itemId}` are granted if `request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberUids`.
- Users can create invites for their own household.
- Users can accept invites matching their verified `request.auth.token.email`.

### Component Updates
- `src/components/HouseholdModal.tsx`: Manage family members and invite by email.
- `src/components/JoinHouseholdBanner.tsx`: Prompt showing pending invites for newly logged-in users.
- `src/lib/firebase.ts`: Household subscriptions, invite dispatch, and acceptance handlers.
- `src/App.tsx`: Household state management and live real-time listeners.
