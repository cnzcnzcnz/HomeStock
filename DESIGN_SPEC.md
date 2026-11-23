# Stoku! — Detailed Design & Engineering Specification

**Document Status:** Living Specification (Source of Truth)  
**Product Name:** Stoku! — Household Inventory & Shopping Manager  
**Last Updated:** 2026-11-22  
**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Firebase Auth & Firestore (`firebase` v9), OpenAI SDK (`openai` v7), Lucide React  

> **Maintenance Rule for Future Changes:**  
> Whenever any UI component, state flow, AI prompt, data model, Firebase rule, or configuration changes, update the corresponding section(s) of this specification **and** append a detailed entry to **Section 10 (Detailed Changelog)**.

---

## 1. Product Overview & Core Capabilities

**Stoku!** is a collaborative household inventory, automated restock-planning, and AI receipt-scanning web application designed for families and multi-home households, localized for **Indonesian Rupiah (`Rp` / `IDR`)** and `DD-MM-YYYY` date conventions.

### Core Functional Pillars
1. **Dynamic Multi-Home Inventory & Configurable Central Hub (`Home 1`, `Home 2`, `Home 3`, + Custom Homes)**: Categorize and track stock distribution across an extensible, user-customizable list of homes. Users can **rename** any home, **dynamically add** new homes (e.g., `Home 4`, `Villa Bali`, `Office Pantry`), designate which home serves as the **Central Hub** (receiving new purchases and restocks by default), and remove non-central homes (automatically returning remaining units to the Central Hub). Any non-central home can pick/transfer available units directly from the active Central Hub with full transfer history logging.
2. **Household Inventory Tracking**: Track items across 8 categories and room/shelf locations with instant `+1` / `-1` stock adjustments (scoped to the active home tab or the Central Hub when viewing `All Homes`) and monthly target quotas.
3. **Automated Restock Math & Smart Shopping List**: Dynamically computes `Restock Qty = Target Monthly Stock - Current Stock` across combined household stock and surfaces items with `Restock Qty > 0` into a filterable, checkable, printable, and copyable shopping list that replenishes the active **Central Hub** (`{centralHome.name} (Central)`).
4. **AI Receipt Scanner (OpenAI Vision)**: Uses `gpt-4o` (default) to scan retail receipt photos, parse `DD.MM.YY` dates to `DD-MM-YYYY`, extract integer Rupiah totals/discounts and per-unit item prices/quantities, match items against existing stock, and deposit purchased quantities into any configured destination home (defaulting to the active Central Hub).
5. **Shopping History & Transfer Ledger**: Saves every scanned receipt in a searchable accordion ledger with cumulative KPI metrics (`Total Spent`, `Total Discounts Saved`, `Items Stocked`) formatted in `Rp`, alongside recent **Central Hub → Other Homes** stock pick logs resolved with live home names.
6. **Family Household Collaboration**: Google Sign-In enables shared households where owners can invite family members by Google email or 6-character share code, granting full real/write access across devices in real time, including shared home names and configurations.
7. **Sandbox vs. Cloud Isolation**: Signed-out users operate strictly inside isolated browser `sandbox` storage keys so testing never alters live Firestore data.

---

## 2. Visual Design System & Responsive Layout

### 2.1 Color System (`Tailwind CSS v4`)
| Role | Classes / Tokens | Usage |
| :--- | :--- | :--- |
| **App Canvas (60%)** | `bg-stone-50`, `text-stone-900` | Root page background and primary dark ink |
| **Surfaces (30%)** | `bg-white`, `border-stone-200/90`, `bg-stone-900`, `bg-stone-800` | Cards, tables, modals, sticky dark header (`stone-900`), dark KPI hero |
| **Primary Accent (10%)** | `bg-amber-500`, `hover:bg-amber-400`, `text-amber-400`, `text-stone-950` | Active navigation tabs, Scan Receipt CTA, `+` stepper buttons, Add/Save CTAs |
| **Stocked / Savings** | `emerald-600`, `emerald-700`, `emerald-900` (banner), `emerald-50` | "Stocked" status, Cloud connection banner, discount amounts, match confirmations |
| **Restock / Alert** | `rose-600`, `rose-700`, `rose-50`, `rose-100` | `Restock Qty > 0` badges, "Out of Stock", delete confirmations, validation/scan errors |
| **New / Info** | `sky-400`, `sky-600`, `sky-100` | `Items Stocked` KPI, "Created New" receipt item status badge |

### 2.2 Typography (`index.html` + Tailwind)
- **Primary Font (`font-sans`)**: `'Plus Jakarta Sans'` (weights `400`, `500`, `600`, `700`, `800`), loaded via Google Fonts in `index.html`.
- **Numeric / Code Font (`font-mono`)**: Used for stock counters, `Restock Qty` badges, numeric inputs, and household share codes.
- **Hierarchy**:
  - Brand Wordmark: `font-bold text-sm sm:text-base lg:text-lg tracking-tight text-white`
  - Hero / Page Title: `text-2xl sm:text-3xl font-black tracking-tight`
  - Modal / Section Headings: `text-lg font-black tracking-tight` or `text-xl font-black`
  - Micro-labels / Form Labels: `text-[10px] sm:text-xs font-bold uppercase tracking-wider`

### 2.3 Elevation, Borders & Motion
- **Radius Scale**: `rounded-3xl` (`24px`) for modals, empty receipt container, and history hero banner; `rounded-2xl` (`16px`) for cards, toolbars, and KPI blocks; `rounded-xl` (`12px`) for buttons and inputs; `rounded-lg` (`8px`) for compact header buttons and inline table steppers.
- **Overlays**: `fixed inset-0 z-50 bg-stone-950/70` (or `/75` on Scanner) with `backdrop-blur-xs`.
- **Motion**: `active:scale-95` / `active:scale-90` press feedback, `animate-in fade-in duration-150/200`, image hover `group-hover:scale-105 transition-transform duration-300`.

### 2.4 Responsive Breakpoint Matrix
| Breakpoint | Width | Top Header Row (`Navbar`) | Navigation Tabs | Grid Columns (`GridView`) |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `< 640px` (`< sm`) | Brand (`Stoku!`, count, sync) + icon-only action buttons (`p-2`, `shrink-0`) including compact Google "G" icon button (no overflow at `360px–390px`) | 4-column grid tab bar inside sticky header (`Grid`, `Table`, `Shop`, `History`) | `1` column |
| **Tablet** | `640px–1023px` (`sm`–`md`) | Brand + labeled buttons (`Scan Receipt`, `Add`, `Family`, `Login`) | 4-column grid tab bar inside sticky header | `2` columns |
| **Laptop** | `1024px–1279px` (`lg`) | Brand + inline `Desktop Views` tab bar + labeled action buttons | Inline in header (`Grid View`, `Items Table`, `Shopping List`, `History & Receipts`) | `3` columns |
| **Desktop** | `>= 1280px` (`xl`) | Same as `lg`, plus authenticated user's `displayName` (`max-w-[85px] truncate`) | Inline in header | `4` columns |

---

## 3. Data Models & TypeScript Contracts

### 3.1 Inventory & Receipt Entities (`src/types/inventory.ts`)
```ts
export type ViewTab = 'grid' | 'table' | 'shopping' | 'history';
export type StockStatus = 'out_of_stock' | 'low_stock' | 'good' | 'surplus';

export type HomeId = string;

export type HomeStocks = Record<string, number>;

export interface HomeDefinition {
  id: HomeId;                   // e.g. "home-1", "home-4" (matches ^[a-zA-Z0-9_-]+$)
  name: string;                 // User-editable display label (max 60 chars)
  isCentral?: boolean;          // Exactly one home acts as Central Hub
}

export interface Item {
  id: string;                   // e.g. "item-1700000000000" or "item-1"
  itemName: string;             // Display name (max 150 chars in blueprint)
  category: string;             // One of CATEGORIES (max 80 chars)
  photo: string;                // Image URL (defaults to PHOTO_PRESETS[0].url)
  targetMonthlyStock: number;   // Non-negative integer monthly quota
  currentStock: number;         // Non-negative integer total stock (sum of homeStocks)
  homeId?: HomeId;              // Primary home designation (defaults to active Central Hub)
  homeStocks?: HomeStocks;      // Dynamic per-home unit distribution keyed by HomeId
  unit?: string;                // Container/unit label (defaults to "units")
  location?: string;            // Storage location (e.g. "Pantry Shelf 2")
  notes?: string;               // Optional notes (e.g. receipt origin)
  updatedAt?: string;           // ISO-8601 timestamp
}

export interface StockTransferRecord {
  id: string;                   // "transfer-${Date.now()}-${rand}"
  itemId: string;
  itemName: string;
  unit?: string;
  fromHomeId: HomeId;           // Active Central Hub homeId at time of pick
  toHomeId: HomeId;             // Any branch homeId
  quantity: number;             // Positive integer transferred
  transferredAt: string;        // ISO-8601 timestamp
  transferredBy?: string;       // Display name / email of household member
}

export interface ReceiptItemMatched {
  receiptItemName: string;      // Cleaned name extracted from receipt
  quantity: number;             // Integer >= 1 purchased
  price?: number;               // Single-unit price in integer Rupiah
  matchedItemId?: string;       // Matched Item.id
  matchedItemName?: string;     // Matched Item.itemName
  matchedCategory?: string;     // Matched Item.category
  previousStock?: number;       // Stock before applying receipt
  newStock?: number;            // Stock after applying receipt (previous + quantity)
  unit?: string;                // Item unit (defaults to "units")
  status: 'matched_and_incremented' | 'new_item_created' | 'unmatched_skipped';
}

export interface ShoppingReceiptRecord {
  id: string;                   // "receipt-${Date.now()}"
  storeName: string;            // Store name (e.g. "Indomaret", "Superindo")
  purchaseDate: string;         // Strictly formatted "DD-MM-YYYY"
  discountAmount: number;       // Integer Rupiah discount/savings
  totalSpent: number;           // Integer Rupiah final total
  currency: string;             // Default "Rp"
  destinationHomeId?: HomeId;   // Home receiving receipt stock (defaults to active Central Hub)
  receiptImageUrl?: string;     // Base64 data URL from upload
  summaryNotes?: string;        // AI trip summary
  matchedItemsCount: number;    // Count of items not skipped
  items: ReceiptItemMatched[];
  createdAt: string;            // ISO-8601 timestamp
  scannedBy?: string;           // Display name / email of scanner
}
```

### 3.2 Household & Collaboration Entities (`src/types/household.ts`)
```ts
export interface HouseholdMember {
  uid: string;
  email: string;                // Lowercase email
  displayName: string;
  photoURL?: string;
  role: 'owner' | 'member';     // Both roles have full pantry read/edit rights
  joinedAt: string;             // ISO-8601 timestamp
}

export interface HouseholdInvite {
  id: string;                   // "invite-${householdId}-${Date.now()}"
  householdId: string;
  householdName: string;
  invitedEmail: string;         // Lowercase normalized email
  invitedByUid: string;
  invitedByEmail: string;
  invitedByName: string;
  createdAt: string;            // ISO-8601 timestamp
  status: 'pending' | 'accepted';
}

export interface Household {
  id: string;                   // "household-${user.uid.slice(0, 12)}"
  name: string;                 // "${displayName}'s Family Pantry"
  ownerUid: string;
  memberUids: string[];         // Authorizes Firestore access by UID
  memberEmails: string[];       // Pre-authorizes invited emails in security rules
  members: HouseholdMember[];
  homes?: HomeDefinition[];     // Shared custom home definitions synced across family devices
  createdAt: string;
  inviteCode: string;           // 6-char uppercase alphanumeric (excluding I/O/0/1)
}
```

---

## 4. Detailed Screen & Component Specifications

### 4.1 Root Orchestrator (`src/App.tsx`)
- **State**:
  - `currentUser: User | null`, `household: Household | null`, `pendingInvite: HouseholdInvite | null`
  - `homes: HomeDefinition[]` (initialized from `loadStoredHomes('sandbox')`, synced to `household.homes` when signed in)
  - `items: Item[]` (initialized from `loadStoredItems('sandbox')`, automatically normalized via `normalizeItemHomes`)
  - `receipts: ShoppingReceiptRecord[]` (initialized from `loadStoredReceipts('sandbox')`)
  - `transfers: StockTransferRecord[]` (initialized from `loadStoredTransfers('sandbox')`)
  - `selectedHome: HomeId | 'all'` (`'all'` default across `GridView` and `ItemsTable`)
  - `currentTab: ViewTab` (`'grid'` default)
  - Modal flags: `isModalOpen`, `isReceiptScannerOpen`, `isHouseholdModalOpen`, `isPickModalOpen`, `isManageHomesOpen`, `editingItem`, `deletingItem`
  - `isSyncing`, `isAcceptingInvite`, `toast` (`3200ms` auto-dismiss bottom-right toast)
- **Home-Aware & Dynamic Home CRUD Actions**:
  - `handleRenameHome(homeId, newName)`: Renames any configured home, updates local/sandbox state, and persists via `updateHouseholdHomes` when signed in.
  - `handleAddHome(name)`: Appends a new `HomeDefinition` (`home-4`, `home-5`, ...), normalizes item `homeStocks`, and syncs to Firestore/localStorage.
  - `handleSetCentralHome(homeId)`: Designates any configured home as the Central Hub and persists immediately.
  - `handleRemoveHome(homeId)`: Removes a non-central home, merges any remaining stock back into the active Central Hub, resets `selectedHome` to `'all'` if needed, and syncs updated `homes` + `items`.
  - `handleIncrement` / `handleDecrement`: Adjusts stock in `selectedHome` when viewing a specific home, or in the active Central Hub when viewing `All Homes`.
  - `handlePickFromCentral(itemId, toHomeId, quantity)`: Transfers available units from the active Central Hub to any non-central home, logs a `StockTransferRecord`, and syncs both updated item and transfer record to Firestore/sandbox.
  - `handleRestockItem` / `handleRestockAll`: Adds missing restock units (`targetMonthlyStock - currentStock`) directly into the active Central Hub and recalculates total stock.
- **Connected Cloud Status Bar**: Rendered below `Navbar` when `currentUser` is present (`bg-emerald-900`), showing active household name, shared member count (if `> 1`), email, and quick buttons for **Scan Receipt** and **Manage Family Sharing**.
- **Footer**: Displays `Stoku! • Household Inventory & Receipt Management`, active household name on `sm+`, and quick tab links (`Grid View`, `Items Table`, `Shopping List (N)`, `Receipts & History (M)`).

### 4.2 Navigation Bar (`src/components/Navbar.tsx`)
- **Sticky Header**: `sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800`, height `h-14 sm:h-16`.
- **Brand Zone**: Sparkles badge + `Stoku!` + `{totalItemsCount}` pill + `Cloud` (emerald, with pulsing `...` when `isSyncing`) or `Offline` status.
- **Desktop Nav (`hidden lg:flex`)**: 4 view buttons (`Grid View`, `Items Table`, `Shopping List` with rose count pill when `shoppingCount > 0`, `History & Receipts` with amber count pill when `receiptsCount > 0`).
- **Right Action Controls (`space-x-1 sm:space-x-2 shrink-0`)**:
  - **Scan Receipt** (`aria-label="Scan Receipt with OpenAI Vision"`): Amber gradient button; icon-only on `< sm`, `"Scan Receipt"` on `sm+`.
  - **Add Item** (`aria-label="Add new item"`): `+` icon on `< sm`, `"+ Add"` on `sm+`.
  - **Reset Sample Data** (`aria-label="Reset sample inventory"`): `RefreshCw` icon button.
  - **Family Sharing** (`aria-label="Manage Household and Family Members"`): `Users` icon (`text-amber-400`) + `"Family"` on `sm+` + member count badge if `members.length > 1`.
  - **Google Auth**:
    - Signed out: Google "G" SVG icon (`p-2` on `< sm`, `"Login"` label visible on `sm+`).
    - Signed in: `w-7 h-7 sm:w-8 sm:h-8` avatar (or amber initial circle) + `displayName` on `xl:` + `LogOut` icon button.
- **Mobile/Tablet Tab Bar (`lg:hidden`)**: `grid-cols-4` (`Grid`, `Table`, `Shop` + badge, `History` + badge).

### 4.3 Grid View & Dynamic Multi-Home Controls (`src/components/GridView.tsx`, `HomeFilterBar.tsx`, `ManageHomesModal.tsx`, `PickFromHomeModal.tsx`, `ItemCard.tsx`)
- **`HomeFilterBar.tsx`**:
  - Wrapping tab strip (`flex-wrap`) displaying **All Homes** and every home in `homes` (`{home.name}` + `Central` badge on the active Central Hub + live total unit count badge, `aria-pressed`), ensuring all home tabs remain visible without hidden overflow on `< 640px` mobile screens.
  - **`Manage Homes` Button** (`aria-label="Manage and rename homes"`): Opens `ManageHomesModal` to rename, add, switch Central Hub, or remove homes.
  - Primary amber CTA: **`Pick from {centralHome.name}`** (adapts label to `Pick from {centralHome.name} → {selectedHome.name}` when a branch home tab is active) showing total available Central Hub units (hidden if fewer than 2 homes exist).
  - Contextual hub helper caption dynamically listing all configured home names and clarifying Central Hub vs. branch home role.
- **`ManageHomesModal.tsx`**:
  - Accessible `role="dialog"` modal (`aria-labelledby="manage-homes-title"`) listing all configured homes with stored unit counts.
  - Inline editable input per home (`aria-label="Home name for {home.name}"`) with conditional `Save` (`Enter` or click) + `Saved` feedback badge.
  - **`Set as Central`** button and **`Remove {home.name}`** trash icon on non-central homes (preventing removal of the active Central Hub and automatically returning any removed home's units to Central Hub).
  - **`Add Another Home Dynamically`** form (`#new-home-name-input`) validating non-empty, unique names (`<= 60` chars) and appending new homes immediately (`home-4`, `home-5`, ...).
- **`PickFromHomeModal.tsx`**:
  - Accessible `role="dialog"` modal for transferring centralized stock from the active `centralHome` to any non-central destination home.
  - Destination toggle across all non-central homes (`branchHomes`), search input filtering Central Hub items with `centralQty > 0`, per-item `{centralHome.name}: X -> {targetHome.name}: Y` preview, quantity stepper (`1..centralQty`), instant `Pick -> {targetHome.name}` button with `+N` picked badge feedback, and `Done` close button.
- **3 KPI Cards**:
  1. *Total Household Items* (or *Items in {home.name}* when filtered): `{scopedItems.length}`
  2. *Needs Restock* (`role="button"`, `tabIndex={0}`): Clickable card with `Restock Qty > 0` badge and `View List →` link; switches to `'shopping'` tab.
  3. *Fully Stocked*: `{total - needsRestock}`
- **Filter Controls**:
  - Search input (matches `itemName`, `category`, or `location`, case-insensitive).
  - Segmented filter (`All Items`, `Needs Restock (N)`, `Stocked`).
  - Horizontal category pills (`All Categories` + `CATEGORIES`).
- **Empty State**: "No items found in {Home}" card with `Pick from {centralHome.name}` CTA (when viewing a branch home), conditional `Clear Filters` button, and `Add New Item` button.
- **`ItemCard.tsx`**:
  - `h-48` image with `loading="lazy"` and `ImageOff` fallback on error.
  - Top-left category badge; top-right `Restock: +N` (rose) or `Stocked` (emerald) badge; bottom-left dynamic primary Home pill (`getHomeLabel(...)`); bottom-right Edit & Delete icon buttons.
  - Wrapping per-home distribution chips (`flex flex-wrap gap-1.5`) across all configured `homes` (`{home.name}: {qty}`), highlighting the active home tab.
  - Aligned flex body (`flex-1 flex flex-col`) keeping `Target Monthly` and `Restock Qty (T - C)` flush across cards in the same grid row.
  - Home-aware stock counter (`Current Stock` or `{home.name} Stock`, plus `Total all homes: N` subtitle when filtered) with `-` (`disabled` at `<= 0`) and `+` stepper buttons, plus quick `Pick from {centralHome.name} (N avail)` / `Send {centralHome.name} -> {target} (N avail)` button when `homeStocks[centralHome.id] > 0` and `homes.length > 1`.

### 4.4 Items Table (`src/components/ItemsTable.tsx`)
- Includes `HomeFilterBar` (including `Manage Homes`) at top to scope table rows and inline stock steppers to `All Homes` or any configured home.
- Search input, category `<select>`, count label (`Showing X of Y items`), and `Add Row` button.
- Sortable columns (`itemName`, `category`, `targetMonthlyStock`, `currentStock`, `restockQty`) with `ArrowUpDown` / `ArrowUp` / `ArrowDown` indicators.
- Columns: `Photo`, `Item Name` (+ location & dynamic primary home label), `Category`, `Home Split` (dynamic `{home.name}:{qty}` chips + quick `Pick from {centralHome.name}` button when `centralStock > 0`), `Target Monthly Stock`, `Current Stock` (scoped to selected home with inline `-` / `+` buttons + `All: N` hint), `Restock Qty (Math)` (`+N unit` in rose if `> 0`, `N (Full)` in emerald if `<= 0`), `Actions` (`Edit`, `Delete`).

### 4.5 Shopping List (`src/components/ShoppingListView.tsx`)
- Filters `items` strictly via `getShoppingList(items)` (`Restock Qty > 0` across combined household stock).
- **Header Actions** (when list non-empty):
  - `Copy List`: Copies plain-text checklist (`🛒 Household Shopping List:` + bullet lines + totals) to clipboard; shows `Copied!` for `2500ms`.
  - `Print`: Triggers `window.print()`.
  - `Restock All to Target`: Adds needed units into the active Central Hub (`{centralHome.name} (Central)`) so `currentStock === targetMonthlyStock` and syncs to Firestore.
- **Category Filter & Summary**: Total items count, `+{totalRestockUnits}`, and scrollable category strip (`w-full max-w-full sm:w-auto`) constrained so mobile viewports (`390×844`) never horizontally overflow.
- **List Rows**: Responsive `min-w-0` flex row with local checkbox toggle, photo, dynamic primary Home badge + wrapping per-home breakdown (`({homes.map(h => h.name:qty).join(' · ')})`), `Out of Stock` badge when `currentStock === 0`, `Buy Quantity` (`+{restockQty} {unit}`), `+1` button, and `Restock` button (replenishes into Central Hub).
- **Empty State**: "All Stocked Up!" with `Return to Grid View` button.

### 4.6 Shopping History & Receipts (`src/components/ShoppingHistoryView.tsx`)
- **Dark Hero Banner**:
  - `Scan New Receipt` CTA button.
  - **4 KPI Cards**:
    1. `Receipts Scanned`: `{receipts.length}`
    2. `Total Spent`: `{formatRupiah(totalSpentAll)}` (amber)
    3. `Total Discounts Saved`: `{formatRupiah(totalDiscountsAll)}` (emerald)
    4. `Items Stocked`: Sum of `item.quantity` across all receipts (sky)
- **Recent Home Stock Picks Panel**: Displays the latest `StockTransferRecord` transfers (`{centralHome.name} → Other Homes`) resolving both `fromHomeId` and `toHomeId` dynamically via `getHomeLabel`.
- **Search Input**: Filters receipts by `storeName`, `purchaseDate`, or any `receiptItemName` / `matchedItemName`.
- **Receipt Accordion Cards** (first receipt expanded by default):
  - Header: Store icon, `storeName` (`min-w-0` wrapping), dynamic destination home badge (`getHomeLabel(record.destinationHomeId || centralHome.id, true, normalizedHomes)`), `purchaseDate` (`DD-MM-YYYY`), `scannedBy`, items purchased/updated count, `formatRupiah(record.totalSpent)`, and `-{formatRupiah(record.discountAmount)} discount` (if `> 0`).
  - Expanded body: 4-cell summary, itemized table (`overflow-x-auto`), `View Inventory Stock` button, and `Delete Receipt Record` (`window.confirm` gated).

### 4.7 Receipt Scanner Modal (`src/components/ReceiptScannerModal.tsx`)
- **Header**: Title `AI Receipt Scanner`, dynamic active model pill (`OpenAI GPT-4o`, `OpenAI GPT-4o Mini`, or `OpenAI GPT-5 Nano`), `Model & Key` toggle button, and close button.
- **API Key & Model Settings Panel**:
  - Model `<select>` bound to `SUPPORTED_MODELS` (`gpt-4o` default), persisted via `saveStoredOpenAIModel`.
  - Password `<input>` for OpenAI key (`sk-proj-...`), persisted via `saveStoredOpenAIApiKey`.
- **Step 1 (Image Capture)**:
  - `<input type="file" accept="image/*" capture="environment" />` validating `file.type.startsWith('image/')`.
  - Preview container (`max-h-72`) with remove photo `X` button and `Process & Extract Receipt Data` button (`isScanning` spinner).
- **Step 2 (Review & Match)**:
  - Editable summary fields: `Store Name`, `Date (DD-MM-YYYY)`, `Total Spent (Rp)` (`step="1"`), `Discount (Rp)` (`step="1"`), plus **`Receive Into Home`** `<select>` populated dynamically from `homes` (defaulting to the active Central Hub).
  - Item review list (`max-h-64 overflow-y-auto`) with `{formatRupiah(row.price)} / unit` and per-line total when `quantity > 1`.
  - Footer: `Cancel & Retake` and `Confirm & Increment Stock in Database` (increments `homeStocks[destinationHomeId]`, initializes full dynamic `homeStocks` map on new items, creates `ShoppingReceiptRecord`, syncs to Firestore, switches to `'history'`).

### 4.8 Modals & Invitation Banner
- **`ItemModal.tsx`**: Add/Edit form validating non-empty `itemName` and non-negative `targetMonthlyStock` / per-home stocks, **Primary Home** `<select>` populated dynamically across `homes`, **Stock by Home** numeric inputs (`grid-cols-2 sm:grid-cols-3`) dynamically generated for every configured home with live **`Total All Homes`** sum and **`Restock Qty`** preview, plus 12 `PHOTO_PRESETS` thumbnails.
- **`DeleteConfirmModal.tsx`**: Confirms item deletion before calling `onConfirm(item.id)`.
- **`HouseholdModal.tsx`**: Unauthenticated Google login prompt, loading spinner, or authenticated member list, email invite form, and copyable `inviteCode`.
- **`PendingInviteBanner.tsx`**: `role="alert"` amber gradient banner when `pendingInvite` is found for the signed-in user's email.

---

## 5. Business Logic, Algorithms & AI Integration

### 5.1 Inventory Math, Dynamic Multi-Home Normalization & Presets (`src/utils/inventory.ts`)
- `DEFAULT_HOMES`: Defines `'home-1'` (`Home 1`, `isCentral: true`), `'home-2'` (`Home 2`), `'home-3'` (`Home 3`), with `CENTRAL_HOME_ID = 'home-1'`.
- **Dynamic Home CRUD Helpers**:
  - `normalizeHomesList(rawHomes)`: Deduplicates homes by ID, trims/falls back names, and guarantees at least 1 home and strictly 1 `isCentral` home.
  - `getCentralHome(homes)` & `getCentralHomeId(homes)`: Resolves the active Central Hub `HomeDefinition` / ID.
  - `createHomeDefinition(name, existingHomes)`: Generates unique IDs (`home-4`, `home-5`, ...) conforming to Firestore `^[a-zA-Z0-9_-]+$` rules with max-60-char display names.
  - `renameHomeInList(homes, homeId, newName)`: Immutably updates a home's display name.
  - `setCentralHomeInList(homes, centralHomeId)`: Switches the active Central Hub cleanly.
  - `removeHomeFromList(homes, targetHomeId, items)`: Blocks removing the sole remaining home or active Central Hub; removes non-central home and folds its stored item quantities and `homeId` references back into the Central Hub.
  - `loadStoredHomes(mode)` & `saveStoredHomes(homes, mode)`: Persists dynamic homes in `sandbox` or `cloud_cache` `localStorage`.
- `getNormalizedHomeStocks(item, homes)`: Ensures every item holds non-negative integer stock keys across all configured `homes` plus any legacy positive stock keys; legacy items without `homeStocks` assign `currentStock` into their `homeId` (or active Central Hub).
- `getTotalStockFromHomes(homeStocks)`: Sums all numeric per-home entries.
- `normalizeItemHomes(item, homes)`: Guarantees `homeId`, `homeStocks`, and `currentStock === getTotalStockFromHomes(homeStocks)`.
- `adjustItemStockForHome(item, homeId, delta, homes)`: Clamps and adjusts a single home's stock while keeping total `currentStock` synchronized.
- `transferStockBetweenHomes(item, fromHomeId, toHomeId, quantity, homes)`: Transfers `min(requested, availableInFromHome)` units cleanly (returns `{ item, transferredQuantity }` with unchanged `currentStock`).
- `restockItemToTargetInHome(item, targetHomeId, homes)`: Replenishes `max(0, targetMonthlyStock - currentStock)` units directly into the specified/active Central Hub so total stock meets target.
- `filterItemsByHome(items, selectedHome, homes)`: Returns all items for `'all'`, or items assigned to `selectedHome` (`item.homeId === selectedHome`) OR holding `stock > 0` in `selectedHome`.
- `calculateRestockQty(target, current) = (Number(target) || 0) - (Number(current) || 0)`
- `isShoppingListNeeded(item) = calculateRestockQty(...) > 0`
- `getShoppingList(items)`: Maps `restockQty` and filters to `restockQty > 0`.
- `getItemStockStatus(target, current)`:
  - `current <= 0` $\rightarrow$ `'out_of_stock'`
  - `target > 0 && current < target * 0.4` $\rightarrow$ `'low_stock'`
  - `target > 0 && current > target * 1.5` $\rightarrow$ `'surplus'`
  - else $\rightarrow$ `'good'`
- `clampStock(value) = Math.max(0, Math.floor(value))`
- **8 Fixed Categories (`CATEGORIES`)**:
  `Pantry & Groceries`, `Beverages & Coffee`, `Household & Cleaning`, `Paper Goods & Wraps`, `Personal Care & Bath`, `Health & First Aid`, `Pet Supplies`, `General Supplies`.
- **Default Dataset (`INITIAL_ITEMS`)**: 10 pre-configured household items (7 needing restock, 3 stocked, initially centralized in `Home 1`) used on initial sandbox boot, reset action, or first-time cloud initialization when no local/legacy items exist.

### 5.2 Currency, Date & Matching Logic (`src/utils/receiptScanner.ts`)
- **`formatRupiah(amount)`**:
  ```ts
  const val = Math.round(Number(amount) || 0);
  return `Rp ${val.toLocaleString('id-ID')}`;
  ```
- **`normalizeReceiptDateToDDMMYYYY(inputDate)`**:
  1. Empty input $\rightarrow$ today's date as `DD-MM-YYYY`.
  2. Regex `^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$`: Expands 2-digit years `< 100` to `2000 + yr`. Defaults to `p1 = day`, `p2 = month`; flips only if `p1 <= 12 && p2 > 12`.
  3. Regex `^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$`: Converts ISO `YYYY-MM-DD` to `DD-MM-YYYY`.
  4. Fallback: `Date.parse`, else returns trimmed input.
- **`matchReceiptItemToInventory(detectedName, existingItems)`**:
  1. Normalizes strings (`toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()`).
  2. Exact equality $\rightarrow$ confidence `1.0`.
  3. Substring inclusion (`includes`) $\rightarrow$ confidence `0.85`.
  4. Token overlap (tokens length `> 2`, bidirectional `.includes()`) $\rightarrow$ `matchingTokenCount / max(detectedTokens.length, itemTokens.length)`, accepted when `>= 0.4`.

### 5.3 OpenAI Vision Integration (`parseReceiptWithOpenAI`)
- **Client SDK**: `new OpenAI({ apiKey, dangerouslyAllowBrowser: true })`.
- **Model Priority**: `[preferredModel, 'gpt-4o', 'gpt-4o-mini', 'gpt-5-nano']` (`temperature: 0.1`, `max_tokens: 2000`, `detail: 'high'`).
- **Error Short-Circuit**: Immediately rethrows on HTTP `401` (bad key) or `429` (rate limit/quota) without burning retries on fallback models.
- **Prompt Rules Enforced**:
  1. **Actual Purchase Quantity**: Extract multipliers (`"5 x 3.100"` $\rightarrow$ `quantity: 5`); never mistake package sizes (`85g`, `160ml`, `200ml`, `1kg`) or SKUs for quantity.
  2. **Unit Price Per Piece**: Extract single-item unit price (`15000` from `"2 x 15.000 = 30.000"`); divide line subtotal by quantity if only line total is printed.
  3. **Indonesian Rupiah**: Period (`.`) is a thousands separator (`25.000` $\rightarrow$ `25000`), output integer Rupiah and `"currency": "Rp"`.
  4. **Strict Date**: Interpret `DD.MM.YY` (`"28.10.26"` = `28 October 2026`, not `2023`), output `DD-MM-YYYY`.
  5. **Post-Processing**: Strips markdown fences, parses JSON, runs `normalizeReceiptDateToDDMMYYYY`, rounds `discountAmount`, `totalSpent`, and item `price` to non-negative integers, defaults `currency` to `'Rp'`.

---

## 6. Persistence, Configuration & Security Architecture

### 6.1 Browser `localStorage` Keys
| Key | Scope / Purpose |
| :--- | :--- |
| `homestock_sandbox_homes_v1` | Signed-out sandbox custom/renamed home list (`loadStoredHomes('sandbox')`) |
| `homestock_sandbox_items_v1` | Signed-out sandbox inventory items (`loadStoredItems('sandbox')`) |
| `homestock_sandbox_receipts_v1` | Signed-out sandbox receipt history (`loadStoredReceipts('sandbox')`) |
| `homestock_sandbox_transfers_v1` | Signed-out sandbox Central → Branch transfer logs (`loadStoredTransfers('sandbox')`) |
| `homestock_homes_v1` | Signed-in `cloud_cache` mirror of household homes |
| `homestock_inventory_items_v1` | Signed-in `cloud_cache` mirror of items |
| `homestock_shopping_receipts_v1` | Signed-in `cloud_cache` mirror of receipts |
| `homestock_home_transfers_v1` | Signed-in `cloud_cache` mirror of home stock transfers |
| `homestock_openai_api_key_v1` | User-supplied OpenAI API key (overrides `VITE_OPENAI_API_KEY`) |
| `homestock_openai_model_v1` | Selected OpenAI model ID (`gpt-4o` default) |

### 6.2 Firebase Initialization & Auth Lifecycle (`src/lib/config.ts`, `src/lib/firebase.ts`)
- **Config Resolution**: Reads `VITE_FIREBASE_*` environment variables first, falling back to optional gitignored `/firebase-applet-config.json` loaded via `import.meta.glob`.
- **Database Binding**: `getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined)`.
- **Google Auth**: `signInWithPopup` with `prompt: 'select_account'`. Upserts `/users/{uid}` profile on sign-in.
- **Household Bootstrap & Sync Flow (`onAuthStateChanged`)**:
  1. Sets optimistic in-memory `Household` immediately (`household-${user.uid.slice(0, 12)}`) so Family UI opens instantaneously.
  2. Queries `/invites` where `invitedEmail == userEmail` and `status == 'pending'`.
  3. Calls `getOrCreateHousehold(user)` (initializing `homes` with `DEFAULT_HOMES` when missing) and subscribes via `onSnapshot` to `/households/{id}` (live-updating `homes` across devices), `/households/{id}/items`, `/households/{id}/receipts`, and `/households/{id}/transfers` (sorted newest first).
  4. `updateHouseholdHomes(householdId, homes)` persists home renames, additions, Central Hub changes, and removals on `/households/{householdId}`.
  5. If household has `0` items: checks legacy `/users/{uid}/items` for automatic migration; otherwise seeds from `localStorage` cache or `INITIAL_ITEMS` (only if `!hasInitialized`).
  6. On sign-out: Unsubscribes all listeners, clears `household` and `pendingInvite`, and reloads `'sandbox'` homes, items, receipts, and transfers from `localStorage`.

### 6.3 Firestore Collections & Security Rules (`firestore.rules`)
- **Default Deny**: `match /{document=**} { allow read, write: if false; }`
- **`/users/{userId}`**: `get`, `create`, `update` when `request.auth.uid == userId`; `delete: false`.
  - **`/users/{userId}/items/{itemId}`**: Full owner access (`isOwner(userId)`).
- **`/households/{householdId}`**:
  - `get`: Authenticated user in `memberUids`, `userEmail()` in `memberEmails`, or doc does not exist yet.
  - `list`, `create`: Any signed-in user.
  - `update`: Existing member (`memberUids` / `memberEmails`) or user adding themselves (`request.auth.uid in request.resource.data.memberUids`).
  - `delete`: Household owner only (`resource.data.ownerUid == request.auth.uid`).
  - Subcollections **`/items/{itemId}`**, **`/receipts/{receiptId}`**, and **`/transfers/{transferId}`**: `get, list, create, update, delete` for signed-in household collaborators.
- **`/invites/{inviteId}`**: `get, list, create, update, delete` for signed-in users.

---

## 7. Project Module & Build Configuration

### 7.1 Module Map
```
/
├── DESIGN_SPEC.md                # This living design & engineering specification
├── index.html                    # Entry HTML ("Stoku!" title/OG tags, Plus Jakarta Sans font)
├── firestore.rules               # Firestore security rules
├── firebase-blueprint.json       # Firestore entity schema blueprint
├── .env.example                  # Documented VITE_OPENAI_API_KEY & VITE_FIREBASE_* vars
├── vite.config.ts                # React + Tailwind v4 plugins, '@' alias, DISABLE_HMR support
└── src/
    ├── App.tsx                   # Root state, Auth/Firestore listeners, modals, toast, footer
    ├── index.css                 # @import "tailwindcss";
    ├── types/
    │   ├── inventory.ts          # Item, HomeId, HomeStocks, StockTransferRecord, Receipt types
    │   └── household.ts          # Household, HouseholdMember, HouseholdInvite
    ├── lib/
    │   ├── config.ts             # Env + optional firebase-applet-config.json resolver
    │   └── firebase.ts           # Auth, Firestore CRUD (items, receipts, transfers), invites
    ├── utils/
    │   ├── inventory.ts          # Multi-home stock math, transfers, restock math, localStorage
    │   ├── receiptScanner.ts     # OpenAI Vision parser, Rupiah formatter, date parser, matcher
    │   └── inventory.test.ts     # Unit test suite (node:test + tsx)
    └── components/
        ├── Navbar.tsx            # Responsive header & mobile 4-tab bar
        ├── HomeFilterBar.tsx     # Dynamic home filter tabs, Manage Homes & Pick CTA
        ├── ManageHomesModal.tsx  # Modal to rename, add, set Central Hub, and remove homes
        ├── PickFromHomeModal.tsx # Transfer modal to pick Central Hub stock into branch homes
        ├── GridView.tsx          # Home-aware KPI cards, filters, responsive ItemCard grid
        ├── ItemCard.tsx          # Item card with dynamic Home badges, split chips & Pick CTA
        ├── ItemsTable.tsx        # Sortable table with Home Split & Restock Qty (Math) columns
        ├── ShoppingListView.tsx  # Restock Qty > 0 checklist replenishing active Central Hub
        ├── ShoppingHistoryView.tsx # Rupiah KPI header, receipt breakdowns, Home Pick log
        ├── ReceiptScannerModal.tsx # OpenAI Vision scanner with dynamic Receive Into Home
        ├── HouseholdModal.tsx    # Member list, email invite form, share code
        ├── PendingInviteBanner.tsx # Pending family invitation accept/dismiss banner
        ├── ItemModal.tsx         # Add/Edit form with dynamic Primary Home & Stock by Home
        └── DeleteConfirmModal.tsx # Delete confirmation modal
```

### 7.2 Scripts (`package.json`)
- `npm run dev`: `vite --port=3000 --host=0.0.0.0`
- `npm run build`: `vite build`
- `npm run lint`: `tsc --noEmit`
- Unit Tests: `npx --yes tsx --test src/utils/inventory.test.ts`

---

## 8. Verification & Quality Gates

1. **Unit Test Suite (`src/utils/inventory.test.ts`)** — 14 automated assertions:
   - `calculateRestockQty`, `isShoppingListNeeded`, `getShoppingList`, `getItemStockStatus`, `clampStock`
   - Multi-home normalization & transfers: `getNormalizedHomeStocks` (legacy default to `Home 1`), `transferStockBetweenHomes` (`Home 1` → `Home 2` / `Home 3` + clamping), `adjustItemStockForHome`, `restockItemToTargetInHome`, and `filterItemsByHome`
   - Dynamic homes: `renameHomeInList`, `createHomeDefinition` (`home-4`+), `transferStockBetweenHomes` to dynamic homes, `setCentralHomeInList`, and `removeHomeFromList` (blocking Central Hub removal and folding removed branch stock into Central Hub)
   - `matchReceiptItemToInventory` (exact, fuzzy substring, unrelated item)
   - `normalizeReceiptDateToDDMMYYYY` (`28.10.26`, `28.10.2026`, `28/10/26`, `05.02.26`, `2026-10-28`)
   - `formatRupiah` (`45000`, `0`, `1250000`, `null`, `undefined`, `25000.4`)
   - Default AI model validation (`SUPPORTED_MODELS[0].id === 'gpt-4o'`, `getStoredOpenAIModel() === 'gpt-4o'`)
2. **Static Verification**: `tsc --noEmit` (`lint_applet`) and `vite build` (`compile_applet`) must pass with exit code `0`.
3. **Browser Verification**: Playwright headless Chromium checks at `1440×900` (desktop) and `390×844` (mobile) across all 4 navigation tabs (`Grid`, `Table`, `Shopping List`, `History & Receipts`) and `Manage Homes` / `Pick` modals ensuring zero horizontal overflow (`scrollWidth <= innerWidth`), intact dynamic home creation/renaming/picking/persistence, and zero runtime errors.

---

## 9. Known Technical Debt / Alignment Notes
- `metadata.json` (`"name"` field) still retains the initial first-turn placeholder `"HomeStock - Household Inventory & Shopping Manager"` per platform constraint (do not rename `metadata.json` after first turn).
- `localStorage` keys retain `homestock_*` prefixes for backward compatibility so existing users do not lose cached sandbox data or saved OpenAI keys.
- `firebase-blueprint.json` uses dynamic home ID pattern validation (`^[a-zA-Z0-9_-]+$`) and defines `HomeDefinition` inside `/households/{householdId}` alongside `/users/{userId}`, `/households/{householdId}/items/{itemId}`, and `/households/{householdId}/transfers/{transferId}`; `firestore.rules` also covers `/households/{householdId}/receipts/{receiptId}` and `/invites/{inviteId}`.

---

## 10. Detailed Changelog

### [2026-11-22] — Dynamic & Renamable Multi-Home Management + Mobile Shopping List Overflow Fix
- **Files:** `src/types/inventory.ts`, `src/types/household.ts`, `src/utils/inventory.ts`, `src/utils/inventory.test.ts`, `src/lib/firebase.ts`, `firebase-blueprint.json`, `src/components/ManageHomesModal.tsx`, `src/components/HomeFilterBar.tsx`, `src/components/PickFromHomeModal.tsx`, `src/components/GridView.tsx`, `src/components/ItemCard.tsx`, `src/components/ItemsTable.tsx`, `src/components/ItemModal.tsx`, `src/components/ShoppingListView.tsx`, `src/components/ReceiptScannerModal.tsx`, `src/components/ShoppingHistoryView.tsx`, `src/App.tsx`, `DESIGN_SPEC.md`
- **Details:**
  - Replaced fixed `'home-1' | 'home-2' | 'home-3'` types with extensible `HomeId = string`, `HomeStocks = Record<string, number>`, `HomeDefinition`, and `Household.homes?: HomeDefinition[]`, removing static enums in `firebase-blueprint.json` in favor of `^[a-zA-Z0-9_-]+$` ID matching.
  - Added pure home management helpers (`normalizeHomesList`, `getCentralHome`, `getCentralHomeId`, `createHomeDefinition`, `renameHomeInList`, `setCentralHomeInList`, `removeHomeFromList`, `loadStoredHomes`, `saveStoredHomes`) and verified with unit test #14 (`14/14` passing).
  - Built `ManageHomesModal.tsx` with inline home renaming (`Save` / `Enter`), dynamic `Add Home` (`home-4`+), `Set as Central` hub switching, and non-central home deletion (automatically folding remaining stock back into Central Hub).
  - Wired dynamic `homes` list and handlers (`handleRenameHome`, `handleAddHome`, `handleSetCentralHome`, `handleRemoveHome`) across `App.tsx`, `HomeFilterBar`, `PickFromHomeModal`, `GridView`, `ItemCard`, `ItemsTable`, `ItemModal`, `ShoppingListView`, `ReceiptScannerModal`, and `ShoppingHistoryView`, plus `updateHouseholdHomes` in `firebase.ts` so renames/additions sync across family devices.
  - Fixed mobile horizontal overflow (`scrollWidth: 774` $\rightarrow$ `390` at `390×844`) in `ShoppingListView.tsx` and improved text wrapping in `ShoppingHistoryView.tsx` by constraining category strip (`w-full max-w-full sm:w-auto`) and adding `min-w-0` + `break-words` on flex item rows.

### [2026-11-22] — Multi-Home Categorization (`Home 1 Central`, `Home 2`, `Home 3`) & Central-to-Branch Picking
- **Files:** `src/types/inventory.ts`, `src/utils/inventory.ts`, `src/utils/inventory.test.ts`, `src/lib/firebase.ts`, `firestore.rules`, `firebase-blueprint.json`, `src/components/HomeFilterBar.tsx`, `src/components/PickFromHomeModal.tsx`, `src/components/GridView.tsx`, `src/components/ItemCard.tsx`, `src/components/ItemsTable.tsx`, `src/components/ItemModal.tsx`, `src/components/ShoppingListView.tsx`, `src/components/ReceiptScannerModal.tsx`, `src/components/ShoppingHistoryView.tsx`, `src/App.tsx`, `DESIGN_SPEC.md`
- **Details:**
  - Added `HomeId` (`'home-1' | 'home-2' | 'home-3'`), `HomeStocks`, `HomeDefinition`, and `StockTransferRecord` contracts while preserving full backward compatibility so legacy/default items normalize into `Home 1 (Central)`.
  - Added pure multi-home inventory helpers (`getNormalizedHomeStocks`, `transferStockBetweenHomes`, `adjustItemStockForHome`, `restockItemToTargetInHome`, `filterItemsByHome`, plus `sandbox`/`cloud_cache` transfer storage keys) and 4 new unit tests (13/13 passing).
  - Built `HomeFilterBar` (responsive wrapped tabs for `All Homes`, `Home 1 Central`, `Home 2`, `Home 3`, plus `Pick from Home 1` CTA) and `PickFromHomeModal` so Home 2 and Home 3 can search, select quantity, and pick units directly out of Home 1's centralized stock.
  - Updated `ItemCard` (aligned card body rows, primary Home pill, `H1/H2/H3` split chips, home-aware stepper, and quick pick button), `ItemsTable` (`Home Split` column + inline pick action), `ItemModal` (`Primary Home` selector + `Stock by Home` inputs), `ShoppingListView` (replenishes `Home 1 (Central)`), `ReceiptScannerModal` (`Receive Into Home` selector defaulting to `Home 1 (Central)`), and `ShoppingHistoryView` (`destinationHomeId` pill + `Recent Home Stock Picks` log).
  - Updated `firebase.ts`, `firestore.rules`, and `firebase-blueprint.json` to persist `homeId`, `homeStocks`, and `/households/{householdId}/transfers/{transferId}`.

### [2026-11-20] — Comprehensive Living Design Specification Created
- **Files:** `DESIGN_SPEC.md`
- **Details:** Formalized complete UI/UX, responsive layout, TypeScript schemas, OpenAI Vision prompt/parsing rules, Firebase/Sandbox dual persistence architecture, security rules, and verification gates. Added mandatory changelog protocol for all subsequent changes.

### [2026-11-05] — Rebrand to `Stoku!`, Mobile Navbar Overflow Fix & `gpt-4o` Receipt Precision Upgrade
- **Files:** `index.html`, `src/App.tsx`, `src/components/Navbar.tsx`, `src/utils/receiptScanner.ts`, `src/components/ReceiptScannerModal.tsx`, `src/utils/inventory.test.ts`
- **Details:**
  - Renamed visible brand title, `<title>`, `og:title`, and footer copyright from `HomeStock` to `Stoku!`.
  - Refactored `Navbar.tsx` right-side controls on `< sm` (`< 640px`) to icon-first compact buttons (`p-2`, `shrink-0`) including a compact Google "G" icon login button (`hidden sm:inline` for `"Login"` text) so `375px` and `390px` mobile screens render with zero horizontal overflow.
  - Switched default OpenAI Vision model from `gpt-5-nano` to `gpt-4o` (`SUPPORTED_MODELS` order: `gpt-4o`, `gpt-4o-mini`, `gpt-5-nano`).
  - Enhanced `parseReceiptWithOpenAI` prompt to separate actual purchase quantities from package sizes (`85g`, `160ml`, `200ml`) and extract single-unit prices (`15000` from `2 x 15.000 = 30.000`).
  - Updated `ReceiptScannerModal.tsx` review rows to render `{formatRupiah(row.price)} / unit` and `(Total: {formatRupiah(row.price * row.quantity)})` for multi-quantity lines.

### [2026-11-04] — Indonesian Rupiah (`Rp`) Currency Migration
- **Files:** `src/utils/receiptScanner.ts`, `src/components/ShoppingHistoryView.tsx`, `src/components/ReceiptScannerModal.tsx`, `src/utils/inventory.test.ts`
- **Details:**
  - Added `formatRupiah()` using `id-ID` integer formatting (`Rp 45.000`).
  - Updated OpenAI system prompt to interpret period (`.`) thousand separators in Indonesian receipts and return integer Rupiah amounts with `"currency": "Rp"`.
  - Replaced all `$` labels and `.toFixed(2)` displays across `ReceiptScannerModal.tsx` and `ShoppingHistoryView.tsx` with `Rp` and `formatRupiah()`.

### [Prior Turns] — Core App, Family Sharing, Sandbox Mode & `DD-MM-YYYY` Date Normalization
- **Details:**
  - Implemented 4-view inventory manager (`GridView`, `ItemsTable`, `ShoppingListView`, `ShoppingHistoryView`).
  - Added Google Auth + Firestore shared `/households` and `/invites` collaboration with `HouseholdModal` and `PendingInviteBanner`, plus legacy `/users/{userId}/items` auto-migration.
  - Isolated signed-out testing in `sandbox` `localStorage` keys separate from `cloud_cache` to protect production Firestore data.
  - Added `normalizeReceiptDateToDDMMYYYY` to strictly convert `DD.MM.YY` receipt dates (e.g. `28.10.26` $\rightarrow$ `28-10-2026`).
