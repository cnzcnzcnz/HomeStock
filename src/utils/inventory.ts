import {
  Item,
  StockStatus,
  ShoppingReceiptRecord,
  HomeId,
  HomeStocks,
  HomeDefinition,
  StockTransferRecord
} from '../types/inventory';

export const DEFAULT_HOMES: HomeDefinition[] = [
  { id: 'home-1', name: 'Home 1', isCentral: true },
  { id: 'home-2', name: 'Home 2', isCentral: false },
  { id: 'home-3', name: 'Home 3', isCentral: false }
];

export const CENTRAL_HOME_ID: HomeId = 'home-1';

export function normalizeHomesList(rawHomes?: HomeDefinition[] | null): HomeDefinition[] {
  if (!Array.isArray(rawHomes) || rawHomes.length === 0) {
    return DEFAULT_HOMES.map(h => ({ ...h }));
  }

  const seen = new Set<string>();
  const cleaned: HomeDefinition[] = [];

  for (const entry of rawHomes) {
    if (!entry || typeof entry.id !== 'string') continue;
    const id = entry.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : id;
    cleaned.push({
      id,
      name,
      isCentral: Boolean(entry.isCentral)
    });
  }

  if (cleaned.length === 0) {
    return DEFAULT_HOMES.map(h => ({ ...h }));
  }

  // Ensure exactly one central hub exists
  const centralIdx = cleaned.findIndex(h => h.isCentral);
  const resolvedCentralIdx = centralIdx >= 0 ? centralIdx : 0;

  return cleaned.map((h, idx) => ({
    ...h,
    isCentral: idx === resolvedCentralIdx
  }));
}

export function getCentralHome(homes: HomeDefinition[] = DEFAULT_HOMES): HomeDefinition {
  const list = normalizeHomesList(homes);
  return list.find(h => h.isCentral) || list[0];
}

export function getCentralHomeId(homes: HomeDefinition[] = DEFAULT_HOMES): HomeId {
  return getCentralHome(homes).id;
}

export function getHomeLabel(
  homeId?: HomeId,
  includeCentralTag = true,
  homes: HomeDefinition[] = DEFAULT_HOMES
): string {
  const list = normalizeHomesList(homes);
  const resolved = list.find(h => h.id === homeId) || (homeId ? undefined : getCentralHome(list));
  if (!resolved) {
    return homeId || getCentralHome(list).name;
  }
  if (includeCentralTag && resolved.isCentral) {
    return `${resolved.name} (Central)`;
  }
  return resolved.name;
}

export function getHomeShortLabel(homeId?: HomeId, homes: HomeDefinition[] = DEFAULT_HOMES): string {
  const list = normalizeHomesList(homes);
  const idx = list.findIndex(h => h.id === homeId);
  if (idx >= 0) {
    return list[idx].name;
  }
  return homeId || getCentralHome(list).name;
}

export function createHomeDefinition(
  name: string,
  existingHomes: HomeDefinition[]
): HomeDefinition {
  const list = normalizeHomesList(existingHomes);
  const trimmed = name.trim() || `Home ${list.length + 1}`;
  let candidateNum = list.length + 1;
  let candidateId = `home-${candidateNum}`;
  while (list.some(h => h.id === candidateId)) {
    candidateNum += 1;
    candidateId = `home-${candidateNum}`;
  }
  return {
    id: candidateId,
    name: trimmed.slice(0, 60),
    isCentral: false
  };
}

export function renameHomeInList(
  homes: HomeDefinition[],
  homeId: HomeId,
  newName: string
): HomeDefinition[] {
  const trimmed = newName.trim().slice(0, 60);
  if (!trimmed) return normalizeHomesList(homes);
  return normalizeHomesList(homes).map(h =>
    h.id === homeId ? { ...h, name: trimmed } : h
  );
}

export function setCentralHomeInList(
  homes: HomeDefinition[],
  centralHomeId: HomeId
): HomeDefinition[] {
  const list = normalizeHomesList(homes);
  if (!list.some(h => h.id === centralHomeId)) return list;
  return list.map(h => ({
    ...h,
    isCentral: h.id === centralHomeId
  }));
}

export function removeHomeFromList(
  homes: HomeDefinition[],
  targetHomeId: HomeId,
  items: Item[]
): { homes: HomeDefinition[]; items: Item[] } {
  const list = normalizeHomesList(homes);
  const centralId = getCentralHomeId(list);
  if (list.length <= 1 || targetHomeId === centralId) {
    return { homes: list, items };
  }

  const nextHomes = normalizeHomesList(list.filter(h => h.id !== targetHomeId));
  const nextCentralId = getCentralHomeId(nextHomes);

  const nextItems = items.map(item => {
    const stocks = getNormalizedHomeStocks(item, list);
    const removedQty = stocks[targetHomeId] || 0;
    const { [targetHomeId]: _removed, ...restStocks } = stocks;
    const updatedStocks: HomeStocks = {
      ...restStocks,
      [nextCentralId]: (restStocks[nextCentralId] || 0) + removedQty
    };
    const nextPrimaryHome = item.homeId === targetHomeId ? nextCentralId : (item.homeId || nextCentralId);
    return normalizeItemHomes(
      {
        ...item,
        homeId: nextPrimaryHome,
        homeStocks: updatedStocks,
        currentStock: getTotalStockFromHomes(updatedStocks),
        updatedAt: new Date().toISOString()
      },
      nextHomes
    );
  });

  return { homes: nextHomes, items: nextItems };
}

/**
 * Calculates the math column 'Restock Qty'
 * Formula: Target Monthly Stock - Current Stock
 */
export function calculateRestockQty(targetMonthlyStock: number, currentStock: number): number {
  const target = Number(targetMonthlyStock) || 0;
  const current = Number(currentStock) || 0;
  return target - current;
}

/**
 * Checks if an item should appear on the shopping list
 * (Restock Qty > 0)
 */
export function isShoppingListNeeded(item: Pick<Item, 'targetMonthlyStock' | 'currentStock'>): boolean {
  return calculateRestockQty(item.targetMonthlyStock, item.currentStock) > 0;
}

/**
 * Filters items for the Shopping List tab
 * Displays only items where Restock Qty > 0
 */
export function getShoppingList(items: Item[]): Array<Item & { restockQty: number }> {
  return items
    .map(item => ({
      ...item,
      restockQty: calculateRestockQty(item.targetMonthlyStock, item.currentStock)
    }))
    .filter(item => item.restockQty > 0);
}

/**
 * Categorizes stock health for visual badging
 */
export function getItemStockStatus(targetMonthlyStock: number, currentStock: number): StockStatus {
  const current = Number(currentStock) || 0;
  const target = Number(targetMonthlyStock) || 0;

  if (current <= 0) return 'out_of_stock';
  if (target > 0 && current < target * 0.4) return 'low_stock';
  if (target > 0 && current > target * 1.5) return 'surplus';
  return 'good';
}

/**
 * Clamp stock to non-negative integers
 */
export function clampStock(value: number): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

/**
 * Resolves normalized per-home stock counts for an item across any configured homes.
 * Legacy items without homeStocks default their currentStock into their primary homeId (or Central Home).
 */
export function getNormalizedHomeStocks(
  item: Pick<Item, 'currentStock' | 'homeId' | 'homeStocks'>,
  homes: HomeDefinition[] = DEFAULT_HOMES
): HomeStocks {
  const list = normalizeHomesList(homes);
  const centralId = getCentralHomeId(list);
  const primaryHome: HomeId =
    item.homeId && list.some(h => h.id === item.homeId) ? item.homeId : centralId;

  const result: HomeStocks = {};
  list.forEach(h => {
    result[h.id] = 0;
  });

  if (item.homeStocks && typeof item.homeStocks === 'object') {
    let sum = 0;
    for (const [k, v] of Object.entries(item.homeStocks)) {
      const val = clampStock(v ?? 0);
      if (k in result || val > 0) {
        result[k] = val;
        sum += val;
      }
    }

    // If currentStock was updated directly without homeStocks sync, reconcile onto primaryHome
    const declaredTotal = clampStock(item.currentStock);
    if (sum === 0 && declaredTotal > 0) {
      result[primaryHome] = declaredTotal;
    }

    return result;
  }

  const total = clampStock(item.currentStock);
  result[primaryHome] = total;
  return result;
}

export function getTotalStockFromHomes(homeStocks: HomeStocks): number {
  return Object.values(homeStocks || {}).reduce((acc, qty) => acc + clampStock(qty), 0);
}

export function getStockForHome(
  item: Pick<Item, 'currentStock' | 'homeId' | 'homeStocks'>,
  homeId: HomeId,
  homes: HomeDefinition[] = DEFAULT_HOMES
): number {
  return getNormalizedHomeStocks(item, homes)[homeId] || 0;
}

export function normalizeItemHomes(item: Item, homes: HomeDefinition[] = DEFAULT_HOMES): Item {
  const list = normalizeHomesList(homes);
  const centralId = getCentralHomeId(list);
  const primaryHome: HomeId =
    item.homeId && list.some(h => h.id === item.homeId) ? item.homeId : centralId;
  const homeStocks = getNormalizedHomeStocks(item, list);
  return {
    ...item,
    homeId: primaryHome,
    homeStocks,
    currentStock: getTotalStockFromHomes(homeStocks)
  };
}

/**
 * Adjust stock inside a specific home and keep total currentStock in sync
 */
export function adjustItemStockForHome(
  item: Item,
  targetHomeId: HomeId,
  delta: number,
  homes: HomeDefinition[] = DEFAULT_HOMES
): Item {
  const centralId = getCentralHomeId(homes);
  const homeStocks = getNormalizedHomeStocks(item, homes);
  const nextForHome = clampStock((homeStocks[targetHomeId] || 0) + delta);
  const updatedHomeStocks: HomeStocks = {
    ...homeStocks,
    [targetHomeId]: nextForHome
  };

  return {
    ...item,
    homeId: item.homeId || centralId,
    homeStocks: updatedHomeStocks,
    currentStock: getTotalStockFromHomes(updatedHomeStocks),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Transfer (pick) units from Central Home to any branch home
 */
export function transferStockBetweenHomes(
  item: Item,
  fromHomeId: HomeId,
  toHomeId: HomeId,
  quantity: number,
  homes: HomeDefinition[] = DEFAULT_HOMES
): { updatedItem: Item; transferredQty: number } {
  const centralId = getCentralHomeId(homes);
  const homeStocks = getNormalizedHomeStocks(item, homes);
  if (fromHomeId === toHomeId) {
    return { updatedItem: normalizeItemHomes(item, homes), transferredQty: 0 };
  }

  const available = homeStocks[fromHomeId] || 0;
  const requested = clampStock(quantity);
  const transferredQty = Math.min(available, requested);

  if (transferredQty <= 0) {
    return { updatedItem: normalizeItemHomes(item, homes), transferredQty: 0 };
  }

  const updatedHomeStocks: HomeStocks = {
    ...homeStocks,
    [fromHomeId]: available - transferredQty,
    [toHomeId]: (homeStocks[toHomeId] || 0) + transferredQty
  };

  return {
    updatedItem: {
      ...item,
      homeId: item.homeId || centralId,
      homeStocks: updatedHomeStocks,
      currentStock: getTotalStockFromHomes(updatedHomeStocks),
      updatedAt: new Date().toISOString()
    },
    transferredQty
  };
}

/**
 * Restock an item to targetMonthlyStock by adding the deficit into targetHomeId (defaults to Central Home),
 * preserving stock already distributed across other homes.
 */
export function restockItemToTargetInHome(
  item: Item,
  targetMonthlyStock: number,
  targetHomeId?: HomeId,
  homes: HomeDefinition[] = DEFAULT_HOMES
): Item {
  const resolvedTargetHome = targetHomeId || getCentralHomeId(homes);
  const homeStocks = getNormalizedHomeStocks(item, homes);
  const currentTotal = getTotalStockFromHomes(homeStocks);
  const needed = Math.max(0, clampStock(targetMonthlyStock) - currentTotal);

  if (needed === 0) {
    return normalizeItemHomes(item, homes);
  }

  const updatedHomeStocks: HomeStocks = {
    ...homeStocks,
    [resolvedTargetHome]: (homeStocks[resolvedTargetHome] || 0) + needed
  };

  return {
    ...item,
    homeId: item.homeId || resolvedTargetHome,
    homeStocks: updatedHomeStocks,
    currentStock: getTotalStockFromHomes(updatedHomeStocks),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Filter items for a chosen Home view ('all' | HomeId).
 * An item belongs to a home view if its primary homeId matches OR it currently holds stock (> 0) in that home.
 */
export function filterItemsByHome(
  items: Item[],
  homeFilter: HomeId | 'all',
  homes: HomeDefinition[] = DEFAULT_HOMES
): Item[] {
  if (homeFilter === 'all') return items;
  const centralId = getCentralHomeId(homes);
  return items.filter(item => {
    const primaryHome: HomeId = item.homeId || centralId;
    const stockInHome = getStockForHome(item, homeFilter, homes);
    return primaryHome === homeFilter || stockInHome > 0;
  });
}

export const CATEGORIES = [
  'Pantry & Groceries',
  'Beverages & Coffee',
  'Household & Cleaning',
  'Paper Goods & Wraps',
  'Personal Care & Bath',
  'Health & First Aid',
  'Pet Supplies',
  'General Supplies'
] as const;

export const PHOTO_PRESETS = [
  {
    label: 'Ground Coffee',
    category: 'Beverages & Coffee',
    url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Olive Oil',
    category: 'Pantry & Groceries',
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Dish Soap',
    category: 'Household & Cleaning',
    url: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Laundry Detergent',
    category: 'Household & Cleaning',
    url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Toilet Paper',
    category: 'Paper Goods & Wraps',
    url: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Paper Towels',
    category: 'Paper Goods & Wraps',
    url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Pasta & Noodles',
    category: 'Pantry & Groceries',
    url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Oat Milk / Dairy',
    category: 'Beverages & Coffee',
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Hand Soap',
    category: 'Personal Care & Bath',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Toothpaste & Dental',
    category: 'Personal Care & Bath',
    url: 'https://images.unsplash.com/photo-1559591937-e106981432f8?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Trash Bags',
    category: 'Household & Cleaning',
    url: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Fresh Eggs',
    category: 'Pantry & Groceries',
    url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-1',
    itemName: 'Toilet Paper (12-Pack)',
    category: 'Paper Goods & Wraps',
    photo: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 4,
    currentStock: 1, // Restock Qty: 3 (Needs restock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 1, 'home-2': 0, 'home-3': 0 },
    unit: 'packs',
    location: 'Bathroom Closet',
    notes: '3-ply ultra soft',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-2',
    itemName: 'Whole Bean Espresso Roast',
    category: 'Beverages & Coffee',
    photo: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 3,
    currentStock: 0, // Restock Qty: 3 (Out of stock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 0, 'home-2': 0, 'home-3': 0 },
    unit: 'bags',
    location: 'Coffee Bar',
    notes: 'Medium-dark roast',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-3',
    itemName: 'Organic Extra Virgin Olive Oil',
    category: 'Pantry & Groceries',
    photo: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 2,
    currentStock: 1, // Restock Qty: 1 (Needs restock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 1, 'home-2': 0, 'home-3': 0 },
    unit: 'bottles (750ml)',
    location: 'Pantry Shelf 2',
    notes: 'Cold pressed',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-4',
    itemName: 'Plant-Based Dish Soap',
    category: 'Household & Cleaning',
    photo: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 3,
    currentStock: 3, // Restock Qty: 0 (In stock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 3, 'home-2': 0, 'home-3': 0 },
    unit: 'bottles',
    location: 'Under Kitchen Sink',
    notes: 'Citrus fragrance',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-5',
    itemName: 'Liquid Laundry Detergent',
    category: 'Household & Cleaning',
    photo: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 2,
    currentStock: 1, // Restock Qty: 1 (Needs restock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 1, 'home-2': 0, 'home-3': 0 },
    unit: 'jugs',
    location: 'Laundry Room',
    notes: 'Free & Clear hypoallergenic',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-6',
    itemName: 'Paper Towel Rolls',
    category: 'Paper Goods & Wraps',
    photo: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 6,
    currentStock: 6, // Restock Qty: 0 (In stock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 6, 'home-2': 0, 'home-3': 0 },
    unit: 'rolls',
    location: 'Pantry Shelf 4',
    notes: 'Select-a-size',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-7',
    itemName: 'Artisan Bronze-Cut Pasta',
    category: 'Pantry & Groceries',
    photo: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 5,
    currentStock: 2, // Restock Qty: 3 (Needs restock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 2, 'home-2': 0, 'home-3': 0 },
    unit: 'boxes (500g)',
    location: 'Pantry Shelf 1',
    notes: 'Penne & Rigatoni',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-8',
    itemName: 'Barista Oat Milk',
    category: 'Beverages & Coffee',
    photo: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 6,
    currentStock: 5, // Restock Qty: 1 (Needs restock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 5, 'home-2': 0, 'home-3': 0 },
    unit: 'cartons',
    location: 'Refrigerator / Pantry',
    notes: 'Unsweetened',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-9',
    itemName: 'Heavy Duty 13-Gal Trash Bags',
    category: 'Household & Cleaning',
    photo: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 2,
    currentStock: 2, // Restock Qty: 0 (In stock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 2, 'home-2': 0, 'home-3': 0 },
    unit: 'boxes (45ct)',
    location: 'Kitchen Island',
    notes: 'Drawstring flap',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'item-10',
    itemName: 'Mint Fluoride Toothpaste',
    category: 'Personal Care & Bath',
    photo: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80',
    targetMonthlyStock: 3,
    currentStock: 1, // Restock Qty: 2 (Needs restock)
    homeId: 'home-1',
    homeStocks: { 'home-1': 1, 'home-2': 0, 'home-3': 0 },
    unit: 'tubes',
    location: 'Primary Bathroom',
    notes: 'Enamel protection',
    updatedAt: new Date().toISOString()
  }
];

const STORAGE_KEY = 'homestock_inventory_items_v1';
const SANDBOX_STORAGE_KEY = 'homestock_sandbox_items_v1';
const INITIALIZED_KEY = 'homestock_initialized_v1';

export type StorageScope = 'cloud_cache' | 'sandbox';

export function loadStoredItems(scope: StorageScope = 'sandbox'): Item[] {
  if (typeof window === 'undefined') return INITIAL_ITEMS.map(item => normalizeItemHomes(item));
  const key = scope === 'cloud_cache' ? STORAGE_KEY : SANDBOX_STORAGE_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(item => normalizeItemHomes(item));
      }
    }
    return INITIAL_ITEMS.map(item => normalizeItemHomes(item));
  } catch {
    return INITIAL_ITEMS.map(item => normalizeItemHomes(item));
  }
}

export function saveStoredItems(items: Item[], scope: StorageScope = 'sandbox'): void {
  if (typeof window === 'undefined') return;
  const key = scope === 'cloud_cache' ? STORAGE_KEY : SANDBOX_STORAGE_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items to localStorage', e);
  }
}

const RECEIPTS_STORAGE_KEY = 'homestock_shopping_receipts_v1';
const RECEIPTS_SANDBOX_KEY = 'homestock_sandbox_receipts_v1';

export function loadStoredReceipts(scope: StorageScope = 'sandbox'): ShoppingReceiptRecord[] {
  if (typeof window === 'undefined') return [];
  const key = scope === 'cloud_cache' ? RECEIPTS_STORAGE_KEY : RECEIPTS_SANDBOX_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredReceipts(receipts: ShoppingReceiptRecord[], scope: StorageScope = 'sandbox'): void {
  if (typeof window === 'undefined') return;
  const key = scope === 'cloud_cache' ? RECEIPTS_STORAGE_KEY : RECEIPTS_SANDBOX_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(receipts));
  } catch (e) {
    console.error('Failed to save receipts to localStorage', e);
  }
}

const TRANSFERS_STORAGE_KEY = 'homestock_home_transfers_v1';
const TRANSFERS_SANDBOX_KEY = 'homestock_sandbox_transfers_v1';

export function loadStoredTransfers(scope: StorageScope = 'sandbox'): StockTransferRecord[] {
  if (typeof window === 'undefined') return [];
  const key = scope === 'cloud_cache' ? TRANSFERS_STORAGE_KEY : TRANSFERS_SANDBOX_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredTransfers(transfers: StockTransferRecord[], scope: StorageScope = 'sandbox'): void {
  if (typeof window === 'undefined') return;
  const key = scope === 'cloud_cache' ? TRANSFERS_STORAGE_KEY : TRANSFERS_SANDBOX_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(transfers));
  } catch (e) {
    console.error('Failed to save transfers to localStorage', e);
  }
}

const HOMES_STORAGE_KEY = 'homestock_homes_v1';
const HOMES_SANDBOX_KEY = 'homestock_sandbox_homes_v1';

export function loadStoredHomes(scope: StorageScope = 'sandbox'): HomeDefinition[] {
  if (typeof window === 'undefined') return DEFAULT_HOMES.map(h => ({ ...h }));
  const key = scope === 'cloud_cache' ? HOMES_STORAGE_KEY : HOMES_SANDBOX_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeHomesList(parsed);
    }
    return DEFAULT_HOMES.map(h => ({ ...h }));
  } catch {
    return DEFAULT_HOMES.map(h => ({ ...h }));
  }
}

export function saveStoredHomes(homes: HomeDefinition[], scope: StorageScope = 'sandbox'): void {
  if (typeof window === 'undefined') return;
  const key = scope === 'cloud_cache' ? HOMES_STORAGE_KEY : HOMES_SANDBOX_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(normalizeHomesList(homes)));
  } catch (e) {
    console.error('Failed to save homes to localStorage', e);
  }
}

