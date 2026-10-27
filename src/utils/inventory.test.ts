import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRestockQty,
  isShoppingListNeeded,
  getShoppingList,
  getItemStockStatus,
  clampStock
} from './inventory.ts';
import { Item } from '../types/inventory.ts';

test('calculateRestockQty calculates Target Monthly Stock - Current Stock accurately', () => {
  // Case 1: Target 5, Current 2 -> Restock Qty 3
  assert.equal(calculateRestockQty(5, 2), 3);

  // Case 2: Target 4, Current 4 -> Restock Qty 0
  assert.equal(calculateRestockQty(4, 4), 0);

  // Case 3: Target 3, Current 5 (surplus) -> Restock Qty -2
  assert.equal(calculateRestockQty(3, 5), -2);

  // Case 4: Target 6, Current 0 -> Restock Qty 6
  assert.equal(calculateRestockQty(6, 0), 6);
});

test('isShoppingListNeeded returns true strictly when Restock Qty is greater than 0', () => {
  assert.equal(isShoppingListNeeded({ targetMonthlyStock: 5, currentStock: 2 }), true);
  assert.equal(isShoppingListNeeded({ targetMonthlyStock: 3, currentStock: 3 }), false);
  assert.equal(isShoppingListNeeded({ targetMonthlyStock: 2, currentStock: 4 }), false);
});

test('getShoppingList filters items list to only those with Restock Qty > 0 and attaches restockQty', () => {
  const mockItems: Item[] = [
    {
      id: '1',
      itemName: 'Paper Towels',
      category: 'Paper Goods',
      photo: 'https://example.com/1.jpg',
      targetMonthlyStock: 6,
      currentStock: 2 // restockQty = 4 (> 0, include)
    },
    {
      id: '2',
      itemName: 'Dish Soap',
      category: 'Cleaning',
      photo: 'https://example.com/2.jpg',
      targetMonthlyStock: 3,
      currentStock: 3 // restockQty = 0 (exclude)
    },
    {
      id: '3',
      itemName: 'Olive Oil',
      category: 'Pantry',
      photo: 'https://example.com/3.jpg',
      targetMonthlyStock: 2,
      currentStock: 4 // restockQty = -2 (exclude)
    },
    {
      id: '4',
      itemName: 'Coffee',
      category: 'Pantry',
      photo: 'https://example.com/4.jpg',
      targetMonthlyStock: 4,
      currentStock: 0 // restockQty = 4 (> 0, include)
    }
  ];

  const shoppingList = getShoppingList(mockItems);

  assert.equal(shoppingList.length, 2);
  assert.equal(shoppingList[0].id, '1');
  assert.equal(shoppingList[0].restockQty, 4);
  assert.equal(shoppingList[1].id, '4');
  assert.equal(shoppingList[1].restockQty, 4);
});

test('getItemStockStatus classifies inventory status properly', () => {
  assert.equal(getItemStockStatus(4, 0), 'out_of_stock');
  assert.equal(getItemStockStatus(10, 2), 'low_stock');
  assert.equal(getItemStockStatus(10, 8), 'good');
  assert.equal(getItemStockStatus(2, 6), 'surplus');
});

test('clampStock ensures non-negative integers', () => {
  assert.equal(clampStock(5.8), 5);
  assert.equal(clampStock(0), 0);
  assert.equal(clampStock(-2), 0);
});
