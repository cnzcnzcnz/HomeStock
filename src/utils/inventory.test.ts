import { test } from 'node:test';
import assert from 'node:assert';
import {
  calculateRestockQty,
  isShoppingListNeeded,
  getShoppingList,
  getItemStockStatus,
  clampStock
} from './inventory';
import {
  matchReceiptItemToInventory,
  normalizeReceiptDateToDDMMYYYY,
  formatRupiah
} from './receiptScanner';
import { Item } from '../types/inventory';

test('calculateRestockQty calculates Target Monthly Stock - Current Stock accurately', () => {
  assert.strictEqual(calculateRestockQty(5, 2), 3);
  assert.strictEqual(calculateRestockQty(4, 4), 0);
  assert.strictEqual(calculateRestockQty(2, 5), -3);
});

test('isShoppingListNeeded returns true strictly when Restock Qty is greater than 0', () => {
  assert.strictEqual(isShoppingListNeeded({ targetMonthlyStock: 5, currentStock: 2 }), true);
  assert.strictEqual(isShoppingListNeeded({ targetMonthlyStock: 4, currentStock: 4 }), false);
  assert.strictEqual(isShoppingListNeeded({ targetMonthlyStock: 2, currentStock: 5 }), false);
});

test('getShoppingList filters items list to only those with Restock Qty > 0 and attaches restockQty', () => {
  const sampleItems: Item[] = [
    {
      id: '1',
      itemName: 'Paper Towel Rolls',
      category: 'Paper Goods & Wraps',
      photo: '',
      targetMonthlyStock: 6,
      currentStock: 2
    },
    {
      id: '2',
      itemName: 'Toilet Paper',
      category: 'Paper Goods & Wraps',
      photo: '',
      targetMonthlyStock: 4,
      currentStock: 4
    }
  ];

  const shoppingList = getShoppingList(sampleItems);
  assert.strictEqual(shoppingList.length, 1);
  assert.strictEqual(shoppingList[0].id, '1');
  assert.strictEqual(shoppingList[0].restockQty, 4);
});

test('getItemStockStatus classifies inventory status properly', () => {
  assert.strictEqual(getItemStockStatus(5, 0), 'out_of_stock');
  assert.strictEqual(getItemStockStatus(10, 2), 'low_stock');
  assert.strictEqual(getItemStockStatus(5, 5), 'good');
  assert.strictEqual(getItemStockStatus(4, 8), 'surplus');
});

test('clampStock ensures non-negative integers', () => {
  assert.strictEqual(clampStock(-5), 0);
  assert.strictEqual(clampStock(0), 0);
  assert.strictEqual(clampStock(3.7), 3);
});

test('matchReceiptItemToInventory matches receipt names to database items', () => {
  const existingItems: Item[] = [
    {
      id: 'item-1',
      itemName: 'Liquid Laundry Detergent',
      category: 'Household & Cleaning',
      photo: '',
      targetMonthlyStock: 2,
      currentStock: 1
    },
    {
      id: 'item-2',
      itemName: 'Barista Oat Milk',
      category: 'Beverages & Coffee',
      photo: '',
      targetMonthlyStock: 6,
      currentStock: 3
    }
  ];

  // Exact match
  const matchExact = matchReceiptItemToInventory('Liquid Laundry Detergent', existingItems);
  assert.strictEqual(matchExact.matchedItem?.id, 'item-1');

  // Fuzzy / substring match
  const matchFuzzy = matchReceiptItemToInventory('Oat Milk Barista Blend', existingItems);
  assert.strictEqual(matchFuzzy.matchedItem?.id, 'item-2');

  // Unrelated item
  const matchNone = matchReceiptItemToInventory('Car Motor Oil 5W-30', existingItems);
  assert.strictEqual(matchNone.matchedItem, null);
});

test('normalizeReceiptDateToDDMMYYYY formats dd.mm.yy accurately to dd-mm-yyyy', () => {
  // User's exact example: 28.10.26 -> 28-10-2026
  assert.strictEqual(normalizeReceiptDateToDDMMYYYY('28.10.26'), '28-10-2026');
  assert.strictEqual(normalizeReceiptDateToDDMMYYYY('28.10.2026'), '28-10-2026');
  assert.strictEqual(normalizeReceiptDateToDDMMYYYY('28/10/26'), '28-10-2026');
  assert.strictEqual(normalizeReceiptDateToDDMMYYYY('05.02.26'), '05-02-2026');
  assert.strictEqual(normalizeReceiptDateToDDMMYYYY('2026-10-28'), '28-10-2026');
});

test('formatRupiah formats values into Indonesian Rupiah (Rp XX.XXX)', () => {
  assert.strictEqual(formatRupiah(45000), 'Rp 45.000');
  assert.strictEqual(formatRupiah(0), 'Rp 0');
  assert.strictEqual(formatRupiah(1250000), 'Rp 1.250.000');
  assert.strictEqual(formatRupiah(null), 'Rp 0');
  assert.strictEqual(formatRupiah(undefined), 'Rp 0');
  assert.strictEqual(formatRupiah(25000.4), 'Rp 25.000');
});

