import { Item, StockStatus, ShoppingReceiptRecord } from '../types/inventory';

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
  return Math.max(0, Math.floor(value));
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
  if (typeof window === 'undefined') return INITIAL_ITEMS;
  const key = scope === 'cloud_cache' ? STORAGE_KEY : SANDBOX_STORAGE_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return INITIAL_ITEMS;
  } catch {
    return INITIAL_ITEMS;
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

