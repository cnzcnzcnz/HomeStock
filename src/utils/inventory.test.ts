import { test } from 'node:test';
import assert from 'node:assert';
import {
  calculateRestockQty,
  isShoppingListNeeded,
  getShoppingList,
  getItemStockStatus,
  clampStock,
  getNormalizedHomeStocks,
  adjustItemStockForHome,
  transferStockBetweenHomes,
  restockItemToTargetInHome,
  filterItemsByHome,
  DEFAULT_HOMES,
  createHomeDefinition,
  renameHomeInList,
  setCentralHomeInList,
  removeHomeFromList,
  getHomeLabel,
  getCentralHomeId
} from './inventory';
import {
  matchReceiptItemToInventory,
  normalizeReceiptDateToDDMMYYYY,
  formatRupiah,
  SUPPORTED_MODELS,
  getStoredOpenAIModel
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

test('getNormalizedHomeStocks defaults legacy items to Home 1 Central', () => {
  const legacyItem: Item = {
    id: 'legacy-1',
    itemName: 'Dish Soap',
    category: 'Household & Cleaning',
    photo: '',
    targetMonthlyStock: 4,
    currentStock: 3
  };
  assert.deepStrictEqual(getNormalizedHomeStocks(legacyItem), {
    'home-1': 3,
    'home-2': 0,
    'home-3': 0
  });
});

test('transferStockBetweenHomes allows Home 2 and Home 3 to pick stock from Home 1 Central', () => {
  const item: Item = {
    id: 'item-h1',
    itemName: 'Toilet Paper',
    category: 'Paper Goods & Wraps',
    photo: '',
    targetMonthlyStock: 6,
    currentStock: 5,
    homeId: 'home-1',
    homeStocks: { 'home-1': 5, 'home-2': 0, 'home-3': 0 }
  };

  // Home 2 picks 2 from Home 1
  const pick1 = transferStockBetweenHomes(item, 'home-1', 'home-2', 2);
  assert.strictEqual(pick1.transferredQty, 2);
  assert.deepStrictEqual(pick1.updatedItem.homeStocks, {
    'home-1': 3,
    'home-2': 2,
    'home-3': 0
  });
  assert.strictEqual(pick1.updatedItem.currentStock, 5);

  // Home 3 picks more than available at Home 1 -> clamped to available (3)
  const pick2 = transferStockBetweenHomes(pick1.updatedItem, 'home-1', 'home-3', 10);
  assert.strictEqual(pick2.transferredQty, 3);
  assert.deepStrictEqual(pick2.updatedItem.homeStocks, {
    'home-1': 0,
    'home-2': 2,
    'home-3': 3
  });
  assert.strictEqual(pick2.updatedItem.currentStock, 5);
});

test('adjustItemStockForHome and restockItemToTargetInHome keep total currentStock synchronized', () => {
  const item: Item = {
    id: 'item-sync',
    itemName: 'Olive Oil',
    category: 'Pantry & Groceries',
    photo: '',
    targetMonthlyStock: 4,
    currentStock: 2,
    homeId: 'home-1',
    homeStocks: { 'home-1': 1, 'home-2': 1, 'home-3': 0 }
  };

  // Decrement in Home 2
  const consumed = adjustItemStockForHome(item, 'home-2', -1);
  assert.deepStrictEqual(consumed.homeStocks, { 'home-1': 1, 'home-2': 0, 'home-3': 0 });
  assert.strictEqual(consumed.currentStock, 1);

  // Restock adds deficit to Home 1 Central without overwriting Home 2/3
  const withH2: Item = {
    ...item,
    currentStock: 2,
    homeStocks: { 'home-1': 1, 'home-2': 1, 'home-3': 0 }
  };
  const restocked = restockItemToTargetInHome(withH2, 4, 'home-1');
  assert.deepStrictEqual(restocked.homeStocks, { 'home-1': 3, 'home-2': 1, 'home-3': 0 });
  assert.strictEqual(restocked.currentStock, 4);
});

test('filterItemsByHome filters by primary homeId or stock held in that home', () => {
  const items: Item[] = [
    {
      id: 'a',
      itemName: 'Central Only',
      category: 'Pantry & Groceries',
      photo: '',
      targetMonthlyStock: 2,
      currentStock: 2,
      homeId: 'home-1',
      homeStocks: { 'home-1': 2, 'home-2': 0, 'home-3': 0 }
    },
    {
      id: 'b',
      itemName: 'Picked to Home 2',
      category: 'Pantry & Groceries',
      photo: '',
      targetMonthlyStock: 3,
      currentStock: 3,
      homeId: 'home-1',
      homeStocks: { 'home-1': 2, 'home-2': 1, 'home-3': 0 }
    },
    {
      id: 'c',
      itemName: 'Home 3 Dedicated',
      category: 'Household & Cleaning',
      photo: '',
      targetMonthlyStock: 1,
      currentStock: 0,
      homeId: 'home-3',
      homeStocks: { 'home-1': 0, 'home-2': 0, 'home-3': 0 }
    }
  ];

  assert.deepStrictEqual(filterItemsByHome(items, 'all').map(i => i.id), ['a', 'b', 'c']);
  assert.deepStrictEqual(filterItemsByHome(items, 'home-1').map(i => i.id), ['a', 'b']);
  assert.deepStrictEqual(filterItemsByHome(items, 'home-2').map(i => i.id), ['b']);
  assert.deepStrictEqual(filterItemsByHome(items, 'home-3').map(i => i.id), ['c']);
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

test('default AI model is gpt-4o for high precision receipt reading', () => {
  assert.strictEqual(SUPPORTED_MODELS[0].id, 'gpt-4o');
  assert.strictEqual(getStoredOpenAIModel(), 'gpt-4o');
});

test('dynamic homes support renaming, adding 4+ homes, central switch, and safe removal', () => {
  // Rename Home 1 & Home 2
  let homes = renameHomeInList(DEFAULT_HOMES, 'home-1', 'Main Warehouse');
  homes = renameHomeInList(homes, 'home-2', 'Villa Bali');
  assert.strictEqual(getHomeLabel('home-1', true, homes), 'Main Warehouse (Central)');
  assert.strictEqual(getHomeLabel('home-2', false, homes), 'Villa Bali');

  // Add a 4th dynamic home
  const officeHome = createHomeDefinition('Office Pantry', homes);
  assert.strictEqual(officeHome.id, 'home-4');
  assert.strictEqual(officeHome.name, 'Office Pantry');
  assert.strictEqual(officeHome.isCentral, false);
  homes = [...homes, officeHome];
  assert.strictEqual(homes.length, 4);

  // Transfer stock to the 4th dynamic home
  const item: Item = {
    id: 'dyn-1',
    itemName: 'Coffee Beans',
    category: 'Beverages & Coffee',
    photo: '',
    targetMonthlyStock: 5,
    currentStock: 5,
    homeId: 'home-1',
    homeStocks: { 'home-1': 5, 'home-2': 0, 'home-3': 0 }
  };

  const transfer = transferStockBetweenHomes(item, 'home-1', 'home-4', 2, homes);
  assert.strictEqual(transfer.transferredQty, 2);
  assert.strictEqual(transfer.updatedItem.homeStocks?.['home-1'], 3);
  assert.strictEqual(transfer.updatedItem.homeStocks?.['home-4'], 2);
  assert.strictEqual(transfer.updatedItem.currentStock, 5);

  // Switch Central Hub to Villa Bali (home-2)
  homes = setCentralHomeInList(homes, 'home-2');
  assert.strictEqual(getCentralHomeId(homes), 'home-2');

  // Cannot remove the active Central Hub
  const blockedRemove = removeHomeFromList(homes, 'home-2', [transfer.updatedItem]);
  assert.strictEqual(blockedRemove.homes.length, 4);

  // Remove home-4 -> its 2 units safely return to the active Central Hub (home-2)
  const afterRemove = removeHomeFromList(homes, 'home-4', [transfer.updatedItem]);
  assert.strictEqual(afterRemove.homes.length, 3);
  assert.strictEqual(afterRemove.items[0].homeStocks?.['home-2'], 2);
  assert.strictEqual(afterRemove.items[0].homeStocks?.['home-1'], 3);
  assert.strictEqual(afterRemove.items[0].homeStocks?.['home-4'], undefined);
  assert.strictEqual(afterRemove.items[0].currentStock, 5);
});

